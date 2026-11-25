import { Scene, Tween, ease } from './scene.js';
import { LOOKS } from './looks.js';
import { sound } from './sound.js';
let LOOK, PERSON, ITEMS, RING_EXTRAS, CATEGORIES, RIBBONS, PARTICLES, byId, ORDER;
function setLook(id) {
  LOOK = LOOKS[id];
  ({ PERSON, ITEMS, CATEGORIES, RIBBONS, PARTICLES } = LOOK);
  RING_EXTRAS = LOOK.RING_EXTRAS || [];
  byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  ORDER = LOOK.order;
}
setLook('city');
const ALL = Object.fromEntries(Object.values(LOOKS).flatMap(l => l.ITEMS.map(i => [i.id, i])));
const thumbOf = id => (ALL[id] && ALL[id].poster) || `media/${id}.webp`;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const money = n => '$' + n.toLocaleString('en-US');

const state = { mode: 'desktop', S: 1, focus: null, look: false, filter: null, hover: null, cart: [], introDone: false, playing: true };
try { const c = JSON.parse(localStorage.getItem('a-floating-cart') || '[]'); if (Array.isArray(c)) state.cart = c; } catch {}

// ------------------------------------------------------------------ scene
const shell = $('#shell');
let scene;
try {
  scene = new Scene($('#gl'), { pool: $('#videoPool'), paper: [0.973, 0.966, 0.952] });
} catch (e) {
  $('#fallback').hidden = false; $('#gl').hidden = true;
  console.warn('WebGL2 unavailable, showing still image', e);
}

let layers = {};      // id -> layer
let extraLayers = []; // ring extras etc.

function wantMask(L, url) {
  const img = new Image();
  img.onload = () => {
    const w = 96, h = Math.max(8, Math.round(96 * img.naturalHeight / img.naturalWidth));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data; const a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
    L.mask = { w, h, data: a };
  };
  img.src = url;
}

function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function driftFor(i, k = 1) {
  const r = rnd(i * 7 + 3);
  const tau = Math.PI * 2;
  return { ax: (2.4 + r() * 2.6) * k, ay: (6 + r() * 5) * k, ar: (0.8 + r() * 1.1) * k, as: 0.006 * k,
    tx: 7.5 + r() * 4, ty: 6.2 + r() * 3.4, tr: 8 + r() * 4.5, ts: 9 + r() * 4,
    p1: r() * tau, p2: r() * tau, p3: r() * tau, p4: r() * tau, p5: r() * tau, p6: r() * tau };
}

function buildScene() {
  if (!scene) return;
  // background paper
  if (!layers.bg) layers.bg = scene.add({ id: 'bg', tex: scene.image('assets/bg.jpg', false), mode: 2, x: 768, y: 512, w: 1536 * 1.06, h: 1024 * 1.06, z: 0, depth: 0.25 });
  // ribbons
  RIBBONS.forEach((r, i) => {
    const L = scene.add(Object.assign({}, r, { id: 'ribbon-' + i, src: scene.video(r.src, r.poster), mode: 0, noHit: true,
      drift: Object.assign(driftFor(40 + i, 0.6), r.drift || {}) }));
    layers['ribbon-' + i] = L;
  });
  // particles (static sprites with their own slow spin and bob)
  PARTICLES.forEach((p, i) => {
    const L = scene.add(Object.assign({}, p, { id: 'pt' + i, tex: scene.image(p.img || 'assets/particles.png'), mode: 1, noHit: true,
      drift: Object.assign(driftFor(80 + i, 1.2), { ar: 6 + (i % 4) * 3, tr: 9 + (i % 5) * 2 }) }));
    layers['pt' + i] = L;
  });
  // person: idle loop + the "turn to camera" loop used while her look is open
  const P = scene.add(Object.assign({}, PERSON, { id: 'person', src: scene.video(PERSON.src, PERSON.poster), drift: Object.assign(driftFor(5, 1), PERSON.drift, { p1: .4, p2: 1.3, p3: 2.2, p4: .7, p5: 1.1, p6: 0 }) }));
  P.itemId = 'person'; layers.person = P; wantMask(P, PERSON.poster);
  const PF = scene.add(Object.assign({}, PERSON, { id: 'person-focus', itemId: 'person', z: PERSON.z + .5, src: null, tex: null, noHit: true, drift: P.drift }));
  PF.vis.set(0, 0); layers.personFocus = PF;
  // products
  ITEMS.forEach((it, i) => {
    const media = it.src || `media/${it.id}.mp4`, poster = it.poster || `media/${it.id}.webp`;
    const L = scene.add({ id: it.id, itemId: it.id, src: scene.video(media, poster, !it.onPerson), mode: 0, x: it.x, y: it.y, w: it.w, h: it.h, z: it.z, depth: it.depth,
      rot: it.rot || 0, drift: driftFor(i + 11), noHit: !!it.onPerson });
    if (it.onPerson) { L.vis.set(0, 0); L.drift = driftFor(i + 11, .6); L.extraScale = .35; L.src.keepPaused = true; }
    layers[it.id] = L;
    if (!it.onPerson) wantMask(L, poster);
  });
  // two more live rings for the "Rings" bracket — same decoded video, no extra cost
  RING_EXTRAS.forEach((r, i) => {
    const L = scene.add(Object.assign({ id: 'ring-x' + i, itemId: 'ring', src: layers.ring.src, mode: 0, drift: driftFor(30 + i, 1.1) }, r));
    extraLayers.push(L); wantMask(L, byId.ring ? 'media/ring.webp' : '');
  });
}

