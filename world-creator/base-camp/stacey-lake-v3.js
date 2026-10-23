// Stacey Lake 3D prototype: water and raised sand island, no panoramas.
// Lake occupies 8% of Base Camp by nominal planform; visual reference is owner-approved artwork.
export const STACEY={x:140,z:-240,radius:113.797805566,waterY:-5.5,islandRadius:22};
export function shoreRadius(a){return STACEY.radius*(1+.038*Math.sin(5*a)+.022*Math.cos(9*a));}
export function islandRadius(a){return STACEY.islandRadius*(1+.10*Math.sin(5*a+.6)+.06*Math.cos(8*a));}
export function lakeRatio(x,z){const dx=x-STACEY.x,dz=z-STACEY.z,a=Math.atan2(dz,dx);return Math.hypot(dx,dz)/shoreRadius(a);}
export function lakeTerrain(x,z,original){
 const dx=x-STACEY.x,dz=z-STACEY.z,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx),ir=islandRadius(a),lr=shoreRadius(a);
 if(r<ir+4){const t=Math.max(0,Math.min(1,(r-ir+4)/8));const sand=STACEY.waterY+1.8+1.7*Math.max(0,1-r/ir);return sand*(1-t)+(STACEY.waterY-1.3)*t;}
 if(r>lr+12)return original;
 const q=Math.max(0,Math.min(1,(r-(lr-12))/24));const smooth=q*q*(3-2*q);
 // Deepen submerged lakebed by 1.524m (five feet), leaving shore and island elevations intact.
 const bed=STACEY.waterY-4.024-8*Math.max(0,1-r/lr);
 return bed*(1-smooth)+original*smooth;
}
export function installStaceyLake(THREE,scene){
 const waterGeometry=new THREE.BufferGeometry(),verts=[],indices=[],depths=[];
 const radial=46,angular=192;
 for(let i=0;i<=radial;i++){const t=i/radial;for(let j=0;j<=angular;j++){const a=j/angular*Math.PI*2,inner=islandRadius(a)+1.2,outer=shoreRadius(a)-1.8,r=inner+(outer-inner)*t;verts.push(STACEY.x+Math.cos(a)*r,STACEY.waterY,STACEY.z+Math.sin(a)*r);depths.push(t)}}
 for(let i=0;i<radial;i++)for(let j=0;j<angular;j++){const k=i*(angular+1)+j;indices.push(k,k+angular+1,k+1,k+1,k+angular+1,k+angular+2)}
 waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));waterGeometry.setAttribute('aLakeT',new THREE.Float32BufferAttribute(depths,1));waterGeometry.setIndex(indices);waterGeometry.computeVertexNormals();
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},vertexShader:`attribute float aLakeT;varying float vT;varying vec2 vP;void main(){vT=aLakeT;vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision mediump float;uniform float uTime;varying float vT;varying vec2 vP;void main(){float shore=min(vT,1.-vT);float deep=smoothstep(.02,.28,shore);vec3 shallow=vec3(.13,.68,.68);vec3 middle=vec3(.025,.34,.48);vec3 dark=vec3(.018,.13,.25);vec3 c=mix(shallow,middle,smoothstep(.015,.14,shore));c=mix(c,dark,deep*.85);float w1=sin(dot(vP,vec2(.37,.19))+uTime*.63);float w2=sin(dot(vP,vec2(-.23,.41))-uTime*.47);float w3=sin(dot(vP,vec2(.13,-.29))+uTime*.31);float w4=sin(dot(vP,vec2(.061,.083))-uTime*.18);float rip=.38*w1+.29*w2+.20*w3+.13*w4;float glint=pow(max(0.,rip*.5+.5),7.);c+=vec3(.014,.025,.027)*rip+vec3(.012,.018,.020)*glint;gl_FragColor=vec4(c,.91);}`});
 const water=new THREE.Mesh(waterGeometry,material);water.name='StaceyLakeWater';water.frustumCulled=false;scene.add(water);
 const sand=new THREE.MeshStandardMaterial({color:0xd9c298,roughness:1});
 const island=new THREE.Group();island.name='StaceySandIsland';
 // Visible raised sand island; its terrain is part of the continuous world mesh.
 // No trees or island structures until owner approves the next stage.
 scene.add(island);
 return {update(seconds){material.uniforms.uTime.value=seconds},water,island};
}
