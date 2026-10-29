#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SDK_TOOLS=${UMBRA_BUILD_TOOLS:-/workspace/work/toolchain/android-15}
SDK_JAR=${UMBRA_ANDROID_JAR:-/workspace/work/toolchain/android-35/android.jar}
ECJ=${UMBRA_ECJ:-/workspace/work/toolchain/ecj.jar}
SIGNING_KEY=${UMBRA_KEYSTORE:-/workspace/work/toolchain/umbra-development.jks}
OUT=${UMBRA_OUTPUT:-/workspace/outputs/umbra}
BUILD="$ROOT/native/android/build"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/assets" "$OUT"
cp -R "$ROOT/dist/." "$BUILD/assets/"
"$SDK_TOOLS/aapt2" compile --dir "$ROOT/native/android/res" -o "$BUILD/resources.zip"
"$SDK_TOOLS/aapt2" link "$BUILD/resources.zip" -I "$SDK_JAR" --manifest "$ROOT/native/android/AndroidManifest.xml" -A "$BUILD/assets" -o "$BUILD/unsigned.apk"
java -jar "$ECJ" -1.8 -bootclasspath "$SDK_JAR" -d "$BUILD/classes" "$ROOT/native/android/src/game/umbra/alemdaluz/MainActivity.java"
python3 - "$BUILD" <<'PY'
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import sys
p=Path(sys.argv[1])
with ZipFile(p/'classes.jar','w',ZIP_DEFLATED) as z:
 for f in (p/'classes').rglob('*.class'): z.write(f,f.relative_to(p/'classes'))
PY
"$SDK_TOOLS/d8" --lib "$SDK_JAR" --min-api 26 --output "$BUILD/dex" "$BUILD/classes.jar"
python3 - "$BUILD" <<'PY'
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import sys
p=Path(sys.argv[1])
with ZipFile(p/'unsigned.apk','a',ZIP_DEFLATED) as z:
 for f in (p/'dex').glob('*.dex'): z.write(f,f.name)
PY
"$SDK_TOOLS/zipalign" -p -f 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [ ! -f "$SIGNING_KEY" ]; then
 keytool -genkeypair -keystore "$SIGNING_KEY" -storepass android -keypass android -alias umbra -keyalg RSA -keysize 3072 -validity 10000 -dname "CN=UMBRA Development,O=Umbra,C=BR" -noprompt
fi
"$SDK_TOOLS/apksigner" sign --ks "$SIGNING_KEY" --ks-key-alias umbra --ks-pass pass:android --key-pass pass:android --out "$OUT/UMBRA-Android.apk" "$BUILD/aligned.apk"
"$SDK_TOOLS/apksigner" verify --verbose "$OUT/UMBRA-Android.apk"
"$SDK_TOOLS/aapt" dump badging "$OUT/UMBRA-Android.apk" | head -7
