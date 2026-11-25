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
  for(let j=0;j<=10;j++){let f=j/10,back=2.0*f;pos.push(crest[0]+Math.cos(a)*back,crest[1]+f*22,crest[2]+Math.sin(a)*back);coords.push(u,1-(v+(0.25-v)*f));alpha.push(weight(i))}}
 for(let i=0;i<end-start;i++)for(let j=0;j<10;j++){let a=i*11+j,b=a+11;idx.push(a,b,a+1,b,b+1,a+1)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(coords,2));geo.setAttribute('edgeAlpha',new T.Float32BufferAttribute(alpha,1));geo.setIndex(idx);
 const mat=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,alphaTest:.02,fog:true});
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
 for(let x=0;x<c.width;x++){let boundary=Math.round(c.height*.45);for(let y=Math.round(c.height*.22);y<Math.round(c.height*.46);y++){let n=0;for(let k=0;k<6;k++){let p=((y+k)*c.width+x)*4;let r=d[p],g=d[p+1],b=d[p+2];if(g>b*1.07&&g>r*.94&&g<200)n++}if(n>=4){boundary=y;break}}for(let y=0;y<c.height;y++)d[(y*c.width+x)*4+3]=Math.round(255*smooth((y-boundary)/3))}
 ctx.putImageData(pixels,0,0);if(forestLayer){scene.remove(forestLayer);forestLayer.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose()}})}forestLayer=buildPhotoForest(T,scene,L,canopy);oldPhoto?.dispose();oldCanopy?.dispose();oldPhoto=tex(c);oldCanopy=tex(canopy);uniforms.lakePhoto.value=oldPhoto;mat.map=oldCanopy;mat.needsUpdate=true;ready=true;report.state='photo + water loaded';sync()
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
// Cut real foliage from the approved photo; no round primitive tree crowns.
function buildPhotoForest(T,scene,L,canopy){
 const group=new T.Group(),N=L.N;let seed=947;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 // Distinct canopy patches from the photograph, cropped and feathered into stand-alone woodland clusters.
 const ranges=[[.035,.19],[.20,.34],[.35,.48],[.53,.67],[.69,.83],[.84,.985]];
 for(let k=0;k<ranges.length;k++){
  const [lo,hi]=ranges[k],canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');
  c.drawImage(canopy,lo*canopy.width,.24*canopy.height,(hi-lo)*canopy.width,.34*canopy.height,0,0,256,256);
  const im=c.getImageData(0,0,256,256),d=im.data;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const p=(y*256+x)*4;const edge=Math.min(1,x/22,(255-x)/22);const bottom=Math.min(1,(255-y)/30);d[p+3]*=Math.max(0,edge*bottom)}
  c.putImageData(im,0,0);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const positions=[];
  for(let i=k*3;i<N;i+=18){let crest=L.rings[i].at(-1),a=i/N*Math.PI*2,edge=Math.hypot(crest[0],crest[2]),cliff=i>=L.cliffStart+9&&i<=L.cliffEnd-9;
   for(let j=0;j<5;j++){let rr=edge+(cliff?6:0)+j*9+rng()*7,aa=a+(rng()-.5)*.065;
    positions.push({x:rr*Math.cos(aa),z:rr*Math.sin(aa),y:crest[1]+(cliff?-2:0)+rng()*2,h:12+rng()*8,w:12+rng()*9,rot:aa+Math.PI/2+(rng()-.5)*.7})}}
  const mat=new T.MeshBasicMaterial({map:tex,alphaTest:.18,side:T.DoubleSide,depthWrite:true,fog:true});
  const mesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),mat,positions.length*2),ob=new T.Object3D();
  positions.forEach((p,i)=>{for(let j=0;j<2;j++){ob.position.set(p.x,p.y+p.h*.42,p.z);ob.rotation.set(0,p.rot+j*Math.PI/2,0);ob.scale.set(p.w,p.h,1);ob.updateMatrix();mesh.setMatrixAt(i*2+j,ob.matrix)}});
  mesh.computeBoundingSphere();group.add(mesh)
 }
 scene.add(group);return group;
}
