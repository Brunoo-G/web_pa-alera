# Arma terminos.html y privacidad.html para la carpeta de la tienda.
# Los datos del comercio salen de NEGOCIO.legal dentro de index-v2.html,
# así se cargan una sola vez. Lo que falta aparece resaltado como
# [completar: …] para verlo antes de publicar.
#   python3 legales.py <index.html> <carpeta de salida>
import html, re, sys

SRC, OUT = sys.argv[1], sys.argv[2]
s = open(SRC, encoding="utf-8").read()
bloque = s[s.index("    legal: {"):]
bloque = bloque[:bloque.index("\n    },")]

def dato(clave):
    m = re.search(r"\b" + clave + r':\s*"([^"]*)"', bloque)
    return m.group(1).strip() if m else ""

def o(valor, falta):
    return html.escape(valor) if valor else '<mark>[completar: ' + falta + ']</mark>'

RAZON, CUIT = dato("razonSocial"), dato("cuit")
DOM_FISCAL, EMAIL = dato("domicilioFiscal"), dato("email")
IVA = re.search(r"\biva:\s*(\d+)", bloque)
IVA = int(IVA.group(1)) if IVA else 0
LOCAL = "Gral. Justo José de Urquiza 1071, Federal (E3180), Entre Ríos, Argentina"
WA, WA_URL = "+54 3454 43-2635", "https://wa.me/5493454432635"
HORARIO = "lunes a sábados de 8:30 a 12:30 y de 16:30 a 20:30"
FECHA = "24 de octubre de 2026"

contacto = ('<a href="' + WA_URL + '">WhatsApp ' + WA + "</a>" +
            (' o por email a <a href="mailto:' + html.escape(EMAIL) + '">' + html.escape(EMAIL) + "</a>" if EMAIL else ""))
quien = ("<b>Super Pañalera</b> es el nombre comercial de " + o(RAZON, "razón social") +
         ", CUIT " + o(CUIT, "CUIT") + ". Local: " + LOCAL + "." +
         (" Domicilio fiscal: " + html.escape(DOM_FISCAL) + "." if DOM_FISCAL else ""))

CSS = """
:root{--bg:#FDF9F6; --surface-2:#F7EFE8; --ink:#5A4638; --ink-soft:#826F61; --line:rgba(74,56,46,.13);
  --cta:#CFA582; --oro:#855F45; --pad:clamp(.75rem,5vw,2.5rem);
  --serif:'Josefin Sans','Century Gothic',Futura,system-ui,sans-serif;
  --sans:'Jost',Futura,'Century Gothic',system-ui,-apple-system,sans-serif}
@media (min-width:640px){:root{--pad:clamp(1.15rem,5vw,2.5rem)}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:1rem;
  line-height:1.65; font-weight:400}
.top{background:#F0E5DA; border-bottom:1px solid rgba(90,70,56,.16)}
.top__in{max-width:760px; margin:0 auto; padding:.9rem var(--pad); display:flex; align-items:center;
  justify-content:space-between; gap:1rem}
.marca{font-family:var(--serif); font-size:1.05rem; letter-spacing:.12em; text-transform:uppercase; white-space:nowrap;
  color:var(--ink); text-decoration:none}
.volver{font-size:.9rem; color:var(--ink); text-decoration:none; border:1px solid rgba(74,56,46,.28);
  border-radius:100px; padding:.45rem 1rem; white-space:nowrap}
main{max-width:760px; margin:0 auto; padding:2rem var(--pad) 4rem}
h1{font-family:var(--serif); font-weight:400; font-size:clamp(1.9rem,6vw,2.5rem); line-height:1.15;
  margin:0 0 .4rem}
.fecha{color:var(--ink-soft); font-size:.88rem; margin:0 0 1.6rem}
.indice{background:var(--surface-2); border-radius:14px; padding:1rem 1.2rem; margin:0 0 2rem}
.indice p{margin:0 0 .4rem; font-size:.78rem; letter-spacing:.16em; text-transform:uppercase; color:var(--oro)}
.indice ol{margin:0; padding:0; list-style:none; columns:2 15rem; column-gap:2rem; font-size:.92rem}
.indice a{color:inherit}
h2{font-family:var(--serif); font-weight:500; font-size:1.2rem; margin:2rem 0 .6rem; scroll-margin-top:1rem}
p, li{color:var(--ink-soft)}
p{margin:0 0 .8rem}
ul{margin:0 0 .8rem; padding-left:1.2rem}
li{margin-bottom:.3rem}
b{color:var(--ink); font-weight:500}
a{color:var(--ink); text-underline-offset:.2em}
.nota{background:var(--surface-2); border-radius:12px; padding:.9rem 1.1rem; font-size:.92rem}
mark{background:#FFE9A8; color:#5A4638; padding:0 .2em; border-radius:3px}
.pie{border-top:1px solid var(--line); margin-top:2.5rem; padding-top:1rem; font-size:.85rem}
"""

