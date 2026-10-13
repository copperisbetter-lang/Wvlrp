/**
 * The Wild — actual village-facing mountain scenery, October 13, 2026.
 *
 * Previous distant panorama/rock meshes were hidden behind the 1.1 km
 * streamed terrain. These lightweight real 3D surfaces stand in the opened
 * valley immediately BEHIND the three walkable buildings. The wooded
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
      c.ellipse(x,y,r*(1.5+random(i,6)),r*(.50+random(i,7)*.5),
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
    const t=new B.DynamicTexture("village visible sandstone cliff strata",
      {width:w,height:h},scene,false,B.Texture.BILINEAR_SAMPLINGMODE);
    textures.push(t);const c=t.getContext();
    const g=c.createLinearGradient(0,0,w,h);
    g.addColorStop(0,"#d0cab5");
    g.addColorStop(.43,"#a8aea0");
    g.addColorStop(.8,"#8b9889");
    g.addColorStop(1,"#6c8172");
    c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let i=0;i<30;i++){
      const y=i*19-6+random(i,31)*6;
      c.fillStyle=["#d7cfb9","#b6b2a1","#8b9386","#6d8172"][i%4];
      c.globalAlpha=.32+random(i,32)*.40;
      c.fillRect(0,y,w,7+random(i,33)*12);
      c.fillStyle="#4f6358";c.fillRect(0,y+13,w,1.3);
    }
    for(let i=0;i<2600;i++){
      const x=random(i,40)*w,y=random(i,41)*h;
      c.strokeStyle=i%5===0?"#e7ddc7":"#52675b";
      c.globalAlpha=.22+random(i,42)*.46;
      c.lineWidth=.7+random(i,43)*2;
      c.beginPath();c.moveTo(x,y);
      const run=(random(i,44)-.27)*35;
      c.lineTo(x+run,y+random(i,45)*8-4);c.stroke();
    }
    // Pale exposed ledges, broken horizontal beds and shadowed cracks.
    for(let i=0;i<70;i++){
      const x=random(i,50)*w,y=random(i,51)*h;
      c.globalAlpha=.3+random(i,52)*.35;
      c.strokeStyle=i%3?"#435b50":"#e7dcc7";
      c.lineWidth=1.1+random(i,53)*4;c.beginPath();c.moveTo(x,y);
      c.lineTo(x+random(i,54)*15-7,y+13+random(i,55)*36);
      c.stroke();
    }
    c.globalAlpha=1;t.update(false);return t;
  }
  function material(name,texture){
    const m=new B.StandardMaterial(name,scene);materials.push(m);
    m.diffuseTexture=texture;m.diffuseColor=new B.Color3(1,1,1);
    m.emissiveColor=new B.Color3(.22,.23,.17);
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
        verts.push(x,villageY+base+(top-base)*f,
          z+.8*Math.sin(x*.028+seedOffset)+.27*Math.sin(x*.15+j));
        uvs.push(i/steps*3.5,f);
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
  const farTop=x=>91+21*Math.exp(-Math.pow((x-28)/102,2))+
    8*Math.sin(x*.019+1.5)+4*Math.sin(x*.082+.8);
  surface("BACK Appalachian blue-green mountain ridge",190,-275,275,-48,
    x=>farTop(x)-13,farMat,1);
  const woodedTop=x=>64+17*Math.exp(-Math.pow((x-5)/92,2))+
    7*Math.sin(x*.021+.7)+4*Math.sin(x*.095);
  surface("MID real wooded mountain hillside",158,-224,224,-42,
    woodedTop,woodsMat,2);
  // Long unmistakable exposed sandstone cliffs sit IN FRONT of the woodland
  // texture and well above all 10m roofs, behind every actual building.
  const rockTop=x=>48+19*Math.exp(-Math.pow((x-16)/93,2))+
    6*Math.sin(x*.024+1)+3*Math.sin(x*.13);
  const rockBase=x=>19+5*Math.sin(x*.032+2)+
    8*Math.exp(-Math.pow((x+35)/80,2));
  surface("VISIBLE sunlit rocky cliff above Ranger Station",144,-167,167,
    rockBase,rockTop,rockMat,3);
  // Irregular wooded ledges at the foot of the cliff preserve the natural
  // valley look, without hiding the broad gray ridge behind the rooftops.
  const nearTop=x=>14+9*Math.exp(-Math.pow(x/118,2))+
    4*Math.sin(x*.046+.7)+2*Math.sin(x*.15);
  surface("LOW green wooded foothill behind all village shops",133,-193,193,-34,
    nearTop,woodsMat,4);

  // The new view is anchored to the world. Its four depths introduce genuine
  // parallax on side-to-side walks; once a player approaches the valley exit,
  // it fades rather than forming an invisible/unwalkable wall.
  const observer=scene.onBeforeRenderObservable.add(()=>{
    const dz=camera.position.z;
    const alpha=clamp((131-dz)/35,0,1);
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
