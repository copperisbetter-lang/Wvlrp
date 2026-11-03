#!/usr/bin/env python3
"""Build Lily site-native clothes with the official Ara generator; NEVER sculpt garments here."""
import sys, json, hashlib, struct
from pathlib import Path

BASE=Path('prototypes/ara-young-explorer-three')
NAMES=('Lily_3','Lily_5')
MATERIALS={'Lily_3':('Oversized tee','Cargo shorts'),
           'Lily_5':('Fatigue shirt','Fatigue pants')}
UPSTREAM=Path('/tmp/ara3dgen/src/core/human.ts')

def patch_official_generator():
    s=UPSTREAM.read_text()
    old=("  let body: PolyMesh = pBody\n"
         "    ? proxyMesh(pBody, coords, bskin, faceD)\n"
         "    : compact(fullBody, (f, c) => !(assetDel[c[0]] | assetDel[c[1]] | assetDel[c[2]] | assetDel[c[3]]) && !coveredFaces[f]);")
    assert s.count(old)==1,'Official Ara source changed; refusing unverified body mutation'
    s=s.replace(old,"  // Preserve 100% of the protected base body even under site-dressed garments.\n  let body: PolyMesh = fullBody;")
    anchor="  const regions = lib.base.arrays.regions as Uint8Array;\n  let grid: VertexGrid | undefined;"
    child=(
        "  const regions = lib.base.arrays.regions as Uint8Array;\n"
        "  // Reproduce approved Lily child proportions. No clothing generation here.\n"
        "  if (p.gender < 0.5 && p.age === 0.1125) {\n"
        "    const neck = lib.base.meta.joints['neck01____head'];\n"
        "    const neckY = neck.reduce((sum,v)=>sum+coords[v*3+1],0)/neck.length;\n"
        "    const neckZ = neck.reduce((sum,v)=>sum+coords[v*3+2],0)/neck.length;\n"
        "    for (let v=0; v<regions.length; v++) {\n"
        "      if (regions[v] !== 0) continue;\n"
        "      const i=v*3, dy=coords[i+1]-neckY;\n"
        "      const f=Math.max(0,Math.min(1,dy/1.2));\n"
        "      coords[i] *= (1+0.07*f);\n"
        "      coords[i+2] = neckZ+(coords[i+2]-neckZ)*(1+0.05*f);\n"
        "      coords[i+1] = neckY+dy*(1+0.055*f);\n"
        "    }\n"
        "  }\n"
        "  let grid: VertexGrid | undefined;"
    )
    assert s.count(anchor)==1,'Approved seven-year head anchor changed'
    UPSTREAM.write_text(s.replace(anchor,child))
    safety=Path('/tmp/ara3dgen/src/core/garments/index.ts').read_text()
    assert 'const underwear = p.underwear || minor' in safety
    assert 'p.gender < 0.5 && minor' in safety
    print('Ara original native garment catalog unchanged; child safeguards intact.')

def finish_and_validate():
    sys.path.insert(0,str(BASE.resolve()))
    from age7_glb_finish import finish
    audit={}
    for name in NAMES:
        params=json.loads((BASE/(name+'.params.json')).read_text())
        assert (params['age'],params['gender'],params['hair'],params['eyes']) == (0.1125,0,'long01','green')
        assert params['underwear'] is True
        assert params['top']!='none' and params['bottom']!='none'
        path=BASE/'out'/(name+'.glb')
        report=finish(path)
        raw=path.read_bytes()
        assert raw[:4]==b'glTF' and len(raw)==struct.unpack_from('<I',raw,8)[0]
        json_len=struct.unpack_from('<I',raw,12)[0]
        doc=json.loads(raw[20:20+json_len])
        mats=[x.get('name','') for x in doc['materials']]
        assert all(w in mats for w in MATERIALS[name]),(name,mats)
        assert 'Skin' in mats and 'Hair' in mats and 'Eyes' in mats
        skin=next(p for mesh in doc['meshes'] for p in mesh['primitives'] if mats[p['material']]=='Skin')
        body_count=doc['accessors'][skin['indices']]['count']
        assert body_count==80268,(name,'missing body faces',body_count)
        assert len(doc['skins'][0]['joints'])==69
        assert len(doc['animations'])==77
        assert doc['extras']['wvlrpAgeYears']==7 and abs(doc['extras']['wvlrpScaledBodyHeightMeters']-1.22)<0.001
        copy=BASE/(name+'.glb')
        copy.write_bytes(raw)
        audit[name]={'status':'STRUCTURAL PASS; owner visual QA pending',
                     'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
                     'body_indices':body_count,'bones':69,'animations':77,
                     'official_website_clothing':list(MATERIALS[name]),
                     'finish':report}
    (BASE/'LILY_NATIVE_SITE_CLOTHING_QA.json').write_text(json.dumps(audit,indent=2)+'\n')
    print('LILY_SITE_NATIVE_QA_PASSED',json.dumps(audit))

if __name__=='__main__':
    assert len(sys.argv)==2
    {'patch':patch_official_generator,'finish':finish_and_validate}[sys.argv[1]]()
