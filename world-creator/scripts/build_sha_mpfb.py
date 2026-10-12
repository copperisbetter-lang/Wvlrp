"""WVLRP Sha adult unclothed base avatar. Separate new adult game avatar.
Uses MPFB CC0 anatomy/skin, real ash-platinum wavy hair, and Mixamo skeleton.
No garments in this base-mesh development stage. Does not change other avatars. Requires visual QA.
"""
import bpy, os, sys, zipfile, json, math, traceback
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mathutils import Vector
from face_materials import preserve_photo_skin, verify_photo_skin_glb

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "sha-mpfb-trial.glb"
PNG = ROOT / "assets" / "sha-mpfb-trial-preview.png"

# MPFB is installed as a Blender extension into the workflow's local repository.
from bl_ext.wvlrp_local.mpfb.services.humanservice import HumanService
from bl_ext.wvlrp_local.mpfb.services.targetservice import TargetService
from bl_ext.wvlrp_local.mpfb.services.assetservice import AssetService
from bl_ext.wvlrp_local.mpfb.services.locationservice import LocationService
from bl_ext.wvlrp_local.mpfb.services.exportservice import ExportService
from bl_ext.wvlrp_local.mpfb.services.objectservice import ObjectService
from bl_ext.wvlrp_local.mpfb.entities.objectproperties import HumanObjectProperties

def load_system_pack():
    pack = Path("/tmp/mh-system.zip")
    if not pack.exists():
        raise RuntimeError("Missing MakeHuman system CC0 asset pack")
    root=Path(LocationService.get_user_data())
    categories={"skins","hair","clothes","eyes","eyebrows","eyelashes","tongue","teeth","packs","proxymeshes","poses"}
    count=0
    with zipfile.ZipFile(pack) as z:
        for member in z.infolist():
            parts=Path(member.filename).parts
            idx=next((i for i,p in enumerate(parts) if p in categories),None)
            if idx is None or member.is_dir(): continue
            rel=Path(*parts[idx:])
            if ".." in rel.parts: continue
            dest=root/rel
            dest.parent.mkdir(parents=True,exist_ok=True)
            with z.open(member) as src, open(dest,"wb") as dst:
                import shutil
                shutil.copyfileobj(src,dst)
            count+=1
    print("WVLRP_ASSETS_INSTALLED",count,root)
    if count < 20:
        raise RuntimeError("Asset pack contained fewer than 20 usable files")
    AssetService.invalidate_pack_metadata_cache()

def add_asset(basemesh, subdir, names, asset_type):
    for name in names:
        f=AssetService.find_asset_absolute_path(name,asset_subdir=subdir)
        if f:
            print("WVLRP_ASSET",asset_type,name)
            return HumanService.add_mhclo_asset(f,basemesh,asset_type=asset_type,material_type="GAMEENGINE")
    print("WVLRP_ASSET_MISSING",asset_type,names)
    return None

def tint(mesh, color, roughness=.78):
    if not mesh: return
    for i, mat in enumerate(mesh.data.materials):
        if not mat: continue
        mat=mat.copy()
        mesh.data.materials[i]=mat
        mat.use_nodes=True
        for n in mat.node_tree.nodes:
            if n.type=="BSDF_PRINCIPLED":
                # Many MakeHuman hair materials have an image connected to
                # Base Color, which would override the requested red swatch.
                # Keep hair-card opacity/alpha links; detach ONLY Base Color.
                for link in list(mat.node_tree.links):
                    if link.to_node==n and link.to_socket.name=="Base Color":
                        mat.node_tree.links.remove(link)
                n.inputs["Base Color"].default_value=(*color,1)
                n.inputs["Roughness"].default_value=roughness
                n.inputs["Metallic"].default_value=0

def add_soft_waves(hair):
    """Shape the lower lengths into more visible, soft, offset waves.
    Keep the front hairline and scalp anchored, and retain the real hair mesh.
    This does not change the avatar body, armature, or facial shape keys.
    """
    if not hair or hair.type!="MESH": return
    vs=hair.data.vertices
    if not vs: return
    zlo=min(v.co.z for v in vs); zhi=max(v.co.z for v in vs)
    depth=max(zhi-zlo,.001)
    for v in vs:
        p=v.co
        t=(zhi-p.z)/depth
        amp=.026*max(0.0,min(1.0,(t-.24)/.34))
        # Two offset, soft wavelengths: not a uniform zigzag or new object.
        p.x+=amp*math.sin((p.z-zlo)*18.0+p.x*8.0)
        p.y+=amp*.44*math.sin((p.z-zlo)*15.0+p.x*6.0)
    hair.data.update()
    print("WVLRP_SHA_HAIR_WAVES",len(vs))


