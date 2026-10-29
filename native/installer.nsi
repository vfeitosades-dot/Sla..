Unicode True
!include "MUI2.nsh"
!ifndef UMBRA_APP_DIR
  !define UMBRA_APP_DIR "windows"
!endif
!ifndef UMBRA_OUTPUT_EXE
  !define UMBRA_OUTPUT_EXE "UMBRA-Windows-Instalar.exe"
!endif
!ifndef UMBRA_ICON
  !define UMBRA_ICON "electron/icon.ico"
!endif
Name "UMBRA — Além da luz"
OutFile "${UMBRA_OUTPUT_EXE}"
InstallDir "$LOCALAPPDATA\Programs\UMBRA"
RequestExecutionLevel user
SetCompressor zlib
BrandingText "UMBRA · Além da luz"
!define MUI_ICON "${UMBRA_ICON}"
!define MUI_UNICON "${UMBRA_ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\UMBRA.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Jogar UMBRA"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"
VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1046 "ProductName" "UMBRA — Além da luz"
VIAddVersionKey /LANG=1046 "FileDescription" "Instalador do jogo UMBRA"
VIAddVersionKey /LANG=1046 "FileVersion" "1.0.0"
VIAddVersionKey /LANG=1046 "LegalCopyright" "UMBRA 2026"
Section "Jogo"
  SetOutPath "$INSTDIR"
  File /r "${UMBRA_APP_DIR}/*"
  CreateShortcut "$DESKTOP\UMBRA.lnk" "$INSTDIR\UMBRA.exe" "" "$INSTDIR\resources\app\icon.ico"
  CreateDirectory "$SMPROGRAMS\UMBRA"
  CreateShortcut "$SMPROGRAMS\UMBRA\UMBRA.lnk" "$INSTDIR\UMBRA.exe" "" "$INSTDIR\resources\app\icon.ico"
  WriteUninstaller "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UMBRA" "DisplayName" "UMBRA — Além da luz"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UMBRA" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UMBRA" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UMBRA" "DisplayIcon" "$INSTDIR\UMBRA.exe"
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\UMBRA.lnk"
  Delete "$SMPROGRAMS\UMBRA\UMBRA.lnk"
  RMDir "$SMPROGRAMS\UMBRA"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UMBRA"
SectionEnd
