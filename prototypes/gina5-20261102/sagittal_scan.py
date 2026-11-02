#!/usr/bin/env python3
"""Real target-body central sagittal scan from saved Gina5 pelvis geometry. No licensed anatomy."""
import base64,zlib,json,pathlib,sys
blob=pathlib.Path(sys.argv[1]).read_text()
o=json.loads(zlib.decompress(base64.b85decode(blob)))
p=o['pos']
lines=[]
lines.append('Real Gina5 skin, true exported body: sagittal central slices (metres).')
lines.append('For each row: y, count, min/median/max z within abs(x)<.015, and central x span.')
for ybin in range(460,901,10):
 y=ybin/1000
 a=[v for v in p if abs(v[0])<.015 and abs(v[1]-y)<.007]
 if not a:lines.append(f'{y:.3f},0,,,,');continue
 z=sorted(v[2] for v in a)
 lines.append(f'{y:.3f},{len(a)},{z[0]:.4f},{z[len(z)//2]:.4f},{z[-1]:.4f}')
pathlib.Path(sys.argv[2]).write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
