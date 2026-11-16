// Synthetic-only GLB test. No private Dad image, model or decryption key involved.
// Run in CI after: cp stage28-recover-original-g9-neck.js /tmp/g9restore.mjs
import assert from 'node:assert/strict';
import {inspectPreservedOriginalNeckIndicesForQA} from '/tmp/g9restore.mjs';

const count=972*3, maxVertex=140;
const bin=Buffer.alloc(count*2);
for(let i=0;i<count;i++)bin.writeUInt16LE(i%maxVertex,i*2);
const g={
  asset:{version:'2.0'}, buffers:[{byteLength:bin.length}],
  bufferViews:[
    {buffer:0,byteOffset:0,byteLength:bin.length},
    {buffer:0,byteOffset:0,byteLength:1827*2}
  ],
  accessors:[
    {bufferView:1,componentType:5123,count:609*3,type:'SCALAR'},
    {bufferView:0,componentType:5123,count:972*3,type:'SCALAR'}
  ],
  meshes:[
    {primitives:[{attributes:{},material:0}]},
    {primitives:[
      {attributes:{},material:1},{attributes:{},material:2},
      {attributes:{},material:3},{attributes:{},material:4},
      {attributes:{},material:5,indices:0}
    ]}
  ],
  skins:[{joints:Array.from({length:138},(_,i)=>i)}]
};
let j=Buffer.from(JSON.stringify(g),'utf8');
j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
const head=Buffer.alloc(12),jsonHead=Buffer.alloc(8),binHead=Buffer.alloc(8);
head.write('glTF',0,4,'ascii');head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+j.length+8+bin.length,8);
jsonHead.writeUInt32LE(j.length,0);jsonHead.write('JSON',4,4,'ascii');
binHead.writeUInt32LE(bin.length,0);binHead.write('BIN\0',4,4,'ascii');
const glb=Buffer.concat([head,jsonHead,j,binHead,bin]);
const raw=glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength);
const geometry={getAttribute:(name)=>name==='position'?{count:maxVertex}:undefined};
const stats=inspectPreservedOriginalNeckIndicesForQA(raw,geometry);
assert.deepEqual(stats,{accessor:1,triangleCount:972,largestVertexIndex:maxVertex-1});
console.log('PASS: recovered preserved native 972-triangle G9 index accessor from synthetic cut-stage GLB; 138-bone layout confirmed.');
