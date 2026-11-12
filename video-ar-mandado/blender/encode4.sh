#!/bin/bash
# Uso: encode4.sh <fps_entrada> <padrao_glob> <saida.mp4> [crf]
# Monta o vídeo v4: quadros do Blender + logotipo, legenda inicial, relógio de cura, texto final e áudio
set -e
cd "$(dirname "$0")"
D=124; OV=../ov
ffmpeg -y -loglevel error -framerate $1 -pattern_type glob -i "$2" \
 -loop 1 -framerate 24 -t $D -i $OV/logo.png -loop 1 -framerate 24 -t $D -i $OV/title.png -loop 1 -framerate 24 -t $D -i $OV/end.png \
 -itsoffset 92.9 -framerate 24 -i $OV/clock/c%03d.png \
 -f lavfi -i "aevalsrc='0.15*between(t,5.5,91.4)*sin(2*PI*760*t-472.7*cos(3.456*t))':d=$D:s=44100" \
 -f lavfi -i "anoisesrc=d=$D:c=white:r=44100:a=0.6" \
 -f lavfi -i "aevalsrc='(0.10*between(t,13,21.5)*min(1,(21.5-t)/2)+0.08*gte(t,29.5))*(sin(2*PI*52*t)+0.6*sin(2*PI*104*t)+0.35*sin(2*PI*78*t))*(0.7+0.3*sin(2*PI*13*t))':d=$D:s=44100" \
 -filter_complex "[6:a]highpass=f=2500,lowpass=f=9000,volume='0.2*(between(t,3.5,82.9)+gt(t,82.9)*lt(t,84.6)*(1-0.7*(t-82.9)/1.7)+gte(t,84.6)*lt(t,88.4)*0.3+gte(t,88.4)*lt(t,90.2)*0.3*(90.2-t)/1.8)':eval=frame[h];[5:a][h][7:a]amix=inputs=3:normalize=0,afade=t=in:d=0.3,afade=t=out:st=122.2:d=1.8[a];\
[2:v]format=rgba,fade=t=in:st=0.8:d=0.5:alpha=1,fade=t=out:st=4.9:d=0.5:alpha=1[ti];[3:v]format=rgba,fade=t=in:st=113.6:d=1:alpha=1[en];\
[0:v]fps=24,scale=1920:1080:flags=lanczos[b];[b][ti]overlay=enable='between(t,0.8,5.4)'[v1];[v1][4:v]overlay=90:700:eof_action=pass:enable='between(t,92.9,98.85)'[v2];[v2][en]overlay=enable='gte(t,113.6)'[v3];\
[v3]fade=t=in:d=0.6,fade=t=out:st=122.8:d=1.2[v4];[v4][1:v]overlay,format=yuv420p[v]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf ${4:-21} -c:a aac -b:a 160k -ac 2 -movflags +faststart -t $D "$3"
ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$3"
