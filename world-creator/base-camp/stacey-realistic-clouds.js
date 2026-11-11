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

  // Direction-based cloud coordinates avoid the huge flat white horizon sheet
  // caused by near-horizontal ray/flat-plane intersection in the V1 shader.
  // Noise is continuous on the sphere and winds across its entire upper half.
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
    ' float n000=hash3(i),n100=hash3(i+vec3(1.,0.,0.));',
    ' float n010=hash3(i+vec3(0.,1.,0.)),n110=hash3(i+vec3(1.,1.,0.));',
    ' float n001=hash3(i+vec3(0.,0.,1.)),n101=hash3(i+vec3(1.,0.,1.));',
    ' float n011=hash3(i+vec3(0.,1.,1.)),n111=hash3(i+vec3(1.,1.,1.));',
    ' return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),',
    '            mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);',
    '}',
    'float fbm3(vec3 p){',
    ' float sum=0.0,amp=0.5,norm=0.0;',
    ' for(int j=0;j<__OCTAVES__;j++){',
    '    sum+=amp*noise3(p);norm+=amp;p=p*2.1+vec3(5.7,17.1,9.2);amp*=0.5;',
    ' }',
    ' return sum/max(norm,0.001);',
    '}',
    'void main(){',
    ' vec3 dir=normalize(vWorld-cameraPosition);',
    ' if(dir.y < -0.06)discard;',
    ' float skyFade=smoothstep(-0.055,0.16,dir.y);',
    ' vec3 wind=vec3(uTime*0.0021,0.0,uTime*0.0014);',
    ' float cloudAlpha=0.0;',
    ' float shadowSum=0.0;',
    ' for(int i=0;i<__STEPS__;i++){',
    '   float layer=float(i)/float(__STEPS__);',
    '   vec3 coord=dir*(4.8+layer*0.8) + vec3(layer*13.2,layer*4.9,layer*8.3)+wind;',
    '   float large=fbm3(coord);',
    '   float shape=noise3(coord*2.7+vec3(1.6,3.8,2.3));',
    '   float density=smoothstep(uCoverage-0.065,uCoverage+0.14,large*0.80+shape*0.20);',
    '   density*=0.77+0.23*noise3(coord*3.9);',
    '   float sliceOpacity=density*(1.05/float(__STEPS__));',
    '   float contribution=(1.0-cloudAlpha)*sliceOpacity;',
    '   cloudAlpha+=contribution;',
    '   float lightFacing=0.63+0.30*clamp(dot(normalize(vec3(dir.x,0.45,dir.z)),normalize(uSunDir))*0.5+0.5,0.,1.);',
    '   shadowSum+=contribution*lightFacing*(0.82+0.16*layer);',
    ' }',
    ' // Cut off gradually near the horizon; never use a hard level cloud plane.',
    ' float alpha=clamp(cloudAlpha*skyFade*uOpacity*1.65,0.0,0.90);',
    ' if(alpha<0.018)discard;',
    ' float shade=clamp(shadowSum/max(cloudAlpha,0.01),0.57,1.0);',
    ' vec3 daylight=vec3(0.98,0.985,1.0);',
    ' vec3 warm=vec3(1.0,0.82,0.67);',
    ' vec3 cloudTint=mix(warm,daylight,smoothstep(-0.09,0.50,uSunDir.y));',
    ' // Soft gray shadowing inside each billow, brighter silver edges.',
    ' vec3 litColor=cloudTint*mix(vec3(0.72,0.76,0.82),vec3(1.0),shade);',
    ' gl_FragColor=vec4(litColor,alpha);',
    '}',
  ].join('\\n').replace(/__STEPS__/g, String(STEPS))
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
