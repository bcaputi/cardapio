/* Cardápio Praia da Tiquatira — lê a planilha publicada (CSV) e monta a página.
   Se a planilha não responder, usa o último cardápio carregado neste celular
   e, em último caso, o arquivo menu.json do site. */
(function () {
  var C = window.CARDAPIO_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var group = 'comer', S = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function money(v) { return v.toFixed(2).replace('.', ','); }
  function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat'; }
  function norm(s) { return String(s == null ? '' : s).trim(); }

  /* CSV com aspas, vírgulas e quebras de linha dentro das células */
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false, i, ch;
    text = text.replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    var head = (rows.shift() || []).map(function (h) { return slug(h); });
    return rows.filter(function (r) { return r.some(function (c) { return norm(c); }); }).map(function (r) {
      var o = {}; head.forEach(function (h, j) { o[h] = norm(r[j]); }); return o;
    });
  }

  /* "26,90" · "R$ 26,90" · "1.234,56" · "26.9" · "Dose=34,90; Garrafa=349,90" */
  function num(s) {
    s = String(s).replace(/R\$|\s/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(s); return isNaN(v) ? null : v;
  }
  function prices(s) {
    s = norm(s); if (!s) return [];
    return s.split(';').map(function (part) {
      part = part.trim(); if (!part) return null;
      var k = part.lastIndexOf('='), lab = k >= 0 ? part.slice(0, k).trim() : '', v = num(k >= 0 ? part.slice(k + 1) : part);
      return v == null ? null : [lab, v];
    }).filter(Boolean);
  }
  function img(f) {
    f = norm(f); if (!f) return '';
    return /^(https?:|data:)/.test(f) ? f : 'img/' + f;
  }
  function yes(s) { return /^(sim|s|x|true|1|esconder|oculto)$/i.test(norm(s)); }

  /* planilha → cardápio */
  function build(catsRows, itemRows) {
    var cats = [], byName = {};
    catsRows.forEach(function (r) {
      var name = r.categoria; if (!name || byName[name.toLowerCase()]) return;
      var c = { id: slug(name), name: name, group: /beb/i.test(r.secao) ? 'beber' : 'comer', note: r.observacao || '', img: img(r.foto), items: [] };
      cats.push(c); byName[name.toLowerCase()] = c;
    });
    itemRows.forEach(function (r) {
      var c = byName[(r.categoria || '').toLowerCase()];
      if (!c || !r.nome || yes(r.esconder)) return;
      c.items.push({ n: r.nome, d: r.descricao || '', w: r.porcao || '', p: prices(r.preco), img: img(r.foto), sub: r.subgrupo || '' });
    });
    return cats.filter(function (c) { return c.items.length; });
  }

  function cats() { return S.filter(function (c) { return c.group === group; }); }
  function renderHeader() {
    $('seg').innerHTML = ['comer', 'beber'].map(function (g) {
      return '<button type="button" id="seg-' + g + '" aria-pressed="' + (g === group) + '" data-g="' + g + '">' + (g === 'comer' ? 'Para comer' : 'Para beber') + '</button>';
    }).join('');
  }
  function itemHTML(it, k) {
    var p = it.p;
    var priceHTML = p.length === 1 && !p[0][0] ? '<div class="price">R$ ' + money(p[0][1]) + '</div>'
      : p.length ? '<div class="vars">' + p.map(function (v) { return '<span>' + esc(v[0]) + '<b>' + money(v[1]) + '</b></span>'; }).join('') + '</div>' : '';
    return '<div class="item"><div class="txt"><div class="name">' + esc(it.n) + (it.w ? '<span class="w">' + esc(it.w) + '</span>' : '') + '</div>' +
      (it.d ? '<div class="desc">' + esc(it.d) + '</div>' : '') + priceHTML + '</div>' +
      (it.img ? '<button class="thumb-btn" type="button" data-zoom="' + esc(it.img) + '" data-cap="' + esc(it.n) + '" aria-label="Ver foto de ' + esc(it.n) + '"><img class="thumb" loading="lazy" src="' + esc(it.img) + '" alt="" onerror="this.parentNode.remove()"></button>' : '') + '</div>';
  }
  function render() {
    var cs = cats();
    $('chips').innerHTML = cs.map(function (c, i) { return '<a href="#' + c.id + '" data-cat="' + c.id + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(c.name) + '</a>'; }).join('');
    $('menu').innerHTML = cs.map(function (c) {
      var h = '<section class="cat" id="' + c.id + '"><div class="cat-head"><h2>' + esc(c.name) + '</h2>' + (c.note ? '<p>' + esc(c.note) + '</p>' : '') + '</div>';
      if (c.img) h += '<img class="cat-img" loading="lazy" src="' + esc(c.img) + '" alt="" data-zoom="' + esc(c.img) + '" data-cap="' + esc(c.name) + '" onerror="this.remove()">';
      var last = null, block = '';
      c.items.forEach(function (it) {
        if (it.sub !== last) { if (block) h += '<div>' + block + '</div>'; block = ''; last = it.sub; if (last) h += '<h3 class="sub">' + esc(last) + '</h3>'; }
        block += itemHTML(it);
      });
      return h + '<div>' + block + '</div></section>';
    }).join('');
    observe();
  }
  var io;
  function observe() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Array.prototype.forEach.call($('chips').children, function (a) {
          var on = a.getAttribute('data-cat') === e.target.id; a.classList.toggle('on', on);
          if (on) a.parentNode.scrollLeft = a.offsetLeft - 40;
        });
      });
    }, { rootMargin: '-130px 0px -65% 0px' });
    document.querySelectorAll('section.cat').forEach(function (s) { io.observe(s); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-g]'); if (t) { group = t.getAttribute('data-g'); renderHeader(); render(); window.scrollTo(0, 0); return; }
    var z = e.target.closest('[data-zoom]');
    if (z) {
      $('layer').innerHTML = '<div class="lb" role="dialog" aria-label="Foto"><img src="' + esc(z.getAttribute('data-zoom')) + '" alt="' + esc(z.getAttribute('data-cap')) + '"><p>' + esc(z.getAttribute('data-cap')) + '</p><button type="button" id="lb-close">Fechar</button></div>';
      $('lb-close').focus();
      $('layer').firstChild.addEventListener('click', function (ev) { if (ev.target.tagName !== 'IMG') $('layer').innerHTML = ''; });
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('layer').innerHTML = ''; });

  function show(data) {
    S = data;
    var h = (location.hash || '').slice(1), hc = S.filter(function (c) { return c.id === h; })[0];
    if (hc) group = hc.group;
    if (!cats().length) group = S.length ? S[0].group : 'comer';
    renderHeader(); render();
    if (hc) setTimeout(function () { var el = $(hc.id); if (el) el.scrollIntoView(); }, 60);
  }
  function get(url) {
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return fetch(url + sep + '_=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
  }
  function fallback() {
    var cached = null; try { cached = JSON.parse(localStorage.getItem('cardapio-praia')); } catch (e) {}
    if (cached && cached.length) return Promise.resolve(cached);
    return fetch('menu.json').then(function (r) { return r.json(); }).then(function (j) { return build(j.categorias, j.itens); });
  }

  $('foot').innerHTML = '<strong>Praia da Tiquatira Beach Club</strong><span>Imagens meramente ilustrativas.</span>' +
    '<span>Faça seu evento conosco: aniversário, confraternização e corporativo. WhatsApp <strong>' + esc(C.whatsapp || '') + '</strong></span>' +
    '<span>Instagram <strong>' + esc(C.instagram || '') + '</strong></span>';

  var live = C.planilhaItensCSV && C.planilhaCategoriasCSV
    ? Promise.all([get(C.planilhaCategoriasCSV), get(C.planilhaItensCSV)]).then(function (t) {
        var d = build(parseCSV(t[0]), parseCSV(t[1]));
        if (!d.length) throw new Error('planilha vazia');
        try { localStorage.setItem('cardapio-praia', JSON.stringify(d)); } catch (e) {}
        return d;
      })
    : Promise.reject(new Error('sem planilha'));
  live.catch(fallback).then(show).catch(function () {
    $('menu').innerHTML = '<p style="padding:40px 0;color:var(--muted)">Não foi possível carregar o cardápio. Verifique a internet e tente de novo, ou peça o cardápio ao garçom.</p>';
  });
})();
