#!/usr/bin/env bash
set -euo pipefail
UMBRA_ROOT=$(cd "$(dirname "$0")/.." && pwd)
UMBRA_OUT=${UMBRA_OUTPUT:-"$UMBRA_ROOT/output"}
UMBRA_CACHE=${UMBRA_NATIVE_CACHE:-"$UMBRA_ROOT/work/native-cache"}
UMBRA_MAKENSIS=${UMBRA_MAKENSIS:-makensis}
UMBRA_ELECTRON_VERSION=45.1.0
UMBRA_ELECTRON_SHA=55eaba17abff7b5bba6c3bbc85068967379024fe742fe9c7fdba9118922ccbe2
UMBRA_ZIP="$UMBRA_CACHE/electron-win.zip"
UMBRA_APP="$UMBRA_CACHE/windows"
mkdir -p "$UMBRA_CACHE" "$UMBRA_OUT" "$UMBRA_APP"
if [ ! -f "$UMBRA_ZIP" ]; then
 curl --fail --location --retry 3 "https://github.com/electron/electron/releases/download/v$UMBRA_ELECTRON_VERSION/electron-v$UMBRA_ELECTRON_VERSION-win32-x64.zip" --output "$UMBRA_ZIP"
fi
echo "$UMBRA_ELECTRON_SHA  $UMBRA_ZIP" | sha256sum --check --status
unzip -oq "$UMBRA_ZIP" -d "$UMBRA_APP"
mv -f "$UMBRA_APP/electron.exe" "$UMBRA_APP/UMBRA.exe"
mkdir -p "$UMBRA_APP/resources/app/game"
cp "$UMBRA_ROOT/native/electron/main.cjs" "$UMBRA_ROOT/native/electron/package.json" "$UMBRA_ROOT/native/electron/icon.ico" "$UMBRA_APP/resources/app/"
cp -R "$UMBRA_ROOT/dist/." "$UMBRA_APP/resources/app/game/"
"$UMBRA_MAKENSIS" -V2 "-DUMBRA_APP_DIR=$UMBRA_APP" "-DUMBRA_ICON=$UMBRA_ROOT/native/electron/icon.ico" "-DUMBRA_OUTPUT_EXE=$UMBRA_OUT/UMBRA-Windows-Instalar.exe" "$UMBRA_ROOT/native/installer.nsi"
test -s "$UMBRA_OUT/UMBRA-Windows-Instalar.exe"
echo "UMBRA para Windows compilado."
