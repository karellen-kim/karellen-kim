/* ========================================================
   MUSE Chart v2.3 - assets/muse-chart.js
   JSON 데이터를 SVG 차트로 그린다 - 크기 bar · bullet / 변화 line · waterfall · slope · calendar /
   분포 histogram · box · dot / 관계 scatter(버블) · heatmap / 구성 segment · waffle · treemap / 흐름 sankey · funnel / 전후 dumbbell.
   색은 muse.css의 --chart-* 토큰, 모양은 muse-diagram.css의 "Chart" 절.
   차트마다 범례(계열 2개 이상)·툴팁(마우스·키보드)·표 보기를 같이 만든다.

   마크업:
     <figure class="diagram">
       <div class="diagram-title">제목</div>
       <div data-chart><script type="application/json">{ "type": "bar", ... }<\/script></div>
       <span class="cap">무엇을 볼지</span>
     </figure>
   스크립트: MUSE.chart(element, spec) - 같은 요소에 다시 부르면 새 spec으로 바꿔 그린다.
   ======================================================== */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var FS = 12;      // --text-xs. 축·라벨 글자
  var BAR = 24;     // 막대 최대 두께
  var GAP = 2;      // 맞닿은 마크 사이 캔버스색 간격
  var RAD = 4;      // 값 끝 둥근 모서리
  var DOT = 5;      // 점 반지름 (지름 8px 이상)
  var HIT = 24;     // 점 판정 반경
  var AXIS = 26;    // 아래 축 글자 띠
  var ctx = document.createElement('canvas').getContext('2d');
  var family = 'sans-serif';

  /* ---------- DOM ---------- */
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function html(tag, cls, parent, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;   // 라벨은 외부 데이터 - innerHTML 금지
    if (parent) parent.appendChild(e);
    return e;
  }
  function measure(s, weight) { ctx.font = (weight || 400) + ' ' + FS + 'px ' + family; return ctx.measureText(String(s)).width; }
  function fit(s, max, weight) {
    s = String(s);
    if (measure(s, weight) <= max) return s;
    while (s.length > 1 && measure(s + '…', weight) > max) s = s.slice(0, -1);
    return s + '…';
  }
  function label(parent, x, y, s, cls, anchor, max) {
    var bold = /mc-value|mc-cell-text/.test(cls) || (/mc-seg-text/.test(cls) && !/mc-seg-sub/.test(cls));
    var weight = bold ? 600 : 400, full = String(s), shown = max ? fit(full, max, weight) : full;
    var t = svg('text', { x: x, y: y, dy: '0.35em', 'class': cls, 'text-anchor': anchor || 'start' }, parent);
    t.textContent = shown;
    if (shown !== full) svg('title', {}, t).textContent = full;
    return t;
  }
  // 축 눈금 글자: 양 끝에서 잘리지 않게 앵커를 바꾼다
  function tick(parent, x, y, s, W) {
    var w = measure(s), a = x - w / 2 < 0 ? 'start' : x + w / 2 > W ? 'end' : 'middle';
    return label(parent, a === 'start' ? 0 : a === 'end' ? W : x, y, s, 'mc-tick', a);
  }
  // 값 끝만 둥근 막대. end = right | left | top | bottom | ''
  function bar(parent, x, y, w, h, end, cls) {
    var r = Math.min(RAD, w / 2, h / 2), d;
    if (end === 'right') d = 'M' + x + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + 'H' + x + 'Z';
    else if (end === 'left') d = 'M' + (x + w) + ' ' + y + 'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + x + ' ' + (y + r) + 'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ' ' + (y + h) + 'H' + (x + w) + 'Z';
    else if (end === 'top') d = 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
    else if (end === 'bottom') d = 'M' + x + ' ' + y + 'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ' ' + (y + h) + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x + w) + ' ' + (y + h - r) + 'V' + y + 'Z';
    else d = 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + -w + 'Z';
    return svg('path', { d: d, 'class': 'mc-bar mc-mark ' + cls }, parent);
  }

  /* ---------- 숫자 ---------- */
  function decimals(vals) {
    var d = 0;
    vals.forEach(function (v) { var m = v != null && isFinite(v) && String(v).split('.')[1]; if (m) d = Math.max(d, Math.min(m.length, 2)); });
    return d;
  }
  function formatter(o, vals) {
    var d = o.digits != null ? o.digits : decimals(vals), unit = o.unit || '';
    var nf = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
    return function (v) { return v == null || !isFinite(v) ? '–' : nf.format(v) + unit; };
  }
  function tickFormatter(ticks, o) {
    var unit = o.unit || '', step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;
    var big = Math.max.apply(null, ticks.map(Math.abs)) >= 10000;
    var d = Math.max(0, Math.min(3, -Math.floor(Math.log10(step) + 1e-9)));
    var nf = new Intl.NumberFormat('ko-KR', big ? { notation: 'compact', maximumFractionDigits: 1 } : { minimumFractionDigits: d, maximumFractionDigits: d });
    return function (v) { return nf.format(v) + unit; };
  }
  function nice(lo, hi, n) {
    if (lo === hi) { if (lo > 0) lo = 0; else if (lo < 0) hi = 0; else hi = 1; }
    var raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag, out = [];
    for (var v = Math.floor(lo / step + 1e-9) * step; v <= Math.ceil(hi / step - 1e-9) * step + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }
  // 막대는 0에서 자란다(zero). 선·점은 데이터 범위만.
  function domain(vals, o, zero, n) {
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (!vals.length) { lo = 0; hi = 1; }
    if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (o.min != null) lo = o.min;
    if (o.max != null) hi = o.max;
    var t = nice(lo, hi, n || 5);
    return { ticks: t, d0: t[0], d1: t[t.length - 1], fmt: tickFormatter(t, o) };
  }
  function scale(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / ((d1 - d0) || 1) * (r1 - r0); }; }
  function maxWidth(list, weight) { return list.reduce(function (m, s) { return Math.max(m, measure(s, weight)); }, 0); }
  function numbers(list) { return list.filter(function (v) { return v != null && isFinite(v); }); }
  function sum(list) { return list.reduce(function (a, v) { return a + (v > 0 ? v : 0); }, 0); }
  function percent(r, d) { return new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: d }).format(r); }

  /* ---------- 색 배정 ---------- */
  function slot(i) { return i < 4 ? 's' + (i + 1) : 'so'; }
  // 구성비 막대·와플은 parts 하나로 받는다 → 범주·계열 꼴로 맞춘다
  function normalize(spec) {
    if ((spec.type !== 'segment' && spec.type !== 'waffle') || !spec.parts) return spec;
    var out = {};
    for (var k in spec) out[k] = spec[k];
    out.categories = spec.parts.map(function (p) { return p.name; });
    out.series = [{ name: spec.name || '값', values: spec.parts.map(function (p) { return p.value; }) }];
    return out;
  }
  function model(spec) {
    var S = (spec.series || []).map(function (s) { return { name: s.name, values: s.values || [], low: s.low || [], high: s.high || [], points: s.points || [] }; });
    var E = spec.emphasis == null ? null : [].concat(spec.emphasis), single = S.length === 1;
    S.forEach(function (s, i) { var e = E && !single ? E.indexOf(s.name) : -2; s.cls = e === -2 ? slot(i) : e >= 0 ? slot(e) : 'so'; });
    // 덤벨: 한 색의 두 단계(이전 옅게, 이후 진하게)
    if (spec.type === 'dumbbell' && S.length === 2 && !E) { S[0].cls = 'q2'; S[1].cls = 'q4'; }
    if (S.length > 4 && !E) console.warn('[MUSE chart] 계열 색은 4개까지예요. 5번째부터는 회색으로 그려요 - "기타"로 묶거나 차트를 나눠 주세요.');
    var vals = [];
    S.forEach(function (s) { vals = vals.concat(s.values, s.low, s.high); });
    if (spec.type === 'heatmap') (spec.values || []).forEach(function (r) { vals = vals.concat(r); });
    if (spec.type === 'sankey') vals = (spec.links || []).map(function (l) { return l.value; });
    var field = { waterfall: 'steps', funnel: 'stages', treemap: 'items', bullet: 'items', calendar: 'days' }[spec.type];
    if (field) (spec[field] || []).forEach(function (o) { vals = vals.concat([o.value, o.target]).concat(o.ranges || []); });
    if (spec.type === 'calendar' && spec.values) vals = vals.concat(spec.values);
    if (spec.type === 'histogram') vals = Array.isArray(spec.bins) ? [].concat.apply([], spec.bins.map(function (b) { return [b.from, b.to]; })) : spec.values || [];
    if (spec.type === 'box') vals = spec.stats ? [].concat.apply([], spec.stats.map(function (s) { return [s.min, s.q1, s.median, s.q3, s.max]; })) : [].concat.apply([], spec.values || []);
    var pos = spec.diverging === 'cool' || spec.positive === 'cool' ? 'dc' : 'dw', neg = pos === 'dw' ? 'dc' : 'dw';
    var m = {
      series: S, fmt: formatter(spec, numbers(vals)), pos: pos, neg: neg, unit: spec.unit,
      cls: function (j, i, v) {
        if (spec.type === 'segment' || spec.type === 'waffle') return slot(i);
        if (spec.diverging && single) return v < 0 ? neg : pos;
        if (E && (single || !S.length)) return E.indexOf((spec.categories || [])[i]) >= 0 ? 's1' : 'so';
        return S[j] ? S[j].cls : 's1';
      }
    };
    if (spec.type === 'scatter') {
      var xs = [], ys = [];
      S.forEach(function (s) { s.points.forEach(function (p) { xs.push(p.x); ys.push(p.y); }); });
      m.fx = formatter(spec.x || {}, numbers(xs)); m.fy = formatter(spec.y || {}, numbers(ys));
    }
    if (spec.type === 'heatmap') m.bins = bins(spec, numbers(vals), m.fmt);
    if (spec.type === 'sankey') m.graph = sankeyGraph(spec);
    if (spec.type === 'histogram') { m.hist = histBins(spec); m.marks = histMarks(spec); }
    if (spec.type === 'box') m.box = boxStats(spec);
    if (spec.type === 'calendar') { m.days = calendarDays(spec); m.bins = bins(spec, numbers(m.days.map(function (d) { return d.v; })), m.fmt); }
    if (spec.type === 'treemap') m.groups = treeGroups(spec, E);
    if (spec.type === 'scatter' && spec.size) {
      var ss = [];
      S.forEach(function (s) { s.points.forEach(function (p) { ss.push(p.size); }); });
      m.fs = formatter(spec.size, numbers(ss)); m.smax = Math.max.apply(null, numbers(ss).concat([1e-9]));
    }
    return m;
  }
  // 1·2·2.5·5 × 10^k 중 x 이상인 가장 작은 값 - 범례 경계를 둥근 수로
  function niceUp(x) {
    var mag = Math.pow(10, Math.floor(Math.log10(x || 1)));
    return [1, 2, 2.5, 5, 10].map(function (f) { return f * mag; }).filter(function (v) { return v >= x - 1e-9; })[0];
  }
  // 히트맵: 크기는 seq 5단(둥근 등간격), 증감은 기준(center) 대칭 5단
  function bins(spec, vals, fmt) {
    var lo = spec.domain ? spec.domain[0] : Math.min.apply(null, vals), hi = spec.domain ? spec.domain[1] : Math.max.apply(null, vals);
    var edges, cls;
    if (spec.scale === 'div') {
      var c = spec.center || 0, u = niceUp((Math.max(Math.abs(lo - c), Math.abs(hi - c)) || 1) / 5);
      edges = [c - 3 * u, c - u, c + u, c + 3 * u];
      cls = spec.positive === 'cool' ? ['dw2', 'dw1', 'dm', 'dc1', 'dc2'] : ['dc2', 'dc1', 'dm', 'dw1', 'dw2'];
    } else {
      var step = niceUp(((hi - lo) || 1) / 5), start = Math.floor(lo / step) * step;
      while (start + 5 * step < hi) step = niceUp(step * 1.01);
      edges = [1, 2, 3, 4].map(function (k) { return +(start + k * step).toFixed(10); });
      cls = ['q1', 'q2', 'q3', 'q4', 'q5'];
    }
    return {
      of: function (v) { for (var i = 0; i < 4; i++) if (v < edges[i]) return cls[i]; return cls[4]; },
      legend: cls.map(function (k, i) { return { cls: k, text: i === 0 ? fmt(edges[0]) + ' 미만' : i === 4 ? fmt(edges[3]) + ' 이상' : fmt(edges[i - 1]) + '–' + fmt(edges[i]) }; })
    };
  }

  /* ---------- 차트 종류 ---------- */
  function drawBar(g, spec, m, W) {
    var cats = spec.categories || [], S = m.series, k = S.length, n = cats.length;
    var vertical = spec.orientation === 'vertical', stacked = !!spec.stacked && k > 1, pop = spec.mark === 'lollipop' && !stacked, off = pop ? DOT + 6 : 6;
    var showVal = spec.labels != null ? !!spec.labels : (k === 1 || stacked);
    var totals = cats.map(function (_, i) { return S.reduce(function (a, s) { return a + (s.values[i] > 0 ? s.values[i] : 0); }, 0); });
    var vals = stacked ? totals : numbers([].concat.apply([], S.map(function (s) { return s.values; })));
    var dm = domain(vals, spec, true), targets = [], valTexts = (stacked ? totals : vals).map(m.fmt);
    var t, group, x, y, top, H, marksAt = [];
    var lastPos = cats.map(function (_, i) { var l = -1; S.forEach(function (s, j) { if (s.values[i] > 0) l = j; }); return l; });

    if (!vertical) {
      t = k === 1 || stacked ? 20 : 14;
      group = stacked ? t : k * t + (k - 1) * GAP;
      var band = group + 14, labW = Math.min(maxWidth(cats) + 12, W * 0.36);
      var valW = showVal ? maxWidth(valTexts, 600) + 8 : 0, padL = dm.d0 < 0 && showVal ? valW : 0;
      x = scale(dm.d0, dm.d1, labW + padL, W - Math.max(valW, 14));
      top = 4; H = top + n * band + AXIS;
      dm.ticks.forEach(function (v) { if (v !== 0) svg('line', { x1: x(v), x2: x(v), y1: top, y2: top + n * band, 'class': 'mc-grid' }, g); tick(g, x(v), H - 10, dm.fmt(v), W); });
      cats.forEach(function (c, i) {
        var y0 = top + i * band, gy = y0 + (band - group) / 2, marks = [], rows = [], end = x(0), acc = 0;
        label(g, labW - 10, y0 + band / 2, c, 'mc-label', 'end', labW - 10);
        S.forEach(function (s, j) {
          var v = s.values[i], cls = m.cls(j, i, v);
          rows.push({ cls: cls, value: m.fmt(v), name: s.name });
          if (v == null) return;
          if (stacked) {
            if (!(v > 0)) return;
            var a = x(acc), b = x(acc + v), last = j === lastPos[i]; acc += v; end = b;
            if (b - a - (last ? 0 : GAP) > 0.5) marks.push(bar(g, a, gy, b - a - (last ? 0 : GAP), t, last ? 'right' : '', cls));
          } else {
            var a2 = x(Math.min(0, v)), b2 = x(Math.max(0, v)), yy = gy + j * (t + GAP);
            if (pop) marks.push(svg('line', { x1: a2, x2: b2, y1: yy + t / 2, y2: yy + t / 2, 'class': 'mc-stem mc-mark ' + cls }, g), svg('circle', { cx: v < 0 ? a2 : b2, cy: yy + t / 2, r: DOT, 'class': 'mc-dot mc-mark ' + cls }, g));
            else if (b2 - a2 > 0.5) marks.push(bar(g, a2, yy, b2 - a2, t, v < 0 ? 'left' : 'right', cls));
            if (showVal) label(g, v < 0 ? a2 - off : b2 + off, yy + t / 2, m.fmt(v), 'mc-value', v < 0 ? 'end' : 'start');
            end = Math.max(end, b2);
          }
        });
        if (stacked) { rows.push({ value: m.fmt(totals[i]), name: '합계' }); if (showVal) label(g, end + 6, gy + t / 2, m.fmt(totals[i]), 'mc-value'); }
        targets.push({ box: [0, y0, W, band], ax: end, ay: y0 + band / 2, title: c, rows: rows, marks: marks });
      });
      svg('line', { x1: x(0), x2: x(0), y1: top, y2: top + n * band, 'class': 'mc-base' }, g);
      return { h: H, targets: targets };
    }

    var ph = spec.height || 240, x0 = maxWidth(dm.ticks.map(dm.fmt)) + 10, bandW = (W - x0 - 4) / n;
    t = stacked || k === 1 ? Math.min(BAR, bandW * 0.6) : Math.min(BAR, (bandW * 0.72 - (k - 1) * GAP) / k);
    group = stacked ? t : k * t + (k - 1) * GAP;
    top = showVal ? 20 : 8; H = top + ph + AXIS;
    y = scale(dm.d0, dm.d1, top + ph, top);
    dm.ticks.forEach(function (v) { if (v !== 0) svg('line', { x1: x0, x2: W, y1: y(v), y2: y(v), 'class': 'mc-grid' }, g); label(g, x0 - 8, y(v), dm.fmt(v), 'mc-tick', 'end'); });
    var every = Math.max(1, Math.ceil((maxWidth(cats) + 8) / bandW));
    cats.forEach(function (c, i) {
      var bx = x0 + i * bandW, gx = bx + (bandW - group) / 2, marks = [], rows = [], acc = 0, peak = y(0);
      if (i % every === 0) label(g, bx + bandW / 2, top + ph + 14, c, 'mc-label', 'middle', bandW * every - 6);
      S.forEach(function (s, j) {
        var v = s.values[i], cls = m.cls(j, i, v);
        rows.push({ cls: cls, value: m.fmt(v), name: s.name });
        if (v == null) return;
        if (stacked) {
          if (!(v > 0)) return;
          var a = y(acc), b = y(acc + v), last = j === lastPos[i]; acc += v; peak = b;
          if (a - b - (last ? 0 : GAP) > 0.5) marks.push(bar(g, gx, b + (last ? 0 : GAP), t, a - b - (last ? 0 : GAP), last ? 'top' : '', cls));
        } else {
          var hi = y(Math.max(0, v)), lo = y(Math.min(0, v)), xx = gx + j * (t + GAP), txt = m.fmt(v);
          if (pop) marks.push(svg('line', { x1: xx + t / 2, x2: xx + t / 2, y1: hi, y2: lo, 'class': 'mc-stem mc-mark ' + cls }, g), svg('circle', { cx: xx + t / 2, cy: v < 0 ? lo : hi, r: DOT, 'class': 'mc-dot mc-mark ' + cls }, g));
          else if (lo - hi > 0.5) marks.push(bar(g, xx, hi, t, lo - hi, v < 0 ? 'bottom' : 'top', cls));
          if (showVal && measure(txt, 600) <= bandW - 2) label(g, xx + t / 2, v < 0 ? lo + off + 4 : hi - off - 4, txt, 'mc-value', 'middle');
          peak = Math.min(peak, hi);
        }
      });
      if (stacked) { rows.push({ value: m.fmt(totals[i]), name: '합계' }); if (showVal && measure(m.fmt(totals[i]), 600) <= bandW - 2) label(g, gx + t / 2, peak - 10, m.fmt(totals[i]), 'mc-value', 'middle'); }
      targets.push({ box: [bx, top, bandW, ph], ax: bx + bandW / 2, ay: peak, title: c, rows: rows, marks: marks });
    });
    svg('line', { x1: x0, x2: W, y1: y(0), y2: y(0), 'class': 'mc-base' }, g);
    return { h: H, targets: targets };
  }

  function drawLine(g, spec, m, W) {
    var cats = spec.categories || [], S = m.series, n = cats.length;
    var vals = numbers([].concat.apply([], S.map(function (s) { return s.values; })));
    var dm = domain(vals, spec, spec.zero === true || !!spec.area), ph = spec.height || 240, top = 10, H = top + ph + AXIS;  // 영역은 0부터
    var endLab = spec.labels != null ? !!spec.labels : (S.length > 1 && S.length <= 4);
    var x0 = maxWidth(dm.ticks.map(dm.fmt)) + 10, x1 = W - (endLab ? maxWidth(S.map(function (s) { return s.name; })) + 16 : 12);
    var px = function (i) { return n === 1 ? (x0 + x1) / 2 : x0 + i * (x1 - x0) / (n - 1); };
    var y = scale(dm.d0, dm.d1, top + ph, top), step = n > 1 ? (x1 - x0) / (n - 1) : x1 - x0, targets = [], ends = [];
    dm.ticks.forEach(function (v) { svg('line', { x1: x0, x2: x1, y1: y(v), y2: y(v), 'class': v === 0 ? 'mc-base' : 'mc-grid' }, g); label(g, x0 - 8, y(v), dm.fmt(v), 'mc-tick', 'end'); });
    var every = Math.max(1, Math.ceil((maxWidth(cats) + 8) / step));
    cats.forEach(function (c, i) { if (i % every === 0 || i === n - 1 && (n - 1) % every > every / 2) tick(g, px(i), top + ph + 14, c, W); });
    S.forEach(function (s) {
      var d = '', pen = false, last = -1;
      s.values.forEach(function (v, i) { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + px(i) + ' ' + y(v); pen = true; last = i; });
      // 영역: 계열 하나이고 빈 값이 없을 때만 옅게 깐다(여러 겹은 탁해진다)
      if (spec.area && S.length === 1 && d && s.values.every(function (v) { return v != null; })) {
        var base = y(Math.max(dm.d0, Math.min(0, dm.d1)));
        svg('path', { d: d + 'L' + px(n - 1) + ' ' + base + 'L' + px(0) + ' ' + base + 'Z', 'class': 'mc-area ' + s.cls }, g);
      }
      svg('path', { d: d, 'class': 'mc-line ' + s.cls }, g);
      if (last >= 0) { svg('circle', { cx: px(last), cy: y(s.values[last]), r: 4, 'class': 'mc-dot ' + s.cls }, g); ends.push({ y: y(s.values[last]), x: px(last), name: s.name }); }
    });
    // 끝 라벨: 서로 14px 안으로 붙으면 모두 빼고 범례에 맡긴다 (밀어서 쌓지 않는다)
    ends.sort(function (a, b) { return a.y - b.y; });
    var clash = ends.some(function (e, i) { return i && e.y - ends[i - 1].y < 14; });
    if (endLab && !clash) ends.forEach(function (e) { label(g, e.x + 8, e.y, e.name, 'mc-label', 'start', W - e.x - 10); });
    cats.forEach(function (c, i) {
      var hover = [svg('line', { x1: px(i), x2: px(i), y1: top, y2: top + ph, 'class': 'mc-cross mc-hover' }, g)], rows = [], ay = top + ph;
      S.forEach(function (s) {
        var v = s.values[i];
        rows.push({ cls: s.cls, value: m.fmt(v), name: s.name });
        if (v != null) { hover.push(svg('circle', { cx: px(i), cy: y(v), r: 4, 'class': 'mc-dot mc-hover ' + s.cls }, g)); ay = Math.min(ay, y(v)); }
      });
      targets.push({ box: [px(i) - step / 2, top, step, ph], ax: px(i), ay: ay, title: c, rows: rows, hover: hover });
    });
    return { h: H, targets: targets };
  }

  function drawScatter(g, spec, m, W) {
    var X = spec.x || {}, Y = spec.y || {}, S = m.series, xs = [], ys = [];
    S.forEach(function (s) { s.points.forEach(function (p) { xs.push(p.x); ys.push(p.y); }); });
    var dx = domain(numbers(xs), X, X.zero === true), dy = domain(numbers(ys), Y, Y.zero === true);
    var ph = spec.height || 280, top = Y.label ? 24 : 10, H = top + ph + AXIS + (X.label ? 18 : 0);
    var x0 = maxWidth(dy.ticks.map(dy.fmt)) + 10, x1 = W - 12, x = scale(dx.d0, dx.d1, x0, x1), y = scale(dy.d0, dy.d1, top + ph, top);
    dx.ticks.forEach(function (v) { svg('line', { x1: x(v), x2: x(v), y1: top, y2: top + ph, 'class': 'mc-grid' }, g); tick(g, x(v), top + ph + 14, dx.fmt(v), W); });
    dy.ticks.forEach(function (v) { svg('line', { x1: x0, x2: x1, y1: y(v), y2: y(v), 'class': 'mc-grid' }, g); label(g, x0 - 8, y(v), dy.fmt(v), 'mc-tick', 'end'); });
    if (Y.label) label(g, x0, 8, Y.label, 'mc-axis-title');
    if (X.label) label(g, x1, H - 8, X.label, 'mc-axis-title', 'end');
    var targets = [], placed = [];
    S.forEach(function (s) {
      s.points.forEach(function (p) {
        if (p.x == null || p.y == null) return;
        var r = m.fs && p.size != null ? Math.max(3, 20 * Math.sqrt(Math.max(0, p.size) / m.smax)) : DOT;  // 버블: 넓이가 크기
        var cx = x(p.x), cy = y(p.y), dot = svg('circle', { cx: cx, cy: cy, r: r, 'class': 'mc-dot mc-mark ' + s.cls + (m.fs ? ' mc-bubble' : '') }, g);
        var prow = [{ value: m.fy(p.y), name: Y.label || 'y' }, { value: m.fx(p.x), name: X.label || 'x' }];
        if (m.fs) prow.push({ value: m.fs(p.size), name: spec.size.label || '크기' });
        targets.push({ ax: cx, ay: cy, title: p.label || s.name, key: s.cls, marks: [dot], rows: prow });
        if (p.label == null || spec.labels === false) return;
        // 라벨은 고른 점에만, 겹치면 반대편, 그래도 겹치면 생략(툴팁·표에 남는다)
        var w = measure(p.label);
        [[cx + r + 4, 'start'], [cx - r - 4, 'end']].some(function (o) {
          var bx = o[1] === 'start' ? o[0] : o[0] - w, box = [bx - 2, cy - 9, w + 4, 18];
          if (bx < 0 || bx + w > W || placed.some(function (b) { return !(box[0] > b[0] + b[2] || box[0] + box[2] < b[0] || box[1] > b[1] + b[3] || box[1] + box[3] < b[1]); })) return false;
          placed.push(box); label(g, o[0], cy, p.label, 'mc-label', o[1]); return true;
        });
      });
    });
    targets.sort(function (a, b) { return a.ax - b.ax || a.ay - b.ay; });
    return { h: H, targets: targets };
  }

  // dot: 점 + 구간. dumbbell: 같은 줄에 이전·이후 두 점과 잇는 선
  function drawDot(g, spec, m, W) {
    var dumb = spec.type === 'dumbbell', cats = spec.categories || [], S = dumb ? m.series.slice(0, 2) : m.series, k = S.length, n = cats.length, vals = [];
    S.forEach(function (s) { vals = vals.concat(s.values, s.low, s.high); });
    if (spec.reference != null) vals.push(spec.reference);
    var dm = domain(numbers(vals), spec, false), off = dumb ? 0 : 12, band = Math.max(32, k * off + 20);
    var labW = Math.min(maxWidth(cats) + 12, W * 0.36), x = scale(dm.d0, dm.d1, labW, W - 14), top = 4, H = top + n * band + AXIS, targets = [];
    dm.ticks.forEach(function (v) { svg('line', { x1: x(v), x2: x(v), y1: top, y2: top + n * band, 'class': 'mc-grid' }, g); tick(g, x(v), H - 10, dm.fmt(v), W); });
    if (spec.reference != null) svg('line', { x1: x(spec.reference), x2: x(spec.reference), y1: top, y2: top + n * band, 'class': 'mc-base' }, g);
    cats.forEach(function (c, i) {
      var y0 = top + i * band, marks = [], rows = [], ax = labW;
      label(g, labW - 10, y0 + band / 2, c, 'mc-label', 'end', labW - 10);
      var a = dumb && k === 2 ? S[0].values[i] : null, b = a != null ? S[1].values[i] : null;
      if (a != null && b != null) marks.push(svg('line', { x1: x(a), x2: x(b), y1: y0 + band / 2, y2: y0 + band / 2, 'class': 'mc-connector mc-mark' }, g));
      S.forEach(function (s, j) {
        var v = s.values[i], lo = s.low[i], hi = s.high[i], cy = y0 + band / 2 + (j - (k - 1) / 2) * off;
        var range = lo != null && hi != null ? m.fmt(lo) + '–' + m.fmt(hi) : '';
        rows.push({ cls: s.cls, value: m.fmt(v), name: [s.name, range].filter(Boolean).join(' · ') });
        if (lo != null && hi != null) marks.push(svg('line', { x1: x(lo), x2: x(hi), y1: cy, y2: cy, 'class': 'mc-ci mc-mark ' + s.cls }, g));
        if (v != null) { marks.push(svg('circle', { cx: x(v), cy: cy, r: DOT, 'class': 'mc-dot mc-mark ' + s.cls }, g)); ax = Math.max(ax, x(hi != null ? hi : v)); }
      });
      if (a != null && b != null) rows.push({ value: signed(m, b - a), name: '변화' });
      targets.push({ box: [0, y0, W, band], ax: ax, ay: y0 + band / 2, title: c, rows: rows, marks: marks });
    });
    return { h: H, targets: targets };
  }

  function drawHeatmap(g, spec, m, W) {
    var R = spec.rows || [], C = spec.columns || [], V = spec.values || [];
    var labW = Math.min(maxWidth(R) + 12, W * 0.3), cw = (W - labW) / C.length, ch = spec.cellHeight || 32, top = 28, targets = [];
    C.forEach(function (c, j) { label(g, labW + j * cw + cw / 2, top - 14, c, 'mc-label', 'middle', cw - 4); });
    R.forEach(function (r, i) {
      label(g, labW - 10, top + i * ch + ch / 2, r, 'mc-label', 'end', labW - 10);
      C.forEach(function (c, j) {
        var v = (V[i] || [])[j], cx = labW + j * cw, cy = top + i * ch, w = cw - GAP, h = ch - GAP, k = v == null ? '' : m.bins.of(v);
        var cell = svg('rect', { x: cx + GAP / 2, y: cy + GAP / 2, width: Math.max(w, 0), height: h, rx: Math.min(RAD, w / 2, h / 2), 'class': v == null ? 'mc-empty' : 'mc-cell mc-mark ' + k }, g);
        var txt = m.fmt(v);
        if (spec.labels !== false && measure(txt, 600) + 8 <= w) label(g, cx + cw / 2, cy + ch / 2, txt, v == null ? 'mc-tick' : 'mc-cell-text ' + k, 'middle');
        targets.push({ box: [cx, cy, cw, ch], ax: cx + cw, ay: cy + ch / 2, title: r + ' · ' + c, rows: [{ value: txt }], marks: [cell] });
      });
    });
    return { h: top + R.length * ch + 4, targets: targets, cols: C.length };
  }

  // 샌키 그래프: 노드 열은 시작점에서 가장 긴 경로(왼쪽 정렬), 값은 들어온 것·나간 것 중 큰 쪽
  function sankeyGraph(spec) {
    var nodes = (spec.nodes || []).map(function (n) {
      var id = n.id != null ? n.id : n.name;
      return { id: id, name: n.name != null ? n.name : String(id), cls: n.other ? 'so' : n.group ? slot(n.group - 1) : 's1', col: n.column, ins: [], outs: [] };
    });
    var by = {};
    nodes.forEach(function (n) { by[n.id] = n; });
    var links = (spec.links || []).map(function (l) { return { s: by[l.source], t: by[l.target], v: +l.value }; }).filter(function (l) { return l.s && l.t && l.v > 0; });
    links.forEach(function (l) { l.s.outs.push(l); l.t.ins.push(l); l.cls = l.t.cls === 'so' ? 'so' : l.s.cls; }); // 이탈 흐름은 회색
    function depth(n, path) {
      if (n.d != null) return n.d;
      if (n.col != null) return (n.d = n.col);
      if (path.indexOf(n) >= 0) return 0; // 순환은 끊는다
      var d = 0;
      n.ins.forEach(function (l) { d = Math.max(d, depth(l.s, path.concat([n])) + 1); });
      return (n.d = d);
    }
    var vals = function (ls) { return ls.map(function (l) { return l.v; }); };
    nodes.forEach(function (n) { depth(n, []); n.v = Math.max(sum(vals(n.ins)), sum(vals(n.outs))); n.next = sum(vals(n.outs.filter(function (l) { return l.t.cls !== 'so'; }))); });
    return { nodes: nodes, links: links };
  }
  function drawSankey(g, spec, m, W) {
    var N = m.graph.nodes, L = m.graph.links, targets = [], nodeW = 10, pad = 16, top = 4, cols = [];
    N.forEach(function (n) { (cols[n.d] = cols[n.d] || []).push(n); });
    var nc = cols.length, total = function (c) { return sum((c || []).map(function (n) { return n.v; })); };
    if (!nc) return { h: 40, targets: [] };
    W = Math.max(W, nc * 140); // 좁으면 가로로 스크롤한다
    var padR = maxWidth((cols[nc - 1] || []).map(function (n) { return n.name + ' ' + m.fmt(n.v); }), 600) + 10;
    var ph = spec.height || Math.max(200, Math.max.apply(null, cols.map(function (c) { return c ? c.length : 0; })) * 48);
    var ky = Math.min.apply(null, cols.filter(Boolean).map(function (c) { return (ph - (c.length - 1) * pad) / (total(c) || 1); }));
    cols.forEach(function (c, d) {
      if (!c) return;
      var y = top + (ph - total(c) * ky - (c.length - 1) * pad) / 2;
      c.forEach(function (n) { n.x = nc === 1 ? 0 : d * (W - padR - nodeW) / (nc - 1); n.y = y; n.h = Math.max(1, n.v * ky); y += n.h + pad; });
    });
    N.forEach(function (n) {
      var o = 0;
      n.outs.sort(function (a, b) { return a.t.y - b.t.y; }).forEach(function (l) { l.sy = n.y + o; o += l.v * ky; });
      o = 0;
      n.ins.sort(function (a, b) { return a.s.y - b.s.y; }).forEach(function (l) { l.ty = n.y + o; o += l.v * ky; });
    });
    var maxV = Math.max.apply(null, L.map(function (l) { return l.v; }).concat([1]));
    L.forEach(function (l) {
      var w = l.v * ky, x0 = l.s.x + nodeW, x1 = l.t.x, xm = (x0 + x1) / 2;
      l.el = svg('path', { d: 'M' + x0 + ' ' + l.sy + 'C' + xm + ' ' + l.sy + ' ' + xm + ' ' + l.ty + ' ' + x1 + ' ' + l.ty + 'V' + (l.ty + w) +
        'C' + xm + ' ' + (l.ty + w) + ' ' + xm + ' ' + (l.sy + w) + ' ' + x0 + ' ' + (l.sy + w) + 'Z', 'class': 'mc-link mc-mark ' + l.cls }, g);
      // 움직임: 흐름 가운데 선을 따라 점이 흐른다. 점 개수는 가장 큰 흐름 대비 물량(1~6개)
      if (spec.motion) svg('path', { d: 'M' + x0 + ' ' + (l.sy + w / 2) + 'C' + xm + ' ' + (l.sy + w / 2) + ' ' + xm + ' ' + (l.ty + w / 2) + ' ' + x1 + ' ' + (l.ty + w / 2),
        'class': 'mc-flowline', 'data-rate': Math.max(1, Math.round(6 * l.v / maxV)), 'data-tone': l.cls === 'so' ? 'other' : l.cls.slice(1) }, g);
    });
    N.forEach(function (n) {
      n.el = svg('rect', { x: n.x, y: n.y, width: nodeW, height: n.h, rx: Math.min(2, n.h / 2), 'class': 'mc-bar mc-mark ' + n.cls }, g);
      var t = svg('text', { x: n.x + nodeW + 6, y: n.y + n.h / 2, dy: '0.35em', 'class': 'mc-label mc-halo' }, g);
      t.appendChild(document.createTextNode(n.name + ' '));
      svg('tspan', { 'class': 'mc-value' }, t).textContent = m.fmt(n.v);
    });
    N.forEach(function (n) {
      var rows = [{ value: m.fmt(n.v), name: '합계' }];
      if (n.outs.length && n.next < n.v) rows.push({ value: m.fmt(n.next), name: '다음 단계로 ' + percent(n.next / (n.v || 1), 1) }); // 회색(이탈)을 뺀 나머지
      targets.push({ box: [n.x - 6, n.y - 2, nodeW + 12, n.h + 4], ax: n.x + nodeW, ay: n.y + n.h / 2, title: n.name, key: n.cls, rows: rows,
        marks: [n.el].concat(n.ins.map(function (l) { return l.el; }), n.outs.map(function (l) { return l.el; })) });
    });
    L.forEach(function (l) {
      targets.push({ path: l.el, ax: (l.s.x + nodeW + l.t.x) / 2, ay: (l.sy + l.ty + l.v * ky) / 2, title: l.s.name + ' → ' + l.t.name, key: l.cls,
        rows: [{ value: m.fmt(l.v) }, { value: percent(l.v / (l.s.v || 1), 1), name: l.s.name + ' 대비' }], marks: [l.el, l.s.el, l.t.el] });
    });
    return { h: top + ph + 4, w: W, targets: targets };
  }

  // 구성비 막대: 한 전체를 조각으로, 조각 안에는 들어갈 때만 비중을 쓴다
  function drawSegment(g, spec, m, W) {
    var cats = spec.categories || [], v = m.series[0] ? m.series[0].values : [], tot = sum(v) || 1, h = 28, x = 0, targets = [];
    var avail = W - GAP * Math.max(0, v.filter(function (a) { return a > 0; }).length - 1);
    if (cats.length > 5) console.warn('[MUSE chart] 구성비 막대는 4조각 + 기타까지예요.');
    cats.forEach(function (c, i) {
      if (!(v[i] > 0)) return;
      var w = v[i] / tot * avail, cls = slot(i), share = percent(v[i] / tot, 0);
      var rect = svg('rect', { x: x, y: 0, width: w, height: h, rx: Math.min(RAD, w / 2), 'class': 'mc-bar mc-mark ' + cls }, g);
      if (measure(share, 600) + 12 <= w) label(g, x + 8, h / 2, share, 'mc-seg-text ' + cls);
      targets.push({ box: [x, 0, w, h], ax: x + w / 2, ay: h, below: true, title: c, key: cls, marks: [rect],
        rows: [{ value: m.fmt(v[i]) }, { value: percent(v[i] / tot, 1), name: '비중' }] });
      x += w + GAP;
    });
    return { h: h, targets: targets };
  }

  /* ---------- 분포 ---------- */
  function quantile(s, q) { var p = (s.length - 1) * q, a = Math.floor(p), b = Math.ceil(p); return s[a] + (s[b] - s[a]) * (p - a); }
  function sorted(list) { return numbers(list || []).slice().sort(function (a, b) { return a - b; }); }
  // 히스토그램 구간: 원값이면 둥근 폭으로 나누고, bins 배열이면 그대로 쓴다
  function histBins(spec) {
    if (Array.isArray(spec.bins)) return spec.bins.map(function (b) { return { from: b.from, to: b.to, n: b.count || 0 }; });
    var v = numbers(spec.values || []), out = [];
    if (!v.length) return out;
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), step = niceUp(((hi - lo) || 1) / (spec.bins || 12)), start = Math.floor(lo / step) * step;
    for (var a = start; a < hi - 1e-9 || !out.length; a += step) out.push({ from: +a.toFixed(10), to: +(a + step).toFixed(10), n: 0 });
    v.forEach(function (x) { out[Math.min(out.length - 1, Math.floor((x - start) / step + 1e-9))].n++; });
    return out;
  }
  function histMarks(spec) {
    var s = sorted(spec.values), out = (spec.markers || []).slice();
    if (s.length) (spec.percentiles || []).forEach(function (p) { out.push({ label: 'p' + p, value: quantile(s, p / 100) }); });
    return out;
  }
  // 상자 수염: 수염은 1.5×IQR 안의 최솟값·최댓값, 바깥은 이상치
  function boxStats(spec) {
    if (spec.stats) return spec.stats.map(function (s) { return { n: s.n, min: s.min, q1: s.q1, med: s.median, q3: s.q3, max: s.max, out: s.outliers || [] }; });
    return (spec.values || []).map(function (list) {
      var s = sorted(list);
      if (!s.length) return { n: 0, out: [] };
      var q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), f = 1.5 * (q3 - q1), inner = s.filter(function (v) { return v >= q1 - f && v <= q3 + f; });
      return { n: s.length, min: inner[0], q1: q1, med: quantile(s, 0.5), q3: q3, max: inner[inner.length - 1], out: s.filter(function (v) { return v < q1 - f || v > q3 + f; }) };
    });
  }
  function drawHistogram(g, spec, m, W) {
    var B = m.hist, targets = [];
    if (!B.length) return { h: 40, targets: targets };
    var counts = B.map(function (b) { return b.n; }), tot = sum(counts) || 1, unit = spec.countUnit || '개';
    var dy = domain(counts, {}, true), ph = spec.height || 200, top = m.marks.length ? 26 : 8, H = top + ph + AXIS;
    var x0 = maxWidth(dy.ticks.map(dy.fmt)) + 10, lo = B[0].from, hi = B[B.length - 1].to, x = scale(lo, hi, x0, W - 8), y = scale(dy.d0, dy.d1, top + ph, top);
    dy.ticks.forEach(function (v) { if (v) svg('line', { x1: x0, x2: W - 8, y1: y(v), y2: y(v), 'class': 'mc-grid' }, g); label(g, x0 - 8, y(v), dy.fmt(v), 'mc-tick', 'end'); });
    var xt = nice(lo, hi, 6).filter(function (t) { return t >= lo - 1e-9 && t <= hi + 1e-9; }), fx = tickFormatter(xt, spec);
    xt.forEach(function (t) { tick(g, x(t), top + ph + 14, fx(t), W); });
    B.forEach(function (b) {
      var a = x(b.from), bw = x(b.to) - a, rect = b.n > 0 && bw - GAP > 0.5 ? bar(g, a + GAP / 2, y(b.n), bw - GAP, y(0) - y(b.n), 'top', 's1') : null;
      targets.push({ box: [a, top, bw, ph], ax: a + bw / 2, ay: y(b.n), title: m.fmt(b.from) + '–' + m.fmt(b.to), marks: rect ? [rect] : [],
        rows: [{ value: b.n.toLocaleString('ko-KR') + unit }, { value: percent(b.n / tot, 1), name: '비중' }] });
    });
    svg('line', { x1: x0, x2: W - 8, y1: y(0), y2: y(0), 'class': 'mc-base' }, g);
    var lastX = -1e9, row = 0;
    m.marks.forEach(function (k) { // p50·p95 같은 기준선. 라벨이 붙으면 한 줄 내린다
      var px = x(k.value), txt = k.label + ' ' + m.fmt(k.value), w = measure(txt);
      row = px - lastX < w + 8 ? 1 - row : 0; lastX = px;
      svg('line', { x1: px, x2: px, y1: top - 2, y2: top + ph, 'class': 'mc-marker' }, g);
      label(g, px, row ? top + 10 : top - 12, txt, 'mc-label mc-halo', px + w / 2 > W ? 'end' : 'middle');
    });
    return { h: H, targets: targets };
  }
  function drawBox(g, spec, m, W) {
    var cats = spec.categories || [], St = m.box, n = cats.length, all = [], band = 36, targets = [];
    St.forEach(function (s) { all = all.concat([s.min, s.max], s.out); });
    var dm = domain(numbers(all), spec, false), labW = Math.min(maxWidth(cats) + 12, W * 0.36), x = scale(dm.d0, dm.d1, labW, W - 14), top = 4, H = top + n * band + AXIS;
    dm.ticks.forEach(function (v) { svg('line', { x1: x(v), x2: x(v), y1: top, y2: top + n * band, 'class': 'mc-grid' }, g); tick(g, x(v), H - 10, dm.fmt(v), W); });
    cats.forEach(function (c, i) {
      var s = St[i] || { n: 0, out: [] }, y0 = top + i * band, cy = y0 + band / 2, cls = m.cls(0, i), marks = [], rows = [];
      label(g, labW - 10, cy, c, 'mc-label', 'end', labW - 10);
      if (s.med != null) {
        [[s.min, s.q1], [s.q3, s.max]].forEach(function (p) { marks.push(svg('line', { x1: x(p[0]), x2: x(p[1]), y1: cy, y2: cy, 'class': 'mc-whisker mc-mark' }, g)); });
        [s.min, s.max].forEach(function (v) { marks.push(svg('line', { x1: x(v), x2: x(v), y1: cy - 5, y2: cy + 5, 'class': 'mc-whisker mc-mark' }, g)); });
        marks.push(svg('rect', { x: x(s.q1), y: cy - 9, width: Math.max(1, x(s.q3) - x(s.q1)), height: 18, rx: RAD, 'class': 'mc-box mc-mark ' + cls }, g));
        marks.push(svg('line', { x1: x(s.med), x2: x(s.med), y1: cy - 9, y2: cy + 9, 'class': 'mc-median mc-mark ' + cls }, g));
        s.out.forEach(function (v) { marks.push(svg('circle', { cx: x(v), cy: cy, r: 3, 'class': 'mc-outlier mc-mark ' + cls }, g)); });
        rows = [{ cls: cls, value: m.fmt(s.med), name: '중앙값' }, { value: m.fmt(s.q1) + '–' + m.fmt(s.q3), name: '가운데 50%' }, { value: m.fmt(s.min) + '–' + m.fmt(s.max), name: '수염' }];
        if (s.out.length) rows.push({ value: s.out.length + '개', name: '이상치' });
        if (s.n) rows.push({ value: s.n.toLocaleString('ko-KR') + '개', name: '표본' });
      }
      targets.push({ box: [0, y0, W, band], ax: x(s.max != null ? s.max : dm.d0), ay: cy, title: c, rows: rows, marks: marks });
    });
    return { h: H, targets: targets };
  }

  /* ---------- 변화 ---------- */
  // 폭포: 기준에서 단계별 증감이 쌓여 최종에 닿는다. total 단계는 0에서 선다
  function waterfallBars(spec) {
    var run = 0;
    return (spec.steps || []).map(function (s) {
      if (s.total) { var v = s.value != null ? s.value : run; run = v; return { name: s.name, a: 0, b: v, v: v, total: true }; }
      var d = +s.value || 0, o = { name: s.name, a: run, b: run + d, v: d }; run += d; return o;
    });
  }
  // 증감 표기: 단위가 %인 값의 차이는 %p
  function signed(m, v) { var t = (v > 0 ? '+' : '') + m.fmt(v); return m.unit === '%' ? t.replace(/%$/, '%p') : t; }
  function drawWaterfall(g, spec, m, W) {
    var bars = waterfallBars(spec), n = bars.length, ends = [], targets = [];
    bars.forEach(function (b) { ends.push(b.a, b.b); });
    var dm = domain(ends, spec, true), ph = spec.height || 240, top = 20, H = top + ph + AXIS;
    var x0 = maxWidth(dm.ticks.map(dm.fmt)) + 10, bandW = (W - x0 - 4) / Math.max(n, 1), t = Math.min(BAR * 1.5, bandW * 0.6), y = scale(dm.d0, dm.d1, top + ph, top);
    dm.ticks.forEach(function (v) { if (v !== 0) svg('line', { x1: x0, x2: W, y1: y(v), y2: y(v), 'class': 'mc-grid' }, g); label(g, x0 - 8, y(v), dm.fmt(v), 'mc-tick', 'end'); });
    var every = Math.max(1, Math.ceil((maxWidth(bars.map(function (b) { return b.name; })) + 8) / bandW));
    bars.forEach(function (b, i) {
      var bx = x0 + i * bandW, cx = bx + (bandW - t) / 2, hi = Math.max(b.a, b.b), lo = Math.max(dm.d0, Math.min(b.a, b.b)), cls = b.total ? 'so' : b.v < 0 ? m.neg : m.pos;
      var rect = y(lo) - y(hi) > 0.5 ? bar(g, cx, y(hi), t, y(lo) - y(hi), b.total ? (b.b < 0 ? 'bottom' : 'top') : b.v < 0 ? 'bottom' : 'top', cls) : null;
      if (i < n - 1) svg('line', { x1: cx + t, x2: x0 + (i + 1) * bandW + (bandW - t) / 2, y1: y(b.b), y2: y(b.b), 'class': 'mc-step' }, g); // 다음 막대로 잇는 선
      var txt = b.total ? m.fmt(b.v) : signed(m, b.v), down = !b.total && b.v < 0;
      if (measure(txt, 600) <= bandW - 2) label(g, bx + bandW / 2, down ? y(lo) + 10 : y(hi) - 10, txt, 'mc-value', 'middle');
      if (i % every === 0) label(g, bx + bandW / 2, top + ph + 14, b.name, 'mc-label', 'middle', bandW * every - 6);
      targets.push({ box: [bx, top, bandW, ph], ax: bx + bandW / 2, ay: y(hi), title: b.name, key: cls, marks: rect ? [rect] : [],
        rows: b.total ? [{ value: m.fmt(b.v), name: '합계' }] : [{ value: signed(m, b.v), name: '변화' }, { value: m.fmt(b.b), name: '누적' }] });
    });
    svg('line', { x1: x0, x2: W, y1: y(0), y2: y(0), 'class': 'mc-base' }, g);
    return { h: H, targets: targets };
  }
  // 기울기: 두 시점의 값을 잇는다. 순위가 바뀌면 선이 교차한다
  function segDist(px, py, s) {
    var dx = s[2] - s[0], dy = s[3] - s[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / l)) : 0;
    return Math.hypot(px - s[0] - t * dx, py - s[1] - t * dy);
  }
  function drawSlope(g, spec, m, W) {
    var S = m.series, L = spec.labels || ['이전', '이후'], vals = [], targets = [], placedL = [], placedR = [];
    S.forEach(function (s) { vals.push(s.values[0], s.values[1]); });
    var dm = domain(numbers(vals), spec, false), ph = spec.height || 240, top = 28, H = top + ph + 8;
    var lt = function (s) { return s.name + ' ' + m.fmt(s.values[0]); }, rt = function (s) { return m.fmt(s.values[1]) + ' ' + s.name; };
    var xl = Math.min(maxWidth(S.map(lt)) + 14, W * 0.36), xr = W - Math.min(maxWidth(S.map(rt)) + 14, W * 0.36), y = scale(dm.d0, dm.d1, top + ph, top);
    [xl, xr].forEach(function (x, i) { svg('line', { x1: x, x2: x, y1: top, y2: top + ph, 'class': 'mc-grid' }, g); label(g, x, 10, L[i], 'mc-axis-title', 'middle'); });
    var ok = S.filter(function (s) { return s.values[0] != null && s.values[1] != null; });
    var order = ok.slice().sort(function (a, b) { return (b.cls === 'so') - (a.cls === 'so'); }); // 회색을 먼저 그려 강조가 위로
    order.forEach(function (s) {
      var a = y(s.values[0]), b = y(s.values[1]);
      s.el = [svg('line', { x1: xl, x2: xr, y1: a, y2: b, 'class': 'mc-slope mc-mark ' + s.cls }, g),
        svg('circle', { cx: xl, cy: a, r: 4, 'class': 'mc-dot mc-mark ' + s.cls }, g), svg('circle', { cx: xr, cy: b, r: 4, 'class': 'mc-dot mc-mark ' + s.cls }, g)];
    });
    var free = function (list, v) { return list.every(function (p) { return Math.abs(p - v) >= 14; }); };
    order.slice().reverse().forEach(function (s) { // 라벨은 강조 먼저, 겹치면 뺀다(툴팁·표에 남는다)
      var a = y(s.values[0]), b = y(s.values[1]);
      if (free(placedL, a)) { placedL.push(a); label(g, xl - 8, a, lt(s), 'mc-label', 'end', xl - 10); }
      if (free(placedR, b)) { placedR.push(b); label(g, xr + 8, b, rt(s), 'mc-label', 'start', W - xr - 10); }
      targets.push({ seg: [xl, a, xr, b], ax: xr, ay: b, title: s.name, key: s.cls, marks: s.el,
        rows: [{ value: m.fmt(s.values[0]), name: L[0] }, { value: m.fmt(s.values[1]), name: L[1] }, { value: signed(m, s.values[1] - s.values[0]), name: '변화' }] });
    });
    return { h: H, targets: targets };
  }
  // 달력 히트맵: 주는 열, 요일은 행(월요일부터)
  var WEEK = ['월', '화', '수', '목', '금', '토', '일'], DAY = 864e5;
  function parseDay(s) { var p = String(s).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dow(t) { return (new Date(t).getUTCDay() + 6) % 7; }
  function dayText(t) { var d = new Date(t), z = function (v) { return (v < 10 ? '0' : '') + v; }; return d.getUTCFullYear() + '.' + z(d.getUTCMonth() + 1) + '.' + z(d.getUTCDate()) + ' (' + WEEK[dow(t)] + ')'; }
  function calendarDays(spec) {
    var list = spec.days ? spec.days.map(function (d) { return { t: parseDay(d.date), v: d.value }; })
      : (spec.values || []).map(function (v, i) { return { t: parseDay(spec.start) + i * DAY, v: v }; });
    return list.sort(function (a, b) { return a.t - b.t; });
  }
  function drawCalendar(g, spec, m, W) {
    var D = m.days, targets = [];
    if (!D.length) return { h: 40, targets: targets };
    var t0 = D[0].t - dow(D[0].t) * DAY, weeks = Math.floor((D[D.length - 1].t - t0) / DAY / 7) + 1, labW = 22, top = 20;
    var c = Math.max(10, Math.min(26, Math.floor((W - labW) / weeks))), lastMonth = -1, lastX = -1e9;
    [0, 2, 4].forEach(function (r) { label(g, 0, top + r * c + c / 2, WEEK[r], 'mc-tick'); });
    D.forEach(function (d) {
      var x = labW + Math.floor((d.t - t0) / DAY / 7) * c, yy = top + dow(d.t) * c, mo = new Date(d.t).getUTCMonth(), k = d.v == null ? '' : m.bins.of(d.v);
      if (mo !== lastMonth && x - lastX >= 28) { label(g, x, 8, (mo + 1) + '월', 'mc-tick'); lastX = x; }
      lastMonth = mo;
      var cell = svg('rect', { x: x + GAP / 2, y: yy + GAP / 2, width: c - GAP, height: c - GAP, rx: Math.min(3, c / 4), 'class': d.v == null ? 'mc-empty' : 'mc-cell mc-mark ' + k }, g);
      targets.push({ box: [x, yy, c, c], ax: x + c, ay: yy + c / 2, title: dayText(d.t), rows: [{ value: m.fmt(d.v) }], marks: [cell] });
    });
    return { h: top + 7 * c + 4, w: Math.max(W, labW + weeks * c), targets: targets, cols: 7 };
  }

  /* ---------- 구성 · 목표 · 단계 ---------- */
  // 트리맵: 넓이가 값. 그룹이 있으면 그룹 칸을 먼저 나누고 그 안을 다시 나눈다(squarified)
  function squarify(items, x, y, w, h) {
    var total = items.reduce(function (a, b) { return a + b.v; }, 0), k = total ? (w * h) / total : 0, out = [];
    var rest = items.map(function (it) { return { it: it, a: it.v * k }; });
    while (rest.length) {
      var side = Math.min(w, h), row = [], worst = Infinity;
      while (rest.length) {
        var next = row.concat([rest[0]]), s = next.reduce(function (a, r) { return a + r.a; }, 0);
        var mx = Math.max.apply(null, next.map(function (r) { return r.a; })), mn = Math.min.apply(null, next.map(function (r) { return r.a; }));
        var ratio = Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn));
        if (row.length && ratio > worst) break;
        row = next; worst = ratio; rest.shift();
      }
      var thick = row.reduce(function (a, r) { return a + r.a; }, 0) / (side || 1), off = 0;
      row.forEach(function (r) {
        var len = r.a / (thick || 1);
        out.push(w >= h ? { it: r.it, x: x, y: y + off, w: thick, h: len } : { it: r.it, x: x + off, y: y, w: len, h: thick });
        off += len;
      });
      if (w >= h) { x += thick; w -= thick; } else { y += thick; h -= thick; }
    }
    return out;
  }
  function treeGroups(spec, E) {
    var order = (spec.groups || []).slice(), by = {};
    (spec.items || []).forEach(function (it) { if (it.group != null && order.indexOf(it.group) < 0) order.push(it.group); });
    var grouped = order.length > 0;
    (spec.items || []).forEach(function (it) {
      if (!(it.value > 0)) return;
      var key = grouped ? it.group : '', gi = order.indexOf(it.group);
      var cls = grouped ? slot(gi) : E ? (E.indexOf(it.name) >= 0 ? 's1' : 'so') : 's1';
      (by[key] = by[key] || { name: grouped ? key : null, v: 0, items: [] }).items.push({ name: it.name, v: it.value, cls: cls, group: grouped ? it.group : null });
      by[key].v += it.value;
    });
    return (grouped ? order : ['']).map(function (k) { return by[k]; }).filter(Boolean);
  }
  function drawTreemap(g, spec, m, W) {
    var G = m.groups, H = spec.height || 300, tot = sum(G.map(function (gr) { return gr.v; })) || 1, targets = [], tiles = [];
    var place = function (list, x, y, w, h) { return squarify(list.slice().sort(function (a, b) { return b.v - a.v; }), x, y, w, h); };
    if (G.length === 1) tiles = place(G[0].items, 0, 0, W, H);
    else place(G, 0, 0, W, H).forEach(function (r) { tiles = tiles.concat(place(r.it.items, r.x, r.y, r.w, r.h)); });
    tiles.forEach(function (r) {
      var it = r.it, x = r.x + GAP / 2, y = r.y + GAP / 2, w = Math.max(0, r.w - GAP), h = Math.max(0, r.h - GAP);
      var rect = svg('rect', { x: x, y: y, width: w, height: h, rx: Math.min(RAD, w / 2, h / 2), 'class': 'mc-bar mc-mark ' + it.cls }, g);
      var nm = fit(it.name, w - 14, 600);
      if (h >= 24 && (nm === it.name || nm.length >= 3)) label(g, x + 8, y + 14, it.name, 'mc-seg-text ' + it.cls, 'start', w - 14); // 두 글자도 안 남으면 뺀다
      if (h >= 44 && measure(m.fmt(it.v)) + 14 <= w) label(g, x + 8, y + 31, m.fmt(it.v), 'mc-seg-text mc-seg-sub ' + it.cls);
      targets.push({ box: [r.x, r.y, r.w, r.h], ax: r.x + r.w / 2, ay: r.y + r.h / 2, title: (it.group ? it.group + ' · ' : '') + it.name, key: it.cls, marks: [rect],
        rows: [{ value: m.fmt(it.v) }, { value: percent(it.v / tot, 1), name: '전체 대비' }] });
    });
    return { h: H, targets: targets };
  }
  // 와플: 100칸 중 몇 칸. 반올림 오차는 큰 나머지 순으로 채운다
  function drawWaffle(g, spec, m, W) {
    var cats = spec.categories || [], v = m.series[0] ? m.series[0].values : [], tot = spec.total || sum(v) || 1, targets = [];
    var raw = v.map(function (a) { return (a > 0 ? a : 0) / tot * 100; }), cnt = raw.map(Math.floor), need = Math.min(100, Math.round(sum(v) / tot * 100));
    var rank = raw.map(function (_, i) { return i; }).sort(function (a, b) { return (raw[b] - cnt[b]) - (raw[a] - cnt[a]); });
    for (var k = 0, have = cnt.reduce(function (a, b) { return a + b; }, 0); have < need && rank.length; k++, have++) cnt[rank[k % rank.length]]++;
    var side = Math.min(W, spec.size || 240), c = (side - 9 * GAP) / 10, owner = [], marks = cats.map(function () { return []; }), boxes = cats.map(function () { return []; });
    cnt.forEach(function (n, i) { for (var j = 0; j < n; j++) owner.push(i); });
    for (var cell = 0; cell < 100; cell++) {
      var x = (cell % 10) * (c + GAP), y = Math.floor(cell / 10) * (c + GAP), o = owner[cell];
      var rect = svg('rect', { x: x, y: y, width: c, height: c, rx: Math.min(3, c / 4), 'class': o == null ? 'mc-track' : 'mc-bar mc-mark ' + slot(o) }, g);
      if (o != null) { marks[o].push(rect); boxes[o].push([x, y, c + GAP, c + GAP]); }
    }
    cats.forEach(function (name, i) {
      var b = boxes[i][boxes[i].length - 1];
      if (b) targets.push({ boxes: boxes[i], ax: b[0] + c, ay: b[1] + c / 2, title: name, key: slot(i), marks: marks[i],
        rows: [{ value: m.fmt(v[i]) }, { value: percent((v[i] > 0 ? v[i] : 0) / tot, 1), name: '비중' }, { value: cnt[i] + '칸', name: '100칸 중' }] });
    });
    return { h: side, targets: targets };
  }
  // 불릿: 실적 막대 + 목표 눈금 + 회색 구간(나쁨·보통·좋음)
  function drawBullet(g, spec, m, W) {
    var I = spec.items || [], n = I.length, band = 44, all = [], targets = [];
    I.forEach(function (it) { all = all.concat([it.value, it.target], it.ranges || []); });
    var dm = domain(numbers(all), spec, true), labW = Math.min(maxWidth(I.map(function (it) { return it.name; })) + 12, W * 0.32);
    var x = scale(dm.d0, dm.d1, labW, W - maxWidth(I.map(function (it) { return m.fmt(it.value); }), 600) - 10), top = 4, H = top + n * band + AXIS;
    dm.ticks.forEach(function (v) { tick(g, x(v), H - 10, dm.fmt(v), W); });
    I.forEach(function (it, i) {
      var cy = top + i * band + band / 2, marks = [], R = (it.ranges || []).slice().sort(function (a, b) { return b - a; });
      label(g, labW - 10, cy, it.name, 'mc-label', 'end', labW - 10);
      R.forEach(function (r, j) { svg('rect', { x: x(0), y: cy - 12, width: Math.max(0, x(r) - x(0)), height: 24, rx: 2, 'class': 'mc-range r' + (R.length - j) }, g); }); // 넓은 구간일수록 옅다
      marks.push(bar(g, x(0), cy - 5, Math.max(0.5, x(it.value) - x(0)), 10, 'right', 's1'));
      if (it.target != null) marks.push(svg('line', { x1: x(it.target), x2: x(it.target), y1: cy - 12, y2: cy + 12, 'class': 'mc-target mc-mark' }, g));
      var right = Math.max(x(it.value), it.target != null ? x(it.target) : 0, R.length ? x(R[0]) : 0);
      label(g, right + 6, cy, m.fmt(it.value), 'mc-value');
      var rows = [{ cls: 's1', value: m.fmt(it.value), name: '실적' }];
      if (it.target != null) rows.push({ value: m.fmt(it.target), name: '목표' }, { value: percent(it.value / (it.target || 1), 1), name: '달성률' });
      targets.push({ box: [0, cy - band / 2, W, band], ax: right, ay: cy, title: it.name, rows: rows, marks: marks });
    });
    return { h: H, targets: targets };
  }
  // 퍼널: 막대 뒤의 옅은 막대가 앞 단계 길이 — 빠진 만큼이 보인다
  function drawFunnel(g, spec, m, W) {
    var S = spec.stages || [], n = S.length, first = n ? S[0].value || 1 : 1, band = 40, t = 22, top = 4, targets = [];
    var labW = Math.min(maxWidth(S.map(function (s) { return s.name; })) + 12, W * 0.32);
    var txt = S.map(function (s, i) { return m.fmt(s.value) + (i ? ' · ' + percent(s.value / first, 1) : ''); });
    var x = scale(0, Math.max.apply(null, S.map(function (s) { return s.value; }).concat([1])), labW, W - maxWidth(txt, 600) - 10);
    S.forEach(function (s, i) {
      var y0 = top + i * band, gy = y0 + (band - t) / 2, prev = i ? S[i - 1].value : null;
      label(g, labW - 10, gy + t / 2, s.name, 'mc-label', 'end', labW - 10);
      if (prev != null && prev > s.value) svg('rect', { x: labW, y: gy, width: x(prev) - labW, height: t, rx: RAD, 'class': 'mc-track' }, g);
      var rect = bar(g, labW, gy, Math.max(0.5, x(s.value) - labW), t, 'right', 's1');
      label(g, Math.max(x(s.value), prev != null ? x(prev) : 0) + 6, gy + t / 2, txt[i], 'mc-value');
      var rows = [{ value: m.fmt(s.value) }];
      if (i) rows.push({ value: percent(s.value / (prev || 1), 1), name: '이전 단계 대비' }, { value: percent(s.value / first, 1), name: '첫 단계 대비' }, { value: m.fmt(prev - s.value), name: '빠짐' });
      targets.push({ box: [0, y0, W, band], ax: x(s.value), ay: gy + t / 2, title: s.name, rows: rows, marks: [rect] });
    });
    return { h: top + n * band + 4, targets: targets };
  }

  var TYPES = { bar: drawBar, line: drawLine, scatter: drawScatter, dot: drawDot, dumbbell: drawDot, heatmap: drawHeatmap, sankey: drawSankey, segment: drawSegment,
    histogram: drawHistogram, box: drawBox, waterfall: drawWaterfall, slope: drawSlope, calendar: drawCalendar, treemap: drawTreemap, waffle: drawWaffle, bullet: drawBullet, funnel: drawFunnel };

  /* ---------- 범례 · 표 ---------- */
  function legend(spec, m) {
    var t = spec.type, named = function (list) { return list.map(function (c, i) { return { cls: slot(i), text: c }; }); };
    var items = t === 'heatmap' || t === 'calendar' ? m.bins.legend
      : t === 'segment' || t === 'waffle' ? named(spec.categories || [])
      : t === 'sankey' ? named(spec.groups || [])
      : t === 'treemap' ? (m.groups.length > 1 ? m.groups.map(function (gr, i) { return { cls: slot(i), text: gr.name }; }) : [])
      : t === 'waterfall' ? [{ cls: m.pos, text: '증가' }, { cls: m.neg, text: '감소' }, { cls: 'so', text: '합계' }]
      : t === 'bullet' ? [{ cls: 's1', text: '실적' }, { cls: '', text: '목표', shape: 'tick' }]
      : t === 'histogram' || t === 'box' || t === 'funnel' ? []
      : m.series.length > 1 ? m.series.map(function (s) { return { cls: s.cls, text: s.name }; }) : [];
    if (!items.length) return null;
    var shape = t === 'line' || t === 'slope' ? 'line' : t === 'scatter' || t === 'dot' || t === 'dumbbell' ? 'round' : '';
    var lg = html('div', 'legend');
    items.forEach(function (it) { var el = html('span', 'legend-item', lg); html('span', 'legend-chip mc-chip ' + (it.shape || shape) + ' ' + it.cls, el); el.appendChild(document.createTextNode(it.text)); });
    return lg;
  }
  function table(spec, m) {
    var head = [], rows = [], S = m.series, cats = spec.categories || [], t = spec.type;
    if (t === 'histogram') {
      var ht = sum(m.hist.map(function (b) { return b.n; })) || 1;
      head = ['구간', '개수', '비중'];
      rows = m.hist.map(function (b) { return [m.fmt(b.from) + '–' + m.fmt(b.to), b.n.toLocaleString('ko-KR'), percent(b.n / ht, 1)]; });
    } else if (t === 'box') {
      head = ['', '표본', '수염 아래', 'Q1', '중앙값', 'Q3', '수염 위', '이상치'];
      rows = cats.map(function (c, i) { var s = m.box[i] || { out: [] }; return [c, s.n != null ? String(s.n) : '–', m.fmt(s.min), m.fmt(s.q1), m.fmt(s.med), m.fmt(s.q3), m.fmt(s.max), s.out.map(m.fmt).join(', ') || '–']; });
    } else if (t === 'waterfall') {
      head = ['단계', '변화', '누적'];
      rows = waterfallBars(spec).map(function (b) { return [b.name, b.total ? '–' : signed(m, b.v), m.fmt(b.b)]; });
    } else if (t === 'funnel') {
      var st = spec.stages || [];
      head = ['단계', '값', '이전 단계 대비', '첫 단계 대비'];
      rows = st.map(function (s, i) { return [s.name, m.fmt(s.value), i ? percent(s.value / (st[i - 1].value || 1), 1) : '–', percent(s.value / (st[0].value || 1), 1)]; });
    } else if (t === 'treemap') {
      var tt = sum(m.groups.map(function (gr) { return gr.v; })) || 1, grouped = m.groups.length > 1;
      head = ['이름'].concat(grouped ? ['그룹'] : [], ['값', '비중']);
      m.groups.forEach(function (gr) { gr.items.forEach(function (it) { rows.push([it.name].concat(grouped ? [gr.name] : [], [m.fmt(it.v), percent(it.v / tt, 1)])); }); });
    } else if (t === 'calendar') {
      head = ['날짜', '값'];
      rows = m.days.map(function (d) { return [dayText(d.t), m.fmt(d.v)]; });
    } else if (t === 'bullet') {
      head = ['항목', '실적', '목표', '달성률'];
      rows = (spec.items || []).map(function (it) { return [it.name, m.fmt(it.value), m.fmt(it.target), it.target ? percent(it.value / it.target, 1) : '–']; });
    } else if (t === 'slope') {
      var L = spec.labels || ['이전', '이후'];
      head = ['', L[0], L[1], '변화'];
      rows = S.map(function (s) { var a = s.values[0], b = s.values[1]; return [s.name, m.fmt(a), m.fmt(b), a == null || b == null ? '–' : signed(m, b - a)]; });
    } else if (t === 'heatmap') {
      head = [''].concat(spec.columns || []);
      rows = (spec.rows || []).map(function (r, i) { return [r].concat((spec.columns || []).map(function (_, j) { return m.fmt(((spec.values || [])[i] || [])[j]); })); });
    } else if (spec.type === 'sankey') {
      head = ['출발', '도착', '값', '출발 대비'];
      rows = m.graph.links.map(function (l) { return [l.s.name, l.t.name, m.fmt(l.v), percent(l.v / (l.s.v || 1), 1)]; });
    } else if (spec.type === 'segment' || spec.type === 'waffle') {
      var tot = spec.total || sum(S[0] ? S[0].values : []) || 1;
      head = ['', '값', '비중'];
      rows = cats.map(function (c, i) { var v = S[0].values[i]; return [c, m.fmt(v), percent((v > 0 ? v : 0) / tot, 1)]; });
    } else if (spec.type === 'scatter') {
      var X = spec.x || {}, Y = spec.y || {};
      head = (S.length > 1 ? ['계열'] : []).concat(['이름', X.label || 'x', Y.label || 'y']);
      S.forEach(function (s) { s.points.forEach(function (p) { rows.push((S.length > 1 ? [s.name] : []).concat([p.label || '', m.fx(p.x), m.fy(p.y)])); }); });
    } else {
      head = [spec.categoryLabel || ''];
      S.forEach(function (s) { var nm = s.name || '값'; head.push(nm); if (spec.type === 'dot') head.push(nm + ' 하한', nm + ' 상한'); });
      var dumb = spec.type === 'dumbbell' && S.length === 2;
      if (spec.stacked && S.length > 1) head.push('합계');
      if (dumb) head.push('변화');
      rows = cats.map(function (c, i) {
        var r = [c], tot = 0;
        S.forEach(function (s) { r.push(m.fmt(s.values[i])); tot += s.values[i] > 0 ? s.values[i] : 0; if (spec.type === 'dot') r.push(m.fmt(s.low[i]), m.fmt(s.high[i])); });
        if (spec.stacked && S.length > 1) r.push(m.fmt(tot));
        if (dumb) { var a = S[0].values[i], b = S[1].values[i]; r.push(a == null || b == null ? '–' : signed(m, b - a)); }
        return r;
      });
    }
    var d = html('details', 'chart-data');
    html('summary', '', d, '표로 보기');
    var tb = html('table', 'table', html('div', 'table-wrap', d)), tr = html('tr', '', html('thead', '', tb)), body = html('tbody', '', tb);
    head.forEach(function (h) { html('th', '', tr, h); });
    rows.forEach(function (r) { var row = html('tr', '', body); r.forEach(function (c) { html('td', '', row, c); }); });
    return d;
  }

  /* ---------- 조립 · 상호작용 ---------- */
  function chart(host, spec) {
    if (host.__museChart) host.__museChart.disconnect();
    host.textContent = '';
    host.classList.add('chart');
    if (!spec || !TYPES[spec.type]) { html('p', 'chart-error', host, '차트 종류를 알 수 없어요: ' + (spec && spec.type)); return host; }
    spec = normalize(spec);
    family = getComputedStyle(host).fontFamily || family;
    var fig = host.closest('.diagram'), titleEl = fig && fig.querySelector('.diagram-title');
    var name = spec.title || (titleEl ? titleEl.textContent.trim() : '차트');
    var m = model(spec), lg = legend(spec, m);
    if (lg) host.appendChild(lg);
    var plot = html('div', 'chart-plot', host), tip = html('div', 'chart-tip', plot);
    tip.hidden = true; tip.setAttribute('aria-live', 'polite');
    host.appendChild(table(spec, m));
    var st = { el: null, targets: [], cols: 0, active: -1, w: 0, h: 0 };

    function clear() {
      var t = st.targets[st.active];
      if (t) (t.marks || []).concat(t.hover || []).forEach(function (e) { e.classList.remove('on'); });
      if (st.el) st.el.classList.remove('is-dim');
    }
    function hide() { clear(); st.active = -1; tip.hidden = true; }
    function show(i) {
      var t = st.targets[i];
      if (!t) return hide();
      clear(); st.active = i;
      (t.marks || []).concat(t.hover || []).forEach(function (e) { e.classList.add('on'); });
      if (t.marks && t.marks.length) st.el.classList.add('is-dim');
      tip.textContent = '';
      var head = html('div', 'chart-tip-title', tip);
      if (t.key) html('i', 'chart-key ' + t.key, head);
      head.appendChild(document.createTextNode(t.title));
      t.rows.forEach(function (r) {
        var row = html('div', 'chart-tip-row', tip);
        if (r.cls) html('i', 'chart-key ' + r.cls, row);
        html('b', '', row, r.value); // 값이 먼저, 이름은 뒤
        if (r.name) html('span', '', row, r.name);
      });
      tip.hidden = false;
      var tw = tip.offsetWidth, th = tip.offsetHeight, left = t.ax + 14, top = t.ay - th / 2;
      if (t.below) { left = t.ax - tw / 2; top = st.h + 8; } // 낮은 막대는 아래로 띄운다
      else if (left + tw > st.w) left = t.ax - 14 - tw;
      tip.style.left = Math.max(0, Math.min(left, st.w - tw)) + 'px';
      tip.style.top = (t.below ? top : Math.max(0, Math.min(top, st.h - th))) + 'px';
    }
    function pick(e) {
      var r = st.el.getBoundingClientRect(), k = st.w / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k, best = -1, bd = HIT;
      for (var i = 0; i < st.targets.length; i++) {
        var t = st.targets[i], inBox = function (b) { return px >= b[0] && px <= b[0] + b[2] && py >= b[1] && py <= b[1] + b[3]; };
        if (t.box || t.boxes) { if ((t.boxes || [t.box]).some(inBox)) return i; }
        else if (t.path) { if (t.path.isPointInFill && t.path.isPointInFill(new DOMPoint(px, py))) return i; }
        else { var d = t.seg ? segDist(px, py, t.seg) : Math.hypot(px - t.ax, py - t.ay); if (d < bd) { bd = d; best = i; } }
      }
      return best;
    }
    function draw(force) {
      var W = Math.floor(plot.clientWidth);
      if (!W || (W === st.pw && !force)) return;
      if (st.el) st.el.remove();
      var el = svg('svg', { role: 'img', 'aria-label': name, tabindex: 0 }), g = svg('g', {}, el);
      plot.insertBefore(el, tip);
      var out = TYPES[spec.type](g, spec, m, W), w = out.w || W;
      el.setAttribute('width', w);
      el.setAttribute('height', out.h);
      el.setAttribute('viewBox', '0 0 ' + w + ' ' + out.h);
      el.style.width = w > W ? w + 'px' : ''; // 최소 폭이 있는 차트(샌키)는 줄이지 않고 가로 스크롤
      plot.classList.toggle('is-scroll', w > W);
      st.el = el; st.targets = out.targets; st.cols = out.cols || 0; st.active = -1; st.pw = W; st.w = w; st.h = out.h; tip.hidden = true;
      if (spec.motion && window.MUSE && MUSE.flow) MUSE.flow(fig || host); // 점 흐름·멈춤 버튼은 muse.js가 맡는다
      el.addEventListener('pointermove', function (e) { var i = pick(e); if (i !== st.active) i < 0 ? hide() : show(i); });
      el.addEventListener('pointerdown', function (e) { st.byPointer = true; var i = pick(e); i < 0 ? hide() : show(i); });
      el.addEventListener('pointerleave', hide);
      el.addEventListener('focus', function () { if (st.byPointer) { st.byPointer = false; return; } show(Math.max(st.active, 0)); });
      el.addEventListener('blur', hide);
      el.addEventListener('keydown', function (e) {
        var n = st.targets.length, i = st.active, v = st.cols || 1;
        var to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + v, ArrowUp: i - v, Home: 0, End: n - 1 }[e.key];
        if (e.key === 'Escape') return hide();
        if (to == null) return;
        e.preventDefault();
        show(Math.max(0, Math.min(n - 1, to)));
      });
    }
    draw(true);
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { draw(false); }); ro.observe(plot); host.__museChart = ro; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { family = getComputedStyle(host).fontFamily || family; draw(true); });
    return host;
  }

  function init() {
    document.querySelectorAll('[data-chart]').forEach(function (el) {
      if (el.classList.contains('chart')) return;
      var src = el.querySelector('script[type="application/json"]'), spec;
      try { spec = JSON.parse(src ? src.textContent : el.getAttribute('data-chart')); }
      catch (err) { console.error('[MUSE chart] JSON을 읽지 못했어요', err, el); el.textContent = ''; html('p', 'chart-error', el, '차트 데이터를 읽지 못했어요'); return; }
      chart(el, spec);
    });
  }
  var M = window.MUSE = window.MUSE || {};
  M.chart = chart;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
