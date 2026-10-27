# Super Pañalera · proyecto completo

Todo lo que se usa para armar la tienda online. La carpeta `web_panalera/` del repo
es lo que se publica; esta carpeta es **de dónde sale**.

## Cómo está hecha

| Parte | Tecnología | Dónde |
|---|---|---|
| Tienda, carrito, compra y panel de administración | HTML + CSS + JavaScript, sin frameworks, en una sola página | `tienda/`, `compra/` |
| Base de datos, fotos, usuarios del panel | Supabase (Postgres + Storage + Auth) | `supabase/sql/` |
| Catálogo para Google/Meta y sitemap | Supabase Edge Function `catalogo` (TypeScript/Deno) | `supabase/functions/catalogo/` |
| Hosting | Netlify (se arrastra la carpeta, no compila nada) | lo genera `publicar/` |
| Scripts para armar la versión | Python 3 + Pillow | `armar.py`, `compra/`, `publicar/`, `herramientas/`, `banners/` |

## Carpetas

| Carpeta / archivo | Para qué |
|---|---|
| `tienda/super-panalera.html` | La tienda base: catálogo, ficha, carrito, panel. CSS y JS van adentro |
| `compra/compra.js` · `compra.css` | Proceso de compra en pasos (entrega, datos, pago, confirmación) |
| `compra/sistema.css` | Sistema de medidas (alturas, radios, espacios, formularios) |
| `compra/patch_compra.py` | Une la tienda base con la compra y el sistema de medidas |
| `publicar/armar_carpeta.py` | Arma la carpeta para Netlify (`_redirects`, `_headers`, `robots.txt`) |
| `publicar/extraer_imagenes.py` | Saca las imágenes del HTML a `img/` en WebP, con hash en el nombre |
| `publicar/legales.py` | Genera Términos y Privacidad con los datos de `NEGOCIO.legal` |
| `publicar/servidor_prueba.py` | Servidor local que imita a Netlify (links `/p/...`) |
| `publicar/compartir.jpg` | Imagen de vista previa al compartir (1200×630) |
| `supabase/sql/` | Scripts de la base, numerados en el orden en que se corrieron |
| `supabase/functions/catalogo/index.ts` | `/feed.xml` y `/sitemap.xml`, siempre al día con la base |
| `herramientas/gen_prueba_compra.py` | Copia de prueba local sin base de datos (clave del panel: 1234) |
| `banners/` | Composición de productos de los banners de marcas (`componer.py` + recortes) |

## Armar una versión

```
pip install pillow
python3 armar.py            # deja salida/web_panalera/ y salida/web_panalera.zip
python3 armar.py --prueba   # además salida/prueba-compra.html para probar sin base
```

Después, el contenido de `salida/web_panalera/` reemplaza a `web_panalera/` del repo
(o se arrastra a Netlify → Deploys). Para probar en la compu:

```
python3 publicar/servidor_prueba.py salida/web_panalera 8080
```

## Dónde se cambia cada cosa

- **Datos del comercio** (WhatsApp, dirección, horarios, datos legales, IDs de medición):
  objeto `NEGOCIO` dentro de `tienda/super-panalera.html`.
- **Número de versión de prueba**: `VERSION_PRUEBA` en `compra/compra.js`.
- **Conexión a Supabase**: `url` y clave pública en `tienda/super-panalera.html`.
  La clave es la publicable (solo lee lo público; las reglas de la base protegen el resto).

## Base de datos

Los `.sql` se pegan en Supabase → SQL Editor → Run, en orden. Son idempotentes salvo
`10-completar-marcas.sql`, que fue una carga única de datos.
La función `catalogo` se despliega en Edge Functions con "Enforce JWT verification" desactivado.