def replace_cape_with_layered_hair(hair_obj, body, rig, export_root):
    """Replace only Sha's stock hair SHELL with scalp-fitted, tapered locks.

    Original body and rig remain intact. Hair is weighted to the same Head
    bone, so all five existing body poses keep the hairstyle attached.
    """
    import random
    from math import pi, sin, cos
    from mathutils import Vector
    if not hair_obj or hair_obj.type != "MESH":
        raise RuntimeError("Sha flowing hair: no export hair mesh")
    head_bone=next((b.name for b in rig.data.bones
                    if b.name.lower().split(":")[-1]=="head"),None)
    if not head_bone:
        raise RuntimeError("Sha flowing hair: no rig head bone")
    body_pts=[body.matrix_world @ v.co for v in body.data.vertices]
    zlo=min(v.z for v in body_pts); zhi=max(v.z for v in body_pts)
    height=zhi-zlo
    # The former cap used zhi (highest *basemesh* vertex) as the scalp.
    # In the actual exported Sha avatar it produced a floating bald-cap
    # above her visible forehead. Her EYES provide a stable anatomical
    # reference for the skull even when a basemesh vertex has an outlying Z.
    family=[export_root]+list(ObjectService.get_list_of_children(export_root))
    eye_objects=[ob for ob in family if ob.type=="MESH" and
                 ("high-poly" in ob.name.lower() or
                  ("eye" in ob.name.lower() and not any(
                      k in ob.name.lower() for k in
                      ("eyebrow","eyelash","iris","hair"))))]
    eye_pts=[ob.matrix_world @ v.co for ob in eye_objects
             for v in ob.data.vertices]
    if len(eye_pts)<28:
        raise RuntimeError("Sha flowing hair: exported eyes missing; "
                           "refusing to position wig from an unreliable body top")
    else:
        eye_z=sum(p.z for p in eye_pts)/len(eye_pts)
        eye_mid_x=(min(p.x for p in eye_pts)+max(p.x for p in eye_pts))*.5
    # An adult eye-to-crown distance is approximately 7% of stature.
    # Never place Sha's top hair ABOVE an outlying basemesh vertex.
    scalp_z=min(zhi-.010*height, eye_z+.090*height)  # Crown anchored to eyes, not a stray vertex.
    skull_band=[v for v in body_pts
                if scalp_z-.038*height<v.z<scalp_z+.011*height
                and abs(v.x-(eye_mid_x or 0.))<.10*height]
    if len(skull_band)<20:
        raise RuntimeError("Sha hair: no scalp surface near eye-anchored crown")
    xmid=(min(v.x for v in skull_band)+max(v.x for v in skull_band))*.5
    ymid=(min(v.y for v in skull_band)+max(v.y for v in skull_band))*.5
    print("WVLRP_SHA_HAIR_SCALP_ANCHOR",
          "basemesh_top",round(zhi,4),"eyes",round(eye_z,4),
          "scalp_top",round(scalp_z,4),
          "lowering",round(zhi-scalp_z,4),
          "skull_samples",len(skull_band))
    rng=random.Random(110126)
    inv=hair_obj.matrix_world.inverted_safe()
    vertices=[]; faces=[]; indexes=[]
    def p(world):
        vertices.append(tuple(inv @ world))
        return len(vertices)-1
    def polygon(inds,material):
        faces.append(tuple(inds));indexes.append(material)
    # HAIR-ONLY scalp: NEVER copy MPFB head polygons into the hairstyle.
    # Copying that skin geometry caused the mobile viewer's extra floating
    # mannequin head. This separate closed crown is made solely of new hair
    # vertices; it contains no nose, mouth, ear, or duplicate face surfaces.
    skull_pts=[q for q in body_pts if
              eye_z+.052*height < q.z < zhi+.002*height and
              abs(q.x-xmid)<.100*height and abs(q.y-ymid)<.120*height]
    if len(skull_pts)<180:
        raise RuntimeError("Hair crown cannot locate Sha's original skull")
    core=sorted((q.z for q in skull_pts if
                 abs(q.x-xmid)<.018*height and
                 abs(q.y-ymid)<.030*height))
    if len(core)<25:
        raise RuntimeError("Hair crown centerline has too few mesh samples")
    # The MPFB head has a stray high-Z region ~11 cm above the photographed
    # face; using the 97th-percentile skull height made a giant white helmet.
    # Use the anatomically eye-anchored crown previously measured instead.
    # Lower the hair to the visible MPFB photographed forehead, not the
    # high disconnected scalp estimate. Eyes anchor the TRUE top of head.
    crown_top=eye_z+.079*height
    hairline_z=eye_z+.047*height
    if crown_top < hairline_z+.022*height:
        raise RuntimeError("Sha scalp landmarks are inconsistent")
    cap_rings=[]
    sectors=48
    for row in range(14):
        t=(row+.012)/13.012
        polar=(math.pi/2)*t
        rad=math.sin(polar)
        level=hairline_z+(crown_top-hairline_z)*math.cos(polar)
        ring=[]
        for k in range(sectors):
            az=2*math.pi*k/sectors
            ring.append(p(Vector((xmid+height*.058*rad*math.cos(az),
                 ymid+height*.070*rad*math.sin(az),level))))
        # Thin crown coverage, fitted close to the real head. This scalp
        # sheet is exclusively artificial HAIR geometry, not a head copy.
        # Swept long locks overlap its border so it has no visible hem.
        if cap_rings:
            prior=cap_rings[-1]
            for k in range(sectors):
                nxt=(k+1)%sectors
                polygon((prior[k],ring[k],ring[nxt],prior[nxt]),1)
        cap_rings.append(ring)
    # Root locks ON the new hair-only crown surface. No transformed copies
    # of any face/head vertex are ever included in the exported hair mesh.
    scalp_roots=[Vector(vertices[i]) for ring in cap_rings for i in ring]
    scalp_roots=[hair_obj.matrix_world @ q for q in scalp_roots]
    def near_root(target):
        return min(scalp_roots,key=lambda q:(q-target).length_squared)
    print("WVLRP_SHA_HAIR_ONLY_CAP",
          "new_cap_vertices",len(cap_rings)*sectors,
          "no_copied_head_polygons",True,
          "crown_top",round(crown_top,4),
          "hairline",round(hairline_z,4))
    # Actual three-dimensional, tapered locks: no single flat curtain mesh.
    def lock(root,length,spread,wave,phase,width,tone):
        previous=None
        sections=28;sides=5
        for step in range(sections):
            t=step/(sections-1)
            # Subtle waves build down the lengths, naturally tapered ends.
            center=Vector((root.x+spread*t+wave*sin(4.6*pi*t+phase)*t,
                           root.y+height*.010*t+wave*.57*cos(4.2*pi*t+phase)*t,
                           root.z-length*t))
            rad=width*max(.075,(1-t)**.82)
            ring=[]
            for k in range(sides):
                angle=2*pi*k/sides
                ring.append(p(center+Vector((rad*cos(angle),
                                             .66*rad*sin(angle),0))))
            if previous:
                for k in range(sides):
                    n=(k+1)%sides
                    polygon((previous[k],previous[n],ring[n],ring[k]),tone)
            previous=ring
    # Crown/back/side layers. Each staggered strand has a distinct endpoint,
    # thickness and wave phase; varied platinum shading avoids plastic shine.
    for layer in range(5):
        for i in range(68):
            a=pi*(i+.37*(layer%2))/67
            side=cos(a)
            back=max(0.,sin(a))
            root=near_root(Vector((xmid+height*(.054-.004*layer)*side,
                         ymid+height*(.009+.047*back),
                         crown_top-height*(.016+.010*layer))))
            length=height*(.245+.026*layer+rng.uniform(-.018,.038))
            lock(root,length,height*(.025*side+rng.uniform(-.007,.007)),
                 height*rng.uniform(.014,.024),rng.uniform(0,2*pi),
                 height*rng.uniform(.0040,.0052),
                 (i+layer*2)%4)
    # Separate wisps frame BOTH cheeks; none cover the eye openings.
    for side in (-1,1):
        for i in range(23):
            t=i/22
            root=near_root(Vector((xmid+side*height*(.052+.008*t),
                         ymid-height*(.022-.011*t),
                         crown_top-height*(.028+.016*t))))
            lock(root,height*(.135+.116*t+rng.uniform(-.012,.029)),
                 side*height*(.010+.018*t),
                 height*rng.uniform(.012,.022),rng.uniform(0,2*pi),
                 height*rng.uniform(.0033,.0046),(i+1)%4)
    # Swept front locks disguise the crown seam and form a soft center part.
    # Unlike a rigid scalp helmet, these overlap the dome as flowing strands.
    for side in (-1,1):
        for i in range(34):
            t=(i+.5)/34
            root=near_root(Vector((xmid+side*height*(.045+.018*t),
                  ymid-height*.023,
                  crown_top-height*(.023+.012*t))))
            lock(root,height*(.18+.12*t+rng.uniform(-.012,.015)),
                 side*height*(.011+.017*t),
                 height*rng.uniform(.013,.021),
                 rng.uniform(0,2*pi),
                 height*rng.uniform(.0041,.0050),
                 (i+1)%4)
    # No over-crown plait bundles: those formed the protruding rigid shelf
    # visible in side views. The scalp shell and side/back locks remain.
    print("WVLRP_SHA_HAIR_NO_CROWN_SHELF",True)
    mesh=bpy.data.meshes.new("Sha layered flowing wavy hair")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    hair_obj.data=mesh
    shades=[(.065,.050,.045),(.085,.066,.058),(.055,.044,.042),(.095,.075,.065)]
    for j,rgb in enumerate(shades):
        mat=bpy.data.materials.new("Sha natural dark brunette flowing hair "+str(j))
        mat.use_nodes=True
        mat.diffuse_color=(*rgb,1.)
        bsdf=mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value=(*rgb,1.)
        bsdf.inputs["Roughness"].default_value=.76+j*.013
        bsdf.inputs["Metallic"].default_value=0.
        mesh.materials.append(mat)
    for face,mi in zip(mesh.polygons,indexes):
        face.material_index=mi
        face.use_smooth=True
    hair_obj.vertex_groups.clear()
    group=hair_obj.vertex_groups.new(name=head_bone)
    group.add(list(range(len(vertices))),1.,"REPLACE")
    for modifier in hair_obj.modifiers:
        if modifier.type=="ARMATURE": modifier.object=rig
    if not any(m.type=="ARMATURE" for m in hair_obj.modifiers):
        hair_obj.modifiers.new("Sha hair follows head rig","ARMATURE").object=rig
    print("WVLRP_SHA_FLOWING_STRAND_HAIR",len(vertices),len(faces),
          "head_bone",head_bone,"world_height",round(height,3),
          "removed_stock_cape",True)


