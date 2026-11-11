# Renderiza no Blender (Cycles) a cena exportada do three.js.
# Uso: python3 render_bl.py <inicio> <fim> <passo> <dir_saida> [amostras] [largura] [altura]  |  ou lista: python3 render_bl.py list 48,192 ...
import bpy, sys, os, json, gzip, math, time, re
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
argv = sys.argv[1:]
if argv[0] == "list":
    FRAMES = [int(x) for x in argv[1].split(",")]; rest = argv[2:]
else:
    FRAMES = list(range(int(argv[0]), int(argv[1]), int(argv[2]))); rest = argv[3:]
OUT = rest[0]; SAMPLES = int(rest[1]) if len(rest) > 1 else 32
RW = int(rest[2]) if len(rest) > 2 else 1280; RH = int(rest[3]) if len(rest) > 3 else 720
os.makedirs(OUT, exist_ok=True)
FRAMES = [f for f in FRAMES if not os.path.exists(os.path.join(OUT, "f%05d.jpg" % f))]
if not FRAMES:
    print("nada a fazer"); sys.exit(0)

meta = json.load(open(os.path.join(HERE, "meta.json")))
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))); Ci = C.inverted()
def m3(e): return Matrix((e[0:16:4], e[1:16:4], e[2:16:4], e[3:16:4]))
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hexcol(h): return (lin(((h >> 16) & 255) / 255), lin(((h >> 8) & 255) / 255), lin((h & 255) / 255))

# ---------- cena ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "scene.glb"))
objs = {}
for o in list(sc.objects):
    if o.type == "MESH" and re.fullmatch(r"m\d+", o.name): objs[int(o.name[1:])] = o
print("malhas", len(objs), "de", meta["nMesh"])
bpy.context.view_layer.update()
for o in objs.values():
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in list(sc.objects):
    if o.name not in {x.name for x in objs.values()}: bpy.data.objects.remove(o, do_unlink=True)

# ---------- materiais ----------
def bsdf(mat):
    for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED": return n
    return None
def img(name, noncolor=False):
    im = bpy.data.images.load(os.path.join(A, name), check_existing=True)
    if noncolor: im.colorspace_settings.name = "Non-Color"
    return im
def pbr(mat, asset, sx, sy, coord="UV", tint=None, bump=1.0, proj="FLAT"):
    nt = mat.node_tree; b = bsdf(mat); N = nt.nodes; L = nt.links
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (sx, sy, sx)
    L.new(tc.outputs[coord], mp.inputs["Vector"])
    def tex(f, nc):
        t = N.new("ShaderNodeTexImage"); t.image = img(f, nc); t.projection = proj
        if proj == "BOX": t.projection_blend = 0.25
        L.new(mp.outputs["Vector"], t.inputs["Vector"]); return t
    d = tex(asset + "_diff.jpg", False)
    for l in list(b.inputs["Base Color"].links): L.remove(l)
    if tint is not None:
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 1.0
        mx.inputs["A"].default_value = (*tint, 1); L.new(d.outputs["Color"], mx.inputs["B"]); L.new(mx.outputs["Result"], b.inputs["Base Color"])
    else: L.new(d.outputs["Color"], b.inputs["Base Color"])
    r = tex(asset + "_rough.jpg", True); L.new(r.outputs["Color"], b.inputs["Roughness"])
    if proj == "BOX": return
    n = tex(asset + "_nor.jpg", True); nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
    L.new(n.outputs["Color"], nm.inputs["Color"]); L.new(nm.outputs["Normal"], b.inputs["Normal"])
