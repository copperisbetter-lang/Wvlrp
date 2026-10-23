// Stacey Lake 3D prototype: water and raised sand island, no panoramas.
// Lake occupies 8% of Base Camp by nominal planform; visual reference is owner-approved artwork.
export const STACEY={x:140,z:-240,radius:113.797805566,waterY:-5.5,islandRadius:22};
export function shoreRadius(a){return STACEY.radius*(1+.038*Math.sin(5*a)+.022*Math.cos(9*a));}
export function islandRadius(a){return STACEY.islandRadius*(1+.10*Math.sin(5*a+.6)+.06*Math.cos(8*a));}
export function lakeRatio(x,z){const dx=x-STACEY.x,dz=z-STACEY.z,a=Math.atan2(dz,dx);return Math.hypot(dx,dz)/shoreRadius(a);}
export function lakeTerrain(x,z,original){
 const dx=x-STACEY.x,dz=z-STACEY.z,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx);
 const ir=islandRadius(a),outer=shoreRadius(a);
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 // Raised sand island with 6m gently sloped underwater beach.
 if(r<=ir){const crest=STACEY.waterY+2.1+1.0*(1-smooth(r/ir));return crest;}
 const islandSlopeEnd=ir+12;
 const shoreBlendStart=outer-18;
 if(r<islandSlopeEnd){
  const t=smooth((r-ir)/(islandSlopeEnd-ir));
  return (STACEY.waterY+2.1)*(1-t)+(STACEY.waterY-2.0)*t;
 }
 if(r>=outer+12)return original;
 // Broad, truly submerged fish habitat: 20–30 feet at the central trough.
 const across=Math.max(0,Math.min(1,(r-islandSlopeEnd)/Math.max(1,shoreBlendStart-islandSlopeEnd)));
 const deep=STACEY.waterY-(6.1+3.0*Math.sin(Math.PI*across)**2);
 const habitat=deep+0.45*Math.sin(x*.09)*Math.cos(z*.11);
 if(r<shoreBlendStart)return habitat;
 // Gradual outer beach shallows and terrain transition; no abrupt vertical wall.
 const shallow=STACEY.waterY-0.7;
 if(r<outer){return habitat*(1-smooth((r-shoreBlendStart)/(outer-shoreBlendStart)))+shallow*smooth((r-shoreBlendStart)/(outer-shoreBlendStart));}
 return shallow*(1-smooth((r-outer)/12))+original*smooth((r-outer)/12);
}
export function installStaceyLake(THREE,scene){
 const waterGeometry=new THREE.BufferGeometry(),verts=[],indices=[],depths=[];
 const radial=64,angular=224;
 for(let i=0;i<=radial;i++){const t=i/radial;for(let j=0;j<=angular;j++){const a=j/angular*Math.PI*2,inner=islandRadius(a)+1.2,outer=shoreRadius(a)+1.0,r=inner+(outer-inner)*t;verts.push(STACEY.x+Math.cos(a)*r,STACEY.waterY,STACEY.z+Math.sin(a)*r);depths.push(t)}}
 for(let i=0;i<radial;i++)for(let j=0;j<angular;j++){const k=i*(angular+1)+j;indices.push(k,k+angular+1,k+1,k+1,k+angular+1,k+angular+2)}
 waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));waterGeometry.setAttribute('aLakeT',new THREE.Float32BufferAttribute(depths,1));waterGeometry.setIndex(indices);waterGeometry.computeVertexNormals();
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},vertexShader:`attribute float aLakeT;uniform float uTime;varying float vT;varying vec2 vP;varying float vWave;void main(){vT=aLakeT;vP=position.xz;float w=sin(dot(position.xz,vec2(.19,.31))+uTime*1.3)*.16+sin(dot(position.xz,vec2(-.33,.14))-uTime*.91)*.10+sin(dot(position.xz,vec2(.09,-.23))+uTime*.67)*.12;vWave=w;vec3 p=position;p.y+=w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`precision mediump float;uniform float uTime;varying float vT;varying vec2 vP;varying float vWave;void main(){float shore=min(vT,1.-vT);float deep=smoothstep(.02,.28,shore);vec3 shallow=vec3(.09,.56,.58);vec3 middle=vec3(.018,.21,.34);vec3 dark=vec3(.008,.055,.13);vec3 c=mix(shallow,middle,smoothstep(.015,.14,shore));c=mix(c,dark,deep*.98);float w1=sin(dot(vP,vec2(.37,.19))+uTime*.63);float w2=sin(dot(vP,vec2(-.23,.41))-uTime*.47);float w3=sin(dot(vP,vec2(.13,-.29))+uTime*.31);float w4=sin(dot(vP,vec2(.061,.083))-uTime*.18);float rip=.38*w1+.29*w2+.20*w3+.13*w4;float glint=pow(max(0.,rip*.5+.5),7.);c+=vec3(.025,.041,.046)*rip+vec3(.018,.028,.032)*glint+vec3(.045,.067,.075)*vWave;gl_FragColor=vec4(c,.91);}`});
 material.depthTest=true;
 // Diagnostic: render an unmistakable, opaque water surface without custom GLSL.
 // If this is visible, the previous shader/material pipeline was at fault.
 const diagnosticWater=new THREE.MeshBasicMaterial({color:0x087fba,side:THREE.DoubleSide,transparent:false,depthWrite:true});
 const useShader=new URLSearchParams(location.search).get('waterShader')==='on';
 const activeWaterMaterial=useShader?material:diagnosticWater;
 // Reliable HD-style color gradient using standard Three.js material, not the broken custom GLSL.
 // Depth colors are assigned per vertex; keep opaque water so the surface stays visible.
 const colors=[];
 const shallowColor=new THREE.Color(0x39b7ba),midColor=new THREE.Color(0x08788f),deepColor=new THREE.Color(0x092c51);
 for(let i=0;i<depths.length;i++){
  const t=depths[i],edge=Math.min(t,1-t)*2;
  const c=shallowColor.clone().lerp(midColor,THREE.MathUtils.smoothstep(edge,.04,.30)).lerp(deepColor,THREE.MathUtils.smoothstep(edge,.28,.76));
  colors.push(c.r,c.g,c.b);
 }
 waterGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 // Reuse the water bump asset already referenced by The Wild's living-waters renderer.
 // Three.js uses a standard lit material, not Babylon's incompatible WaterMaterial.
 const naturalWater=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:false,depthWrite:true,shininess:70,specular:0x31565c});
 const waterNormalURL='https://assets.babylonjs.com/textures/waterbump.png';
 const bumpLoader=new THREE.TextureLoader();
 bumpLoader.setCrossOrigin('anonymous');
 bumpLoader.load(waterNormalURL,texture=>{
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(17,17);
  texture.anisotropy=4;
  naturalWater.bumpMap=texture;
  naturalWater.bumpScale=.095;
  naturalWater.needsUpdate=true;
  water.userData.bumpReady=true;
 },undefined,()=>{water.userData.bumpReady=false;});
 const plainWater=new URLSearchParams(location.search).get('waterPlain')==='on';
 const water=new THREE.Mesh(waterGeometry,plainWater?diagnosticWater:naturalWater);water.name='StaceyLakeWater';water.frustumCulled=false;water.renderOrder=2;scene.add(water);
 const sand=new THREE.MeshStandardMaterial({color:0xd9c298,roughness:1});
 const island=new THREE.Group();island.name='StaceySandIsland';
 // Visible raised sand island; its terrain is part of the continuous world mesh.
 // No trees or island structures until owner approves the next stage.
 scene.add(island);
 const basePositions=waterGeometry.attributes.position.array.slice();
 const bumpTexture=()=>naturalWater.bumpMap;
 let lastWaveUpdate=-1;
 return {update(seconds){material.uniforms.uTime.value=seconds;
  if(plainWater||seconds-lastWaveUpdate<.085)return;
  lastWaveUpdate=seconds;
  if(bumpTexture()){bumpTexture().offset.x=(seconds*.004)%1;bumpTexture().offset.y=(seconds*.0025)%1;}
  const p=waterGeometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const j=i*3,x=basePositions[j],z=basePositions[j+2];
   const w=.085*Math.sin(x*.22+z*.11+seconds*1.1)+.065*Math.sin(x*-.13+z*.26-seconds*.8)+.035*Math.sin(x*.43-z*.18+seconds*1.5);
   p.array[j+1]=STACEY.waterY+w;
  }
  p.needsUpdate=true;
 },water,island};
}
