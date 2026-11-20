#!/usr/bin/env python3
"""Create seat-only non-destructive corrective morphs for genuine free white Cecil 1 clothing.

Base: Cecil1 animations V4 GLB, preserving its body, head, hat, G9 rig and 4 motions.
Cloth correctives are native glTF morph targets (tank and boxer meshes) driven ONLY
by the seated fishing clip. Mobile HTML playback is patched for weights tracks.
Never publish the combined private family model or vendor meshes publicly.
"""
from pathlib import Path
import sys, json, base64, re, hashlib, struct
import numpy as np, trimesh
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix, diags
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0,'/mnt/data')
from cecil_animation_geometry_tools import GLB
import vtk

ROOT=Path('/mnt/data')
BASE=ROOT/'CECIL1_DAD_ANIMATIONS_V4_FORWARD_LEAN_FISH.glb'
INHTML=ROOT/'CECIL1_DAD_ANIMATIONS_V4_FORWARD_LEAN_FISH_VIEWER.html'
OUT=ROOT/'CECIL1_DAD_ANIMATIONS_V5C_SEATED_CLOTH_CORRECTION.glb'
HTML=ROOT/'CECIL1_DAD_ANIMATIONS_V5C_SEATED_CLOTH_CORRECTION_VIEWER.html'
QA=ROOT/'CECIL1_DAD_ANIMATIONS_V5C_SEATED_CLOTH_QA.json'
GRID=ROOT/'CECIL1_DAD_ANIMATIONS_V5C_SEATED_CLOTH_COMPARISON.jpg'

g=GLB(BASE)
j=g.j
original_meta=json.loads(json.dumps(j))
orig_bin=bytes(g.data)
assert len(j['skins'][0]['joints'])==138 and len(j['animations'])==4
pose=g.get_pose_at(3,7.2); mats=g.skin_mats(pose)

# Body reference surface from intact G9 anatomy. No body data is modified.
B=[]; BN=[]
for pidx in [2,5]:
 prim=j['meshes'][1]['primitives'][pidx]
 xyz=g.skinned(prim,pose,mats)
 fi,_=g.arr(prim['indices'])
 mesh=trimesh.Trimesh(vertices=xyz,faces=fi.reshape(-1,3),process=False)
 B.append(mesh.vertices);BN.append(mesh.vertex_normals)
B=np.vstack(B);BN=np.vstack(BN)
tree=cKDTree(B)

# Append to glTF BIN.
def put(values,typ):
 d=np.asarray(values,dtype='<f4').reshape(-1,{'SCALAR':1,'VEC3':3,'VEC4':4}[typ])
 g.data.extend(b'\0'*((-len(g.data))%4))
 ofs=len(g.data);g.data.extend(d.tobytes());
 bv=len(j['bufferViews'])
 j['bufferViews'].append({'buffer':0,'byteOffset':ofs,'byteLength':d.nbytes})
 accessor={'bufferView':bv,'componentType':5126,'count':len(d),'type':typ}
 if typ=='SCALAR': accessor['min']=[float(d.min())];accessor['max']=[float(d.max())]
 a=len(j['accessors']);j['accessors'].append(accessor)
 return a


def make_smooth_matrix(faces,n):
 edges=np.concatenate([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]])
 edges=np.concatenate([edges,edges[:,::-1]])
 data=np.ones(len(edges),dtype=np.float32)
 adjacency=coo_matrix((data,(edges[:,0],edges[:,1])),shape=(n,n)).tocsr()
 adjacency.data[:]=1.0
 deg=np.asarray(adjacency.sum(1)).reshape(-1)
 deg[deg<1]=1
 return diags(1/deg) @ adjacency


