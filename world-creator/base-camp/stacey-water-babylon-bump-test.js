import {RGBELoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/RGBELoader.js';
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
  // Load the actual 1024x512 HDR radiance panorama (not a 8x4 color proxy).
  // The 4K original remains a source asset; 1K float HDR is the mobile-safe first tier.
  const hdrURL='https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/shudu_lake_1k.hdr';
  window.__staceyHDR={state:'loading',url:hdrURL};
  // Mirko Kunze's MIT-licensed CheapWater normal texture, provided by Doug.
  const rippleNormal=new THREE.TextureLoader().load('https://assets.babylonjs.com/textures/waterbump.png');
  rippleNormal.wrapS=rippleNormal.wrapT=THREE.RepeatWrapping;
  rippleNormal.minFilter=THREE.LinearMipmapLinearFilter;
  rippleNormal.magFilter=THREE.LinearFilter;
  rippleNormal.generateMipmaps=true;
  const material=new THREE.ShaderMaterial({
    side:THREE.DoubleSide,transparent:true,depthWrite:false,
    uniforms:{uTime:{value:0},uSun:{value:new THREE.Vector3(.3,.7,.3)},uShudu:{value:env},uRippleNormal:{value:rippleNormal}},
    vertexShader:`varying vec3 vWorld;varying vec3 vView;varying float vEdge;attribute float aLakeT;
      void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;vEdge=aLakeT;vec4 view=modelViewMatrix*vec4(position,1.0);vView=cameraPosition-vWorld;gl_Position=projectionMatrix*view;}`,
    fragmentShader:`precision highp float;
      uniform float uTime;uniform vec3 uSun;uniform sampler2D uShudu;uniform sampler2D uRippleNormal;varying vec3 vWorld;varying vec3 vView;varying float vEdge;
      void main(){
        // No moving UVs or stripes: almost-stationary, two-direction micro normals.
        float t=uTime*.65;
        float a=sin(vWorld.x*.65+vWorld.z*.12+t)*.029 + sin(vWorld.x*1.55-vWorld.z*.24-t*.67)*.009;
        float b=sin(vWorld.x*-.13+vWorld.z*.71-t*.81)*.026 + sin(vWorld.x*.21+vWorld.z*1.65+t*.57)*.008;
        float r1=sin(dot(vWorld.xz,vec2(2.4,.7))+t*.9);float r2=sin(dot(vWorld.xz,vec2(-.9,3.1))-t*.7);float r3=sin(dot(vWorld.xz,vec2(4.8,-1.8))+t*1.1);vec2 uv1=vWorld.xz*.065+vec2(t*.048,t*.026);
        vec2 uv2=mat2(-.5,-.866,.866,-.5)*(vWorld.xz*.095)+vec2(-t*.035,t*.041);
        vec3 tex1=texture2D(uRippleNormal,uv1).xyz*2.-1.;
        vec3 tex2=texture2D(uRippleNormal,uv2).xyz*2.-1.;
        vec3 n=normalize(vec3(a+.092*tex1.x+.058*tex2.x,1.,b+.092*tex1.y+.058*tex2.y));
        vec3 eye=normalize(vView);
        float fres=.04+.96*pow(1.-clamp(abs(dot(n,eye)),0.,1.),5.0);
        float shore=clamp(min(vEdge,1.-vEdge)*11.,0.,1.);
        vec3 deep=vec3(.16,.30,.32);
        vec3 near=vec3(.27,.43,.38);
        vec3 color=mix(near,deep,smoothstep(.0,.9,shore));
        // Small view-dependent light reflection, no painted sun ribbon.
        vec3 sun=normalize(uSun);
        float sunAngle=max(dot(reflect(-sun,n),eye),0.); float spec=pow(sunAngle,5.)*.36 + pow(sunAngle,28.)*1.1 + pow(sunAngle,110.)*1.7;
        vec3 reflected=reflect(-eye,n);
        float longitude=atan(reflected.z,reflected.x)/6.2831853+.5;
        float latitude=acos(clamp(reflected.y,-1.,1.))/3.14159265;
        vec3 environment=texture2D(uShudu,vec2(longitude,latitude)).rgb;
        // Sky/shore reflection remains visible even with the coarse Shudu fallback.
        float sky=smoothstep(-.06,.25,reflected.y);
        vec3 skyColor=mix(vec3(.30,.43,.46),vec3(.65,.73,.77),smoothstep(.05,.9,reflected.y));
        environment=mix(environment*.75,skyColor,sky*.38);
        color=mix(color,environment,clamp(.26+fres*.64,0.,.85))+vec3(1.0,.94,.78)*spec;
        // Wind-driven half-foot-scale breakers near both outer bank and island shore.
        // Edge attribute runs 0..1 across the lake; use narrow animated crests,
        // not a permanent white ring. Motion follows local wave directions.
        // Breakers are translucent, patchy crests; never draw a continuous white curb.
        float bankDistance=min(vEdge,1.-vEdge);
        // aLakeT spans island to outer bank; both shores receive the same treatment.
        // Two small advancing wavelets, staggered in world space to avoid a foam curb.
        float nearBank=1.-smoothstep(.002,.055,bankDistance);
        float slowPatch=sin(vWorld.x*.14+vWorld.z*.11+uTime*.10)
                       *sin(vWorld.x*.095-vWorld.z*.17-uTime*.065);
        float localNoise=tex1.x*.42+tex2.y*.30;
        float brokenPatches=smoothstep(-.12,.28,slowPatch+localNoise);
        float crestA=sin(bankDistance*115.-uTime*.52+
                        sin(vWorld.x*.18-vWorld.z*.10)*1.15);
        float crestB=sin(bankDistance*177.-uTime*.69+
                        sin(vWorld.z*.23+vWorld.x*.07)*1.30);
        float crests=max(smoothstep(.66,.94,crestA),
                         smoothstep(.79,.97,crestB)*.65);
        float foam=nearBank*crests*brokenPatches*.48;
        // Light glancing off small translucent crests, not bright painted white strips.
        color=mix(color,vec3(.70,.77,.70),foam);
        color+=vec3(.028,.031,.025)*foam;
        float fine=(tex1.x+tex2.y)*.5;
        color+=vec3(.009,.014,.016)*fine*(.3+.7*fres);
        gl_FragColor=vec4(color,mix(.64,.95,smoothstep(.0,.42,shore)));
      }`
  });
  new RGBELoader().setDataType(THREE.HalfFloatType).load(hdrURL,texture=>{
    texture.wrapS=THREE.RepeatWrapping;
    texture.wrapT=THREE.ClampToEdgeWrapping;
    texture.magFilter=THREE.LinearFilter;
    texture.minFilter=THREE.LinearFilter;
    texture.needsUpdate=true;
    material.uniforms.uShudu.value=texture;
    window.__staceyHDR={state:'ready',width:texture.image.width,height:texture.image.height,url:hdrURL};
  },undefined,error=>{window.__staceyHDR={state:'fallback',reason:String(error),url:hdrURL};console.warn('Shudu HDR download failed; retaining local fallback',error);});
  const water=new THREE.Mesh(source.geometry,material);
  water.name='StaceyCalmWaterLab';
  water.frustumCulled=false;
  water.renderOrder=4;
  scene.add(water);
  window.__staceyWaterRenderer='Historical Babylon waterbump ripple test + Shudu HDR';
  return {update(seconds,sun){material.uniforms.uTime.value=seconds;if(sun)material.uniforms.uSun.value.copy(sun);window.__staceyWaterTime=seconds;}};
}