def pagina(titulo, descripcion, secciones, ruta_otra, texto_otra):
    indice = "".join('<li><a href="#' + i + '">' + t + "</a></li>" for i, t, _ in secciones)
    cuerpo = "".join('<h2 id="' + i + '">' + t + "</h2>" + c for i, t, c in secciones)
    return f"""<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} | Super Pañalera</title>
<meta name="description" content="{descripcion}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;500&family=Jost:wght@400;500&display=swap">
<style>{CSS}</style>
</head>
<body>
<header class="top"><div class="top__in">
  <a class="marca" href="/">Super Pañalera</a>
  <a class="volver" href="/">Volver a la tienda</a>
</div></header>
<main>
<h1>{titulo}</h1>
<p class="fecha">Última actualización: {FECHA}</p>
<nav class="indice" aria-label="Contenido"><p>Contenido</p><ol>{indice}</ol></nav>
{cuerpo}
<p class="pie">Ver también: <a href="{ruta_otra}">{texto_otra}</a> · <a href="/">Volver a la tienda</a></p>
</main>
</body>
</html>
"""

iva_txt = (f" Junto a cada precio informamos también el <b>precio sin impuestos nacionales</b> "
           f"(sin el IVA del {IVA}%), como pide la Resolución 4/2025.") if IVA else ""

TERMINOS = [
 ("quienes", "1. Quiénes somos",
  f"<p>{quien}</p><p>Atención al cliente: {contacto}, {HORARIO}.</p>"),
 ("alcance", "2. Alcance",
  "<p>Estos términos rigen las compras que hacés en esta web. Los aceptás al confirmar tu pedido, "
  "no por navegar el sitio. Podés guardarlos o imprimirlos desde tu navegador cuando quieras.</p>"),
 ("precios", "3. Productos, precios y stock",
  "<p>Los precios están en pesos argentinos y son <b>precios finales, con IVA incluido</b>." + iva_txt + "</p>"
  "<p>Las fotos muestran el producto, pero el envase puede variar según el lote del fabricante. "
  "Las ofertas y los códigos de descuento indican su porcentaje, los productos que alcanzan y su vigencia.</p>"
  "<p>Si después de tu pedido un producto se queda sin stock, te avisamos por WhatsApp y elegís: "
  "reemplazarlo por otro, esperar a que vuelva o que te devolvamos lo que pagaste por él.</p>"),
 ("compra", "4. Cómo se hace una compra",
  "<ul><li>Sumás los productos al carrito.</li>"
  "<li>Completás tus datos y elegís cómo recibir el pedido.</li>"
  "<li>Elegís cómo pagar.</li>"
  "<li>Al confirmar, el pedido queda registrado con un código. Te escribimos por WhatsApp para "
  "confirmarlo y coordinar la entrega.</li></ul>"),
 ("pagos", "5. Formas de pago",
  "<ul><li><b>Transferencia bancaria:</b> los datos de la cuenta aparecen al finalizar la compra. "
  "Podés adjuntar el comprobante en ese momento o mandarlo por WhatsApp.</li>"
  "<li><b>Efectivo:</b> al retirar el pedido en el local.</li></ul>"
  "<p>No pedimos ni guardamos datos de tarjetas.</p>"),
 ("envios", "6. Envíos y retiro",
  "<ul><li><b>Retiro en el local:</b> gratis, en " + LOCAL.split(",")[0] + ", Federal, en nuestro horario de atención.</li>"
  "<li><b>Envío en Federal:</b> el costo se muestra antes de confirmar la compra.</li>"
  "<li><b>Envío a otra localidad:</b> hacemos envíos a todo el país. El costo depende del destino; "
  "te lo informamos por WhatsApp antes de despachar, y si no te sirve podés cancelar el pedido sin cargo.</li></ul>"
  "<p>El día y horario de entrega se coordinan por WhatsApp.</p>"),
 ("arrepentimiento", "7. Derecho de arrepentimiento",
  "<p>Tenés <b>10 días corridos</b> para arrepentirte de la compra, sin explicar el motivo y sin costo, "
  "contados desde que recibís el producto (art. 34 de la Ley 24.240 y arts. 1110 y siguientes del "
  "Código Civil y Comercial).</p>"
  "<ul><li>Pedilo con el <b>Botón de arrepentimiento</b> que está al pie de la web, o por WhatsApp. "
  "No hace falta registrarse.</li>"
  "<li>Al tocar el botón te damos un <b>código de solicitud</b> en el momento.</li>"
  "<li>Devolvés el producto sin usar y en las condiciones en que lo recibiste. "
  "Si hace falta enviarlo, el costo del envío de vuelta corre por nuestra cuenta.</li>"
  "<li>Te reintegramos el total pagado, incluido el envío, por el mismo medio de pago o el que acordemos.</li></ul>"),
 ("garantia", "8. Productos fallados y garantía",
  "<p>Si un producto llega fallado, dañado o no es el que pediste, escribinos y lo cambiamos sin costo "
  "o te devolvemos el dinero. Los productos nuevos no consumibles (por ejemplo accesorios o indumentaria) "
  "tienen además la garantía legal de 6 meses del art. 11 de la Ley 24.240.</p>"
  "<p>Fuera del derecho de arrepentimiento y de los productos fallados, no hacemos cambios por talle o "
  "preferencia. Igual consultanos: si podemos ayudarte, lo hacemos.</p>"),
 ("datos", "9. Datos personales",
  '<p>Usamos tus datos solo para gestionar tu compra. Los detalles están en la '
  '<a href="privacidad.html">Política de privacidad</a>.</p>'),
 ("reclamos", "10. Consultas y reclamos",
  f"<p>Escribinos por {contacto}, {HORARIO}. Si no quedás conforme, podés hacer tu reclamo ante la "
  "autoridad de Defensa del Consumidor de tu localidad.</p>"),
 ("cambios", "11. Cambios en estos términos",
  "<p>Si actualizamos estos términos, la nueva versión vale solo para las compras posteriores. "
  "Cada compra se rige por los términos vigentes el día en que la hiciste.</p>"),
 ("ley", "12. Ley aplicable",
  "<p>Rigen las leyes de la República Argentina, en particular la Ley 24.240 de Defensa del Consumidor. "
  "Ante cualquier conflicto son competentes los tribunales del domicilio del consumidor.</p>"),
]