def solve_garment(mesh_id):
 prim=j['meshes'][mesh_id]['primitives'][0]
 a=prim['attributes'];p,_=g.arr(a['POSITION']);n_orig,_=g.arr(a['NORMAL']);
 p=p.copy();norm_orig=n_orig.copy()
 verts=g.skinned(prim,pose,mats)
 J,_=g.arr(a['JOINTS_0']);W,_=g.arr(a['WEIGHTS_0']);J=J.astype(np.int32);W=W.astype(np.float64)
 # Map each bind-position vector via weighted joints to posed space. Needed to un-pose the correction.
 blend=np.sum(mats[J][:,:,:3,:3]*W[:,:,None,None],axis=1)
 blend_inv=np.linalg.pinv(blend,rcond=1e-4)
 faces,_=g.arr(prim['indices']);faces=faces.reshape(-1,3).astype(np.int64)
 S=make_smooth_matrix(faces,len(p))
 cur=p.copy();total=np.zeros_like(p)
 steps=[]
 for it in range(5):
  # Current skinned position, from bind positions plus our still-building morph.
  h=np.column_stack([cur,np.ones(len(cur))])
  posed=np.einsum('nij,nj->ni',np.sum(mats[J]*W[:,:,None,None],axis=1),h)[:,:3]
  d,idx=tree.query(posed)
  normal=BN[idx]; v=posed-B[idx]
  signed=np.sum(v*normal,axis=1)
  # minimum offset from actual body surface, ignoring very distant geometry.
  gap=(0.0045-signed)
  pressure=(d<.070) & (gap>0)
  # avoid excessive amplification of near-tangent opposing surfaces
  want=np.minimum(gap,0.040)
  delta_pose=normal * (want*pressure)[:,None]
  # Remove outliers from near-seam nearest-body mismatches via mesh-graph smoothing.
  delta_bind=np.einsum('nij,nj->ni',blend_inv,delta_pose)
  length=np.linalg.norm(delta_bind,axis=1)
  delta_bind*=np.minimum(1.0, .040/np.maximum(length,1e-9))[:,None]
  for passidx in range(2):
   delta_bind=0.55*delta_bind + 0.45*(S@delta_bind)
  cur+=delta_bind
  total+=delta_bind
  neg_count=int(np.sum((signed<-.004)&(d<.07)))
  steps.append({'iteration':it+1,'penetrations_gt4mm':neg_count,'max_mm':float(np.max(np.linalg.norm(total,axis=1))*1000)})
  if neg_count<100 and it>2:break

 # Smooth final displacement one more pass, with conservative weighting to avoid stair-stepped cloth.
 smooth_total=total.copy()
 for zloop in range(22):
  smooth_total=0.48*smooth_total + 0.52*(S@smooth_total)
 if mesh_id==4:
  # Targeted side-waist easing where V4 shows broad exposed hip patches.
  # Clothing geometry is edited, not Dad's body or skin.
  xx,yy,zz=p.T
  # Waists around 0.88-0.98m bind; guard outer hips only, not thigh silhouette.
  waist=np.clip((yy-.855)/.070,0,1)
  waist=waist*waist*(3-2*waist)
  hip=np.clip((np.abs(xx)-.10)/.06,0,1)
  hip=hip*hip*(3-2*hip)
  seam=(waist*hip)
  smooth_total[:,0]+=np.sign(xx)*.016*seam
  # lift/re-seat top rim to bridge shirt/boxer gap in seated pose.
  top=np.clip((yy-.910)/.045,0,1)
  top=top*top*(3-2*top)
  smooth_total[:,1]+=.028*top
 else:
  xx,yy,zz=p.T
  # Lower hem near waistband gets a tiny outward ease so it does not cut through bent torso.
  hem=np.clip((.992-yy)/.09,0,1)
  hem=hem*hem*(3-2*hem)
  rr=np.sqrt(xx*xx+(zz+.015)**2)
  smooth_total[:,0]+=np.sign(xx)*.010*hem*np.clip(rr/.14,0,1)

 # keep conservative corrected positions; must be reversible through target weight=0.
 pos_final=p+smooth_total
 oldmesh=trimesh.Trimesh(vertices=p,faces=faces,process=False)
 newmesh=trimesh.Trimesh(vertices=pos_final,faces=faces,process=False)
 norm_delta=newmesh.vertex_normals - oldmesh.vertex_normals
 # normals: original authored n is not necessarily exact oldmesh normals. Difference is fine.
 pos_access=put(smooth_total,'VEC3');norm_access=put(norm_delta,'VEC3')
 prim['targets']=[{'POSITION':pos_access,'NORMAL':norm_access}]
 j['meshes'][mesh_id]['weights']=[0.0]
 j['meshes'][mesh_id].setdefault('extras',{})['targetNames']=['SeatedFitV5']
 post_dist,post_idx=tree.query(verts)
 final_pose=verts+np.einsum('nij,nj->ni',blend,smooth_total)
 dist,idx=tree.query(final_pose)
 signed=np.sum((final_pose-B[idx])*BN[idx],axis=1)
 original_signed=np.sum((verts-B[post_idx])*BN[post_idx],axis=1)
 return {
  'mesh_id':mesh_id,'vertices':len(p),
  'max_correction_cm':float(np.max(np.linalg.norm(smooth_total,axis=1))*100),
  'mean_correction_mm':float(np.mean(np.linalg.norm(smooth_total,axis=1))*1000),
  'penetrations_before_gt4mm':int(np.sum((original_signed<-.004)&(post_dist<.07))),
  'penetrations_after_gt4mm':int(np.sum((signed<-.004)&(dist<.07))),
  'geometry_iterations':steps,
  'correction':smooth_total
 }

results=[solve_garment(3),solve_garment(4)]

