#!/usr/bin/env python3
"""Gator Comms: shared GitHub Issues message bus. Standard library only.

Requires GITHUB_TOKEN with Issues read/write for send/ack; read for status.
No deploys, pushes, or edits to website files.
"""
import argparse, json, os, sys, urllib.request, urllib.error, datetime

REPO = os.getenv("GATOR_REPO", "copperisbetter-lang/Wvlrp")
TITLE = "[GATOR COMMS] Shared coordination room"
ROLES = ("gator-1", "gator-2", "gator-3")
KINDS = ("status", "proposal", "decision", "conflict", "ack", "incident", "resolved")

def api(method, endpoint, payload=None):
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("Set GITHUB_TOKEN; never put it in source or messages")
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request("https://api.github.com/repos/"+REPO+endpoint, data=data, method=method,
        headers={"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
                 "X-GitHub-Api-Version":"2022-11-28","User-Agent":"wvlrp-gator-comms",
                 **({"Content-Type":"application/json"} if data else {})})
    try:
        with urllib.request.urlopen(req,timeout=20) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        raise RuntimeError("GitHub API HTTP %s: %s"%(exc.code,exc.read().decode()[:400])) from exc

def room(create=False):
    issues=api("GET","/issues?state=all&per_page=100")
    rooms=[i for i in issues if "pull_request" not in i and i["title"]==TITLE]
    if len(rooms)>1:
        raise RuntimeError("Multiple rooms found; resolve duplicates before posting")
    if rooms:
        return rooms[0]["number"]
    if not create:
        raise RuntimeError("No coordination room yet. Run: init")
    return api("POST","/issues",{"title":TITLE,"body":
        "Shared asynchronous room for Gator 1/2/3. Post status, proposals, conflicts and decisions here. "
        "Read recent messages before changing shared code. Messages are NOT automatic approvals. "
        "No deployment authorization is granted by this issue."})["number"]

def main():
    p=argparse.ArgumentParser(description="GitHub-backed Gator communication room")
    sub=p.add_subparsers(dest="cmd",required=True)
    sub.add_parser("init")
    sub.add_parser("read").add_argument("--limit",type=int,default=30)
    send=sub.add_parser("send")
    send.add_argument("--from",dest="sender",required=True,choices=ROLES)
    send.add_argument("--kind",required=True,choices=KINDS)
    send.add_argument("--topic",required=True)
    send.add_argument("--message",required=True)
    send.add_argument("--refs",default="")
    args=p.parse_args()
    if args.cmd=="init":
        print("Room issue #",room(create=True));return
    issue=room()
    if args.cmd=="read":
        comments=api("GET",f"/issues/{issue}/comments?per_page=100")
        for item in comments[-max(1,min(args.limit,100)):]:
            print(f"[{item['created_at']}] {item['user']['login']}:\n{item['body']}\n")
    else:
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
        body=(f"**Gator:** {args.sender}\n**Kind:** {args.kind}\n"
              f"**Topic:** {args.topic}\n**Time UTC:** {timestamp}\n"
              f"**References:** {args.refs or 'none'}\n\n{args.message}")
        result=api("POST",f"/issues/{issue}/comments",{"body":body})
        print("Posted:",result["html_url"])

if __name__=="__main__":
    try:main()
    except (RuntimeError,urllib.error.URLError) as exc:
        print("ERROR:",exc,file=sys.stderr);sys.exit(1)