def add_temporary_sundress(body, rig, export_root):
    """Independently skinned removable sleeveless blue summer dress.
    Never change the underlying approved body or skeleton.
    """
    from math import pi,sin,cos
    pts=[body.matrix_world @ v.co for v in body.data.vertices]
    low=min(p.z for p in pts)
    h=max(p.z for p in pts)-low
    cx=(min(p.x for p in pts)+max(p.x for p in pts))*.5
    core=[p for p in pts if low+.57*h<p.z<low+.74*h and abs(p.x-cx)<.06*h]
    cy=sum(p.y for p in core)/len(core) if core else 0.
    verts=[];faces=[];material_ids=[];rows=[]
    def point(x,y,z):
        verts.append((x,y,z));return len(verts)-1
    def quad(indices,m=0):
        faces.append(tuple(indices));material_ids.append(m)
    n=48
    # Follow THIS avatar's actual exported MPFB torso instead of generic
    # height-scaled torso/hip rings. Do not touch her saved body mesh.
    # Sample local cross-sections while excluding arms from the torso fit.
    # Coordinates are in world space like the original body profile.
    def body_section(level):
        z=low+level*h
        side_cap=.151*h if level>.675 else .179*h
        sample=[p for p in pts
                if abs(p.z-z)<.018*h and abs(p.x-cx)<side_cap]
        if len(sample)<36:
            sample=[p for p in pts
                    if abs(p.z-z)<.034*h and abs(p.x-cx)<side_cap]
        if len(sample)<20:
            raise RuntimeError("Sha dress cannot sample torso at level "+str(level))
        # Median depth places each slice around its real body, not a generic
        # front/back center; explicit sampling keeps the dress with Sha.
        ys=sorted(p.y for p in sample)
        mid_y=(ys[int(.08*(len(ys)-1))]+ys[int(.92*(len(ys)-1))])*.5
        return sample,mid_y
    def cloth_radius(level,angle):
        sample,mid_y=body_section(level)
        ux=math.cos(angle); uy=math.sin(angle)
        # Select vertices in a forward-facing angular sector. The result
        # follows skin contours (including bust/waist), not an ellipse.
        near=[]
        for p in sample:
            dx=p.x-cx;dy=p.y-mid_y
            r=math.hypot(dx,dy)
            if r<.004*h:continue
            alignment=(dx*ux+dy*uy)/r
            if alignment>.89:
                near.append(r)
        if len(near)<3:
            near=[max(0,(p.x-cx)*ux+(p.y-mid_y)*uy) for p in sample]
        near.sort()
        skin_r=near[int(.87*(len(near)-1))]
        return max(.035*h,skin_r)
    # Upper fitted bodice from chest to waist, then a gentle cloth skirt.
    levels=(.385,.415,.455,.505,.555,.600,.630,.680,.707)
    # Evaluate once per cross-section; the hem gets a modest flare while
    # the bodice has only ~1.1 cm of ease above Sha's actual skin.
    waist_profile=[cloth_radius(.610,2*math.pi*j/n) for j in range(n)]
    for k,level in enumerate(levels):
        ring=[]
        for j in range(n):
            angle=2*math.pi*j/n
            real_skin=cloth_radius(max(level,.515),angle)
            if level>=.600:
                radius=real_skin+.007*h
                if level>.660:
                    # At the clavicle the MPFB section includes shoulders
                    # and upper arms. Don't turn that into giant dress wings.
                    max_upper=(.108 if level>.690 else .119)*h
                    radius=min(radius,max_upper)
            else:
                flare=(.600-level)/(.600-.385)
                radius=max(real_skin+.011*h,
                    waist_profile[j]+(.053*h)*flare)
            # Fabric folds only in the SKIRT, never distort the torso.
            if level<.60: radius*=1+.018*math.sin(10*angle)
            z=low+level*h
            if k==0:z+=.009*h*math.sin(8*angle)
            elif k==len(levels)-1:z-=.003*h*max(0,-math.sin(angle))
            sample,mid_y=body_section(max(level,.515))
            ring.append(point(cx+radius*math.cos(angle),
                              mid_y+radius*math.sin(angle),z))
        if rows:
            previous=rows[-1]
            for j in range(n):
                nxt=(j+1)%n
                quad((previous[j],previous[nxt],ring[nxt],ring[j]),
                     0 if j//6%2 else 1)
        rows.append(ring)
    print("WVLRP_SHA_BODY_FITTED_DRESS",
          "source_vertex_count",len(pts),
          "sampled_bodice",True,"ring_count",len(rows))
    # Two straps bridging the front neckline and upper back, over shoulders.
    for side in (-1,1):
        x=cx+side*.080*h
        # Anchor straps to the actual front/back bodice ring, rather than
        # fixed offsets that leave straps floating beside the shoulders.
        top_ring=rows[-1]
        front=min((verts[k] for k in top_ring if (verts[k][0]-cx)*side>0),
                  key=lambda q:abs(q[0]-x)+max(0,q[1]-cy)*3)
        back=min((verts[k] for k in top_ring if (verts[k][0]-cx)*side>0),
                 key=lambda q:abs(q[0]-x)+max(0,cy-q[1])*3)
        path=[(front[0],front[1],front[2]),
              (x,cy-.055*h,low+.756*h),
              (x,cy-.005*h,low+.780*h),
              (x,cy+.050*h,low+.755*h),
              (back[0],back[1],back[2])]
        pairs=[]
        for x1,y1,z1 in path:
            pairs.append((point(x1-.0035*h,y1,z1),point(x1+.0035*h,y1,z1)))
        for j in range(len(pairs)-1):
            quad((pairs[j][0],pairs[j][1],pairs[j+1][1],pairs[j+1][0]),0)
    # Seam follows the actual fitted bodice ring rather than a rigid oval.
    seam=rows[6]
    for j in range(n):
        j2=(j+1)%n
        v=verts[seam[j]];v2=verts[seam[j2]]
        ia=point(v[0],v[1],v[2]-.002*h)
        ib=point(v2[0],v2[1],v2[2]-.002*h)
        ic=point(v2[0],v2[1],v2[2]+.002*h)
        id=point(v[0],v[1],v[2]+.002*h)
        quad((ia,ib,ic,id),2)
    mesh=bpy.data.meshes.new("Sha removable summer dress cloth")
    mesh.from_pydata(verts,[],faces);mesh.update()
    garment=bpy.data.objects.new("Sha temporary sundress",mesh)
    bpy.context.collection.objects.link(garment)
    for name,rgb in [
        ("Sundress blue cotton",(.39,.66,.83)),
        ("Sundress pale blue cotton",(.43,.71,.87)),
        ("Sundress ivory trim",(.94,.88,.73))
    ]:
        mat=bpy.data.materials.new(name)
        mat.use_nodes=True;mat.diffuse_color=(*rgb,1.)
        shader=mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value=(*rgb,1.)
        shader.inputs["Roughness"].default_value=.9
        mesh.materials.append(mat)
    for face,mat_index in zip(mesh.polygons,material_ids):
        face.material_index=mat_index;face.use_smooth=True
    def normalized(name):
        return ''.join(c for c in name.lower() if c.isalnum()).replace("mixamorig","")
    matches={normalized(b.name):b.name for b in rig.data.bones}
    def find(*names):
        return next((matches[x] for x in names if x in matches),None)
    hips=find("hips","pelvis")
    spine=find("spine","spine1")
    chest=find("spine2","upperchest","chest") or spine
    if not hips or not spine:raise RuntimeError("Sundress armature hips/spine missing")
    groups={name:garment.vertex_groups.new(name=name) for name in {hips,spine,chest}}
    for index,(_,_,z) in enumerate(verts):
        t=(z-low)/h
        if t<=.605:weights={hips:1.}
        elif t<.70:weights={hips:(.70-t)/.095,spine:(t-.605)/.095}
        else:weights={spine:max(0,(.82-t)/.12),
                       chest:min(1.,max(0,(t-.70)/.12))}
        for bone,weight in weights.items():
            if weight>0.0001:groups[bone].add([index],weight,"REPLACE")
    garment.modifiers.new("Sha dress skeleton follow","ARMATURE").object=rig
    origin=garment.matrix_world.copy()
    garment.parent=export_root
    garment.matrix_world=origin
    print("WVLRP_SHA_SUNDRESS_BUILT",len(verts),len(faces),
          "rigged",True,"hem_width_m",round(2*.158*h,3),"bodice_width_m",round(2*.113*h,3))
    return garment


def soften_sha_face_only(body):
    """Very restrained adult facial contour correction; NO torso/limb edits.

    Model eyes are not enlarged. Preserve original CC0 skin UV, mesh topology,
    head rig and both natural-smile morphs.
    """
    from math import exp
    vs=body.data.vertices
    low=min(v.co.z for v in vs); high=max(v.co.z for v in vs)
    h=high-low
    center=(min(v.co.x for v in vs)+max(v.co.x for v in vs))*.5
    # Model-space bounds and soft continuous falloffs prevent visible ridges.
    eye_z=high-.069*h
    front=min(v.co.y for v in vs if eye_z-.018*h<v.co.z<eye_z+.018*h
              and abs(v.co.x-center)<.061*h)
    changed=0
    for v in vs:
        pos=v.co
        dx=(pos.x-center)/h
        dz=(pos.z-eye_z)/h
        if dz> .055 or dz<-.112 or abs(dx)>.095:
            continue
        forward=exp(-((pos.y-front)/(.074*h))**2)
        # Heavy brow ridges are gently pressed back, not cut away.
        brow=exp(-((dz-.020)/.016)**2)*exp(-((abs(dx)-.029)/.041)**2)
        # Slight nose bridge refinement; do NOT alter overall eye width.
        bridge=exp(-((dz+.025)/.028)**2)*exp(-(abs(dx)/.031)**4)
        # Taper the hard lower jaw while retaining recognizable anatomy.
        jaw=exp(-((dz+.083)/.028)**2)*exp(-((abs(dx)-.053)/.046)**2)
        cheek=exp(-((dz+.033)/.026)**2)*exp(-((abs(dx)-.056)/.025)**2)
        before=(pos.x,pos.y)
        pos.x=center+(pos.x-center)*(1.-forward*(.035*bridge+.048*jaw))
        pos.y+=h*forward*(.0018*brow+.0011*bridge-.0012*cheek)
        if abs(pos.x-before[0])+abs(pos.y-before[1])>1e-7:
            changed+=1
    body.data.update()
    print("WVLRP_SHA_SOFT_FACE_ONLY",changed,
          "body_and_eye_size_unchanged",True)


def add_light_blue_eyes(export_root, body, rig):
    """Natural-sized muted blue irises following the head; eyes not resized."""
    from math import sin,cos,pi
    from mathutils import Vector
    objs=[export_root]+list(ObjectService.get_list_of_children(export_root))
    eyes=[ob for ob in objs if ob.type=="MESH"
          and (("high-poly" in ob.name.lower()) or
               (("eye" in ob.name.lower()) and
                not any(x in ob.name.lower() for x in ("eyebrow","eyelash"))))]
    if not eyes:
        print("WVLRP_SHA_EYE_WARNING no eye asset: leave original eyes")
        return
    body_coords=[v.co for v in body.data.vertices]
    max_z=max(v.z for v in body_coords)
    h=max_z-min(v.z for v in body_coords)
    mid=(max(v.x for v in body_coords)+min(v.x for v in body_coords))*.5
    inv=body.matrix_world.inverted_safe()
    pts=[inv@(ob.matrix_world@v.co) for ob in eyes for v in ob.data.vertices]
    # Separate two spherical eyeballs spatially; never scale either.
    vertices=[];polys=[];mat_ids=[]
    radius_limit=.0070*h
    for side in (-1,1):
        side_pts=[p for p in pts if (p.x-mid)*side>.013*h and
                  p.z>max_z-.16*h]
        if len(side_pts)<28:
            print("WVLRP_SHA_IRIS_SIDE_WARNING",side,len(side_pts))
            continue
        xmin=min(p.x for p in side_pts);xmax=max(p.x for p in side_pts)
        zmin=min(p.z for p in side_pts);zmax=max(p.z for p in side_pts)
        cx=(xmin+xmax)*.5;cz=(zmin+zmax)*.5
        # Front-most eyeball point, not the forehead or eyelid.
        fore=[p for p in side_pts if abs(p.x-cx)<(xmax-xmin)*.24
              and abs(p.z-cz)<(zmax-zmin)*.24]
        if len(fore)<4:fore=side_pts
        yf=min(p.y for p in fore)
        r=min(radius_limit,(xmax-xmin)*.18,(zmax-zmin)*.18)
        if r<.002*h:continue
        # Curved iris follows the existing eye sphere to avoid sticker look.
        def vert(rad,ang):
            t=rad/r
            vertices.append((cx+rad*cos(ang),yf-.0010*h+.0011*h*t*t,
                             cz+rad*sin(ang)))
            return len(vertices)-1
        rings=[]
        for fraction in (.12,.32,.44,.64,.84,1.):
            rings.append([vert(r*fraction,2*pi*k/40) for k in range(40)])
        vertices.append((cx,yf-.0010*h,cz));center_id=len(vertices)-1
        for k in range(40):
            n=(k+1)%40
            polys.append((center_id,rings[0][k],rings[0][n]))
            mat_ids.append(0)
        # Dark natural pupil, soft iris fibers, and a thin blue outer ring.
        for j in range(len(rings)-1):
            for k in range(40):
                n=(k+1)%40
                polys.append((rings[j][k],rings[j+1][k],
                              rings[j+1][n],rings[j][n]))
                mat_ids.append((0,1,2,1,3)[j])
    if not polys:
        print("WVLRP_SHA_EYE_WARNING no acceptable iris anchor")
        return
    mesh=bpy.data.meshes.new("Sha natural light-blue iris geometry")
    mesh.from_pydata(vertices,[],polys);mesh.update()
    names_colors=[
        ("dark realistic pupils",(.075,.105,.13)),
        ("light blue iris",(.46,.69,.81)),
        ("soft iris fibers",(.32,.53,.67)),
        ("subtle limbal ring",(.18,.36,.51))
    ]
    for name,rgb in names_colors:
        m=bpy.data.materials.new("Sha "+name)
        m.use_nodes=True;m.diffuse_color=(*rgb,1.)
        bsdf=m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value=(*rgb,1.)
        bsdf.inputs["Roughness"].default_value=.32
        bsdf.inputs["Metallic"].default_value=0.
        m.use_backface_culling=False
        mesh.materials.append(m)
    for p,i in zip(mesh.polygons,mat_ids):p.material_index=i
    obj=bpy.data.objects.new("Sha light blue eyes (unchanged size)",mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent=export_root
    obj.matrix_world=body.matrix_world.copy()
    head=next((b.name for b in rig.data.bones if
               b.name.lower().split(":")[-1]=="head"),None)
    if not head: raise RuntimeError("Sha eye iris requires head bone")
    g=obj.vertex_groups.new(name=head);g.add(list(range(len(vertices))),1.,"REPLACE")
    obj.modifiers.new("Sha iris head motion","ARMATURE").object=rig
    print("WVLRP_SHA_LIGHT_BLUE_IRISES",len(polys),
          "eyes_unchanged_size",True)


def clean_skin_material(body):
    """Use the original licensed UV skin detail, not a flat color swatch."""
    return preserve_photo_skin(body, "Sha")


def add_natural_smile(body):
    """Use official CC0 ARKit face morphs instead of altering face colors."""
    pack=Path("/tmp/mh-faceunits.zip")
    if not pack.exists():
        raise RuntimeError("Official CC0 MakeHuman Faceunits 01 archive missing")
    found={}
    with zipfile.ZipFile(pack) as archive:
        for member in archive.infolist():
            if member.is_dir(): continue
            base=Path(member.filename).name.lower().replace("_","").replace("-","")
            if not (base.endswith(".target") or base.endswith(".target.gz")): continue
            for side in ("left","right"):
                if "mouthsmile"+side in base or "smilemouth"+side in base:
                    name="wvlrp_sha_smile_"+side+(".target.gz" if base.endswith(".gz") else ".target")
                    dest=Path("/tmp")/name
                    with archive.open(member) as src,open(dest,"wb") as out:
                        import shutil
                        shutil.copyfileobj(src,out)
                    found[side]=dest
                    print("WVLRP_SHA_FACEUNIT",side,member.filename,dest.stat().st_size)
    if set(found)!={"left","right"}:
        raise RuntimeError("Faceunits 01 lacks bilateral mouth smile targets: "+str(found))
    for side in ("left","right"):
        key=TargetService.load_target(body,str(found[side]),
            weight=.52,name="Sha Natural Smile "+side.capitalize())
        if key is None: raise RuntimeError("Sha smile morph could not be loaded: "+side)
        key.value=0.0  # Relaxed, neutral expression is the exported default; viewer can animate the smile.
        print("WVLRP_SHA_SMILE_MORPH",side,key.name,key.value)


def polish_anatomical_shape(body):
    """Subtle slim-waist/hip adjustment on the ORIGINAL continuous MPFB body mesh.
    Keep morph-based bust contour intact; no separate breast geometry, no garment.
    """
    import math
    verts=body.data.vertices
    lo=min(v.co.z for v in verts)
    hi=max(v.co.z for v in verts)
    tall=max(hi-lo,0.001)
    cx=(max(v.co.x for v in verts)+min(v.co.x for v in verts))*.5
    for v in verts:
        p=v.co
        z=(p.z-lo)/tall
        if abs(p.x-cx)>tall*.19: continue
        waist=math.exp(-((z-.625)/.078)**2)
        hips=math.exp(-((z-.52)/.080)**2)
        narrow=.058*waist+.038*hips
        p.x=cx+(p.x-cx)*(1-narrow)
        p.y*=1-.027*waist-.020*hips
    body.data.update()
    print("WVLRP_SHA_CONTINUOUS_BODY_POLISHED",len(verts))


def check_and_repair_pelvic_surface(body):
    """Check original unclothed topology at the pelvis, not just polygon total.

    A closed, solid-looking body must have no stray open crotch border.
    Only fill a small, fully enclosed boundary loop in the pelvic midline.
    Never run a generic 'fill all holes' (mouth/eyelids/fingers can be open).
    Reuse existing skin/rigged rim vertices to preserve bone weights.
    """
    import bmesh
    from collections import defaultdict
    bm=bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()
    coords=[v.co for v in bm.verts]
    lo=min(v.z for v in coords); hi=max(v.z for v in coords)
    tall=hi-lo
    cx=(min(v.x for v in coords)+max(v.x for v in coords))*.5
    if tall<=0: raise RuntimeError("Sha body has invalid bounds")
    def in_pelvis(v):
        z=(v.co.z-lo)/tall
        return .35 <= z <= .65 and abs(v.co.x-cx) <= .19*tall
    boundaries=[e for e in bm.edges if e.is_boundary]
    candidates=[e for e in boundaries if all(in_pelvis(v) for v in e.verts)]
    print("WVLRP_SHA_TOPOLOGY_BEFORE","boundary_edges",len(boundaries),
          "pelvis_boundary_edges",len(candidates))
    # Gather WHOLE boundary components so we never close a huge hole by
    # selecting only its few edges that happen to pass near the crotch.
    near=set(candidates)
    incident=defaultdict(set)
    for e in boundaries:
        for v in e.verts: incident[v].add(e)
    visited=set(); filled=0
    for start in candidates:
        if start in visited: continue
        stack=[start]; component=set()
        while stack:
            edge=stack.pop()
            if edge in component: continue
            component.add(edge)
            for v in edge.verts: stack.extend(incident[v]-component)
        visited.update(component)
        rim={v for edge in component for v in edge.verts}
        perimeter=sum(e.calc_length() for e in component)
        if not all(in_pelvis(v) for v in rim): continue
        # A small local opening (not waist, leg cuff, or a body-sized cut).
        if perimeter > .42*tall or len(component)>500: continue
        if len(component)<3: continue
        try:
            result=bmesh.ops.holes_fill(bm,edges=list(component),sides=0)
            patches=result.get("faces",[])
            for face in patches: face.smooth=True
            filled+=len(patches)
            print("WVLRP_SHA_PELVIS_PATCH","rim",len(component),
                  "perimeter_m",round(perimeter,4),"faces",len(patches))
        except Exception as exc:
            bm.free()
            raise RuntimeError("Unable to close Sha's small pelvic hole") from exc
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    # Fresh mesh after repair verifies there is no unresolved pelvic edge.
    audit=bmesh.new();audit.from_mesh(body.data)
    remaining=[e for e in audit.edges if e.is_boundary and
              all(.35 <= (v.co.z-lo)/tall <= .65 and
                  abs(v.co.x-cx)<=.19*tall for v in e.verts)]
    print("WVLRP_SHA_PELVIS_QA","patched_faces",filled,
          "remaining_open_edges",len(remaining))
    audit.free()
    if remaining:
        raise RuntimeError("Pelvic mesh still has %d exposed hole edges" % len(remaining))


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    load_system_pack()
    h=HumanService.create_human()
    h.name="Sha - MPFB original body mesh"
    # Brand-new adult Sha character; parametric modeling, no photo likeness.
    # Measurements are visual targets, not calibrated scanner measurements.
    # The original trial mistakenly chose male (1.0) at the gender macro.
    # MPFB macro cupsize 1.0 = maximum, firmness 0.0 = minimum.
    # Use its actual continuous anatomy targets, rather than rigid add-on spheres.
    for key,val in [("gender",0.0),("age",.38),("weight",.39),
                    ("muscle",.28),("height",.52),("proportions",.46),
                    ("cupsize",.46),("firmness",.43)]:
        try:
            HumanObjectProperties.set_value(key,val,entity_reference=h)
            print("WVLRP_PROP",key,val)
        except Exception as ex:
            print("WVLRP_PROP_SKIPPED",key,str(ex)[:140])
    TargetService.reapply_macro_details(h)
    for key,expected in (("gender",0.0),("cupsize",.46),("firmness",.43)):
        actual=float(HumanObjectProperties.get_value(key,entity_reference=h))
        print("WVLRP_VERIFY_MACRO",key,actual)
        if abs(actual-expected)>.01:
            raise RuntimeError("Sha macro mismatch for "+key)

    skin=AssetService.find_asset_absolute_path("young_caucasian_female.mhmat",asset_subdir="skins")
    if not skin: raise RuntimeError("MakeHuman CC0 skin missing")
    HumanService.set_character_skin(skin,h,skin_type="GAMEENGINE")
    arm=HumanService.add_builtin_rig(h,"mixamo")
    if arm is None: raise RuntimeError("MPFB Mixamo skeleton creation failed")
    for sub,names,kind in [
        ("eyes",["high-poly.mhclo","low-poly.mhclo"],"Eyes"),
        ("eyebrows",["eyebrow001.mhclo"],"Eyebrows"),
        ("eyelashes",["eyelashes01.mhclo"],"Eyelashes"),
        ("teeth",["teeth_base.mhclo"],"Teeth")]:
        add_asset(h,sub,names,kind)
    hair=add_asset(h,"hair",["long01.mhclo"],"Hair")
    if hair is None: raise RuntimeError('MPFB long hairstyle asset is unavailable')
    tint(hair,(.085,.065,.058),.78)
    add_soft_waves(hair)

    export_root=ExportService.create_character_copy(h,name_suffix="_wvrlp_ref")
    # The copied MakeHuman long01 mesh used its stock brown shader even after
    # tinting the original source hair. Set materials on the EXPORTED mesh.
    # Only Sha's export copy is affected; Amy/Christy/Riley are untouched.
    def pbr_solid(name,rgba,roughness=.67):
        m=bpy.data.materials.new(name)
        m.diffuse_color=(*rgba,1)
        m.use_nodes=True
        bsdf=m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value=(*rgba,1)
        bsdf.inputs["Metallic"].default_value=0.0
        bsdf.inputs["Roughness"].default_value=roughness
        if "Coat Weight" in bsdf.inputs: bsdf.inputs["Coat Weight"].default_value=.10
        return m
    all_export_objects=[export_root]+list(ObjectService.get_list_of_children(export_root))
    for obj in all_export_objects:
        if obj.type!="MESH":continue
        low=obj.name.lower()
        if "long01" in low:
            mat=pbr_solid("Sha natural dark brunette · real exported hair",
                          (.075,.055,.048),.72)
            obj.data.materials.clear();obj.data.materials.append(mat)
            print("WVLRP_SHA_DARK_HAIR",obj.name,mat.name)
        elif "eyebrow" in low:
            mat=pbr_solid("Sha dark natural brows",(.105,.075,.063),.87)
            obj.data.materials.clear();obj.data.materials.append(mat)
            print("WVLRP_SHA_BROWS",obj.name)
        elif "eyelash" in low:
            mat=pbr_solid("Sha natural brown lashes",(.21,.16,.145),.82)
            obj.data.materials.clear();obj.data.materials.append(mat)
            print("WVLRP_SHA_LASHES",obj.name)
    exp=ObjectService.find_object_of_type_amongst_nearest_relatives(export_root,"Basemesh")
    if not exp: raise RuntimeError("MPFB export body copy missing")
    # An unclothed base must retain EVERY body-surface polygon.
    # MPFB clothing "delete" MASK modifiers hide skin under clothes; baking
    # those modifiers permanently cut away body faces (pelvic opening seen
    # by the user). Bake the shape/clean helpers, NOT the clothing masks.
    ExportService.bake_modifiers_remove_helpers(exp,
        bake_masks=False,bake_subdiv=False,remove_helpers=True,also_proxy=True)
    # Remove residual masks (rather than applying them) so the glTF exporter
    # cannot silently evaluate and omit skin from the crotch or torso.
    mask_names=[m.name for m in exp.modifiers if m.type=="MASK"]
    for modifier in list(exp.modifiers):
        if modifier.type=="MASK": exp.modifiers.remove(modifier)
    print("WVLRP_SHA_DELETE_MASKS_REMOVED_NOT_BAKED",mask_names)
    if any(m.type=="MASK" for m in exp.modifiers):
        raise RuntimeError("Residual skin masking can create a pelvic hole")
    clean_skin_material(exp)
    polish_anatomical_shape(exp)
    check_and_repair_pelvic_surface(exp)
    soften_sha_face_only(exp)
    add_natural_smile(exp)
    # Keep the complete unclothed basemesh: no garments, body masking, or
    # mesh subtraction. The whole back/torso stays present during zoom.
    assert len(exp.data.vertices)>10000, "Incomplete human body"
    print("WVLRP_SHA_UNCLOTHED_BODY",len(exp.data.vertices),len(exp.data.polygons))

    # Moderate MPFB firmness gives a softly gravity-shaped natural bust without
    # excessively pulled-down lower contours; all anatomy is continuous.
    # Build actual action clips for a single Mixamo-compatible armature.
    # Unlike Sha's predecessor Amy, which exported only a tiny spine idle,
    # these are actual skeletal poses. They are separate NLA tracks in the GLB.
    children=list(ObjectService.get_list_of_children(export_root))
    rigs=[o for o in [export_root]+children if o.type=="ARMATURE"]
    if not rigs: raise RuntimeError("Sha export copy has no armature")
    rig=rigs[0]
    print("WVLRP_RIG",rig.name,len(rig.data.bones))
    # Replace only the stiff long01 hair shell on the export copy.
    export_hair=next((ob for ob in [export_root]+children
                      if ob.type=="MESH" and "long01" in ob.name.lower()),None)
    replace_cape_with_layered_hair(export_hair,exp,rig,export_root)
    # Keep natural dark irises for Sha; no blue overlay.
    # Sha base model: no clothing assets.

    def normbone(name):
        return ''.join(c for c in name.lower() if c.isalnum()).replace("mixamorig","")
    by_norm={normbone(b.name):b for b in rig.pose.bones}
    def named(*names):
        for n in names:
            if n in by_norm: return by_norm[n]
        return None
    bones={
        "hips":named("hips","pelvis"),
        "spine":named("spine","spine1"),
        "chest":named("spine2","chest","upperchest"),
        "neck":named("neck"),
        "head":named("head"),
        "lthigh":named("leftupleg","leftthigh","lthigh"),
        "rthigh":named("rightupleg","rightthigh","rthigh"),
        "lshin":named("leftleg","leftshin","lshin"),
        "rshin":named("rightleg","rightshin","rshin"),
        "larm":named("leftarm","leftupperarm","lupperarm"),
        "rarm":named("rightarm","rightupperarm","rupperarm"),
        "lforearm":named("leftforearm","lforearm"),
        "rforearm":named("rightforearm","rforearm"),
        "lhand":named("lefthand","lhand"),
        "rhand":named("righthand","rhand"),
        "lfoot":named("leftfoot","lfoot"),
        "rfoot":named("rightfoot","rfoot"),
    }
    print("WVLRP_SHA_BONE_MAP",{k:v.name if v else None for k,v in bones.items()})
    required=("hips","spine","lthigh","rthigh","lshin","rshin","larm","rarm")
    missing=[k for k in required if bones[k] is None]
    if missing: raise RuntimeError("Sha cannot pose missing body bones: "+str(missing))
    if len(rig.data.bones)<25: raise RuntimeError("Insufficient joint count for Sha")

    # All poses use the ORIGINAL standing ground plane, rather than positioning
    # each avatar by an arbitrary center-of-mesh origin.
    bpy.context.view_layer.update()
    def rest_joint(key):
        pb=bones[key]
        return (rig.matrix_world @ pb.matrix.translation).z if pb else None
    rig_ground_z=min(v for v in (rest_joint("lfoot"),rest_joint("rfoot"),
                    rest_joint("lshin"),rest_joint("rshin")) if v is not None)
    print("WVLRP_SHA_RIG_REST_GROUND",round(rig_ground_z,4))
    def build_pose(name,keys):
        if not rig.animation_data: rig.animation_data_create()
        action=bpy.data.actions.new(name)
        rig.animation_data.action=action
        # Previously authored NLA strips must not override the pose being solved.
        for existing_track in rig.animation_data.nla_tracks:
            existing_track.mute=True
        for frame,angles,hip_drop in keys:
            bpy.context.scene.frame_set(frame)
            for pb in rig.pose.bones:
                pb.rotation_mode="XYZ"
                pb.rotation_euler=(0,0,0)
                pb.location=(0,0,0)
            bones["hips"].location.z=hip_drop
            for kind,axis,degrees in angles:
                pb=bones.get(kind)
                if pb is not None:
                    pb.rotation_euler[axis]=math.radians(degrees)
            # Correct the two most noticeable FK posing errors from the first
            # live 3D review: knees folding the wrong way, and the neck/head
            # tipping around when the torso is pitched forward on all fours.
            #
            # Mixamo rigs do not all share the same local Euler X handedness.
            # Select knee bend from the *evaluated joint positions*, not from
            # an assumed sign. In Sha's Blender coordinates the back of
            # the body is +Y; knees should flex with the ankles behind them.
            if name in ("Sha Kneel", "Sha HandsAndKnees", "Sha ElbowsAndKnees") and frame > 1:
                back_world=Vector((0,1,0))
                original_shin_angles={side:abs(math.degrees(bones[side].rotation_euler.x)) for side in ("lshin","rshin")}
                for part in ("lshin","rshin"):
                    shin=bones[part]
                    # Keep the original bend request for BOTH knees. Blender
                    # dependency-graph evaluations may reset the untouched side
                    # while we probe the first knee's world direction.
                    amount=original_shin_angles[part]
                    trials=[]
                    for sign in (-1,1):
                        shin.rotation_euler.x=math.radians(sign*amount)
                        bpy.context.view_layer.update()
                        knee_world=rig.matrix_world @ shin.matrix.translation
                        ankle_world=rig.matrix_world @ (shin.matrix @ Vector((0,shin.bone.length,0)))
                        posterior=(ankle_world-knee_world).dot(back_world)
                        trials.append((posterior,sign))
                    posterior,sign=max(trials,key=lambda v:v[0])
                    shin.rotation_euler.x=math.radians(sign*amount)
                    print("WVLRP_SHA_KNEE_DIRECTION",name,part,
                          "chosen_degrees",round(sign*amount,1),
                          "posterior_m",round(posterior,4),
                          "candidates",[(round(v,3),s) for v,s in trials])
                # With the torso pitched nearly horizontal, offset its
                # rotation at the neck/head. The previous -12/+7 degree
                # combination let the face roll forward far too much.
                # Pick small pitch-only rotations that keep the head upright
                # and facing the same direction as in the rest pose; no
                # 180-degree yaw or roll is permitted.
                if name in ("Sha HandsAndKnees","Sha ElbowsAndKnees") and bones["neck"] and bones["head"]:
                    neck=bones["neck"];head=bones["head"]
                    rw=rig.matrix_world.to_3x3()
                    rest_to_head=head.bone.matrix_local.to_3x3().inverted()
                    up_ref=Vector((0,0,1))
                    front_ref=Vector((0,-1,0))
                    up_local=rest_to_head @ (rw.inverted() @ up_ref)
                    front_local=rest_to_head @ (rw.inverted() @ front_ref)
                    candidates=[]
                    for neck_deg in (-55,-45,-35,-25,-15,0,15,25,35,45,55):
                        for head_deg in (-25,-15,-5,5,15,25):
                            neck.rotation_euler=(math.radians(neck_deg),0,0)
                            head.rotation_euler=(math.radians(head_deg),0,0)
                            bpy.context.view_layer.update()
                            hr=rw @ head.matrix.to_3x3()
                            up=(hr @ up_local).normalized()
                            front=(hr @ front_local).normalized()
                            upright=up.dot(up_ref)
                            forward=front.dot(front_ref)
                            score=2.5*upright+1.5*forward-.002*(abs(neck_deg)+abs(head_deg))
                            candidates.append((score,neck_deg,head_deg,upright,forward))
                    score,nd,hd,upright,forward=max(candidates)
                    neck.rotation_euler=(math.radians(nd),0,0)
                    head.rotation_euler=(math.radians(hd),0,0)
                    bpy.context.view_layer.update()
                    print("WVLRP_SHA_NECK_DIRECTION",name,
                          "neck_x",nd,"head_x",hd,
                          "upright",round(upright,3),
                          "forward",round(forward,3))
                    if upright<0.25 or forward<-.35:
                        raise RuntimeError("Sha head still twists outside safe forward/up pose")
            if name in ("Sha HandsAndKnees", "Sha ElbowsAndKnees") and frame>1:
                # The older pose was a collection of hand-authored Euler angles.
                # It rotated the torso but left palms, elbows and knees in free air.
                # Fit the articulated limb angles against anatomical ground-support
                # targets in armature world coordinates, then move the skeleton
                # vertically so both support pairs meet the original standing floor.
                use_elbows=name.endswith("ElbowsAndKnees")
                def joint(which, end=False):
                    pb=bones[which]
                    if pb is None: return None
                    local=Vector((0,pb.bone.length,0)) if end else Vector((0,0,0))
                    return rig.matrix_world @ (pb.matrix @ local)
                def limb_set(keys, deg):
                    for b in keys:
                        if bones[b]: bones[b].rotation_euler.x=math.radians(deg)
                def metrics():
                    bpy.context.view_layer.update()
                    hip=joint("hips")
                    chest=joint("chest") or joint("spine",True)
                    knee=[joint("lshin"),joint("rshin")]
                    shoulder=[joint("larm"),joint("rarm")]
                    elbow=[joint("lforearm"),joint("rforearm")]
                    # Use the hand-bone end (the palm), not the wrist origin,
                    # or the model appears to balance on its wrists in midair.
                    wrists=[joint("lhand",True) or joint("lforearm",True),
                            joint("rhand",True) or joint("rforearm",True)]
                    ankles=[joint("lfoot") or joint("lshin",True),
                            joint("rfoot") or joint("rshin",True)]
                    contacts=elbow if use_elbows else wrists
                    if any(v is None for v in [hip,chest]+knee+shoulder+elbow+wrists+ankles):
                        raise RuntimeError("Sha floor pose missing supported limb joints")
                    mean=lambda v: sum(v)/len(v)
                    kz=mean([v.z for v in knee]); cz=mean([v.z for v in contacts])
                    knee_back=mean([v.y-hip.y for v in knee])
                    ankle_back=mean([ankles[i].y-knee[i].y for i in (0,1)])
                    elbow_drop=mean([shoulder[i].z-elbow[i].z for i in (0,1)])
                    wrist_drop=mean([shoulder[i].z-wrists[i].z for i in (0,1)])
                    chest_forward=hip.y-chest.y
                    torso_level=abs(chest.z-hip.z)
                    # Keep shoulders forward of the supporting palms/forearms.
                    hands_forward=mean([shoulder[i].y-wrists[i].y for i in (0,1)])
                    elbow_forward=mean([shoulder[i].y-elbow[i].y for i in (0,1)])
                    grounded_difference=abs(kz-cz)
                    loss=1200*grounded_difference**2
                    # Elbow support previously solved by stretching the
                    # knees 38 cm behind Sha and collapsing her hips to
                    # 14 cm over the floor. That is NOT elbows-and-knees.
                    # Reward raised hips and tucked-under knees strongly,
                    # while preserving the much better hands/knees fit.
                    target_hip=.43 if use_elbows else .43
                    loss+=2400*(hip.z-kz-target_hip)**2
                    loss+=5000*max(0,.20-(hip.z-kz))**2
                    loss+=1600*(knee_back-.015)**2
                    if use_elbows:
                        loss+=950*max(0,.35-(hip.z-kz))**2
                    loss+=15*max(0,.035-ankle_back)**2
                    loss+=10*max(0,.28-chest_forward)**2
                    loss+=5*max(0,torso_level-.20)**2
                    loss+=9*(elbow_drop-(.39 if use_elbows else .27))**2
                    loss+=6*(wrist_drop-(.39 if use_elbows else .46))**2
                    loss+=430*(hands_forward-(.23 if use_elbows else .00))**2
                    loss+=310*(elbow_forward-(.005 if use_elbows else .04))**2
                    # Each joint must lie on the same support plane; matching
                    # only average heights can leave a hand or knee hovering.
                    loss+=700*sum((v.z-kz)**2 for v in knee)/2
                    loss+=700*sum((v.z-cz)**2 for v in contacts)/2
                    loss+=250*sum((v.z-(kz+cz)/2)**2 for v in knee+contacts)/4
                    # Test forward/back and side support, not floor height alone.
                    loss+=1100*sum((knee[i].y-hip.y-.015)**2 for i in (0,1))/2
                    loss+=700*sum((contacts[i].y-shoulder[i].y)**2 for i in (0,1))/2
                    loss+=650*sum((contacts[i].x-shoulder[i].x)**2 for i in (0,1))/2
                    loss+=400*sum((knee[i].x-(hip.x+(shoulder[i].x-hip.x)*.65))**2 for i in (0,1))/2
                    if use_elbows:
                        # For forearm-and-knee support, the wrists should lie
                        # near the elbow plane, not float high above it.
                        loss+=45*sum((wrists[i].z-contacts[i].z-.025)**2 for i in (0,1))/2
                    return loss,grounded_difference,hip,knee,contacts,wrists
                # All angular adjustments act symmetrically; no snapped or
                # backward-facing knee, no broken asymmetrical shoulders.
                choices=[
                    (("hips",),[-150,-120,-90,-60,-30,0,30,45,60,75,90,105,120,150]),
                    (("lthigh","rthigh"),[-135,-120,-105,-90,-75,-60,-45,-30,-15,15,30,45,60,75]),
                    (("lshin","rshin"),[-120,-105,-90,-75,75,90,105,120]),
                    (("larm","rarm"),[-140,-115,-90,-70,-50,-30,0,30,50,70,90]),
                    (("lforearm","rforearm"),[-130,-100,-75,-50,-25,0,25,50,75,100,130])
                ]
                # Use two deliberate passes, then finer joint adjustments.
                for iteration in range(8):
                    for limbs,candidates in choices:
                        old=math.degrees(bones[limbs[0]].rotation_euler.x)
                        if iteration>=2:
                            step=15 if iteration==2 else 8 if iteration==3 else 4 if iteration==4 else 2 if iteration==5 else 1
                            candidates=[old-2*step,old-step,old,old+step,old+2*step]
                        best=(float("inf"),old)
                        for angle in candidates:
                            limb_set(limbs,angle)
                            score=metrics()[0]+.0001*(angle-old)**2
                            if score<best[0]: best=(score,angle)
                        limb_set(limbs,best[1])
                if use_elbows:
                    # Raise the pelvis and lower the front torso by hinging
                    # the SPINE around the hip. Upper-arm X alone cannot
                    # lower the elbow origins on this imported Mixamo rig,
                    # as the previous elbow-only fit measured no improvement.
                    spine=bones["spine"]
                    spine_base=math.degrees(spine.rotation_euler.x)
                    spine_trials=[]
                    for delta in range(-48,49,2):
                        angle=spine_base+delta
                        spine.rotation_euler.x=math.radians(angle)
                        bpy.context.view_layer.update()
                        knee_plane=(joint("lshin").z+joint("rshin").z)/2
                        elbow_plane=(joint("lforearm").z+joint("rforearm").z)/2
                        trial_hip=joint("hips")
                        trial_chest=joint("chest") or joint("spine",True)
                        torso_forward=trial_hip.y-trial_chest.y
                        slope=abs(trial_chest.z-trial_hip.z)
                        score=8500*(elbow_plane-knee_plane)**2
                        score+=200*max(0,.16-torso_forward)**2
                        score+=100*max(0,slope-.32)**2
                        score+=.000015*delta*delta
                        spine_trials.append((score,angle))
                    best_spine=min(spine_trials)[1]
                    spine.rotation_euler.x=math.radians(best_spine)
                    bpy.context.view_layer.update()
                    print("WVLRP_SHA_ELBOW_SPINE_FIT",
                          "from",round(spine_base,1),
                          "to",round(best_spine,1),
                          "elbow_knee_gap_m",round(
                            (joint("lforearm").z+joint("rforearm").z-
                             joint("lshin").z-joint("rshin").z)/2,4))
                    # Independently solve EACH supporting elbow onto the
                    # knee contact plane. The weighted whole-body optimizer
                    # formerly left forearm origins ~6 cm above the knees
                    # while still passing its loose support tolerance.
                    for side in ("l","r"):
                        upper=bones[side+"arm"]
                        base=math.degrees(upper.rotation_euler.x)
                        candidates=[base+d for d in range(-48,49,2)]
                        results=[]
                        for angle in candidates:
                            upper.rotation_euler.x=math.radians(angle)
                            bpy.context.view_layer.update()
                            elbow_point=joint(side+"forearm")
                            knee_level=(joint("lshin").z+joint("rshin").z)/2
                            shoulder=joint(side+"arm")
                            forward=shoulder.y-elbow_point.y
                            # Small aesthetic preference for the previous
                            # shoulder pitch, but physical elbow support wins.
                            score=1500*(elbow_point.z-knee_level)**2
                            score+=.000015*(angle-base)**2
                            score+=8*max(0,-.06-forward)**2
                            results.append((score,angle))
                        best_angle=min(results)[1]
                        upper.rotation_euler.x=math.radians(best_angle)
                        bpy.context.view_layer.update()
                        print("WVLRP_SHA_ELBOW_ARM_FIT",side,
                              "from",round(base,1),"to",round(best_angle,1),
                              "elbow_knee_gap_m",
                              round(joint(side+"forearm").z-
                                  (joint("lshin").z+joint("rshin").z)/2,4))
                        # An elbow-supported pose rests both FOREARMS.
                        # Bring each palm end close to that same ground plane
                        # by rotating the forearm about its elbow joint;
                        # this does not disturb the fitted elbow position.
                        fore=bones[side+"forearm"]
                        original_angle=math.degrees(fore.rotation_euler.x)
                        fore_candidates=[]
                        for angle in [original_angle+d for d in range(-88,89,4)]:
                            fore.rotation_euler.x=math.radians(angle)
                            bpy.context.view_layer.update()
                            wrist=joint(side+"hand",True)
                            elbow=joint(side+"forearm")
                            target_z=elbow.z+.022
                            fore_candidates.append(
                                (100*(wrist.z-target_z)**2+
                                 .000008*(angle-original_angle)**2,
                                 angle))
                        fore.rotation_euler.x=math.radians(min(fore_candidates)[1])
                        bpy.context.view_layer.update()
                        print("WVLRP_SHA_FOREARM_FIT",side,
                              "palm_above_elbow_m",
                              round(joint(side+"hand",True).z-
                                    joint(side+"forearm").z,4))
                if use_elbows:
                    # Shoulder *yaw* is also needed. Earlier only adjusting X
                    # pitch left elbows 18 cm sideways from their shoulders.
                    # Search independent X/Z arm rotation so elbows remain
                    # shoulder-width apart AND grounded, without changing
                    # Sha's body mesh or touching other poses.
                    for side in ("l","r"):
                        upper=bones[side+"arm"]
                        ox=math.degrees(upper.rotation_euler.x)
                        oz=math.degrees(upper.rotation_euler.z)
                        def elbow_score():
                            bpy.context.view_layer.update()
                            e=joint(side+"forearm")
                            shoulder=joint(side+"arm")
                            knee_level=(joint("lshin").z+joint("rshin").z)*.5
                            return (2100*(e.x-shoulder.x)**2
                                  +2200*(e.z-knee_level)**2
                                  +600*(e.y-shoulder.y)**2)
                        best=(float("inf"),ox,oz)
                        for pitch in [ox+d for d in range(-32,33,8)]:
                            upper.rotation_euler.x=math.radians(pitch)
                            for yaw in range(-90,91,6):
                                upper.rotation_euler.z=math.radians(yaw)
                                score=elbow_score()
                                score+=.00002*(pitch-ox)**2+.000004*(yaw-oz)**2
                                if score<best[0]:best=(score,pitch,yaw)
                        for step in (3,1):
                            score0,px,pz=best
                            for pitch in (px-2*step,px-step,px,px+step,px+2*step):
                                upper.rotation_euler.x=math.radians(pitch)
                                for yaw in (pz-2*step,pz-step,pz,pz+step,pz+2*step):
                                    upper.rotation_euler.z=math.radians(yaw)
                                    score=elbow_score()+.00002*(pitch-ox)**2
                                    if score<best[0]:best=(score,pitch,yaw)
                        upper.rotation_euler.x=math.radians(best[1])
                        upper.rotation_euler.z=math.radians(best[2])
                        bpy.context.view_layer.update()
                        print("WVLRP_SHA_ELBOW_SHOULDER_WIDTH_FIT",side,
                              "pitch",round(best[1],1),"yaw",round(best[2],1),
                              "lateral_m",round(joint(side+"forearm").x-
                                   joint(side+"arm").x,4),
                              "height_m",round(joint(side+"forearm").z-
                                  (joint("lshin").z+joint("rshin").z)*.5,4))
                _,error,hip,knee,contacts,wrists=metrics()
                # Anchor the same ground elevation used by the standing pose.
                # Measure the response of root/hips local Z rather than assuming
                # it coincides with world Z on every MPFB armature.
                contact_z=sum(v.z for v in knee+contacts)/len(knee+contacts)
                shoes=[joint("lfoot"),joint("rfoot")]
                # Rest ground is recorded from rigged feet in neutral standing.
                # It may differ slightly from the mesh soles on individual rigs.
                rest_ground=rig_ground_z
                # MPFB/Mixamo hip local Z is not necessarily world vertical.
                # Probe all local translation axes and solve using the one
                # that actually changes world-space knee/hand contact height.
                original_location=bones["hips"].location.copy()
                best_axis=None
                best_slope=0.0
                for axis in range(3):
                    bones["hips"].location=original_location.copy()
                    bones["hips"].location[axis]+=0.10
                    bpy.context.view_layer.update()
                    sample_knee=[joint("lshin"),joint("rshin")]
                    sample_contact=([joint("lforearm"),joint("rforearm")] if use_elbows
                        else [joint("lhand",True) or joint("lforearm",True),
                              joint("rhand",True) or joint("rforearm",True)])
                    sample_z=sum(v.z for v in sample_knee+sample_contact)/4
                    candidate_slope=(sample_z-contact_z)/0.10
                    if abs(candidate_slope)>abs(best_slope):
                        best_axis,best_slope=axis,candidate_slope
                bones["hips"].location=original_location.copy()
                bpy.context.view_layer.update()
                if best_axis is None or abs(best_slope)<0.03:
                    raise RuntimeError("Sha hip translation has no usable world-vertical axis")
                corrected=original_location[best_axis]+(rest_ground-contact_z)/best_slope
                bones["hips"].location[best_axis]=corrected
                bpy.context.view_layer.update()
                print("WVLRP_SHA_HIP_VERTICAL_AXIS",name,best_axis,
                      "response",round(best_slope,4))
                _,error,hip,knee,contacts,wrists=metrics()
                print("WVLRP_SHA_GROUNDED_POSE",name,
                      "contacts_height",[round(v.z,3) for v in knee+contacts],
                      "ground",round(rest_ground,3),
                      "contact_mismatch_m",round(error,3),
                      "root_hip_offset",round(corrected,3),
                      "knee_behind_hip",[round(v.y-hip.y,3) for v in knee])
                # Inspect individual supporting joints after translating the
                # hips. The old mean-height check masked tilted, hovering limbs.
                contact_heights=[v.z for v in knee+contacts]
                support_error=max(abs(z-rest_ground) for z in contact_heights)
                left_right_error=max(abs(knee[0].z-knee[1].z),
                                     abs(contacts[0].z-contacts[1].z))
                print("WVLRP_SHA_SUPPORT_QA",name,
                      "max_support_error_m",round(support_error,3),
                      "left_right_error_m",round(left_right_error,3))
                # A matched floor plane alone is not a quadrupedal pose.
                # Check bent hips, horizontal-ish torso and forward arms.
                chest=joint("chest") or joint("spine",True)
                shoulders=[joint("larm"),joint("rarm")]
                mean_knee_z=sum(k.z for k in knee)/2
                hip_above_knees=hip.z-mean_knee_z
                chest_forward=hip.y-chest.y
                torso_slope=abs(chest.z-hip.z)
                shoulder_forward=sum(hip.y-a.y for a in shoulders)/2
                knee_xy=[knee[i].y-hip.y for i in (0,1)]
                arm_y=[contacts[i].y-shoulders[i].y for i in (0,1)]
                arm_x=[contacts[i].x-shoulders[i].x for i in (0,1)]
                max_knee_offset=max(abs(x) for x in knee_xy)
                max_arm_offset=max(abs(x) for x in arm_y)
                max_arm_side=max(abs(x) for x in arm_x)
                print("WVLRP_SHA_SUPPORT_ALIGNMENT",name,
                      "knee_fore_aft_m",[round(x,3) for x in knee_xy],
                      "arm_fore_aft_m",[round(x,3) for x in arm_y],
                      "arm_lateral_m",[round(x,3) for x in arm_x])
                print("WVLRP_SHA_POSTURE_QA",name,
                      "hip_above_knees_m",round(hip_above_knees,3),
                      "chest_forward_m",round(chest_forward,3),
                      "shoulder_forward_m",round(shoulder_forward,3),
                      "torso_slope_m",round(torso_slope,3),
                      "hip_root_local_offset",round(corrected,3))
                if not (.18<=hip_above_knees<=.86 and chest_forward>.16
                        and shoulder_forward>.10 and torso_slope<.42):
                    raise RuntimeError(name+
                        " does not lower the torso into a grounded quadrupedal pose")
                if max_knee_offset>.14 or max_arm_offset>.19 or max_arm_side>.15:
                    raise RuntimeError(name+" unsupported joint alignment: "+
                        str((round(max_knee_offset,3),round(max_arm_offset,3),round(max_arm_side,3))))
                if error>.12 or support_error>.14 or left_right_error>.12:
                    raise RuntimeError(name+" knees and "+
                      ("elbows" if use_elbows else "hands")+
                      " are not individually grounded: "+
                      str([round(z-rest_ground,3) for z in contact_heights]))
            for pb in rig.pose.bones:
                pb.keyframe_insert(data_path="rotation_euler",frame=frame,group=pb.name)
            bones["hips"].keyframe_insert(data_path="location",frame=frame,group=bones["hips"].name)
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,int(keys[0][0]),action)
        strip.action_frame_start=keys[0][0]
        strip.action_frame_end=keys[-1][0]
        strip.repeat=1
        print("WVLRP_SHA_POSE_CLIP",name,len(keys))
    rest=(1,[],0.0)
    build_pose("Sha Stand",[
        rest,(15,[("spine",0,1.1),("chest",0,.8),("head",2,1.0)],0.0),
        (30,[],0.0)])
    build_pose("Sha Bend",[
        rest,(32,[("hips",0,36),("spine",0,23),("chest",0,12),
                  ("neck",0,-13),("head",0,-12),
                  ("larm",0,-17),("rarm",0,-17)],-.04)])
    build_pose("Sha Kneel",[
        rest,(32,[("lthigh",0,-31),("rthigh",0,-31),
                  ("lshin",0,93),("rshin",0,93),
                  ("spine",0,5),("larm",0,-8),("rarm",0,-8)],-.29)])
    build_pose("Sha HandsAndKnees",[
        rest,(42,[("hips",0,70),("spine",0,15),("chest",0,6),
                  ("lthigh",0,-75),("rthigh",0,-75),
                  ("lshin",0,98),("rshin",0,98),
                  ("larm",0,-75),("rarm",0,-75),
                  ("lforearm",0,6),("rforearm",0,6),
                  ("neck",0,-12),("head",0,7)],-.34)])
    build_pose("Sha ElbowsAndKnees",[
        rest,(42,[("hips",0,75),("spine",0,12),("chest",0,4),
                  ("lthigh",0,-75),("rthigh",0,-75),
                  ("lshin",0,100),("rshin",0,100),
                  ("larm",0,-90),("rarm",0,-90),
                  ("lforearm",0,90),("rforearm",0,90),
                  ("neck",0,-8),("head",0,5)],-.34)])
    rig.animation_data.action=None
    for existing_track in rig.animation_data.nla_tracks:
        existing_track.mute=False
    for pb in rig.pose.bones:
        pb.rotation_mode="XYZ";pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
    # NLA is how Blender's glTF exporter discovers separate named clips.
    bpy.context.scene.frame_set(1)

    bpy.ops.object.select_all(action="DESELECT")
    chosen=[export_root]+list(ObjectService.get_list_of_children(export_root))
    for obj in set(chosen): obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
       use_selection=True,export_animations=True,export_nla_strips=True,
       export_materials="EXPORT")
    if not OUT.exists() or OUT.stat().st_size<100000:
        raise RuntimeError("GLB missing or unexpectedly small")
    # Structural verification: GLB includes body mesh, hair, skin + rig.
    # Print the actual exported material list (not just the source mesh)
    # so a future brown-hair shader regression is visible in build logs.
    import struct
    bs=OUT.read_bytes()
    n,kind=struct.unpack_from("<II",bs,12)
    meta=json.loads(bs[20:20+n].decode("utf-8"))
    verify_photo_skin_glb(meta, "Sha")
    print("WVLRP_SHA_EXPORTED_MATERIALS",[(m.get("name","")) for m in meta.get("materials",[])])
    print("WVLRP_RESULT_GLB",OUT,OUT.stat().st_size,"skins",len(meta.get("skins",[])),
        "joint_count",len(meta.get("skins",[{}])[0].get("joints",[])),
        "animations",len(meta.get("animations",[])),"meshes",len(meta.get("meshes",[])))
    assert any("natural dark brunette" in m.get("name","") for m in meta.get("materials",[])), "Sha dark hair material missing"
    assert len(meta.get("skins",[]))>=1, "No rigged skin in output"
    assert len(meta.get("animations",[]))>=5, "Sha must include five skeletal pose clips"
    assert any("ElbowsAndKnees" in a.get("name","") for a in meta.get("animations",[])), "Missing elbows-and-knees clip"
    assert len(meta["skins"][0].get("joints",[]))>=25, "Skeleton too small"
    assert any(any("targets" in prim for prim in mesh.get("primitives",[]))
        for mesh in meta.get("meshes",[])), "Sha smile morph did not export"
    names=[n.get("name","") for n in meta.get("nodes",[])]
    assert any("Sha" in n for n in names), "Sha body naming missing"
    assert not any("temporary sundress" in n.lower() for n in names), "Unexpected clothing in Sha base GLB"

    # Best-effort reference preview; do not fail successfully exported GLB if display render fails.
    try:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(OUT))
        for o in bpy.context.scene.objects:
            if o.type=="ARMATURE": o.rotation_euler=(0,0,0)
        def light(pos,energy,size):
            d=bpy.data.lights.new("Studio",type="AREA");d.energy=energy;d.shape="DISK";d.size=size
            o=bpy.data.objects.new("Studio light",d);bpy.context.collection.objects.link(o);o.location=pos
            o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat("-Z","Y").to_euler()
        light((2,-3,4),610,4);light((-2,1,3),390,3)
        camdata=bpy.data.cameras.new("Preview ortho");cam=bpy.data.objects.new("Preview camera",camdata)
        bpy.context.collection.objects.link(cam)
        cam.location=(0,-4,1.35);cam.rotation_euler=(Vector((0,0,.85))-cam.location).to_track_quat("-Z","Y").to_euler()
        camdata.type="ORTHO";camdata.ortho_scale=2.35;bpy.context.scene.camera=cam
        world=bpy.data.worlds.new("Preview lighting");bpy.context.scene.world=world
        world.use_nodes=True;world.node_tree.nodes["Background"].inputs["Color"].default_value=(.7,.73,.75,1)
        world.node_tree.nodes["Background"].inputs["Strength"].default_value=.52
        scene=bpy.context.scene
        scene.render.engine="CYCLES";scene.cycles.samples=48
        scene.render.resolution_x=700;scene.render.resolution_y=950;scene.render.resolution_percentage=100
        scene.view_settings.view_transform="AgX"
        scene.view_settings.look="AgX - Medium High Contrast"
        scene.view_settings.exposure=-.18
        scene.render.image_settings.file_format="PNG";scene.render.filepath=str(PNG)
        bpy.ops.render.render(write_still=True)
        print("WVLRP_PREVIEW_SAVED",PNG,PNG.stat().st_size)
    except Exception:
        print("WVLRP_RENDER_WARNING",traceback.format_exc())
    print("WVLRP_SHA_MPFB_SUCCESS")

if __name__=="__main__":main()
