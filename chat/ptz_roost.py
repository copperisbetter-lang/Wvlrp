import os
import base64
import hashlib
import secrets
from datetime import datetime, timezone
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape
from threading import Lock

import requests

HOST = (os.environ.get("ROOST_ONVIF_HOST") or "").strip()
PORT = int(os.environ.get("ROOST_ONVIF_PORT", "80"))
USERNAME = (os.environ.get("ROOST_ONVIF_USERNAME") or os.environ.get("EASTBANK_ONVIF_USERNAME") or "admin").strip()
PASSWORD = os.environ.get("ROOST_ONVIF_PASSWORD") if os.environ.get("ROOST_ONVIF_PASSWORD") is not None else os.environ.get("EASTBANK_ONVIF_PASSWORD", "")
PROFILE_OVERRIDE = (os.environ.get("ROOST_ONVIF_PROFILE") or os.environ.get("EASTBANK_ONVIF_PROFILE") or "").strip()
PTZ_PATH_OVERRIDE = os.environ.get("ROOST_ONVIF_PTZ_PATH", "").strip()

SOAP = "http://www.w3.org/2003/05/soap-envelope"
MEDIA = "http://www.onvif.org/ver10/media/wsdl"
DEVICE = "http://www.onvif.org/ver10/device/wsdl"
PTZ = "http://www.onvif.org/ver20/ptz/wsdl"
TT = "http://www.onvif.org/ver10/schema"

_cached_profile = None
_cached_ptz_url = None
_http = requests.Session()
_http.headers.update({"Connection": "keep-alive"})
_camera_lock = Lock()

def configured():
    return bool(HOST and USERNAME)

def _security():
    nonce = secrets.token_bytes(16)
    created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    digest = hashlib.sha1(nonce + created.encode() + PASSWORD.encode()).digest()
    return f'''<wsse:Security s:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><wsse:UsernameToken><wsse:Username>{escape(USERNAME)}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">{base64.b64encode(digest).decode()}</wsse:Password><wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">{base64.b64encode(nonce).decode()}</wsse:Nonce><wsu:Created>{created}</wsu:Created></wsse:UsernameToken></wsse:Security>'''

def _post(url, body, timeout=5):
    envelope = f'''<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="{SOAP}" xmlns:tds="{DEVICE}" xmlns:trt="{MEDIA}" xmlns:tptz="{PTZ}" xmlns:tt="{TT}"><s:Header>{_security()}</s:Header><s:Body>{body}</s:Body></s:Envelope>'''
    r = _http.post(url, data=envelope.encode(), headers={"Content-Type": "application/soap+xml; charset=utf-8"}, timeout=timeout)
    if r.status_code >= 400:
        raise RuntimeError(f"Camera rejected ONVIF command ({r.status_code})")
    return r.text

def _device_url(): return f"http://{HOST}:{PORT}/onvif/Device"
def _media_url(): return f"http://{HOST}:{PORT}/onvif/Media"

def _discover_ptz_url():
    global _cached_ptz_url
    if _cached_ptz_url: return _cached_ptz_url
    if PTZ_PATH_OVERRIDE:
        _cached_ptz_url = PTZ_PATH_OVERRIDE if PTZ_PATH_OVERRIDE.startswith(("http://", "https://")) else f"http://{HOST}:{PORT}/{PTZ_PATH_OVERRIDE.lstrip('/')}"
        return _cached_ptz_url
    try:
        text = _post(_device_url(), '<tds:GetServices><tds:IncludeCapability>false</tds:IncludeCapability></tds:GetServices>')
        root = ET.fromstring(text)
        for service in root.iter():
            ns = xaddr = None
            for child in list(service):
                tag = child.tag.split('}')[-1]
                if tag == 'Namespace': ns = child.text
                elif tag == 'XAddr': xaddr = child.text
            if ns == PTZ and xaddr:
                path = '/' + xaddr.split('/', 3)[3] if '://' in xaddr and xaddr.count('/') >= 3 else '/onvif/PTZ'
                _cached_ptz_url = f"http://{HOST}:{PORT}{path}"
                return _cached_ptz_url
    except Exception:
        pass
    _cached_ptz_url = f"http://{HOST}:{PORT}/onvif/PTZ"
    return _cached_ptz_url

def _discover_profile():
    global _cached_profile
    if PROFILE_OVERRIDE: return PROFILE_OVERRIDE
    if _cached_profile: return _cached_profile
    text = _post(_media_url(), '<trt:GetProfiles/>')
    root = ET.fromstring(text)
    fallback = None
    for elem in root.iter():
        if elem.tag.split('}')[-1] != 'Profiles': continue
        token = elem.attrib.get('token') or elem.attrib.get('Token')
        if not token: continue
        if fallback is None: fallback = token
        if any(child.tag.split('}')[-1] == 'PTZConfiguration' for child in list(elem)):
            _cached_profile = token
            return token
    if fallback:
        _cached_profile = fallback
        return fallback
    raise RuntimeError("Camera returned no ONVIF media profile")

def _ptz(body):
    if not configured(): raise RuntimeError("Roost PTZ is not configured")
    return _post(_discover_ptz_url(), body)

def move(action):
    with _camera_lock:
        profile = _discover_profile()
        speeds = {"left": (-0.45, 0, 0), "right": (0.45, 0, 0), "up": (0, 0.45, 0), "down": (0, -0.45, 0), "zoom_in": (0, 0, 0.45), "zoom_out": (0, 0, -0.45)}
        if action == 'stop':
            try:
                return _ptz(f'<tptz:Stop><tptz:ProfileToken>{escape(profile)}</tptz:ProfileToken><tptz:PanTilt>true</tptz:PanTilt><tptz:Zoom>true</tptz:Zoom></tptz:Stop>')
            except Exception:
                return _ptz(f'<tptz:ContinuousMove><tptz:ProfileToken>{escape(profile)}</tptz:ProfileToken><tptz:Velocity><tt:PanTilt x="0" y="0"/><tt:Zoom x="0"/></tptz:Velocity></tptz:ContinuousMove>')
        if action not in speeds: raise ValueError("Unknown PTZ action")
        x, y, z = speeds[action]
        velocity = ''
        if x or y: velocity += f'<tt:PanTilt x="{x}" y="{y}"/>'
        if z: velocity += f'<tt:Zoom x="{z}"/>'
        return _ptz(f'<tptz:ContinuousMove><tptz:ProfileToken>{escape(profile)}</tptz:ProfileToken><tptz:Velocity>{velocity}</tptz:Velocity></tptz:ContinuousMove>')
