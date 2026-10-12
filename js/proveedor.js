/* =====================================================
   PEDIDOS AL PROVEEDOR
   Módulo independiente del formulario de clientes. Guarda solo productos, cantidades,
   fechas y observaciones: NUNCA nombres, teléfonos ni direcciones de tus clientes.
   Los datos viven en este navegador (localStorage) y no se publican en la web.
   Usa del resto del proyecto: P (catálogo), order (Mi pedido), esc, img0, num y AdminUI.
   ===================================================== */
const Provider = (() => {
  const KEY = 'catalogo_proveedor_v1';
  const ESTADOS = [['pendiente', 'Pendiente de envío'], ['enviado_prov', 'Enviado al proveedor'], ['preparacion', 'En preparación'],
                   ['preparado', 'Preparado'], ['enviado', 'Enviado'], ['recibido', 'Recibido']];
  const EN_CURSO = ['enviado_prov', 'preparacion', 'preparado', 'enviado'];
  const root = $('#prov');
  let data = { orders: [], phone: '' };
  let view = 'list', cur = null, isNew = false, changed = false, filter = 'todos';
  let setOpen = false, pickOpen = false, pasteOpen = false, pickQ = '', pvTimer = 0;

  /* ---------- utilidades ---------- */
  const txt = (v, n) => String(v ?? '').trim().slice(0, n);
  const int = v => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;
  const digits = s => String(s ?? '').replace(/\D/g, '');
  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dmy = s => isDate(s) ? s.split('-').reverse().join('/') : '';
  const estadoTxt = k => (ESTADOS.find(e => e[0] === k) || ESTADOS[0])[1];
  const unidades = n => n + (n === 1 ? ' unidad' : ' unidades');
  const iso = () => new Date().toISOString();
  const norm2 = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const toast = (m, t) => window.AdminUI && AdminUI.toast(m, t);
  const confirmBox = (title, text, ok, fn, danger = true) => AdminUI.ask(title, text, ok, fn, danger, root);   // se dibuja encima de esta pantalla

  /* ---------- datos ---------- */
  function normOrder(o) {
    if (!o || typeof o !== 'object') return null;
    const items = (Array.isArray(o.items) ? o.items : []).map(i => ({
      pid: i && i.pid !== null && i.pid !== '' && Number.isFinite(+i.pid) ? +i.pid : null,
      nombre: txt(i && i.nombre, 160), sku: txt(i && i.sku, 40), variante: txt(i && i.variante, 100),
      cant: int(i && i.cant), detalles: txt(i && i.detalles, 200) })).filter(i => i.nombre);
    return { id: Number.isFinite(+o.id) && +o.id ? +o.id : Date.now(), ref: txt(o.ref, 30) || 'PV', fecha: isDate(o.fecha) ? o.fecha : todayStr(),
      entrega: isDate(o.entrega) ? o.entrega : '', estado: ESTADOS.some(e => e[0] === o.estado) ? o.estado : 'pendiente',
      obs: txt(o.obs, 1500), items, agrupa: int(o.agrupa), creado: o.creado || iso(), modificado: o.modificado || iso(), enviadoEl: o.enviadoEl || '' };
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && Array.isArray(d.orders)) data = { orders: d.orders.map(normOrder).filter(Boolean), phone: digits(d.phone) };
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { toast('No se pudo guardar en este navegador.', 'err'); return false; }
  }
  const nextRef = () => 'PV-' + String(data.orders.reduce((m, o) => { const x = /^PV-(\d+)$/i.exec(o.ref); return x ? Math.max(m, +x[1]) : m; }, 0) + 1).padStart(3, '0');
  const newOrder = () => ({ id: Date.now(), ref: nextRef(), fecha: todayStr(), entrega: '', estado: 'pendiente', obs: '', items: [], agrupa: 0, creado: iso(), modificado: iso(), enviadoEl: '' });
  const totalUnits = o => o.items.reduce((s, i) => s + i.cant, 0);
  const prodOf = it => it.pid !== null ? P.find(p => p.id === it.pid) : null;

  /* ---------- mensaje de WhatsApp para el proveedor ---------- */
  function buildMessage(o) {
    const items = o.items.map((it, k) => [`${k + 1}. Producto: ${it.nombre}`,
      it.sku ? `   - Código: ${it.sku}` : '', it.variante ? `   - Variante: ${it.variante}` : '',
      `   - Cantidad: ${unidades(it.cant)}`, it.detalles ? `   - Detalles: ${it.detalles}` : ''].filter(Boolean).join('\n')).join('\n\n');
    return ['*PEDIDO PARA PROVEEDOR*', '', `Fecha: ${dmy(o.fecha)}`, `Referencia: ${o.ref}`, '',
      'Hola, quiero solicitar los siguientes productos:', '', items, '', `*Total de artículos: ${unidades(totalUnits(o))}.*`, '',
      o.entrega ? `Fecha estimada de entrega: ${dmy(o.entrega)}` : '', o.obs ? `Observaciones: ${o.obs}` : '', '',
      'Por favor, confirmame la disponibilidad y el tiempo estimado de preparación. Gracias.'
    ].join('\n').replace(/\n{3,}/g, '\n\n');
  }
  // Número del proveedor configurado aquí (no es el de tus clientes). Sin número, WhatsApp deja elegir el contacto.
  const waUrl = text => 'https://wa.me/' + (data.phone || '') + '?text=' + encodeURIComponent(text);
  function openWhatsApp(o) {
    const w = window.open(waUrl(buildMessage(o)), '_blank');
    if (!w) location.href = waUrl(buildMessage(o));
    if (o.estado === 'pendiente') o.estado = 'enviado_prov';   // acción explícita del usuario; no toca ningún pedido de cliente
    o.enviadoEl = iso(); o.modificado = iso();
  }

  /* ---------- importar pedidos de clientes (solo productos y cantidades) ---------- */
  function matchProduct(name) {
    const n = norm2(name); if (!n) return null;
    let hit = P.find(p => norm2(p.n) === n); if (hit) return hit;
    if (n.length >= 6) { hit = P.find(p => { const q = norm2(p.n); return q.includes(n) || n.includes(q); }); if (hit) return hit; }
    const ta = new Set(n.split(' ')); let best = null, score = 0;
    P.forEach(p => { const tb = norm2(p.n).split(' '), s = tb.filter(t => ta.has(t)).length / Math.max(ta.size, tb.length); if (s > score) { score = s; best = p; } });
    return score >= 0.7 ? best : null;
  }
  // Lee el formato de los pedidos de clientes y descarta nombre, teléfono, ciudad, dirección, precios y observaciones
  function parseClientOrders(text) {
    const blocks = String(text).split(/NUEVO PEDIDO/i).slice(1), parts = blocks.length ? blocks : [String(text)], found = [];
    parts.forEach(part => {
      let sec = part; const a = part.search(/Productos solicitados/i); if (a >= 0) sec = part.slice(a);
      const b = sec.search(/RESUMEN|━━/); if (b >= 0) sec = sec.slice(0, b);
      let name = null;
      sec.split(/\r?\n/).forEach(l => {
        const m = /^\s*\d+\s*[.)]\s+(.+?)\s*$/.exec(l);
        if (m) { name = m[1].replace(/\*/g, '').trim(); return; }
        const q = /Cantidad\s*:\s*([\d.]+)/i.exec(l);
        if (q && name) { found.push({ name, qty: int(q[1]) }); name = null; }
      });
    });
    return { found, orders: blocks.length || (found.length ? 1 : 0) };
  }
  function addLine(pid, nombre, qty, sku = '') {
    const ex = cur.items.find(i => (pid !== null ? i.pid === pid : i.pid === null && norm2(i.nombre) === norm2(nombre)) && !i.variante && !i.detalles);
    if (ex) ex.cant += qty; else cur.items.push({ pid, nombre, sku, variante: '', cant: qty, detalles: '' });
  }
  function importPasted(text) {
    const { found, orders } = parseClientOrders(text);
    if (!found.length) return { ok: false };
    let unmatched = 0, units = 0;
    found.forEach(f => {
      if (f.qty < 1) return;
      const p = matchProduct(f.name); units += f.qty;
      if (p) addLine(p.id, p.n, f.qty, p.sku || ''); else { unmatched++; addLine(null, f.name, f.qty); }
    });
    cur.agrupa = (cur.agrupa || 0) + orders; changed = true;
    return { ok: true, units, orders, unmatched };
  }

  /* ---------- pantalla: lista ---------- */
  const badge = k => `<span class="pv-st st-${k}">${esc(estadoTxt(k))}</span>`;
  function filtered() {
    const list = data.orders.slice().sort((a, b) => b.id - a.id);
    return list.filter(o => filter === 'todos' || (filter === 'curso' ? EN_CURSO.includes(o.estado) : o.estado === filter));
  }
  function cardHTML(o) {
    const names = o.items.slice(0, 3).map(i => esc(i.nombre)).join(' · ') + (o.items.length > 3 ? ` · +${o.items.length - 3} más` : '');
    return `<div class="pv-card">
      <div class="pv-head"><div><strong>${esc(o.ref)}</strong> <small>${dmy(o.fecha)}</small></div>${badge(o.estado)}</div>
      <div class="pv-sum">${o.items.length} producto${o.items.length === 1 ? '' : 's'} · ${unidades(totalUnits(o))}${o.agrupa ? ` · agrupa ${o.agrupa} pedido${o.agrupa === 1 ? '' : 's'}` : ''}${o.entrega ? ` · entrega estimada ${dmy(o.entrega)}` : ''}</div>
      <div class="pv-names">${names}</div>
      <div class="pv-row"><select data-act="estado" data-id="${o.id}" aria-label="Estado del pedido">${ESTADOS.map(e => `<option value="${e[0]}" ${e[0] === o.estado ? 'selected' : ''}>${e[1]}</option>`).join('')}</select></div>
      <div class="adm-btns">
        <button type="button" class="ghost-btn" data-act="edit" data-id="${o.id}">Editar</button>
        <button type="button" class="ghost-btn" data-act="resend" data-id="${o.id}">Enviar por WhatsApp</button>
        <button type="button" class="ghost-btn" data-act="dup" data-id="${o.id}">Duplicar</button>
        <button type="button" class="ghost-btn danger" data-act="del" data-id="${o.id}">Eliminar</button>
      </div></div>`;
  }
  function renderList() {
    view = 'list'; cur = null; root.scrollTop = 0;
    const cnt = k => k === 'todos' ? data.orders.length : k === 'curso' ? data.orders.filter(o => EN_CURSO.includes(o.estado)).length : data.orders.filter(o => o.estado === k).length;
    const chip = (k, l) => `<button type="button" class="pv-chip${filter === k ? ' on' : ''}" data-act="filter" data-k="${k}">${l} (${cnt(k)})</button>`;
    const list = filtered();
    root.innerHTML = `<div class="adm-sheet">
      <div class="adm-head"><div class="pv-title"><button type="button" class="adm-x" data-act="back" aria-label="Volver al administrador">←</button><strong>Pedidos al proveedor</strong></div>
        <button type="button" class="adm-x" data-act="closeAll" aria-label="Cerrar">✕</button></div>
      <div class="adm-body">
        <div class="adm-info">Acá preparás lo que le pedís a tu proveedor. Guarda <b>solo productos, cantidades y fechas</b>: nunca datos de tus clientes.
          Se guarda en este navegador y <b>no se publica en la web</b>. Exportá una copia de vez en cuando.</div>
        <div class="adm-tools">
          <button type="button" class="send" data-act="new">+ NUEVA SOLICITUD AL PROVEEDOR</button>
          <button type="button" class="ghost-btn" data-act="settings">WhatsApp del proveedor</button>
          <button type="button" class="ghost-btn" data-act="exportJson">Exportar (JSON)</button>
          <button type="button" class="ghost-btn" data-act="exportCsv">Descargar para Excel</button>
          <button type="button" class="ghost-btn" data-act="importJson">Importar</button>
          <input type="file" id="pvImpFile" accept="application/json,.json" hidden>
        </div>
        <div id="pvSet" class="adm-pin" ${setOpen ? '' : 'hidden'}>
          <div class="field"><label for="pvPhone">Número de WhatsApp del proveedor</label>
            <input id="pvPhone" inputmode="tel" autocomplete="off" placeholder="Código de país + número, sin signos (ej. 595XXXXXXXXX)" value="${esc(data.phone)}"><small class="msg" id="pvPhoneMsg"></small></div>
          <div class="adm-btns"><button type="button" class="ghost-btn okbtn" data-act="phoneSave">Guardar número</button>${data.phone ? '<button type="button" class="ghost-btn danger" data-act="phoneClear">Quitar número</button>' : ''}</div>
          <p class="adm-note">${data.phone ? 'Los pedidos se abrirán directo en el chat con este número.' : 'Sin número configurado: al enviar, WhatsApp te deja elegir el contacto del proveedor.'} Este número es distinto al de tus clientes.</p>
        </div>
        <div class="pv-filters">${chip('todos', 'Todos')}${chip('pendiente', 'Pendientes')}${chip('curso', 'En curso')}${chip('recibido', 'Recibidos')}</div>
        <div>${list.length ? list.map(cardHTML).join('') : `<p class="cart-empty">${data.orders.length ? 'No hay pedidos en este filtro.' : 'Todavía no creaste solicitudes al proveedor.<br>Tocá «Nueva solicitud» para empezar.'}</p>`}</div>
      </div></div>`;
  }

  /* ---------- pantalla: formulario ---------- */
  const lineHTML = (it, k) => {
    const p = prodOf(it), manual = it.pid === null;
    return `<div class="pv-line" data-i="${k}">
      <div class="pv-top"><img src="${p ? img0(p) : PLACEHOLDER}" alt="">
        <div class="pv-name">${manual ? `<input data-f="nombre" value="${esc(it.nombre)}" maxlength="160" placeholder="Nombre del producto" aria-label="Nombre del producto">`
          : `<strong>${esc(it.nombre)}</strong>${it.sku ? `<small>Código: ${esc(it.sku)}</small>` : ''}`}</div>
        <button type="button" class="oi-del" data-act="ldel" data-i="${k}" aria-label="Quitar producto">${TRASH}</button></div>
      <div class="pv-fields">
        <div class="field"><label>Variante / modelo</label><input data-f="variante" value="${esc(it.variante)}" maxlength="100" placeholder="Ej. Talle M, color rojo"></div>
        <div class="fld"><span>Cantidad</span><div class="qty"><button type="button" data-act="lminus" data-i="${k}" aria-label="Menos">−</button><input data-f="cant" inputmode="numeric" pattern="[0-9]*" value="${it.cant || ''}" aria-label="Cantidad"><button type="button" data-act="lplus" data-i="${k}" aria-label="Más">+</button></div></div>
      </div>
      <div class="field"><label>Detalles o características (opcional)</label><input data-f="detalles" value="${esc(it.detalles)}" maxlength="200"></div>
      <small class="msg" data-lerr="${k}"></small></div>`;
  };
  function renderLines() {
    $('#pvLines').innerHTML = cur.items.length ? cur.items.map(lineHTML).join('') : '<p class="adm-note">Todavía no agregaste productos.</p>';
    refreshSummary();
  }
  function refreshSummary() {
    const s = $('#pvTotals'); if (s) s.textContent = `${cur.items.length} producto${cur.items.length === 1 ? '' : 's'} · ${unidades(totalUnits(cur))}`;
    const p = $('#pvPrev'); if (p) p.textContent = cur.items.length ? buildMessage(cur) : 'Agregá productos para ver el mensaje.';
  }
  function renderPicker() {
    const q = norm2(pickQ), list = P.filter(p => !q || norm2(p.n + ' ' + p.c + ' ' + (p.sku || '')).includes(q)).slice(0, 40);
    $('#pvPickList').innerHTML = list.map(p => `<div class="pv-pick"><img src="${img0(p)}" alt=""><div><strong>${esc(p.n)}</strong><small>${esc(p.c)}${p.st === 'oculto' ? ' · oculto' : ''}</small></div>
      <button type="button" class="ghost-btn" data-act="pickAdd" data-id="${p.id}">+ Agregar</button></div>`).join('') || '<p class="adm-note">No hay productos con esa búsqueda.</p>';
  }
  function renderForm(o, nuevo) {
    view = 'form'; cur = o; isNew = nuevo; changed = false; root.scrollTop = 0;
    root.innerHTML = `<div class="adm-sheet">
      <div class="adm-head"><div class="pv-title"><button type="button" class="adm-x" data-act="cancel" aria-label="Volver a la lista">←</button><strong>${nuevo ? 'Nueva solicitud' : 'Editar solicitud'}</strong></div>
        <button type="button" class="adm-x" data-act="cancel" aria-label="Cerrar">✕</button></div>
      <form class="adm-body adm-form" id="pvForm" novalidate autocomplete="off">
        <div class="adm-grid">
          <div class="field"><label for="pv-ref">Número o referencia</label><input id="pv-ref" data-h="ref" value="${esc(o.ref)}" maxlength="30"><small class="msg" data-hmsg="ref"></small></div>
          <div class="field"><label for="pv-fecha">Fecha del pedido</label><input id="pv-fecha" type="date" data-h="fecha" value="${esc(o.fecha)}"><small class="msg" data-hmsg="fecha"></small></div>
          <div class="field"><label for="pv-entrega">Fecha estimada de entrega (opcional)</label><input id="pv-entrega" type="date" data-h="entrega" value="${esc(o.entrega)}"><small class="msg" data-hmsg="entrega"></small></div>
          <div class="field"><label for="pv-estado">Estado del pedido</label><select id="pv-estado" data-h="estado">${ESTADOS.map(e => `<option value="${e[0]}" ${e[0] === o.estado ? 'selected' : ''}>${e[1]}</option>`).join('')}</select></div>
        </div>

        <h4 class="adm-h">Productos solicitados</h4>
        <div class="pv-add">
          <button type="button" class="ghost-btn okbtn" data-act="pickToggle">+ Agregar desde el catálogo</button>
          <button type="button" class="ghost-btn" data-act="manual">+ Producto manual</button>
          <button type="button" class="ghost-btn" data-act="fromCart">Traer de «Mi pedido»</button>
          <button type="button" class="ghost-btn" data-act="pasteToggle">Pegar pedidos de clientes</button>
        </div>
        <div id="pvPick" class="adm-pin" ${pickOpen ? '' : 'hidden'}>
          <input class="adm-search" id="pvPickQ" type="search" placeholder="Buscar en el catálogo" value="${esc(pickQ)}" aria-label="Buscar en el catálogo">
          <div class="pv-picklist" id="pvPickList"></div>
        </div>
        <div id="pvPaste" class="adm-pin" ${pasteOpen ? '' : 'hidden'}>
          <p class="adm-note"><b>Pegá el mensaje de WhatsApp</b> que te mandó cada cliente (podés pegar varios juntos). Solo se toman los <b>productos y las cantidades</b>; el nombre, teléfono, dirección y precios <b>no se copian ni se guardan</b>. Si repiten un producto, se suman las cantidades.</p>
          <textarea id="pvPasteTxt" rows="6" placeholder="Pegá acá el/los pedidos de tus clientes…"></textarea>
          <div class="adm-btns"><button type="button" class="ghost-btn okbtn" data-act="pasteGo">Tomar productos y cantidades</button><button type="button" class="ghost-btn" data-act="pasteToggle">Cancelar</button></div>
        </div>
        <div id="pvLines"></div>
        <div class="pv-totals" id="pvTotals"></div>

        <div class="field"><label for="pv-obs">Observaciones para el proveedor</label><textarea id="pv-obs" data-h="obs" rows="3" maxlength="1500" placeholder="Detalles especiales para tener en cuenta">${esc(o.obs)}</textarea></div>

        <h4 class="adm-h">Revisá el mensaje antes de enviarlo</h4>
        <p class="adm-note">${data.phone ? `Se enviará al número del proveedor configurado (+${esc(data.phone)}).` : 'No hay número del proveedor configurado: al enviar, WhatsApp te deja elegir el contacto. Podés configurarlo en «WhatsApp del proveedor».'}</p>
        <pre class="pv-prev" id="pvPrev"></pre>
        <button type="button" class="ghost-btn" data-act="copy">Copiar mensaje</button>

        <div class="adm-actions">
          <div class="form-msg" id="pvMsg" role="alert" hidden></div>
          <button type="button" class="ghost-btn" data-act="cancel">Cancelar</button>
          <button type="button" class="ghost-btn okbtn" data-act="saveDraft">Guardar</button>
          <button type="button" class="send" data-act="send">Enviar pedido al proveedor por WhatsApp</button>
        </div>
      </form></div>`;
    renderLines(); renderPicker();
  }

  /* ---------- validación y acciones ---------- */
  const showMsg = t => { const m = $('#pvMsg'); if (m) { m.textContent = t; m.hidden = !t; } };
  function validate() {
    $$('#pvForm .msg, #pvForm [data-lerr]').forEach(e => e.textContent = ''); $$('#pvForm .err').forEach(e => e.classList.remove('err')); showMsg('');
    const probs = [], hm = (k, t) => { const e = root.querySelector(`[data-hmsg="${k}"]`); if (e) { e.textContent = t; e.closest('.field').classList.add('err'); } probs.push(t); };
    let first = null; const flag = el => { if (el && !first) first = el; };
    if (!cur.items.length) probs.push('Agregá al menos un producto.');
    cur.items.forEach((it, k) => {
      const msgs = [], row = root.querySelector(`.pv-line[data-i="${k}"]`);
      if (!it.nombre.trim()) { msgs.push('Escribí el nombre del producto.'); flag(row.querySelector('[data-f="nombre"]')); }
      if (it.cant < 1) { msgs.push('La cantidad debe ser mayor a 0.'); flag(row.querySelector('[data-f="cant"]')); }
      if (msgs.length) { row.querySelector('[data-lerr]').textContent = msgs.join(' '); probs.push(`Producto ${k + 1}: ${msgs.join(' ')}`); }
    });
    if (!cur.ref.trim()) { hm('ref', 'Escribí una referencia.'); flag(root.querySelector('[data-h="ref"]')); }
    if (!isDate(cur.fecha)) { hm('fecha', 'Elegí la fecha del pedido.'); flag(root.querySelector('[data-h="fecha"]')); }
    if (cur.entrega && (!isDate(cur.entrega) || cur.entrega < cur.fecha)) { hm('entrega', 'La fecha estimada no puede ser anterior a la del pedido.'); flag(root.querySelector('[data-h="entrega"]')); }
    if (probs.length) {
      showMsg(probs.length === 1 ? probs[0] : 'Faltan datos: revisá los campos marcados en rojo.');
      const el = first || $('#pvLines'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (first) first.focus({ preventScroll: true });
      return false;
    }
    return true;
  }
  function commitOrder() {
    cur.modificado = iso();
    const i = data.orders.findIndex(o => o.id === cur.id); if (i >= 0) data.orders[i] = cur; else data.orders.push(cur);
    return save();
  }
  function saveDraft() { if (!validate() || !commitOrder()) return; toast('Solicitud guardada ✓'); renderList(); }
  function sendNow() {
    if (!validate()) return;
    openWhatsApp(cur);
    if (commitOrder()) { toast('Se abrió WhatsApp. El pedido quedó como «' + estadoTxt(cur.estado) + '».'); renderList(); }
  }
  function leaveForm() {
    if (changed) confirmBox('Descartar cambios', 'Hiciste cambios que no guardaste. ¿Querés descartarlos?', 'Sí, descartar', () => renderList());
    else renderList();
  }
  const orderById = id => data.orders.find(o => o.id === +id);
  function copyText(t) {
    const done = () => toast('Mensaje copiado ✓');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t, done)); else fallbackCopy(t, done);
  }
  function fallbackCopy(t, done) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('No se pudo copiar.', 'err'); } a.remove(); }

  /* ---------- copias de seguridad ---------- */
  const stamp = () => todayStr();
  const exportJson = () => AdminUI.download(new Blob([JSON.stringify({ app: 'pedidos-proveedor', version: 1, exportado: iso(), telefono: data.phone, pedidos: data.orders }, null, 1)], { type: 'application/json' }), `pedidos-proveedor-${stamp()}.json`);
  function exportCsv() {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', rows = [['Referencia', 'Fecha', 'Estado', 'Entrega estimada', 'Producto', 'Código', 'Variante', 'Cantidad', 'Detalles', 'Observaciones']];
    data.orders.slice().sort((a, b) => a.id - b.id).forEach(o => o.items.forEach(i => rows.push([o.ref, dmy(o.fecha), estadoTxt(o.estado), dmy(o.entrega), i.nombre, i.sku, i.variante, i.cant, i.detalles, o.obs])));
    AdminUI.download(new Blob(['\ufeff' + rows.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `pedidos-proveedor-${stamp()}.csv`);
  }
  function importJson(file) {
    const r = new FileReader();
    r.onload = () => {
      let d; try { d = JSON.parse(String(r.result)); } catch (e) { return toast('El archivo no es un JSON válido.', 'err'); }
      const list = (d && Array.isArray(d.pedidos) ? d.pedidos : Array.isArray(d) ? d : []).map(normOrder).filter(o => o && o.items.length);
      if (!list.length) return toast('No encontré pedidos válidos en el archivo.', 'err');
      confirmBox('Importar pedidos', `Se agregarán o actualizarán ${list.length} pedido(s) del archivo. No se borra nada de lo que ya tenés.`, 'Sí, importar', () => {
        list.forEach(o => { const i = data.orders.findIndex(x => x.id === o.id); if (i >= 0) data.orders[i] = o; else data.orders.push(o); });
        if (d && d.telefono && !data.phone) data.phone = digits(d.telefono);
        if (save()) { toast(`Pedidos importados: ${list.length} ✓`); renderList(); }
      }, false);
    };
    r.onerror = () => toast('No se pudo leer el archivo.', 'err'); r.readAsText(file);
  }

  /* ---------- eventos ---------- */
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = b.dataset.id, i = +b.dataset.i;
    if (a === 'back' || a === 'closeAll') close();
    if (a === 'new') { pickOpen = pasteOpen = false; renderForm(newOrder(), true); }
    if (a === 'edit') { pickOpen = pasteOpen = false; renderForm(JSON.parse(JSON.stringify(orderById(id))), false); }
    if (a === 'cancel') leaveForm();
    if (a === 'filter') { filter = b.dataset.k; renderList(); }
    if (a === 'settings') { setOpen = !setOpen; $('#pvSet').hidden = !setOpen; }
    if (a === 'phoneSave') {
      const v = digits($('#pvPhone').value), m = $('#pvPhoneMsg');
      if (v.length < 8 || v.length > 15) { m.textContent = 'Escribí el número con código de país (entre 8 y 15 números).'; return; }
      data.phone = v; if (save()) { setOpen = false; toast('Número del proveedor guardado ✓'); renderList(); }
    }
    if (a === 'phoneClear') confirmBox('Quitar número', '¿Quitar el número del proveedor? Al enviar, WhatsApp te dejará elegir el contacto.', 'Sí, quitar', () => { data.phone = ''; save(); setOpen = false; renderList(); });
    if (a === 'exportJson') exportJson();
    if (a === 'exportCsv') exportCsv();
    if (a === 'importJson') $('#pvImpFile').click();
    if (a === 'resend') {
      const o = orderById(id); if (!o.items.length) return;
      openWhatsApp(o); save(); toast('Se abrió WhatsApp.'); renderList();
    }
    if (a === 'dup') { const o = JSON.parse(JSON.stringify(orderById(id))); Object.assign(o, { id: Date.now(), ref: nextRef(), fecha: todayStr(), entrega: '', estado: 'pendiente', creado: iso(), modificado: iso(), enviadoEl: '' }); data.orders.push(o); save(); toast('Solicitud duplicada ✓'); renderList(); }
    if (a === 'del') { const o = orderById(id); confirmBox('Eliminar solicitud', `¿Eliminar la solicitud ${o.ref}? Esta acción no se puede deshacer.`, 'Sí, eliminar', () => { data.orders = data.orders.filter(x => x.id !== o.id); save(); toast('Solicitud eliminada'); renderList(); }); }
    // formulario
    if (a === 'pickToggle') { pickOpen = !pickOpen; pasteOpen = false; $('#pvPick').hidden = !pickOpen; $('#pvPaste').hidden = true; if (pickOpen) { renderPicker(); $('#pvPickQ').focus({ preventScroll: true }); } }
    if (a === 'pasteToggle') { pasteOpen = !pasteOpen; pickOpen = false; $('#pvPaste').hidden = !pasteOpen; $('#pvPick').hidden = true; if (pasteOpen) $('#pvPasteTxt').focus({ preventScroll: true }); }
    if (a === 'pickAdd') { const p = P.find(x => x.id === +id); if (p) { addLine(p.id, p.n, 1, p.sku || ''); changed = true; renderLines(); toast(`Agregado: ${p.n}`); } }
    if (a === 'manual') { cur.items.push({ pid: null, nombre: '', sku: '', variante: '', cant: 1, detalles: '' }); changed = true; renderLines(); const n = root.querySelectorAll('[data-f="nombre"]'); if (n.length) n[n.length - 1].focus(); }
    if (a === 'fromCart') {
      const items = (typeof order !== 'undefined' ? order : []).filter(o => P.some(p => p.id === o.id));
      if (!items.length) return toast('«Mi pedido» está vacío. Agregá productos desde el catálogo.', 'info');
      items.forEach(o => { const p = P.find(x => x.id === o.id); addLine(p.id, p.n, Math.max(1, o.qty), p.sku || ''); });   // solo producto y cantidad, sin datos del cliente
      changed = true; renderLines(); toast(`Se trajeron ${items.length} producto(s) de «Mi pedido» (sin datos del cliente).`);
    }
    if (a === 'pasteGo') {
      const r = importPasted($('#pvPasteTxt').value);
      if (!r.ok) return toast('No encontré productos en lo que pegaste. Tiene que ser el mensaje de WhatsApp del pedido.', 'err');
      $('#pvPasteTxt').value = ''; pasteOpen = false; $('#pvPaste').hidden = true; renderLines();
      toast(`Listo: ${unidades(r.units)} de ${r.orders} pedido${r.orders === 1 ? '' : 's'}.` + (r.unmatched ? ` ${r.unmatched} no estaba(n) en el catálogo: revisalo(s).` : ''), r.unmatched ? 'info' : 'ok');
    }
    if (a === 'ldel') { cur.items.splice(i, 1); changed = true; renderLines(); }
    if (a === 'lplus' || a === 'lminus') { const it = cur.items[i]; it.cant = Math.max(1, it.cant + (a === 'lplus' ? 1 : -1)); changed = true; renderLines(); }
    if (a === 'copy') { if (validate()) copyText(buildMessage(cur)); }
    if (a === 'saveDraft') saveDraft();
    if (a === 'send') sendNow();
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'pvPickQ') { pickQ = t.value; renderPicker(); return; }
    if (t.id === 'pvPhone') { t.value = digits(t.value); return; }
    if (view !== 'form' || !cur) return;
    const row = t.closest('.pv-line'), f = t.dataset.f, h = t.dataset.h;
    if (row && f) { const it = cur.items[+row.dataset.i]; if (f === 'cant') { t.value = digits(t.value); it.cant = int(t.value); } else it[f] = t.value; }
    else if (h) { cur[h] = t.value; }
    else return;
    changed = true; const fld = t.closest('.field'); if (fld) fld.classList.remove('err'); showMsg('');
    clearTimeout(pvTimer); pvTimer = setTimeout(refreshSummary, 120);
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act === 'estado') { const o = orderById(t.dataset.id); o.estado = t.value; o.modificado = iso(); save(); toast('Estado actualizado: ' + estadoTxt(o.estado)); renderList(); }
    if (t.id === 'pvImpFile' && t.files[0]) { importJson(t.files[0]); t.value = ''; }
    if (view === 'form' && t.dataset.h) { cur[t.dataset.h] = t.value; changed = true; refreshSummary(); }
  });
  root.addEventListener('submit', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || root.hidden || root.querySelector('.adm-ask')) return;
    if (view === 'form') leaveForm(); else close();
  });

  /* ---------- abrir / cerrar ---------- */
  function open() { load(); root.hidden = false; syncScroll(); renderList(); }
  function close() { root.hidden = true; syncScroll(); }
  load();
  return { open, close };
})();
