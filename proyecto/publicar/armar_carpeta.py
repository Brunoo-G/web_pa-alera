# Arma la carpeta para subir a Netlify (arrastrándola a Deploys).
#   salida/web_panalera/index.html   la tienda (index-v2)
#   salida/web_panalera/_redirects   /p/* → index.html (links de producto)
#   salida/web_panalera/_headers     caché: la página siempre fresca, las imágenes un año
#   salida/web_panalera/robots.txt   deja entrar a Google; el panel no se indexa (vive dentro de la misma página)
import io, os, shutil, zipfile
import os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # carpeta proyecto/
SRC = os.path.join(RAIZ, "salida", "index-v2.html")
OUT = os.path.join(RAIZ, "salida", "web_panalera")
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT + "/img")
# index.html con las imágenes afuera, en img/ (más liviano y queda en caché)
import subprocess
subprocess.run(["python3", os.path.join(RAIZ, "publicar", "extraer_imagenes.py"), SRC, OUT], check=True)
io.open(OUT + "/_redirects", "w").write(
"""# Cada producto tiene su link: /p/<id>/<nombre>. Netlify sirve la misma página
# y la web abre la ficha de ese producto.
/p/*   /index.html   200
# Catálogo para Google/Meta y mapa del sitio: los arma la función "catalogo"
# de Supabase, siempre al día con la base.
/feed.xml      https://nuioyiwjiufaddwqbxoj.supabase.co/functions/v1/catalogo/feed.xml      200
/sitemap.xml   https://nuioyiwjiufaddwqbxoj.supabase.co/functions/v1/catalogo/sitemap.xml   200
""")
io.open(OUT + "/_headers", "w").write(
"""/index.html
  Cache-Control: no-cache
/
  Cache-Control: no-cache
/img/*
  Cache-Control: public, max-age=31536000, immutable
""")
io.open(OUT + "/robots.txt", "w").write("User-agent: *\nAllow: /\n\nSitemap: https://xn--superpaalera-ghb.com.ar/sitemap.xml\n")
# imagen de la vista previa al compartir (og:image)
shutil.copy(os.path.join(RAIZ, "publicar", "compartir.jpg"), OUT + "/img/compartir.jpg")
# Términos y condiciones + Política de privacidad (datos desde NEGOCIO.legal)
subprocess.run(["python3", os.path.join(RAIZ, "publicar", "legales.py"), OUT + "/index.html", OUT], check=True)
z = os.path.join(RAIZ, "salida", "web_panalera.zip")
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for raiz, _, archivos in os.walk(OUT):
        for a in archivos:
            ruta = os.path.join(raiz, a); zf.write(ruta, os.path.relpath(ruta, OUT))
print("ok", sorted(os.listdir(OUT)))
