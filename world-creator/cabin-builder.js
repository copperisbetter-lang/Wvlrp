/**
 * The Wild: Hearthside Cabin. Lightweight one-room rustic retreat.
 * Everything here is a native Babylon scene mesh for editable prototype use.
 * No external image textures, no grass spheres, no fake built-in NPC models.
 */
export function buildHearthsideCabin(B, scene, track, cx, groundY, cz, showRoof=false) {
  const roofMeshes=[];
  const palette={
    log:"#664632",end:"#aa7850",floor:"#79543a",trim:"#ad8760",
    roof:"#343c39",iron:"#292e2b",stone:"#817d75",mortar:"#55534e",
    glass:"#8bb4b7",cream:"#d9be8f",quilt:"#8c453a",warm:"#efb55a",
    fire:"#ec7130",soil:"#4b4036",leather:"#7b3f2c",plant:"#61734b"
  };
  const mats={};
  for(const [key,hex] of Object.entries(palette)){
    const m=track(new B.StandardMaterial("Hearthside "+key,scene));
    m.diffuseColor=B.Color3.FromHexString(hex);m.specularColor=new B.Color3(.04,.035,.025);
    if(key==="glass")m.alpha=.58;
    if(key==="warm"||key==="fire")m.emissiveColor=m.diffuseColor.scale(key==="fire"?.75:.35);
    mats[key]=m;
  }
  const base=groundY+.28;
  const box=(name,w,h,d,x,y,z,mat,roof=false)=>{
    const m=track(B.MeshBuilder.CreateBox("Hearthside "+name,{width:w,height:h,depth:d},scene));
    m.position.set(cx+x,base+y,cz+z);m.material=mats[mat];if(roof)roofMeshes.push(m);return m;
  };
  const cyl=(name,dia,h,x,y,z,mat,roof=false)=>{
    const m=track(B.MeshBuilder.CreateCylinder("Hearthside "+name,{diameter:dia,height:h,tessellation:9},scene));
    m.position.set(cx+x,base+y,cz+z);m.material=mats[mat];if(roof)roofMeshes.push(m);return m;
  };
  // Foundation and actual one-room wooden floor, built above the grade.
  box("fieldstone foundation",19,.55,15,0,-.31,0,"stone");
  box("dark subfloor",18,.20,14,0,-.06,0,"iron");
  for(let i=0;i<36;i++)box("walnut floor plank "+i,18/36-.024,.095,13.65,
    -8.75+(i+.5)*.5,.03,0,i%5===0?"trim":"floor");
  // Horizontal log walls: segmented front has an actual walk-through opening.
  const logH=.34,levels=12;
  for(let level=0;level<levels;level++){
    const y=.22+level*logH,log=(level%3===0?"trim":"log");
    for(const side of [-1,1]){
      // Side-wall windows are real openings, not glass pasted on solid logs.
      if(y>=1.3&&y<=3.16){
        for(const seg of [{z:-5.5,l:3.0},{z:-.25,l:3.3},{z:5.35,l:3.3}])
          box("window-jamb side log "+side+" "+level+" "+seg.z,.43,logH-.028,seg.l,
            side*8.85,y,seg.z,log);
      }else{
        box("side log "+side+" "+level,.43,logH-.028,14.3,side*8.85,y,0,log);
      }
      box("rear log "+side+" "+level,9.1,logH-.028,.46,side*4.4,y,-6.85,log);
      // Entry faces out to the porch (+Z). Door has a real 2m wide gap.
      if(y>2.95)box("front upper "+side+" "+level,8.88,logH-.028,.46,side*4.4,y,6.85,log);
      else box("front open doorway side "+side+" "+level,7.5,logH-.028,.46,
        side*5.13,y,6.85,log);
    }
  }
  for(const xx of [-8.8,8.8])for(const zz of [-6.85,6.85])
    cyl("corner timber "+xx+" "+zz,.63,4.5,xx,2.25,zz,"end");
  // Structural window frames. Glass sits outward of the logs for readability.
  for(const zz of [-2.9,2.6])for(const side of [-1,1]){
    const xx=side*8.99;
    box("window glass "+xx+" "+zz,.07,1.7,2.2,xx,2.22,zz,"glass");
    for(const off of [-1.12,1.12])box("window casing vertical",.17,1.98,.17,xx,2.22,zz+off,"trim");
    for(const yy of [1.26,3.2])box("window casing rail",.17,.16,2.4,xx,yy,zz,"trim");
    box("window sash",.12,.12,2.25,xx,2.22,zz,"trim");
  }
  // Open solid-timber front door swung inward, with forged black handle.
  const door=box("front door swung open",1.85,2.82,.17,1.82,1.47,5.92,"trim");
  door.rotation.y=-1.18;
  box("front door pull",.12,.34,.13,2.08,1.43,6.14,"iron");
  // High gable roof: hide roof halves to expose the entire interior.
  for(const side of [-1,1]){
    const roof=box("cedar roof slope "+side,10.3,.28,16.2,side*4.3,5.45,0,"roof",true);
    roof.rotation.z=-side*.43;
    for(let i=0;i<5;i++){
      const z=-6.1+i*3.05;
      const rafter=box("roof beam "+side+" "+i,10.3,.22,.19,side*4.3,5.13,z,"trim",true);
      rafter.rotation.z=-side*.43;
    }
  }
  box("ridge cap",.9,.42,16.5,0,7.24,0,"roof",true);
  // Wide covered front porch and steps, still present in cutaway view.
  box("front porch",19,.25,3.4,0,-.05,8.5,"trim");
  box("front stair lower",4.1,.18,1.35,0,-.38,11.1,"stone");
  box("front stair upper",3.4,.20,1.3,0,-.16,10.05,"stone");
  for(const xx of [-8.15,8.15]){
    cyl("porch post",.4,3.1,xx,1.55,9.4,"trim");
    box("porch lantern support",.65,.2,.65,xx,2.85,9.4,"iron");
  }
  // Stone fireplace with a real dark opening, raised hearth and warm glow.
  box("fireplace hearth",4.2,.35,2.15,-6.0,.2,-5.35,"stone");
  box("fireplace back",3.65,3.3,.6,-6.0,1.75,-6.55,"stone");
  for(const xx of [-7.85,-4.15])box("fireplace jamb",.8,2.7,1.2,xx,1.53,-5.75,"stone");
  box("fireplace lintel",4.45,.56,1.45,-6.0,3.05,-5.75,"stone");
  box("black firebox",2.82,1.75,.12,-6.0,1.32,-6.18,"iron");
  for(const dx of [-.35,.4]){
    const flame=cyl("fire ember "+dx,.55,.45,-6+dx,.55,-5.44,"fire");
    flame.rotation.z=dx<0?.35:-.2;
  }
  box("chimney stack",2.75,3.8,2.25,-6.0,6.5,-6.15,"stone",true);
  // Furniture: table and books to one end, leaving clear people spaces.
  box("large pine table top",4.4,.18,2.3,0,.87,-4.2,"trim");
  for(const xx of [-1.85,1.85])for(const zz of [-5.08,-3.32])
    box("table leg",.24,.84,.24,xx,.44,zz,"log");
  for(const xx of [-3.1,3.1]){
    box("stool seat",.9,.14,.9,xx,.46,-4.1,"trim");
    for(const zz of [-.30,.30])box("stool leg",.16,.42,.16,xx,.2,-4.1+zz,"log");
  }
  box("cozy sofa base",3.3,.4,1.25,5.55,.45,-4.55,"leather");
  box("sofa back",3.3,1.1,.26,5.55,1.1,-5.08,"leather");
  for(const xx of [4.65,6.4])box("quilted sofa pillow",.95,.18,.8,xx,.75,-4.45,"quilt");
  box("wall bookshelves",.42,3.1,3.2,-8.15,1.8,2.6,"trim");
  for(const yy of [.7,1.42,2.12,2.86])box("shelf board",.74,.13,3.5,-8.08,yy,2.6,"trim");
  for(let n=0;n<8;n++)box("book "+n,.16,.39,.24,-7.68,1.0,1.1+n*.37,n%2?"leather":"quilt");
  // Soft woven rug, wooden bed tucked into one corner, lantern-style lights.
  const rug=cyl("woven round rug",4.2,.055,0,.115,-.15,"quilt");
  rug.scaling.z=.65;
  box("bed platform",3.1,.42,4.1,6.25,.42,2.65,"log");
  box("cream mattress",2.88,.35,3.85,6.25,.83,2.65,"cream");
  box("cozy patchwork blanket",2.78,.11,2.5,6.25,1.04,3.25,"quilt");
  box("bed pillow",2.0,.18,.65,6.25,1.07,1.20,"cream");
  for(const xx of [-7.4,7.4]){
    const light=new B.PointLight("Hearthside amber lamplight "+xx,
      new B.Vector3(cx+xx,base+3.0,cz+1.0),scene);
    light.diffuse=B.Color3.FromHexString("#ffcc89");
    light.intensity=.38;light.range=8;
    track(light);
    box("wall lantern",.36,.55,.36,xx,2.86,1.0,"warm");
  }
  const fireplaceLight=new B.PointLight("Hearthside fireplace light",
    new B.Vector3(cx-6,base+1,cz-4.8),scene);
  fireplaceLight.diffuse=B.Color3.FromHexString("#ff9559");
  fireplaceLight.intensity=.65;fireplaceLight.range=7;track(fireplaceLight);
  function setRoofVisible(visible) {
    for(const m of roofMeshes)m.setEnabled(!!visible);
  }
  setRoofVisible(showRoof);
  return {setRoofVisible, roofMeshes, bounds:{halfWidth:9,halfDepth:7},floorY:base+.10};
}
