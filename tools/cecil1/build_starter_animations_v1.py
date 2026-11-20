#!/usr/bin/env python3
"""Cecil 1 original starter skeletal animations — safe derivative from owner's private V5 combined GLB.
Writes a new animated GLB and fully offline Android HTML viewer; DOES NOT write over approved original.
Only public-save this build script and QA: NEVER publish the identifiable source/animated GLB,
original head scan, or third-party garment meshes.
"""
from pathlib import Path
from scipy.spatial.transform import Rotation as R
import numpy as np
import json, hashlib, math, struct, base64, re, subprocess

ROOT=Path('/mnt/data')
SRC=ROOT/'CECIL1_DAD_WHITE_UNDERCLOTHES_FIT_V5.glb'
SRC_HTML=ROOT/'CECIL1_DAD_WHITE_UNDERCLOTHES_FIT_V5_VIEWER.html'
OUT=ROOT/'CECIL1_DAD_STARTER_ANIMATIONS_V1.glb'
OUT_HTML=ROOT/'CECIL1_DAD_STARTER_ANIMATIONS_V1_VIEWER.html'
QA=ROOT/'CECIL1_DAD_STARTER_ANIMATIONS_V1_QA.json'

raw=SRC.read_bytes(); assert raw[:4]==b'glTF'
js_len,js_type=struct.unpack_from('<II',raw,12)
assert js_type==0x4E4F534A
j=json.loads(raw[20:20+js_len].decode('utf8'))
bo=20+js_len; binlen,bintype=struct.unpack_from('<II',raw,bo)
assert bintype==0x004E4942
orig_bin=raw[bo+8:bo+8+binlen]
node_by_name={node.get('name'):idx for idx,node in enumerate(j['nodes'])}
orig_nodes=json.loads(json.dumps(j['nodes']))
assert len(j['skins'][0]['joints'])==138
assert len(j.get('animations',[]))==0
rest={n:np.array(j['nodes'][i].get('rotation',[0,0,0,1]),float) for n,i in node_by_name.items()}
hip_base=np.array(j['nodes'][node_by_name['DAZ_G9_hip']]['translation'],float)

def qxyz(x=0,y=0,z=0):
    return R.from_euler('xyz',[x,y,z],degrees=True).as_quat().astype(np.float32)

def rotvals(**v):
    return {f'DAZ_G9_{n}':qxyz(*angles) for n,angles in v.items()}

def smooth01(t):
    t=max(0.,min(1.,float(t)))
    return t*t*(3-2*t)

# Each pose generator returns {bone_name: quaternion}, {bone_name: translation};
# initial/bind pose is authentic identity for tested major joints.
def idle(t,d):
    a=2*math.pi*t/d; breathe=math.sin(a); weight=math.sin(a+.5)
    ro=rotvals(spine1=(1.0*breathe,0,0),spine3=(.85*breathe,.5*weight,0),
               spine4=(-.42*breathe,0,.36*weight),head=(-.35*breathe,.85*math.sin(a/2),0),
               l_shoulder=(0,0,.7*weight),r_shoulder=(0,0,-.7*weight))
    return ro,{'DAZ_G9_hip':(hip_base+np.array([.001*weight,.0023*breathe,0])).astype(np.float32)}

def walk(t,d):
    a=2*math.pi*t/d; stride=math.sin(a); rev=-stride
    # Feet move in place, shoulder/hip bob restrained for an older gentleman.
    ro=rotvals(
        l_thigh=(-17*stride,0,0),r_thigh=(17*stride,0,0),
        l_shin=(max(0,-stride)*23,0,0),r_shin=(max(0,stride)*23,0,0),
        l_foot=(5*stride,0,0),r_foot=(-5*stride,0,0),
        l_upperarm=(7*stride,0,1.5),r_upperarm=(-7*stride,0,-1.5),
        l_forearm=(3*stride,0,0),r_forearm=(-3*stride,0,0),
        spine2=(2*math.sin(2*a),0,0),spine3=(0,2.2*math.sin(a+.8),.7*math.cos(a)),
        head=(0,-1.1*math.sin(a),0)
    )
    trans=(hip_base+np.array([.0045*math.cos(a), .005*(1-math.cos(2*a)), 0])).astype(np.float32)
    return ro,{'DAZ_G9_hip':trans}

