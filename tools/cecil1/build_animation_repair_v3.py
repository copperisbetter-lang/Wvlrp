#!/usr/bin/env python3
"""Cecil 1 V3 non-destructive animation review patch.

Inputs are locally held private Cecil family GLBs and owner-supplied real garment
assets (as packaged into prior V1/V2 model). DO NOT publish model or 3rd-party
geometry in a public GitHub repo. Publicly commit only this builder + QA.
"""
from pathlib import Path
import sys, json, base64, re, hashlib, math
import numpy as np
import trimesh
from scipy.spatial.transform import Rotation as R
sys.path.insert(0,'/mnt/data')
from cecil_animation_geometry_tools import GLB

ROOT=Path('/mnt/data')
BASE=ROOT/'CECIL1_DAD_ANIMATIONS_V2_WALK_WAVE_SEATED_FISH.glb'
V1=ROOT/'CECIL1_DAD_STARTER_ANIMATIONS_V1.glb'
INHTML=ROOT/'CECIL1_DAD_ANIMATIONS_V2_WALK_WAVE_SEATED_FISH_VIEWER.html'
OUT=ROOT/'CECIL1_DAD_ANIMATIONS_V3_WAVE_CLASP_FIT.glb'
HTML=ROOT/'CECIL1_DAD_ANIMATIONS_V3_WAVE_CLASP_FIT_VIEWER.html'
QA=ROOT/'CECIL1_DAD_ANIMATIONS_V3_QA.json'

G=GLB(BASE);S=GLB(V1);j=G.j
assert len(j['skins'][0]['joints'])==138 and len(j['animations'])==4
assert len(G.j['meshes'])==5
old_j=json.loads(json.dumps(j));old_binary=bytes(G.data)
prim=j['meshes'][4]['primitives'][0]
a_pos=prim['attributes']['POSITION'];a_norm=prim['attributes']['NORMAL']
P,pa=G.arr(a_pos);N,na=G.arr(a_norm)
P1,_=S.arr(S.j['meshes'][4]['primitives'][0]['attributes']['POSITION'])
orig=P.copy()
ratio=.35 # retain 35% of V2-wide fit expansion in outer thighs
p=P1 + ratio*(P-P1)
xx,yy,zz=p.T
# Only front gusset needed clearance in V1 at alternating step phases.
# Localized, smoothly faded 16mm ease, NOT an overwide thigh shell.
gusset=np.exp(-.5*(xx/.060)**2)*np.exp(-.5*((yy-.849)/.043)**2)*np.clip((zz+.005)/.070,0,1)
p[:,2]+=0.016*gusset
P[:]=p.astype(np.float32)
faces,_=G.arr(prim['indices']);faces=faces.reshape(-1,3).astype(int)
N[:]=trimesh.Trimesh(vertices=p,faces=faces,process=False).vertex_normals.astype(np.float32)
pa['min']=p.min(0).astype(float).tolist();pa['max']=p.max(0).astype(float).tolist()

# Keep actual approved body and all materials, hat, tank & skeleton unchanged.
j['animations']=j['animations'][:2]
nameid=G.byname
axis=np.array([.1973,-.1786,.0659],float);axis/=np.linalg.norm(axis)
hip0=np.array(G.nodes[nameid['DAZ_G9_hip']]['translation'],float)

def smooth(a,b,x):
 k=np.clip((x-a)/(b-a),0,1)
 return float(k*k*(3-2*k))
def quat(e):return R.from_euler('xyz',e,degrees=True).as_quat().astype(np.float32)

