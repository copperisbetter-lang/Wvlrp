// Independent Stacey Lake world configuration. Meters and seconds throughout.
// Approved lake, canyon, beach, cave and NPC geometry remain in the original game source.
export const STACEY_LAKE_WORLD = Object.freeze({
  id:'the-wild:stacey-lake:v1',
  label:'Stacey Lake',
  terrainRadiusM:340,
  playableRadiusM:332,
  center:Object.freeze({x:140,z:-240}),
  lakeApproxAcres:5,
  worldAreaAcres:Math.round(Math.PI*340*340/4046.8564224),
  beachSpawn:'south-beach',
  returnPath:'../worlds/index.html'
});

// Keeps players on the fully-built part of the landscape; no scene reload or
// teleport occurs while walking, swimming, diving, flying, or exploring the caves.
export function boundLakePosition(x,z,centerX=STACEY_LAKE_WORLD.center.x,centerZ=STACEY_LAKE_WORLD.center.z,radius=STACEY_LAKE_WORLD.playableRadiusM){
  if(!Number.isFinite(x)||!Number.isFinite(z)) return {x:centerX,z:centerZ,clamped:true};
  const dx=x-centerX,dz=z-centerZ,distance=Math.hypot(dx,dz);
  if(distance<=radius) return {x,z,clamped:false};
  const fraction=radius/Math.max(1e-9,distance);
  return {x:centerX+dx*fraction,z:centerZ+dz*fraction,clamped:true};
}

export function staceyLakeProfile(mobile=false,memoryGB=4){
  const constrained=mobile && Number.isFinite(memoryGB) && memoryGB<=4;
  return Object.freeze({
    mobile:!!mobile,
    constrained,
    terrainAngles:mobile?(constrained?192:224):384,
    terrainRings:mobile?(constrained?104:112):150,
    waterAngles:mobile?(constrained?160:192):384,
    waterRings:mobile?(constrained?48:56):96,
    dprStart:mobile?(constrained?.65:.73):1.35,
    dprMin:mobile?(constrained?.45:.52):1,
    dprMax:mobile?(constrained?.85:.95):1.6,
    fishLoading:'underwater-only',
    reflectionEvery:mobile?(constrained?5:4):1,
    reflectionTextureSize:mobile?128:512,
    targetFPS:mobile?30:50
  });
}

// FPS-driven device adaptation is deliberately gradual. Do not change scenery,
// physics, NPC routes or game state when reducing render resolution.
export function createStaceyLakeQualityController(renderer,profile,deviceDpr=1){
  let mode='auto',current=0,low=0,high=0,seconds=0,lastChange=-10;
  const min=Math.min(profile.dprMin,deviceDpr);
  const max=Math.min(profile.dprMax,deviceDpr);
  function apply(value){
    const next=Math.max(min,Math.min(max,Math.round(value*100)/100));
    if(Math.abs(next-current)<.02)return current;
    current=next;
    renderer.setPixelRatio(current);
    return current;
  }
  apply(Math.max(min,Math.min(max,profile.dprStart)));
  return {
    get pixelRatio(){return current;},
    get mode(){return mode;},
    observe(fps,dt=1){
      if(mode!=='auto'||!Number.isFinite(fps)||fps<=0)return current;
      seconds+=Math.min(3,Math.max(.2,dt));
      if(fps<25){low++;high=0;}
      else if(fps>38){high++;low=0;}
      else {low=Math.max(0,low-1);high=Math.max(0,high-1);}
      if(seconds-lastChange<4)return current;
      if(low>=2 && current>min+.02){apply(current-.10);low=0;lastChange=seconds;}
      else if(high>=7 && current<max-.02){apply(current+.05);high=0;lastChange=seconds;}
      return current;
    },
    setMode(next){
      mode=next==='detail'?'detail':'auto';
      low=high=0;lastChange=seconds;
      apply(mode==='detail'?max:profile.dprStart);
      return mode;
    }
  };
}