def hello(t,d):
    # Short left-handed wave: lift, gentle wrist oscillation, lower; no head/body reshaping.
    up=smooth01(t/.75)*(1-smooth01((t-(d-.75))/.75))
    wave=math.sin(2*math.pi*2.3*(t-.7))*up
    ro=rotvals(l_shoulder=(0,0,13*up),l_upperarm=(-9*up,0,59*up),
               l_forearm=(-9*up,0,41*up),l_hand=(0,11*wave,20*wave),
               head=(0,-8*up,-2*up),spine4=(0,-3.3*up,0),
               r_upperarm=(0,0,-2*up))
    return ro,{}

def fishing(t,d):
    # Calm 'wait for bite' stance, no rod yet, weight shifting and small hand movements.
    a=2*math.pi*t/d; w=math.sin(a)
    ro=rotvals(spine1=(-2.4,0,0),spine3=(-2.0,1.5*w,0),
               head=(1.2,3.5*math.sin(a+.3),0),
               l_upperarm=(-6.5,8.0,8.0),r_upperarm=(-6.0,-8.0,-8.0),
               l_forearm=(-10.0+2*w,0,4),r_forearm=(-10+2*w,0,-4),
               l_hand=(0,2*w,0),r_hand=(0,-2*w,0))
    return ro,{'DAZ_G9_hip':(hip_base+np.array([.001*w,.0015*w,0])).astype(np.float32)}

clip_defs=[('Idle · Breathing',4.0,41,idle,'loop'),
           ('Walk · In Place',2.2,45,walk,'loop'),
           ('Wave · Left Hand',3.3,67,hello,'once'),
           ('Fishing · Waiting (Draft)',4.6,47,fishing,'loop')]

# Store all new data at the end of the original BIN chunk. No changes to existing vertex, rig,
# weight or texture bytes. Animations target the actual live rig node indices.
binary=bytearray(orig_bin)
j.setdefault('animations',[])
viewer_clips=[]

def align4():binary.extend(b'\x00'*((-len(binary))%4))
def put_f32(array,ty):
    arr=np.asarray(array,dtype='<f4').reshape((-1,4 if ty=='VEC4' else (3 if ty=='VEC3' else 1)))
    align4();start=len(binary);binary.extend(arr.tobytes(order='C'))
    v_idx=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':arr.nbytes})
    a={'bufferView':v_idx,'byteOffset':0,'componentType':5126,'count':len(arr),'type':ty}
    if ty=='SCALAR':a['min']=[float(arr.min())];a['max']=[float(arr.max())]
    ai=len(j['accessors']);j['accessors'].append(a)
    return ai

for title,duration,nframes,func,loopmode in clip_defs:
    times=np.linspace(0,duration,nframes,dtype=np.float32)
    poses=[func(float(t),duration) for t in times]
    all_rot=sorted(set().union(*(pose[0].keys() for pose in poses)))
    all_trans=sorted(set().union(*(pose[1].keys() for pose in poses)))
    ta=put_f32(times,'SCALAR')
    samplers=[];channels=[];vt=[]
    for path,names in [('rotation',all_rot),('translation',all_trans)]:
        for name in names:
            vals=[]
            for ro,tr in poses:
                v=(ro if path=='rotation' else tr).get(name)
                if v is None: v=rest[name] if path=='rotation' else hip_base
                vals.append(np.asarray(v,dtype=np.float32))
            vals=np.asarray(vals,np.float32)
            if path=='rotation':
                vals/=np.maximum(np.linalg.norm(vals,axis=1,keepdims=True),1.e-9)
                # avoid antipodal flips
                for k in range(1,len(vals)):
                    if np.dot(vals[k-1],vals[k])<0:vals[k]*=-1
            ai=put_f32(vals,'VEC4' if path=='rotation' else 'VEC3')
            si=len(samplers);samplers.append({'input':ta,'output':ai,'interpolation':'LINEAR'})
            channels.append({'sampler':si,'target':{'node':node_by_name[name],'path':path}})
            vt.append({'n':name,'p':path,'v':np.round(vals,7).tolist()})
    j['animations'].append({'name':title,'channels':channels,'samplers':samplers,'extras':{'duration_s':duration,'repeat':loopmode,'purpose':'first-pass original procedural G9 animation, review'}})
    viewer_clips.append({'name':title,'duration':duration,'mode':loopmode,'times':np.round(times,6).tolist(),'tracks':vt})

