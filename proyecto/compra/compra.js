  /* ═══ FINALIZAR COMPRA (compra v2) ═══════════════════════════════════
     De a un paso: 1. Tus datos → 2. Entrega → 3. Pago → ¡Gracias!
     Con envío se paga por transferencia: en el paso 3 aparecen directo el
     número de pedido, el monto, el alias y para subir la captura del
     comprobante. Con retiro se elige transferencia o efectivo.
     Cada paso suma una entrada al historial: el "atrás" del teléfono vuelve
     al paso anterior. Los datos del cliente NO se guardan en el teléfono. */
  const CFG_COMPRA = NEGOCIO.compra || {};
  /* número de versión visible solo en la prueba, para saber qué archivo se está viendo */
  const VERSION_PRUEBA = 84;
  const marcaVersion = () => CFG_COMPRA.modoPrueba ? '<p class="cversion">Versión de prueba ' + VERSION_PRUEBA + "</p>" : "";
  try { localStorage.removeItem(PFX + "cliente"); } catch {}   /* de la versión anterior */
  const PROVINCIAS = ["Entre Ríos", "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut",
    "Córdoba", "Corrientes", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
    "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
    "Santiago del Estero", "Tierra del Fuego", "Tucumán"];
  const ico = id => '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>';

  const compraVacia = () => ({ nombre:"", apellido:"", tel:"", email:"", entrega:"", calle:"",
    altura:"", sinAltura:false, piso:"", provincia:"Entre Ríos", localidad:"", cp:"", obs:"",
    pago:"", punto:null, comprobante:null, transferido:false });
  let compra = compraVacia();
  let paso = 1;             /* 1 datos · 2 entrega · 3 pago */
  let pedidoHecho = null;   /* datos del pedido recién confirmado */
  let tMapa = null, posFuera = null;

  const conEnvio = () => compra.entrega === "federal" || compra.entrega === "otra";
  /* Con envío solo hay transferencia */
  const pagoElegido = () => conEnvio() ? "transferencia" : compra.pago;

  /* Costo de envío: número, 0 = gratis, null = a confirmar */
  function costoEnvio(){
    const base = subtotal() - descuento();
    if (compra.entrega === "retiro") return 0;
    if (compra.entrega === "federal"){
      const f = CFG_COMPRA.federal || {};
      if (f.costo == null) return null;
      if (f.gratisDesde > 0 && base >= f.gratisDesde) return 0;
      return Number(f.costo) || 0;
    }
    if (compra.entrega === "otra"){
      const o = CFG_COMPRA.otra || {};
      return o.costo == null ? null : Number(o.costo) || 0;
    }
    return undefined;   /* todavía no eligió */
  }
  const envioTxt = (c, ent = compra.entrega) => c === undefined ? "Elegí el envío" : c === null ? "A confirmar"
    : c === 0 ? "Gratis" : plataTxt(c);
  const totalCompra = () => { const e = costoEnvio(); return subtotal() - descuento() + (typeof e === "number" ? e : 0); };
  const totalTxt = () => plataTxt(totalCompra()) + (costoEnvio() === null ? " + envío" : "");

  function direccionTxt(){
    const fed = compra.entrega === "federal";
    return [compra.calle + (compra.sinAltura ? " s/n" : compra.altura ? " " + compra.altura : ""),
      fed ? "" : compra.piso, fed ? "Federal" : compra.localidad, fed ? "Entre Ríos" : compra.provincia,
      fed ? "" : compra.cp]
      .map(x => String(x || "").trim()).filter(Boolean).join(", ");
  }

  /* ─── Piezas ───────────────────────────────────────────────────────── */
  const campo = (k, rotulo, extra = {}) =>
    '<label class="field cfield" data-campo="' + k + '"><span>' + rotulo +
      (extra.opcional ? ' <i>(opcional)</i>' : "") + "</span>" +
      '<input class="input" data-k="' + k + '" value="' + esc(compra[k] || "") + '"' +
      (extra.tipo ? ' type="' + extra.tipo + '"' : ' type="text"') +
      (extra.modo ? ' inputmode="' + extra.modo + '"' : "") +
      ' autocomplete="' + (extra.auto || "off") + '"' +
      (extra.ph ? ' placeholder="' + esc(extra.ph) + '"' : "") + ">" +
      '<em class="cfield__err" hidden></em></label>';

  const opcion = (grupo, valor, icono, titulo, detalle, precio) =>
    '<button type="button" class="copc" role="radio" data-' + grupo + '="' + valor + '" aria-checked="' +
      (compra[grupo] === valor) + '">' +
      '<span class="copc__ico">' + ico(icono) + "</span>" +
      '<span class="copc__txt"><b>' + titulo + "</b>" + (detalle ? "<small>" + detalle + "</small>" : "") + "</span>" +
      (precio ? '<span class="copc__precio">' + precio + "</span>" : "") +
      '<span class="copc__check">' + ico("i-tilde") + "</span></button>";

  /* Resumen fijo arriba de los pasos: qué compra, cómo le llega y cuánto paga */
  function htmlResumenTop(){
    const ls = lineas(); if (!ls.length) return "";
    const { l, p } = ls[0];
    const unidades = ls.reduce((t, x) => t + x.l.cant, 0);
    /* el nombre se corta con "…", pero el "y 2 más" queda siempre a la vista */
    const nombre = (ls.length === 1 && l.cant > 1 ? l.cant + " × " : "") + p.nombre + (l.v ? " · " + l.v : "");
    const mas = ls.length > 1 ? "y " + (ls.length - 1) + " más" : "";
    const f = fotosDe(p)[0];
    const env = costoEnvio();
    const ent = compra.entrega === "retiro" ? "Retiro en el local · gratis"
      : env === undefined ? "Elegís el envío en el paso 2"
      : env === null ? "Envío a confirmar"
      : env === 0 ? "Envío gratis incluido"
      : "Envío " + plataTxt(env) + " incluido";
    /* con más de un producto: hasta tres fotos apiladas en abanico */
    const mini = x => { const g = fotosDe(x.p)[0];
      return '<span class="ctop__mini">' + (g ? imgChica(g, "") : ico("i-bolsa")) + "</span>"; };
    const foto = ls.length > 1
      ? '<div class="ctop__pila' + (ls.length > 2 ? " ctop__pila--3" : "") + '">' + ls.slice(0, 3).map(mini).join("") +
          '<span class="ctop__n">' + unidades + "</span></div>"
      : '<div class="ctop__foto">' + (f ? imgChica(f, "") : ico("i-bolsa")) +
          (unidades > 1 ? '<span class="ctop__n">' + unidades + "</span>" : "") + "</div>";
    return '<div class="ctop">' + foto +
      '<div class="ctop__txt"><b><span class="ctop__nom">' + esc(nombre) + "</span>" +
        (mas ? '<span class="ctop__mas">' + mas + "</span>" : "") + "</b>" +
        '<span class="ctop__env' + (env === undefined ? " falta" : "") + '">' + ent + "</span></div>" +
      '<div class="ctop__tot"><span>Total</span><b>' + plataTxt(totalCompra()) + "</b>" +
        (env === null ? "<small>+ envío</small>" : "") + "</div>" +
    "</div>";
  }

  const PASOS = [["datos", "Tus datos"], ["entrega", "Envío"], ["pago", "Pago"]];
  function htmlPasos(){
    return '<ol class="cpasos">' + PASOS.map(([k, t], i) => {
      const n = i + 1, estado = n < paso ? "ok" : n === paso ? "hoy" : "";
      return '<li class="' + estado + '"' + (n < paso ? ' data-irpaso="' + n + '" role="button" tabindex="0"' : "") +
        "><span>" + (n < paso ? "✓" : n) + "</span>" + t + "</li>";
    }).join("") + "</ol>";
  }

  /* Datos para transferir + subir la captura (paso 3) */
  function htmlTransferencia(){
    const tr = CFG_COMPRA.transferencia || {};
    if (!codigoActual) codigoActual = nuevoCodigo();
    const copiar = (val, rot) => '<button type="button" class="ccopia" data-copiar="' + esc(val) + '" aria-label="Copiar ' + rot + '">' +
      ico("i-copiar") + "<span>Copiar</span></button>";
    /* el Copiar va en la misma fila que el valor (no centrado con todo el bloque) */
    const dato = (rot, val, copia, extra) => val ? '<div class="cdato cdato--grande"><div><span>' + rot + "</span>" +
      '<div class="cdato__fila"><b>' + esc(val) + "</b>" + copiar(copia || val, rot) + "</div>" +
      (extra || "") + "</div></div>" : "";
    /* Titular y, en la línea de abajo, el banco */
    const titular = (tr.titular ? '<small class="ctransf__tit">Titular: <b>' + esc(tr.titular) + "</b></small>" : "") +
      (tr.banco ? '<small class="ctransf__tit ctransf__banco">' + (/^banco/i.test(tr.banco) ? "" : "Banco: ") +
        "<b>" + esc(tr.banco) + "</b></small>" : "");
    return '<div id="cTransf">' +
      '<div class="ctransf">' +
        '<p class="ctransf__ped">Pedido #' + esc(codigoActual) + "</p>" +
        '<div class="ctransf__datos">' +
          dato("Total a transferir", plataTxt(totalCompra()), String(Math.round(totalCompra())),
            costoEnvio() === null ? '<small class="ctransf__aviso">El envío te lo confirmamos por WhatsApp y lo transferís aparte.</small>' : "") +
          dato("Alias", tr.alias, "", titular) +
          dato("CBU / CVU", tr.cbu, "", tr.alias ? "" : titular) +
        "</div>" +
      "</div>" +
      '<label class="ctransf__ya' + (compra.transferido ? " ok" : "") + '"><input type="checkbox" data-k="transferido"' +
        (compra.transferido ? " checked" : "") + "><span>Ya hice la transferencia</span></label>" +
      '<em class="cfield__err cgrupo__err ctransf__err" data-err="transferido" hidden></em>' +
      '<div class="csube" id="cSube"' + (compra.transferido ? "" : " hidden") + ">" + htmlSube() + "</div>" +
    "</div>";
  }
  /* La tarjeta del comprobante aparece cuando marca "Ya hice la transferencia" */
  function htmlSube(){
    const c = compra.comprobante;
    return '<p class="csube__tit">Comprobante <i>(opcional)</i></p>' +
      '<p class="field__hint csube__nota">Si preferís, también podés mandarlo por WhatsApp después de confirmar.</p>' +
      (c
        ? '<div class="csube__ok">' + (c.vista ? '<img src="' + c.vista + '" alt="Comprobante">' : ico("i-tilde")) +
            "<div><b>Comprobante listo ✓</b><small>" + esc(c.nombre) + "</small></div>" +
            '<button type="button" class="csube__quitar" data-quitarcomp aria-label="Quitar el comprobante">' +
            ico("i-cerrar") + "</button></div>"
        : '<label class="csube__btn">' + ico("i-mas") + "Subir captura del comprobante" +
            '<input type="file" id="cComprobante" accept="image/*,application/pdf" hidden></label>');
  }

  /* ─── Pantallas ────────────────────────────────────────────────────── */
  function pintarCompra(){
    if (pedidoHecho) return pintarListo();
    if (!lineas().length){ cerrar($("#shCompra")); return; }
    const cuerpo = $("#compraCuerpo");
    const r = CFG_COMPRA.retiro || {}, f = CFG_COMPRA.federal || {}, o = CFG_COMPRA.otra || {};
    const precioFed = f.costo == null ? "A confirmar" : f.costo === 0 ? "Gratis" : plataTxt(f.costo);
    let h = '<div id="cTop">' + htmlResumenTop() + "</div>" + htmlPasos();

    if (paso === 1){
      h += '<section class="cbloque"><h3>Tus datos</h3>' +
        '<p class="cbloque__sub">Para confirmar el pedido y avisarte cuando esté listo.</p>' +
        '<div class="row2">' + campo("nombre", "Nombre", { auto:"given-name", ph:"Ej: María" }) +
          campo("apellido", "Apellido", { auto:"family-name", ph:"Ej: González" }) + "</div>" +
        campo("tel", "Celular (WhatsApp)", { tipo:"tel", modo:"tel", auto:"tel", ph:"Ej: 3454 123456" }) +
        campo("email", "Email", { tipo:"email", modo:"email", auto:"email", ph:"nombre@mail.com", opcional:true }) +
        "</section>";
    }

    if (paso === 2){
      h += '<section class="cbloque"><h3>Envío</h3>' +
        '<p class="cbloque__sub">¿Cómo querés recibir tu pedido?</p>' +
        '<div class="copcs" role="radiogroup" aria-label="Forma de entrega">' +
          opcion("entrega", "retiro", "i-local", esc(r.titulo || "Retiro en el local"), esc(r.detalle || ""), "Gratis") +
          opcion("entrega", "federal", "i-envio", esc(f.titulo || "Envío en Federal"),
            f.gratisDesde > 0 ? "Gratis en compras desde " + plataTxt(f.gratisDesde).replace(" ", " ") : "", precioFed) +
          opcion("entrega", "otra", "i-caja", esc(o.titulo || "Envío a otra localidad"), esc(o.detalle || ""), "A confirmar") +
        "</div>" +
        '<em class="cfield__err cgrupo__err" data-err="entrega" hidden></em>' +

        '<div class="cretiro" id="cRetiro" hidden>' +
          '<div class="cmapa__cab">' + ico("i-pin") + "<div><b>" + esc(r.detalle || "") + "</b>" +
            "<small>" + esc(r.horario || "") + "</small></div></div>" +
          '<div class="cmapa__marco" id="cMapaLocal"></div>' +
          '<p class="field__hint">Te avisamos por WhatsApp cuando tu pedido esté listo para retirar.</p>' +
        "</div>" +

        '<div class="cdir" id="cDir" hidden>' +
          '<div class="cdir__cab"><span>Dirección de entrega</span>' +
            '<button type="button" class="cdir__yo" id="cMiUbicacion">' + ico("i-pin") + "Usar mi ubicación</button></div>" +
          '<p class="cmapa__estado" id="cMapaEstado" hidden></p>' +
          '<div class="row2 solo-otra">' +
            '<label class="field cfield cfield--fija" data-campo="provincia"><span>Provincia</span>' +
              '<select class="input" data-k="provincia">' + PROVINCIAS.map(pv =>
                "<option" + (pv === compra.provincia ? " selected" : "") + ">" + pv + "</option>").join("") +
              "</select></label>" +
            campo("localidad", "Localidad", { auto:"address-level2", ph:"Ej: Concordia" }) + "</div>" +
          '<div class="row3c">' + campo("calle", "Calle", { auto:"address-line1", ph:"Ej: Urquiza" }) +
            campo("altura", "Altura", { modo:"numeric", ph:"Ej: 1071" }) + "</div>" +
          '<label class="ccheck"><input type="checkbox" data-k="sinAltura"' + (compra.sinAltura ? " checked" : "") +
            "> La calle no tiene altura</label>" +
          '<div class="row2 solo-otra">' + campo("piso", "Piso / depto", { ph:"Opcional · Ej: 2° B" }) +
            campo("cp", "Código postal", { modo:"numeric", auto:"postal-code", ph:"Ej: 3200" }) + "</div>" +
          '<div class="cmapa" id="cMapa" hidden>' +
            '<div class="cmapa__cab">' + ico("i-pin") + '<div><b id="cMapaDir"></b>' +
              "<small>Si el punto no coincide, corregí la dirección o aclaralo en observaciones.</small></div>" +
              '<a class="cmapa__abrir" id="cMapaAbrir" target="_blank" rel="noopener">Abrir en Maps</a></div>' +
            '<div class="cmapa__marco" id="cMapaMarco"></div></div>' +
          '<label class="field cfield cfield--fija cfield--area"><span>Observaciones <i>(opcional)</i></span>' +
            '<textarea class="textarea" data-k="obs" rows="2" placeholder="Ej: timbre roto, casa con rejas verdes…">' +
            esc(compra.obs) + "</textarea></label>" +
        "</div></section>";
    }

    if (paso === 3){
      if (conEnvio()) compra.pago = "transferencia";
      h += '<section class="cbloque"><h3>Método de pago</h3>' +
        '<p class="cbloque__sub">' + (conEnvio() ? "Los envíos se pagan por transferencia." : "Elegí cómo vas a pagar.") + "</p>" +
        '<div class="copcs" role="radiogroup" aria-label="Forma de pago">' +
          opcion("pago", "transferencia", "i-banco", "Transferencia bancaria", "Transferís ahora y subís el comprobante.") +
          (conEnvio() ? "" : opcion("pago", "efectivo", "i-billete", "Efectivo al retirar", "Pagás en el local cuando lo buscás.")) +
        "</div>" +
        '<em class="cfield__err cgrupo__err" data-err="pago" hidden></em>' +
        '<div id="cTransfCaja"' + (compra.pago === "transferencia" ? "" : " hidden") + ">" +
          (compra.pago === "transferencia" ? htmlTransferencia() : "") + "</div>" +
        "</section>";
      h += '<section class="cbloque cresumen" id="cResumen"></section>';
    }

    cuerpo.innerHTML = h + marcaVersion();
    actualizarCompra();
  }

  /* Formularios: el rótulo vive dentro del campo y sube cuando hay algo
     escrito (clase "lleno"); el teclado muestra "siguiente" y Enter pasa al
     próximo campo. En el último, Enter continúa. */
  const camposVisibles = () => $$("#compraCuerpo .cfield .input, #compraCuerpo .cfield .textarea")
    .filter(x => !x.disabled && x.offsetParent !== null);
  function marcarLleno(i){
    const c = i && i.closest(".cfield"); if (c) c.classList.toggle("lleno", !!String(i.value || "").trim());
  }
  function prepararCampos(){
    $$("#compraCuerpo .cfield .input, #compraCuerpo .cfield .textarea").forEach(marcarLleno);
    const vs = camposVisibles();
    vs.forEach((x, n) => { if (x.tagName === "INPUT") x.setAttribute("enterkeyhint", n < vs.length - 1 ? "next" : "done"); });
  }

  /* Lo que cambia sin volver a pintar (así no se pierde el foco) */
  function actualizarCompra(){
    const e = compra.entrega;
    const ret = $("#cRetiro"), dir = $("#cDir");
    if (ret) ret.hidden = e !== "retiro";
    if (dir) dir.hidden = !conEnvio();
    $$("#compraCuerpo .solo-otra").forEach(x => { x.hidden = e !== "otra"; });
    const alt = $('[data-k="altura"]');
    if (alt){ alt.disabled = !!compra.sinAltura; if (compra.sinAltura){ alt.value = ""; compra.altura = ""; } }
    $$("[data-entrega]").forEach(b => b.setAttribute("aria-checked", b.dataset.entrega === e));
    $$("[data-pago]").forEach(b => b.setAttribute("aria-checked", b.dataset.pago === compra.pago));

    if (e === "retiro"){
      const marco = $("#cMapaLocal");
      if (marco && !marco.firstChild) marco.innerHTML = iframeMapa((NEGOCIO.pie || {}).mapa || (CFG_COMPRA.retiro || {}).detalle);
    }
    programarMapa(0);
    pintarResumenCompra();
    pintarPie();
    const top = $("#cTop"); if (top) top.innerHTML = htmlResumenTop();
    if (paso === 3) ajustarDatos();
    prepararCampos();
  }

  const iframeMapa = q => '<iframe title="Mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade" ' +
    'src="https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=17&output=embed"></iframe>';

  /* El mapa (de Google, solo para ver) se arma cuando la dirección está
     completa o cuando el cliente compartió su ubicación */
  function programarMapa(espera = 700){
    clearTimeout(tMapa);
    tMapa = setTimeout(() => {
      const caja = $("#cMapa"); if (!caja) return;
      const lista = conEnvio() && compra.calle.trim().length > 2 && (compra.sinAltura || compra.altura.trim()) &&
        (compra.entrega === "federal" || compra.localidad.trim().length > 2);
      const q = compra.punto ? compra.punto.join(",") : lista ? direccionTxt() + ", Argentina" : "";
      caja.hidden = !q;
      if (!q) return;
      $("#cMapaDir").textContent = direccionTxt() || "Tu ubicación";
      if (caja.dataset.q === q) return;
      caja.dataset.q = q;
      $("#cMapaAbrir").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
      $("#cMapaMarco").innerHTML = iframeMapa(q);
    }, espera);
  }
  function estadoMapa(t, mal, extra){
    const x = $("#cMapaEstado"); if (!x) return;
    x.hidden = !t; x.classList.toggle("mal", !!mal);
    x.innerHTML = t ? esc(t) + (extra || "") : "";
  }
  /* distancia en km (alcanza con una cuenta plana para unos pocos km) */
  const kmEntre = (a, b) => {
    const dy = (a[0] - b[0]) * 111.2, dx = (a[1] - b[1]) * 111.2 * Math.cos(a[0] * Math.PI / 180);
    return Math.sqrt(dx * dx + dy * dy);
  };
  const CENTRO_FEDERAL = [-30.9545, -58.7835];
  const RADIO_FEDERAL_KM = 25;

  /* "Usar mi ubicación": el teléfono da las coordenadas y se intenta
     completar la dirección con ellas (Nominatim, de OpenStreetMap). Si eso
     no contesta, igual queda el punto exacto en el mapa y en el pedido. */
  function miUbicacion(){
    if (!navigator.geolocation){ estadoMapa("Tu teléfono no permite compartir la ubicación."); return; }
    estadoMapa("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(async pos => {
      const punto = [Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6))];
      if (compra.entrega === "federal" && kmEntre(punto, CENTRO_FEDERAL) > RADIO_FEDERAL_KM){
        posFuera = punto;
        estadoMapa("Tu ubicación no está en Federal. El envío en Federal es solo dentro de la ciudad.", true,
          ' <button type="button" class="cdir__cambiar" data-aotra>Cambiar a envío a otra localidad</button>');
        return;
      }
      compra.punto = punto;
      let completo = false;
      try {
        const ctl = new AbortController(); const reloj = setTimeout(() => ctl.abort(), 7000);
        const r = await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=" +
          compra.punto[0] + "&lon=" + compra.punto[1], { headers: { "Accept-Language": "es" }, signal: ctl.signal });
        clearTimeout(reloj);
        const a = ((await r.json()) || {}).address || {};
        const poner = (k, v) => { if (!v) return; compra[k] = String(v); const i = $('[data-k="' + k + '"]'); if (i) i.value = compra[k]; };
        if (a.road){ poner("calle", a.road); completo = true; }
        if (a.house_number){ poner("altura", a.house_number); compra.sinAltura = false;
          const s = $('[data-k="sinAltura"]'); if (s) s.checked = false; }
        if (compra.entrega === "otra"){
          poner("localidad", a.city || a.town || a.village || a.municipality || "");
          poner("cp", (a.postcode || "").replace(/\D/g, "").slice(-4));
          const pv = PROVINCIAS.find(x => normCat(x) === normCat(String(a.state || "").replace(/^Provincia de /i, "")));
          if (pv){ compra.provincia = pv; const s = $('[data-k="provincia"]'); if (s) s.value = pv; }
        }
      } catch {}
      estadoMapa(completo ? "Listo ✓ Revisá que la dirección esté bien." : "Ubicación marcada ✓ Completá la calle y la altura.");
      $$("#cDir .cfield.mal").forEach(c => { if (compra[c.dataset.campo]){ c.classList.remove("mal"); const er = c.querySelector(".cfield__err"); if (er) er.hidden = true; } });
      actualizarCompra();
      const m = $("#cMapa"); if (m) setTimeout(() => m.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
    }, err => {
      estadoMapa(err && err.code === 1 ? "No diste permiso para ver tu ubicación." : "No pudimos obtener tu ubicación.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  function pintarResumenCompra(){
    const caja = $("#cResumen"); if (!caja) return;
    const items = lineas(), sub = subtotal(), desc = descuento(), env = costoEnvio();
    const f = CFG_COMPRA.federal || {};
    const falta = compra.entrega === "federal" && f.gratisDesde > 0 && env > 0 ? f.gratisDesde - (sub - desc) : 0;
    const ent = (CFG_COMPRA[compra.entrega] || {}).titulo || "";
    caja.innerHTML = "<h3>Tu pedido</h3>" +
      '<ul class="cres__items">' + items.map(({ l, p }) => {
        const pr = precioDe(p, l.v);
        return "<li><span>" + l.cant + " × " + esc(p.nombre) + (l.v ? " · " + esc(l.v) : "") + "</span><span>" +
          (pr > 0 ? plataTxt(pr * l.cant) : "A consultar") + "</span></li>";
      }).join("") + "</ul>" +
      '<div class="totales">' +
        "<div><span>Subtotal</span><span>" + plataTxt(sub) + "</span></div>" +
        (desc ? '<div class="desc"><span>Cupón ' + esc(cuponAplicado.codigo) + "</span><span>−" + plataTxt(desc) + "</span></div>" : "") +
        "<div><span>Envío" + (ent ? " · " + esc(ent) : "") + "</span><span>" + envioTxt(env) + "</span></div>" +
        '<div class="total"><span>Total</span><span>' + totalTxt() + "</span></div>" +
      "</div>" +
      (falta > 0 ? '<p class="cres__falta">Te faltan <b>' + plataTxt(falta) + "</b> para el envío gratis.</p>" : "");
  }

  function pintarPie(){
    const t = $("#btnConfirmar .terminar__txt"); if (!t) return;
    t.textContent = paso < 3 ? "Continuar" : "Confirmar";
    /* con transferencia, el botón se ve apagado hasta marcar "ya hice la transferencia" */
    $("#btnConfirmar").classList.toggle("apagado", paso === 3 && pagoElegido() === "transferencia" && !compra.transferido);
    $("#compraTotal").textContent = "";   /* el total ya está en el resumen de arriba */
  }

  /* ─── Comprobante ──────────────────────────────────────────────────── */
  /* Las capturas se achican antes de subirlas (las del celular pesan mucho) */
  function achicarImagen(archivo){
    return new Promise(ok => {
      const img = new Image(), url = URL.createObjectURL(archivo);
      img.onload = () => {
        const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(b => ok(b || archivo), "image/jpeg", .85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); ok(archivo); };
      img.src = url;
    });
  }
  async function elegirComprobante(archivo){
    if (!archivo) return;
    const esImg = /^image\//.test(archivo.type);
    if (!esImg && archivo.type !== "application/pdf"){ avisar("Subí una imagen o un PDF."); return; }
    const blob = esImg ? await achicarImagen(archivo) : archivo;
    if (blob.size > 6 * 1024 * 1024){ avisar("El archivo es muy pesado (máximo 6 MB)."); return; }
    compra.comprobante = { blob, nombre: archivo.name || "comprobante",
      tipo: esImg ? "image/jpeg" : "application/pdf", vista: esImg ? URL.createObjectURL(blob) : "" };
    refrescarTransferencia();
  }
  /* Alias, CBU y total en una sola línea, al lado del Copiar: si no entran
     (celular angosto o letra agrandada) se achican un poco; solo si ni así
     entran, recién ahí bajan de renglón. */
  function ajustarDatos(){
    requestAnimationFrame(() => $$("#compraCuerpo .cdato__fila b").forEach(b => {
      b.style.fontSize = ""; b.style.whiteSpace = ""; b.style.overflowWrap = ""; b.style.letterSpacing = "";
      if (!b.clientWidth) return;
      let t = parseFloat(getComputedStyle(b).fontSize);
      const min = t * .55;
      if (b.scrollWidth > b.clientWidth + 1) b.style.letterSpacing = "0";
      while (b.scrollWidth > b.clientWidth + 1 && t > min){ t -= .5; b.style.fontSize = t + "px"; }
      if (b.scrollWidth > b.clientWidth + 1){ b.style.whiteSpace = "normal"; b.style.overflowWrap = "anywhere"; }
    }));
  }
  addEventListener("resize", () => { if (paso === 3 && !pedidoHecho) ajustarDatos(); });

  function refrescarTransferencia(){
    const caja = $("#cSube"); if (caja) caja.innerHTML = htmlSube();
  }

  /* ─── Validación por paso ──────────────────────────────────────────── */
  function errores(){
    const m = {};
    const t = k => String(compra[k] || "").trim();
    if (paso === 1){
      if (t("nombre").length < 2) m.nombre = "Escribí tu nombre.";
      if (t("apellido").length < 2) m.apellido = "Escribí tu apellido.";
      if (t("tel").replace(/\D/g, "").length < 8) m.tel = "Revisá el celular (con característica).";
      if (t("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t("email"))) m.email = "Revisá el email.";
    }
    if (paso === 2){
      if (!compra.entrega) m.entrega = "Elegí cómo lo recibís.";
      if (conEnvio()){
        if (t("calle").length < 2) m.calle = "Falta la calle.";
        if (!compra.sinAltura && !t("altura")) m.altura = "Falta la altura.";
      }
      if (compra.entrega === "otra"){
        if (t("localidad").length < 2) m.localidad = "Falta la localidad.";
        if (!/^\d{4}$|^[A-Za-z]\d{4}[A-Za-z]{3}$/.test(t("cp"))) m.cp = "Revisá el código postal.";
      }
    }
    if (paso === 3 && !pagoElegido()) m.pago = "Elegí cómo pagás.";
    if (paso === 3 && pagoElegido() === "transferencia" && !compra.transferido)
      m.transferido = "Marcá que ya hiciste la transferencia para terminar.";
    return m;
  }
  function mostrarErrores(m){
    $$("#compraCuerpo .cfield").forEach(c => {
      const k = c.dataset.campo, err = c.querySelector(".cfield__err");
      c.classList.toggle("mal", !!m[k]);
      if (err){ err.hidden = !m[k]; err.textContent = m[k] || ""; }
    });
    $$("#compraCuerpo [data-err]").forEach(x => { x.hidden = !m[x.dataset.err]; x.textContent = m[x.dataset.err] || ""; });
    const orden = ["nombre", "apellido", "tel", "email", "entrega", "provincia", "localidad", "calle", "altura", "cp", "pago", "transferido"];
    const primero = orden.find(k => m[k]);
    if (!primero) return;
    const el = $('#compraCuerpo [data-campo="' + primero + '"]') || $('#compraCuerpo [data-err="' + primero + '"]');
    if (el){
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const inp = el.querySelector && el.querySelector("input,select");
      if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 350);
    }
  }

  /* ─── Avanzar y volver ─────────────────────────────────────────────── */
  function irAPaso(n){
    paso = n;
    pintarCompra();
    $("#shCompra .sheet__body").scrollTop = 0;
    const sheet = $("#shCompra"); if (sheet) sheet.scrollTop = 0;
  }
  function avanzar(){
    const m = errores();
    mostrarErrores(m);
    if (Object.keys(m).length) return;
    if (paso === 3) return confirmarCompra();
    pila.push(PASO_COMPRA);
    try { history.pushState({ jm: pila.length }, "", urlHoja("#shCompra")); } catch {}
    irAPaso(paso + 1);
  }
  /* Lo llama el "atrás" (del teléfono o de la flecha de arriba) */
  function pasoAtras(){
    if (pedidoHecho) return;
    irAPaso(Math.max(1, paso - 1));
  }

  /* ─── Mensaje de WhatsApp con todo ─────────────────────────────────── */
  function mensajeCompra(d){
    let t = (CFG_COMPRA.modoPrueba ? "[PRUEBA · no preparar]\n" : "") +
      "¡Hola " + NEGOCIO.marcaCorta + "! Hice este pedido en la web:\n\nPedido #" + d.codigo + "\n\n";
    d.items.forEach(x => {
      t += "• " + x.cant + " × " + x.nombre + (x.variedad ? " (" + x.variedad + ")" : "") +
        (x.precio > 0 ? " — " + plataTxt(x.precio * x.cant) : " — a consultar") + "\n";
    });
    t += "\nSubtotal: " + plataTxt(d.subtotal);
    if (d.descuento) t += "\nCupón " + d.cupon + ": −" + plataTxt(d.descuento);
    t += "\nEnvío: " + envioTxt(d.envio, d.entrega);
    t += "\nTotal: " + plataTxt(d.total) + (d.envio === null ? " + envío" : "");
    t += "\n\n👤 " + d.cliente.nombre + " " + d.cliente.apellido + "\n📱 " + d.cliente.tel +
      (d.cliente.email ? "\n✉️ " + d.cliente.email : "");
    t += "\n\n🚚 " + d.entregaTxt + (d.direccion ? "\n📍 " + d.direccion : "") +
      (d.punto ? "\n🗺️ Mi ubicación: https://maps.google.com/?q=" + d.punto[0] + "," + d.punto[1] : "") +
      (d.obs ? "\n📝 " + d.obs : "");
    t += "\n\n💳 " + (d.pago === "efectivo" ? "Efectivo al retirar"
      : d.comprobanteSubido ? "Transferencia: subí el comprobante en la web"
      : "Transferencia: te paso el comprobante por acá");
    return t;
  }

  /* ─── Confirmar ────────────────────────────────────────────────────── */
  async function confirmarCompra(){
    const items = lineas(); if (!items.length) return;
    if (!codigoActual) codigoActual = nuevoCodigo();
    const sub = subtotal(), desc = descuento(), env = costoEnvio();
    const ent = CFG_COMPRA[compra.entrega] || {};
    const pago = pagoElegido();
    const d = {
      codigo: codigoActual,
      items: items.map(({ l, p }) => ({ id: p.id, nombre: p.nombre, variedad: l.v || "", cant: l.cant, precio: precioDe(p, l.v) })),
      subtotal: sub, descuento: desc, cupon: cuponAplicado ? cuponAplicado.codigo : "",
      envio: env, total: totalCompra(),
      cliente: { nombre: compra.nombre.trim(), apellido: compra.apellido.trim(), tel: compra.tel.trim(), email: compra.email.trim() },
      entrega: compra.entrega, entregaTxt: ent.titulo || compra.entrega,
      direccion: conEnvio() ? direccionTxt() : "", punto: conEnvio() ? compra.punto : null,
      obs: conEnvio() ? compra.obs.trim() : "", pago,
      comprobanteSubido: false
    };

    const btn = $("#btnConfirmar"); btn.disabled = true;
    /* Lo que ve Mónica en el panel: quién compró, cómo lo recibe y cómo paga */
    const extra = {
      cliente: d.cliente,
      entrega: { tipo: d.entrega, direccion: d.direccion || "", punto: d.punto || null,
                 obs: d.obs || "", costo: typeof env === "number" ? env : null },
      pago: d.pago, comprobante: null, prueba: !!CFG_COMPRA.modoPrueba
    };
    if (SB){
      /* Primero la captura (si hay), así el pedido ya sale con el comprobante */
      if (pago === "transferencia" && compra.comprobante){
        try { extra.comprobante = await SB.subirComprobante(d.codigo, compra.comprobante.blob, compra.comprobante.tipo) || null;
              d.comprobanteSubido = !!extra.comprobante; }
        catch { avisar("No se pudo subir el comprobante: mandalo por WhatsApp."); }
      }
      /* Se manda qué y cuánto, nunca a qué precio. */
      try {
        await SB.crearPedido(d.codigo,
          d.items.map(x => ({ producto_id: x.id, variedad: x.variedad, cant: x.cant })),
          d.cupon || null, extra);
      } catch { avisar("No se pudo registrar el pedido: confirmalo por WhatsApp."); }
    } else {
      d.comprobanteSubido = pago === "transferencia" && !!compra.comprobante;
      await guardarPedido({
        id: d.codigo, fecha: new Date().toISOString(), estado: "pendiente",
        items: d.items.map(x => ({ nombre: x.nombre, variedad: x.variedad, cant: x.cant, precio: x.precio })),
        subtotal: d.subtotal, cupon: d.cupon, pct: cuponAplicado ? cuponAplicado.pct : 0,
        descuento: d.descuento, total: d.subtotal - d.descuento,
        ...extra
      }).catch(() => {});
    }
    btn.disabled = false;

    pedidoHecho = d;
    codigoActual = null;
    carrito = []; cuponAplicado = null;
    guardarCarrito(); pintarCarro();
    /* los datos del cliente se olvidan */
    if (compra.comprobante && compra.comprobante.vista) URL.revokeObjectURL(compra.comprobante.vista);
    compra = compraVacia(); paso = 1;
    /* los pasos ya no tienen sentido: se sacan del historial de una vez */
    const n = pila.filter(x => x === PASO_COMPRA).length;
    if (n){
      for (let i = pila.length - 1; i >= 0; i--) if (pila[i] === PASO_COMPRA) pila.splice(i, 1);
      saltarPop++;
      try { history.go(-n); } catch { saltarPop--; }
    }
    pintarListo();
    $("#shCompra .sheet__body").scrollTop = 0;
  }

  function pintarListo(){
    const d = pedidoHecho, r = CFG_COMPRA.retiro || {};
    $("#compraPie").hidden = true;
    $("#compraAtras").hidden = true;
    $("#compraTit").textContent = "Pedido #" + d.codigo;
    const fila = (a, b, clase) => '<div' + (clase ? ' class="' + clase + '"' : "") + "><span>" + a + "</span><span>" + b + "</span></div>";
    $("#compraCuerpo").innerHTML =
      '<div class="clisto">' +
        '<div class="clisto__ok">' + ico("i-tilde") + "</div>" +
        "<h3>¡Gracias, " + esc(d.cliente.nombre) + "!</h3>" +
        /* el segundo renglón toma el ancho del primero */
        '<div class="clisto__msj"><p>Tu pedido fue registrado con éxito.</p>' +
        "<p>Nos comunicaremos en breve para confirmar el estado de tu compra.</p></div>" +
      "</div>" +
      /* el mismo detalle que en el paso de pago */
      '<section class="cbloque cresumen clisto__det">' +
        "<h3>Tu pedido #" + esc(d.codigo) + "</h3>" +
        '<ul class="cres__items">' + d.items.map(x =>
          "<li><span>" + x.cant + " × " + esc(x.nombre) + (x.variedad ? " · " + esc(x.variedad) : "") + "</span><span>" +
          (x.precio > 0 ? plataTxt(x.precio * x.cant) : "A consultar") + "</span></li>").join("") + "</ul>" +
        '<div class="totales">' +
          fila("Subtotal", plataTxt(d.subtotal)) +
          (d.descuento ? fila("Cupón " + esc(d.cupon), "−" + plataTxt(d.descuento), "desc") : "") +
          fila("Envío", envioTxt(d.envio, d.entrega)) +
          fila("Total", plataTxt(d.total) + (d.envio === null ? " + envío" : ""), "total") +
        "</div>" +
      "</section>" +
      '<section class="clisto__datos">' +
        '<div class="clisto__info">' +
          '<div class="clisto__linea"><p class="clisto__rot">' + ico("i-chat") + "Pedido a nombre de</p><b>" +
            esc(d.cliente.nombre + " " + d.cliente.apellido) + "</b></div>" +
          '<div class="clisto__linea"><p class="clisto__rot">' + ico(d.entrega === "retiro" ? "i-local" : "i-envio") + "Envío</p><b>" +
            esc(d.entrega === "retiro" ? d.entregaTxt : d.direccion) + "</b></div>" +
          '<div class="clisto__linea"><p class="clisto__rot">' + ico(d.pago === "efectivo" ? "i-billete" : "i-banco") + "Método de pago</p><b>" +
            (d.pago === "efectivo" ? "Efectivo al retirar" : "Transferencia bancaria") + "</b></div>" +
        "</div>" +
      "</section>" +
      '<div class="clisto__acciones">' +
        '<p class="clisto__dudas">¿Dudas con tu compra?</p>' +
        '<a class="btn btn--ink clisto__wa" href="' + enlaceWaTexto(mensajeCompra(d)) + '" target="_blank" rel="noopener">' +
          ico("i-wa") + '<span class="terminar__txt">Escribinos</span></a>' +
        '<button type="button" class="clisto__volver">Volver a la tienda</button>' +
        marcaVersion() +
      "</div>";
  }

  /* ─── Eventos ──────────────────────────────────────────────────────── */
  $("#btnTerminar").addEventListener("click", () => {
    if (!lineas().length) return;
    pedidoHecho = null;
    paso = 1;
    $("#compraPie").hidden = false; $("#compraAtras").hidden = false;
    $("#compraTit").textContent = "Finalizar compra";
    pintarCompra();
    abrir("#shCompra");
    $("#shCompra .sheet__body").scrollTop = 0;
  });
  /* la flecha de arriba: paso anterior, o vuelve al carrito desde el primero */
  $("#compraAtras").addEventListener("click", () => {
    if (paso > 1 && pila[pila.length - 1] === PASO_COMPRA) history.back();
    else cerrar($("#shCompra"));
  });
  $("#btnConfirmar").addEventListener("click", avanzar);

  $("#compraCuerpo").addEventListener("input", e => {
    const k = e.target.dataset && e.target.dataset.k; if (!k) return;
    compra[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    marcarLleno(e.target);
    const c = e.target.closest(".cfield");
    if (c && c.classList.contains("mal")){ c.classList.remove("mal"); const er = c.querySelector(".cfield__err"); if (er) er.hidden = true; }
    if (k === "sinAltura" || k === "provincia") actualizarCompra();
    /* el mapa sigue lo que escribe: si había usado su ubicación, ahora manda la dirección escrita */
    if (["calle", "altura", "localidad", "sinAltura", "provincia", "piso", "cp"].includes(k)){
      if (compra.punto && k !== "piso"){ compra.punto = null; }
      programarMapa(800);
    }
    if (k === "transferido"){
      const l = e.target.closest(".ctransf__ya"); if (l) l.classList.toggle("ok", compra.transferido);
      const sube = $("#cSube");
      if (sube){ sube.hidden = !compra.transferido;
        if (compra.transferido) setTimeout(() => sube.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60); }
      const er = $('[data-err="transferido"]'); if (er && compra.transferido) er.hidden = true;
      pintarPie();
    }
  });
  $("#compraCuerpo").addEventListener("change", e => {
    if (e.target.id === "cComprobante"){ elegirComprobante(e.target.files && e.target.files[0]); return; }
    const k = e.target.dataset && e.target.dataset.k;
    if (k === "provincia" || k === "sinAltura") programarMapa(0);
  });
  /* "siguiente" o "listo" en el teclado, según si hay otro campo después */
  $("#compraCuerpo").addEventListener("focusin", e => {
    if (!e.target.matches(".cfield .input")) return;
    const vs = camposVisibles(), n = vs.indexOf(e.target);
    if (e.target.tagName === "INPUT") e.target.setAttribute("enterkeyhint", n >= 0 && n < vs.length - 1 ? "next" : "done");
  });
  $("#compraCuerpo").addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.matches("input:not([type=file]):not([type=checkbox])")){
      e.preventDefault();
      const vs = camposVisibles(), n = vs.indexOf(e.target);
      if (n >= 0 && n < vs.length - 1) vs[n + 1].focus(); else { e.target.blur(); avanzar(); }
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-irpaso]")){ e.preventDefault(); e.target.click(); }
  });
  $("#compraCuerpo").addEventListener("click", e => {
    const en = e.target.closest("[data-entrega]"), pa = e.target.closest("[data-pago]");
    if (en){
      compra.entrega = en.dataset.entrega;
      if (conEnvio()) compra.pago = "transferencia";
      /* un punto que quedó fuera de Federal no sirve para el envío en Federal */
      if (compra.entrega === "federal" && compra.punto && kmEntre(compra.punto, CENTRO_FEDERAL) > RADIO_FEDERAL_KM) compra.punto = null;
      estadoMapa("");
      const er = $('[data-err="entrega"]'); if (er) er.hidden = true;
      actualizarCompra(); return;
    }
    if (pa){
      compra.pago = pa.dataset.pago;
      const er = $('[data-err="pago"]'); if (er) er.hidden = true;
      const caja = $("#cTransfCaja");
      if (caja){
        caja.hidden = compra.pago !== "transferencia";
        if (!caja.hidden && !caja.firstChild) caja.innerHTML = htmlTransferencia();
      }
      actualizarCompra(); return;
    }
    const ir = e.target.closest("[data-irpaso]");
    if (ir){
      /* un solo popstate llega: se sacan antes las entradas de más y el
         handler hace el último paso atrás */
      const atras = paso - Number(ir.dataset.irpaso);
      if (atras > 0){ for (let i = 0; i < atras - 1; i++){ pila.pop(); }
        paso = Number(ir.dataset.irpaso) + 1; try { history.go(-atras); } catch {} }
      return;
    }
    if (e.target.closest("[data-quitarcomp]")){
      if (compra.comprobante && compra.comprobante.vista) URL.revokeObjectURL(compra.comprobante.vista);
      compra.comprobante = null; refrescarTransferencia(); return;
    }
    if (e.target.closest("#cMiUbicacion")){ miUbicacion(); return; }
    if (e.target.closest("[data-aotra]")){
      compra.entrega = "otra"; estadoMapa("");
      actualizarCompra(); miUbicacion(); return;
    }
    if (e.target.closest(".clisto__volver")){ cerrarTodas(); return; }
    const cp = e.target.closest("[data-copiar]");
    if (cp){
      const v = cp.dataset.copiar;
      const marcar = () => {
        const t = cp.querySelector("span");
        cp.classList.add("copiado"); if (t){ t.dataset.antes = t.dataset.antes || t.textContent; t.textContent = "Copiado"; }
        clearTimeout(cp._t);
        cp._t = setTimeout(() => { cp.classList.remove("copiado"); if (t) t.textContent = t.dataset.antes; }, 1800);
      };
      /* Plan B para navegadores sin portapapeles moderno (Instagram, http) */
      const aMano = () => {
        const ta = document.createElement("textarea");
        ta.value = v; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch {}
        ta.remove();
      };
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject())
        .catch(aMano).then(marcar);
    }
  });
  /* Con el pedido ya hecho, la X cierra todo (el carrito de atrás quedó vacío) */
  $("#shCompra .sheet__head [data-close]").addEventListener("click", e => {
    if (!pedidoHecho) return;
    e.stopImmediatePropagation(); cerrarTodas();
  });

  /* ─── Envíos y datos para transferir: los define el admin ─────────────
     Se guardan en config ("envios"), que cualquiera puede leer. */
  const LS_ENVIOS = PFX + "envios";
  const numONulo = v => { const t = String(v == null ? "" : v).replace(/[^\d]/g, ""); return t === "" ? null : Math.min(99999999, Number(t)); };
  function aplicarEnvios(v){
    if (!v || typeof v !== "object") return;
    const fed = CFG_COMPRA.federal = CFG_COMPRA.federal || {};
    const otra = CFG_COMPRA.otra = CFG_COMPRA.otra || {};
    const tr = CFG_COMPRA.transferencia = CFG_COMPRA.transferencia || {};
    if ("federalCosto" in v) fed.costo = numONulo(v.federalCosto);
    if ("gratisDesde" in v) fed.gratisDesde = numONulo(v.gratisDesde) || 0;
    if ("otraCosto" in v) otra.costo = numONulo(v.otraCosto);
    ["alias", "cbu", "titular", "banco"].forEach(k => { if (typeof v[k] === "string") tr[k] = v[k].trim().slice(0, 60); });
  }
  function enviosActuales(){
    const fed = CFG_COMPRA.federal || {}, otra = CFG_COMPRA.otra || {}, tr = CFG_COMPRA.transferencia || {};
    return { federalCosto: fed.costo, gratisDesde: fed.gratisDesde || null, otraCosto: otra.costo,
      alias: tr.alias || "", cbu: tr.cbu || "", titular: tr.titular || "", banco: tr.banco || "" };
  }
  try { if (modo !== "sb") aplicarEnvios(JSON.parse(localStorage.getItem(LS_ENVIOS))); } catch {}

  function pintarEnviosAdmin(){
    const v = enviosActuales();
    const f = $("#formEnvios"), b = $("#formBanco");
    if (f){
      f.federalCosto.value = v.federalCosto == null ? "" : v.federalCosto;
      f.gratisDesde.value = v.gratisDesde || "";
      f.otraCosto.value = v.otraCosto == null ? "" : v.otraCosto;
    }
    if (b){ b.alias.value = v.alias; b.cbu.value = v.cbu; b.titular.value = v.titular; b.banco.value = v.banco; }
  }
  /* Envíos y datos bancarios se editan por separado, pero se guardan juntos
     en la misma fila de config */
  async function guardarEnviosYBanco(cambios, aviso){
    const v = { ...enviosActuales(), ...cambios };
    try {
      if (modo === "sb") await SB.guardarConfig("envios", v);
      else localStorage.setItem(LS_ENVIOS, JSON.stringify(v));
      aplicarEnvios(v); pintarEnviosAdmin();
      avisar(aviso);
    } catch { avisar("No se pudo guardar. Probá de nuevo."); }
  }
  const formEnv = $("#formEnvios");
  if (formEnv) formEnv.addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    guardarEnviosYBanco({ federalCosto: numONulo(f.federalCosto.value), gratisDesde: numONulo(f.gratisDesde.value),
      otraCosto: numONulo(f.otraCosto.value) }, "Envíos guardados.");
  });
  const formBco = $("#formBanco");
  if (formBco) formBco.addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    const cbu = f.cbu.value.replace(/\s/g, "");
    if (cbu && !/^\d{22}$/.test(cbu)){ avisar("El CBU/CVU tiene que tener 22 números."); return; }
    guardarEnviosYBanco({ alias: f.alias.value.trim(), cbu, titular: f.titular.value.trim(), banco: f.banco.value.trim() },
      "Datos bancarios guardados.");
  });

  /* ─── Envío en el carrito: se elige antes y se ve el costo ─────────── */
  function htmlEnvioCarro(){
    try {
      const f = CFG_COMPRA.federal || {}, o = CFG_COMPRA.otra || {}, r = CFG_COMPRA.retiro || {};
      const p = c => c == null ? "a confirmar" : c === 0 ? "gratis" : plataTxt(c);
      const fed = f.costo == null ? "a confirmar" : (f.gratisDesde > 0 && subtotal() - descuento() >= f.gratisDesde) ? "gratis" : p(f.costo);
      /* tres opciones simples, cada una con su costo a la vista */
      const op = (v, t, costo) => '<button type="button" class="centr' + (compra.entrega === v ? " on" : "") +
        '" role="radio" aria-checked="' + (compra.entrega === v) + '" data-centrega="' + v + '">' +
        '<i class="centr__radio" aria-hidden="true"></i><span class="centr__nom">' + t + "</span>" +
        '<span class="centr__costo">' + costo + "</span></button>";
      const may = t => t.charAt(0).toUpperCase() + t.slice(1);
      return '<div class="carro__envio"><span id="carroEntTit">Envío</span>' +
        '<div class="centrs" role="radiogroup" aria-labelledby="carroEntTit">' +
          op("retiro", r.titulo || "Retiro en el local", "Gratis") +
          op("federal", "Envío en Federal", may(fed)) +
          op("otra", "Envío a otra localidad", may(p(o.costo))) +
        "</div></div>";
    } catch { return ""; }
  }
  function filasEnvioCarro(sub, desc){
    try {
      if (!compra.entrega) return { filas: "", total: sub - desc };
      const env = costoEnvio(), f = CFG_COMPRA.federal || {};
      const falta = compra.entrega === "federal" && f.gratisDesde > 0 && env > 0 ? f.gratisDesde - (sub - desc) : 0;
      return {
        filas: "<div><span>Envío</span><span>" + envioTxt(env) + "</span></div>" +
          (falta > 0 ? '<p class="cres__falta">Te faltan <b>' + plataTxt(falta) + "</b> para el envío gratis.</p>" : ""),
        total: sub - desc + (typeof env === "number" ? env : 0),
        aConfirmar: env === null
      };
    } catch { return { filas: "", total: sub - desc }; }
  }
  $("#carroCuerpo").addEventListener("click", e => {
    const b = e.target.closest("[data-centrega]"); if (!b) return;
    compra.entrega = b.dataset.centrega;
    if (compra.entrega !== "retiro") compra.pago = "transferencia";
    pintarCarro();
  });