// ------------------------------------------------------------------ labels + leader lines
let labelEls = {}, leaderEls = {};
function buildLabels() {
  const svg = $('#leaders'), box = $('#labels');
  const NS = 'http://www.w3.org/2000/svg';
  for (const it of ITEMS) {
    const b = document.createElement('button');
    b.className = 'label'; b.textContent = it.label; b.dataset.id = it.id;
    b.setAttribute('aria-label', `${it.label} — ${it.title}, ${money(it.price)}`);
    b.addEventListener('click', e => { e.stopPropagation(); focusItem(it.id); });
    b.addEventListener('pointerenter', () => setHover(it.id));
    b.addEventListener('pointerleave', () => setHover(null));
    b.addEventListener('focus', () => setHover(it.id));
    b.addEventListener('blur', () => setHover(null));
    box.appendChild(b); labelEls[it.id] = b;
    const g = document.createElementNS(NS, 'g');
    const path = document.createElementNS(NS, 'path');
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '2');
    g.append(path, dot); svg.appendChild(g);
    leaderEls[it.id] = { g, path, dot };
  }
}

function corner(x0, y0, x1, y1, first, r = 7) {
  // polyline with one rounded elbow: first = 'h' (horizontal then vertical) or 'v'
  const dx = x1 - x0, dy = y1 - y0;
  if (Math.abs(dx) < 1.5 || Math.abs(dy) < 1.5) return `M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`;
  const rr = Math.min(r, Math.abs(dx) / 2, Math.abs(dy) / 2), sx = Math.sign(dx), sy = Math.sign(dy);
  if (first === 'h') return `M${x0.toFixed(1)},${y0.toFixed(1)}H${(x1 - sx * rr).toFixed(1)}Q${x1.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${(y0 + sy * rr).toFixed(1)}V${y1.toFixed(1)}`;
  return `M${x0.toFixed(1)},${y0.toFixed(1)}V${(y1 - sy * rr).toFixed(1)}Q${x0.toFixed(1)},${y1.toFixed(1)} ${(x0 + sx * rr).toFixed(1)},${y1.toFixed(1)}H${x1.toFixed(1)}`;
}

function updateLabels() {
  if (!scene) return;
  const S = scene.S, gap = 7.5 * S;
  for (const it of ITEMS) {
    const L = layers[it.id]; if (!L || !L._tr && !it.onPerson) continue;
    const d = scene.project(it.dot[0], it.dot[1], 1);
    let a;
    if (it.onPerson) {
      const P = layers.person; const tr = P._tr || scene.transform(P);
      const u = (it.anchorDesign[0] - (P.x - P.w / 2)) / P.w, v = (it.anchorDesign[1] - (P.y - P.h / 2)) / P.h;
      a = scene.point(P, u, v, tr);
    } else a = scene.point(L, it.anchor[0], it.anchor[1], L._tr);
    const lab = labelEls[it.id];
    const tx = it.side === 'left' ? `translate(${(d.x - gap).toFixed(1)}px, ${d.y.toFixed(1)}px) translate(-100%, -50%)` : `translate(${(d.x + gap).toFixed(1)}px, ${d.y.toFixed(1)}px) translate(0, -50%)`;
    if (lab._tx !== tx) { lab.style.transform = tx; lab._tx = tx; }
    const le = leaderEls[it.id];
    let p;
    if (it.path === 'bracket') {
      const bx = d.x + 17 * S;
      const pts = extraLayers.map(E => scene.point(E, 0.92, 0.5, E._tr || scene.transform(E)));
      const top = Math.min(...pts.map(q => q.y)), bot = Math.max(...pts.map(q => q.y));
      p = `M${d.x.toFixed(1)},${d.y.toFixed(1)}H${bx.toFixed(1)}M${bx.toFixed(1)},${top.toFixed(1)}V${bot.toFixed(1)}` +
          pts.map(q => `M${bx.toFixed(1)},${q.y.toFixed(1)}H${(q.x + 3 * S).toFixed(1)}`).join('');
    } else p = corner(d.x, d.y, a.x, a.y, it.path === 'vh' ? 'v' : 'h', 7 * S);
    if (le._p !== p) { le.path.setAttribute('d', p); le._p = p; }
    le.dot.setAttribute('cx', d.x.toFixed(1)); le.dot.setAttribute('cy', d.y.toFixed(1));
  }
}

