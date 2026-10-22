// Independent movable eyes for the Lauren 3 working face. Laura 2.5 is untouched.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
const R=Math.PI/180,clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const specs=[{id:'left',x:697,y:540,rx:56,ry:19,r:55},{id:'right',x:955,y:540,rx:63,ry:19,r:56}];
const scleraMat=new THREE.MeshPhysicalMaterial({color:0xf0e8de,roughness:.4,clearcoat:.25});
const irisMat=new THREE.MeshStandardMaterial({color:0x69774e,roughness:.55,side:THREE.DoubleSide});
const irisEdge=new THREE.MeshStandardMaterial({color:0x394632,roughness:.63,side:THREE.DoubleSide});
const irisDetail=new THREE.MeshStandardMaterial({color:0x8c8454,roughness:.56,side:THREE.DoubleSide});
const pupilMat=new THREE.MeshPhysicalMaterial({color:0x090c10,roughness:.12,clearcoat:1,side:THREE.DoubleSide});
const highlightMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,depthWrite:false});
const lidMat=new THREE.MeshStandardMaterial({color:0xc99574,roughness:.94,side:THREE.DoubleSide});
const rimMat=new THREE.MeshStandardMaterial({color:0x7b4a36,roughness:.92});

export function installLauren3Eyes(root){
  const faceMeshes=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position&&o.geometry?.index)faceMeshes.push(o);});
  if(faceMeshes.length!==1)throw Error('Eye fitting requires the single original facial mesh. Found '+faceMeshes.length);
  const face=faceMeshes[0],geo=face.geometry,pos=geo.attributes.position,idx=geo.index;
  if(pos.count!==38365||idx.count!==228219)throw Error('Face topology changed. Eye fitting safely stopped.');
  const kept=[],removed=[0,0];
  for(let i=0;i<idx.count;i+=3){
    const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
    const x=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3,y=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3;
    const hole=specs.findIndex(s=>((x-s.x)/s.rx)**2+((y-s.y)/s.ry)**2<1);
    if(hole>=0)removed[hole]++;else kept.push(a,b,c);
  }
  if(removed.some(v=>v<50))throw Error('No valid eye opening found. Original mesh kept.');
  const carved=geo.clone();carved.setIndex(kept);carved.computeVertexNormals();face.geometry=carved;
  face.material.side=THREE.DoubleSide;
  const eyes=[];
  for(const s of specs){
    const depths=[];
    for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i)-s.x)<14&&Math.abs(pos.getY(i)-s.y)<9)depths.push(pos.getZ(i));
    if(depths.length<12)throw Error('Cannot fit '+s.id+' eyeball to skull depth');
    depths.sort((a,b)=>a-b);s.frontZ=depths[Math.floor(depths.length*.53)];
    s.centerZ=s.frontZ-s.r+6;
    const socket=new THREE.Group();socket.name='Lauren3_'+s.id+'_eyeSocket';
    socket.position.set(s.x,s.y,s.centerZ);root.add(socket);
    const pivot=new THREE.Group();pivot.name='Lauren3_'+s.id+'_MOVABLE_EYEBALL';socket.add(pivot);
    const globe=new THREE.Mesh(new THREE.SphereGeometry(s.r,40,28),scleraMat);
    globe.name=s.id+'_sclera';pivot.add(globe);
    const iris=new THREE.Group();iris.name=s.id+'_movable_iris';iris.position.z=s.r-.25;pivot.add(iris);
    function disc(rad,mat,z){
      const o=new THREE.Mesh(new THREE.CircleGeometry(rad,48),mat);
      o.position.z=z;iris.add(o);return o;
    }
    disc(19.4,irisEdge,0);disc(17.2,irisMat,.4);
    for(let i=0;i<24;i++){
      const angle=i*Math.PI/12,o=new THREE.Mesh(new THREE.PlaneGeometry(1.0,6),irisDetail);
      o.position.set(Math.cos(angle)*12.8,Math.sin(angle)*12.8,.6);
      o.rotation.z=angle-Math.PI/2;iris.add(o);
    }
    disc(10.3,irisDetail,.9);
    const pupil=disc(7.1,pupilMat,1.2);
    const glint=disc(2.3,highlightMat,2);glint.position.x=-5;glint.position.y=6;
    function rim(top){
      const pts=[];
      for(let i=0;i<=28;i++){
        const u=-1+2*i/28,arc=Math.sqrt(Math.max(0,1-u*u));
        pts.push(new THREE.Vector3(s.x+u*s.rx,s.y+(top?1:-1)*s.ry*arc,s.frontZ+5-8*u*u));
      }
      const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,top?2.5:2,7,false),rimMat);
      m.name=s.id+(top?'_upperLidRim':'_lowerLidRim');root.add(m);
    }
    rim(true);rim(false);
    const top=new THREE.Mesh(new THREE.BufferGeometry(),lidMat),bottom=new THREE.Mesh(new THREE.BufferGeometry(),lidMat);
    top.name=s.id+'_MOVABLE_UPPER_LID';bottom.name=s.id+'_MOVABLE_LOWER_LID';
    root.add(top,bottom);
    eyes.push({s,socket,pivot,pupil,top,bottom,yaw:0,pitch:0,blink:0,blinkStart:0,blinkDur:0,xOffset:0,yOffset:0,depthOffset:0});
  }
  function update(e){
    const s=e.s;
    e.socket.position.set(s.x+e.xOffset,s.y+e.yOffset,s.centerZ+e.depthOffset);
    e.pivot.rotation.y=clip(e.yaw,-30,30)*R;
    e.pivot.rotation.x=-clip(e.pitch,-25,25)*R;
    for(const upper of [true,false]){
      const points=[],indices=[],N=32;
      for(let i=0;i<=N;i++){
        const u=-1+2*i/N,arc=Math.sqrt(Math.max(0,1-u*u)),ext=arc*s.ry;
        const outer=upper?ext:-ext,edge=upper?ext-2*ext*e.blink*.84:-ext+2*ext*e.blink*.16;
        const x=s.x+u*s.rx,z=s.frontZ+9-8*u*u;
        points.push(x,s.y+outer,z,x,s.y+edge,z+1.6*e.blink*arc);
      }
      for(let i=0;i<N;i++){let t=2*i;indices.push(t,t+1,t+2,t+1,t+3,t+2);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();
      const lid=upper?e.top:e.bottom;lid.geometry.dispose();lid.geometry=g;lid.visible=e.blink>.02;
    }
  }
  eyes.forEach(update);
  return {
    eyes,removed,
    look(which,yaw,pitch){for(const e of eyes)if(which==='both'||e.s.id===which){e.yaw=clip(yaw,-30,30);e.pitch=clip(pitch,-25,25);update(e);}},
    blink(which='both'){const now=performance.now();for(const e of eyes)if(which==='both'||e.s.id===which){e.blinkStart=now;e.blinkDur=260;}},
    fit(which,axis,value){for(const e of eyes)if(which==='both'||e.s.id===which){if(['xOffset','yOffset','depthOffset'].includes(axis)){e[axis]=clip(value,-30,30);update(e);}}},
    frame(now){for(const e of eyes)if(e.blinkDur){const t=clip((now-e.blinkStart)/e.blinkDur,0,1);e.blink=t>=1?0:Math.sin(t*Math.PI)**2;update(e);if(t>=1)e.blinkDur=0;}},
    reset(){for(const e of eyes){e.yaw=e.pitch=e.blink=e.xOffset=e.yOffset=e.depthOffset=0;e.blinkDur=0;update(e);}}
  };
}
