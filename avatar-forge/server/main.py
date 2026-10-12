"""The Wild Avatar Forge processing API.
Run on a GPU host with: pip install -r requirements.txt
Set FORGE_TOKEN and FORGE_WORKDIR. No photo is uploaded to WVLRP web hosting.
A reconstruction worker must be configured separately; no fake model generation.
"""
from __future__ import annotations
import os, uuid, json, shutil, subprocess, shlex, struct, threading
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT=Path(os.environ.get("FORGE_WORKDIR","/tmp/wild-avatar-forge")).resolve()
ROOT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("FORGE_TOKEN")
MAX_IMAGE=12*1024*1024
app=FastAPI(title="The Wild Avatar Forge",version="0.3.0")
app.add_middleware(CORSMiddleware,allow_origins=["https://wvlrp.com","https://www.wvlrp.com"],allow_credentials=False,allow_methods=["GET","POST","DELETE"],allow_headers=["Authorization","Content-Type"])
VALID_VIEWS={"front","back","left","right","face"}
JOBS={}
for state_file in ROOT.glob("*/state.json"):
    try:
        saved=json.loads(state_file.read_text())
        if saved["state"]=="processing":saved={"state":"interrupted","message":"Server restarted during processing; resubmit job"}
        JOBS[state_file.parent.name]={**saved,"folder":str(state_file.parent)}
    except (OSError,ValueError,KeyError):pass
def save_state(jid,state,message):
    job=JOBS.get(jid)
    if job is None:return
    job.update(state=state,message=message)
    (ROOT/jid/"state.json").write_text(json.dumps({"state":state,"message":message}))
def run_worker(jid):
    folder=ROOT/jid
    command=os.environ.get("FORGE_WORKER_COMMAND","").strip()
    if not command:return
    save_state(jid,"processing","Reconstruction worker running")
    try:
        result=subprocess.run(shlex.split(command)+[str(folder)],cwd=str(folder),
                              capture_output=True,text=True,timeout=3600,check=False)
        if result.returncode:raise RuntimeError((result.stderr or result.stdout or "Worker failed")[-500:])
        path=folder/"avatar.glb"
        if not path.is_file() or path.stat().st_size<20:raise ValueError("Worker did not create a GLB")
        with path.open("rb") as stream:
            magic,version,length=struct.unpack("<III",stream.read(12))
        if magic!=0x46546c67 or version!=2 or length!=path.stat().st_size:
            raise ValueError("Invalid GLB 2.0 header")
        save_state(jid,"completed","GLB created; anatomical and animation quality unverified")
    except Exception as exc:
        (folder/"avatar.glb").unlink(missing_ok=True)
        save_state(jid,"failed",str(exc)[:500])

class JobInfo(BaseModel):
    id:str
    state:str
    message:str
    download_ready:bool=False

def authorize(authorization:str|None):
    if not TOKEN or authorization != "Bearer "+TOKEN:
        raise HTTPException(401,"Avatar Forge access token required")

async def store_image(upload:UploadFile,destination:Path):
    if upload.content_type not in {"image/jpeg","image/png","image/webp"}:
        raise HTTPException(415,"JPEG, PNG or WebP images only")
    data=await upload.read(MAX_IMAGE+1)
    if not data or len(data)>MAX_IMAGE:
        raise HTTPException(413,"Image missing or exceeds 12 MB")
    # Reject non-image payloads before storing.
    from PIL import Image
    from io import BytesIO
    try:
        im=Image.open(BytesIO(data));im.verify()
    except Exception:
        raise HTTPException(422,"Invalid image")
    destination.write_bytes(data)

@app.get("/health")
def health():
    return {"service":"wild-avatar-forge","status":"ready","worker_configured":bool(os.environ.get("FORGE_WORKER_COMMAND"))}

@app.post("/jobs",response_model=JobInfo)
async def create_job(front:UploadFile=File(...),back:UploadFile=File(...),
                     left:UploadFile=File(...),right:UploadFile=File(...),
                     face:UploadFile=File(...),name:str=Form("New avatar"),
                     description:str=Form(""),authorization:str|None=Header(None)):
    authorize(authorization)
    if len(name)>80 or len(description)>5000:raise HTTPException(422,"Text too long")
    jid=uuid.uuid4().hex
    folder=ROOT/jid;folder.mkdir(mode=0o700)
    try:
        for view,upload in zip(("front","back","left","right","face"),(front,back,left,right,face)):
            await store_image(upload,folder/(view+".png"))
    except Exception:
        shutil.rmtree(folder,ignore_errors=True)
        raise
    (folder/"manifest.json").write_text(json.dumps({"name":name,"description":description,"views":sorted(VALID_VIEWS)}))
    JOBS[jid]={"state":"awaiting_worker","message":"Photos staged; GPU worker not configured","folder":str(folder)}
    save_state(jid,"awaiting_worker","Photos staged; GPU worker not configured")
    if os.environ.get("FORGE_WORKER_COMMAND","").strip():
        threading.Thread(target=run_worker,args=(jid,),daemon=True).start()
    return JobInfo(id=jid,state=JOBS[jid]["state"],message=JOBS[jid]["message"])

@app.get("/jobs/{jid}",response_model=JobInfo)
def job_status(jid:str,authorization:str|None=Header(None)):
    authorize(authorization)
    if jid not in JOBS:raise HTTPException(404,"Unknown job")
    j=JOBS[jid]
    return JobInfo(id=jid,state=j["state"],message=j["message"],download_ready=(ROOT/jid/"avatar.glb").exists())

@app.get("/jobs/{jid}/download")
def download(jid:str,authorization:str|None=Header(None)):
    authorize(authorization)
    if jid not in JOBS:raise HTTPException(404,"Unknown job")
    file=ROOT/jid/"avatar.glb"
    if not file.exists():raise HTTPException(409,"No generated GLB exists yet")
    return FileResponse(file,media_type="model/gltf-binary",filename=f"wild-{jid}.glb")

@app.delete("/jobs/{jid}")
def delete_job(jid:str,authorization:str|None=Header(None)):
    authorize(authorization)
    if jid not in JOBS:raise HTTPException(404,"Unknown job")
    if JOBS[jid]["state"]=="processing":raise HTTPException(409,"Worker still processing")
    shutil.rmtree(ROOT/jid,ignore_errors=True);JOBS.pop(jid,None)
    return {"deleted":True}