// ------------------------------------------------------------------ layout
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const portrait = vw < 760 || vw / vh < 0.92;
  state.mode = portrait ? 'portrait' : 'desktop';
  document.body.classList.toggle('is-portrait', portrait);
  if (!portrait) {
    state.S = Math.min(vw / 1536, vh / 1024);
    document.documentElement.style.fontSize = (10 * state.S) + 'px';
  } else {
    document.documentElement.style.fontSize = clamp(vw / 41, 8.2, 11) + 'px';
  }
  const r = shell.getBoundingClientRect();
  $('#leaders').setAttribute('viewBox', `0 0 ${r.width.toFixed(0)} ${r.height.toFixed(0)}`);
  if (!scene) return;
  if (!portrait) {
    scene.resize(r.width, r.height, state.S);
    scene.origin = { x: r.width / 2, y: r.height / 2 }; scene.home = { x: 768, y: 512 };
  } else {
    const heroBottom = $('#hero').getBoundingClientRect().bottom - r.top + 6;
    const availH = Math.max(200, r.height - heroBottom - 4);
    const S = Math.min(r.width / 1000, availH / 905);
    state.S = S;
    scene.resize(r.width, r.height, S);
    scene.origin = { x: r.width / 2, y: heroBottom + availH / 2 }; scene.home = { x: 805, y: 560 };
  }
  if (!state.focus && !state.look && !state.filter) homeCamera(0);
  else if (state.focus) frameItem(state.focus, 0);
}
addEventListener('resize', () => layout());

function homeCamera(d = 1250) {
  scene.cam.x.set(scene.home.x, d, ease.inOutCubic); scene.cam.y.set(scene.home.y, d, ease.inOutCubic); scene.cam.z.set(1, d, ease.inOutCubic);
}

// ------------------------------------------------------------------ hover / hit
function setHover(id) {
  if (state.hover === id) return;
  state.hover = id;
  if (id) sound.play('hover');
  for (const it of ITEMS) {
    const on = id === it.id;
    labelEls[it.id].classList.toggle('is-hot', on || (state.filter && CATEGORIES[state.filter].ids.includes(it.id)));
    leaderEls[it.id].g.classList.toggle('is-hot', on || (state.filter && CATEGORIES[state.filter].ids.includes(it.id)));
    const L = layers[it.id]; if (L && !it.onPerson) L.hover.set(on ? 1 : 0, 450, ease.outCubic);
  }
  extraLayers.forEach(E => E.hover.set(id === 'ring' ? 1 : 0, 450, ease.outCubic));
  if (layers.person) layers.person.hover.set(id === 'person' ? 0.25 : 0, 600, ease.outCubic);
  shell.style.cursor = id ? 'pointer' : '';
}

function pointerPos(e) { const r = shell.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, r }; }
function overUI(e) { return !!e.target.closest('.ui, .panel, .header, .label, .close-focus, .drawer'); }
shell.addEventListener('pointermove', e => {
  if (!scene) return;
  const p = pointerPos(e);
  scene.mouse.tx = clamp((p.x / p.r.width - .5) * 2, -1, 1); scene.mouse.ty = clamp((p.y / p.r.height - .5) * 2, -1, 1);
  if (e.pointerType === 'touch' || overUI(e)) { if (!e.target.closest('.label')) setHover(null); return; }
  const L = scene.hit(p.x, p.y);
  setHover(L ? (L.itemId === 'person' && onNecklace(p.x, p.y) ? 'necklace' : L.itemId) : null);
});
shell.addEventListener('pointerleave', () => { if (scene) { scene.mouse.tx = 0; scene.mouse.ty = 0; } setHover(null); });
shell.addEventListener('click', e => {
  if (!scene || overUI(e) || !state.introDone) return;
  const p = pointerPos(e);
  const L = scene.hit(p.x, p.y);
  if (L && L.itemId === 'person') {
    if (onNecklace(p.x, p.y)) { focusItem('necklace'); return; }
    if (!state.look || state.filter) openLook();
    return;
  }
  if (L && L.itemId) { focusItem(L.itemId); return; }
  if (state.focus || state.look || state.filter) closeAll();
});
function onNecklace(x, y) {
  const it = byId.necklace, P = layers.person; if (!it || !P) return false;
  const u = (it.hitDesign[0] - (P.x - P.w / 2)) / P.w, v = (it.hitDesign[1] - (P.y - P.h / 2)) / P.h;
  const c = scene.point(P, u, v);
  const r = it.hitDesign[2] * scene.S * scene.view(P.depth).z;
  return (x - c.x) ** 2 + (y - c.y) ** 2 < r * r;
}

