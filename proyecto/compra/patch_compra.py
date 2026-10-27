import os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # carpeta proyecto/
# Toma salida/index-v2.html (copia de tienda/super-panalera.html) y le aplica la compra nueva
p=os.path.join(RAIZ,'salida','index-v2.html')
s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)

# ── íconos nuevos
rep('''  <symbol id="i-candado" viewBox="0 0 24 24">''','''  <symbol id="i-banco" viewBox="0 0 24 24"><path d="M3.5 9.5 12 4.5l8.5 5"/><path d="M5 10v7.5M9.7 10v7.5M14.3 10v7.5M19 10v7.5"/><path d="M3.5 20h17"/></symbol>
  <symbol id="i-billete" viewBox="0 0 24 24"><rect x="2.8" y="6.5" width="18.4" height="11" rx="1.8"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v.01M18 14.5v.01"/></symbol>
  <symbol id="i-copiar" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></symbol>
  <symbol id="i-candado" viewBox="0 0 24 24">''')

# ── configuración
rep('''    /* ── WhatsApp ──────────────────────────────────────────────────── */
    whatsapp: {''','''    /* ── Finalizar compra (proyecto "compra v2") ──────────────────────
       Los números de envío son DE EJEMPLO hasta que Mónica confirme los reales.
       costo: 0 = gratis · null = "a confirmar" */
    compra: {
      /* true = versión de prueba: los pedidos NO se guardan en la base y el
         WhatsApp sale marcado [PRUEBA]. Pasar a false al publicarla de verdad. */
      modoPrueba: true,
      retiro:  { titulo: "Retiro en el local",
                 detalle: "Gral. Justo José de Urquiza 1071, Federal",
                 horario: "Lunes a sábados de 8:30 a 12:30 y de 16:30 a 20:30" },
      federal: { titulo: "Envío a domicilio en Federal", costo: 2500, gratisDesde: 0 },
      otra:    { titulo: "Envío a otra localidad", costo: null,
                 detalle: "Te confirmamos el costo por WhatsApp antes de despacharlo." },
      transferencia: { alias: "SUPER.PANALERA", cbu: "", titular: "Super Pañalera", banco: "" }
    },

    /* ── WhatsApp ──────────────────────────────────────────────────── */
    whatsapp: {''')

# ── hoja de checkout + botón del carrito
rep('''      <a class="btn btn--ink" id="btnTerminar" href="#" target="_blank" rel="noopener">
        <svg class="mark" viewBox="0 0 24 24" style="width:17px;height:17px"><use href="#i-wa"/></svg>
        <span class="terminar__txt">Terminar compra</span></a>
    </div>
  </div>
</div>''','''      <button class="btn btn--ink" id="btnTerminar" type="button">
        <span class="terminar__txt">Continuar compra</span></button>
    </div>
  </div>
</div>

<div class="sheet" id="shCompra" role="dialog" aria-modal="true" aria-labelledby="compraTit">
  <div class="sheet__panel">
    <div class="sheet__head">
      <button class="iconbtn" type="button" id="compraAtras" aria-label="Volver al carrito">
        <svg class="mark" viewBox="0 0 24 24"><use href="#i-izq"/></svg></button>
      <div style="flex:1"><h2 id="compraTit">Finalizar compra</h2></div>
      <button class="iconbtn" type="button" data-close aria-label="Cerrar">
        <svg class="mark" viewBox="0 0 24 24"><use href="#i-cerrar"/></svg></button>
    </div>
    <div class="sheet__body" id="compraCuerpo"></div>
    <div class="carro__pie" id="compraPie">
      <p class="cpie__total" id="compraTotal"></p>
      <button class="btn btn--ink" id="btnConfirmar" type="button">
        <span class="terminar__txt">Continuar</span></button>
    </div>
  </div>
</div>''')

# ── historia
rep('''  const CON_HISTORIA = ["#shProd", "#shFoto", "#shCarro", "#shPanel", "#shMenu"];''',
    '''  const CON_HISTORIA = ["#shProd", "#shFoto", "#shCarro", "#shCompra", "#shPanel", "#shMenu"];''')
