"""Separate non-nude portrait study. Never modifies the full-body source."""
import bpy,bmesh,math,random,json
from pathlib import Path
from mathutils import Vector
random.seed(413)
BASE=Path(__file__).resolve().parent
OUT=BASE/'portrait';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'build/Sandy_Blonde_Working.blend'))
scene=bpy.context.scene
body=next(o for o in scene.objects if o.type=='MESH' and 'character_sav4' in o.name)
deps=bpy.context.evaluated_depsgraph_get()
mesh=bpy.data.meshes.new_from_object(body.evaluated_get(deps),depsgraph=deps)
head=bpy.data.objects.new('Sandy portrait head and neck only',mesh)
head.matrix_world=body.matrix_world.copy()
scene.collection.objects.link(head)
# Bake the eyes in world space before removing their original parent rig.
for original in list(scene.objects):
 if original.type=='MESH' and ('eyes original' in original.name):
  eye_mesh=bpy.data.meshes.new_from_object(original.evaluated_get(deps),depsgraph=deps)
  eye=bpy.data.objects.new('Portrait '+original.name,eye_mesh)
  eye.matrix_world=original.matrix_world.copy();scene.collection.objects.link(eye)
for o in list(scene.objects):
 if o!=head and not o.name.startswith('Portrait '):
  bpy.data.objects.remove(o,do_unlink=True)
bm=bmesh.new();bm.from_mesh(head.data)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if (head.matrix_world@v.co).z<1.34 or ((head.matrix_world@v.co).z<1.425 and abs((head.matrix_world@v.co).x)>.065)],context='VERTS')
bm.to_mesh(head.data);bm.free()
# A distinct reversible portrait-study morph, restricted to the front face.
head.shape_key_add(name='Basis')
k=head.shape_key_add(name='Sandy portrait facial proportions')
def gauss(a,c,s):return math.exp(-((a-c)/s)**2)
for i,v in enumerate(head.data.vertices):
 p=head.matrix_world@v.co;x,y,z=p
 front=max(0,min(1,(-y-.035)/.065))
 # Softer oval cheeks, broader natural mouth and gently raised mouth corners.
 cheek=gauss(z,1.526,.024)*gauss(abs(x),.047,.025)*front
 jaw=gauss(z,1.466,.027)*front
 mouth=gauss(z,1.492,.012)*gauss(abs(x),.024,.019)*front
 nose=gauss(z,1.530,.020)*gauss(x,0,.018)*front
 p.x=x*(1+.035*cheek+.025*jaw+.13*mouth)
 p.y=y-.0023*cheek-.001*nose
 p.z=z+.0038*mouth*min(1,abs(x)/.025)
 k.data[i].co=head.matrix_world.inverted()@p
k.value=1
# Individually tapered eyebrow hairs replace the two flat brow strips.
from mathutils.bvhtree import BVHTree
bvh=BVHTree.FromObject(head,bpy.context.evaluated_depsgraph_get())
browmat=bpy.data.materials.new('Fine natural blonde-brown eyebrows');browmat.use_nodes=True
browmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.11,.073,.043,1)
browmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8
vts=[];fs=[]
for side in (-1,1):
 for n in range(150):
  t=random.random();x=side*(.010+.046*t)
  z=1.580+.005*math.sin(math.pi*t)+random.uniform(-.0011,.0011)
  hit,normal,face,dist=bvh.ray_cast(Vector((x,-.35,z)),Vector((0,1,0)),1)
  if hit is None:continue
  y=hit.y-.00045;base=len(vts);w=.00011
  vts.extend([(x-w,y,z),(x+w,y,z),(x+side*.0012,y-.00005,z+.0022)])
  fs.append((base,base+1,base+2))
meb=bpy.data.meshes.new('Individual brow hairs');meb.from_pydata(vts,[],fs);meb.materials.append(browmat)
ob=bpy.data.objects.new('Fine natural eyebrows',meb);scene.collection.objects.link(ob)
# Real geometry strands with a center part, darker roots, cool beige lengths,
# grouped loose waves and tapered ends. No solid native hair shell.
materials=[]
palette=[(.055,.040,.026),(.09,.070,.046),(.15,.122,.084),(.22,.185,.132),(.30,.260,.195),(.40,.355,.275)]
for idx,col in enumerate(palette):
 m=bpy.data.materials.new('Beige blonde strand '+str(idx));m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF')
 n.inputs['Base Color'].default_value=(*col,1)
 n.inputs['Roughness'].default_value=.48
 n.inputs['Specular IOR Level'].default_value=.25
 n.inputs['Anisotropic'].default_value=.65
 materials.append(m)
