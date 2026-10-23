"""Brooke 1.1 Pass 5 candidate, derived ONLY from approved Pass 4 GLB.
Creates a separate GLB; never changes source, Brooke 1.0 or Sophie 1.
Usage: python pass5_from_pass4.py pass4.glb pass5.glb
"""
import io, json, struct, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from render import load

src,dest=map(Path,sys.argv[1:3])
assert src.resolve()!=dest.resolve(), "Refusing in-place edits"
assert "brooke-1.1" in src.name.lower() and "brooke-1.1" in dest.name.lower()
raw=src.read_bytes(); g,original,acc=load(src)
assert len(g["meshes"])==3 and len(g["skins"])>=1, "Unexpected model: expected Pass 4 3-mesh rig"
skin=g["meshes"][0]; pr=skin["primitives"][0]; attrs=pr["attributes"]
pos=acc(attrs["POSITION"])
for w,t in zip(skin.get("weights",[]),pr.get("targets",[])):
    pos+=w*acc(t["POSITION"])
x,y,z=pos.T
def smooth(a,b,t):
    q=np.clip((t-a)/(b-a),0,1)
    return q*q*(3-2*q)
def gauss(v,c,s):
    return np.exp(-.5*((v-c)/s)**2)
# Restrict all edits to the face's forward surface, never the skull back or neck.
front=smooth(.112,.148,z)
# Profile correction: shallow reduction in eyebrow ridge and transition toward forehead.
brow=gauss(x,0,.039)*gauss(y,1.571,.015)*front
# Upper lip rim is too projected, while tissue around lower lip is recessed.
upper_rim=gauss(x,0,.024)*gauss(y,1.479,.0032)*front
lower_support=gauss(x,0,.022)*gauss(y,1.466,.0045)*front
delta=np.zeros_like(pos)
delta[:,2]+=-.0018*brow-.0010*upper_rim+.0014*lower_support
assert np.max(np.linalg.norm(delta,axis=1))<.003
assert not np.any(np.linalg.norm(delta[y<1.448],axis=1)>1e-10)
binary=bytearray(original)
def append(data):
    binary.extend(b"\\0"*(-len(binary)%4))
    idx=len(g["bufferViews"])
    g["bufferViews"].append({"buffer":0,"byteOffset":len(binary),"byteLength":len(data)})
    binary.extend(data)
    return idx
ai=len(g["accessors"])
g["accessors"].append({"bufferView":append(delta.astype("<f4").tobytes()),"componentType":5126,"count":len(delta),"type":"VEC3","min":delta.min(0).tolist(),"max":delta.max(0).tolist()})
pr.setdefault("targets",[]).append({"POSITION":ai})
skin.setdefault("weights",[]).append(1.0)
skin.setdefault("extras",{}).setdefault("targetNames",[]).append("Brooke 1.1 Pass 5 brow and lip profile correction")
# Texture repair uses the native UV layout, painting only facially masked triangles.
uv=acc(attrs["TEXCOORD_0"])
tri=acc(pr["indices"]).ravel().reshape(-1,3)
mat=g["materials"][pr["material"]]
img_index=g["textures"][mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]
image=g["images"][img_index]
view=g["bufferViews"][image["bufferView"]]
im=Image.open(io.BytesIO(original[view["byteOffset"]:view["byteOffset"]+view["byteLength"]])).convert("RGBA")
W,H=im.size
# Rasterize at limited resolution to keep CI memory reasonable; paint UV atlas.
N=768
atlas=np.zeros((N,N,3),np.float32); occupied=np.zeros((N,N),bool)
uvn=uv*(N-1)
for face in tri:
    pts=uvn[face]
    lo=np.maximum(np.floor(pts.min(0)).astype(int),0)
    hi=np.minimum(np.ceil(pts.max(0)).astype(int),N-1)
    if np.any(hi<lo):continue
    matrix=np.vstack([pts.T,np.ones(3)])
    if abs(np.linalg.det(matrix))<1e-8:continue
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1))
    bary=np.linalg.inv(matrix)@np.vstack([xx.ravel(),yy.ravel(),np.ones(xx.size)])
    valid=bary.min(0)>=-1e-5
    px=xx.ravel()[valid];py=yy.ravel()[valid]
    atlas[py,px]=bary[:,valid].T@pos[face]
    occupied[py,px]=True
