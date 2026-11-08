#!/usr/bin/env python3
"""Recover files already attached to a GitHub issue into repository backups.
No phone download/upload required after the file has been attached to GitHub.
Runs inside GitHub Actions with GITHUB_TOKEN. Never logs token or file contents.
"""
import hashlib,json,os,pathlib,re,urllib.parse,urllib.request
REPO=os.environ["GITHUB_REPOSITORY"]; ISSUE=int(os.environ.get("SOURCE_ISSUE","29"))
ROOT=pathlib.Path("backups/issue-"+str(ISSUE)); ROOT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ["GITHUB_TOKEN"]; MAX=int(os.environ.get("MAX_FILE_MB","90"))*1024*1024
API="https://api.github.com/repos/"+REPO
def fetch(url,accept="application/vnd.github+json"):
 req=urllib.request.Request(url,headers={"Authorization":"Bearer "+TOKEN,"Accept":accept,"User-Agent":"WVLRP-backup-bridge"})
 return urllib.request.urlopen(req,timeout=120)
def paginate(path):
 page=1
 while True:
  with fetch(API+path+("&" if "?" in path else "?")+f"per_page=100&page={page}") as r: data=json.load(r)
  if not data:break
  yield from data
  if len(data)<100:break
  page+=1
def safe_name(s):
 s=urllib.parse.unquote(s).split("/")[-1]
 return re.sub(r"[^a-zA-Z0-9._-]","_",s)[:120] or "attachment"
# Restrict to GitHub-hosted attachments only.
pat=re.compile(r'https://(?:github\.com/[^\s)<>]+/files/\d+/[^\s)<>]+|(?:private-user-images|user-images)\.githubusercontent\.com/[^\s)<>]+|github\.com/user-attachments/assets/[a-zA-Z0-9-]+)',re.I)
items=[]; seen=set()
issue=next(iter([json.load(fetch(API+f"/issues/{ISSUE}"))]))
texts=[issue.get("body") or ""]+[x.get("body") or "" for x in paginate(f"/issues/{ISSUE}/comments")]
for body in texts:
 for url in pat.findall(body):
  url=url.rstrip(".,]"); parsed=urllib.parse.urlparse(url)
  if url in seen:continue
  seen.add(url)
  name=safe_name(parsed.path)
  if not pathlib.Path(name).suffix:name+=".bin"
  dest=ROOT/name
  if dest.exists():dest=ROOT/(hashlib.sha256(url.encode()).hexdigest()[:10]+"_"+name)
  try:
   req=urllib.request.Request(url,headers={"Authorization":"Bearer "+TOKEN,"User-Agent":"WVLRP-backup-bridge"})
   with urllib.request.urlopen(req,timeout=120) as resp,open(dest,"wb") as out:
    size=0;sha=hashlib.sha256()
    while True:
     chunk=resp.read(1024*1024)
     if not chunk:break
     size+=len(chunk)
     if size>MAX:raise ValueError("File exceeds size limit")
     sha.update(chunk);out.write(chunk)
   items.append({"source":url,"path":str(dest),"bytes":size,"sha256":sha.hexdigest(),"status":"saved"})
  except Exception as e:
   dest.unlink(missing_ok=True)
   items.append({"source":url,"status":"failed","error":str(e)[:180]})
(ROOT/"manifest.json").write_text(json.dumps({"issue":ISSUE,"files":items},indent=2)+"\n")
print(f"Processed {len(items)} GitHub issue attachments; saved {sum(x['status']=='saved' for x in items)}.")