# Animate the native GLTF morph targets solely while seated, so walk & wave retain old fit.
# mesh nodes 142 and 143: actual skinned garment nodes in this GLB.
for mi in [3,4]:
 node_id=next(i for i,n in enumerate(j['nodes']) if n.get('mesh')==mi)
 # Every node with morphed mesh uses the mesh's weight baseline of zero.
 j['nodes'][node_id].setdefault('weights',[0.0])

fish=j['animations'][3]
ref=fish['samplers'][0]['input'];ts,_=g.arr(ref);ts=ts[:,0].copy()
values=np.asarray([max(0,min(1,(float(t)-.2)/1.8)) for t in ts],dtype=np.float32)
time_access=put(ts,'SCALAR')
for mi in [3,4]:
 node_id=next(i for i,n in enumerate(j['nodes']) if n.get('mesh')==mi)
 waccess=put(values,'SCALAR')
 sampler_idx=len(fish['samplers']);fish['samplers'].append({'input':time_access,'output':waccess,'interpolation':'LINEAR'})
 fish['channels'].append({'sampler':sampler_idx,'target':{'node':node_id,'path':'weights'}})

G=g
G.write(OUT)
model=OUT.read_bytes()
D=GLB(OUT)
assert len(D.j['animations'])==4 and len(D.j['skins'][0]['joints'])==138

# Rebuild custom mobile-player JSON track list, supporting the newly introduced morph weights.
clips=[]
for a in D.j['animations']:
 sam=a['samplers'][0];tt,_=D.arr(sam['input']);tt=tt[:,0].astype(float)
 tracks=[]
 for ch in a['channels']:
  sam=a['samplers'][ch['sampler']]
  vals,_=D.arr(sam['output'])
  tracks.append({'n':D.nodes[ch['target']['node']]['name'],'p':ch['target']['path'],'v':np.round(vals.astype(float),7).tolist()})
 clips.append({'name':a['name'],'duration':float(tt[-1]),'mode':a.get('extras',{}).get('repeat','loop'),'times':np.round(tt,6).tolist(),'tracks':tracks})
ht=INHTML.read_text()
ht=re.sub(r'(<script id="glbData"[^>]*>)(.*?)(</script>)',lambda m:m.group(1)+base64.b64encode(model).decode()+m.group(3),ht,flags=re.S)
ht=re.sub(r'(<script id="cecil-native-motion-tracks"[^>]*>)(.*?)(</script>)',lambda m:m.group(1)+json.dumps(clips,separators=(',',':'))+m.group(3),ht,flags=re.S)
ht=ht.replace('Dad / Cecil 1 — Animations V4 · Forward-Lean Fishing Pose Repair','Dad / Cecil 1 — Animations V5C · Seated Clothing Fit Review')
ht=ht.replace('Cecil 1 animations V4 — review','Cecil 1 animations V5 — review')
ht=ht.replace('Sit / Fish Wait (draft)</button>','Sit / Fish + Cloth Fix (draft)</button>')
ht=ht.replace('V4 review · not final','V5C review · not final')
# Crucial: modify the ORIGINAL mobile player (not minified vendor scripts).
ht=ht.replace("original.set(name,{q:[bone.quaternion.x,bone.quaternion.y,bone.quaternion.z,bone.quaternion.w],p:[bone.position.x,bone.position.y,bone.position.z]});",
              "original.set(name,{q:[bone.quaternion.x,bone.quaternion.y,bone.quaternion.z,bone.quaternion.w],p:[bone.position.x,bone.position.y,bone.position.z],w:(bone.morphTargetInfluences||[]).slice()});")
ht=ht.replace("obj.quaternion.set(...base.q);obj.position.set(...base.p);", "obj.quaternion.set(...base.q);obj.position.set(...base.p);if(obj.morphTargetInfluences&&base.w.length)obj.morphTargetInfluences[0]=base.w[0];")
ht=ht.replace("if(track.p==='rotation')obj.quaternion.set(...v);else obj.position.set(...v);",
              "if(track.p==='rotation')obj.quaternion.set(...v);else if(track.p==='weights'){if(obj.morphTargetInfluences)obj.morphTargetInfluences[0]=v[0];}else obj.position.set(...v);")
ht=ht.replace("if(path==='translation')return a.map((x,i)=>x+(b[i]-x)*k);", "if(path==='translation'||path==='weights')return a.map((x,i)=>x+(b[i]-x)*k);")
HTML.write_text(ht)

