import json
from datetime import datetime
from typing import Optional

from fastapi import Header, HTTPException, Query, Request

from server import app, db, current_user, require_admin


def init_analytics_db():
    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS analytics_page_visits (
                visit_id TEXT PRIMARY KEY,
                visitor_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                path TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                opened_at TIMESTAMPTZ NOT NULL,
                last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                duration_seconds BIGINT NOT NULL DEFAULT 0
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS analytics_page_opened_idx ON analytics_page_visits(opened_at DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS analytics_page_path_idx ON analytics_page_visits(path,opened_at DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS analytics_page_session_idx ON analytics_page_visits(session_id,opened_at DESC)")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS analytics_video_views (
                visit_id TEXT NOT NULL REFERENCES analytics_page_visits(visit_id) ON DELETE CASCADE,
                video_key TEXT NOT NULL,
                started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                watch_seconds BIGINT NOT NULL DEFAULT 0,
                PRIMARY KEY(visit_id,video_key)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS analytics_video_started_idx ON analytics_video_views(started_at DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS analytics_video_key_idx ON analytics_video_views(video_key,started_at DESC)")
        # Remove the one synthetic event used for the production acceptance test.
        cur.execute("DELETE FROM analytics_page_visits WHERE visitor_id='gator-test'")


@app.on_event("startup")
def startup_analytics():
    init_analytics_db()


def clean_id(value, field, limit=128):
    value = str(value or '').strip()
    if not value or len(value) > limit:
        raise HTTPException(400, f"Invalid {field}")
    return value


@app.post("/api/analytics/event")
async def analytics_event(request: Request):
    try:
        data = json.loads((await request.body()).decode('utf-8'))
        visit_id = clean_id(data.get('visit_id'), 'visit_id')
        visitor_id = clean_id(data.get('visitor_id'), 'visitor_id')
        session_id = clean_id(data.get('session_id'), 'session_id')
        path = str(data.get('path') or '/')[:300]
        title = str(data.get('title') or '')[:200]
        opened_at = datetime.fromisoformat(str(data.get('opened_at')).replace('Z', '+00:00'))
        page_seconds = max(0, min(int(data.get('page_seconds') or 0), 60 * 60 * 24 * 30))
        videos = data.get('videos') or []
        if not isinstance(videos, list) or len(videos) > 20:
            raise ValueError()
    except Exception:
        raise HTTPException(400, "Invalid analytics event")

    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO analytics_page_visits
                (visit_id,visitor_id,session_id,path,title,opened_at,last_seen_at,duration_seconds)
            VALUES(%s,%s,%s,%s,%s,%s,NOW(),%s)
            ON CONFLICT(visit_id) DO UPDATE SET
                last_seen_at=NOW(),duration_seconds=GREATEST(analytics_page_visits.duration_seconds,EXCLUDED.duration_seconds)
        """, (visit_id, visitor_id, session_id, path, title, opened_at, page_seconds))
        for item in videos:
            video_key = clean_id(item.get('video_key'), 'video_key', 100)
            watch_seconds = max(0, min(int(item.get('watch_seconds') or 0), 60 * 60 * 24 * 30))
            cur.execute("""
                INSERT INTO analytics_video_views(visit_id,video_key,started_at,last_seen_at,watch_seconds)
                VALUES(%s,%s,NOW(),NOW(),%s)
                ON CONFLICT(visit_id,video_key) DO UPDATE SET
                    last_seen_at=NOW(),watch_seconds=GREATEST(analytics_video_views.watch_seconds,EXCLUDED.watch_seconds)
            """, (visit_id, video_key, watch_seconds))
    return {"ok": True}


@app.get("/api/admin/analytics")
def admin_analytics(days: int = Query(default=30, ge=1, le=365), authorization: Optional[str] = Header(default=None)):
    admin = current_user(authorization)
    require_admin(admin)
    interval = f"{days} days"
    with db() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*)::BIGINT AS page_opens,
                   COUNT(DISTINCT visitor_id)::BIGINT AS unique_visitors,
                   COUNT(DISTINCT session_id)::BIGINT AS sessions,
                   COALESCE(SUM(duration_seconds),0)::BIGINT AS page_seconds
            FROM analytics_page_visits WHERE opened_at >= NOW()-(%s)::interval
        """, (interval,))
        totals = cur.fetchone()
        cur.execute("""
            SELECT path,COUNT(*)::BIGINT AS opens,COUNT(DISTINCT visitor_id)::BIGINT AS visitors,
                   COALESCE(SUM(duration_seconds),0)::BIGINT AS seconds,
                   COALESCE(AVG(duration_seconds),0)::BIGINT AS average_seconds
            FROM analytics_page_visits WHERE opened_at >= NOW()-(%s)::interval
            GROUP BY path ORDER BY opens DESC,path LIMIT 200
        """, (interval,))
        pages = cur.fetchall()
        cur.execute("""
            SELECT v.video_key,COUNT(*)::BIGINT AS views,
                   COALESCE(SUM(v.watch_seconds),0)::BIGINT AS watch_seconds,
                   COALESCE(AVG(v.watch_seconds),0)::BIGINT AS average_watch_seconds
            FROM analytics_video_views v
            WHERE v.started_at >= NOW()-(%s)::interval
            GROUP BY v.video_key ORDER BY views DESC,v.video_key LIMIT 100
        """, (interval,))
        videos = cur.fetchall()
    return {"days": days, "totals": totals, "pages": pages, "videos": videos}
