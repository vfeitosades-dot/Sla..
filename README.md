# UMBRA — Ecos do Eclipse

**Versão 2.0.0 · Jogo em pixel art para Windows e Android.**
Você é uma sombra preta de olhos brancos. A luz consome sua essência; a
escuridão recupera sua vida. Explore, resolva mecanismos e enfrente os
guardiões do eclipse.

## Baixar o jogo

- [Instalador Windows (.exe)](https://github.com/vfeitosades-dot/Sla../releases/latest/download/UMBRA-Windows-Instalar.exe)
- [Aplicativo Android (.apk)](https://github.com/vfeitosades-dot/Sla../releases/latest/download/UMBRA-Android.apk)
- [Todas as versões e arquivos](https://github.com/vfeitosades-dot/Sla../releases)
- [Instalação e controles](LEIA-ME.txt)
- [Verificações e limites conhecidos](VERIFICACAO.txt)

Windows 10/11 de 64 bits ou Android 8+ com Android System WebView atualizado.
O conteúdo está nos aplicativos; o modo solo funciona sem internet. Os links
acima apontam para a última versão cuja compilação foi concluída.

## A campanha

Nove capítulos com dificuldade progressiva: exploração e plataformas,
mecanismos de luz e sombra, interruptores, passagens temporizadas e sequências
de runas. Três chefes originais têm ataques anunciados visualmente, janelas
para contra-atacar e padrões que se intensificam durante a luta.

A sombra tem ataque corpo a corpo, salto com altura variável e impulso.
Refúgios protegem seu progresso na fase. O menu apresenta a campanha, e a
interface inclui objetivos, estado dos mecanismos e vida dos chefes.
Animações de movimento e combate, partículas e cenários são desenhados pelo
jogo. Os controles se adaptam a teclado e toque.

## Cooperativo

Duas pessoas jogam por código de sala, usando a mesma versão do aplicativo.
Fragmentos e progresso dos mecanismos são compartilhados; o criador da sala
controla o mundo e a mudança de fase. O transporte usa WebRTC, com sinalização
PeerJS Cloud. Não há conta, chat, anúncios ou servidor dedicado de partidas.

Esta versão não inclui TURN dedicado. Redes móveis, VPNs e NATs restritivos
podem impedir a conexão direta. Consulte os limites de verificação antes de
considerar o cooperativo validado em aparelhos físicos ou redes diferentes.

## Código

- `dist/`: conteúdo local do jogo, arte procedural, som e PeerJS 1.5.5.
- `dist/core.js`: regras de movimento, luz, obstáculos e combate.
- `dist/game.js`: renderização, interface, persistência e cooperativo.
- `native/electron/`: processo principal do aplicativo desktop.
- `native/android/`: manifesto, ícone e Activity Android.
- `native/build-android.sh`: compilação e assinatura do APK.
- `native/installer.nsi`: instalador Windows com NSIS.
- `tests/`: testes automatizados das regras e campanha.

## Compilar Android

Requisitos: Java, compilador ECJ, Android SDK platform 35, build-tools 35,
Python 3 e uma chave de assinatura. Ajuste `UMBRA_ANDROID_JAR`,
`UMBRA_BUILD_TOOLS`, `UMBRA_ECJ`, `UMBRA_KEYSTORE` e `UMBRA_OUTPUT`, depois
execute `bash native/build-android.sh`. Sem chave no caminho indicado, o
script cria uma chave local de desenvolvimento. A chave desta distribuição
fica fora do repositório. Uma atualização Android precisa usar a mesma chave
da instalação anterior para preservar o aplicativo e seus dados.

## Compilar Windows

Em Linux com curl, unzip, sha256sum e NSIS instalados, execute
`bash scripts/build-windows.sh`. O script baixa o Electron 45.1.0 oficial,
confere seu SHA-256 e gera `output/UMBRA-Windows-Instalar.exe`.
O motor binário não é armazenado no Git.

O workflow em `.github/workflows/release.yml` executa os testes, confere se
cada arquivo do APK corresponde ao código-fonte, compila o EXE e publica os
downloads e seus hashes em Releases. Ao alterar `dist/`, regenere e substitua
`builds/UMBRA-Android.apk` antes de publicar.

## Verificar

Execute `node --test tests/*.test.mjs` para as regras e campanha.
Execute `python3 scripts/verify-package.py builds/UMBRA-Android.apk` para
comparar o conteúdo do APK com os fontes. Os testes de interface precisam
de Playwright e um servidor local. Os testes locais de conexão não comprovam
disponibilidade do PeerJS Cloud nem compatibilidade com todas as redes.
Consulte `VERIFICACAO.txt` para os resultados efetivamente obtidos.