// ------------------------------------------------------------------ focus
function itemBase(id) { const it = byId[id]; return it.onPerson ? { x: it.focusX, y: it.focusY } : { x: it.x, y: it.y }; }

function frameItem(id, dur = 1300) {
  const it = byId[id];
  const S = scene.S;
  const b = itemBase(id);
  const size = Math.max(it.w, it.h);
  const z = clamp((state.mode === 'portrait' ? 420 : 330) / size, 1.18, it.onPerson ? 1.9 : 2.65);
  const target = state.mode === 'portrait' ? { x: scene.W * .5, y: scene.H * .3 } : { x: scene.W * .37, y: scene.H * .52 };
  const cx = b.x - (target.x - scene.origin.x) / (S * z);
  const cy = b.y - (target.y - scene.origin.y) / (S * z);
  scene.cam.x.set(cx, dur, ease.inOutCubic); scene.cam.y.set(cy, dur, ease.inOutCubic); scene.cam.z.set(z, dur, ease.inOutCubic);
}

function setDims(keep, amount = 1, dur = 900) {
  for (const L of scene.layers) {
    if (L.id === 'bg') continue;
    const k = keep.has(L.itemId) || keep.has(L.id);
    L.dim.set(k ? 0 : amount, dur, ease.inOutCubic);
    L.focus.set(k ? 1 : 0, dur, ease.inOutCubic);
  }
}

function showNecklace(on, dur = 1300) {
  const it = byId.necklace, L = layers.necklace; if (!L) return;
  clearTimeout(showNecklace.t);
  if (on) {
    L.src.keepPaused = false; L.src.play();
    L.vis.set(1, 700, ease.outCubic);
    animateTo(L, { x: it.focusX, y: it.focusY, s: 1 }, dur);
  } else {
    animateTo(L, { x: it.x, y: it.y, s: .35 }, dur * .8);
    L.vis.set(0, dur * .7, ease.inOutCubic);
    showNecklace.t = setTimeout(() => { L.src.keepPaused = true; L.src.pause(); }, dur);
  }
}
function animateTo(L, to, dur) {
  const from = { x: L.x, y: L.y, s: L.extraScale }, t0 = performance.now();
  L._anim = { from, to, t0, dur };
}

function focusItem(id) {
  if (!scene || !byId[id]) return;
  const it = byId[id];
  const was = state.focus;
  sound.play('select');
  state.focus = id; state.look = false; state.filter = null; syncRail();
  document.body.classList.add('is-focus');
  setHover(null);
  const keep = new Set([id]); if (id === 'ring') { keep.add('ring'); }
  if (it.onPerson) { keep.add('person'); showNecklace(true); } else if (was === 'necklace') showNecklace(false);
  personMode(false);
  setDims(keep, 1);
  frameItem(id, was ? 1150 : 1350);
  renderItemPanel(it);
  showClose(true);
}

function closeAll() {
  if (!scene) return;
  if (state.focus || state.look || state.filter) sound.play('back');
  const wasNeck = state.focus === 'necklace';
  state.focus = null; state.look = false; state.filter = null; syncRail();
  document.body.classList.remove('is-focus');
  if (wasNeck) showNecklace(false);
  personMode(false);
  setDims(new Set(), 0, 900);
  homeCamera(1250);
  hidePanel(); showClose(false);
  $$('.label').forEach(l => l.classList.remove('is-hot'));
  $('#labels').classList.remove('is-filtered'); $('#leaders').classList.remove('is-filtered');
}

function personMode(focus) {
  const P = layers.person, PF = layers.personFocus; if (!P || !PF) return;
  if (focus) {
    if (!PF.src) { PF.src = scene.video(PERSON.focusSrc, PERSON.focusPoster); }
    PF.src.keepPaused = false; P.src.keepPaused = false; PF.src.play();
    const go = () => { PF.vis.set(1, 1100, ease.inOutCubic); P.vis.set(0, 1100, ease.inOutCubic); };
    if (PF.src.texture) go(); else setTimeout(go, 250);
    clearTimeout(personMode.t);
    personMode.t = setTimeout(() => { if (state.look) { P.src.keepPaused = true; P.src.pause(); } }, 1300);
  } else if (PF.src) {
    P.src.keepPaused = false; P.src.play();
    PF.vis.set(0, 1000, ease.inOutCubic); P.vis.set(1, 1000, ease.inOutCubic);
    clearTimeout(personMode.t);
    personMode.t = setTimeout(() => { if (!state.look) { PF.src.keepPaused = true; PF.src.pause(); } }, 1200);
  }
}

