# Arma la tienda lista para publicar, desde las fuentes.
#   python3 armar.py            → salida/web_panalera/ (+ salida/web_panalera.zip)
#   python3 armar.py --prueba   → además salida/prueba-compra.html (demo local, clave 1234)
# Necesita Python 3 y Pillow (pip install pillow).
import os, shutil, subprocess, sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(RAIZ, "salida")
py = lambda *a: subprocess.run([sys.executable, *a], check=True)

os.makedirs(SALIDA, exist_ok=True)
# 1) la tienda base (catálogo + panel)
shutil.copy(os.path.join(RAIZ, "tienda", "super-panalera.html"), os.path.join(SALIDA, "index-v2.html"))
# 2) le suma el proceso de compra nuevo y el sistema de medidas (compra/)
py(os.path.join(RAIZ, "compra", "patch_compra.py"))
# 3) copia de prueba local (opcional, antes de sacar las imágenes)
if "--prueba" in sys.argv:
    py(os.path.join(RAIZ, "herramientas", "gen_prueba_compra.py"))
# 4) carpeta para Netlify: imágenes a img/, legales, _redirects, _headers, robots.txt
py(os.path.join(RAIZ, "publicar", "armar_carpeta.py"))
print("Listo: salida/web_panalera/ → copiala a web_panalera/ del repo o arrastrala a Netlify")
