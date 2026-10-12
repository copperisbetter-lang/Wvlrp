"""Sav shell replacement: MPFB continuous human topology + original 56-joint rig."""
import bpy, math
from pathlib import Path
from mathutils import Vector
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_amy_mpfb import load_system_pack, add_asset
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

RIG_SOURCE=Path("world-creator/assets/sav-prototype.glb")
OUT=Path("world-creator/assets/sav-realistic-shell.glb")
# Import the previously published Sav rig/animations as the source of truth.
bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(RIG_SOURCE.resolve()))
rig=next((o for o in bpy.data.objects if o.type=="ARMATURE" and len(o.data.bones)==56),None)
if not rig: raise RuntimeError("Existing Sav 56-joint skeleton missing")
for o in list(bpy.data.objects):
 if o.type=="MESH": bpy.data.objects.remove(o,do_unlink=True)
print("SAV_RIG_PRESERVED",len(rig.data.bones))
load_system_pack()
h=HumanService.create_human();h.name="Sav MPFB continuous human shell"
for key,val in [("gender",0.0),("age",.40),("weight",.52),("muscle",.32),
                ("height",.53),("proportions",.49),("cupsize",.82),("firmness",.27)]:
 HumanObjectProperties.set_value(key,val,entity_reference=h)
TargetService.reapply_macro_details(h)
skin=AssetService.find_asset_absolute_path("young_caucasian_female.mhmat",asset_subdir="skins")
if not skin: raise RuntimeError("MPFB skin texture missing")
HumanService.set_character_skin(skin,h,skin_type="GAMEENGINE")
for sub,names,kind in [("eyes",["high-poly.mhclo"],"Eyes"),
 ("eyebrows",["eyebrow001.mhclo"],"Eyebrows"),
 ("eyelashes",["eyelashes01.mhclo"],"Eyelashes"),
 ("teeth",["teeth_base.mhclo"],"Teeth"),
 ("hair",["long01.mhclo"],"Hair")]:
 add_asset(h,sub,names,kind)
