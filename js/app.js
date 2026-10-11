/* =====================================================
   CONFIGURACIÓN  (lo único que tenés que cambiar)
   ===================================================== */
const WHATSAPP_NUMBER = "595983640990";   // tu WhatsApp con código de país, solo números (único lugar donde va)
const BRAND   = "Distribuidora R&M";                  // nombre de tu negocio
const MODALIDAD = "Pedido bajo encargo";    // se muestra al cliente y en el mensaje
const PLAZO     = "7 días hábiles";         // plazo estimado de entrega
const CHANNEL = "https://whatsapp.com/channel/0029Vb99nG6KLaHsRjPhEu2n";
const GITHUB_OWNER = "m29772231-beep";   // tu usuario de GitHub (solo precarga el formulario del administrador)
const GITHUB_REPO  = "Distribuidora-R-M";  // nombre de tu repositorio
const GITHUB_BRANCH = "main";               // rama donde se publica la página
const HERO_ID = 0;        // producto cuya foto va grande en la portada (su id)
const FEATURED_ID = 7;    // producto "Destacado" de la portada (su id)

/* =====================================================
   PRODUCTOS BASE
   Son los productos de arranque. Cuando administrás el catálogo desde la página,
   los cambios se guardan en el navegador (IndexedDB) y se publican con "Publicar en la web".
   [nombre, precio por mayor, precio unitario, categoría, etiqueta, nota, mínimo por mayor]
   ===================================================== */
const DEFAULTS = [
  ["Cocina infrarrojo Maxstar MS-02P/S",127000,152000,"Hogar","Nuevo","",3],
  ["Protector solar SPF 50 HB611",25000,32000,"Belleza","Nuevo","",3],
  ["Linterna LED USB Dux MJ-616",22000,26000,"Tecnología","","",3],
  ["Cartera para dama 22×13×7 cm M51510",45000,55000,"Accesorios","","",3],
  ["Neceser 26×15×9 cm M51535",25000,33000,"Accesorios","","",3],
  ["Desmaquillante 25 pcs AL25-PY",10000,15000,"Belleza","","",3],
  ["Auricular Newest M10 V5.3",33000,42000,"Tecnología","Reposición","",3],
  ["Pinza de ceja, tira de 12 pcs N°9936-1",12000,14000,"Belleza","Reposición","",3],
  ["Reloj Smart Watch GUS-14 Ultra 3",42000,50000,"Tecnología","Reposición","",3],
  ["Reloj Smart D20",22000,27000,"Tecnología","Reposición","",3],
  ["Cargador Samsung USB-C 25W original (sin cable)",83000,92000,"Tecnología","Reposición","",3],
  ["Kit termo 2500 ml Maxstar M02",95000,107000,"Hogar","Reposición","",3],
  ["Billetera para dama 19×10×3 cm M50245",20000,25000,"Accesorios","Nuevo","",3],
  ["Zapatilla adulto 4 colores, calces 40 al 45 surtidos SA27434",23500,30000,"Calzado","Nuevo","",3],
  ["Crocs 4 colores, calces 36-37 / 40-41 surtidos MK-2400",25500,30000,"Calzado","Nuevo","",3],
  ["Crocs infantil 4 colores, calces 30 al 35 SA23245",19750,23500,"Calzado","Nuevo","",3],
  ["Aspiradora portátil AS-228 M45697",37000,44000,"Hogar","Nuevo","",3],
  ["Zapatilla adulto 3 colores, calces 36 al 41 SA27473",35500,43000,"Calzado","Nuevo","₲ 30.000 desde 18 unidades",3],
  ["Zapatilla adulto 4 colores, calces 36 al 41 SA27463",34500,41700,"Calzado","Nuevo","₲ 30.000 desde 18 unidades",3],
  ["Letrero LED Abierto/Cerrado MK-2150",79500,92000,"Hogar","Nuevo","",2],
  ["Vaso con abridor 500 ml Maxstar M04 con diseño",28500,36000,"Hogar","Nuevo","Caja cerrada de 75 pcs",3],
  ["Licuadora Bigstar 220V 2 en 1 BSP1251",99700,116000,"Hogar","","Caja cerrada de 10 pcs",3],
  ["Jarra kit 2 L con diseño 68 oz",90600,105000,"Hogar","","Caja cerrada de 16 pcs",3],
  ["Jarra eléctrica 2 L 220V BSP-1145/S",39700,56000,"Hogar","","",3],
  ["Kit de manicura 12 pcs M49168",25000,28000,"Belleza","Nuevo","Caja cerrada de 12 pcs",3]
].map((r, k) => {
  const id = k < 3 ? k : k + 1;   // el id coincide con el número de la foto (img/p{id}.jpg)
  return { id, n: r[0], m: r[1], u: r[2], c: r[3], t: r[4], nt: r[5], q: r[6],
           sku: '', ds: '', dl: '', f: [], imgs: ['img/p' + id + '.jpg'], st: 'activo', cr: '', md: '' };
});

