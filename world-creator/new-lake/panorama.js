// Copyright © 2026 WVLRP / The Wild.
function photoMapping(N,start,end){
 const mod=(x,n)=>((x%n)+n)%n,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 // The inspected original image has its broad cliff in the central 46% of the panorama.
 // Match that section to the physical cliff shoreline, with continuous mapping around the seam.
 function u(i){
  i=mod(i,N);
  if(i>=start&&i<=end)return .30+.46*(i-start)/(end-start);
  const d=mod(i-end,N);return .76+.54*d/(N-(end-start));
 }
 // Hand-traced conservative skyline, normalized from the inspected 1728x864 Library image.
 // Excludes the original blue sky and photographed lake. Final registration requires a rendered review.
 const outline=[[0,.10],[.10,.09],[.19,.13],[.24,.22],[.28,.355],[.33,.365],[.38,.333],[.44,.305],[.50,.28],[.56,.278],[.62,.318],[.68,.35],[.74,.372],[.80,.38],[.86,.405],[.91,.35],[.96,.20],[1,.10]];
 function skyline(x){x=mod(x,1);for(let j=1;j<outline.length;j++)if(x<=outline[j][0]){const a=outline[j-1],b=outline[j];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])}return .1}
 function weight(i){return i>=start&&i<=end?smooth(Math.min(i-start,end-i)/6):0}
 function lower(x){x=mod(x,1);return x>.28&&x<.90?.474:.385}
 return {u,skyline,weight,lower,wrapU:x=>mod(x,1)};
}
export function installPanorama(T,scene,terrain,L,report){
 const map=photoMapping(L.N,L.cliffStart,L.cliffEnd);
 const path=new URL('../../assets/stacey-lake-4k.webp',import.meta.url).href;
 const uniform={value:null},strength={value:0};
 const uv=[],weights=[];
 for(let i=0;i<L.N;i++){
  const ring=L.rings[i],u=map.u(i),top=map.skyline(u)+.012,low=map.lower(u),w=map.weight(i);
  const crest=Math.max(1,ring.at(-1)[1]);
  for(let j=0;j<ring.length;j++){
   const y=ring[j][1],f=Math.max(0,Math.min(1,y/crest));
   uv.push(u,1-(low+(top-low)*f));
   weights.push(j>=6?w*Math.min(1,Math.max(0,y/2)):0);
  }
 }
 terrain.geometry.setAttribute('photoUV',new T.Float32BufferAttribute(uv,2));terrain.geometry.setAttribute('photoWeight',new T.Float32BufferAttribute(weights,1));
 const previous=terrain.material.onBeforeCompile;
 terrain.material.onBeforeCompile=shader=>{
  previous?.(shader);
  shader.uniforms.cliffPhoto=uniform;shader.uniforms.cliffPhotoStrength=strength;
  shader.vertexShader='attribute vec2 photoUV; attribute float photoWeight; varying vec2 vPhotoUV; varying float vPhotoWeight;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPhotoUV=photoUV; vPhotoWeight=photoWeight;');
  shader.fragmentShader='uniform sampler2D cliffPhoto; uniform float cliffPhotoStrength; varying vec2 vPhotoUV; varying float vPhotoWeight;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(vPhotoWeight>0.0 && cliffPhotoStrength>0.0){vec3 px=texture2D(cliffPhoto,vPhotoUV).rgb; diffuseColor.rgb=mix(diffuseColor.rgb,px,vPhotoWeight*cliffPhotoStrength*.90);}');
 };
 // A boundary-anchored ribbon of the same original panorama. No old water, beach or full photo sky.
 const pos=[],coords=[],edge=[],indices=[];
 for(let i=0;i<=L.N;i++){
  const k=i%L.N,ring=L.rings[k],crest=ring.at(-1),a=k/L.N*2*Math.PI,rr=Math.hypot(crest[0],crest[2])+1.2,w=map.weight(k);
  // Keep U continuous through the mesh seam; the texture wraps horizontally.
  let u=map.u(k);if(k<L.cliffStart)u-=1;if(i===L.N)u+=1;
  const sky=map.skyline(u),bottom=map.lower(u),from=bottom+(sky+.034-bottom)*w;
  const bottomY=crest[1]-2,topY=crest[1]+(24*(1-w)+4*w);
  for(let j=0;j<=8;j++){const f=j/8;pos.push(rr*Math.cos(a),bottomY+(topY-bottomY)*f,rr*Math.sin(a));coords.push(u,1-(from+(sky+.005-from)*f));edge.push(f)}
 }
 for(let i=0;i<L.N;i++)for(let j=0;j<8;j++){const a=i*9+j,b=(i+1)*9+j;indices.push(a,b,a+1,b,b+1,a+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(coords,2));g.setAttribute('edgeFade',new T.Float32BufferAttribute(edge,1));g.setIndex(indices);
 const mat=new T.ShaderMaterial({uniforms:{photo:uniform},vertexShader:'attribute float edgeFade; varying vec2 vUv; varying float vEdge; void main(){vUv=uv;vEdge=edgeFade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D photo; varying vec2 vUv; varying float vEdge; void main(){vec3 rgb=texture2D(photo,vUv).rgb;float alpha=smoothstep(0.,.10,vEdge)*(1.-smoothstep(.87,1.,vEdge));gl_FragColor=vec4(rgb,alpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',side:T.DoubleSide,transparent:true,depthWrite:false});
 const ribbon=new T.Mesh(g,mat);ribbon.name='Original Stacey panorama — non-colliding boundary scenery';ribbon.visible=false;ribbon.renderOrder=1;scene.add(ribbon);
 report.state='loading original 360';
 const tex=new T.TextureLoader().load(path,t=>{
  if(!t.image||t.image.width/t.image.height<1.8||t.image.width/t.image.height>2.2){report.state='360 aspect mismatch';return}
  report.width=t.image.width;report.height=t.image.height;uniform.value=t;strength.value=1;ribbon.visible=true;report.state='360 texture loaded';
 },undefined,()=>{report.state='360 load failed'});
 tex.colorSpace=T.SRGBColorSpace;tex.wrapS=T.RepeatWrapping;tex.wrapT=T.ClampToEdgeWrapping;tex.anisotropy=2;uniform.value=tex;
 report.source=path;report.triangles=indices.length/3;report.setVisible=visible=>{if(report.state==='360 texture loaded'){ribbon.visible=visible;strength.value=visible?1:0}};
 return report;
}