# V2 was +90 degrees and exposed back of the waving hand. A front camera comparison
# of native CPU-skinned models shows -75deg from V1 yields front-facing left palm.
def wave_v3(t,d):
 up=smooth(0,.75,t)*(1-smooth(d-.75,d,t))
 wobble=math.sin(2*math.pi*2.3*(t-.7))*up
 ang={
 'l_shoulder':(0,0,13*up), 'l_upperarm':(-9*up,0,59*up),
 'l_forearm':(-9*up,0,41*up),'head':(0,-8*up,-2*up),
 'spine4':(0,-3.3*up,0), 'r_upperarm':(0,0,-2*up),
 }
 vals={f'DAZ_G9_{name}':quat(v) for name,v in ang.items()}
 vals['DAZ_G9_l_forearmtwist1']=R.from_rotvec(axis*math.radians(-25*up)).as_quat().astype('f4')
 vals['DAZ_G9_l_forearmtwist2']=R.from_rotvec(axis*math.radians(-50*up)).as_quat().astype('f4')
 vals['DAZ_G9_l_hand']=(R.from_rotvec(axis*math.radians(-75*up))*R.from_euler('xyz',[0,11*wobble,20*wobble],degrees=True)).as_quat().astype('f4')
 return vals,{}

# Wrist target solved against the *actual* 138-joint kinematic chain:
# L 0.0013/0.6105/0.3645m and R -0.0451/0.6101/0.3649m, 46.4mm apart.
# Right 4 digits curl into a fist, left digits loosely cup around them.
ARM_ANGLES={
'l_upperarm':[-41.1,-6.1,-70.7], 'r_upperarm':[-41.7,2.6,67.7],
'l_forearm':[-24.2,7.3,-39.5],'r_forearm':[-25.2,-1.9,43.4],
}
V2_ARMS={
'l_upperarm':[-42,0,-66], 'r_upperarm':[-42,0,66],
'l_forearm':[-26,0,-44],'r_forearm':[-26,0,44],
}

def fishing_v3(t,d):
 sit=smooth(.12,1.9,t)
 grip=smooth(1.30,2.5,t)
 breath=math.sin(2*math.pi*(t-1.9)/3.7)*sit
 ang={
 'spine1':(8*sit+.8*breath,0,0), 'spine2':(5*sit,0,0),
 'spine3':(3*sit,1.1*breath,0),'spine4':(-2*sit,0,0),
 'neck1':(-5*sit,0,0),'head':(-6*sit+1.1*breath,3*sit+1.5*breath,0),
 'l_thigh':(-87*sit,0,1*sit),'r_thigh':(-87*sit,0,-1*sit),
 'l_shin':(93*sit,0,0),'r_shin':(93*sit,0,0),
 'l_foot':(-7*sit,0,0),'r_foot':(-7*sit,0,0),
 }
 for n,orig in V2_ARMS.items():
  refined=np.array(ARM_ANGLES[n],float)
  ang[n]=tuple(np.array(orig,float)*sit+(refined-np.array(orig,float))*grip)
 ang['l_hand']=(0,0,12*grip)
 ang['r_hand']=(0,0,-15*grip)
 for side in ['r','l']:
  sign=1 if side=='r' else -1
  strength=90 if side=='r' else 36
  for f in ['index','mid','ring','pinky']:
   for joint,w in [(1,1),(2,1),(3,.65)]:
    ang[f'{side}_{f}{joint}']=(0,0,sign*strength*w*grip)
  for joint,w in [(1,1),(2,.8),(3,.7)]:
    ang[f'{side}_thumb{joint}']=(0,0,sign*(40 if side=='r' else 35)*w*grip)
 vals={f'DAZ_G9_{n}':quat(v) for n,v in ang.items()}
 trans=(hip0+np.array([0,-.45*sit,.01*sit])).astype('f4')
 return vals,{'DAZ_G9_hip':trans}

binary=G.data
def put(vals,kind):
 data=np.asarray(vals,dtype='<f4').reshape(-1,{'SCALAR':1,'VEC3':3,'VEC4':4}[kind]);
 binary.extend(b'\0'*((-len(binary))%4)); ofs=len(binary);binary.extend(data.tobytes());
 vid=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':ofs,'byteLength':data.nbytes});
 ac={'bufferView':vid,'byteOffset':0,'componentType':5126,'count':len(data),'type':kind}
 if kind=='SCALAR':ac['min']=[float(data.min())];ac['max']=[float(data.max())]
 aid=len(j['accessors']);j['accessors'].append(ac);return aid

