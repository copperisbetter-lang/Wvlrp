from typing import Optional
from fastapi import Header, HTTPException, Query
from pydantic import BaseModel, Field

from server import app, db, current_user


def init_inbox_db():
    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS private_messages (
                id BIGSERIAL PRIMARY KEY,
                sender_id BIGINT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
                recipient_id BIGINT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                read_at TIMESTAMPTZ,
                sender_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                recipient_deleted BOOLEAN NOT NULL DEFAULT FALSE
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS private_messages_recipient_idx ON private_messages(recipient_id,id DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS private_messages_pair_idx ON private_messages(sender_id,recipient_id,id DESC)")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS member_blocks (
                blocker_id BIGINT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
                blocked_id BIGINT NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY(blocker_id,blocked_id),
                CHECK(blocker_id <> blocked_id)
            )
        """)


@app.on_event("startup")
def startup_inbox():
    init_inbox_db()


class PrivateMessageIn(BaseModel):
    recipient_id: int
    body: str = Field(min_length=1, max_length=2000)


class BlockIn(BaseModel):
    user_id: int


def member_exists(user_id: int):
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT id,username,role,support_level FROM chat_users WHERE id=%s AND disabled=FALSE", (user_id,))
        return cur.fetchone()


def blocked_between(a: int, b: int) -> bool:
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM member_blocks WHERE (blocker_id=%s AND blocked_id=%s) OR (blocker_id=%s AND blocked_id=%s) LIMIT 1", (a,b,b,a))
        return cur.fetchone() is not None


@app.get("/api/members")
def member_search(q: str = Query(default="", max_length=40), authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    with db() as conn, conn.cursor() as cur:
        if q.strip():
            cur.execute("""SELECT id,username,role,support_level FROM chat_users
                WHERE disabled=FALSE AND id<>%s AND lower(username) LIKE lower(%s)
                ORDER BY username LIMIT 30""", (user["id"], f"%{q.strip()}%"))
        else:
            cur.execute("""SELECT id,username,role,support_level FROM chat_users
                WHERE disabled=FALSE AND id<>%s ORDER BY username LIMIT 30""", (user["id"],))
        rows = cur.fetchall()
    return {"members": rows}


@app.get("/api/inbox")
def inbox(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    uid = user["id"]
    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            WITH visible AS (
              SELECT m.*,
                CASE WHEN m.sender_id=%s THEN m.recipient_id ELSE m.sender_id END AS other_id
              FROM private_messages m
              WHERE (m.sender_id=%s AND m.sender_deleted=FALSE)
                 OR (m.recipient_id=%s AND m.recipient_deleted=FALSE)
            ), latest AS (
              SELECT DISTINCT ON (other_id) other_id,id,body,created_at,sender_id,recipient_id,read_at
              FROM visible ORDER BY other_id,id DESC
            )
            SELECT l.*,u.username,u.role,u.support_level,
              (SELECT COUNT(*) FROM private_messages x
               WHERE x.sender_id=l.other_id AND x.recipient_id=%s AND x.read_at IS NULL AND x.recipient_deleted=FALSE) AS unread
            FROM latest l JOIN chat_users u ON u.id=l.other_id
            ORDER BY l.created_at DESC LIMIT 100
        """, (uid,uid,uid,uid))
        conversations = cur.fetchall()
        cur.execute("SELECT COUNT(*) AS n FROM private_messages WHERE recipient_id=%s AND read_at IS NULL AND recipient_deleted=FALSE", (uid,))
        unread = int(cur.fetchone()["n"])
    return {"conversations": conversations, "unread": unread}


