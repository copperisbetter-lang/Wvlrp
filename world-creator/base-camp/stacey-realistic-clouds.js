/**
 * The Wild / Stacey Lake — isolated soft volumetric-style cloud experiment.
 *
 * Adaptation target: the soft look of leoawen/volumetric-clouds (MIT),
 * not its demonstration scene. No colored spheres, grid, or postprocess
 * compositor are used; the lake retains its existing Three.js Sky.
 *
 * Explicit opt-in: ?clouds=on; ?clouds=off preserves the existing build.
 * Keeps the clouds behind the nearby forest ring, non-colliding and separate
 * from approved terrain, water, waterfall, characters and lighting.
 * This is an exploratory low-cost layered noise renderer for Android/WebGL1,
 * not a direct transplant or verified performance match of the upstream demo.
 */
export function installStaceyRealisticClouds(THREE, scene, {
  camera,
  sunDirection,
  mobile = false,
  diagnostics = null,
} = {}) {
  const q = typeof location !== 'undefined'
    ? new URLSearchParams(location.search).get('clouds')
    : null;
  const status = {
    state: 'disabled',
    mode: q === 'on' || q === 'low' ? 'test enabled' : 'off',
    cloudType: 'animated layered procedural volumetric-style clouds',
    samples: 0,
    performance: 'unmeasured on device',
    collisions: false,
  };
  if (typeof window !== 'undefined') window.staceyCloudLab = status;
  if (q !== 'on' && q !== 'low') {
    if (diagnostics) diagnostics.assets['cloud lab'] = 'OFF (append ?clouds=on)';
    return { status, update() {}, dispose() {} };
  }
  if (!camera || !sunDirection) {
    status.state = 'invalid setup';
    if (diagnostics) diagnostics.assets['cloud lab'] = 'ERROR: missing camera/sun';
    return { status, update() {}, dispose() {} };
  }

  // Three lightweight stratified layers on a phone; richer on desktop.
  // ?clouds=low is a two-sample fallback for mid-range GPUs.
  const STEPS = q === 'low' ? 2 : mobile ? 3 : 5;
  const OCTAVES = mobile ? 2 : 3;
  status.samples = STEPS;
  status.state = 'initialized';
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: sunDirection.clone().normalize() },
    uCoverage: { value: 0.49 },
    uOpacity: { value: 0.91 },
  };

  const fragmentShader = [
    'precision highp float;',
    'varying vec3 vWorld;',
    'uniform float uTime;',
    'uniform vec3 uSunDir;',
    'uniform float uCoverage;',
    'uniform float uOpacity;',
    'float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
    'float noise3(vec3 p){',
    ' vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);',
    ' return mix(',
    '   mix(mix(hash3(i),hash3(i+vec3(1.,0.,0.)),f.x),',
    '       mix(hash3(i+vec3(0.,1.,0.)),hash3(i+vec3(1.,1.,0.)),f.x),f.y),',
    '   mix(mix(hash3(i+vec3(0.,0.,1.)),hash3(i+vec3(1.,0.,1.)),f.x),',
    '       mix(hash3(i+vec3(0.,1.,1.)),hash3(i+vec3(1.,1.,1.)),f.x),f.y),f.z);',
    '}',
    'float fbm3(vec3 p){',
    ' float s=0.0,a=0.5,normal=0.0;',
    ' for(int j=0;j<__OCTAVES__;j++){s+=a*noise3(p);normal+=a;p=p*2.08+vec3(13.7,5.8,7.2);a*=0.5;}',
    ' return s/max(normal,0.001);',
    '}',
    'void main(){',
    ' vec3 ray=normalize(vWorld-cameraPosition);',
    ' if(ray.y<=0.022)discard;',
    ' float horizonFade=smoothstep(0.022,0.10,ray.y);',
    ' float alpha=0.0,shadeSum=0.0;',
    ' float daylight=clamp(uSunDir.y*0.85+0.45,0.1,1.0);',
    ' vec2 drift=vec2(uTime*0.008,uTime*0.003);',
    ' for(int i=0;i<__STEPS__;i++){',
    '   float layer=(float(i)+0.5)/float(__STEPS__);',
    '   float altitude=440.0+layer*240.0;',
    '   float distanceToCloud=(altitude-cameraPosition.y)/max(ray.y,0.035);',
    '   vec2 xz=(cameraPosition.xz+ray.xz*distanceToCloud)*0.0015+drift;',
    '   vec3 cloudPos=vec3(xz,layer*1.6);',
    '   float body=fbm3(cloudPos*0.85);',
    '   float details=noise3(cloudPos*3.3+vec3(0.,0.,uTime*0.001));',
    '   float coverage=body*0.85+details*0.15;',
    '   float density=smoothstep(uCoverage-0.07,uCoverage+0.15,coverage);',
    '   density*=smoothstep(0.0,0.18,layer)*(1.0-smoothstep(0.83,1.0,layer))*0.75+0.25;',
    '   float absorb=(1.0-alpha)*density*(1.3/float(__STEPS__));',
    '   alpha+=absorb;',
    '   shadeSum+=absorb*(0.66+0.25*daylight+0.11*layer);',
    ' }',
    ' alpha=clamp(alpha*horizonFade*uOpacity,0.0,0.94);',
    ' if(alpha<0.012)discard;',
    ' vec3 dawn=vec3(1.08,0.82,0.67);',
    ' vec3 noon=vec3(0.97,0.98,1.0);',
    ' vec3 tint=mix(dawn,noon,smoothstep(0.02,0.52,uSunDir.y));',
    ' float brightness=clamp(shadeSum/max(alpha,0.01),0.62,1.06);',
    ' vec3 color=tint*brightness;',
    ' gl_FragColor=vec4(color,alpha);',
    '}',
  ].join('\n').replace(/__STEPS__/g, String(STEPS))
               .replace(/__OCTAVES__/g, String(OCTAVES));

  const vertexShader = [
    'varying vec3 vWorld;',
    'void main(){',
    ' vec4 world=modelMatrix*vec4(position,1.0);',
    ' vWorld=world.xyz;',
    ' gl_Position=projectionMatrix*viewMatrix*world;',
    '}',
  ].join('\n');

  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1700, mobile ? 32 : 48, mobile ? 16 : 24),
    material,
  );
  dome.name = 'Stacey Lake realistic moving clouds (test only)';
  dome.renderOrder = 2; // after existing Sky, before near-scene 360 forest
  dome.frustumCulled = false;
  dome.userData.isSceneryBackdrop = true;
  dome.userData.nonColliding = true;
  scene.add(dome);
  status.state = 'ready (not phone verified)';
  if (diagnostics) diagnostics.assets['cloud lab'] = 'TEST ENABLED / mobile GPU unverified';

  const update = (seconds, viewCamera = camera, light = sunDirection) => {
    // The dome travels with the player like a sky, never becoming walkable.
    dome.position.copy(viewCamera.position);
    uniforms.uTime.value = seconds;
    uniforms.uSunDir.value.copy(light).normalize();
  };
  update(0, camera, sunDirection);
  return {
    status,
    dome,
    update,
    dispose() { scene.remove(dome); dome.geometry.dispose(); material.dispose(); status.state='disposed'; },
  };
}