rep('''"#shCarro": "carrito",''','''"#shCarro": "carrito", "#shCompra": "finalizar-compra",''')
rep('''  addEventListener("popstate", () => {
    const sel = pila.pop();
    if (sel === SUB) volverAlInicio();
    else if (sel) cerrarVisual($(sel));
  });''','''  addEventListener("popstate", () => {
    /* un history.go() hecho a propósito (varias entradas de una vez) */
    if (saltarPop){ saltarPop--; return; }
    const sel = pila.pop();
    if (sel === SUB) volverAlInicio();
    else if (sel === PASO_COMPRA) pasoAtras();
    else if (sel === "#shCompra" && pedidoHecho) cerrarTodas();
    else if (sel) cerrarVisual($(sel));
  });''')
rep('''    /* si la hoja entró en la historia, que la cierre el "atrás": así el''','''    /* "Finalizar compra" con pasos adelante: se cierran todas sus entradas juntas */
    if (s.id === "shCompra" && pila[pila.length - 1] === PASO_COMPRA){
      let k = 0;
      while (pila[pila.length - 1] === PASO_COMPRA){ pila.pop(); k++; }
      if (pila[pila.length - 1] === "#shCompra"){ pila.pop(); k++; }
      saltarPop++;
      try { history.go(-k); } catch { saltarPop--; }
      cerrarVisual(s);
      return;
    }
    /* si la hoja entró en la historia, que la cierre el "atrás": así el''')
rep('''  const CON_HISTORIA = ["#shProd", "#shFoto", "#shCarro", "#shCompra", "#shPanel", "#shMenu"];''',
'''  const CON_HISTORIA = ["#shProd", "#shFoto", "#shCarro", "#shCompra", "#shPanel", "#shMenu"];
  /* cada paso de "Finalizar compra" es una entrada más del historial */
  const PASO_COMPRA = "#shCompra>paso";
  let saltarPop = 0;''')

# ── el carrito ya no arma el WhatsApp: abre "Finalizar compra"
rep('''    $("#btnTerminar").href = enlaceWaTexto(mensajePedido(items, sub, desc));
  }''','''  }''')

old_start = '''  $("#btnTerminar").addEventListener("click", () => {
    const items = lineas(); if (!items.length || !codigoActual) return;'''
i = s.index(old_start)
j = s.index('''    avisar("Pedido #" + cod + " enviado. Te respondemos por WhatsApp.");
  });''', i) + len('''    avisar("Pedido #" + cod + " enviado. Te respondemos por WhatsApp.");
  });''')
JS = open(os.path.join(RAIZ,'compra','compra.js'),encoding='utf-8').read()
s = s[:i] + JS + s[j:]

CSS = open(os.path.join(RAIZ,'compra','compra.css'),encoding='utf-8').read()
k=s.index('<!-- ═══ INTRO ═══ -->'); m=s.rindex('</style>',0,k)
s=s[:m]+CSS+s[m:]
# sistema de medidas (M3): al final de todo para que mande
SIS = open(os.path.join(RAIZ,'compra','sistema.css'),encoding='utf-8').read()
k=s.index('<!-- ═══ INTRO ═══ -->'); m=s.rindex('</style>',0,k)
s=s[:m]+SIS+s[m:]

# subir el comprobante (bucket "comprobantes": ver comprobantes.sql)
rep('''      crearPedido: async (codigo, items, cupon, extra) => {''','''      /* El cliente sube la captura de la transferencia. Solo puede subir,
         no leer: el bucket es privado y lo ve el admin. */
      subirComprobante: async (codigo, blob, tipo) => {
        const ext = tipo === "application/pdf" ? "pdf" : "jpg";
        const ruta = String(codigo).replace(/[^A-Z0-9]/gi, "") + "-" + Date.now().toString(36) + "." + ext;
        await pedir("/storage/v1/object/comprobantes/" + encodeURIComponent(ruta), {
          method: "POST", headers: { "Content-Type": tipo }, body: blob
        });
        return ruta;
      },
      crearPedido: async (codigo, items, cupon, extra) => {''')

