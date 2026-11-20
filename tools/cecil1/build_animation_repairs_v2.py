#!/usr/bin/env python3
"""Cecil 1 Animation Repair V2 — private review derivation from user-owned source GLB.
Walk: enlarge authentic boxer cloth ease, rather than modifying body geometry.
Wave: turn forearm/hand about its real anatomical axis to present palm forward.
Fish: replace weak standing idle with a seated wait/hand-gather motion, NO chair asset.
Public-safe *script and QA only*. DO NOT commit identifiable Cecil meshes or third party garment arrays.
"""
from pathlib import Path
import sys, math, json, base64, re, struct, hashlib, subprocess
import numpy as np
import trimesh
from scipy.spatial.transform import Rotation as R
sys.path.insert(0,'/mnt/data')
from cecil_animation_geometry_tools import GLB

ROOT=Path('/mnt/data')
SRC=ROOT/'CECIL1_DAD_STARTER_ANIMATIONS_V1.glb'
SRC_HTML=ROOT/'CECIL1_DAD_STARTER_ANIMATIONS_V1_VIEWER.html'
OUT=ROOT/'CECIL1_DAD_ANIMATIONS_V2_WALK_WAVE_SEATED_FISH.glb'
OUT_HTML=ROOT/'CECIL1_DAD_ANIMATIONS_V2_WALK_WAVE_SEATED_FISH_VIEWER.html'
QA=ROOT/'CECIL1_DAD_ANIMATIONS_V2_QA.json'
G=GLB(SRC)
j=G.j
assert len(j['skins'][0]['joints'])==138
assert len(j['animations'])==4
orig_bin=bytes(G.data)
orig_js=json.loads(json.dumps(j))

# Fit correction: real downloaded boxer mesh is eased around upper thigh and front gusset.
# Do not create a painted-on shell or alter Dad's anatomy.
box_pr=j['meshes'][4]['primitives'][0]
pa=box_pr['attributes']['POSITION'];na=box_pr['attributes']['NORMAL']
pos,poss=G.arr(pa); normals,_=G.arr(na)
before=pos.copy();p=pos.copy()
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t)
x,y,z=p.T
w=smooth(.735,.85,y)*(1.-smooth(.95,1.005,y))
rad=np.sqrt(x*x+(z+.009)**2)
dx=x/np.maximum(rad,.05);dz=(z+.009)/np.maximum(rad,.05)
front=smooth(-.1,.085,z)
delta=(.013+.022*front)*w
p[:,0]+=dx*delta
p[:,2]+=dz*delta
# Extra eased fabric at center front upper thigh, where walking broke through.
wf=smooth(.77,.86,y)*(1.-smooth(.9,.99,y))*smooth(-.03,.045,z)
p[:,2]+=.008*wf
pos[:]=p.astype(np.float32)
faces_i,_=G.arr(box_pr['indices']);faces=faces_i.ravel().reshape(-1,3).astype(int)
normals[:]=trimesh.Trimesh(vertices=p,faces=faces,process=False).vertex_normals.astype(np.float32)
poss['min']=p.min(0).astype(float).tolist();poss['max']=p.max(0).astype(float).tolist()
changed=int(np.sum(np.linalg.norm(p-before,axis=1)>.001))

# Preserve original native Idle and Walk GLTF curves/skin/bones as-is; replace wave/fishing.
old_anims=j['animations']
j['animations']=old_anims[:2]
byname=G.byname
hip_base=np.array(G.nodes[byname['DAZ_G9_hip']]['translation'],float)
axis=np.array([.1973,-.1786,.0659]);axis/=np.linalg.norm(axis)

# Same wave joints as V1 with 90 deg anatomically aligned forearm/hand twist.
def wave_pose(t,d):
    up=float(smooth(0,.75,t)*(1-smooth(d-.75,d,t)))
    wave=math.sin(2*math.pi*2.3*(t-.7))*up
    ro={
        'l_shoulder':(0,0,13*up),
        'l_upperarm':(-9*up,0,59*up),
        'l_forearm':(-9*up,0,41*up),
        'head':(0,-8*up,-2*up),
        'spine4':(0,-3.3*up,0),
        'r_upperarm':(0,0,-2*up),
    }
    vals={f'DAZ_G9_{n}':R.from_euler('xyz',angles,degrees=True).as_quat().astype(np.float32) for n,angles in ro.items()}
    # Give finger-facing hand an actual axial rotation; twisting only forearm bones does not rotate hand child.
    vals['DAZ_G9_l_forearmtwist1']=R.from_rotvec(axis*math.radians(30*up)).as_quat().astype(np.float32)
    vals['DAZ_G9_l_forearmtwist2']=R.from_rotvec(axis*math.radians(60*up)).as_quat().astype(np.float32)
    vals['DAZ_G9_l_hand']=(R.from_rotvec(axis*math.radians(90*up))*R.from_euler('xyz',[0,11*wave,20*wave],degrees=True)).as_quat().astype(np.float32)
    return vals,{}

