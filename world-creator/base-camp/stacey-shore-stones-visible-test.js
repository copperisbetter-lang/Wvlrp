import {STACEY,shoreRadius,islandRadius} from './stacey-lake-graded-bank-45ft.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/meshopt_decoder.module.js';
// Actual Poly Haven CC0 moss rock GLB hosted in a public GitHub repository.
// Never substitute flat-color primitive geometry on failed asset loads.
const ROCK='https://raw.githubusercontent.com/Leonxlnx/realestateopus5/main/public/assets/models/rock_moss_set_01.glb';
export async function installPhotographicShore(THREE,scene){
 const status={loaded:false,rocks:0,error:null,protectedRadiusFeet:69,stoneWeightPounds:'30–80 (visual estimate)'};
 let model;
 try{model=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(ROCK)).scene;}catch(e){status.error=String(e);console.error('Real shoreline rock unavailable',e);return status;}
 const bbox=new THREE.Box3().setFromObject(model),size=bbox.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.x)||Math.max(size.x,size.y,size.z)<.001){status.error='Invalid HD rock bounds';return status;}
 const root=new THREE.Group();root.name='Stacey shoreline real PBR moss rocks';
 const rand=(()=>{let x=89135;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296)})();
 const nearAccess=a=>[.8,2.3].some(p=>Math.abs(Math.atan2(Math.sin(a-p),Math.cos(a-p)))<.22);
 // Patchy rock clusters, not a continuous wall; keep both designated water access corridors clear.
 const playerX=140.0,playerZ=-117.2,protectedRadius=69*.3048;
 for(let i=0;i<280;i++){
  const inner=false,a=rand()*Math.PI*2;
  if(!inner&&nearAccess(a))continue;
  const bank=inner?islandRadius(a):shoreRadius(a);
  const d=.3+rand()*1.8;
  const radius=bank+d;
  const x=STACEY.x+Math.cos(a)*radius,z=STACEY.z+Math.sin(a)*radius;
  // Exclude every rock within 69 feet of the player's GPS in the screenshot.
  if(Math.hypot(x-playerX,z-playerZ)<protectedRadius)continue;
  const group=model.clone(true);
  // Approximate 30–80 lb limestone: volume=mass/density, diameter scaled for irregular rock.
  const pounds=30+rand()*50, kilograms=pounds*.45359237;
  const target=Math.cbrt(6*kilograms/(Math.PI*2500))*(1.1+rand()*.16);
  const scale=target/Math.max(size.x,size.z);
  group.scale.setScalar(scale);
  group.rotation.y=rand()*Math.PI*2;
  // Seat each rock partially into the shoreline; no hovering slabs.
  const bankElevation=STACEY.waterY+.035+Math.max(0,d)*.035;
  group.position.set(x,bankElevation-(bbox.min.y*scale)-target*.10,z);
  group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=true;}});
  root.add(group);status.rocks++;
 }
 scene.add(root);status.loaded=true;return status;
}
