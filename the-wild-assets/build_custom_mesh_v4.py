#!/usr/bin/env python3
"""The Wild custom adult body V4: preserve V3, rebuild texture coverage and independent meshes.
This is deliberately reproducible and non-destructive. Source: public V3 chunks.
The underside components are provisional anatomy until owner approves their fit.
"""
from pathlib import Path
from io import BytesIO
import base64
import hashlib
import json
import math
import re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import trimesh
from scipy.ndimage import gaussian_filter

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"the-wild-assets"
SOURCE=ROOT/"the-wild-custom-mesh-v3-viewer.html"
OUTPUT=ROOT/"the-wild-custom-mesh-v4-viewer.html"

def get_original():
    chunks=[(ASSETS/("character-v3-part-%02d.txt"%i)).read_text().strip() for i in range(1,11)]
    assert len("".join(chunks))==5822232, "V3 source unexpectedly changed"
    data=base64.b64decode("".join(chunks),validate=True)
    assert data[:4]==b"glTF" and int.from_bytes(data[8:12],"little")==len(data)
    return data

def skin_atlas(original):
    rgb=np.asarray(original.convert("RGB"),dtype=np.float32)
    h,w=rgb.shape[:2]
    assert (w,h)==(1536,1536), (w,h)
    # Only real portions of the three photo projections should reach the model:
    # V3's triangulated backdrop and hard rectangular crops are NOT skin.
    mask=Image.new("L",(w,h),0)
    d=ImageDraw.Draw(mask)
    # Front: preserve existing face, chest, nipples, abdomen and frontal pelvis.
    d.polygon([(128,0),(359,0),(376,120),(366,280),(364,695),
               (351,801),(317,839),(191,839),(148,805),(145,285),(141,140)],fill=255)
    # Lower front photo, two independently tapered legs: avoid centre photo void.
    d.polygon([(153,765),(244,785),(239,966),(233,1195),(236,1535),
               (172,1535),(165,1200),(152,953)], fill=255)
    d.polygon([(258,785),(350,765),(345,954),(342,1210),(340,1535),
               (282,1535),(274,1210),(267,952)],fill=255)
    # Side photograph: retain contour details but not the large angular background fan.
    d.polygon([(666,0),(780,0),(819,175),(816,327),(804,481),
               (849,627),(864,739),(847,823),(822,942),(816,1065),
               (835,1381),(822,1535),(759,1535),(741,1355),
               (753,1030),(720,862),(676,715),(666,525),(648,320)], fill=255)
    # Back: retain hair, spine and gluteal contours above the exposed seam.
    d.polygon([(1178,0),(1383,0),(1408,120),(1382,580),(1384,749),
               (1369,789),(1310,814),(1254,814),(1184,788),
               (1169,721),(1169,160)],fill=255)
    # The V3 photo has an empty grey stair-step gap under the buttocks;
    # do NOT preserve it as an opaque photographic "strip".
    d.polygon([(1195,787),(1267,795),(1261,986),(1263,1165),(1258,1535),
               (1192,1535),(1183,1100),(1182,913)],fill=255)
    d.polygon([(1297,795),(1370,786),(1376,920),(1374,1130),
               (1377,1535),(1314,1535),(1317,1201),(1310,986)],fill=255)
    # Exclude former background triangles by feathering the photo silhouettes
    # into a coherent skin base rather than abrupt rectangular decals.
    coverage=np.asarray(mask,dtype=np.float32)/255.
    alpha=gaussian_filter(coverage,sigma=13.0)
    alpha=np.clip((alpha-.04)/.92,0.,1.)[:,:,None]
    rng=np.random.default_rng(20261116)
    noise=rng.normal(0,1,(h,w)).astype(np.float32)
    low=gaussian_filter(noise,sigma=15.0)
    fine=gaussian_filter(noise,sigma=1.0)
    # Harmonised neutral skin; small natural low-frequency variation.
    base=np.empty_like(rgb)
    base[:]=[230.,191.,177.]
    base+=((low*24.+fine*2.1)[:,:,None])
    yy=np.linspace(0,1,h,dtype=np.float32)[:,None,None]
    base+=np.sin(yy*math.pi*2)*np.array([2.4,1.6,1.7],dtype=np.float32)
    # Keep characteristic photo detail wherever original photographs are valid.
    rebuilt=np.clip(rgb*alpha+base*(1.-alpha),0,255).astype(np.uint8)
    return Image.fromarray(rebuilt,"RGB"),float(np.mean(alpha)),float(np.mean((1.-alpha)))

