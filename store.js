/* =====================================================
   STORE: guarda el catálogo en el navegador (IndexedDB)
   Sin servidor ni base de datos externa. También genera:
   · copia de seguridad (.json con las fotos incluidas)
   · paquete para publicar (.zip con data/catalogo.json + fotos nuevas)
   ===================================================== */
const Store = (() => {
  const DB_NAME = 'catalogo-db', STORE = 'productos', FLAG = 'catalogo_local';
  const int = v => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;
  const txt = (v, max) => String(v ?? '').trim().slice(0, max);

  /* ---------- IndexedDB ---------- */
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('IndexedDB no disponible'));
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = t.onabort = () => rej(t.error);
    });
  };
  const all     = () => tx('readonly',  s => s.getAll());
  const put     = p => tx('readwrite', s => { s.put(p); });
  const putMany = l => tx('readwrite', s => { l.forEach(p => s.put(p)); });
  const del     = id => tx('readwrite', s => { s.delete(id); });
  const clear   = () => tx('readwrite', s => { s.clear(); });
  // "local" = el administrador ya guardó cambios en este navegador (aunque el catálogo quede vacío)
  const hasLocal = () => localStorage.getItem(FLAG) === '1';
  const markLocal = on => on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG);

  /* ---------- Estructura de un producto ----------
     id, n nombre, m precio por mayor, u precio unitario, q mínimo por mayor, c categoría,
     t etiqueta, nt nota, sku, ds descripción corta, dl descripción completa,
     f características [{k,v}], imgs fotos (la primera es la principal),
     st 'activo' | 'oculto', cr creado, md modificado                                  */
  const IMG_OK = /^(data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+|img\/[\w\-. ()]+)$/;
  const normalize = (r, k = 0) => {
    const now = new Date().toISOString();
    const id = Number.isFinite(+r.id) && r.id !== '' && r.id !== null ? +r.id : Date.now() + k;
    return {
      id,
      n: txt(r.n, 140), u: int(r.u), m: int(r.m) || int(r.u), q: Math.max(1, int(r.q) || 3),
      c: txt(r.c, 60) || 'Sin categoría',
      t: ['Nuevo', 'Reposición'].includes(r.t) ? r.t : '',
      nt: txt(r.nt, 120), sku: txt(r.sku, 40), ds: txt(r.ds, 160), dl: txt(r.dl, 3000),
      f: (Array.isArray(r.f) ? r.f : []).map(x => ({ k: txt(x && x.k, 60), v: txt(x && x.v, 160) })).filter(x => x.k && x.v),
      imgs: (Array.isArray(r.imgs) ? r.imgs : []).filter(s => typeof s === 'string' && IMG_OK.test(s)),
      st: r.st === 'oculto' ? 'oculto' : 'activo',
      cr: r.cr || now, md: r.md || r.cr || now
    };
  };

  /* ---------- Copia de seguridad ---------- */
  const toDataURL = async src => {
    if (src.startsWith('data:')) return src;
    try {
      const r = await fetch(src); if (!r.ok) throw 0;
      const b = await r.blob();
      const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
      return url.replace(/^data:[^;]*/, 'data:image/jpeg');
    } catch (e) { return src; }   // si no se puede leer, se conserva la ruta (img/pX.jpg)
  };
  const exportBackup = async list => {
    const productos = [];
    for (const p of list) productos.push({ ...p, imgs: await Promise.all(p.imgs.map(toDataURL)) });
    return JSON.stringify({ app: 'catalogo-distribuidora', version: 1, exportado: new Date().toISOString(), productos }, null, 1);
  };
  const parseBackup = text => {
    let d; try { d = JSON.parse(text); } catch (e) { throw new Error('El archivo no es un JSON válido.'); }
    const list = Array.isArray(d) ? d : d && d.productos;
    if (!Array.isArray(list)) throw new Error('No encontré productos dentro del archivo.');
    const seen = new Set(), out = [];
    list.forEach((r, k) => { const p = normalize(r || {}, k); if (p.n && p.u > 0 && !seen.has(p.id)) { seen.add(p.id); out.push(p); } });
    if (!out.length) throw new Error('El archivo no tiene productos válidos.');
    return out;
  };

  /* ---------- Paquete para publicar (.zip sin compresión) ---------- */
  const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(12, 33, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(14, 33, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + size;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, central.reduce((s, a) => s + a.length, 0), true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }
  const bytesOf = dataUrl => { const bin = atob(dataUrl.split(',')[1]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

  // Fotos nuevas (data:) → archivos img/nID-N.ext ; las que ya están en img/ se dejan igual
  const buildPublishZip = list => {
    const files = [], productos = list.map(p => ({
      ...p,
      imgs: p.imgs.map((s, k) => {
        if (!s.startsWith('data:')) return s;
        const ext = s.startsWith('data:image/png') ? 'png' : s.startsWith('data:image/webp') ? 'webp' : 'jpg';
        const name = `img/n${p.id}-${k + 1}.${ext}`;
        files.push({ name, data: bytesOf(s) });
        return name;
      })
    }));
    const json = JSON.stringify({ app: 'catalogo-distribuidora', version: 1, publicado: new Date().toISOString(), productos }, null, 1);
    files.unshift({ name: 'data/catalogo.json', data: new TextEncoder().encode(json) });
    return { blob: makeZip(files), fotos: files.length - 1 };
  };

  return { all, put, putMany, del, clear, hasLocal, markLocal, normalize, exportBackup, parseBackup, buildPublishZip };
})();
