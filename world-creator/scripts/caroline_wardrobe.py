"""Small fitted period-garment starter set for the Caroline adult rig.
Each named garment is a REAL skinned export mesh with its own material.
Prototype garment fit must be reviewed in the live viewer before signoff.
"""
import bpy, math
from mathutils import Vector

MATERIALS={
    "blouse":("WVLRP Wardrobe Blouse",(.74,.68,.56,1.0)),
    "skirt": ("WVLRP Wardrobe Skirt",(.21,.29,.26,1.0)),
    "apron": ("WVLRP Wardrobe Apron",(.86,.81,.69,1.0)),
    "boots": ("WVLRP Wardrobe Boots",(.25,.17,.115,1.0)),
}

def add_caroline_wardrobe(root,body,rig):
    if len(body.data.vertices)<10000:
        raise RuntimeError("Cannot fit wardrobe without Carolyn's complete body")
    verts=body.data.vertices
    lo=min(v.co.z for v in verts);hi=max(v.co.z for v in verts)
    h=hi-lo
    if not 1.0<h<3.0: raise RuntimeError("Wardrobe found invalid body height")
    cx=(min(v.co.x for v in verts)+max(v.co.x for v in verts))/2
    cy=(min(v.co.y for v in verts)+max(v.co.y for v in verts))/2
    norm=lambda s:''.join(x for x in s.lower() if x.isalnum()).replace('mixamorig','')
    def bone(*names):
        return next((pb.name for pb in rig.pose.bones if norm(pb.name) in names),None)
    hips=bone('hips','pelvis')
    lf=bone('leftfoot','lfoot')
    rf=bone('rightfoot','rfoot')
    if not all((hips,lf,rf)):raise RuntimeError("Wardrobe requires hips and both foot bones")
    materials={}
    for key,(name,color) in MATERIALS.items():
        mat=bpy.data.materials.new(name)
        mat.use_nodes=True
        mat.diffuse_color=color
        node=mat.node_tree.nodes.get('Principled BSDF')
        node.inputs['Base Color'].default_value=color
        node.inputs['Roughness'].default_value=.89
        node.inputs['Metallic'].default_value=0
        # The wardrobe UI adjusts alpha through model-viewer's materials API.
        try: mat.surface_render_method='BLENDED'
        except Exception: pass
        materials[key]=mat
    def create(key,name,points,faces,weight_for=None,source_for=None):
        mesh=bpy.data.meshes.new(name+' mesh')
        mesh.from_pydata(points,[],faces);mesh.update()
        mesh.materials.append(materials[key])
        ob=bpy.data.objects.new('WVLRP WARDROBE '+name,mesh)
        bpy.context.collection.objects.link(ob)
        ob.parent=root
        ob.matrix_world=body.matrix_world.copy()
        groups={}
        if source_for is not None:
            for group in body.vertex_groups: groups[group.index]=ob.vertex_groups.new(name=group.name)
            for idx,src in enumerate(source_for):
                for assignment in verts[src].groups:
                    groups[assignment.group].add([idx],assignment.weight,'REPLACE')
        else:
            if not weight_for:raise RuntimeError("Garment has no skinning")
            vg=ob.vertex_groups.new(name=weight_for)
            vg.add(list(range(len(points))),1,'REPLACE')
        mod=ob.modifiers.new('Wardrobe follows Caroline rig','ARMATURE')
        mod.object=rig
        if len(mesh.polygons)<15:raise RuntimeError(name+' geometry failed')
        print('WVLRP_CAROLINE_WARDROBE',name,len(mesh.vertices),len(mesh.polygons))
        return ob

    # The blouse uses the finished body's own topology and skin weights,
    # with an outward fabric clearance. No global scaling of someone else's clothes.
    lo_b,hi_b=lo+.555*h,lo+.865*h
    chosen={i for i,v in enumerate(verts) if lo_b<=v.co.z<=hi_b and abs(v.co.x-cx)<.235*h}
    faces=[];mapping={}
    points=[];sources=[]
    for poly in body.data.polygons:
        face=list(poly.vertices)
        if len(face)<3 or any(idx not in chosen for idx in face):continue
        converted=[]
        for idx in face:
            if idx not in mapping:
                v=verts[idx]
                mapping[idx]=len(points)
                points.append(tuple(v.co+v.normal*(.014*h)))
                sources.append(idx)
            converted.append(mapping[idx])
        faces.append(converted)
    if len(faces)<100:raise RuntimeError('Blouse mesh selection too small')
    create('blouse','Blouse',points,faces,source_for=sources)

    # A roomier long skirt made as actual surface loops, attached at the pelvis.
    # Unlike painted-on clothing this has independent stand-off around both legs.
    n=48;rows=16
    skirt=[];sf=[]
    for j in range(rows):
        t=j/(rows-1)
        z=lo+h*(.57-.43*t)
        rx=h*(.147+.095*t)
        ry=h*(.126+.085*t)
        for i in range(n):
            a=2*math.pi*i/n
            skirt.append((cx+rx*math.cos(a),cy+ry*math.sin(a)+.013*h,z))
    for j in range(rows-1):
        for i in range(n):
            k=(i+1)%n
            sf.append((j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i))
    create('skirt','Skirt',skirt,sf,weight_for=hips)

    # Separate front apron, modeled along the skirt curve and independently toggleable.
    # -Y is the front of this MakeHuman character.
    ap=[];af=[];cols=18;aprows=15
    for j in range(aprows):
        t=j/(aprows-1)
        z=lo+h*(.572-.34*t)
        st=min(1.0,max(0.0,(.57-(z-lo)/h)/.43))
        rx=h*(.147+.095*st)+.012*h
        ry=h*(.126+.085*st)+.012*h
        for i in range(cols):
            a=-math.pi/2+((i/(cols-1))-.5)*1.11
            ap.append((cx+rx*math.cos(a),cy+ry*math.sin(a)+.013*h,z))
    for j in range(aprows-1):
        for i in range(cols-1):
            q=j*cols+i;af.append((q,q+1,q+1+cols,q+cols))
    create('apron','Apron',ap,af,weight_for=hips)

    # Each boot is attached to its own foot bone, rather than floating at world origin.
    inv=body.matrix_world.inverted_safe()
    for side,foot in [('Left',lf),('Right',rf)]:
        pb=rig.pose.bones[foot]
        world=rig.matrix_world@pb.matrix.translation
        p=inv@world
        pts=[];quads=[];ns=20;levels=[-.021,.015,.052,.103]
        for zoff in levels:
            for i in range(ns):
                a=2*math.pi*i/ns
                pts.append((p.x+.047*h*math.cos(a),p.y+.053*h*math.sin(a)-.02*h,p.z+zoff*h))
        for j in range(len(levels)-1):
            for i in range(ns):
                k=(i+1)%ns;quads.append((j*ns+i,j*ns+k,(j+1)*ns+k,(j+1)*ns+i))
        create('boots',side+' Boot',pts,quads,weight_for=foot)
    print('WVLRP_CAROLINE_WARDROBE_SUCCESS',len(MATERIALS),'garment materials, five skinned objects')
