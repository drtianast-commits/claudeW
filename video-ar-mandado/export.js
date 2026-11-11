// Exporta a cena (GLB) e o estado quadro a quadro (JSONL) para renderização no Blender.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const FPS = 24, OUT = path.join(__dirname, "..", "blender");
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.route("http://local/**", (route) => {
    const u = new URL(route.request().url()); let f;
    if (u.pathname === "/index.html") return route.fulfill({ contentType: "text/html", body: `<html><body><canvas id="c" width="640" height="360"></canvas>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">import * as THREE from "three"; import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js"; window.THREE = THREE; window.GLTFExporter = GLTFExporter; window.READY = true;</script></body></html>` });
    if (u.pathname.startsWith("/three/")) f = path.join(__dirname, "node_modules", u.pathname);
    else f = path.join(__dirname, u.pathname);
    route.fulfill({ contentType: "application/javascript", body: fs.readFileSync(f) });
  });
  await page.goto("http://local/index.html");
  await page.waitForFunction("window.READY");
  await page.evaluate(() => { window.NO_RENDER = true; });
  await page.addScriptTag({ url: "http://local/scene.js" });
  const meta = await page.evaluate(() => window.exportMeta());
  const N = Math.ceil(await page.evaluate(() => window.DURATION) * FPS);
  meta.frames = N; meta.fps = FPS;
  console.log("meta", meta.nMesh, meta.nSpr, meta.nDyn, N);
  const lines = [];
  for (let f = 0; f < N; f++) lines.push(JSON.stringify(await page.evaluate(([t, full]) => window.exportState(t, full), [f / FPS, f === 0])));
  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta));
  fs.writeFileSync(path.join(OUT, "frames.jsonl.gz"), zlib.gzipSync(lines.join("\n")));
  const b64 = await page.evaluate(() => new Promise((res, rej) => {
    window.exportState(0, true);
    new window.GLTFExporter().parse(window.sceneForExport(), (buf) => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); res(btoa(s)); }, rej, { binary: true, onlyVisible: false });
  }));
  fs.writeFileSync(path.join(OUT, "scene.glb"), Buffer.from(b64, "base64"));
  console.log("ok", fs.statSync(path.join(OUT, "scene.glb")).size, fs.statSync(path.join(OUT, "frames.jsonl.gz")).size);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
