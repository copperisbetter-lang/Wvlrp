from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
import urllib.request,zipfile,shutil,json
root=Path(__file__).resolve().parents[1]/'assets'/'sav4-original-clothes'
root.mkdir(parents=True,exist_ok=True)
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  h=dict(attrs).get('href')
  if tag=='a' and h:self.links.append(h)
manifest=[]
for pack in ('dress01','dress02'):
 page='https://static.makehumancommunity.org/assets/assetpacks/'+pack+'.html'
 with urllib.request.urlopen(page,timeout=45) as resp:html=resp.read().decode('utf-8')
 links=Links();links.feed(html)
 mirrors=[urljoin(page,h) for h in links.links if urlparse(urljoin(page,h)).hostname in ('files2.makehumancommunity.org','files.makehumancommunity.org') and urlparse(urljoin(page,h)).path.lower().endswith('.zip')]
 if not mirrors:raise RuntimeError('No MakeHuman ZIP for '+pack)
 archive=root/(pack+'.zip')
 for mirror in mirrors:
  try:
   with urllib.request.urlopen(mirror,timeout=180) as src,archive.open('wb') as dst:shutil.copyfileobj(src,dst)
   if zipfile.is_zipfile(archive):break
  except Exception as ex:print('Mirror unavailable',pack,str(ex))
 if not zipfile.is_zipfile(archive):raise RuntimeError('Invalid archive '+pack)
 count=0
 with zipfile.ZipFile(archive) as z:
  if z.testzip():raise RuntimeError('Corrupt archive '+pack)
  for item in z.infolist():
   if item.is_dir():continue
   part=Path(item.filename)
   if part.is_absolute() or '..' in part.parts:continue
   if part.suffix.lower() not in ('.mhclo','.obj','.mhmat','.png','.jpg','.jpeg'):continue
   target=root/pack/part;target.parent.mkdir(parents=True,exist_ok=True)
   with z.open(item) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst)
   count+=1
 manifest.append({'pack':pack,'source':page,'archive_size':archive.stat().st_size,'extracted_files':count,'license':'CC0' if pack=='dress01' else 'CC-BY'})
 print('SAV4_PACK_READY',pack,count,flush=True)
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('SAV4_ORIGINAL_PACKS_READY',flush=True)
