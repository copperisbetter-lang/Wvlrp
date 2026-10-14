"""Jenny: child-proportioned, continuous real human model for The Wild.
A seven-year-old girl, fully clothed at all times in the viewer.
Uses original MakeHuman CC0 continuous, high-resolution body/face rather than
separate cylinder primitives. Rigged dress and shoes remain opaque.
"""
import bpy, math, json, zipfile, struct, sys
import numpy as np
from pathlib import Path
from mathutils import Vector, Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from face_materials import preserve_photo_skin, verify_photo_skin_glb
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'jenny-olive-plaid.glb'
OUT.parent.mkdir(parents=True,exist_ok=True)

def load_assets():
    path=Path('/tmp/mh-system.zip')
    if not path.exists():raise RuntimeError('Missing official MakeHuman CC0 system pack')
    base=Path(LocationService.get_user_data())
    allowed={'skins','hair','clothes','eyes','eyebrows','eyelashes','tongue','teeth','packs','proxymeshes','poses'}
    count=0
    with zipfile.ZipFile(path) as z:
        for member in z.infolist():
            parts=Path(member.filename).parts
            i=next((i for i,p in enumerate(parts) if p in allowed),None)
            if i is None or member.is_dir():continue
            rel=Path(*parts[i:])
            if '..' in rel.parts:continue
            dest=base/rel;dest.parent.mkdir(parents=True,exist_ok=True)
            with z.open(member) as src, open(dest,'wb') as target:
                import shutil;shutil.copyfileobj(src,target)
            count+=1
    if count<20:raise RuntimeError('Incomplete MakeHuman system assets')
    AssetService.invalidate_pack_metadata_cache()
    print('WVLRP_CHILD_SYSTEM_ASSETS',count)

def add_asset(body,kind,choices,asset_type):
    for name in choices:
        full=AssetService.find_asset_absolute_path(name,asset_subdir=kind)
        if full:return HumanService.add_mhclo_asset(full,body,asset_type=asset_type,material_type='GAMEENGINE')
    print('WVLRP_CHILD_ASSET_MISSING',kind,choices)
    return None

def material(name,rgb,rough=.8):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=0
    return m

def tint_hair(obj):
    for index,mat in enumerate(obj.data.materials):
        if not mat:continue
        m=mat.copy();m.name='Jenny naturally brown hair '+str(index)
        obj.data.materials[index]=m;m.use_nodes=True
        for nd in m.node_tree.nodes:
            if nd.type=='BSDF_PRINCIPLED':
                for lk in list(nd.inputs['Base Color'].links):m.node_tree.links.remove(lk)
                nd.inputs['Base Color'].default_value=(.205,.107,.065,1)
                nd.inputs['Roughness'].default_value=.72

def olive_skin(body):
    preserve_photo_skin(body,'Jenny')
    seen={}
    skin_count=0
    for mat in body.data.materials:
        if not mat or 'Jenny real CC0 face and body skin UV' not in mat.name:continue
        shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if not shader or not shader.inputs['Base Color'].links:continue
        src=shader.inputs['Base Color'].links[0].from_node
        if src.type!='TEX_IMAGE' or not src.image:continue
        image=src.image
        if image.name in seen:
            src.image=seen[image.name];skin_count+=1;continue
        copied=image.copy();copied.name='Jenny unified natural olive skin diffuse'
        width,height=copied.size
        px=np.empty(width*height*4,dtype=np.float32)
        copied.pixels.foreach_get(px)
        px=px.reshape((-1,4))
        # Retain natural UV texture detail, not a featureless single-color head.
        px[:,0]*=.86
        px[:,1]*=.79
        px[:,2]*=.68
        np.clip(px,0,1,out=px)
        copied.pixels.foreach_set(px.ravel())
        copied.file_format='PNG';copied.pack()
        src.image=copied
        seen[image.name]=copied;skin_count+=1
    if not skin_count:raise RuntimeError('Failed to tint continuous realistic face/body UV skin')
    print('WVLRP_CHILD_ONE_CONTINUOUS_SKIN',skin_count,'materials',len(body.data.vertices),'vertices')

def normalized(name):
    return ''.join(x for x in name.lower() if x.isalnum()).replace('mixamorig','')

