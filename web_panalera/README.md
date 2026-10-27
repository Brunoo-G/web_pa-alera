# Super Pañalera · tienda online

> **Versión en desarrollo.** Esta es una versión de prueba que todavía no está terminada:
> el nuevo proceso de compra sigue en modo prueba y faltan completar datos legales,
> envíos y medición antes de publicarla.

Catálogo online con carrito, proceso de compra y panel de administración para
Super Pañalera (Federal, Entre Ríos). Los productos, pedidos y cupones se guardan
en Supabase.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | La tienda completa: catálogo, compra y panel de administración, en un solo archivo |
| `terminos.html` | Términos y condiciones |
| `privacidad.html` | Política de privacidad |
| `_redirects` | Link propio por producto (`/p/<id>/<nombre>`) |
| `_headers` | Caché de la página y de las imágenes |
| `robots.txt` | Permiso para buscadores y ubicación del mapa del sitio |
| `img/` | Imágenes de la tienda (banners, logos, vista previa al compartir) |

`/feed.xml` (catálogo para Google y Meta) y `/sitemap.xml` no son archivos: `_redirects`
los toma de la función `catalogo` de Supabase, siempre al día con los productos.

## Publicar

Se publica en Netlify arrastrando la carpeta completa a **Deploys**.
No necesita compilación.

Versión de prueba 84.
