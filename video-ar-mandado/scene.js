/* Animação 3D: vazamento de gás e resposta com sistema de ar mandado (PO-002).
   Toda a cena é função determinística do tempo t (s): window.renderFrame(t). */
(function () {
  const T = THREE;
  const W = 1280, H = 720;
  const renderer = new T.WebGLRenderer({ canvas: document.getElementById("c"), antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xbfc9cf, 70, 260);
  const camera = new T.PerspectiveCamera(42, W / H, 0.1, 700);

  // ---------- utilidades ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = (a, b, t) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
  const lin = (a, b, t) => clamp((t - a) / (b - a));
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const mats = {};
  function M(color, rough = 0.8, metal = 0, extra) {
    const key = color + "_" + rough + "_" + metal + (extra ? JSON.stringify(extra) : "");
    if (!mats[key]) mats[key] = new T.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra || {}));
    return mats[key];
  }
  function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
  }
  function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 20, open = false) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
  }
  function sph(r, mat, x = 0, y = 0, z = 0, parent, ws = 16, hs = 12) {
    const m = new T.Mesh(new T.SphereGeometry(r, ws, hs), mat); m.position.set(x, y, z);
    m.castShadow = true; if (parent) parent.add(m); return m;
  }
  function softTex() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c);
  }
  const puffTex = softTex();
  function puff(color) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, color, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(s); return s;
  }

  // ---------- céu e luz ----------
  (function sky() {
    const c = document.createElement("canvas"); c.width = 4; c.height = 256; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#6f93b8"); gr.addColorStop(0.45, "#a9bfd0"); gr.addColorStop(0.55, "#cfd6d8"); gr.addColorStop(1, "#cfd6d8");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.SphereGeometry(500, 24, 16), new T.MeshBasicMaterial({ map: tex, side: T.BackSide, fog: false }));
    scene.add(m);
  })();
  scene.add(new T.HemisphereLight(0xe6eef6, 0x6a6358, 1.5));
  const sun = new T.DirectionalLight(0xfff2dc, 2.9);
  sun.position.set(-45, 70, 50); sun.target.position.set(-8, 0, 8); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 40, bottom: -40, near: 10, far: 200 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; scene.add(sun);

  // ---------- piso e via ----------
  const ground = new T.Mesh(new T.PlaneGeometry(700, 700), M(0x8a8d8c, 0.95)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const road = new T.Mesh(new T.PlaneGeometry(320, 17), M(0x45484c, 0.9)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, 12.8); road.receiveShadow = true; scene.add(road);
  for (const z of [4.6, 21]) { const l = new T.Mesh(new T.PlaneGeometry(320, 0.16), M(0xe8e8e0, 0.8)); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.02, z); scene.add(l); }
  for (let x = -150; x < 150; x += 6) { const l = new T.Mesh(new T.PlaneGeometry(3, 0.14), M(0xe7c21a, 0.8)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, 12.6); scene.add(l); }
  // faixa de grama ao fundo da via
  const grass = new T.Mesh(new T.PlaneGeometry(320, 40), M(0x5f7a45, 1)); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.008, 42); grass.receiveShadow = true; scene.add(grass);

  // ---------- pipe rack ----------
  const LX = 0.35, PY = 7.0, PR = 0.5;
  const steel = M(0xa9c2ac, 0.75, 0.15), steel2 = M(0x8fa994, 0.75, 0.15);
  const rack = new T.Group(); scene.add(rack);
  for (let x = -65; x <= 65; x += 10) {
    box(0.34, 9.6, 0.34, steel, x, 4.8, -0.9, rack); box(0.34, 9.6, 0.34, steel, x, 4.8, -3.3, rack);
    box(0.3, 0.32, 4.6, steel, x, 6.32, -1.5, rack);      // viga inferior com balanço
    box(0.3, 0.3, 2.9, steel, x, 8.5, -2.1, rack);        // viga superior
    box(0.6, 0.2, 0.6, M(0x77797a, 0.9), x, 0.1, -0.9, rack); box(0.6, 0.2, 0.6, M(0x77797a, 0.9), x, 0.1, -3.3, rack);
    const br = box(0.12, 3.4, 0.12, steel2, x, 7.4, -2.1, rack); br.rotation.x = 0.78;
  }
  box(132, 0.2, 0.2, steel2, 0, 9.5, -0.9, rack); box(132, 0.2, 0.2, steel2, 0, 9.5, -3.3, rack);
  function pipeX(r, color, y, z, len = 132, rough = 0.5, metal = 0.3) {
    const p = cyl(r, r, len, M(color, rough, metal), 0, y, z, rack, 24); p.rotation.z = Math.PI / 2; return p;
  }
  const yellowPipe = 0xd9a70a;
  pipeX(PR, yellowPipe, PY, 0);
  for (let x = -60; x <= 60; x += 10) { const f = cyl(0.62, 0.62, 0.14, M(0xb58a08, 0.5, 0.4), x + 5.2 + (x === 0 ? 3 : 0), PY, 0, rack, 24); f.rotation.z = Math.PI / 2; }
  pipeX(0.24, 0x2f8f4e, 6.72, -1.55); pipeX(0.18, 0x2c6fb3, 6.66, -2.15); pipeX(0.3, 0xb9bec2, 6.78, -2.8, 132, 0.35, 0.8);
  pipeX(0.42, yellowPipe, 9.07, -1.6); pipeX(0.2, 0xb32424, 8.85, -2.6);
  // furo do vazamento
  const LA = 1.32; const leakE = V(LX, PY + PR * Math.sin(LA), PR * Math.cos(LA));
  const hole = sph(0.07, M(0x1a1a1a, 1), leakE.x, leakE.y - 0.02, leakE.z - 0.02, scene); hole.scale.set(1.6, 0.5, 0.8);
  const stain = sph(0.2, M(0x7a5a12, 1), leakE.x, leakE.y - 0.06, leakE.z - 0.05, scene); stain.scale.set(1.5, 0.35, 1);

  // ---------- planta ao fundo ----------
  (function plant() {
    const shed = M(0xb9c1c8, 0.8), shed2 = M(0x98a2ab, 0.8), rust = M(0x7b4a32, 0.9), conc = M(0x9a9a96, 0.95);
    box(70, 16, 30, shed, -30, 8, -48, scene);
    for (let i = 0; i < 5; i++) { const r = box(14, 3.2, 30.4, shed2, -58 + i * 14, 17.2, -48, scene); r.rotation.z = 0.22; }
    for (let i = 0; i < 9; i++) box(0.3, 15.6, 0.3, shed2, -64 + i * 8.5, 7.8, -32.8, scene);
    box(18, 6, 0.2, M(0x2c3338, 0.7), -30, 3, -32.85, scene); // portão
    // alto-forno
    cyl(5, 6.2, 22, rust, 30, 11, -45, scene, 24); cyl(2.2, 5, 7, rust, 30, 25.5, -45, scene, 24); cyl(1.2, 1.2, 9, M(0x555b60, 0.6, 0.4), 30, 33, -45, scene, 12);
    for (let i = 0; i < 4; i++) { const r = cyl(6.4, 6.4, 0.5, M(0x3e474e, 0.6, 0.5), 30, 5 + i * 5.5, -45, scene, 24); }
    for (let i = 0; i < 3; i++) { cyl(2.6, 2.6, 19, M(0xa8a39a, 0.8), 43 + i * 6.2, 9.5, -52, scene, 18); sph(2.6, M(0xa8a39a, 0.8), 43 + i * 6.2, 19, -52, scene); }
    const conv = box(34, 1.2, 2, M(0x5b666e, 0.7, 0.3), 10, 16, -45, scene); conv.rotation.z = 0.5;
    const dc = cyl(1.3, 1.3, 26, M(0x555b60, 0.6, 0.4), 37, 27, -40, scene, 14); dc.rotation.z = -0.55;
    // chaminés
    function stack(x, z, h, r) { for (let i = 0; i < 8; i++) cyl(r * (1 - (i + 1) * 0.045), r * (1 - i * 0.045), h / 8, M(i >= 6 ? (i % 2 ? 0xc0392b : 0xf1f1ee) : 0xb7b3ab, 0.9), x, h / 16 + i * h / 8, z, scene, 16); }
    stack(62, -60, 58, 2.2); stack(-72, -62, 46, 1.8);
    // gasômetro e esferas
    cyl(9, 9, 16, M(0xc7ccd0, 0.5, 0.5), -72, 8, -22, scene, 28); for (let i = 0; i < 4; i++) cyl(9.15, 9.15, 0.35, steel2, -72, 3 + i * 4, -22, scene, 28);
    for (const x of [58, 70]) { sph(4.2, M(0xe4e6e8, 0.4, 0.3), x, 6.2, -16, scene, 24, 16); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; cyl(0.18, 0.18, 6, steel, x + Math.cos(a) * 3.4, 3, -16 + Math.sin(a) * 3.4, scene, 8); } }
    // tubos subindo do rack para a planta
    for (const x of [-22, 18]) { cyl(0.3, 0.3, 30, M(0x8e9498, 0.4, 0.7), x, 8.95, -16.5, scene, 14).rotation.x = Math.PI / 2; cyl(0.3, 0.3, 9, M(0x8e9498, 0.4, 0.7), x, 4.5, -31.4, scene, 14); }
    for (let x = -60; x <= 60; x += 30) { cyl(0.09, 0.12, 9, steel2, x, 4.5, 23.5, scene, 8); box(1.6, 0.1, 0.25, steel2, x, 9, 22.8, scene); }
    box(40, 5, 12, conc, 40, 2.5, -24, scene); box(12, 3.4, 8, M(0xd8d3c8, 0.9), -12, 1.7, -22, scene);
  })();

  // ---------- área de gás ao fundo: tubulações amarelas, passarelas e guarda-corpos ----------
  (function gasArea() {
    const yp = M(yellowPipe, 0.55, 0.2), yr = M(0xf2cf1f, 0.6), deck = M(0x6d7479, 0.8, 0.3);
    function walkway(x0, x1, y, z, w) {
      const L = x1 - x0, xc = (x0 + x1) / 2;
      box(L, 0.1, w, deck, xc, y, z, scene);
      for (const s of [-1, 1]) { box(L, 0.05, 0.05, yr, xc, y + 1.1, z + s * w / 2, scene); box(L, 0.04, 0.04, yr, xc, y + 0.6, z + s * w / 2, scene); box(L, 0.14, 0.03, yr, xc, y + 0.1, z + s * w / 2, scene);
        for (let x = x0; x <= x1 + 0.01; x += 2) box(0.05, 1.1, 0.05, yr, x, y + 0.55, z + s * w / 2, scene); }
      for (let x = x0 + 1; x <= x1; x += 6) for (const s of [-1, 1]) box(0.26, y, 0.26, steel, x, y / 2, z + s * (w / 2 - 0.2), scene);
    }
    walkway(-34, 26, 5.2, -7.6, 2.2); walkway(-10, 44, 8.6, -13.5, 2.0);
    const st = box(9, 0.12, 1.1, deck, 30.2, 2.6, -7.6, scene); st.rotation.z = -0.62; for (const s of [-1, 1]) { const r = box(9, 0.05, 0.05, yr, 30.2, 3.7, -7.6 + s * 0.55, scene); r.rotation.z = -0.62; }
    function bigPipe(r, len, x, y, z, axis) { const p = cyl(r, r, len, yp, x, y, z, scene, 24); if (axis === "x") p.rotation.z = Math.PI / 2; if (axis === "z") p.rotation.x = Math.PI / 2; return p; }
    function elbow(r, R, x, y, z, rx, ry, rz) { const e = new T.Mesh(new T.TorusGeometry(R, r, 14, 18, Math.PI / 2), yp); e.position.set(x, y, z); e.rotation.set(rx, ry, rz); e.castShadow = true; scene.add(e); return e; }
    // linha principal elevada com curvas em S, como na área real
    bigPipe(0.8, 46, -9, 7.4, -10.6, "x"); bigPipe(0.8, 30, 31, 11.2, -10.6, "x");
    elbow(0.8, 1.9, 14, 9.3, -10.6, 0, 0, -Math.PI / 2); elbow(0.8, 1.9, 16, 9.3, -10.6, 0, 0, Math.PI / 2);
    bigPipe(0.8, 5.5, -32, 4.65, -10.6, "y"); elbow(0.8, 1.9, -30.1, 5.5, -10.6, 0, 0, Math.PI / 2);
    bigPipe(0.65, 22, -20, 10.4, -16.5, "x"); elbow(0.65, 1.6, -9, 8.8, -16.5, 0, 0, 0); bigPipe(0.65, 8.8, -7.4, 4.4, -16.5, "y");
    bigPipe(0.55, 9, 4, 7.4, -15.1, "z"); bigPipe(0.55, 12, 46, 6, -10.6, "y");
    // vasos e ciclones amarelos
    for (const x of [-22, -16]) { cyl(1.5, 1.5, 4.2, yp, x, 9.6, -13.6, scene, 20); cyl(1.5, 0.35, 3, yp, x, 6, -13.6, scene, 20); sph(1.5, yp, x, 11.7, -13.6, scene).scale.y = 0.45; }
    const hv = cyl(1.3, 1.3, 9, yp, 34, 6.7, -17, scene, 22); hv.rotation.z = Math.PI / 2; sph(1.3, yp, 38.5, 6.7, -17, scene).scale.x = 0.5; sph(1.3, yp, 29.5, 6.7, -17, scene).scale.x = 0.5;
    for (const x of [31, 37]) box(0.4, 5.4, 2.2, steel, x, 2.7, -17, scene);
    for (let x = -34; x <= 44; x += 13) { box(0.4, 6.6, 0.4, steel, x, 3.3, -10.6, scene); box(2.2, 0.3, 0.5, steel, x, 6.45, -10.6, scene); }
  })();
  const steam = []; for (let i = 0; i < 26; i++) steam.push(puff(0xf2f4f5));

  // ---------- alarme: postes com giroflex e sirene ----------
  const beacons = [];
  for (const [x, z, light] of [[9, 3.2, true], [-30, 3.4, true], [34, 3.4, false]]) {
    cyl(0.08, 0.1, 6.2, steel2, x, 3.1, z, scene, 10);
    box(0.5, 0.35, 0.4, M(0xd0d3d6, 0.6), x, 5.7, z, scene);
    const horn = cyl(0.26, 0.07, 0.45, M(0xb9bcbf, 0.5, 0.4), x, 5.7, z + 0.42, scene, 14); horn.rotation.x = Math.PI / 2;
    const mat = new T.MeshStandardMaterial({ color: 0x7a1010, emissive: 0xff1a0a, emissiveIntensity: 0, roughness: 0.3 });
    const b = cyl(0.17, 0.19, 0.3, mat, x, 6.38, z, scene, 14); b.castShadow = false;
    let pl = null; if (light) { pl = new T.PointLight(0xff2a14, 0, 34, 1.6); pl.position.set(x, 6.5, z); scene.add(pl); }
    beacons.push({ mat, pl, ph: x * 0.37 });
  }
  // biruta da área
  const sockArea = makeSock(1.7); cyl(0.07, 0.09, 8.2, steel2, 15, 4.1, 4.4, scene, 10); sockArea.position.set(15, 8.1, 4.4); scene.add(sockArea);
  function makeSock(len) {
    const g = new T.Group(); const n = 5;
    for (let i = 0; i < n; i++) {
      const r0 = 0.3 - i * 0.04, r1 = 0.3 - (i + 1) * 0.04;
      const s = cyl(r1, r0, len / n, M(i % 2 ? 0xf4f1ea : 0xf2681c, 0.9, 0, { side: T.DoubleSide }), len / n * (i + 0.5), 0, 0, g, 12, true); s.rotation.z = -Math.PI / 2;
    }
    return g;
  }

  // ---------- trabalhador ----------
  function makeWorker(o) {
    const suit = M(o.suit || 0x2d4f7c, 0.9), stripe = M(0xd8f02a, 0.6, 0, { emissive: 0x4a5208 }), skin = M(0xc99a78, 0.8), boot = M(0x1e1e1e, 0.8), glove = M(0xe9d24a, 0.8);
    const g = new T.Group(); const upper = new T.Group(); upper.position.y = 0.9; g.add(upper);
    const legs = [];
    for (const s of [-1, 1]) {
      const p = new T.Group(); p.position.set(s * 0.115, 0.9, 0); g.add(p);
      box(0.18, 0.78, 0.2, suit, 0, -0.39, 0, p); box(0.185, 0.05, 0.205, stripe, 0, -0.6, 0, p); box(0.2, 0.14, 0.3, boot, 0, -0.83, 0.04, p); legs.push(p);
    }
    box(0.46, 0.62, 0.27, o.vest ? M(0xf07a1a, 0.8) : suit, 0, 0.32, 0, upper);
    box(0.47, 0.05, 0.28, stripe, 0, 0.2, 0, upper); box(0.47, 0.05, 0.28, stripe, 0, 0.42, 0, upper);
    box(0.4, 0.09, 0.26, M(0x222222, 0.8), 0, 0.02, 0, upper); // cinto
    const arms = [];
    for (const s of [-1, 1]) {
      const p = new T.Group(); p.position.set(s * 0.3, 0.56, 0); upper.add(p);
      box(0.13, 0.5, 0.14, suit, 0, -0.25, 0, p); box(0.135, 0.04, 0.145, stripe, 0, -0.38, 0, p); box(0.12, 0.13, 0.13, glove, 0, -0.56, 0, p); arms.push(p);
    }
    const head = new T.Group(); head.position.y = 0.78; upper.add(head);
    sph(0.125, skin, 0, 0, 0, head); cyl(0.06, 0.07, 0.1, skin, 0, -0.13, 0, head, 10);
    const helm = new T.Mesh(new T.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(o.helmet || 0xf4f4f0, 0.5)); helm.position.y = 0.03; helm.castShadow = true; head.add(helm);
    box(0.24, 0.02, 0.14, M(o.helmet || 0xf4f4f0, 0.5), 0, 0.035, 0.14, head);
    // máscara facial de pressão positiva
    const mask = new T.Group(); head.add(mask); mask.visible = false;
    const visor = new T.Mesh(new T.SphereGeometry(0.135, 16, 12, 0, Math.PI, 0.25, 1.9), new T.MeshStandardMaterial({ color: 0x9fd0e6, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55 }));
    visor.rotation.y = -Math.PI / 2; visor.position.z = 0.02; mask.add(visor);
    const rim = new T.Mesh(new T.TorusGeometry(0.128, 0.018, 8, 20), M(0x151515, 0.7)); rim.position.set(0, -0.01, 0.06); rim.scale.y = 1.15; mask.add(rim);
    const reg = cyl(0.05, 0.05, 0.07, M(0x151515, 0.6), 0, -0.1, 0.15, mask, 12); reg.rotation.x = Math.PI / 2;
    cyl(0.03, 0.03, 0.05, M(0xe0b000, 0.6), 0, -0.1, 0.19, mask, 10).rotation.x = Math.PI / 2;
    const strap = new T.Mesh(new T.TorusGeometry(0.135, 0.012, 6, 20), M(0x151515, 0.8)); strap.rotation.x = Math.PI / 2; strap.position.y = -0.02; mask.add(strap);
    // traqueia até o cinto
    const tr = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V(0, 0.68, 0.16), V(0.1, 0.5, 0.2), V(0.2, 0.25, 0.17), V(0.24, 0.04, 0.1)]), 12, 0.022, 6), M(0x151515, 0.7));
    upper.add(tr); tr.visible = false;
    // kit de fuga (cilindro pequeno nas costas)
    const kit = cyl(0.07, 0.07, 0.34, M(0xe7c21a, 0.5, 0.3), -0.1, 0.3, -0.19, upper, 12);
    // objeto na mão (maleta ou rádio)
    const carry = box(0.42, 0.3, 0.16, M(0x16181a, 0.6), 0, -0.72, 0, arms[1]); carry.visible = false;
    const radio = box(0.05, 0.14, 0.035, M(0x111111, 0.6), 0, -0.6, 0.08, arms[0]); radio.visible = false;
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    scene.add(g);
    return {
      g, upper, legs, arms, head, mask, tr, carry, radio,
      pose(p) {
        const w = p.walk !== undefined ? Math.sin(p.walk) : 0;
        const sq = p.squat || 0;
        legs[0].rotation.x = w * 0.75 - sq * 0.9; legs[1].rotation.x = -w * 0.75 - sq * 0.9;
        legs[0].scale.y = legs[1].scale.y = 1 - sq * 0.25;
        upper.position.y = 0.9 - sq * 0.3; upper.rotation.x = p.lean || 0;
        arms[0].rotation.x = p.armL !== undefined ? p.armL : -w * 0.6;
        arms[1].rotation.x = p.armR !== undefined ? p.armR : w * 0.6;
        arms[0].rotation.z = p.armLz || 0; arms[1].rotation.z = p.armRz || 0;
        head.rotation.x = p.headX || 0; head.rotation.y = p.headY || 0;
        g.position.y = (p.walk !== undefined ? Math.abs(Math.cos(p.walk)) * 0.035 : 0) + (p.y || 0);
      },
      setMask(v) { mask.visible = v; tr.visible = v; },
    };
  }
  function pathAt(pts, a, b, t) {
    const k = clamp((t - a) / (b - a)); let L = 0; const seg = [];
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); L += d; }
    let d = k * L, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const f = seg[i] ? d / seg[i] : 0;
    const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1];
    return { x: lerp(pts[i][0], pts[i + 1][0], f), z: lerp(pts[i][1], pts[i + 1][1], f), heading: Math.atan2(dx, dz), dist: k * L, moving: k > 0 && k < 1 };
  }

  // ---------- caminhonete ----------
  function makeTruck() {
    const g = new T.Group(); const white = M(0xf2f3f1, 0.45, 0.1), dark = M(0x1c2126, 0.3, 0.4), glass = M(0x27333d, 0.15, 0.6);
    box(5.3, 0.6, 1.85, white, 0, 0.82, 0, g); box(1.5, 0.35, 1.8, white, 1.85, 1.28, 0, g);
    box(2.1, 0.78, 1.78, white, 0.15, 1.5, 0, g); box(2.0, 0.5, 1.8, glass, 0.15, 1.58, 0, g).scale.set(0.9, 1, 1.01); box(0.05, 0.55, 1.6, glass, 1.21, 1.56, 0, g);
    box(1.9, 0.45, 0.06, white, -1.7, 1.33, 0.9, g); box(1.9, 0.45, 0.06, white, -1.7, 1.33, -0.9, g); box(0.06, 0.45, 1.8, white, -2.62, 1.33, 0, g);
    box(5.34, 0.16, 1.9, M(0xe7c21a, 0.6), 0, 0.6, 0, g); box(0.12, 0.3, 1.9, dark, 2.66, 0.62, 0, g);
    for (const z of [-0.6, 0.6]) box(0.06, 0.16, 0.34, M(0xfff6c8, 0.2, 0, { emissive: 0xfff0a0, emissiveIntensity: 0.9 }), 2.67, 0.95, z, g);
    const wheels = [];
    for (const x of [1.75, -1.6]) for (const z of [-0.9, 0.9]) { const w = cyl(0.42, 0.42, 0.3, M(0x15171a, 0.9), x, 0.42, z, g, 18); w.rotation.x = Math.PI / 2; cyl(0.22, 0.22, 0.31, M(0xb9bcbf, 0.4, 0.6), 0, 0, 0, w, 12); wheels.push(w); }
    const bm = new T.MeshStandardMaterial({ color: 0xa35a00, emissive: 0xff9a00, emissiveIntensity: 0 }); box(1.1, 0.1, 0.22, bm, 0.15, 1.95, 0, g);
    scene.add(g); return { g, wheels, bm };
  }
  // ---------- carretinha (baú amarelo com venezianas, traseira aberta) ----------
  function makeTrailer() {
    const g = new T.Group(); const yel = M(0xe2b419, 0.7), blk = M(0x1d1f21, 0.8), red = M(0xb01f23, 0.45, 0.2);
    const L = 2.8, Wd = 1.6, Hh = 1.55, y0 = 0.62;
    box(L, 0.1, Wd, M(0x5a4634, 0.9), 0, y0, 0, g);                      // piso de madeira
    box(L + 0.1, 0.12, Wd + 0.1, yel, 0, y0 - 0.1, 0, g);
    for (const s of [-1, 1]) {                                           // laterais com venezianas
      for (let i = 0; i < 9; i++) { const sl = box(L - 0.16, 0.13, 0.03, blk, 0, y0 + 0.17 + i * 0.155, s * (Wd / 2 - 0.02), g); sl.rotation.x = s * 0.5; }
      for (const x of [-L / 2 + 0.04, 0, L / 2 - 0.04]) box(0.08, Hh, 0.08, yel, x, y0 + Hh / 2, s * (Wd / 2 - 0.02), g);
      box(L, 0.08, 0.08, yel, 0, y0 + Hh, s * (Wd / 2 - 0.02), g);
      box(0.085, 0.5, 0.085, M(0xd92525, 0.5), -L / 2 + 0.04, y0 + 0.3, s * (Wd / 2 - 0.02), g); box(0.086, 0.16, 0.086, M(0xf5f5f5, 0.5), -L / 2 + 0.04, y0 + 0.3, s * (Wd / 2 - 0.02), g);
    }
    box(0.05, Hh, Wd, blk, L / 2 - 0.03, y0 + Hh / 2, 0, g);             // frente fechada
    const roof = cyl(Wd / 2 + 0.12, Wd / 2 + 0.12, L + 0.3, blk, 0, y0 + Hh - 0.02, 0, g, 20); roof.rotation.z = Math.PI / 2; roof.scale.set(0.22, 1, 1);
    const shut = cyl(0.1, 0.1, Wd - 0.1, blk, -L / 2 + 0.1, y0 + Hh - 0.12, 0, g, 12); shut.rotation.x = Math.PI / 2; // porta de enrolar recolhida
    box(0.06, 0.07, Wd, yel, -L / 2 + 0.03, y0 + Hh, 0, g);
    // reservatório vermelho e motor diesel
    const tank = cyl(0.34, 0.34, 1.0, red, -0.55, y0 + 0.45, 0.1, g, 20); tank.rotation.x = Math.PI / 2;
    sph(0.34, red, -0.55, y0 + 0.45, 0.6, g).scale.z = 0.45; sph(0.34, red, -0.55, y0 + 0.45, -0.4, g).scale.z = 0.45;
    const eng = new T.Group(); eng.position.set(-0.45, y0 + 1.0, 0.05); g.add(eng);
    box(0.5, 0.42, 0.46, M(0xc22a2a, 0.5, 0.2), 0, 0, 0, eng); box(0.3, 0.2, 0.3, blk, 0, 0.3, 0, eng); cyl(0.14, 0.14, 0.08, blk, -0.1, 0, 0.28, eng, 14).rotation.x = Math.PI / 2;
    cyl(0.03, 0.03, 0.35, M(0x888888, 0.5, 0.6), 0.2, 0.35, -0.15, eng, 8);
    const gauge = cyl(0.07, 0.07, 0.03, M(0xf5f5f5, 0.4), -0.9, y0 + 0.85, 0.1, g, 14); gauge.rotation.z = Math.PI / 2;
    const coil = new T.Mesh(new T.TorusGeometry(0.3, 0.07, 8, 20), M(0x111111, 0.8)); coil.position.set(-0.7, y0 + 0.75, -Wd / 2 + 0.16); g.add(coil);
    // eixo, rodas, lança, pé de apoio
    const wheels = []; for (const z of [-0.92, 0.92]) { const w = cyl(0.33, 0.33, 0.2, M(0x15171a, 0.9), -0.1, 0.33, z, g, 16); w.rotation.x = Math.PI / 2; wheels.push(w); box(0.9, 0.05, 0.26, blk, -0.1, 0.72, z, g); }
    box(2.0, 0.09, 0.09, blk, L / 2 + 0.9, 0.5, 0, g);
    const jack = cyl(0.035, 0.035, 0.5, M(0x777777, 0.5, 0.5), L / 2 + 0.7, 0.25, 0.12, g, 8);
    const chocks = new T.Group(); g.add(chocks); for (const dx of [-0.43, 0.43]) { const c = box(0.2, 0.16, 0.22, M(0xf0c40f, 0.8), -0.1 + dx, 0.08, 0.92, chocks); c.rotation.z = dx > 0 ? 0.5 : -0.5; }
    // biruta da carretinha
    cyl(0.025, 0.025, 1.6, M(0x888888, 0.5, 0.5), L / 2 - 0.15, y0 + Hh + 0.8, Wd / 2 - 0.1, g, 8);
    const sock = makeSock(0.9); sock.scale.setScalar(0.75); sock.position.set(L / 2 - 0.15, y0 + Hh + 1.5, Wd / 2 - 0.1); g.add(sock);
    scene.add(g); return { g, wheels, chocks, eng, sock, jack };
  }
  // ---------- plataforma elevatória (lança telescópica) ----------
  function makeLift() {
    const g = new T.Group(); const org = M(0xe36a14, 0.5, 0.2), dk = M(0x2a2e33, 0.7, 0.3), gr = M(0xd9dcde, 0.5, 0.3);
    box(3.7, 0.6, 1.9, dk, 0, 0.8, 0, g); box(2.2, 0.35, 2.1, dk, 0, 0.55, 0, g);
    const wheels = []; for (const x of [-1.3, 1.3]) for (const z of [-1.05, 1.05]) { const w = cyl(0.5, 0.5, 0.36, M(0x15171a, 0.9), x, 0.5, z, g, 18); w.rotation.x = Math.PI / 2; cyl(0.25, 0.25, 0.37, M(0xe36a14, 0.5), 0, 0, 0, w, 12); wheels.push(w); }
    const turret = new T.Group(); turret.position.set(-0.9, 1.1, 0); g.add(turret);
    box(2.0, 0.75, 1.7, org, 0.2, 0.4, 0, turret); box(0.9, 0.6, 1.72, dk, -0.9, 0.5, 0, turret); // contrapeso
    const bm = new T.MeshStandardMaterial({ color: 0xa35a00, emissive: 0xff9a00, emissiveIntensity: 0 }); cyl(0.07, 0.07, 0.12, bm, 0.6, 0.86, 0.6, turret, 10);
    const boom = new T.Group(); g.add(boom);
    const b1 = new T.Mesh(new T.BoxGeometry(0.42, 0.46, 1).translate(0, 0, 0.5), org); b1.castShadow = true; boom.add(b1);
    const b2 = new T.Mesh(new T.BoxGeometry(0.3, 0.34, 1).translate(0, 0, 0.5), gr); b2.castShadow = true; boom.add(b2);
    const basket = new T.Group(); g.add(basket);
    const rail = M(0xe36a14, 0.5, 0.2);
    box(1.9, 0.06, 0.95, dk, 0, -0.4, -0.55, basket);
    for (const x of [-0.93, 0.93]) for (const z of [-0.1, -1.0]) box(0.05, 1.15, 0.05, rail, x, 0.15, z, basket);
    for (const y of [0.15, 0.7]) { for (const z of [-0.1, -1.0]) box(1.9, 0.045, 0.045, rail, 0, y, z, basket); for (const x of [-0.93, 0.93]) box(0.045, 0.045, 0.9, rail, x, y, -0.55, basket); }
    box(1.9, 0.14, 0.03, rail, 0, -0.3, -1.0, basket); box(0.4, 0.3, 0.12, dk, 0, 0.55, -0.12, basket); // painel
    box(0.3, 0.5, 0.25, dk, 0, -0.1, 0.02, basket);
    scene.add(g); return { g, wheels, turret, boom, b1, b2, basket, bm };
  }
  // ---------- objetos do cenário de emergência ----------
  const truck = makeTruck(), trailer = makeTrailer(), lift = makeLift();
  const TZ = 17, LZ = 8;
  // mesa dobrável + maleta XPAR
  const table = new T.Group(); scene.add(table); table.position.set(-17.8, 0, 15.6);
  box(0.9, 0.04, 0.6, M(0x23262a, 0.6), 0, 0.74, 0, table);
  for (const s of [-1, 1]) { const l1 = box(0.035, 0.95, 0.035, M(0x23262a, 0.6), 0, 0.37, s * 0.25, table); l1.rotation.z = 0.55; const l2 = box(0.035, 0.95, 0.035, M(0x23262a, 0.6), 0, 0.37, s * 0.25, table); l2.rotation.z = -0.55; }
  const maleta = new T.Group(); table.add(maleta); maleta.position.set(0, 0.76, 0);
  box(0.62, 0.42, 0.24, M(0x16181a, 0.55), 0, 0.21, 0, maleta); box(0.2, 0.05, 0.05, M(0x16181a, 0.55), 0, 0.45, 0, maleta);
  const dispMat = new T.MeshStandardMaterial({ color: 0x0c1a2a, emissive: 0x35c8ff, emissiveIntensity: 0 });
  box(0.2, 0.09, 0.01, dispMat, -0.05, 0.27, -0.123, maleta);
  const ledMat = new T.MeshStandardMaterial({ color: 0x0c2a10, emissive: 0x30ff50, emissiveIntensity: 0 });
  box(0.07, 0.09, 0.01, ledMat, 0.17, 0.2, -0.123, maleta); box(0.1, 0.04, 0.01, M(0xf2d21a, 0.6), 0.17, 0.3, -0.123, maleta);
  for (const y of [0.12, 0.2, 0.28, 0.36]) cyl(0.012, 0.012, 0.05, M(0xb9bcbf, 0.3, 0.8), -0.33, y, 0, maleta, 8).rotation.z = Math.PI / 2;
  // cones e tela laranja
  const conePts = [[-26, 18], [-26, 14.7], [-26, 11.3], [-26, 8]]; const cones = [], fences = [];
  conePts.forEach(([x, z], i) => {
    const c = new T.Group(); c.position.set(x, 0, z); scene.add(c);
    box(0.36, 0.03, 0.36, M(0x1c1c1c, 0.9), 0, 0.015, 0, c); cyl(0.035, 0.15, 0.72, M(0xf2681c, 0.7), 0, 0.39, 0, c, 14); cyl(0.075, 0.1, 0.14, M(0xf5f5f5, 0.6), 0, 0.45, 0, c, 14);
    cyl(0.02, 0.02, 1.05, M(0xf2681c, 0.7), 0, 0.52, 0, c, 8); cones.push(c);
    if (i > 0) { const f = box(0.02, 0.8, Math.abs(z - conePts[i - 1][1]), new T.MeshStandardMaterial({ color: 0xf2681c, transparent: true, opacity: 0.62, roughness: 0.9, side: T.DoubleSide }), x, 0.62, (z + conePts[i - 1][1]) / 2, scene); f.castShadow = false; fences.push(f); }
  });
  // mangueiras
  const hoseY = new T.Mesh(new T.BufferGeometry(), M(0xe0b000, 0.6)); scene.add(hoseY); hoseY.castShadow = true;
  const hoseB = [0, 1].map(() => { const m = new T.Mesh(new T.BufferGeometry(), M(0x1f8fd6, 0.55)); m.castShadow = true; scene.add(m); return m; });
  function setHose(mesh, pts, frac, r) {
    mesh.geometry.dispose();
    if (frac <= 0.02) { mesh.visible = false; return; }
    mesh.visible = true;
    const full = new T.CatmullRomCurve3(pts, false, "centripetal").getPoints(70);
    const n = Math.max(3, Math.ceil(frac * 70));
    mesh.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(full.slice(0, n + 1)), n * 2, r, 7);
  }
  // equipe
  const wA = makeWorker({ suit: 0x2d4f7c }), wB = makeWorker({ suit: 0x2d4f7c });
  const wC = makeWorker({ suit: 0x2d4f7c, vest: true, helmet: 0xf0c40f }), wD = makeWorker({ suit: 0x2d4f7c, vest: true, helmet: 0xf0c40f });
  scene.remove(wA.g); scene.remove(wB.g); lift.basket.add(wA.g); lift.basket.add(wB.g);
  wA.g.position.set(-0.45, -0.37, -0.55); wA.g.rotation.y = Math.PI; wB.g.rotation.y = Math.PI;
  wC.carry.visible = true; wD.radio.visible = true;

  // placa e cintas
  const plateGeo = (r) => new T.CylinderGeometry(r, r, 0.56, 20, 1, true, 0.7, 1.25).rotateZ(Math.PI / 2);
  function makePlate() { const g = new T.Group(); const a = new T.Mesh(plateGeo(0.538), M(0xf0cf1c, 0.55, 0.1, { side: T.DoubleSide })); const b = new T.Mesh(plateGeo(0.522).scale(0.94, 1, 1), M(0x1a1a1a, 0.9, 0, { side: T.DoubleSide })); a.castShadow = true; g.add(a); g.add(b); return g; }
  const plateCarried = makePlate(); lift.basket.add(plateCarried); plateCarried.position.set(0.45, 0.35 - 0.52, -0.95 - 0.13);
  const plateWorld = makePlate(); scene.add(plateWorld); plateWorld.visible = false;
  const straps = [-0.17, 0.17].map((dx) => {
    const g = new T.Group(); g.position.set(LX + dx, PY, 0); scene.add(g); const segs = []; const N = 56;
    for (let i = 0; i < N; i++) { const p = new T.Group(); p.rotation.x = -(i + 0.5) / N * Math.PI * 2; g.add(p); const s = box(0.075, 0.07, 0.014, M(0xe85d0c, 0.7), 0, 0, 1, p); s.castShadow = false; segs.push(s); p.visible = false; }
    const rat = new T.Group(); rat.rotation.x = -0.25; g.add(rat); const rb = box(0.1, 0.12, 0.05, M(0x30343a, 0.4, 0.7), 0, 0, 1, rat); rat.visible = false;
    return { g, segs, rat, rb };
  });

  // gás
  const GN = 170, gas = []; for (let i = 0; i < GN; i++) gas.push(puff(0xeef2dc));
  const exh = []; for (let i = 0; i < 12; i++) exh.push(puff(0x55585c));
  const G = (t) => t < 3.5 ? 0 : t < 4.2 ? (t - 3.5) / 0.7 : t < 61 ? 1 : t < 62.6 ? lerp(1, 0.32, (t - 61) / 1.6) : t < 65.3 ? lerp(0.32, 0, (t - 62.6) / 2.7) : 0;
  const frac = (x) => x - Math.floor(x);

  // ---------- câmeras ----------
  let basketW = V(0, 0, 0);
  const shots = [
    { a: 0, b: 6, p0: [-46, 17, 58], p1: [-33, 13, 44], t0: [-4, 8, -6], t1: [0, 7.5, -2] },
    { a: 6, b: 10, p0: [-3.6, 8.3, 6.6], p1: [-2.6, 8.0, 5.4], t0: [0.6, 7.5, 0], t1: [0.8, 7.7, 0] },
    { a: 10, b: 13, p0: [3.2, 1.7, 11.5], p1: [4.4, 2.1, 10.4], t0: [10.5, 6.6, 3.6], t1: [10.8, 6.8, 3.6] },
    { a: 13, b: 22, p0: [-34, 2.6, 31], p1: [-14, 4.2, 33], tf: (t) => V(lerp(-52, -14, sm(13, 21, t)), 1.6, 13.5) },
    { a: 22, b: 30, p0: [-8.5, 4.6, 1.8], p1: [-12.5, 3.7, 4.2], t0: [-17.5, 1.1, 15], t1: [-18, 1.1, 15.2] },
    { a: 30, b: 37, p0: [-21.6, 2.0, 12.6], p1: [-20.6, 1.75, 13.5], t0: [-17.3, 1.05, 16.3], t1: [-17.4, 1.0, 16.2] },
    { a: 37, b: 42, p0: [-13.6, 2.8, 6.0], p1: [-14.2, 2.7, 6.5], t0: [-16.3, 2.5, 8], t1: [-16.3, 2.5, 8] },
    { a: 42, b: 52.5, p0: [11, 4.5, 13.5], p1: [8.5, 8.8, 10], tf: () => basketW.clone().add(V(0, 0.6, 0)) },
    { a: 52.5, b: 55.5, p0: [-21.4, 1.85, 19.0], p1: [-21.0, 1.9, 18.7], t0: [-6, 3.8, 6], t1: [-6, 4.0, 6] },
    { a: 55.5, b: 60.5, p0: [-2.9, 8.5, 4.3], p1: [-2.3, 8.3, 3.9], t0: [0.25, 7.15, 0.3], t1: [0.3, 7.15, 0.3] },
    { a: 60.5, b: 67, p0: [2.3, 8.3, -1.75], p1: [1.7, 8.2, -1.6], t0: [-0.05, 7.3, 0.6], t1: [0.0, 7.3, 0.6] },
    { a: 67, b: 70, p0: [4.4, 2.1, 10.4], p1: [3.8, 2.0, 11], t0: [10.8, 6.8, 3.6], t1: [10.6, 6.7, 3.6] },
    { a: 70, b: 78.1, p0: [-25, 6.5, 30], p1: [-33, 11.5, 40], t0: [-9, 3.2, 9], t1: [-8, 3.5, 6] },
  ];

  // ---------- quadro ----------
  window.DURATION = 78;
  window.renderFrame = function (t) {
    // gás
    const g = G(t);
    for (let i = 0; i < GN; i++) {
      const s = gas[i], rate = 0.34 + (i % 7) * 0.03, ph = frac(i * 0.6180339);
      const u = frac(t * rate + ph), birth = t - u / rate, gi = G(birth);
      if (gi <= 0.001) { s.material.opacity = 0; continue; }
      const jl = 3.4 * Math.sqrt(gi), sd = 1 - (1 - u) * (1 - u);
      const tw = 2.2 * u;
      s.position.set(
        leakE.x + 0.1 * jl * sd + 10.5 * Math.pow(u, 1.55) + Math.sin(i * 12.9 + t * 1.3) * 0.45 * tw,
        leakE.y + 0.95 * jl * sd + 3.0 * u + Math.cos(i * 7.1 + t * 1.1) * 0.35 * tw,
        leakE.z + 0.2 * jl * sd + Math.sin(i * 3.7 + t * 0.9) * 0.55 * tw);
      const sz = (0.22 + u * 3.6) * (0.75 + 0.25 * gi); s.scale.set(sz, sz, 1);
      s.material.opacity = 0.62 * Math.pow(1 - u, 1.3) * Math.min(1, u * 14) * (0.35 + 0.65 * gi);
    }
    for (let i = 0; i < steam.length; i++) {
      const s = steam[i], u = frac(t * 0.05 + i / 13), k = i % 2, bx = k ? 62 : -72, bz = k ? -60 : -62, by = k ? 58 : 46;
      s.position.set(bx + 26 * u + Math.sin(i * 3 + t * 0.3) * 2 * u, by + 9 * Math.sqrt(u), bz + Math.cos(i * 5.1) * 3 * u);
      const sz = 3 + u * 16; s.scale.set(sz, sz, 1); s.material.opacity = 0.42 * (1 - u) * Math.min(1, u * 8);
    }
    // alarme
    const alarm = t >= 5.5 && t < 67.4;
    for (const b of beacons) { const p = alarm ? Math.pow(0.5 + 0.5 * Math.sin(t * 9 + b.ph), 2) : 0; b.mat.emissiveIntensity = p * 4.5; if (b.pl) b.pl.intensity = p * 110; }
    // birutas
    sockArea.rotation.z = Math.sin(t * 2.3) * 0.06 - 0.1; sockArea.rotation.y = Math.sin(t * 1.1) * 0.08;
    trailer.sock.rotation.z = Math.sin(t * 2.7 + 1) * 0.07 - 0.12; trailer.sock.rotation.y = Math.sin(t * 1.3) * 0.1;

    // veículos
    const vis = t >= 12.6;
    const kT = 1 - Math.pow(1 - lin(13, 20.5, t), 2.3), tx = lerp(-95, -10, kT);
    truck.g.visible = trailer.g.visible = vis; truck.g.position.set(tx, 0, TZ); trailer.g.position.set(tx - 5.6, 0, TZ);
    for (const w of truck.wheels) w.rotation.y = -(tx / 0.42); for (const w of trailer.wheels) w.rotation.y = -(tx / 0.33);
    const flash = (ph) => (Math.sin(t * 11 + ph) > 0.3 ? 3.2 : 0.1);
    truck.bm.emissiveIntensity = vis && t < 70 ? flash(0) : 0; lift.bm.emissiveIntensity = vis ? flash(1.5) : 0;
    trailer.chocks.visible = t >= 27.2; trailer.jack.visible = true;
    const engOn = t >= 29.5;
    trailer.eng.position.x = -0.45 + (engOn ? Math.sin(t * 61) * 0.006 : 0); trailer.eng.position.y = 1.62 + (engOn ? Math.sin(t * 47) * 0.006 : 0);
    for (let i = 0; i < exh.length; i++) {
      const s = exh[i], u = frac(t * 0.8 + i / exh.length);
      s.position.set(-15.6 - 0.25 + 1.4 * u, 2.25 + 1.6 * u, TZ - 0.1 + Math.sin(i * 4.1) * 0.25 * u); const sz = 0.15 + u * 0.9; s.scale.set(sz, sz, 1);
      s.material.opacity = engOn ? 0.38 * (1 - u) * (t < 33 ? 1 : 0.45) : 0;
    }
    // plataforma
    const k1 = 1 - Math.pow(1 - lin(14, 22.5, t), 2.3), k2 = sm(42, 46.6, t);
    const cx = lerp(lerp(-104, -20, k1), -5.5, k2);
    lift.g.visible = vis; lift.g.position.set(cx, 0, LZ);
    for (const w of lift.wheels) w.rotation.y = -(cx / 0.5);
    const kb = sm(46.8, 52.6, t) - sm(69, 76.5, t);
    const P = V(-0.9, 1.75, 0);
    const yaw = lerp(0, -0.8135, kb), rad = lerp(4.1, 8.67, Math.pow(kb, 1.3)), hy = lerp(1.3, 6.15, Math.pow(kb, 0.75));
    const att = V(P.x + Math.cos(yaw) * rad, hy, P.z + Math.sin(yaw) * rad);
    lift.turret.rotation.y = -yaw;
    lift.boom.position.copy(P); lift.boom.lookAt(V(cx, 0, LZ).add(att)); const bl = P.distanceTo(att);
    lift.b1.scale.z = Math.min(bl, 4.4) ; lift.b2.scale.z = bl;
    lift.basket.position.copy(att); lift.basket.rotation.y = lerp(-Math.PI / 2, 0, kb);
    basketW = V(cx + att.x, att.y, LZ + att.z);

    // equipe na cesta
    const inB = t >= 37; wB.g.visible = t >= 22;
    const mA = sm(38, 39.1, t) - sm(39.3, 40.1, t), mB = sm(38.7, 39.8, t) - sm(40, 40.8, t);
    wA.setMask(t >= 39.05); wB.setMask(t >= 39.75);
    const strapA = sm(56, 56.8, t) - sm(60.6, 61.4, t), tight = sm(63.3, 63.9, t) - sm(65.6, 66.4, t), plateB = sm(60.3, 61, t) - sm(65.6, 66.4, t);
    const thumbs = sm(66.6, 67.3, t) - sm(69, 69.8, t);
    const wob = Math.sin(t * 7) * 0.12;
    const aArm = -Math.max(mA * 1.95, (strapA + tight) * (1.55 + wob * strapA + Math.sin(t * 16) * 0.08 * tight));
    wA.pose({ armL: Math.min(aArm, -thumbs * 2.6), armR: aArm, headX: 0.12 * (strapA + tight), lean: 0.12 * (strapA + tight) });
    if (inB) {
      if (wB.g.parent !== lift.basket) { scene.remove(wB.g); lift.basket.add(wB.g); }
      wB.g.position.set(0.45, -0.37, -0.55); wB.g.rotation.y = Math.PI;
      const bArm = -Math.max(mB * 1.95, plateB * (1.5 + Math.sin(t * 15) * 0.07 * tight));
      wB.pose({ armL: bArm, armR: Math.min(bArm, -thumbs * 2.6), lean: 0.12 * plateB, headX: 0.1 * plateB });
    } else {
      if (wB.g.parent !== scene) { lift.basket.remove(wB.g); scene.add(wB.g); }
      const p = pathAt([[-12.5, 15.4], [-20, 14], [-26, 18.4], [-26, 7.6], [-17.6, 9.8]], 22.3, 35.6, t);
      wB.g.position.set(p.x, 0, p.z); wB.g.rotation.y = p.moving ? p.heading : (t < 23 ? -Math.PI / 2 : 2.2);
      wB.pose(p.moving ? { walk: p.dist * 3.0 } : {});
      // cones e tela aparecem conforme passa
      const dC = [7.6 + 7.4, 0, 0, 0]; let acc = 7.6 + 7.44;
      conePts.forEach((c, i) => { const need = acc + (18.4 - c[1]) - 0.3; cones[i].visible = p.dist >= need; if (i > 0) fences[i - 1].visible = p.dist >= need + 0.3; });
    }
    if (inB) { cones.forEach((c) => (c.visible = true)); fences.forEach((f) => (f.visible = true)); }
    if (t < 22) { cones.forEach((c) => (c.visible = false)); fences.forEach((f) => (f.visible = false)); }

    // vigias
    wC.g.visible = wD.g.visible = t >= 22;
    const pc = pathAt([[-9.5, 15.3], [-17.3, 15.2], [-17.8, 16.3]], 22.2, 26, t);
    wC.g.position.set(pc.x, 0, pc.z); wC.carry.visible = t < 26;
    const toLeakC = Math.atan2(0 - -17.8, 0 - 16.3);
    wC.g.rotation.y = pc.moving ? pc.heading : lerp(Math.PI, Math.PI, 1);
    const look = sm(49, 50, t) - sm(52.4, 52.6, t) * 0 ;
    const cheer = sm(71, 72, t) - sm(75.5, 76.5, t);
    if (pc.moving) wC.pose({ walk: pc.dist * 3.2, armR: 0.05 });
    else wC.pose({ lean: 0.28 * (1 - cheer), headX: 0.25 * (1 - cheer), armL: -0.9 * (1 - cheer) - (0.15 * Math.sin(t * 3)) * (t > 30 && t < 37 ? 1 : 0) - cheer * 2.7, armR: -0.75 * (1 - cheer) });
    const pd1 = pathAt([[-11, 15.3], [-18.3, 15.9], [-17.9, 17.2]], 22.6, 26.4, t), pd2 = pathAt([[-17.9, 17.2], [-19.4, 16.2]], 34, 35.6, t);
    const dMove2 = t >= 34;
    const pd = dMove2 ? pd2 : pd1;
    wD.g.position.set(pd.x, 0, pd.z);
    const faceLeak = Math.atan2(-2 - -19.4, 4 - 16.2);
    wD.g.rotation.y = pd.moving ? pd.heading : (dMove2 ? faceLeak : Math.PI / 2);
    const radioUp = (sm(36, 37, t) - sm(69.5, 70.5, t));
    if (pd.moving) wD.pose({ walk: pd.dist * 3.2 });
    else if (!dMove2) wD.pose({ armL: -1.2 - Math.sin(t * 5) * 0.2, armR: -1.3, lean: 0.2 });
    else wD.pose({ armL: -2.35 * radioUp - cheer * 0.3, armLz: 0.35 * radioUp, armR: -cheer * 2.7, headX: -0.18 * radioUp });
    table.visible = t >= 24.6;
    dispMat.emissiveIntensity = t >= 31 ? 1.6 + 0.3 * Math.sin(t * 5) : 0; ledMat.emissiveIntensity = t >= 33.2 ? 2.2 : 0;

    // mangueiras
    setHose(hoseY, [V(-17.0, 1.25, 17.05), V(-17.25, 0.75, 16.75), V(-17.75, 0.35, 16.25), V(-18.25, 0.6, 15.75), V(-18.13, 0.95, 15.6)], sm(30.2, 32.2, t), 0.028);
    const ub = V(basketW.x - 0.2, 0.04, basketW.z + 0.5);
    for (let i = 0; i < 2; i++) {
      const o = i * 0.22 - 0.11, m0 = V(-18.13, 0.98 + i * 0.08, 15.6);
      const mid = V(lerp(-18.6, ub.x, 0.45) + o, 0.03, lerp(13.6, ub.z, 0.45) + 1.3 + o);
      const pre = V(lerp(-18.6, ub.x, 0.86) + o, 0.03, lerp(13.6, ub.z, 0.86) + 0.9);
      const pts = [m0, V(-18.5, 0.5, 15.35 + o * 0.3), V(-18.75 + o, 0.03, 14.6), mid, pre, V(ub.x + o, Math.max(0.05, basketW.y * 0.42), ub.z - 0.2), V(basketW.x + (i ? 0.45 : -0.45), basketW.y + 0.1, basketW.z - 0.12 * (1 - 0) )];
      setHose(hoseB[i], pts, sm(32.4 + i * 0.5, 35.6 + i * 0.4, t), 0.022);
    }

    // cintas e placa
    straps.forEach((s, j) => {
      const p = sm(56.6 + j * 1.6, 59 + j * 1.6, t), R = lerp(0.6, 0.553, sm(63.5, 65.4, t));
      s.segs.forEach((m, i) => { m.parent.visible = i < p * s.segs.length; m.position.z = R + Math.sin(i * 0.9 + t * 9) * 0.012 * (1 - sm(63.5, 65.4, t)) * (p < 1 ? 1 : 0.4); });
      s.rat.visible = p >= 0.999; s.rb.position.z = R + 0.03;
    });
    const pk = sm(60.6, 62.8, t);
    plateCarried.visible = t < 60.6; plateWorld.visible = t >= 60.6;
    const st = V(-0.45 + 0.45 - LX, 6.15 + 0.35 - 0.52 - PY, 1.7 - 0.95 - 0.13);
    plateWorld.position.set(LX + st.x * (1 - pk), PY + st.y * (1 - pk) + Math.sin(pk * Math.PI) * 0.22, st.z * (1 - pk) + Math.sin(pk * Math.PI) * 0.3);
    plateWorld.scale.setScalar(lerp(1.06, 1.0, sm(63.5, 65.4, t)));

    // câmera
    let sh = shots[shots.length - 1]; for (const s of shots) if (t >= s.a && t < s.b) { sh = s; break; }
    const kl = clamp((t - sh.a) / (sh.b - sh.a)), kk = 0.5 * kl + 0.5 * kl * kl * (3 - 2 * kl);
    camera.position.set(lerp(sh.p0[0], sh.p1[0], kk), lerp(sh.p0[1], sh.p1[1], kk), lerp(sh.p0[2], sh.p1[2], kk));
    const tg = sh.tf ? sh.tf(t) : V(lerp(sh.t0[0], sh.t1[0], kk), lerp(sh.t0[1], sh.t1[1], kk), lerp(sh.t0[2], sh.t1[2], kk));
    camera.lookAt(tg);
    renderer.render(scene, camera);
    return true;
  };
})();
