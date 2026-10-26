"""V3 Brooke neck repair candidate on isolated derived output.
Reuses audited V2 scene assembly only; never overwrites source GLBs or V2.
Fail closed if any original source anchors change.
"""
from pathlib import Path
source=Path('avatar-work/brooke/second-chance/build_3948_swap.py').read_text()
def swap(old,new):
 global source
 assert source.count(old)==1, 'Missing/ambiguous V2 patch anchor '+old[:65]
 source=source.replace(old,new,1)
swap("OUT=BASE+'brooke-3-1-3948-rig-experimental.glb'",
     "OUT=BASE+'brooke-3-1-v3-neck-fit-experimental.glb'")
swap("REPORT=BASE+'brooke-3-1-experimental-check.json'",
     "REPORT=BASE+'brooke-3-1-v3-neck-fit-check.json'")
swap("to_canonical=Th.inverted()\n# Preserve source image texture and UV; build raised crown directly into working mesh.",
"""to_canonical=Th.inverted()
# Remove the rectangular lower bust shelf and keep only head/upper neck.
# This uses a real polygon-plane intersection, not vertex-only selection,
# so the new bottom is bounded at one reproducible scan elevation.
crop_y=-.20
pre_scan_vertices=len(h.data.vertices)
bm=bmesh.new();bm.from_mesh(h.data)
scangeom=list(bm.verts)+list(bm.edges)+list(bm.faces)
bmesh.ops.bisect_plane(bm,geom=scangeom,dist=.00001,
    plane_co=Th@Vector((0,crop_y,0)),
    plane_no=Th.to_3x3()@Vector((0,1,0)),
    clear_inner=True,clear_outer=False)
bm.to_mesh(h.data);bm.free();h.data.update()
verts=h.data.vertices
assert len(verts)<pre_scan_vertices-20000, 'Bust crop did not remove lower scan'
assert all((to_canonical@v.co).y>=crop_y-.0005 for v in verts), 'Scan bust left below clipping plane'
print('BROOKE_V3_SCAN_CROP',json.dumps({'before':pre_scan_vertices,'after':len(verts),'cut_y':crop_y}))
# Preserve source image texture and UV; build raised crown directly into working mesh.""")
swap("placement=Tb@Matrix.Translation(Vector((.0118137358,1.708908886,.0253151481)))@Matrix.Scale(.29,4)@Th.inverted()",
"""# Position using the *actual imported body armature head joint*, not
# the V2 hardcoded 1.7089m translation that produced the giant gap.
# Let the planar scan neck crop overlap the surviving body-neck edge by
# 12 mm; an independent torso-colored neck underlay masks open skin.
assert up==2, 'V3 requires audited Blender Z-up body coordinates'
head_scale=.29
head_joint_world=bodyrigs[0].matrix_world@bodyrigs[0].data.bones['mixamorig:Head'].head_local
place_y=float(head_joint_world.z-crop_y*head_scale-.012)
placement=Tb@Matrix.Translation(Vector((float(head_joint_world.x),place_y,.0253151481)))@Matrix.Scale(head_scale,4)@Th.inverted()
print('BROOKE_V3_REGISTERED_NECK',json.dumps({'head_joint_world':list(head_joint_world),
    'crop_y':crop_y,'crop_world_z':place_y+crop_y*head_scale,
    'head_origin_world_z':place_y,'old_v2_origin_world_z':1.708908886}))
""")
swap("h.matrix_world=placement;rig.matrix_world=placement\nbpy.context.view_layer.update()",
"""h.matrix_world=placement;rig.matrix_world=placement
bpy.context.view_layer.update()
# The independent facial rig must follow the approved BODY head joint.
# Parent the facial armature to that bone while preserving its rest pose.
keep_world=rig.matrix_world.copy()
rig.parent=bodyrigs[0]
rig.parent_type='BONE'
rig.parent_bone='mixamorig:Head'
rig.matrix_world=keep_world
bpy.context.view_layer.update()
assert rig.parent==bodyrigs[0] and rig.parent_bone=='mixamorig:Head'
# Create a deliberately independent SKIN-COLORED NECK UNDERLAY.
# This is a visible-gap mitigation, NOT a watertight welded seam claim.
# It sits below the cropped head and covers the irregular body opening.
from math import sin,cos,pi
origin=bodyrigs[0].matrix_world@bodyrigs[0].data.bones['mixamorig:Head'].head_local
verts_c=[];faces_c=[];count=48
layers=[(-.090,.077),(-.057,.072),(-.021,.065),(.016,.061),(.045,.059)]
for dz,radius in layers:
    for j in range(count):
        theta=2*pi*j/count
        verts_c.append((origin.x+radius*cos(theta),
            origin.y+radius*.91*sin(theta),origin.z+dz))
for k in range(len(layers)-1):
    for j in range(count):
        a=k*count+j;b=k*count+(j+1)%count
        faces_c.append((a,b,b+count,a+count))
neck_mesh=bpy.data.meshes.new('Brooke_V3_Neck_Underlay_Geometry')
neck_mesh.from_pydata(verts_c,[],faces_c);neck_mesh.update()
neck=bpy.data.objects.new('Brooke_V3_Neck_Underlay',neck_mesh)
bpy.context.collection.objects.link(neck)
neck_mat=bpy.data.materials.new('Brooke_V3_Torso_Skin_Underlay_Not_ExactTextureMatch')
neck_mat.diffuse_color=(.77,.56,.48,1)
neck_mat.use_nodes=True
bsdf=neck_mat.node_tree.nodes.get('Principled BSDF')
if bsdf: bsdf.inputs['Base Color'].default_value=(.77,.56,.48,1)
neck.data.materials.append(neck_mat)
neck.parent=bodyrigs[0]
neck.parent_type='BONE';neck.parent_bone='mixamorig:Head'
neck.matrix_world=Matrix.Identity(4)
# Set relative transform to keep geometry in world-space.
neck.matrix_world=Matrix.Identity(4)
bpy.context.view_layer.update()
print('BROOKE_V3_UNDERLAY',json.dumps({'vertices':len(verts_c),
    'faces':len(faces_c),'head_bone_parent':neck.parent_bone}))
""")
swap("'head_scale':0.29,'head_raise_m':0.190,'head_source':'3948'",
     "'head_scale':0.29,'head_raise_m':place_y-1.708908886,'head_source':'3948','v3_crop_y':crop_y,'v3_scan_vertices_removed':pre_scan_vertices-len(verts),'v3_facial_rig_parent_bone':rig.parent_bone,'v3_underlay_not_welded':True")
swap("'not_verified':['mouth cavity/topology','face likeness','skin color match','pose quality','neck seam','phone viewer']",
     "'not_verified':['mouth cavity/topology','face likeness','skin color match','all body poses','welded neck seam','phone viewer']")
exec(compile(source,'v3_patched_build_3948_swap.py','exec'),globals())
