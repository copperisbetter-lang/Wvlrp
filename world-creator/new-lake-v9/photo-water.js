// Checkpoint 06: selected panorama, cliff texture and actual lake water blend.
export function installPhoto(T,scene,terrain,L,report){
 const uniforms={lakePhoto:{value:new T.Texture()},photoReady:{value:0},photoTime:{value:0},above:{value:1}};
 const N=L.N,start=L.cliffStart,end=L.cliffEnd;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 const weight=i=>i>=start&&i<=end?smooth((Math.min(i-start,end-i)-10)/7):0;
 const bearing=i=>.16+.68*clamp((i-start-11)/(end-start-22),0,1);
 const trace=(u,points)=>{for(let i=1;i<points.length;i++){let a=points[i-1],b=points[i];if(u<=b[0])return a[1]+(b[1]-a[1])*clamp((u-a[0])/(b[0]-a[0]),0,1)}return points.at(-1)[1]};
 const waterline=u=>trace(u,[[0,.795],[.16,.786],[.25,.778],[.40,.777],[.62,.78],[.80,.789],[1,.80]]);
 const crestline=u=>trace(u,[[0,.57],[.16,.55],[.25,.53],[.34,.57],[.43,.63],[.52,.60],[.63,.55],[.73,.55],[.84,.57],[1,.60]]);
 const uv=[],weights=[];
 for(let i=0;i<N;i++){const ring=L.rings[i],crest=ring.at(-1)[1];for(let j=0;j<ring.length;j++){const u=bearing(i),y=clamp(ring[j][1]/crest,0,1);uv.push(u,1-(waterline(u)+(crestline(u)-waterline(u))*y));weights.push(j>=5?weight(i):0)}}
 terrain.geometry.setAttribute('photoUV',new T.Float32BufferAttribute(uv,2));terrain.geometry.setAttribute('photoWeight',new T.Float32BufferAttribute(weights,1));
 const previous=terrain.material.onBeforeCompile;
 terrain.material.onBeforeCompile=s=>{
 previous?.(s);Object.assign(s.uniforms,uniforms);
 s.vertexShader='attribute vec2 photoUV; attribute float photoWeight; varying vec2 vPhotoUV; varying float vPhotoWeight;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPhotoUV=photoUV;vPhotoWeight=photoWeight;');
 s.fragmentShader='uniform sampler2D lakePhoto;uniform float photoReady,above;varying vec2 vPhotoUV;varying float vPhotoWeight;\n'+s.fragmentShader.replace('#include <opaque_fragment>','if(photoReady*above*vPhotoWeight>0.001){vec3 px=texture2D(lakePhoto,vPhotoUV).rgb;outgoingLight=mix(outgoingLight,px,vPhotoWeight);}\n#include <opaque_fragment>');
 };
 // Cliff canopy uses the exact same U and crest V as the solid rock below.
 const pos=[],coords=[],alpha=[],idx=[];
 for(let i=start;i<=end;i++){let crest=L.rings[i].at(-1),u=bearing(i),v=crestline(u),a=i/N*Math.PI*2;
  for(let j=0;j<=10;j++){let f=j/10,back=1.5*f,sourceY=v+(0.18-v)*f;pos.push(crest[0]+Math.cos(a)*back,crest[1]+(v-sourceY)*105,crest[2]+Math.sin(a)*back);coords.push(u,1-sourceY);alpha.push(weight(i))}}
 for(let i=0;i<end-start;i++)for(let j=0;j<10;j++){let a=i*11+j,b=a+11;idx.push(a,b,a+1,b,b+1,a+1)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(coords,2));geo.setAttribute('edgeAlpha',new T.Float32BufferAttribute(alpha,1));geo.setIndex(idx);
 const mat=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,alphaTest:.005,fog:true});
 mat.onBeforeCompile=s=>{
 s.vertexShader='attribute float edgeAlpha;varying float vEdgeAlpha;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEdgeAlpha=edgeAlpha;');
 s.fragmentShader='varying float vEdgeAlpha;\n'+s.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a*=vEdgeAlpha;\n#include <alphatest_fragment>');
 };
 const ribbon=new T.Mesh(geo,mat);ribbon.visible=false;ribbon.renderOrder=1;scene.add(ribbon);
 let forestLayer=null;
 let ready=false,enabled=true,submerged=false,oldPhoto=null,oldCanopy=null;
 function sync(){uniforms.photoReady.value=ready&&enabled?1:0;uniforms.above.value=submerged?0:1;ribbon.visible=ready&&enabled&&!submerged;if(forestLayer)forestLayer.visible=ready&&enabled&&!submerged}
 report.state='choose approved panorama';report.setVisible=v=>{enabled=v;sync()};report.setSubmerged=v=>{submerged=v;sync()};
 function tex(c){let t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;return t}
 async function load(blob){
 const bmp=await createImageBitmap(blob);if(bmp.width/bmp.height<1.8||bmp.width/bmp.height>2.2){bmp.close();throw Error('Select the approved wide 2:1 panorama.')}
 const c=document.createElement('canvas');c.width=Math.min(bmp.width,2048);c.height=Math.round(c.width*bmp.height/bmp.width);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close();
 const canopy=document.createElement('canvas');canopy.width=c.width;canopy.height=c.height;const ctx=canopy.getContext('2d');ctx.drawImage(c,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data;
 for(let x=0;x<c.width;x++){let boundary=Math.round(c.height*.48);for(let y=Math.round(c.height*.18);y<Math.round(c.height*.50);y++){let count=0;for(let k=0;k<7;k++){let p=((y+k)*c.width+x)*4;let r=d[p],g=d[p+1],b=d[p+2];if(g>b*1.14&&g>r*.95&&g<200)count++}if(count>=4){boundary=y;break}}for(let y=0;y<c.height;y++){let p=(y*c.width+x)*4,r=d[p],g=d[p+1],b=d[p+2];let edge=smooth((y-boundary+5)/12);let chroma=smooth((g-b+4)/20);let skyReject=y<boundary+32?chroma:1;d[p+3]=Math.round(255*edge*skyReject)}}
 ctx.putImageData(pixels,0,0);if(forestLayer){scene.remove(forestLayer);forestLayer.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose()}})}forestLayer=buildPhotoForest(T,scene,L,canopy);report.onPhoto?.(c);oldPhoto?.dispose();oldCanopy?.dispose();oldPhoto=tex(c);oldCanopy=tex(canopy);uniforms.lakePhoto.value=oldPhoto;mat.map=oldCanopy;mat.needsUpdate=true;ready=true;report.state='photo + water loaded';sync()
 }
 function db(){return new Promise((resolve,reject)=>{let q=indexedDB.open('wild-new-lake-v6',1);q.onupgradeneeded=()=>q.result.createObjectStore('assets');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
 async function store(blob){let d=await db();await new Promise((resolve,reject)=>{let t=d.transaction('assets','readwrite');t.objectStore('assets').put(blob,'panorama');t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()}
 async function restore(){let d=await db();let b=await new Promise((resolve,reject)=>{let q=d.transaction('assets').objectStore('assets').get('panorama');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});d.close();if(b)await load(b)}
 document.getElementById('photoFile').onchange=async e=>{const b=e.target.files?.[0];if(!b)return;try{await load(b);try{await store(b)}catch(e){report.state+=' (session only)'}}catch(e){report.state='photo error: '+e.message}};restore().catch(()=>{});
 return {uniforms,weight,bearing,waterline,report};
}
export function lakeSurface(T,L,photo){
 const p=[],uv=[],idx=[],N=L.N;
 for(let i=0;i<=N;i++){let k=i%N,[x,z]=L.shore[k],r=Math.hypot(x,z);for(let j=0;j<=4;j++){let f=[0,.42,.68,.86,1][j];p.push(x*f,.012,z*f);const u=photo.bearing(k);uv.push(u,r*(1-f),photo.weight(k),photo.waterline(u))}}
 for(let i=0;i<N;i++)for(let j=0;j<4;j++){let a=i*5+j,b=a+5;if(j===0)idx.push(a,b+1,a+1);else idx.push(a,b,b+1,a,b+1,a+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('waterPhotoUV',new T.Float32BufferAttribute(uv,4));g.setIndex(idx);
 const m=new T.ShaderMaterial({uniforms:{...photo.uniforms,deep:{value:new T.Color(0x285343)},shallow:{value:new T.Color(0x637e63)}},vertexShader:'attribute vec4 waterPhotoUV;varying vec3 wp;varying vec4 vPhoto;void main(){wp=position;vPhoto=waterPhotoUV;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float photoTime,photoReady,above;uniform sampler2D lakePhoto;uniform vec3 deep,shallow;varying vec3 wp;varying vec4 vPhoto;void main(){float d=vPhoto.y,t=photoTime;float a=sin(wp.x*1.7+wp.z*2.1+t*1.2),b=sin(wp.x*3.9-wp.z*1.1-t*.8),c=sin(wp.z*7.2+wp.x*.6+t*2.0);float ripple=a*.007+b*.004+c*.002+pow(max(0.,a*.4+b*.35+c*.25),12.)*.025;vec3 col=mix(deep,shallow,1.-smoothstep(0.,8.,d))+ripple;float u=vPhoto.x+.0025*sin(wp.z*.9+t*.75)+.0015*b;float v=1.-(vPhoto.w+.007+(0.97-vPhoto.w)*clamp(d/37.,0.,1.)+.002*a);float blend=photoReady*above*vPhoto.z*(1.-smoothstep(7.,37.,d));if(blend>0.001){vec3 photographed=texture2D(lakePhoto,vec2(clamp(u,.12,.88),v)).rgb;col=mix(col,photographed+ripple*.65,blend);}gl_FragColor=vec4(max(col,vec3(0.)),mix(.82,.96,blend));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',transparent:true,depthWrite:false,side:T.DoubleSide});
 return {geometry:g,material:m};
}
// Photographic foliage cards, cut with irregular silhouettes and aspect-correct source sampling.
function buildPhotoForest(T,scene,L,canopy){
 const group=new T.Group(),N=L.N;let seed=947;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const ranges=[[.035,.18],[.20,.34],[.35,.48],[.53,.67],[.69,.83],[.84,.975]];
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
 for(let k=0;k<ranges.length;k++){
  const [lo,hi]=ranges[k],canvas=document.createElement('canvas');const sw=(hi-lo)*canopy.width,sh=.37*canopy.height;
  canvas.width=Math.round(sw);canvas.height=Math.round(sh);const c=canvas.getContext('2d');c.drawImage(canopy,lo*canopy.width,.18*canopy.height,sw,sh,0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height,im=c.getImageData(0,0,W,H),d=im.data;
  // Entire perimeter tapers irregularly. Feather follows colour detail, not rectangular borders.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=(y*W+x)*4,u=x/(W-1),v=y/(H-1),r=d[p],g=d[p+1],b=d[p+2];
   const left=.045+.025*Math.sin(v*29+k)+.013*Math.sin(v*89),right=.955+.025*Math.cos(v*31+k);
   const base=.93+.037*Math.sin(u*35+k)+.018*Math.sin(u*83),top=.015+.02*Math.cos(u*34+k);
   let edge=smooth((u-left)/.17)*smooth((right-u)/.17)*smooth((base-v)/.19)*smooth((v-top)/.085);
   let foliage=smooth((g-b+4)/17)*smooth((g-r+14)/26);
   d[p+3]=Math.round(d[p+3]*edge*foliage);
  }
  c.putImageData(im,0,0);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=2;
  const positions=[];
  for(let i=k*3;i<N;i+=18){let crest=L.rings[i].at(-1),a=i/N*Math.PI*2,edge=Math.hypot(crest[0],crest[2]),cliff=i>=L.cliffStart+9&&i<=L.cliffEnd-9;
   // Keep the registered cliff canopy unobstructed. Additional foliage sits behind its silhouette.
   for(let j=0;j<(cliff?2:4);j++){let rr=edge+(cliff?18:1)+j*11+rng()*7,aa=a+(rng()-.5)*.075,h=13+rng()*7;
    positions.push({x:rr*Math.cos(aa),z:rr*Math.sin(aa),y:crest[1]+(cliff?-3:0)+rng()*1.6,h,w:h*W/H,rot:aa+Math.PI/2+(rng()-.5)*.28})}}
  // One tangent-facing card per cluster. Avoid intersecting crossed planes and obvious X seams.
  const mat=new T.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.015,depthWrite:false,side:T.DoubleSide,fog:true});
  const mesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),mat,positions.length),ob=new T.Object3D();
  positions.forEach((p,i)=>{ob.position.set(p.x,p.y+p.h*.42,p.z);ob.rotation.set(0,p.rot,0);ob.scale.set(p.w,p.h,1);ob.updateMatrix();mesh.setMatrixAt(i,ob.matrix)});
  mesh.computeBoundingSphere();group.add(mesh)
 }
 scene.add(group);return group;
}
