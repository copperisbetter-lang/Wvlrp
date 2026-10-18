"""Build separate SAV4 garment GLBs from the actual body mesh in Blender.
Run: blender -b --python world-creator/scripts/build_sav4_wardrobe.py
Requires world-creator/assets/sav4-realistic.glb. Garments are static fit prototypes;
rigging and animated collision inspection are still required before release.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[1]
SOURCE=BASE/'assets/sav4-realistic.glb'
if not SOURCE.exists(): raise FileNotFoundError(SOURCE)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
body=max((o for o in meshes if not any(t in o.name.lower() for t in ('hair','eye','lash','brow','teeth','tongue','cloth'))),key=lambda o:len(o.data.vertices))
verts=[body.matrix_world@v.co for v in body.data.vertices]
lo=min(v.z for v in verts);hi=max(v.z for v in verts);height=hi-lo
if not 1.5<height<1.9:raise ValueError(f'Unexpected body height {height}')
center_x=(min(v.x for v in verts)+max(v.x for v in verts))/2
center_y=(min(v.y for v in verts)+max(v.y for v in verts))/2
# Body cross-sections use only front-facing vertices near the relevant height.
def extent(frac):
 z=lo+frac*height; band=[v for v in verts if abs(v.z-z)<height*.014 and abs(v.x-center_x)<height*.33]
 if len(band)<12:raise ValueError(f'Insufficient body samples at {frac}')
 return max(abs(v.x-center_x) for v in band),max(abs(v.y-center_y) for v in band)
def fabric(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 node=m.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=(*color,1);node.inputs['Roughness'].default_value=.84
 return m
def tube(name,levels,mat,flare=1):
 n=64;verts_out=[];faces=[]
 for z,rx,ry in levels:
  for i in range(n):
   a=i*2*math.pi/n;verts_out.append((center_x+rx*math.cos(a),center_y+ry*math.sin(a),z))
 for j in range(len(levels)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts_out,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
 solid=obj.modifiers.new('Fabric hem thickness','SOLIDIFY');solid.thickness=.0025
 bevel=obj.modifiers.new('Soft fabric edges','BEVEL');bevel.width=.001;bevel.segments=2
 obj.modifiers.new('Fabric normals','WEIGHTED_NORMAL');return obj
def strap(name,start,end,mat,width=.013):
 # Short shoulder straps follow endpoints determined from body sections, not hard-coded length.
 delta=Vector(end)-Vector(start);mid=(Vector(start)+Vector(end))/2
 bpy.ops.mesh.primitive_cube_add(size=1,location=mid);o=bpy.context.object;o.name=name
 o.dimensions=(width,.003,delta.length);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mat);bevel=o.modifiers.new('Rounded strap edges','BEVEL');bevel.width=.002;bevel.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def export(name,objs):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 target=BASE/'assets'/name;target.parent.mkdir(parents=True,exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True)
 print('EXPORTED',target)
# Actual body-derived waist and hip rings. Garment floats 4-8mm outside skin.
def ring(frac,extra=.006):
 x,y=extent(frac);return (lo+frac*height,x+extra,y+extra)
waist=ring(.56);hip=ring(.49);hem=ring(.405)
for filename,color,flare in [('sav4-mini-denim.glb',(.09,.18,.32),1.07),('sav4-mini-black.glb',(.055,.055,.065),1.045),('sav4-mini-rose.glb',(.58,.29,.38),1.14)]:
 mat=fabric(filename,color);z,x,y=hem;skirt=tube('Fitted '+filename,[(waist[0],waist[1],waist[2]),hip,(z,x*flare,y*flare)],mat);export(filename,[skirt]);bpy.data.objects.remove(skirt,do_unlink=True)
# Tank top torso and two shoulder straps. No long floating straps.
for filename,color in [('sav4-tank-ivory.glb',(.86,.83,.76)),('sav4-tank-charcoal.glb',(.16,.16,.18)),('sav4-tank-sage.glb',(.31,.42,.33)),('sav4-tank-blue.glb',(.28,.42,.63))]:
 mat=fabric(filename,color);bottom=ring(.535);chest=ring(.72);neck=ring(.795)
 torso=tube('Tank torso',[(bottom[0],bottom[1],bottom[2]),(chest[0],chest[1],chest[2]),(neck[0]-.065,neck[1]*.91,neck[2]*.95)],mat)
 pieces=[torso];shoulder=ring(.825)
 for side in (-1,1):
  x=side*min(neck[1]*.68,shoulder[1]*.72)
  pieces.append(strap('Measured shoulder strap', (center_x+x,center_y+neck[2]*.7,neck[0]-.067),(center_x+x,center_y+shoulder[2]*.60,shoulder[0]-.02),mat))
 export(filename,pieces)
 for o in pieces:bpy.data.objects.remove(o,do_unlink=True)
# Bikini: shaped top band and short shoulder straps plus fitted bottom.
for filename,color in [('sav4-bikini-blue.glb',(.14,.38,.57)),('sav4-bikini-coral.glb',(.87,.34,.32))]:
 mat=fabric(filename,color);top=ring(.755);under=ring(.685);bottom=ring(.505);leg=ring(.455)
 pieces=[tube('Bikini fitted top',[(under[0],under[1],under[2]),(top[0],top[1],top[2])],mat),tube('Bikini fitted bottom',[(bottom[0],bottom[1],bottom[2]),(leg[0],leg[1]*.94,leg[2]*.95)],mat)]
 shoulder=ring(.825)
 for side in (-1,1):
  x=side*min(top[1]*.65,shoulder[1]*.72)
  pieces.append(strap('Bikini short shoulder strap',(center_x+x,center_y+top[2]*.7,top[0]),(center_x+x,center_y+shoulder[2]*.65,shoulder[0]-.02),mat,.010))
 export(filename,pieces)
 for o in pieces:bpy.data.objects.remove(o,do_unlink=True)
print('WARDROBE_PROTOTYPES_EXPORTED; inspect and rig before production')
