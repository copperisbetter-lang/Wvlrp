"""Carolyn's natural Season 3 pale-blue irises on the original MakeHuman eyes.

Copied from the existing, previously-tested Caitlyn eye pipeline; no changes to
orb size or eyelid topology. Builds small curved iris fiber/pupil meshes weighted
to the existing Head bone. Validation fails if either eyeball is unavailable.
"""
import bpy
def add_light_blue_eyes(export_root, body, rig):
    """Natural-sized muted blue irises following the head; eyes not resized."""
    from math import sin,cos,pi
    from mathutils import Vector
    objs=[export_root]+list(export_root.children_recursive)
    eyes=[ob for ob in objs if ob.type=="MESH"
          and (("high-poly" in ob.name.lower()) or
               (("eye" in ob.name.lower()) and
                not any(x in ob.name.lower() for x in ("eyebrow","eyelash"))))]
    if not eyes:
        raise RuntimeError("Carolyn iris coloring requires real MPFB eye meshes")
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
            raise RuntimeError("Carolyn missing iris eye-side geometry "+str(side)+": "+str(len(side_pts)))
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
        raise RuntimeError("Carolyn iris builder found no satisfactory iris geometry")
    mesh=bpy.data.meshes.new("Caroline natural light-blue iris geometry")
    mesh.from_pydata(vertices,[],polys);mesh.update()
    names_colors=[
        ("dark realistic pupils",(.075,.105,.13)),
        ("light blue iris",(.46,.69,.81)),
        ("soft iris fibers",(.32,.53,.67)),
        ("subtle limbal ring",(.18,.36,.51))
    ]
    for name,rgb in names_colors:
        m=bpy.data.materials.new("Caroline "+name)
        m.use_nodes=True;m.diffuse_color=(*rgb,1.)
        bsdf=m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value=(*rgb,1.)
        bsdf.inputs["Roughness"].default_value=.32
        bsdf.inputs["Metallic"].default_value=0.
        m.use_backface_culling=False
        mesh.materials.append(m)
    for p,i in zip(mesh.polygons,mat_ids):p.material_index=i
    obj=bpy.data.objects.new("Caroline light blue eyes (unchanged size)",mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent=export_root
    obj.matrix_world=body.matrix_world.copy()
    head=next((b.name for b in rig.data.bones if
               b.name.lower().split(":")[-1]=="head"),None)
    if not head: raise RuntimeError("Caroline eye iris requires head bone")
    g=obj.vertex_groups.new(name=head);g.add(list(range(len(vertices))),1.,"REPLACE")
    obj.modifiers.new("Caroline iris head motion","ARMATURE").object=rig
    print("WVLRP_CAROLINE_LIGHT_BLUE_IRISES",len(polys),
          "eyes_unchanged_size",True)

