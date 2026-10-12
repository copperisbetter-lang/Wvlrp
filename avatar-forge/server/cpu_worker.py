"""CPU-only parametric humanoid GLB worker for Avatar Forge.
This is a procedural baseline, NOT photo reconstruction. Reference images are
used for an averaged skin tone; anatomy and rigging are approximate.
"""
import json,struct,sys,math,base64,io
from pathlib import Path
from PIL import Image

folder=Path(sys.argv[1]); manifest=json.loads((folder/"manifest.json").read_text())
def sample_skin():
    samples=[]
    for name in ("front","back","left","right","face"):
        p=folder/(name+".png")
        if not p.exists():continue
        im=Image.open(p).convert("RGB"); w,h=im.size
        # Center torso sample; backgrounds/clothing can contaminate this.
        for x,y in ((.5,.24),(.45,.28),(.55,.28)):
            r,g,b=im.getpixel((int(x*(w-1)),int(y*(h-1))))
            if 70<r<250 and 45<g<230 and 30<b<215 and r>g*.95 and g>b*.75:
                samples.append((r/255,g/255,b/255))
    if not samples:return [.77,.58,.47,1]
    return [round(sum(v[i] for v in samples)/len(samples),3) for i in range(3)]+[1]
skin=sample_skin()
# Humanoid ellipsoid parts; skinned to 15 named joints. All mesh vertices and
# joints are in a common world-space bind pose.
parts=[
 ("Hips",(0,1.00,0),(.22,.16,.13),"hips"),
 ("Spine",(0,1.29,0),(.20,.31,.12),"spine"),
 ("Chest",(0,1.53,0),(.24,.20,.14),"chest"),
 ("Neck",(0,1.75,0),(.065,.10,.065),"neck"),
 ("Head",(0,1.91,0),(.125,.16,.11),"head"),
 ("LeftUpperArm",(-.31,1.53,0),(.095,.23,.095),"leftUpperArm"),
 ("LeftLowerArm",(-.39,1.14,0),(.073,.22,.073),"leftLowerArm"),
 ("RightUpperArm",(.31,1.53,0),(.095,.23,.095),"rightUpperArm"),
 ("RightLowerArm",(.39,1.14,0),(.073,.22,.073),"rightLowerArm"),
 ("LeftUpperLeg",(-.12,.77,0),(.125,.28,.12),"leftUpperLeg"),
 ("LeftLowerLeg",(-.12,.30,0),(.085,.25,.09),"leftLowerLeg"),
 ("RightUpperLeg",(.12,.77,0),(.125,.28,.12),"rightUpperLeg"),
 ("RightLowerLeg",(.12,.30,0),(.085,.25,.09),"rightLowerLeg"),
 ("LeftFoot",(-.12,.065,.09),(.10,.07,.19),"leftFoot"),
 ("RightFoot",(.12,.065,.09),(.10,.07,.19),"rightFoot"),
]
parents={"hips":None,"spine":"hips","chest":"spine","neck":"chest","head":"neck",
"leftUpperArm":"chest","leftLowerArm":"leftUpperArm","rightUpperArm":"chest","rightLowerArm":"rightUpperArm",
"leftUpperLeg":"hips","leftLowerLeg":"leftUpperLeg","rightUpperLeg":"hips","rightLowerLeg":"rightUpperLeg",
"leftFoot":"leftLowerLeg","rightFoot":"rightLowerLeg"}
centers={p[4]:p[1] for p in parts}
nodes=[];indices={};children={}
for key,parent in parents.items():
    pos=centers[key]; relative=tuple(pos[i]-(centers[parent][i] if parent else 0) for i in range(3))
    indices[key]=len(nodes);nodes.append({"name":key,"translation":list(relative)})
    if parent:children.setdefault(parent,[]).append(indices[key])
for key,kids in children.items():nodes[indices[key]]["children"]=kids
verts=[];normals=[];joints=[];weights=[];faces=[]
RINGS=10;SIDES=14
for label,center,radii,bone in parts:
    base=len(verts)//3
    for i in range(RINGS+1):
        phi=math.pi*i/RINGS
        for j in range(SIDES+1):
            theta=2*math.pi*j/SIDES
            n=(math.sin(phi)*math.cos(theta),math.cos(phi),math.sin(phi)*math.sin(theta))
            verts.extend(center[k]+radii[k]*n[k] for k in range(3))
            normals.extend(n)
            joints.extend((indices[bone],0,0,0));weights.extend((1,0,0,0))
    for i in range(RINGS):
        for j in range(SIDES):
            a=base+i*(SIDES+1)+j;b=a+SIDES+1
            faces.extend((a,b,a+1,b,b+1,a+1))