function openLook(filterCat = null) {
  if (!scene) return;
  sound.play('whoosh', true, 1.3);
  state.focus = null; state.look = true; state.filter = filterCat; syncRail();
  if (layers.necklace && layers.necklace.vis.to > 0) showNecklace(false);
  document.body.classList.add('is-focus');
  setHover(null);
  if (filterCat) {
    const ids = CATEGORIES[filterCat].ids;
    const keep = new Set(ids); if (ids.includes('necklace')) keep.add('person');
    setDims(keep, 1);
    // frame the group
    const pts = ids.map(id => byId[id].onPerson ? { x: byId[id].focusX, y: byId[id].focusY, w: 120, h: 120 } : byId[id]);
    const x0 = Math.min(...pts.map(p => p.x - p.w / 2)), x1 = Math.max(...pts.map(p => p.x + p.w / 2));
    const y0 = Math.min(...pts.map(p => p.y - p.h / 2)), y1 = Math.max(...pts.map(p => p.y + p.h / 2));
    if (ids.includes('necklace')) showNecklace(true);
    const z = clamp(Math.min(560 / (x1 - x0), 520 / (y1 - y0)), 1.1, 2.2);
    const target = state.mode === 'portrait' ? { x: scene.W * .5, y: scene.H * .3 } : { x: scene.W * .37, y: scene.H * .5 };
    const cx = (x0 + x1) / 2 - (target.x - scene.origin.x) / (scene.S * z), cy = (y0 + y1) / 2 - (target.y - scene.origin.y) / (scene.S * z);
    scene.cam.x.set(cx, 1300, ease.inOutCubic); scene.cam.y.set(cy, 1300, ease.inOutCubic); scene.cam.z.set(z, 1300, ease.inOutCubic);
    personMode(false);
    renderListPanel(CATEGORIES[filterCat].label, ids, `Shop by ${CATEGORIES[filterCat].label.toLowerCase()}`);
  } else {
    setDims(new Set(['person']), .42);
    const z = state.mode === 'portrait' ? 1.05 : 1.12;
    const target = state.mode === 'portrait' ? { x: scene.W * .5, y: scene.H * .3 } : { x: scene.W * .36, y: scene.H * .53 };
    const cx = PERSON.x - (target.x - scene.origin.x) / (scene.S * z), cy = PERSON.y - 10 - (target.y - scene.origin.y) / (scene.S * z);
    scene.cam.x.set(cx, 1400, ease.inOutCubic); scene.cam.y.set(cy, 1400, ease.inOutCubic); scene.cam.z.set(z, 1400, ease.inOutCubic);
    personMode(true);
    renderListPanel(LOOK.editTitle, ORDER, LOOK.kicker);
  }
  showClose(true);
}

