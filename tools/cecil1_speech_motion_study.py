#!/usr/bin/env python3
"""Cecil 1 / Dad speech-to-face reference, research only (never edits the model).
Runs on private GitHub Actions runner. Source videos remain in GitHub release.
Whisper word timestamps are estimates. Phonemes are lexical and distributed
within each recognized word (NOT acoustically forced-aligned).
"""
from pathlib import Path
import csv, json, math, re, subprocess, wave, bisect, statistics, sys
from collections import Counter
import numpy as np
from faster_whisper import WhisperModel
import pronouncing

SOURCE = Path("/tmp/cecil-video-input")
OUTPUT = Path("research/cecil1-speech-motion-20261122")
OUTPUT.mkdir(parents=True, exist_ok=True)
model = WhisperModel("base.en", device="cpu", compute_type="int8", cpu_threads=4, num_workers=1)

# Character-ready viseme labels: these are pronunciation DICTIONARY estimates,
# not a claim about exact lip geometry. Measure lips from video separately.
PHONEME_VISEME = {
    "P":"MBP", "B":"MBP", "M":"MBP",
    "F":"FV", "V":"FV",
    "TH":"TH", "DH":"TH",
    "T":"DTN", "D":"DTN", "N":"DTN", "L":"L",
    "S":"SZ", "Z":"SZ", "SH":"CHSH", "ZH":"CHSH",
    "CH":"CHSH", "JH":"CHSH",
    "K":"KG", "G":"KG", "NG":"KG",
    "R":"R", "W":"OU", "Y":"EE", "HH":"REST",
    "IY":"EE", "IH":"EE", "EY":"EE", "EH":"EH",
    "AE":"AA", "AA":"AA", "AH":"EH", "AO":"O",
    "UH":"OU", "UW":"OU", "OW":"O", "OY":"O",
    "AW":"AA", "AY":"AA", "ER":"R"
}
VOWELS = { "IY","IH","EY","EH","AE","AA","AH","AO","UH","UW","OW","OY","AW","AY","ER"}
def phones_and_visemes(word):
    normalized = re.sub("[^a-z']", "", word.lower())
    variants = pronouncing.phones_for_word(normalized)
    if not variants:
        return [], []
    phones = [re.sub(r"\d","",p) for p in variants[0].split()]
    return phones,[PHONEME_VISEME.get(p,"REST") for p in phones]

def wave_audio(video,wav):
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y",
        "-i",str(video),"-vn","-ac","1","-ar","16000","-acodec","pcm_s16le",str(wav)],check=True)

def audio_rms(wave_mono, sample_rate, begin, end):
    a = max(0, min(len(wave_mono),int(begin*sample_rate)))
    b = max(a+1, min(len(wave_mono),int(end*sample_rate)))
    return round(float(np.sqrt(np.mean(np.square(wave_mono[a:b],dtype=np.float64)))),5)

def coords(mesh):
    return np.array([[p.x,p.y,p.z] for p in mesh.landmark],dtype=np.float64)

def euclid(a,b):
    return float(np.linalg.norm(a-b))

def features(pts,display_aspect):
    # Coordinates normalized to picture dimensions, aspect-corrected X.
    xy = pts[:,:2].copy()
    xy[:,0] *= display_aspect
    eye_span = max(euclid(xy[33],xy[263]),0.00001)
    mouth_width = max(euclid(xy[61],xy[291]),0.00001)
    eye_l = euclid(xy[159],xy[145])/max(euclid(xy[33],xy[133]),0.00001)
    eye_r = euclid(xy[386],xy[374])/max(euclid(xy[362],xy[263]),0.00001)
    center_mouth_x = (xy[61,0]+xy[291,0])/2
    upper_lip_y = (xy[13,1] + xy[0,1])/2
    lower_lip_y = (xy[14,1] + xy[17,1])/2
    return {
       "mouth_inner_open":round(euclid(xy[13],xy[14])/mouth_width,5),
       "mouth_outer_open":round(euclid(xy[0],xy[17])/mouth_width,5),
       "mouth_width":round(mouth_width/eye_span,5),
       "lip_round_proxy":round(mouth_width/eye_span,5),
       "jaw_to_nose":round(euclid(xy[152],xy[1])/eye_span,5),
       "eye_open_left":round(eye_l,5),
       "eye_open_right":round(eye_r,5),
       "brow_eye_left":round(euclid(xy[105],xy[159])/eye_span,5),
       "brow_eye_right":round(euclid(xy[334],xy[386])/eye_span,5),
       "brow_inner_gap":round(euclid(xy[55],xy[285])/eye_span,5),
       "corner_asym_y":round((xy[61,1]-xy[291,1])/eye_span,5),
    }

