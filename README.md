# UMBRA — Além da luz

**Um jogo em pixel art para instalar no Windows e no Android.**
Você é uma sombra preta de olhos brancos: a luz te desfaz, a escuridão te recupera.

## Baixar o jogo

- [Instalador Windows (.exe)](https://github.com/vfeitosades-dot/Sla../releases/latest/download/UMBRA-Windows-Instalar.exe)
- [Aplicativo Android (.apk)](https://github.com/vfeitosades-dot/Sla../releases/latest/download/UMBRA-Android.apk)
- [Todas as versões e arquivos](https://github.com/vfeitosades-dot/Sla../releases)
- [Instruções de instalação e controles](LEIA-ME.txt)
- [Testes realizados e limites conhecidos](VERIFICACAO.txt)

O Windows precisa ser 10/11 de 64 bits. No Android, use a versão 8 ou superior,
com Android System WebView atualizado. O modo solo funciona sem internet.
Os links de download ficam disponíveis quando a compilação automática terminar.

## Dentro da noite

Três fases, plataformas que criam sombra, lanternas móveis, salto com altura
variável, impulso, espinhos, fragmentos e pontos de retorno. Os controles
se adaptam a teclado e toque. A arte e os sons são gerados pelo jogo.

O cooperativo conecta duas pessoas por código de sala. Os fragmentos são
compartilhados, e o criador conduz a mudança de fase. A conexão usa WebRTC
com sinalização PeerJS Cloud. Redes restritivas podem impedir a conexão
sem um servidor TURN; esta primeira versão não inclui TURN dedicado.

## Código

- `dist/`: conteúdo local do jogo, arte procedural, som e PeerJS 1.5.5.
- `dist/core.js`: física, luz, obstáculos e configuração das fases.
- `dist/game.js`: renderização, interface, persistência e cooperativo.
- `native/electron/`: processo principal seguro do aplicativo desktop.
- `native/android/`: manifesto, ícone e Activity Android.
- `native/build-android.sh`: compilação e assinatura do APK.
- `native/installer.nsi`: instalador Windows com NSIS.
- `tests/`: testes de física, interface e conexão.

## Compilar Android

Requisitos: Java, compilador ECJ, Android SDK platform 35, build-tools 35,
Python 3 e uma chave de assinatura. Ajuste `UMBRA_ANDROID_JAR`,
`UMBRA_BUILD_TOOLS`, `UMBRA_ECJ`, `UMBRA_KEYSTORE` e `UMBRA_OUTPUT` antes
de executar `bash native/build-android.sh`. Sem chave informada, o script
cria uma chave local de desenvolvimento. Nunca coloque uma chave de
produção no repositório. A chave usada na entrega não está neste ZIP.

## Compilar Windows

Em Linux com curl, unzip, sha256sum e NSIS instalados, execute
`bash scripts/build-windows.sh`. O script baixa o Electron 45.1.0 oficial,
confere seu SHA-256, inclui o jogo e gera `output/UMBRA-Windows-Instalar.exe`.
O motor binário não é armazenado no Git. O workflow em `.github/workflows/`
faz a mesma compilação e publica os downloads em Releases.

## Online

PeerJS Cloud faz a sinalização; WebRTC DataChannel transporta os estados
entre dois jogadores. Não há conta, chat ou servidor dedicado de partidas.
O criador da sala controla a troca de fase; ambos podem coletar fragmentos.
A conexão direta depende da rede. Para um lançamento com ampla cobertura
de redes móveis e NATs restritivos, configure um serviço TURN próprio no
construtor de Peer em `getPeer()` e execute testes entre aparelhos reais.

## Verificação

`node tests/core.test.mjs` executa sete testes de regras do jogo.
Os scripts de UI precisam de Playwright e de um servidor local servindo
`dist/`. Os scripts de cooperativo usam um PeerServer local para isolar o
teste de transporte; não comprovam disponibilidade do PeerJS Cloud.
Consulte `VERIFICACAO.txt` na entrega para os resultados efetivamente obtidos.