/* =====================================================
   UTILIDADES
   ===================================================== */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // 25000 → 25.000
const gs  = n => '₲ ' + fmt(n);                                                  // ₲ 25.000
const num = v => parseInt(String(v).replace(/\D/g, ''), 10) || 0;                // texto → entero seguro (vacío = 0)
const waLink = t => 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(t);
const WA = (s = 18) => `<svg class="wai" width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;
const BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e9ece9"/><text x="50" y="60" font-size="34" text-anchor="middle">📦</text></svg>');

/* =====================================================
   CATÁLOGO (productos en memoria)
   ===================================================== */
let P = [];                                  // todos los productos (activos y ocultos)
let category = 'Todos', query = '';
let catalogSource = 'base';                  // 'local' (editado aquí) | 'publicado' (data/catalogo.json) | 'base'

const visible = () => P.filter(p => p.st !== 'oculto');
const cats = () => [...new Set(visible().map(p => p.c))];
const img0 = p => p.imgs[0] || PLACEHOLDER;  // la primera imagen es la principal
// Los productos nuevos (id grande) van primero, el más reciente arriba; luego los base en su orden
const sortCatalog = l => l.sort((a, b) => (b.id > 1e9) - (a.id > 1e9) || (a.id > 1e9 ? b.id - a.id : a.id - b.id));
const byId = id => P.find(p => p.id === +id);
const syncScroll = () => { document.body.style.overflow =
  ($('#cart').classList.contains('open') || $('#detail').classList.contains('open') || !$('#admin').hidden) ? 'hidden' : ''; };

// Prioridad: 1) lo editado en este navegador  2) data/catalogo.json publicado  3) productos base
async function loadCatalog() {
  try { if (Store.hasLocal()) { P = sortCatalog((await Store.all()).map(Store.normalize)); catalogSource = 'local'; return; } } catch (e) {}
  try {
    const r = await fetch('data/catalogo.json', { cache: 'no-cache' });
    if (r.ok) { P = sortCatalog(Store.parseBackup(await r.text())); catalogSource = 'publicado'; return; }
  } catch (e) {}
  P = sortCatalog(DEFAULTS.map(p => ({ ...p, cr: new Date().toISOString(), md: new Date().toISOString() })));
  catalogSource = 'base';
}

/* =====================================================
   PORTADA Y TEXTOS FIJOS
   ===================================================== */
function setupStatic() {
  const vis = visible();
  const hero = vis.find(p => p.id === HERO_ID) || vis[0];
  const feat = vis.find(p => p.id === FEATURED_ID) || vis[1] || vis[0];
  $('#brandName').textContent = BRAND;
  $$('.brand-name2').forEach(e => e.textContent = BRAND);
  $('#brandMark').textContent = $('#brandMark2').textContent = BRAND[0].toUpperCase();
  $('#chLink').href = CHANNEL;
  if (hero) $('#heroImg').src = img0(hero);
  $('.floating-product').hidden = !feat;
  if (feat) { $('#fpImg').src = img0(feat); $('#fpName').textContent = feat.n; $('#fpPrice').textContent = gs(feat.m) + ' por mayor'; }
  $('#heroCount').textContent = vis.length + ' productos';
  $('#waFloat').href = waLink('Hola! Quiero consultar por los productos del catálogo.');
  $('#waFloatIc').innerHTML = WA(26);
  $('#year').textContent = '© ' + new Date().getFullYear() + ' ' + BRAND;
}

/* =====================================================
   CATEGORÍAS Y FILTROS
   ===================================================== */
function renderCategories() {
  $('#categorias').innerHTML = cats().map((c, k) => `
    <button type="button" data-cat="${esc(c)}">
      <span class="category-number">${String(k + 1).padStart(2, '0')}</span>
      <span><small>${visible().filter(p => p.c === c).length} productos</small><strong>${esc(c)}</strong></span>
      <i>${ARROW}</i>
    </button>`).join('') + `
    <div class="category-note"><strong>Comprá fácil, pedí por WhatsApp.</strong>
    <span>Sumá productos a tu pedido y envialo en un solo mensaje.</span></div>`;
}

function renderFilters() {
  $('#filters').innerHTML = ['Todos', ...cats()].map(c =>
    `<button type="button" data-filter="${esc(c)}" class="${c === category ? 'active' : ''}">${esc(c)}</button>`).join('');
}

/* =====================================================
   TARJETAS DE PRODUCTO (la misma tarjeta se usa en el catálogo y en la vista previa del administrador)
   ===================================================== */
function cardHTML(p, preview = false) {
  const consult = waLink('Hola! Me interesa: ' + p.n + ' (' + gs(p.m) + ' por mayor / ' + gs(p.u) + ' unitario)');
  return `
    <article class="product-card${preview ? ' preview' : ''}">
      <div class="product-image" data-detail="${p.id}">
        ${p.t ? `<span class="product-tag">${esc(p.t)}</span>` : ''}
        <img src="${img0(p)}" alt="${esc(p.n)}" onerror="this.parentElement.classList.add('noimg');this.remove()">
        <button type="button" data-add="${p.id}" aria-label="Agregar ${esc(p.n)} al pedido">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="product-info">
        <div><span>${esc(p.c)}</span><h3 data-detail="${p.id}">${esc(p.n)}</h3></div>
        <strong>${gs(p.m)}</strong>
      </div>
      ${p.ds ? `<p class="desc">${esc(p.ds)}</p>` : ''}
      <div class="price-sub">Por mayor desde ${p.q} unid. · Unitario ${gs(p.u)}</div>
      ${p.nt ? `<div class="price-sub">${esc(p.nt)}</div>` : ''}
      <button type="button" class="linkbtn" data-detail="${p.id}">Ver detalle ›</button>
      <div class="actions">
        <a class="order" target="_blank" rel="noopener" href="${consult}">${WA(17)} Consultar</a>
        <button type="button" class="addcart" data-add="${p.id}" aria-label="Agregar ${esc(p.n)} al pedido">${BAG} Agregar</button>
      </div>
    </article>`;
}

function renderGrid() {
  const q = query.trim().toLowerCase();
  const list = visible().filter(p => (category === 'Todos' || p.c === category) && (p.n + ' ' + p.c + ' ' + p.sku).toLowerCase().includes(q));
  if (!list.length) {
    $('#grid').innerHTML = `<div class="empty-state"><strong>No encontramos coincidencias</strong>
      <span>Probá con otra búsqueda o mirá todos los productos.</span>
      <button type="button" data-reset>Ver todo</button></div>`;
    return;
  }
  $('#grid').innerHTML = '<div class="product-grid">' + list.map(p => cardHTML(p)).join('') + '</div>';
}

function renderAll() {
  if (category !== 'Todos' && !cats().includes(category)) category = 'Todos';
  setupStatic(); renderCategories(); renderFilters(); renderGrid(); renderCart();
}

/* =====================================================
   DETALLE DEL PRODUCTO (galería, descripción y características)
   ===================================================== */
let detailImgs = [];
function openDetail(id) {
  const p = byId(id); if (!p) return;
  detailImgs = p.imgs.length ? p.imgs : [PLACEHOLDER];
  $('#detail').innerHTML = `
    <div class="dt-card" role="dialog" aria-modal="true" aria-label="${esc(p.n)}">
      <button type="button" class="dt-close" data-dclose aria-label="Cerrar">✕</button>
      <div class="dt-gal">
        <img class="dt-main" id="dtMain" src="${detailImgs[0]}" alt="${esc(p.n)}">
        ${detailImgs.length > 1 ? `<div class="dt-thumbs">${detailImgs.map((s, k) =>
          `<button type="button" data-thumb="${k}" class="${k ? '' : 'on'}" aria-label="Foto ${k + 1}"><img src="${s}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="dt-info">
        <span class="kicker">${esc(p.c)}</span>
        <h3>${esc(p.n)}</h3>
        ${p.sku ? `<small class="price-sub">Código: ${esc(p.sku)}</small>` : ''}
        <div class="dt-price"><strong>${gs(p.m)}</strong><span>Por mayor desde ${p.q} unid.</span><span>Unitario ${gs(p.u)}</span></div>
        ${p.ds ? `<p class="dt-short">${esc(p.ds)}</p>` : ''}
        ${p.dl ? `<p class="dt-long">${esc(p.dl)}</p>` : ''}
        ${p.f.length ? `<table class="dt-feat"><tbody>${p.f.map(x => `<tr><th>${esc(x.k)}</th><td>${esc(x.v)}</td></tr>`).join('')}</tbody></table>` : ''}
        ${p.nt ? `<div class="price-sub">${esc(p.nt)}</div>` : ''}
        <div class="actions">
          <a class="order" target="_blank" rel="noopener" href="${waLink('Hola! Me interesa: ' + p.n + ' (' + gs(p.m) + ' por mayor / ' + gs(p.u) + ' unitario)')}">${WA(17)} Consultar</a>
          <button type="button" class="addcart" data-add="${p.id}">${BAG} Agregar</button>
        </div>
      </div>
    </div>`;
  $('#detail').classList.add('open'); syncScroll();
}
function closeDetail() { $('#detail').classList.remove('open'); syncScroll(); }

/* =====================================================
   PEDIDO ("Mi pedido")  →  datos del cliente  →  mensaje de WhatsApp
   ===================================================== */
const STORAGE_KEY = 'catalogo_pedido_v1';
const unit = (p, n) => n >= p.q ? p.m : p.u;                    // precio de lista según cantidad (solo sugerido)
const unidades = n => n + (n === 1 ? ' unidad' : ' unidades');

let order = [];            // [{ id, qty, price, custom }]  custom = el precio fue escrito a mano
let customer = { negocio: '', contacto: '', telefono: '', ciudad: '', zona: '', obs: '' };
let accepted = false;      // casilla "entiendo el plazo"

const lineTotal = o => o.qty * o.price;
const totals = () => ({
  productos: order.length,
  unidades: order.reduce((s, o) => s + o.qty, 0),
  total: order.reduce((s, o) => s + lineTotal(o), 0)
});
const rowOf = d => order.find(x => x.id === +(d.qty ?? d.price));

/* ---- Guardado temporal del pedido (localStorage) ---- */
function saveOrder() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, customer, accepted })); } catch (e) {}
}
function loadOrder() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!d) return;
    order = (d.order || []).filter(o => byId(o.id))
      .map(o => ({ id: +o.id, qty: num(o.qty), price: num(o.price), custom: !!o.custom }));
    Object.assign(customer, d.customer || {});
    accepted = !!d.accepted;
  } catch (e) {}
}

/* ---- Dibujo del pedido ---- */
const itemHTML = o => { const p = byId(o.id); return `
  <div class="oi">
    <div class="oi-top">
      <img src="${img0(p)}" alt="">
      <strong>${esc(p.n)}</strong>
      <button type="button" class="oi-del" data-del="${o.id}" aria-label="Quitar ${esc(p.n)}">${TRASH}</button>
    </div>
    <div class="oi-fields">
      <div class="fld"><span>Cantidad</span>
        <div class="qty"><button type="button" data-minus="${o.id}" aria-label="Menos">−</button><input type="text" inputmode="numeric" pattern="[0-9]*" data-qty="${o.id}" value="${o.qty || ''}" aria-label="Cantidad de ${esc(p.n)}"><button type="button" data-plus="${o.id}" aria-label="Más">+</button></div></div>
      <div class="fld"><span>Precio acordado (por unidad)</span>
        <div class="money"><i>₲</i><input type="text" inputmode="numeric" pattern="[0-9]*" data-price="${o.id}" value="${o.price ? fmt(o.price) : ''}" placeholder="0" aria-label="Precio acordado de ${esc(p.n)}"></div></div>
    </div>
    <div class="oi-sub"><span>Subtotal</span><strong data-sub="${o.id}">${gs(lineTotal(o))}</strong></div>
    <div class="oi-err" data-err="${o.id}"></div>
  </div>`; };

function renderCart() {
  order = order.filter(o => byId(o.id));          // si se eliminó un producto del catálogo, sale del pedido
  $('#cartList').innerHTML = order.length ? order.map(itemHTML).join('')
    : '<p class="cart-empty">Todavía no agregaste productos.<br>Tocá <b>Agregar</b> en cualquier tarjeta.</p>';
  $('#orderRest').hidden = !order.length;
  updateTotals();
}

// Actualiza solo números (sin redibujar, para no perder el foco mientras se escribe)
function updateTotals() {
  const t = totals();
  $('#cartCount').textContent = $('#cartFabCount').textContent = t.unidades;
  $('#cartFab').classList.toggle('has', t.unidades > 0);
  $('#cartSummary').innerHTML =
    `<div><span>Total de productos</span><b>${t.productos}</b></div>
     <div><span>Total de unidades</span><b>${t.unidades}</b></div>
     <div class="grand"><span>Total general</span><b>${gs(t.total)}</b></div>`;
  $('#cartTotal').textContent = gs(t.total);
  order.forEach(o => { const el = $(`[data-sub="${o.id}"]`); if (el) el.textContent = gs(lineTotal(o)); });
}

function addToOrder(id) {
  const o = order.find(x => x.id === +id), p = byId(id);
  if (!p) return;
  if (o) { o.qty += 1; if (!o.custom) o.price = unit(p, o.qty); }
  else order.push({ id: +id, qty: 1, price: unit(p, 1), custom: false });
  saveOrder(); renderCart();
}

/* ---- Validación (mensajes dentro del diseño, sin alert) ---- */
function showMsg(text) { const m = $('#formMsg'); m.textContent = text; m.hidden = !text; }

function validate() {
  let errors = 0, first = null;
  const flag = el => { errors++; if (!first) first = el; };
  $$('.err').forEach(e => e.classList.remove('err'));
  $$('.invalid').forEach(e => e.classList.remove('invalid'));
  $$('.msg, .oi-err').forEach(e => e.textContent = '');

  if (!/^\d{8,15}$/.test(WHATSAPP_NUMBER)) { showMsg('Falta configurar el número de WhatsApp (WHATSAPP_NUMBER en js/app.js).'); return false; }
  if (!order.length) { showMsg('Agregá al menos un producto a tu pedido.'); return false; }

  order.forEach(o => {
    const msgs = [], q = $(`[data-qty="${o.id}"]`), pr = $(`[data-price="${o.id}"]`);
    if (o.qty < 1)   { msgs.push('La cantidad debe ser mayor a 0.'); q.classList.add('invalid'); flag(q); }
    if (o.price < 1) { msgs.push('Ingresá el precio acordado.'); pr.closest('.money').classList.add('invalid'); flag(pr); }
    $(`[data-err="${o.id}"]`).textContent = msgs.join(' ');
  });

  const need = { negocio: 'Escribí el nombre del negocio.', contacto: 'Escribí el nombre de contacto.',
                 telefono: 'Escribí un teléfono válido.', ciudad: 'Escribí la ciudad.',
                 zona: 'Escribí la dirección o zona de entrega.' };
  Object.keys(need).forEach(k => {
    const input = $(`#orderForm [name="${k}"]`), v = customer[k].trim();
    if (!v || (k === 'telefono' && v.replace(/\D/g, '').length < 6)) {
      const f = input.closest('.field'); f.classList.add('err'); f.querySelector('.msg').textContent = need[k]; flag(input);
    }
  });
  if (!accepted) { $('#acceptBox').classList.add('err'); flag($('#accept')); }

  if (errors) {
    showMsg(errors === 1 && !accepted ? 'Confirmá el plazo de entrega para continuar.' : 'Faltan datos: revisá los campos marcados en rojo.');
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first.focus({ preventScroll: true });
    return false;
  }
  showMsg('');
  return true;
}

