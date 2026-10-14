/* Jenny: independent, closed-surface character preview. Does not load Penny's GLB. */
(function(){
'use strict';
const B=window.BABYLON,canvas=document.getElementById('scene');
if(!B||!canvas)return;
const engine=new B.Engine(canvas,true,{adaptToDeviceRatio:true});
const scene=new B.Scene(engine);scene.clearColor=new B.Color4(.075,.14,.11,1);
const camera=new B.ArcRotateCamera('Jenny orbit',-Math.PI/2,1.35,3.1,new B.Vector3(0,.72,0),scene);
camera.attachControl(canvas,true);camera.lowerRadiusLimit=.72;camera.upperRadiusLimit=8;camera.minZ=.03;camera.wheelDeltaPercentage=.06;
scene.createDefaultLight();new B.HemisphericLight('soft light',new B.Vector3(0,1,0),scene).intensity=.85;
const sun=new B.DirectionalLight('sun',new B.Vector3(-1,-2,-1),scene);sun.intensity=.7;
const mat=(n,c)=>{const m=new B.StandardMaterial(n,scene);m.diffuseColor=B.Color3.FromHexString(c);m.backFaceCulling=false;return m;};
const skin=mat('Jenny continuous olive skin','#b88963'),hair=mat('Jenny brown hair','#493023'),top=mat('Jenny tank top','#d8c4a5'),skirt=mat('Jenny opaque skirt','#79504f'),shoes=mat('Jenny walking shoes','#454c4b'),eyes=mat('Jenny green eyes','#477c50');
const root=new B.TransformNode('Jenny independent character root',scene);
const part=(name,shape,opts,parent,m,x=0,y=0,z=0)=>{const mesh=B.MeshBuilder[shape](name,opts,scene);mesh.parent=parent;mesh.position.set(x,y,z);mesh.material=m;return mesh;};
const ball=(n,p,m,x,y,z,sx,sy,sz)=>{const a=part(n,'CreateSphere',{diameter:1,segments:20},p,m,x,y,z);a.scaling.set(sx,sy,sz);return a;};
const pelvis=part('Jenny hips','CreateSphere',{diameter:1,segments:24},root,skin,0,.76,0);pelvis.scaling.set(.24,.21,.16);
const torso=ball('Jenny closed torso',root,skin,0,1.02,0,.23,.34,.145);
ball('Jenny neck',root,skin,0,1.28,0,.082,.115,.078);
ball('Jenny closed head',root,skin,0,1.47,0,.205,.24,.185);
ball('Jenny hair cap',root,hair,0,1.63,.018,.214,.13,.197);
for(const side of [-1,1]){
ball('Jenny eye '+side,root,eyes,side*.084,1.49,-.176,.023,.027,.012);
ball('Jenny hair side '+side,root,hair,side*.19,1.42,.035,.065,.19,.12);
}
const garment=ball('Jenny fitted tank top',root,top,0,1.055,0,.238,.255,.155);
const neckline=ball('Jenny skin neckline',root,skin,0,1.276,-.004,.115,.032,.092);
const skirtMesh=part('Jenny closed mini skirt','CreateCylinder',{height:.29,diameterTop:.38,diameterBottom:.57,tessellation:36,cap:B.Mesh.CAP_ALL},root,skirt,0,.72,0);
const arms=[],legs=[];
for(const side of [-1,1]){
const shoulder=new B.TransformNode('Jenny shoulder '+side,scene);shoulder.parent=root;shoulder.position.set(side*.225,1.215,0);
ball('Jenny upper arm '+side,shoulder,skin,side*.025,-.14,0,.085,.17,.084);
const elbow=new B.TransformNode('Jenny elbow '+side,scene);elbow.parent=shoulder;elbow.position.set(side*.035,-.28,0);
ball('Jenny forearm '+side,elbow,skin,0,-.13,0,.07,.15,.07);
ball('Jenny hand '+side,elbow,skin,0,-.285,0,.072,.075,.045);
arms.push({shoulder,elbow,side});
const hip=new B.TransformNode('Jenny hip '+side,scene);hip.parent=root;hip.position.set(side*.135,.73,0);
ball('Jenny thigh '+side,hip,skin,0,-.165,0,.112,.19,.11);
const knee=new B.TransformNode('Jenny knee '+side,scene);knee.parent=hip;knee.position.y=-.33;
ball('Jenny shin '+side,knee,skin,0,-.155,0,.085,.18,.083);
ball('Jenny shoe '+side,knee,shoes,0,-.33,-.065,.102,.07,.18);
legs.push({hip,knee,side});
}
const ground=part('floor','CreateDisc',{radius:2,tessellation:48},null,mat('forest','#304b36'),0,-.012,0);ground.rotation.x=Math.PI/2;
let active='stand',t=0;
function pose(name){active=name;t=0;root.rotation.set(0,0,0);root.position.set(0,0,0);
for(const a of arms){a.shoulder.rotation.set(0,0,0);a.elbow.rotation.set(0,0,0);}
for(const l of legs){l.hip.rotation.set(0,0,0);l.knee.rotation.set(0,0,0);}
}
function tick(){
t+=engine.getDeltaTime()/1000;
if(active==='walk'||active==='run'){
const speed=active==='run'?9:5,amp=active==='run'?.65:.38;
for(const l of legs){l.hip.rotation.x=Math.sin(t*speed*l.side)*amp;l.knee.rotation.x=Math.max(0,-Math.sin(t*speed*l.side))*.65;}
for(const a of arms)a.shoulder.rotation.x=-Math.sin(t*speed*a.side)*amp;
root.position.y=Math.abs(Math.sin(t*speed))*.018;
}else if(active==='wave'){arms[1].shoulder.rotation.z=-2.5;arms[1].elbow.rotation.z=.3*Math.sin(t*5);}
else if(active==='bend'||active==='pickup'){root.rotation.x=Math.min(.6,t*1.2);for(const l of legs)l.hip.rotation.x=-.25;}
else if(active==='sit'){root.position.y=-.30;for(const l of legs){l.hip.rotation.x=-1.2;l.knee.rotation.x=1.35;}}
else if(active==='hands-knees'||active==='elbows-knees'){
root.position.y=-.38;root.rotation.x=.5;
for(const l of legs){l.hip.rotation.x=-.9;l.knee.rotation.x=1.5;}
for(const a of arms){a.shoulder.rotation.x=-.9;a.elbow.rotation.x=active==='elbows-knees'?-1.1:0;}
}
}
const wire=(id,fn)=>{const el=document.getElementById(id);if(el)el.onclick=fn;};
for(const id of ['idle','walk','run','wave','bend','pickup','sit','hands-knees','elbows-knees'])wire(id,()=>pose(id==='idle'?'stand':id));
wire('front',()=>{camera.alpha=-Math.PI/2;camera.beta=1.35;});
wire('back',()=>{camera.alpha=Math.PI/2;camera.beta=1.35;});
wire('face',()=>{camera.setTarget(new B.Vector3(0,1.47,0));camera.radius=.8;});
wire('full',()=>{camera.setTarget(new B.Vector3(0,.8,0));camera.radius=3.1;});
wire('closer',()=>camera.radius=Math.max(camera.lowerRadiusLimit,camera.radius*.8));
wire('farther',()=>camera.radius=Math.min(camera.upperRadiusLimit,camera.radius*1.2));
const status=document.getElementById('status');if(status)status.textContent='Jenny independent closed-mesh preview loaded';
engine.runRenderLoop(()=>{tick();scene.render();});window.addEventListener('resize',()=>engine.resize());
})();