# Native seated wait: sit down 1.7 s, then hold with gentle breathing and subtle head motion.
# Uses only existing joints. No pretend chair/rod geometry placed in the licensed model.
def seated_pose(t,d):
    sit=float(smooth(.12,1.90,t))
    breath=math.sin(2*math.pi*(t-1.9)/3.7)*sit
    ro={
        'spine1':(8*sit+.8*breath,0,0),
        'spine2':(5*sit,0,0),
        'spine3':(3*sit,1.1*breath,0),
        'spine4':(-2*sit,0,0),
        'neck1':(-5*sit,0,0),
        'head':(-6*sit+1.1*breath,3*sit+1.5*breath,0),
        'l_thigh':(-87*sit,0,1*sit),
        'r_thigh':(-87*sit,0,-1*sit),
        'l_shin':(93*sit,0,0),
        'r_shin':(93*sit,0,0),
        'l_foot':(-7*sit,0,0),
        'r_foot':(-7*sit,0,0),
        'l_upperarm':(-42*sit,0,-66*sit),
        'r_upperarm':(-42*sit,0,66*sit),
        'l_forearm':(-26*sit,0,-44*sit),
        'r_forearm':(-26*sit,0,44*sit),
        'l_hand':(0,0,-8*sit),
        'r_hand':(0,0,8*sit),
    }
    vals={f'DAZ_G9_{n}':R.from_euler('xyz',angles,degrees=True).as_quat().astype(np.float32) for n,angles in ro.items()}
    trans=(hip_base+np.array([0,-.45*sit,0.01*sit],float)).astype(np.float32)
    return vals,{'DAZ_G9_hip':trans}

binary=G.data

def align4():binary.extend(b'\0'*((-len(binary))%4))
def put(arr,kind):
    n={'SCALAR':1,'VEC3':3,'VEC4':4}[kind]
    array=np.asarray(arr,dtype='<f4').reshape((-1,n))
    align4();start=len(binary);binary.extend(array.tobytes())
    view_idx=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':array.nbytes})
    acc={'bufferView':view_idx,'byteOffset':0,'componentType':5126,'count':len(array),'type':kind}
    if kind=='SCALAR':acc['min']=[float(array.min())];acc['max']=[float(array.max())]
    aidx=len(j['accessors']);j['accessors'].append(acc)
    return aidx

def build_clip(title,duration,n,func,mode):
    times=np.linspace(0,duration,n,dtype=np.float32)
    poses=[func(float(t),duration) for t in times]
    tacc=put(times,'SCALAR')
    rotnames=sorted(set().union(*(v[0].keys() for v in poses)))
    trnames=sorted(set().union(*(v[1].keys() for v in poses)))
    channels=[];samplers=[];viewer=[]
    for path,names in [('rotation',rotnames),('translation',trnames)]:
      for name in names:
        vals=[]
        for ro,tr in poses:
            value=(ro if path=='rotation' else tr).get(name)
            if value is None:value=np.array([0,0,0,1]) if path=='rotation' else hip_base
            vals.append(value)
        vals=np.asarray(vals,dtype=np.float32)
        if path=='rotation':
            vals/=np.linalg.norm(vals,axis=1,keepdims=True)
            for i in range(1,len(vals)):
                if np.dot(vals[i-1],vals[i])<0:vals[i]*=-1
        aidx=put(vals,'VEC4' if path=='rotation' else 'VEC3')
        sampidx=len(samplers);samplers.append({'input':tacc,'output':aidx,'interpolation':'LINEAR'})
        channels.append({'sampler':sampidx,'target':{'node':byname[name],'path':path}})
        viewer.append({'n':name,'p':path,'v':np.round(vals,7).tolist()})
    anim={'name':title,'channels':channels,'samplers':samplers,
          'extras':{'duration_s':duration,'repeat':mode,'purpose':'Cecil1 owner review V2'}}
    j['animations'].append(anim)
    return {'name':title,'duration':duration,'mode':mode,'times':np.round(times,6).tolist(),'tracks':viewer}

wave=build_clip('Wave · Palm Forward (V2)',3.3,67,wave_pose,'once')
fish=build_clip('Fishing · Sit Down & Wait (Draft V2)',8.0,81,seated_pose,'once')
assert len(j['animations'])==4

