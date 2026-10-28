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
  rockMaterial=new T.MeshStandardMaterial({map:rockPhoto,color:0xd0d0c8,roughness:.94,metalness:0,side:T.DoubleSide});
  const darkerRock=new T.MeshStandardMaterial({map:rockPhoto,color:0x9fa197,roughness:1,metalness:0,side:T.DoubleSide});
  bedMaterial=new T.MeshStandardMaterial({map:bedPhoto,roughness:.93,metalness:0,
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
    const anchor='  // Low-contrast rock flecks through grassy/silty hillside at both canyon ends.';
    if(!shader.fragmentShader.includes(anchor))throw Error('V12 spring rock shader anchor missing');
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

  // Real 3D limestone crest: the grooved arch is NOT a rectangular photo billboard.
  // Its final 2.3m of stone feather into and BELOW the existing mountain ground.
  const grotto=new T.Group();grotto.name='Natural sculpted mountain spring grotto V12';
  group.add(grotto);
  const lipX=startX+1.95,baseY=20.05,segments=40,bands=12;
  const v=[],uv=[],indices=[];
  for(let j=0;j<=bands;j++){
    const t=j/bands;
    for(let k=0;k<=segments;k++){
      const a=Math.PI*k/segments,s=Math.sin(a),c=Math.cos(a);
      const r=4.2+9.3*t,z=CZ+r*c+.17*Math.sin(a*11+t*7);
      const x=lipX-4.8*t+.37*Math.sin(a*8+t*14);
      let y=baseY+(4.12+t*7.4)*Math.pow(s,.88)+.21*Math.sin(a*13+t*5);
      if(t>.76)y=T.MathUtils.lerp(y,ground(x,z)-.72,smooth(.76,1,t));
      v.push(x,y,z);uv.push(k/segments*2.7,t*2.3);
      if(j<bands&&k<segments){
        const p=j*(segments+1)+k;
        indices.push(p,p+1,p+segments+1,p+1,p+segments+2,p+segments+1);
      }
    }
  }
  const lipGeo=new T.BufferGeometry();
  lipGeo.setAttribute('position',new T.Float32BufferAttribute(v,3));
  lipGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  lipGeo.setIndex(indices);lipGeo.computeVertexNormals();
  const lip=new T.Mesh(lipGeo,rockMaterial);
  lip.name='Natural broken stone crest with buried mountain join';grotto.add(lip);
  // Smaller shadow sits inside the stone arch, ~1.5 m back, and river covers its base.
  // Natural curved polygon avoids the giant black circle seen in V11 screenshots.
  const shadowVertices=[lipX-1.65,baseY+1.45,CZ];
  const rim=[{y:baseY-1.3,z:CZ-4.1},{y:baseY-1.3,z:CZ+4.1}];
  for(let k=0;k<=segments;k++){
    const a=Math.PI*k/segments;
    rim.push({y:baseY+3.88*Math.pow(Math.sin(a),.9),z:CZ+4.08*Math.cos(a)});
  }
  for(const p of rim)shadowVertices.push(lipX-1.65,p.y,p.z);
  const shadowIndex=[];
  for(let k=1;k<rim.length;k++)shadowIndex.push(0,k,k+1);
  shadowIndex.push(0,rim.length,1);
  const shadowGeo=new T.BufferGeometry();
  shadowGeo.setAttribute('position',new T.Float32BufferAttribute(shadowVertices,3));
  shadowGeo.setIndex(shadowIndex);shadowGeo.computeVertexNormals();
  const recess=new T.Mesh(shadowGeo,new T.MeshBasicMaterial({color:0x11191a,side:T.DoubleSide}));
  recess.name='Natural recessed dark hollow inside limestone spring';grotto.add(recess);

  // Instanced weathered chunks blend the outer arch with existing terrain.
  const pose=new T.Object3D();
  const rubble=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),darkerRock,42);
  for(let k=0;k<42;k++){
    const side=k%2?-1:1,t=(k+1)/43;
    const x=startX-3.1+5*t+1.05*Math.sin(k*2.2);
    const z=CZ+side*(4.9+8.2*t+.43*Math.sin(k*1.91));
    const size=.62+1.23*((k*13%17)/17);
    pose.position.set(x,ground(x,z)+size*.12,z);
    pose.rotation.set(k*.31,k*.71,k*.18);
    pose.scale.set(size*1.35,size*.48,size*.88);
    pose.updateMatrix();rubble.setMatrixAt(k,pose.matrix);
  }
  rubble.name='Photographic embedded limestone shoulder fragments';
  rubble.computeBoundingSphere();grotto.add(rubble);
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
  diag.assets['photo spring V12']='recessed rock arch, buried edges, photobedrock under all 3 flows';
  const report={grotto,splitter,beds,photoRock:'Poly Haven rock_face_03',
    bedrock:'Poly Haven rock_06',waterSource:'existing animated scene water',
    trunkWidth:8.8,branches:2,mainAndLakeIntact:true};
  window.staceySpringV12=report;
  return report;
}
