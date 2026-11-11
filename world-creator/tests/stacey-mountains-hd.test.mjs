import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const hd=readFileSync(new URL('../../assets/stacey-mountains-distant-360-hd.webp', import.meta.url));
const low=readFileSync(new URL('../../assets/stacey-mountains-distant-360.webp', import.meta.url));
const loader=readFileSync(new URL('../base-camp/stacey-forest-360-wrap.js', import.meta.url),'utf8');

test('higher-quality mountain image is 4K with real alpha channel',()=>{
  assert.equal(hd.toString('ascii',0,4),'RIFF');
  assert.equal(hd.toString('ascii',8,12),'WEBP');
  assert.equal(hd.toString('ascii',12,16),'VP8X');
  assert.ok(hd[20]&0x10,'VP8X must advertise alpha');
  const width=1+hd.readUIntLE(24,3),height=1+hd.readUIntLE(27,3);
  assert.equal(width,4096);assert.equal(height,2048);
  assert.equal(createHash('sha256').update(hd).digest('hex'),'a342ecfad96c8a32f15510732255017da325c88a2df398d63453be7caab43e72');
});

test('old low-res photo remains intact and 4K loader supports low fallback',()=>{
  assert.equal(low.length,69474);
  assert.match(loader,/stacey-mountains-distant-360-hd\.webp/);
  assert.match(loader,/get\('mountains'\) === 'low'/);
  assert.match(loader,/texture\.offset\.y\s*=\s*-0\.16/);
  assert.match(loader,/nonColliding = true/);
  assert.doesNotMatch(loader,/stacey-forest-360-skyless\.webp/);
});
