# Converte os clipes gerados em quadros f%05d (24 fps, tempo real da cena de -5 a 131,5 s) para o encode5.sh.
# Plano sem clipe usa os quadros do render 3D. Clipe mais curto que o plano é desacelerado com mistura de quadros.
import os, subprocess, json
from shots import SHOTS
H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, "frames_ai"); os.makedirs(OUT, exist_ok=True)
B3D = os.path.join(H, "..", "blender", "frames540")
fr = lambda t: int(round((t + 5) * 24))
for sid, a, b, g in SHOTS:
    f0, f1 = fr(a), fr(b); n = f1 - f0; cl = os.path.join(H, "clips", f"{sid}.mp4")
    if not os.path.exists(cl):
        for k in range(f0, f1):
            dst = os.path.join(OUT, f"f{k:05d}.jpg")
            if os.path.lexists(dst): os.remove(dst)
            os.symlink(os.path.join(B3D, f"f{k:05d}.jpg"), dst)
        print(sid, "3D"); continue
    L = float(json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", cl],
                                        capture_output=True, text=True).stdout)["format"]["duration"])
    for x in range(f0, f1):  # remove links para não sobrescrever os quadros do render 3D
        p = os.path.join(OUT, f"f{x:05d}.jpg")
        if os.path.lexists(p): os.remove(p)
    k = max(1.0, (n / 24) / (L - 0.05))
    vf = f"scale=1280:720,setsar=1,setpts={k:.4f}*PTS" + (",framerate=fps=24" if k > 1.0 else ",fps=24") + ",tpad=stop_mode=clone:stop_duration=1"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", cl, "-vf", vf, "-frames:v", str(n), "-q:v", "2",
                    "-start_number", str(f0), os.path.join(OUT, "f%05d.jpg")], check=True)
    got = len([x for x in range(f0, f1) if os.path.exists(os.path.join(OUT, f"f{x:05d}.jpg"))])
    print(sid, f"clipe {L:.2f}s -> {n/24:.2f}s (x{k:.2f}) quadros {got}/{n}")
print("total", len(os.listdir(OUT)))
