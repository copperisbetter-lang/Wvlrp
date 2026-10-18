"""Measure normalized facial landmark ratios from a locally supplied front-facing image.

Usage:
  python world-creator/scripts/sav4_face_landmarks.py marybeth-front.jpg --output marybeth-ratios.json

Requires: pip install mediapipe opencv-python
This measures image-space ratios, NOT exact physical dimensions or a 3D scan.
Use only a clearly identified, near-frontal reference image with permission to use it.
Do not silently feed inferred ratios into the SAV4 builder before manual validation.
"""
import argparse, json
from pathlib import Path

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--output",default="marybeth-ratios.json")
    args=parser.parse_args()
    import cv2
    import mediapipe as mp
    frame=cv2.imread(args.image)
    if frame is None: raise SystemExit("Cannot read reference image")
    rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True,max_num_faces=1,refine_landmarks=True) as detector:
        result=detector.process(rgb)
    if not result.multi_face_landmarks: raise SystemExit("No face found; choose a clearer frontal frame")
    points=result.multi_face_landmarks[0].landmark
    def distance(a,b):
        p,q=points[a],points[b]
        return ((p.x-q.x)**2+(p.y-q.y)**2)**0.5
    width=distance(234,454)
    if width<=0: raise SystemExit("Invalid face width")
    ratios={
        "face_height_over_width":distance(10,152)/width,
        "eye_corner_spacing_over_width":distance(33,263)/width,
        "left_eye_width_over_width":distance(33,133)/width,
        "right_eye_width_over_width":distance(362,263)/width,
        "nose_width_over_width":distance(98,327)/width,
        "mouth_width_over_width":distance(61,291)/width,
        "nose_to_mouth_over_width":distance(2,13)/width,
        "mouth_to_chin_over_width":distance(13,152)/width
    }
    report={"source":str(Path(args.image).name),"method":"MediaPipe 2D image landmark ratios","units":"dimensionless","not_a_3d_scan":True,"ratios":ratios}
    Path(args.output).write_text(json.dumps(report,indent=2)+"\\n")
    print(json.dumps(report,indent=2))
if __name__=="__main__":main()
