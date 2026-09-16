import os
import base64
import hashlib
import secrets
from datetime import datetime, timezone
from xml.sax.saxutils import escape

import requests

HOST = os.environ.get("EASTBANK_ONVIF_HOST", "").strip()
PORT = int(os.environ.get("EASTBANK_ONVIF_PORT", "80"))
USERNAME = os.environ.get("EASTBANK_ONVIF_USERNAME", "admin")
PASSWORD = os.environ.get("EASTBANK_ONVIF_PASSWORD", "")
PROFILE = os.environ.get("EASTBANK_ONVIF_PROFILE", "Profile_1")


def configured():
    return bool(HOST and USERNAME)


def _security():
    nonce = secrets.token_bytes(16)
    created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    digest = hashlib.sha1(nonce + created.encode() + PASSWORD.encode()).digest()
    return f'''<wsse:Security s:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><wsse:UsernameToken><wsse:Username>{escape(USERNAME)}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">{base64.b64encode(digest).decode()}</wsse:Password><wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">{base64.b64encode(nonce).decode()}</wsse:Nonce><wsu:Created>{created}</wsu:Created></wsse:UsernameToken></wsse:Security>'''


def _soap(body):
    if not configured():
        raise RuntimeError("East Bank PTZ is not configured")
    envelope = f'''<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema"><s:Header>{_security()}</s:Header><s:Body>{body}</s:Body></s:Envelope>'''
    url = f"http://{HOST}:{PORT}/onvif/PTZ"
    r = requests.post(url, data=envelope.encode(), headers={"Content-Type":"application/soap+xml; charset=utf-8"}, timeout=4)
    if r.status_code >= 400:
        raise RuntimeError("Camera rejected PTZ command")
    return True


def move(action):
    speeds = {
        "left": (-0.45, 0, 0), "right": (0.45, 0, 0),
        "up": (0, 0.45, 0), "down": (0, -0.45, 0),
        "zoom_in": (0, 0, 0.45), "zoom_out": (0, 0, -0.45),
    }
    if action == "stop":
        return _soap(f'<tptz:Stop><tptz:ProfileToken>{escape(PROFILE)}</tptz:ProfileToken><tptz:PanTilt>true</tptz:PanTilt><tptz:Zoom>true</tptz:Zoom></tptz:Stop>')
    if action not in speeds:
        raise ValueError("Unknown PTZ action")
    x, y, z = speeds[action]
    velocity = ''
    if x or y:
        velocity += f'<tt:PanTilt x="{x}" y="{y}"/>'
    if z:
        velocity += f'<tt:Zoom x="{z}"/>'
    return _soap(f'<tptz:ContinuousMove><tptz:ProfileToken>{escape(PROFILE)}</tptz:ProfileToken><tptz:Velocity>{velocity}</tptz:Velocity></tptz:ContinuousMove>')
