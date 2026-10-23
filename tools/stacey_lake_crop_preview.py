#!/usr/bin/env python3
"""Review-only diagnostic previews of Stacey Lake panorama. Never modify the source."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
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
# Compact, true-size sector grid with no blank padded cells.
tw,th=512,256
sheet=Image.new("RGB",(tw*4,(th+28)*2),"#182923")
sd=ImageDraw.Draw(sheet)
for j in range(8):
    x0=round(j*w/8);x1=round((j+1)*w/8)
    t=im.crop((x0,0,x1,h)).convert("RGB").resize((tw,th),Image.Resampling.LANCZOS)
    ox=(j%4)*tw;oy=(j//4)*(th+28)
    sheet.paste(t,(ox,oy+28))
    sd.text((ox+8,oy+7),f"Sector {j+1}: U {x0/w:.3f} to {x1/w:.3f}",fill="white")
sheet.save(out/"contact-sheet.jpg",quality=90)
# Proposed foreground removal zones for VISUAL REVIEW ONLY.
# Soft alpha mask with center lake/mountains protected. Protect a wide right
# shoreline band; silhouette tracing/compositing is a later refinement.
scale=4
mw,mh=w//scale,h//scale
opacity=Image.new("L",(mw,mh),255)
od=ImageDraw.Draw(opacity)
def coords(points): return [(round(x*mw),round(y*mh)) for x,y in points]
# viewer-facing forest and near-floor at wrap seam: both edges are masked
od.polygon(coords([(0,0.08),(.11,.12),(.20,.22),(.25,.35),(.25,.63),(.29,.81),(.27,1),(0,1)]),fill=0)
od.polygon(coords([(1,0.08),(.96,.10),(.94,.19),(.94,.46),(.90,.60),(.91,.83),(.89,1),(1,1)]),fill=0)
# nearby leaf-strewn/flowered floor; leave water and beaches mostly intact
od.polygon(coords([(.25,1),(.25,.92),(.32,.86),(.43,.79),(.57,.79),(.73,.86),(.89,.94),(.89,1)]),fill=0)
opacity=opacity.filter(ImageFilter.GaussianBlur(2)).resize((w,h),Image.Resampling.BICUBIC)
masked=im.copy()
masked.putalpha(opacity)
masked.save(out/"proposed-foreground-mask.png",optimize=True)
# Checkerboard preview reveals cutout while preserving mountain and lake.
checker=Image.new("RGBA",(w,h),(36,49,57,255))
cd=ImageDraw.Draw(checker)
for y in range(0,h,128):
    for x in range(0,w,128):
        if (x//128+y//128)%2==0:cd.rectangle((x,y,x+127,y+127),fill=(71,88,96,255))
checker.alpha_composite(masked)
checker.convert("RGB").resize((1600,800),Image.Resampling.LANCZOS).save(out/"mask-before-after-preview.jpg",quality=90)
# seam proof: first and last 5% adjacent in wrap order.
k=round(w*.05)
seam=Image.new("RGB",(k*2,h))
seam.paste(masked.crop((w-k,0,w,h)).convert("RGB"),(0,0))
seam.paste(masked.crop((0,0,k,h)).convert("RGB"),(k,0))
seam.thumbnail((600,1000))
seam.save(out/"seam-check.jpg",quality=88)
manifest={
 "source":str(src),"source_sha256":sha,"size_px":[w,h],
 "review_status":"CONTACT SHEET ONLY; actual maple/tree crop boundary not yet approved",
 "contact_sheet":"contact-sheet.jpg",
 "proposed_mask":"proposed-foreground-mask.png", "preview":"mask-before-after-preview.jpg", "seam_check":"seam-check.jpg",
 "mask_note":"Review-only soft polygon preview; orange-maple and beach silhouette protection needs visual proof before final alpha; no 3D integration.",
 "requirements":["preserve orange maple","preserve lake and mountain vista","preserve rock outcrop and both beaches","remove near-foreground/right-side tree imagery only after visual boundary approval","retain 2:1 seamless 360 dimensions"],
 "source_untouched":hashlib.sha256(src.read_bytes()).hexdigest()==sha,
}
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
