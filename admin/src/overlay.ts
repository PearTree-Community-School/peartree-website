/**
 * Client script served at /overlay.js and loaded by the public site (only in
 * self-hosted builds). If the visitor has an editor session, editable regions
 * (elements with data-cms-item="collection:id" or data-cms-singleton="slug")
 * get an outline and an Edit button linking to the admin form for that item.
 * Anonymous visitors: /api/edit-mode says no, and nothing happens.
 */
export const OVERLAY_JS = `(function () {
  'use strict';
  fetch('/api/edit-mode', { credentials: 'same-origin' })
    .then(function (res) { return res.ok ? res.json() : { editor: false }; })
    .then(function (me) { if (me && me.editor) activate(); })
    .catch(function () { /* not the self-hosted app; do nothing */ });

  function activate() {
    var style = document.createElement('style');
    style.textContent =
      '[data-cms-item],[data-cms-singleton]{position:relative;outline:1.5px dashed rgba(79,70,229,.45);outline-offset:4px;border-radius:2px;}' +
      '[data-cms-item]:hover,[data-cms-singleton]:hover{outline-color:rgba(79,70,229,.9);}' +
      '.pt-edit-btn{position:absolute;top:-10px;right:-10px;z-index:9999;background:#4f46e5;color:#fff;border:none;border-radius:999px;' +
      'font:600 11px/1 system-ui,sans-serif;padding:5px 9px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3);text-decoration:none;opacity:.85;}' +
      '.pt-edit-btn:hover{opacity:1;}' +
      '.pt-edit-bar{position:fixed;bottom:14px;right:14px;z-index:10000;background:#111827;color:#f9fafb;font:500 12px/1 system-ui,sans-serif;' +
      'padding:9px 13px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;gap:12px;align-items:center;}' +
      '.pt-edit-bar a{color:#a5b4fc;text-decoration:none;}';
    document.head.appendChild(style);

    document.querySelectorAll('[data-cms-item]').forEach(function (el) {
      var ref = el.getAttribute('data-cms-item') || '';
      var parts = ref.split(':');
      if (parts.length !== 2) return;
      addButton(el, '/admin/content/' + parts[0] + '/' + parts[1] + '?return=' + encodeURIComponent(location.pathname));
    });
    document.querySelectorAll('[data-cms-singleton]').forEach(function (el) {
      var slug = el.getAttribute('data-cms-singleton') || '';
      if (!slug) return;
      addButton(el, '/admin/content/' + slug + '?return=' + encodeURIComponent(location.pathname));
    });

    var bar = document.createElement('div');
    bar.className = 'pt-edit-bar';
    bar.innerHTML = 'Edit mode <a href="/admin/content">Open admin</a>';
    document.body.appendChild(bar);
  }

  function addButton(el, href) {
    var btn = document.createElement('a');
    btn.className = 'pt-edit-btn';
    btn.href = href;
    btn.textContent = 'Edit';
    btn.title = 'Edit this content in the admin';
    var computed = window.getComputedStyle(el);
    if (computed.position === 'static') el.style.position = 'relative';
    el.appendChild(btn);
  }
})();
`;
