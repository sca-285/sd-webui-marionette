// Follow the WebUI's colours. Gradio themes, and Lobe Theme / Lobe Theme Redux
// (which writes its antd tokens into the same Gradio variables), all expose
// --color-accent, --body-background-fill, --background-fill-secondary, ...
// so reading those from the parent page tracks whatever theme is active.
import * as THREE from 'three';

const SOURCES = {
  accent: ['--color-accent', '--button-primary-background-fill', '--primary-500'],
  bg: ['--body-background-fill', '--background-fill-primary'],
  panel: ['--background-fill-secondary', '--block-background-fill', '--background-fill-primary'],
  text: ['--body-text-color'],
  muted: ['--body-text-color-subdued', '--block-info-text-color'],
  border: ['--border-color-primary', '--block-border-color'],
  input: ['--input-background-fill', '--background-fill-primary'],
};

const probe = document.createElement('span');
probe.style.display = 'none';

// Resolve any CSS colour (including color-mix or var()) to [r, g, b] via the browser.
// Translucent colours (Lobe uses e.g. rgba(255,255,255,.06) for fills) keep
// their alpha as a 4th entry so they can be composited over the real backdrop.
function toRGB(value) {
  if (!value) return null;
  probe.style.color = '';
  probe.style.color = value.trim();
  if (!probe.style.color) return null;
  document.body.append(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  if (!m) return null;
  const [r, g, b, a] = m.map(Number);
  if (a === 0) return null;
  return a !== undefined && a < 1 ? [r, g, b, a] : [r, g, b];
}

// Flatten a possibly translucent colour over an opaque backdrop.
const over = (c, base) => (c && c.length === 4 ? mixRGB(base, c, c[3]) : c);
const mixRGB = (a, b, t) => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// Keep a surface only if text stays readable on it; otherwise derive one.
const readable = (surface, text, fallback, min = 4.5) => (surface && contrast(surface, text) >= min ? surface : fallback);

const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function readParent() {
  let doc;
  try { doc = window.parent !== window ? window.parent.document : null; } catch { doc = null; }
  if (!doc) return null;
  const styles = [getComputedStyle(doc.body), getComputedStyle(doc.documentElement)];
  const read = (names) => {
    for (const n of names) for (const s of styles) {
      const c = toRGB(s.getPropertyValue(n));
      if (c) return c;
    }
    return null;
  };
  const out = Object.fromEntries(Object.entries(SOURCES).map(([k, names]) => [k, read(names)]));
  if (!out.accent) {
    const btn = doc.querySelector('#txt2img_generate, button.primary, .lg.primary');
    if (btn) out.accent = toRGB(getComputedStyle(btn).backgroundColor);
  }
  if (!out.bg) out.bg = toRGB(getComputedStyle(doc.body).backgroundColor);
  return out;
}

export class Theme {
  constructor() {
    this.listeners = [];
    this.accent = new THREE.Color(0xf97316);
    this.stage = new THREE.Color(0x1a1f2b);
    this.dark = true;
    this.signature = '';
  }

  onChange(fn) { this.listeners.push(fn); fn(this); }

  apply() {
    const p = readParent();
    const root = document.documentElement;
    if (!p || !p.bg) {
      // Standalone: keep the stylesheet defaults (prefers-color-scheme).
      this._fromCSS();
      return;
    }
    const bg = over(p.bg, [255, 255, 255]);
    const dark = lum(bg) < 0.2;
    let text = over(p.text, bg) || (dark ? [229, 231, 235] : [31, 35, 40]);
    if (contrast(text, bg) < 4.5) text = dark ? [229, 231, 235] : [31, 35, 40];
    const panel = readable(over(p.panel, bg), text, mix(bg, text, 0.06));
    const accent = over(p.accent, bg) || [249, 115, 22];
    const inputFallback = mix(panel, dark ? [0, 0, 0] : [255, 255, 255], 0.25);
    let input = readable(over(p.input, panel), text, inputFallback);
    if (hex(input) === hex(panel)) input = inputFallback;
    const muted = over(p.muted, panel);
    const tokens = {
      '--bg': hex(bg),
      '--panel': hex(panel),
      '--text': hex(text),
      '--muted': hex(readable(muted, panel, mix(text, panel, 0.4), 3)),
      '--border': hex(readable(over(p.border, panel), panel, mix(panel, text, 0.18), 1.3)),
      '--accent': hex(accent),
      '--accent-text': contrast(accent, [17, 17, 17]) > contrast(accent, [255, 255, 255]) ? '#111111' : '#ffffff',
      '--input': hex(input),
      '--stage': hex(mix(bg, text, dark ? 0.05 : 0.08)),
    };
    const sig = JSON.stringify(tokens);
    if (sig === this.signature) return;
    this.signature = sig;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light'; // native widgets, scrollbars
    for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
    this._fromCSS();
  }

  _fromCSS() {
    const cs = getComputedStyle(document.documentElement);
    const get = (n, d) => cs.getPropertyValue(n).trim() || d;
    this.accent.set(get('--accent', '#f97316'));
    this.stage.set(get('--stage', '#1a1f2b'));
    this.dark = lum(toRGB(get('--bg', '#0b0f19')) || [0, 0, 0]) < 0.2;
    for (const fn of this.listeners) fn(this);
  }

  // Re-read when the WebUI theme changes (class/style edits, injected styles).
  watch() {
    this.apply();
    let doc;
    try { doc = window.parent !== window ? window.parent.document : null; } catch { doc = null; }
    if (!doc) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this._fromCSS());
      return;
    }
    let t;
    const later = () => { clearTimeout(t); t = setTimeout(() => this.apply(), 250); };
    // Reading the WebUI's styles forces a style pass over its (large) page, so
    // only do it when something theme-related changed: not for the <title>
    // progress updates Gradio writes during generation, nor while hidden.
    const themeRelated = (m) => {
      const n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      return !(n && n.closest && n.closest('title'));
    };
    const mo = new MutationObserver((list) => { if (!document.hidden && list.some(themeRelated)) later(); });
    mo.observe(doc.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    mo.observe(doc.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    mo.observe(doc.head, { childList: true, subtree: true, characterData: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) later(); });
    setInterval(() => { if (!document.hidden) this.apply(); }, 30000);
  }
}

export const theme = new Theme();
