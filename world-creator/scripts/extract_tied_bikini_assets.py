#!/usr/bin/env python3
"""Extract public CC-BY MakeHuman tied bikini assets and manifest for isolated preview."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json

base=Path("world-creator/assets/third-party/makehuman/underwear03")
archive=base/"underwear03.zip"
out=base/"tied-bikini-source"
out.mkdir(parents=True,exist_ok=True)
manifest=[]
with ZipFile(archive) as z:
    allnames=z.namelist()
    (out/"ALL_PACK_MEMBERS.txt").write_text("\n".join(allnames)+"\n",encoding="utf-8")
    for info in z.infolist():
        name=info.filename
        if info.is_dir() or "elvs_all_tied_up_bikini" not in name.lower(): continue
        if info.file_size > 3*1024*1024: continue
        suffix=Path(name).suffix.lower()
        if suffix not in (".mhclo",".mhmat",".obj",".mtl",".txt",".json",".license",".png",".jpg",".jpeg"):
            continue
        dest=out/Path(name).name
        contents=z.read(info)
        dest.write_bytes(contents)
        manifest.append(dict(zip_path=name,output=str(dest),size=len(contents),sha256=hashlib.sha256(contents).hexdigest()))
(out/"EXTRACTED_MANIFEST.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print("EXTRACTED",json.dumps(manifest))
