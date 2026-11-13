/* ========================================================
   MUSE JS v2.3 - assets/muse.js
   Works for any markup using MUSE classes/data-attributes.
   No build step, no dependencies.
   ======================================================== */
(function () {
  var root = document.documentElement;
  // Light-only library; no saved or OS theme.
  /* Switch - any [data-switch] toggles .on */
  document.addEventListener('click', function (e) {
    var sw = e.target.closest('[data-switch]');
    if (sw) sw.classList.toggle('on');
  });

  /* Tabs - container [data-tabs] with .tab buttons + optional .tab-indicator */
  function moveIndicator(tabs) {
    var ind = tabs.querySelector('.tab-indicator');
    var active = tabs.querySelector('.tab.active');
    if (!ind || !active) return;
    var p = tabs.getBoundingClientRect();
    var r = active.getBoundingClientRect();
    ind.style.left = (r.left - p.left) + 'px';
    ind.style.width = r.width + 'px';
  }
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (!tab) return;
    var tabs = tab.closest('[data-tabs]');
    if (!tabs) return;
    tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    moveIndicator(tabs);
    var panelId = tab.getAttribute('data-panel');
    if (panelId) {
      document.querySelectorAll('[data-tab-panel]').forEach(function (p) { p.hidden = (p.id !== panelId); });
    }
  });
  window.addEventListener('load', function () { document.querySelectorAll('[data-tabs]').forEach(moveIndicator); });
  window.addEventListener('resize', function () { document.querySelectorAll('[data-tabs]').forEach(moveIndicator); });

  /* Modal - [data-modal-open="id"] opens, [data-modal-close] / backdrop / Esc closes */
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal-open]');
    if (opener) { var m = document.getElementById(opener.getAttribute('data-modal-open')); if (m) m.classList.add('open'); return; }
    if (e.target.closest('[data-modal-close]')) { var b = e.target.closest('.modal-backdrop'); if (b) b.classList.remove('open'); return; }
    if (e.target.classList.contains('modal-backdrop')) e.target.classList.remove('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(function (b) { b.classList.remove('open'); });
  });

  /* Toast - MUSE.toast(msg) or [data-toast="message"] */
  window.MUSE = window.MUSE || {};
  window.MUSE.toast = function (msg) {
    var stack = document.querySelector('.toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.appendChild(stack); }
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span></span>';
    t.lastChild.textContent = msg;
    stack.appendChild(t);
    setTimeout(function () { t.classList.add('leave'); setTimeout(function () { t.remove(); }, 300); }, 2500);
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-toast]');
    if (el) window.MUSE.toast(el.getAttribute('data-toast'));
  });

  /* Spotlight - [data-spotlight] follows cursor via --mx/--my */
  document.querySelectorAll('[data-spotlight]').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    });
  });

  /* Chip / filter - [data-chip] toggles .on */
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-chip]');
    if (chip) chip.classList.toggle('on');
  });

  /* Copy - [data-copy] copies its target's text.
     data-copy="#id" copies that element, bare data-copy copies the
     nearest .code / pre sibling text. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var sel = btn.getAttribute('data-copy');
    var src = sel ? document.querySelector(sel)
                  : (btn.closest('.code') || document).querySelector('.code-block, pre');
    if (!src) return;
    var text = src.textContent;
    var done = function () {
      btn.setAttribute('data-copied', '');
      var label = btn.querySelector('[data-copy-label]');
      var prev = label && label.textContent;
      if (label) label.textContent = 'Copied';
      setTimeout(function () { btn.removeAttribute('data-copied'); if (label) label.textContent = prev; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      ta.remove();
    }
  });

  /* Sortable table - <th data-sort> in a .table thead.
     Numeric when every cell parses as a number, else locale string. */
  document.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]');
    if (!th) return;
    var table = th.closest('table');
    var tbody = table && table.tBodies[0];
    if (!tbody) return;
    var idx = Array.prototype.indexOf.call(th.parentNode.children, th);
    var asc = th.getAttribute('aria-sort') !== 'ascending';
    var rows = Array.prototype.slice.call(tbody.rows);
    var cell = function (r) { return (r.cells[idx] ? r.cells[idx].textContent : '').trim(); };
    var num = function (v) { return parseFloat(v.replace(/[^0-9.eE+-]/g, '')); };
    var numeric = rows.every(function (r) { var c = cell(r); return c !== '' && !isNaN(num(c)); });
    rows.sort(function (a, b) {
      var x = cell(a), y = cell(b);
      var r = numeric ? num(x) - num(y) : x.localeCompare(y, 'ko');
      return asc ? r : -r;
    });
    rows.forEach(function (r) { tbody.appendChild(r); });
    th.parentNode.querySelectorAll('[data-sort]').forEach(function (o) { o.removeAttribute('aria-sort'); });
    th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
  });

  /* TOC scrollspy - [data-toc] with in-page anchor links */
  document.querySelectorAll('[data-toc]').forEach(function (toc) {
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var map = {};
    var targets = links.map(function (a) {
      var el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (el) map[el.id] = a;
      return el;
    }).filter(Boolean);
    if (!targets.length || !window.IntersectionObserver) return;
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target.id] = en.isIntersecting; });
      for (var i = 0; i < targets.length; i++) {
        if (seen[targets[i].id]) {
          links.forEach(function (a) { a.classList.remove('active'); });
          map[targets[i].id].classList.add('active');
          break;
        }
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  });

  /* Scroll hint - drop the edge fade once a .scroll-x is scrolled to its end */
  document.querySelectorAll('.scroll-x').forEach(function (el) {
    var sync = function () {
      var over = el.scrollWidth - el.clientWidth;
      el.classList.toggle('at-end', over <= 1 || el.scrollLeft >= over - 1);
    };
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  /* Print - open every <details> so collapsed content still prints, then restore */
  var reopened = [];
  window.addEventListener('beforeprint', function () {
    reopened = Array.prototype.filter.call(document.querySelectorAll('details'), function (d) { return !d.open; });
    reopened.forEach(function (d) { d.open = true; });
  });
  window.addEventListener('afterprint', function () {
    reopened.forEach(function (d) { d.open = false; });
    reopened = [];
  });

  /* Scroll reveal - [data-animate] plays its diagram steps in DOM order
     once the container scrolls into view. The attribute value is the
     stagger in ms (default 200). Steps are the known diagram primitives
     plus anything explicitly marked [data-step].
     html.muse-anim gates the CSS: set here so a page whose script never
     runs shows every diagram instead of an empty box. */
  var ANIM_SEL = '.flow-node, .flow-arrow, .pipeline-stage, .arch-layer, .timeline-item,'
               + '.seq-actor, .seq-row, .seq-msg, .metric, svg .node, svg .edge, svg .arrowhead, [data-step]';
  var animAll = document.querySelectorAll('[data-animate]');
  if (animAll.length) {
    root.classList.add('muse-anim');
    /* Reduced motion: muse.css already collapses durations - drop the
       stagger too, or the diagram sits blank through the whole delay. */
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    var steps = function (el) { return Array.prototype.slice.call(el.querySelectorAll(ANIM_SEL)); };
    var arm = function (el) {
      steps(el).forEach(function (n) {
        n.classList.remove('in');
        n.style.removeProperty('--anim-d');
        if (n.tagName === 'path' && n.getTotalLength) {
          var len = n.getTotalLength();
          n.style.strokeDasharray = len;
          n.style.strokeDashoffset = len;
        }
      });
    };
    var play = function (el) {
      var set = parseFloat(el.getAttribute('data-animate'));
      var gap = isNaN(set) ? 200 : set;    /* data-animate="0" means 0, not default */
      if (calm) gap = 0;
      steps(el).forEach(function (n, i) {
        n.style.setProperty('--anim-d', (i * gap) + 'ms');
        n.classList.add('in');
        if (n.tagName === 'path') n.style.strokeDashoffset = 0;
      });
    };
    window.MUSE = window.MUSE || {};
    window.MUSE.replay = function (el) {
      el = typeof el === 'string' ? document.querySelector(el) : el;
      if (!el) return;
      arm(el);
      requestAnimationFrame(function () { requestAnimationFrame(function () { play(el); }); });
    };
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-replay]');
      if (btn) window.MUSE.replay(btn.getAttribute('data-replay') || btn.closest('[data-animate]'));
    });

    if (window.IntersectionObserver) {
      var animIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          play(en.target);
          animIO.unobserve(en.target);   /* once only - replaying on every pass reads as noise */
        });
      }, { threshold: 0.2 });
      animAll.forEach(function (el) { arm(el); animIO.observe(el); });
    } else {
      animAll.forEach(play);
    }
  }

  /* Motion (v2.3) - 장식이 아니라 방향·물량·경로를 보여줄 때만 움직인다.
     [data-flow] 안의 SVG .edge는 흐르는 점선이 되고, path[data-rate="n"]에는 점 n개가 흐른다
                 (data-tone: primary·success·warning·danger·muted·1~4·other).
     [data-trace] 안의 <script type="application/json" data-steps>로 사례 하나를 노드에서 노드로
                 옮기며 설명한다. 선은 흐름 방향(시작 → 끝)으로 그린다.
     움직임에는 늘 멈춤 버튼이 붙고, 움직임 줄이기 설정이면 멈춘 채로 시작하며, 화면 밖에서는 쉰다.
     스크립트가 돌지 않아도 도식은 멈춘 상태로 다 읽힌다. */
  var SVGNS = 'http://www.w3.org/2000/svg', flowSeq = 0;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function setMotion(fig, on) {
    var st = fig.__museMotion, run = on && st.seen;
    st.on = on;
    fig.classList.toggle('flowing', run);
    fig.querySelectorAll('svg').forEach(function (s) { try { if (run) s.unpauseAnimations(); else s.pauseAnimations(); } catch (err) {} });
    var b = fig.querySelector(':scope > .motion-toggle');
    if (b) { b.textContent = on ? '움직임 멈추기' : '움직임 켜기'; b.setAttribute('aria-pressed', String(!on)); }
  }
  function flow(fig) {
    if (!fig) return;
    var st = fig.__museMotion || (fig.__museMotion = { on: !still, seen: true });
    fig.querySelectorAll('.flow-dots').forEach(function (l) { l.remove(); });
    var any = fig.hasAttribute('data-flow') && !!fig.querySelector('svg .edge');
    fig.querySelectorAll('svg').forEach(function (s) {
      var paths = s.querySelectorAll('path[data-rate]');
      if (!paths.length) return;
      any = true;
      var layer = svgEl('g', { 'class': 'flow-dots', 'aria-hidden': 'true' }, s);
      paths.forEach(function (p) {
        if (!p.id) p.id = 'muse-flow-' + (++flowSeq);
        var n = Math.max(0, Math.min(8, Math.round(+p.getAttribute('data-rate') || 0))), dur = Math.max(1.6, p.getTotalLength() / 70), tone = p.getAttribute('data-tone');
        for (var i = 0; i < n; i++) {    // 점 사이 간격을 고르게: 시작 시간을 음수로 엇갈린다
          var c = svgEl('circle', { r: 3, 'class': 'flow-dot' + (tone ? ' tone-' + tone : '') }, layer);
          var mp = svgEl('mpath', { href: '#' + p.id }, svgEl('animateMotion', { dur: dur.toFixed(2) + 's', begin: (-dur * i / n).toFixed(2) + 's', repeatCount: 'indefinite' }, c));
          mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + p.id);
        }
      });
    });
    if (!any) return;
    fig.classList.add('has-motion');
    if (!fig.querySelector(':scope > .motion-toggle')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary btn-sm motion-toggle';
      b.addEventListener('click', function () { setMotion(fig, !fig.__museMotion.on); });
      fig.appendChild(b);
      if (window.IntersectionObserver) new IntersectionObserver(function (en) { st.seen = en[0].isIntersecting; setMotion(fig, st.on); }).observe(fig);
    }
    setMotion(fig, st.on);
  }
  function trace(fig) {
    var src = fig.querySelector('script[type="application/json"][data-steps]'), svgRoot = fig.querySelector('svg'), S;
    try { S = JSON.parse(src.textContent); } catch (err) { console.error('[MUSE trace] 단계 JSON을 읽지 못했어요', err, fig); return; }
    if (!svgRoot || !S || !S.length) return;
    var token = svgEl('circle', { r: 7, 'class': 'trace-token', 'aria-hidden': 'true' }, svgRoot);
    var box = document.createElement('div');
    box.className = 'trace';
    box.innerHTML = '<div class="trace-head"><span class="trace-count"></span><b class="trace-title"></b></div><p class="trace-text" aria-live="polite"></p><div class="trace-ctrl"></div>';
    var cap = fig.querySelector(':scope > .cap');
    fig.insertBefore(box, cap || null);
    var ctrl = box.querySelector('.trace-ctrl'), cur = 0, playing = false, timer = 0, raf = 0;
    function button(txt, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = txt; b.addEventListener('click', fn); ctrl.appendChild(b); return b; }
    function node(id) { return id ? svgRoot.querySelector('#' + CSS.escape(id)) : null; }
    function toRoot(el, x, y) {   // 요소 좌표 → 도식 좌표(transform·viewBox가 섞여도 맞게)
      var pt = svgRoot.createSVGPoint(); pt.x = x; pt.y = y;
      return pt.matrixTransform(el.getScreenCTM()).matrixTransform(svgRoot.getScreenCTM().inverse());
    }
    function mark(i) {   // 텍스트는 textContent로 - 단계 내용은 외부 데이터일 수 있다
      S.forEach(function (s, k) { var n = node(s.node); if (n) { n.classList.toggle('is-current', k === i); n.classList.toggle('is-done', k < i); } });
      box.querySelector('.trace-count').textContent = (i + 1) + ' / ' + S.length;
      box.querySelector('.trace-title').textContent = S[i].title || '';
      box.querySelector('.trace-text').textContent = S[i].text || '';
      prevB.disabled = i === 0; nextB.disabled = i === S.length - 1;
    }
    function travel(ids, done) {
      cancelAnimationFrame(raf);
      var paths = (ids || []).map(node).filter(Boolean), k = 0;
      if (!paths.length || still) { token.classList.remove('on'); return done(); }
      token.classList.add('on');
      (function seq() {
        if (k >= paths.length) { token.classList.remove('on'); return done(); }
        var p = paths[k++], L = p.getTotalLength(), dur = Math.max(400, L * 3), t0 = null;
        raf = requestAnimationFrame(function f(ts) {
          if (t0 === null) t0 = ts;
          var r = Math.min(1, (ts - t0) / dur), e = r < 0.5 ? 2 * r * r : 1 - Math.pow(-2 * r + 2, 2) / 2, q = p.getPointAtLength(e * L), at = toRoot(p, q.x, q.y);
          token.setAttribute('cx', at.x); token.setAttribute('cy', at.y);
          if (r < 1) raf = requestAnimationFrame(f); else seq();
        });
      })();
    }
    function go(i, instant) {
      i = Math.max(0, Math.min(S.length - 1, i));
      var forward = i === cur + 1;
      cur = i; clearTimeout(timer);
      var after = function () { mark(i); if (playing) timer = setTimeout(function () { if (cur < S.length - 1) go(cur + 1); else stop(); }, 2400); };
      if (forward && !instant) travel(S[i].via, after);
      else { cancelAnimationFrame(raf); token.classList.remove('on'); after(); }
    }
    function play() { playing = true; playB.textContent = '멈추기'; if (cur >= S.length - 1) go(0, true); else go(cur + 1); }
    function stop() { playing = false; clearTimeout(timer); playB.textContent = '재생하기'; }
    var prevB = button('이전', function () { stop(); go(cur - 1); });
    var playB = button('재생하기', function () { if (playing) stop(); else play(); });
    var nextB = button('다음', function () { stop(); go(cur + 1); });
    go(0, true);
  }
  window.MUSE = window.MUSE || {};
  window.MUSE.flow = flow;
  document.querySelectorAll('[data-flow]').forEach(flow);
  document.querySelectorAll('[data-trace]').forEach(trace);

  /* Deck - [data-deck] with .slide children; arrows/space/click navigate */
  var deck = document.querySelector('[data-deck]');
  if (deck) {
    var slides = deck.querySelectorAll('.slide');
    var i = 0;
    var prog = document.querySelector('[data-deck-progress]');
    /* 좁은 화면에서는 장을 세로로 이어 보이므로(muse.css) 넘기기를 끈다 */
    var narrow = window.matchMedia('(max-width: 720px)');
    function show(n) {
      i = Math.max(0, Math.min(slides.length - 1, n));
      slides.forEach(function (s, idx) { s.classList.toggle('active', idx === i); });
      if (prog) prog.textContent = (i + 1) + ' / ' + slides.length;
    }
    /* 장은 1280×720 한 판. 아래 48px(이동 버튼 자리)를 뺀 화면에 맞춰 배율만 바꾼다 */
    function fit() {
      var k = Math.min(window.innerWidth / 1280, (window.innerHeight - 48) / 720);
      deck.style.setProperty('--deck-zoom', k > 0 ? k : 1);
    }
    slides.forEach(function (s, idx) { if (!s.hasAttribute('data-page')) s.setAttribute('data-page', idx + 1); });
    fit();
    window.addEventListener('resize', fit);
    show(0);
    document.addEventListener('keydown', function (e) {
      if (narrow.matches) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); show(i + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(i - 1); }
    });
    /* 이전·다음 버튼은 덱 밖(.deck-nav)에 있어도 동작한다 */
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-deck-prev]')) show(i - 1);
      else if (e.target.closest('[data-deck-next]')) show(i + 1);
    });
    /* 화면 좌우 클릭으로 넘기기. 장 안의 버튼·링크·입력을 누를 때는 넘기지 않는다 */
    deck.addEventListener('click', function (e) {
      if (narrow.matches || e.target.closest('[data-deck-prev], [data-deck-next], a, button, input, select, textarea, summary, label')) return;
      show(e.clientX < window.innerWidth / 2 ? i - 1 : i + 1);
    });
  }
})();
