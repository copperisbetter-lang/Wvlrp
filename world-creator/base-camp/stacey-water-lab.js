// Independent calm-water laboratory. Reuses Stacey Lake geometry without touching terrain.
export function installCalmWaterLab(THREE,scene,legacyWater){
  const old=scene.getObjectByName('StaceyLakeWater');
  const old2=scene.getObjectByName('StaceyLakeWater2');
  const glitter=scene.getObjectByName('StaceyLakeSunlightPath');
  if(!old&&!old2)throw new Error('Stacey Lake surface not found');
  const source=old||old2;
  source.visible=false;
  if(glitter)glitter.visible=false;
  const material=new THREE.ShaderMaterial({
    side:THREE.DoubleSide,transparent:false,depthWrite:true,
    uniforms:{uTime:{value:0},uSun:{value:new THREE.Vector3(.3,.7,.3)}},
    vertexShader:`varying vec3 vWorld;varying vec3 vView;varying float vEdge;attribute float aLakeT;
      void main(){vWorld=position;vEdge=aLakeT;vec4 view=modelViewMatrix*vec4(position,1.0);vView=-view.xyz;gl_Position=projectionMatrix*view;}`,
    fragmentShader:`precision highp float;
      uniform float uTime;uniform vec3 uSun;varying vec3 vWorld;varying vec3 vView;varying float vEdge;
      void main(){
        // No moving UVs or stripes: almost-stationary, two-direction micro normals.
        float t=uTime*.012;
        float a=sin(vWorld.x*.74+vWorld.z*.43+t)*.012;
        float b=sin(vWorld.x*-.51+vWorld.z*.82-t*.79)*.009;
        vec3 n=normalize(vec3(a,1.,b));
        vec3 eye=normalize(vView);
        float fres=pow(1.-abs(dot(n,eye)),4.);
        float shore=clamp(min(vEdge,1.-vEdge)*11.,0.,1.);
        vec3 deep=vec3(.075,.17,.17);
        vec3 near=vec3(.16,.28,.25);
        vec3 color=mix(near,deep,smoothstep(.0,.9,shore));
        // Small view-dependent light reflection, no painted sun ribbon.
        vec3 sun=normalize(uSun);
        float spec=pow(max(dot(reflect(-sun,n),eye),0.),110.)*.11;
        color=mix(color,vec3(.24,.34,.33),fres*.23)+vec3(.85,.82,.68)*spec;
        gl_FragColor=vec4(color,1.);
      }`
  });
  const water=new THREE.Mesh(source.geometry,material);
  water.name='StaceyCalmWaterLab';
  water.frustumCulled=false;
  water.renderOrder=4;
  scene.add(water);
  window.__staceyWaterRenderer='Independent Calm Water Lab';
  return {update(seconds,sun){material.uniforms.uTime.value=seconds;if(sun)material.uniforms.uSun.value.copy(sun);}};
}