def weathered(mat, c1, c2, rough=(0.35, 0.65), scale=1.6, bump=0.04, rust=None):
    nt = mat.node_tree; b = bsdf(mat); N = nt.nodes; L = nt.links
    for l in list(b.inputs["Base Color"].links): L.remove(l)
    tc = N.new("ShaderNodeTexCoord")
    n1 = N.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = scale; n1.inputs["Detail"].default_value = 8; n1.inputs["Roughness"].default_value = 0.65
    L.new(tc.outputs["Object"], n1.inputs["Vector"])
    cr = N.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].position = 0.35; cr.color_ramp.elements[0].color = (*c2, 1); cr.color_ramp.elements[1].position = 0.62; cr.color_ramp.elements[1].color = (*c1, 1)
    L.new(n1.outputs["Fac"], cr.inputs["Fac"]); col = cr.outputs["Color"]
    if rust:
        n3 = N.new("ShaderNodeTexNoise"); n3.inputs["Scale"].default_value = 4.5; n3.inputs["Detail"].default_value = 10; n3.inputs["Roughness"].default_value = 0.75
        L.new(tc.outputs["Object"], n3.inputs["Vector"])
        rr = N.new("ShaderNodeValToRGB"); rr.color_ramp.elements[0].position = 0.66; rr.color_ramp.elements[1].position = 0.74
        L.new(n3.outputs["Fac"], rr.inputs["Fac"])
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs["B"].default_value = (*rust, 1)
        L.new(rr.outputs["Color"], mx.inputs["Factor"]); L.new(col, mx.inputs["A"]); col = mx.outputs["Result"]
    L.new(col, b.inputs["Base Color"])
    n2 = N.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 35; n2.inputs["Detail"].default_value = 4
    L.new(tc.outputs["Object"], n2.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = rough[0]; mr.inputs["To Max"].default_value = rough[1]
    L.new(n2.outputs["Fac"], mr.inputs["Value"]); L.new(mr.outputs["Result"], b.inputs["Roughness"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; L.new(n2.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs["Normal"], b.inputs["Normal"])

dyn_mats = {}
for mat in bpy.data.materials:
    if not mat.node_tree or not bsdf(mat): continue
    nm = mat.name.split(".")[0]; b = bsdf(mat)
    if nm == "MAT_asphalt": pbr(mat, "asphalt_02", 64, 3.4, tint=(0.62, 0.62, 0.64))
    elif nm == "MAT_concrete": pbr(mat, "concrete_floor_worn_001", 160, 160)
    elif nm == "MAT_grass": pbr(mat, "sparse_grass", 70, 9, tint=(0.75, 1.0, 0.6))
    elif nm == "MAT_shed":
        nt = mat.node_tree; N = nt.nodes; L = nt.links
        for l in list(b.inputs["Base Color"].links): L.remove(l)
        b.inputs["Base Color"].default_value = (0.50, 0.56, 0.62, 1); b.inputs["Metallic"].default_value = 0.3
        tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.1, 0.1, 0.1); L.new(tc.outputs["Object"], mp.inputs["Vector"])
        t = N.new("ShaderNodeTexImage"); t.image = img("corrugated_iron_02_rough.jpg", True); t.projection = "BOX"; t.projection_blend = 0.2; L.new(mp.outputs["Vector"], t.inputs["Vector"])
        L.new(t.outputs["Color"], b.inputs["Roughness"])
        wv = N.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 14; wv.bands_direction = "X"; L.new(tc.outputs["Object"], wv.inputs["Vector"])
        bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.5; L.new(wv.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs["Normal"], b.inputs["Normal"])
    elif nm == "MAT_pipe": weathered(mat, (0.78, 0.55, 0.02), (0.56, 0.40, 0.04), rust=(0.22, 0.10, 0.03)); b.inputs["Metallic"].default_value = 0.0
    elif nm in ("MAT_steel", "MAT_steel2"): weathered(mat, (0.40, 0.55, 0.42), (0.30, 0.44, 0.33), rough=(0.45, 0.8), scale=2.5, rust=(0.20, 0.09, 0.03)); b.inputs["Metallic"].default_value = 0.0
    elif nm == "MAT_suit":
        nt = mat.node_tree; N = nt.nodes; L = nt.links
        tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (7, 7, 7); L.new(tc.outputs["UV"], mp.inputs["Vector"])
        t = N.new("ShaderNodeTexImage"); t.image = img("denim_fabric_nor.jpg", True); L.new(mp.outputs["Vector"], t.inputs["Vector"])
        nmp = N.new("ShaderNodeNormalMap"); nmp.inputs["Strength"].default_value = 0.8; L.new(t.outputs["Color"], nmp.inputs["Color"]); L.new(nmp.outputs["Normal"], b.inputs["Normal"])
        b.inputs["Roughness"].default_value = 0.9
    if nm.startswith("DYN_"):
        dyn_mats[nm] = mat
        ec = {"DYN_beacon": (1, 0.05, 0.02), "DYN_truckBm": (1, 0.5, 0.0), "DYN_liftBm": (1, 0.5, 0.0), "DYN_disp": (0.15, 0.7, 1), "DYN_led": (0.15, 1, 0.25)}
        for k, v in ec.items():
            if nm.startswith(k): b.inputs["Emission Color"].default_value = (*v, 1)
        if nm == "DYN_sand":
            mat.surface_render_method = "DITHERED" if hasattr(mat, "surface_render_method") else mat.surface_render_method
            for l in list(b.inputs["Alpha"].links): mat.node_tree.links.remove(l)
            b.inputs["Metallic"].default_value = 0.55; b.inputs["Roughness"].default_value = 0.42; b.inputs["Base Color"].default_value = (0.33, 0.34, 0.35, 1)
        if nm == "DYN_putty":
            for l in list(b.inputs["Base Color"].links): mat.node_tree.links.remove(l)

# ---------- céu real (HDRI) ----------
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
N = w.node_tree.nodes; L = w.node_tree.links; bg = N["Background"]
env = N.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(A, "sky.hdr"))
px = np.empty(env.image.size[0] * env.image.size[1] * 4, dtype=np.float32); env.image.pixels.foreach_get(px)
px = px.reshape(env.image.size[1], env.image.size[0], 4); lum = px[:, :, :3].sum(axis=2)
iy, ix = np.unravel_index(np.argmax(lum), lum.shape); u = (ix + 0.5) / lum.shape[1]
phi_tex = math.pi - (u - 0.5) * 2 * math.pi; phi_d = math.atan2(-50, -45)
print("sol no HDRI: u=%.3f elev=%.1f graus" % (u, (iy / lum.shape[0] - 0.5) * 180)); del px, lum
tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, 0, phi_tex - phi_d)
L.new(tc.outputs["Generated"], mp.inputs["Vector"]); L.new(mp.outputs["Vector"], env.inputs["Vector"]); L.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.0

