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
 function waterMesh(name,points,material,indices,uvs){
   const mesh=new B.Mesh(name,scene),positions=points.flat();
   const d=new B.VertexData();
   d.positions=positions;d.indices=indices;d.uvs=uvs;
   d.applyToMesh(mesh);
   mesh.material=material;mesh.parent=root;mesh.isPickable=false;
   return mesh;
 }
 for(const [idx,s] of sites.entries()){
   const lakeLevel=height(s.x,s.z)+2;
   const points=[[s.x,lakeLevel,s.z]],uvs=[0,0],indices=[];
   const segments=128;
   for(let i=0;i<=segments;i++){
     const a=i*Math.PI*2/segments;
     const r=1+.055*Math.sin(5*a+idx)+.025*Math.sin(11*a+idx*2);
     const x=s.x+Math.cos(a)*s.rx*r,z=s.z+Math.sin(a)*s.rz*r;
     points.push([x,lakeLevel,z]);uvs.push(x/12,z/12);
     if(i>0)indices.push(0,i,i+1);
   }
   const mesh=waterMesh("living lake "+(idx+1),points,mat,indices,uvs);
   groups.push({mesh,x:s.x,z:s.z,range:450});
 }
 for(let stream=0;stream<3;stream++){
   const points=[],uvs=[],indices=[],origin=sites[stream%2],n=72;
   for(let i=0;i<n;i++){
     const t=i/(n-1),z=origin.z+(t-.5)*700;
     const x=origin.x+origin.rx*.7+30*Math.sin(t*10+stream*2)+stream*75;
     const y=height(x,z)+.08,width=2.6+1.1*Math.sin(t*12+stream);
     points.push([x-width,y,z],[x+width,y,z]);
     uvs.push(0,i*.55,1,i*.55);
     if(i<n-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
   }
   const mesh=waterMesh("flowing mountain creek "+stream,points,creekMat,indices,uvs);
   groups.push({mesh,x:origin.x+origin.rx*.7+stream*75,z:origin.z,range:510});
 }
 let frame=0;
 const observer=scene.onBeforeRenderObservable.add(()=>{
   const t=performance.now()*.001;
   mat.setFloat("time",t);creekMat.setFloat("time",t);
   if(++frame%15!==0)return;
   const p=getPosition();
   for(const g of groups)g.mesh.setEnabled(Math.hypot(p.x-g.x,p.z-g.z)<g.range);
 });
 return {sites,dispose(){
   scene.onBeforeRenderObservable.remove(observer);
   root.dispose(false,true);mat.dispose();creekMat.dispose();
 }};
}
