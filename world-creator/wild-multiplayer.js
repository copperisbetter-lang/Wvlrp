/**
 * Optional public beta multiplayer, independent from resident NPCs and
 * the World Creator. A same-room peer's position is rendered as a lightweight
 * adult explorer. Local controls remain first person; no login is required.
 *
 * Trystero discovers browsers through public Nostr signaling relays and then
 * sends positions over encrypted peer-to-peer WebRTC data channels. This is
 * an early beta: no durable server, global presence database or TURN relay.
 * Some mobile/corporate networks will not be able to establish direct links.
 */
import {joinRoom} from "https://esm.run/trystero@0.26.0";
import {normalizeWildPose,wildVisitorColor} from "./wild-multiplayer-protocol.js?v=20261013-1";
const APP_ID="com.wvlrp.the-wild.public-beta.20261013";
const ROOM_ID="first-person-world-v1";
const SENDING_INTERVAL_MS=150;
const PEER_EXPIRY_MS=18000;
const APPEARANCES=[
  {jacket:[.16,.30,.23],trim:[.90,.70,.34]},
  {jacket:[.24,.30,.40],trim:[.90,.78,.49]},
  {jacket:[.42,.25,.21],trim:[.86,.71,.45]},
  {jacket:[.33,.33,.21],trim:[.91,.74,.45]},
  {jacket:[.25,.35,.28],trim:[.83,.65,.48]}
];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function makeExplorer(B,scene,peerId){
  const root=new B.TransformNode("beta visitor "+peerId.slice(0,10),scene);
  const style=APPEARANCES[wildVisitorColor(peerId)];
  const mats=[];
  const material=(name,rgb)=>{
    const mat=new B.StandardMaterial("visitor "+name+" "+peerId.slice(0,8),scene);
    mat.diffuseColor=new B.Color3(...rgb);
    mat.specularColor=new B.Color3(.08,.08,.08);
    mats.push(mat);return mat;
  };
  const jacket=material("jacket",style.jacket);
  const trim=material("trim",style.trim);
  const denim=material("trousers",[.18,.23,.26]);
  const face=material("skin",[.73,.55,.39]);
  const boots=material("boots",[.15,.12,.10]);
  const hair=material("hair",[.21,.14,.08]);
  const item=(type,name,opts,mat,x,y,z)=>{
    const mesh=type==="sphere"?
      B.MeshBuilder.CreateSphere(name,opts,scene):
      type==="box"?
      B.MeshBuilder.CreateBox(name,opts,scene):
      B.MeshBuilder.CreateCylinder(name,opts,scene);
    mesh.parent=root;mesh.position.set(x,y,z);
    mesh.material=mat;mesh.isPickable=false;
    return mesh;
  };
  // An intentionally neutral outdoors explorer, not any of the saved avatars.
  item("box","explorer torso",{width:.58,height:.72,depth:.30},jacket,0,1.12,0);
  item("box","explorer pack",{width:.45,height:.53,depth:.20},boots,0,1.14,-.24);
  for(const side of [-1,1]){
    item("cylinder","explorer sleeve",{height:.67,diameter:.17},jacket,side*.37,1.10,0).rotation.z=side*-.12;
    item("sphere","explorer hand",{diameter:.17},face,side*.40,.73,0);
    item("cylinder","explorer trouser",{height:.70,diameter:.22},denim,side*.16,.44,0);
    item("box","explorer boot",{width:.25,height:.17,depth:.38},boots,side*.16,.10,.09);
  }
  item("sphere","explorer head",{diameter:.30,segments:10},face,0,1.69,0);
  item("sphere","explorer hair",{diameter:.31,segments:10},hair,0,1.79,-.035).scaling.y=.5;
  item("cylinder","explorer cap",{diameter:.36,height:.09,tessellation:12},trim,0,1.84,0);
  item("box","explorer cap brim",{width:.36,height:.035,depth:.22},trim,0,1.80,.16);
  // The small bright panel makes the visitor readable in dense understory.
  item("box","explorer safety patch",{width:.23,height:.13,depth:.015},trim,0,1.22,.160);
  const labelTexture=new B.DynamicTexture("visitor label "+peerId,{width:256,height:64},scene,false);
  labelTexture.hasAlpha=true;
  labelTexture.drawText("EXPLORER",21,43,"bold 31px Arial","#f7f7e7","rgba(11,29,20,.78)",true,true);
  const nameMaterial=new B.StandardMaterial("visitor label surface "+peerId,scene);
  nameMaterial.diffuseTexture=labelTexture;
  nameMaterial.useAlphaFromDiffuseTexture=true;
  nameMaterial.emissiveColor=new B.Color3(.7,.7,.6);
  nameMaterial.backFaceCulling=false;
  mats.push(nameMaterial);
  const plate=B.MeshBuilder.CreatePlane("remote visitor nameplate",{width:1.35,height:.34},scene);
  plate.parent=root;plate.position.y=2.14;
  plate.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
  plate.material=nameMaterial;plate.isPickable=false;
  root.setEnabled(false);
  return {root,labelTexture,mats};
}
export function connectWildMultiplayer({B,scene,getCamera,groundAt,statusElement}){
  if(!B||!scene||!getCamera||!groundAt)throw Error("Game scene unavailable");
  const peers=new Map();
  let room=null,transport="connecting",nextSend=0,nextSweep=0,closed=false;
  function display(){
    if(!statusElement)return;
    const count=peers.size;
    const noun=count===1?"explorer":"explorers";
    statusElement.textContent=transport==="error"?
      "Multiplayer unavailable · exploring solo":
      count?("You + "+count+" other "+noun+" nearby"):
      "Game Beta Test · looking for other explorers…";
    statusElement.dataset.online=String(count>0);
  }
  function removePeer(id){
    const peer=peers.get(id);
    if(!peer)return;
    peer.body.root.dispose(false,false);
    peer.body.labelTexture.dispose();
    peer.body.mats.forEach(m=>m.dispose());
    peers.delete(id);display();
  }
  function ensurePeer(id){
    let peer=peers.get(id);
    if(peer)return peer;
    const body=makeExplorer(B,scene,id);
    peer={body,pose:null,updated:performance.now()};
    peers.set(id,peer);display();
    return peer;
  }
  const pose=()=>{const p=getCamera();return {
    v:1,x:Math.round(p.position.x*100)/100,
    z:Math.round(p.position.z*100)/100,
    yaw:p.rotation.y
  };};
  try{
    room=joinRoom({appId:APP_ID},ROOM_ID,{
      onJoinError:({peerId,error})=>console.warn("Wild peer connection problem",peerId,error)
    });
    const action=room.makeAction("pose");
    action.onMessage=(packet,{peerId}={})=>{
      if(typeof peerId!=="string"||peerId.length>200)return;
      const parsed=normalizeWildPose(packet);
      if(!parsed)return;
      const peer=ensurePeer(peerId);
      if(!peer.pose){
        // First packet must put the avatar immediately at the real peer
        // position, not interpolate it across the entire wilderness from 0,0.
        peer.body.root.position.set(parsed.x,groundAt(parsed.x,parsed.z),parsed.z);
        peer.body.root.rotation.y=parsed.yaw;
      }
      peer.pose=parsed;
      peer.updated=performance.now();
      peer.body.root.setEnabled(true);
    };
    room.onPeerJoin=id=>{
      if(typeof id!=="string")return;
      ensurePeer(id);
      Promise.resolve(action.send(pose(),{target:id})).catch(err=>console.debug("First peer pose",err));
    };
    room.onPeerLeave=id=>removePeer(id);
    transport="searching";display();
    function update(dt){
      if(closed)return;
      const now=performance.now(),cam=getCamera();
      if(now>=nextSend && peers.size){
        nextSend=now+SENDING_INTERVAL_MS;
        Promise.resolve(action.send(pose())).catch(err=>console.debug("Wild position broadcast",err));
      }
      if(now>=nextSweep){
        nextSweep=now+4000;
        for(const [id,peer] of peers)if(now-peer.updated>PEER_EXPIRY_MS)removePeer(id);
      }
      for(const peer of peers.values()){
        if(!peer.pose)continue;
        const {root}=peer.body,{x,z,yaw}=peer.pose;
        const distance=Math.hypot(x-cam.position.x,z-cam.position.z);
        root.setEnabled(distance<190);
        if(distance>=190)continue;
        const factor=clamp(dt*9,0,1);
        root.position.x+=((x-root.position.x)*factor);
        root.position.z+=((z-root.position.z)*factor);
        root.position.y=groundAt(root.position.x,root.position.z);
        const change=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y));
        root.rotation.y+=change*factor;
      }
    }
    function shutdown(){
      if(closed)return;
      closed=true;
      for(const id of [...peers.keys()])removePeer(id);
      try{room.leave();}catch(_){}
    }
    addEventListener("pagehide",shutdown,{once:true});
    return {update,shutdown,getPeerCount:()=>peers.size,getStatus:()=>transport};
  }catch(err){
    transport="error";display();throw err;
  }
}
