/* Animação 3D v2: vazamento de gás, resposta com ar mandado (PO-002) e reparo com placa e massa.
   Toda a cena é função determinística do tempo t (s): window.renderFrame(t). */
(function () {
  const T = THREE;
  const cv = document.getElementById("c");
  const W = cv.width, H = cv.height;
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xc3ced6, 90, 330);
  const camera = new T.PerspectiveCamera(40, W / H, 0.08, 800);

  // ---------- utilidades ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = (a, b, t) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
  const lin = (a, b, t) => clamp((t - a) / (b - a));
  const win = (a, b, t, e = 0.5) => sm(a, a + e, t) - sm(b - e, b, t);
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const frac = (x) => x - Math.floor(x);
  let seed = 12345;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let r = Math.imul(seed ^ (seed >>> 15), 1 | seed); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };

  // ---------- texturas procedurais ----------
  function tex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
  }
  function speck(g, w, h, base, cols, n, r0, r1, a = 0.5) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.3 + rnd() * 0.7); g.fillStyle = cols[(rnd() * cols.length) | 0]; const r = r0 + rnd() * (r1 - r0); g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd()), rnd() * 3, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
  }
  const texAsphalt = tex(512, 512, (g, w, h) => { speck(g, w, h, "#3b3d40", ["#2c2d2f", "#4c4e52", "#5a5c60", "#333"], 9000, 0.6, 2.2, 0.7); speck2(g, w, h, ["#2a2b2d", "#47494c"], 40, 30, 90, 0.12); }, 64, 4);
  function speck2(g, w, h, cols, n, r0, r1, a) { for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h, r = r0 + rnd() * (r1 - r0); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, cols[(rnd() * cols.length) | 0]); gr.addColorStop(1, "rgba(0,0,0,0)"); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } g.globalAlpha = 1; }
  const texConcrete = tex(512, 512, (g, w, h) => {
    speck(g, w, h, "#8e8f8b", ["#7d7e7a", "#9b9c97", "#868580", "#a3a39d"], 5000, 0.8, 3, 0.5); speck2(g, w, h, ["#6f6d66", "#a5a49d", "#7b735f"], 60, 30, 110, 0.16);
    g.strokeStyle = "rgba(60,60,58,0.5)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(50,50,48,0.35)"; g.lineWidth = 1; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  }, 110, 110);
  const texGrass = tex(512, 512, (g, w, h) => { speck(g, w, h, "#4f6d38", ["#3f5a2c", "#5d7d42", "#6b8a4a", "#48632f", "#7a8f52"], 14000, 0.6, 2.4, 0.7); speck2(g, w, h, ["#3a5226", "#6f8c4e", "#7d7a4a"], 50, 30, 100, 0.2); }, 70, 9);
  function paintTex(base, dirt, rx, ry) {
    return tex(512, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h); speck2(g, w, h, dirt, 70, 20, 90, 0.13);
      for (let i = 0; i < 90; i++) { g.globalAlpha = 0.05 + rnd() * 0.12; g.fillStyle = dirt[(rnd() * dirt.length) | 0]; const x = rnd() * w; g.fillRect(x, rnd() * h, 1 + rnd() * 3, 20 + rnd() * 120); }
      for (let i = 0; i < 5; i++) { g.globalAlpha = 0.12; g.fillStyle = "#5b4a1a"; g.fillRect(0, rnd() * h, w, 1.5); }
      g.globalAlpha = 1;
    }, rx, ry);
  }
  const texShed = tex(256, 256, (g, w, h) => {
    for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, "#9aa6b1"); gr.addColorStop(0.5, "#c3ccd4"); gr.addColorStop(1, "#8f9ba6"); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
    speck2(g, w, h, ["#6f7880", "#d5dbe0", "#7d6f5a"], 30, 20, 70, 0.12);
    g.fillStyle = "rgba(70,78,86,0.35)"; g.fillRect(0, 126, w, 3);
  }, 18, 2);
  const texSky = tex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#2f62a6"); gr.addColorStop(0.3, "#5a8cc4"); gr.addColorStop(0.47, "#a9c6e0"); gr.addColorStop(0.5, "#cdd8de"); gr.addColorStop(0.52, "#8d918e"); gr.addColorStop(1, "#77796f");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let c = 0; c < 24; c++) {
      const cx = rnd() * w, cy = h * (0.1 + rnd() * 0.36), sc = 0.5 + rnd() * 1.3 * (cy / (h * 0.46));
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 22; i++) {
        const x = cx + (rnd() - 0.5) * 260 * sc, y = cy + (rnd() - 0.5) * 50 * sc + (pass ? -8 * sc : 12 * sc), r = (26 + rnd() * 50) * sc;
        for (const xx of [x, x - w, x + w]) { const rg = g.createRadialGradient(xx, y, 0, xx, y, r); rg.addColorStop(0, pass ? "rgba(255,255,255,0.6)" : "rgba(160,170,182,0.4)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(xx - r, y - r, 2 * r, 2 * r); }
      }
    }
  });
  texSky.wrapS = texSky.wrapT = T.ClampToEdgeWrapping; texSky.repeat.set(1, 1); texSky.mapping = T.EquirectangularReflectionMapping;
  scene.background = texSky;
  scene.environment = new T.PMREMGenerator(renderer).fromEquirectangular(texSky).texture;

  const mats = {};
  function M(color, rough = 0.8, metal = 0, extra) {
    const key = color + "_" + rough + "_" + metal + (extra ? JSON.stringify(extra) : "");
    if (!mats[key]) mats[key] = new T.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal, envMapIntensity: 0.55 }, extra || {}));
    return mats[key];
  }
  const MT = (map, rough, metal = 0, color = 0xffffff) => new T.MeshStandardMaterial({ map, color, roughness: rough, metalness: metal, envMapIntensity: 0.5 });
  function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
  }
  function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 24, open = false) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
  }
  function sph(r, mat, x = 0, y = 0, z = 0, parent, ws = 20, hs = 14) {
    const m = new T.Mesh(new T.SphereGeometry(r, ws, hs), mat); m.position.set(x, y, z);
    m.castShadow = true; if (parent) parent.add(m); return m;
  }
  const puffTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  function puff(color) { const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, color, transparent: true, opacity: 0, depthWrite: false })); scene.add(s); return s; }

  // ---------- luz ----------
  scene.add(new T.HemisphereLight(0xdfe9f5, 0x6f6a5c, 0.55));
  const sun = new T.DirectionalLight(0xfff0d8, 3.1);
  sun.position.set(-45, 70, 50); sun.target.position.set(-8, 0, 8); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 40, bottom: -40, near: 10, far: 200 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 2.5; scene.add(sun);

  // ---------- piso e via ----------
  const ground = new T.Mesh(new T.PlaneGeometry(700, 700), MT(texConcrete, 0.95)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const road = new T.Mesh(new T.PlaneGeometry(320, 17), MT(texAsphalt, 0.88)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, 12.8); road.receiveShadow = true; scene.add(road);
  for (const z of [4.6, 21]) { const l = new T.Mesh(new T.PlaneGeometry(320, 0.16), M(0xd9d9d0, 0.8)); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.02, z); scene.add(l); }
  for (let x = -150; x < 150; x += 6) { const l = new T.Mesh(new T.PlaneGeometry(3, 0.14), M(0xd8b21a, 0.8)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, 12.6); scene.add(l); }
  const grass = new T.Mesh(new T.PlaneGeometry(320, 40), MT(texGrass, 1)); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.008, 42); grass.receiveShadow = true; scene.add(grass);

  // ---------- pipe rack ----------
  const LX = 0.35, PY = 7.0, PR = 0.5, LA = 1.0;
  const steel = M(0xa9c2ac, 0.7, 0.2), steel2 = M(0x8fa994, 0.7, 0.2);
  const yellowPipe = 0xdcae10;
  const matPipe = (len, r) => MT(paintTex("#e2b512", ["#a8830a", "#7a6a2a", "#f0d050", "#8a5a1a"], Math.max(1, Math.round(r * 4)), Math.max(1, Math.round(len / 5))), 0.5, 0.15);
  const matPipeMain = matPipe(132, 0.5);
  const rack = new T.Group(); scene.add(rack);
  for (let x = -65; x <= 65; x += 10) {
    box(0.34, 9.6, 0.34, steel, x, 4.8, -0.9, rack); box(0.34, 9.6, 0.34, steel, x, 4.8, -3.3, rack);
    box(0.3, 0.32, 4.6, steel, x, 6.32, -1.5, rack); box(0.3, 0.3, 2.9, steel, x, 8.5, -2.1, rack);
    box(0.6, 0.2, 0.6, M(0x77797a, 0.9), x, 0.1, -0.9, rack); box(0.6, 0.2, 0.6, M(0x77797a, 0.9), x, 0.1, -3.3, rack);
    const br = box(0.12, 3.4, 0.12, steel2, x, 7.4, -2.1, rack); br.rotation.x = 0.78;
  }
  box(132, 0.2, 0.2, steel2, 0, 9.5, -0.9, rack); box(132, 0.2, 0.2, steel2, 0, 9.5, -3.3, rack);
  function pipeX(r, mat, y, z, len = 132) { const p = cyl(r, r, len, mat, 0, y, z, rack, 32); p.rotation.z = Math.PI / 2; return p; }
  pipeX(PR, matPipeMain, PY, 0);
  for (let x = -60; x <= 60; x += 10) { const f = cyl(0.62, 0.62, 0.14, M(0xb58a08, 0.5, 0.4), x + 5.2 + (x === 0 ? 3 : 0), PY, 0, rack, 28); f.rotation.z = Math.PI / 2; }
  pipeX(0.24, M(0x2f8f4e, 0.5, 0.3), 6.72, -1.55); pipeX(0.18, M(0x2c6fb3, 0.5, 0.3), 6.66, -2.15); pipeX(0.3, M(0xb9bec2, 0.3, 0.9), 6.78, -2.8);
  pipeX(0.42, matPipe(132, 0.42), 9.07, -1.6); pipeX(0.2, M(0xb32424, 0.5, 0.3), 8.85, -2.6);
  const onPipe = (x, th, r = PR) => V(x, PY + r * Math.sin(th), r * Math.cos(th));
  const leakE = onPipe(LX, LA);
  const hole = sph(0.06, M(0x141414, 1), leakE.x, leakE.y - 0.025, leakE.z - 0.016, scene); hole.scale.set(1.5, 0.6, 0.8); hole.rotation.x = -(Math.PI / 2 - LA);
  const stain = sph(0.09, M(0x7a5a12, 1), leakE.x, leakE.y - 0.02, leakE.z - 0.013, scene); stain.scale.set(1.4, 0.06, 1); stain.rotation.x = -(Math.PI / 2 - LA);

  // ---------- planta ao fundo ----------
  (function plant() {
    const shed = MT(texShed, 0.7, 0.3), shed2 = M(0x98a2ab, 0.7, 0.3), rust = M(0x7b4a32, 0.9), conc = M(0x9a9a96, 0.95);
    box(70, 16, 30, shed, -30, 8, -48, scene);
    for (let i = 0; i < 5; i++) { const r = box(14, 3.2, 30.4, shed2, -58 + i * 14, 17.2, -48, scene); r.rotation.z = 0.22; }
    for (let i = 0; i < 9; i++) box(0.3, 15.6, 0.3, shed2, -64 + i * 8.5, 7.8, -32.8, scene);
    box(18, 6, 0.2, M(0x2c3338, 0.7), -30, 3, -32.85, scene);
    cyl(5, 6.2, 22, rust, 30, 11, -45, scene, 28); cyl(2.2, 5, 7, rust, 30, 25.5, -45, scene, 28); cyl(1.2, 1.2, 9, M(0x555b60, 0.6, 0.4), 30, 33, -45, scene, 14);
    for (let i = 0; i < 4; i++) cyl(6.4, 6.4, 0.5, M(0x3e474e, 0.6, 0.5), 30, 5 + i * 5.5, -45, scene, 28);
    for (let i = 0; i < 3; i++) { cyl(2.6, 2.6, 19, M(0xa8a39a, 0.8), 43 + i * 6.2, 9.5, -52, scene, 20); sph(2.6, M(0xa8a39a, 0.8), 43 + i * 6.2, 19, -52, scene); }
    const conv = box(34, 1.2, 2, M(0x5b666e, 0.7, 0.3), 10, 16, -45, scene); conv.rotation.z = 0.5;
    const dc = cyl(1.3, 1.3, 26, M(0x555b60, 0.6, 0.4), 37, 27, -40, scene, 16); dc.rotation.z = -0.55;
    function stack(x, z, h, r) { for (let i = 0; i < 8; i++) cyl(r * (1 - (i + 1) * 0.045), r * (1 - i * 0.045), h / 8, M(i >= 6 ? (i % 2 ? 0xc0392b : 0xf1f1ee) : 0xb7b3ab, 0.9), x, h / 16 + i * h / 8, z, scene, 18); }
    stack(62, -60, 58, 2.2); stack(-72, -62, 46, 1.8);
    cyl(9, 9, 16, M(0xc7ccd0, 0.5, 0.5), -72, 8, -22, scene, 32); for (let i = 0; i < 4; i++) cyl(9.15, 9.15, 0.35, steel2, -72, 3 + i * 4, -22, scene, 32);
    for (const x of [58, 70]) { sph(4.2, M(0xe4e6e8, 0.4, 0.3), x, 6.2, -16, scene, 28, 18); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; cyl(0.18, 0.18, 6, steel, x + Math.cos(a) * 3.4, 3, -16 + Math.sin(a) * 3.4, scene, 8); } }
    for (let x = -60; x <= 60; x += 30) { cyl(0.09, 0.12, 9, steel2, x, 4.5, 23.5, scene, 8); box(1.6, 0.1, 0.25, steel2, x, 9, 22.8, scene); }
    box(40, 5, 12, conc, 40, 2.5, -24, scene); box(12, 3.4, 8, M(0xd8d3c8, 0.9), -12, 1.7, -22, scene);
  })();
  (function gasArea() {
    const yp = matPipe(40, 0.8), yr = M(0xf2cf1f, 0.6, 0.1), deck = M(0x6d7479, 0.8, 0.3);
    function walkway(x0, x1, y, z, w) {
      const L = x1 - x0, xc = (x0 + x1) / 2;
      box(L, 0.1, w, deck, xc, y, z, scene);
      for (const s of [-1, 1]) { box(L, 0.05, 0.05, yr, xc, y + 1.1, z + s * w / 2, scene); box(L, 0.04, 0.04, yr, xc, y + 0.6, z + s * w / 2, scene); box(L, 0.14, 0.03, yr, xc, y + 0.1, z + s * w / 2, scene);
        for (let x = x0; x <= x1 + 0.01; x += 2) box(0.05, 1.1, 0.05, yr, x, y + 0.55, z + s * w / 2, scene); }
      for (let x = x0 + 1; x <= x1; x += 6) for (const s of [-1, 1]) box(0.26, y, 0.26, steel, x, y / 2, z + s * (w / 2 - 0.2), scene);
    }
    walkway(-34, 26, 5.2, -7.6, 2.2); walkway(-10, 44, 8.6, -13.5, 2.0);
    const st = box(9, 0.12, 1.1, deck, 30.2, 2.6, -7.6, scene); st.rotation.z = -0.62; for (const s of [-1, 1]) { const r = box(9, 0.05, 0.05, yr, 30.2, 3.7, -7.6 + s * 0.55, scene); r.rotation.z = -0.62; }
    function bigPipe(r, len, x, y, z, axis) { const p = cyl(r, r, len, yp, x, y, z, scene, 28); if (axis === "x") p.rotation.z = Math.PI / 2; if (axis === "z") p.rotation.x = Math.PI / 2; return p; }
    function elbow(r, R, x, y, z, rx, ry, rz) { const e = new T.Mesh(new T.TorusGeometry(R, r, 18, 22, Math.PI / 2), yp); e.position.set(x, y, z); e.rotation.set(rx, ry, rz); e.castShadow = true; scene.add(e); return e; }
    bigPipe(0.8, 46, -9, 7.4, -10.6, "x"); bigPipe(0.8, 30, 31, 11.2, -10.6, "x");
    elbow(0.8, 1.9, 14, 9.3, -10.6, 0, 0, -Math.PI / 2); elbow(0.8, 1.9, 16, 9.3, -10.6, 0, 0, Math.PI / 2);
    bigPipe(0.8, 5.5, -32, 4.65, -10.6, "y"); elbow(0.8, 1.9, -30.1, 5.5, -10.6, 0, 0, Math.PI / 2);
    bigPipe(0.65, 22, -20, 10.4, -16.5, "x"); elbow(0.65, 1.6, -9, 8.8, -16.5, 0, 0, 0); bigPipe(0.65, 8.8, -7.4, 4.4, -16.5, "y");
    bigPipe(0.55, 9, 4, 7.4, -15.1, "z"); bigPipe(0.55, 12, 46, 6, -10.6, "y");
    for (const x of [-22, -16]) { cyl(1.5, 1.5, 4.2, yp, x, 9.6, -13.6, scene, 24); cyl(1.5, 0.35, 3, yp, x, 6, -13.6, scene, 24); sph(1.5, yp, x, 11.7, -13.6, scene).scale.y = 0.45; }
    const hv = cyl(1.3, 1.3, 9, yp, 34, 6.7, -17, scene, 24); hv.rotation.z = Math.PI / 2; sph(1.3, yp, 38.5, 6.7, -17, scene).scale.x = 0.5; sph(1.3, yp, 29.5, 6.7, -17, scene).scale.x = 0.5;
    for (const x of [31, 37]) box(0.4, 5.4, 2.2, steel, x, 2.7, -17, scene);
    for (let x = -34; x <= 44; x += 13) { box(0.4, 6.6, 0.4, steel, x, 3.3, -10.6, scene); box(2.2, 0.3, 0.5, steel, x, 6.45, -10.6, scene); }
  })();
  const steam = []; for (let i = 0; i < 26; i++) steam.push(puff(0xf2f4f5));

  // ---------- alarme ----------
  const beacons = [];
  for (const [x, z, light] of [[9, 3.2, true], [-30, 3.4, true], [34, 3.4, false]]) {
    cyl(0.08, 0.1, 6.2, steel2, x, 3.1, z, scene, 10);
    box(0.5, 0.35, 0.4, M(0xd0d3d6, 0.6), x, 5.7, z, scene);
    const horn = cyl(0.26, 0.07, 0.45, M(0xb9bcbf, 0.5, 0.4), x, 5.7, z + 0.42, scene, 16); horn.rotation.x = Math.PI / 2;
    const mat = new T.MeshStandardMaterial({ color: 0x7a1010, emissive: 0xff1a0a, emissiveIntensity: 0, roughness: 0.3 });
    const b = cyl(0.17, 0.19, 0.3, mat, x, 6.38, z, scene, 16); b.castShadow = false;
    let pl = null; if (light) { pl = new T.PointLight(0xff2a14, 0, 34, 1.6); pl.position.set(x, 6.5, z); scene.add(pl); }
    beacons.push({ mat, pl, ph: x * 0.37 });
  }
  function makeSock(len) {
    const g = new T.Group(); const n = 5;
    for (let i = 0; i < n; i++) { const r0 = 0.3 - i * 0.04, r1 = 0.3 - (i + 1) * 0.04; const s = cyl(r1, r0, len / n, M(i % 2 ? 0xf4f1ea : 0xf2681c, 0.9, 0, { side: T.DoubleSide }), len / n * (i + 0.5), 0, 0, g, 14, true); s.rotation.z = -Math.PI / 2; }
    return g;
  }
  const sockArea = makeSock(1.7); cyl(0.07, 0.09, 8.2, steel2, 15, 4.1, 4.4, scene, 10); sockArea.position.set(15, 8.1, 4.4); scene.add(sockArea);

  // ---------- trabalhador articulado (braços e pernas com cinemática inversa) ----------
  const YA = V(0, 1, 0);
  function seg(r0, r1, mat, parent) { const m = new T.Mesh(new T.CylinderGeometry(r1, r0, 1, 12).translate(0, 0.5, 0), mat); m.castShadow = true; parent.add(m); return m; }
  function setSeg(m, A, B) { const d = B.clone().sub(A), l = d.length(); m.position.copy(A); m.quaternion.setFromUnitVectors(YA, d.divideScalar(l || 1)); m.scale.set(1, l, 1); }
  function ik(S, Tg, a, b, pole) {
    const d = Tg.clone().sub(S); let L = d.length(); const Lc = clamp(L, Math.abs(a - b) + 0.01, a + b - 0.004); d.multiplyScalar(1 / (L || 1));
    const ca = (a * a + Lc * Lc - b * b) / (2 * a * Lc), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const p = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
    const E = S.clone().addScaledVector(d, a * ca).addScaledVector(p, a * sa);
    return { E, H: S.clone().addScaledVector(d, Lc) };
  }
  function makeWorker(o) {
    const suit = M(o.suit || 0x1d2f55, 0.85), stripe = M(0xd9ec3a, 0.5, 0, { emissive: 0x3a4208 }), skin = M(0xb98a68, 0.75), boot = M(0x1a1a1a, 0.7), glove = M(o.glove || 0xe3c53f, 0.75);
    const web = M(0x18191b, 0.8), webY = M(0xe8b800, 0.7);
    const g = new T.Group(); const upper = new T.Group(); upper.position.y = 0.9; g.add(upper);
    // tronco
    const torso = new T.Mesh(new T.CapsuleGeometry(0.15, 0.3, 6, 16), o.vest ? M(0xee6f12, 0.8) : suit); torso.position.y = 0.33; torso.scale.set(1.28, 1, 0.84); torso.castShadow = true; upper.add(torso);
    const hipM = new T.Mesh(new T.SphereGeometry(0.17, 14, 10), suit); hipM.position.y = 0.02; hipM.scale.set(1.2, 0.8, 0.85); hipM.castShadow = true; upper.add(hipM);
    for (const y of [0.2, 0.43]) { const s = cyl(0.153, 0.153, 0.045, stripe, 0, y, 0, upper, 18); s.scale.set(1.29, 1, 0.85); s.castShadow = false; }
    const belt = cyl(0.156, 0.156, 0.06, web, 0, 0.06, 0, upper, 18); belt.scale.set(1.3, 1, 0.87);
    // cabeça
    const head = new T.Group(); head.position.y = 0.8; upper.add(head);
    sph(0.115, skin, 0, 0, 0, head).scale.set(0.92, 1.08, 1); cyl(0.055, 0.065, 0.1, skin, 0, -0.13, 0, head, 12);
    const hcol = M(o.helmet || 0xf4f4f0, 0.35, 0.05);
    const helm = new T.Mesh(new T.SphereGeometry(0.142, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hcol); helm.position.y = 0.035; helm.scale.set(1, 0.95, 1.12); helm.castShadow = true; head.add(helm);
    const brim = cyl(0.15, 0.15, 0.015, hcol, 0, 0.04, 0.05, head, 20); brim.scale.set(1, 1, 1.25);
    box(0.03, 0.03, 0.26, hcol, 0, 0.165, 0, head);
    box(0.16, 0.05, 0.02, M(0x101010, 0.2, 0.3), 0, 0.005, 0.105, head);          // óculos
    const strapJ = new T.Mesh(new T.TorusGeometry(0.118, 0.006, 6, 20, Math.PI), web); strapJ.rotation.z = Math.PI; strapJ.position.y = 0.03; head.add(strapJ);
    // máscara facial
    const mask = new T.Group(); head.add(mask); mask.visible = false;
    const visor = new T.Mesh(new T.SphereGeometry(0.128, 20, 14, 0, Math.PI, 0.3, 1.85), new T.MeshStandardMaterial({ color: 0xa8d4e8, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.5, envMapIntensity: 1.2 }));
    visor.rotation.y = -Math.PI / 2; visor.position.z = 0.015; mask.add(visor);
    const rim = new T.Mesh(new T.TorusGeometry(0.12, 0.017, 8, 24), M(0x121212, 0.6)); rim.position.set(0, -0.01, 0.06); rim.scale.y = 1.15; mask.add(rim);
    const reg = cyl(0.048, 0.048, 0.07, M(0x121212, 0.5), 0, -0.1, 0.14, mask, 14); reg.rotation.x = Math.PI / 2;
    cyl(0.03, 0.03, 0.05, M(0xe0b000, 0.5), 0, -0.1, 0.18, mask, 12).rotation.x = Math.PI / 2;
    const mstrap = new T.Mesh(new T.TorusGeometry(0.125, 0.011, 6, 22), M(0x121212, 0.8)); mstrap.rotation.x = Math.PI / 2; mstrap.position.y = -0.02; mask.add(mstrap);
    const tr = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V(0, 0.68, 0.15), V(0.1, 0.5, 0.19), V(0.2, 0.25, 0.16), V(0.24, 0.06, 0.08)]), 14, 0.02, 8), M(0x121212, 0.6)); upper.add(tr); tr.visible = false;
    // cilindro de fuga na cintura
    const kit = cyl(0.05, 0.05, 0.28, M(0xe7c21a, 0.4, 0.3), -0.2, 0.0, -0.12, upper, 12); kit.rotation.z = 0.25;
    // cinto de segurança tipo paraquedista
    if (o.harness) {
      for (const s of [-1, 1]) {
        const f = box(0.045, 0.56, 0.012, web, s * 0.085, 0.36, 0.132, upper); f.rotation.z = -s * 0.08; box(0.012, 0.56, 0.012, webY, s * 0.085, 0.36, 0.139, upper).rotation.z = -s * 0.08;
        const b = box(0.045, 0.56, 0.012, web, s * 0.07, 0.36, -0.132, upper); b.rotation.z = s * 0.16;
        const sh = box(0.05, 0.02, 0.27, web, s * 0.105, 0.635, 0, upper);
      }
      box(0.24, 0.04, 0.012, web, 0, 0.44, 0.136, upper); box(0.05, 0.05, 0.02, M(0xc0c4c8, 0.3, 0.9), 0, 0.44, 0.146, upper);
      const wb = cyl(0.158, 0.158, 0.05, web, 0, 0.12, 0, upper, 18); wb.scale.set(1.31, 1, 0.88);
      const dr = new T.Mesh(new T.TorusGeometry(0.035, 0.008, 6, 14), M(0xc0c4c8, 0.3, 0.9)); dr.position.set(0, 0.5, -0.148); upper.add(dr);
      box(0.1, 0.1, 0.014, webY, 0, 0.5, -0.138, upper);
    }
    // braços
    const arms = [];
    for (const s of [-1, 1]) {
      const a = { s, S: V(s * 0.245, 0.585, 0) };
      sph(0.075, suit, a.S.x, a.S.y, 0, upper);
      a.up = seg(0.062, 0.052, suit, upper); a.fo = seg(0.05, 0.042, suit, upper); a.el = sph(0.052, suit, 0, 0, 0, upper, 10, 8);
      a.hand = sph(0.05, glove, 0, 0, 0, upper, 12, 10); a.hand.scale.set(0.85, 1.25, 0.6);
      a.cuff = seg(0.047, 0.047, stripe, upper);
      arms.push(a);
    }
    // pernas
    const legs = [];
    for (const s of [-1, 1]) {
      const l = { s };
      l.th = seg(0.088, 0.07, suit, g); l.sh = seg(0.068, 0.055, suit, g); l.kn = sph(0.07, suit, 0, 0, 0, g, 10, 8); l.cuff = seg(0.064, 0.06, stripe, g);
      l.boot = box(0.11, 0.1, 0.27, boot, 0, 0, 0, g);
      if (o.harness) { l.loop = seg(0.093, 0.09, web, g); }
      legs.push(l);
    }
    const carry = box(0.42, 0.3, 0.16, M(0x16181a, 0.55), 0, 0, 0, upper); carry.visible = false;
    const radio = box(0.05, 0.14, 0.035, M(0x111111, 0.6), 0, 0, 0, upper); radio.visible = false;
    const tool = new T.Group(); upper.add(tool); tool.visible = false;
    scene.add(g);
    const w = {
      g, upper, head, mask, tr, carry, radio, tool, arms,
      pose(p) {
        const sq = p.squat || 0, hipY = 0.9 - sq * 0.3;
        upper.position.y = hipY; upper.rotation.x = p.lean || 0; upper.rotation.y = p.twist || 0;
        head.rotation.x = p.headX || 0; head.rotation.y = p.headY || 0;
        g.updateWorldMatrix(true, false); upper.updateMatrix(); upper.updateWorldMatrix(false, false);
        const wk = p.walk;
        arms.forEach((a, i) => {
          const sw = wk !== undefined ? Math.sin(wk) * (a.s < 0 ? -1 : 1) : 0;
          let Tg = V(a.s * 0.3, 0.06 + Math.abs(sw) * 0.04, 0.05 + sw * 0.24);
          const loc = i ? p.locR : p.locL, wd = i ? p.handR : p.handL, wt = i ? p.wR : p.wL;
          if (loc) Tg.lerp(loc, wt === undefined ? 1 : wt);
          if (wd && (wt === undefined || wt > 0)) Tg.lerp(upper.worldToLocal(wd.clone()), wt === undefined ? 1 : wt);
          const r = ik(a.S, Tg, 0.29, 0.27, V(a.s * 0.5, -0.6, -0.65));
          setSeg(a.up, a.S, r.E); setSeg(a.fo, r.E, r.H); a.el.position.copy(r.E); a.hand.position.copy(r.H).addScaledVector(r.H.clone().sub(r.E).normalize(), 0.04);
          a.hand.quaternion.copy(a.fo.quaternion);
          setSeg(a.cuff, r.E.clone().lerp(r.H, 0.72), r.E.clone().lerp(r.H, 0.86)); a.H = a.hand.position;
        });
        legs.forEach((l) => {
          const ph = wk !== undefined ? wk + (l.s > 0 ? Math.PI : 0) : null;
          const F = V(l.s * 0.105, 0.09 + (ph !== null ? Math.max(0, Math.cos(ph)) * 0.11 : 0), ph !== null ? Math.sin(ph) * 0.3 : 0.02 * l.s);
          const Hp = V(l.s * 0.1, hipY, 0);
          const r = ik(Hp, F, 0.43, 0.42, V(0, 0, 1));
          setSeg(l.th, Hp, r.E); setSeg(l.sh, r.E, r.H); l.kn.position.copy(r.E); l.boot.position.set(r.H.x, r.H.y - 0.04, r.H.z + 0.05);
          setSeg(l.cuff, r.E.clone().lerp(r.H, 0.6), r.E.clone().lerp(r.H, 0.72));
          if (l.loop) setSeg(l.loop, Hp.clone().lerp(r.E, 0.3), Hp.clone().lerp(r.E, 0.4));
        });
        if (carry.visible) carry.position.copy(arms[1].H).add(V(0, -0.2, 0));
        if (radio.visible) radio.position.copy(arms[0].H).add(V(0, 0.07, 0.03));
        if (tool.visible) { tool.position.copy(arms[1].H); tool.quaternion.copy(arms[1].fo.quaternion); }
      },
      setMask(v) { mask.visible = v; tr.visible = v; },
    };
    return w;
  }
  function pathAt(pts, a, b, t) {
    const k = clamp((t - a) / (b - a)); let L = 0; const sg = [];
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); sg.push(d); L += d; }
    let d = k * L, i = 0; while (i < sg.length - 1 && d > sg[i]) { d -= sg[i]; i++; }
    const f = sg[i] ? d / sg[i] : 0, dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1];
    return { x: lerp(pts[i][0], pts[i + 1][0], f), z: lerp(pts[i][1], pts[i + 1][1], f), heading: Math.atan2(dx, dz), dist: k * L, moving: k > 0 && k < 1 };
  }

  // ---------- caminhonete ----------
  function makeTruck() {
    const g = new T.Group(); const white = M(0xeeefed, 0.3, 0.3), dark = M(0x1c2126, 0.3, 0.4), glass = new T.MeshStandardMaterial({ color: 0x1b252d, roughness: 0.05, metalness: 0.8, envMapIntensity: 1.3 });
    box(5.3, 0.6, 1.85, white, 0, 0.82, 0, g); box(1.5, 0.35, 1.8, white, 1.85, 1.28, 0, g);
    box(2.1, 0.78, 1.78, white, 0.15, 1.5, 0, g); box(1.8, 0.5, 1.8, glass, 0.15, 1.58, 0, g); box(0.05, 0.55, 1.6, glass, 1.21, 1.56, 0, g);
    box(1.9, 0.45, 0.06, white, -1.7, 1.33, 0.9, g); box(1.9, 0.45, 0.06, white, -1.7, 1.33, -0.9, g); box(0.06, 0.45, 1.8, white, -2.62, 1.33, 0, g);
    box(5.34, 0.16, 1.9, M(0xe7c21a, 0.6), 0, 0.6, 0, g); box(0.12, 0.3, 1.9, dark, 2.66, 0.62, 0, g);
    for (const z of [-0.6, 0.6]) box(0.06, 0.16, 0.34, M(0xfff6c8, 0.2, 0, { emissive: 0xfff0a0, emissiveIntensity: 0.9 }), 2.67, 0.95, z, g);
    const wheels = [];
    for (const x of [1.75, -1.6]) for (const z of [-0.9, 0.9]) { const w = cyl(0.42, 0.42, 0.3, M(0x15171a, 0.9), x, 0.42, z, g, 22); w.rotation.x = Math.PI / 2; cyl(0.22, 0.22, 0.31, M(0xb9bcbf, 0.3, 0.8), 0, 0, 0, w, 14); wheels.push(w); }
    const bm = new T.MeshStandardMaterial({ color: 0xa35a00, emissive: 0xff9a00, emissiveIntensity: 0 }); box(1.1, 0.1, 0.22, bm, 0.15, 1.95, 0, g);
    scene.add(g); return { g, wheels, bm };
  }
  // ---------- carretinha ----------
  function makeTrailer() {
    const g = new T.Group(); const yel = M(0xe2b419, 0.6, 0.1), blk = M(0x1d1f21, 0.7, 0.2), red = M(0xb01f23, 0.35, 0.3);
    const L = 2.8, Wd = 1.6, Hh = 1.55, y0 = 0.62;
    box(L, 0.1, Wd, M(0x5a4634, 0.9), 0, y0, 0, g); box(L + 0.1, 0.12, Wd + 0.1, yel, 0, y0 - 0.1, 0, g);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) { const sl = box(L - 0.16, 0.13, 0.03, blk, 0, y0 + 0.17 + i * 0.155, s * (Wd / 2 - 0.02), g); sl.rotation.x = s * 0.5; }
      for (const x of [-L / 2 + 0.04, 0, L / 2 - 0.04]) box(0.08, Hh, 0.08, yel, x, y0 + Hh / 2, s * (Wd / 2 - 0.02), g);
      box(L, 0.08, 0.08, yel, 0, y0 + Hh, s * (Wd / 2 - 0.02), g);
      box(0.085, 0.5, 0.085, M(0xd92525, 0.5), -L / 2 + 0.04, y0 + 0.3, s * (Wd / 2 - 0.02), g); box(0.086, 0.16, 0.086, M(0xf5f5f5, 0.5), -L / 2 + 0.04, y0 + 0.3, s * (Wd / 2 - 0.02), g);
    }
    box(0.05, Hh, Wd, blk, L / 2 - 0.03, y0 + Hh / 2, 0, g);
    const roof = cyl(Wd / 2 + 0.12, Wd / 2 + 0.12, L + 0.3, blk, 0, y0 + Hh - 0.02, 0, g, 24); roof.rotation.z = Math.PI / 2; roof.scale.set(0.22, 1, 1);
    const shut = cyl(0.1, 0.1, Wd - 0.1, blk, -L / 2 + 0.1, y0 + Hh - 0.12, 0, g, 12); shut.rotation.x = Math.PI / 2;
    box(0.06, 0.07, Wd, yel, -L / 2 + 0.03, y0 + Hh, 0, g);
    const tank = cyl(0.34, 0.34, 1.0, red, -0.55, y0 + 0.45, 0.1, g, 24); tank.rotation.x = Math.PI / 2;
    sph(0.34, red, -0.55, y0 + 0.45, 0.6, g).scale.z = 0.45; sph(0.34, red, -0.55, y0 + 0.45, -0.4, g).scale.z = 0.45;
    const eng = new T.Group(); eng.position.set(-0.45, y0 + 1.0, 0.05); g.add(eng);
    box(0.5, 0.42, 0.46, M(0xc22a2a, 0.4, 0.3), 0, 0, 0, eng); box(0.3, 0.2, 0.3, blk, 0, 0.3, 0, eng); cyl(0.14, 0.14, 0.08, blk, -0.1, 0, 0.28, eng, 16).rotation.x = Math.PI / 2;
    cyl(0.03, 0.03, 0.35, M(0x888888, 0.4, 0.8), 0.2, 0.35, -0.15, eng, 8);
    const gauge = cyl(0.07, 0.07, 0.03, M(0xf5f5f5, 0.3), -0.9, y0 + 0.85, 0.1, g, 16); gauge.rotation.z = Math.PI / 2;
    const coil = new T.Mesh(new T.TorusGeometry(0.3, 0.07, 10, 24), M(0x111111, 0.7)); coil.position.set(-0.7, y0 + 0.75, -Wd / 2 + 0.16); g.add(coil);
    const wheels = []; for (const z of [-0.92, 0.92]) { const w = cyl(0.33, 0.33, 0.2, M(0x15171a, 0.9), -0.1, 0.33, z, g, 20); w.rotation.x = Math.PI / 2; cyl(0.17, 0.17, 0.21, M(0xb9bcbf, 0.3, 0.8), 0, 0, 0, w, 12); wheels.push(w); box(0.9, 0.05, 0.26, blk, -0.1, 0.72, z, g); }
    box(2.0, 0.09, 0.09, blk, L / 2 + 0.9, 0.5, 0, g);
    cyl(0.035, 0.035, 0.5, M(0x777777, 0.4, 0.7), L / 2 + 0.7, 0.25, 0.12, g, 8);
    const chocks = new T.Group(); g.add(chocks); for (const dx of [-0.43, 0.43]) { const c = box(0.2, 0.16, 0.22, M(0xf0c40f, 0.8), -0.1 + dx, 0.08, 0.92, chocks); c.rotation.z = dx > 0 ? 0.5 : -0.5; }
    cyl(0.025, 0.025, 1.6, M(0x888888, 0.4, 0.7), L / 2 - 0.15, y0 + Hh + 0.8, Wd / 2 - 0.1, g, 8);
    const sock = makeSock(0.9); sock.scale.setScalar(0.75); sock.position.set(L / 2 - 0.15, y0 + Hh + 1.5, Wd / 2 - 0.1); g.add(sock);
    scene.add(g); return { g, wheels, chocks, eng, sock };
  }
  // ---------- plataforma elevatória ----------
  function makeLift() {
    const g = new T.Group(); const org = M(0xb0202a, 0.4, 0.3), dk = M(0x2a2e33, 0.6, 0.4), gr = M(0xd9dcde, 0.4, 0.5);
    box(3.7, 0.6, 1.9, dk, 0, 0.8, 0, g); box(2.2, 0.35, 2.1, dk, 0, 0.55, 0, g);
    const wheels = []; for (const x of [-1.3, 1.3]) for (const z of [-1.05, 1.05]) { const w = cyl(0.5, 0.5, 0.36, M(0x15171a, 0.9), x, 0.5, z, g, 22); w.rotation.x = Math.PI / 2; cyl(0.25, 0.25, 0.37, org, 0, 0, 0, w, 14); wheels.push(w); }
    const turret = new T.Group(); turret.position.set(-0.9, 1.1, 0); g.add(turret);
    box(2.0, 0.75, 1.7, org, 0.2, 0.4, 0, turret); box(0.9, 0.6, 1.72, dk, -0.9, 0.5, 0, turret);
    const bm = new T.MeshStandardMaterial({ color: 0xa35a00, emissive: 0xff9a00, emissiveIntensity: 0 }); cyl(0.07, 0.07, 0.12, bm, 0.6, 0.86, 0.6, turret, 12);
    const boom = new T.Group(); g.add(boom);
    const b1 = new T.Mesh(new T.BoxGeometry(0.42, 0.46, 1).translate(0, 0, 0.5), org); b1.castShadow = true; boom.add(b1);
    const b2 = new T.Mesh(new T.BoxGeometry(0.3, 0.34, 1).translate(0, 0, 0.5), gr); b2.castShadow = true; boom.add(b2);
    const basket = new T.Group(); g.add(basket);
    const rail = M(0xb0202a, 0.4, 0.4);
    box(1.9, 0.06, 0.95, dk, 0, -0.4, -0.55, basket);
    const tube = (x0, y0, z0, x1, y1, z1) => { const m = seg(0.022, 0.022, rail, basket); setSeg(m, V(x0, y0, z0), V(x1, y1, z1)); m.castShadow = true; };
    for (const x of [-0.93, 0.93]) for (const z of [-0.1, -1.0]) tube(x, -0.4, z, x, 0.72, z);
    for (const y of [0.15, 0.72]) { for (const z of [-0.1, -1.0]) tube(-0.93, y, z, 0.93, y, z); for (const x of [-0.93, 0.93]) tube(x, y, -1.0, x, y, -0.1); }
    box(1.9, 0.14, 0.03, rail, 0, -0.3, -1.0, basket); box(0.4, 0.3, 0.12, dk, 0, 0.55, -0.02, basket); box(0.3, 0.5, 0.25, dk, 0, -0.1, 0.02, basket);
    // bandeja com os potes da massa (componentes A e B)
    box(0.34, 0.02, 0.5, dk, 0.76, 0.74, -0.55, basket);
    for (const [z, c] of [[-0.68, 0xe8c010], [-0.44, 0x2a2a2a]]) { cyl(0.075, 0.065, 0.12, M(0xf4f4f0, 0.5), 0.76, 0.81, z, basket, 18); cyl(0.068, 0.068, 0.01, M(c, 0.8), 0.76, 0.868, z, basket, 18); }
    // ponto de ancoragem dos talabartes
    for (const x of [-0.45, 0.45]) { const a = new T.Mesh(new T.TorusGeometry(0.03, 0.008, 6, 12), M(0xe8b800, 0.4, 0.6)); a.position.set(x, 0.15, -0.06); basket.add(a); }
    scene.add(g); return { g, wheels, turret, boom, b1, b2, basket, bm };
  }
  const truck = makeTruck(), trailer = makeTrailer(), lift = makeLift();
  const TZ = 17, LZ = 8;
  // mesa dobrável + maleta
  const table = new T.Group(); scene.add(table); table.position.set(-17.8, 0, 15.6);
  box(0.9, 0.04, 0.6, M(0x23262a, 0.5, 0.3), 0, 0.74, 0, table);
  for (const s of [-1, 1]) { box(0.035, 0.95, 0.035, M(0x23262a, 0.5, 0.4), 0, 0.37, s * 0.25, table).rotation.z = 0.55; box(0.035, 0.95, 0.035, M(0x23262a, 0.5, 0.4), 0, 0.37, s * 0.25, table).rotation.z = -0.55; }
  const maleta = new T.Group(); table.add(maleta); maleta.position.set(0, 0.76, 0);
  box(0.62, 0.42, 0.24, M(0x16181a, 0.45, 0.1), 0, 0.21, 0, maleta); box(0.2, 0.05, 0.05, M(0x16181a, 0.5), 0, 0.45, 0, maleta);
  const dispMat = new T.MeshStandardMaterial({ color: 0x0c1a2a, emissive: 0x35c8ff, emissiveIntensity: 0 }); box(0.2, 0.09, 0.01, dispMat, -0.05, 0.27, -0.123, maleta);
  const ledMat = new T.MeshStandardMaterial({ color: 0x0c2a10, emissive: 0x30ff50, emissiveIntensity: 0 }); box(0.07, 0.09, 0.01, ledMat, 0.17, 0.2, -0.123, maleta); box(0.1, 0.04, 0.01, M(0xf2d21a, 0.6), 0.17, 0.3, -0.123, maleta);
  for (const y of [0.12, 0.2, 0.28, 0.36]) cyl(0.012, 0.012, 0.05, M(0xb9bcbf, 0.3, 0.9), -0.33, y, 0, maleta, 8).rotation.z = Math.PI / 2;
  // cones e tela
  const conePts = [[-26, 18], [-26, 14.7], [-26, 11.3], [-26, 8]]; const cones = [], fences = [];
  conePts.forEach(([x, z], i) => {
    const c = new T.Group(); c.position.set(x, 0, z); scene.add(c);
    box(0.36, 0.03, 0.36, M(0x1c1c1c, 0.9), 0, 0.015, 0, c); cyl(0.035, 0.15, 0.72, M(0xf2681c, 0.6), 0, 0.39, 0, c, 18); cyl(0.075, 0.1, 0.14, M(0xf5f5f5, 0.5), 0, 0.45, 0, c, 18);
    cyl(0.02, 0.02, 1.05, M(0xf2681c, 0.7), 0, 0.52, 0, c, 8); cones.push(c);
    if (i > 0) { const f = box(0.02, 0.8, Math.abs(z - conePts[i - 1][1]), new T.MeshStandardMaterial({ color: 0xf2681c, transparent: true, opacity: 0.62, roughness: 0.9, side: T.DoubleSide }), x, 0.62, (z + conePts[i - 1][1]) / 2, scene); f.castShadow = false; fences.push(f); }
  });
  // mangueiras
  const hoseY = new T.Mesh(new T.BufferGeometry(), M(0xe0b000, 0.5)); scene.add(hoseY); hoseY.castShadow = true;
  const hoseB = [0, 1].map(() => { const m = new T.Mesh(new T.BufferGeometry(), M(0x1f8fd6, 0.45)); m.castShadow = true; scene.add(m); return m; });
  function setHose(mesh, pts, fr, r) {
    mesh.geometry.dispose(); if (fr <= 0.02) { mesh.visible = false; return; } mesh.visible = true;
    const full = new T.CatmullRomCurve3(pts, false, "centripetal").getPoints(70), n = Math.max(3, Math.ceil(fr * 70));
    mesh.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(full.slice(0, n + 1)), n * 2, r, 8);
  }
  // equipe
  const NAVY = 0x1d2f55, BLUE = 0x1f4fb0;
  const wA = makeWorker({ suit: NAVY, helmet: BLUE, harness: true }), wB = makeWorker({ suit: NAVY, helmet: BLUE, harness: true, glove: 0xf2f0e6 });
  const wC = makeWorker({ suit: NAVY, vest: true }), wD = makeWorker({ suit: NAVY, vest: true });
  scene.remove(wA.g); lift.basket.add(wA.g); wA.g.rotation.y = Math.PI;
  wC.carry.visible = true; wD.radio.visible = true;
  // ferramentas na mão do operador A: marcador e lixa
  const pen = cyl(0.012, 0.012, 0.14, M(0xf5f5f5, 0.4), 0, 0.1, 0, wA.tool, 8); const sand = box(0.12, 0.035, 0.08, M(0x7a4a2a, 0.9), 0, 0.09, 0.0, wA.tool);
  // talabartes (cinto paraquedista atracado no cesto)
  const lan = [-0.45, 0.45].map(() => { const m = new T.Mesh(new T.BufferGeometry(), M(0xe8b800, 0.7)); lift.basket.add(m); const ab = box(0.05, 0.12, 0.03, M(0x18191b, 0.8), 0, 0, 0, lift.basket); return { m, ab }; });
  function setLan(i, w, vis) {
    const L = lan[i]; L.m.visible = L.ab.visible = vis; if (!vis) return;
    lift.basket.updateWorldMatrix(true, false);
    const d = lift.basket.worldToLocal(w.upper.localToWorld(V(0, 0.5, -0.16))), a = V(i ? 0.45 : -0.45, 0.15, -0.06);
    const mid = d.clone().lerp(a, 0.5).add(V(0, -0.16, 0.08));
    L.m.geometry.dispose(); L.m.geometry = new T.TubeGeometry(new T.CatmullRomCurve3([d, mid, a]), 14, 0.012, 6);
    L.ab.position.copy(d.clone().lerp(mid, 0.6));
  }

  // ---------- reparo: demarcação, lixamento, massa, placa, cintas, acabamento ----------
  const TH0 = 0.42, TH1 = 1.58, XH = 0.34;               // área demarcada
  const arcGeo = (r, len, t0, tl) => new T.CylinderGeometry(r, r, len, 28, 1, true, t0, tl).rotateZ(Math.PI / 2);
  const chalk = M(0xf8f8f4, 0.9); const marks = [];
  (function () {
    const N = 16;
    for (let i = 0; i < N; i++) marks.push({ p: (i + 0.5) / N * 0.22, m: box(2 * XH / N, 0.006, 0.014, chalk, LX - XH + (i + 0.5) * 2 * XH / N, 0, 0, scene), th: TH0 });
    for (let i = 0; i < N; i++) marks.push({ p: 0.22 + (i + 0.5) / N * 0.28, m: box(0.014, 0.006, PR * (TH1 - TH0) / N, chalk, LX + XH, 0, 0, scene), th: lerp(TH0, TH1, (i + 0.5) / N) });
    for (let i = 0; i < N; i++) marks.push({ p: 0.5 + (i + 0.5) / N * 0.22, m: box(2 * XH / N, 0.006, 0.014, chalk, LX + XH - (i + 0.5) * 2 * XH / N, 0, 0, scene), th: TH1 });
    for (let i = 0; i < N; i++) marks.push({ p: 0.72 + (i + 0.5) / N * 0.28, m: box(0.014, 0.006, PR * (TH1 - TH0) / N, chalk, LX - XH, 0, 0, scene), th: lerp(TH1, TH0, (i + 0.5) / N) });
    for (const k of marks) { const x = k.m.position.x; const pg = new T.Group(); pg.position.set(x, PY, 0); pg.rotation.x = -(k.th - Math.PI / 2) - Math.PI / 2 + Math.PI / 2; scene.add(pg); scene.remove(k.m); pg.add(k.m); k.m.position.set(0, 0, 0); pg.rotation.x = Math.PI / 2 - k.th; k.m.position.set(0, PR + 0.003, 0); k.m.castShadow = false; k.m.visible = false; }
  })();
  function penPos(p) {
    if (p < 0.22) return onPipe(lerp(LX - XH, LX + XH, p / 0.22), TH0, PR + 0.01);
    if (p < 0.5) return onPipe(LX + XH, lerp(TH0, TH1, (p - 0.22) / 0.28), PR + 0.01);
    if (p < 0.72) return onPipe(lerp(LX + XH, LX - XH, (p - 0.5) / 0.22), TH1, PR + 0.01);
    return onPipe(LX - XH, lerp(TH1, TH0, (p - 0.72) / 0.28), PR + 0.01);
  }
  const sandMat = new T.MeshStandardMaterial({ color: 0xa7a9ab, roughness: 0.38, metalness: 0.85, transparent: true, opacity: 0, envMapIntensity: 0.9 });
  const sanded = new T.Mesh(arcGeo(PR + 0.0025, 2 * XH - 0.03, TH0 + 0.02, TH1 - TH0 - 0.04), sandMat); sanded.position.set(LX, PY, 0); scene.add(sanded);
  const dust = []; for (let i = 0; i < 16; i++) dust.push(puff(0xc9b56a));
  // massa bicomponente
  const PUTTY = 0x8d9a35;
  const puttyMat = new T.MeshStandardMaterial({ color: 0xe8c010, roughness: 0.75 });
  const putty = new T.Mesh(new T.SphereGeometry(0.06, 18, 14), puttyMat); scene.add(putty); putty.castShadow = true;
  const puttyDk = []; for (let i = 0; i < 5; i++) { const d = new T.Mesh(new T.SphereGeometry(0.034, 12, 10), M(0x262626, 0.8)); putty.add(d); puttyDk.push(d); }
  // placa
  const PTH0 = 0.47, PTL = 1.06, PC = V(0, 0.538 * Math.sin(LA), 0.538 * Math.cos(LA));
  const plateG = (r, len, t0, tl) => arcGeo(r, len, t0, tl).translate(-PC.x, -PC.y, -PC.z);
  function makePlate() {
    const g = new T.Group();
    const a = new T.Mesh(plateG(0.538, 0.6, PTH0, PTL), M(0xecc818, 0.5, 0.2, { side: T.DoubleSide })); a.castShadow = true; g.add(a);
    const b = new T.Mesh(plateG(0.531, 0.6, PTH0, PTL), M(0x8a8f93, 0.45, 0.7, { side: T.DoubleSide })); g.add(b);
    return g;
  }
  const plateCarried = makePlate(); lift.basket.add(plateCarried); plateCarried.position.set(-0.05, 0.42, -0.2); plateCarried.rotation.x = -1.35;
  const plateWorld = makePlate(); scene.add(plateWorld); plateWorld.visible = false;
  const innerPutty = new T.Mesh(plateG(0.525, 0.56, PTH0 + 0.03, PTL - 0.06), new T.MeshStandardMaterial({ color: PUTTY, roughness: 0.8, side: T.DoubleSide })); plateWorld.add(innerPutty);
  const PLATE_ON = V(LX, PY, 0).add(PC);
  // cintas
  const straps = [-0.19, 0.19].map((dx) => {
    const g = new T.Group(); g.position.set(LX + dx, PY, 0); scene.add(g); const segs = []; const N = 64;
    for (let i = 0; i < N; i++) { const p = new T.Group(); p.rotation.x = -(i + 0.5) / N * Math.PI * 2; g.add(p); const s = box(0.06, 0.062, 0.008, M(0xe85d0c, 0.75), 0, 0, 1, p); s.castShadow = false; segs.push(s); p.visible = false; }
    const rat = new T.Group(); rat.rotation.x = -0.2; g.add(rat); const rb = box(0.08, 0.13, 0.045, M(0x30343a, 0.35, 0.8), 0, 0, 1, rat); rat.visible = false;
    return { g, segs, rat, rb };
  });
  // massa de acabamento sobre a placa
  const finMat = new T.MeshStandardMaterial({ color: PUTTY, roughness: 0.85, side: T.DoubleSide });
  const finish = new T.Mesh(arcGeo(0.5465, 0.78, PTH0 - 0.1, PTL + 0.2), finMat); finish.position.set(LX, PY, 0); scene.add(finish); finish.visible = false;
  const finRim = new T.Mesh(new T.TorusGeometry(0.02, 0.014, 6, 4), finMat); // não usado, mantido simples
  // gás
  const GN = 170, gas = []; for (let i = 0; i < GN; i++) gas.push(puff(0xeef2dc));
  const exh = []; for (let i = 0; i < 12; i++) exh.push(puff(0x55585c));
  const G = (t) => t < 3.5 ? 0 : t < 4.2 ? (t - 3.5) / 0.7 : t < 76.9 ? 1 : t < 78.6 ? lerp(1, 0.3, (t - 76.9) / 1.7) : t < 83.6 ? 0.3 : t < 85.4 ? lerp(0.3, 0, (t - 83.6) / 1.8) : 0;

  // ---------- câmeras ----------
  let basketW = V(0, 0, 0);
  const shots = [
    { a: 0, b: 6, p0: [-46, 17, 58], p1: [-33, 13, 44], t0: [-4, 8, -6], t1: [0, 7.5, -2] },
    { a: 6, b: 10, p0: [-3.6, 8.3, 6.6], p1: [-2.6, 8.0, 5.4], t0: [0.6, 7.5, 0], t1: [0.8, 7.7, 0] },
    { a: 10, b: 13, p0: [3.2, 1.7, 11.5], p1: [4.4, 2.1, 10.4], t0: [10.5, 6.6, 3.6], t1: [10.8, 6.8, 3.6] },
    { a: 13, b: 22, p0: [-34, 2.6, 31], p1: [-14, 4.2, 33], tf: (t) => V(lerp(-52, -14, sm(13, 21, t)), 1.6, 13.5) },
    { a: 22, b: 30, p0: [-8.5, 4.6, 1.8], p1: [-12.5, 3.7, 4.2], t0: [-17.5, 1.1, 15], t1: [-18, 1.1, 15.2] },
    { a: 30, b: 37, p0: [-21.6, 2.0, 12.6], p1: [-20.6, 1.75, 13.5], t0: [-17.3, 1.05, 16.3], t1: [-17.4, 1.0, 16.2] },
    { a: 37, b: 42, p0: [-13.9, 2.75, 6.2], p1: [-14.4, 2.65, 6.6], t0: [-16.3, 2.45, 8], t1: [-16.3, 2.45, 8] },
    { a: 42, b: 52.5, p0: [11, 4.5, 13.5], p1: [8.5, 8.8, 10], tf: () => basketW.clone().add(V(0, 0.6, 0)) },
    { a: 52.5, b: 55.5, p0: [-21.4, 1.85, 19.0], p1: [-21.0, 1.9, 18.7], t0: [-6, 3.8, 6], t1: [-6, 4.0, 6] },
    { a: 55.5, b: 59.7, p0: [-1.05, 8.95, -0.45], p1: [-0.75, 8.85, -0.35], t0: [0.3, 7.45, 0.45], t1: [0.3, 7.45, 0.45] },      // demarcação
    { a: 59.7, b: 64.1, p0: [-0.75, 8.35, -0.5], p1: [-0.5, 8.25, -0.42], t0: [0.4, 7.44, 0.38], t1: [0.4, 7.44, 0.38] },       // lixamento
    { a: 64.1, b: 71, p0: [1.75, 7.95, 0.12], p1: [1.6, 7.88, 0.18], t0: [0.86, 7.36, 0.8], t1: [0.84, 7.36, 0.8] },        // mistura da massa
    { a: 71, b: 75, p0: [-0.6, 8.7, -0.15], p1: [-0.35, 8.6, -0.05], t0: [0.42, 7.5, 0.72], t1: [0.42, 7.5, 0.72] },            // massa na placa
    { a: 75, b: 80, p0: [-1.05, 8.95, -0.45], p1: [-0.8, 8.8, -0.38], t0: [0.3, 7.45, 0.45], t1: [0.3, 7.45, 0.45] },           // aplicação da placa
    { a: 80, b: 86, p0: [-1.7, 9.0, 3.1], p1: [-1.3, 8.8, 2.9], t0: [0.35, 7.35, 0.4], t1: [0.35, 7.35, 0.4] },               // cintas (cintos e talabartes à vista)
    { a: 86, b: 92.4, p0: [-0.65, 8.75, -0.35], p1: [-0.35, 8.62, -0.25], t0: [0.4, 7.47, 0.4], t1: [0.4, 7.47, 0.4] },         // acabamento
    { a: 92.4, b: 95.2, p0: [4.4, 2.1, 10.4], p1: [3.8, 2.0, 11], t0: [10.8, 6.8, 3.6], t1: [10.6, 6.7, 3.6] },
    { a: 95.2, b: 103.3, p0: [-25, 6.5, 30], p1: [-33, 11.5, 40], t0: [-9, 3.2, 9], t1: [-8, 3.5, 6] },
  ];

  // ---------- quadro ----------
  window.DURATION = 103.2;
  window.renderFrame = function (t) {
    // gás
    for (let i = 0; i < GN; i++) {
      const s = gas[i], rate = 0.34 + (i % 7) * 0.03, ph = frac(i * 0.6180339);
      const u = frac(t * rate + ph), birth = t - u / rate, gi = G(birth);
      if (gi <= 0.001) { s.material.opacity = 0; continue; }
      const jl = 3.4 * Math.sqrt(gi), sd = 1 - (1 - u) * (1 - u), tw = 2.2 * u;
      s.position.set(leakE.x + 0.1 * jl * sd + 10.5 * Math.pow(u, 1.55) + Math.sin(i * 12.9 + t * 1.3) * 0.45 * tw,
        leakE.y + 0.9 * jl * sd + 3.0 * u + Math.cos(i * 7.1 + t * 1.1) * 0.35 * tw,
        leakE.z + 0.35 * jl * sd + Math.sin(i * 3.7 + t * 0.9) * 0.55 * tw);
      const sz = (0.2 + u * 3.6) * (0.75 + 0.25 * gi); s.scale.set(sz, sz, 1);
      s.material.opacity = 0.6 * Math.pow(1 - u, 1.3) * Math.min(1, u * 14) * (0.35 + 0.65 * gi);
    }
    for (let i = 0; i < steam.length; i++) {
      const s = steam[i], u = frac(t * 0.05 + i / 13), k = i % 2, bx = k ? 62 : -72, bz = k ? -60 : -62, by = k ? 58 : 46;
      s.position.set(bx + 26 * u + Math.sin(i * 3 + t * 0.3) * 2 * u, by + 9 * Math.sqrt(u), bz + Math.cos(i * 5.1) * 3 * u);
      const sz = 3 + u * 16; s.scale.set(sz, sz, 1); s.material.opacity = 0.42 * (1 - u) * Math.min(1, u * 8);
    }
    const alarm = t >= 5.5 && t < 92.6;
    for (const b of beacons) { const p = alarm ? Math.pow(0.5 + 0.5 * Math.sin(t * 9 + b.ph), 2) : 0; b.mat.emissiveIntensity = p * 4.5; if (b.pl) b.pl.intensity = p * 110; }
    sockArea.rotation.z = Math.sin(t * 2.3) * 0.06 - 0.1; sockArea.rotation.y = Math.sin(t * 1.1) * 0.08;
    trailer.sock.rotation.z = Math.sin(t * 2.7 + 1) * 0.07 - 0.12; trailer.sock.rotation.y = Math.sin(t * 1.3) * 0.1;

    // veículos
    const vis = t >= 12.6;
    const kT = 1 - Math.pow(1 - lin(13, 20.5, t), 2.3), tx = lerp(-95, -10, kT);
    truck.g.visible = trailer.g.visible = vis; truck.g.position.set(tx, 0, TZ); trailer.g.position.set(tx - 5.6, 0, TZ);
    for (const w of truck.wheels) w.rotation.y = -(tx / 0.42); for (const w of trailer.wheels) w.rotation.y = -(tx / 0.33);
    const flash = (ph) => (Math.sin(t * 11 + ph) > 0.3 ? 3.2 : 0.1);
    truck.bm.emissiveIntensity = vis && t < 95 ? flash(0) : 0; lift.bm.emissiveIntensity = vis ? flash(1.5) : 0;
    trailer.chocks.visible = t >= 27.2;
    const engOn = t >= 29.5;
    trailer.eng.position.x = -0.45 + (engOn ? Math.sin(t * 61) * 0.006 : 0); trailer.eng.position.y = 1.62 + (engOn ? Math.sin(t * 47) * 0.006 : 0);
    for (let i = 0; i < exh.length; i++) {
      const s = exh[i], u = frac(t * 0.8 + i / exh.length);
      s.position.set(-15.85 + 1.4 * u, 2.25 + 1.6 * u, TZ - 0.1 + Math.sin(i * 4.1) * 0.25 * u); const sz = 0.15 + u * 0.9; s.scale.set(sz, sz, 1);
      s.material.opacity = engOn ? 0.38 * (1 - u) * (t < 33 ? 1 : 0.45) : 0;
    }
    // plataforma
    const k1 = 1 - Math.pow(1 - lin(14, 22.5, t), 2.3), k2 = sm(42, 46.6, t);
    const cx = lerp(lerp(-104, -20, k1), -5.5, k2);
    lift.g.visible = vis; lift.g.position.set(cx, 0, LZ);
    for (const w of lift.wheels) w.rotation.y = -(cx / 0.5);
    const kb = sm(46.8, 52.6, t) - sm(95, 102.3, t);
    const P = V(-0.9, 1.75, 0);
    const yaw = lerp(0, -0.7509, kb), rad = lerp(4.1, 9.233, Math.pow(kb, 1.3)), hy = lerp(1.3, 6.4, Math.pow(kb, 0.75));
    const att = V(P.x + Math.cos(yaw) * rad, hy, P.z + Math.sin(yaw) * rad);
    lift.turret.rotation.y = -yaw;
    lift.boom.position.copy(P); lift.boom.lookAt(V(cx, 0, LZ).add(att)); const bl = P.distanceTo(att);
    lift.b1.scale.z = Math.min(bl, 4.6); lift.b2.scale.z = bl;
    lift.basket.position.copy(att); lift.basket.rotation.y = lerp(-Math.PI / 2, 0, kb);
    basketW = V(cx + att.x, att.y, LZ + att.z);
    lift.g.updateMatrixWorld(true);

    // ---- fases do reparo ----
    const wMark = win(55.7, 59.6, t, 0.5), pMark = lin(56.2, 59.2, t);
    const wSand = win(59.9, 64.2, t, 0.5), kSand = sm(60.4, 63.8, t);
    const wFetch = win(64.2, 65.6, t, 0.5), wKnead = win(65.3, 70.9, t, 0.5), kMix = sm(65.8, 70.2, t);
    const kWork = sm(70.6, 71.7, t), kOn = sm(75.1, 77.6, t), wSpread = win(71.6, 75.0, t, 0.5), kSpread = sm(71.9, 74.7, t);
    const wHold = win(70.9, 80.2, t, 0.5);
    const wStrap = win(80.1, 85.9, t, 0.5), kTight = sm(83.6, 85.4, t);
    const wFin = win(86.2, 91.8, t, 0.5), kFin = sm(86.7, 91.3, t);
    const thumbs = win(91.7, 94.2, t, 0.5);
    const nearK = sm(55, 55.6, t) - sm(94.4, 95, t);
    const backB = win(64.0, 71.2, t, 0.6);

    hole.visible = t < 77.3; stain.visible = t < 61.5;
    // marcação
    for (const k of marks) k.m.visible = pMark > k.p && t < 78.2;
    // lixado
    sandMat.opacity = kSand * 0.96; sanded.visible = kSand > 0.01 && t < 78.2;
    const sandPt = onPipe(LX + 0.24 * Math.sin(t * 2.1), LA + 0.42 * Math.sin(t * 9.5), PR + 0.03);
    for (let i = 0; i < dust.length; i++) { const s = dust[i], u = frac(t * 1.4 + i / dust.length); s.position.set(sandPt.x + 0.9 * u + Math.sin(i * 5) * 0.1, sandPt.y + 0.25 * u + 0.05, sandPt.z + Math.cos(i * 3.3) * 0.12 * u); const sz = 0.06 + u * 0.35; s.scale.set(sz, sz, 1); s.material.opacity = wSand * 0.35 * (1 - u); }
    // placa
    const plateWorkPos = V(0.42, 7.5, 0.74), plateWorkRot = 1.785;
    lift.basket.updateWorldMatrix(true, false);
    const pc0 = lift.basket.localToWorld(V(-0.05, 0.42, -0.2));
    plateCarried.visible = t < 70.6; plateWorld.visible = t >= 70.6;
    const pPos = pc0.clone().lerp(plateWorkPos, kWork).lerp(PLATE_ON, kOn); pPos.y += Math.sin(kOn * Math.PI) * 0.16; pPos.z += Math.sin(kOn * Math.PI) * 0.22;
    plateWorld.position.copy(pPos); plateWorld.rotation.x = lerp(lerp(-1.35, plateWorkRot, kWork), 0, kOn);
    innerPutty.visible = kSpread > 0.01; innerPutty.scale.set(Math.max(0.02, kSpread), 1, 1);
    // massa na mão
    const Bx = basketW.x + 0.45;
    const kneadC = V(Bx + 0.02, basketW.y + 0.84, basketW.z - 0.86);
    putty.visible = t >= 65.2 && t < 74.9;
    if (putty.visible) {
      const toPlate = sm(71.4, 72.2, t);
      putty.position.copy(kneadC).lerp(plateWorld.position.clone().add(V(0.05, 0.05, 0)), toPlate);
      const sq = 1 + 0.25 * Math.sin(t * 9); const sh = 1 - 0.85 * kSpread;
      putty.scale.set(1.25 * sq * sh, (1 / sq) * sh, 1.0 * sh); putty.rotation.set(t * 2.2, t * 1.7, t * 1.3);
      puttyMat.color.set(0xe8c010).lerp(new T.Color(PUTTY), kMix);
      puttyDk.forEach((d, i) => { const a = i * 1.257 + t * 0.5; d.position.set(Math.cos(a) * 0.036, Math.sin(a * 1.7) * 0.03, Math.sin(a) * 0.036); d.scale.setScalar(Math.max(0.001, 1 - kMix * 1.15)); });
    }
    // cintas
    straps.forEach((s, j) => {
      const p = sm(80.3 + j * 1.3, 82.4 + j * 1.3, t), R = lerp(0.6, 0.5445, kTight);
      s.segs.forEach((m, i) => { m.parent.visible = i < p * s.segs.length; m.position.z = R + Math.sin(i * 0.9 + t * 9) * 0.012 * (1 - kTight) * (p < 1 ? 1 : 0.4); });
      s.rat.visible = p >= 0.999; s.rb.position.z = R + 0.028;
    });
    // acabamento
    finish.visible = kFin > 0.01; finish.scale.set(Math.max(0.02, Math.pow(kFin, 0.8)), 1, 1);

    // ---- equipe na cesta ----
    const inB = t >= 37; wB.g.visible = t >= 22;
    const mA = win(38, 40.1, t, 0.9), mB = win(38.7, 40.8, t, 0.9);
    wA.setMask(t >= 39.05); wB.setMask(t >= 39.75);
    const faceL = V(-0.07, 0.72, 0.2), faceR = V(0.07, 0.72, 0.2);
    // A: marca, lixa, segura a placa, passa a cinta
    wA.g.position.set(-0.45, -0.37, lerp(-0.55, -0.8, nearK));
    const workA = Math.max(wMark, wSand, wHold * kOn, wStrap, wHold * (1 - kOn) * 0.5);
    let aR = null, aL = null, awR = 0, awL = 0;
    if (wMark > 0) { aR = penPos(pMark).add(V(0, 0.07, 0.03)); awR = wMark; }
    else if (wSand > 0) { aR = sandPt.clone().add(V(0, 0.05, 0.02)); awR = wSand; aL = onPipe(LX - 0.42, 0.55, PR + 0.06); awL = wSand; }
    else if (wHold > 0) { aL = plateWorld.position.clone().add(V(-0.28, 0.02, 0.06)); awL = wHold; aR = plateWorld.position.clone().add(V(-0.1, 0.04, 0.12)); awR = wHold * kOn; }
    else if (wStrap > 0) { const th = 0.25 + 0.12 * Math.sin(t * 7); aL = onPipe(LX - 0.26, th, 0.62); aR = onPipe(LX - 0.12, th + 0.25, 0.62); awL = awR = wStrap; }
    wA.tool.visible = wMark > 0.3 || wSand > 0.3; pen.visible = wMark > 0.3; sand.visible = wSand > 0.3;
    wA.pose({ lean: 0.42 * workA + 0.1 * wFin, headX: 0.25 * workA + 0.2 * wFin, handR: aR, wR: awR, handL: aL, wL: awL,
      locL: mA > 0 ? faceL : (thumbs > 0 ? V(-0.34, 0.95, 0.12) : null), locR: mA > 0 ? faceR : null,
      wL: aL ? awL : (mA > 0 ? mA : thumbs), wR: aR ? awR : mA });
    setLan(0, wA, true);
    // B: mistura a massa, aplica na placa, coloca a placa, cinta e acabamento
    if (inB) {
      if (wB.g.parent !== lift.basket) { scene.remove(wB.g); lift.basket.add(wB.g); }
      wB.g.position.set(0.45, -0.37, lerp(lerp(-0.55, -0.8, nearK), -0.6, backB)); wB.g.rotation.y = Math.PI;
      let bR = null, bL = null, bwR = 0, bwL = 0;
      const workB = Math.max(wSpread * 0.6, wHold * kOn, wStrap, wFin);
      if (wKnead > 0 || wFetch > 0) {
        const tray = lift.basket.localToWorld(V(0.74, 0.92, -0.6));
        const kn = t * 8.5;
        bR = kneadC.clone().add(V(0.075 - 0.03 * Math.sin(kn), 0.01 + 0.035 * Math.cos(kn), 0.02 * Math.sin(kn + 1))); bL = kneadC.clone().add(V(-0.075 + 0.03 * Math.sin(kn), -0.01 - 0.035 * Math.cos(kn), -0.02 * Math.sin(kn + 1)));
        if (wKnead < 1 && t < 66) { bR.lerp(tray, 1 - sm(65.0, 65.7, t)); }
        bwR = Math.max(wKnead, wFetch); bwL = wKnead;
      } else if (wSpread > 0 && kOn <= 0) {
        bR = plateWorld.position.clone().add(V(0.2 * Math.sin(t * 3.4), 0.07, 0.07 * Math.sin(t * 5.3))); bwR = wSpread; bL = plateWorld.position.clone().add(V(0.3, 0.02, 0.05)); bwL = wHold;
      } else if (wHold > 0) {
        bR = plateWorld.position.clone().add(V(0.26, 0.03, 0.08)); bL = plateWorld.position.clone().add(V(0.1, 0.05, 0.12)); bwR = wHold; bwL = wHold * kOn;
      } else if (wStrap > 0) { const th = 0.3 + 0.12 * Math.sin(t * 7 + 1); bL = onPipe(LX + 0.12, th + 0.25, 0.62); bR = onPipe(LX + 0.27, th, 0.62); bwL = bwR = wStrap; }
      else if (wFin > 0) { bR = onPipe(LX + 0.34 * Math.sin(t * 1.9), LA + 0.5 * Math.sin(t * 4.3), 0.6); bwR = wFin; bL = onPipe(LX + 0.42, 0.5, 0.58); bwL = wFin; }
      wB.pose({ lean: 0.42 * workB + 0.12 * wKnead, headX: 0.25 * workB + 0.3 * wKnead, handR: bR, wR: bR ? bwR : (mB > 0 ? mB : thumbs), handL: bL, wL: bL ? bwL : mB,
        locL: mB > 0 ? faceL : null, locR: mB > 0 ? faceR : (thumbs > 0 ? V(0.34, 0.95, 0.12) : null) });
      setLan(1, wB, true);
    } else {
      if (wB.g.parent !== scene) { lift.basket.remove(wB.g); scene.add(wB.g); }
      const p = pathAt([[-12.5, 15.4], [-20, 14], [-26, 18.4], [-26, 7.6], [-17.6, 9.8]], 22.3, 35.6, t);
      wB.g.position.set(p.x, 0, p.z); wB.g.rotation.y = p.moving ? p.heading : (t < 23 ? -Math.PI / 2 : 2.2);
      wB.pose(p.moving ? { walk: p.dist * 3.0 } : {});
      const acc = 7.63 + 7.44;
      conePts.forEach((c, i) => { const need = acc + (18.4 - c[1]) - 0.3; cones[i].visible = p.dist >= need; if (i > 0) fences[i - 1].visible = p.dist >= need + 0.3; });
      setLan(1, wB, false);
    }
    if (inB) { cones.forEach((c) => (c.visible = true)); fences.forEach((f) => (f.visible = true)); }
    if (t < 22) { cones.forEach((c) => (c.visible = false)); fences.forEach((f) => (f.visible = false)); }

    // ---- vigias ----
    wC.g.visible = wD.g.visible = t >= 22;
    const cheer = win(96.5, 101.5, t, 1);
    const pc = pathAt([[-9.5, 15.3], [-17.3, 15.2], [-17.8, 16.3]], 22.2, 26, t);
    wC.g.position.set(pc.x, 0, pc.z); wC.carry.visible = t < 26; wC.g.rotation.y = pc.moving ? pc.heading : Math.PI;
    if (pc.moving) wC.pose({ walk: pc.dist * 3.2 });
    else { const mal = V(-17.8, 1.05, 15.72); wC.pose({ lean: 0.25 * (1 - cheer), headX: 0.3 * (1 - cheer), handL: mal.clone().add(V(0.2, 0.1 + 0.03 * Math.sin(t * 3), 0)), wL: (1 - cheer), handR: mal.clone().add(V(-0.25, 0.12, 0)), wR: (1 - cheer) * 0.9, locL: V(-0.34, 0.98, 0.1) }); if (cheer > 0) wC.pose({ locL: V(-0.34, 0.98, 0.1), wL: cheer, lean: 0.25 * (1 - cheer) }); }
    const pd1 = pathAt([[-11, 15.3], [-18.3, 15.9], [-17.9, 17.2]], 22.6, 26.4, t), pd2 = pathAt([[-17.9, 17.2], [-19.4, 16.2]], 34, 35.6, t);
    const dMove2 = t >= 34, pd = dMove2 ? pd2 : pd1;
    wD.g.position.set(pd.x, 0, pd.z);
    const faceLeak = Math.atan2(-2 - -19.4, 4 - 16.2);
    wD.g.rotation.y = pd.moving ? pd.heading : (dMove2 ? faceLeak : Math.PI / 2);
    const radioUp = win(36, 95.5, t, 1);
    if (pd.moving) wD.pose({ walk: pd.dist * 3.2 });
    else if (!dMove2) wD.pose({ locL: V(-0.15, 0.5 + 0.04 * Math.sin(t * 5), 0.45), locR: V(0.15, 0.42, 0.45), lean: 0.2 });
    else wD.pose({ locL: V(-0.16, 0.74, 0.16), wL: radioUp, locR: V(0.34, 0.98, 0.1), wR: cheer, headX: -0.15 * radioUp });
    table.visible = t >= 24.6;
    dispMat.emissiveIntensity = t >= 31 ? 1.6 + 0.3 * Math.sin(t * 5) : 0; ledMat.emissiveIntensity = t >= 33.2 ? 2.2 : 0;

    // mangueiras
    setHose(hoseY, [V(-17.0, 1.25, 17.05), V(-17.25, 0.75, 16.75), V(-17.75, 0.35, 16.25), V(-18.25, 0.6, 15.75), V(-18.13, 0.95, 15.6)], sm(30.2, 32.2, t), 0.028);
    const ub = V(basketW.x - 0.2, 0.04, basketW.z + 0.5);
    for (let i = 0; i < 2; i++) {
      const o = i * 0.22 - 0.11, m0 = V(-18.13, 0.98 + i * 0.08, 15.6);
      const mid = V(lerp(-18.6, ub.x, 0.45) + o, 0.03, lerp(13.6, ub.z, 0.45) + 1.3 + o), pre = V(lerp(-18.6, ub.x, 0.86) + o, 0.03, lerp(13.6, ub.z, 0.86) + 0.9);
      const pts = [m0, V(-18.5, 0.5, 15.35 + o * 0.3), V(-18.75 + o, 0.03, 14.6), mid, pre, V(ub.x + o, Math.max(0.05, basketW.y * 0.42), ub.z - 0.2), V(basketW.x + (i ? 0.45 : -0.45), basketW.y + 0.1, basketW.z - 0.12)];
      setHose(hoseB[i], pts, sm(32.4 + i * 0.5, 35.6 + i * 0.4, t), 0.022);
    }

    // câmera
    let sh = shots[shots.length - 1]; for (const s of shots) if (t >= s.a && t < s.b) { sh = s; break; }
    const kl = clamp((t - sh.a) / (sh.b - sh.a)), kk = 0.5 * kl + 0.5 * kl * kl * (3 - 2 * kl);
    camera.position.set(lerp(sh.p0[0], sh.p1[0], kk), lerp(sh.p0[1], sh.p1[1], kk), lerp(sh.p0[2], sh.p1[2], kk));
    camera.lookAt(sh.tf ? sh.tf(t) : V(lerp(sh.t0[0], sh.t1[0], kk), lerp(sh.t0[1], sh.t1[1], kk), lerp(sh.t0[2], sh.t1[2], kk)));
    renderer.render(scene, camera);
    return true;
  };
})();
