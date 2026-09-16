import os, json, time, hmac, hashlib, base64
from typing import Optional

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ptz import move, configured\nfrom ptz_roost import move as move_roost, configured as roost_configured

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SECRET_KEY = os.environ.get("CHAT_SECRET_KEY", "change-me").encode()

app = FastAPI(title="WVLRP East Bank PTZ Relay")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wvlrp.com",
        "https://www.wvlrp.com",
        "https://copperisbetter-lang.github.io",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def parse_token(token: str) -> dict:
    try:
        body, sig = token.split(".", 1)
        expected = b64e(hmac.new(SECRET_KEY, body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError()
        payload = json.loads(b64d(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError()
        return payload
    except Exception:
        raise HTTPException(401, "Invalid or expired login")


def current_user(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Login required")
    if not DATABASE_URL:
        raise HTTPException(503, "PTZ authorization database is unavailable")
    payload = parse_token(authorization.split(" ", 1)[1].strip())
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id,role,support_level,support_amount_cents,disabled FROM chat_users WHERE id=%s",
            (payload["uid"],),
        )
        user = cur.fetchone()
        cur.execute("SELECT value FROM site_settings WHERE key='ptz_sponsor_min_cents'")
        row = cur.fetchone()
    if not user or user["disabled"]:
        raise HTTPException(401, "Account unavailable")
    threshold = None
    if row and row["value"] not in (None, ""):
        try:
            threshold = max(0, int(row["value"]))
        except Exception:
            threshold = None
    is_admin = user["role"] in {"admin", "super"}
    allowed = is_admin or (
        user["support_level"] == "sponsor"
        and threshold is not None
        and int(user["support_amount_cents"] or 0) >= threshold
    )
    if not allowed:
        raise HTTPException(403, "PTZ access required")
    return user


class PTZCommand(BaseModel):
    action: str = Field(pattern="^(left|right|up|down|zoom_in|zoom_out|stop)$")


@app.get("/health")
def health():
    return {"ok": True, "service": "east-bank-ptz-relay", "configured": configured(), "roost_configured": roost_configured()}


@app.get("/api/ptz/east-bank/status")
def status(authorization: Optional[str] = Header(default=None)):
    current_user(authorization)
    return {"ok": True, "camera": "east-bank", "configured": configured()}


@app.post("/api/ptz/east-bank/command")
def command(data: PTZCommand, authorization: Optional[str] = Header(default=None)):
    current_user(authorization)
    if not configured():
        raise HTTPException(503, "East Bank PTZ is not configured")
    try:
        move(data.action)
    except ValueError:
        raise HTTPException(400, "Unknown PTZ action")
    except Exception:
        raise HTTPException(502, "East Bank camera did not accept the PTZ command")
    return {"ok": True, "camera": "east-bank", "action": data.action}


@app.get("/api/ptz/roost/status")
def roost_status(authorization: Optional[str] = Header(default=None)):
    current_user(authorization)
    return {"ok": True, "camera": "roost", "configured": roost_configured()}


@app.post("/api/ptz/roost/command")
def roost_command(data: PTZCommand, authorization: Optional[str] = Header(default=None)):
    current_user(authorization)
    if not roost_configured():
        raise HTTPException(503, "Roost PTZ is not configured")
    try:
        move_roost(data.action)
    except ValueError:
        raise HTTPException(400, "Unknown PTZ action")
    except Exception:
        raise HTTPException(502, "Roost camera did not accept the PTZ command")
    return {"ok": True, "camera": "roost", "action": data.action}