# QA render snapshots in resting pose and seated final, applying native morph manually before CPU skinning.
def pose_snapshot(base,clip,t,wt,out):
 T=GLB(base)
 pose=T.get_pose_at(clip,t)
 mats=T.skin_mats(pose)
 for mi,mesh in enumerate(T.j['meshes']):
  for prim in mesh['primitives']:
   at=prim['attributes']
   if not all(a in at for a in ('POSITION','JOINTS_0','WEIGHTS_0')):continue
   xyz,acc=T.arr(at['POSITION'])
   if prim.get('targets'):
    morph,_=T.arr(prim['targets'][0]['POSITION'])
    xyz[:]=xyz + wt*morph
   q=T.skinned(prim,pose,mats)
   xyz[:]=q.astype(np.float32)
   acc['min']=q.min(axis=0).astype(float).tolist();acc['max']=q.max(axis=0).astype(float).tolist()
   prim.pop('targets',None)
  mesh.pop('weights',None)
 T.j.pop('animations',None)
 for n in T.j['nodes']:
  n.pop('weights',None)
 T.write(out)
 return out

def render(path,angles,stem,zoom=1.55):
 ren=vtk.vtkRenderer(); ren.SetBackground(.10,.17,.27)
 win=vtk.vtkRenderWindow();win.SetOffScreenRendering(1);win.AddRenderer(ren);win.SetSize(750,850)
 imp=vtk.vtkGLTFImporter();imp.SetFileName(str(path));imp.SetRenderWindow(win);imp.Update()
 paths=[]
 for angle in angles:
  ren.ResetCamera();cam=ren.GetActiveCamera();cam.Azimuth(angle);cam.Zoom(zoom);win.Render()
  grab=vtk.vtkWindowToImageFilter();grab.SetInput(win);grab.Update()
  p=ROOT/f'{stem}_{angle}.png';wr=vtk.vtkPNGWriter();wr.SetFileName(str(p));wr.SetInputConnection(grab.GetOutputPort());wr.Write();paths.append(p)
 return paths

render(pose_snapshot(BASE,3,7.2,0.,ROOT/'v5c_cloth_before.glb'),[0,90,180],'v5c_cloth_before')
render(pose_snapshot(OUT,3,7.2,1.,ROOT/'v5c_cloth_after.glb'),[0,90,180],'v5c_cloth_after')
render(pose_snapshot(OUT,1,.55,0.,ROOT/'v5c_cloth_walk.glb'),[0],'v5c_cloth_walk')

# Review grid
before=[ROOT/'v5c_cloth_before_0.png',ROOT/'v5c_cloth_before_90.png']
after=[ROOT/'v5c_cloth_after_0.png',ROOT/'v5c_cloth_after_90.png']
labels=['V4 front','V4 side','V5C front','V5C side']
frames=[Image.open(x).convert('RGB') for x in before+after]
W,H=frames[0].size
canvas=Image.new('RGB',(W*2,H*2),(13,29,43));draw=ImageDraw.Draw(canvas)
for i,(frm,lab) in enumerate(zip(frames,labels)):
 x=(i%2)*W;y=(i//2)*H;canvas.paste(frm,(x,y));draw.rectangle((x,y,x+175,y+35),fill=(19,49,80));draw.text((x+12,y+9),lab,fill=(255,255,255))
canvas.save(GRID,quality=90)

qa={'source_glb':str(BASE),'source_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),
 'model_glb':str(OUT),'model_sha256':hashlib.sha256(model).hexdigest(),
 'viewer':str(HTML),'viewer_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),
 'g9_joint_count':len(D.j['skins'][0]['joints']),
 'clips':[a['name'] for a in D.j['animations']],
 'morph_targets_added':2,
 'body_and_head_geometry_unchanged':True,
 'garments':[{k:v for k,v in entry.items() if k!='correction'} for entry in results],
 'review_grid':str(GRID),
 'notes':'Seated-pose corrective morph is 0 in Idle/Walk/Wave; animated 0-to-1 in sit/fish. Exact mobile browser test pending; static CPU-skinned VTK previews and collision diagnostics performed.'}
QA.write_text(json.dumps(qa,indent=2))
# invariants
assert bytes(D.data[:len(orig_bin)])==orig_bin
assert all(D.j['animations'][i]==original_meta['animations'][i] for i in range(3))
assert D.j['nodes'][:142]==original_meta['nodes'][:142]
assert [p['attributes'] for m in D.j['meshes'] for p in m['primitives']]==[p['attributes'] for m in original_meta['meshes'] for p in m['primitives']]
assert hashlib.sha256(base64.b64decode(re.search(r'<script id="glbData"[^>]*>(.*?)</script>',ht,re.S).group(1).strip())).hexdigest()==hashlib.sha256(model).hexdigest()
print(json.dumps({k:v for k,v in qa.items() if k!='garments'},indent=2))
for e in qa['garments']:print(e['mesh_id'],e['penetrations_before_gt4mm'],e['penetrations_after_gt4mm'],e['max_correction_cm'])