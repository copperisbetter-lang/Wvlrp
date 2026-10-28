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
  bedMaterial=new T.MeshStandardMaterial({map:bedPhoto,color:0xb4c4c6,roughness:.93,metalness:0,
     side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);

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
      `  // Photographed dry stone replaces leaves and grass UNDER all headwater streams.
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
  c=mix(c,springDry*vec3(.92,.96,.98),spMask);
`+anchor);
  };
  mat.customProgramCacheKey=()=> 'stacey-terrain-v12-photographic-spring-bed';
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
        const q=j/cross*2-1,edge=Math.abs(q),shoulder=p.w*.5+(n===0?4.9:2.7);
        const x=p.x-dz/len*shoulder*q,z=p.z+dx/len*shoulder*q;
        const raised=.07*(1-smooth(.72,.95,edge))+.025*Math.sin(x*2.3+z*.6)*(1-edge);
        const y=ground(x,z)+raised-.24*smooth(.77,1,edge);
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

  // V13 / owner's aerial QA: the former 40x12 continuous arched roof looked
  // like a giant draped tarp or stacks of hay bales. DO NOT create another
  // full-width cloth-like sheet or rectangular photo billboard.
  // Build the lip instead out of overlapping irregular 3-D rock masses.
  const grotto=new T.Group();
  grotto.name='V13 embedded fractured limestone spring — no tarp roof';
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
  const shadowX=startX-2.15,shadowY=20.77;
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
  for(let i=1;i<holeVerts.length/3;i++)holeIndices.push(0,i,i+1);
  holeIndices.push(0,holeVerts.length/3-1,1);
  const hollowGeo=new T.BufferGeometry();
  hollowGeo.setAttribute('position',new T.Float32BufferAttribute(holeVerts,3));
  hollowGeo.setIndex(holeIndices);hollowGeo.computeVertexNormals();
  const recess=new T.Mesh(hollowGeo,new T.MeshBasicMaterial({
    color:0x26302f,side:T.DoubleSide,depthWrite:true
  }));
  recess.name='Uneven narrow spring recess behind real stones';grotto.add(recess);
  // Main fractured lip: varied sizes and rotations produce an organic broken
  // rock silhouette, rather than a smooth arch or stacked squared slabs.
  const cap=new T.InstancedMesh(capRockGeo,rockMaterial,26);
  for(let i=0;i<26;i++){
    const t=i/25,top=i<12,side=i>=12&&i<22,sgn=i%2?1:-1;
    let x,z,y,sx,sy,sz;
    if(top){
      z=CZ-5.65+(i/11)*11.3+.22*Math.sin(i*2.31);
      x=startX+1.05+.74*Math.sin(i*1.89);
      y=24.77+.43*Math.sin(i*1.73)+.16*Math.cos(i*4.12);
      sx=1.1+.52*((i*7%11)/11);sy=.74+.21*Math.sin(i*1.2)**2;
      sz=1.06+.48*((i*3%13)/13);
    }else if(side){
      const j=i-12;z=CZ+sgn*(4.55+.76*((j*7%9)/9));
      x=startX+.50+.69*Math.sin(j*2.04);
      y=21.35+((j*7)%5)*.77+.32*Math.sin(j*1.64);
      sx=1.1+.3*((j*5%11)/11);sy=.95+.27*((j*3%7)/7);
      sz=1.23+.39*Math.sin(j*1.9)**2;
    }else{
      const j=i-22;z=CZ+sgn*(6.3+.8*j);
      x=startX-1.25-1.1*j;
      y=Math.max(24.15,ground(x,z)-.16);
      sx=1.8;sy=1.15;sz=1.65;
    }
    pose.position.set(x,y,z);
    pose.rotation.set(.16*Math.sin(i*1.4),i*.67,.21*Math.sin(i*2.2));
    pose.scale.set(sx,sy,sz);pose.updateMatrix();cap.setMatrixAt(i,pose.matrix);
  }
  cap.name='26 irregular overhanging stone formations';cap.computeBoundingSphere();grotto.add(cap);
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
  diag.assets['natural spring silhouette V13']='26 faceted lip rocks, 48 buried edge fragments, smaller irregular shadow; no roof sheet';
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
  diag.assets['photo spring V13']='smaller irregular rock recess, real jagged stone overhang, dry photo bedrock under all 3 flows';
  const report={grotto,splitter,beds,photoRock:'Poly Haven rock_face_03',
    bedrock:'Poly Haven rock_06',facetedLipRocks:26,buriedEdgeRocks:48,waterSource:'existing animated scene water',
    trunkWidth:8.8,branches:2,mainAndLakeIntact:true};
  window.staceySpringV12=report;window.staceySpringV13=report;
  return report;
}
