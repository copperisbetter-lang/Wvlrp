from typing import Optional
from fastapi import Header, HTTPException
from pydantic import BaseModel, Field

from server import app, current_user, access_flags
from ptz import move, configured


class PTZCommand(BaseModel):
    action: str = Field(pattern="^(left|right|up|down|zoom_in|zoom_out|stop)$")


def require_ptz(user):
    if not access_flags(user)["ptz_access"]:
        raise HTTPException(403, "PTZ access required")


@app.get("/api/ptz/east-bank/status")
def east_bank_ptz_status(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    require_ptz(user)
    return {"ok": True, "camera": "east-bank", "configured": configured()}


@app.post("/api/ptz/east-bank/command")
def east_bank_ptz_command(data: PTZCommand, authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    require_ptz(user)
    if not configured():
        raise HTTPException(503, "East Bank PTZ is not configured")
    try:
        move(data.action)
    except ValueError:
        raise HTTPException(400, "Unknown PTZ action")
    except Exception:
        raise HTTPException(502, "East Bank camera did not accept the PTZ command")
    return {"ok": True, "camera": "east-bank", "action": data.action}