def get_bone(rig,*names):
    byname={normalized(b.name):b.name for b in rig.data.bones}
    for name in names:
        if name in byname:return byname[name]
    return None

def make_plaid():
    n=384
    image=bpy.data.images.new('Jenny brown cranberry forest plaid',width=n,height=n,alpha=True)
    px=np.empty((n,n,4),dtype=np.float32)
    for y in range(n):
        for x in range(n):
            a=(x/n*7)%1;b=(y/n*7)%1
            fine=(.47<a<.50) or (.47<b<.50)
            navy=(.13<a<.31) or (.13<b<.31)
            maroon=(.70<a<.81) or (.70<b<.81)
            c=(.68,.57,.45) if fine else ((.17,.22,.29) if navy else ((.49,.21,.23) if maroon else (.39,.30,.29)))
            weave=1.-(.033 if (x+y)%4==0 else 0.)
            px[y,x,:3]=np.array(c)*weave;px[y,x,3]=1.
    image.pixels.foreach_set(px.ravel());image.file_format='PNG';image.pack()
    m=material('Jenny woven opaque plaid sundress',(.4,.3,.28),.95)
    texture=m.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image
    m.node_tree.links.new(texture.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    m.use_backface_culling=False
    return m

def make_dress(body,rig,root):
    """Tailor a real dress to THIS continuous child basemesh, not the former blob.

    Sample each cross-section of the actual exported human body. Fitted chest,
    waist and shoulder sections have a small fabric ease; the skirt flares only
    gently below the waist. These measurements are regenerated on every build.
    """
    plaid=make_plaid()
    cream=material('Jenny dress finishing seams',(.83,.78,.68))
    pts=[body.matrix_world@v.co for v in body.data.vertices]
    z0=min(p.z for p in pts)
    h=max(p.z for p in pts)-z0
    cx=(min(p.x for p in pts)+max(p.x for p in pts))*.5
    n=64
    v=[];f=[];materials=[];rings=[];fitted=[]
    def insert(p):
        v.append(tuple(p))
        return len(v)-1
    def quad(a,b,c,d,mi=0):
        f.append((a,b,c,d));materials.append(mi)
    def percentile(sorted_values,fraction):
        return sorted_values[min(len(sorted_values)-1,int(fraction*(len(sorted_values)-1)))]

    def body_section(level):
        z=z0+level*h
        # Keep the sample on the torso/upper legs, not the outstretched arms.
        # Earlier construction used one broad circular radius; it made the
        # clothing sized like the old rounded test avatar.
        sample=[]
        for tolerance in (.012,.022,.040,.062):
            sample=[p for p in pts if abs(p.z-z)<tolerance*h and abs(p.x-cx)<.145*h]
            if len(sample)>=30:break
        if len(sample)<20:
            raise RuntimeError('Insufficient realistic body cross-section for fitted dress at '+str(level))
        xs=sorted(p.x for p in sample)
        ys=sorted(p.y for p in sample)
        xl,xr=percentile(xs,.025),percentile(xs,.975)
        yb,yf=percentile(ys,.025),percentile(ys,.975)
        midx=(xl+xr)*.5
        midy=(yb+yf)*.5
        return midx,midy,max(.023*h,(xr-xl)*.5),max(.023*h,(yf-yb)*.5)

    # A fitted bodice and lightly flared knee-to-thigh length skirt.
    # No whole-body scaling, fixed mannequin ring, or inflated blob radius.
    levels=[.405,.423,.45,.48,.51,.54,.57,.595,.61,.635,.665,.69,.715]
    waist=body_section(.61)
    for j,l in enumerate(levels):
        ring=[]
        bx,by,rx_body,ry_body=body_section(l)
        if l>.69:
            # Arms at the upper chest can be inside the z slice: they are
            # NOT part of the dress bodice. Cap this ring to the adjacent
            # armless chest section instead of making a ballooning neckline.
            chest_core=body_section(.69)
            rx_body=min(rx_body,chest_core[2]+.012*h)
            bx=chest_core[0]
        if l<.61:
            # Cover hips/upper thighs without ballooning the dress.
            # At hem add only ~1.8cm for a 1m model, not the old ~7cm.
            flare=max(0.,(.61-l)/(.61-levels[0]))*.018*h
            # The skirt hangs from the fitted waist while clearing real hips.
            rx=max(rx_body+.012*h,waist[2]+.008*h)+flare
            ry=max(ry_body+.012*h,waist[3]+.008*h)+flare*.70
        else:
            # Gentle ease over chest/waist: ~8-11mm for a 1m-tall child.
            rx=rx_body+.010*h
            ry=ry_body+.011*h
        fitted.append(dict(z_fraction=l,skin_half_width=round(rx_body,5),
                           cloth_half_width=round(rx,5),skin_half_depth=round(ry_body,5),
                           cloth_half_depth=round(ry,5),
                           width_ratio=round(rx/rx_body,3),
                           depth_ratio=round(ry/ry_body,3)))
        for k in range(n):
            t=2*math.pi*k/n
            ripple=1+.005*math.sin(10*t) if l<.595 else 1.
            z=z0+l*h+(.002*h*math.sin(10*t) if j==0 else 0.)
            ring.append(insert((bx+rx*ripple*math.cos(t),
                                by+ry*ripple*math.sin(t),z)))
        if rings:
            prev=rings[-1]
            for k in range(n):
                k2=(k+1)%n
                quad(prev[k],prev[k2],ring[k2],ring[k])
        rings.append(ring)

    # Both shoulder straps sit on the actual body; no floating old-model fit.
    top=rings[-1]
    shoulder_section=body_section(.755)
    strap_x=max(.04*h,min(.072*h,shoulder_section[2]*.74))
    for side in (-1,1):
        x=cx+side*strap_x
        front=min((v[i] for i in top if (v[i][0]-cx)*side>0),
                  key=lambda p:abs(p[0]-x)+max(0,p[1]-shoulder_section[1])*2)
        back=min((v[i] for i in top if (v[i][0]-cx)*side>0),
                 key=lambda p:abs(p[0]-x)+max(0,shoulder_section[1]-p[1])*2)
        sx,sy,srx,sry=shoulder_section
        path=[front,(sx+side*strap_x,sy-sry-.009*h,z0+.751*h),
              (sx+side*strap_x,sy,z0+.770*h),
              (sx+side*strap_x,sy+sry+.009*h,z0+.751*h),back]
        strips=[]
        for p in path:
            strips.append((insert((p[0]-.008*h,p[1],p[2])),
                           insert((p[0]+.008*h,p[1],p[2]))))
        for k in range(len(strips)-1):
            a,b=strips[k];c,d=strips[k+1];quad(a,b,d,c)

    # Reject the oversized-bodice regression before publishing an outfit.
    for sec in fitted:
        if sec['z_fraction']>=.61 and (sec['width_ratio']>1.31 or sec['depth_ratio']>1.40):
            raise RuntimeError('Dress bodice is not fitted to child: '+str(sec))
    mesh=bpy.data.meshes.new('Measured, fitted child sundress cloth mesh')
    mesh.from_pydata(v,[],f);mesh.update()
    mesh.materials.append(plaid);mesh.materials.append(cream)
    uv=mesh.uv_layers.new(name='Plaid UV')
    for face in mesh.polygons:
        for loop_id in face.loop_indices:
            vertex=mesh.vertices[mesh.loops[loop_id].vertex_index].co
            angle=math.atan2(vertex.y-waist[1],vertex.x-waist[0])
            uv.data[loop_id].uv=((angle+math.pi)/(2*math.pi)*3,
                                  ((vertex.z-z0)/h)*7)
        face.use_smooth=True
    obj=bpy.data.objects.new('Jenny body-fitted opaque plaid sundress',mesh)
    bpy.context.collection.objects.link(obj)
    # Transfer the real body's rig weights to the fitted fabric. The previous
    # three-bone assignment moved the bodice independently of the torso.
    from mathutils.kdtree import KDTree
    kd=KDTree(len(body.data.vertices))
    for vi,vertex in enumerate(body.data.vertices):
        kd.insert(body.matrix_world @ vertex.co,vi)
    kd.balance()
    bone_names={g.index:g.name for g in body.vertex_groups}
    dress_groups={}
    hip=get_bone(rig,'hips','pelvis')
    if not hip:raise RuntimeError('Child hips bone missing for skirt')
    for i,coordinate in enumerate(v):
        l=(coordinate[2]-z0)/h
        if l<.595:
            weights={hip:1.0}  # hanging skirt follows pelvis, not individual legs
        else:
            weights={}
            neighbors=kd.find_n(Vector(coordinate),4)
            for _,idx,distance in neighbors:
                strength=1/max(distance,.002*h)**2
                for assignment in body.data.vertices[idx].groups:
                    bone=bone_names.get(assignment.group)
                    if bone and bone in rig.data.bones:
                        weights[bone]=weights.get(bone,0)+assignment.weight*strength
            total=sum(weights.values())
            if total>0:weights={bone:weight/total for bone,weight in weights.items()}
            else:weights={hip:1.0}
        for bone,weight in weights.items():
            if weight<=.0001:continue
            if bone not in dress_groups:
                dress_groups[bone]=obj.vertex_groups.new(name=bone)
            dress_groups[bone].add([i],weight,'REPLACE')
    obj.modifiers.new('Dress follows child armature','ARMATURE').object=rig
    world=obj.matrix_world.copy();obj.parent=root;obj.matrix_world=world
    print('WVLRP_CHILD_DRESS_FITTED_TO_REAL_BODY',json.dumps(fitted,sort_keys=True),
          'vertices',len(v),'height_m',round(h,3))
    return obj

def make_shoes(body,rig,root):
    pts=[body.matrix_world@v.co for v in body.data.vertices]
    floor=min(p.z for p in pts);h=max(p.z for p in pts)-floor
    shoes=material('Jenny trail shoes muted green',(.18,.28,.21))
    outsole=material('Jenny flexible shoe soles',(.19,.17,.15))
    done=0
    for side,label in [(1,'Left'),(-1,'Right')]:
        group=get_bone(rig,label.lower()+'foot',label.lower()+'toebase',label.lower()+'ankle')
        if not group:
            print('WVLRP_CHILD_SHOE_BONE_MISSING',label);continue
        feet=[p for p in pts if p.z<floor+.10*h and (p.x>0 if side==1 else p.x<0)]
        if len(feet)<12:continue
        x=(min(p.x for p in feet)+max(p.x for p in feet))*.5
        y=(min(p.y for p in feet)+max(p.y for p in feet))*.5
        sx=(max(p.x for p in feet)-min(p.x for p in feet))*.60
        sy=(max(p.y for p in feet)-min(p.y for p in feet))*.60
        sx=max(sx,.034*h);sy=max(sy,.078*h)
        for suffix,z,scale,mat in [('shoe',floor+.034*h,(sx,sy,.034*h),shoes),
                                   ('sole',floor+.009*h,(sx*1.03,sy*1.03,.009*h),outsole)]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=20,location=(x,y,z))
            ob=bpy.context.object;ob.name='Jenny '+label+' complete '+suffix
            ob.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
            ob.data.materials.append(mat)
            for face in ob.data.polygons:face.use_smooth=True
            g=ob.vertex_groups.new(name=group)
            g.add(list(range(len(ob.data.vertices))),1,'REPLACE')
            ob.modifiers.new('Follow child foot bone','ARMATURE').object=rig
            world=ob.matrix_world.copy();ob.parent=root;ob.matrix_world=world
            done+=1
    if done!=4:print('WVLRP_CHILD_SHOES_NOT_FINISHED',done)
    else:print('WVLRP_CHILD_REAL_FEET_WITH_TRAIL_SHOES',done)

