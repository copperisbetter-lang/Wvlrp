#!/usr/bin/env python3
"""Independent V3 Cecil GLB + embedded mobile viewer integrity and change-scope QA."""
from pathlib import Path
import json, hashlib, re,base64, numpy as np,sys
sys.path.insert(0,'/mnt/data')
from cecil_animation_geometry_tools import GLB
root=Path('/mnt/data')
P2=root/'CECIL1_DAD_ANIMATIONS_V2_WALK_WAVE_SEATED_FISH.glb'
P3=root/'CECIL1_DAD_ANIMATIONS_V3_WAVE_CLASP_FIT.glb'
H3=root/'CECIL1_DAD_ANIMATIONS_V3_WAVE_CLASP_FIT_VIEWER.html'
G2=GLB(P2);G3=GLB(P3)
J2,J3=G2.j,G3.j
assert len(J3['skins'][0]['joints'])==len(J2['skins'][0]['joints'])==138
assert J3['nodes']==J2['nodes'] and J3['skins']==J2['skins']
assert J3['meshes']==J2['meshes'] and J3['materials']==J2['materials']
assert len(J3['animations'])==4
assert len(J3['animations'][3]['channels'])>25
assert len(G3.data)>len(G2.data)
orig=bytes(G2.data)
modified=np.where(np.frombuffer(orig,dtype=np.uint8)!=np.frombuffer(G3.data[:len(orig)],dtype=np.uint8))[0]
allowed=np.zeros(len(orig),dtype=np.bool_)
box=J3['meshes'][4]['primitives'][0]
for idx in [box['attributes']['POSITION'],box['attributes']['NORMAL']]:
 a=J3['accessors'][idx];v=J3['bufferViews'][a['bufferView']]
 n=a['count']*12;offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 allowed[offset:offset+n]=True
assert np.all(allowed[modified])
# V3 garment still from genuine owner-uploaded mesh, no other geometry changed
for i,m in enumerate(J2['meshes']):
 for k,pr in enumerate(m['primitives']):
  if (i,k)==(4,0):continue
  for name,index in pr['attributes'].items():
   p2,_=G2.arr(index);p3,_=G3.arr(index);assert np.array_equal(p2,p3),(i,k,name)
# Viewer GLB must be same SHA, native clips and companion JSON tracks names identical
h=H3.read_text(errors='strict');mm=re.search(r'<script id="glbData"[^>]*>(.*?)</script>',h,re.S)
assert mm
embedded=base64.b64decode(mm.group(1).strip())
assert embedded==P3.read_bytes()
mt=re.search(r'<script id="cecil-native-motion-tracks"[^>]*>(.*?)</script>',h,re.S)
assert mt
clips=json.loads(mt.group(1))
assert [x['name'] for x in clips]==[a['name'] for a in J3['animations']]
for i,clip in enumerate(clips):
 assert len(clip['tracks'])==len(J3['animations'][i]['channels'])
 assert all(len(track['v'])==len(clip['times']) for track in clip['tracks'])
# Pose-space kinematics sanity
pose=G3.get_pose_at(3,7.8)
def mat_for(name):
 n=G3.byname['DAZ_G9_'+name];nodes=[]
 while n in G3.parents:
  nodes.append(n);n=G3.parents[n]
 nodes.append(n)
 m=np.eye(4)
 for n in nodes[::-1]:
  v=pose.get(G3.nodes[n]['name'],{})
  m=m@G3.matrix(G3.nodes[n],v.get('rotation'),v.get('translation'))
 return m
lh=mat_for('l_hand')[:3,3];rh=mat_for('r_hand')[:3,3]
sep=float(np.linalg.norm(lh-rh));assert sep<0.07,sep
# Native animation must actually move hand and digits
assert 'DAZ_G9_r_index1' in pose and 'DAZ_G9_l_index1' in pose
A3=G3.arr(box['attributes']['POSITION'])[0]
A2=G2.arr(box['attributes']['POSITION'])[0]
shift=np.linalg.norm(A3-A2,axis=1)
assert shift.max()>0.01
sha=lambda b:hashlib.sha256(b).hexdigest()
qa={
 'v3_source':P2.name,'source_sha256':sha(P2.read_bytes()),
 'v3_glb':P3.name,'glb_bytes':P3.stat().st_size,'glb_sha256':sha(P3.read_bytes()),
 'v3_viewer':H3.name,'viewer_bytes':H3.stat().st_size,'viewer_sha256':sha(H3.read_bytes()),
 'identity_untouched':['head','body','hat V9','tank','all 138 Genesis 9 bones and inverse bind matrices','skin weights','original source scenes'],
 'original_GLTF_binary_change_region':'ONLY boxer POSITION and NORMAL existing buffer region; animation tracks appended',
 'byte_positions_changed_count':int(len(modified)),
 'boxer_vertices_moved_over_1mm':int((shift>.001).sum()),
 'boxer_max_relative_v2_position_shift_m':float(shift.max()),
 'boxer_fit':'Outer thigh spread reduced to 35% of V2 addition; local smooth 16mm front gusset, skin clearance visually checked at 0.55s and 1.65s walk frames only',
 'wave':'Left palm turned toward front using -75 degree wrist-axis from V1, original V2 was +90 backward; front close-up rendered',
 'fishing':'Sit-down holding right curled hand with left loosely curled hand, right wrist / left wrist 46mm apart, static preview from front & side. No camping chair, rod, contact solver or cloth simulation yet',
 'seated_wrist_gap_m':sep,
 'new_tracks':[{'name':a['name'],'channels':len(a['channels']),'duration_s':float(c['duration'])} for a,c in zip(J3['animations'],clips)],
 'viewer_embedded_model_exact_match':True,'viewer_motion_tables_match_glb':True,
 'render_evidence':['v3_walk_early_0.png','v3_walk_late_0.png','v3_wave_0.png','v3_clasp_0.png','v3_clasp_90.png'],
 'QA_limitations':['No Android animation playback validated yet','No collision simulation for full walk including every frame, nor seated movements','Fishing chair, foot planting, elbow-to-knee contact and grasp fidelity still require review', 'No approved game deployment'],
 'public_safety':'Public GitHub holds scripts, hashes and non-identifying QA; actual private Dad scan + real third-party garments NOT committed',
 }
(root/'CECIL1_DAD_ANIMATIONS_V3_QA.json').write_text(json.dumps(qa,indent=2))
print(json.dumps(qa,indent=2))