/* =====================================================
   ADMINISTRADOR DEL CATÁLOGO
   Todo ocurre en el navegador: sin servidor ni base de datos externa.
   Usa las funciones de app.js (cardHTML, renderAll...) y de store.js (Store).
   ===================================================== */
(() => {
  const MAX_IMGS = 6, PIN_KEY = 'catalogo_pin', SESSION_KEY = 'catalogo_admin_ok';
  const root = $('#admin');
  const DIRTY_KEY = 'catalogo_dirty', AUTO_KEY = 'catalogo_auto';
  let view = 'list', f = null, filterText = '', pinOpen = false, ghOpen = false, pvTimer = 0;
  let ghCfg = Store.ghGet(), pub = null, busy = false, again = false, pubTimer = 0;   // pub = aviso de publicación en curso o con error

  /* ---------- utilidades ---------- */
  const today = () => new Date().toISOString().slice(0, 10);
  const digits = s => String(s).replace(/\D/g, '');
  function toast(msg, type = 'ok') {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + type;
    clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 3600);
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function hashPin(s) {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('catalogo:' + s));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return 'x' + h.toString(16);
  }
  // Cuadro de confirmación dentro del diseño (sin alert del navegador)
  function ask(title, text, okLabel, onOk, danger = true) {
    const b = document.createElement('div'); b.className = 'adm-ask';
    b.innerHTML = `<div class="adm-ask-box" role="alertdialog"><strong>${esc(title)}</strong><p>${esc(text)}</p>
      <div class="adm-ask-btns">${onOk ? '<button type="button" class="ghost-btn" data-no>Cancelar</button>' : ''}
      <button type="button" class="ghost-btn ${danger ? 'danger fill' : 'okbtn'}" data-ok>${esc(okLabel)}</button></div></div>`;
    root.appendChild(b);
    b.querySelector('[data-ok]').onclick = async () => { b.remove(); if (onOk) await onOk(); };
    if (onOk) b.querySelector('[data-no]').onclick = () => b.remove();
  }

  /* ---------- guardar cambios ---------- */
  // La primera vez que se edita, se copia el catálogo actual al navegador (IndexedDB)
  async function ensureLocal() {
    if (!Store.hasLocal()) { await Store.putMany(P); Store.markLocal(true); catalogSource = 'local'; }
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  }
  async function commit(fn, okMsg) {
    try { await ensureLocal(); await fn(); sortCatalog(P); renderAll(); markDirty(); if (okMsg) toast(okMsg); return true; }
    catch (e) { console.error(e); toast('No se pudo guardar: ' + (e && e.message ? e.message : e), 'err'); return false; }
  }

  /* ---------- publicar para los clientes (GitHub) ---------- */
  const autoOn = () => localStorage.getItem(AUTO_KEY) !== '0';
  const isDirty = () => localStorage.getItem(DIRTY_KEY) === '1';
  function statusNow() {
    if (pub) return pub;
    if (!ghCfg) return { kind: 'warn', text: 'Por ahora los cambios solo los ves vos. Tocá «Conectar GitHub» (una sola vez) para que tus clientes los vean automáticamente.' };
    if (isDirty()) return { kind: 'warn', text: autoOn() ? 'Hay cambios sin publicar. Se publicarán solos en unos segundos.' : 'Hay cambios sin publicar. Tocá «Publicar ahora».' };
    return { kind: 'ok', text: '✓ Publicado: tus clientes ven este catálogo (los cambios nuevos pueden tardar 1 o 2 minutos en aparecer).' };
  }
  function refreshStatus() { const el = $('#pubStatus'); if (!el) return; const s = statusNow(); el.className = 'adm-status ' + s.kind; el.textContent = s.text; }
  function markDirty() { localStorage.setItem(DIRTY_KEY, '1'); pub = null; if (ghCfg && autoOn()) schedulePublish(); refreshStatus(); }
  const schedulePublish = () => { clearTimeout(pubTimer); pubTimer = setTimeout(() => publishNow(true), 1800); };
  async function publishNow(auto = false) {
    if (!ghCfg) {
      if (!auto) { ghOpen = true; if (view === 'list') { const b = $('#ghBox'); if (b) { b.hidden = false; b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } toast('Primero conectá GitHub (se hace una sola vez).', 'info'); }
      return;
    }
    if (busy) { again = true; return; }
    busy = true; clearTimeout(pubTimer);
    try {
      pub = { kind: 'info', text: 'Publicando…' }; refreshStatus();
      const r = await Store.ghPublish(ghCfg, P, text => { pub = { kind: 'info', text }; refreshStatus(); });
      localStorage.setItem(DIRTY_KEY, '0'); pub = null;
      toast(r.changed ? 'Publicado ✓ Tus clientes lo verán en 1 o 2 minutos.' : 'Ya estaba publicado ✓');
    } catch (e) {
      console.error(e); pub = { kind: 'err', text: 'No se pudo publicar: ' + e.message + ' Tocá «Publicar ahora» para reintentar.' }; toast('No se pudo publicar.', 'err');
    } finally { busy = false; refreshStatus(); if (again) { again = false; schedulePublish(); } }
  }
  async function ghSave() {
    const v = id => $('#' + id).value.trim(), m = $('#ghMsg');
    const cfg = { owner: v('ghOwner'), repo: v('ghRepo'), branch: v('ghBranch') || 'main', token: v('ghToken') || (ghCfg && ghCfg.token) || '' };
    if (!cfg.owner || !cfg.repo || !cfg.token) { m.textContent = 'Completá el usuario, el repositorio y el token.'; return; }
    m.textContent = 'Probando la conexión…';
    try { await Store.ghTest(cfg); } catch (e) { m.textContent = e.message; return; }
    ghCfg = cfg; Store.ghSet(cfg); ghOpen = false; pub = null; toast('GitHub conectado ✓ Publicando tu catálogo…'); renderList(); publishNow();
  }

  /* ---------- abrir / cerrar ---------- */
  function open() {
    root.hidden = false; syncScroll(); root.scrollTop = 0;
    if (localStorage.getItem(PIN_KEY) && sessionStorage.getItem(SESSION_KEY) !== '1') return renderLock();
    renderList();
  }
  function close() {
    root.hidden = true; syncScroll();
    if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search);
  }
  function renderLock() {
    view = 'lock';
    root.innerHTML = `<div class="adm-lock"><div class="adm-lock-box"><h3>Administrar catálogo</h3>
      <p class="adm-note">Ingresá tu PIN para continuar.</p>
      <div class="field"><input id="pinIn" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" aria-label="PIN"><small class="msg" id="pinMsg"></small></div>
      <button type="button" class="send" data-act="pinGo">Entrar</button>
      <button type="button" class="ghost-btn keep" data-act="close">Cancelar</button>
      <p class="adm-note">El PIN es solo una barrera visual para evitar cambios accidentales. Se guarda en este navegador y no es seguridad real de servidor.</p></div></div>`;
    setTimeout(() => { const i = $('#pinIn'); if (i) i.focus(); }, 50);
  }

  /* ---------- LISTA ---------- */
  function rowHTML(p) {
    const off = p.st === 'oculto';
    return `<div class="adm-row${off ? ' off' : ''}">
      <img src="${img0(p)}" alt="">
      <div class="adm-meta"><strong>${esc(p.n)}</strong>
        <small>${esc(p.c)} · ${gs(p.u)}${p.m !== p.u ? ' · mayor ' + gs(p.m) : ''}</small>${off ? '<em class="badge">Oculto</em>' : ''}</div>
      <div class="adm-btns">
        <button type="button" class="ghost-btn" data-act="edit" data-id="${p.id}">Editar</button>
        <button type="button" class="ghost-btn" data-act="toggle" data-id="${p.id}">${off ? 'Mostrar' : 'Ocultar'}</button>
        <button type="button" class="ghost-btn danger" data-act="del" data-id="${p.id}">Eliminar</button>
      </div></div>`;
  }
  function renderRows() {
    const q = filterText.trim().toLowerCase();
    const rows = P.filter(p => (p.n + ' ' + p.c + ' ' + p.sku).toLowerCase().includes(q)).map(rowHTML).join('');
    $('#admList').innerHTML = rows || '<p class="cart-empty">No hay productos para mostrar.</p>';
    const act = P.filter(p => p.st !== 'oculto').length;
    $('#admCount').firstChild.textContent = `${P.length} productos · ${act} activos · ${P.length - act} ocultos`;
  }
  function renderList() {
    view = 'list'; f = null; root.scrollTop = 0;
    root.innerHTML = `<div class="adm-sheet">
      <div class="adm-head"><strong>Administrar catálogo</strong><button type="button" class="adm-x" data-act="close" aria-label="Cerrar">✕</button></div>
      <div class="adm-body">
        <div class="adm-info"><b>Tus cambios se guardan en este navegador.</b> Conectá GitHub una vez y cada producto que guardes se
        publica solo para tus clientes. Hacé una <b>copia de seguridad</b> de vez en cuando.</div>
        <div class="adm-status" id="pubStatus"></div>
        <div class="adm-tools">
          <button type="button" class="send" data-act="new">+ NUEVO PRODUCTO</button>
          <button type="button" class="ghost-btn okbtn" data-act="publishNow">Publicar ahora</button>
          <button type="button" class="ghost-btn" data-act="gh">${ghCfg ? 'GitHub ✓' : 'Conectar GitHub'}</button>
          <button type="button" class="ghost-btn" data-act="export">Exportar catálogo</button>
          <button type="button" class="ghost-btn" data-act="import">Importar catálogo</button>
          <button type="button" class="ghost-btn" data-act="zip">Descargar paquete (.zip)</button>
          <button type="button" class="ghost-btn" data-act="pin">PIN</button>
          <button type="button" class="ghost-btn danger" data-act="reset">Volver a lo publicado</button>
          <input type="file" id="impFile" accept="application/json,.json" hidden>
        </div>
        <div id="ghBox" class="adm-pin" ${ghOpen ? '' : 'hidden'}>
          <strong>Publicar automáticamente con GitHub</strong>
          <p class="adm-note">Se hace una sola vez. Después, cada producto que guardes se publica solo y tus clientes lo ven en 1 o 2 minutos.</p>
          <ol class="adm-steps">
            <li>Abrí <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a> (entrá a tu cuenta si te lo pide).</li>
            <li>Nombre: «Catalogo». Elegí el vencimiento que quieras.</li>
            <li>En <b>Repository access</b> elegí <b>Only select repositories</b> y marcá tu repositorio.</li>
            <li>En <b>Permissions → Repository permissions</b> poné <b>Contents: Read and write</b>.</li>
            <li>Tocá <b>Generate token</b>, copiá el código (empieza con <code>github_pat_</code>) y pegalo abajo.</li>
          </ol>
          <div class="adm-grid">
            <div class="field"><label for="ghOwner">Usuario de GitHub</label><input id="ghOwner" value="${esc((ghCfg && ghCfg.owner) || Store.ghGuess().owner || GITHUB_OWNER)}" autocomplete="off"></div>
            <div class="field"><label for="ghRepo">Repositorio</label><input id="ghRepo" value="${esc((ghCfg && ghCfg.repo) || Store.ghGuess().repo || GITHUB_REPO)}" autocomplete="off"></div>
            <div class="field"><label for="ghBranch">Rama</label><input id="ghBranch" value="${esc((ghCfg && ghCfg.branch) || GITHUB_BRANCH)}" autocomplete="off"></div>
            <div class="field"><label for="ghToken">Token ${ghCfg ? '(ya guardado; dejalo vacío para conservarlo)' : ''}</label><input id="ghToken" type="password" autocomplete="off" placeholder="github_pat_…"></div>
          </div>
          <small class="msg" id="ghMsg"></small>
          <label class="adm-check"><input type="checkbox" id="ghAuto" ${autoOn() ? 'checked' : ''}> Publicar automáticamente al guardar</label>
          <div class="adm-btns"><button type="button" class="ghost-btn okbtn" data-act="ghSave">Guardar y probar conexión</button>
            ${ghCfg ? '<button type="button" class="ghost-btn danger" data-act="ghOff">Desconectar</button>' : ''}</div>
          <p class="adm-note">El token se guarda solo en este navegador y solo permite modificar este repositorio. No lo uses en computadoras compartidas; si lo perdés, borralo desde la misma página de GitHub.</p>
        </div>
        <div id="pinBox" class="adm-pin" ${pinOpen ? '' : 'hidden'}>
          <div class="field"><label for="pinNew">${localStorage.getItem(PIN_KEY) ? 'Cambiar PIN' : 'Crear un PIN'} (4 a 8 números)</label>
            <input id="pinNew" type="password" inputmode="numeric" autocomplete="off" maxlength="8"><small class="msg" id="pinNewMsg"></small></div>
          <div class="adm-btns"><button type="button" class="ghost-btn" data-act="pinSave">Guardar PIN</button>
            ${localStorage.getItem(PIN_KEY) ? '<button type="button" class="ghost-btn danger" data-act="pinRemove">Quitar PIN</button>' : ''}</div>
          <p class="adm-note">Es solo una barrera visual en este navegador, no seguridad real de servidor.</p>
        </div>
        <div class="adm-count" id="admCount">x<span id="usage"></span></div>
        <input class="adm-search" id="admQ" type="search" placeholder="Buscar en la lista" value="${esc(filterText)}" aria-label="Buscar producto">
        <div class="adm-list" id="admList"></div>
      </div></div>`;
    renderRows(); updateUsage(); refreshStatus();
  }
  async function updateUsage() {
    try { const e = await navigator.storage.estimate(), el = $('#usage'); if (el && e.usage) el.textContent = ` · Espacio usado: ${(e.usage / 1048576).toFixed(1)} MB`; } catch (e) {}
  }

  /* ---------- FORMULARIO ---------- */
  const FEAT_KEYS = ['Material', 'Color', 'Tamaño', 'Marca', 'Modelo', 'Voltaje', 'Capacidad', 'Peso', 'Garantía'];
  function renderForm(p) {
    view = 'form'; root.scrollTop = 0;
    f = { id: p ? p.id : null, imgs: p ? p.imgs.slice() : [], feats: p && p.f.length ? p.f.map(x => ({ ...x })) : [{ k: '', v: '' }] };
    const v = p || { n: '', u: '', m: '', q: 3, c: '', t: '', nt: '', sku: '', ds: '', dl: '', st: 'activo' };
    const cats = [...new Set(P.map(x => x.c))];
    const fld = (name, label, extra = '', val = v[name]) => `<div class="field"><label for="a-${name}">${label}</label>
      <input id="a-${name}" name="${name}" value="${esc(val)}" ${extra}><small class="msg" data-msg="${name}"></small></div>`;
    root.innerHTML = `<div class="adm-sheet">
      <div class="adm-head"><strong>${p ? 'Editar producto' : 'Nuevo producto'}</strong><button type="button" class="adm-x" data-act="cancel" aria-label="Volver a la lista">✕</button></div>
      <form class="adm-body adm-form" id="pf" novalidate autocomplete="off">
        ${fld('n', 'Nombre del producto *', 'maxlength="140" enterkeyhint="next"')}
        <div class="adm-grid">
          ${fld('u', 'Precio unitario (₲) *', 'inputmode="numeric" placeholder="0"', v.u ? fmt(v.u) : '')}
          ${fld('m', 'Precio por mayor (₲)', 'inputmode="numeric" placeholder="Igual al unitario"', v.m ? fmt(v.m) : '')}
          ${fld('q', 'Cantidad mínima para precio por mayor', 'inputmode="numeric"')}
          ${fld('c', 'Categoría *', 'list="catList" maxlength="60" placeholder="Ej. Hogar"')}
        </div>
        <datalist id="catList">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
        <div class="adm-grid">
          ${fld('sku', 'Código / SKU (opcional)', 'maxlength="40"')}
          <div class="field"><label for="a-st">Estado</label><select id="a-st" name="st">
            <option value="activo" ${v.st !== 'oculto' ? 'selected' : ''}>Activo (visible en el catálogo)</option>
            <option value="oculto" ${v.st === 'oculto' ? 'selected' : ''}>Oculto</option></select></div>
          <div class="field"><label for="a-t">Etiqueta</label><select id="a-t" name="t">
            ${['', 'Nuevo', 'Reposición'].map(o => `<option value="${o}" ${v.t === o ? 'selected' : ''}>${o || 'Ninguna'}</option>`).join('')}</select></div>
          ${fld('nt', 'Nota corta (opcional)', 'maxlength="120" placeholder="Ej. Caja cerrada de 12 pcs"')}
        </div>
        ${fld('ds', 'Descripción corta', 'maxlength="160" placeholder="Se muestra en la tarjeta"')}
        <div class="field"><label for="a-dl">Descripción completa</label><textarea id="a-dl" name="dl" rows="4" maxlength="3000" placeholder="Se muestra en el detalle del producto">${esc(v.dl)}</textarea></div>

        <h4 class="adm-h">Características</h4>
        <datalist id="featKeys">${FEAT_KEYS.map(k => `<option value="${k}">`).join('')}</datalist>
        <div id="featRows"></div>
        <button type="button" class="ghost-btn" data-act="addfeat">+ Agregar característica</button>

        <h4 class="adm-h">Imágenes</h4>
        <p class="adm-note">JPG, PNG o WEBP. Se reducen automáticamente. La primera es la principal (máx. ${MAX_IMGS}).</p>
        <button type="button" class="ghost-btn" data-act="pick">+ Subir imágenes</button>
        <input type="file" id="imgFile" accept="image/jpeg,image/png,image/webp" multiple hidden>
        <small class="msg" id="imgMsg"></small>
        <div class="adm-img-grid" id="imgGrid"></div>

        <h4 class="adm-h">Vista previa</h4>
        <div class="adm-pv" id="pv"></div>

        <div class="adm-actions">
          <div class="form-msg" id="saveMsg" role="alert" hidden></div>
          <button type="button" class="ghost-btn" data-act="cancel">Cancelar</button>
          <button type="button" class="send" data-act="saveProduct">GUARDAR PRODUCTO</button>
        </div>
      </form></div>`;
    renderFeats(); renderImgs(); refreshPreview();
  }
  function renderFeats() {
    $('#featRows').innerHTML = f.feats.map((x, k) => `<div class="feat-row">
      <input data-fi="${k}" data-fk list="featKeys" placeholder="Característica (ej. Material)" value="${esc(x.k)}" aria-label="Característica" maxlength="60">
      <input data-fi="${k}" data-fv placeholder="Valor (ej. Acero inoxidable)" value="${esc(x.v)}" aria-label="Valor" maxlength="160">
      <button type="button" class="oi-del" data-act="delfeat" data-k="${k}" aria-label="Quitar característica">${TRASH}</button></div>`).join('');
  }
  function renderImgs() {
    $('#imgGrid').innerHTML = f.imgs.map((s, k) => `<div class="adm-img${k === 0 ? ' main' : ''}">
      <img src="${s}" alt="Foto ${k + 1}">${k === 0 ? '<em class="badge">Principal</em>' : ''}
      <div class="adm-img-btns">
        ${k > 0 ? `<button type="button" data-act="imain" data-k="${k}" title="Hacer principal" aria-label="Hacer principal">★</button>
                   <button type="button" data-act="iup" data-k="${k}" title="Mover a la izquierda" aria-label="Mover a la izquierda">‹</button>` : ''}
        ${k < f.imgs.length - 1 ? `<button type="button" data-act="idown" data-k="${k}" title="Mover a la derecha" aria-label="Mover a la derecha">›</button>` : ''}
        <button type="button" data-act="idel" data-k="${k}" title="Eliminar" aria-label="Eliminar imagen">✕</button></div></div>`).join('')
      || '<p class="adm-note">Todavía no subiste imágenes.</p>';
  }
  const val = n => { const el = root.querySelector(`#pf [name="${n}"]`); return el ? el.value : ''; };
  function draft() {
    const u = num(val('u'));
    return { id: f.id ?? 0, n: val('n').trim() || 'Nombre del producto', u, m: num(val('m')) || u, q: Math.max(1, num(val('q')) || 3),
      c: val('c').trim() || 'Categoría', t: val('t'), nt: val('nt').trim(), sku: val('sku').trim(), ds: val('ds').trim(), dl: val('dl').trim(),
      f: f.feats.filter(x => x.k.trim() && x.v.trim()).map(x => ({ k: x.k.trim(), v: x.v.trim() })),
      imgs: f.imgs.slice(), st: val('st') === 'oculto' ? 'oculto' : 'activo' };
  }
  const refreshPreview = () => { const el = $('#pv'); if (el) el.innerHTML = cardHTML(draft(), true); };

  /* ---------- imágenes ---------- */
  async function compress(file, max = 1000, q = 0.82) {
    const load = () => new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = rej; im.src = u; });
    let im;
    try { im = window.createImageBitmap ? await createImageBitmap(file, { imageOrientation: 'from-image' }) : await load(); }
    catch (e) { im = await load(); }
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, s = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }
  async function addFiles(files) {
    const ok = ['image/jpeg', 'image/png', 'image/webp'], msg = $('#imgMsg'); let bad = 0, full = false;
    msg.textContent = '';
    for (const file of files) {
      if (f.imgs.length >= MAX_IMGS) { full = true; break; }
      const valid = ok.includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
      if (!valid || file.size > 30e6) { bad++; continue; }
      try { f.imgs.push(await compress(file)); } catch (e) { bad++; }
    }
    const notes = [];
    if (bad) notes.push(`${bad} archivo(s) no se agregaron: usá imágenes JPG, PNG o WEBP.`);
    if (full) notes.push(`Máximo ${MAX_IMGS} imágenes por producto.`);
    msg.textContent = notes.join(' ');
    renderImgs(); refreshPreview();
  }

  /* ---------- guardar / acciones ---------- */
  function setErr(name, text) {
    const m = root.querySelector(`[data-msg="${name}"]`); if (!m) return;
    m.textContent = text; m.closest('.field').classList.add('err');
  }
  const showSave = text => { const m = $('#saveMsg'); if (m) { m.textContent = text; m.hidden = !text; } };
  const LABELS = { n: 'Nombre', u: 'Precio unitario', m: 'Precio por mayor', c: 'Categoría', img: 'Imagen (subí al menos una)' };

  async function saveProduct() {
    const btn = root.querySelector('[data-act="saveProduct"]');
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'GUARDANDO…'; }
      await doSave();
    } catch (e) {                       // cualquier error inesperado se muestra en pantalla
      console.error(e);
      showSave('No se pudo guardar: ' + (e && e.message ? e.message : e));
      toast('No se pudo guardar el producto.', 'err');
    } finally {
      const b = root.querySelector('[data-act="saveProduct"]');
      if (b) { b.disabled = false; b.textContent = 'GUARDAR PRODUCTO'; }
    }
  }
  async function doSave() {
    $$('#pf .err').forEach(e => e.classList.remove('err')); $$('#pf [data-msg]').forEach(e => e.textContent = ''); $('#imgMsg').textContent = ''; showSave('');
    const d = draft(), errs = [];
    if (val('n').trim().length < 2) { setErr('n', 'Escribí el nombre del producto.'); errs.push('n'); }
    if (d.u < 1) { setErr('u', 'Ingresá el precio unitario.'); errs.push('u'); }
    else if (d.m > d.u) { setErr('m', 'El precio por mayor no puede ser mayor que el unitario.'); errs.push('m'); }
    if (!val('c').trim()) { setErr('c', 'Elegí o escribí una categoría.'); errs.push('c'); }
    if (!f.imgs.length) { $('#imgMsg').textContent = 'Subí al menos una imagen.'; errs.push('img'); }
    if (errs.length) {
      showSave('Falta completar: ' + errs.map(k => LABELS[k]).join(', ') + '.');
      toast('Revisá los campos marcados en rojo.', 'err');
      const el = errs[0] === 'img' ? $('#imgMsg') : root.querySelector(`[name="${errs[0]}"]`);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus && errs[0] !== 'img') el.focus({ preventScroll: true });
      return;
    }
    const now = new Date().toISOString(), prev = P.find(x => x.id === f.id);
    const p = Store.normalize({ ...d, id: f.id ?? Date.now(), cr: prev ? prev.cr : now, md: now });
    const adding = f.id == null;
    const ok = await commit(async () => {
      await Store.put(p);
      const i = P.findIndex(x => x.id === p.id); if (i >= 0) P[i] = p; else P.push(p);
    }, adding ? 'Producto agregado al catálogo ✓' : 'Cambios guardados ✓');
    if (ok) renderList(); else showSave('No se pudo guardar en este navegador. Revisá que no estés en una ventana privada y que haya espacio disponible.');
  }
  async function toggle(id) {
    const p = P.find(x => x.id === id); if (!p) return;
    const np = { ...p, st: p.st === 'oculto' ? 'activo' : 'oculto', md: new Date().toISOString() };
    if (await commit(async () => { await Store.put(np); P[P.indexOf(p)] = np; }, np.st === 'oculto' ? 'Producto oculto' : 'Producto visible')) renderRows();
  }
  function remove(id) {
    const p = P.find(x => x.id === id); if (!p) return;
    ask('Eliminar producto', `¿Eliminar "${p.n}"? Esta acción no se puede deshacer (hacé una copia de seguridad si dudás).`, 'Sí, eliminar', async () => {
      if (await commit(async () => { await Store.del(id); P = P.filter(x => x.id !== id); order = order.filter(o => o.id !== id); saveOrder(); }, 'Producto eliminado')) renderRows();
    });
  }

  /* ---------- copia de seguridad, importar y publicar ---------- */
  async function exportBackup() {
    toast('Preparando la copia de seguridad…', 'info');
    try { download(new Blob([await Store.exportBackup(P)], { type: 'application/json' }), `catalogo-respaldo-${today()}.json`); toast('Copia de seguridad descargada ✓'); }
    catch (e) { toast('No se pudo crear la copia.', 'err'); }
  }
  function importFile(file) {
    const r = new FileReader();
    r.onload = () => {
      let list; try { list = Store.parseBackup(String(r.result)); } catch (e) { return toast(e.message, 'err'); }
      ask('Importar catálogo', `Se reemplazarán los ${P.length} productos actuales por los ${list.length} del archivo. Si dudás, hacé primero una copia de seguridad.`, 'Sí, importar', async () => {
        if (await commit(async () => { await Store.clear(); await Store.putMany(list); P = list; }, `Catálogo importado: ${list.length} productos ✓`)) renderList();
      });
    };
    r.onerror = () => toast('No se pudo leer el archivo.', 'err');
    r.readAsText(file);
  }
  async function downloadZip() {
    try {
      const { blob, fotos } = await Store.buildPublishZip(P);
      download(blob, `catalogo-publicar-${today()}.zip`);
      ask('Paquete descargado ✓', `Descomprimí el zip y copiá la carpeta "data" (catalogo.json) y las ${fotos} foto(s) nuevas de "img" a tu proyecto; luego subilo a GitHub. Si conectás GitHub, todo esto se hace solo.`, 'Entendido', null, false);
    } catch (e) { toast('No se pudo crear el paquete.', 'err'); }
  }
  function resetPublished() {
    ask('Volver a lo publicado', 'Se borrarán los cambios guardados en este navegador y se mostrará el catálogo que está publicado en la web. Hacé una copia antes si tenés cambios sin publicar.', 'Sí, volver', async () => {
      await Store.clear(); Store.markLocal(false); location.reload();
    });
  }
  async function savePin() {
    const v = digits($('#pinNew').value), m = $('#pinNewMsg');
    if (v.length < 4 || v.length > 8) { m.textContent = 'Usá entre 4 y 8 números.'; return; }
    localStorage.setItem(PIN_KEY, await hashPin(v)); sessionStorage.setItem(SESSION_KEY, '1');
    pinOpen = false; toast('PIN guardado ✓'); renderList();
  }

  /* ---------- eventos ---------- */
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = +b.dataset.id, k = +b.dataset.k;
    if (a === 'close') close();
    if (a === 'new') renderForm(null);
    if (a === 'edit') renderForm(P.find(x => x.id === id));
    if (a === 'cancel') renderList();
    if (a === 'toggle') toggle(id);
    if (a === 'del') remove(id);
    if (a === 'export') exportBackup();
    if (a === 'import') $('#impFile').click();
    if (a === 'publishNow') publishNow();
    if (a === 'zip') downloadZip();
    if (a === 'gh') { ghOpen = !ghOpen; $('#ghBox').hidden = !ghOpen; if (ghOpen) $('#ghBox').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (a === 'ghSave') ghSave();
    if (a === 'ghOff') { Store.ghSet(null); ghCfg = null; ghOpen = false; pub = null; toast('GitHub desconectado'); renderList(); }
    if (a === 'reset') resetPublished();
    if (a === 'pin') { pinOpen = !pinOpen; $('#pinBox').hidden = !pinOpen; }
    if (a === 'pinSave') savePin();
    if (a === 'pinRemove') { localStorage.removeItem(PIN_KEY); sessionStorage.removeItem(SESSION_KEY); pinOpen = false; toast('PIN quitado'); renderList(); }
    if (a === 'pinGo') {
      if (await hashPin(digits($('#pinIn').value)) === localStorage.getItem(PIN_KEY)) { sessionStorage.setItem(SESSION_KEY, '1'); renderList(); }
      else { $('#pinMsg').textContent = 'PIN incorrecto.'; $('#pinIn').closest('.field').classList.add('err'); }
    }
    if (a === 'saveProduct') saveProduct();
    if (a === 'addfeat') { f.feats.push({ k: '', v: '' }); renderFeats(); const r = $$('#featRows .feat-row'); r[r.length - 1].querySelector('input').focus(); }
    if (a === 'delfeat') { f.feats.splice(k, 1); if (!f.feats.length) f.feats.push({ k: '', v: '' }); renderFeats(); refreshPreview(); }
    if (a === 'pick') $('#imgFile').click();
    if (a === 'imain') { f.imgs.unshift(...f.imgs.splice(k, 1)); renderImgs(); refreshPreview(); }
    if (a === 'iup')   { [f.imgs[k - 1], f.imgs[k]] = [f.imgs[k], f.imgs[k - 1]]; renderImgs(); refreshPreview(); }
    if (a === 'idown') { [f.imgs[k + 1], f.imgs[k]] = [f.imgs[k], f.imgs[k + 1]]; renderImgs(); refreshPreview(); }
    if (a === 'idel')  { f.imgs.splice(k, 1); renderImgs(); refreshPreview(); }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'imgFile') { addFiles([...t.files]); t.value = ''; }
    if (t.id === 'ghAuto') { localStorage.setItem(AUTO_KEY, t.checked ? '1' : '0'); refreshStatus(); }
    if (t.id === 'impFile' && t.files[0]) { importFile(t.files[0]); t.value = ''; }
    if (view === 'form' && t.closest('#pf')) {
      if (t.name === 'u' || t.name === 'm') t.value = t.value ? fmt(num(t.value)) : '';
      refreshPreview();
    }
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'admQ') { filterText = t.value; renderRows(); return; }
    if (t.id === 'pinIn' || t.id === 'pinNew') { t.value = digits(t.value); return; }
    if (view !== 'form' || !t.closest('#pf')) return;
    if (t.dataset.fi !== undefined) { const row = f.feats[+t.dataset.fi]; if ('fk' in t.dataset) row.k = t.value; else row.v = t.value; }
    if (['u', 'm', 'q'].includes(t.name)) t.value = digits(t.value);
    const fld = t.closest('.field'); if (fld) fld.classList.remove('err');
    showSave('');
    clearTimeout(pvTimer); pvTimer = setTimeout(refreshPreview, 150);
  });
  root.addEventListener('submit', e => e.preventDefault());
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pinIn') { e.preventDefault(); root.querySelector('[data-act="pinGo"]').click(); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || root.hidden || root.querySelector('.adm-ask')) return;
    if (view === 'form') renderList(); else close();
  });

  $('#adminOpen').addEventListener('click', open);
  const checkHash = () => { if (location.hash === '#admin' && root.hidden) open(); };
  window.addEventListener('hashchange', checkHash);
  document.addEventListener('catalogo:listo', checkHash);
})();