// ------------------------------------------------------------------ panel
const panel = $('#panel');
function showPanel(html) {
  panel.innerHTML = html; panel.hidden = false;
  panel.classList.remove('is-in'); void panel.offsetWidth;
  requestAnimationFrame(() => panel.classList.add('is-in'));
}
function hidePanel() {
  panel.classList.remove('is-in');
  clearTimeout(hidePanel.t); hidePanel.t = setTimeout(() => { if (!panel.classList.contains('is-in')) panel.hidden = true; }, 600);
}
function showClose(on) {
  const b = $('#closeFocus');
  if (on) { b.hidden = false; requestAnimationFrame(() => b.classList.add('is-in')); }
  else { b.classList.remove('is-in'); setTimeout(() => { if (!b.classList.contains('is-in')) b.hidden = true; }, 600); }
}
const ARROW = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 10h12.5M11 5l5 5-5 5"/></svg>';
function renderItemPanel(it) {
  const i = ORDER.indexOf(it.id);
  const prev = byId[ORDER[(i + ORDER.length - 1) % ORDER.length]], next = byId[ORDER[(i + 1) % ORDER.length]];
  showPanel(`
    <div class="p-top"><span>${String(i + 1).padStart(2, '0')} / ${String(ORDER.length).padStart(2, '0')} · ${it.label}</span><button class="p-x" data-act="close" aria-label="Close">×</button></div>
    <h2>${it.title}</h2>
    <div class="p-price">${money(it.price)}</div>
    <p class="p-desc">${it.desc}</p>
    <div class="p-rule"></div>
    <div class="p-color"><i style="--c:${it.color}"></i><span>${it.colorName} · One size</span></div>
    <div class="p-actions"><button class="btn-dark" data-act="add" data-id="${it.id}">${inCart(it.id) ? 'Add another' : 'Add to Cart'} ${ARROW}</button></div>
    <div class="p-nav">
      <button data-act="go" data-id="${prev.id}"><svg viewBox="0 0 20 20"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>${prev.label}</button>
      <button data-act="go" data-id="${next.id}">${next.label}<svg viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5"/></svg></button>
    </div>`);
}
function renderListPanel(title, ids, kicker) {
  const total = ids.reduce((s, id) => s + byId[id].price, 0);
  showPanel(`
    <div class="p-top"><span>${kicker}</span><button class="p-x" data-act="close" aria-label="Close">×</button></div>
    <h2>${title}</h2>
    <div class="p-price">${ids.length} piece${ids.length > 1 ? 's' : ''} · ${money(total)}</div>
    <ul class="p-list">${ids.map(id => { const it = byId[id]; return `
      <li class="row-btn" data-act="go" data-id="${id}"><span class="thumb" style="background-image:url(${thumbOf(id)})"></span>
      <span class="nm">${it.title}<small>${it.label} · ${money(it.price)}</small></span>
      <button class="add ${inCart(id) ? 'is-added' : ''}" data-act="add" data-id="${id}">${inCart(id) ? 'Added' : 'Add'}</button></li>`; }).join('')}
    </ul>
    <div class="p-actions"><button class="btn-dark" data-act="addall" data-ids="${ids.join(',')}">Add ${ids.length > 1 ? 'all ' : ''}to Cart ${ARROW}</button></div>`);
}
panel.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  e.stopPropagation();
  const act = b.dataset.act;
  if (act === 'close') closeAll();
  else if (act === 'go') focusItem(b.dataset.id);
  else if (act === 'add') { addToCart(b.dataset.id); if (b.classList.contains('add')) { b.classList.add('is-added'); b.textContent = 'Added'; } else b.innerHTML = `Add another ${ARROW}`; }
  else if (act === 'addall') { b.dataset.ids.split(',').forEach(id => { if (!inCart(id)) addToCart(id, true); }); toast('The look is in your cart.'); $$('.p-list .add').forEach(x => { x.classList.add('is-added'); x.textContent = 'Added'; }); }
});
$('#closeFocus').addEventListener('click', e => { e.stopPropagation(); closeAll(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#lightbox').hidden) closeLightbox(); else if (!$('#drawer').hidden) closeDrawer(); else if (state.focus || state.look || state.filter) closeAll(); }
  if (state.focus && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const i = ORDER.indexOf(state.focus); focusItem(ORDER[(i + (e.key === 'ArrowRight' ? 1 : ORDER.length - 1)) % ORDER.length]);
  }
});

// ------------------------------------------------------------------ rail, looks, nav
function syncRail() { $$('.rail button').forEach(b => b.classList.toggle('is-on', b.dataset.cat === state.filter)); }
$$('.rail button').forEach(b => {
  const cat = b.dataset.cat;
  b.addEventListener('pointerenter', () => {
    const ids = CATEGORIES[cat].ids;
    if (state.focus || state.look || !ids.length) return;
    $('#labels').classList.add('is-filtered'); $('#leaders').classList.add('is-filtered');
    ids.forEach(id => { labelEls[id].classList.add('is-hot'); leaderEls[id].g.classList.add('is-hot'); });
    for (const L of scene ? scene.layers : []) if (L.itemId && L.itemId !== 'person') L.dim.set(ids.includes(L.itemId) ? 0 : .38, 500, ease.outCubic);
    ids.forEach(id => layers[id] && !byId[id].onPerson && layers[id].hover.set(1, 450, ease.outCubic));
  });
  b.addEventListener('pointerleave', () => {
    const ids = CATEGORIES[cat].ids;
    if (state.focus || state.look) return;
    $('#labels').classList.remove('is-filtered'); $('#leaders').classList.remove('is-filtered');
    ITEMS.forEach(it => { labelEls[it.id].classList.remove('is-hot'); leaderEls[it.id].g.classList.remove('is-hot'); });
    for (const L of scene ? scene.layers : []) if (L.itemId && L.itemId !== 'person') L.dim.set(0, 500, ease.outCubic);
    ids.forEach(id => layers[id] && layers[id].hover.set(0, 450, ease.outCubic));
  });
  b.addEventListener('click', e => { const ids = CATEGORIES[cat].ids; e.stopPropagation(); if (!ids.length) { toast('Nothing for this area in this look.'); return; } $('#labels').classList.remove('is-filtered'); $('#leaders').classList.remove('is-filtered'); ids.length === 1 ? focusItem(ids[0]) : openLook(cat); });
});
$$('.look').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  if (LOOKS[b.dataset.look]) { if (b.dataset.look === LOOK.id) openLook(); else switchLook(b.dataset.look); return; }
  b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 380, easing: 'ease-out' });
  toast(`${b.textContent.trim().replace(/\s+/g, ' ')} is still being styled — coming soon.`);
}));
$('#shopLook').addEventListener('click', e => { e.stopPropagation(); openLook(); });
$$('.nav a').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); e.stopPropagation();
  const n = a.dataset.nav;
  if (n === 'brand') toast('A. — one person, many possibilities. A concept accessories edit.');
  else openLook();
}));
$('#logo').addEventListener('click', e => { e.preventDefault(); closeAll(); });
$('#searchBtn').addEventListener('click', e => { e.stopPropagation(); openLook(); });
$('#signinBtn').addEventListener('click', e => { e.stopPropagation(); toast('Sign-in is not part of this prototype.'); });

