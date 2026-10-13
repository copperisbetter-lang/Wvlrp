import test from "node:test";
import assert from "node:assert/strict";
import {makeGroundHeightSampler} from "../terrain-height.js";

// A steep, diagonally split heightfield with a world-space tile offset. Checks
// the exact triangles we render, NOT a cached Babylon GroundMesh height.
const size=2,n=2;
const slope=(x,z)=>4+3*x+7*z+2*x*z;
const vertices=[];
for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)vertices.push(x,slope(x,z),z);
function triangles(positive){
 const t=[];
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){
   const bl=z*(n+1)+x,br=bl+1,tl=bl+n+1,tr=tl+1;
   t.push(...(positive?[bl,br,tr,bl,tr,tl]:[bl,br,tl,br,tr,tl]));
 }
 return t;
}
function expected(positive,x,z){
 const ix=Math.floor(x+1),iz=Math.floor(z+1);
 const u=x+1-ix,v=z+1-iz;
 const a=slope(ix-1,iz-1),b=slope(ix,iz-1),
       c=slope(ix-1,iz),d=slope(ix,iz);
 return positive?(v<=u?a*(1-u)+b*(u-v)+d*v:a*(1-v)+c*(v-u)+d*u):
   (u+v<=1?a*(1-u-v)+b*u+c*v:d*(u+v-1)+b*(1-v)+c*(1-u));
}
for(const positive of [true,false])
 test("camera ground sampler follows "+(positive?"positive":"negative")+" triangles",()=>{
   const sample=makeGroundHeightSampler(
     new Float32Array(vertices),new Uint16Array(triangles(positive)),
     size,n,113,-48);
   assert.equal(sample.diagonal,positive);
   for(const [x,z] of [[-.77,-.43],[-.26,-.82],[.12,-.30],[.41,.38]]){
     assert.ok(Math.abs(sample(x+113,z-48)-expected(positive,x,z))<1e-5,
       "sampling should follow rendered triangles at "+x+","+z);
   }
   assert.equal(sample(115,-48),null,"outside terrain returns null");
 });
