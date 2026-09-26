/* Recomp: weight log and trend. */
(function (R) {
  'use strict';

  const U = R.util;
  const M = R.metrics;

  /** Least-squares slope (kg per day) for [{k, w}] */
  function slope(points) {
    if (points.length < 3) return null;
    const x0 = points[0].k;
    const xs = points.map((p) => U.dayNum(x0, p.k));
    if (xs[xs.length - 1] - xs[0] < 7) return null;
    const mx = U.mean(xs);
    const my = U.mean(points.map((p) => p.w));
    let num = 0;
    let den = 0;
    points.forEach((p, i) => { num += (xs[i] - mx) * (p.w - my); den += (xs[i] - mx) ** 2; });
    return den ? num / den : null;
  }

  function assess(goal, pct) {
    if (goal === 'lose') {
      if (pct <= -1.05) return ['warn', 'Faster than 1% a week. Eating a little more usually protects strength and muscle.'];
      if (pct <= -0.45) return ['good', 'Right in the 0.5–1% a week range. Keep going.'];
      if (pct < -0.1) return ['ok', 'Slower than 0.5% a week. Fine if you are happy with it; 150–200 kcal less a day speeds it up.'];
      return ['warn', 'Not trending down yet. Check that your logging is complete, then trim about 200 kcal a day.'];
    }
    if (goal === 'gain') {
      if (pct > 0.6) return ['warn', 'Gaining faster than 0.5% a week. Much of that will be fat; ease off a little.'];
      if (pct >= 0.1) return ['good', 'A slow, steady gain of up to 0.5% a week. Good for building muscle.'];
      return ['ok', 'Not gaining yet. Add 150–200 kcal a day.'];
    }
    return Math.abs(pct) <= 0.25 ? ['good', 'Holding steady.'] : ['ok', `Drifting ${pct > 0 ? 'up' : 'down'}. Adjust intake by 100–200 kcal a day if that is not what you want.`];
  }

  function summary() {
    const ws = M.weights();
    if (!ws.length) return '<p class="empty">No weigh-ins yet. Add your first one to start the trend.</p>';
    const today = U.today();
    const latest = ws[ws.length - 1];
    const first = ws[0];
    const avg7 = U.mean(ws.filter((p) => U.dayNum(p.k, today) < 7).map((p) => p.w));
    const recent = ws.filter((p) => U.dayNum(p.k, today) < 28);
    const sl = slope(recent);
    const goal = R.state.settings.goal;
    let rate = '<p class="small muted">Log at least three weigh-ins spread over a week or more to see your rate.</p>';
    if (sl != null) {
      const perWeek = sl * 7;
      const pct = (perWeek / latest.w) * 100;
      const [cls, text] = assess(goal, pct);
      rate = `<div class="rate rate-${cls}">
        <p class="rate-num">${U.signed(perWeek, 2)} kg a week <span class="muted">(${U.signed(pct, 2)}%)</span></p>
        <p class="small">${U.esc(text)}</p>
      </div>`;
    }
    const change = latest.w - first.w;
    return `<dl class="stats">
        <div><dt>Latest</dt><dd>${U.n(latest.w, 1)}<small> kg</small></dd><dd class="small muted">${U.fmtDate(latest.k)}</dd></div>
        <div><dt>7-day average</dt><dd>${avg7 != null ? U.n(avg7, 1) : '–'}<small> kg</small></dd></div>
        <div><dt>Since ${U.fmtDate(first.k, { day: 'numeric', month: 'short', year: 'numeric' })}</dt><dd>${U.signed(change, 1)}<small> kg</small></dd></div>
      </dl>
      <h3 class="h3">Rate over the last 4 weeks</h3>
      ${rate}`;
  }

  function chartBlock() {
    const range = R.ui.weightRange;
    const seg = [[30, '30 days'], [90, '90 days'], [365, 'Year'], [0, 'All']]
      .map(([v, l]) => `<button type="button" data-range="${v}" aria-pressed="${range === v}">${l}</button>`).join('');
    return `<div class="panel-head">
        <h2 class="panel-title">Trend</h2>
        <div class="seg seg-small" role="group" aria-label="Chart range">${seg}</div>
      </div>
      <div class="chart-box" id="w-chart"></div>
      <p class="chart-legend"><span class="key key-line"></span>7-day average <span class="key key-dot"></span>Weigh-ins</p>`;
  }

  function drawChart(el) {
    const box = el.querySelector('#w-chart');
    const today = U.today();
    const ws = M.weights();
    const range = R.ui.weightRange;
    let from = range ? U.addDays(today, -(range - 1)) : ws.length ? ws[0].k : today;
    if (U.dayNum(from, today) < 7) from = U.addDays(today, -7);
    const pts = ws.filter((p) => p.k >= from).map((p) => ({ k: p.k, y: p.w }));
    R.charts.cleanup();
    if (pts.length < 2) {
      box.innerHTML = '<p class="empty">Not enough weigh-ins in this range to draw a line.</p>';
      return;
    }
    R.charts.mount(box, (w) => R.charts.line(w, { from, to: today, points: pts, avgDays: 7, unit: 'kg', height: 260, label: 'Weight trend with 7-day average' }));
  }

  function history() {
    const ws = M.weights().slice().reverse();
    if (!ws.length) return '';
    const rows = ws.map((p, i) => {
      const prev = ws[i + 1];
      const diff = prev ? p.w - prev.w : null;
      return `<tr>
        <th scope="row"><a href="#log/${p.k}">${U.fmtDate(p.k, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</a></th>
        <td class="num">${U.n(p.w, 1)} kg</td>
        <td class="num muted">${diff != null ? U.signed(diff, 1) : ''}</td>
        <td><button class="btn btn-small btn-quiet" type="button" data-del="${p.k}" aria-label="Delete weigh-in of ${U.fmtDate(p.k)}">Delete</button></td>
      </tr>`;
    }).join('');
    return `<section class="panel">
      <h2 class="panel-title">All weigh-ins</h2>
      <div class="table-scroll"><table class="table">
        <thead><tr><th scope="col">Date</th><th scope="col" class="num">Weight</th><th scope="col" class="num">Change</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;
  }

  function render(el) {
    const today = U.today();
    const latest = M.latestWeight();
    el.innerHTML = `
      <header class="page-head">
        <div>
          <h1 class="h1">Weight</h1>
          <p class="lede">Daily weight jumps around with water and food. The 7-day average is the number to watch.</p>
        </div>
      </header>
      <div class="grid-2 grid-weight">
        <section class="panel">
          <h2 class="panel-title">Add a weigh-in</h2>
          <form class="form-row" id="w-form" novalidate>
            <label class="field"><span class="field-label">Date</span><input type="date" id="w-date" value="${today}" max="${today}" required></label>
            <label class="field"><span class="field-label">Weight (kg)</span><input type="text" inputmode="decimal" id="w-kg" placeholder="${latest ? U.n(latest.w, 1) : '80.0'}" required></label>
            <button class="btn btn-primary" type="submit">Save weigh-in</button>
          </form>
          <p class="small muted">Saving a date that already has a weigh-in replaces it.</p>
          <div id="w-summary">${summary()}</div>
        </section>
        <section class="panel">${chartBlock()}</section>
      </div>
      <div id="w-history">${history()}</div>`;

    drawChart(el);

    const refresh = () => {
      el.querySelector('#w-summary').innerHTML = summary();
      el.querySelector('#w-history').innerHTML = history();
      drawChart(el);
    };

    el.onsubmit = (e) => {
      e.preventDefault();
      const k = el.querySelector('#w-date').value;
      const kg = U.num(el.querySelector('#w-kg').value);
      if (!U.isKey(k)) { R.toast('Pick a date.'); return; }
      if (kg == null || kg < 20 || kg > 400) { R.toast('Enter a weight in kg, for example 82.4.'); el.querySelector('#w-kg').focus(); return; }
      R.store.ensureDay(k).weight = Math.round(kg * 10) / 10;
      R.store.save();
      R.toast(`Saved ${U.n(kg, 1)} kg for ${U.fmtDate(k)}.`);
      el.querySelector('#w-kg').value = '';
      refresh();
    };

    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.range != null) {
        R.ui.weightRange = Number(b.dataset.range);
        el.querySelectorAll('[data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        drawChart(el);
      } else if (b.dataset.del) {
        const d = R.store.day(b.dataset.del);
        if (d) d.weight = null;
        R.store.save();
        R.toast('Weigh-in deleted.');
        refresh();
      }
    };
  }

  R.views.weight = { title: 'Weight', render };
})(window.R);
