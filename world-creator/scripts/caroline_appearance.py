"""Adult Caroline Ingalls reference-body proportions and Season 3 updo.
Applied to her own MPFB copy, never Jenny's or another actor's model.
The preview hairstyle is procedural trial art, NOT a certified likeness.
"""
import bpy, math
from mathutils import Vector

def reshape_adult_body(body):
    """Subtle lifted rounded posterior shaping on continuous existing vertices."""
    if not body or body.type!="MESH" or len(body.data.vertices)<10000:
        raise RuntimeError("Caroline shape: continuous basemesh not available")
    verts=body.data.vertices
    xmin=min(v.co.x for v in verts);xmax=max(v.co.x for v in verts)
    zmin=min(v.co.z for v in verts);zmax=max(v.co.z for v in verts)
    ymin=min(v.co.y for v in verts);ymax=max(v.co.y for v in verts)
    height=zmax-zmin
    cx=(xmin+xmax)/2;cy=(ymin+ymax)/2
    if height<.8 or height>3:
        raise RuntimeError("Caroline proportions: invalid human scale")
    changed=0
    for v in verts:
        p=v.co
        z=(p.z-zmin)/height;x=(p.x-cx)/height
        # MPFB adults face Blender -Y; only the posterior half is affected.
        rear=max(0.,min(1.,(p.y-cy)/(.08*height)))
        rear=rear*rear*(3-2*rear)
        if rear<.001:continue
        # Lift and round both glute lobes while preserving the continuous
        # source pelvis and thigh topology.  No separate mesh attachments.
        lobes=math.exp(-((abs(x)-.068)/.057)**2)
        butt=math.exp(-((z-.53)/.074)**2)
        lift=math.exp(-((z-.575)/.055)**2)
        delta=height*(.022*butt*lobes+.006*lift*lobes)*rear
        p.y+=delta
        # Hip contour kept narrow/toned; garment must be tailored afterward.
        p.x=cx+(p.x-cx)*(1+.012*butt*rear)
        changed+=1
    body.data.update()
    print("WVLRP_CAROLINE_GLUTE_SCULPT",changed,"height",round(height,3))

def add_period_updo(export_root,body,rig):
    """Build swept-back honey/light brown hair with a small rear chignon.
    Replaces the front-covering stock hair curtain; face stays unobstructed.
    """
    members=[export_root]+list(export_root.children_recursive)
    eyes=[o for o in members if o.type=="MESH" and
          ("high-poly" in o.name.lower() or
           ("eye" in o.name.lower() and not any(w in o.name.lower() for w in
                 ("eyebrow","eyelash","hair","eyelid","iris"))))]
    eye_pts=[o.matrix_world@v.co for o in eyes for v in o.data.vertices]
    if len(eye_pts)<28:
        raise RuntimeError("Caroline hairstyle: eye landmarks missing; refuse floating wig")
    eye_z=sum(p.z for p in eye_pts)/len(eye_pts)
    x=sum(p.x for p in eye_pts)/len(eye_pts)
    y=sum(p.y for p in eye_pts)/len(eye_pts)
    body_pts=[body.matrix_world@v.co for v in body.data.vertices]
    h=max(p.z for p in body_pts)-min(p.z for p in body_pts)
    if not (1<h<3):raise RuntimeError("Caroline hair landmarks: invalid height")
    head=next((b.name for b in rig.data.bones if b.name.lower().split(":")[-1]=="head"),None)
    if not head:raise RuntimeError("Caroline hairstyle requires a Head bone")
    # The visible eye plane anchors the hairline; the old stock long01 cape
    # ran directly down the FRONT of her face and torso.
    z0=eye_z+.049*h
    ztop=eye_z+.085*h
    yc=y+.043*h
    r_x=.071*h;r_y=.069*h
    vertices=[];faces=[];ids=[]
    def vert(v):vertices.append(tuple(v));return len(vertices)-1
    def quad(q,material=0):faces.append(q);ids.append(material)
    # Upper scalp cap only: z is always above eye level.
    rings=[];sides=48
    for j in range(16):
        t=(j+.001)/15.001
        theta=(math.pi/2)*t
        ring=[]
        for i in range(sides):
            az=2*math.pi*i/sides
            ring.append(vert((x+r_x*math.sin(theta)*math.cos(az),
                              yc+r_y*math.sin(theta)*math.sin(az),
                              z0+(ztop-z0)*math.cos(theta))))
        if rings:
            prev=rings[-1]
            for i in range(sides):
                k=(i+1)%sides
                quad((prev[i],ring[i],ring[k],prev[k]),i%3)
        rings.append(ring)
    # Side-swept lock ribbons end at the nape; no sheet crossing the eyes.
    for side in (-1,1):
        for strip in range(9):
            sections=11;prev=None
            for j in range(sections):
                t=j/(sections-1)
                z=eye_z+h*(.065-.13*t)
                xx=x+side*h*(.055+.009*strip/9+.011*t)
                yy=yc+h*(-.018+.037*t+.003*strip/9)
                width=.0033*h*(1-.4*t)
                a=vert((xx-side*width,yy,z))
                b=vert((xx+side*width,yy,z))
                if prev:quad((prev[0],prev[1],b,a),strip%3)
                prev=(a,b)
    # Coiled bun on the back of the head.
    origin=Vector((x,yc+.064*h,eye_z+.041*h))
    for strand in range(5):
        previous=None
        for i in range(65):
            a=2*math.pi*i/64
            radius=h*(.022+.003*strand)
            center=origin+Vector((radius*math.cos(a),h*.007*math.sin(2*a+strand),
                                   radius*math.sin(a)))
            ring=[]
            for k in range(5):
                b=2*math.pi*k/5
                ring.append(vert(center+Vector((h*.004*math.cos(b),
                             h*.004*math.sin(b),0))))
            if previous:
                for k in range(5):
                    n=(k+1)%5
                    quad((previous[k],ring[k],ring[n],previous[n]),strand%3)
            previous=ring
    mesh=bpy.data.meshes.new("Caroline authentic-light-hair updo preview mesh")
    mesh.from_pydata(vertices,[],faces);mesh.update()
    material_colors=[(.72,.55,.36),(.63,.47,.30),(.78,.62,.43)]
    for i,rgb in enumerate(material_colors):
        mat=bpy.data.materials.new("Caroline honey light-brown hair "+str(i))
        mat.use_nodes=True;mat.diffuse_color=(*rgb,1)
        bs=mat.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value=(*rgb,1)
        bs.inputs["Roughness"].default_value=.78
        bs.inputs["Metallic"].default_value=0
        mesh.materials.append(mat)
    for poly,mat in zip(mesh.polygons,ids):
        poly.material_index=mat;poly.use_smooth=True
    ob=bpy.data.objects.new("Caroline period swept back hair (face clear)",mesh)
    bpy.context.collection.objects.link(ob)
    # Mesh coordinates above were built in world coordinates.
    ob.matrix_world=rig.matrix_world.copy()
    transform=ob.matrix_world.inverted_safe()
    for v in ob.data.vertices:v.co=transform@v.co
    vg=ob.vertex_groups.new(name=head);vg.add(list(range(len(vertices))),1.0,"REPLACE")
    ob.modifiers.new("Caroline hair follows head","ARMATURE").object=rig
    print("WVLRP_CAROLINE_PERIOD_UPDO",len(vertices),len(faces),"hairline",round(z0,3),
          "eye_level",round(eye_z,3),"head_bone",head)
    return ob
