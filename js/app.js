/* =====================================================
   CONFIGURACIÓN  (lo único que tenés que cambiar)
   ===================================================== */
const PHONE   = "595983640990";   // tu WhatsApp con código de país, solo números
const BRAND   = "Distribuidora R&M";        // nombre de tu negocio
const CHANNEL = "https://whatsapp.com/channel/0029Vb99nG6KLaHsRjPhEu2n";
const HERO_IMG = 0;               // foto grande de la portada (número de foto p0, p1...)
const FEATURED = 6;               // producto destacado (posición en la lista, empieza en 0)

// Las fotos están en la carpeta img/ (p0.jpg, p1.jpg...) junto a index.html
const src = i => 'img/p' + i + '.jpg';

/* =====================================================
   PRODUCTOS
   [nombre, precio por mayor, precio unitario, categoría, etiqueta, nota, mínimo por mayor]
   ===================================================== */
const P=[
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
  ["Zapatilla adulto 3 colores, calces 36 al 41 SA27473",35500,43000,"Calzado","Nuevo","Gs. 30.000 desde 18 unidades",3],
  ["Zapatilla adulto 4 colores, calces 36 al 41 SA27463",34500,41700,"Calzado","Nuevo","Gs. 30.000 desde 18 unidades",3],
  ["Letrero LED Abierto/Cerrado MK-2150",79500,92000,"Hogar","Nuevo","",2],
  ["Vaso con abridor 500 ml Maxstar M04 con diseño",28500,36000,"Hogar","Nuevo","Caja cerrada de 75 pcs",3],
  ["Licuadora Bigstar 220V 2 en 1 BSP1251",99700,116000,"Hogar","","Caja cerrada de 10 pcs",3],
  ["Jarra kit 2 L con diseño 68 oz",90600,105000,"Hogar","","Caja cerrada de 16 pcs",3],
  ["Jarra eléctrica 2 L 220V BSP-1145/S",39700,56000,"Hogar","","",3],
  ["Kit de manicura 12 pcs M49168",25000,28000,"Belleza","Nuevo","Caja cerrada de 12 pcs",3]
].map((r,k)=>({n:r[0],m:r[1],u:r[2],c:r[3],t:r[4],nt:r[5],q:r[6],i:k<3?k:k+1}));

