# Arma la composición de productos de cada banner (PNG/WebP con transparencia).
# Los recortes salen de las fotos publicadas en la tienda (recortes/*.png).
from PIL import Image, ImageFilter
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))  # trabaja dentro de banners/
W, H = 1100, 680
def cargar(n): return Image.open('recortes/%s.png' % n).convert('RGBA')
def poner(lienzo, nombre, alto, cx, base, giro=0):
    """alto en px, cx = centro horizontal, base = línea del piso (y)"""
    t = cargar(nombre)
    s = alto / t.height; t = t.resize((max(1, round(t.width * s)), round(alto)), Image.LANCZOS)
    if giro: t = t.rotate(giro, resample=Image.BICUBIC, expand=True)
    x, y = round(cx - t.width / 2), round(base - t.height)
    # sombra de contacto (elipse difusa en el piso) + sombra suave del cuerpo
    som = Image.new('L', lienzo.size, 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(som)
    d.ellipse((x + t.width * .08, base - 14, x + t.width * .92, base + 14), fill=120)
    som = som.filter(ImageFilter.GaussianBlur(12))
    cuerpo = Image.new('L', lienzo.size, 0); cuerpo.paste(t.split()[3].point(lambda v: v * .35), (x + 10, y + 16))
    cuerpo = cuerpo.filter(ImageFilter.GaussianBlur(16))
    for m in (som, cuerpo):
        capa = Image.new('RGBA', lienzo.size, (60, 40, 50, 0)); capa.putalpha(m)
        lienzo.alpha_composite(capa)
    lienzo.alpha_composite(t, (x, y))

COMPOS = {
  'huggies': [('hug-flexi', 360, 250, 575), ('hug-natural', 470, 640, 590), ('hug-toallitas', 175, 880, 605)],
  'pampers': [('pam-babydry', 330, 260, 575), ('pam-pants', 450, 560, 590), ('pam-babysan', 380, 830, 598)],
  'babysec': [('bab-super', 300, 320, 575), ('bab-premium', 420, 580, 590), ('bab-ultra', 340, 800, 598)],
  'johnsons': [('joh-aceite', 330, 300, 570), ('joh-gotas', 470, 420, 585), ('joh-original', 500, 560, 592),
               ('joh-rulos', 470, 700, 585), ('joh-talco', 300, 830, 598)],
  'avent': [('ave-natural', 400, 330, 580), ('ave-anticolico', 520, 590, 592), ('ave-natural2', 440, 830, 598)],
}
os.makedirs('compos', exist_ok=True)
for marca, items in COMPOS.items():
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for it in items: poner(L, *it)
    bb = L.getbbox(); L = L.crop((max(0, bb[0] - 10), max(0, bb[1] - 10), min(W, bb[2] + 10), min(H, bb[3] + 4)))
    L.save('compos/%s.png' % marca)
    L.save('compos/%s.webp' % marca, quality=86, method=6)
    print(marca, L.size, os.path.getsize('compos/%s.webp' % marca) // 1024, 'KB')
