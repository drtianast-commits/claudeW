# Mergulho orbital (earth zoom): Terra com textura Blue Marble (NASA, domínio público), nuvens procedurais, atmosfera e estrelas.
# Uso: python3 earth_bl.py <saida_dir> <amostras> <largura> <altura> [lista_de_quadros]
import bpy, math, os, sys
from mathutils import Vector, Quaternion, Matrix
HERE = os.path.dirname(os.path.abspath(__file__))
out, spp, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
only = [int(x) for x in sys.argv[5].split(",")] if len(sys.argv) > 5 else None
NF = 144                                   # 6 s a 24 qps
LAT0, LON0, LAT1, LON1 = -8, -62, -20.5, -44.5   # início e destino (Sudeste do Brasil, ponto genérico)
A0, A1 = 3.4, 0.09                        # altitude inicial e final em raios terrestres
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def d(lat, lon):
    la, lo = math.radians(lat), math.radians(lon); return Vector((math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)))
def sphere(name, r, seg=256):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r); o = bpy.context.object; o.name = name
    bpy.ops.object.shade_smooth(); return o
def mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; return m, m.node_tree.nodes, m.node_tree.links
# ---- Terra ----
earth = sphere("terra", 1.0)
m, N, L = mat("terra"); b = N["Principled BSDF"]
tc = N.new("ShaderNodeTexCoord"); nrm = N.new("ShaderNodeVectorMath"); nrm.operation = "NORMALIZE"; L.new(tc.outputs["Object"], nrm.inputs[0])
sp = N.new("ShaderNodeSeparateXYZ"); L.new(nrm.outputs[0], sp.inputs[0])
at = N.new("ShaderNodeMath"); at.operation = "ARCTAN2"; L.new(sp.outputs["Y"], at.inputs[0]); L.new(sp.outputs["X"], at.inputs[1])
u = N.new("ShaderNodeMath"); u.operation = "MULTIPLY_ADD"; u.inputs[1].default_value = 1 / (2 * math.pi); u.inputs[2].default_value = 0.5; L.new(at.outputs[0], u.inputs[0])
asn = N.new("ShaderNodeMath"); asn.operation = "ARCSINE"; L.new(sp.outputs["Z"], asn.inputs[0])
v = N.new("ShaderNodeMath"); v.operation = "MULTIPLY_ADD"; v.inputs[1].default_value = 1 / math.pi; v.inputs[2].default_value = 0.5; L.new(asn.outputs[0], v.inputs[0])
cb = N.new("ShaderNodeCombineXYZ"); L.new(u.outputs[0], cb.inputs["X"]); L.new(v.outputs[0], cb.inputs["Y"])
im = N.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(os.path.join(HERE, "bmng.jpg")); im.interpolation = "Cubic"; im.extension = "EXTEND"; L.new(cb.outputs[0], im.inputs["Vector"])
# detalhe fino procedural (relevo aparente quando a câmera se aproxima)
nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 420; nz.inputs["Detail"].default_value = 10; L.new(tc.outputs["Object"], nz.inputs["Vector"])
mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = 0.86; mr.inputs["To Max"].default_value = 1.12; L.new(nz.outputs["Fac"], mr.inputs["Value"])
mu = N.new("ShaderNodeMix"); mu.data_type = "RGBA"; mu.blend_type = "MULTIPLY"; mu.inputs["Factor"].default_value = 1; L.new(im.outputs["Color"], mu.inputs["A"])
cm = N.new("ShaderNodeCombineColor"); [L.new(mr.outputs[0], cm.inputs[i]) for i in range(3)]; L.new(cm.outputs[0], mu.inputs["B"])
L.new(mu.outputs["Result"], b.inputs["Base Color"])
# oceano brilhante, terra fosca
sc_ = N.new("ShaderNodeSeparateColor"); L.new(im.outputs["Color"], sc_.inputs[0])
df = N.new("ShaderNodeMath"); df.operation = "SUBTRACT"; L.new(sc_.outputs["Blue"], df.inputs[0]); L.new(sc_.outputs["Red"], df.inputs[1])
rr = N.new("ShaderNodeMapRange"); rr.inputs["From Min"].default_value = 0.0; rr.inputs["From Max"].default_value = 0.06; rr.inputs["To Min"].default_value = 0.9; rr.inputs["To Max"].default_value = 0.32; L.new(df.outputs[0], rr.inputs["Value"])
L.new(rr.outputs[0], b.inputs["Roughness"])
bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.15; bp.inputs["Distance"].default_value = 0.0005; L.new(nz.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs["Normal"], b.inputs["Normal"])
earth.data.materials.append(m)
# ---- nuvens ----
cl = sphere("nuvens", 1.006); m, N, L = mat("nuvens"); b = N["Principled BSDF"]; b.inputs["Base Color"].default_value = (1, 1, 1, 1); b.inputs["Roughness"].default_value = 1
tc = N.new("ShaderNodeTexCoord"); n1 = N.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 3.2; n1.inputs["Detail"].default_value = 14; n1.inputs["Roughness"].default_value = 0.62; n1.inputs["Distortion"].default_value = 0.45
L.new(tc.outputs["Object"], n1.inputs["Vector"])
cr = N.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].position = 0.54; cr.color_ramp.elements[1].position = 0.70; L.new(n1.outputs["Fac"], cr.inputs["Fac"])
L.new(cr.outputs["Color"], b.inputs["Alpha"]); cl.data.materials.append(m)
# ---- atmosfera (brilho na borda, só no lado iluminado) ----
SUN = d(-12, -22)
at_ = sphere("atmosfera", 1.035, 128); m, N, L = mat("atm"); N.remove(N["Principled BSDF"]); o = N["Material Output"]
lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 5.0; L.new(lw.outputs["Facing"], pw.inputs[0])
ge = N.new("ShaderNodeNewGeometry"); dt = N.new("ShaderNodeVectorMath"); dt.operation = "DOT_PRODUCT"; dt.inputs[1].default_value = SUN; L.new(ge.outputs["Normal"], dt.inputs[0])
dm = N.new("ShaderNodeMapRange"); dm.inputs["From Min"].default_value = -0.25; dm.inputs["From Max"].default_value = 0.4; L.new(dt.outputs["Value"], dm.inputs["Value"])
fm = N.new("ShaderNodeMath"); fm.operation = "MULTIPLY"; L.new(pw.outputs[0], fm.inputs[0]); L.new(dm.outputs[0], fm.inputs[1])
em = N.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.32, 0.58, 1.0, 1); em.inputs["Strength"].default_value = 4.0
tr = N.new("ShaderNodeBsdfTransparent"); ad = N.new("ShaderNodeAddShader"); L.new(tr.outputs[0], ad.inputs[0])
ms = N.new("ShaderNodeMixShader"); L.new(fm.outputs[0], ms.inputs[0]); L.new(tr.outputs[0], ms.inputs[1]); L.new(em.outputs[0], ad.inputs[1]); L.new(ad.outputs[0], ms.inputs[2])
L.new(ms.outputs[0], o.inputs["Surface"]); at_.data.materials.append(m); at_.visible_shadow = False
# ---- Sol e estrelas ----
ld = bpy.data.lights.new("sol", "SUN"); ld.energy = 4.2; ld.angle = math.radians(0.6)
so = bpy.data.objects.new("sol", ld); sc.collection.objects.link(so); so.rotation_mode = "QUATERNION"; so.rotation_quaternion = SUN.to_track_quat("Z", "Y")
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True; N = w.node_tree.nodes; L = w.node_tree.links; bg = N["Background"]
tcw = N.new("ShaderNodeTexCoord"); vo = N.new("ShaderNodeTexVoronoi"); vo.inputs["Scale"].default_value = 700; L.new(tcw.outputs["Generated"], vo.inputs["Vector"])
sm_ = N.new("ShaderNodeMapRange"); sm_.inputs["From Min"].default_value = 0.0; sm_.inputs["From Max"].default_value = 0.05; sm_.inputs["To Min"].default_value = 1.0; sm_.inputs["To Max"].default_value = 0.0; L.new(vo.outputs["Distance"], sm_.inputs["Value"])
p8 = N.new("ShaderNodeMath"); p8.operation = "POWER"; p8.inputs[1].default_value = 8; L.new(sm_.outputs[0], p8.inputs[0])
wn = N.new("ShaderNodeTexWhiteNoise"); L.new(vo.outputs["Position"], wn.inputs["Vector"])
mm = N.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; L.new(p8.outputs[0], mm.inputs[0]); L.new(wn.outputs["Value"], mm.inputs[1])
L.new(mm.outputs[0], bg.inputs["Strength"]); bg.inputs["Color"].default_value = (1, 0.97, 0.92, 1)
# ---- câmera (nadir, mergulho com zoom logarítmico) ----
cd = bpy.data.cameras.new("cam"); cd.sensor_fit = "VERTICAL"; cd.angle_y = math.radians(40); cd.clip_start = 0.001; cd.clip_end = 50
cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); sc.camera = cam; cam.rotation_mode = "QUATERNION"
dA, dB = d(LAT0, LON0), d(LAT1, LON1)
def slerp(a, b, k):
    om = a.angle(b); return (a * math.sin((1 - k) * om) + b * math.sin(k * om)) / math.sin(om)
