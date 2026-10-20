"""Build Laura's standalone *first-pass* head GLB with Blender.
Photo-derived design notes: references/sav4-face-reference-2026-10-18.md.
The source images are perspective/partly occluded; this is a reviewable approximation,
not a claim of photo-identical reconstruction. No SAV4/CAR5 files are modified.
Run: blender -b -t 2 --python world-creator/scripts/build_laura_head.py
"""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color,rough=.82):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 return m
skin=mat('Laura warm natural skin',(.73,.51,.40))
lip=mat('Natural muted rose lips',(.57,.29,.30))
hair=mat('Fine ash blonde',(.57,.49,.36))
iris=mat('Pale blue iris',(.38,.58,.69),.38)
white=mat('Eye sclera',(.88,.86,.82),.28)
dark=mat('Pupil and lashes',(.075,.063,.056),.36)
brow=mat('Ash blonde brows',(.40,.34,.27))
def uv(name,loc,scale,material,segments=40,rings=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 return o
# Front faces +Z; eyes at positive Z, jaw taper made with mesh rings.
verts=[];faces=[];N=64
rings=[(-1.10,.17,.17,.10),(-.96,.39,.31,.01),(-.72,.62,.40,.0),(-.35,.76,.44,0),(.06,.82,.48,0),(.42,.80,.46,0),(.77,.69,.43,0),(1.06,.48,.34,-.02),(1.21,.12,.14,-.04)]
for y,rx,rz,zc in rings:
 for i in range(N):
  a=2*math.pi*i/N;verts.append((rx*math.cos(a),y,zc+rz*math.sin(a)))
for j in range(len(rings)-1):
 for i in range(N):
  a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
faces.extend([tuple(reversed(tuple(range(N)))),tuple((len(rings)-1)*N+i for i in range(N))])
mesh=bpy.data.meshes.new('Laura oval face topology');mesh.from_pydata(verts,[],faces);mesh.update()
head=bpy.data.objects.new('Laura face - oval cheeks tapered jaw',mesh);bpy.context.collection.objects.link(head);head.data.materials.append(skin)
for p in mesh.polygons:p.use_smooth=True
# Named pieces correspond to independent viewer expression controls.
uv('Nose bridge',(0,.10,.476),(.105,.38,.135),skin)
uv('Nose soft rounded tip',(0,-.13,.59),(.15,.125,.16),skin)
for s,label in [(-1,'Left'),(1,'Right')]:
 x=s*.34
 uv(label+' sclera',(x,.28,.415),(.215,.105,.068),white)
 uv(label+' pale blue iris',(x,.28,.479),(.092,.091,.027),iris)
 uv(label+' pupil',(x,.28,.504),(.039,.047,.015),dark)
 uv('Upper eyelid '+label,(x,.392,.474),(.228,.040,.045),skin)
 uv('Lower eyelid '+label,(x,.18,.470),(.220,.026,.04),skin)
 uv('Eyebrow '+label,(x,.54,.46),(.235,.037,.050),brow)
 uv('Ear '+label,(s*.79,-.06,-.025),(.135,.28,.105),skin)
uv('Upper lip',(0,-.35,.424),(.275,.068,.064),lip)
uv('Lower lip',(0,-.445,.412),(.26,.074,.069),lip)
# Fine straight hair, scalp and smooth face-framing strands.
uv('Ash blonde scalp',(0,.91,-.03),(.72,.37,.46),hair)
for i in range(13):
 x=-.62+i*.103
 uv('Fringe %02d'%i,(x,.79,.40),(.061,.27,.071),hair,16,12)
for side in (-1,1):
 for j in range(5):
  x=side*(.65+j*.035)
  uv('Long straight hair %s %d'%(side,j),(x,-.22,-.18-j*.015),(.075,.93,.08),hair,16,16)
# Expression shape keys on eyelids and lips (real glTF morph targets).
for o in list(bpy.data.objects):
 if o.name.startswith(('Upper eyelid','Upper lip','Lower lip','Eyebrow')):
  basis=o.shape_key_add(name='Basis')
  key=o.shape_key_add(name='Blink' if 'eyelid' in o.name else 'Smile' if 'lip' in o.name else 'RaiseBrows')
  for v in key.data:
   if 'eyelid' in o.name:v.co.y-=.12
   elif 'lip' in o.name:v.co.x*=1.18;v.co.y+=.035
   else:v.co.y+=.12
 if o.name.startswith('Lower lip'):
  k=o.shape_key_add(name='OpenMouth')
  for v in k.data:v.co.y-=.16
# Keep head alone, no character-body edits.
out=os.path.abspath('world-creator/assets/laura-head-inspection.glb')
os.makedirs(os.path.dirname(out),exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_morph=True,export_materials='EXPORT')
print('LAURA_HEAD_EXPORTED',out,os.path.getsize(out))
