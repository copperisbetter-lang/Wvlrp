import {REBUILD_CLEARINGS,REBUILD_PATHS} from "./wild-rebuild-layout.js";
export function installWildMinimap(camera){
 const el=document.createElement("div");el.id="wildMiniMap";el.setAttribute("aria-label","60 metre circular surroundings map with compass");
 el.innerHTML='<canvas width="220" height="220" aria-label="Nearby trails and landmarks"></canvas><span class="wild-map-range">60m</span>';
 document.body.appendChild(el);
 const style=document.createElement("style");style.textContent=`#wildMiniMap{position:fixed;z-index:7;top:calc(80px + env(safe-area-inset-top));left:9px;width:142px;height:142px;border:3px solid #d4dfc3;border-radius:50%;background:#254c37;box-shadow:0 3px 14px #0009;overflow:hidden;pointer-events:none}#wildMiniMap canvas{width:100%;height:100%}.wild-map-range{position:absolute;bottom:4px;left:50%;transform:translateX(-50%);font:10px system-ui;color:#fff;background:#10291fc9;padding:1px 5px;border-radius:7px}@media(max-width:550px){#wildMiniMap{top:calc(76px + env(safe-area-inset-top));width:124px;height:124px}}`;document.head.appendChild(style);
 const c=el.querySelector("canvas"),g=c.getContext("2d"),cx=110,cy=110,r=107,scale=r/30;let last=0;
 function update(now){if(now-last<150)return;last=now;
 const x=camera.position.x,z=camera.position.z,yaw=camera.rotation.y;
 g.clearRect(0,0,220,220);g.save();g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.clip();
 g.fillStyle="#54754c";g.fillRect(0,0,220,220);
 // Camera-forward is always up; +Z is world north.
 const point=(wx,wz)=>{const dx=wx-x,dz=wz-z;return [cx+scale*(dx*Math.cos(yaw)-dz*Math.sin(yaw)),cy-scale*(dx*Math.sin(yaw)+dz*Math.cos(yaw))];};
 g.strokeStyle="#d8bb87";g.lineWidth=5;g.lineJoin="round";g.lineCap="round";
 for(const path of REBUILD_PATHS){g.beginPath();path.points.forEach(([px,pz],i)=>{const [a,b]=point(px,pz);i?g.lineTo(a,b):g.moveTo(a,b)});g.stroke();}
 for(const landmark of REBUILD_CLEARINGS){const [a,b]=point(landmark.x,landmark.z);if(Math.hypot(a-cx,b-cy)>r-7)continue;g.fillStyle="#f4d89e";g.fillRect(a-4,b-4,8,8);}
 const [nx,ny]=point(x,z+25);g.fillStyle="#ffdf7a";g.font="bold 16px system-ui";g.textAlign="center";g.fillText("N",nx,ny);
 g.translate(cx,cy);g.fillStyle="#fff";g.strokeStyle="#123a2d";g.lineWidth=2;g.beginPath();g.moveTo(0,-15);g.lineTo(-9,10);g.lineTo(0,6);g.lineTo(9,10);g.closePath();g.fill();g.stroke();
 g.restore();
 }
 update(0);return {update};
}
