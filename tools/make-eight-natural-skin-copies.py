#!/usr/bin/env python3
"""Non-destructive skin-tone copy of the eight independently fitted shrinkwraps."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
import trimesh

def main(root):
    root=Path(root)
    out=root/'natural-skin'
    out.mkdir(exist_ok=True)
    records=[]
    for n in range(1,9):
        src=(root/'scan04-shrinkwrap'/'Scan04_Independent_Shrinkwrap_R01.glb') if n==1 else (root/'shrinks'/f'Shrink_{n}_R01.glb')
        assert src.is_file(),src
        mesh=trimesh.load_mesh(src,process=False)
        assert mesh.vertices.shape[0]>1000
        original_positions=np.asarray(mesh.vertices).copy()
        original_faces=np.asarray(mesh.faces).copy()
        # Neutral-to-warm natural skin tone in sRGB, alpha fully opaque.
        # This is a material color, NOT a claimed DAZ photographic texture.
        # Match color across all eight; rely on physically shaded normals for relief.
        color=np.array([214,166,148,255],dtype=np.uint8)
        mesh.visual.vertex_colors=np.tile(color,(len(mesh.vertices),1))
        dest=out/f'Shrink_{n}_NaturalSkin_R01.glb'
        dest.write_bytes(mesh.export(file_type='glb'))
        again=trimesh.load_mesh(dest,process=False)
        assert np.array_equal(original_faces,again.faces),f'faces changed {n}'
        assert np.allclose(original_positions,again.vertices,atol=1e-6,rtol=0),f'vertices changed {n}'
        got=np.asarray(again.visual.vertex_colors)
        assert got.shape[0]==len(again.vertices) and np.all(got[:,:3]==color[:3]),(n,got[:3])
        records.append({'shrink':n,'source':str(src.relative_to(root)),'original_glb_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'output':dest.name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'vertices':len(again.vertices),'triangles':len(again.faces),'rgba_srgb':color.tolist(),'geometry_unchanged':True,'source':'single uniform natural skin-tone material, not photographic source image'})
        print('PASSED',n,'vertices',len(again.vertices),'triangles',len(again.faces),'sha',records[-1]['sha256'],flush=True)
    (out/'All_8_NaturalSkin_QA.json').write_text(json.dumps({'outputs':records,'source_files_preserved':True,'not_photo_textures':True,'method':'independent GLB copy, original topology & vertex coordinates preserved, matte natural skin tone'},indent=2))
if __name__=='__main__':main(sys.argv[1])