def spindle(name,side,kind):
    """An independently selectable, closed tissue fold. +Z is character front."""
    outer=kind=="MAJORA"
    points=[]
    faces=[]
    along=37
    ring=12
    for i in range(along):
        t=i/(along-1)
        bulge=max(.025, math.sin(math.pi*t))**.75
        z=(.074 if outer else .063)-(.105 if outer else .072)*t
        x=side*((.018 if outer else .0065)+(.0015 if outer else .0005)*math.sin(math.pi*t))
        # Very shallow, avoid the protruding disconnected "strip" from V3.
        y=(.771 if outer else .767)+.004*math.cos(math.pi*t)
        rx=(.0080 if outer else .0032)*bulge
        ry=(.0062 if outer else .0040)*bulge
        for k in range(ring):
            a=2*math.pi*k/ring
            points.append([x+rx*math.cos(a),y+ry*math.sin(a),z])
        if i:
            for k in range(ring):
                a=(i-1)*ring+k
                b=(i-1)*ring+(k+1)%ring
                c=i*ring+k
                d=i*ring+(k+1)%ring
                faces.extend(([a,b,c],[b,d,c]))
    # Close the two tiny end rings rather than leave non-manifold openings.
    for k in range(1,ring-1):
        faces.append([0,k+1,k])
        j=(along-1)*ring
        faces.append([j,j+k,j+k+1])
    m=trimesh.Trimesh(vertices=points,faces=faces,process=False)
    tone=(212,163,151,255) if outer else (188,117,121,255)
    m.visual.vertex_colors=np.tile(np.asarray(tone,dtype=np.uint8),(len(points),1))
    return m

def patch_viewer(source, new_count, b64len, tris, sha):
    v=source
    v=v.replace("Custom Mesh V3 | Live Viewer","Custom Mesh V4 | Live Viewer")
    v=v.replace("Hosted 3D viewer · 166,302 triangles",
                "Custom V4 · %s triangles · saved model"%format(tris,","))
    v=v.replace("166,302 triangles","%s triangles"%format(tris,","))
    v=v.replace("character-v3-part-","character-v4-part-")
    v=v.replace("Array.from({length:10}","Array.from({length:%d}"%new_count)
    v=v.replace("b64.length!==5822232","b64.length!==%d"%b64len)
    v=v.replace("The_Wild_Custom_Character.glb","The_Wild_Custom_Character_V4.glb")
    v=v.replace("Drag to rotate · pinch or use +/- to zoom",
                "Drag to rotate · pinch to zoom · V4 independent anatomy")
    v=v.replace('<button class="btn" id="spin">Spin</button>',
        '<button class="btn" id="under">Under</button><button class="btn" id="outer">Outer folds</button><button class="btn" id="inner">Inner folds</button><button class="btn" id="spin">Spin</button>')
    v=v.replace('uniform mat4 mat;uniform mat3 rot;varying vec3 vn;',
        'uniform mat4 mat;uniform mat3 rot;uniform float opening;uniform float side;varying vec3 vn;')
    v=v.replace('gl_Position=mat*vec4(p,1.0);',
        'gl_Position=mat*vec4(p+vec3(side*opening*0.008,0.,0.),1.0);')
    v=v.replace("usetex:gl.getUniformLocation(pg,'usetex')",
                "usetex:gl.getUniformLocation(pg,'usetex'),opening:gl.getUniformLocation(pg,'opening'),side:gl.getUniformLocation(pg,'side')")
    v=v.replace("mesh.push({pv:buffer(P,gl.ARRAY_BUFFER)",
                "mesh.push({name:item.name||'',pv:buffer(P,gl.ARRAY_BUFFER)")
    v=v.replace("let angle=0,elev=0,zoom=3.35,spinning=false,last=0;",
                "let angle=0,elev=0,zoom=3.35,spinning=false,last=0,outerOpen=0,innerOpen=0;")
    v=v.replace("document.querySelector('#spin').onclick",
        "document.querySelector('#under').onclick=()=>{angle=0;elev=.68;zoom=1.35;spinning=false;};\n"
        "document.querySelector('#outer').onclick=()=>{outerOpen=outerOpen?0:1;document.querySelector('#outer').textContent=outerOpen?'Outer close':'Outer folds';};\n"
        "document.querySelector('#inner').onclick=()=>{innerOpen=innerOpen?0:1;document.querySelector('#inner').textContent=innerOpen?'Inner close':'Inner folds';};\n"
        "document.querySelector('#spin').onclick")
    v=v.replace("gl.uniform1f(loc.usetex,m.tex?1:0);",
        "gl.uniform1f(loc.usetex,m.tex?1:0);"
        "const side=m.name.endsWith('_L')?-1:1;"
        "const a=m.name.includes('LABIA_MAJORA')?outerOpen:m.name.includes('LABIA_MINORA')?innerOpen:0;"
        "gl.uniform1f(loc.side,side);gl.uniform1f(loc.opening,a);")
    assert "character-v3-part-" not in v and ("b64.length!==%d"%b64len) in v
    assert "LABIA_MINORA" in v and "LABIA_MAJORA" in v
    return v.replace("3D mesh ready — drag to rotate",
                     "V4 mesh ready · model SHA256 %s · drag to rotate"%sha[:10])