root=ExportService.create_character_copy(h,name_suffix="_sav_shell")
body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
if not body:raise RuntimeError("MPFB shell missing")
ExportService.bake_modifiers_remove_helpers(body,bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
for m in list(body.modifiers):
 if m.type=="MASK":body.modifiers.remove(m)
# Remove MPFB construction original; keep only exported copies.
family=[root]+list(ObjectService.get_list_of_children(root))
meshes=[o for o in family if o.type=="MESH"]
if body not in meshes:meshes.append(body)
for o in list(bpy.data.objects):
 if o.type=="MESH" and o not in meshes:bpy.data.objects.remove(o,do_unlink=True)
# Transform MPFB character to match the Sav 1.8m skeleton.
points=[body.matrix_world@v.co for v in body.data.vertices]
lo=min(p.z for p in points);hi=max(p.z for p in points)
cx=(min(p.x for p in points)+max(p.x for p in points))*.5
cy=(min(p.y for p in points)+max(p.y for p in points))*.5
scale=1.79/(hi-lo)
for o in meshes:
 world=o.matrix_world.copy()
 for v in o.data.vertices:
  p=world@v.co
  p=Vector(((p.x-cx)*scale,(p.y-cy)*scale,(p.z-lo)*scale+.055))
  v.co=o.matrix_world.inverted_safe()@p
 # Subtle integrated external pelvic contours on the continuous adult body mesh.
 # Front is -Y in the Sav rest pose. Deform existing vertices rather than
 # adding detached capsules, so skin remains continuous during articulation.
 if o == body:
  pelvis_z=(rig.matrix_world@rig.data.bones["Pelvis"].head_local).z
  # Identify the anterior pelvic surface from the actual normalized mesh.
  # The previous fixed Y threshold missed the body surface on some builds.
  pelvic_samples=[o.matrix_world@v.co for v in o.data.vertices
                  if abs((o.matrix_world@v.co).x)<.075
                  and pelvis_z-.18<(o.matrix_world@v.co).z<pelvis_z+.04]
  front_y=min((p.y for p in pelvic_samples),default=-.08)
  # Identify the local anterior surface separately for each height, avoiding
  # global front thresholds that can select the belly instead of the pelvis.
  pelvic_surface=[(p.z,p.y) for p in pelvic_samples]
  if len(pelvic_surface)<20:raise RuntimeError("Sav anterior pelvic surface not found")
  # Place the relief on the actual visible front skin, not at the rig joint.
  # Pelvis bone heads are inside the body and may be substantially higher.
  anatomy_z=pelvis_z-.145
  surface_rows={}
  for p in pelvic_samples:
   key=round(p.z/.012)
   surface_rows.setdefault(key,[]).append(p.y)
  if not surface_rows:raise RuntimeError("Sav pelvic surface rows unavailable")
  print("SAV_PELVIC_SCULPT_REFERENCE",round(anatomy_z,4),round(front_y,4),len(pelvic_samples))
  sculpted=0
  for v in o.data.vertices:
   p=o.matrix_world@v.co
   x,y,z=p.x,p.y,p.z
   # Fuller soft bust: broad bilateral anterior volume with a lower
   # gravity-biased pole. This is a rest-pose sculpt, not dynamic physics.
   chest_z=pelvis_z+.395
   breast_lobe=math.exp(-((abs(x)-.090)/.075)**2)
   breast_height=math.exp(-((z-(chest_z-.018))/.112)**2)
   chest_front=math.exp(-((y-front_y)/.22)**2)
   if z>pelvis_z+.19:
    y-=.034*breast_lobe*breast_height*chest_front
    # A small downward bias softens the lower breast silhouette.
    lower_pole=math.exp(-((z-(chest_z-.075))/.070)**2)
    y-=.013*breast_lobe*lower_pole*chest_front
   hip_band=math.exp(-((z-(pelvis_z+.055))/.155)**2)
   x+=math.copysign(min(abs(x),.24)*.145*hip_band,x)
   # Bilateral anatomical contours are shaped directly on the body surface.
   # No independent accessory mesh means no disconnected protruding capsules.
   nearby=[sy for sz,sy in pelvic_surface if abs(sz-z)<.025]
   surface_y=min(nearby) if nearby else front_y
   front=math.exp(-((y-surface_y)/.085)**2)
   # Broad rounded mons above the cleft; fades smoothly into abdomen and groin.
   mons=math.exp(-((z-(anatomy_z+.107))/.078)**2)*math.exp(-(x/.095)**4)
   y-=.031*front*mons
   z_center=anatomy_z
   # The superior cleft starts below the hood, not on the mons pubis.
   # Smoothstep at the upper junction tapers the folds into the pubic mound.
   superior=z_center+.057
   start=max(0.0,min(1.0,(superior-z)/.027))
   start=start*start*(3.0-2.0*start)
   inferior=max(0.0,min(1.0,(z-(z_center-.077))/.028))
   inferior=inferior*inferior*(3.0-2.0*inferior)
   vertical=math.exp(-((z-z_center)/.070)**4)*start*inferior
   outer=math.exp(-((abs(x)-.028)/.018)**2)
   inner=math.exp(-((abs(x)-.010)/.007)**2)
   groove=math.exp(-(x/.0045)**2)
   # Soft fuller bilateral outer contours, smaller inner folds, and a
   # naturally parted central depression. Subtle superior hood contour.
   # Keep all sculpting on the existing manifold body mesh.
   upper=math.exp(-((z-(z_center+.049))/.019)**2)
   hood=math.exp(-(x/.014)**2)*upper
   parted=math.exp(-(x/.008)**2)*math.exp(-((z-z_center)/.051)**2)
   delta=front*vertical*(.055*outer+.025*inner-.022*groove)
   delta+=front*(.007*hood-.005*parted*start*inferior)
   y-=delta
   if abs(delta)>.001 and abs(x)<.075 and abs(z-anatomy_z)<.09:sculpted+=1
   v.co=o.matrix_world.inverted_safe()@Vector((x,y,z))
  print("SAV_PELVIC_SCULPT_VERTICES",sculpted, "CENTER_Z", round(anatomy_z,4))
  # Assert the anatomical relief is not lost or absent in exported mesh.
  if sculpted < 25:
   raise RuntimeError("Sav realistic shell pelvic anatomy missing: refusing to publish")
  if sculpted<12:raise RuntimeError("Sav pelvic sculpt missed body topology")
 o.data.update()
 # MPFB accessory proxies can carry an independent origin/offset.
 # Align their world-space bounding center to the continuous body's head,
 # rather than allowing a second face to float above the scalp.
 if o != body and any(k in o.name.lower() for k in ("hair","eye","lash","brow","teeth")):
  body_head=[body.matrix_world@v.co for v in body.data.vertices if (body.matrix_world@v.co).z>1.48]
  if body_head:
   head_top=max(p.z for p in body_head)
   head_center=Vector((sum(p.x for p in body_head)/len(body_head),
                       sum(p.y for p in body_head)/len(body_head),
                       sum(p.z for p in body_head)/len(body_head)))
   ap=[o.matrix_world@v.co for v in o.data.vertices]
   if ap:
    ac=Vector((sum(p.x for p in ap)/len(ap),sum(p.y for p in ap)/len(ap),sum(p.z for p in ap)/len(ap)))
    label=o.name.lower()
    if "hair" in label:
     target=Vector((head_center.x,head_center.y+.015,head_top-.045))
    elif "teeth" in label:
     target=head_center+Vector((0,-.065,-.055))
    else:
     target=head_center+Vector((0,-.075,.020))
    shift=target-ac
    inv=o.matrix_world.inverted_safe()
    for v in o.data.vertices:v.co=inv@(o.matrix_world@v.co+shift)
    o.data.update()
 # Keep object world transforms stable when reparenting to the Sav armature.
 # Otherwise accessories can jump away from the face after export.
 world_before_parent=o.matrix_world.copy()
 # Existing MPFB weights refer to a different skeleton. Clear them.
 for vg in list(o.vertex_groups):o.vertex_groups.remove(vg)
 for m in list(o.modifiers):
  if m.type=="ARMATURE":o.modifiers.remove(m)
 # Weight by distance to Sav bone segments in rest space; retain 56 bones.
 groups={b.name:o.vertex_groups.new(name=b.name) for b in rig.data.bones}
 head_only=any(w in o.name.lower() for w in ("hair","eye","lash","brow","teeth","tongue"))
 for v in o.data.vertices:
  p=o.matrix_world@v.co
  if head_only:
   groups["Head"].add([v.index],1,"REPLACE")
   continue
  nearest=[]
  for b in rig.data.bones:
   if o == body and ("Finger" in b.name or b.name in ("Jaw",) or "Palm" in b.name):continue
   a=rig.matrix_world@b.head_local;c=rig.matrix_world@b.tail_local
   d=c-a
   t=max(0,min(1,(p-a).dot(d)/max(d.length_squared,1e-9)))
   dist=(p-(a+d*t)).length
   nearest.append((dist,b.name))
  nearest.sort()
  picks=nearest[:4]
  weights=[1/max(d,.022)**5 for d,_ in picks]
  total=sum(weights)
  for (_,name),w in zip(picks,weights):
   groups[name].add([v.index],w/total,"REPLACE")
 arm=o.modifiers.new("Sav56 deform","ARMATURE");arm.object=rig
 # Armature modifier performs deformation; do not also parent the mesh.
 # Double parent transforms were displacing face accessories on playback.
 o.parent=None
 o.matrix_world=world_before_parent
 for f in o.data.polygons:f.use_smooth=True
assert len(body.data.vertices)>10000,"Human shell unexpectedly low detail"
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT.resolve()),export_format="GLB",
 export_animations=True,export_skins=True,export_nla_strips=True,use_selection=True)
print("SAV_PROTOTYPE_SUCCESS",len(rig.data.bones),OUT.stat().st_size)
print("SAV_REAL_HUMAN_SHELL",len(body.data.vertices),len(meshes))
