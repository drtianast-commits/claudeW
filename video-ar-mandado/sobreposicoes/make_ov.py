# Gera sobreposições 1920x1080: logotipo, legenda inicial, texto final e relógio de cura
import math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1920, 1080
B = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"; SB = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"; XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
F = lambda p, s: ImageFont.truetype(p, s)
# logotipo no canto superior direito, sobre placa branca para leitura em qualquer fundo
logo = Image.open(sys.argv[1]).convert("RGBA"); lw = 250; logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
pad, m = 18, 36; x1 = W - m; x0 = x1 - lw - 2 * pad; y0 = m; y1 = y0 + logo.height + 2 * pad
d.rounded_rectangle((x0, y0, x1, y1), 16, fill=(255, 255, 255, 235)); im.alpha_composite(logo, (x0 + pad, y0 + pad)); im.save(os.path.join(HERE, "logo.png"))
# legenda inicial
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F(XB, 84); t = "Vazamento de gás"; tw = d.textlength(t, font=f)
d.rounded_rectangle((110, 836, 110 + tw + 120, 980), 14, fill=(12, 14, 18, 200)); d.rectangle((110, 836, 124, 980), fill=(226, 30, 30, 255)); d.text((170, 908), t, font=f, fill=(255, 255, 255, 255), anchor="lm"); im.save(os.path.join(HERE, "title.png"))
# texto final
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rectangle((0, 300, W, 800), fill=(10, 12, 16, 205)); d.rectangle((0, 300, W, 308), fill=(226, 30, 30, 255)); d.rectangle((0, 792, W, 800), fill=(226, 30, 30, 255))
d.text((W / 2, 410), "ROMAN VEDAÇÕES", font=F(XB, 104), fill=(255, 255, 255, 255), anchor="mm")
d.text((W / 2, 540), "Empresa especialista em eliminação de vazamentos com segurança.", font=F(SB, 46), fill=(255, 255, 255, 255), anchor="mm")
d.text((W / 2, 640), "Trabalho emergencial com a rede em carga,", font=F(SB, 46), fill=(240, 240, 240, 255), anchor="mm")
d.text((W / 2, 706), "sem parar o processo industrial.", font=F(SB, 46), fill=(240, 240, 240, 255), anchor="mm")
im.save(os.path.join(HERE, "end.png"))
# relógio de cura: 6 s a 24 qps, ponteiros acelerados
N, S, SS = 144, 300, 3
for i in range(N):
    k = i / (N - 1); c = Image.new("RGBA", (S * SS, S * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(c); R = S * SS / 2; cx = cy = R
    d.ellipse((6 * SS, 6 * SS, 2 * R - 6 * SS, 2 * R - 6 * SS), fill=(250, 250, 248, 240), outline=(20, 22, 26, 255), width=9 * SS)
    for h in range(12):
        a = h * math.pi / 6; r0 = R - (34 if h % 3 == 0 else 28) * SS; r1 = R - 20 * SS
        d.line((cx + r0 * math.sin(a), cy - r0 * math.cos(a), cx + r1 * math.sin(a), cy - r1 * math.cos(a)), fill=(20, 22, 26, 255), width=(6 if h % 3 == 0 else 3) * SS)
    a0, a1 = -math.pi / 2, -math.pi / 2 + 2 * math.pi * k    # setor do tempo decorrido
    d.pieslice((40 * SS, 40 * SS, 2 * R - 40 * SS, 2 * R - 40 * SS), math.degrees(a0), math.degrees(a1), fill=(226, 30, 30, 70))
    am = 2 * math.pi * k * 4; ah = 2 * math.pi * k * 4 / 12     # ponteiros
    for a, ln, wd, col in ((ah, 0.42, 9, (20, 22, 26, 255)), (am, 0.66, 6, (20, 22, 26, 255))):
        d.line((cx, cy, cx + R * ln * math.sin(a), cy - R * ln * math.cos(a)), fill=col, width=wd * SS)
    d.ellipse((cx - 9 * SS, cy - 9 * SS, cx + 9 * SS, cy + 9 * SS), fill=(226, 30, 30, 255))
    c.resize((S, S), Image.LANCZOS).save(os.path.join(HERE, "clock", "c%03d.png" % i))
