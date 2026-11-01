#!/usr/bin/env python3
"""Extract the complete upstream All Tied Up bikini garment for isolated fit/rig assessment."""
from pathlib import Path
from zipfile import ZipFile
import hashlib,json

base=Path("world-creator/assets/third-party/makehuman/underwear03")
out=base/"tied-bikini-source"
out.mkdir(parents=True,exist_ok=True)
manifest=[]
with ZipFile(base/"underwear03.zip") as z:
    allnames=z.namelist()
    (out/"ALL_PACK_MEMBERS.txt").write_text("\n".join(allnames)+"\n",encoding="utf-8")
    for info in z.infolist():
        name=info.filename
        if info.is_dir() or not name.lower().startswith("clothes/elvs_all_tied_up_bikini/"): continue
        if info.file_size > 10*1024*1024: continue
        suffix=Path(name).suffix.lower()
        if suffix not in (".mhclo",".mhmat",".obj",".mtl",".txt",".json",".license",".png",".jpg",".jpeg",".thumb"):
            continue
        dest=out/Path(name).name
        data=z.read(info)
        dest.write_bytes(data)
        manifest.append(dict(zip_path=name,output=str(dest),size=len(data),sha256=hashlib.sha256(data).hexdigest()))
(out/"EXTRACTED_MANIFEST.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print("EXTRACTED",json.dumps(manifest))