def make_clips(rig):
    if not rig.animation_data:rig.animation_data_create()
    nm={normalized(b.name):b for b in rig.pose.bones}
    def k(name):return nm.get(name)
    all_bones=list(rig.pose.bones)
    # The source child is in an A-pose. Rotate the upper arms from their
    # actual rest-bone directions toward a relaxed, downward hanging stance.
    # Preserve a small natural gap beside the dress rather than a rigid T-pose.
    arm_corrections={}
    for side in ('left','right'):
        bone=k(side+'arm')
        if bone is None:
            raise RuntimeError('Missing upper arm for relaxed child stance: '+side)
        rest=bone.bone
        original=rest.tail_local-rest.head_local
        outward=1 if rest.tail_local.x>rest.head_local.x else -1
        target=Vector((outward*.12,0,-.993)).normalized()
        arm_corrections[normalized(bone.name)]=original.normalized().rotation_difference(target)
    def clip(name,frames):
        action=bpy.data.actions.new(name)
        rig.animation_data.action=action
        for frame,values in frames:
            for b in all_bones:
                key=normalized(b.name)
                delta=Euler(values.get(key,(0,0,0)),'XYZ')
                if key in arm_corrections:
                    b.rotation_mode='QUATERNION'
                    b.rotation_quaternion=arm_corrections[key] @ delta.to_quaternion()
                    b.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=b.name)
                else:
                    b.rotation_mode='XYZ'
                    b.rotation_euler=delta
                    b.keyframe_insert(data_path='rotation_euler',frame=frame,group=b.name)
        rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,frames[0][0],action)
        strip.action_frame_start=frames[0][0]
        strip.action_frame_end=frames[-1][0]
    clip('Jenny Idle',[(1,{}),(18,{'spine':(.018,0,0)}),(35,{})])
    clip('Jenny Wave',[(1,{}),(12,{'rightarm':(0,-.85,0),'rightforearm':(.25,0,0)}),
                                (21,{'rightarm':(0,-.85,0),'rightforearm':(-.16,0,.2)}),
                                (30,{'rightarm':(0,-.85,0),'rightforearm':(.23,0,-.2)}),(41,{})])
    clip('Jenny Hands and Knees',[(1,{}),(16,{'spine':(.42,0,0),'leftupleg':(-.65,0,0),'rightupleg':(-.65,0,0),'leftleg':(1.1,0,0),'rightleg':(1.1,0,0),'leftarm':(.65,0,0),'rightarm':(.65,0,0)}),(32,{'spine':(.62,0,0),'leftupleg':(-1.0,0,0),'rightupleg':(-1.0,0,0),'leftleg':(1.35,0,0),'rightleg':(1.35,0,0),'leftarm':(.95,0,0),'rightarm':(.95,0,0)}),(48,{})])
    clip('Jenny Elbows and Knees',[(1,{}),(16,{'spine':(.45,0,0),'leftupleg':(-.75,0,0),'rightupleg':(-.75,0,0),'leftleg':(1.15,0,0),'rightleg':(1.15,0,0),'leftarm':(.75,0,0),'rightarm':(.75,0,0),'leftforearm':(-.8,0,0),'rightforearm':(-.8,0,0)}),(32,{'spine':(.68,0,0),'leftupleg':(-1.0,0,0),'rightupleg':(-1.0,0,0),'leftleg':(1.35,0,0),'rightleg':(1.35,0,0),'leftarm':(.9,0,0),'rightarm':(.9,0,0),'leftforearm':(-1.1,0,0),'rightforearm':(-1.1,0,0)}),(48,{})])
    clip('Jenny Run',[(1,{}),(7,{'leftupleg':(.48,0,0),'rightupleg':(-.48,0,0),'leftleg':(.25,0,0),'rightleg':(.65,0,0),'leftarm':(-.35,0,0),'rightarm':(.35,0,0)}),(13,{'leftupleg':(-.48,0,0),'rightupleg':(.48,0,0),'leftleg':(.65,0,0),'rightleg':(.25,0,0),'leftarm':(.35,0,0),'rightarm':(-.35,0,0)}),(19,{})])
    clip('Jenny Walk',[(1,{}),(13,{'leftupleg':(.24,0,0),'rightupleg':(-.24,0,0),
                                         'leftarm':(-.14,0,0),'rightarm':(.14,0,0)}),
                                 (25,{'leftupleg':(-.24,0,0),'rightupleg':(.24,0,0),
                                         'leftarm':(.14,0,0),'rightarm':(-.14,0,0)}),(37,{})])
    clip('Jenny Bend',[(1,{}),(18,{'spine':(.65,0,0),'spine1':(.3,0,0),'neck':(-.2,0,0)}),(30,{'spine':(.65,0,0),'spine1':(.3,0,0),'neck':(-.2,0,0)}),(48,{})])
    clip('Jenny Pick Up',[(1,{}),(16,{'spine':(.78,0,0),'spine1':(.25,0,0),'leftarm':(.55,0,0),'rightarm':(.55,0,0)}),(26,{'spine':(.78,0,0),'spine1':(.25,0,0),'leftarm':(.75,0,0),'rightarm':(.75,0,0)}),(48,{})])
    clip('Jenny Sit',[(1,{}),(18,{'leftupleg':(-1.05,0,0),'rightupleg':(-1.05,0,0),'leftleg':(1.18,0,0),'rightleg':(1.18,0,0)}),(32,{'leftupleg':(-1.05,0,0),'rightupleg':(-1.05,0,0),'leftleg':(1.18,0,0),'rightleg':(1.18,0,0)}),(48,{})])
    for b in all_bones:
        if normalized(b.name) in arm_corrections:
            b.rotation_mode='QUATERNION'
            b.rotation_quaternion=arm_corrections[normalized(b.name)]
        else:b.rotation_euler=(0,0,0)
    bpy.context.scene.frame_set(1)

