#!/usr/bin/env python3
"""WVLRP 8-shot no-cost moving storyboard and optional Wan image-to-video enhancement.
Never edits production site. All output files labeled with provenance.
"""
import argparse, json, math, shutil, subprocess, os, sys, time
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps, ImageDraw

OUT=Path("video-production")
FRAME=OUT/"frames"
CLIPS=OUT/"clips"
FPS=24
W,H=832,480

SHOTS=[
 ("ADV-001","Woodland Fork Entrance","assets/woodland-fork-v1.webp",.54,
  "Cinematic authentic first person camera gently walking forward along a wooded Appalachian dirt trail arriving at a clear fork. Keep the REAL wooden RANGER STATION directional sign and two paths visible and consistent with the supplied image. Slowly choose the LEFT trail toward Ranger Station; tree shadows move naturally. No new buildings, no invented signs, no cuts."),
 ("ADV-002","Curve and 200-foot Station View","assets/woodland-fork-v1.webp",.35,
  "Continuous first person shot after choosing the left path at the marked fork. Camera rounds a subtle curve on the trail and sees a long straight roughly 200 foot woodland path with the same small rustic Ranger Station cabin visible at the far end. Realistic distance and geometry, gentle steady forward walking, correct original station and trees, no text changes, no teleporting."),
 ("ADV-003","Approaching the Ranger Station","assets/woodland-fork-v1.webp",.23,
  "Smooth first person camera moving gently closer along the dirt trail toward the same rustic wooden Ranger Station ahead. Original path, trees and cabin preserved without morphing. Natural daylight, leaves move subtly, slow camera push forward, no cuts."),
 ("ADV-004","Enter the Community Clearing","assets/community-clearing-v1.webp",.50,
  "Cinematic first person camera entering a large woodland community clearing, original prominent wooden Ranger Station straight ahead, Jeep and four wheeler parked outside, Laurel's Kitchen on left and Mercantile on right. Keep real building architecture and positions exactly as the original image. Smooth forward movement on center gravel path with natural mild parallax."),
 ("ADV-005","Approach Ranger Station Door","assets/community-clearing-v1.webp",.52,
  "Continuous realistic forward first-person walk toward the front entry porch of the Ranger Station in the supplied WVLRP community. Station grows gradually larger as we approach. Do not change the station shape, signage, vehicles or trees. Stable dolly forward, no scene cuts."),
 ("ADV-006","Ranger Office and Camera Monitor","assets/ranger-station-v1.webp",.50,
  "Cinematic gentle first-person camera moving slowly inside the existing warm wooden Ranger Station office. Pan slightly across the ranger desk, wildlife charts, field journals and the actual wall details. Preserve every building detail from supplied image; subtle true camera parallax, no invented monitor footage, no illegible animated text."),
 ("ADV-007","Ranger Case Files","assets/ranger-station-v1.webp",.69,
  "Realistic gentle camera push toward the Ranger Station desk and noticeboards, focusing on paper field case files, wildlife observation notes and clues. Keep authentic original office appearance, natural lighting and stable realistic details. No new readable words and no dramatic hand or human figure."),
 ("ADV-008","Walk Toward Laurel's Kitchen","assets/community-clearing-v1.webp",.12,
  "Cinematic first-person view in the same WVLRP community clearing moving toward the welcoming wooden Laurel's Kitchen coffee shop at the left of the station. Keep original architecture, realistic wooded daylight, smooth steady forward camera movement, gently moving leaves, no made-up signage or architecture.")
]

def call(cmd):
    subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)

def make_image(path,u):
    im=Image.open(path).convert("RGB")
    iw,ih=im.size
    if iw/ih>2.35:
        # equirectangular panoramic scene; take a moderate landscape viewing window
        cw=int(ih*1.08)
        ch=int(cw*H/W)
        x=max(0,min(iw-cw,round(u*iw-cw/2)))
        y=max(0,min(ih-ch,round(.51*ih-ch/2)))
        im=im.crop((x,y,x+cw,y+ch))
        return ImageOps.fit(im,(1060,610),method=Image.Resampling.LANCZOS)
    return ImageOps.fit(im,(1060,610),method=Image.Resampling.LANCZOS,centering=(u,.48))

def fallback_motion(still,dest,index):
    im=np.asarray(still.convert("RGB"))[:,:,::-1].copy()
    hh,ww=im.shape[:2]
    video=cv2.VideoWriter(str(dest),cv2.VideoWriter_fourcc(*'mp4v'),FPS,(W,H))
    assert video.isOpened(),"OpenCV could not write video"
    for frame in range(5*FPS):
        t=frame/(5*FPS-1)
        zoom=1.012 + .065*t if index not in (5,6) else 1.055+.085*t
        cw=int(ww/zoom);ch=int(hh/zoom)
        # continuous slow right-to-left position, keep original center
        dx=(.49+.012*t)*ww
        dy=(.5+.006*math.sin(t*math.pi))*hh
        x0=max(0,min(ww-cw,int(dx-cw/2)))
        y0=max(0,min(hh-ch,int(dy-ch/2)))
        frame_img=cv2.resize(im[y0:y0+ch,x0:x0+cw],(W,H),interpolation=cv2.INTER_LINEAR)
        video.write(frame_img)
    video.release()

