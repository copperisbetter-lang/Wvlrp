"""The Wild Avatar Forge processing API.
Run on a GPU host with: pip install -r requirements.txt
Set FORGE_TOKEN and FORGE_WORKDIR. No photo is uploaded to WVLRP web hosting.
A reconstruction worker must be configured separately; no fake model generation.
"""
from __future__ import annotations
import os, uuid, json, shutil, subprocess, zipfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

ROOT=Path(os.environ.get("FORGE_WORKDIR","/tmp/wild-avatar-forge")).resolve()
ROOT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("FORGE_TOKEN")
MAX_IMAGE=12*1024*1024
app=FastAPI(title="The Wild Avatar Forge",version="0.2.0")
VALID_VIEWS={"front","back","left","right","face"}
JOBS={}
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
    JOBS[jid]={"state":"awaiting_worker","message":"Photos validated and staged. GPU reconstruction worker not configured.","folder":str(folder)}
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
    shutil.rmtree(ROOT/jid,ignore_errors=True);JOBS.pop(jid,None)
    return {"deleted":True}
