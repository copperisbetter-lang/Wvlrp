#!/usr/bin/env python3
"""Review-only diagnostic previews of Stacey Lake panorama. Never modify the source."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json
src=Path("assets/stacey-lake-4k.webp")
out=Path("stacey-lake-preview")
out.mkdir(exist_ok=True)
raw=src.read_bytes()
sha=hashlib.sha256(raw).hexdigest()
im=Image.open(src).convert("RGBA")
w,h=im.size
if w < 500 or h < 250: raise RuntimeError("Unexpectedly small panorama")
# Preserve 360 equirectangular frame: divide circumferentially into eight labeled sectors.
tiles=[]
for i in range(8):
    x0=round(i*w/8);x1=round((i+1)*w/8)
    tile=im.crop((x0,0,x1,h)).convert("RGB")
    tile.thumbnail((600,500))
    canvas=Image.new("RGB",(tile.width,tile.height+42),"#182923")
    canvas.paste(tile,(0,42))
    d=ImageDraw.Draw(canvas)
    d.text((10,12),f"Sector {i+1}/8 | U={x0/w:.3f}-{x1/w:.3f}",fill="white")
    name=f"sector-{i+1:02}.jpg"
    canvas.save(out/name,quality=88)
    tiles.append(name)
sheet=Image.new("RGB",(1200,4*542),"#182923")
for j,name in enumerate(tiles):
    t=Image.open(out/name)
    sheet.paste(t,((j%2)*600,(j//2)*542))
sheet.save(out/"contact-sheet.jpg",quality=88)
# Demonstrate an alpha-based masking technique only. This is an intentionally
# conservative illustrative band, NOT an approved selection of specific trees.
# The panorama's pixel dimensions and angular mapping are unchanged.
preview=im.copy()
alpha=Image.new("L",(w,h),255)
a=ImageDraw.Draw(alpha)
a.rectangle((0,round(h*.92),w,h),fill=0)
preview.putalpha(alpha)
preview.save(out/"illustrative-lower-edge-mask.png",optimize=True)
manifest={
 "source":str(src),"source_sha256":sha,"size_px":[w,h],
 "review_status":"CONTACT SHEET ONLY; actual maple/tree crop boundary not yet approved",
 "contact_sheet":"contact-sheet.jpg",
 "illustrative_mask":"illustrative-lower-edge-mask.png",
 "mask_note":"Illustrative lower 8% transparency across full width; NOT intended final tree removal",
 "requirements":["preserve orange maple","preserve lake and mountain vista","preserve rock outcrop and both beaches","remove near-foreground/right-side tree imagery only after visual boundary approval","retain 2:1 seamless 360 dimensions"],
 "source_untouched":hashlib.sha256(src.read_bytes()).hexdigest()==sha,
}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