/* ---- Mensaje de WhatsApp ---- */
function buildMessage() {
  const c = customer, t = totals(), line = '━━━━━━━━━━━━━━';
  const items = order.map((o, k) =>
    `${k + 1}. ${byId(o.id).n}\n   Cantidad: ${unidades(o.qty)}\n   Precio acordado: ${gs(o.price)}\n   Subtotal: ${gs(lineTotal(o))}`).join('\n\n');
  return [
    '🛒 NUEVO PEDIDO', '',
    '🏪 Datos del negocio',
    `Nombre del negocio: ${c.negocio.trim()}`,
    `Contacto: ${c.contacto.trim()}`,
    `Teléfono: ${c.telefono.trim()}`,
    `Ciudad: ${c.ciudad.trim()}`,
    `Dirección/Zona: ${c.zona.trim()}`, '',
    '📦 Productos solicitados', '', items, '',
    line, '📊 RESUMEN',
    `Total de productos: ${t.productos}`,
    `Total de unidades: ${t.unidades}`,
    `TOTAL: ${gs(t.total)}`, line, '',
    '🚚 Entrega',
    `Modalidad: ${MODALIDAD}`,
    `Plazo estimado: ${PLAZO}`, '',
    '📝 Observaciones:',
    c.obs.trim() || 'Sin observaciones'
  ].join('\n');
}

