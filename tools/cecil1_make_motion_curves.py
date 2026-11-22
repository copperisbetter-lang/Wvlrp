#!/usr/bin/env python3
"""Build conservative, time-indexed, editable candidate facial performance curves.
No source media or approved model is changed.
Inputs are machine-analyzed speech, estimated dictionary phones and 3fps FaceMesh ratios.
"""
from pathlib import Path
import csv,json,bisect,math
from collections import defaultdict

src=Path("research/cecil1-speech-motion-20261122")
summary=json.loads((src/"summary.json").read_text())
target=src/"candidate_curves"
target.mkdir(parents=True,exist_ok=True)
V = ["MBP","FV","TH","DTN","L","SZ","CHSH","KG","R","OU","EE","EH","AA","O","REST"]
controls = [
 "jawOpen","mouthNarrow","mouthWide",
 "eyeSquintLeft","eyeSquintRight","browLowerLeft","browLowerRight",
 "browFurrow","mouthCornerAsymmetry",
] + ["viseme_"+a for a in V if a!="REST"]
def clamp01(x):
    return max(0.0,min(1.0,float(x)))
def read_csv(path):
    with path.open(newline="",encoding="utf-8") as f:
        return list(csv.DictReader(f))
def metric_norm(metric,number,q,reverse=False):
    stats=q.get(metric) or {}
    low=float(stats.get("p10",0))
    high=float(stats.get("p90",1))
    v=clamp01((number-low)/max(high-low,0.00001))
    return 1-v if reverse else v
def interp(points,t):
    """Linear interpolation of observed 3fps metric, no artificial frames claimed."""
    if not points: return 0.0
    times=[x[0] for x in points]
    i=bisect.bisect_left(times,t)
    if i==0:return points[0][1]
    if i>=len(points):return points[-1][1]
    a,va=points[i-1]
    b,vb=points[i]
    return va+(vb-va)*((t-a)/max(b-a,.000001))

for summ in summary:
    i=summ["video_index"]
    q=summ["measured_motion_quantiles"]
    motion=read_csv(src/f"video_{i}_facial_motion_3fps.csv")
    events=json.loads((src/f"video_{i}_animation_reference.json").read_text())["events"]
    pts=defaultdict(list)
    for row in motion:
        t=float(row["time"])
        if row["face_found"]!="1":continue
        for k,v in row.items():
            if v not in ("",None) and k not in ("time","face_found"):
                pts[k].append((t,float(v)))
    phonetic=[]
    for word in events:
        for step in word["phones_approximate"]:
            if step["viseme"]!="REST":
                phonetic.append((float(step["start"]),float(step["end"]),step["viseme"]))
    phonetic.sort()
    phone_start=[p[0] for p in phonetic]
    width=12
    timeline=[]
    for frame in range(int(summ["duration_sec"]*width)+1):
        t=frame/width
        def n(metric,reverse=False):
            return metric_norm(metric,interp(pts[metric],t),q,reverse)
        row={"time":round(t,4),
             "jawOpen":n("mouth_inner_open"),
             "mouthNarrow":n("mouth_width",True),
             "mouthWide":n("mouth_width"),
             "eyeSquintLeft":n("eye_open_left",True),
             "eyeSquintRight":n("eye_open_right",True),
             "browLowerLeft":n("brow_eye_left",True),
             "browLowerRight":n("brow_eye_right",True),
             "browFurrow":n("brow_inner_gap",True),
             "mouthCornerAsymmetry":max(-1.0,min(1.0,interp(pts["corner_asym_y"],t)/.10))}
        for name in V:
            if name!="REST": row["viseme_"+name]=0.0
        # The phonetic events are DICTIONARY-based estimates distributed over word timing.
        # Fade 55ms in and out to avoid harsh transitions in a proposed rig.
        idx=bisect.bisect_right(phone_start,t)-1
        for j in (idx-1,idx,idx+1):
            if j<0 or j>=len(phonetic):continue
            a,b,name=phonetic[j]
            if t>=a-.055 and t<=b+.055:
                env=min(1.0,(t-(a-.055))/.055,((b+.055)-t)/.055)
                row["viseme_"+name]=max(row["viseme_"+name],clamp01(env))
        timeline.append({k:(round(v,4) if isinstance(v,float) else v) for k,v in row.items()})
    p=target/f"video_{i}_facial_candidate_12fps.csv"
    with p.open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=["time"]+controls)
        w.writeheader();w.writerows(timeline)
    print(i, len(timeline),"candidate animation frames",p)

(target/"README.md").write_text("""# Cecil 1 prototype facial motion curves — NOT an approved rig animation

Created exclusively from original Dad reference-video machine measurements and word timestamps.

\`video_1_facial_candidate_12fps.csv\` and \`video_2_facial_candidate_12fps.csv\` contain:
- \`time\`: recording-local seconds, 12fps export samples (facial landmark measurements were only 3fps; 12fps values are interpolated).
- \`jawOpen\`: relative inner-mouth opening (per-video 10th to 90th percentile normalized).
- \`mouthNarrow\` / \`mouthWide\`: relative mouth width proxies (NOT independently verified lip pucker/smile).
- \`eyeSquintLeft\` / \`eyeSquintRight\`: eyelid opening relative to that video's observed range.
- \`browLowerLeft\` / \`browLowerRight\` / \`browFurrow\`: relative landmark distance proxies, camera-pose-sensitive.
- \`mouthCornerAsymmetry\`: raw signed vertical position difference, not a smile or frown expression.
- \`viseme_*\`: DICTIONARY pronunciation guesses distributed uniformly within machine-recognized word windows. These are not phoneme force alignment or verified pronunciation.

**These are test curves, not finished face animation**. An animator must review timing against both original video/audio files and map these candidate values to actual rig/morph names and ranges on a **copy** of approved Cecil 1. Avoid interpreting video-specific baselines as universal rig values. Do NOT drive \`mouthNarrow\` and \`mouthWide\` simultaneously without a proper blend rule. Do NOT apply every phonetic event at full weight. Facial-hair follow-through, eye color, teeth, tongue, smile reference and asymmetric details still need dedicated review and rig testing.

Input data: \`../video_N_animation_reference.json\`, \`../video_N_facial_motion_3fps.csv\`, \`../summary.json\`.
No approved model or original videos were changed.
""",encoding="utf-8")