/* =====================================================
   UTILIDADES
   ===================================================== */
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const gs = n => 'Gs. ' + n.toLocaleString('es-PY');
const waLink = t => 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(t);
const WA = (s = 18) => `<svg class="wai" width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;
const BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const cats = [...new Set(P.map(p => p.c))];
let category = 'Todos', query = '', cart = {};   // cart: { idDelProducto: cantidad }

/* =====================================================
   PORTADA Y TEXTOS FIJOS
   ===================================================== */
function setupStatic() {
  $('#brandName').textContent = BRAND;
  $$('.brand-name2').forEach(e => e.textContent = BRAND);
  $('#brandMark').textContent = $('#brandMark2').textContent = BRAND[0].toUpperCase();
  $('#chLink').href = CHANNEL;
  $('#heroImg').src = src(HERO_IMG);
  const f = P[FEATURED];
  $('#fpImg').src = src(f.i);
  $('#fpName').textContent = f.n;
  $('#fpPrice').textContent = gs(f.m) + ' por mayor';
  $('#heroCount').textContent = P.length + ' productos';
  $('#waFloat').href = waLink('Hola! Quiero consultar por los productos del catálogo.');
  $('#waFloatIc').innerHTML = WA(26);
  $('#year').textContent = '© ' + new Date().getFullYear() + ' ' + BRAND;
}

/* =====================================================
   CATEGORÍAS Y FILTROS
   ===================================================== */
function renderCategories() {
  $('#categorias').innerHTML = cats.map((c, k) => `
    <button type="button" data-cat="${c}">
      <span class="category-number">0${k + 1}</span>
      <span><small>${P.filter(p => p.c === c).length} productos</small><strong>${c}</strong></span>
      <i>${ARROW}</i>
    </button>`).join('') + `
    <div class="category-note"><strong>Comprá fácil, pedí por WhatsApp.</strong>
    <span>Sumá productos a tu pedido y envialo en un solo mensaje.</span></div>`;
}

function renderFilters() {
  $('#filters').innerHTML = ['Todos', ...cats].map(c =>
    `<button type="button" data-filter="${c}" class="${c === category ? 'active' : ''}">${c}</button>`).join('');
}

/* =====================================================
   TARJETAS DE PRODUCTO
   ===================================================== */
function renderGrid() {
  const q = query.trim().toLowerCase();
  const list = P.filter(p => (category === 'Todos' || p.c === category) && (p.n + ' ' + p.c).toLowerCase().includes(q));
  if (!list.length) {
    $('#grid').innerHTML = `<div class="empty-state"><strong>No encontramos coincidencias</strong>
      <span>Probá con otra búsqueda o mirá todos los productos.</span>
      <button type="button" data-reset>Ver todo</button></div>`;
    return;
  }
  $('#grid').innerHTML = '<div class="product-grid">' + list.map(p => `
    <article class="product-card">
      <div class="product-image">
        ${p.t ? `<span class="product-tag">${p.t}</span>` : ''}
        <img src="${src(p.i)}" alt="${p.n}" onerror="this.parentElement.classList.add('noimg');this.remove()">
        <button type="button" data-add="${p.i}" aria-label="Agregar ${p.n} al pedido">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="product-info">
        <div><span>${p.c}</span><h3>${p.n}</h3></div>
        <strong>${gs(p.m)}</strong>
      </div>
      <div class="price-sub">Por mayor desde ${p.q} unid. · Unitario ${gs(p.u)}</div>
      ${p.nt ? `<div class="price-sub">${p.nt}</div>` : ''}
      <div class="actions">
        <a class="order" target="_blank" rel="noopener" href="${waLink('Hola! Me interesa: ' + p.n + ' (' + gs(p.m) + ' por mayor / ' + gs(p.u) + ' unitario)')}">${WA(17)} Consultar</a>
        <button type="button" class="addcart" data-add="${p.i}" aria-label="Agregar ${p.n} al pedido">${BAG} Agregar</button>
      </div>
    </article>`).join('') + '</div>';
}

/* =====================================================
   PEDIDO (carrito) → mensaje de WhatsApp
   El precio por mayor se aplica al llegar a la cantidad mínima de cada producto.
   ===================================================== */
const byId = id => P.find(p => p.i === +id);
const unit = (p, n) => n >= p.q ? p.m : p.u;

function renderCart() {
  const ids = Object.keys(cart);
  const count = ids.reduce((s, id) => s + cart[id], 0);
  $('#cartCount').textContent = count;
  $('#cartFabCount').textContent = count;
  $('#cartFab').classList.toggle('has', count > 0);
  let total = 0, lines = [];
  $('#cartList').innerHTML = ids.length ? ids.map(id => {
    const p = byId(id), n = cart[id], u = unit(p, n), sub = u * n;
    total += sub;
    lines.push(`• ${n} x ${p.n} — ${gs(u)} c/u${n >= p.q ? ' (por mayor)' : ''}`);
    return `<div class="cart-item"><img src="${src(p.i)}" alt="">
      <div><strong>${p.n}</strong><small>${gs(u)} c/u${n >= p.q ? ' · por mayor' : ' · faltan ' + (p.q - n) + ' para precio por mayor'}</small></div>
      <div class="qty"><button type="button" data-minus="${id}">−</button><span>${n}</span><button type="button" data-plus="${id}">+</button></div></div>`;
  }).join('') : '<p class="cart-empty">Todavía no agregaste productos.<br>Tocá el + en cualquier tarjeta.</p>';
  $('#cartTotal').textContent = gs(total);
  const send = $('#cartSend');
  send.innerHTML = WA(18) + ' Enviar pedido por WhatsApp';
  send.href = waLink('Hola! Quiero hacer este pedido:\n' + lines.join('\n') + '\n\nTotal: ' + gs(total));
  send.classList.toggle('off', !ids.length);
}

const openCart  = o => { $('#cart').classList.toggle('open', o); $('#scrim').classList.toggle('open', o); };
// Aviso visual al agregar: el carrito flotante "salta" y el botón se marca un momento
function feedback(btn) {
  const fab = $('#cartFab');
  fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
  btn.classList.add('ok'); setTimeout(() => btn.classList.remove('ok'), 700);
}
const goCatalog = () => $('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });

/* =====================================================
   EVENTOS
   ===================================================== */
document.addEventListener('click', e => {
  const t = e.target.closest('button,a');
  if (!t) return;
  if (t.dataset.cat)    { category = t.dataset.cat; renderFilters(); renderGrid(); goCatalog(); }
  if (t.dataset.filter) { category = t.dataset.filter; renderFilters(); renderGrid(); }
  if (t.dataset.add)    { cart[t.dataset.add] = (cart[t.dataset.add] || 0) + 1; renderCart(); feedback(t); }
  if (t.dataset.plus)   { cart[t.dataset.plus]++; renderCart(); }
  if (t.dataset.minus)  { if (--cart[t.dataset.minus] <= 0) delete cart[t.dataset.minus]; renderCart(); }
  if ('reset' in t.dataset) { query = ''; category = 'Todos'; $('#q').value = ''; renderFilters(); renderGrid(); }
  if (t.id === 'cartBtn' || t.id === 'cartFab') openCart(true);
  if (t.id === 'cartClose') openCart(false);
  if (t.id === 'heroBtn') { category = 'Todos'; renderFilters(); renderGrid(); goCatalog(); }
});
$('#scrim').onclick = () => openCart(false);
$('#q').oninput = e => { query = e.target.value; renderGrid(); };
$('#cartSend').addEventListener('click', e => { if (!Object.keys(cart).length) e.preventDefault(); });

/* =====================================================
   INICIO
   ===================================================== */
setupStatic(); renderCategories(); renderFilters(); renderGrid(); renderCart();