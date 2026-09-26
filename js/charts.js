/* Recomp: small SVG charts drawn to the width of their container. */
(function (R) {
  'use strict';

  const U = R.util;
  const observers = [];

  function niceStep(range, target) {
    const raw = range / Math.max(1, target);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nice * mag;
  }

  function ticks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    const step = niceStep(max - min, count || 4);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(Number(v.toFixed(6)));
    return { lo, hi, step, ticks: out };
  }

  /** Trailing moving average over `days` calendar days */
  function movingAvg(points, days) {
    return points.map((p) => {
      const inWin = points.filter((q) => q.k <= p.k && U.dayNum(q.k, p.k) < days);
      return { k: p.k, y: U.mean(inWin.map((q) => q.y)) };
    });
  }

  /** Draw now and redraw when the container width changes */
  function mount(el, draw) {
    let last = -1;
    const render = () => {
      const w = Math.floor(el.clientWidth);
      if (w <= 0 || w === last) return;
      last = w;
      el.innerHTML = draw(w);
    };
    render();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(render);
      ro.observe(el);
      observers.push(ro);
    }
  }

  function cleanup() {
    observers.splice(0).forEach((o) => o.disconnect());
  }

  const shortDate = (k) => U.fmtDate(k, { day: 'numeric', month: 'short' });

  /**
   * Line chart over a date range.
   * opts: { from, to, points:[{k,y}], avgDays, height, dig, label }
   */
  function line(width, opts) {
    const H = opts.height || 220;
    const pad = { l: 44, r: 14, t: 14, b: 30 };
    const iw = Math.max(10, width - pad.l - pad.r);
    const ih = H - pad.t - pad.b;
    const pts = opts.points;
    const span = Math.max(1, U.dayNum(opts.from, opts.to));
    const avg = opts.avgDays ? movingAvg(pts, opts.avgDays) : [];
    const ys = pts.map((p) => p.y).concat(avg.map((p) => p.y));
    const lo = Math.min.apply(null, ys);
    const hi = Math.max.apply(null, ys);
    const padY = Math.max(0.3, (hi - lo) * 0.12);
    const t = ticks(lo - padY, hi + padY, 4);
    const x = (k) => pad.l + (U.dayNum(opts.from, k) / span) * iw;
    const y = (v) => pad.t + ih - ((v - t.lo) / (t.hi - t.lo)) * ih;
    const dig = opts.dig != null ? opts.dig : 1;

    let s = `<svg class="chart" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-label="${U.esc(opts.label || 'Chart')}">`;
    t.ticks.forEach((v) => {
      s += `<line class="c-grid" x1="${pad.l}" x2="${pad.l + iw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
      s += `<text class="c-label" x="${pad.l - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${U.n(v, t.step < 1 ? 1 : 0)}</text>`;
    });

    const nLabels = Math.max(2, Math.min(6, Math.floor(iw / 90)));
    for (let i = 0; i < nLabels; i++) {
      const k = U.addDays(opts.from, Math.round((i * span) / (nLabels - 1)));
      const anchor = i === 0 ? 'start' : i === nLabels - 1 ? 'end' : 'middle';
      s += `<text class="c-label" x="${x(k).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${shortDate(k)}</text>`;
    }

    if (pts.length > 1) {
      s += `<polyline class="c-line-raw" points="${pts.map((p) => `${x(p.k).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')}"/>`;
    }
    if (avg.length > 1) {
      s += `<polyline class="c-line" points="${avg.map((p) => `${x(p.k).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')}"/>`;
    }
    const r = pts.length > 60 ? 2 : 3;
    pts.forEach((p) => {
      s += `<circle class="c-dot" cx="${x(p.k).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="${r}"><title>${U.fmtDate(p.k)}: ${U.n(p.y, dig)} ${opts.unit || ''}</title></circle>`;
    });
    return s + '</svg>';
  }

  /**
   * Bar chart with positive and negative bars around zero.
   * opts: { keys, values, good(v) -> bool, height, label }
   */
  function bars(width, opts) {
    const H = opts.height || 200;
    const pad = { l: 48, r: 12, t: 26, b: 30 };
    const fmt = (v) => (v < 0 ? U.signed(v) : U.n(v));
    const iw = Math.max(10, width - pad.l - pad.r);
    const ih = H - pad.t - pad.b;
    const vals = opts.values.filter((v) => v != null);
    const lo = Math.min(0, Math.min.apply(null, vals.concat([0])));
    const hi = Math.max(0, Math.max.apply(null, vals.concat([0])));
    const t = ticks(lo, hi === lo ? lo + 500 : hi, 4);
    const y = (v) => pad.t + ih - ((v - t.lo) / (t.hi - t.lo)) * ih;
    const n = opts.keys.length;
    const bw = iw / n;
    const gap = Math.max(2, bw * 0.28);
    const every = bw >= 26 ? 1 : bw >= 13 ? 2 : 7;

    let s = `<svg class="chart" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-label="${U.esc(opts.label || 'Chart')}">`;
    t.ticks.forEach((v) => {
      s += `<line class="${v === 0 ? 'c-zero' : 'c-grid'}" x1="${pad.l}" x2="${pad.l + iw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
      s += `<text class="c-label" x="${pad.l - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`;
    });

    opts.keys.forEach((k, i) => {
      const v = opts.values[i];
      const x0 = pad.l + i * bw + gap / 2;
      const w = Math.max(1, bw - gap);
      if (v == null) {
        s += `<rect class="c-none" x="${x0.toFixed(1)}" y="${(y(0) - 1).toFixed(1)}" width="${w.toFixed(1)}" height="2"><title>${U.fmtDate(k)}: no food logged</title></rect>`;
      } else {
        const top = Math.min(y(v), y(0));
        const h = Math.max(1, Math.abs(y(v) - y(0)));
        const cls = opts.good(v) ? 'c-pos' : 'c-neg';
        s += `<rect class="${cls}" x="${x0.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${U.fmtDate(k)}: ${v >= 0 ? U.n(v) + ' kcal deficit' : U.n(-v) + ' kcal surplus'}</title></rect>`;
      }
      if (i % every === 0) {
        const today = k === U.today();
        s += `<text class="c-label${today ? ' c-today' : ''}" x="${(x0 + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${U.parse(k).getDate()}</text>`;
      }
    });

    if (vals.length) {
      const avg = U.mean(vals);
      const ay = y(avg).toFixed(1);
      s += `<line class="c-avg" x1="${pad.l}" x2="${pad.l + iw}" y1="${ay}" y2="${ay}"/>`;
      s += `<line class="c-avg" x1="${pad.l + iw - 176}" x2="${pad.l + iw - 156}" y1="9" y2="9"/>`;
      s += `<text class="c-avg-label" x="${pad.l + iw}" y="13" text-anchor="end">Average ${fmt(Math.round(avg))} kcal a day</text>`;
    }
    return s + '</svg>';
  }

  R.charts = { mount, cleanup, line, bars, ticks, movingAvg };
})(window.R);
