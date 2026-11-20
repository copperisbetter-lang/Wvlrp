#!/usr/bin/env python3
"""Fit two owner-supplied, FREE DAZ garments to a Cecil 1 Genesis 9 GLB copy.

Uses genuine DAZ polygon geometry and authored joint-weight tables, not invented
body shells. Exported model embeds the garment geometry for *private review only*.
Do not commit the generated GLB, owner photos, or vendor assets to public GitHub.

Usage:
  python fit_cecil_free_underclothes.py \
     --base /path/to/CECIL1_DAD_HAT_V9.glb \
     --tank '/path/to/dforce tank g8 male.zip' \
     --boxers '/path/to/boxer short for genesis 9.zip' \
     --out /path/to/private/CECIL1_DAD_WHITE_UNDERCLOTHES.glb
"""
import argparse, base64, gzip, hashlib, io, json, math, struct, sys, zipfile
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

COMP = {5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
ELEM = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}

def sha(b): return hashlib.sha256(b).hexdigest()

def dsf_bytes(b):
    return json.loads((gzip.decompress(b) if b[:2] == b'\x1f\x8b' else b).decode('utf-8'))

def read_daz_from_zip(path, pattern):
    with zipfile.ZipFile(path) as z:
        matches=[n for n in z.namelist() if n.replace('\\','/').lower().endswith(pattern.lower())]
        if len(matches)!=1: raise ValueError(f'Expect exactly one {pattern!r} in {path}; found {matches}')
        return dsf_bytes(z.read(matches[0])), matches[0]

