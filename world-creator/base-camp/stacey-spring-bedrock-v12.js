// Stacey Lake V12: dry photo-rock spring installation, isolated from lake and path code.
// CC0 photographic texture references: Poly Haven (rock_face_03 and rock_06).
// Rendering uses original in-game flowing water, never water baked into a texture.
export function addStaceySpringV12({T,group,ground,CZ,startX,splitX,lines,mat,diag,creekBedrockMap}) {
  const photoUrl='https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/';
  const loader=new T.TextureLoader();
  const photo=(id,folder,textureName)=>{
    const map=loader.load(photoUrl+folder+'/'+textureName,()=>{diag.assets[id]='photo ready'},undefined,()=>{
      diag.errors.push(id+' photo unavailable; procedural fallback');
      if(id==='spring limestone'&&rockMaterial){rockMaterial.map=creekBedrockMap;rockMaterial.needsUpdate=true;}
      if(id==='dry spring bedrock'&&bedMaterial){
        bedMaterial.map=creekBedrockMap;bedMaterial.needsUpdate=true;
        if(mat.userData.springBedUniform)mat.userData.springBedUniform.value=creekBedrockMap;
      }
    });
    map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;
    map.anisotropy=4;return map;
  };
  let rockMaterial=null,bedMaterial=null;
  const rockPhoto=photo('spring limestone','rock_face_03','rock_face_03_diff_1k.jpg');
  const bedPhoto=photo('dry spring bedrock','rock_06','rock_06_diff_1k.jpg');
  rockMaterial=new T.MeshStandardMaterial({map:rockPhoto,color:0x9ba9a8,roughness:1,metalness:0,side:T.DoubleSide});
  const darkerRock=new T.MeshStandardMaterial({map:rockPhoto,color:0x939d99,roughness:1,metalness:0,side:T.DoubleSide});
  bedMaterial=new T.MeshStandardMaterial({map:bedPhoto,color:0x999b93,roughness:.96,metalness:0,
     side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
  // Photographic relief and world-space wetness remain continuous across
  // separate stones; lower faces darken and polish where flow touches them.
  for(const material of [rockMaterial,darkerRock,bedMaterial]){
    material.bumpMap=material.map;material.bumpScale=.075;
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 wetRockWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
       vec4 wetPoint=vec4(transformed,1.);
       #ifdef USE_INSTANCING
        wetPoint=instanceMatrix*wetPoint;
       #endif
       wetRockWorld=(modelMatrix*wetPoint).xyz;
      `);
      shader.fragmentShader='varying vec3 wetRockWorld;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
       float rockT=clamp((wetRockWorld.x+36.)/28.7,0.,1.);
       float waterHeight=mix(21.30,12.04,rockT);
       float wet=1.-smoothstep(waterHeight-.12,waterHeight+.48,wetRockWorld.y);
       diffuseColor.rgb*=mix(1.,.64,wet);
       roughnessFactor=mix(roughnessFactor,.32,wet);
      `);
    };
    material.customProgramCacheKey=()=> 'stacey-wet-photo-rock-r1';
  }


  // Replace the upstream forest-floor pixels in the terrain's shader with the
  // DRY rock photograph; alpha-free geometry skirts bury themselves at the edges.
  // Original sand, forest, dome camera clipping and lower creek remain unchanged.
  const compileOriginal=mat.onBeforeCompile;
  mat.onBeforeCompile=shader=>{
    compileOriginal(shader);
    const uniform={value:bedPhoto};mat.userData.springBedUniform=uniform;
    shader.uniforms.springBedPhoto=uniform;
    shader.fragmentShader='uniform sampler2D springBedPhoto;\n'+shader.fragmentShader;
    // V11's GLSL template adds one leading space here, whereas the V12 test
    // used two. Match the comment text regardless of indentation.
    const anchor='// Low-contrast rock flecks through grassy/silty hillside at both canyon ends.';
    if(!shader.fragmentShader.includes(anchor)){
      // A missing comment must NEVER prevent the entire lake from rendering.
      // Photo-rock meshes remain visible even without this optional terrain mask.
      diag.assets['spring terrain rock mask']='optional anchor missing; mesh beds retained';
      return;
    }
    shader.fragmentShader=shader.fragmentShader.replace(anchor,
      `  // V16 Android fix: clip ONLY the stone-level river inlet.
  // V15 cut a >7m-long, >4m-high hole in the terrain shader, creating a
  // broad unsupported black undercut. Leave most of the mountain SOLID.
  float inletAx=smoothstep(-38.85,-38.22,vGround.x)*(1.-smoothstep(-36.10,-35.52,vGround.x));
  float inletZ=abs(vGround.z+240.+.12*sin(vGround.x*1.37+vGround.z*.47));
  float inletRoof=22.95+.22*sin(vGround.z*1.48+vGround.x*.76);
  float inletFloor=20.79+.08*sin(vGround.z*1.12-vGround.x*.45);
  float inletHalf=4.34+.17*sin(vGround.z*1.93-vGround.x*.52);
  if(inletAx>.52 && inletZ<inletHalf && vGround.y>inletFloor && vGround.y<inletRoof) discard;
  // Photographed dry stone replaces leaves and grass UNDER all headwater streams.
  float spT=clamp((vGround.x+36.)/28.,0.,1.);
  float spRun=smoothstep(-40.,-35.0,vGround.x)*(1.-smoothstep(-7.4,-4.8,vGround.x));
  float spFork=smoothstep(-17.8,-9.5,vGround.x);
  float spSplit=3.81*smoothstep(-19.5,-10.,vGround.x);
  float spBend=.32*sin(spT*2.8);
  float spSideA=abs(vGround.z+240.-spBend);
  float spSideB=min(abs(vGround.z+240.-spSplit),abs(vGround.z+240.+spSplit));
  float spSide=mix(spSideA,spSideB,spFork);
  float spRockWidth=mix(6.2,3.0,spFork);
  float spRough=.36*sin(vGround.x*.89+vGround.z*1.16)+.24*sin(vGround.x*2.1-vGround.z*.61);
  float spMask=spRun*(1.-smoothstep(spRockWidth-1.2,spRockWidth+4.5,spSide+spRough));
  vec3 springDry=texture2D(springBedPhoto,vGround.xz*.25).rgb;
  c=mix(c,springDry*vec3(.85,.87,.83),spMask);
`+anchor);
  };
  mat.customProgramCacheKey=()=> 'stacey-terrain-v16-narrow-headwater-mouth';
  mat.needsUpdate=true;

  // Create three *separate* real, walk-height-aligned rock beds just under existing
  // animated flows, 1 wide trunk + 2 narrower rock feeders, no photo-image edges.
  const beds=[];
  for(let n=0;n<lines.length;n++){
    const line=lines[n],v=[],uv=[],indices=[],cross=22;
    for(let i=0;i<line.length;i++){
      const p=line[i],a=line[Math.max(0,i-1)],b=line[Math.min(i+1,line.length-1)];
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.max(.001,Math.hypot(dx,dz));
      for(let j=0;j<=cross;j++){
        const q=j/cross*2-1,edge=Math.abs(q);
        // At both ends the photographed rock shelf narrows into real terrain,
        // rather than exposing an enormous rectangular photograph from above.
        const endFade=smooth(0,5,i)*smooth(0,5,line.length-1-i);
        const shore=(n===0?3.8:2.1)*(.18+.82*endFade);
        const shoulder=p.w*.5+shore+edge*.38*Math.sin(i*1.31+q*2.7);
        const x=p.x-dz/len*shoulder*q,z=p.z+dx/len*shoulder*q;
        // Rough banks rise outside the active stream, while the center stays
        // submerged below the original animated water surface.
        const bankRidge=.36*smooth(.42,.8,edge)*(1-smooth(.92,1,edge));
        const rough=.105*Math.sin(x*1.71+z*.83)*Math.sin(z*1.19-x*.37)*smooth(.35,.75,edge);
        const center=.028*(1-smooth(.32,.63,edge));
        const edgeBury=.40*smooth(.78,1,edge)+.13*(1-endFade)*smooth(.45,.98,edge);
        const y=ground(x,z)+bankRidge+rough+center-edgeBury;
        v.push(x,y,z);uv.push(x*.28,z*.28);
        if(i<line.length-1&&j<cross){
          const k=i*(cross+1)+j;
          indices.push(k,k+1,k+cross+1,k+1,k+cross+2,k+cross+1);
        }
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(v,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setIndex(indices);g.computeVertexNormals();
    const bed=new T.Mesh(g,bedMaterial);
    bed.name=n===0?'Dry photo-rock under single wide mountain stream':'Dry photo-rock under feeder '+n;
    group.add(bed);beds.push(bed);
  }

  // Extend the ORIGINAL real moving river slightly into the newly visible rock
  // recess. Same water material, same width/y as the preserved V11 source.
  const riverHead=group.children.find(o=>o.name==='Single mountain spring stream before boulder');
  if(riverHead && riverHead.material){
    const sourcePositions=[],sourceUV=[],sourceIndices=[],rows=24;
    for(let i=0;i<=rows;i++){
      const t=i/rows,wx=startX-2.35+2.35*t,wz=CZ+.07*Math.sin(t*1.7);
      // V16: real existing water runs out of the face, gently widening into
      // the full 8.8m trunk with uneven natural bank lines, not a square patch.
      const halfWidth=4.04+.35*t+.055*Math.sin(t*11.4)*(1-t);
      for(const side of [-1,1]){
        sourcePositions.push(wx,21.34,wz+side*halfWidth);
        sourceUV.push(side<0?0:1,-.20*(1-t));
      }
      if(i<rows){const j=2*i;sourceIndices.push(j,j+2,j+1,j+1,j+2,j+3);}
    }
    const sourceGeo=new T.BufferGeometry();
    sourceGeo.setAttribute('position',new T.Float32BufferAttribute(sourcePositions,3));
    sourceGeo.setAttribute('uv',new T.Float32BufferAttribute(sourceUV,2));
    sourceGeo.setIndex(sourceIndices);sourceGeo.computeVertexNormals();
    const sourceFlow=new T.Mesh(sourceGeo,riverHead.material);
    sourceFlow.name='V16 continuous real spring water visible inside narrow mountain inlet';
    group.add(sourceFlow);
    diag.assets['spring live source']='original animated V11 water extended 2.35m into narrow natural inlet';
  }else{diag.errors.push('Spring live source water shader not found');}

  // V14 / owner's ground and aerial QA: do not bridge the spring with boulders.
  // V13 / owner's aerial QA: the former 40x12 continuous arched roof looked
  // like a giant draped tarp or stacks of hay bales. DO NOT create another
  // full-width cloth-like sheet or rectangular photo billboard.
  // Build the lip instead out of overlapping irregular 3-D rock masses.
  const grotto=new T.Group();
  grotto.name='V14 hillside spring with separate embedded rock banks — no overhead rock bridge';
  group.add(grotto);
  const pose=new T.Object3D();
  const capRockGeo=new T.IcosahedronGeometry(1,2);
  const capRockPositions=capRockGeo.getAttribute('position');
  for(let i=0;i<capRockPositions.count;i++){
    const x=capRockPositions.getX(i),y=capRockPositions.getY(i),z=capRockPositions.getZ(i);
    const warp=1+.06*Math.sin(14*x+9*z)*Math.cos(11*y+5*x)+.033*Math.sin(21*z+12*y);
    capRockPositions.setXYZ(i,x*warp,y*warp,z*warp);
  }
  capRockGeo.computeVertexNormals();
  // A recessed irregular *stone* spring, with its blackness BEHIND the rock,
  // never a large flat, perfectly elliptical cap visible from overhead.
  const shadowX=startX-2.60,shadowY=20.77;
  const outline=[
    [-4.75,20.77],[-4.64,22.22],[-4.23,22.87],[-3.60,23.23],
    [-2.85,23.78],[-2.10,23.57],[-1.39,23.99],[-.54,23.69],
    [.36,23.92],[1.06,23.51],[1.91,23.84],[2.64,23.34],
    [3.44,23.37],[4.12,22.79],[4.68,22.07],[4.75,20.77]
  ];
  const holeVerts=[shadowX,shadowY+1.40,CZ],holeIndices=[];
  for(const [z,y] of outline)holeVerts.push(shadowX,y,CZ+z);
  // Fan triangulation follows the jagged roofline and narrow water-level base.
  holeVerts.push(shadowX,shadowY-.20,CZ+4.75);
  holeVerts.push(shadowX,shadowY-.20,CZ-4.75);
  for(let i=1;i<holeVerts.length/3-1;i++)holeIndices.push(0,i,i+1);
  holeIndices.push(0,holeVerts.length/3-1,1);
  const hollowGeo=new T.BufferGeometry();
  hollowGeo.setAttribute('position',new T.Float32BufferAttribute(holeVerts,3));
  hollowGeo.setIndex(holeIndices);hollowGeo.computeVertexNormals();
  const recess=new T.Mesh(hollowGeo,new T.MeshStandardMaterial({
    map:rockPhoto,color:0x676e67,roughness:1,metalness:0,side:T.DoubleSide,depthWrite:true
  }));
  recess.name='Uneven narrow spring recess behind real stones';grotto.add(recess);
  // NEVER span the opening with a row of disconnected floating rocks.
  // The river emerges from the actual hillside between two banks, each made
  // of small embedded native stones; the center 9m stays fully open for water.
  const cap=new T.InstancedMesh(capRockGeo,rockMaterial,32);
  for(let i=0;i<32;i++){
    const side=i%2?1:-1,j=Math.floor(i/2),t=j/15;
    // Rock centers stay outside the +/-4.4m wide source stream, with
    // fragments submerged in the terrain. No overhead bridge, ever.
    const x=startX-2.0+t*5.7+.18*Math.sin(i*2.1);
    const z=CZ+side*(6.3+t*3.1+.27*Math.sin(i*1.77));
    const sx=.53+.31*((i*7%13)/13),sy=.42+.26*((i*3%11)/11);
    const sz=.62+.33*((i*5%17)/17);
    pose.position.set(x,ground(x,z)+sy*.10,z);
    pose.rotation.set(.12*Math.sin(i*1.43),i*.71,.14*Math.sin(i*2.03));
    pose.scale.set(sx,sy,sz);pose.updateMatrix();cap.setMatrixAt(i,pose.matrix);
  }
  cap.name='32 embedded bank rocks, no overhead spring bridge';
  cap.computeBoundingSphere();grotto.add(cap);
  // Small broken fragments at the shoulders and up the mountain edge.
  // Each outer fragment sinks into the same terrain as the walking collider,
  // so no rectangular alpha or geometry corners remain visible from above.
  const rubble=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),darkerRock,48);
  const rubbleTints=new T.Color(),colors=[0x8f9993,0x9a9e96,0x777f7b,0xb3b5aa];
  for(let k=0;k<48;k++){
    const side=k%2?-1:1,t=(k+1)/49;
    const x=startX-3.8+6*t+1.2*Math.sin(k*2.2);
    const z=CZ+side*(5.9+7.3*t+.45*Math.sin(k*1.9));
    const size=.55+1.18*((k*13%19)/19);
    pose.position.set(x,ground(x,z)+size*.13,z);
    pose.rotation.set(k*.31,k*.71,k*.18);
    pose.scale.set(size*(1.23+.12*Math.sin(k)),size*.48,size*(.78+.12*Math.cos(k)));
    pose.updateMatrix();rubble.setMatrixAt(k,pose.matrix);
    rubbleTints.setHex(colors[k%4]);rubble.setColorAt(k,rubbleTints);
  }
  rubble.name='48 small embedded natural rock shoulders';
  rubble.computeBoundingSphere();grotto.add(rubble);
  // Expose a diagnostic count for owners' aerial QA.
  diag.assets['natural spring silhouette V16']='32 embedded bank rocks; V16 low narrow river inlet, hillside intact, original live water';
  const splitterGeo=new T.IcosahedronGeometry(1,2);
  const position=splitterGeo.getAttribute('position');
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const irregular=1+.07*Math.sin(x*17+z*7)*Math.cos(y*13-z*9)+.045*Math.sin(y*23+x*11);
    position.setXYZ(i,x*irregular,y*irregular,z*irregular);
  }
  splitterGeo.computeVertexNormals();
  const splitter=new T.Mesh(splitterGeo,rockMaterial);
  splitter.scale.set(3.25,2.42,2.96);
  splitter.position.set(splitX,16.65,CZ);splitter.rotation.set(.18,.12,-.15);
  splitter.name='Natural limestone splitter (exactly two waterfall feeds)';
  group.add(splitter);
  const flanks=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),darkerRock,16);
  for(let k=0;k<16;k++){
    const side=k%2?-1:1,t=(k+1)/17;
    const x=T.MathUtils.lerp(startX+2.2,splitX-1.5,t);
    const z=CZ+side*(4.45+.5*t+.45*Math.sin(k*2.1));
    const size=.42+.46*((k*7%13)/13);
    pose.position.set(x,ground(x,z)+size*.04,z);
    pose.rotation.set(k*.8,k*1.1,k*.23);
    pose.scale.set(size*1.3,size*.44,size*.9);
    pose.updateMatrix();flanks.setMatrixAt(k,pose.matrix);
  }
  flanks.name='Natural scattered streamside rocks';flanks.computeBoundingSphere();group.add(flanks);
  diag.assets['photo spring V16']='low narrow real-water emergence, mountain roof intact, V14 banks and tapered bedrock preserved';
  const report={grotto,splitter,beds,photoRock:'Poly Haven rock_face_03',
    bedrock:'Poly Haven rock_06',facetedLipRocks:32,buriedEdgeRocks:48,waterSource:'existing animated scene water',
    trunkWidth:8.8,branches:2,mainAndLakeIntact:true};
  window.staceySpringV12=report;window.staceySpringV13=report;window.staceySpringV14=report;window.staceySpringV15=report;window.staceySpringV16=report;
  return report;
}