// ------------------------------------------------------------------ cart
function inCart(id) { return state.cart.includes(id); }
function saveCart() { try { localStorage.setItem('a-floating-cart', JSON.stringify(state.cart)); } catch {} $('#cartCount').textContent = state.cart.length; }
function addToCart(id, quiet) {
  sound.play('add');
  state.cart.push(id); saveCart();
  const c = $('#cartBtn'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  if (!quiet) toast(`${ALL[id].title} — added to your cart.`);
  if (!$('#drawer').hidden) renderDrawer();
}
function renderDrawer() {
  const counts = {}; state.cart.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const ids = Object.keys(counts);
  const total = state.cart.reduce((s, id) => s + ALL[id].price, 0);
  $('#drawerBody').innerHTML = ids.length ? ids.map(id => `<div class="row"><span class="thumb" style="background-image:url(${thumbOf(id)})"></span><span><b>${ALL[id].title}</b>${counts[id]} × ${money(ALL[id].price)}</span><button data-rm="${id}">Remove</button></div>`).join('')
    + `<div class="total"><span>Subtotal</span><span>${money(total)}</span></div><p class="note">Concept collection with illustrative prices — no payment is taken. Your cart is saved on this device.</p>`
    : '<p>Your cart is empty — tap any piece to see it in action.</p>';
}
function openDrawer() { renderDrawer(); const d = $('#drawer'); d.hidden = false; requestAnimationFrame(() => d.classList.add('is-in')); }
function closeDrawer() { const d = $('#drawer'); d.classList.remove('is-in'); setTimeout(() => { if (!d.classList.contains('is-in')) d.hidden = true; }, 450); }
$('#cartBtn').addEventListener('click', e => { e.stopPropagation(); $('#drawer').hidden ? openDrawer() : closeDrawer(); });
$('#drawerClose').addEventListener('click', closeDrawer);
$('#drawerBody').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; state.cart.splice(state.cart.indexOf(b.dataset.rm), 1); saveCart(); renderDrawer(); });
saveCart();

// ------------------------------------------------------------------ story video
function openLightbox() {
  const lb = $('#lightbox'), v = $('#storyVideo');
  if (!v.getAttribute('src')) v.src = LOOK.story.video;
  lb.hidden = false; requestAnimationFrame(() => lb.classList.add('is-in'));
  v.play().catch(() => {});
}
function closeLightbox() { const lb = $('#lightbox'); lb.classList.remove('is-in'); setTimeout(() => { lb.hidden = true; $('#storyVideo').pause(); }, 500); }
$('#watchVideo').addEventListener('click', e => { e.stopPropagation(); openLightbox(); });
$('#storyThumb').addEventListener('click', e => { e.stopPropagation(); openLightbox(); });
$('#lightboxClose').addEventListener('click', closeLightbox);
$('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('is-in'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-in'), 2600); }

// ------------------------------------------------------------------ intro: the look "comes apart" from her
function intro(soft) {
  const now = performance.now();
  if (reduced || !scene) { finishIntro(); return; }
  const P = layers.person;
  P.vis.set(0, 0); P.vis.set(1, 1100, ease.outCubic, now + 80);
  P.extraScale = .985;
  P._anim = { from: { x: P.x, y: P.y + 10, s: .985 }, to: { x: P.x, y: P.y, s: 1 }, t0: now, dur: 1600 };
  for (const L of scene.layers.filter(L => !L._dying)) {
    if (L.id.startsWith('ribbon')) { L.vis.set(0, 0); L.vis.set(1, 1800, ease.inOutCubic, now + 250); }
  }
  ITEMS.filter(i => !i.onPerson).forEach((it, i) => {
    const L = layers[it.id]; const w = it.worn;
    L.intro = { t0: now + 520 + ORDER.indexOf(it.id) * 70, d: 1750, fx: w[0], fy: w[1], fs: w[2], fr: w[3], p: 0 };
    if (it.id === 'ring' || it.id === LOOK.extrasOf) extraLayers.forEach((E, k) => { E.intro = { t0: now + 900 + k * 90, d: 1750, fx: w[0], fy: w[1], fs: .3, fr: 40, p: 0 }; });
  });
  scene.layers.filter(L => !L._dying && L.id.startsWith('pt')).forEach((L, k) => {
    L.intro = { t0: now + 700 + (k % 7) * 60, d: 2100, fx: PERSON.x + (L.x - PERSON.x) * .25, fy: 420 + (L.y - 420) * .25, fs: .2, fr: 90, p: 0 };
  });
  if (soft) setTimeout(() => { state.introDone = true; }, 1600); else setTimeout(finishIntro, 2350);
}
function finishIntro() {
  if (!finishIntro.warmed) { finishIntro.warmed = true; setTimeout(preloadLooks, 1500); }
  state.introDone = true;
  document.body.classList.remove('is-intro', 'is-loading');
}