def main():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    load_assets()
    h=HumanService.create_human()
    h.name='Jenny realistic continuous child basemesh'
    # MakeHuman age macro: 0=1yr, .1875=10yr, so .125 = approx age 7.
    values={'gender':0.,'age':.125,'weight':.51,'muscle':.48,
            'height':.51,'proportions':.52,'cupsize':0.,'firmness':.5}
    for key,val in values.items():
        HumanObjectProperties.set_value(key,val,entity_reference=h)
    TargetService.reapply_macro_details(h)
    age=float(HumanObjectProperties.get_value('age',entity_reference=h))
    assert abs(age-.125)<.001, 'Child age morph failed'
    skin=AssetService.find_asset_absolute_path('young_caucasian_female.mhmat',asset_subdir='skins')
    if not skin:raise RuntimeError('Real photographic CC0 body skin missing')
    HumanService.set_character_skin(skin,h,skin_type='GAMEENGINE')
    if HumanService.add_builtin_rig(h,'mixamo') is None:raise RuntimeError('Child skeleton missing')
    for typ,options,label in [
        ('eyes',['high-poly.mhclo','low-poly.mhclo'],'Eyes'),
        ('eyebrows',['eyebrow001.mhclo'],'Eyebrows'),
        ('eyelashes',['eyelashes01.mhclo'],'Eyelashes')]:
        add_asset(h,typ,options,label)
    hair=add_asset(h,'hair',['long01.mhclo'],'Hair')
    if hair is None:raise RuntimeError('Brown hair mesh not available')
    tint_hair(hair)
    root=ExportService.create_character_copy(h,name_suffix='_child_export')
    body=ObjectService.find_object_of_type_amongst_nearest_relatives(root,'Basemesh')
    if body is None:raise RuntimeError('Full human body not present in export')
    ExportService.bake_modifiers_remove_helpers(body,
        bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
    for modifier in list(body.modifiers):
        if modifier.type=='MASK':body.modifiers.remove(modifier)
    if any(x.type=='MASK' for x in body.modifiers):raise RuntimeError('Skin cutout mask retained')
    assert len(body.data.vertices)>10000,'Refusing low-poly limb cylinders instead of a body'
    # Entire face/neck/torso/hands/legs/feet form one continuous MPFB mesh.
    olive_skin(body)
    relatives=[root]+list(ObjectService.get_list_of_children(root))
    rig=next((obj for obj in relatives if obj.type=='ARMATURE'),None)
    if rig is None or len(rig.data.bones)<25:raise RuntimeError('Complete skeleton missing')
    make_dress(body,rig,root)
    # Keep the child's modeled bare feet; the old oversized ellipsoid shoes
    # looked like detached objects on both sides of the character.
    # Recolor original iris material only, never the eye whites.
    for ob in relatives:
        if ob.type!='MESH' or 'eye' not in ob.name.lower():continue
        for i,ma in enumerate(ob.data.materials):
            if ma and 'iris' in ma.name.lower():
                green=material('Jenny natural green iris',(.16,.36,.20),.35)
                ob.data.materials[i]=green
    make_clips(rig)
    # Scale the COMPLETE child, including rig, all skin and fabric meshes,
    # BEFORE GLB export. Browser-only mesh scaling left the imported body
    # measured at adult height (1.666m) even though the user wants age seven.
    bpy.context.view_layer.update()
    before_pts=[body.matrix_world@v.co for v in body.data.vertices]
    built_height=max(p.z for p in before_pts)-min(p.z for p in before_pts)
    if built_height<=.4:raise RuntimeError('Unable to measure complete child height')
    scale_factor=1.22/built_height
    root.scale=tuple(axis*scale_factor for axis in root.scale)
    bpy.context.view_layer.update()
    after_pts=[body.matrix_world@v.co for v in body.data.vertices]
    scaled_height=max(p.z for p in after_pts)-min(p.z for p in after_pts)
    if not 1.19<scaled_height<1.25:
        raise RuntimeError('Child rig height export failed: '+str(scaled_height))
    print('WVLRP_JENNY_EXPORTED_CHILD_HEIGHT',round(scaled_height,4),
          'from',round(built_height,4),'uniform_factor',round(scale_factor,5))
    chosen=[root]+list(ObjectService.get_list_of_children(root))
    bpy.ops.object.select_all(action='DESELECT')
    for ob in set(chosen):ob.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',
        use_selection=True,export_animations=True,export_nla_strips=True,
        export_materials='EXPORT',export_yup=True)
    bs=OUT.read_bytes()
    assert bs[:4]==b'glTF' and struct.unpack_from('<I',bs,8)[0]==len(bs)
    size,kind=struct.unpack_from('<II',bs,12)
    meta=json.loads(bs[20:20+size])
    verify_photo_skin_glb(meta,'Jenny')
    assert len(meta.get('skins',[{}])[0].get('joints',[]))>=25
    assert len(meta.get('animations',[]))>=3
    assert any('plaid sundress' in m.get('name','') for m in meta.get('materials',[]))
    print('WVLRP_JENNY_REAL_SUCCESS',OUT.stat().st_size,
          'human_body_vertices',len(body.data.vertices),
          'joint_count',len(meta['skins'][0]['joints']),
          'animations',[a['name'] for a in meta['animations']])
