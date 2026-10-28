// WVLRP The Wild / Stacey Lake: touch minimap and terrain-aware Mason walk routing.
// Isolated UI/navigation module. This does not modify scenery, model or physics.
// An unreachable destination is refused, never teleported to.
export function installStaceyTapMinimap({pos, getYaw, ground, cliffContact, solidCliffStep, CX, CY, CZ, trails, canAutoWalk}) {
  const map=document.createElement('section');
  map.id='staceyMiniMap';
  map.setAttribute('aria-label','Interactive walking minimap');
  map.innerHTML='<div class="stacey-map-title">MAP <button id="staceyMapZoom" type="button" aria-label="Change minimap range">100m</button></div><canvas id="staceyMapCanvas" width="160" height="160" role="button" tabindex="0" aria-label="Choose a walking destination on the map"></canvas><div id="staceyMapNotice" role="status">Tap map to walk</div>';
  document.body.append(map);
  const style=document.createElement('style');
  style.textContent='#staceyMiniMap{position:fixed;top:calc(77px + env(safe-area-inset-top));left:8px;width:164px;z-index:7;background:#102e29eb;border:1px solid #b7d5ad;border-radius:12px;padding:5px;color:#f6ffeb;box-shadow:0 2px 14px #0009;font:11px system-ui}#staceyMiniMap .stacey-map-title{height:22px;display:flex;align-items:center;justify-content:space-between;font-weight:800;letter-spacing:1px;padding:0 4px}#staceyMiniMap #staceyMapZoom{padding:2px 8px;min-height:22px;font-size:11px;border-radius:6px}#staceyMapCanvas{width:152px;height:152px;display:block;touch-action:manipulation;cursor:crosshair;border-radius:50%;outline-offset:-3px}#staceyMapNotice{font-size:10px;text-align:center;min-height:26px;display:flex;align-items:center;justify-content:center;line-height:1.2;padding:2px 1px}#staceyMapCanvas:focus-visible{outline:3px solid #fbe28b}@media(max-width:520px){#staceyMiniMap{top:calc(75px + env(safe-area-inset-top));width:140px;padding:4px}#staceyMapCanvas{width:130px;height:130px}}';
  document.head.append(style);
  const canvas=map.querySelector('#staceyMapCanvas'),g=canvas.getContext('2d');
  const notice=map.querySelector('#staceyMapNotice'),zoom=map.querySelector('#staceyMapZoom');
  const ranges=[45,100,340];let rangeIndex=1,lastPaint=-Infinity;
  let route=[],target=null,manualCancel=false;
  const bound=(x,z)=>Math.hypot(x-CX,z-CZ)<=336;
  function standable(x,z) {
    if(!bound(x,z))return false;
    const h=ground(x,z);
    if(!Number.isFinite(h)||h<CY-.55)return false; // walking, not water/flight
    const c=cliffContact(x,z,h);
    return !c.solid&&!c.cave;
  }
  function segmentSafe(a,b){
    const len=Math.hypot(b.x-a.x,b.z-a.z);
    const n=Math.max(1,Math.ceil(len/2.8));
    let previous=ground(a.x,a.z);
    for(let i=1;i<=n;i++){
      const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      if(!standable(x,z))return false;
      const h=ground(x,z);
      if(Math.abs(h-previous)>len/n*.43+.12)return false;
      previous=h;
    }
    return true;
  }
  function findRoute(start,end) {
    if(!standable(start.x,start.z))return {error:'Reach dry ground to walk'};
    if(!standable(end.x,end.z))return {error:'Select dry, walkable ground'};
    if(segmentSafe(start,end))return {route:[end]};
    const d=Math.hypot(end.x-start.x,end.z-start.z);
    const margin=Math.min(130,Math.max(44,d*.65));
    let minX=Math.min(start.x,end.x)-margin,minZ=Math.min(start.z,end.z)-margin;
    let maxX=Math.max(start.x,end.x)+margin,maxZ=Math.max(start.z,end.z)+margin;
    let cell=Math.max(3.5,Math.min(10,d/37));
    cell=Math.max(cell,(maxX-minX)/89,(maxZ-minZ)/89);
    const cols=Math.ceil((maxX-minX)/cell)+1,rows=Math.ceil((maxZ-minZ)/cell)+1,total=cols*rows;
    const index=(i,j)=>j*cols+i;
    const loc=k=>({x:minX+(k%cols)*cell,z:minZ+Math.floor(k/cols)*cell});
    const ix=x=>Math.max(0,Math.min(cols-1,Math.round((x-minX)/cell)));
    const iz=z=>Math.max(0,Math.min(rows-1,Math.round((z-minZ)/cell)));
    const startId=index(ix(start.x),iz(start.z)),endId=index(ix(end.x),iz(end.z));
    const scores=new Float64Array(total);scores.fill(Infinity);
    const previous=new Int32Array(total);previous.fill(-1);
    const closed=new Uint8Array(total),safeCache=new Int8Array(total);
    const heap=[];
    function push(node){heap.push(node);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=heap[i].f)break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}}
    function pop(){const first=heap[0],tail=heap.pop();if(heap.length){heap[0]=tail;let i=0;while(true){let l=i*2+1,r=l+1,k=i;if(l<heap.length&&heap[l].f<heap[k].f)k=l;if(r<heap.length&&heap[r].f<heap[k].f)k=r;if(k===i)break;[heap[i],heap[k]]=[heap[k],heap[i]];i=k;}}return first;}
    const heuristic=(p)=>Math.hypot(p.x-end.x,p.z-end.z);
    const isSafeCell=k=>{if(!safeCache[k])safeCache[k]=standable(loc(k).x,loc(k).z)?1:-1;return safeCache[k]>0;};
    scores[startId]=0;push({id:startId,f:heuristic(start)});
    let found=-1,visited=0;
    const offsets=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    while(heap.length&&visited<5200){
      const node=pop(),k=node.id;if(closed[k])continue;closed[k]=1;visited++;
      const p=k===startId?start:loc(k);
      if((k===endId||heuristic(p)<=cell*1.3)&&segmentSafe(p,end)){found=k;break;}
      const col=k%cols,row=Math.floor(k/cols);
      for(const [dc,dr] of offsets){
        const ci=col+dc,rj=row+dr;
        if(ci<0||ci>=cols||rj<0||rj>=rows)continue;
        const id=index(ci,rj);if(closed[id]||!isSafeCell(id))continue;
        const q=loc(id);
        if(!segmentSafe(p,q))continue;
        const grade=Math.abs(ground(q.x,q.z)-ground(p.x,p.z));
        const cost=Math.hypot(q.x-p.x,q.z-p.z)+grade*.5;
        if(scores[k]+cost>=scores[id])continue;
        scores[id]=scores[k]+cost;previous[id]=k;
        push({id,f:scores[id]+heuristic(q)});
      }
    }
    if(found<0)return {error:'No safe walking route'};
    const raw=[end];let k=found;
    while(k!==startId&&k>=0){raw.unshift(loc(k));k=previous[k];}
    if(k<0)return {error:'Route unavailable'};
    // Reduce grid zigzags without cutting across water, steep slopes or cliffs.
    const points=[];let from=start,i=0;
    while(i<raw.length){
      let next=i;
      for(let j=raw.length-1;j>i;j--){if(segmentSafe(from,raw[j])){next=j;break;}}
      points.push(raw[next]);from=raw[next];i=next+1;
    }
    return {route:points};
  }
  function message(t){notice.textContent=t;}
  function cancel(reason='Walking canceled'){if(route.length||target){route=[];target=null;message(reason);manualCancel=true;}}
  function choose(x,z){
    if(!canAutoWalk()){message('Stand on dry ground first');return false;}
    const start={x:pos.x,z:pos.z},end={x,z};
    const found=findRoute(start,end);
    if(found.error){cancel(found.error);message(found.error);return false;}
    route=found.route;target=end;manualCancel=false;
    message('Walking '+Math.round(Math.hypot(x-pos.x,z-pos.z))+'m');
    return true;
  }
  function click(e){
    const r=canvas.getBoundingClientRect(),u=(e.clientX-r.left)/r.width,v=(e.clientY-r.top)/r.height;
    const sx=u*160-80,sy=v*160-80;if(Math.hypot(sx,sy)>75)return;
    const scale=ranges[rangeIndex]/74;
    choose(pos.x+sx*scale,pos.z+sy*scale);
    e.preventDefault();e.stopPropagation();
  }
  canvas.addEventListener('click',click);
  canvas.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();message('Tap a destination inside the map');}
  });
  zoom.onclick=e=>{e.stopPropagation();rangeIndex=(rangeIndex+1)%ranges.length;zoom.textContent=ranges[rangeIndex]+'m';lastPaint=-Infinity;};
  function step(dt,speed){
    if(!route.length||!canAutoWalk())return {walking:false};
    let waypoint=route[0],dist=Math.hypot(waypoint.x-pos.x,waypoint.z-pos.z);
    if(dist<.55){
      route.shift();
      if(!route.length){target=null;message('Arrived');return {walking:false};}
      waypoint=route[0];dist=Math.hypot(waypoint.x-pos.x,waypoint.z-pos.z);
    }
    if(dist<.001)return {walking:false};
    const amount=Math.min(dist,Math.max(0,dt*speed)),dx=(waypoint.x-pos.x)/dist,dz=(waypoint.z-pos.z)/dist;
    const result=solidCliffStep(pos.x,pos.z,pos.x+dx*amount,pos.z+dz*amount,pos.y-1.7);
    const actual=Math.hypot(result.x-pos.x,result.z-pos.z);
    if(amount>.02&&actual<amount*.45){cancel('Path blocked; tap another point');return {walking:false};}
    pos.x=result.x;pos.z=result.z;
    const yaw=Math.atan2(-dx,-dz); // Mason faces his travel direction, not the previous camera yaw.
    if(Math.hypot(waypoint.x-pos.x,waypoint.z-pos.z)<.55){
      route.shift();if(!route.length){target=null;message('Arrived');}
    }
    return {walking:actual>.001,yaw};
  }
  function draw(now) {
    if(now-lastPaint<280)return;
    lastPaint=now;
    const R=75,c=80,range=ranges[rangeIndex],ratio=74/range;
    g.clearRect(0,0,160,160);g.save();g.beginPath();g.arc(c,c,R,0,Math.PI*2);g.clip();
    g.fillStyle='#52744b';g.fillRect(0,0,160,160);
    // Low-cost terrain raster: same ground heights as actual walk collision.
    for(let y=0;y<160;y+=8)for(let x=0;x<160;x+=8){
      const wx=pos.x+(x+4-c)/ratio,wz=pos.z+(y+4-c)/ratio;
      const h=ground(wx,wz);
      g.fillStyle=h<CY-.55?'#307aa0':h>CY+18?'#68776b':h>CY+4?'#4c7350':'#679760';
      g.fillRect(x,y,8.5,8.5);
    }
    const project=p=>[c+(p.x-pos.x)*ratio,c+(p.z-pos.z)*ratio];
    g.save();g.strokeStyle='#c79de9';g.lineWidth=2.3;g.lineCap='round';g.lineJoin='round';
    for(const path of trails||[]){
      if(!path?.length)continue;
      g.beginPath();
      for(let i=0;i<path.length;i+=Math.max(1,Math.floor(path.length/270))){
        const [x,y]=project(path[i]);if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
      }
      const end=project(path[path.length-1]);g.lineTo(end[0],end[1]);g.stroke();
    }
    g.restore();
    const spring=project({x:-36,z:-240});
    if(Math.hypot(spring[0]-c,spring[1]-c)<R){g.fillStyle='#dceafc';g.beginPath();g.arc(...spring,4,0,Math.PI*2);g.fill();}
    if(target){
      g.strokeStyle='#ffda7f';g.lineWidth=2.3;g.setLineDash([5,4]);g.beginPath();g.moveTo(c,c);
      for(const p of route){const [x,y]=project(p);g.lineTo(x,y);}
      g.stroke();g.setLineDash([]);
      const [x,y]=project(target);g.strokeStyle='#fff2a6';g.lineWidth=2;g.beginPath();g.arc(x,y,6,0,Math.PI*2);g.stroke();
    }
    g.save();g.translate(c,c);g.rotate(-getYaw());g.fillStyle='#ffe99d';g.strokeStyle='#102f25';g.lineWidth=2.5;g.beginPath();g.moveTo(0,-11);g.lineTo(-7,8);g.lineTo(0,4);g.lineTo(7,8);g.closePath();g.fill();g.stroke();g.restore();
    g.restore();g.strokeStyle='#bfdca9';g.lineWidth=2;g.beginPath();g.arc(c,c,R,0,Math.PI*2);g.stroke();
    g.fillStyle='#fff';g.font='bold 10px system-ui';g.fillText('N',76,13);
  }
  const api={choose,cancel,step,draw,get active(){return route.length>0;},get target(){return target;},get remaining(){return route.length;},get message(){return notice.textContent;},get manualCancel(){return manualCancel;}};
  window.staceyNavigation=api;
  return api;
}