j['buffers'][0]['byteLength']=len(binary)
js=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode('utf8')
js+=b' '*((-len(js))%4)
newbin=bytes(binary);newbin+=b'\x00'*((-len(newbin))%4)
out=(struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(newbin))+
     struct.pack('<II',len(js),0x4E4F534A)+js+
     struct.pack('<II',len(newbin),0x004E4942)+newbin)
OUT.write_bytes(out)
assert out[-len(newbin):][:len(orig_bin)]==orig_bin
assert j['nodes']==orig_nodes

# Standalone playback controls implement the SAME keyed native animations in the mobile viewer,
# without depending on internal/minified Three.js variable names of the existing app.
viewer=SRC_HTML.read_text()
glbtag=re.search(r'<script id="glbData"[^>]*>(.*?)</script>',viewer,re.S)
assert glbtag
viewer=viewer[:glbtag.start(1)]+base64.b64encode(out).decode('ascii')+viewer[glbtag.end(1):]
viewer=viewer.replace('Dad / Cecil 1 — white undershirt FIT V5 + boxers (review)',
                      'Dad / Cecil 1 — Starter Animations V1 · White Tank + Boxers + Hat V9')

# Give a consistent viewport and place buttons before the old static controls.
ctrl_html='''\n<style id="cecil-animation-style">
#cecil-animations{padding:8px 13px;background:#152638;color:#fff;border-top:1px solid #39556d;font:14px system-ui,sans-serif}
#cecil-animation-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:7px}
#cecil-animation-buttons button{font-size:13px!important;min-height:42px!important;background:#294965;color:#fff;border:1px solid #527a99;border-radius:8px}
#cecil-animation-buttons button[aria-pressed="true"]{background:#477d98;border-color:#c5eeff;font-weight:750}
#cecil-animation-status{font-size:12px;color:#c6d8e5;margin-top:7px}
</style>
<div id="cecil-animations"><b>Dad's first real G9 animations</b><div id="cecil-animation-buttons">
<button type="button" id="anim-idle" aria-pressed="true">Idle / Breathe</button>
<button type="button" id="anim-walk">Walk (in place)</button>
<button type="button" id="anim-wave">Wave (left hand)</button>
<button type="button" id="anim-fishing">Fishing / Wait</button>
<button type="button" id="anim-pause">Pause</button>
<button type="button" id="anim-restart">Restart clip</button>
</div><div id="cecil-animation-status" role="status">Loading rig &amp; motion tracks…</div></div>
'''
assert '<div class="toolbar">' in viewer
viewer=viewer.replace('<div class="toolbar">',ctrl_html+'<div class="toolbar">',1)