blob=bytearray();views=[];accessors=[]
def add(values,fmt,component,type_,count,minimum=None,maximum=None,target=None):
    while len(blob)%4:blob.append(0)
    offset=len(blob);blob.extend(struct.pack("<"+fmt*len(values),*values))
    view={"buffer":0,"byteOffset":offset,"byteLength":len(blob)-offset}
    if target:view["target"]=target
    views.append(view)
    acc={"bufferView":len(views)-1,"componentType":component,"count":count,"type":type_}
    if minimum is not None:acc["min"]=minimum;acc["max"]=maximum
    accessors.append(acc);return len(accessors)-1
n=len(verts)//3
pos=add(verts,"f",5126,"VEC3",n,[min(verts[i::3]) for i in range(3)],[max(verts[i::3]) for i in range(3)],34962)
nor=add(normals,"f",5126,"VEC3",n,target=34962)
jnt=add(joints,"H",5123,"VEC4",n,target=34962)
wgt=add(weights,"f",5126,"VEC4",n,target=34962)
idx=add(faces,"I",5125,"SCALAR",len(faces),target=34963)
# Inverse bind matrices: inverse translation of each joint's world-space bind.
mat=[]
for key in parents:
    x,y,z=centers[key]
    mat.extend([1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1])
ibm=add(mat,"f",5126,"MAT4",len(parents))
# Simple looping arm swing + walking leg rotations (not motion-captured).
times=add([0,.5,1.0],"f",5126,"SCALAR",3,[0],[1])
animations=[]
for name,amp in (("Idle",.04),("Walk",.32)):
    channels=[];samplers=[]
    for key,sign in (("leftUpperArm",1),("rightUpperArm",-1),("leftUpperLeg",-1),("rightUpperLeg",1)):
        q=[]
        for angle in (0,amp*sign,0):
            q.extend([math.sin(angle/2),0,0,math.cos(angle/2)])
        output=add(q,"f",5126,"VEC4",3)
        samplers.append({"input":times,"output":output,"interpolation":"LINEAR"})
        channels.append({"sampler":len(samplers)-1,"target":{"node":indices[key],"path":"rotation"}})
    animations.append({"name":name,"channels":channels,"samplers":samplers})
meshnode=len(nodes);nodes.append({"name":"ProceduralBody","mesh":0,"skin":0})
gltf={"asset":{"version":"2.0","generator":"WVLRP CPU Avatar Forge baseline"},
"buffers":[{"byteLength":len(blob)}],"bufferViews":views,"accessors":accessors,
"materials":[{"name":"SampledSkinTone","pbrMetallicRoughness":{"baseColorFactor":skin,"metallicFactor":0,"roughnessFactor":.94},"doubleSided":True}],
"meshes":[{"name":"Parametric humanoid - NOT photo reconstructed","primitives":[{"attributes":{"POSITION":pos,"NORMAL":nor,"JOINTS_0":jnt,"WEIGHTS_0":wgt},"indices":idx,"material":0}]}],
"skins":[{"name":"HumanoidBaseline","joints":[indices[k] for k in parents],"inverseBindMatrices":ibm,"skeleton":indices["hips"]}],
"nodes":nodes,"scenes":[{"nodes":[indices["hips"],meshnode]}],"scene":0,"animations":animations}
j=json.dumps(gltf,separators=(",",":")).encode()
while len(j)%4:j+=b" "
while len(blob)%4:blob.append(0)
total=12+8+len(j)+8+len(blob)
(folder/"avatar.glb").write_bytes(struct.pack("<III",0x46546c67,2,total)+struct.pack("<I4s",len(j),b"JSON")+j+struct.pack("<I4s",len(blob),b"BIN\\x00".replace(b"\\x00",b"\x00"))+blob)
print("Wrote CPU baseline rigged GLB",total,"bytes, 15 joints, 2 animations; not a photorealistic reconstruction")
