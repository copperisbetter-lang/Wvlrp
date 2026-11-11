import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const imagePath = new URL('../../assets/stacey-mountains-distant-360.webp', import.meta.url);
const source = readFileSync(new URL('../base-camp/stacey-forest-360-wrap.js', import.meta.url), 'utf8');
const data = readFileSync(imagePath);
const old = readFileSync(new URL('../../assets/stacey-forest-360-skyless.webp', import.meta.url));

test('owner-selected distant mountain 360 is saved and preserves prior original', () => {
  assert.match(source, /stacey-mountains-distant-360\.webp/);
  assert.doesNotMatch(source, /asset:.*stacey-forest-360-skyless\.webp/);
  assert.notEqual(createHash('sha256').update(data).digest('hex'),createHash('sha256').update(old).digest('hex'));
  assert.equal(createHash('sha256').update(data).digest('hex'), '07306f27ae043e68f10e8406b45b3ca7627ace865ba7ed9c86cc7862a592972c');
});

test('mountain asset is 2:1 WebP RGBA with sky alpha for separate dynamic Sky', () => {
  assert.equal(data.toString('ascii',0,4), 'RIFF');
  assert.equal(data.toString('ascii',8,12), 'WEBP');
  assert.equal(data.toString('ascii',12,16), 'VP8X');
  assert.ok(data[20] & 0x10, 'RGBA/alpha flag must be present in VP8X header');
  const w = 1 + data.readUIntLE(24,3), h = 1 + data.readUIntLE(27,3);
  assert.equal(w,1280);
  assert.equal(h,640);
  assert.equal(w / h,2);
  assert.ok(data.length < 250000, 'mobile texture size budget');
});

test('wrap stays noncolliding and A/B photo-disable remains available', () => {
  assert.match(source, /get\('forest'\) === 'off'/);
  assert.match(source, /nonColliding = true/);
  assert.match(source, /transparent: true/);
  assert.match(source, /new THREE\.SphereGeometry/);
});
