/**
 * The Wild — 360 Ranger Station reference furnishings (October 2026).
 * These are walkable 3D props and low-cost photo-style canvas labels, NOT
 * pasted screenshots or a separate 360-room backdrop. Preserve the 18x12 m
 * lodge, south entrance, L workstation, and north-east ranger chair.
 */
export function installRangerReferenceInterior(B,scene,track,c){
  const {X,Z,front,back,floor,deskY,frontDeskX,frontDeskZ,
    box,cylinder,makeMat,wood,timber,dark,brass,doorMat,paper}=c;
  const olive=makeMat("olive canvas gear","#536249");
  const leather=makeMat("worn brown leather","#5e3b29");
  const black=makeMat("file cabinet dark olive","#293830");
  const iron=makeMat("field equipment metal","#777c73");
  const faded=makeMat("map frame ivory","#dbca9b");
  const bookColors=["#566247","#826246","#32494d","#79634e","#5e5147",
    "#9b8059","#53645a","#674e42"].map((h,i)=>makeMat("field guide binding "+i,h));
  const pixel=(name,w,h,x,y,z,draw,{yaw=0,px=768,py=512}={})=>{
    const dt=track(new B.DynamicTexture("Ranger photo reference "+name,
      {width:px,height:py},scene,false));
    const ctx=dt.getContext();draw(ctx,px,py);dt.update();
    decorateWith360Photo(dt,name,px,py);
    const m=track(new B.StandardMaterial("Ranger photo print "+name,scene));
    m.diffuseTexture=dt;
    m.emissiveColor=new B.Color3(.105,.086,.058);
    m.specularColor=new B.Color3(.10,.10,.09);
    m.backFaceCulling=false;
    const plane=track(B.MeshBuilder.CreatePlane("RANGER REFERENCE "+name,
      {width:w,height:h},scene));
    plane.position.set(x,y,z);plane.rotation.y=yaw;
    plane.material=m;plane.isPickable=false;plane.checkCollisions=false;
    return plane;
  };
  // Reuse the actual approved WVLRP 360 panorama as photographic print
  // sources.  These are mounted on real wall meshes in the walkable game,
  // NOT a skybox or a screenshot pretending to be a navigable room.
  const ranger360PhotoTargets=[];
  let ranger360PhotoReady=false;
  const ranger360Photo=new Image();
  ranger360Photo.decoding="async";
  ranger360Photo.onload=()=>{
    ranger360PhotoReady=true;
    for(const {texture,u,v,du,dv,px,py} of ranger360PhotoTargets){
      const g=texture.getContext(),iw=ranger360Photo.naturalWidth,
        ih=ranger360Photo.naturalHeight;
      const sx=Math.max(0,Math.floor((u-du/2)*iw));
      const sy=Math.max(0,Math.floor((v-dv/2)*ih));
      const sw=Math.min(iw-sx,Math.round(iw*du));
      const sh=Math.min(ih-sy,Math.round(ih*dv));
      if(sw<=0||sh<=0)continue;
      g.drawImage(ranger360Photo,sx,sy,sw,sh,0,0,px,py);
      texture.update();
    }
  };
  ranger360Photo.onerror=()=>{}; // retain drawn fallback if image is unavailable
  ranger360Photo.src=new URL("../assets/ranger-station-v1.webp",import.meta.url).href;
  function decorateWith360Photo(texture,name,px,py){
    // Object positions are those used in the original ranger-station.js
    // photo hotspot map; never swap in a generic AI-generated graphic.
    const regions={
      "large readable West Virginia topographic field map":
        {u:.156,v:.39,du:.155,dv:.29},
      "public information board with pinned woodland photographs":
        {u:.27,v:.40,du:.17,dv:.29}
    };
    if(!regions[name])return;
    const target={texture,...regions[name],px,py};
    ranger360PhotoTargets.push(target);
    if(ranger360PhotoReady){
      const g=texture.getContext(),iw=ranger360Photo.naturalWidth,ih=ranger360Photo.naturalHeight;
      const sx=Math.max(0,Math.floor((target.u-target.du/2)*iw));
      const sy=Math.max(0,Math.floor((target.v-target.dv/2)*ih));
      g.drawImage(ranger360Photo,sx,sy,iw*target.du,ih*target.dv,0,0,px,py);
      texture.update();
    }
  }
  function paperCard(g,x,y,w,h,rotation,title,lines=3){
    g.save();g.translate(x+w/2,y+h/2);g.rotate(rotation);
    g.fillStyle="#eee7d6";g.shadowColor="#0005";g.shadowBlur=7;
    g.fillRect(-w/2,-h/2,w,h);g.shadowBlur=0;
    g.fillStyle="#707d73";g.fillRect(-w/2+10,-h/2+10,w-20,5);
    g.fillStyle="#514b3d";g.font="bold 15px Georgia";g.fillText(title,-w/2+11,-h/2+36,w-22);
    g.fillStyle="#9b9587";
    for(let j=0;j<lines;j++)g.fillRect(-w/2+11,-h/2+49+j*15,w-35-(j%3)*17,3);
    g.fillStyle="#874e39";g.beginPath();g.arc(0,-h/2+5,5,0,Math.PI*2);g.fill();
    g.restore();
  }
  function mountainPhoto(g,x,y,w,h,variant=0){
    g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    const sky=g.createLinearGradient(0,y,0,y+h);
    sky.addColorStop(0,"#b3d6e7");sky.addColorStop(.6,"#f1e6c5");
    sky.addColorStop(1,"#738b72");g.fillStyle=sky;g.fillRect(x,y,w,h);
    for(let depth=0;depth<4;depth++){
      g.beginPath();
      for(let i=0;i<=24;i++){
        const xx=x+w*i/24;
        const yy=y+h*(.37+depth*.115)+
          (Math.sin(i*.59+variant+depth)*.10+Math.sin(i*.28+depth)*.08)*h;
        if(i===0)g.moveTo(xx,yy);else g.lineTo(xx,yy);
      }
      g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.closePath();
      g.fillStyle=["#98a9a2","#6f8e81","#4d6d5a","#394e38"][depth];g.fill();
    }
    g.strokeStyle="#d4d8c9";g.lineWidth=Math.max(4,w*.035);
    g.beginPath();g.moveTo(x+w*.62,y+h);g.bezierCurveTo(x+w*.24,y+h*.82,x+w*.83,y+h*.6,x+w*.46,y+h*.53);g.stroke();
    g.restore();
  }
  // The reference's actual wall map and crowded "Our Forests" notices:
  // both hang on the WEST interior wall above the explorer's rough bench.
  const westX=X-8.82;
  const mapZ=Z-2.28,boardZ=Z+2.05,wallY=floor+2.49;
  box("framed WEST VIRGINIA map walnut surround",
    .13,2.70,3.42,westX-.005,wallY,mapZ,timber);
  box("framed WV map cream inset",.145,2.47,3.17,
    westX+.044,wallY,mapZ,faded);
  pixel("large readable West Virginia topographic field map",
    3.02,2.35,westX+.13,wallY,mapZ,(g,w,h)=>{
      g.fillStyle="#e9e2d0";g.fillRect(0,0,w,h);
      g.strokeStyle="#aa9b7b";g.lineWidth=8;g.strokeRect(13,12,w-26,h-24);
      g.fillStyle="#4c5242";g.textAlign="center";
      g.font="bold 36px Georgia";g.fillText("WEST VIRGINIA",w/2,65);
      // State silhouette, shaded hill country, terrain marks and water.
      g.save();g.translate(78,85);
      const pts=[[190,52],[231,10],[261,41],[297,50],[329,7],
        [347,39],[383,47],[387,102],[445,130],[468,166],[521,174],
        [568,235],[636,253],[604,295],[568,298],[547,358],
        [494,338],[464,383],[405,346],[374,391],[339,367],
        [286,419],[231,414],[198,374],[165,398],[133,357],
        [101,375],[84,326],[55,280],[76,239],[31,205],
        [72,172],[86,131],[136,124],[161,93]];
      g.beginPath();pts.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));g.closePath();
      g.fillStyle="#acbfa6";g.fill();g.strokeStyle="#628168";g.lineWidth=5;g.stroke();
      g.clip();g.strokeStyle="#74947c";g.lineWidth=1.5;
      for(let i=-200;i<900;i+=24){
        g.beginPath();for(let x=0;x<=700;x+=14){
          const y=i+x*.46+14*Math.sin(x*.033+i*.05);
          x?g.lineTo(x,y):g.moveTo(x,y);
        }g.stroke();
      }
      g.strokeStyle="#b9cec4";g.lineWidth=7;
      g.beginPath();g.moveTo(60,190);g.bezierCurveTo(210,170,180,360,344,245);
      g.bezierCurveTo(430,181,490,350,620,286);g.stroke();g.restore();
      g.font="14px Georgia";g.fillStyle="#655e4e";
      g.fillText("STATE PARKS  •  TRAILS  •  RIVERS",w/2,h-18);
    },{yaw:Math.PI/2,px:768,py:512});
  box("large cork bulletin board walnut frame",
    .14,2.89,3.70,westX-.01,wallY,boardZ,timber);
  pixel("public information board with pinned woodland photographs",
    3.45,2.63,westX+.13,wallY,boardZ,(g,w,h)=>{
      g.fillStyle="#ae8a5d";g.fillRect(0,0,w,h);
      g.fillStyle="#ceb28a";g.fillRect(10,10,w-20,h-20);
      paperCard(g,42,43,194,204,-.035,"PARK BULLETIN",6);
      g.fillStyle="#f2edda";g.fillRect(278,35,217,221);
      g.fillStyle="#375342";g.font="bold 28px sans-serif";g.textAlign="center";
      for(const [i,t] of ["OUR FORESTS","OUR WATER","OUR WILDLIFE","OUR HOME"].entries())
        g.fillText(t,386,79+i*42);
      for(let i=0;i<5;i++){
        const x=38+i%3*237,y=294+Math.floor(i/3)*120;
        mountainPhoto(g,x,y,195,100,i);
      }
      paperCard(g,514,48,207,205,.05,"TRAIL UPDATE",6);
      paperCard(g,518,302,198,148,-.06,"RANGER REPORT",4);
    },{yaw:Math.PI/2,px:768,py:512});
  // Rough visitor equipment bench beneath the reference map and board.
  box("hand sawn explorer gear bench top",1.03,.11,5.65,
    X-7.40,floor+.82,Z-.12,wood);
  for(const zz of [-2.55,2.32]){
    box("hand sawn bench support leg "+zz,.16,.81,.19,
      X-7.40,floor+.41,Z+zz,timber);
  }
  box("dark hardwood storage trunk beneath bench",.86,.60,1.45,
    X-7.36,floor+.31,Z-.9,leather);
  for(const dz of [-.52,.52]){
    box("iron trunk strap "+dz,.92,.045,.065,
      X-7.36,floor+.39,Z-.9+dz,dark);
  }
  box("olive forest ranger backpack bag",.78,.96,.38,
    X-7.43,floor+1.32,Z-1.95,olive);
  // Break the square box silhouette with curved stuffed canvas and
  // leather-worn straps like the rucksack in the photographed station.
  const pack=track(B.MeshBuilder.CreateSphere(
    "RANGER REFERENCE canvas backpack rounded outer pack",
    {diameter:1,segments:12},scene));
  pack.scaling.set(.73,.83,.38);
  pack.position.set(X-7.43,floor+1.33,Z-1.95);
  pack.material=olive;pack.isPickable=false;
  box("backpack upper flap",.84,.26,.42,
    X-7.43,floor+1.70,Z-1.95,leather);
  for(const side of [-1,1]){
    box("old backpack worn leather vertical strap "+side,
      .08,.84,.068,X-7.43,floor+1.32,Z-1.95+side*.235,leather);
    box("old backpack canvas side pocket "+side,
      .20,.31,.21,X-7.43,floor+1.12,Z-1.95+side*.31,olive);
  }
  for(const side of [-1,1])
    box("backpack worn leather buckle "+side,.06,.17,.08,
      X-7.43,floor+1.47,Z-1.95+side*.22,brass);
  for(const dx of [-.15,.15])
    cylinder("metal field binocular barrel "+dx,.13,.26,
      X-7.18+dx,floor+1.04,Z-.95,black,"z");
  cylinder("metal water flask on visitor bench",.12,.45,
    X-7.40,floor+1.105,Z+1.56,iron);
  cylinder("water flask black stopper",.07,.09,
    X-7.40,floor+1.37,Z+1.56,dark);
  // Ranger's fitted bookcase beside the workstation: shelves, uneven book
  // spines, small plants, not a flat bookshelf graphic.
  const shelfX=X+2.95,shelfZ=back-.60,shelfY=floor+1.47;
  for(const side of [-1,1])
    box("tall field guide bookcase stile "+side,.14,2.90,.67,
      shelfX+side*.62,shelfY,shelfZ,timber);
  for(let i=0;i<5;i++){
    const y=floor+.11+i*.68;
    box("solid aged pine reference bookshelf "+i,1.45,.11,.72,
      shelfX,y,shelfZ,wood);
    if(i<4)for(let n=0;n<6;n++){
      const x=shelfX-.49+n*.184;
      const ht=.34+((n+i)%3)*.082;
      box("individual worn ranger field guide "+i+" "+n,
        .145,ht,.38,x,y+.08+ht/2,shelfZ,
        bookColors[(n+i*3)%bookColors.length]);
    }
  }
  // Old filing cabinet, ranger hat and oil lamp — same visual anchors as 360.
  // In the actual 360 office the filing cabinet and hat are to the
  // RIGHT of the brown leather chair, not across the room by the shelves.
  const fileX=X+8.06,fileZ=back-.64;
  box("four-drawer military olive filing cabinet",.84,2.05,.79,
    fileX,floor+1.04,fileZ,black);
  for(let i=0;i<4;i++){
    box("filing cabinet inset drawer "+i,.69,.34,.015,
      fileX,floor+.32+i*.46,fileZ-.414,olive);
    box("filing drawer brass label plate "+i,.20,.07,.024,
      fileX,floor+.34+i*.46,fileZ-.43,brass);
  }
  cylinder("working station oil lamp glass",.22,.42,
    fileX,floor+2.29,fileZ,paper);
  cylinder("working station oil lamp cap",.28,.08,
    fileX,floor+2.54,fileZ,dark);
  const hookX=X+7.98;
  box("ranger hat wall hook rail",1.24,.13,.16,
    hookX,floor+2.22,back-.29,timber);
  cylinder("weathered tan ranger hat crown",.34,.20,
    hookX,floor+2.48,back-.56,leather);
  cylinder("weathered ranger hat wide brim",.70,.055,
    hookX,floor+2.34,back-.56,bookColors[5]);
  // Weathered coat hanging loosely, never through the ranger's chair.
  box("hung green ranger jacket",.73,1.25,.18,
    X+8.45,floor+1.47,back-.35,olive);
  // Single six-feed desk monitor, not six unrelated screens nailed to a wall.
  // Front (visitor-facing) panel sits ON the 76cm-high L desk.
  const mx=frontDeskX-.03,mz=frontDeskZ-.27;
  box("reference six feed monitor LCD enclosure",1.36,.83,.105,
    mx,deskY+.65,mz,dark);
  box("reference desk monitor slender pedestal",.085,.34,.12,
    mx,deskY+.17,mz+.08,black);
  box("reference desk monitor weighted foot",.58,.043,.34,
    mx,deskY+.05,mz+.15,dark);
  pixel("single six-camera monitor showing live and offline slots",
    1.23,.70,mx,deskY+.65,mz-.065,(g,w,h)=>{
      g.fillStyle="#081518";g.fillRect(0,0,w,h);
      for(let k=0;k<6;k++){
        const x=8+(k%3)*249,y=9+Math.floor(k/3)*245;
        g.fillStyle="#0e2427";g.fillRect(x,y,241,236);
        if(k<2)mountainPhoto(g,x+6,y+7,229,147,k);
        else{g.fillStyle="#13252a";g.fillRect(x+6,y+7,229,147);
          g.font="bold 21px sans-serif";g.fillStyle="#93b6b7";g.textAlign="center";
          g.fillText("NO SIGNAL",x+120,y+88);}
        g.fillStyle="#d7f1ec";g.font="bold 18px sans-serif";g.textAlign="center";
        g.fillText(["EAST BANK","THE ROOST","WEST BANK",
          "SOUTH HILL","INFRARED","CAMERA 6"][k],x+120,y+194);
      }
    },{yaw:Math.PI,px:768,py:512});
  // Real field-desk items: blotter, paper labels, a map and compass.
  box("olive leather desk blotter",1.34,.017,.70,
    frontDeskX-.05,deskY+.081,frontDeskZ+.15,olive);
  for(let i=0;i<3;i++)
    box("field note header white band "+i,.36,.003,.008,
      frontDeskX-1.35+i*.41,deskY+.185,frontDeskZ-.18,black);
  cylinder("brass field compass case",.16,.035,
    frontDeskX+1.28,deskY+.10,frontDeskZ+.17,brass);
  // Two framed photo prints on rear wall in the public visitor area.
  for(const [i,xx] of [-4.85,-2.35].entries()){
    const y=floor+2.62;
    box("framed Appalachian landscape print "+i,
      2.06,1.36,.12,X+xx,y,back-.40,timber);
    pixel("framed Appalachian mountains "+i,
      1.86,1.16,X+xx,y,back-.47,(g,w,h)=>{
        g.fillStyle="#f0ebd6";g.fillRect(0,0,w,h);
        mountainPhoto(g,19,18,w-38,h-38,i+2);
      },{yaw:Math.PI,px:512,py:384});
  }
  // The 360 room has a real green canvas ranger guest chair below the
  // photo noticeboard. Restore a 3D, move-around-able chair, not a flat prop.
  const greenCanvas=makeMat("aged forest-green chair fabric","#4b5d45");
  const woodChair=makeMat("dark worn chair hardwood","#6a462d");
  const chairCenterX=X-5.55,chairCenterZ=Z+2.75,chairBaseY=floor;
  for(const side of [-1,1]){
    const x=chairCenterX+side*.35;
    for(const depth of [-.28,.28]){
      const upright=cylinder("reference canvas chair hardwood leg "+side+"/"+depth,
        .085,1.18,x,chairBaseY+.59,chairCenterZ+depth,woodChair);
      upright.rotation.x=depth>.0?-.14:.08;
    }
    box("reference canvas visitor chair wooden arm "+side,.105,.085,.77,
      x,chairBaseY+.80,chairCenterZ-.02,woodChair);
    cylinder("reference director chair underseat pivot "+side,.062,.87,
      x,chairBaseY+.51,chairCenterZ,woodChair,"z");
  }
  const canvasSeat=track(B.MeshBuilder.CreateSphere("RANGER REFERENCE curved green canvas visitor seat",
    {diameter:1,segments:16},scene));
  canvasSeat.scaling.set(.78,.055,.67);
  canvasSeat.position.set(chairCenterX,chairBaseY+.59,chairCenterZ-.01);
  canvasSeat.material=greenCanvas;canvasSeat.isPickable=false;
  const canvasBack=box("reference chair olive canvas slung back panel",
    .74,.64,.043,chairCenterX,chairBaseY+1.09,chairCenterZ+.30,greenCanvas);
  canvasBack.rotation.x=.10;
  for(const side of [-1,1]){
    cylinder("folding camp chair backrest rail "+side,.047,.80,
      chairCenterX+side*.36,chairBaseY+1.09,chairCenterZ+.30,woodChair);
  }
  // Vintage shaded DESK lamp, the largest warm-light landmark in the
  // photograph. Sized to the desktop, with a flared fabric shade.
  const lampX=frontDeskX-1.01,lampZ=frontDeskZ+.28;
  cylinder("patinated brass desk lamp weighted foot",.31,.045,
    lampX,deskY+.10,lampZ,brass);
  cylinder("tall brass desk lamp turned stem",.063,.57,
    lampX,deskY+.42,lampZ,brass);
  cylinder("desk lamp shade rim",.66,.033,
    lampX,deskY+.63,lampZ,brass);
  const warmShade=makeMat("linen cream lamp shade","#e5cb98",{emission:"#302519"});
  const shade=track(B.MeshBuilder.CreateCylinder("RANGER REFERENCE flared linen desk lamp shade",
    {height:.49,diameterTop:.31,diameterBottom:.82,tessellation:32},scene));
  shade.position.set(lampX,deskY+.88,lampZ);
  shade.material=warmShade;shade.isPickable=false;shade.checkCollisions=false;
  cylinder("desk lamp turned brass finial",.072,.09,
    lampX,deskY+1.18,lampZ,brass);
  const lampGlow=track(new B.PointLight("RANGER REFERENCE warm desk lamp practical",
    new B.Vector3(lampX,deskY+.71,lampZ),scene));
  lampGlow.diffuse=new B.Color3(1,.70,.36);
  lampGlow.intensity=.30;lampGlow.range=4.4;
  // Woven Appalachian rug: a single detailed, photoreal-ish textile surface,
  // not a giant coloured polygon or a pile of overlapping meshes.
  const rugTex=track(new B.DynamicTexture("Ranger station braided oval rug woven strands",
    {width:1024,height:512},scene,false));
  const rg=rugTex.getContext();
  rg.clearRect(0,0,1024,512);
  rg.save();rg.translate(512,256);
  const rings=["#a48b64","#403c2c","#846043","#a9a183","#364439",
    "#9b5940","#c0a37d","#5e6245","#baa486","#6a503a"];
  for(let j=0;j<=9;j++){
    rg.beginPath();rg.ellipse(0,0,490-j*41,243-j*18,0,0,Math.PI*2);
    rg.fillStyle=rings[j];rg.fill();
    rg.lineWidth=6;rg.strokeStyle="#2d2c26";rg.stroke();
  }
  rg.restore();
  // Thread flecks stay inside the oval instead of making a square floor mat.
  rg.save();rg.beginPath();rg.ellipse(512,256,490,243,0,0,Math.PI*2);rg.clip();
  for(let i=0;i<3600;i++){
    const tx=(i*197.33)%1024,ty=(i*83.71)%512;
    rg.fillStyle=i%4===0?"#dbc8a060":"#242e273d";
    rg.fillRect(tx,ty,1.8,1.2);
  }
  rg.restore();
  rugTex.hasAlpha=true;rugTex.update();
  const rugMat=track(new B.StandardMaterial("Ranger faded woven wool rug",scene));
  rugMat.diffuseTexture=rugTex;rugMat.useAlphaFromDiffuseTexture=true;
  rugMat.specularColor=new B.Color3(.02,.02,.02);
  rugMat.backFaceCulling=false;
  const rug=track(B.MeshBuilder.CreateGround("RANGER REFERENCE actual rug under entry desk",
    {width:4.9,height:2.65},scene));
  rug.position.set(X+2.6,floor+.013,Z+1.30);
  rug.material=rugMat;rug.isPickable=false;rug.checkCollisions=false;
  // The real office also has a framed glass-top map board and natural
  // field clutter. Give the old storage chest proper metal corners and hasps.
  for(const side of [-1,1]){
    const atZ=Z-.9+side*.67;
    box("iron-reinforced visitor equipment chest edge "+side,.092,.61,.045,
      X-7.36,floor+.31,atZ,dark);
    box("weathered brass chest corner hinge "+side,.09,.085,.09,
      X-7.36,floor+.56,atZ,brass);
  }
  return true;
}
