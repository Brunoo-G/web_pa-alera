# Super Pañalera · tienda online

> **Estado: versión beta.** La tienda funciona, pero el nuevo proceso de compra sigue en modo prueba y faltan completar datos legales, envíos y medición antes de publicarla de forma definitiva.

Tienda online para Super Pañalera, una pañalera de Federal, Entre Ríos. Tiene catálogo, ficha de producto con link propio, carrito, proceso de compra en pasos y un panel de administración para gestionar productos, pedidos, cupones, envíos y reseñas.

**Demo:** https://panalerabeta.netlify.app/

Ejemplo de ficha de producto: [Jabón líquido Upa La La](https://panalerabeta.netlify.app/p/tn-jabon-liquido-upa-la-la/jabon-liquido-upa-la-la)

## Tecnología

| Parte | Tecnología |
|---|---|
| Tienda, carrito, compra y panel | HTML, CSS y JavaScript sin frameworks |
| Base de datos, fotos y usuarios del panel | Supabase (Postgres, Storage y Auth) |
| Feed para Google/Meta y sitemap | Supabase Edge Function (TypeScript/Deno) |
| Armado de cada versión | Python 3 + Pillow |
| Hosting | Netlify, sitio estático sin compilación |

## Estructura del repo

- [`web_panalera/`](web_panalera/): lo que se publica en Netlify. Ver su README para el detalle de cada archivo.
- [`proyecto/`](proyecto/): el código fuente, los scripts de armado y los SQL de la base. Ver su README para armar una versión nueva y saber dónde se cambia cada cosa.

## Publicar

```bash
cd proyecto
pip install pillow
python3 armar.py
```

El contenido de `proyecto/salida/web_panalera/` reemplaza a `web_panalera/` en el repo, o se arrastra directo a Netlify → Deploys.
