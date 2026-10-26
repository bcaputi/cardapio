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

  /* dia da semana em São Paulo: dom seg ter qua qui sex sab */
  var DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  function todaySP() {
    try {
      var w = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date());
      return DAYS[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(w)];
    } catch (e) { return DAYS[new Date().getDay()]; }
  }
  /* "sáb, dom" · "fim de semana" · "dias úteis" · "Sábado e Domingo" → lista de dias */
  function dayList(s) {
    s = slug(s); if (!s) return [];
    var out = [];
    if (/fim-de-semana|fds/.test(s)) out.push('sab', 'dom');
    if (/dias-uteis/.test(s)) out.push('seg', 'ter', 'qua', 'qui', 'sex');
    s.split('-').forEach(function (t) { var d = t.slice(0, 3); if (DAYS.indexOf(d) >= 0) out.push(d); });
    return out;
  }

  /* planilha → cardápio (aplica dias e cardápio reduzido) */
  function build(catsRows, itemRows, adj) {
    adj = adj || {};
    var today = todaySP(), reduced = yes(adj.reduzido);
    var cats = [], byName = {};
    catsRows.forEach(function (r) {
      var name = r.categoria; if (!name || byName[name.toLowerCase()]) return;
      var c = { id: slug(name), name: name, group: /beb/i.test(r.secao) ? 'beber' : 'comer', note: r.observacao || '', img: img(r.foto), items: [] };
      cats.push(c); byName[name.toLowerCase()] = c;
    });
    itemRows.forEach(function (r) {
      var c = byName[(r.categoria || '').toLowerCase()];
      if (!c || !r.nome || yes(r.esconder)) return;
      if (dayList(r['nao-servir-em']).indexOf(today) >= 0) return;
      if (reduced && !yes(r.reduzido)) return;
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

  /* aba Ajustes (Ajuste, Valor) → {reduzido, aviso} */
  function ajustes(rows) {
    var o = {};
    (rows || []).forEach(function (r) {
      var k = slug(r.ajuste), v = r.valor || '';
      if (/reduzido/.test(k)) o.reduzido = v;
      else if (/aviso/.test(k)) o.aviso = v;
    });
    return o;
  }
  function notice(text) {
    var el = $('aviso');
    if (!el) { el = document.createElement('p'); el.id = 'aviso'; el.className = 'aviso'; $('menu').parentNode.insertBefore(el, $('menu')); }
    el.textContent = text || ''; el.hidden = !text;
  }
  function fromRaw(raw) {
    var adj = ajustes(raw.ajustes);
    notice(adj.aviso);
    return build(raw.categorias, raw.itens, adj);
  }

  function show(data) {
    S = data;
    if (!S.length) { $('chips').innerHTML = ''; $('menu').innerHTML = '<p class="loading">Nenhum item disponível no cardápio agora. Fale com o garçom.</p>'; return; }
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
  /* sem planilha: última cópia salva no celular (dados brutos, filtrados de novo pelo dia de hoje) ou menu.json */
  function fallback() {
    var cached = null; try { cached = JSON.parse(localStorage.getItem('cardapio-praia-v2')); } catch (e) {}
    if (cached && cached.itens && cached.itens.length) return Promise.resolve(fromRaw(cached));
    return fetch('menu.json').then(function (r) { return r.json(); }).then(fromRaw);
  }

  $('foot').innerHTML = '<strong>Praia da Tiquatira Beach Club</strong><span>Imagens meramente ilustrativas.</span>' +
    '<span>Faça seu evento conosco: aniversário, confraternização e corporativo. WhatsApp <strong>' + esc(C.whatsapp || '') + '</strong></span>' +
    '<span>Instagram <strong>' + esc(C.instagram || '') + '</strong></span>';

  var live = C.planilhaItensCSV && C.planilhaCategoriasCSV
    ? Promise.all([
        get(C.planilhaCategoriasCSV),
        get(C.planilhaItensCSV),
        C.planilhaAjustesCSV ? get(C.planilhaAjustesCSV).catch(function () { return ''; }) : Promise.resolve('')
      ]).then(function (t) {
        var raw = { categorias: parseCSV(t[0]), itens: parseCSV(t[1]), ajustes: t[2] ? parseCSV(t[2]) : [] };
        if (!raw.itens.length || !raw.categorias.length) throw new Error('planilha vazia');
        try { localStorage.setItem('cardapio-praia-v2', JSON.stringify(raw)); } catch (e) {}
        return fromRaw(raw);
      })
    : Promise.reject(new Error('sem planilha'));
  live.catch(fallback).then(show).catch(function () {
    $('menu').innerHTML = '<p style="padding:40px 0;color:var(--muted)">Não foi possível carregar o cardápio. Verifique a internet e tente de novo, ou peça o cardápio ao garçom.</p>';
  });
})();
