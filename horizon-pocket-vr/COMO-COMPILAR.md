# Horizon Pocket VR

Projeto independente inspirado na experiência visual de menus VR.

A fonte está comprimida em `source.tar.gz.b64`. Extraia com:

```sh
base64 --decode source.tar.gz.b64 | tar -xz
```

A compilação Android é feita pelo workflow `Horizon Pocket VR · Build APK`, que publica o APK assinado de desenvolvimento em Releases e Actions. O APK exige Android 8.0+ e WebView com WebGL. O modo experimental da câmera não substitui rastreamento 6DoF.
