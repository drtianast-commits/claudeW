# Uso: python3 hfrun.py <saida> <modelo> [args da CLI...]  -> roda com --wait --json e baixa result_url
import json, subprocess, sys, os, urllib.request
out, model, args = sys.argv[1], sys.argv[2], sys.argv[3:]
env = dict(os.environ, HIGGSFIELD_DISABLE_TELEMETRY="1")
r = subprocess.run(["higgsfield", "generate", "create", model, *args, "--wait", "--wait-timeout", "30m", "--json"],
                   capture_output=True, text=True, env=env)
try:
    d = json.loads(r.stdout); j = d[0] if isinstance(d, list) else d
except Exception:
    print("ERRO", r.stdout[-800:], r.stderr[-800:]); sys.exit(1)
url = j.get("result_url")
if j.get("status") != "completed" or not url:
    print("FALHOU", j.get("id"), j.get("status")); sys.exit(1)
subprocess.run(["curl", "-sfL", "-o", out, url], check=True)
print("ok", j.get("id"), out)