def main():
    original=get_original()
    source_sha=hashlib.sha256(original).hexdigest()
    scene=trimesh.load(BytesIO(original),file_type="glb",force="scene",process=False)
    body_candidates=[(n,m) for n,m in scene.geometry.items()
                     if len(m.vertices)>45000 and getattr(m.visual,"kind",None)=="texture"]
    assert len(body_candidates)==1, [(n,len(m.vertices),m.visual.kind) for n,m in scene.geometry.items()]
    name,body=body_candidates[0]
    assert len(body.faces)==96302, "Original body triangle count changed"
    assert len(scene.geometry)==13, "V3 mesh section count changed"
    # Texture overhaul: keep original photo details but eliminate the rectangular
    # projection slabs/fan extrapolation which show up on the thighs and underside.
    mat=body.visual.material
    photo=getattr(mat,'baseColorTexture',None)
    if photo is None:
        photo=getattr(mat,'image',None)
    assert photo is not None, 'Original V3 photograph atlas was not loaded'
    clean,coverage,synthetic=skin_atlas(photo)
    if hasattr(mat,'baseColorTexture'):
        mat.baseColorTexture=clean
    else:
        mat.image=clean
    # Conservative body sculpt: refine breast projection without altering face,
    # hips, height, thigh proportions, front texture or root alignment.
    pts=body.vertices.copy()
    before=pts.copy()
    x,y,z=pts.T
    displacement=np.zeros_like(x)
    frontal=np.clip((z-.015)/.07,0,1)
    for sign in (-1,1):
        r=((x-sign*.107)/.068)**2+((y-1.353)/.095)**2
        displacement+=.010*np.exp(-.5*r)*frontal
    pts[:,2]+=displacement
    body.vertices=pts
    # Unique independent objects; never bake these into the body texture.
    for pair in ("MAJORA","MINORA"):
        for suffix,sgn in (("L",-1),("R",1)):
            part_name="LABIA_%s_%s"%(pair,suffix)
            scene.add_geometry(spindle(part_name,sgn,pair),
                               geom_name=part_name,node_name=part_name)
    # 13 original mesh sections plus 4 new separately selectable ones.
    assert len(scene.geometry)==17,len(scene.geometry)
    built=scene.export(file_type="glb",include_normals=True)
    assert built[:4]==b"glTF" and int.from_bytes(built[8:12],"little")==len(built)
    check=trimesh.load(BytesIO(built),file_type="glb",force="scene",process=False)
    assert len(check.geometry)==17 and any(n.startswith("LABIA_MINORA_") for n in check.geometry)
    assert len(check.geometry[name].faces)==96302
    total_faces=sum(len(m.faces) for m in check.geometry.values())
    hash4=hashlib.sha256(built).hexdigest()
    b64=base64.b64encode(built).decode("ascii")
    data=[b64[i:i+600000] for i in range(0,len(b64),600000)]
    for old in ASSETS.glob("character-v4-part-*.txt"):
        old.unlink()
    for i,fragment in enumerate(data,1):
        (ASSETS/("character-v4-part-%02d.txt"%i)).write_text(fragment)
    html=patch_viewer(SOURCE.read_text(),len(data),len(b64),total_faces,hash4)
    OUTPUT.write_text(html)
    record={
        "source":"V3 / 166302 triangles, 13 meshes, original unchanged",
        "original_sha256":source_sha,"v4_sha256":hash4,
        "v4_bytes":len(built),"base64_chars":len(b64),"chunks":len(data),
        "meshes":len(check.geometry),"triangles":total_faces,
        "breast_sculpt_max_m":float(displacement.max()),
        "photo_coverage_average":coverage,
        "source_images_preserved":"Facial/front chest reference core; other photo islands feathered into reconstructed skin",
        "independent_meshes":["LABIA_MAJORA_L","LABIA_MAJORA_R","LABIA_MINORA_L","LABIA_MINORA_R"],
        "status":"engineering candidate; owner visual/fit approval still required",
        "original_unchanged":True
    }
    (ASSETS/"character-v4-manifest.json").write_text(json.dumps(record,indent=2)+"\n")
    print("CUSTOM_MESH_V4_BUILD_SUCCESS",json.dumps(record,sort_keys=True))
if __name__=="__main__":
    main()
