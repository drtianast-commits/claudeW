// Uso: node render.js <frameInicial> <frameFinal> [passo] [dirSaida]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const FPS = 24;
(async () => {
  const a = parseInt(process.argv[2] || "0"), b = parseInt(process.argv[3] || "2477"), step = parseInt(process.argv[4] || "1");
  const out = process.argv[5] || path.join(__dirname, "frames");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.setContent('<html><body style="margin:0;background:#000"><canvas id="c" width="1920" height="1080"></canvas></body></html>');
  await page.addScriptTag({ path: path.join(__dirname, "node_modules/three/build/three.min.js") });
  await page.addScriptTag({ path: path.join(__dirname, "scene.js") });
  const t0 = Date.now();
  for (let f = a; f < b; f += step) {
    const data = await page.evaluate((t) => { window.renderFrame(t); return document.getElementById("c").toDataURL("image/jpeg", 0.93); }, f / FPS);
    fs.writeFileSync(path.join(out, "f" + String(f).padStart(5, "0") + ".jpg"), Buffer.from(data.split(",")[1], "base64"));
  }
  console.log("ok", a, b, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
