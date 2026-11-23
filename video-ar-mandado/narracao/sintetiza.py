# Gera narr.wav (48 kHz, mono, duração do vídeo) a partir de roteiro.py com Piper.
# Uso: python3 sintetiza.py <modelo.onnx> <saida.wav> [duracao_s]
import os, subprocess, sys, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from roteiro import FALAS

modelo, saida = sys.argv[1], sys.argv[2]
D = float(sys.argv[3]) if len(sys.argv) > 3 else 142.5
tmp = os.path.join(os.path.dirname(os.path.abspath(saida)), "seg")
os.makedirs(tmp, exist_ok=True)

def dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()

def synth(txt, ls, out):
    subprocess.run([sys.executable, "-m", "piper", "-m", modelo, "-f", out, "--length-scale", str(ls),
                    "--sentence-silence", "0.25"], input=txt.encode(), check=True, capture_output=True)

def trim(src, out):
    # remove silêncio do início e do fim
    f = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-af", f, out], check=True)

segs = []
for i, (a, b, txt) in enumerate(FALAS):
    jan = b - a
    ls = 1.12
    for _ in range(6):
        raw, cut = f"{tmp}/r{i:02d}.wav", f"{tmp}/s{i:02d}.wav"
        synth(txt, ls, raw); trim(raw, cut)
        d = dur(cut)
        if d <= jan or ls <= 0.8:
            break
        ls = max(0.8, ls * jan / d * 0.98)
    print(f"{i:02d} {a:6.1f} janela {jan:4.1f}s fala {d:4.1f}s ls {ls:.2f} {'ESTOURA' if d > jan else ''}")
    segs.append((a, cut))

ins, flt = [], []
for k, (a, p) in enumerate(segs):
    ins += ["-i", p]
    flt.append(f"[{k}:a]aresample=48000,adelay={int(a*1000)}:all=1[d{k}]")
flt.append("".join(f"[d{k}]" for k in range(len(segs))) + f"amix=inputs={len(segs)}:normalize=0,apad,atrim=0:{D},"
           "highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-18:TP=-2:LRA=7[o]")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *ins, "-filter_complex", ";".join(flt), "-map", "[o]",
                "-ar", "48000", "-ac", "1", saida], check=True)
print("ok", saida, dur(saida))
