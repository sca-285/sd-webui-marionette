// Floating outliner: Characters / Environment / Props / Camera, Blender-style.
// Pure view: all state lives in main.js and is read through `api` on refresh.

const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c7 0 11 7 11 7a17 17 0 0 1-3.2 3.9M6.2 6.2C3.1 8.1 1 12 1 12s4 7 11 7a10 10 0 0 0 5.8-1.8"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="3"/><path d="M12 9v7M7 12h10M12 16l-4 6M12 16l4 6"/></svg>',
  cube: '<svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>',
  house: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-6h6v6"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="15" height="12" rx="2"/><path d="M17 11l5-3v10l-5-3"/></svg>',
};

export class Outliner {
  constructor(el, api) {
    this.el = el;
    this.api = api;
    this.collapsed = { };
    this.pending = false;
    el.innerHTML = `
      <div class="ol-head"><span class="ol-title">Outliner</span><button class="ol-min" title="Collapse">–</button></div>
      <div class="ol-body"></div>`;
    this.body = el.querySelector('.ol-body');
    this.menu = document.createElement('div');
    this.menu.className = 'ol-menu';
    this.menu.hidden = true;
    document.body.append(this.menu);
    document.addEventListener('pointerdown', (e) => { if (!this.menu.contains(e.target)) this.menu.hidden = true; });
    el.querySelector('.ol-min').addEventListener('click', () => {
      el.classList.toggle('min');
      api.onLayout?.({ min: el.classList.contains('min') });
    });
    this._drag(el.querySelector('.ol-head'));
  }

  _drag(handle) {
    let start = null;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      start = { x: e.clientX, y: e.clientY, l: this.el.offsetLeft, t: this.el.offsetTop };
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!start) return;
      const p = this.el.parentElement;
      const l = Math.max(0, Math.min(p.clientWidth - this.el.offsetWidth, start.l + e.clientX - start.x));
      const t = Math.max(0, Math.min(p.clientHeight - 40, start.t + e.clientY - start.y));
      Object.assign(this.el.style, { left: l + 'px', top: t + 'px' });
    });
    handle.addEventListener('pointerup', () => {
      if (start) this.api.onLayout?.({ left: this.el.offsetLeft, top: this.el.offsetTop });
      start = null;
    });
  }

  place({ left, top, min } = {}) {
    if (left !== undefined) Object.assign(this.el.style, { left: left + 'px', top: top + 'px' });
    this.el.classList.toggle('min', !!min);
  }

  refresh() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this._render(); });
  }

  _section(key, title, icon, items, addBtn) {
    const sec = document.createElement('div');
    sec.className = 'ol-sec';
    const head = document.createElement('div');
    head.className = 'ol-sec-head';
    head.innerHTML = `<span class="ol-caret">${this.collapsed[key] ? '▸' : '▾'}</span><span class="ol-ico">${icon}</span><span>${title}</span><span class="ol-count">${items.length}</span>`;
    head.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      this.collapsed[key] = !this.collapsed[key];
      this._render();
    });
    if (addBtn) {
      const b = document.createElement('button');
      b.className = 'ol-btn';
      b.title = addBtn.title;
      b.innerHTML = ICON.plus;
      b.addEventListener('click', addBtn.fn);
      head.append(b);
    }
    sec.append(head);
    if (!this.collapsed[key]) items.forEach((it) => sec.append(this._row(it)));
    return sec;
  }

  _row(it) {
    const row = document.createElement('div');
    row.className = 'ol-row' + (it.active ? ' active' : '') + (it.selected ? ' selected' : '') + (it.visible === false ? ' hidden-item' : '');
    row.title = it.hint || '';
    const swatch = it.color ? `<span class="ol-dot" style="background:${it.color}"></span>` : '<span class="ol-dot none"></span>';
    row.innerHTML = `${swatch}<span class="ol-name"></span>`;
    row.querySelector('.ol-name').textContent = it.name;
    row.addEventListener('click', (e) => { if (!e.target.closest('button')) it.onSelect?.(e.shiftKey || e.ctrlKey || e.metaKey); });
    row.addEventListener('dblclick', (e) => { if (!e.target.closest('button') && it.onRename) this._rename(row, it); });
    const btn = (icon, title, fn, cls = '') => {
      const b = document.createElement('button');
      b.className = 'ol-btn ' + cls;
      b.title = title;
      b.innerHTML = icon;
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });
      row.append(b);
    };
    if (it.onToggleVisible) btn(it.visible === false ? ICON.eyeOff : ICON.eye, it.visible === false ? 'Show' : 'Hide', it.onToggleVisible, it.visible === false ? 'off' : '');
    if (it.onToggleLock) btn(it.locked ? ICON.lock : ICON.unlock, it.locked ? 'Unlock' : 'Lock (not selectable in the viewport)', it.onToggleLock, it.locked ? 'on' : 'off');
    if (it.menu?.length) btn(ICON.more, 'More', (e) => this._openMenu(e, it));
    return row;
  }

  _rename(row, it) {
    this.renaming = true;
    const name = row.querySelector('.ol-name');
    const input = document.createElement('input');
    input.value = it.name;
    input.className = 'ol-input';
    name.replaceWith(input);
    input.focus();
    input.select();
    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      this.renaming = false;
      if (ok && input.value.trim() && input.value.trim() !== it.name) it.onRename(input.value.trim());
      this._render();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') done(false);
    });
    input.addEventListener('blur', () => done(true));
  }

  _openMenu(e, it) {
    this.menu.innerHTML = '';
    for (const m of it.menu) {
      const b = document.createElement('button');
      b.textContent = m.label;
      if (m.danger) b.className = 'danger';
      b.addEventListener('click', () => { this.menu.hidden = true; m.fn(); });
      this.menu.append(b);
    }
    this.menu.hidden = false;
    const r = e.currentTarget.getBoundingClientRect();
    const w = 170;
    Object.assign(this.menu.style, { left: Math.min(window.innerWidth - w - 8, r.right - w) + 'px', top: r.bottom + 2 + 'px', width: w + 'px' });
  }

  _render() {
    if (this.renaming) return; // re-rendered when the rename finishes
    const a = this.api;
    this.body.innerHTML = '';
    const chars = a.characters();
    this.body.append(this._section('chars', 'Characters', ICON.person, chars, { title: 'Add character', fn: a.onAddCharacter }));
    const props = a.props();
    this.body.append(this._section('env', 'Environment', ICON.house, props.filter((p) => p.env)));
    this.body.append(this._section('props', 'Props', ICON.cube, props.filter((p) => !p.env), { title: 'Add prop', fn: a.onAddProp }));
    this.body.append(this._section('cam', 'Cameras', ICON.camera, a.cameras(), { title: 'Add camera (from the free view, or beside the active one)', fn: a.onAddCamera }));
  }
}
