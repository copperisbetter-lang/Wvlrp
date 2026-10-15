/**
 * The Wild — live multiplayer map for connected visitors.
 * The map shows coordinates received inside the same Trystero/WebRTC room.
 * It never accesses a device's GPS or a public player database.
 */
import {REBUILD_CLEARINGS,REBUILD_PATHS} from "./wild-rebuild-layout.js?v=flatland-map-20261015-v1";

export function wildPeerDirection(from,to){
  const dx=to.x-from.x,dz=to.z-from.z;
  const metres=Math.hypot(dx,dz);
  const degrees=(Math.atan2(dx,dz)*180/Math.PI+360)%360;
  return {metres,degrees,cardinal:["N","NE","E","SE","S","SW","W","NW"][Math.round(degrees/45)%8]};
}
export function wildPlayerMapViewport(players){
  const valid=players.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));
  if(!valid.length)return {x:93,z:55,halfSpan:140};
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of valid){
    minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
    minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
  }
  const halfSpan=Math.max(115,(maxX-minX)*.62+34,(maxZ-minZ)*.62+34);
  return {x:(minX+maxX)/2,z:(minZ+maxZ)/2,halfSpan};
}
export function createWildPlayerMap({getSelf,getPeers,getStatus}){
  const toggleButton=document.getElementById("playerMapToggle");
  const closeButton=document.getElementById("playerMapClose");
  const panel=document.getElementById("playerMapPanel");
  const canvas=document.getElementById("playerMapCanvas");
  const summary=document.getElementById("playerMapMessage");
  const contacts=document.getElementById("playerMapContacts");
  const myCoords=document.getElementById("playerMapCoords");
  if(!toggleButton||!closeButton||!panel||!canvas||!summary||!contacts||!myCoords)
    throw Error("Live player map controls missing");
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Live player map canvas unavailable");
  let nextPaint=0;
  const open=()=>!panel.hidden;
  function toggle(yes){
    panel.hidden=!yes;
    toggleButton.setAttribute("aria-expanded",String(yes));
    if(yes){paint();closeButton.focus();}else toggleButton.focus();
  }
  toggleButton.addEventListener("click",()=>toggle(!open()));
  closeButton.addEventListener("click",()=>toggle(false));
  panel.addEventListener("keydown",e=>{
    if(e.key==="Escape"){e.preventDefault();toggle(false);}
  });
  function paint(){
    if(!open())return;
    const me=getSelf();
    const peers=(getPeers()||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));
    const frame=wildPlayerMapViewport([me,...peers]);
    const w=canvas.width,h=canvas.height,pad=36;
    const scale=Math.min((w-pad*2)/(frame.halfSpan*2),(h-pad*2)/(frame.halfSpan*2));
    const X=x=>w*.5+(x-frame.x)*scale;
    const Y=z=>h*.5-(z-frame.z)*scale; // north is up, +Z is north
    ctx.fillStyle="#182f25";ctx.fillRect(0,0,w,h);
    // Subdued contour lines and an exact 50-metre X/Z grid.
    for(let n=0;n<11;n++){
      ctx.beginPath();
      for(let x=0;x<=w;x+=8){
        const y=22+n*59+12*Math.sin(x*.014+n*.75)+7*Math.sin(x*.043+n);
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle="#56754870";ctx.lineWidth=1;ctx.stroke();
    }
    ctx.strokeStyle="#b3d7b736";ctx.lineWidth=1;
    for(let x=Math.ceil((frame.x-frame.halfSpan)/50)*50;x<=frame.x+frame.halfSpan;x+=50){
      ctx.beginPath();ctx.moveTo(X(x),0);ctx.lineTo(X(x),h);ctx.stroke();
    }
    for(let z=Math.ceil((frame.z-frame.halfSpan)/50)*50;z<=frame.z+frame.halfSpan;z+=50){
      ctx.beginPath();ctx.moveTo(0,Y(z));ctx.lineTo(w,Y(z));ctx.stroke();
    }
    ctx.strokeStyle="#d5b883b8";ctx.lineWidth=3;ctx.lineJoin="round";
    for(const route of REBUILD_PATHS){
      ctx.beginPath();
      route.points.forEach(([x,z],i)=>{if(!i)ctx.moveTo(X(x),Y(z));else ctx.lineTo(X(x),Y(z));});
      ctx.stroke();
    }
    function landmark(text,x,z){
      const a=X(x),b=Y(z);
      if(a<8||a>w-8||b<8||b>h-8)return;
      ctx.fillStyle="#e7cf98";ctx.fillRect(a-4,b-4,8,8);
      ctx.font="bold 14px system-ui";ctx.fillStyle="#f9dfae";ctx.textAlign="center";
      ctx.fillText(text,a,b-11,145);
    }
    for(const clearing of REBUILD_CLEARINGS){
      landmark(clearing.name,clearing.x,clearing.z);
    }
    const closest=peers.slice().sort((a,b)=>
      wildPeerDirection(me,a).metres-wildPeerDirection(me,b).metres)[0];
    if(closest){
      ctx.setLineDash([8,7]);ctx.strokeStyle="#ffd586";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(X(me.x),Y(me.z));
      ctx.lineTo(X(closest.x),Y(closest.z));ctx.stroke();ctx.setLineDash([]);
    }
    function dot(p,color,label){
      const x=X(p.x),y=Y(p.z);
      ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);
      ctx.fillStyle="#10261d";ctx.fill();ctx.strokeStyle="#faf4e1";
      ctx.lineWidth=2;ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
      if(Number.isFinite(p.yaw)){
        ctx.beginPath();ctx.moveTo(x,y);
        ctx.lineTo(x+20*Math.sin(p.yaw),y-20*Math.cos(p.yaw));
        ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();
      }
      ctx.font="bold 18px system-ui";ctx.textAlign="center";
      const t=Math.max(50,Math.min(w-50,x));
      const width=Math.max(55,ctx.measureText(label).width+20);
      ctx.fillStyle="#0b1e17e8";ctx.fillRect(t-width/2,y+16,width,25);
      ctx.fillStyle="#fff6d8";ctx.fillText(label,t,y+35);
    }
    peers.forEach((p,i)=>dot(p,"#ffb55c","Explorer "+(i+1)));
    dot(me,"#6fdbbc","YOU");
    ctx.textAlign="left";ctx.font="bold 20px system-ui";ctx.fillStyle="#ecf5da";
    ctx.fillText("N ↑",15,29);
    ctx.font="16px system-ui";ctx.fillStyle="#dae7c9";
    ctx.fillText("Game coordinates · metres",15,h-14);
    const rounded=n=>Math.round(n);
    myCoords.textContent="YOU: X "+rounded(me.x)+" · Z "+rounded(me.z)+
      " · "+rounded(Math.hypot(me.x,me.z))+" m from Hearthside Cabin";
    if(!peers.length){
      summary.textContent=getStatus()==="error"?"Unable to connect multiplayer.":
        "No connected player position received. Both phones must be on Game Beta Test, with their pages open.";
      contacts.replaceChildren();
    }else{
      summary.textContent=peers.length+" connected explorer"+
        (peers.length===1?"":"s")+" shown. Dots update as players move.";
      const fragment=document.createDocumentFragment();
      peers.forEach((peer,i)=>{
        const distance=wildPeerDirection(me,peer);
        const line=document.createElement("p");
        line.textContent="Explorer "+(i+1)+": X "+rounded(peer.x)+
          " · Z "+rounded(peer.z)+" · "+
          rounded(Math.hypot(peer.x,peer.z))+" m from cabin · "+
          rounded(distance.metres)+" m "+distance.cardinal+" of YOU";
        fragment.appendChild(line);
      });
      contacts.replaceChildren(fragment);
    }
  }
  return {
    update(now){
      if(!open()||now<nextPaint)return;
      nextPaint=now+400;paint();
    },
    isOpen:open,
    getDisplayedPeers:()=>getPeers().length
  };
}