function sendOrder() {
  if (!validate()) return;
  const url = waLink(buildMessage());
  const w = window.open(url, '_blank');
  if (!w) location.href = url;           // por si el navegador bloquea la ventana nueva
}

/* ---- Panel ---- */
function openCart(o) {
  $('#cart').classList.toggle('open', o);
  $('#scrim').classList.toggle('open', o);
  $('#cart').setAttribute('aria-hidden', String(!o));
  $('#cart').inert = !o;
  syncScroll();
}
// Aviso visual al agregar: el carrito flotante "salta" y el botón se marca un momento
function feedback(btn) {
  const fab = $('#cartFab');
  fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
  btn.classList.add('ok'); setTimeout(() => btn.classList.remove('ok'), 700);
}
const goCatalog = () => $('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
const askClear = on => { $('#clearBtn').hidden = on; $('#clearAsk').hidden = !on; };

function setupOrderTexts() {
  $('#nMode').textContent = 'Modalidad: ' + MODALIDAD;
  $('#nTerm').textContent = 'Plazo estimado: ' + PLAZO;
  $('#acceptText').innerHTML = `Entiendo que los productos se entregan <b>bajo encargo</b> en un plazo estimado de <b>${PLAZO}</b>.`;
  $('#sendBtn').innerHTML = WA(22) + ' Enviar pedido por WhatsApp';
}
function fillForm() {
  Object.keys(customer).forEach(k => { const el = $(`#orderForm [name="${k}"]`); if (el) el.value = customer[k]; });
  $('#accept').checked = accepted;
}

/* =====================================================
   EVENTOS
   ===================================================== */
document.addEventListener('click', e => {
  // Abrir el detalle al tocar la foto, el nombre o "Ver detalle" (no si se toca "+", Agregar o Consultar)
  const dt = e.target.closest('[data-detail]');
  if (dt && !e.target.closest('.preview, button[data-add], a')) { openDetail(dt.dataset.detail); return; }
  if (e.target.id === 'detail') { closeDetail(); return; }

  const t = e.target.closest('button,a');
  if (!t) return;
  const d = t.dataset;
  if (d.dclose !== undefined) closeDetail();
  if (d.thumb !== undefined) {
    $('#dtMain').src = detailImgs[+d.thumb];
    $$('.dt-thumbs button').forEach(b => b.classList.toggle('on', b === t));
  }
  if (d.cat)    { category = d.cat; renderFilters(); renderGrid(); goCatalog(); }
  if (d.filter) { category = d.filter; renderFilters(); renderGrid(); }
  if (d.add)    { if (t.closest('.preview')) return; addToOrder(d.add); feedback(t); }
  if (d.plus || d.minus) {
    const o = order.find(x => x.id === +(d.plus || d.minus));
    if (o) { o.qty = Math.max(1, o.qty + (d.plus ? 1 : -1)); if (!o.custom) o.price = unit(byId(o.id), o.qty); saveOrder(); renderCart(); }
  }
  if (d.del)    { order = order.filter(o => o.id !== +d.del); saveOrder(); renderCart(); }
  if ('reset' in d) { query = ''; category = 'Todos'; $('#q').value = ''; renderFilters(); renderGrid(); }
  if (t.id === 'cartBtn' || t.id === 'cartFab') openCart(true);
  if (t.id === 'cartClose' || t.id === 'keepBtn') openCart(false);
  if (t.id === 'heroBtn')  { category = 'Todos'; renderFilters(); renderGrid(); goCatalog(); }
  if (t.id === 'clearBtn') askClear(true);
  if (t.id === 'clearNo')  askClear(false);
  if (t.id === 'clearYes') { order = []; accepted = false; $('#accept').checked = false; saveOrder(); renderCart(); askClear(false); showMsg(''); }
  if (t.id === 'sendBtn')  sendOrder();
});

document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.qty || d.price) {                       // cantidad o precio acordado
    const o = rowOf(d); if (!o) return;
    t.value = t.value.replace(/\D/g, '');       // solo dígitos
    if (d.qty) {
      o.qty = num(t.value);
      if (!o.custom) { o.price = unit(byId(o.id), o.qty); $(`[data-price="${o.id}"]`).value = o.price ? fmt(o.price) : ''; }
    } else { o.price = num(t.value); o.custom = true; }
    t.classList.remove('invalid'); const m = t.closest('.money'); if (m) m.classList.remove('invalid');
    saveOrder(); updateTotals();
    return;
  }
  if (t.closest('#orderForm') && t.name in customer) {   // datos del cliente
    customer[t.name] = t.value;
    const f = t.closest('.field'), m = f && f.querySelector('.msg'); if (f) f.classList.remove('err'); if (m) m.textContent = '';
    saveOrder();
  }
  if (t.id === 'accept') { accepted = t.checked; $('#acceptBox').classList.remove('err'); saveOrder(); }
});

// Al salir del campo, se ordena el texto (25000 → 25.000)
document.addEventListener('focusout', e => {
  const d = e.target.dataset;
  if (!(d.qty || d.price)) return;
  const o = rowOf(d); if (!o) return;
  e.target.value = d.qty ? (o.qty || '') : (o.price ? fmt(o.price) : '');
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDetail(); openCart(false); } });
$('#scrim').onclick = () => openCart(false);
$('#q').oninput = e => { query = e.target.value; renderGrid(); };

/* =====================================================
   INICIO
   ===================================================== */
(async () => {
  setupOrderTexts();
  $('#cart').inert = true;
  await loadCatalog();
  loadOrder(); fillForm(); renderAll();
  document.dispatchEvent(new Event('catalogo:listo'));
})();
