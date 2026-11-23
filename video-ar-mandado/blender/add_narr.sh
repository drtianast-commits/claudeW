#!/bin/bash
# Uso: add_narr.sh <video.mp4> <narracao.wav> <saida.mp4>
# Mixa a narração sobre a trilha do vídeo, abaixando a trilha (ducking) enquanto há fala. Vídeo copiado sem recodificar.
set -e
ffmpeg -y -loglevel error -i "$1" -i "$2" -filter_complex \
"[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=1.6,asplit[n1][n2];\
[0:a]aresample=48000[bed];\
[bed][n1]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=500:makeup=1[duck];\
[duck][n2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$3"
