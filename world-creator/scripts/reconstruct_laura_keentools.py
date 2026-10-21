"""KeenTools Cloud Laura 2 reconstruction. Run only with consent and an API key.
Never commit reference photographs, keys, or generated identifiable head meshes to a public repository.
Usage: KEENTOOLS_API_KEY=... python reconstruct_laura_keentools.py --photos /private/a.jpg /private/b.jpg /private/c.jpg --out /private/laura2-head.zip
"""
import argparse, json, os, time, urllib.request, urllib.parse
from pathlib import Path

BASE="https://api.keenface.ai/v1"
def request(url, method="GET", data=None, token=None, content_type="application/json"):
    headers={"Content-Type":content_type}
    if token: headers["Authorization"]="Bearer "+token
    payload=json.dumps(data).encode() if isinstance(data,dict) else data
    req=urllib.request.Request(url,data=payload,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=120) as resp:return resp.read()
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--photos",nargs="+",type=Path,required=True)
    ap.add_argument("--out",type=Path,required=True)
    ap.add_argument("--wait-seconds",type=int,default=600)
    ap.add_argument("--allow-paid-download",action="store_true",help="Explicit consent for a billable model download")
    args=ap.parse_args()
    if len(args.photos)<2:ap.error("KeenTools requires at least two distinct photos; 3+ recommended")
    if not all(p.is_file() for p in args.photos):ap.error("Missing reference photograph")
    token=os.environ.get("KEENTOOLS_API_KEY")
    if not token:ap.error("Set KEENTOOLS_API_KEY in a private environment")
    if not args.allow_paid_download:ap.error("Pass --allow-paid-download to authorize the provider's billable model retrieval")
    init=json.loads(request(BASE+"/avatar/init","POST",{"image_count":len(args.photos)},token))
    avatar_id=init.get("avatar_id") or init.get("id")
    urls=init.get("upload_urls")
    if not avatar_id or not urls or len(urls)!=len(args.photos):
        raise RuntimeError("Unexpected init response; inspect provider schema before continuing")
    for photo,url in zip(args.photos,urls):
        suffix=photo.suffix.lower()
        mime="image/png" if suffix==".png" else "image/webp" if suffix==".webp" else "image/jpeg"
        request(url,"PUT",photo.read_bytes(),content_type=mime)
    request(BASE+"/avatar/"+urllib.parse.quote(str(avatar_id),safe="")+"/process","POST",{"focal_length_type":{"focal_length_type":"estimate_common"}},token)
    deadline=time.monotonic()+args.wait_seconds
    while time.monotonic()<deadline:
        status=json.loads(request(BASE+"/avatar/"+urllib.parse.quote(str(avatar_id),safe="")+"/get-status",token=token))
        state=status.get("status")
        if state=="completed":break
        if state in ("failed","error"):raise RuntimeError("KeenTools reconstruction failed: "+str(status))
        time.sleep(15)
    else:raise TimeoutError("Reconstruction timed out; avoid repeat paid downloads")
    url=BASE+"/avatar/"+urllib.parse.quote(str(avatar_id),safe="")+"/get-3d-model?mesh_format=obj&texture=jpg"
    output=request(url,token=token)
    if not output.startswith(b"PK"):raise RuntimeError("Expected OBJ ZIP; refusing invalid output")
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_bytes(output)
    print("LAURA_HEAD_ZIP_READY",str(args.out),"bytes",len(output))
if __name__=="__main__":main()