vertices=[];faces=[];face_mats=[]
N=3000;steps=36
for strand in range(N):
 theta=random.uniform(-math.pi,math.pi)
 phi0=random.uniform(.035,.80)
 side=1 if math.sin(theta)>=0 else -1
 length=random.uniform(.20,.30)
 clump=round(theta*16)/16
 phase=clump*8
 jitter=random.uniform(-.001,.001)
 base=len(vertices)
 shade=random.choices(range(6),weights=[1,2,4,5,4,2])[0]
 for j in range(steps):
  t=j/(steps-1)
  if t<.48:
   f=t/.48;phi=phi0+(1.62-phi0)*f
   # Front roots sweep gently to either temple, keeping eyes and face clear.
   a=theta
   if abs(theta)<1.18:a=theta+(side*1.24-theta)*(f**1.4)
   x=.104*math.sin(phi)*math.sin(a)
   y=-.020-.111*math.sin(phi)*math.cos(a)
   z=1.552+.139*math.cos(phi)
  else:
   f=(t-.48)/.52;a=theta
   if abs(theta)<1.18:a=side*1.24
   x=.104*math.sin(1.62)*math.sin(a)
   y=-.020-.111*math.sin(1.62)*math.cos(a)
   z=1.552+.139*math.cos(1.62)-length*f
   wave=math.sin(f*math.pi*2.4+phase)-math.sin(phase)
   x+=side*(.009*wave*f+.014*f)
   y+=.012*math.sin(f*math.pi*1.8+phase)*f+.017*f
  x+=jitter;z+=random.uniform(-.00015,.00015)
  radius=random.uniform(.00016,.00028)*(.95-.80*t**6)
  for c in range(3):
   angle=2*math.pi*c/3
   vertices.append((x+radius*math.cos(angle),y+radius*math.sin(angle),z))
  if j:
   for c in range(3):
    a=base+(j-1)*3+c;b=base+(j-1)*3+(c+1)%3
    faces.append((a,b,b+3,a+3))
    face_mats.append(max(0,shade-2) if t<.14 else shade)
me=bpy.data.meshes.new('Individually tapered wavy blonde strands');me.from_pydata(vertices,[],faces);me.update()
hair=bpy.data.objects.new('Sandy center-part strand hair study',me);scene.collection.objects.link(hair)
for m in materials:me.materials.append(m)
for p,idx in zip(me.polygons,face_mats):p.material_index=idx;p.use_smooth=True
# Hide the open neck edge with a simple opaque sweater collar, no torso mesh.
m=bpy.data.materials.new('Stone cotton collar');m.use_nodes=True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.17,.18,.18,1)
m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=(0,-.005,1.325))
collar=bpy.context.object;collar.name='Opaque portrait display collar';collar.scale=(.18,.095,.10);collar.data.materials.append(m)
for p in collar.data.polygons:p.use_smooth=True
world=bpy.data.worlds.new('Portrait neutral');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.23,.25,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
for name,loc,power,size in [('Key',(-.5,-.8,2.1),25,1.1),('Fill',(.5,-.6,1.7),12,1),('Rim',(.4,.6,1.95),18,.8)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc
 o.rotation_euler=(Vector((0,-.02,1.55))-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.exposure=-.6
cam=bpy.data.cameras.new('Portrait camera');co=bpy.data.objects.new('Portrait camera',cam);scene.collection.objects.link(co);scene.camera=co
cam.type='ORTHO';cam.ortho_scale=.55
for name,loc in [('Sandy_Portrait_Front',(0,-1.3,1.55)),('Sandy_Portrait_ThreeQuarter',(.45,-1.3,1.56))]:
 co.location=loc;co.rotation_euler=(Vector((0,-.015,1.48))-co.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
# Bake/export head-only portrait; the full-body project is never included.
for o in list(scene.objects):
 if o.type in {'LIGHT','CAMERA'}:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'Sandy_Portrait.glb'),export_format='GLB',export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Sandy_Portrait.blend'))
(OUT/'portrait-report.json').write_text(json.dumps({'scope':'separate non-nude head and neck study','hair_strands':N,'hair_vertices':len(vertices),'photo_likeness_verified':False,'phone_performance_verified':False,'original_full_body_changed':False},indent=2))
print('PORTRAIT_BUILD_OK')