# ── pestaña "Envíos" en el panel
rep('''        <button class="tab" type="button" data-tab="opiniones">''','''        <button class="tab" type="button" data-tab="envios">
          <svg class="mark" viewBox="0 0 24 24"><use href="#i-envio"/></svg>
          <span>Envíos</span></button>
        <button class="tab" type="button" data-tab="banco">
          <svg class="mark" viewBox="0 0 24 24"><use href="#i-banco"/></svg>
          <span>Datos bancarios</span></button>
        <button class="tab" type="button" data-tab="opiniones">''')
rep('''      <div id="tabOpiniones" hidden>''','''      <div id="tabEnvios" hidden>
        <p class="aviso">Lo que cobran los envíos. El cliente lo ve en el carrito y al finalizar la compra.</p>
        <form id="formEnvios" autocomplete="off">
          <h4 class="envtit">Envío a domicilio en Federal</h4>
          <div class="row2">
            <label class="field"><span>Costo ($)</span>
              <input class="input" name="federalCosto" inputmode="numeric" placeholder="Ej: 2500"></label>
            <label class="field"><span>Gratis desde ($)</span>
              <input class="input" name="gratisDesde" inputmode="numeric" placeholder="Ej: 60000"></label>
          </div>
          <p class="field__hint">Si no hay envío gratis, dejá ese campo vacío. Si dejás el costo vacío, el cliente
            ve "a confirmar"; con 0, el envío es siempre gratis.</p>
          <h4 class="envtit">Envío a otra localidad</h4>
          <label class="field"><span>Costo ($)</span>
            <input class="input" name="otraCosto" inputmode="numeric" placeholder="Ej: 8000"></label>
          <p class="field__hint">Vacío: el cliente ve "a confirmar" y se lo pasan por WhatsApp.</p>
          <button class="btn btn--ink" type="submit" style="width:100%;margin-top:.6rem">Guardar envíos</button>
        </form>
      </div>

      <div id="tabBanco" hidden>
        <p class="aviso">Los datos que ve el cliente para pagar por transferencia.</p>
        <form id="formBanco" autocomplete="off">
          <div class="row2">
            <label class="field"><span>Alias</span><input class="input" name="alias" maxlength="60"></label>
            <label class="field"><span>CBU / CVU</span><input class="input" name="cbu" inputmode="numeric" maxlength="26"></label>
          </div>
          <div class="row2">
            <label class="field"><span>Titular</span><input class="input" name="titular" maxlength="60"></label>
            <label class="field"><span>Banco o billetera</span><input class="input" name="banco" maxlength="60"></label>
          </div>
          <button class="btn btn--ink" type="submit" style="width:100%;margin-top:.6rem">Guardar datos bancarios</button>
        </form>
      </div>

      <div id="tabOpiniones" hidden>''')
rep('''    $("#tabOpiniones").hidden = t !== "opiniones";''','''    $("#tabOpiniones").hidden = t !== "opiniones";
    $("#tabEnvios").hidden = t !== "envios";
    $("#tabBanco").hidden = t !== "banco";
    if (t === "envios" || t === "banco") pintarEnviosAdmin();''')
rep('''      const op = filas.find(f => f.clave === "opiniones");''','''      const env = filas.find(f => f.clave === "envios");
      if (env && env.valor) aplicarEnvios(env.valor);
      const op = filas.find(f => f.clave === "opiniones");''')

# ── el carrito muestra la entrega elegida y su costo
rep('''      '<div class="totales">' +
        "<div><span>Subtotal</span><span>" + plataTxt(sub) + "</span></div>" +
        (desc ? '<div class="desc"><span>Descuento ' + num(cuponAplicado.pct) + " %</span><span>−" +
          plataTxt(desc) + "</span></div>" : "") +
        '<div class="total"><span>Total</span><span>' + plataTxt(sub - desc) + "</span></div>" +
      "</div>" +''','''      '<div class="totales">' +
        "<div><span>Subtotal</span><span>" + plataTxt(sub) + "</span></div>" +
        (desc ? '<div class="desc"><span>Descuento ' + num(cuponAplicado.pct) + " %</span><span>−" +
          plataTxt(desc) + "</span></div>" : "") +
        filasEnvioCarro(sub, desc).filas +
        '<div class="total"><span>Total</span><span>' + plataTxt(filasEnvioCarro(sub, desc).total) +
          (filasEnvioCarro(sub, desc).aConfirmar ? " + envío" : "") + "</span></div>" +
      "</div>" +''')

