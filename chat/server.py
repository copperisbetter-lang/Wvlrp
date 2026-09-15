import os, json, time, hmac, hashlib, secrets, base64
from typing import Optional

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SECRET_KEY = os.environ.get("CHAT_SECRET_KEY", "change-me").encode()
ADMIN_USERNAME = os.environ.get("CHAT_ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.environ.get("CHAT_ADMIN_PASSWORD", "")
ALLOWED_ROOMS = {"eastbank", "roost", "supporters"}
TOKEN_TTL = 60 * 60 * 24 * 30

app = FastAPI(title="WVLRP Accounts & Chat")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wvlrp.com",
        "https://www.wvlrp.com",
        "https://copperisbetter-lang.github.io",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True)


def b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${b64e(salt)}${b64e(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        kind, salt_s, digest_s = stored.split("$", 2)
        if kind != "scrypt":
            return False
        salt = b64d(salt_s)
        expected = b64d(digest_s)
        actual = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def make_token(user: dict) -> str:
    payload = {"uid": user["id"], "exp": int(time.time()) + TOKEN_TTL}
    body = b64e(json.dumps(payload, separators=(",", ":")).encode())
    sig = b64e(hmac.new(SECRET_KEY, body.encode(), hashlib.sha256).digest())
    return f"{body}.{sig}"


def parse_token(token: str) -> dict:
    try:
        body, sig = token.split(".", 1)
        good = b64e(hmac.new(SECRET_KEY, body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            raise ValueError()
        payload = json.loads(b64d(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError()
        return payload
    except Exception:
        raise HTTPException(401, "Invalid or expired login")


def token_from_header(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Login required")
    return authorization.split(" ", 1)[1].strip()


def ptz_threshold_cents() -> Optional[int]:
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT value FROM site_settings WHERE key='ptz_sponsor_min_cents'")
        row = cur.fetchone()
    if not row or row["value"] in (None, ""):
        return None
    try:
        return max(0, int(row["value"]))
    except Exception:
        return None


def access_flags(user: dict) -> dict:
    level = user.get("support_level") or "none"
    amount = int(user.get("support_amount_cents") or 0)
    is_admin = user.get("role") == "admin"
    lounge = is_admin or level in {"donor", "sponsor"}
    threshold = ptz_threshold_cents()
    ptz = is_admin or (level == "sponsor" and threshold is not None and amount >= threshold)
    return {"lounge_access": lounge, "ptz_access": ptz, "ptz_sponsor_min_cents": threshold}


def public_user(user: dict) -> dict:
    flags = access_flags(user)
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "support_level": user.get("support_level") or "none",
        "support_amount_cents": int(user.get("support_amount_cents") or 0),
        **flags,
    }


def current_user(authorization: Optional[str]) -> dict:
    payload = parse_token(token_from_header(authorization))
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT id,username,role,support_level,support_amount_cents,disabled FROM chat_users WHERE id=%s", (payload["uid"],))
        user = cur.fetchone()
    if not user or user["disabled"]:
        raise HTTPException(401, "Account unavailable")
    return user


def require_admin(user: dict):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")


def require_lounge(user: dict):
    if not access_flags(user)["lounge_access"]:
        raise HTTPException(403, "Donor or sponsor access required")


def validate_room(room: str) -> str:
    room = room.strip().lower()
    if room not in ALLOWED_ROOMS:
        raise HTTPException(400, "Unknown chat room")
    return room


def is_banned(user_id: int, room: str) -> bool:
    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT 1 FROM chat_bans
            WHERE user_id=%s AND active=TRUE AND (room IS NULL OR room=%s)
            LIMIT 1
        """, (user_id, room))
        return cur.fetchone() is not None


def init_db():
    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_users (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                support_level TEXT NOT NULL DEFAULT 'none',
                support_amount_cents BIGINT NOT NULL DEFAULT 0,
                disabled BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS support_level TEXT NOT NULL DEFAULT 'none'")
        cur.execute("ALTER TABLE chat_users ADD COLUMN IF NOT EXISTS support_amount_cents BIGINT NOT NULL DEFAULT 0")
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS chat_users_username_lower_uq ON chat_users ((lower(username)))")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id BIGSERIAL PRIMARY KEY,
                room TEXT NOT NULL,
                user_id BIGINT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted BOOLEAN NOT NULL DEFAULT FALSE,
                deleted_by BIGINT REFERENCES chat_users(id)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS chat_messages_room_id_idx ON chat_messages(room, id DESC)")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_bans (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
                room TEXT,
                reason TEXT NOT NULL DEFAULT '',
                created_by BIGINT NOT NULL REFERENCES chat_users(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                active BOOLEAN NOT NULL DEFAULT TRUE
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS chat_bans_user_idx ON chat_bans(user_id, active)")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_audit (
                id BIGSERIAL PRIMARY KEY,
                admin_id BIGINT NOT NULL REFERENCES chat_users(id),
                action TEXT NOT NULL,
                target_user_id BIGINT REFERENCES chat_users(id),
                room TEXT,
                details TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS site_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        if ADMIN_USERNAME and ADMIN_PASSWORD:
            cur.execute("SELECT id FROM chat_users WHERE lower(username)=lower(%s)", (ADMIN_USERNAME,))
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO chat_users(username,password_hash,role) VALUES(%s,%s,'admin')",
                    (ADMIN_USERNAME, hash_password(ADMIN_PASSWORD)),
                )


@app.on_event("startup")
def startup():
    init_db()


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    password: str = Field(min_length=8, max_length=128)

class LoginIn(BaseModel):
    username: str
    password: str

class MessageIn(BaseModel):
    room: str
    body: str = Field(min_length=1, max_length=500)

class BanIn(BaseModel):
    user_id: int
    room: Optional[str] = None
    reason: str = Field(default="", max_length=200)

class PasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=128)

class SupportIn(BaseModel):
    user_id: int
    support_level: str = Field(pattern="^(none|donor|sponsor)$")
    support_amount_cents: int = Field(default=0, ge=0)

class ThresholdIn(BaseModel):
    ptz_sponsor_min_cents: Optional[int] = Field(default=None, ge=0)


@app.get("/health")
def health():
    return {"ok": True, "service": "wvlrp-accounts-chat"}


@app.post("/api/register")
def register(data: RegisterIn):
    username = data.username.strip()
    if not username.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(400, "Username may contain letters, numbers, hyphens, and underscores")
    with db() as conn, conn.cursor() as cur:
        try:
            cur.execute(
                "INSERT INTO chat_users(username,password_hash) VALUES(%s,%s) RETURNING id,username,role,support_level,support_amount_cents,disabled",
                (username, hash_password(data.password)),
            )
            user = cur.fetchone()
        except psycopg.errors.UniqueViolation:
            raise HTTPException(409, "That username is already taken")
    return {"token": make_token(user), "user": public_user(user)}


@app.post("/api/login")
def login(data: LoginIn):
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT id,username,password_hash,role,support_level,support_amount_cents,disabled FROM chat_users WHERE lower(username)=lower(%s)", (data.username.strip(),))
        user = cur.fetchone()
    if not user or user["disabled"] or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid username or password")
    return {"token": make_token(user), "user": public_user(user)}


@app.get("/api/me")
def me(authorization: Optional[str] = Header(default=None)):
    return public_user(current_user(authorization))


@app.get("/api/lounge/access")
def lounge_access(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    require_lounge(user)
    return public_user(user)


@app.get("/api/ptz/access")
def ptz_access(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    info = public_user(user)
    if not info["ptz_access"]:
        raise HTTPException(403, "Sponsor PTZ threshold has not been met")
    return info


@app.post("/api/change-password")
def change_password(data: PasswordIn, authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT password_hash FROM chat_users WHERE id=%s", (user["id"],))
        row = cur.fetchone()
        if not row or not verify_password(data.current_password, row["password_hash"]):
            raise HTTPException(401, "Current password is incorrect")
        cur.execute("UPDATE chat_users SET password_hash=%s WHERE id=%s", (hash_password(data.new_password), user["id"]))
    return {"ok": True}


@app.get("/api/messages")
def messages(room: str = Query(...), after: int = Query(default=0, ge=0), authorization: Optional[str] = Header(default=None)):
    room = validate_room(room)
    user = current_user(authorization)
    if room == "supporters":
        require_lounge(user)
    if is_banned(user["id"], room):
        raise HTTPException(403, "You are blocked from this chat room")
    with db() as conn, conn.cursor() as cur:
        if after:
            cur.execute("""
                SELECT m.id,m.body,m.created_at,u.id AS user_id,u.username,u.role,u.support_level
                FROM chat_messages m JOIN chat_users u ON u.id=m.user_id
                WHERE m.room=%s AND m.deleted=FALSE AND m.id>%s
                ORDER BY m.id ASC LIMIT 100
            """, (room, after))
        else:
            cur.execute("""
                SELECT * FROM (
                    SELECT m.id,m.body,m.created_at,u.id AS user_id,u.username,u.role,u.support_level
                    FROM chat_messages m JOIN chat_users u ON u.id=m.user_id
                    WHERE m.room=%s AND m.deleted=FALSE
                    ORDER BY m.id DESC LIMIT 80
                ) q ORDER BY id ASC
            """, (room,))
        rows = cur.fetchall()
    return {"room": room, "messages": rows}


@app.post("/api/messages")
def send_message(data: MessageIn, authorization: Optional[str] = Header(default=None)):
    room = validate_room(data.room)
    user = current_user(authorization)
    if room == "supporters":
        require_lounge(user)
    if is_banned(user["id"], room):
        raise HTTPException(403, "You are blocked from this chat room")
    body = " ".join(data.body.strip().split())
    if not body:
        raise HTTPException(400, "Message is empty")
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT created_at FROM chat_messages WHERE user_id=%s ORDER BY id DESC LIMIT 1", (user["id"],))
        last = cur.fetchone()
        if last and (time.time() - last["created_at"].timestamp()) < 1.2:
            raise HTTPException(429, "Please slow down")
        cur.execute("""
            INSERT INTO chat_messages(room,user_id,body)
            VALUES(%s,%s,%s)
            RETURNING id,body,created_at
        """, (room, user["id"], body))
        msg = cur.fetchone()
    return {"id": msg["id"], "body": msg["body"], "created_at": msg["created_at"], "user_id": user["id"], "username": user["username"], "role": user["role"], "support_level": user.get("support_level", "none")}


@app.get("/api/admin/users")
def admin_users(q: str = Query(default="", max_length=40), authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    with db() as conn, conn.cursor() as cur:
        if q:
            cur.execute("SELECT id,username,role,support_level,support_amount_cents,disabled,created_at FROM chat_users WHERE lower(username) LIKE lower(%s) ORDER BY id DESC LIMIT 50", (f"%{q}%",))
        else:
            cur.execute("SELECT id,username,role,support_level,support_amount_cents,disabled,created_at FROM chat_users ORDER BY id DESC LIMIT 50")
        return {"users": cur.fetchall(), "ptz_sponsor_min_cents": ptz_threshold_cents()}


@app.post("/api/admin/support")
def admin_support(data: SupportIn, authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM chat_users WHERE id=%s", (data.user_id,))
        if not cur.fetchone():
            raise HTTPException(404, "User not found")
        cur.execute("UPDATE chat_users SET support_level=%s,support_amount_cents=%s WHERE id=%s", (data.support_level, data.support_amount_cents, data.user_id))
        cur.execute("INSERT INTO chat_audit(admin_id,action,target_user_id,details) VALUES(%s,'support_status',%s,%s)", (admin["id"], data.user_id, f"{data.support_level}:{data.support_amount_cents}"))
    return {"ok": True}


@app.get("/api/admin/settings")
def admin_settings(authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    return {"ptz_sponsor_min_cents": ptz_threshold_cents()}


@app.post("/api/admin/settings/ptz-threshold")
def admin_ptz_threshold(data: ThresholdIn, authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    value = None if data.ptz_sponsor_min_cents is None else str(data.ptz_sponsor_min_cents)
    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO site_settings(key,value,updated_at) VALUES('ptz_sponsor_min_cents',%s,NOW())
            ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()
        """, (value,))
        cur.execute("INSERT INTO chat_audit(admin_id,action,details) VALUES(%s,'ptz_threshold',%s)", (admin["id"], value or 'disabled'))
    return {"ok": True, "ptz_sponsor_min_cents": data.ptz_sponsor_min_cents}


@app.post("/api/admin/ban")
def admin_ban(data: BanIn, authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    room = validate_room(data.room) if data.room else None
    if data.user_id == admin["id"]:
        raise HTTPException(400, "You cannot ban your own account")
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT id,role FROM chat_users WHERE id=%s", (data.user_id,))
        target = cur.fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        if target["role"] == "admin":
            raise HTTPException(403, "Another admin cannot be banned here")
        cur.execute("UPDATE chat_bans SET active=FALSE WHERE user_id=%s AND active=TRUE AND room IS NOT DISTINCT FROM %s", (data.user_id, room))
        cur.execute("INSERT INTO chat_bans(user_id,room,reason,created_by) VALUES(%s,%s,%s,%s)", (data.user_id, room, data.reason.strip(), admin["id"]))
        cur.execute("INSERT INTO chat_audit(admin_id,action,target_user_id,room,details) VALUES(%s,'ban',%s,%s,%s)", (admin["id"], data.user_id, room, data.reason.strip()))
    return {"ok": True}


@app.post("/api/admin/unban")
def admin_unban(data: BanIn, authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    room = validate_room(data.room) if data.room else None
    with db() as conn, conn.cursor() as cur:
        cur.execute("UPDATE chat_bans SET active=FALSE WHERE user_id=%s AND active=TRUE AND room IS NOT DISTINCT FROM %s", (data.user_id, room))
        cur.execute("INSERT INTO chat_audit(admin_id,action,target_user_id,room,details) VALUES(%s,'unban',%s,%s,%s)", (admin["id"], data.user_id, room, data.reason.strip()))
    return {"ok": True}


@app.delete("/api/admin/messages/{message_id}")
def admin_delete_message(message_id: int, authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT user_id,room FROM chat_messages WHERE id=%s", (message_id,))
        msg = cur.fetchone()
        if not msg:
            raise HTTPException(404, "Message not found")
        cur.execute("UPDATE chat_messages SET deleted=TRUE,deleted_by=%s WHERE id=%s", (admin["id"], message_id))
        cur.execute("INSERT INTO chat_audit(admin_id,action,target_user_id,room,details) VALUES(%s,'delete_message',%s,%s,%s)", (admin["id"], msg["user_id"], msg["room"], str(message_id)))
    return {"ok": True}