PRIVACIDAD = [
 ("responsable", "1. Quién es responsable de tus datos",
  f"<p>{quien}</p><p>Para cualquier consulta sobre tus datos: {contacto}.</p>"),
 ("que", "2. Qué datos pedimos",
  "<p>Cuando hacés una compra:</p>"
  "<ul><li>Nombre, apellido y teléfono (obligatorios). Email (opcional).</li>"
  "<li>Si elegís envío: dirección, localidad, provincia, código postal y observaciones para la entrega.</li>"
  "<li>El detalle del pedido, el método de pago y, si lo adjuntás, el comprobante de la transferencia.</li></ul>"
  "<p>Los datos obligatorios están marcados en el formulario: sin ellos no podemos preparar ni entregar "
  "tu pedido. No pedimos ni guardamos datos de tarjetas.</p>"),
 ("para", "3. Para qué los usamos",
  "<ul><li>Preparar, cobrar y entregar tu pedido.</li>"
  "<li>Escribirte por WhatsApp sobre ese pedido.</li>"
  "<li>Cumplir obligaciones legales y fiscales.</li></ul>"
  "<p>No te mandamos publicidad sin tu consentimiento y no vendemos tus datos.</p>"),
 ("donde", "4. Dónde se guardan y con quién se comparten",
  "<p>Los pedidos se guardan en una base de datos de un proveedor de servicios en la nube "
  "(Supabase), y la web está alojada en Netlify. Sus servidores pueden estar fuera de Argentina; "
  "trabajan con medidas de seguridad para proteger la información.</p>"
  "<p>Solo compartimos lo necesario con quien hace la entrega (nombre, dirección y teléfono) y con "
  "autoridades cuando la ley lo exige.</p>"),
 ("tiempo", "5. Cuánto tiempo los guardamos",
  "<p>Mientras haga falta para gestionar tu pedido y durante los plazos que exigen las normas fiscales "
  "y de defensa del consumidor.</p>"),
 ("derechos", "6. Tus derechos",
  "<p>Podés pedir <b>acceso, rectificación, actualización o supresión</b> de tus datos escribiéndonos por "
  + contacto + ". Respondemos los pedidos de acceso dentro de los 10 días corridos y los de "
  "rectificación o supresión dentro de los 5 días hábiles (Ley 25.326).</p>"
  '<p class="nota">El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a '
  "los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés "
  "legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. "
  "La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, "
  "tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en "
  "sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>"),
 ("cookies", "7. Cookies y medición",
  "<p>La web guarda en tu navegador tu carrito y algunas preferencias, para que no se pierdan al "
  "volver. Eso no sale de tu dispositivo.</p>"
  "<p>Si en algún momento sumamos herramientas de medición (Meta o Google) para saber cómo llegan las "
  "visitas y mejorar nuestros anuncios, te lo vamos a preguntar con un aviso: solo se activan si "
  "tocás <b>Aceptar</b>. Si tocás <b>Rechazar</b>, la web funciona igual. Podés cambiar tu decisión "
  "borrando los datos de este sitio en tu navegador.</p>"),
 ("cambios", "8. Cambios en esta política",
  "<p>Si la actualizamos, publicamos la nueva versión en esta página con su fecha.</p>"),
]

open(OUT + "/terminos.html", "w", encoding="utf-8").write(pagina(
  "Términos y condiciones", "Condiciones de compra de Super Pañalera: precios, pagos, envíos, arrepentimiento y garantía.",
  TERMINOS, "privacidad.html", "Política de privacidad"))
open(OUT + "/privacidad.html", "w", encoding="utf-8").write(pagina(
  "Política de privacidad", "Cómo cuida Super Pañalera los datos de sus clientes.",
  PRIVACIDAD, "terminos.html", "Términos y condiciones"))
faltan = sum(x.count("<mark>") for x in [open(OUT + "/terminos.html").read(), open(OUT + "/privacidad.html").read()])
print("legales ok · datos por completar:", faltan)
