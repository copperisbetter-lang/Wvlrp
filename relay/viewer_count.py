#!/usr/bin/env python3
import json, time, threading, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

TTL = 45
viewers = {}
daily_viewers = {}
daily_day = None
lock = threading.Lock()

def cleanup(now=None):
    now = now or time.time()
    with lock:
        for cam in list(viewers):
            viewers[cam] = {sid: ts for sid, ts in viewers[cam].items() if now - ts < TTL}
            if not viewers[cam]:
                viewers.pop(cam, None)

def daily_number(cam, sid):
    global daily_day, daily_viewers
    day = datetime.datetime.now().strftime('%Y-%m-%d')
    with lock:
        if daily_day != day:
            daily_day = day
            daily_viewers = {}
        bucket = daily_viewers.setdefault(cam, {})
        if sid not in bucket:
            bucket[sid] = len(bucket) + 1
        return bucket[sid], len(bucket)

def count(cam):
    cleanup()
    with lock:
        return len(viewers.get(cam, {}))

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def send_json(self, obj, status=200):
        data = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_json({})

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        cam = q.get('cam', [''])[0].strip().lower()
        if u.path == '/presence/count' and cam:
            return self.send_json({'cam': cam, 'viewers': count(cam)})
        self.send_json({'ok': True, 'service': 'WVLRP viewer counter'})

    def do_POST(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        cam = q.get('cam', [''])[0].strip().lower()
        sid = q.get('id', [''])[0].strip()[:128]
        if not cam or not sid:
            return self.send_json({'error': 'cam and id required'}, 400)
        now = time.time()
        cleanup(now)
        if u.path == '/presence/heartbeat':
            with lock:
                viewers.setdefault(cam, {})[sid] = now
            number, today = daily_number(cam, sid)
            return self.send_json({'cam': cam, 'viewers': count(cam), 'viewer_today': number, 'today_viewers': today})
        if u.path == '/presence/leave':
            with lock:
                if cam in viewers:
                    viewers[cam].pop(sid, None)
                    if not viewers[cam]:
                        viewers.pop(cam, None)
            return self.send_json({'cam': cam, 'viewers': count(cam)})
        return self.send_json({'error': 'not found'}, 404)

if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8894), Handler).serve_forever()