def measure_faces(video,video_index):
    import mediapipe as mp
    # For reproducibility, use mp.solutions on pinned mediapipe 0.10.21.
    cap_info=json.loads(subprocess.check_output(
        ["ffprobe","-v","error","-select_streams","v:0",
         "-show_entries","stream=width,height","-of","json",str(video)]))
    st=cap_info["streams"][0]
    width=640
    height=round((width * st["height"] / st["width"])/2)*2
    hz=3
    ff=subprocess.Popen(["ffmpeg","-hide_banner","-loglevel","error",
        "-i",str(video),"-vf",f"fps={hz},scale={width}:{height}",
        "-pix_fmt","rgb24","-f","rawvideo","-"],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    sample_size=width*height*3
    readings=[]
    frame=0
    with mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,max_num_faces=1,
        refine_landmarks=False,min_detection_confidence=.45,
        min_tracking_confidence=.45) as mesh:
        while True:
            b=ff.stdout.read(sample_size)
            if len(b)!=sample_size: break
            rgb=np.frombuffer(b,dtype=np.uint8).reshape((height,width,3))
            try:
                result=mesh.process(rgb)
                props=features(coords(result.multi_face_landmarks[0]),width/height) if result.multi_face_landmarks else None
            except Exception as e:
                props=None
            row={"time":round(frame/hz,4),"face_found":int(bool(props))}
            if props: row.update(props)
            readings.append(row)
            frame+=1
            if frame%900==0:print(f"video {video_index}: face samples processed {frame}",flush=True)
    ff.stdout.close()
    ff.wait()
    if ff.returncode != 0:
        print("ffmpeg face tracking exited with",ff.returncode,ff.stderr.read()[-1000:])
    return readings

def average_in_window(samples,times,begin,end,field):
    a=bisect.bisect_left(times,max(0,begin))
    b=bisect.bisect_right(times,max(0,end))
    values=[row[field] for row in samples[a:b] if isinstance(row.get(field), (float,int))]
    return round(float(np.mean(values)),5) if values else None

