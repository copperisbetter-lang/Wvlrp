"""Young Explorer: child-proportioned, continuous real human model for The Wild.
A seven-year-old girl, fully clothed at all times in the viewer.
Uses original MakeHuman CC0 continuous, high-resolution body/face rather than
separate cylinder primitives. Rigged dress and shoes remain opaque.
"""
import bpy, math, json, zipfile, struct, sys
import numpy as np
from pathlib import Path
from mathutils import Vector
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
OUT=ROOT/'assets'/'young-explorer-olive-plaid.glb'
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
        m=mat.copy();m.name='Young Explorer naturally brown hair '+str(index)
        obj.data.materials[index]=m;m.use_nodes=True
        for nd in m.node_tree.nodes:
            if nd.type=='BSDF_PRINCIPLED':
                for lk in list(nd.inputs['Base Color'].links):m.node_tree.links.remove(lk)
                nd.inputs['Base Color'].default_value=(.205,.107,.065,1)
                nd.inputs['Roughness'].default_value=.72

def olive_skin(body):
    preserve_photo_skin(body,'Young Explorer')
    seen={}
    skin_count=0
    for mat in body.data.materials:
        if not mat or 'Young Explorer real CC0 face and body skin UV' not in mat.name:continue
        shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if not shader or not shader.inputs['Base Color'].links:continue
        src=shader.inputs['Base Color'].links[0].from_node
        if src.type!='TEX_IMAGE' or not src.image:continue
        image=src.image
        if image.name in seen:
            src.image=seen[image.name];skin_count+=1;continue
        copied=image.copy();copied.name='Young Explorer unified natural olive skin diffuse'
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
    image=bpy.data.images.new('Young Explorer brown cranberry forest plaid',width=n,height=n,alpha=True)
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
    m=material('Young Explorer woven opaque plaid sundress',(.4,.3,.28),.95)
    texture=m.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image
    m.node_tree.links.new(texture.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    m.use_backface_culling=False
    return m

def make_dress(body,rig,root):
    plaid=make_plaid()
    cream=material('Young Explorer dress finishing seams',(.83,.78,.68))
    pts=[body.matrix_world@v.co for v in body.data.vertices]
    z0=min(p.z for p in pts);h=max(p.z for p in pts)-z0
    cx=(min(p.x for p in pts)+max(p.x for p in pts))*.5
    mid=[p for p in pts if z0+.55*h<p.z<z0+.7*h and abs(p.x-cx)<.075*h]
    cy=sum(p.y for p in mid)/max(1,len(mid))
    n=48;v=[];f=[];materials=[];rings=[]
    def insert(p):v.append(tuple(p));return len(v)-1
    def quad(a,b,c,d,mi=0):f.append((a,b,c,d));materials.append(mi)
    def section(l):
        z=z0+l*h
        found=[p for p in pts if abs(p.z-z)<.02*h and abs(p.x-cx)<.13*h]
        if len(found)<20:found=[p for p in pts if abs(p.z-z)<.045*h and abs(p.x-cx)<.17*h]
        if len(found)<15:raise RuntimeError('Cannot fit child dress to human torso at '+str(l))
        vals=sorted(p.y for p in found)
        return found,(vals[int(.13*(len(vals)-1))]+vals[int(.87*(len(vals)-1))])*.5
    def radius(l,t):
        sample,m=section(l)
        ux,uy=math.cos(t),math.sin(t)
        near=[]
        for p in sample:
            dx,dy=p.x-cx,p.y-m
            length=math.hypot(dx,dy)
            if length>.002*h and (dx*ux+dy*uy)/length>.84:near.append(length)
        if len(near)<3:near=[max(0.,(p.x-cx)*ux+(p.y-m)*uy) for p in sample]
        near.sort()
        return max(.03*h,near[int(.85*(len(near)-1))])
    levels=[.44,.456,.48,.51,.54,.57,.60,.63,.666,.695,.712]
    waist=[radius(.61,2*math.pi*i/n) for i in range(n)]
    for j,l in enumerate(levels):
        ring=[]
        for k in range(n):
            t=2*math.pi*k/n
            if l<.61:
                r=max(waist[k]+(.069*h)*(.61-l)/(.61-.44),radius(.61,t)+.015*h)
                r*=1+.009*math.sin(t*11)
            else:
                r=radius(min(.713,l),t)+.009*h
                if l>.68:r=min(r,.116*h)
            _,my=section(max(.61,l))
            z=z0+l*h+(.002*h*math.sin(11*t) if j==0 else 0)
            ring.append(insert((cx+r*math.cos(t),my+r*math.sin(t),z)))
        if rings:
            prev=rings[-1]
            for k in range(n):k2=(k+1)%n;quad(prev[k],prev[k2],ring[k2],ring[k])
        rings.append(ring)
    # Proper neckline: shoulders covered by straps; full dress is child-appropriate.
    top=rings[-1]
    for side in [-1,1]:
        x=cx+side*.068*h
        front=min((v[i] for i in top if (v[i][0]-cx)*side>0),key=lambda p:abs(p[0]-x)+max(0,p[1]-cy)*2)
        back=min((v[i] for i in top if (v[i][0]-cx)*side>0),key=lambda p:abs(p[0]-x)+max(0,cy-p[1])*2)
        path=[front,(x,cy-.050*h,z0+.762*h),(x,cy,z0+.781*h),
              (x,cy+.050*h,z0+.762*h),back]
        strips=[]
        for p in path:
            strips.append((insert((p[0]-.006*h,p[1],p[2])),
                           insert((p[0]+.006*h,p[1],p[2]))))
        for k in range(len(strips)-1):
            a,b=strips[k];c,d=strips[k+1];quad(a,b,d,c)
    mesh=bpy.data.meshes.new('Complete child sundress 3D cloth mesh')
    mesh.from_pydata(v,[],f);mesh.update()
    mesh.materials.append(plaid);mesh.materials.append(cream)
    uv=mesh.uv_layers.new(name='Plaid UV')
    # Continuous plaid coverage with natural fabric folds.
    for face in mesh.polygons:
        for loop_id in face.loop_indices:
            vertex=mesh.vertices[mesh.loops[loop_id].vertex_index].co
            a=math.atan2(vertex.y-cy,vertex.x-cx)
            uv.data[loop_id].uv=((a+math.pi)/(2*math.pi)*3,
                                  ((vertex.z-z0)/h)*7)
        face.use_smooth=True
    obj=bpy.data.objects.new('Young Explorer fitted opaque plaid sundress',mesh)
    bpy.context.collection.objects.link(obj)
    hip=get_bone(rig,'hips','pelvis')
    spine=get_bone(rig,'spine','spine1')
    chest=get_bone(rig,'spine2','chest','upperchest') or spine
    if not hip or not spine:raise RuntimeError('Young Explorer bone groups missing')
    groups={n:obj.vertex_groups.new(name=n) for n in {hip,spine,chest}}
    for i,(_,_,z) in enumerate(v):
        l=(z-z0)/h
        if l<.61:weights={hip:1.}
        elif l<.69:weights={hip:(.69-l)/.08,spine:(l-.61)/.08}
        else:weights={spine:max(0,(.79-l)/.10),chest:min(1,max(0,(l-.69)/.10))}
        for name,w in weights.items():
            if w>0:groups[name].add([i],w,'REPLACE')
    obj.modifiers.new('Dress follows human bones','ARMATURE').object=rig
    world=obj.matrix_world.copy();obj.parent=root;obj.matrix_world=world
    print('WVLRP_CHILD_DRESS_FITTED',len(v),'vertices','hem_fraction',levels[0])
    return obj

def make_shoes(body,rig,root):
    pts=[body.matrix_world@v.co for v in body.data.vertices]
    floor=min(p.z for p in pts);h=max(p.z for p in pts)-floor
    shoes=material('Young Explorer trail shoes muted green',(.18,.28,.21))
    outsole=material('Young Explorer flexible shoe soles',(.19,.17,.15))
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
            ob=bpy.context.object;ob.name='Young Explorer '+label+' complete '+suffix
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
    def clip(name,frames):
        action=bpy.data.actions.new(name)
        rig.animation_data.action=action
        for frame,values in frames:
            for b in all_bones:
                b.rotation_mode='XYZ'
                b.rotation_euler=values.get(normalized(b.name),(0,0,0))
                b.keyframe_insert(data_path='rotation_euler',frame=frame,group=b.name)
        rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,frames[0][0],action)
        strip.action_frame_start=frames[0][0]
        strip.action_frame_end=frames[-1][0]
    clip('Young Explorer Idle',[(1,{}),(18,{'spine':(.018,0,0)}),(35,{})])
    clip('Young Explorer Wave',[(1,{}),(12,{'rightarm':(0,-.85,0),'rightforearm':(.25,0,0)}),
                                (21,{'rightarm':(0,-.85,0),'rightforearm':(-.16,0,.2)}),
                                (30,{'rightarm':(0,-.85,0),'rightforearm':(.23,0,-.2)}),(41,{})])
    clip('Young Explorer Walk',[(1,{}),(13,{'leftupleg':(.24,0,0),'rightupleg':(-.24,0,0),
                                         'leftarm':(-.14,0,0),'rightarm':(.14,0,0)}),
                                 (25,{'leftupleg':(-.24,0,0),'rightupleg':(.24,0,0),
                                         'leftarm':(.14,0,0),'rightarm':(-.14,0,0)}),(37,{})])
    for b in all_bones:b.rotation_euler=(0,0,0)
    bpy.context.scene.frame_set(1)

def main():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    load_assets()
    h=HumanService.create_human()
    h.name='Young Explorer realistic continuous child basemesh'
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
    make_shoes(body,rig,root)
    # Recolor original iris material only, never the eye whites.
    for ob in relatives:
        if ob.type!='MESH' or 'eye' not in ob.name.lower():continue
        for i,ma in enumerate(ob.data.materials):
            if ma and 'iris' in ma.name.lower():
                green=material('Young Explorer natural green iris',(.16,.36,.20),.35)
                ob.data.materials[i]=green
    make_clips(rig)
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
    verify_photo_skin_glb(meta,'Young Explorer')
    assert len(meta.get('skins',[{}])[0].get('joints',[]))>=25
    assert len(meta.get('animations',[]))>=3
    assert any('plaid sundress' in m.get('name','') for m in meta.get('materials',[]))
    print('WVLRP_YOUNG_EXPLORER_REAL_SUCCESS',OUT.stat().st_size,
          'human_body_vertices',len(body.data.vertices),
          'joint_count',len(meta['skins'][0]['joints']),
          'animations',[a['name'] for a in meta['animations']])
if __name__=='__main__':main()
