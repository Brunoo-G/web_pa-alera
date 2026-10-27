// Super Pañalera · función "catalogo" (Supabase Edge Function)
// Devuelve, siempre al día con la base:
//   /functions/v1/catalogo/feed.xml     → catálogo para Google Merchant Center y Meta
//   /functions/v1/catalogo/sitemap.xml  → mapa del sitio para Google
// Netlify las sirve como superpañalera.com.ar/feed.xml y /sitemap.xml (_redirects).
// Solo lee productos visibles con la clave pública: no toca ni ve nada privado.
// Importante: desactivar "Enforce JWT verification" (la llama Netlify, sin sesión).

const SITIO = "https://xn--superpaalera-ghb.com.ar";
const TIENDA = "Super Pañalera";
const URL_BASE = Deno.env.get("SUPABASE_URL") ?? "https://nuioyiwjiufaddwqbxoj.supabase.co";
// La misma clave pública que usa la página (no es secreta: solo lee lo público)
const CLAVE = "sb_publishable_q8cWF1cpYd-ztn6_X0L72w_FSCtPFVg";

type Variedad = { n?: string; p?: number };
type Producto = {
  id: string; nombre: string; categoria?: string; subcategoria?: string; marca?: string;
  precio?: number; descuento?: number; descripcion?: string; variedades?: Variedad[];
  imagenes?: string[]; visible?: boolean; actualizado?: string;
};

// Igual que en la tienda: el link de cada producto es /p/<id>/<nombre>
const slug = (t: string) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
const rutaDe = (p: Producto) => "/p/" + encodeURIComponent(p.id) + "/" + slug(p.nombre);
const xml = (t: unknown) => String(t ?? "").replace(/[<>&'"]/g, c =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!))
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const plata = (n: number) => n.toFixed(2) + " ARS";
const fotoValida = (f: unknown) => typeof f === "string" && /^https:\/\//.test(f.trim());

async function leerProductos(): Promise<Producto[]> {
  const r = await fetch(URL_BASE + "/rest/v1/productos?select=*&visible=eq.true&order=orden.asc",
    { headers: { apikey: CLAVE, Authorization: "Bearer " + CLAVE } });
  if (!r.ok) throw new Error("No se pudo leer el catálogo: " + r.status);
  return await r.json();
}

/* Precio de lista de una variedad (o del producto) y precio final con descuento */
function precios(p: Producto, v?: Variedad) {
  const lista = Number(v && v.p) > 0 ? Number(v!.p) : Number(p.precio) || 0;
  const d = Math.min(99, Math.max(0, Number(p.descuento) || 0));
  return { lista, final: d ? Math.round(lista * (100 - d) / 100) : lista };
}

function item(p: Producto, v?: Variedad): string {
  const { lista, final } = precios(p, v);
  if (!(lista > 0)) return "";
  const fotos = (p.imagenes || []).filter(fotoValida);
  if (!fotos.length) return "";
  const desc = String(p.descripcion || "").replace(/\s+/g, " ").trim() || p.nombre;
  const tipo = [p.categoria, p.subcategoria].filter(Boolean).join(" > ");
  const id = v && v.n ? p.id + "-" + slug(v.n) : p.id;
  const titulo = v && v.n ? p.nombre + " · " + v.n : p.nombre;
  return "<item>" +
    "<g:id>" + xml(id) + "</g:id>" +
    (v && v.n ? "<g:item_group_id>" + xml(p.id) + "</g:item_group_id><g:size>" + xml(v.n) + "</g:size>" : "") +
    "<g:title>" + xml(titulo.slice(0, 150)) + "</g:title>" +
    "<g:description>" + xml(desc.slice(0, 5000)) + "</g:description>" +
    "<g:link>" + xml(SITIO + rutaDe(p)) + "</g:link>" +
    "<g:image_link>" + xml(fotos[0]) + "</g:image_link>" +
    fotos.slice(1, 10).map(f => "<g:additional_image_link>" + xml(f) + "</g:additional_image_link>").join("") +
    "<g:availability>in_stock</g:availability>" +
    "<g:condition>new</g:condition>" +
    "<g:price>" + plata(lista) + "</g:price>" +
    (final < lista ? "<g:sale_price>" + plata(final) + "</g:sale_price>" : "") +
    (p.marca ? "<g:brand>" + xml(p.marca) + "</g:brand>" : "") +
    "<g:identifier_exists>no</g:identifier_exists>" +
    (tipo ? "<g:product_type>" + xml(tipo) + "</g:product_type>" : "") +
    "</item>";
}

function feed(ps: Producto[]): string {
  const items = ps.flatMap(p => {
    const vs = (p.variedades || []).filter(v => v && v.n);
    return vs.length ? vs.map(v => item(p, v)) : [item(p)];
  }).filter(Boolean);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>' +
    "<title>" + xml(TIENDA) + "</title><link>" + SITIO + "/</link>" +
    "<description>Catálogo de " + xml(TIENDA) + "</description>\n" +
    items.join("\n") + "\n</channel></rss>\n";
}

function sitemap(ps: Producto[]): string {
  const url = (loc: string, mod?: string) => "<url><loc>" + xml(loc) + "</loc>" +
    (mod ? "<lastmod>" + xml(mod.slice(0, 10)) + "</lastmod>" : "") + "</url>";
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [url(SITIO + "/"), url(SITIO + "/terminos.html"), url(SITIO + "/privacidad.html"),
     ...ps.map(p => url(SITIO + rutaDe(p), p.actualizado))].join("\n") +
    "\n</urlset>\n";
}

Deno.serve(async req => {
  const ruta = new URL(req.url).pathname;
  const esFeed = /feed(\.xml)?\/?$/.test(ruta), esMapa = /sitemap(\.xml)?\/?$/.test(ruta);
  if (!esFeed && !esMapa) return new Response("Usá /feed.xml o /sitemap.xml", { status: 404 });
  try {
    const ps = (await leerProductos()).filter(p => p.visible !== false);
    return new Response(esFeed ? feed(ps) : sitemap(ps), {
      headers: { "Content-Type": "application/xml; charset=utf-8",
                 "Cache-Control": "public, max-age=1800" } });
  } catch (e) {
    return new Response("Error: " + (e as Error).message, { status: 502 });
  }
});
