import * as THREE from "three";

export type StudioScene = {
  resize(width: number, height: number, dpr: number): void;
  render(time: number, pointerX: number, pointerY: number, energy: number): void;
  dispose(): void;
  readonly renderer: THREE.WebGLRenderer;
};

const SOURCE_WIDTH = 1408;
const SOURCE_HEIGHT = 768;
const POINT_COUNT = 68;

/**
 * Sparse sunlight and dust for the Vanta studio photograph.
 *
 * Positions are authored in source-image UVs, then projected through the same
 * centered object-cover crop as the photo. The canvas inherits the existing
 * overscan/camera transform; only the photo's own settled 1.02 scale is added.
 */
export function createStudioScene(canvas: HTMLCanvasElement): StudioScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.sortObjects = false;
  renderer.debug.onShaderError = () => { throw new Error("Vanta studio shader failed to compile"); };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  const pointGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(POINT_COUNT * 3);
  const colors = new Float32Array(POINT_COUNT * 3);
  const sizes = new Float32Array(POINT_COUNT);
  const opacities = new Float32Array(POINT_COUNT);
  const phases = new Float32Array(POINT_COUNT);
  const depths = new Float32Array(POINT_COUNT);

  let seed = 0x51a7c0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const palette = [
    new THREE.Color("#f0d3a8"),
    new THREE.Color("#e8bd88"),
    new THREE.Color("#cba889"),
    new THREE.Color("#f4e4c9"),
  ];
  for (let i = 0; i < POINT_COUNT; i += 1) {
    // A deliberately uneven cloud: most motes live in the sunlit right half,
    // with a few drifting into the room's darker central air.
    const band = random();
    const u = band < 0.66
      ? 0.59 + random() * 0.31
      : 0.44 + random() * 0.34;
    const v = 0.12 + random() * 0.62;
    positions[i * 3] = u;
    positions[i * 3 + 1] = v;
    depths[i] = random();
    positions[i * 3 + 2] = -0.62 + depths[i] * 1.18;

    const tint = palette[Math.floor(random() * palette.length)];
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
    sizes[i] = 1.55 + random() * 2.15;
    opacities[i] = 0.16 + random() * 0.20;
    phases[i] = random() * Math.PI * 2;
  }
  // Keep source UVs immutable across repeat resize/orientation changes.
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
  pointGeometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  pointGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  pointGeometry.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
  pointGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  pointGeometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));

  const pointsMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
      uEnergy: { value: 0 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aOpacity;
      attribute float aPhase;
      attribute float aDepth;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec2 uPointer;
      uniform float uEnergy;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        // A few screen pixels of slow, depth-dependent travel reads as air;
        // the staggered rates keep the cloud from moving like one flat layer.
        float drift = uTime * (0.42 + aDepth * 0.48) + aPhase;
        p.x += sin(drift) * (0.0034 + aDepth * 0.0022);
        p.y += cos(drift * 0.73) * (0.0040 + aDepth * 0.0028);
        p.x += uPointer.x * (aDepth - 0.5) * 0.008;
        p.y -= uPointer.y * (aDepth - 0.5) * 0.006;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depthScale = mix(0.82, 1.24, aDepth);
        gl_PointSize = aSize * uPixelRatio * depthScale;
        vColor = aColor;
        float shimmer = 0.82 + 0.18 * sin(drift * 1.25);
        vAlpha = aOpacity * shimmer * (1.0 + uEnergy * 0.12);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float radius = length(centered) * 2.0;
        float softDot = 1.0 - smoothstep(0.24, 1.0, radius);
        float alpha = vAlpha * softDot;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });
  const dust = new THREE.Points(pointGeometry, pointsMaterial);
  dust.frustumCulled = false;
  scene.add(dust);

  // Two tapered quads share one geometry/material (one draw call). Their
  // source-image endpoints follow the upper-right window light into the room.
  const beamPositions: number[] = [];
  const beamUvs: number[] = [];
  const beamStrengths: number[] = [];
  const worldPerSourceU = SOURCE_WIDTH;
  const rays = [
    { from: [0.78, 0.10], to: [0.63, 0.63], widthStart: 26, widthEnd: 78, strength: 1 },
    { from: [0.91, 0.17], to: [0.76, 0.56], widthStart: 18, widthEnd: 54, strength: 0.58 },
  ] as const;

  const appendBeam = (
    from: readonly number[],
    to: readonly number[],
    widthStart: number,
    widthEnd: number,
    strength: number,
  ) => {
    const dx = (to[0] - from[0]) * SOURCE_WIDTH;
    const dy = (to[1] - from[1]) * SOURCE_HEIGHT;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const corners = [
      [from[0] - nx * widthStart / worldPerSourceU, from[1] - ny * widthStart / SOURCE_HEIGHT],
      [from[0] + nx * widthStart / worldPerSourceU, from[1] + ny * widthStart / SOURCE_HEIGHT],
      [to[0] - nx * widthEnd / worldPerSourceU, to[1] - ny * widthEnd / SOURCE_HEIGHT],
      [to[0] + nx * widthEnd / worldPerSourceU, to[1] + ny * widthEnd / SOURCE_HEIGHT],
    ];
    // Source-image V points down; projection flips it. Keep final faces CCW.
    const indices = [0, 1, 2, 1, 3, 2];
    const uvs = [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (const index of indices) {
      beamPositions.push(corners[index][0], corners[index][1], -0.18);
      beamUvs.push(uvs[index][0], uvs[index][1]);
      beamStrengths.push(strength);
    }
  };
  for (const ray of rays) appendBeam(ray.from, ray.to, ray.widthStart, ray.widthEnd, ray.strength);

  const beamGeometry = new THREE.BufferGeometry();
  beamGeometry.setAttribute("position", new THREE.Float32BufferAttribute(beamPositions, 3));
  beamGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(beamUvs, 2));
  beamGeometry.setAttribute("aStrength", new THREE.Float32BufferAttribute(beamStrengths, 1));
  const beamMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uEnergy: { value: 0 },
    },
    vertexShader: `
      attribute float aStrength;
      uniform vec2 uPointer;
      varying vec2 vUv;
      varying float vStrength;
      void main() {
        vec3 p = position;
        p.x += uPointer.x * 0.003;
        p.y -= uPointer.y * 0.002;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        vUv = uv;
        vStrength = aStrength;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uEnergy;
      varying vec2 vUv;
      varying float vStrength;
      void main() {
        float across = pow(max(0.0, sin(vUv.x * 3.14159265)), 2.15);
        float ends = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
        float breath = 0.87 + 0.13 * sin(uTime * 0.42 + vUv.y * 3.0);
        float alpha = across * ends * vStrength * 0.18 * breath * (1.0 + uEnergy * 0.08);
        if (alpha < 0.002) discard;
        vec3 warmRay = vec3(0.98, 0.80, 0.59);
        gl_FragColor = vec4(warmRay, alpha);
      }
    `,
  });
  const sunlight = new THREE.Mesh(beamGeometry, beamMaterial);
  sunlight.frustumCulled = false;
  scene.add(sunlight);

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let disposed = false;

  const projectSourceUv = (u: number, v: number, z: number) => {
    const coverScale = Math.max(width / SOURCE_WIDTH, height / SOURCE_HEIGHT) * 1.02;
    const x = (u - 0.5) * SOURCE_WIDTH * coverScale / (height / 2);
    const y = (0.5 - v) * SOURCE_HEIGHT * coverScale / (height / 2);
    return [x, y, z];
  };

  const reproject = () => {
    const pointPosition = pointGeometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < POINT_COUNT; i += 1) {
      const projected = projectSourceUv(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      pointPosition.setXYZ(i, projected[0], projected[1], projected[2]);
    }
    pointPosition.needsUpdate = true;

    const beamPosition = beamGeometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < beamPositions.length / 3; i += 1) {
      const projected = projectSourceUv(beamPositions[i * 3], beamPositions[i * 3 + 1], beamPositions[i * 3 + 2]);
      beamPosition.setXYZ(i, projected[0], projected[1], projected[2]);
    }
    beamPosition.needsUpdate = true;
    camera.left = -width / height;
    camera.right = width / height;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();
  };

  return {
    renderer,
    resize(nextWidth, nextHeight, dpr) {
      if (disposed) return;
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      pixelRatio = Math.min(Math.max(1, dpr || 1), 1.25);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      pointsMaterial.uniforms.uPixelRatio.value = pixelRatio;
      reproject();
    },
    render(time, pointerX, pointerY, energy) {
      if (disposed) return;
      const clampedEnergy = THREE.MathUtils.clamp(energy, 0, 1);
      pointsMaterial.uniforms.uTime.value = time;
      pointsMaterial.uniforms.uPointer.value.set(
        THREE.MathUtils.clamp(pointerX, -1, 1), THREE.MathUtils.clamp(pointerY, -1, 1),
      );
      pointsMaterial.uniforms.uEnergy.value = clampedEnergy;
      beamMaterial.uniforms.uTime.value = time;
      beamMaterial.uniforms.uPointer.value.copy(pointsMaterial.uniforms.uPointer.value);
      beamMaterial.uniforms.uEnergy.value = clampedEnergy;
      renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(dust, sunlight);
      pointGeometry.dispose();
      pointsMaterial.dispose();
      beamGeometry.dispose();
      beamMaterial.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}