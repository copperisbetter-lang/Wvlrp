import {STACEY,shoreRadius,islandRadius} from './stacey-lake-v3.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/meshopt_decoder.module.js';
// Actual Poly Haven CC0 moss rock GLB hosted in a public GitHub repository.
// Never substitute flat-color primitive geometry on failed asset loads.
const ROCK='https://raw.githubusercontent.com/Leonxlnx/realestateopus5/main/public/assets/models/rock_moss_set_01.glb';
export async function installPhotographicShore(THREE,scene){
 const status={loaded:false,rocks:0,error:null};
 let model;
 try{model=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(ROCK)).scene;}catch(e){status.error=String(e);console.error('Real shoreline rock unavailable',e);return status;}
 const bbox=new THREE.Box3().setFromObject(model),size=bbox.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.x)||Math.max(size.x,size.y,size.z)<.001){status.error='Invalid HD rock bounds';return status;}
 const root=new THREE.Group();root.name='Stacey shoreline real PBR moss rocks';
 const rand=(()=>{let x=89135;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)})();
 const nearAccess=a=>[.8,2.3].some(p=>Math.abs(Math.atan2(Math.sin(a-p),Math.cos(a-p)))<.22);
 // Patchy rock clusters, not a continuous wall; keep both designated water access corridors clear.
 for(let i=0;i<38;i++){
  const inner=i%8===0,a=rand()*Math.PI*2;
  if(!inner&&nearAccess(a))continue;
  const bank=inner?islandRadius(a):shoreRadius(a);
  const d=(rand()-.48)*3.2;
  const radius=inner?bank+d:bank-d;
  const x=STACEY.x+Math.cos(a)*radius,z=STACEY.z+Math.sin(a)*radius;
  const group=model.clone(true);
  const target=.75+rand()*1.8;
  const scale=target/Math.max(size.x,size.z);
  group.scale.setScalar(scale);
  group.rotation.y=rand()*Math.PI*2;
  // Seat each rock partially into the shoreline; no hovering slabs.
  group.position.set(x,STACEY.waterY-(bbox.min.y*scale)-target*.22,z);
  group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=true;}});
  root.add(group);status.rocks++;
 }
 scene.add(root);status.loaded=true;return status;
}
