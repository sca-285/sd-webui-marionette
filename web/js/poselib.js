// Pose library: a searchable grid of poses with preview images, sorted into
// categories, plus a tab of hand poses. User poses live in localStorage (with
// a small WebP thumbnail each); built-in thumbnails are rendered on first
// view. Poses are stored in the character's own frame (see Rig.getLocalPose),
// so they apply wherever the character stands and faces, to the whole body
// or only a region. Adult poses stay hidden until the viewer turns them on.

const KEY = 'riggedPose.poseLib.v1';
const PREFS = 'riggedPose.poseLibPrefs.v1';

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
};
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS)) || {}; } catch { return {}; } };

export class PoseLibrary {
  // opts: { root (element), builtins: () => [{id, name, tags, cat, adult}], categories: [[id, label]],
  //         builtinPose(id) -> {pose, thumb}, capture() -> {pose, thumb}, applyPose(pose, region, mirror, withProps),
  //         hands: () => [{id, name, tags}], handThumb(id), applyHand(id, sides), toast }
  constructor(opts) {
    Object.assign(this, opts);
    this.cache = new Map(); // builtin id -> {pose, thumb}
    this.handCache = new Map();
    this.prefs = { cat: 'all', adult: false, ...loadPrefs() };
    this.root.innerHTML = `
      <div class="pl-head">
        <b>Pose library</b>
        <input class="pl-search" type="search" placeholder="Search name or tag…">
        <label class="pl-body-only">Apply to <select class="pl-region">
          <option value="all">Whole body</option><option value="upper">Upper body</option><option value="lower">Lower body</option>
          <option value="arms">Arms + hands</option><option value="hands">Hands only</option><option value="head">Head + neck</option>
        </select></label>
        <label class="pl-hand-only">Hand <select class="pl-sides">
          <option value="right">Right</option><option value="left">Left</option><option value="both">Both</option>
        </select></label>
        <label class="check"><input class="pl-mirror" type="checkbox"> Mirrored</label>
        <label class="check pl-body-only" title="Poses made with a weapon, an object or a seat bring it along"><input class="pl-props" type="checkbox" checked> With props</label>
        <label class="check" title="Show the adult (18+) category"><input class="pl-adult" type="checkbox"> 18+</label>
        <button class="pl-save pl-body-only" title="Save the active character's pose with a preview">Save current pose…</button>
        <button class="pl-export pl-body-only" title="Download your poses as a .json file">Export</button>
        <label class="btn pl-body-only" title="Add poses from a .json file">Import<input class="pl-import" type="file" accept=".json,application/json" hidden></label>
        <button class="pl-close" title="Close (Esc)">✕</button>
      </div>
      <div class="pl-cats"></div>
      <div class="pl-grid"></div>`;
    const $ = (c) => this.root.querySelector(c);
    this.grid = $('.pl-grid');
    this.cats = $('.pl-cats');
    this.search = $('.pl-search');
    this.region = $('.pl-region');
    this.sides = $('.pl-sides');
    this.mirror = $('.pl-mirror');
    this.withProps = $('.pl-props');
    this.adult = $('.pl-adult');
    this.adult.checked = !!this.prefs.adult;
    this.search.addEventListener('input', () => this.render());
    this.adult.addEventListener('change', () => {
      this.prefs.adult = this.adult.checked;
      if (!this.prefs.adult && this.prefs.cat === 'adult') this.prefs.cat = 'all';
      this.savePrefs();
      this.render();
    });
    $('.pl-close').addEventListener('click', () => this.close());
    $('.pl-save').addEventListener('click', () => this.saveCurrent());
    $('.pl-export').addEventListener('click', () => this.export());
    $('.pl-import').addEventListener('change', (e) => this.import(e));
    this.root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.close(); } });
  }

  savePrefs() { try { localStorage.setItem(PREFS, JSON.stringify(this.prefs)); } catch { /* ignore */ } }

  get isOpen() { return !this.root.hidden; }

  open() {
    this.root.hidden = false;
    this.render();
    this.search.focus();
  }

  close() { this.root.hidden = true; }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  saveCurrent() {
    const name = prompt('Name for this pose:', `Pose ${load().length + 1}`);
    if (!name) return;
    const tags = (prompt('Tags (comma separated, optional):', '') || '').split(',').map((t) => t.trim()).filter(Boolean);
    const { pose, thumb } = this.capture();
    const list = load();
    list.unshift({ id: 'u' + Date.now().toString(36), name: name.trim(), tags, pose, thumb, created: Date.now() });
    if (!save(list)) { this.toast?.('Browser storage is full: export and delete some poses', true); return; }
    this.prefs.cat = 'mine';
    this.render();
    this.toast?.(`Saved "${name.trim()}"`);
  }

  remove(id) {
    const list = load().filter((p) => p.id !== id);
    save(list);
    this.render();
  }

  export() {
    const blob = new Blob([JSON.stringify({ format: 'marionette-poses', v: 1, poses: load() })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'marionette-poses.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async import(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const incoming = (data.poses || data).filter((p) => p?.pose?.bones);
      const list = load();
      const ids = new Set(list.map((p) => p.id));
      for (const p of incoming) list.push(ids.has(p.id) ? { ...p, id: 'u' + Math.random().toString(36).slice(2) } : p);
      save(list);
      this.render();
      this.toast?.(`Imported ${incoming.length} pose(s)`);
    } catch (err) {
      this.toast?.('Could not import: ' + err.message, true);
    }
  }

  use(pose) {
    this.applyPose(pose, this.region.value, this.mirror.checked, this.withProps.checked);
  }

  useHand(id) {
    const s = this.sides.value;
    const sides = s === 'both' ? ['left', 'right'] : [this.mirror.checked ? (s === 'left' ? 'right' : 'left') : s];
    this.applyHand(id, sides);
  }

  card(item, kind) {
    const el = document.createElement('div');
    el.className = 'pl-card' + (kind === 'hand' ? ' hand' : '');
    el.title = item.tags?.length ? `${item.name} · ${item.tags.join(', ')}` : item.name;
    const img = document.createElement('img');
    img.alt = item.name;
    if (item.thumb) img.src = item.thumb;
    const label = document.createElement('span');
    label.textContent = item.name;
    el.append(img, label);
    if (kind === 'mine') {
      const del = document.createElement('button');
      del.className = 'pl-del';
      del.textContent = '×';
      del.title = 'Delete this pose';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${item.name}"?`)) this.remove(item.id);
      });
      el.append(del);
    } else if (item.badge) {
      const b = document.createElement('i');
      b.textContent = item.badge;
      el.append(b);
    }
    el.addEventListener('click', () => {
      if (kind === 'hand') return this.useHand(item.id);
      const data = kind === 'builtin' ? this.builtinData(item.id) : item;
      if (data?.pose) this.use(data.pose);
    });
    return { el, img };
  }

  builtinData(id) {
    if (!this.cache.has(id)) this.cache.set(id, this.builtinPose(id));
    return this.cache.get(id);
  }

  handData(id) {
    if (!this.handCache.has(id)) this.handCache.set(id, this.handThumb(id));
    return this.handCache.get(id);
  }

  categoryList() {
    const cats = [['all', 'All'], ['mine', 'My poses'], ...this.categories];
    if (this.prefs.adult) cats.push(['adult', '18+ Adult']);
    cats.push(['hands', 'Hand poses']);
    return cats;
  }

  renderCats(counts) {
    this.cats.innerHTML = '';
    for (const [id, label] of this.categoryList()) {
      const b = document.createElement('button');
      b.className = 'pl-cat' + (this.prefs.cat === id ? ' on' : '');
      b.textContent = counts[id] !== undefined ? `${label} ${counts[id]}` : label;
      b.addEventListener('click', () => { this.prefs.cat = id; this.savePrefs(); this.render(); });
      this.cats.append(b);
    }
  }

  render() {
    const q = this.search.value.trim().toLowerCase();
    const match = (p) => !q || p.name.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q));
    const adultOn = this.prefs.adult;
    if (!this.categoryList().some(([id]) => id === this.prefs.cat)) this.prefs.cat = 'all';
    const cat = this.prefs.cat;
    const all = this.builtins().filter((p) => adultOn || !p.adult);
    const mine = load().filter(match);
    const hands = this.hands().filter(match);
    const counts = { all: all.length, mine: load().length, hands: this.hands().length };
    for (const p of all) counts[p.cat] = (counts[p.cat] || 0) + 1;
    this.renderCats(counts);
    this.root.classList.toggle('hands-tab', cat === 'hands');
    this.grid.innerHTML = '';
    const heading = (t) => {
      const h = document.createElement('div');
      h.className = 'pl-sec';
      h.textContent = t;
      this.grid.append(h);
    };
    const pending = [];
    const add = (p, kind) => {
      const c = this.card(p, kind);
      this.grid.append(c.el);
      if (kind === 'builtin') {
        if (this.cache.has(p.id)) c.img.src = this.cache.get(p.id).thumb;
        else pending.push(() => { c.img.src = this.builtinData(p.id).thumb; });
      } else if (kind === 'hand') {
        if (this.handCache.has(p.id)) c.img.src = this.handCache.get(p.id);
        else pending.push(() => { c.img.src = this.handData(p.id); });
      }
    };
    let shown = 0;
    if (cat === 'hands') {
      heading('Hand poses · click to apply to the chosen hand');
      hands.forEach((p) => add(p, 'hand'));
      shown = hands.length;
    } else {
      if ((cat === 'all' || cat === 'mine') && mine.length) {
        heading('My poses');
        mine.forEach((p) => add(p, 'mine'));
        shown += mine.length;
      } else if (cat === 'mine') heading('Nothing saved yet · "Save current pose…" keeps the active character\'s pose');
      if (cat !== 'mine') {
        const list = all.filter((p) => (cat === 'all' || p.cat === cat) && match(p));
        const labels = Object.fromEntries([...this.categories, ['adult', '18+ Adult']]);
        let section = null;
        for (const p of list) {
          if (p.cat !== section) { section = p.cat; heading(labels[section] || section); }
          add(p, 'builtin');
        }
        shown += list.length;
      }
    }
    if (!shown && cat !== 'mine') heading('Nothing matches');
    // Thumbnails are rendered one per frame so opening stays snappy.
    const next = () => {
      const job = pending.shift();
      if (!job || this.root.hidden) return;
      job();
      requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  }
}