def render_full_body_preview(body):
    """Proof-of-build full body preview for visual QA, independent of web viewer."""
    pts=[body.matrix_world@v.co for v in body.data.vertices]
    low=min(p.z for p in pts)
    tall=max(p.z for p in pts)-low
    cx=(min(p.x for p in pts)+max(p.x for p in pts))*.5
    cy=(min(p.y for p in pts)+max(p.y for p in pts))*.5
    scene=bpy.context.scene
    bpy.ops.object.camera_add(location=(cx,cy-tall*2.8,low+tall*.54))
    cam=bpy.context.object
    cam.name='Jenny full human head-to-toe preview camera'
    target=Vector((cx,cy,low+tall*.53))
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'
    cam.data.ortho_scale=tall*1.44
    scene.camera=cam
    for pos,power,sz in [((-1.0,-1.5,2.5),550,2.4),((1.5,.6,2.1),400,2.0)]:
        light=bpy.data.lights.new('Jenny soft studio fill','AREA')
        light.energy=power;light.size=sz
        ob=bpy.data.objects.new('Jenny soft light',light)
        bpy.context.collection.objects.link(ob)
        ob.location=(cx+pos[0]*tall,cy+pos[1]*tall,low+pos[2]*tall)
        ob.rotation_euler=(target-ob.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES'
    scene.cycles.samples=12
    scene.render.resolution_x=680;scene.render.resolution_y=1000
    scene.render.resolution_percentage=100
    scene.render.film_transparent=False
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(ROOT/'assets'/'jenny-real-full-body-preview.png')
    scene.view_settings.view_transform='AgX'
    bpy.ops.render.render(write_still=True)
    print('WVLRP_CHILD_HEAD_TO_TOE_PREVIEW_SAVED',scene.render.filepath,
          Path(scene.render.filepath).stat().st_size,'height_m',round(tall,3))

if __name__=='__main__':
    main()
    try:
        body=next(obj for obj in bpy.data.objects
                  if obj.type=='MESH' and 'Jenny realistic continuous child basemesh' in obj.name)
        render_full_body_preview(body)
    except Exception as exc:
        print('WVLRP_CHILD_PREVIEW_FAILED_NOT_A_GLB_FAILURE',repr(exc))

