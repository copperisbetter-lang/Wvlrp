// Gator 3: mobile-conscious animated lake surface, inspired by the approved Stacey Lake panorama.
// Independent of trails and campsites. Geometry, shore, spawn and movement remain untouched.
export function installStaceyWater(THREE,water){
 const uniforms={uTime:{value:0},uSun:{value:new THREE.Vector3(.3,.8,.4)},uCam:{value:new THREE.Vector3()}};
 const material=new THREE.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:`varying vec3 vWorld;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`precision highp float;
   varying vec3 vWorld;varying vec2 vUv;uniform float uTime;uniform vec3 uSun;uniform vec3 uCam;
   float wave(vec2 p,float t){return sin(p.x*1.63+t*.91+sin(p.y*.84+t*.23))*.48+sin(p.y*2.13-t*1.19)*.32+sin((p.x+p.y)*3.4+t*1.67)*.2;}
   void main(){
    vec2 p=vWorld.xz;float t=uTime;
    float a=wave(p*.58,t),b=wave(p*.58+vec2(.11,.07),t);
    float c=wave(p*.25+vec2(.07,.12),t);
    vec3 n=normalize(vec3((a-b)*.37,1.0,(a-c)*.37));
    vec3 V=normalize(uCam-vWorld);vec3 L=normalize(uSun);
    float fres=pow(1.-max(dot(n,V),0.),3.);
    float daylight=clamp(L.y*.9+.2,.06,1.);
    vec3 shallow=vec3(.09,.38,.33),deep=vec3(.025,.16,.235);
    float tonal=.5+.5*sin(p.x*.047+p.y*.036);
    vec3 base=mix(shallow,deep,clamp(.28+tonal*.48+fres*.32,0.,1.));
    float sky=clamp(dot(reflect(-V,n),vec3(0.,1.,0.))*.65+.42,0.,1.);
    vec3 reflection=mix(vec3(.10,.22,.19),vec3(.41,.65,.77),sky);
    base=mix(base,reflection,clamp(.22+fres*.50,0.,.75));
    float glint=pow(max(dot(reflect(-L,n),V),0.),185.);
    // Small wind-driven wavelets, with irregular shoreward foam where UV reaches the bank.
    // The lake mesh must supply UVs with the shoreline at its outer boundary.
    float edge=max(abs(vUv.x*2.-1.),abs(vUv.y*2.-1.));
    float shore=1.-smoothstep(.89,1.0,edge);
    float band=1.-shore;
    float crest=sin(edge*165.-t*.82+sin(p.x*.17+p.y*.13)*2.1);
    float foam=smoothstep(.70,.94,crest)*smoothstep(.90,.985,edge)*(1.-smoothstep(.995,1.,edge));
    foam*=.48+.52*sin(p.x*.36+p.y*.29+t*.17)*sin(p.y*.31-p.x*.19);
    base=mix(base,vec3(.72,.82,.76),clamp(foam*.38,0.,.32));
    float fine=sin(p.x*5.7+t*2.3)*sin(p.y*4.3-t*1.8);
    glint*=.5+.5*fine*fine;
    base+=vec3(1.,.92,.72)*glint*.82*daylight;
    base+=vec3(.018,.052,.057)*(a*.5+.5);
    gl_FragColor=vec4(base,.78);
   }`
 });
 water.material.dispose();water.material=material;
 return {update(seconds,sunDirection,cameraPosition){
   uniforms.uTime.value=seconds;
   uniforms.uSun.value.copy(sunDirection).normalize();
   uniforms.uCam.value.copy(cameraPosition);
 }};
}
