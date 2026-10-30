#!/usr/bin/env python3
"""Reject a release whose bundled Android game differs from its source."""
from pathlib import Path
from zipfile import ZipFile
import argparse
import json
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("apk", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
version = json.loads((root / "package.json").read_text())["version"]
electron = json.loads((root / "native/electron/package.json").read_text())
manifest = ET.parse(root / "native/android/AndroidManifest.xml").getroot()
assert electron["version"] == version, "Electron version does not match source"
assert manifest.attrib["{http://schemas.android.com/apk/res/android}versionName"] == version, "Android version does not match source"

files = sorted(path for path in (root / "dist").rglob("*") if path.is_file())
with ZipFile(args.apk) as archive:
    expected = {"assets/" + path.relative_to(root / "dist").as_posix() for path in files}
    bundled = {name for name in archive.namelist() if name.startswith("assets/") and not name.endswith("/")}
    assert bundled == expected, f"APK assets differ: missing={expected - bundled}, stale={bundled - expected}"
    for path in files:
        name = "assets/" + path.relative_to(root / "dist").as_posix()
        assert archive.read(name) == path.read_bytes(), f"APK contains outdated file: {name}"
print(f"UMBRA {version}: all {len(files)} APK assets match the source exactly.")
