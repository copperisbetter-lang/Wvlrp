"""Clean independent long-blonde adult hairstyle for MakeHuman inspection.
Never use the stock long01 cape: its fitted front panels can cover the face and chest.
The geometry is built from actual skull/eye landmarks and skinned to Head.
"""
import bpy, math
from mathutils import Vector

def add_clean_long_blonde_hair(root, body, rig):
    members=[root]+list(root.children_recursive)
    eyes=[ob for ob in members if ob.type=="MESH" and
          ("high-poly" in ob.name.lower() or "low-poly" in ob.name.lower()) and
          "eye" not in ob.name.lower().replace("high-poly","").replace("low-poly","")]
    if not eyes:
        eyes=[ob for ob in members if ob.type=="MESH" and
              any(e in ob.name.lower() for e in ("high-poly","eye.")) and
              not any(t in ob.name.lower() for t in ("eyelash","eyebrow"))]
    pts=[ob.matrix_world @ v.co for ob in eyes for v in ob.data.vertices]
    if len(pts)<28: raise RuntimeError("Vulva2 blonde hair requires actual eyeball mesh landmark")
    cx=sum(p.x for p in pts)/len(pts); ey=sum(p.y for p in pts)/len(pts)
    ez=sum(p.z for p in pts)/len(pts)
    bpts=[body.matrix_world @ v.co for v in body.data.vertices]
    h=max(p.z for p in bpts)-min(p.z for p in bpts)
    if not 1.2<h<2.2: raise RuntimeError("Hair source size invalid")
    head=next((b.name for b in rig.data.bones if
        ''.join(c for c in b.name.lower() if c.isalnum()).replace("mixamorig","")=="head"),None)
    if not head: raise RuntimeError("Vulva2 hair cannot follow a rig without head bone")
    cy=ey+.039*h; rx=.054*h;ry=.058*h;crown=ez+.091*h
    verts=[];faces=[];face_mats=[]
    def addpoint(p):
        verts.append(tuple(p));return len(verts)-1
    def face(idx,m):
        faces.append(tuple(idx));face_mats.append(m)
    def surface(az,theta):
        forward=(1-math.sin(az))*.5
        edge=ez+h*(.006+.027*forward)
        st=math.sin(theta)
        return (cx+rx*st*math.cos(az),cy+ry*st*math.sin(az),
                edge+(crown-edge)*math.cos(theta)**.92)
    # Rounded scalp follows the skull without free strips over eyes or chest.
    prev=None;sides=56;rows=19
    for j in range(rows):
        theta=.008+(math.pi/2-.008)*j/(rows-1)
        ring=[addpoint(surface(i*2*math.pi/sides,theta)) for i in range(sides)]
        if prev is not None:
            for i in range(sides):
                n=(i+1)%sides
                face((prev[i],ring[i],ring[n],prev[n]),i%4)
        prev=ring
    # Independently tapered strands entirely behind the eyes. Slight stagger
    # gives varied length and prevents a blunt straight polygon curtain.
    strands=92;steps=18
    for j in range(strands):
        az=.10+(math.pi-.20)*j/(strands-1)  # back hemisphere (+Y); face/eyes are on -Y
        start=surface(az,1.45)
        previous=None
        wiggle=.0015*h*math.sin(j*1.5)
        end_depth=(.34+.065*math.sin(.45*j)**2)*h
        for step in range(steps+1):
            t=step/steps
            width=.0058*h*(1-.48*t)
            wave=wiggle*math.sin(math.pi*t*2)
            x=start[0]+wave+(.011*h*math.cos(az))*t
            y=start[1]+(.033*h+.008*h*math.sin(j*.31))*t
            z=start[2]-end_depth*t+.004*h*math.sin(2.5*math.pi*t+j*.2)*t
            a=addpoint((x-width,y,z))
            b=addpoint((x+width,y,z))
            if previous is not None:face((previous[0],a,b,previous[1]),j%4)
            previous=(a,b)
    mesh=bpy.data.meshes.new("Vulva2 fitted clean blonde cap and back hair")
    mesh.from_pydata(verts,[],faces);mesh.update()
    for i,color in enumerate(((.67,.48,.25),(.75,.57,.32),(.59,.42,.20),(.78,.62,.37))):
        material=bpy.data.materials.new("Vulva2 long blonde hair shade "+str(i))
        material.use_nodes=True
        material.diffuse_color=(*color,1)
        shader=next(n for n in material.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
        shader.inputs["Base Color"].default_value=(*color,1.)
        shader.inputs["Metallic"].default_value=0.
        shader.inputs["Roughness"].default_value=.75
        mesh.materials.append(material)
    for poly,mat in zip(mesh.polygons,face_mats):
        poly.material_index=mat;poly.use_smooth=True
    obj=bpy.data.objects.new("Vulva2 clean long blonde hair | head rigged",mesh)
    bpy.context.collection.objects.link(obj)
    # Bone-parent the hair directly to Head. Do not simultaneously armature-
    # deform and parent it: that can double-transform the cap during animation.
    # Generated vertices above are WORLD coordinates, so convert them to
    # the rest head-bone coordinate frame before attaching.
    bpy.context.view_layer.update()
    head_bone=rig.data.bones[head]
    rest_world=rig.matrix_world @ head_bone.matrix_local
    inv=rest_world.inverted_safe()
    for vertex in mesh.vertices:
        vertex.co=inv @ vertex.co
    obj.parent=rig
    obj.parent_type="BONE"
    obj.parent_bone=head
    obj.matrix_parent_inverse.identity()
    obj.matrix_basis.identity()
    bpy.context.view_layer.update()
    if obj.parent!=rig or obj.parent_type!="BONE" or obj.parent_bone!=head:
        raise RuntimeError("SAV3_HAIR_BONE_PARENT_FAILED")
    # In rest pose the generated scalp must remain where it was constructed.
    original=Vector(verts[0])
    actual=obj.matrix_world @ mesh.vertices[0].co
    if (actual-original).length > .015*h:
        raise RuntimeError("SAV3_HAIR_REST_TRANSFORM_MISMATCH")
    if min(z for x,y,z in verts) < ez-.48*h:
        raise RuntimeError("Long hair hanging below intended back/waist clearance")
    print("WVLRP_VULVA2_CLEAN_HAIR_SUCCESS",len(verts),len(faces),head)
    return obj
