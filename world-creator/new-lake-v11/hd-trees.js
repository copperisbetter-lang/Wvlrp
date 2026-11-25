// Real imported textured GLBs only. No photo cards or primitive-tree fallback.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const BASE='https://raw.githubusercontent.com/copperisbetter-lang/Wvlrp/f7d47622ba59d3dc39634b1c9a0484754832a6ac/world-creator/assets/';
const SOURCES=[{id:'broadleaf',file:'village-pbr-tree_small_02.glb',min:10,max:16},{id:'pine',file:'village-pbr-pine_sapling_small.glb',min:5,max:9}];
export function shoulderSites(L,P){
 const points=[];let seed=27186;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const N=L.N,TAU=Math.PI*2;
 // Fill both exposed transition slopes. Plant from the real surface, never a fabricated horizon.
 const sides=[{lo:L.cliffStart-19,hi:L.cliffStart+14},{lo:L.cliffEnd-14,hi:L.cliffEnd+19}];
 for(let row=0;row<5;row++){
  for(const side of sides)for(let i=side.lo+row%2;i<=side.hi;i+=2){
   const k=(i+N)%N,ring=L.rings[k],shore=Math.hypot(...L.shore[k]),edge=Math.hypot(ring.at(-1)[0],ring.at(-1)[2]);
   const span=edge-shore;if(span<9)continue;
   const fraction=.14+row*.18+(rand()-.5)*.09,rr=shore+Math.max(5,span*fraction),a=(k+(rand()-.5)*.85)/N*TAU;
   if(rr>edge-1.2)continue;
   const x=rr*Math.cos(a),z=rr*Math.sin(a),y=P.ground(x,z);
   if(y===null||!Number.isFinite(y)||y<.3||P.rocks.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+1.1)||points.some(o=>Math.hypot(x-o.x,z-o.z)<5.0))continue;
   points.push({x,y,z,k,row,rot:rand()*TAU,var:rand(),side:side===sides[0]?0:1});
  }
 }
 // Balanced selection across both sides and height bands under the budget.
 const bins=new Map();for(const p of points){const key=p.row*2+p.side;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p)}
 const result=[];let more=true;while(more){more=false;for(const bin of bins.values())if(bin.length){result.push(bin.shift());more=true}}
 return result;
}
export function installHDTrees(T,scene,L,P){
 const state={status:'loading HD trees',planted:0,triangles:0,drawCalls:0,sources:[],errors:[],sites:shoulderSites(L,P)};
 const loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/');loader.setDRACOLoader(draco);loader.setMeshoptDecoder(MeshoptDecoder);
 const budget=1600000,cap=96,group=new T.Group();group.name='Slope woodland: imported textured GLB instances';scene.add(group);
 state.ready=(async()=>{
 const assets=[];
 for(const source of SOURCES){try{
  const gltf=await loader.loadAsync(BASE+source.file);const root=gltf.scene;root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(root,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  if(!Number.isFinite(size.y)||size.y<.01||size.x/size.y>3||size.z/size.y>3)throw Error('invalid source bounds');
  const parts=[];let triangles=0,textured=0;
  root.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;if(o.isSkinnedMesh||o.isInstancedMesh)throw Error('unsupported source mesh');const geo=o.geometry;const count=(geo.index?.count??geo.attributes.position.count)/3;triangles+=count;
   const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>m?.map))textured++;
   parts.push({geo,mat:o.material,matrix:o.matrixWorld.clone()});
  });
  if(!parts.length||!textured||triangles<1)throw Error('no textured drawable tree geometry');
  const anchor=new T.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z);
  assets.push({...source,parts,triangles,height:size.y,anchor,textured});state.sources.push({file:source.file,triangles,texturedParts:textured,meshes:parts.length});
 }catch(e){state.errors.push(source.id+': '+e.message)}}
 if(!assets.length){state.status='HD tree load failed';return state}
 const chosen=new Map(assets.map(a=>[a,[]]));let remaining=budget;
 for(const p of state.sites){
  if(state.planted>=cap)break;
  const prefer=assets.find(a=>a.id===(p.var<.23?'pine':'broadleaf'))||assets[0];
  const alt=assets.find(a=>a!==prefer&&a.triangles<=remaining);
  const a=prefer.triangles<=remaining?prefer:alt;if(!a)continue;
  const h=a.min+(a.max-a.min)*((p.var*7.71)%1);
  chosen.get(a).push({...p,h});remaining-=a.triangles;state.planted++;state.triangles+=a.triangles;
 }
 const obj=new T.Object3D(),matrix=new T.Matrix4();
 for(const [a,list] of chosen){if(!list.length)continue;
  for(const part of a.parts){
   const batch=new T.InstancedMesh(part.geo,part.mat,list.length);batch.name='HD '+a.id;
   list.forEach((p,i)=>{obj.position.set(p.x,p.y-.18,p.z);obj.rotation.set(0,p.rot,0);obj.scale.setScalar(p.h/a.height);obj.updateMatrix();matrix.copy(obj.matrix).multiply(a.anchor).multiply(part.matrix);batch.setMatrixAt(i,matrix)});
   batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);state.drawCalls+=Array.isArray(part.mat)?part.geo.groups.length:1;
  }
  // Original rock collision remains intact; add narrow trunk proxies for actual planted trees.
  for(const p of list)P.rocks.push({x:p.x,y:p.y,z:p.z,r:.25+p.h*.025,h:p.h,kind:'tree'});
 }
 state.status=state.planted?'HD trees '+state.planted:'HD trees exceed geometry budget';
 return state;
 })().catch(e=>{state.errors.push(e.message);state.status='HD tree setup failed';return state}).finally(()=>draco.dispose());
 return state;
}
