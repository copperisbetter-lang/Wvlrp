#!/usr/bin/env python3
"""Measure head orientations directly from original two Dad MP4s, test excerpts only.
Full source videos remain untouched in GitHub release. Saves 12fps pose estimate
and contact sheet for independent visual checks. Absolute camera pose is not
meaningful: output relative to the first 0.8 seconds of visible footage.
"""
from pathlib import Path
import subprocess, json, math, csv, tempfile
import numpy as np, cv2, mediapipe as mp
from PIL import Image,ImageDraw

sources=sorted(Path("/tmp/cecil-video-input").glob("*.mp4"))
assert len(sources)==2, "Require exactly both original clips"
out=Path("research/cecil1-speech-motion-20261122/head_pose")
out.mkdir(parents=True,exist_ok=True)
# PnP standard canonical approximate landmark geometry, NOT a calibrated 3D face scan.
reference = np.array([
    (0.,0.,0.),       # 1 bridge/tip nose
    (0.,-330.,-65.),  # 152 lower chin
    (-225.,170.,-135.), # 33 left eye corner, camera-left
    (225.,170.,-135.), # 263 right eye corner
    (-150.,-150.,-125.),# 61 mouth camera-left
    (150.,-150.,-125.), # 291 mouth camera-right
],dtype=np.float64)
indices=[1,152,33,263,61,291]
windows=[(0.,10.4),(3.,12.667)]
output_stats=[]
for i,video in enumerate(sources,1):
    start,end=windows[i-1]
    fps=12
    w=640
    h=480  # dynamically read below
    video_info=json.loads(subprocess.check_output(
        ["ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=width,height","-of","json",str(video)]))
    size=video_info["streams"][0]
    h=round(w * size["height"]/size["width"]/2)*2
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-ss",str(start),
         "-i",str(video),"-t",str(end-start),"-vf",f"fps={fps},scale={w}:{h}",
         "-pix_fmt","rgb24","-f","rawvideo","-"]
    ff=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    records=[]
    preview=[]
    K=np.array([[w,0,w/2],[0,w,h/2],[0,0,1]],dtype=np.float64)
    D=np.zeros((4,1))
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=False,max_num_faces=1,
                refine_landmarks=False,min_detection_confidence=.5,
                min_tracking_confidence=.5) as detector:
        frame_n=0
        while True:
            raw=ff.stdout.read(w*h*3)
            if len(raw)!=w*h*3: break
            t=start+frame_n/fps
            img=np.frombuffer(raw,dtype=np.uint8).reshape(h,w,3).copy()
            mesh=detector.process(img)
            row={"time":round(t,4),"ok":0,"pitch":None,"yaw":None,"roll":None,
                 "cx":None,"cy":None,"scale":None}
            if mesh.multi_face_landmarks:
                lm=mesh.multi_face_landmarks[0].landmark
                xy=np.array([[lm[k].x*w,lm[k].y*h] for k in indices],dtype=np.float64)
                ok,rvec,tvec=cv2.solvePnP(reference,xy,K,D,flags=cv2.SOLVEPNP_ITERATIVE)
                if ok:
                    rm,_=cv2.Rodrigues(rvec)
                    angles=cv2.RQDecomp3x3(rm)[0]
                    # approx image-space position to aid QA; neck motion not derived from translation
                    left=np.array([lm[33].x,lm[33].y])
                    right=np.array([lm[263].x,lm[263].y])
                    row.update(ok=1,pitch=round(float(angles[0]),4),yaw=round(float(angles[1]),4),
                       roll=round(float(angles[2]),4),cx=round((lm[1].x-.5),6),
                       cy=round((lm[1].y-.5),6),
                       scale=round(float(np.linalg.norm(right-left)),6))
                    if frame_n%12 == 0:
                        rgb=Image.fromarray(img)
                        dr=ImageDraw.Draw(rgb)
                        dr.rectangle([0,h-46,w,h],fill=(15,23,20))
                        dr.text((8,h-43),f"Clip{i} {t:.2f}s  pitch {angles[0]:.1f}  yaw {angles[1]:.1f}  roll {angles[2]:.1f}",fill="white")
                        preview.append(rgb)
            records.append(row)
            frame_n+=1
    ff.stdout.close()
    ff.wait()
    assert ff.returncode==0,ff.stderr.read().decode()[-300:]
    valid=[x for x in records if x["ok"]]
    assert len(valid)>len(records)*.8, "Insufficient tracked pose frames"
    baseline=[x for x in valid if x["time"]<=start+.8] or valid[:10]
    neutral={col:float(np.median([x[col] for x in baseline])) for col in ["pitch","yaw","roll","cx","cy","scale"]}
    for r in records:
        if not r["ok"]: continue
        for axis in ("pitch","yaw","roll"):
            r["d"+axis]=round(r[axis]-neutral[axis],4)
        r["dcx"]=round(r["cx"]-neutral["cx"],6)
        r["dcy"]=round(r["cy"]-neutral["cy"],6)
        r["dscale"]=round(r["scale"]-neutral["scale"],6)
    path=out/f"video_{i}_head_pose_12fps.csv"
    with path.open("w",newline="",encoding="utf8") as f:
        fields=["time","ok","pitch","yaw","roll","cx","cy","scale","dpitch","dyaw","droll","dcx","dcy","dscale"]
        wtr=csv.DictWriter(f,fieldnames=fields)
        wtr.writeheader();wtr.writerows(records)
    if preview:
        cols=4
        W=320;H=round(h*320/w)
        sheet=Image.new("RGB",(W*cols,(H+15)*math.ceil(len(preview)/cols)),(15,15,15))
        d=ImageDraw.Draw(sheet)
        for idx,im in enumerate(preview):
            im.thumbnail((W,H))
            x=idx%cols*W;y=idx//cols*(H+15)
            sheet.paste(im,(x,y))
            d.text((x+4,y+H),f"{start+idx:.1f}s",fill="white")
        sheet.save(out/f"video_{i}_head_pose_overview.jpg",quality=82,optimize=True)
    summary={
      "video":i,"source_window":[start,end],"fps":fps,"frames":len(records),
      "valid":len(valid),"reference":neutral,
      "difference_range_deg":{a:[round(float(np.percentile([x["d"+a] for x in valid],10)),2),
                                 round(float(np.percentile([x["d"+a] for x in valid],90)),2)]
        for a in ("pitch","yaw","roll")},
      "video_id":"Dadsfiles MP4 order sorted by filename",
      "accuracy_note":"Estimated PnP orientation from 2D face landmarks, not certified head motion; camera pose and landmark errors possible"}
    output_stats.append(summary)
    print("RESULT",json.dumps(summary),flush=True)
(out/"summary.json").write_text(json.dumps(output_stats,indent=2),encoding="utf8")
