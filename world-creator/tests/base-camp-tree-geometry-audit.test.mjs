import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const assetNames=[
  'village-oak-detailed.glb',
  'village-pbr-tree_small_02.glb',
  'village-pbr-fir_sapling.glb'
];
function auditGlb(filename) {
  const bytes=readFileSync(path.join(root,'../assets',filename));
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.toString('ascii',16,20),'JSON');
  const len=bytes.readUInt32LE(12);
  const doc=JSON.parse(bytes.toString('utf8',20,20+len));
  let triangles=0,drawParts=0,vertices=0;
  const alphaModes={OPAQUE:0,MASK:0,BLEND:0};
  const meshes=[];
  for(const mesh of doc.meshes??[]){
    let meshTriangles=0;
    for(const prim of mesh.primitives??[]){
      const count=prim.indices!==undefined?doc.accessors[prim.indices]?.count:
        doc.accessors[prim.attributes?.POSITION]?.count;
      const mode=prim.mode??4;
      const t=mode===4?Math.floor(count/3):mode===5||mode===6?Math.max(0,count-2):0;
      triangles+=t;meshTriangles+=t;drawParts++;
      vertices+=doc.accessors[prim.attributes?.POSITION]?.count??0;
      const mat=doc.materials?.[prim.material];
      alphaModes[mat?.alphaMode??'OPAQUE']=(alphaModes[mat?.alphaMode??'OPAQUE']??0)+1;
    }
    meshes.push({name:mesh.name??'',triangles:meshTriangles});
  }
  return {filename,megabytes:Math.round(bytes.length/10000)/100,
    triangles,drawParts,vertices,materials:doc.materials?.length??0,
    alphaModes,images:doc.images?.length??0,
    topMeshes:meshes.sort((a,b)=>b.triangles-a.triangles).slice(0,6)};
}
test('audit actual mobile forest tree polygon costs, not estimated GLB file size',()=>{
  const totals=assetNames.map(auditGlb);
  for(const t of totals){
    assert.ok(t.triangles>0,`${t.filename} contains triangle geometry`);
    console.log('BASECAMP_ASSET_AUDIT '+JSON.stringify(t));
  }
});