def build_reel(dest,clips):
    manifest=OUT/"shot-list.txt"
    manifest.write_text("".join("file '"+str(Path("clips")/p.name)+"'\n" for p in clips))
    call(["ffmpeg","-y","-hide_banner","-loglevel","error","-f","concat","-safe","0","-i",str(manifest),
          "-c:v","libx264","-preset","veryfast","-crf","21","-pix_fmt","yuv420p","-an","-movflags","+faststart",str(dest)])
    cap=cv2.VideoCapture(str(dest));frames=cap.get(cv2.CAP_PROP_FRAME_COUNT);fps=cap.get(cv2.CAP_PROP_FPS)
    print("ASSEMBLED",dest,"seconds",round(frames/fps,2),"bytes",dest.stat().st_size,flush=True)
    cap.release()

def render():
    FRAME.mkdir(parents=True,exist_ok=True)
    CLIPS.mkdir(parents=True,exist_ok=True)
    sheet=Image.new("RGB",(W*2,(H+44)*4),(15,22,18));draw=ImageDraw.Draw(sheet)
    meta=[]
    for i,(key,label,src,u,prompt) in enumerate(SHOTS):
        still=make_image(src,u)
        f=FRAME/(key+"-source.jpg");still.resize((W,H)).save(f,quality=93)
        dest=CLIPS/(key+"-MOTION-STORYBOARD.mp4")
        tmp=CLIPS/(key+"-intermediate.mp4")
        fallback_motion(still,tmp,i)
        call(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(tmp),
          "-c:v","libx264","-preset","veryfast","-crf","22","-pix_fmt","yuv420p",
          "-r",str(FPS),"-an",str(dest)])
        tmp.unlink()
        thumb=still.resize((W,H));x=(i%2)*W;y=(i//2)*(H+44)+34
        sheet.paste(thumb,(x,y));draw.text((x+10,y-26),key+" "+label,fill="white")
        meta.append({"id":key,"name":label,"source":src,"duration_seconds":5,"render":"moving storyboard from existing owned WVLRP art","ai_enhanced":False,"file":str(dest),"narrative_prompt":prompt})
        print("STORYBOARD",key,src,dest.stat().st_size,flush=True)
    sheet.save(OUT/"eight-shot-contact.jpg",quality=91)
    (OUT/"manifest.json").write_text(json.dumps(meta,indent=2))
    build_reel(OUT/"WVLRP-ADVENTURE-8-SHOT-MOVING-STORYBOARD.mp4",[CLIPS/(item[0]+"-MOTION-STORYBOARD.mp4") for item in SHOTS])

def normalize_ai(infile,outfile):
    # The public Space produces roughly 4-second, 16 fps clips; gently retime to the 5-sec editorial beats.
    call(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(infile),"-vf",
      "scale=832:480:force_original_aspect_ratio=increase,crop=832:480,fps=24,setpts=1.225*(PTS-STARTPTS),tpad=stop_mode=clone:stop_duration=2,trim=duration=5,setpts=PTS-STARTPTS",
      "-an","-c:v","libx264","-preset","fast","-crf","20","-pix_fmt","yuv420p",str(outfile)])

def upgrade():
    from gradio_client import Client,handle_file
    client=Client("zerogpu-aoti/wan2-2-fp8da-aoti-faster")
    print("WAN_CONNECTED",flush=True)
    status=[]
    blocked=False
    for key,label,src,u,prompt in SHOTS:
        fallback=CLIPS/(key+"-MOTION-STORYBOARD.mp4")
        enhanced=CLIPS/(key+"-AI-MOTION.mp4")
        record={"id":key,"scene":label,"source":src,"result":"fallback_moving_storyboard","file":str(fallback)}
        if not blocked:
            try:
                job=client.submit(handle_file(str(FRAME/(key+"-source.jpg"))),prompt,6,
                    "cartoon, smearing, artificial trees, geometry morphing, fake sign letters, bad architecture, distorted faces, extra buildings, text overlays, watermark",
                    4.0,1.0,1.0,42,False,api_name="/generate_video")
                result=job.result(timeout=180)
                p=result[0] if isinstance(result,(list,tuple)) else result
                if isinstance(p,dict):p=p.get("video") or p.get("path") or p.get("name")
                if isinstance(p,dict):p=p.get("path") or p.get("name")
                path=Path(str(p))
                if not path.is_file():raise RuntimeError("Returned video missing")
                normalize_ai(path,enhanced)
                cap=cv2.VideoCapture(str(enhanced));n=cap.get(cv2.CAP_PROP_FRAME_COUNT)
                cap.release()
                if n<90:raise RuntimeError("Result too short: "+str(n))
                record.update({"result":"ai_generated","file":str(enhanced),"bytes":enhanced.stat().st_size})
                print("WAN_SUCCESS",key,enhanced.stat().st_size,flush=True)
            except Exception as e:
                record["error"]=str(e)[:450]
                blocked=True # Avoid burning repeated failed free-service calls
                print("WAN_STOPPED_FREE_LIMIT_OR_ERROR",key,str(e)[:500],flush=True)
        status.append(record)
    (OUT/"render-status.json").write_text(json.dumps(status,indent=2))
    chosen=[Path(x["file"]) for x in status]
    # create a single viewable reel with the successful AI shots intercut with source-art motion in proper order
    build_reel(OUT/"WVLRP-ADVENTURE-8-SHOT-REVIEW-REEL.mp4",chosen)
    ai=sum(x["result"]=="ai_generated" for x in status)
    print("FINAL_RESULT",ai,"AI_SHOTS",8-ai,"STORYBOARD_SHOTS",flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("mode",choices=["render","upgrade"])
    args=parser.parse_args()
    if args.mode=="render":render()
    else:upgrade()
