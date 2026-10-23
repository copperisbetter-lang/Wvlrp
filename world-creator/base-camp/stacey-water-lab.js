// Independent calm-water laboratory. Reuses Stacey Lake geometry without touching terrain.
export function installCalmWaterLab(THREE,scene,legacyWater){
  const old=scene.getObjectByName('StaceyLakeWater');
  const old2=scene.getObjectByName('StaceyLakeWater2');
  const glitter=scene.getObjectByName('StaceyLakeSunlightPath');
  if(!old&&!old2)throw new Error('Stacey Lake surface not found');
  const source=old||old2;
  source.visible=false;
  if(glitter)glitter.visible=false;
  // Shudu Lake 4K EXR (Poly Haven CC0), tone-mapped and downsampled for mobile lab.
  const shuduHex='bbbdc7bec0caaaacb7a4a6b2a8aab6a6a9b5a8abb6aeb0bb8d8e919d9fa595979daaacb3aeb0b8a0a3ac898b9181838554504b57534e595555625f61686569625f624f4c48514c4b3d39393e393a3c37373c37373c37373c38373a36353a3535';
  const envBytes=new Uint8Array(8*4*4);
  for(let i=0;i<32;i++){envBytes[i*4]=parseInt(shuduHex.slice(i*6,i*6+2),16);envBytes[i*4+1]=parseInt(shuduHex.slice(i*6+2,i*6+4),16);envBytes[i*4+2]=parseInt(shuduHex.slice(i*6+4,i*6+6),16);envBytes[i*4+3]=255;}
  const env=new THREE.DataTexture(envBytes,8,4,THREE.RGBAFormat);
  env.magFilter=THREE.LinearFilter;env.minFilter=THREE.LinearFilter;env.wrapS=THREE.RepeatWrapping;env.needsUpdate=true;
  const material=new THREE.ShaderMaterial({
    side:THREE.DoubleSide,transparent:true,depthWrite:false,
    uniforms:{uTime:{value:0},uSun:{value:new THREE.Vector3(.3,.7,.3)},uShudu:{value:env}},
    vertexShader:`varying vec3 vWorld;varying vec3 vView;varying float vEdge;attribute float aLakeT;
      void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;vEdge=aLakeT;vec4 view=modelViewMatrix*vec4(position,1.0);vView=cameraPosition-vWorld;gl_Position=projectionMatrix*view;}`,
    fragmentShader:`precision highp float;
      uniform float uTime;uniform vec3 uSun;uniform sampler2D uShudu;varying vec3 vWorld;varying vec3 vView;varying float vEdge;
      void main(){
        // No moving UVs or stripes: almost-stationary, two-direction micro normals.
        float t=uTime*.008;
        float a=sin(vWorld.x*.24+vWorld.z*.16+t)*.018 + sin(vWorld.x*.71-vWorld.z*.39-t*.7)*.006;
        float b=sin(vWorld.x*-.19+vWorld.z*.28-t*.79)*.014 + sin(vWorld.x*.43+vWorld.z*.64+t*.6)*.006;
        vec3 n=normalize(vec3(a,1.,b));
        vec3 eye=normalize(vView);
        float fres=.13+.75*pow(1.-clamp(abs(dot(n,eye)),0.,1.),2.0);
        float shore=clamp(min(vEdge,1.-vEdge)*11.,0.,1.);
        vec3 deep=vec3(.11,.24,.25);
        vec3 near=vec3(.25,.39,.34);
        vec3 color=mix(near,deep,smoothstep(.0,.9,shore));
        // Small view-dependent light reflection, no painted sun ribbon.
        vec3 sun=normalize(uSun);
        float sunAngle=max(dot(reflect(-sun,n),eye),0.); float spec=pow(sunAngle,90.)*.62 + pow(sunAngle,450.)*.52;
        vec3 reflected=reflect(-eye,n);
        float longitude=atan(reflected.z,reflected.x)/6.2831853+.5;
        float latitude=acos(clamp(reflected.y,-1.,1.))/3.14159265;
        vec3 environment=texture2D(uShudu,vec2(longitude,latitude)).rgb;\n        // Sky/shore reflection remains visible even with the coarse Shudu fallback.\n        float sky=smoothstep(-.06,.25,reflected.y);\n        vec3 skyColor=mix(vec3(.30,.43,.46),vec3(.65,.73,.77),smoothstep(.05,.9,reflected.y));\n        environment=mix(environment*.70+vec3(.06,.09,.09),skyColor,sky*.82);
        color=mix(color,environment,fres*.88)+vec3(1.0,.93,.78)*spec;
        gl_FragColor=vec4(color,mix(.64,.95,smoothstep(.0,.42,shore)));
      }`
  });
  const water=new THREE.Mesh(source.geometry,material);
  water.name='StaceyCalmWaterLab';
  water.frustumCulled=false;
  water.renderOrder=4;
  scene.add(water);
  window.__staceyWaterRenderer='Shudu calm-water lab v2: slow ripples, Fresnel reflection, softer shore';
  return {update(seconds,sun){material.uniforms.uTime.value=seconds;if(sun)material.uniforms.uSun.value.copy(sun);}};
}
