// Test-only GPU/native-rAF telemetry. Optional paired-capture pause holds the
// already identified renderer callback, like pausing CSS, without seeking time,
// altering uniforms/eligibility or changing production code.
export const studioTelemetry = `
  window.__studioTiming={samples:[],rafStamp:null,dustSnapshots:[]};
  const rendererCallbacks=new WeakSet(),heldCallbacks=new Set();
  let currentCallback=null;
  const nativeRaf=window.requestAnimationFrame;
  window.requestAnimationFrame=function(callback){return nativeRaf.call(this,stamp=>{
    if(window.__studioCaptureFrozen&&rendererCallbacks.has(callback)){heldCallbacks.add(callback);return}
    const previous=window.__studioTiming.rafStamp;window.__studioTiming.rafStamp=stamp;
    currentCallback=callback;
    try{return callback(stamp)}finally{window.__studioTiming.rafStamp=previous;currentCallback=null}
  })};
  window.__studioCaptureResume=()=>{
    window.__studioCaptureFrozen=false;
    for(const callback of heldCallbacks)window.requestAnimationFrame(callback);
    heldCallbacks.clear();
  };
  const uniformNames=new WeakMap(),gl=WebGL2RenderingContext.prototype;
  const lookup=gl.getUniformLocation,one=gl.uniform1f;
  gl.getUniformLocation=function(program,name){const location=lookup.call(this,program,name);
    if(location)uniformNames.set(location,name);return location};
  gl.uniform1f=function(location,value){
    if(uniformNames.get(location)==='uTime' && window.__studioTiming.rafStamp!==null){
      if(currentCallback&&this.canvas.closest('.vanta-studio-atmosphere'))rendererCallbacks.add(currentCallback);
      const samples=window.__studioTiming.samples,stamp=window.__studioTiming.rafStamp;
      if(samples.at(-1)?.stamp!==stamp)samples.push({stamp,time:value});
    }
    return one.call(this,location,value);
  };
  const draw=gl.drawArrays;
  gl.drawArrays=function(mode,...args){
    const result=draw.call(this,mode,...args),snapshots=window.__studioTiming.dustSnapshots;
    const time=window.__studioTiming.samples.at(-1)?.time;
    if(window.__studioDustProbe && mode===this.POINTS && this.canvas.closest('.vanta-studio-atmosphere') &&
      (snapshots.length===0 || (snapshots.length===1 && time-snapshots[0].time>=2.2))){
      // Read the REAL point pass before rays are drawn. Two readbacks total,
      // never during the later scheduler profile. No shader/clock modifications.
      const width=this.drawingBufferWidth,height=this.drawingBufferHeight;
      const pixels=new Uint8Array(width*height*4),seen=new Uint8Array(width*height),centers=[];
      this.readPixels(0,0,width,height,this.RGBA,this.UNSIGNED_BYTE,pixels);
      for(let i=0;i<seen.length;i++){
        if(seen[i]||pixels[i*4+3]<3)continue;
        const queue=[i];seen[i]=1;let weight=0,x=0,y=0;
        for(let at=0;at<queue.length;at++){
          const p=queue[at],px=p%width,py=Math.floor(p/width),alpha=pixels[p*4+3];
          weight+=alpha;x+=px*alpha;y+=py*alpha;
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            const nx=px+dx,ny=py+dy,n=ny*width+nx;
            if(nx>=0&&nx<width&&ny>=0&&ny<height&&!seen[n]&&pixels[n*4+3]>=3){seen[n]=1;queue.push(n)}
          }
        }
        centers.push({x:x/weight,y:y/weight});
      }
      snapshots.push({time,width,height,centers});
    }
    return result;
  };
`;