// Side panel as tabs (instead of one long column of accordions), plus a
// "find a setting" box that jumps to any control by name.
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
export const SIDE_TABS = [
  ['character', 'Model', svg('<circle cx="12" cy="7" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>')],
  ['pose', 'Pose', svg('<circle cx="12" cy="4" r="2"/><path d="M12 6v7M7 9l5 2 5-4M12 13l-4 8M12 13l5 7"/>')],
  ['props', 'Props', svg('<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>')],
  ['camera', 'Camera', svg('<rect x="2" y="7" width="15" height="12" rx="2"/><path d="M17 11l5-3v10l-5-3"/>')],
  ['light', 'Light', svg('<circle cx="12" cy="10" r="5"/><path d="M9 18h6M10 21h4M12 1v2M3.5 4.5l1.4 1.4M20.5 4.5l-1.4 1.4"/>')],
  ['output', 'Output', svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/>')],
  ['settings', 'Prefs', svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>')],
];

export function initSideTabs({ side, nav, find, results, initial = 'character', onChange }) {
  const panels = () => [...side.querySelectorAll(':scope > details[data-tab]')];
  let current = null;
  const buttons = {};
  for (const [id, label, icon] of SIDE_TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'side-tab';
    b.innerHTML = `${icon}<span>${label}</span>`;
    b.title = label;
    b.addEventListener('click', () => setTab(id));
    nav.append(b);
    buttons[id] = b;
  }
  function setTab(id) {
    if (!buttons[id]) id = 'character';
    current = id;
    for (const [k, b] of Object.entries(buttons)) b.classList.toggle('on', k === id);
    for (const d of panels()) {
      const show = d.dataset.tab === id;
      if (d.hidden !== !show && d.dataset.forceHidden !== '1') d.hidden = !show;
      // Panels of other tabs are closed too, so code that only works on open panels stays idle.
      if (show && !d.open && d.dataset.userClosed !== '1') d.open = true;
      if (!show && d.open) d.open = false;
    }
    side.scrollTop = 0;
    onChange?.(id);
  }
  // Remember panels the user collapsed inside a tab.
  for (const d of panels()) {
    d.addEventListener('toggle', () => {
      if (d.dataset.tab === current && !d.hidden) d.dataset.userClosed = d.open ? '0' : '1';
    });
  }

  // ---- find a setting
  const tabLabel = Object.fromEntries(SIDE_TABS.map(([id, l]) => [id, l]));
  const textOf = (el) => (el.matches('label') ? [...el.childNodes].filter((n) => n.nodeType === 3 || n.matches?.('span,b')).map((n) => n.textContent).join(' ') : el.textContent)
    .replace(/\s+/g, ' ').trim();
  const index = () => [...side.querySelectorAll('details[data-tab] label, details[data-tab] button, details[data-tab] .sub, details[data-tab] > summary, details[data-tab] th')]
    .map((el) => ({ el, text: textOf(el) || el.title || '', title: el.title || '', tab: el.closest('details[data-tab]').dataset.tab }))
    .filter((x) => x.text.length > 1 && x.text.length < 80);
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let items = [];
  function show(q) {
    results.innerHTML = '';
    if (!q) { results.hidden = true; return; }
    const nq = norm(q);
    items = index().filter((x) => norm(x.text).includes(nq) || norm(x.title).includes(nq)).slice(0, 14);
    for (const [i, x] of items.entries()) {
      const r = document.createElement('button');
      r.type = 'button';
      r.className = 'find-hit' + (i === 0 ? ' on' : '');
      r.innerHTML = '<span></span><i></i>';
      r.querySelector('span').textContent = x.text;
      r.querySelector('i').textContent = tabLabel[x.tab];
      r.addEventListener('mousedown', (e) => { e.preventDefault(); go(x); });
      results.append(r);
    }
    if (!items.length) results.innerHTML = '<div class="find-none">No setting matches</div>';
    results.hidden = false;
  }
  function go(x) {
    setTab(x.tab);
    for (let d = x.el.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
    x.el.hidden = false;
    x.el.scrollIntoView({ block: 'center' });
    const target = x.el.matches('label, .sub, summary, th') ? x.el : x.el;
    target.classList.add('find-flash');
    setTimeout(() => target.classList.remove('find-flash'), 1400);
    const input = x.el.matches('label') ? x.el.querySelector('input, select') : null;
    (input || x.el).focus?.({ preventScroll: true });
    find.value = '';
    show('');
  }
  find.addEventListener('input', () => show(find.value.trim()));
  find.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { find.value = ''; show(''); find.blur(); }
    if (e.key === 'Enter' && items[0]) go(items[0]);
  });
  find.addEventListener('blur', () => setTimeout(() => show(''), 150));

  setTab(initial);
  return { setTab, get current() { return current; } };
}
