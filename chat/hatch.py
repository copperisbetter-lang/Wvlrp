import os, re, random
from typing import Optional
from fastapi import Header, HTTPException
from pydantic import BaseModel, Field
from server import app, db, current_user, validate_room

PTZ_ROOMS={"eastbank","roost"}
SPECIES={
"deer":"White-tailed deer are common across West Virginia. Watch for the tail flag, large ears, and a reddish-brown to gray coat.",
"raccoon":"Raccoons are mostly nocturnal, with a black facial mask and ringed tail. They often investigate feeders and water.",
"opossum":"Virginia opossums are nocturnal scavengers with pale faces, dark ears, and long mostly hairless tails.",
"fox":"Red and gray foxes both occur in West Virginia. Red foxes usually show a white tail tip; gray foxes often have a dark stripe along the tail.",
"coyote":"Coyotes are lean, long-legged canids with pointed ears and a bushy tail usually carried low.",
"bobcat":"Bobcats are secretive cats with a short 'bobbed' tail, spotted coat, and ear tufts that may be visible at close range.",
"turkey":"Wild turkeys are large ground birds. Males are darker and may show a beard and bright head colors.",
"owl":"Several owl species occur in West Virginia. A clear photo or 10–15 seconds of audio helps narrow the identification.",
"chicken":"The Roost is home to WVLRP's chickens. Individual birds can vary a lot in plumage, comb shape, and behavior."
}
class HatchAsk(BaseModel):
    room:str
    text:str=Field(min_length=1,max_length=500)
    audio_seconds:int=Field(default=0,ge=0,le=15)
class SightingIn(BaseModel):
    room:str
    label:str=Field(default="Wildlife sighting",max_length=80)
    note:str=Field(default="",max_length=300)
class CameraRequestIn(BaseModel):
    room:str
    request:str=Field(min_length=3,max_length=240)
    duration_seconds:int=Field(default=60,ge=30,le=180)

def init_hatch_db():
    with db() as conn, conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS hatch_sightings(
          id BIGSERIAL PRIMARY KEY,user_id BIGINT REFERENCES chat_users(id) ON DELETE SET NULL,
          room TEXT NOT NULL,label TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
        cur.execute("""CREATE TABLE IF NOT EXISTS hatch_camera_requests(
          id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
          room TEXT NOT NULL,request TEXT NOT NULL,duration_seconds INT NOT NULL DEFAULT 60,
          status TEXT NOT NULL DEFAULT 'queued',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          handled_at TIMESTAMPTZ)""")
@app.on_event("startup")
def startup_hatch(): init_hatch_db()

def hatch_reply(text,room,audio_seconds):
    q=text.lower()
    if "what animal" in q and ("sound" in q or "hear" in q):
        return {"reply":"I’m listening. I’ll use up to 15 seconds of the camera audio when the live audio bridge is available; human speech is excluded from wildlife identification.","mode":"audio","listen_seconds":min(15,audio_seconds or 15),"confidence":None}
    for key,answer in SPECIES.items():
        if re.search(r"\b"+re.escape(key)+r"s?\b",q):
            return {"reply":answer,"mode":"species","species":key,"confidence":0.72}
    if any(x in q for x in ("game","quiz","trivia")):
        quiz=random.choice([
          ("Which West Virginia visitor is famous for a ringed tail?","raccoon"),
          ("Which common WV deer flashes a white tail when alarmed?","white-tailed deer"),
          ("Which native marsupial may visit at night?","Virginia opossum")])
        return {"reply":quiz[0],"mode":"game","answer":quiz[1]}
    return {"reply":"I’m Hatch, WVLRP’s wildlife ranger. Ask me about an animal, a sound, a sighting, or what’s happening around the cameras.","mode":"help","confidence":None}

@app.post("/api/hatch/ask")
def hatch_ask(data:HatchAsk,authorization:Optional[str]=Header(default=None)):
    user=current_user(authorization); room=validate_room(data.room)
    return {"room":room,"user":user["username"],**hatch_reply(data.text,room,data.audio_seconds)}

@app.post("/api/hatch/sighting")
def hatch_sighting(data:SightingIn,authorization:Optional[str]=Header(default=None)):
    user=current_user(authorization); room=validate_room(data.room)
    with db() as conn, conn.cursor() as cur:
        cur.execute("INSERT INTO hatch_sightings(user_id,room,label,note) VALUES(%s,%s,%s,%s) RETURNING id,created_at",(user["id"],room,data.label.strip(),data.note.strip()))
        row=cur.fetchone()
    return {"ok":True,"id":row["id"],"created_at":row["created_at"],"message":"Sighting saved for Hatch."}

@app.post("/api/hatch/camera-request")
def hatch_camera_request(data:CameraRequestIn,authorization:Optional[str]=Header(default=None)):
    user=current_user(authorization); room=validate_room(data.room)
    if room not in PTZ_ROOMS: raise HTTPException(400,"Hatch camera moves are not available in this room")
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT created_at FROM hatch_camera_requests WHERE user_id=%s ORDER BY id DESC LIMIT 1",(user["id"],))
        last=cur.fetchone()
        if last and (last["created_at"].timestamp()+180)>__import__("time").time(): raise HTTPException(429,"Please wait a few minutes before another Hatch camera request")
        cur.execute("INSERT INTO hatch_camera_requests(user_id,room,request,duration_seconds) VALUES(%s,%s,%s,%s) RETURNING id",(user["id"],room,data.request.strip(),data.duration_seconds))
        rid=cur.fetchone()["id"]
    return {"ok":True,"request_id":rid,"status":"queued","message":"Request sent to Hatch. Hatch—not the viewer—controls the camera, and it returns to its normal position afterward."}

@app.get("/api/hatch/stats")
def hatch_stats(authorization:Optional[str]=Header(default=None)):
    current_user(authorization)
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT room,label,COUNT(*) AS count FROM hatch_sightings GROUP BY room,label ORDER BY count DESC LIMIT 12")
        rows=cur.fetchall()
    return {"sightings":rows}
