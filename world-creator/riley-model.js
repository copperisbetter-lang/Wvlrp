// Riley is a temporary adult character shape/pose prototype, not a photo-scanned
// likeness or a rigged production character. All geometry is real 3D and orbitable.
// Intentionally independent of the existing Ranger Station NPC and other people.
export function makeRiley(B,scene,track,o,x,ground,z) {
  const root=track(new B.TransformNode("Riley experimental character",scene));
  root.position.set(x,ground,z);
  const crawl=o.pose==="hands-knees";
  const mats=new Map();
  const mat=(hex,rough=.82)=>{
    if(!mats.has(hex)) {
      const m=track(new B.StandardMaterial("Riley material "+hex,scene));
      m.diffuseColor=B.Color3.FromHexString(hex);
      m.specularColor=new B.Color3(.14,.13,.12).scale(1.1-rough);
      mats.set(hex,m);
    }
    return mats.get(hex);
  };
  const skin=mat("#e7b49b"), shade=mat("#dba48c"), blush=mat("#ce8e89");
  const hair=mat("#d5a454"),hairHi=mat("#f2cf84"),hairDark=mat("#a87938");
  const top=mat("#185c68"),rib=mat("#246b72"),shorts=mat("#c5ac88");
  const seams=mat("#a88d6a"),shoe=mat("#f1f1ec"),sole=mat("#c7c7c3");
  const iris=mat("#6395a7"),eyeWhite=mat("#faf9f3"),pupil=mat("#20242a");
  const lips=mat("#ba7274"),brow=mat("#99713d");
  function ball(name,pos,radii,m,segments=18,parent=root) {
    const mesh=track(B.MeshBuilder.CreateSphere(name,{diameter:2,segments},scene));
    mesh.parent=parent;mesh.position.set(...pos);mesh.scaling.set(...radii);mesh.material=m;
    return mesh;
  }
  function smoothLink(name,a,b,r1,r2,m,seg=16) {
    const va=B.Vector3.FromArray(a),vb=B.Vector3.FromArray(b);
    const d=vb.subtract(va);
    const mid=va.add(vb).scale(.5);
    const mesh=track(B.MeshBuilder.CreateCylinder(name,{
      height:d.length(),diameterTop:r2*2,diameterBottom:r1*2,
      tessellation:seg,subdivisions:2
    },scene));
    mesh.parent=root;mesh.position.copyFrom(mid);
    mesh.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef ?
      (()=>{const q=new B.Quaternion();B.Quaternion.FromUnitVectorsToRef(B.Vector3.Up(),d.normalize(),q);return q;})() :
      B.Quaternion.RotationAxis(B.Vector3.Cross(B.Vector3.Up(),d.normalize()).normalize(),
        Math.acos(Math.min(1,Math.max(-1,B.Vector3.Dot(B.Vector3.Up(),d.normalize())))));
    mesh.material=m;return mesh;
  }
  function tube(name,pts,rad,m,tess=8) {
    const path=pts.map(v=>B.Vector3.FromArray(v));
    const mesh=track(B.MeshBuilder.CreateTube(name,{path,radius:rad,tessellation:tess,cap:B.Mesh.CAP_ALL},scene));
    mesh.parent=root;mesh.material=m;return mesh;
  }
  function bone(name,a,b,rx,rz,m) {
    const va=B.Vector3.FromArray(a),vb=B.Vector3.FromArray(b),d=vb.subtract(va);
    const mesh=ball(name,va.add(vb).scale(.5).asArray(),[rx,d.length()*.58,rz],m,20);
    // rotate local +Y to segment direction; simpler robust quaternion.
    mesh.rotationQuaternion=B.Quaternion.FromEulerAngles(0,0,0);
    const direction=d.normalize(), up=B.Vector3.Up();
    const axis=B.Vector3.Cross(up,direction);
    const angle=Math.acos(Math.max(-1,Math.min(1,B.Vector3.Dot(up,direction))));
    if(axis.lengthSquared()>1e-8)mesh.rotationQuaternion=B.Quaternion.RotationAxis(axis.normalize(),angle);
    else if(direction.y<0)mesh.rotationQuaternion=B.Quaternion.RotationAxis(B.Vector3.Right(),Math.PI);
    return mesh;
  }
  // The two poses share consistent real 3D proportions, including rear hip contours.
  const hip=crawl?[0,1.00,-.30]:[0,.98,0];
  const chest=crawl?[0,1.08,.34]:[0,1.54,0];
  const neck=crawl?[0,1.03,.70]:[0,1.79,.015];
  const faceCenter=crawl?[0,1.00,.91]:[0,1.98,.035];
  const torso=bone("waist and natural torso",hip,chest,.30,.205,skin);
  ball("hip silhouette",[hip[0],hip[1],hip[2]],[.41,.255,.285],skin,24);
  bone("teal fitted ribbed crop top",[0,(hip[1]*.45+chest[1]*.55),hip[2]*.45+chest[2]*.55],chest,.365,.255,top);
  // Chest/waist layered as clothing, not uncovered anatomy.
  if(!crawl){
    ball("crop neckline fabric",[0,1.615,.085],[.32,.18,.25],top,22);
    ball("ribbed shirt hem",[0,1.30,.005],[.305,.050,.238],rib,24);
  } else {
    ball("shirt back",[0,1.10,.38],[.32,.245,.30],top,24);
  }
  for(const side of [-1,1]){
    const q=side;
    // Back contours of the shorts remain three-dimensional during 360 inspection.
    ball("shorts rounded rear contour",[q*.195,hip[1]-.045,hip[2]-.12],[.235,.230,.230],shorts,28);
    ball("shorts side panel",[q*.203,hip[1]-.078,hip[2]+.09],[.218,.22,.230],shorts,26);
    if(crawl){
      const shoulder=[q*.365,1.07,.52],elbow=[q*.41,.60,.65],hand=[q*.415,.115,.91];
      bone("shoulder sleeve",shoulder,[q*.37,.90,.56],.135,.14,top);
      bone("Riley forearm",elbow,hand,.105,.105,skin);
      ball("elbow",elbow,[.116,.113,.119],skin);
      ball("hand",hand,[.125,.056,.158],skin);
      const knee=[q*.275,.32,-.62],ankle=[q*.28,.14,-.92],upper=[q*.22,.90,-.43];
      bone("short leg",upper,[q*.272,.73,-.48],.195,.187,shorts);
      bone("bent thigh",[q*.275,.73,-.47],knee,.17,.155,skin);
      ball("knee",knee,[.14,.13,.18],skin);
      bone("calf",knee,ankle,.115,.12,skin);
      ball("white sneaker",[q*.28,.105,-.94],[.16,.105,.235],shoe,20);
    }else{
      const upper=[q*.235,.79,.005],knee=[q*.225,.48,.015],ankle=[q*.22,.115,.022];
      bone("khaki short leg",[q*.225,.965,0],[q*.232,.77,.008],.197,.195,shorts);
      bone("bare thigh",upper,knee,.167,.160,skin);
      ball("knee",knee,[.155,.137,.16],skin);
      bone("lower leg",knee,ankle,.116,.128,skin);
      const shoePart=ball("white sneaker",[q*.218,.096,.110],[.178,.12,.292],shoe,24);
      ball("rubber sole",[q*.218,.045,.126],[.181,.043,.285],sole,20);
      const shoulder=[q*.405,1.57,0],elbow=[q*.475,1.18,.015],hand=[q*.475,.93,.055];
      ball("sleeve",shoulder,[.16,.155,.18],top);
      bone("arm",shoulder,elbow,.121,.13,skin);
      ball("elbow",elbow,[.12,.12,.12],skin);
      bone("forearm",elbow,hand,.093,.101,skin);
      ball("hand",hand,[.095,.128,.080],skin);
    }
  }
  // Fitted waistband/seam details are visible from front, profile and behind.
  const seamY=crawl?1.007:1.048;
  tube("shorts waistband",[
    [-.34,seamY,hip[2]+.02],[-.18,seamY+.03,hip[2]+.235],
    [0,seamY+.035,hip[2]+.26],[.18,seamY+.03,hip[2]+.235],
    [.34,seamY,hip[2]+.02]
  ],.018,seams,12);
  // Head can tilt relative to a horizontal torso while still looking forward.
  const hroot=track(new B.TransformNode("Riley head",scene));
  hroot.parent=root;hroot.position.set(...faceCenter);
  const head=ball("soft oval face",[0,0,0],[.258,.332,.224],skin,30,hroot);
  ball("chin",[0,-.232,.090],[.181,.116,.152],skin,20,hroot);
  for(const side of [-1,1]){
    const q=side;
    ball("cheek",[q*.14,-.095,.119],[.120,.085,.108],skin,18,hroot);
    ball("ear",[q*.255,-.05,-.025],[.053,.096,.055],shade,14,hroot);
    ball("eyeball",[q*.109,.030,.206],[.068,.045,.028],eyeWhite,20,hroot);
    ball("blue iris",[q*.105,.030,.230],[.029,.031,.011],iris,18,hroot);
    ball("pupil",[q*.105,.030,.241],[.012,.014,.007],pupil,12,hroot);
    ball("eyebrow",[q*.109,.119,.205],[.079,.014,.018],brow,16,hroot);
    ball("freckles",[q*.158,-.060,.215],[.008,.008,.007],shade,10,hroot);
  }
  ball("nose",[0,-.073,.224],[.052,.088,.066],skin,18,hroot);
  ball("natural lips",[0,-.182,.208],[.087,.026,.021],lips,16,hroot);
  ball("crown hair",[0,.226,-.025],[.287,.18,.236],hair,24,hroot);
  ball("hair rear mass",[0,.085,-.174],[.289,.324,.104],hairDark,24,hroot);
  for(let side of [-1,1]) {
    for(let i=0;i<8;i++){
      const q=side,offset=.15+i*.020, tone=i%3===0?hairHi:(i%3===1?hair:hairDark);
      const start=[q*(.18+i*.012),.26,-.125+i*.013];
      const p2=[q*(.22+i*.016),-.025,-.128+i*.01];
      const bottom=[q*(.24+i*.016),-.47-(i%4)*.043,-.12+(i%2)*.045];
      const curves=[start,[q*(offset+.09),.10,-.10],p2,[q*(offset+.095),-.23,-.08],bottom];
      // Hair sections use curved tubes rather than hanging capsule blocks.
      tube("wavy blonde hair strand",curves,.024-(i%3)*.003,tone,6).parent=hroot;
    }
  }
  // Mild natural facial variation, no childish proportions.
  if(crawl) hroot.rotation.x=.13;
  return root;
}