@app.get("/api/inbox/unread")
def inbox_unread(authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM private_messages WHERE recipient_id=%s AND read_at IS NULL AND recipient_deleted=FALSE", (user["id"],))
        return {"unread": int(cur.fetchone()["n"])}


@app.get("/api/inbox/thread/{other_id}")
def inbox_thread(other_id: int, before: int = Query(default=0, ge=0), authorization: Optional[str] = Header(default=None)):
    user = current_user(authorization)
    uid = user["id"]
    other = member_exists(other_id)
    if not other or other_id == uid:
        raise HTTPException(404, "Member not found")
    with db() as conn, conn.cursor() as cur:
        cur.execute("UPDATE private_messages SET read_at=COALESCE(read_at,NOW()) WHERE sender_id=%s AND recipient_id=%s AND recipient_deleted=FALSE", (other_id,uid))
        params=[uid,other_id,other_id,uid,uid,uid]
        extra=""
        if before:
            extra=" AND m.id < %s"
            params.append(before)
        cur.execute(f"""
            SELECT * FROM (
              SELECT m.id,m.sender_id,m.recipient_id,m.body,m.created_at,m.read_at
              FROM private_messages m
              WHERE ((m.sender_id=%s AND m.recipient_id=%s) OR (m.sender_id=%s AND m.recipient_id=%s))
                AND ((m.sender_id=%s AND m.sender_deleted=FALSE) OR (m.recipient_id=%s AND m.recipient_deleted=FALSE))
                {extra}
              ORDER BY m.id DESC LIMIT 100
            ) q ORDER BY id ASC
        """, tuple(params))
        messages=cur.fetchall()
        cur.execute("SELECT 1 FROM member_blocks WHERE blocker_id=%s AND blocked_id=%s", (uid,other_id))
        i_blocked=cur.fetchone() is not None
        cur.execute("SELECT 1 FROM member_blocks WHERE blocker_id=%s AND blocked_id=%s", (other_id,uid))
        blocked_me=cur.fetchone() is not None
    return {"member": other, "messages": messages, "blocked": i_blocked, "blocked_me": blocked_me}


@app.post("/api/inbox/send")
def inbox_send(data: PrivateMessageIn, authorization: Optional[str] = Header(default=None)):
    user=current_user(authorization)
    uid=user["id"]
    if data.recipient_id == uid:
        raise HTTPException(400, "You cannot message yourself")
    other=member_exists(data.recipient_id)
    if not other:
        raise HTTPException(404, "Member not found")
    if blocked_between(uid,data.recipient_id):
        raise HTTPException(403, "Messaging is blocked between these accounts")
    body=data.body.strip()
    if not body:
        raise HTTPException(400, "Message is empty")
    with db() as conn, conn.cursor() as cur:
        cur.execute("""INSERT INTO private_messages(sender_id,recipient_id,body)
            VALUES(%s,%s,%s) RETURNING id,sender_id,recipient_id,body,created_at,read_at""", (uid,data.recipient_id,body))
        return cur.fetchone()


@app.post("/api/inbox/block")
def inbox_block(data: BlockIn, authorization: Optional[str] = Header(default=None)):
    user=current_user(authorization)
    if data.user_id == user["id"] or not member_exists(data.user_id):
        raise HTTPException(400, "Invalid member")
    with db() as conn, conn.cursor() as cur:
        cur.execute("INSERT INTO member_blocks(blocker_id,blocked_id) VALUES(%s,%s) ON CONFLICT DO NOTHING", (user["id"],data.user_id))
    return {"ok": True}


@app.post("/api/inbox/unblock")
def inbox_unblock(data: BlockIn, authorization: Optional[str] = Header(default=None)):
    user=current_user(authorization)
    with db() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM member_blocks WHERE blocker_id=%s AND blocked_id=%s", (user["id"],data.user_id))
    return {"ok": True}


@app.delete("/api/inbox/message/{message_id}")
def inbox_delete(message_id: int, authorization: Optional[str] = Header(default=None)):
    user=current_user(authorization)
    uid=user["id"]
    with db() as conn, conn.cursor() as cur:
        cur.execute("SELECT sender_id,recipient_id FROM private_messages WHERE id=%s", (message_id,))
        msg=cur.fetchone()
        if not msg or uid not in (msg["sender_id"],msg["recipient_id"]):
            raise HTTPException(404, "Message not found")
        if msg["sender_id"] == uid:
            cur.execute("UPDATE private_messages SET sender_deleted=TRUE WHERE id=%s", (message_id,))
        if msg["recipient_id"] == uid:
            cur.execute("UPDATE private_messages SET recipient_deleted=TRUE WHERE id=%s", (message_id,))
    return {"ok": True}