# el desplegable de entrega va arriba del código de descuento
rep('''      }).join("") +

      (cuponAplicado
        ? '<div class="cupon-ok">''','''      }).join("") +

      htmlEnvioCarro() +
      (cuponAplicado
        ? '<div class="cupon-ok">''')

# título "Código de descuento" como el de "Entrega", sin placeholder
rep('''      htmlEnvioCarro() +
      (cuponAplicado''','''      htmlEnvioCarro() +
      '<p class="carro__rot">Código de descuento</p>' +
      (cuponAplicado''')
rep('''            'placeholder="Código de descuento" aria-label="Código de descuento" value="' +''',
    '''            'placeholder="Ej: BEBE10" aria-label="Código de descuento" value="' +''')

# título de la pestaña: que se note que es la de prueba

# ── ficha del producto: retiro y pago (sin el renglón de confirmación por WhatsApp, 23/10)
rep("""        '<li><svg class="mark" viewBox="0 0 24 24"><use href="#i-wa"/></svg>Confirmás tu pedido por WhatsApp</li>' +
        '<li><svg class="mark" viewBox="0 0 24 24"><use href="#i-tarjeta"/></svg>Elegís la forma de pago</li>' +
        '<li><svg class="mark" viewBox="0 0 24 24"><use href="#i-envio"/></svg>Lo retirás o te lo enviamos</li>' +""",
"""        '<li><svg class="mark" viewBox="0 0 24 24"><use href="#i-envio"/></svg>Retiro gratis en el local o envío a domicilio</li>' +
        '<li><svg class="mark" viewBox="0 0 24 24"><use href="#i-tarjeta"/></svg>Pago por transferencia o en efectivo al retirar</li>' +""")
# ── Cómo comprar: cuatro pasos según la compra nueva (23/10)
rep('''      { titulo: "Lo confirmamos por WhatsApp",
        texto:  "Al terminar la compra se abre WhatsApp con tu pedido armado y te " +
                "respondemos para confirmarlo." },
      { titulo: "Coordinamos envío y pago",
        texto:  "Acordamos cómo te llega y el medio de pago que más te convenga." }
    ],''','''      { titulo: "Elegís cómo recibirlo",
        texto:  "Te lo enviamos hasta tu domicilio o pasás a retirarlo gratis por " +
                "nuestro local." },
      { titulo: "Método de pago",
        texto:  "Pagás como prefieras: podés hacerlo por transferencia o en efectivo " +
                "al retirar." },
      { titulo: "Te confirmamos por WhatsApp",
        texto:  "Recibimos tu pedido y te escribimos para confirmarlo y coordinar " +
                "la entrega." }
    ],''')
rep('''        "Hacemos envíos a todo el país: escribinos y coordinamos cómo te llega a tu " +
        "localidad.",''','''        "Hacemos envíos a todo el país: marcá la opción «Envío a otra localidad» al comprar y " +
        "te pasamos el costo por WhatsApp.",''')
# cuatro tarjetas: una debajo de la otra en el celu, 2 × 2 en tablet y compu
rep('''@media (min-width:760px){ .pasos{grid-template-columns:repeat(3,minmax(0,1fr))} }''',
'''@media (min-width:760px){ .pasos{grid-template-columns:repeat(2,minmax(0,1fr))} }''')
rep('''  .pasos{grid-template-rows:auto auto; row-gap:0}''','''  .pasos{grid-template-rows:auto auto; row-gap:1rem}''')

rep('''        texto:  "Elegí los productos y las cantidades desde el catálogo." },''',
    '''        texto:  "Sumá al carrito los productos que más te gusten." },''')
rep('<title>Super Pañalera</title>','<title>Super Pañalera · compra v2 (prueba · versión 84)</title>')
open(p,'w',encoding='utf-8').write(s)
print("ok")
