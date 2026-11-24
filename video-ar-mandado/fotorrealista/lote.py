# Gera quadro fotorrealista (GPT Image 2.6) e anima (Kling 3.0 Turbo 720p) para cada plano; pula o que já existe.
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from shots import SHOTS
from prompts import P, IMG_PRE, IMG_POS, VID_POS
H = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(H, "..", "ov", "logo.png")
so = sys.argv[1:] or [s[0] for s in SHOTS]

def run(*a):
    r = subprocess.run([sys.executable, os.path.join(H, "hfrun.py"), *a], capture_output=True, text=True, cwd=H)
    return r.stdout.strip() + r.stderr.strip()[-300:]

def job(sid):
    g = {s[0]: s[3] for s in SHOTS}[sid]
    img, vid, logo = P[sid]
    kf, cl = f"kf/{sid}.png", f"clips/{sid}.mp4"
    if not os.path.exists(os.path.join(H, kf)):
        a = [kf, "gpt_image_2_6", "--image", f"kf/ref_{sid}.jpg"] + (["--image", LOGO] if logo else []) + \
            ["--aspect_ratio", "16:9", "--quality", "medium", "--prompt", IMG_PRE + img + IMG_POS]
        out = run(*a); print(sid, "img", out, flush=True)
        if not out.startswith("ok"): return
    if os.environ.get("SO_IMG"): return
    if not os.path.exists(os.path.join(H, cl)):
        out = run(cl, "kling3_0_turbo", "--start-image", kf, "--duration", str(g), "--resolution", "720p",
                  "--aspect_ratio", "16:9", "--prompt", vid + VID_POS)
        print(sid, "vid", out, flush=True)

with ThreadPoolExecutor(4) as ex:
    list(ex.map(job, [s for s in so if s != "s14" or not os.path.exists(os.path.join(H, "clips/s14.mp4"))]))
print("FIM", flush=True)