# ---------- gás, vapor e poeira (planos voltados para a câmera) ----------
sm = bpy.data.materials.new("SPR"); sm.use_nodes = True; N = sm.node_tree.nodes; L = sm.node_tree.links; N.clear()
tc = N.new("ShaderNodeTexCoord"); ln = N.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"; L.new(tc.outputs["Object"], ln.inputs[0])
mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.5; mr.inputs["From Max"].default_value = 0.0; mr.interpolation_type = "SMOOTHERSTEP"; L.new(ln.outputs["Value"], mr.inputs["Value"])
oi = N.new("ShaderNodeObjectInfo"); mu = N.new("ShaderNodeMath"); mu.operation = "MULTIPLY"; L.new(mr.outputs["Result"], mu.inputs[0]); L.new(oi.outputs["Alpha"], mu.inputs[1])
df = N.new("ShaderNodeBsdfDiffuse"); L.new(oi.outputs["Color"], df.inputs["Color"])
em = N.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 0.6; L.new(oi.outputs["Color"], em.inputs["Color"])
ad = N.new("ShaderNodeAddShader"); L.new(df.outputs[0], ad.inputs[0]); L.new(em.outputs[0], ad.inputs[1])
tr = N.new("ShaderNodeBsdfTransparent"); mxs = N.new("ShaderNodeMixShader"); L.new(mu.outputs[0], mxs.inputs[0]); L.new(tr.outputs[0], mxs.inputs[1]); L.new(ad.outputs[0], mxs.inputs[2])
out = N.new("ShaderNodeOutputMaterial"); L.new(mxs.outputs[0], out.inputs["Surface"])
pm = bpy.data.meshes.new("spr"); pm.from_pydata([(-0.5, -0.5, 0), (0.5, -0.5, 0), (0.5, 0.5, 0), (-0.5, 0.5, 0)], [], [(0, 1, 2, 3)]); pm.materials.append(sm)
sprites = []
for i in range(meta["nSpr"]):
    o = bpy.data.objects.new("s%d" % i, pm); sc.collection.objects.link(o); o.hide_render = True; o.visible_shadow = False
    o["col"] = hexcol(meta["sprCol"][i]); sprites.append(o)

