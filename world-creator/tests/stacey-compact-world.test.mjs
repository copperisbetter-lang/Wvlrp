import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../base-camp/',import.meta.url);
const moduleText=readFileSync(new URL('stacey-compact-world.js',root),'utf8');
const game=readFileSync(new URL('stacey-dive.html',root),'utf8');
const minimap=readFileSync(new URL('stacey-tap-minimap.js',root),'utf8');
const cave=readFileSync(new URL('waterfall-cave-world.html',root),'utf8');
const {staceyWorldRadius,staceyWithinWorld,keepStaceyInside,nearWaterfallCave}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(moduleText));

test('compact world fits shoreline, preserves west waterfall and blocks old 338m travel',()=>{
 assert.equal(staceyWorldRadius(0),152);
 assert.equal(staceyWorldRadius(Math.PI),190);
 assert.ok(Math.abs(staceyWorldRadius(Math.PI/2)-152)<1e-8);
 assert.ok(staceyWithinWorld(140,-240+127)); // south beach spawn
 assert.ok(staceyWithinWorld(-36,-240)); // upstream waterfall headwaters
 assert.equal(staceyWithinWorld(140,-240+220),false);
 assert.equal(staceyWithinWorld(-53,-240),false);
 const p={x:140,z:100};
 assert.equal(keepStaceyInside(p),true);
 assert.ok(Math.abs(Math.hypot(p.x-140,p.z+240)-150.5)<.01);
});

test('compact terrain and minimap share the same walking limits',()=>{
 assert.match(game,/import \{staceyWorldRadius,staceyWithinWorld,keepStaceyInside,nearWaterfallCave\}/);
 assert.match(game,/const N=384,R=96,positions/);
 assert.match(game,/r=i\/R\*staceyWorldRadius\(a\)/);
 assert.match(game,/keepStaceyInside\(pos,CX,CZ\)/);
 assert.doesNotMatch(game,/r>338|r=i\/R\*340/);
 assert.match(game,/worldBoundary:\(x,z\)=>staceyWithinWorld/);
 assert.match(minimap,/worldBoundary\?worldBoundary\(x,z\)/);
 assert.match(minimap,/const ranges=\[45,100,worldRange\]/);
});

test('separate cave world is reachable through a short external crawl portal, not the old underground rooms',()=>{
 assert.match(game,/CRAWL INTO WATERFALL CAVE/);
 assert.match(game,/location\.assign\(new URL\('\.\/waterfall-cave-world\.html\?from=stacey'/);
 assert.match(game,/nearWaterfallCave\(pos\.x,pos\.z/);
 assert.ok(nearWaterfallCave(5,-240,6,-240,9));
 assert.equal(nearWaterfallCave(100,-240,6,-240,9),false);
 assert.match(game,/chamber:null,destination:'waterfall-cave-world\.html'/);
 assert.doesNotMatch(game,/const subterranean=new|const domeR=hiddenCave\.chamberR|Massive excavated domed cavern|Underground ballroom cavern|questLocked:true/);
 assert.match(cave,/import \* as THREE from 'three'/);
 assert.match(cave,/RETURN TO LAKE/);
 assert.match(cave,/stacey-dive\.html\?spawn=cave&grass=on&clouds=on/);
 assert.match(cave,/full quest is not built yet/i);
});

test('no regression of owner selected grass, mountain wrap and waterfall',()=>{
 assert.match(game,/stacey-rugged-meadow-grass-v1\.webp/);
 assert.match(game,/installStaceyForest360Wrap/);
 assert.match(game,/installStaceyRealisticClouds/);
 assert.match(game,/Stacey Lake west-bank twin waterfalls/);
 assert.match(game,/createStaceyPurpleTrails/);
});
