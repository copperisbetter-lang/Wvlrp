/** Animated lake water adapted for Babylon.js; preserves streamed terrain and existing lake sites. */
export function installWildWaters(B,scene,{height,getPosition,seed=1}){
 const sites=[{x:-165,z:-180,rx:72,rz:52},{x:410,z:-340,rx:95,rz:72}];
 const root=new B.TransformNode("Wild living waters",scene);
 const shaderKey="wildLakeWater20261018";
 B.Effect.ShadersStore[shaderKey+"VertexShader"]=`
 precision highp float;
 attribute vec3 position;
 attribute vec2 uv;
 uniform mat4 worldViewProjection;
 uniform float time;
 varying vec2 vUV;
 varying vec3 vWorld;
 varying float vWave;
 void main(){
   vec3 p=position;
   float w=sin(p.x*.21+time*1.35)*cos(p.z*.17+time*.83)*.065
     +sin(p.x*.47-p.z*.28+time*1.9)*.027;
   p.y+=w;
   vWave=w;
   vUV=uv;
   vWorld=p;
   gl_Position=worldViewProjection*vec4(p,1.);
 }`;
 B.Effect.ShadersStore[shaderKey+"FragmentShader"]=`
 precision highp float;
 varying vec2 vUV;
 varying vec3 vWorld;
 varying float vWave;
 uniform float time;
 uniform float creek;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){
   vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
              mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
 }
 void main(){
   vec2 p=vWorld.xz;
   float n=noise(p*.085+vec2(time*.045,time*.035));
   float rip=sin(p.x*.72+p.y*.31+time*2.1)*sin(p.y*.57-p.x*.25+time*1.3);
   float fine=noise(p*.64+vec2(time*.17,-time*.11));
   vec3 deep=vec3(.035,.115,.105);
   vec3 shallow=vec3(.115,.235,.185);
   vec3 water=mix(deep,shallow,clamp(n*.68+.12+creek*.18,0.,1.));
   float glint=pow(max(0.,rip*.5+.5),18.)*.18+pow(fine,9.)*.07;
   water+=vec3(.65,.75,.68)*glint;
   water+=vWave*.17;
   gl_FragColor=vec4(water, .96);
 }`;
 function makeMaterial(name,isCreek){
   const m=new B.ShaderMaterial(name,scene,{vertex:shaderKey,fragment:shaderKey},{
     attributes:["position","uv"],uniforms:["worldViewProjection","time","creek"],
     needAlphaBlending:true
   });
   m.backFaceCulling=false;
   m.setFloat("creek",isCreek?1:0);
   return m;
 }
 const mat=makeMaterial("animated Appalachian lake",false);
 const creekMat=makeMaterial("animated Appalachian streams",true);
 const groups=[];
 // Never show the old flat shader as a substitute for the real lake.
 function waterMesh(name,points,material,indices,uvs){
   const mesh=new B.Mesh(name,scene),positions=points.flat();
   const d=new B.VertexData();
   d.positions=positions;d.indices=indices;d.uvs=uvs;
   // WaterMaterial requires vertex normals for its lighting/reflection shader.
   d.normals=new Array(positions.length).fill(0);
   for(let i=0;i<positions.length;i+=3)d.normals[i+1]=1;
   d.applyToMesh(mesh,true);
   mesh.material=material;mesh.parent=root;mesh.isPickable=false;
   return mesh;
 }
 for(const [idx,s] of sites.entries()){
   // Keep water below surrounding terrain instead of flooding the shoreline.
   const lakeLevel=height(s.x,s.z)-0.35;
   const points=[],uvs=[],indices=[];
   const segments=128;
   // Terrain-clipped grid: no center-to-edge triangles that flood dry ground.
   const nx=80,nz=64;
   for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
     const x=s.x+(ix/nx*2-1)*s.rx*1.08,z=s.z+(iz/nz*2-1)*s.rz*1.08;
     points.push([x,lakeLevel,z]);uvs.push(x/12,z/12);
   }
   for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
     const a=iz*(nx+1)+ix,b=a+1,d=a+nx+1,e=d+1;
     const x=s.x+((ix+.5)/nx*2-1)*s.rx*1.08;
     const z=s.z+((iz+.5)/nz*2-1)*s.rz*1.08;
     const dx=(x-s.x)/s.rx,dz=(z-s.z)/s.rz;
     const angle=Math.atan2(dz,dx);
     const radius=1+.055*Math.sin(5*angle+idx)+.025*Math.sin(11*angle+idx*2);
     if(dx*dx+dz*dz>radius*radius)continue;
     // Require all four corners to be submerged to prevent blue land overlays.
     if([a,b,d,e].some(k=>height(points[k][0],points[k][2])>lakeLevel-.035))continue;
     indices.push(a,d,b,b,d,e);
   }
   const mesh=waterMesh("living lake "+(idx+1),points,mat,indices,uvs);
   mesh.setEnabled(false);
   mesh.metadata={...(mesh.metadata||{}),wildLakeSurface:true};
   groups.push({mesh,x:s.x,z:s.z,range:450});
 }
 for(let stream=0;stream<3;stream++){
   const points=[],uvs=[],indices=[],origin=sites[stream%2],n=72;
   for(let i=0;i<n;i++){
     const t=i/(n-1),z=origin.z+(t-.5)*700;
     const x=origin.x+origin.rx*.7+30*Math.sin(t*10+stream*2)+stream*75;
     const y=height(x,z)-.12,width=2.6+1.1*Math.sin(t*12+stream);
     points.push([x-width,y,z],[x+width,y,z]);
     uvs.push(0,i*.55,1,i*.55);
     if(i<n-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
   }
   const mesh=waterMesh("flowing mountain creek "+stream,points,creekMat,indices,uvs);
   groups.push({mesh,x:origin.x+origin.rx*.7+stream*75,z:origin.z,range:510});
 }
 // Load Babylon's published WaterMaterial renderer, not a homemade color shader.
 // Keep the lightweight shader as a temporary fallback until the library loads.
 const libraryURL="https://cdn.babylonjs.com/materialsLibrary/babylon.waterMaterial.js";
 const bumpURL="https://assets.babylonjs.com/textures/waterbump.png";
 let realWater=null,waterBump=null,disposed=false;
 const loadWaterLibrary=()=>new Promise((resolve,reject)=>{
   if(B.WaterMaterial){resolve();return;}
   const script=document.createElement("script");
   script.src=libraryURL;script.async=true;
   script.onload=()=>B.WaterMaterial?resolve():reject(new Error("WaterMaterial missing"));
   script.onerror=()=>reject(new Error("WaterMaterial download failed"));
   document.head.appendChild(script);
 });
 loadWaterLibrary().then(()=>{
   if(disposed)return;
   realWater=new B.WaterMaterial("Babylon realistic reflective lake",scene,new B.Vector2(512,512));
   waterBump=new B.Texture(bumpURL,scene);
   waterBump.uScale=2;waterBump.vScale=2;
   realWater.bumpTexture=waterBump;
   realWater.disableLighting=false;
   realWater.alpha=1;
   realWater.windForce=5;
   realWater.windDirection=new B.Vector2(.7,.3);
   realWater.waveHeight=.12;
   realWater.bumpHeight=.25;
   realWater.waveLength=.35;
   realWater.waveSpeed=.55;
   realWater.waveCount=18;
   realWater.waterColor=new B.Color3(.14,.27,.19);
   realWater.waterColor2=new B.Color3(.19,.32,.23);
   realWater.colorBlendFactor=.65;
   realWater.colorBlendFactor2=.65;
   realWater.bumpAffectsReflection=true;
   realWater.useWorldCoordinatesForWaveDeformation=true;
   realWater.specularColor=new B.Color3(.38,.45,.40);
   realWater.backFaceCulling=false;
   // Reflect a limited set of nearby shoreline scenery to preserve mobile FPS.
   const reflected=new Set();
   const refreshReflections=()=>{
     if(disposed||!realWater)return;
     for(const mesh of scene.meshes){
       if(reflected.size>=55)break;
       if(reflected.has(mesh)||groups.some(g=>g.mesh===mesh)||!mesh.isEnabled()||!mesh.isVisible)continue;
       if(/ground|terrain|landscape|water|lake|river|creek|sky/i.test(mesh.name))continue;
       const box=mesh.getBoundingInfo?.().boundingBox;
       if(!box)continue;
       const p=box.centerWorld;
       if(!sites.some(site=>Math.hypot(p.x-site.x,p.z-site.z)<145))continue;
       reflected.add(mesh);realWater.addToRenderList(mesh);
     }
   };
   refreshReflections();
   window.__wildLakeReflectionCount=reflected.size;
   // Re-check as streamed terrain and trees arrive.
   let refreshFrames=0;
   const reflectionObserver=scene.onBeforeRenderObservable.add(()=>{
     if(++refreshFrames%240===0){refreshReflections();window.__wildLakeReflectionCount=reflected.size;}
   });
   root.metadata={...(root.metadata||{}),reflectionObserver};
   for(const g of groups){g.mesh.material=realWater;g.mesh.setEnabled(false);}
   window.__wildLakeMaterialStatus="reflective "+reflected.size+" objects, bump "+(waterBump.isReady()?"ready":"loading");
   // Streaming terrain can create a second blue surface. Suppress duplicate water meshes.
   const hideOtherWater=()=>{
     for(const mesh of scene.meshes){
       if(groups.some(g=>g.mesh===mesh))continue;
       if(!/lake|water|river|creek/i.test(mesh.name))continue;
       if(mesh.metadata?.wildLakeSurface)continue;
       if(mesh.isEnabled())mesh.setEnabled(false);
     }
   };
   hideOtherWater();
   let hideTicks=0;
   const duplicateObserver=scene.onBeforeRenderObservable.add(()=>{
     if(++hideTicks%120===0)hideOtherWater();
   });
   root.metadata={...(root.metadata||{}),duplicateObserver};
   realWater.onCompiled=null;
 }).catch(err=>{window.__wildLakeMaterialStatus="FAILED: "+err.message;console.error("Reflective lake renderer unavailable; old flat lake hidden",err);});
 let frame=0;
 const observer=scene.onBeforeRenderObservable.add(()=>{
   const t=performance.now()*.001;
   mat.setFloat("time",t);creekMat.setFloat("time",t);
   frame++;
   if(frame%15!==0)return;
   const p=getPosition();
   for(const g of groups)g.mesh.setEnabled(!!realWater&&Math.hypot(p.x-g.x,p.z-g.z)<g.range);
 });
 return {sites,dispose(){
   scene.onBeforeRenderObservable.remove(observer);
   disposed=true;
   if(root.metadata?.reflectionObserver)scene.onBeforeRenderObservable.remove(root.metadata.reflectionObserver);
   if(root.metadata?.duplicateObserver)scene.onBeforeRenderObservable.remove(root.metadata.duplicateObserver);
   root.dispose(false,true);mat.dispose();creekMat.dispose();realWater?.dispose();waterBump?.dispose();
 }};
}
