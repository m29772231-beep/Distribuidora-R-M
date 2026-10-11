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

  /* ---------- Archivos a publicar (los usan el .zip y la publicación con GitHub) ---------- */
  const extOf = s => s.startsWith('data:image/png') ? 'png' : s.startsWith('data:image/webp') ? 'webp' : 'jpg';
  const shortHash = async s => {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(b)].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (let i = 0; i < s.length; i += 7) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(16).padStart(8, '0');
  };
  // Fotos nuevas (data:) → archivos img/nID-N-hash.ext ; las que ya están en img/ se dejan igual.
  // El nombre incluye una huella de la foto: si la foto no cambia, no se vuelve a subir.
  async function prepare(list) {
    const images = [], productos = [];
    for (const p of list) {
      const imgs = [];
      for (let k = 0; k < p.imgs.length; k++) {
        const s = p.imgs[k];
        if (!s.startsWith('data:')) { imgs.push(s); continue; }
        const path = `img/n${p.id}-${k + 1}-${await shortHash(s)}.${extOf(s)}`;
        images.push({ path, dataUrl: s }); imgs.push(path);
      }
      productos.push({ ...p, imgs });
    }
    const json = JSON.stringify({ app: 'catalogo-distribuidora', version: 1, productos }, null, 1);
    return { images, json };
  }
  const buildPublishZip = async list => {
    const { images, json } = await prepare(list);
    const files = [{ name: 'data/catalogo.json', data: new TextEncoder().encode(json) }, ...images.map(i => ({ name: i.path, data: bytesOf(i.dataUrl) }))];
    return { blob: makeZip(files), fotos: images.length };
  };

  /* ---------- Publicar con GitHub (API de tu propio repositorio, sin servidor) ---------- */
  const GH_KEY = 'catalogo_github';
  const ghGet = () => { try { return JSON.parse(localStorage.getItem(GH_KEY) || 'null'); } catch (e) { return null; } };
  const ghSet = c => c ? localStorage.setItem(GH_KEY, JSON.stringify(c)) : localStorage.removeItem(GH_KEY);
  const ghGuess = () => {     // si la página está en GitHub Pages, se deduce usuario y repositorio de la dirección
    const m = location.hostname.match(/^([^.]+)\.github\.io$/), repo = location.pathname.split('/')[1] || '';
    return { owner: m ? m[1] : '', repo: m && repo && !repo.includes('.') ? repo : '' };
  };
  const ghErr = (status, msg) => {
    const m = { 0: 'No hay conexión con GitHub. Revisá tu internet.',
      401: 'El token no es válido o ya venció. Creá uno nuevo.',
      403: 'GitHub no permitió la operación. Revisá que el token tenga el permiso "Contents: Read and write" sobre este repositorio.',
      404: 'No encontré el repositorio o la rama, o el token no tiene acceso a ese repositorio.',
      409: 'GitHub tuvo un conflicto. Probá de nuevo.', 422: 'GitHub rechazó los cambios (conflicto). Probá de nuevo.' };
    const e = new Error(m[status] || `Error de GitHub (${status}). ${msg || ''}`.trim()); e.status = status; return e;
  };
  async function gh(cfg, path, opt = {}) {
    let r;
    try {
      r = await fetch('https://api.github.com' + path, { method: opt.method || 'GET', body: opt.body ? JSON.stringify(opt.body) : undefined,
        headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
    } catch (e) { throw ghErr(0); }
    if (!r.ok) { let msg = ''; try { msg = (await r.json()).message || ''; } catch (e) {} throw ghErr(r.status, msg); }
    return r.json();
  }
  async function ghTest(cfg) {
    const base = `/repos/${cfg.owner}/${cfg.repo}`;
    const me = await gh(cfg, '/user');                       // 401 aquí = la clave no es válida
    let repo;
    try { repo = await gh(cfg, base); }
    catch (e) {
      if (e.status === 404) { const x = new Error(`El token es válido (usuario ${me.login}), pero no encuentro el repositorio «${cfg.owner}/${cfg.repo}». Revisá cómo está escrito y que el token tenga acceso a ese repositorio (Repository access).`); x.status = 404; throw x; }
      throw e;
    }
    if (repo.permissions && repo.permissions.push === false) throw new Error('El token solo puede leer. Necesita el permiso "Contents: Read and write" (o el alcance "public_repo" si es un token clásico).');
    try { await gh(cfg, `${base}/git/ref/heads/${cfg.branch}`); }
    catch (e) { if (e.status === 404) throw new Error(`No encuentro la rama «${cfg.branch}». Revisá el nombre de la rama (normalmente es «main»).`); throw e; }
    return me.login;
  }

  // Un solo commit con las fotos nuevas y data/catalogo.json (GitHub Pages se actualiza solo)
  async function ghPublish(cfg, list, progress = () => {}, retry = true) {
    const base = `/repos/${cfg.owner}/${cfg.repo}`, { images, json } = await prepare(list);
    progress('Conectando con GitHub…');
    const headSha = (await gh(cfg, `${base}/git/ref/heads/${cfg.branch}`)).object.sha;
    const treeSha = (await gh(cfg, `${base}/git/commits/${headSha}`)).tree.sha;
    const have = new Map((await gh(cfg, `${base}/git/trees/${treeSha}?recursive=1`)).tree.map(x => [x.path, x.sha]));
    const fresh = images.filter(i => !have.has(i.path)), entries = [];
    let n = 0;
    for (const im of fresh) {
      progress(`Subiendo fotos (${++n} de ${fresh.length})…`);
      const b = await gh(cfg, `${base}/git/blobs`, { method: 'POST', body: { content: im.dataUrl.split(',')[1], encoding: 'base64' } });
      entries.push({ path: im.path, mode: '100644', type: 'blob', sha: b.sha });
    }
    progress('Guardando el catálogo…');
    const jb = await gh(cfg, `${base}/git/blobs`, { method: 'POST', body: { content: json, encoding: 'utf-8' } });
    if (!entries.length && have.get('data/catalogo.json') === jb.sha) return { changed: false, fotos: 0 };
    entries.push({ path: 'data/catalogo.json', mode: '100644', type: 'blob', sha: jb.sha });
    const nt = await gh(cfg, `${base}/git/trees`, { method: 'POST', body: { base_tree: treeSha, tree: entries } });
    const nc = await gh(cfg, `${base}/git/commits`, { method: 'POST', body: { message: 'Actualizo el catálogo desde el administrador', tree: nt.sha, parents: [headSha] } });
    try { await gh(cfg, `${base}/git/refs/heads/${cfg.branch}`, { method: 'PATCH', body: { sha: nc.sha } }); }
    catch (e) { if (retry && e.status === 422) return ghPublish(cfg, list, progress, false); throw e; }   // alguien subió algo mientras tanto
    return { changed: true, fotos: fresh.length };
  }

  return { all, put, putMany, del, clear, hasLocal, markLocal, normalize, exportBackup, parseBackup, buildPublishZip,
           ghGet, ghSet, ghGuess, ghTest, ghPublish };
})();
