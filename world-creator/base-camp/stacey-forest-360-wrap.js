// The Wild / Stacey Lake — isolated distant forest panorama ring.
// PHOTO ASSET REQUIRED: ../../assets/stacey-forest-360-skyless.png
// The source MUST be a 2:1 equirectangular RGBA panorama with the photographic
// sky removed to alpha; the real Three.js Sky remains a separate live object.
// Install this behind existing terrain, not as a replacement for lake geometry.
export function installStaceyForest360Wrap(THREE, scene, {
  centerX = 140, centerY = -5.5, centerZ = -240,
  radius = 850, mobile = false, diagnostics = null,
} = {}) {
  const status = {
    state: 'loading', asset: '../../assets/stacey-forest-360-skyless.png',
    radius, sky: 'separate dynamic Three.js Sky',
    collisions: false, geometry: 'inward-facing spherical backdrop',
  };
  if (typeof window !== 'undefined') window.staceyForest360 = status;

  // Allows visual A/B testing on the real lake without touching world assets.
  if (typeof location !== 'undefined' &&
      new URLSearchParams(location.search).get('forest') === 'off') {
    status.state = 'disabled';
    if (diagnostics) diagnostics.assets['forest 360 wrap'] = 'disabled by query';
    return status;
  }

  const source = new URL(status.asset, import.meta.url).href;
  const loader = new THREE.TextureLoader();
  loader.load(source, texture => {
    // Do not promote a photo to a fake daytime sky: alpha is essential.
    if (!texture.image || !texture.image.width || !texture.image.height) {
      status.state = 'invalid image'; return;
    }
    const {width, height} = texture.image;
    if (Math.abs(width / height - 2) > 0.02) {
      status.state = 'invalid 360 aspect'; status.size = [width, height]; return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = mobile ? 1 : 4;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // The clear/transparent cutouts let the existing real sky, sun/moon (when
    // implemented) and clouds show naturally through the canopy.
    const material = new THREE.MeshBasicMaterial({
      map: texture, side: THREE.BackSide, transparent: true,
      depthWrite: false, depthTest: true,
      alphaTest: 0.07, fog: false, toneMapped: true,
    });
    const ring = new THREE.Mesh(
      new THREE.SphereGeometry(radius, mobile ? 48 : 64, mobile ? 24 : 32),
      material
    );
    ring.name = 'Stacey Lake skyless Appalachian 360 forest backdrop';
    ring.position.set(centerX, centerY + 11, centerZ);
    ring.frustumCulled = false;
    ring.renderOrder = 50; // Over painted Sky, behind depth-writing terrain.
    ring.userData.isSceneryBackdrop = true;
    ring.userData.nonColliding = true;
    scene.add(ring);
    status.state = 'ready';
    status.size = [width, height];
    status.center = [ring.position.x, ring.position.y, ring.position.z];
    status.ring = ring;
    status.loadedFrom = source;
    if (diagnostics) diagnostics.assets['forest 360 wrap'] = 'READY (photo alpha)';
  }, undefined, error => {
    // Never break working lake if artwork has not been published to the repo.
    status.state = 'missing asset';
    status.error = String(error?.message || error || 'image load failed');
    if (diagnostics) diagnostics.assets['forest 360 wrap'] = 'NOT INSTALLED: texture missing';
  });
  return status;
}
