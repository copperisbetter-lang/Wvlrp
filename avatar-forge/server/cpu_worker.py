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
 ("Hips",(0,1.00,0),(.215,.19,.15),"hips"),
 ("Spine",(0,1.29,0),(.19,.32,.135),"spine"),
 ("Chest",(0,1.53,0),(.235,.22,.145),"chest"),
 ("Neck",(0,1.75,0),(.074,.11,.074),"neck"),
 ("Head",(0,1.91,0),(.115,.15,.105),"head"),
 ("LeftUpperArm",(-.29,1.52,0),(.105,.255,.10),"leftUpperArm"),
 ("LeftLowerArm",(-.38,1.16,0),(.079,.245,.075),"leftLowerArm"),
 ("RightUpperArm",(.29,1.52,0),(.105,.255,.10),"rightUpperArm"),
 ("RightLowerArm",(.38,1.16,0),(.079,.245,.075),"rightLowerArm"),
 ("LeftUpperLeg",(-.12,.78,0),(.14,.31,.135),"leftUpperLeg"),
 ("LeftLowerLeg",(-.12,.32,0),(.10,.27,.10),"leftLowerLeg"),
 ("RightUpperLeg",(.12,.78,0),(.14,.31,.135),"rightUpperLeg"),
 ("RightLowerLeg",(.12,.32,0),(.10,.27,.10),"rightLowerLeg"),
 ("LeftHand",(-.40,.90,0),(.075,.12,.055),"leftHand"),
 ("RightHand",(.40,.90,0),(.075,.12,.055),"rightHand"),
 ("LeftFoot",(-.12,.065,.09),(.10,.07,.19),"leftFoot"),
 ("RightFoot",(.12,.065,.09),(.10,.07,.19),"rightFoot"),
]
parents={"hips":None,"spine":"hips","chest":"spine","neck":"chest","head":"neck",
"leftUpperArm":"chest","leftLowerArm":"leftUpperArm","rightUpperArm":"chest","rightLowerArm":"rightUpperArm",
"leftUpperLeg":"hips","leftLowerLeg":"leftUpperLeg","rightUpperLeg":"hips","rightLowerLeg":"rightUpperLeg",
"leftHand":"leftLowerArm","rightHand":"rightLowerArm",
"leftFoot":"leftLowerLeg","rightFoot":"rightLowerLeg"}
centers={p[3]:p[1] for p in parts}
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
# Pose clips are joint rotations, not camera tricks. This baseline uses a
# simplified articulated skeleton; poses require further ergonomic QA.
for name,angles in (
 ("Kneel",{"leftUpperLeg":-1.0,"rightUpperLeg":-1.0,"leftLowerLeg":1.85,"rightLowerLeg":1.85,"spine":.12}),
 ("HandsAndKnees",{"spine":.85,"chest":.32,"leftUpperLeg":-.95,"rightUpperLeg":-.95,"leftLowerLeg":1.75,"rightLowerLeg":1.75,"leftUpperArm":-.9,"rightUpperArm":-.9,"leftLowerArm":-.15,"rightLowerArm":-.15,"neck":-.35}),
 ("ElbowsAndKnees",{"spine":.92,"chest":.4,"leftUpperLeg":-.95,"rightUpperLeg":-.95,"leftLowerLeg":1.75,"rightLowerLeg":1.75,"leftUpperArm":-1.15,"rightUpperArm":-1.15,"leftLowerArm":-1.15,"rightLowerArm":-1.15,"neck":-.4}),
 ("FlatOnBack",{"hips":-math.pi/2,"neck":.1}),
):
    channels=[];samplers=[]
    for key,angle in angles.items():
        q=[]
        for a in (0,angle,angle):q.extend([math.sin(a/2),0,0,math.cos(a/2)])
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
print("Wrote CPU baseline rigged GLB",total,"bytes, 17 joints, 6 animations; not a photorealistic reconstruction")