for f in range(NF):
    k = f / (NF - 1); s = k * k * (3 - 2 * k)
    alt = A0 * (A1 / A0) ** (k ** 1.2)
    dc = slerp(dA, dB, s ** 0.8).normalized()
    cam.location = dc * (1 + alt)
    q = (-dc).to_track_quat("-Z", "Y") @ Quaternion((0, 0, 1), -0.45 * s)
    cam.rotation_quaternion = q
    cam.keyframe_insert("location", frame=f + 1); cam.keyframe_insert("rotation_quaternion", frame=f + 1)
# ---- render ----
r = sc.render; r.engine = "CYCLES"; r.resolution_x, r.resolution_y = W, H; r.resolution_percentage = 100
r.image_settings.file_format = "JPEG"; r.image_settings.quality = 93
r.use_motion_blur = True; r.motion_blur_shutter = 0.25
cy = sc.cycles; cy.device = "CPU"; cy.samples = spp; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.use_denoising = True; cy.denoiser = "OPENIMAGEDENOISE"
cy.max_bounces = 4; cy.transparent_max_bounces = 16
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"; sc.view_settings.exposure = 0.3
r.use_persistent_data = True
import time
for f in (only if only is not None else range(NF)):
    p = os.path.join(out, "e%05d.jpg" % f)
    if os.path.exists(p): continue
    t0 = time.time(); sc.frame_set(f + 1); r.filepath = p; bpy.ops.render.render(write_still=True)
    print("T", f, round(time.time() - t0, 1), flush=True)
