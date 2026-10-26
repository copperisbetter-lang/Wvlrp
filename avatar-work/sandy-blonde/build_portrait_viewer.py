"""Build single-file offline Android viewer containing the actual Blender GLB + bundled JS."""
from pathlib import Path
import base64
root=Path(__file__).resolve().parent
build=root/'portrait'
binary=build/'Sandy_Portrait.glb'
client=root/'viewer'/'build'/'portrait-client.js'
if not binary.is_file() or not client.is_file():raise RuntimeError('Build real GLB and bundled JS first.')
if binary.read_bytes()[:4]!=b'glTF':raise RuntimeError('Not a GLB file')
b64=base64.b64encode(binary.read_bytes()).decode('ascii')
js=client.read_text(encoding='utf8')
html='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#15211d"><title>Sandy Blonde · WVLRP interactive 3D sculpt</title>
<style>
:root{font-family:system-ui,-apple-system,sans-serif;color:#eef5eb;background:#121d19}
*{box-sizing:border-box}body{margin:0}header{background:#1b3027;padding:13px 16px;border-bottom:1px solid #456858}
h1{font-size:19px;margin:0}header small{display:block;margin-top:4px;color:#aec4b4;font-size:12px;line-height:1.5}
main{max-width:1150px;margin:auto;padding:10px}#stage{position:relative;height:min(74dvh,780px);min-height:415px;border:1px solid #4f6d60;border-radius:12px;overflow:hidden;touch-action:none;background:#273631}
#canvas{width:100%;height:100%;display:block;touch-action:none}#status{position:absolute;bottom:10px;left:10px;right:10px;border:1px solid #4f6d60;border-radius:8px;background:#13221cde;font-size:13px;padding:9px;pointer-events:none}
#stats{font-size:12px;color:#a6c9b4;margin:10px 4px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
button,select{font:inherit;cursor:pointer;background:#294e3b;color:#fff;padding:10px 12px;border:1px solid #698c75;border-radius:9px}
button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #e4fce6}
section{padding:12px;background:#1d3027;border:1px solid #365643;border-radius:12px;margin-bottom:12px}
section h2{font-size:15px;margin:0 0 8px}section p,footer{font-size:12px;color:#b2c8b8;line-height:1.5}
.morph-row{display:grid;grid-template-columns:1fr auto;gap:5px;margin:12px 0;font-size:13px}
.morph-row input{grid-column:1/3;width:100%;accent-color:#a1cbab}select{max-width:100%}
@media(min-width:760px){.columns{display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,1fr);gap:13px}#stage{height:76dvh}}
</style></head>
<body><header><h1>Sandy Blonde · Portrait Study</h1><small>Separate head study · strand hair and facial proportions · likeness unverified</small></header>
<main><div class="columns"><div>
<div id="stage"><canvas id="canvas" aria-label="Interactive character model"></canvas><div id="status" role="status">Preparing the 3D viewer…</div></div>
<div id="stats">Loading model…</div>
<nav aria-label="3D camera and playback controls">
<button data-view="full">Full body</button><button data-view="face">Face close-up</button><button data-view="three">3/4 view</button>
<button data-view="side">Side view</button><button data-view="back">Back view</button><button id="spin">Auto rotate</button><button id="reset">Reset</button>
</nav></div><div><section><h2>Edit the real body and face</h2><p>Shape controls change the actual exported model; the original Sophie 1 is untouched.</p><div id="morphs"></div></section>
<section><h2>Animation</h2><select id="pose"><option value="-1">Neutral pose</option></select><p>Only verified animation clips actually inside the file are displayed.</p></section>
<section><h2>Build status</h2><p>Real Blender work-in-progress sculpt. Still awaiting visual approval, Android performance confirmation, final rig and game integration. Your separate clothing pack will be fitted later.</p></section>
</div></div><footer>Drag to rotate, pinch to zoom. Everything needed to display this model—including 3D geometry, texture data and viewer code—is embedded inside this HTML. No separate GLB download required.</footer></main>
<script id="glb" type="application/octet-stream">'''+b64+'''</script><script>'''+js+'''</script></body></html>'''
out=build/'Sandy_Portrait_Viewer.html'
out.write_text(html,encoding='utf8')
print('SANDY_OFFLINE_VIEWER_CREATED',out,len(html),binary.stat().st_size)

