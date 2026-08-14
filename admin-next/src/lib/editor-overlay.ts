/**
 * Overlay injected into the proxied site by /editor/view.
 *
 * Elements the site already marks with data-cms-item="collection:id" or
 * data-cms-singleton="slug" become clickable. Clicking one opens a panel with
 * that record's text fields, edits save straight to the CMS, and the panel
 * writes the new text back into the page so the change is visible immediately.
 *
 * Plain string rather than a module: it is inlined into proxied HTML, so it
 * cannot import anything and must run under the site's own CSP.
 */
export const OVERLAY_JS = String.raw`
(function () {
  'use strict';
  var SEL = '[data-cms-item],[data-cms-singleton]';
  var panel = null;

  var css = document.createElement('style');
  css.textContent = [
    '[data-cms-item],[data-cms-singleton]{outline:1.5px dashed rgba(47,107,70,.4);outline-offset:5px;border-radius:3px;cursor:pointer;transition:outline-color .12s;}',
    '[data-cms-item]:hover,[data-cms-singleton]:hover{outline:2px solid rgba(47,107,70,.95);}',
    '.pt-hint{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;background:#16211a;color:#fff;',
    'font:500 12.5px/1 ui-sans-serif,system-ui,sans-serif;padding:9px 15px;border-radius:999px;box-shadow:0 4px 18px rgba(0,0,0,.3);}',
    '.pt-panel{position:fixed;top:0;right:0;bottom:0;width:380px;z-index:2147483100;background:#fff;color:#16211a;',
    'font:14px/1.5 ui-sans-serif,system-ui,sans-serif;box-shadow:-8px 0 32px rgba(0,0,0,.18);display:flex;flex-direction:column;}',
    '.pt-panel header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #e3e6e3;}',
    '.pt-panel h2{margin:0;font-size:14px;font-weight:650;}',
    '.pt-panel .pt-x{border:none;background:none;font-size:20px;line-height:1;cursor:pointer;color:#5d6b62;}',
    '.pt-body{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px;}',
    '.pt-f label{display:block;font-size:11.5px;font-weight:650;text-transform:uppercase;letter-spacing:.03em;color:#5d6b62;margin-bottom:5px;}',
    '.pt-f input,.pt-f textarea{width:100%;padding:9px 10px;border:1px solid #cfd4cf;border-radius:8px;font:inherit;color:#16211a;background:#fff;box-sizing:border-box;}',
    '.pt-f textarea{min-height:110px;resize:vertical;}',
    '.pt-f input:focus,.pt-f textarea:focus{outline:2px solid #2f6b46;outline-offset:-1px;border-color:transparent;}',
    '.pt-foot{padding:13px 16px;border-top:1px solid #e3e6e3;display:flex;gap:10px;align-items:center;}',
    '.pt-save{background:#2f6b46;color:#fff;border:none;border-radius:8px;padding:9px 16px;font:inherit;font-weight:600;cursor:pointer;}',
    '.pt-save[disabled]{opacity:.55;cursor:default;}',
    '.pt-state{font-size:12.5px;color:#5d6b62;}'
  ].join('');
  document.head.appendChild(css);

  var hint = document.createElement('div');
  hint.className = 'pt-hint';
  hint.textContent = 'Edit mode — click any outlined area to change it';
  document.body.appendChild(hint);

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    open(el);
  }, true);

  function refOf(el) {
    var item = el.getAttribute('data-cms-item');
    if (item) {
      var p = item.split(':');
      return { collection: p[0], id: p[1] };
    }
    return { collection: el.getAttribute('data-cms-singleton'), id: null };
  }

  function open(el) {
    close();
    var ref = refOf(el);
    if (!ref.collection) return;
    var qs = 'collection=' + encodeURIComponent(ref.collection) + (ref.id ? '&id=' + encodeURIComponent(ref.id) : '');

    panel = document.createElement('aside');
    panel.className = 'pt-panel';
    panel.innerHTML =
      '<header><h2>' + label(ref.collection) + '</h2><button class="pt-x" aria-label="Close">&times;</button></header>' +
      '<div class="pt-body">Loading…</div>' +
      '<div class="pt-foot"><button class="pt-save" disabled>Save</button><span class="pt-state"></span></div>';
    document.body.appendChild(panel);
    panel.querySelector('.pt-x').addEventListener('click', close);

    fetch('/api/editor/item?' + qs, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) { render(data, el); })
      .catch(function () {
        panel.querySelector('.pt-body').textContent = 'Could not load this content.';
      });
  }

  function label(slug) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function render(data, el) {
    var body = panel.querySelector('.pt-body');
    body.innerHTML = '';
    var inputs = {};
    data.fields.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.className = 'pt-f';
      var lab = document.createElement('label');
      lab.textContent = f.label;
      var input = document.createElement(f.long ? 'textarea' : 'input');
      input.value = f.value;
      wrap.appendChild(lab);
      wrap.appendChild(input);
      body.appendChild(wrap);
      inputs[f.key] = input;
    });

    var save = panel.querySelector('.pt-save');
    var state = panel.querySelector('.pt-state');
    save.disabled = false;
    save.addEventListener('click', function () {
      var changes = {};
      data.fields.forEach(function (f) {
        var v = inputs[f.key].value;
        if (v !== f.value) changes[f.key] = v;
      });
      if (!Object.keys(changes).length) { state.textContent = 'Nothing changed'; return; }
      save.disabled = true;
      state.textContent = 'Saving…';
      fetch('/api/editor/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ collection: data.collection, id: data.id, changes: changes })
      })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function () {
          state.textContent = 'Saved — publish to put it live';
          save.disabled = false;
          // Reflect the longest changed value back into the page so the edit is
          // visible without a reload. Best-effort: the marker wraps a region,
          // not a single field, so this is a preview rather than a re-render.
          var longest = Object.keys(changes).sort(function (a, b) {
            return String(changes[b]).length - String(changes[a]).length;
          })[0];
          if (longest) paint(el, changes[longest]);
          if (window.parent !== window) window.parent.postMessage({ type: 'pt-content-saved' }, '*');
        })
        .catch(function () { state.textContent = 'Save failed'; save.disabled = false; });
    });
  }

  /** Replace the largest text node inside the region with the new value. */
  function paint(el, value) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var best = null;
    while (walker.nextNode()) {
      var n = walker.currentNode;
      if (!best || n.nodeValue.trim().length > best.nodeValue.trim().length) best = n;
    }
    if (best) best.nodeValue = value;
  }

  function close() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }
})();
`;
