"""Validate exact authorized image bytes before reconstruction dependencies.
No image URL is logged; source photos are not committed to the public repository.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request

from PIL import Image


def stage(data, expected_sha256, destination):
    if not 0 < len(data) <= 12_000_000:
        raise ValueError('Reference must be between 1 byte and 12 MB')
    actual = hashlib.sha256(data).hexdigest()
    if len(expected_sha256) != 64 or actual != expected_sha256.lower():
        raise ValueError('Reference SHA256 does not match the selected user photo')
    with Image.open(io.BytesIO(data)) as photo:
        photo.verify()
    with Image.open(io.BytesIO(data)) as photo:
        if min(photo.size) < 256:
            raise ValueError('Reference must be at least 256 pixels in both dimensions')
        dimensions = list(photo.size)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    report = {'sha256': actual, 'bytes': len(data), 'dimensions': dimensions,
              'status': 'VALIDATED_IMAGE_BYTES', 'likeness_approved': False}
    destination.with_suffix('.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--sha256', default=os.environ.get('PHOTO_SHA256', ''))
    args = parser.parse_args()
    if args.source:
        data = args.source.read_bytes()
    else:
        url = os.environ.get('PHOTO_URL', '')
        if not url or urllib.parse.urlparse(url).scheme != 'https':
            raise ValueError('An explicit HTTPS reference photo URL is required')
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=35) as response:
            data = response.read(12_000_001)
    print(json.dumps(stage(data, args.sha256, args.output), indent=2))


if __name__ == '__main__':
    main()
