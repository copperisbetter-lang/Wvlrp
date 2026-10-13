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
export function installWildMountainBackdrop(B,scene,camera,{mobile=false}={}){
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
  const obs=scene.onBeforeRenderObservable.add(()=>{
    dome.position.copyFrom(camera.position);
  });
  dome.position.copyFrom(camera.position);
  return {dome,dispose(){
    scene.onBeforeRenderObservable.remove(obs);
    dome.dispose();mat.dispose();texture.dispose();
  }};
}