def write_csv(path,rows,fields):
    with path.open("w",encoding="utf-8",newline="") as fh:
        writer=csv.DictWriter(fh,fieldnames=fields,extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

summaries=[]
for index,video in enumerate(sorted(SOURCE.glob("*.mp4")),1):
    wav=Path(f"/tmp/cecil_video_{index}_16k.wav")
    wave_audio(video,wav)
    with wave.open(str(wav),"rb") as w:
        samplerate=w.getframerate()
        samples=np.frombuffer(w.readframes(w.getnframes()),dtype="<i2").astype(np.float32)/32768.0
    duration=len(samples)/samplerate
    segments,info=model.transcribe(str(wav),language="en",beam_size=3,
       best_of=3,word_timestamps=True,vad_filter=True,
       condition_on_previous_text=False,temperature=0)
    all_segments=list(segments)
    transcript=[]
    words=[]
    for seg in all_segments:
        sentence=(seg.text or "").strip()
        transcript.append({"start":round(seg.start,3),"end":round(seg.end,3),
             "text":sentence,"avg_logprob":round(float(seg.avg_logprob),3),
             "no_speech_prob":round(float(seg.no_speech_prob),3)})
        for item in (seg.words or []):
            if not item.word.strip():continue
            phonemes,visemes=phones_and_visemes(item.word)
            a=max(0,float(item.start));b=max(a,float(item.end))
            if b<=a:continue
            steps=[]
            # phoneme positions are DURATION HEURISTIC ONLY, not forced alignment
            for pi,(phone,viseme) in enumerate(zip(phonemes,visemes)):
                start=a+(b-a)*pi/len(phonemes)
                end=a+(b-a)*(pi+1)/len(phonemes)
                steps.append({"start":round(start,3),"end":round(end,3),
                              "phone":phone,"viseme":viseme})
            words.append({"start":round(a,3),"end":round(b,3),
               "word":item.word.strip(),
               "whisper_prob":round(float(item.probability),3),
               "phonemes":" ".join(phonemes),"visemes":" ".join(visemes),
               "volume_rms":audio_rms(samples,samplerate,a,b),
               "viseme_steps":steps})
    txt="\n".join(f"[{s['start']:7.2f} – {s['end']:7.2f}] {s['text']}" for s in transcript)
    (OUTPUT/f"video_{index}_transcript.txt").write_text(txt,encoding="utf-8")
    try:
        motion=measure_faces(video,index)
        error=None
    except Exception as e:
        print(f"video {index} motion measurement error: {e}",flush=True)
        motion=[]
        error=str(e)
    keys=["mouth_inner_open","mouth_outer_open","mouth_width","lip_round_proxy",
        "jaw_to_nose","eye_open_left","eye_open_right","brow_eye_left",
        "brow_eye_right","brow_inner_gap","corner_asym_y"]
    times=[r["time"] for r in motion]
    detected=sum(row["face_found"] for row in motion)
    for word in words:
        for key in keys:
            word[key]=average_in_window(motion,times,word["start"],word["end"],key)
    write_csv(OUTPUT/f"video_{index}_word_mouth_alignment.csv",words,
        ["start","end","word","whisper_prob","phonemes","visemes",
        "volume_rms",*keys])
    write_csv(OUTPUT/f"video_{index}_facial_motion_3fps.csv",motion,
        ["time","face_found",*keys])
    animation=[{"start":w["start"],"end":w["end"],"word":w["word"],
        "phones_approximate":w["viseme_steps"],
        "mouth_open_measured":w["mouth_inner_open"],
        "mouth_width_measured":w["mouth_width"],
        "eye_left_measured":w["eye_open_left"],
        "eye_right_measured":w["eye_open_right"],
        "brow_left_measured":w["brow_eye_left"],
        "brow_right_measured":w["brow_eye_right"]} for w in words]
    (OUTPUT/f"video_{index}_animation_reference.json").write_text(
        json.dumps({"video_index":index,"word_timing_source":"faster_whisper base.en",
           "viseme_alignment":"Dictionary pronunciation spread uniformly within recognized word, not acoustically aligned",
           "motion_source":"Mediapipe FaceMesh 3 fps (measured where detected)",
           "events":animation},indent=2),encoding="utf-8")
    (OUTPUT/f"video_{index}_transcript_segments.json").write_text(json.dumps(transcript,indent=2),encoding="utf-8")
    stats={}
    for key in keys:
        values=[row.get(key) for row in motion if row.get(key) is not None]
        if values:
            stats[key]={"p10":round(float(np.percentile(values,10)),4),
                "p50":round(float(np.median(values)),4),
                "p90":round(float(np.percentile(values,90)),4)}
    summ={"video_index":index,"file":video.name,"duration_sec":round(duration,3),
        "transcribed_segments":len(transcript),"word_count":len(words),
        "facial_samples":len(motion),"face_detected_frames":detected,
        "face_coverage_fraction":round(detected/max(1,len(motion)),4),
        "motion_error":error,"measured_motion_quantiles":stats,
        "first_8_segments":transcript[:8]}
    summaries.append(summ)
    wav.unlink(missing_ok=True)
    print("SUMMARY",json.dumps({k:v for k,v in summ.items() if k!="measured_motion_quantiles"},indent=2),flush=True)
(OUTPUT/"summary.json").write_text(json.dumps(summaries,indent=2),encoding="utf-8")
(OUTPUT/"README.md").write_text("""# Cecil 1 video-to-speech facial study

Sources: two original MP4 videos in the private \`Dadsfiles\` release. No audio was exported or committed. The MP4 originals are not modified.

Generated for **each** video:
- \`video_N_transcript.txt\`: time-coded machine-transcribed speech.
- \`video_N_transcript_segments.json\`: same segment data with model confidence metadata.
- \`video_N_word_mouth_alignment.csv\`: recognized word start/end seconds and measured facial movement averaged across those word intervals.
- \`video_N_facial_motion_3fps.csv\`: sampled face features at 3 samples/second; \`face_found=0\` means no measurement.
- \`video_N_animation_reference.json\`: animation event reference combining speech-word timing, approximate phoneme-to-viseme guesses, and measured visual changes.
- \`summary.json\`: diagnostic coverage and metric percentiles.

## Accuracy and constraints
Word timestamps come from automatic recognition (faster-whisper base.en). They may have errors, omissions and false positives. **No transcription has yet been human-verified.**

Phoneme symbols are derived from a pronunciation dictionary; timings *inside each word* are evenly divided heuristic guides, NOT real measured sound-by-sound alignments. Actual accent and pronunciation can differ from the dictionary. This cannot certify lip-sync accuracy.

Facial metrics are direct 3fps face landmark measurements and may be imperfect because of occluding moustache, facial hair, camera angle and detection errors; values are unitless ratios, not finished morph weights. Face geometry, eye colors and rest pose from the approved Cecil 1 model remain authoritative.

**No source videos, model, head, rig or approved viewer were changed.** This is reference data for a safe working-copy animation pass and manual QA.
""",encoding="utf-8")
print("ALL FINISHED",flush=True)