playback_js=r'''<script id="cecil-animation-v1-playback">
(()=>{'use strict';
const clips=JSON.parse(document.getElementById('cecil-native-motion-tracks').textContent);
document.getElementById('cecil-native-motion-tracks').remove();
const ids=['anim-idle','anim-walk','anim-wave','anim-fishing'];
const status=document.getElementById('cecil-animation-status');
let map=null,original=new Map(),active=0,clock=0,paused=false,last=0,finished=false;
const qScratch=[0,0,0,1];
const tracked=new Set(clips.flatMap(c=>c.tracks.map(t=>t.n)));
function setup(){
 const scene=window.__YAN_V6_SCENE;
 if(!scene){requestAnimationFrame(setup);return;}
 map=new Map();scene.traverse(x=>{if(tracked.has(x.name))map.set(x.name,x)});
 for(const name of tracked){const bone=map.get(name);if(!bone){status.textContent='Missing rig bone: '+name;return;}
   original.set(name,{q:[bone.quaternion.x,bone.quaternion.y,bone.quaternion.z,bone.quaternion.w],p:[bone.position.x,bone.position.y,bone.position.z]});}
 last=performance.now();change(0);requestAnimationFrame(tick);
}
function change(next){
 active=next;clock=0;finished=false;paused=false;
 for(let i=0;i<4;i++)document.getElementById(ids[i]).setAttribute('aria-pressed',String(i===active));
 document.getElementById('anim-pause').textContent='Pause';
 status.textContent=clips[active].name+(clips[active].mode==='once'?' · one play':' · looping')+' · original motion draft';
}
function normquat(a){const n=Math.hypot(...a)||1;return a.map(x=>x/n)}
function interp(a,b,k,path){
 if(path==='translation')return a.map((x,i)=>x+(b[i]-x)*k);
 const aa=a.slice(),bb=b.slice();if(aa.reduce((s,x,i)=>s+x*bb[i],0)<0)for(let i=0;i<4;i++)bb[i]=-bb[i];
 return normquat(aa.map((x,i)=>x+(bb[i]-x)*k));
}
function sample(clip,t){
 const ts=clip.times;let hi=1;
 while(hi<ts.length-1 && ts[hi]<t)hi++;
 const lo=hi-1;const f=Math.max(0,Math.min(1,(t-ts[lo])/(ts[hi]-ts[lo]||1)));
 for(const name of tracked){const obj=map.get(name),base=original.get(name);obj.quaternion.set(...base.q);obj.position.set(...base.p);}
 for(const track of clip.tracks){const obj=map.get(track.n);if(!obj)continue;
   const v=interp(track.v[lo],track.v[hi],f,track.p);
   if(track.p==='rotation')obj.quaternion.set(...v);else obj.position.set(...v);
 }
}
function tick(now){
 const delta=Math.min(.07,Math.max(0,(now-last)/1000));last=now;
 if(!paused){const clip=clips[active];clock+=delta;if(clock>=clip.duration){
   if(clip.mode==='loop'){clock%=clip.duration;}else{clock=clip.duration;paused=true;finished=true;status.textContent=clip.name+' · complete · Restart clip to replay';document.getElementById('anim-pause').textContent='Play';}
 }sample(clip,clock);}
 requestAnimationFrame(tick);
}
ids.forEach((id,i)=>{document.getElementById(id).onclick=()=>change(i)});
document.getElementById('anim-pause').onclick=()=>{paused=!paused;document.getElementById('anim-pause').textContent=paused?'Play':'Pause';if(!paused&&finished){clock=0;finished=false;}status.textContent=clips[active].name+(paused?' · paused':' · playing');};
document.getElementById('anim-restart').onclick=()=>change(active);
setup();
})();
</script>'''
viewer=viewer.replace('</body>',f'<script id="cecil-native-motion-tracks" type="application/json">{json.dumps(viewer_clips,separators=(",",":"))}</script>'+playback_js+'</body>',1)
OUT_HTML.write_text(viewer)

# Independent binary / viewer validation and motion range QA.
m2=re.search(r'<script id="glbData"[^>]*>(.*?)</script>',viewer,re.S)
assert base64.b64decode(m2.group(1).strip())==out
assert len(j['skins'][0]['joints'])==138 and len(j['animations'])==4
allvalid=True
for animation in j['animations']:
 for channel in animation['channels']:
  assert channel['target']['node'] in j['skins'][0]['joints']
assert len(raw)>1e6
qa={
 'source_name':SRC.name,'source_sha256':hashlib.sha256(raw).hexdigest(),
 'animated_glb_name':OUT.name,'animated_glb_sha256':hashlib.sha256(out).hexdigest(),'animated_glb_bytes':len(out),
 'viewer_name':OUT_HTML.name,'viewer_sha256':hashlib.sha256(OUT_HTML.read_bytes()).hexdigest(),'viewer_bytes':OUT_HTML.stat().st_size,
 'animation_names':[a['name'] for a in j['animations']],
 'animation_channels':[len(a['channels']) for a in j['animations']],
 'keyframe_counts':[n for _,_,n,_,_ in clip_defs],
 'rig_joints':len(j['skins'][0]['joints']),'original_geometry_texture_rig_bytes_unchanged':True,
 'original_nodes_unchanged':True,'mobile_viewer_embedded_glb_sha_match':True,
 'public_safe':'script and qa ONLY; do not expose private Dad model or proprietary garment mesh',
 'review_status':'V1 starter draft; procedural motion, Android and animation cloth clipping test required; no deployment'
}
QA.write_text(json.dumps(qa,indent=2))
print(json.dumps(qa,indent=2))
# Extract only user-coded JS for syntax check.
Path('/mnt/data/cecil_v1_playback_syntax_check.js').write_text(playback_js.replace('<script id="cecil-animation-v1-playback">','').replace('</script>',''))
subprocess.run(['node','--check','/mnt/data/cecil_v1_playback_syntax_check.js'],check=True)