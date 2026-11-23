#!/bin/bash
# Uso: encode5.sh <fps_cena> <padrao_glob_cena> <saida.mp4> [crf]
# v5: mergulho orbital (0 a 6 s) + cena do Blender (t = -5 s da cena em 6 s do vídeo) + sobreposições e áudio.
# Tempo do vídeo g = t_cena + 11; história tau: g = tau + 11 (tau < 4,5) e g = tau + 18,5 (tau >= 6).
set -e
cd "$(dirname "$0")"
D=142.5; OV=../ov
ffmpeg -y -loglevel error -framerate 24 -i ../earth/frames/e%05d.jpg -framerate $1 -pattern_type glob -i "$2" \
 -loop 1 -framerate 24 -t $D -i $OV/logo.png -loop 1 -framerate 24 -t $D -i $OV/title.png -loop 1 -framerate 24 -t $D -i $OV/end.png \
 -itsoffset 111.4 -framerate 24 -i $OV/clock/c%03d.png \
 -f lavfi -i "aevalsrc='0.15*between(t,24.5,109.9)*sin(2*PI*760*t-472.7*cos(3.456*t))':d=$D:s=44100" \
 -f lavfi -i "anoisesrc=d=$D:c=white:r=44100:a=0.6" \
 -f lavfi -i "aevalsrc='(0.10*between(t,31.5,40)*min(1,(40-t)/2)+0.08*gte(t,48))*(sin(2*PI*52*t)+0.6*sin(2*PI*104*t)+0.35*sin(2*PI*78*t))*(0.7+0.3*sin(2*PI*13*t))':d=$D:s=44100" \
 -f lavfi -i "anoisesrc=d=$D:c=brown:r=44100:a=0.9" \
 -f lavfi -i "aevalsrc='0.10*(between(t,21.45,21.57)+between(t,24.15,24.27))*sin(2*PI*1250*t)':d=$D:s=44100" \
 -f lavfi -i "anoisesrc=d=$D:c=pink:r=44100:a=0.8" \
 -filter_complex "\
[7:a]highpass=f=2500,lowpass=f=9000,volume='0.2*(between(t,14.5,101.4)+gt(t,101.4)*lt(t,103.1)*(1-0.7*(t-101.4)/1.7)+gte(t,103.1)*lt(t,106.9)*0.3+gte(t,106.9)*lt(t,108.7)*0.3*(108.7-t)/1.8)':eval=frame[h];\
[9:a]highpass=f=40,lowpass=f=700,volume='0.55*(min(1,t/5.4)*lt(t,6)+gte(t,6)*lt(t,11)*0.45*(11-t)/5)':eval=frame[wd];\
[11:a]bandpass=f=1100:width_type=h:w=1800,volume='0.05*between(t,21.6,24.1)*pow(0.5+0.5*sin(2*PI*4.3*t)*sin(2*PI*1.7*t+1),2)':eval=frame[rc];\
[6:a][h][8:a][wd][10:a][rc]amix=inputs=6:normalize=0,afade=t=in:d=0.3,afade=t=out:st=140.7:d=1.8[a];\
[0:v]fps=24,scale=1920:1080:flags=lanczos,setsar=1,fade=t=in:d=0.8,fade=t=out:st=5.3:d=0.7:color=white[e];\
[1:v]fps=24,scale=1920:1080:flags=lanczos,setsar=1,fade=t=in:d=0.8:color=white[s];[e][s]concat=n=2:v=1:a=0[c];\
[3:v]format=rgba,fade=t=in:st=7.2:d=0.5:alpha=1,fade=t=out:st=12.1:d=0.5:alpha=1[ti];[4:v]format=rgba,fade=t=in:st=132.1:d=1:alpha=1[en];\
[c][ti]overlay=enable='between(t,7.2,12.6)'[v1];[v1][5:v]overlay=90:700:eof_action=pass:enable='between(t,111.4,117.35)'[v2];[v2][en]overlay=enable='gte(t,132.1)'[v3];\
[v3]fade=t=out:st=141.3:d=1.2[v4];[v4][2:v]overlay,format=yuv420p[v]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf ${4:-21} -c:a aac -b:a 160k -ac 2 -movflags +faststart -t $D "$3"
ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$3"