ax,ay,az=atlas.transpose(2,0,1)
small=np.asarray(im.resize((N,N),Image.Resampling.LANCZOS),dtype=np.float32)/255
# Sample existing upper lip pigment as the local target, not a fabricated color.
lip_ref=occupied&(np.abs(ax)<.017)&(ay>1.477)&(ay<1.482)&(az>.142)
if lip_ref.sum()<15:raise RuntimeError("Lip reference insufficient; refusing texture edit")
lip_color=np.median(small[lip_ref,:3],axis=0)
# Anatomical lower-lip band. Feather, do not paint beyond vermilion boundary.
lower=gauss(ax,0,.022)*gauss(ay,1.4668,.0038)*smooth(.132,.148,az)*occupied
# Subtle upper-lip skin cleanup. Do not erase mouth crease.
shadow=gauss(ax,0,.024)*gauss(ay,1.488,.0038)*smooth(.131,.148,az)*occupied
lower=np.clip(lower*.70,0,.70)
shadow=np.clip(shadow*.45,0,.45)
# Replace dark upper-lip artifact with neighboring skin tone, not lip pigment.
skin_ref=occupied&(np.abs(ax)>.018)&(np.abs(ax)<.032)&(ay>1.489)&(ay<1.498)&(az>.127)
if skin_ref.sum()<15:raise RuntimeError("Skin reference insufficient")
skin_color=np.median(small[skin_ref,:3],axis=0)
mask1=np.asarray(Image.fromarray(lower.astype("float32"),"F").resize((W,H),Image.Resampling.BILINEAR))
mask2=np.asarray(Image.fromarray(shadow.astype("float32"),"F").resize((W,H),Image.Resampling.BILINEAR))
pixels=np.asarray(im,dtype=np.float32)/255
# Preserve photographic microtexture and do not modify alpha.
for c in range(3):
    grain=pixels[:,:,c]-gaussian_filter(pixels[:,:,c],3)
    pixels[:,:,c]=pixels[:,:,c]*(1-mask1)+np.clip(lip_color[c]+grain*.45,0,1)*mask1
    pixels[:,:,c]=pixels[:,:,c]*(1-mask2)+np.clip(skin_color[c]+grain*.35,0,1)*mask2
outim=io.BytesIO()
Image.fromarray(np.uint8(np.clip(pixels*255,0,255))).save(outim,format="PNG")
g["images"][img_index]={"bufferView":append(outim.getvalue()),"mimeType":"image/png","name":"Brooke 1.1 Pass 5 mouth color candidate"}
g["buffers"][0]["byteLength"]=len(binary)
js=json.dumps(g,separators=(",",":")).encode();js+=b" "*(-len(js)%4)
binary.extend(b"\\0"*(-len(binary)%4))
out=struct.pack("<4sII",b"glTF",2,28+len(js)+len(binary))+struct.pack("<I4s",len(js),b"JSON")+js+struct.pack("<I4s",len(binary),b"BIN\\0")+binary
dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(out)
assert src.read_bytes()==raw
gg,_,_=load(dest)
assert len(gg["meshes"])==len(g["meshes"]) and gg["skins"]==g["skins"]
report={"source_sha256":hashlib.sha256(raw).hexdigest(),"candidate_sha256":hashlib.sha256(out).hexdigest(),"max_displacement_m":float(np.linalg.norm(delta,axis=1).max()),"modified_skin_vertices":int(np.count_nonzero(np.linalg.norm(delta,axis=1))),"original_preserved":True,"visual_approval_pending":True,"remaining":"nostril shape and eyelid fit require reviewed next pass"}
dest.with_suffix(".json").write_text(json.dumps(report,indent=2)+"\\n")
print(json.dumps(report,indent=2))
