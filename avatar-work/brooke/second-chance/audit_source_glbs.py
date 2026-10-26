#!/usr/bin/env python3
"""Read-only GLB audit for Brooke 3.1. Never alters approved source models."""
import json, struct, pathlib, hashlib, sys
FILES = ['3948-3d.glb', 'avatar-work/brooke/second-chance/brooke-3-1-body-candidate.glb', 'avatar-work/brooke/second-chance/brooke-head-3-0.glb', 'ImageToStl.com_Mona (1).glb']
def inspect(path):
    data=pathlib.Path(path).read_bytes()
    assert data[:4]==b'glTF' and len(data)==struct.unpack_from('<I',data,8)[0], path
    p=12; doc=None
    while p<len(data):
        size,kind=struct.unpack_from('<II',data,p);p+=8
        if kind==0x4e4f534a:
            doc=json.loads(data[p:p+size]);break
        p+=size
    assert isinstance(doc,dict), path
    accessors=doc.get('accessors',[])
    def rng(a):
        if a is None or a>=len(accessors):return None
        q=accessors[a];return {'count':q.get('count'),'min':q.get('min'),'max':q.get('max')}
    meshes=[]
    for ix,m in enumerate(doc.get('meshes',[])):
        prim=m.get('primitives',[])
        meshes.append({'i':ix,'name':m.get('name'),'primitives':len(prim),
            'vertices':sum((rng(q.get('attributes',{}).get('POSITION')) or {}).get('count',0) for q in prim),
            'range':[rng(q.get('attributes',{}).get('POSITION')) for q in prim],
            'morph_targets':[len(q.get('targets',[])) for q in prim],
            'material':[q.get('material') for q in prim],
            'has_skin_attributes':['JOINTS_0' in q.get('attributes',{}) for q in prim],
            'extras':m.get('extras',{})})
    nodes=doc.get('nodes',[]);sk=[]
    for s in doc.get('skins',[]):
        js=s.get('joints',[])
        sk.append({'name':s.get('name'),'joint_count':len(js),'joint_names':[nodes[i].get('name','') for i in js if 0<=i<len(nodes)],'skeleton':s.get('skeleton')})
    return {'file':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
      'nodes':len(nodes),'mesh_nodes':[{'name':n.get('name',''),'mesh':n['mesh'],'skin':n.get('skin'),'translation':n.get('translation'),'scale':n.get('scale'),'rotation':n.get('rotation')} for n in nodes if 'mesh' in n],
      'meshes':meshes,'skins':sk,'animations':[{'name':a.get('name'),'channels':len(a.get('channels',[]))} for a in doc.get('animations',[])],
      'materials':[m.get('name','') for m in doc.get('materials',[])],
      'morph_names':[m.get('extras',{}).get('targetNames',[]) for m in doc.get('meshes',[])],
      'stats':{'mesh_count':len(meshes),'node_count':len(nodes),'skin_count':len(sk),'animation_count':len(doc.get('animations',[]))}}
for f in FILES:
    try:print('BROOKE_AUDIT='+json.dumps(inspect(f),separators=(',',':')))
    except Exception as e:
        print('BROOKE_AUDIT_ERROR='+json.dumps({'file':f,'type':type(e).__name__,'error':str(e)}));sys.exit(1)
