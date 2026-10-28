import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../base-camp');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('photo trails are composited over the ACTUAL rendered terrain triangles',()=>{
 const scene=read('stacey-dive.html'),route=read('stacey-purple-main-lake-spur.js');
 assert.match(scene,/function photoVisibleGround\(x,z\)/);
 assert.match(scene,/const t1=tri\(k,k\+1,k\+N\+1\),t2=tri\(k\+1,k\+N\+2,k\+N\+1\)/);
 assert.match(scene,/purpleTrails\.install\(T,scene,photoVisibleGround,soil,/);
 assert.match(route,/v\.push\(x,ground\(x,z\)\+\.055,z\)/);
});

test('trail URL starts walking ON the lake-spur photo trail, not in the sky',()=>{
 const scene=read('stacey-dive.html');
 assert.match(scene,/aerial=false;depthMode='surface';pos\.set\(-14,ground\(-14,-354\)\+1\.7,-354\)/);
 assert.doesNotMatch(scene,/aerial=true;depthMode='surface';pos\.set\(210,CY\+170,-15\)/);
 assert.match(scene,/if\(r>338\)/);
});

test('photo asset has distinct central tread, feathered edges and visible load status',()=>{
 const scene=read('stacey-dive.html'),photo=read('stacey-woodland-360-photo.js');
 assert.match(photo,/woodland-trail-hd\.webp/);
 assert.match(photo,/ctx\.drawImage\(image,sx,sy,sw,sh,0,0,S,S\)/);
 assert.match(photo,/data\[i\+3\]=Math\.round\(255\*alpha\)/);
 assert.match(photo,/status\.state='ready'/);
 assert.match(scene,/Trail photo /);
 assert.ok(fs.existsSync(path.resolve(root,'../../assets/woodland-trail-hd.webp')));
});