class GLB:
    def __init__(self, path):
        self.source_path=Path(path)
        b=self.source_path.read_bytes()
        magic,version,total=struct.unpack_from('<4sII',b,0)
        assert magic==b'glTF' and version==2 and total==len(b)
        js_len, js_typ=struct.unpack_from('<II',b,12)
        assert js_typ == 0x4E4F534A
        self.j=json.loads(b[20:20+js_len].decode('utf-8'))
        bp=20+js_len
        blen,btyp=struct.unpack_from('<II',b,bp)
        assert btyp==0x004E4942
        self.data=bytearray(b[bp+8:bp+8+blen])
        assert len(self.data)==self.j['buffers'][0]['byteLength']
        self.original_binary=bytes(self.data)
        self.original_json=self.j.copy()
        self.original_sha=sha(b)

    def arr(self,idx):
        a=self.j['accessors'][idx]; bv=self.j['bufferViews'][a['bufferView']]
        typ=COMP[a['componentType']]; n=ELEM[a['type']]
        offset=bv.get('byteOffset',0)+a.get('byteOffset',0)
        stride=bv.get('byteStride',np.dtype(typ).itemsize*n)
        return np.ndarray((a['count'],n),dtype=typ,buffer=self.data,offset=offset,strides=(stride,np.dtype(typ).itemsize))

    def append(self,arr,ctype=5126,typ=None, target=34962):
        arr=np.ascontiguousarray(arr)
        if typ is None: typ={1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[arr.shape[1]]
        while len(self.data)%4: self.data.append(0)
        off=len(self.data); payload=arr.tobytes(); self.data.extend(payload)
        bv_idx=len(self.j['bufferViews'])
        self.j['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(payload),'target':target})
        acc_idx=len(self.j['accessors'])
        a={'bufferView':bv_idx,'componentType':ctype,'count':arr.shape[0],'type':typ}
        if typ=='VEC3' and ctype==5126:
            a['min']=arr.min(0).astype(float).tolist()
            a['max']=arr.max(0).astype(float).tolist()
        self.j['accessors'].append(a)
        return acc_idx

    def add_mesh(self,name,positions,faces,joints,weights,mat_idx,normals=None):
        positions=np.asarray(positions,dtype=np.float32)
        faces=np.asarray(faces,dtype=np.uint32)
        joints=np.asarray(joints,dtype=np.uint16)
        weights=np.asarray(weights,dtype=np.float32)
        assert positions.ndim==2 and positions.shape[1]==3
        assert faces.ndim==2 and faces.shape[1]==3
        assert np.min(faces)>=0 and np.max(faces)<len(positions)
        assert joints.shape==(len(positions),4)
        assert weights.shape==(len(positions),4)
        assert np.allclose(weights.sum(1),1,atol=1e-3)
        if normals is None:
            normals=np.zeros_like(positions)
            for tri in faces:
                v0,v1,v2=positions[tri]
                area_normal=np.cross(v1-v0,v2-v0)
                normals[tri]+=area_normal
            nn=np.linalg.norm(normals,axis=1)
            nn[nn<1e-12]=1.0
            normals/=nn[:,None]
        attrs={
          'POSITION':self.append(positions),
          'NORMAL':self.append(np.asarray(normals,dtype=np.float32)),
          'JOINTS_0':self.append(joints,ctype=5123),
          'WEIGHTS_0':self.append(weights),
        }
        pind=self.append(faces.reshape(-1,1),ctype=5125,typ='SCALAR',target=34963)
        mesh_index=len(self.j['meshes'])
        self.j['meshes'].append({'name':name,'primitives':[{'attributes':attrs,'indices':pind,'material':mat_idx,'mode':4}]})
        nidx=len(self.j['nodes'])
        self.j['nodes'].append({'name':name+'_SKINNED','mesh':mesh_index,'skin':0})
        for s in self.j['scenes']:
            if s.get('name') or s is self.j['scenes'][self.j.get('scene',0)]:
                s['nodes'].append(nidx)
                break
        return nidx,mesh_index

    def save(self,path):
        self.j['buffers'][0]['byteLength']=len(self.data)
        js=json.dumps(self.j,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        js+=b' '*((-len(js))%4)
        b=bytes(self.data)
        b+=b'\x00'*((-len(b))%4)
        size=12+8+len(js)+8+len(b)
        with open(path,'wb') as f:
            f.write(struct.pack('<4sII',b'glTF',2,size))
            f.write(struct.pack('<II',len(js),0x4E4F534A));f.write(js)
            f.write(struct.pack('<II',len(b),0x004E4942));f.write(b)


def make_faces(polylist):
    # DAZ polylist: [polygon group index, material index, v0,...,v3]
    faces=[]
    for row in polylist:
        verts=row[2:]
        for k in range(1,len(verts)-1): faces.append([verts[0],verts[k],verts[k+1]])
    return np.asarray(faces,dtype=np.int32)

def read_clothing(zip_path, geom_suffix):
    dat, src=read_daz_from_zip(zip_path,geom_suffix)
    g=dat['geometry_library'][0]
    verts=np.array(g['vertices']['values'],dtype=np.float32)*.01
    faces=make_faces(g['polylist']['values'])
    weights_by_joint={}
    for modifier in dat.get('modifier_library',[]):
        skin=modifier.get('skin')
        if skin is None: continue
        for joint in skin['joints']:
            w=np.zeros(len(verts),dtype=np.float32)
            for vid,weight in joint.get('node_weights',{}).get('values',[]):
                w[vid]+=weight
            weights_by_joint[joint['id']]=w
    return verts,faces,weights_by_joint,src,g

def decimate_vtk(vertices,faces,target_frac=.26):
    import vtk
    from vtk.util.numpy_support import numpy_to_vtk,numpy_to_vtkIdTypeArray,vtk_to_numpy
    points=vtk.vtkPoints();points.SetData(numpy_to_vtk(vertices.astype(np.float32),deep=True))
    cells=vtk.vtkCellArray()
    # vtk9 offsets/connectivity form
    offsets=np.arange(0,(len(faces)+1)*3,3,dtype=np.int64)
    con=np.ascontiguousarray(faces.reshape(-1),dtype=np.int64)
    cells.SetData(numpy_to_vtkIdTypeArray(offsets,deep=True),numpy_to_vtkIdTypeArray(con,deep=True))
    pd=vtk.vtkPolyData();pd.SetPoints(points);pd.SetPolys(cells)
    tri=vtk.vtkTriangleFilter();tri.SetInputData(pd)
    dec=vtk.vtkQuadricDecimation();dec.SetInputConnection(tri.GetOutputPort());dec.SetTargetReduction(1-target_frac);dec.Update()
    out=dec.GetOutput();pts=vtk_to_numpy(out.GetPoints().GetData()).astype(np.float32)
    connectivity=vtk_to_numpy(out.GetPolys().GetConnectivityArray()).reshape(-1,3).astype(np.int32)
    assert len(pts)>1000 and len(connectivity)>1000
    return pts,connectivity

G8_TO_G9={
 'hip':'hip','pelvis':'pelvis',
 'lThighBend':'l_thigh','lThighTwist':'l_thightwist1','lShin':'l_shin',
 'rThighBend':'r_thigh','rThighTwist':'r_thightwist1','rShin':'r_shin',
 'abdomenLower':'spine1','abdomenUpper':'spine2','chestLower':'spine3','chestUpper':'spine4',
 'lCollar':'l_shoulder','lShldrBend':'l_shoulder','lShldrTwist':'l_shoulder',
 'rCollar':'r_shoulder','rShldrBend':'r_shoulder','rShldrTwist':'r_shoulder',
 'lForearmBend':'l_forearm','rForearmBend':'r_forearm',
 'neckLower':'neck1','neckUpper':'neck2',
 'lPectoral':'l_pectoral','rPectoral':'r_pectoral',
}

def transfer_joint_weights(raw_xyz, final_xyz, src_weights, joint_names,glb,mode):
    # convert source DAZ weights to 138-bone model, preserve top 4 normalized.
    names=[glb.j['nodes'][ni]['name'] for ni in glb.j['skins'][0]['joints']]
    bone_lookup={name.replace('DAZ_G9_',''):ind for ind,name in enumerate(names)}
    W=np.zeros((len(raw_xyz),len(names)),dtype=np.float32)
    unmapped=[]
    for src_name,w in src_weights.items():
        dst=G8_TO_G9.get(src_name,src_name) if mode=='g8' else src_name
        idx=bone_lookup.get(dst)
        if idx is not None: W[:,idx]+=w
        else: unmapped.append(src_name)
    default_idx=bone_lookup['spine2'] if mode=='g8' else bone_lookup['pelvis']
    missing=(W.sum(1)<.001)
    if missing.any(): W[missing,default_idx]=1
    # Boxer decimated vertices inherit weights of nearest source vertex.
    if len(raw_xyz)!=len(final_xyz):
        idx=cKDTree(raw_xyz).query(final_xyz,k=1)[1]
        W=W[idx]
    strongest=np.argpartition(W,-4,axis=1)[:,-4:]
    v=np.take_along_axis(W,strongest,axis=1)
    order=np.argsort(-v,axis=1)
    strongest=np.take_along_axis(strongest,order,axis=1)
    v=np.take_along_axis(v,order,axis=1)
    v/=np.maximum(v.sum(1,keepdims=True),1e-8)
    return strongest.astype(np.uint16),v.astype(np.float32),unmapped


def donor_surface(glb):
    all_pos=[];all_nrm=[]
    # Body mesh: all seven original donor primitives, plus torso region.
    for p in glb.j['meshes'][1]['primitives']:
        pos=glb.arr(p['attributes']['POSITION'])
        if p.get('material') in (1,2): continue # nails
        nrm=glb.arr(p['attributes']['NORMAL'])
        all_pos.append(pos);all_nrm.append(nrm)
    return np.concatenate(all_pos,axis=0), np.concatenate(all_nrm,axis=0)


def fit_to_body(cloth,body_pos,body_norm, garment):
    """Small, local fit adjustment to retain garment silhouette and reduce intersection."""
    # Original G8 tank to G9: moderate ease at upper torso, boxer is G9 already.
    V=cloth.copy()
    y=V[:,1]
    if garment=='tank':
        # modest horizontal ease, not a simulated replacement body shell
        center_z=-.003
        V[:,0]*=1.020
        V[:,2]=(V[:,2]-center_z)*1.025+center_z
    else:
        V[:,0]*=1.045
        V[:,2]*=1.052
    # Remove penetration on cloth exterior where close to body.
    tree=cKDTree(body_pos)
    d,idx=tree.query(V,k=1,workers=-1)
    bn=body_norm[idx]
    bn/=np.maximum(np.linalg.norm(bn,axis=1,keepdims=True),1e-10)
    signed=np.einsum('ij,ij->i',V-body_pos[idx],bn)
    # prevent large displacements around armpits/inner thigh: small, gentle correction.
    near=d < (0.020 if garment=='tank' else 0.034)
    penetration=np.maximum(0.003-signed,0)
    movement=np.minimum(penetration,.013 if garment=='boxer' else .010) * near
    V += bn*movement[:,None]
    return V, {'source_min_signed_m':float(np.min(signed)),
               'source_p05_signed_m':float(np.percentile(signed,5)),
               'near_surface_count':int(near.sum()),
               'corrected_count':int(np.count_nonzero(movement>1e-5)),
               'max_correction_m':float(movement.max()),
               'after_fit_bounds':np.stack([V.min(0),V.max(0)]).tolist()}


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--base',required=True)
    ap.add_argument('--tank',required=True)
    ap.add_argument('--boxers',required=True)
    ap.add_argument('--out',required=True)
    ap.add_argument('--qa',required=True)
    args=ap.parse_args()
    glb=GLB(args.base)
    print('base GLB',glb.original_sha,'skin joints',len(glb.j['skins'][0]['joints']),flush=True)
    assert len(glb.j['skins'][0]['joints'])==138
    body_xyz,body_norm=donor_surface(glb)
    qa={'source_base_sha256':glb.original_sha,'source_zip_sha256':{},'assets':{},'non_garment_bin_preserved':True}

    jobs=[('Free white ribbed G8 tank top',args.tank,'dforce Tank G8 male.dsf','g8'),
          ('Free white G9 boxer shorts',args.boxers,'Space Boxershort_64582.dsf','g9')]
    for name, archive, filename, gen in jobs:
        print('\nopening',name,flush=True)
        orig_verts,orig_faces,sw,dsf_name,g=read_clothing(archive,filename)
        qa['source_zip_sha256'][Path(archive).name]=sha(Path(archive).read_bytes())
        print(' source vertices',len(orig_verts),'faces',len(orig_faces),'skin bones',len(sw),flush=True)
        if gen=='g9':
            # Reduce over-dense original 64k-vertex, 129k-face boxer for Android performance.
            simp_verts,simp_faces=decimate_vtk(orig_verts,orig_faces,target_frac=.23)
            print(' reduced to vertices',len(simp_verts),'faces',len(simp_faces),flush=True)
        else: simp_verts,simp_faces=orig_verts,orig_faces
        fitted,fitreport=fit_to_body(simp_verts,body_xyz,body_norm,'tank' if gen=='g8' else 'boxer')
        joints,weights,unmapped=transfer_joint_weights(orig_verts,simp_verts,sw,[n['name'] for n in glb.j['nodes']],glb,gen)
        # white cotton/off-white ribbed as physically based fabric shading
        if gen=='g8':
            mat={'name':'Cecil1_FREE_DAZ_Tank_Cotton_White', 'pbrMetallicRoughness':{'baseColorFactor':[.985,.985,.98,1.0],'metallicFactor':0.0,'roughnessFactor':.91},'doubleSided':True,'alphaMode':'OPAQUE'}
        else:
            mat={'name':'Cecil1_FREE_DAZ_Boxers_Cotton_White','pbrMetallicRoughness':{'baseColorFactor':[.995,.995,.99,1.0],'metallicFactor':0.0,'roughnessFactor':.93},'doubleSided':True,'alphaMode':'OPAQUE'}
        matidx=len(glb.j['materials']);glb.j['materials'].append(mat)
        node,mesh=glb.add_mesh(name.replace(' ','_'),fitted,simp_faces,joints,weights,matidx)
        qa['assets'][name]={'source_geometry':dsf_name,'original_vertices':len(orig_verts),
                'original_triangles':len(orig_faces),'output_vertices':len(fitted),
                'output_triangles':len(simp_faces),'mapped_bones':int(len(np.unique(joints[weights>.01]))),
                'unmapped_weight_joints':unmapped,'new_node':node,'new_mesh':mesh,'fit':fitreport}
        print(' fitted',qa['assets'][name],flush=True)

    target=Path(args.out)
    glb.save(target)
    reread=GLB(target)
    assert reread.original_binary[:len(glb.original_binary)] == glb.original_binary
    assert len(reread.j['skins'][0]['joints'])==138
    assert len(reread.j['meshes'])==5
    qa['output_glb_sha256']=sha(target.read_bytes())
    qa['output_glb_size']=target.stat().st_size
    qa['base_binary_sha256']=sha(glb.original_binary)
    qa['source_filename']=Path(args.base).name
    Path(args.qa).write_text(json.dumps(qa,indent=2))
    print('OUTPUT',str(target),qa['output_glb_size'],qa['output_glb_sha256'],flush=True)

if __name__=='__main__': main()