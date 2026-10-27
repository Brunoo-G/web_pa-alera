# Saca las imágenes metidas dentro del index (data:…;base64) a archivos en
# img/, para que la página pese menos y las imágenes queden en caché.
#   python3 extraer_imagenes.py <index.html> <carpeta de salida>
# Deja <carpeta>/index.html con rutas /img/… y los archivos en <carpeta>/img/.
# Los nombres llevan un pedacito del contenido (hash): si una imagen cambia,
# cambia el nombre y nadie ve la vieja guardada en caché.
import base64, hashlib, io, os, re, sys
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT + "/img", exist_ok=True)
s = open(SRC, encoding="utf-8").read()
URI = re.compile(r'data:image/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)')

def slug(t):
    t = t.lower()
    for a, b in zip("áéíóúñü’'", "aeiounu--"): t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "imagen"

def nombre_para(pos):
    antes = s[max(0, pos - 600):pos]
    if antes.rstrip().endswith('rel="apple-touch-icon" href="'): return "icono-180", "png"
    clave = re.search(r'(\w+):\s*"$', antes)
    clave = clave.group(1) if clave else "imagen"
    if clave == "productos":                       # banners de marca
        m = re.findall(r'marca:\s*"([^"]+)"', antes)
        return "banner-" + slug(m[-1] if m else "marca"), "webp"
    if clave == "imagen":
        m = re.findall(r'titulo:\s*"([^"]+)"', antes)
        return "banner-" + slug(m[-1] if m else "foto"), "webp"
    return slug(clave), "webp"                     # logo, logoHeader…

def reducir(datos, formato):
    im = Image.open(io.BytesIO(datos))
    if formato == "png":                           # el ícono de iPhone tiene que ser png
        return datos, "png"
    if im.mode == "P": im = im.convert("RGBA")
    mejor, ext = datos, ("webp" if datos[8:12] == b"WEBP" else "png")
    for q in (82, 78):
        b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6); v = b.getvalue()
        if len(v) < len(mejor) * 0.93: mejor, ext = v, "webp"; break
    # logos con pocos colores: lossless suele quedar más chico y nítido
    b = io.BytesIO(); im.save(b, "WEBP", lossless=True, method=6); v = b.getvalue()
    if len(v) < len(mejor): mejor, ext = v, "webp"
    return mejor, ext

reemplazos, total_antes, total_despues, primera = [], 0, 0, None
usados = {}
for m in URI.finditer(s):
    datos = base64.b64decode(m.group(2))
    base, fmt = nombre_para(m.start())
    nuevo, ext = reducir(datos, fmt)
    h = hashlib.sha1(nuevo).hexdigest()[:8]
    n = usados.get(base, 0); usados[base] = n + 1
    archivo = f"{base}{'-' + str(n + 1) if n else ''}.{h}.{ext}"
    open(f"{OUT}/img/{archivo}", "wb").write(nuevo)
    if base == "logo":   # copia con nombre fijo para Google (logo de la tienda)
        open(f"{OUT}/img/logo-tienda.png", "wb").write(datos)
    reemplazos.append((m.start(), m.end(), "/img/" + archivo))
    total_antes += len(m.group(0)); total_despues += len(nuevo)
    if primera is None and base.startswith("banner-"): primera = "/img/" + archivo
    print(f"  {archivo:42s} {len(datos)//1024:4d} KB → {len(nuevo)//1024:4d} KB")

for a, b, ruta in reversed(reemplazos): s = s[:a] + ruta + s[b:]
# el primer banner es lo primero grande que se ve: que el navegador lo pida ya
if primera:
    s = s.replace("</title>", '</title>\n<link rel="preload" as="image" href="' + primera +
                  '" fetchpriority="high">', 1)
open(OUT + "/index.html", "w", encoding="utf-8").write(s)
print(f"imágenes: {len(reemplazos)} · dentro del index antes {total_antes//1024} KB · "
      f"archivos ahora {total_despues//1024} KB · index {len(s.encode())//1024} KB")
