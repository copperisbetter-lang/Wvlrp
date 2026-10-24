"""Reproduce the audit's geometry and false-green bugs with synthetic data."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'avatar-work/brooke-2.0/build-check'
OUT.mkdir(parents=True, exist_ok=True)
BUILD = ROOT / 'avatar-work/brooke/scripts/build_complete_head.py'
CHECK = ROOT / 'avatar-work/brooke/scripts/validate_photo_head_candidate.py'


def blender(script, *arguments, succeeds=True):
    command = ['blender', '-b', '-t', '2', '--python-exit-code', '1',
               '--python', str(script), '--', *map(str, arguments)]
    result = subprocess.run(command, capture_output=True, text=True)
    print(result.stdout, end='')
    print(result.stderr, end='', file=sys.stderr)
    if (result.returncode == 0) != succeeds:
        raise RuntimeError(f'Unexpected Blender result {result.returncode}: {command}')
    return result


size = 36
vertices = []
for row in range(size):
    for col in range(size):
        x = 100 + col * 0.5
        y = 200 + row * 0.6
        z = 10 + 3 * (1 - ((col - 17.5) / 18) ** 2) * (1 - ((row - 17.5) / 18) ** 2)
        vertices.append(f'v {x:.8f} {y:.8f} {z:.8f}')
faces = []
for row in range(size - 1):
    for col in range(size - 1):
        a = row * size + col + 1
        faces.extend([f'f {a} {a+1} {a+size+1}', f'f {a} {a+size+1} {a+size}'])
source = OUT / 'fixture.obj'
source.write_text('\n'.join(vertices + faces) + '\n')
candidate = OUT / 'fixture.glb'
blender(BUILD, source, candidate)
blender(CHECK, source, candidate)

corrupt = vertices.copy()
index = 18 * size + 18
parts = corrupt[index].split()
parts[1] = str(float(parts[1]) + 0.15)
corrupt[index] = ' '.join(parts)
bad_source = OUT / 'corrupt-fixture.obj'
bad_source.write_text('\n'.join(corrupt + faces) + '\n')
negative = blender(CHECK, bad_source, candidate, succeeds=False)
if 'Photo-derived vertices missing/altered' not in negative.stdout + negative.stderr:
    raise RuntimeError('Negative test failed for the wrong reason')

report = {
    'status': 'PASS',
    'scope': 'Build runtime and geometry regression only; NOT Brooke likeness approval',
    'source_translation_and_scale': 'PASS',
    'connected_manifold_glb_roundtrip': 'PASS',
    'altered_vertex_rejected': 'PASS',
    'python_error_propagates_to_process': 'PASS',
    'negative_test_exit_code': negative.returncode,
}
(OUT / 'regression-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
