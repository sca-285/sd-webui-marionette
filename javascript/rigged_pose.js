// Bridge between the WebUI page and the Marionette editor iframes.
// Loaded automatically by Forge / reForge / Forge Neo / A1111 from javascript/.
(function () {
  if (window.RiggedPose) return;

  const app = () => (typeof gradioApp === 'function' ? gradioApp() : document);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const editors = {}; // tab -> Map(instance -> api)

  function fireInput(el) {
    if (typeof updateInput === 'function') updateInput(el);
    else el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ControlNet element ids are shared by sd-webui-controlnet and Forge's built-in
  // sd_forge_controlnet: <tab>_controlnet_ControlNet-<n>_<part>, or
  // <tab>_controlnet_ControlNet_<part> when only one unit is configured.
  function cnElement(tab, unit, part) {
    const a = app();
    let el = a.querySelector(`#${tab}_controlnet_ControlNet-${unit}_${part}`);
    if (!el && unit === 0) el = a.querySelector(`#${tab}_controlnet_ControlNet_${part}`);
    if (!el) {
      const all = [...a.querySelectorAll(`[id^="${tab}_controlnet"][id$="_${part}"]`)];
      el = all[unit] || null;
    }
    return el;
  }

  // Control weight of a unit (number box next to the weight slider). Best effort:
  // sd-webui-controlnet and Forge's built-in ControlNet share these element ids.
  function setUnitWeight(tab, unit, value) {
    const el = cnElement(tab, unit, 'controlnet_control_weight_slider');
    const input = el && el.querySelector('input[type=number]');
    if (!input) return false;
    input.value = value;
    fireInput(input);
    return true;
  }

  function enableUnit(tab, unit) {
    const el = cnElement(tab, unit, 'enable_checkbox');
    const box = el && (el.matches('input') ? el : el.querySelector('input[type=checkbox]'));
    if (box && !box.checked) box.click();
  }

  async function sendToControlNet(tab, unit, dataURL, filename) {
    const root = cnElement(tab, unit, 'input_image');
    if (!root) return { ok: false, msg: `ControlNet unit ${unit} not found in ${tab} (is ControlNet enabled, with enough units?)` };
    const blob = await (await fetch(dataURL)).blob();
    const file = new File([blob], filename || 'pose.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);

    let input = root.querySelector('input[type=file]');
    if (!input) {
      // Gradio drops the upload input while an image is shown: clear it first.
      const clear = root.querySelector('button[aria-label="Clear"], button[aria-label="Remove Image"], button[title="Clear"], button[aria-label="clear"]');
      if (clear) { clear.click(); await sleep(200); }
      input = root.querySelector('input[type=file]');
    }
    if (input) {
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const zone = root.querySelector('[data-testid="image"], .image-container, canvas') || root;
      zone.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
      zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    }
    enableUnit(tab, unit);
    return { ok: true };
  }

  // ---- unit setup: control type, preprocessor None, a matching model.
  // Our images already are control maps, so the preprocessor must be None.
  const CN_KINDS = {
    openpose: { types: ['openpose'], models: ['openpose', 'pose'] },
    depth: { types: ['depth'], models: ['depth'] },
    normal: { types: ['normalmap', 'normal'], models: ['normal'] },
    canny: { types: ['canny'], models: ['canny', 'edge'] },
    lineart: { types: ['lineart'], models: ['lineart'] },
    seg: { types: ['segmentation', 'seg'], models: ['seg'] },
  };
  const norm = (t) => String(t || '').trim().toLowerCase();

  function dropdownValue(root) {
    const sel = root.querySelector('select');
    if (sel) return sel.value;
    const input = root.querySelector('input');
    return input ? input.value : '';
  }

  // Pick an option of a Gradio dropdown (Gradio 3 and 4: an input that opens
  // ul.options; options react to mousedown) or of a plain <select>.
  async function chooseDropdown(root, pick) {
    if (!root) return false;
    const sel = root.querySelector('select');
    if (sel) {
      const o = [...sel.options].find((x) => pick(x.value) || pick(x.textContent));
      if (!o) return false;
      if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      return true;
    }
    const input = root.querySelector('input');
    if (!input) return false;
    if (pick(input.value)) return true;
    input.focus();
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    input.click();
    await sleep(180);
    let items = [...root.querySelectorAll('ul.options li, [role="option"]')];
    if (!items.length) items = [...app().querySelectorAll('ul.options li')];
    const it = items.find((li) => pick(li.getAttribute('data-value') ?? li.textContent) || pick(li.textContent));
    if (it) {
      it.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      it.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await sleep(120);
    }
    input.blur();
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    return !!it;
  }

  async function configureUnit(tab, unit, kind) {
    const k = CN_KINDS[kind];
    const done = [];
    if (k) {
      const box = cnElement(tab, unit, 'controlnet_type_filter_radio');
      const radios = box ? [...box.querySelectorAll('input[type=radio]')] : [];
      const want = radios.find((r) => k.types.includes(norm(r.value)) || k.types.includes(norm(r.closest('label')?.textContent)));
      if (want) {
        if (!want.checked) { want.click(); await sleep(500); }
        done.push('type ' + (want.value || want.closest('label')?.textContent.trim()));
      }
    }
    if (await chooseDropdown(cnElement(tab, unit, 'controlnet_preprocessor_dropdown'), (t) => norm(t) === 'none')) done.push('preprocessor None');
    const md = cnElement(tab, unit, 'controlnet_model_dropdown');
    if (k && md && (!dropdownValue(md) || norm(dropdownValue(md)) === 'none')) {
      if (await chooseDropdown(md, (t) => norm(t) !== 'none' && k.models.some((w) => norm(t).includes(w)))) done.push('model ' + dropdownValue(md));
    }
    return done;
  }

  function appendPrompt(tab, text) {
    const ta = app().querySelector(`#${tab}_prompt textarea`);
    if (!ta || !text) return false;
    if (ta.value.includes(text)) return true;
    const cur = ta.value.replace(/[\s,]+$/, '');
    ta.value = cur ? `${cur}, ${text}` : text;
    fireInput(ta);
    return true;
  }

  function setState(tab, json) {
    const ta = app().querySelector(`#rigged_pose_state_${tab} textarea`);
    if (!ta || ta.value === json) return;
    ta.value = json;
    fireInput(ta);
  }

  function getSize(tab) {
    const w = app().querySelector(`#${tab}_width input[type=number]`);
    const h = app().querySelector(`#${tab}_height input[type=number]`);
    return w && h ? { w: +w.value, h: +h.value } : null;
  }

  // Set the tab's width / height (number boxes next to the sliders).
  function setSize(tab, w, h) {
    let ok = 0;
    for (const [part, v] of [['width', w], ['height', h]]) {
      const box = app().querySelector(`#${tab}_${part}`);
      for (const input of box ? box.querySelectorAll('input') : []) { input.value = v; fireInput(input); ok++; }
    }
    return ok > 0;
  }

  // Newest image in a tab's output gallery (data or file URL), or null.
  function getLastImage(tab) {
    const img = app().querySelector(`#${tab}_gallery img`);
    return img ? img.src : null;
  }

  function registerEditor(tab, api, instance) {
    for (const m of Object.values(editors)) m.delete(instance);
    (editors[tab] ||= new Map()).set(instance, api);
  }

  const isDark = () => document.body.classList.contains('dark') || /[?&]__theme=dark/.test(location.search);

  window.RiggedPose = { sendToControlNet, configureUnit, setUnitWeight, appendPrompt, setState, getSize, setSize, getLastImage, registerEditor, isDark };

  // Capture + send before Generate when an editor asks for it.
  let bypass = false;
  document.addEventListener('click', async (e) => {
    if (bypass) return;
    const btn = e.target.closest && e.target.closest('#txt2img_generate, #img2img_generate');
    if (!btn) return;
    const tab = btn.id.split('_')[0];
    const api = [...(editors[tab]?.values() || [])].find((x) => x.autoSend());
    if (!api) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try {
      if (await api.captureAndSend(tab)) await sleep(1200); // let Gradio finish the upload
    } catch (err) {
      console.error('[rigged-pose]', err);
    }
    bypass = true;
    try { btn.click(); } finally { bypass = false; }
  }, true);

  // Lazy-load iframes when they first become visible.
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const f = en.target;
      if (!f.getAttribute('src')) f.src = f.dataset.src;
      io.unobserve(f);
    }
  });
  const seen = new WeakSet();
  function scan() {
    app().querySelectorAll('iframe.rigged-pose-frame[data-src]').forEach((f) => {
      if (seen.has(f)) return;
      seen.add(f);
      io.observe(f);
    });
  }
  if (typeof onUiLoaded === 'function') onUiLoaded(scan);
  setInterval(scan, 1500);
})();
