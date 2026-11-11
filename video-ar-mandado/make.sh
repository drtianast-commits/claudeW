#!/bin/bash
set -e
cd "$(dirname "$0")"
D=103.2
rm -rf frames
node render.js 0 620 1 frames & node render.js 620 1240 1 frames & node render.js 1240 1860 1 frames & node render.js 1860 2477 1 frames & wait
test "$(ls frames | wc -l)" = 2477
ffmpeg -y -loglevel error -framerate 24 -i frames/f%05d.jpg \
 -f lavfi -i "aevalsrc='0.15*between(t,5.5,92.6)*sin(2*PI*760*t-472.7*cos(3.456*t))':d=$D:s=44100" \
 -f lavfi -i "anoisesrc=d=$D:c=white:r=44100:a=0.6" \
 -f lavfi -i "aevalsrc='(0.10*between(t,13,21.5)*min(1,(21.5-t)/2)+0.08*gte(t,29.5))*(sin(2*PI*52*t)+0.6*sin(2*PI*104*t)+0.35*sin(2*PI*78*t))*(0.7+0.3*sin(2*PI*13*t))':d=$D:s=44100" \
 -filter_complex "[2:a]highpass=f=2500,lowpass=f=9000,volume='0.2*(between(t,3.5,76.9)+gt(t,76.9)*lt(t,78.6)*(1-0.7*(t-76.9)/1.7)+gte(t,78.6)*lt(t,83.6)*0.3+gte(t,83.6)*lt(t,85.4)*0.3*(85.4-t)/1.8)':eval=frame[h];[1:a][h][3:a]amix=inputs=3:normalize=0,afade=t=in:d=0.3,afade=t=out:st=101.4:d=1.7[a];[0:v]fade=t=in:d=0.6,fade=t=out:st=101.9:d=1.2,format=yuv420p[v]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 160k -ac 2 -movflags +faststart -t $D ../Vazamento_Gas_Ar_Mandado_3D_v2.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 ../Vazamento_Gas_Ar_Mandado_3D_v2.mp4
