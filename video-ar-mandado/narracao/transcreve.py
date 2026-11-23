import sys, subprocess, numpy as np
from faster_whisper import WhisperModel
raw = subprocess.run(["ffmpeg","-loglevel","error","-i",sys.argv[1],"-f","f32le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout
a = np.frombuffer(raw, np.float32)
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
segs, _ = m.transcribe(a, language="pt", vad_filter=True)
for s in segs: print(f"{s.start:6.1f} {s.text.strip()}")
