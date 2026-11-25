// Checkpoint 06: selected panorama, cliff texture and actual lake water blend.
export function installPhoto(T,scene,terrain,L,report){
 const uniforms={lakePhoto:{value:new T.Texture()},photoReady:{value:0},photoTime:{value:0},above:{value:1}};
 const N=L.N,start=L.cliffStart,end=L.cliffEnd;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 const weight=i=>i>=start&&i<=end?smooth(Math.min(i-start,end-i)/7):0;
 const bearing=i=>.12+.76*clamp((i-start)/(end-start),0,1);
 const uv=[],weights=[];
 for(let i=0;i<N;i++){const ring=L.rings[i],crest=ring.at(-1)[1];for(let j=0;j<ring.length;j++){uv.push(bearing(i),1-(.773-.244*clamp(ring[j][1]/crest,0,1)));weights.push(j>=5?weight(i):0)}}
 terrain.geometry.setAttribute('photoUV',new T.Float32BufferAttribute(uv,2));terrain.geometry.setAttribute('photoWeight',new T.Float32BufferAttribute(weights,1));
 const previous=terrain.material.onBeforeCompile;
 terrain.material.onBeforeCompile=s=>{
 previous?.(s);Object.assign(s.uniforms,uniforms);
 s.vertexShader='attribute vec2 photoUV; attribute float photoWeight; varying vec2 vPhotoUV; varying float vPhotoWeight;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPhotoUV=photoUV;vPhotoWeight=photoWeight;');
 s.fragmentShader='uniform sampler2D lakePhoto;uniform float photoReady,above;varying vec2 vPhotoUV;varying float vPhotoWeight;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(photoReady*above*vPhotoWeight>0.001){vec3 px=texture2D(lakePhoto,vPhotoUV).rgb;diffuseColor.rgb=mix(diffuseColor.rgb,px,vPhotoWeight*.93);}');
 };
 const pos=[],coords=[],idx=[];
 for(let i=0;i<=N;i++){let k=i%N,crest=L.rings[k].at(-1),a=k/N*Math.PI*2,r=Math.hypot(crest[0],crest[2])+1;
 let u=k>=start&&k<=end?bearing(k):.12+.76*(.5+.5*Math.cos((k-end+N)%N/(N-(end-start))*Math.PI));
 for(let j=0;j<=8;j++){let f=j/8;pos.push(r*Math.cos(a),crest[1]-2+f*25,r*Math.sin(a));coords.push(u,1-(.56-f*.30))}}
 for(let i=0;i<N;i++)for(let j=0;j<8;j++){let a=i*9+j,b=a+9;idx.push(a,b,a+1,b,b+1,a+1)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(coords,2));geo.setIndex(idx);
 const mat=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,alphaTest:.07,fog:true});
 const ribbon=new T.Mesh(geo,mat);ribbon.visible=false;scene.add(ribbon);
 let ready=false,enabled=true,submerged=false,oldPhoto=null,oldCanopy=null;
 function sync(){uniforms.photoReady.value=ready&&enabled?1:0;uniforms.above.value=submerged?0:1;ribbon.visible=ready&&enabled&&!submerged}
 report.state='choose approved panorama';report.setVisible=v=>{enabled=v;sync()};report.setSubmerged=v=>{submerged=v;sync()};
 function tex(c){let t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;return t}
 async function load(blob){
 const bmp=await createImageBitmap(blob);if(bmp.width/bmp.height<1.8||bmp.width/bmp.height>2.2){bmp.close();throw Error('Select the approved wide 2:1 panorama.')}
 const c=document.createElement('canvas');c.width=Math.min(bmp.width,2048);c.height=Math.round(c.width*bmp.height/bmp.width);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close();
 const canopy=document.createElement('canvas');canopy.width=c.width;canopy.height=c.height;const ctx=canopy.getContext('2d');ctx.drawImage(c,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data;
 for(let x=0;x<c.width;x++){let boundary=Math.round(c.height*.45);for(let y=Math.round(c.height*.22);y<Math.round(c.height*.46);y++){let n=0;for(let k=0;k<6;k++){let p=((y+k)*c.width+x)*4;let r=d[p],g=d[p+1],b=d[p+2];if(g>b*1.07&&g>r*.94&&g<200)n++}if(n>=4){boundary=y;break}}for(let y=0;y<c.height;y++)d[(y*c.width+x)*4+3]=Math.round(255*smooth((y-boundary)/3))}
 ctx.putImageData(pixels,0,0);oldPhoto?.dispose();oldCanopy?.dispose();oldPhoto=tex(c);oldCanopy=tex(canopy);uniforms.lakePhoto.value=oldPhoto;mat.map=oldCanopy;mat.needsUpdate=true;ready=true;report.state='photo + water loaded';sync()
 }
 function db(){return new Promise((resolve,reject)=>{let q=indexedDB.open('wild-new-lake-v6',1);q.onupgradeneeded=()=>q.result.createObjectStore('assets');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
 async function store(blob){let d=await db();await new Promise((resolve,reject)=>{let t=d.transaction('assets','readwrite');t.objectStore('assets').put(blob,'panorama');t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()}
 async function restore(){let d=await db();let b=await new Promise((resolve,reject)=>{let q=d.transaction('assets').objectStore('assets').get('panorama');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});d.close();if(b)await load(b)}
 document.getElementById('photoFile').onchange=async e=>{const b=e.target.files?.[0];if(!b)return;try{await load(b);try{await store(b)}catch(e){report.state+=' (session only)'}}catch(e){report.state='photo error: '+e.message}};restore().catch(()=>{});
 return {uniforms,weight,bearing,report};
}
export function lakeSurface(T,L,photo){
 const p=[],uv=[],idx=[],N=L.N;
 for(let i=0;i<=N;i++){let k=i%N,[x,z]=L.shore[k],r=Math.hypot(x,z);for(let j=0;j<=4;j++){let f=[0,.55,.78,.90,1][j];p.push(x*f,.012,z*f);uv.push(photo.bearing(k),r*(1-f),photo.weight(k))}}
 for(let i=0;i<N;i++)for(let j=0;j<4;j++){let a=i*5+j,b=a+5;if(j===0)idx.push(a,b+1,a+1);else idx.push(a,b,b+1,a,b+1,a+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('waterPhotoUV',new T.Float32BufferAttribute(uv,3));g.setIndex(idx);
 const m=new T.ShaderMaterial({uniforms:{...photo.uniforms,deep:{value:new T.Color(0x194c3c)},shallow:{value:new T.Color(0x52745c)}},vertexShader:'attribute vec3 waterPhotoUV;varying vec3 wp,vPhoto;void main(){wp=position;vPhoto=waterPhotoUV;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float photoTime,photoReady,above;uniform sampler2D lakePhoto;uniform vec3 deep,shallow;varying vec3 wp,vPhoto;void main(){float d=vPhoto.y,t=photoTime;float a=sin(wp.x*1.7+wp.z*2.1+t*1.2),b=sin(wp.x*3.9-wp.z*1.1-t*.8),c=sin(wp.z*7.2+wp.x*.6+t*2.0);float ripple=a*b*.011+c*.005;vec3 col=mix(deep,shallow,1.-smoothstep(0.,8.,d))+ripple;float u=vPhoto.x+.0025*sin(wp.z*.9+t*.75)+.0015*b;float v=1.-(.795+.18*clamp(d/16.,0.,1.)+.004*a);float blend=photoReady*above*vPhoto.z*(1.-smoothstep(3.,19.,d));if(blend>0.001){vec3 photographed=texture2D(lakePhoto,vec2(clamp(u,.12,.88),v)).rgb;col=mix(col,photographed+ripple*.45,blend);}gl_FragColor=vec4(max(col,vec3(0.)),mix(.82,.96,blend));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',transparent:true,depthWrite:false,side:T.DoubleSide});
 return {geometry:g,material:m};
}