# ---------- mangueiras e talabartes ----------
dyn = []
for i in range(meta["nDyn"]):
    cu = bpy.data.curves.new("d%d" % i, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.02; cu.bevel_resolution = 3; cu.use_fill_caps = True
    m = bpy.data.materials.new("dm%d" % i); m.use_nodes = True; b = bsdf(m); b.inputs["Base Color"].default_value = (*hexcol(meta["dynCol"][i]), 1); b.inputs["Roughness"].default_value = 0.45
    cu.materials.append(m); o = bpy.data.objects.new("d%d" % i, cu); sc.collection.objects.link(o); o.hide_render = True; dyn.append(o)

# ---------- luzes do alarme e câmera ----------
lights = []
for p in meta["lights"]:
    ld = bpy.data.lights.new("bl", "POINT"); ld.color = (1, 0.12, 0.05); ld.energy = 0; ld.shadow_soft_size = 0.15
    o = bpy.data.objects.new("bl", ld); sc.collection.objects.link(o); o.location = C @ Vector(p); lights.append(ld)
cd = bpy.data.cameras.new("cam"); cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24; cd.clip_start = 0.05; cd.clip_end = 1500
cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam

# ---------- render ----------
sc.render.engine = "CYCLES"; cy = sc.cycles
cy.device = "CPU"; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.04
cy.use_denoising = True; cy.denoiser = "OPENIMAGEDENOISE"
try: cy.denoising_prefilter = "FAST"
except Exception: pass
cy.max_bounces = 5; cy.diffuse_bounces = 2; cy.glossy_bounces = 3; cy.transmission_bounces = 3; cy.transparent_max_bounces = 28
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.sample_clamp_indirect = 4
sc.render.use_persistent_data = True
sc.render.resolution_x = RW; sc.render.resolution_y = RH; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 93
try:
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
except Exception as e: print("look", e)
sc.view_settings.exposure = float(os.environ.get("EXPO", "-0.3"))

# ---------- animação ----------
Mst = {}; Vst = {}; dirtyM = set(); dirtyV = set()
want = set(FRAMES); last = max(FRAMES); t0 = time.time(); done = 0
with gzip.open(os.path.join(HERE, "frames.jsonl.gz"), "rt") as fh:
    for f, line in enumerate(fh):
        if f > last: break
        st = json.loads(line)
        mc = st["mc"]
        for k in range(0, len(mc), 17): Mst[mc[k]] = mc[k + 1:k + 17]; dirtyM.add(mc[k])
        vc = st["vc"]
        for k in range(0, len(vc), 2): Vst[vc[k]] = vc[k + 1]; dirtyV.add(vc[k])
        if f not in want: continue
        tf = time.time()
        for i in dirtyM:
            if i in objs: objs[i].matrix_world = C @ m3(Mst[i]) @ Ci
        for i in dirtyV:
            if i in objs: objs[i].hide_render = not Vst[i]
        dirtyM.clear(); dirtyV.clear()
        cm = C @ m3(st["cam"]); cam.matrix_world = cm; cd.angle_y = math.radians(st["fov"])
        cd.dof.use_dof = st["fs"] > 0; cd.dof.focus_distance = st["focus"]; cd.dof.aperture_fstop = max(st["fs"] * 1.6, 0.5)
        rot = cm.to_3x3().normalized().to_4x4()
        for o in sprites: o.hide_render = True
        sp = st["sp"]
        for k in range(0, len(sp), 6):
            o = sprites[sp[k]]; o.hide_render = False
            o.matrix_world = Matrix.Translation(C @ Vector(sp[k + 1:k + 4])) @ rot @ Matrix.Scale(sp[k + 4], 4)
            o.color = (*o["col"], sp[k + 5])
        for o, d in zip(dyn, st["dy"]):
            if not d: o.hide_render = True; continue
            o.hide_render = False; cu = o.data; cu.bevel_depth = d["r"]
            while cu.splines: cu.splines.remove(cu.splines[0])
            p = d["p"]; n = len(p) // 3; s = cu.splines.new("POLY"); s.points.add(n - 1)
            for k in range(n): s.points[k].co = (p[3 * k], -p[3 * k + 2], p[3 * k + 1], 1)
        for name, (ei, op, col) in zip(meta["mats"], st["mat"]):
            mat = dyn_mats.get(name)
            if not mat: continue
            b = bsdf(mat); b.inputs["Emission Strength"].default_value = ei * 4 if name not in ("DYN_sand", "DYN_putty") else 0
            if name == "DYN_sand": b.inputs["Alpha"].default_value = op
            if name == "DYN_putty": b.inputs["Base Color"].default_value = (*hexcol(col), 1)
        for ld, v in zip(lights, st["li"]): ld.energy = v / 110 * 2500
        sc.render.filepath = os.path.join(OUT, "f%05d.jpg" % f)
        bpy.ops.render.render(write_still=True)
        done += 1; print("T", time.time() - tf, end=" "); print("quadro %d pronto (%d/%d) %.1fs/quadro" % (f, done, len(FRAMES), (time.time() - t0) / done), flush=True)