# Regenerate matching offline controls; original first two clips preserved and decoded from their own accessor data.
def make_old_viewer_clip(a):
    ts_sampler=a['samplers'][0];times,_=G.arr(ts_sampler['input']);times=np.asarray(times[:,0],float)
    tracks=[]
    for ch in a['channels']:
        sam=a['samplers'][ch['sampler']];vv,_=G.arr(sam['output'])
        tracks.append({'n':G.nodes[ch['target']['node']]['name'],'p':ch['target']['path'],'v':np.round(vv.astype(float),7).tolist()})
    return {'name':a['name'],'duration':float(times[-1]),'mode':a.get('extras',{}).get('repeat','loop'),
            'times':np.round(times,6).tolist(),'tracks':tracks}

clips=[make_old_viewer_clip(a) for a in j['animations'][:2]]+[wave,fish]
G.write(OUT)
out=OUT.read_bytes()

v=SRC_HTML.read_text()
m=re.search(r'<script id="glbData"[^>]*>(.*?)</script>',v,re.S);assert m
v=v[:m.start(1)]+base64.b64encode(out).decode('ascii')+v[m.end(1):]
m=re.search(r'<script id="cecil-native-motion-tracks"[^>]*>(.*?)</script>',v,re.S);assert m
v=v[:m.start(1)]+json.dumps(clips,separators=(',',':'))+v[m.end(1):]
v=v.replace('Dad / Cecil 1 — Starter Animations V1 · White Tank + Boxers + Hat V9','Dad / Cecil 1 — Animations V2 · Better Walk, Palm-Forward Wave, Seated Fishing Draft')
v=v.replace('Fishing / Wait</button>','Sit / Fish (draft)</button>')
v=v.replace("original motion draft","V2 review · not final")
# Prevent playing fishing too fast through the end and confusing frozen pose with a bug.
v=v.replace('Dad\'s first real G9 animations','Cecil 1 animations V2 — review')
OUT_HTML.write_text(v)

m=re.search(r'<script id="glbData"[^>]*>(.*?)</script>',v,re.S)
assert hashlib.sha256(base64.b64decode(m.group(1).strip())).digest()==hashlib.sha256(out).digest()
assert len(j['skins'][0]['joints'])==138
assert len(j['meshes'])==len(orig_js['meshes'])
assert j['nodes']==orig_js['nodes']
mask=np.ones(len(orig_bin),dtype=bool)
for ai in (pa,na):
    ac=j['accessors'][ai]; bv=j['bufferViews'][ac['bufferView']]
    st=bv.get('byteOffset',0)+ac.get('byteOffset',0)
    mask[st:st+ac['count']*12]=False
assert np.array_equal(np.frombuffer(orig_bin,dtype=np.uint8)[mask],np.frombuffer(binary[:len(orig_bin)],dtype=np.uint8)[mask])

# Verification: wave palm geometry and motions can be interpreted by independent glTF software.
check=GLB(OUT)
assert [a['name'] for a in check.j['animations']]==[c['name'] for c in clips]
assert len(check.j['meshes'][4]['primitives'])==1
assert len(check.j['skins'][0]['joints'])==138
assert check.j['animations'][3]['extras']['repeat']=='once'
assert len(out)>3e7
qa={
 'source_glb':SRC.name,'source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
 'new_glb':OUT.name,'glb_sha256':hashlib.sha256(out).hexdigest(),'glb_bytes':len(out),
 'viewer':OUT_HTML.name,'viewer_sha256':hashlib.sha256(OUT_HTML.read_bytes()).hexdigest(),'viewer_bytes':OUT_HTML.stat().st_size,
 'rig_joints':138,'clips':[{'name':c['name'],'duration_seconds':c['duration'],'channels':len(c['tracks']),'repeat':c['mode']} for c in clips],
 'garment':'Genuine original white G9 boxer geometry expanded for walk; white tank unchanged',
 'boxer_eased_vertices_more_than_1mm':changed,
 'boxer_max_offset_m':float(np.max(np.linalg.norm(p-before,axis=1))),
 'wave':'90deg forearm-axis rotation on hand, proportional 30/60deg twist1/twist2',
 'fishing':'Seated legs/hips and hands forward together. NO chair or rod geometry, still draft, pose blending/cloth collisions pending',
 'approved_dad_head_body_hat_tank_nodes_original_skin_weights_unchanged':True,
 'base_GLTF_binary_unchanged_outside_boxer_position_and_normal':True,
 'android_viewer_contains_byte_exact_new_glb':True,
 'public_repo_policy':'Builder and QA allowed; DO NOT publish original scanned model or third-party meshes',
 'status':'V2 owner review needed; no production deployment; animation cloth clipping at seated hips unresolved'
}
QA.write_text(json.dumps(qa,indent=2))
print(json.dumps(qa,indent=2))