// Isolated shoreline wash test; leaves terrain, water geometry and Gater 2 trails untouched.
import {STACEY,shoreRadius,islandRadius} from './stacey-lake-v3.js';
export function installShoreWash(THREE,scene){
 const strips=[];
 for(const inner of [false,true]){
  const positions=[],uv=[],idx=[],angles=320,rows=18;
  for(let i=0;i<=rows;i++){
   const t=i/rows;
   for(let j=0;j<=angles;j++){
    const a=j/angles*Math.PI*2;
    const bank=inner?islandRadius(a)+1.2:shoreRadius(a)+1.0;
    // Landward overlap permits a thin wet edge without cutting existing terrain.
    const distance=(t-.45)*(inner?5.0:7.0);
    const radius=inner?bank+distance:bank-distance;
    positions.push(STACEY.x+Math.cos(a)*radius,STACEY.waterY+.015,STACEY.z+Math.sin(a)*radius);
    uv.push(t,j/angles);
   }
  }
  for(let i=0;i<rows;i++)for(let j=0;j<angles;j++){
   const k=i*(angles+1)+j;idx.push(k,k+1,k+angles+1,k+1,k+angles+2,k+angles+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0}},
   vertexShader:`uniform float uTime;varying vec2 vUv;varying vec3 vWorld;
    void main(){vUv=uv;vec3 p=position;float wet=smoothstep(.12,.40,uv.x)*(1.-smoothstep(.80,1.,uv.x));
    float phase=uv.x*22.-uTime*.72+sin(uv.y*63.)*.7;
    p.y+=.055*sin(phase)*wet;
    vWorld=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);`,
   fragmentShader:`precision highp float;uniform float uTime;varying vec2 vUv;varying vec3 vWorld;
    void main(){
      float along=vUv.y*6.2831853;
      float uneven=sin(along*37.+uTime*.17)*.18+sin(along*79.-uTime*.11)*.12;
      float phase=vUv.x*21.-uTime*.75+uneven;
      float crest=pow(max(0.,sin(phase)),12.);
      float scatter=.45+.55*pow(max(0.,sin(along*113.+sin(along*51.)+uTime*.09)),2.);
      float wet=smoothstep(.04,.22,vUv.x)*(1.-smoothstep(.72,.99,vUv.x));
      float foam=crest*scatter*wet;
      vec3 lake=vec3(.16,.23,.20);
      vec3 c=mix(lake,vec3(.71,.75,.67),foam*.8);
      float alpha=wet*(.055+.44*foam);
      gl_FragColor=vec4(c,alpha);
    }`});
  const mesh=new THREE.Mesh(g,m);mesh.name=inner?'StaceyIslandWashTest':'StaceyOuterShoreWashTest';mesh.renderOrder=6;mesh.frustumCulled=false;scene.add(mesh);strips.push(m);
 }
 return {update(t){for(const m of strips)m.uniforms.uTime.value=t;}};
}
