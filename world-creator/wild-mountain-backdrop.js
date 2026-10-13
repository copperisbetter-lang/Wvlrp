/**
 * The Wild — panoramic West Virginia mountain horizon.
 * Visual direction: October 13 approved three-building woodland reference:
 * blue sunny sky, overlapping native green ranges, distant wooded slopes and
 * an exposed gray Appalachian rock escarpment.
 *
 * This is a continuous, camera-centered 360-degree sky *texture*, not a flat
 * image of the cabins. All cabins, trees and multiplayer explorers remain
 * genuine 3D objects in front of it; movement and collisions are unchanged.
 * No network image downloads or large GLB assets: phone-friendly at 1024x512.
 */
export function installWildMountainBackdrop(B,scene,camera,{mobile=false,villageX=93,villageBackZ=172,villageGroundY=0}={}){
  const width=mobile?1024:2048,height=mobile?512:1024;
  const scale=width/2048;
  const texture=new B.DynamicTexture("West Virginia sunny 360 mountain skyline",
    {width,height},scene,false,B.Texture.BILINEAR_SAMPLINGMODE);
  const ctx=texture.getContext();
  const W=2048,H=1024;
  // Draw everything in a common virtual resolution so Android and desktop
  // reproduce the same ridges, cliff faces, wooded slopes and broad blue sky.
  ctx.save();ctx.scale(scale,scale);
  const sky=ctx.createLinearGradient(0,0,0,605);
  sky.addColorStop(0,"#4194d3");
  sky.addColorStop(.41,"#80c1ea");
  sky.addColorStop(.78,"#b0dbed");
  sky.addColorStop(1,"#e2ebdf");
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

  // Soft fine weather/cloud detail is fixed in the panorama and has no update
  // cost while walking. No opaque strips or image-card borders.
  function cloud(x,y,rx,ry){
    ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
    const g=ctx.createRadialGradient(0,0,.03,0,0,1);
    g.addColorStop(0,"rgba(255,255,251,.44)");
    g.addColorStop(.52,"rgba(255,255,251,.18)");
    g.addColorStop(1,"rgba(255,255,251,0)");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  for(let i=0;i<18;i++){
    const x=(i*359+131)%W,y=200+((i*137)%210);
    cloud(x,y,74+(i%4)*46,10+(i%3)*7);
  }
  function hash(a,b=0){
    let n=Math.sin(a*127.1+b*311.7+31.13)*43758.5453;
    return n-Math.floor(n);
  }
  function ridge(x,band){
    // Periods divide W exactly for seamless wrap at the panorama seam.
    const t=x/W*Math.PI*2;
    const macro=Math.sin(t*(band===0?2:3)+band*1.5)*29+
      Math.sin(t*5+1.7+band*.52)*18+
      Math.sin(t*11-2.1)*7+
      Math.sin(t*23+band)*3.4;
    // The tallest bluff sits near one mountain skyline arc, as in the photo.
    const cliff=band===0?62*Math.pow(Math.max(0,Math.cos(t-4.3)),8):0;
    const base=[462,508,544][band];
    return base-macro-cliff+(hash(Math.round(x/7),band)-.5)*(band===2?7:3);
  }
  const colors=[
    ["#88aeb4","#708c98"],
    ["#638b86","#4b746b"],
    ["#476e51","#304c3b"]
  ];
  for(let band=0;band<3;band++){
    const g=ctx.createLinearGradient(0,370,0,750);
    g.addColorStop(0,colors[band][0]);
    g.addColorStop(1,colors[band][1]);
    ctx.fillStyle=g;ctx.beginPath();
    ctx.moveTo(0,ridge(0,band));
    for(let x=4;x<=W;x+=4)ctx.lineTo(x,ridge(x,band));
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    // Dense forest ridge crowns: distant hemlock, white pine, poplar and oak.
    // Individual crowns make these distant hills wooded, not smooth triangles.
    const count=[230,330,460][band];
    ctx.fillStyle=["#72999d","#537967","#345a40"][band];
    for(let i=0;i<count;i++){
      const x=i*W/count+hash(i,band)*6,top=ridge(x,band);
      const tall=3+hash(i,band+11)*(band===2?16:12);
      if(hash(i,band+29)<.44){
        ctx.beginPath();ctx.moveTo(x,top-tall);
        ctx.lineTo(x-3.3,top+3);ctx.lineTo(x+3.3,top+3);
        ctx.fill();
      }else{
        const rad=2.5+hash(i,band+55)*4.5;
        ctx.beginPath();ctx.ellipse(x,top-tall*.34,rad,tall*.52,
          0,0,Math.PI*2);ctx.fill();
      }
    }
  }

  // Gray layered sandstone cliff visible on the back mountain (near NNE).
  // Clip it to the distant ridge instead of allowing a floating flat sprite.
  const x0=1180,x1=1550;
  ctx.save();ctx.beginPath();ctx.moveTo(x0,ridge(x0,0));
  for(let x=x0;x<=x1;x+=4)ctx.lineTo(x,ridge(x,0));
  for(let x=x1;x>=x0;x-=7)ctx.lineTo(x,ridge(x,0)+47+
    9*Math.sin(x*.031)+12*hash(Math.floor(x/29),14));
  ctx.closePath();ctx.clip();
  const rock=ctx.createLinearGradient(x0,363,x1,521);
  rock.addColorStop(0,"#b1b1a6");
  rock.addColorStop(.55,"#828982");
  rock.addColorStop(1,"#586d61");
  ctx.fillStyle=rock;ctx.fillRect(x0,330,x1-x0,250);
  for(let i=0;i<140;i++){
    const x=x0+hash(i,33)*(x1-x0),y=350+hash(i,34)*170;
    const len=9+hash(i,35)*38;
    ctx.strokeStyle=i%3===0?"#d3cbb9a9":"#48555086";
    ctx.lineWidth=1.2+hash(i,36)*3;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x+len*(i%2?-.45:.75),y+6+hash(i,37)*15);
    ctx.stroke();
  }
  ctx.restore();
  // Mist at the lower distance line softens the painted terrain behind
  // actual 3D hemlocks, native shrubs, village porches and paths.
  const haze=ctx.createLinearGradient(0,519,0,735);
  haze.addColorStop(0,"rgba(210,224,203,0)");
  haze.addColorStop(.7,"rgba(182,203,176,.10)");
  haze.addColorStop(1,"rgba(52,81,63,.02)");
  ctx.fillStyle=haze;ctx.fillRect(0,519,W,220);
  // Fill under the horizon; nearby world terrain conceals most of this.
  const valley=ctx.createLinearGradient(0,610,0,H);
  valley.addColorStop(0,"#314c3d");valley.addColorStop(1,"#1b382c");
  ctx.fillStyle=valley;ctx.fillRect(0,715,W,H-715);
  ctx.restore();
  texture.update(false);
  texture.wrapU=B.Texture.WRAP_ADDRESSMODE;
  texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;

  const mat=new B.StandardMaterial("panoramic blue skies mountain and cliff",scene);
  mat.diffuseTexture=texture;
  mat.disableLighting=true;
  mat.emissiveColor=new B.Color3(1,1,1);
  mat.backFaceCulling=false;
  mat.disableDepthWrite=true;
  mat.specularColor=new B.Color3(0,0,0);
  const dome=B.MeshBuilder.CreateSphere("seamless all-direction Appalachian mountains",{
    diameter:1400,segments:48,sideOrientation:B.Mesh.BACKSIDE
  },scene);
  dome.material=mat;
  dome.isPickable=false;dome.applyFog=false;
  dome.renderingGroupId=0;
  // Fixed sky has no motion parallax; real hills and vegetation move normally.
  // Follow the player in XYZ so the ridge never intersects a streamed tile.

  // The 360° sky alone is easy to hide behind actual 3D forest and high
  // terrain. This second, transparent *mountain-only* vista is deliberately
  // aligned with the north-facing village façades (positive world Z).
  // It is real scene geometry behind the lodge, not the approved image pasted
  // over the playable houses, paths or other people.
  const vW=mobile?1024:2048,vH=mobile?512:1024;
  const vista=new B.DynamicTexture("sunny cliff mountain above ranger station",
    {width:vW,height:vH},scene,false,B.Texture.BILINEAR_SAMPLINGMODE);
  const vc=vista.getContext(),factor=vW/2048;
  vc.save();vc.scale(factor,factor);
  const vw=2048,vh=1024;
  function fract(n){return n-Math.floor(n);}
  function rnd(n,k=0){return fract(Math.sin(n*127.1+k*311.7+91.713)*43758.5453);}
  function crest(x){
    const u=x/vw;
    return 322-166*Math.exp(-Math.pow((u-.68)/.30,2))
      -40*Math.exp(-Math.pow((u-.50)/.10,2))
      +25*Math.sin(u*12.5)+14*Math.sin(u*30.1)+5*Math.sin(u*99.4);
  }
  // Soft blue distance behind the mountain and the atmospheric shoulder.
  vc.beginPath();vc.moveTo(0,crest(0));
  for(let x=4;x<=vw;x+=4)vc.lineTo(x,crest(x));
  vc.lineTo(vw,vh);vc.lineTo(0,vh);vc.closePath();
  const greens=vc.createLinearGradient(0,175,0,vh);
  greens.addColorStop(0,"#6b8a50");
  greens.addColorStop(.30,"#496e36");
  greens.addColorStop(.65,"#254d2c");
  greens.addColorStop(1,"#173c2b");
  vc.fillStyle=greens;vc.fill();
  // Irregular illuminated hardwood/tree clusters: many different scales,
  // concentrated into natural wooded ribs and sunlit slopes.
  for(let i=0;i<13000;i++){
    const x=rnd(i,1)*vw,y=crest(x)+5+rnd(i,2)*550;
    if(y>vh)continue;
    const d=(y-crest(x))/550;
    const sun=.38+.62*Math.max(0,Math.sin(x*.021+y*.017))**2;
    const tone=rnd(i,3),warm=rnd(i,4)>.73;
    const colors=warm?
      ["#9cac47","#b1b85e","#ced174","#7c9850"]:
      ["#365c34","#507735","#668b3f","#799442","#406d47","#224d36"];
    vc.fillStyle=colors[Math.floor(tone*colors.length)];
    const rad=(1.5+4*rnd(i,5))*(.74+d*.65);
    vc.beginPath();
    vc.ellipse(x,y,rad*(.9+rnd(i,6)),rad*(.65+sun*.32),
      rnd(i,7),0,Math.PI*2);
    vc.fill();
  }
  // A broad stratified Appalachian sandstone escarpment above the village.
  // The narrow right-only cliff occupied just 24% of panorama pixels, and
  // phone portrait FOV cropped it away. Extend across the full central view.
  // Outline includes projecting ledges and deep vertical clefts.
  const rockTop=x=>crest(x)+14+11*Math.sin(x*.047);
  vc.save();vc.beginPath();
  const c0=430,c1=1845; // full central Appalachian escarpment, also visible on portrait phones
  vc.moveTo(c0,rockTop(c0)+40);
  for(let x=c0;x<=c1;x+=7)vc.lineTo(x,rockTop(x));
  for(let x=c1;x>=c0;x-=7){
    const edge=330+28*Math.sin(x*.030)+18*rnd(Math.floor(x/21),33);
    vc.lineTo(x,rockTop(x)+edge);
  }
  vc.closePath();vc.clip();
  const stone=vc.createLinearGradient(c0,190,c1,520);
  stone.addColorStop(0,"#d4d0b9");
  stone.addColorStop(.29,"#a9b0a0");
  stone.addColorStop(.59,"#858f82");
  stone.addColorStop(1,"#515d52");
  vc.fillStyle=stone;vc.fillRect(c0,140,c1-c0,650);
  for(let i=0;i<1900;i++){
    const x=c0+rnd(i,23)*(c1-c0),y=170+rnd(i,24)*445;
    const len=10+rnd(i,25)*115;
    vc.strokeStyle=i%4===0?"#e2ddc594":i%3===0?"#4554478c":"#7a8476ab";
    vc.lineWidth=.6+rnd(i,26)*3.4;
    vc.beginPath();vc.moveTo(x,y);vc.lineTo(
      x+len*(rnd(i,27)-.19),y+(rnd(i,28)-.42)*18);
    vc.stroke();
  }
  // Tree shadows and occasional hemlocks growing across rock benches.
  for(let i=0;i<160;i++){
    const x=c0+rnd(i,41)*(c1-c0),y=rockTop(x)+60+rnd(i,42)*315;
    const len=8+rnd(i,43)*40;
    vc.strokeStyle=i%3===0?"#384e3cb9":"#5b6d4b9c";
    vc.lineWidth=1+rnd(i,44)*3;
    vc.beginPath();vc.moveTo(x,y);vc.lineTo(x+2,y-len);vc.stroke();
  }
  vc.restore();
  // Closer wooded folds overlap the toe of the cliff naturally.
  vc.beginPath();vc.moveTo(0,660);
  for(let x=0;x<=vw;x+=6){
    const y=648+52*Math.sin(x/160)+22*Math.sin(x/49)-18*Math.sin(x/313);
    vc.lineTo(x,y);
  }
  vc.lineTo(vw,vh);vc.lineTo(0,vh);vc.closePath();
  const nearGreen=vc.createLinearGradient(0,630,0,vh);
  nearGreen.addColorStop(0,"#50783c");nearGreen.addColorStop(1,"#234a2d");
  vc.fillStyle=nearGreen;vc.fill();
  for(let i=0;i<1450;i++){
    const x=rnd(i,63)*vw;
    const y=640+52*Math.sin(x/160)+22*Math.sin(x/49)-18*Math.sin(x/313)+
      rnd(i,64)*110;
    const t=7+rnd(i,65)*26;
    vc.fillStyle=["#3a653a","#436f39","#638a45","#799a43"][i%4];
    vc.beginPath();vc.moveTo(x,y-t);vc.lineTo(x-t*.24,y+t*.2);
    vc.lineTo(x+t*.24,y+t*.2);vc.closePath();vc.fill();
  }
  // Feather both lower and side edges. The foreground stays fully playable:
  // there is never a hard image-card rectangle cutting through the forest.
  vc.globalCompositeOperation="destination-out";
  const bottom=vc.createLinearGradient(0,720,0,1024);
  bottom.addColorStop(0,"rgba(0,0,0,0)");
  bottom.addColorStop(1,"rgba(0,0,0,1)");
  vc.fillStyle=bottom;vc.fillRect(0,720,vw,304);
  for(const side of ["left","right"]){
    const g=side==="left"?
      vc.createLinearGradient(0,0,250,0):
      vc.createLinearGradient(vw,0,vw-250,0);
    g.addColorStop(0,"rgba(0,0,0,1)");
    g.addColorStop(1,"rgba(0,0,0,0)");
    vc.fillStyle=g;
    vc.fillRect(side==="left"?0:vw-250,0,250,vh);
  }
  vc.restore();
  vista.hasAlpha=true;vista.update(false);
  const vistaMat=new B.StandardMaterial("sunlit textured Appalachian bluff",scene);
  vistaMat.diffuseTexture=vista;
  vistaMat.useAlphaFromDiffuseTexture=true;
  vistaMat.disableLighting=true;
  vistaMat.emissiveColor=new B.Color3(1,1,1);
  vistaMat.backFaceCulling=false;
  vistaMat.disableDepthWrite=true;
  vistaMat.specularColor=new B.Color3(0,0,0);
  // Horizon-scale mountain occupies the opening beyond the village roofs.
  // Use the same apparent angular scale at a nearer depth, so the real distant
  // forest no longer occludes it. The sky and bottom edges remain transparent.
  const vistaWall=B.MeshBuilder.CreatePlane("VISIBLE mountain and cliff behind village",
    // A near horizon-scale backdrop, with rock skyline clearly above the
    // 10m Ranger Station roof when seen from the south-side spawn.
    {width:500,height:230,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  vistaWall.material=vistaMat;
  vistaWall.applyFog=false;
  vistaWall.isPickable=false;
  vistaWall.renderingGroupId=0;
  // Solid, non-pickable Appalachian cliff geometry. The transparent
  // panorama alone can be buried beneath streamed ridges/forest in WebGL;
  // this textured mesh sits past the three cabins but in front of the
  // far-tree LODs. Its irregular top edge is actual 3D geometry, not a
  // rectangle pasted over the sky or any walkable village content.
  const cliffTexture=new B.DynamicTexture("sunlit WV sedimentary cliff stone",
    {width:1024,height:512},scene,false,B.Texture.BILINEAR_SAMPLINGMODE);
  const rc=cliffTexture.getContext();
  rc.fillStyle="#aca99a";rc.fillRect(0,0,1024,512);
  for(let i=0;i<24;i++){
    const yy=i*23-12;
    rc.fillStyle=["#b7ae98","#8b9487","#a9aa93","#798b7e","#c0baa7"][i%5];
    rc.fillRect(0,yy,1024,18+hash(i,72)*9);
    rc.fillStyle="#515c53a9";rc.fillRect(0,yy+19,1024,2.2);
    rc.fillStyle="#e0d7c0a1";rc.fillRect(0,yy+1,1024,2);
  }
  for(let i=0;i<850;i++){
    const x=hash(i,80)*1024,y=hash(i,81)*512;
    const len=8+hash(i,82)*63;
    rc.strokeStyle=i%4===0?"#e4d9bd9a":i%3===0?"#4b5c5594":"#68726780";
    rc.lineWidth=.7+hash(i,83)*4;
    rc.beginPath();rc.moveTo(x,y);
    rc.lineTo(x+len*(hash(i,84)-.27),y+hash(i,85)*12-6);
    rc.stroke();
  }
  for(let i=0;i<110;i++){
    const x=hash(i,90)*1024, y=hash(i,91)*512;
    rc.strokeStyle="#40574c9b";rc.lineWidth=1.5+hash(i,92)*5;
    rc.beginPath();rc.moveTo(x,y);
    rc.lineTo(x-8+hash(i,93)*16,y+22+hash(i,94)*90);
    rc.stroke();
  }
  cliffTexture.update(false);
  cliffTexture.wrapU=B.Texture.WRAP_ADDRESSMODE;
  cliffTexture.wrapV=B.Texture.WRAP_ADDRESSMODE;
  const cliffMaterial=new B.StandardMaterial("real sunlit 3D Appalachian sandstone escarpment",scene);
  cliffMaterial.diffuseTexture=cliffTexture;
  cliffMaterial.diffuseColor=new B.Color3(.98,.96,.91);
  cliffMaterial.emissiveColor=new B.Color3(.24,.26,.22);
  cliffMaterial.backFaceCulling=false;
  cliffMaterial.specularColor=new B.Color3(.06,.055,.05);
  const solidCliff=new B.Mesh("SOLID_VISIBLE_ROCK_MOUNTAIN_BEHIND_RANGER",scene);
  const p=[],uv=[],indices=[],colors=[],N=120;
  for(let i=0;i<=N;i++){
    const x=-100+i*300/N;
    const mound=Math.exp(-Math.pow((x-55)/91,2));
    const taper=Math.min(1,Math.max(0,(x+100)/48),
      Math.max(0,(200-x)/55));
    const top=(31+58*mound+7*Math.sin(x*.043)+3.2*Math.sin(x*.16))*taper;
    const bottom=-62+4*Math.sin(x*.031);
    for(let j=0;j<3;j++){
      const y=j===0?top:j===1?bottom*.15+top*.27:bottom;
      p.push(x,y,j===1?-2.0*Math.sin(x*.033):0);
      uv.push(i/N*3.5,j*.85);
      const shade=j===0?1:j===1?.76:.63;
      colors.push(shade,shade*.99,shade*.92,1);
    }
    if(i>0)for(let j=0;j<2;j++){
      const a=(i-1)*3+j,b=i*3+j;
      indices.push(a,b,a+1,b,b+1,a+1);
    }
  }
  const cliffData=new B.VertexData();
  cliffData.positions=p;cliffData.indices=indices;cliffData.uvs=uv;
  cliffData.colors=colors;
  const norms=[];B.VertexData.ComputeNormals(p,indices,norms);
  cliffData.normals=norms;cliffData.applyToMesh(solidCliff);
  solidCliff.material=cliffMaterial;solidCliff.isPickable=false;
  solidCliff.applyFog=false;solidCliff.renderingGroupId=0;

  // Anchor both mountain layers in the WORLD behind the Ranger Station.
  // The old camera-following offset put them behind a nearer terrain ridge
  // and made the approved mountain disappear from the portrait start view.
  // The backs of the buildings are at Z ~119; the view plane is well behind.
  vistaWall.position.set(villageX,villageGroundY+13,villageBackZ);
  solidCliff.position.set(villageX+5,villageGroundY-27,villageBackZ+5);
  vistaWall.checkCollisions=false;
  solidCliff.checkCollisions=false;
  // The painted distant woods blend into genuine 3D stone. Fade the two
  // non-collidable skyline layers before walking through their world location.
  const obs=scene.onBeforeRenderObservable.add(()=>{
    dome.position.copyFrom(camera.position);
    const remaining=villageBackZ-camera.position.z;
    const amount=Math.max(0,Math.min(1,(remaining-8)/44));
    vistaWall.visibility=amount;
    solidCliff.visibility=amount;
  });
  dome.position.copyFrom(camera.position);
  return {dome,vistaWall,solidCliff,dispose(){
    scene.onBeforeRenderObservable.remove(obs);
    solidCliff.dispose();cliffMaterial.dispose();cliffTexture.dispose();
    vistaWall.dispose();vistaMat.dispose();vista.dispose();
    dome.dispose();mat.dispose();texture.dispose();
  }};
}
