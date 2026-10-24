"""Orthographic textured GLB inspection renderer, for head-local coordinates."""
import json, struct, io, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
def load(path):
 raw=Path(path).read_bytes();size=struct.unpack_from('<I',raw,12)[0]
 g=json.loads(raw[20:20+size]);b=raw[28+size:]
 def acc(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  return np.frombuffer(b,dtype={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']],count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],n).copy()
 return g,b,acc
def render(path,out,angle=0):
 g,b,acc=load(path);W=700;H=760;scale=1850
 result=np.empty((H,W,3),float);result[:]=[.126,.216,.184];depth=np.full((H,W),-np.inf)
 theta=np.radians(angle);rot=np.array([[np.cos(theta),0,-np.sin(theta)],[0,1,0],[np.sin(theta),0,np.cos(theta)]])
 light=np.array([-.35,.5,1.]);light/=np.linalg.norm(light)
 for m in g['meshes']:
  for pr in m['primitives']:
   p=acc(pr['attributes']['POSITION']);n=acc(pr['attributes']['NORMAL']);uv=acc(pr['attributes']['TEXCOORD_0'])
   for w,t in zip(m.get('weights',[]),pr.get('targets',[])):
    p+=w*acc(t['POSITION'])
    if 'NORMAL' in t:n+=w*acc(t['NORMAL'])
   p=(p-np.array([0,1.515,0]))@rot.T;n=n@rot.T;n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-8)
   screen=np.stack([W/2+p[:,0]*scale,H/2-p[:,1]*scale],1)
   mat=g['materials'][pr['material']];pbr=mat['pbrMetallicRoughness'];im=g['images'][g['textures'][pbr['baseColorTexture']['index']]['source']];v=g['bufferViews'][im['bufferView']]
   tex=np.asarray(Image.open(io.BytesIO(b[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGBA')).astype(float)/255
   th,tw=tex.shape[:2];factor=np.array(pbr.get('baseColorFactor',[1,1,1,1]))
   for tri in acc(pr['indices']).ravel().reshape(-1,3):
    pts=screen[tri];lo=np.maximum(np.floor(pts.min(0)).astype(int),0);hi=np.minimum(np.ceil(pts.max(0)).astype(int),[W-1,H-1])
    if np.any(hi<lo):continue
    mat3=np.vstack([pts.T,np.ones(3)])
    if abs(np.linalg.det(mat3))<1e-8:continue
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));weights=np.linalg.inv(mat3)@np.vstack([xx.ravel(),yy.ravel(),np.ones(xx.size)])
    z=weights.T@p[tri,2];valid=(weights.min(0)>=-1e-5)&(z>depth[yy.ravel(),xx.ravel()])
    if not valid.any():continue
    px=xx.ravel()[valid];py=yy.ravel()[valid];w=weights[:,valid].T;tuv=w@uv[tri];tx=np.clip((tuv[:,0]*(tw-1)).astype(int),0,tw-1);ty=np.clip((tuv[:,1]*(th-1)).astype(int),0,th-1)
    color=tex[ty,tx]*factor;visible=color[:,3]>.45
    normal=w@n[tri];normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-8)
    shade=np.ones(len(normal)) if 'KHR_materials_unlit' in mat.get('extensions',{}) else .48+.52*np.maximum(normal@light,0)
    rgb=color[:,:3]*shade[:,None]
    result[py[visible],px[visible]]=rgb[visible];depth[py[visible],px[visible]]=z[valid][visible]
 Image.fromarray(np.clip(result*255,0,255).astype('uint8')).save(out)
if __name__=='__main__':render(sys.argv[1],sys.argv[2],float(sys.argv[3]) if len(sys.argv)>3 else 0)

