/**
 * The Wild — distant Appalachian ridges for clean-slate flatland, October 15, 2026.
 *
 * Previous distant panorama/rock meshes were hidden behind the 1.1 km
 * streamed terrain. These lightweight real 3D surfaces stand in the opened
 * valley well BEYOND the playable valley and build-pad reserves. The wooded
 * mountains, long exposed sandstone escarpment and near forest layer have
 * different depths (parallax), irregular ridgelines, and no collisions.
 * Terrain, character placement, multiplayer and original map markers
 * are deliberately unchanged.
 */
export function installVisibleVillageMountains(B,scene,camera,{
  villageX=93,villageY=0, mobile=false
}={}){
  const meshes=[],materials=[],textures=[];
  function random(n,salt=0){
    const f=Math.sin((n+1)*127.117+salt*311.713)*43758.5453;
    return f-Math.floor(f);
  }
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const palette=[
    "#284c37","#345d3e","#3f6a40","#567e45","#6e8a42",
    "#78934b","#9ba753","#abb768","#496b42","#355e46"
  ];
  function paintedForest(name,lighten=0){
    const w=mobile?1024:1536,h=512;
    const t=new B.DynamicTexture(name,{width:w,height:h},scene,false,B.Texture.BILINEAR_SAMPLINGMODE);
    textures.push(t);
    const c=t.getContext();
    const g=c.createLinearGradient(0,0,0,h);
    if(lighten){
      g.addColorStop(0,"#829d73");
      g.addColorStop(.32,"#668c61");
      g.addColorStop(1,"#385f48");
    }else{
      g.addColorStop(0,"#74965c");
      g.addColorStop(.32,"#4f7a45");
      g.addColorStop(1,"#24472d");
    }
    c.fillStyle=g;c.fillRect(0,0,w,h);
    // Thousands of irregular little native hardwood crowns instead of the
    // huge green flat-shaded triangles seen in the previous screenshots.
    for(let i=0;i<19000;i++){
      const x=random(i,1)*w,y=random(i,2)*h;
      const r=(1+random(i,3)*5.0)*(mobile?.74:1);
      const p=palette[Math.floor(random(i,4)*palette.length)];
      c.globalAlpha=(lighten?.28:.46)+random(i,5)*.30;
      c.fillStyle=p;c.beginPath();
      c.ellipse(x,y,r*(.76+random(i,6)*.66),r*(.74+random(i,7)*.68),
        (random(i,8)-.5)*.9,0,Math.PI*2);
      c.fill();
    }
    c.globalAlpha=1;
    // Broken folds and vegetation shadows follow a WV mountainside.
    for(let i=0;i<135;i++){
      const x=random(i,19)*w,y=random(i,20)*h;
      c.lineWidth=1+random(i,21)*3;c.strokeStyle=i%3===0?"#d8ce8d34":"#1b4d3445";
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(
        x+14,y+23,x-12,y+45,x+random(i,22)*35-18,y+85);
      c.stroke();
    }
    t.update(false);return t;
  }
  function paintedStone(){
    const w=1024,h=512;
    const t=new B.DynamicTexture("weathered WV layered sandstone face",
      {width:w,height:h},scene,false,B.Texture.BILINEAR_SAMPLINGMODE);
    textures.push(t);const c=t.getContext(),pixels=c.createImageData(w,h);
    // A gently stratified *rock* field, not the repeated high-contrast
    // horizontal bars which made the village mountain appear striped.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const k=(y*w+x)*4;
      const warp=18*Math.sin(x*.010)+7*Math.sin(x*.034+y*.008);
      const fine=Math.sin(x*.14+y*.11)*6+Math.cos(x*.052-y*.087)*7;
      const coarse=Math.sin(x*.017+y*.028)*13+
        Math.cos(x*.025-y*.018)*12;
      const strata=Math.sin((y+warp)*.069)*7;
      const grit=(((x*73856093)^(y*19349663))&255)/255*15-7.5;
      const fault=Math.abs(Math.sin(x*.031+y*.014+Math.sin(y*.016)*1.4));
      const fissure=fault<.028?-30:0;
      const moss=Math.max(0,Math.sin(x*.018+y*.035)*
        Math.cos(y*.022-x*.014)-.44)*29;
      const v=fine+coarse+strata+grit+fissure;
      pixels.data[k]=Math.max(0,Math.min(255,144+v-moss*.58));
      pixels.data[k+1]=Math.max(0,Math.min(255,145+v-moss*.08));
      pixels.data[k+2]=Math.max(0,Math.min(255,132+v-moss*.67));
      pixels.data[k+3]=255;
    }
    c.putImageData(pixels,0,0);
    // Discontinuous natural ledges and shadow cracks, not parallel bands.
    for(let i=0;i<125;i++){
      const x=random(i,40)*w,y=random(i,41)*h;
      const length=8+random(i,42)*66,drop=(random(i,43)-.5)*16;
      c.globalAlpha=.12+random(i,44)*.28;
      c.strokeStyle=i%4?"#24352e":"#e3dac3";
      c.lineWidth=.7+random(i,45)*3;
      c.beginPath();c.moveTo(x,y);
      c.lineTo(x+length*.33,y-3+drop*.45);
      c.lineTo(x+length*.70,y+2+drop*.8);
      c.lineTo(x+length,y+drop);c.stroke();
    }
    c.globalAlpha=1;t.update(false);return t;
  }
  function material(name,texture){
    const m=new B.StandardMaterial(name,scene);materials.push(m);
    m.diffuseTexture=texture;m.diffuseColor=new B.Color3(1,1,1);
    m.emissiveColor=name.includes("stone")?new B.Color3(.055,.058,.049):new B.Color3(.13,.16,.12);
    m.specularColor=new B.Color3(.025,.029,.020);
    m.backFaceCulling=false;
    return m;
  }
  const farMat=material("distant sunlit Appalachians",paintedForest("distant mountain woodland",1));
  const woodsMat=material("real mountain timber canopy",paintedForest("sunlit wooded mountain",0));
  const rockMat=material("Appalachian layered stone face",paintedStone());
  function surface(name,z,xLo,xHi,bottom,crest,mat,seedOffset=0){
    const steps=200,rows=5,verts=[],uvs=[],ids=[],norms=[];
    for(let i=0;i<=steps;i++){
      const x=xLo+(xHi-xLo)*i/steps;
      const top=crest(x);
      const base=typeof bottom==="function"?bottom(x):bottom;
      for(let j=0;j<rows;j++){
        const f=j/(rows-1);
        // These are actual vertices at varying depths, not a billboard.
        verts.push(villageX+x,villageY+base+(top-base)*f,
          z+.8*Math.sin(x*.028+seedOffset)+.27*Math.sin(x*.15+j));
        uvs.push(i/steps*(mat===rockMat?1.4:3.1),f);
        if(i>0&&j>0){
          const a=(i-1)*rows+j-1,b=i*rows+j-1;
          ids.push(a,b,a+1,b,b+1,a+1);
        }
      }
    }
    B.VertexData.ComputeNormals(verts,ids,norms);
    const mesh=new B.Mesh(name,scene);
    const data=new B.VertexData();
    data.positions=verts;data.indices=ids;data.uvs=uvs;data.normals=norms;
    data.applyToMesh(mesh);
    mesh.material=mat;mesh.isPickable=false;mesh.checkCollisions=false;
    mesh.applyFog=false;mesh.renderingGroupId=0;
    meshes.push(mesh);return mesh;
  }
  // The far wooded massif fills the *upper* village view. The silhouette is
  // varied for a recognizable uneven Appalachian mountain, not a green wall.
  // Actual layered, WORLD-ANCHORED mountain geometry: the distant summit is
  // well behind the back edge of the graded village, with real cliffs across
  // the entire central phone viewport instead of a flat nearby green slope.
  const farTop=x=>108+28*Math.exp(-Math.pow((x-28)/118,2))+
    11*Math.sin(x*.014+1.5)+4*Math.sin(x*.071+.8);
  surface("BACK Appalachian blue-green mountain ridge",1700,-900,900,-62,
    x=>farTop(x)-14,farMat,1);
  const woodedTop=x=>78+22*Math.exp(-Math.pow((x-5)/110,2))+
    8*Math.sin(x*.017+.7)+4*Math.sin(x*.073);
  surface("MID real wooded mountain hillside",1450,-750,750,-48,
    woodedTop,woodsMat,2);
  // Pale exposed sedimentary cliffs rise above Ranger Station's roof while
  // retaining forest both below and beyond the rock face.
  const rockTop=x=>53+19*Math.exp(-Math.pow((x-16)/108,2))+
    6*Math.sin(x*.020+1)+3*Math.sin(x*.11);
  const rockBase=x=>25+4*Math.sin(x*.026+2)+
    6*Math.exp(-Math.pow((x+35)/87,2));
  surface("VISIBLE distant sunlit rocky Appalachian escarpment",1290,-640,640,
    rockBase,rockTop,rockMat,3);
  // Low wooded feet of the ridge stay below the sandstone ledges, so the
  // scene reads as a distant Appalachian mountain instead of tall grass.
  const nearTop=x=>10+5*Math.exp(-Math.pow(x/118,2))+
    2.5*Math.sin(x*.046+.7)+1.5*Math.sin(x*.15);
  surface("LOW green foothill beyond cabin/camp land",1090,-610,610,-40,
    nearTop,woodsMat,4);

  // The new view is anchored to the world. Its four depths introduce genuine
  // parallax on side-to-side walks; once a player approaches the valley exit,
  // it fades rather than forming an invisible/unwalkable wall.
  const observer=scene.onBeforeRenderObservable.add(()=>{
    const dz=camera.position.z;
    const alpha=clamp((1010-dz)/180,0,1);
    for(const m of meshes)m.visibility=alpha;
  });
  return {
    meshes,
    dispose(){
      scene.onBeforeRenderObservable.remove(observer);
      for(const m of meshes)m.dispose();
      for(const m of materials)m.dispose();
      for(const t of textures)t.dispose();
    }
  };
}
