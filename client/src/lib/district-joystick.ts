export const DISTRICT_JOYSTICK_DEAD_ZONE = 0.18;

export interface DistrictJoystickProjection {
  x: number;
  y: number;
  magnitude: number;
  offsetX: number;
  offsetY: number;
}

export function projectDistrictJoystick(
  deltaX: number,
  deltaY: number,
  radius: number,
  deadZone = DISTRICT_JOYSTICK_DEAD_ZONE,
): DistrictJoystickProjection {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || !Number.isFinite(radius) || radius <= 0) {
    return { x: 0, y: 0, magnitude: 0, offsetX: 0, offsetY: 0 };
  }

  const distance = Math.hypot(deltaX, deltaY);
  const clampedDistance = Math.min(distance, radius);
  const offsetScale = distance > 0 ? clampedDistance / distance : 0;
  const offsetX = deltaX * offsetScale;
  const offsetY = deltaY * offsetScale;
  const normalized = clampedDistance / radius;
  const safeDeadZone = Math.max(0, Math.min(0.9, deadZone));
  if (normalized <= safeDeadZone || distance === 0) {
    return { x: 0, y: 0, magnitude: 0, offsetX, offsetY };
  }

  return {
    x: deltaX / distance,
    y: deltaY / distance,
    magnitude: Math.min(1, (normalized - safeDeadZone) / (1 - safeDeadZone)),
    offsetX,
    offsetY,
  };
}