// ------------------------------------------------------------------ switch person
let switching = false;
function switchLook(id) {
  if (switching || !scene || id === LOOK.id) return;
  sound.play('switch');
  switching = true;
  if (state.focus || state.look || state.filter) closeAll();
  $$('.look').forEach(b => { const on = b.dataset.look === id; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
  document.body.classList.add('is-switch'); state.introDone = false;
  setTimeout(() => document.body.classList.remove('is-switch'), 2300);
  const now = performance.now();
  // crossfade: the old look drifts apart and dissolves while the new one assembles at the same time
  const dying = scene.layers.filter(L => L.id !== 'bg');
  const oldSources = new Set(dying.map(L => L.src).filter(Boolean));
  for (const L of dying) {
    L._dying = true; L.noHit = true; L.z -= 100;
    L.vis.set(0, 900, ease.inOutCubic, now);
    L._anim = { from: { x: L.x, y: L.y, s: L.extraScale }, to: { x: L.x + (L.x - 780) * .09, y: L.y - 18, s: L.extraScale * 1.04 }, t0: now, dur: 1000 };
  }
  scene.layers.sort((a, b) => a.z - b.z);
  $('#labels').innerHTML = ''; $('#leaders').innerHTML = ''; labelEls = {}; leaderEls = {};
  layers = { bg: layers.bg }; extraLayers = [];
  setLook(id);
  const s = LOOK.story, st = $('#story');
  st.style.opacity = '0';
  setTimeout(() => {
    $('#story img').src = s.img; $('#story .story-index').textContent = s.index; $('#story h3').textContent = s.title;
    $('#story p').innerHTML = s.text; $('#watchVideo').lastChild.textContent = s.cta; $('#storyVideo').removeAttribute('src');
    st.style.opacity = '';
  }, 450);
  buildScene(); buildLabels(); layout();
  for (const L of scene.layers) if (!L._dying && L.src) { L.src.keepPaused = !!(byId[L.itemId] && byId[L.itemId].onPerson); if (!L.src.keepPaused) L.src.play(); }
  intro(true);
  setTimeout(() => {
    scene.layers = scene.layers.filter(L => !L._dying);
    const live = new Set(scene.layers.map(L => L.src).filter(Boolean));
    for (const src of oldSources) if (!live.has(src)) { src.keepPaused = true; src.pause(); }
    switching = false;
  }, 1100);
}

/** warm the other looks so decoders and first frames are ready before anyone clicks */
function preloadLooks() {
  if (!scene) return;
  for (const l of Object.values(LOOKS)) {
    if (l.id === LOOK.id) continue;
    const urls = [[l.PERSON.src, l.PERSON.poster], ...l.ITEMS.filter(i => !i.onPerson).map(i => [i.src || `media/${i.id}.mp4`, i.poster || `media/${i.id}.webp`]), ...l.RIBBONS.map(r => [r.src, r.poster])];
    for (const [u, p] of urls) { const s = scene.video(u, p, false); s.keepPaused = true; }
  }
}

// ------------------------------------------------------------------ main loop
function stepAnims(now) {
  for (const L of scene.layers) {
    const a = L._anim; if (!a) continue;
    const p = clamp((now - a.t0) / a.dur, 0, 1), e = ease.inOutCubic(p);
    L.x = a.from.x + (a.to.x - a.from.x) * e; L.y = a.from.y + (a.to.y - a.from.y) * e; L.extraScale = a.from.s + (a.to.s - a.from.s) * e;
    if (p >= 1) L._anim = null;
  }
}
function loop(now) {
  if (scene) {
    stepAnims(now);
    scene.frame(now);
    updateLabels();
  }
  requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
  if (!scene) return;
  if (document.hidden) scene.setPlaying(false);
  else if (!reduced) scene.setPlaying(true);
});

// ------------------------------------------------------------------ boot
document.body.classList.add('is-intro');
buildScene();
buildLabels();
layout();
if (scene) {
  scene.motion = reduced ? 0 : 1;
  if (reduced) scene.setPlaying(false);
  requestAnimationFrame(loop);
  // start once the person and most product stills are decoded (or after a short timeout)
  const need = [layers.person.src.poster, ...ITEMS.filter(i => !i.onPerson).map(i => layers[i.id].src.poster), scene.images.get('assets/bg.jpg')];
  const t0 = performance.now();
  (function wait() {
    const ready = need.filter(t => t && t.ready).length;
    if (ready >= need.length || performance.now() - t0 > 2500) { document.fonts.ready.then(() => { layout(); intro(); }); }
    else setTimeout(wait, 60);
  })();
} else finishIntro();

window.floatingLook = { scene, state, layers, focusItem, openLook, closeAll };