def build(title,duration,samples,pose_fn,repeat):
 tt=np.linspace(0,duration,samples,dtype=np.float32)
 poses=[pose_fn(float(t),duration) for t in tt]
 timeacc=put(tt,'SCALAR');samplers=[];channels=[]
 for path,ns in [('rotation',sorted(set().union(*(a[0].keys() for a in poses)))),
                 ('translation',sorted(set().union(*(a[1].keys() for a in poses))))]:
  for n in ns:
   vals=np.asarray([(a if path=='rotation' else b).get(n,[0,0,0,1] if path=='rotation' else hip0) for a,b in poses],dtype='f4')
   if path=='rotation':
    vals/=np.linalg.norm(vals,axis=1,keepdims=True)
    for k in range(1,len(vals)):
     if np.dot(vals[k-1],vals[k])<0:vals[k]*=-1
   acc=put(vals,'VEC4' if path=='rotation' else 'VEC3');s=len(samplers)
   samplers.append({'input':timeacc,'output':acc,'interpolation':'LINEAR'})
   channels.append({'sampler':s,'target':{'node':nameid[n],'path':path}})
 j['animations'].append({'name':title,'channels':channels,'samplers':samplers,'extras':{'duration_s':duration,'repeat':repeat,'purpose':'Cecil1 V3 user review'}})

build('Wave · Front Palm (V3)',3.3,67,wave_v3,'once')
build('Fishing · Right Fist Held in Left Hand (Draft V3)',8.0,81,fishing_v3,'once')
assert len(j['animations'])==4
G.write(OUT)
model=OUT.read_bytes()

# Viewer has a separate JSON motion table; regenerate from exact GLB accessors,
# rather than trusting names or updating only GLB tracks (which would leave buttons stale).
D=GLB(OUT)
clips=[]
for ani in D.j['animations']:
  samp=ani['samplers'][0];ts,_=D.arr(samp['input']);ts=ts[:,0].astype(float)
  tracks=[]
  for ch in ani['channels']:
   sam=ani['samplers'][ch['sampler']];v,_=D.arr(sam['output']);
   tracks.append({'n':D.nodes[ch['target']['node']]['name'], 'p':ch['target']['path'],'v':np.round(v.astype(float),7).tolist()})
  clips.append({'name':ani['name'],'duration':float(ts[-1]),'mode':ani.get('extras',{}).get('repeat','loop'),'times':np.round(ts,6).tolist(),'tracks':tracks})
ht=INHTML.read_text()
pat=r'(<script id="glbData"[^>]*>)(.*?)(</script>)'
assert re.search(pat,ht,re.S)
ht=re.sub(pat,lambda m:m.group(1)+base64.b64encode(model).decode()+m.group(3),ht,flags=re.S)
pat=r'(<script id="cecil-native-motion-tracks"[^>]*>)(.*?)(</script>)'
assert re.search(pat,ht,re.S)
ht=re.sub(pat,lambda m:m.group(1)+json.dumps(clips,separators=(',',':'))+m.group(3),ht,flags=re.S)
ht=ht.replace('Dad / Cecil 1 — Animations V2 · Better Walk, Palm-Forward Wave, Seated Fishing Draft',
              'Dad / Cecil 1 — Animations V3 · Slimmer Boxers, Correct Wave & Hand Clasp')
ht=ht.replace('Cecil 1 animations V2 — review','Cecil 1 animations V3 — review')
ht=ht.replace('Sit / Fish (draft)</button>','Sit / Hand Clasp (draft)</button>')
ht=ht.replace('V2 review · not final','V3 review · not final')
HTML.write_text(ht)
assert hashlib.sha256(base64.b64decode(re.search(r'<script id="glbData"[^>]*>(.*?)</script>',ht,re.S).group(1).strip())).hexdigest()==hashlib.sha256(model).hexdigest()
assert len(D.j['skins'][0]['joints'])==138
assert len(D.j['animations'][3]['channels'])>35
assert old_j['nodes']==D.j['nodes']
assert old_j['meshes']==D.j['meshes'] # material and primitive identities unchanged except accessor extrema above