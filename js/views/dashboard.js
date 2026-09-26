/* Recomp: overview page. */
(function (R) {
  'use strict';

  const U = R.util;
  const M = R.metrics;

  const PLATES = [
    { c: 'red', h: 140 }, { c: 'blue', h: 140 }, { c: 'yellow', h: 128 }, { c: 'green', h: 112 },
    { c: 'white', h: 96 }, { c: 'red', h: 80 }, { c: 'blue', h: 68 },
  ];

  const ARROW_UP = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW_DOWN = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function greeting() {
    const h = new Date().getHours();
    const name = R.state.settings.name.trim();
    const part = h < 5 ? 'Late one' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return name ? `${part}, ${U.esc(name)}` : part;
  }

  /* ---------- Barbell ---------- */
  function barbell(planned, doneCount, animate) {
    const total = Math.min(7, Math.max(planned, doneCount));
    const cy = 85;
    let plates = '';
    for (let i = 0; i < total; i++) {
      const p = PLATES[i];
      const done = i < doneCount;
      const y = cy - p.h / 2;
      const cls = done ? `plate plate-${p.c}${animate ? ' plate-in' : ''}` : 'plate plate-empty';
      const delay = animate && done ? ` style="animation-delay:${120 + i * 90}ms"` : '';
      const xl = 194 - (i + 1) * 18;
      const xr = 446 + i * 18;
      plates += `<rect class="${cls} plate-l"${delay} x="${xl}" y="${y}" width="16" height="${p.h}" rx="3"/>`;
      plates += `<rect class="${cls} plate-r"${delay} x="${xr}" y="${y}" width="16" height="${p.h}" rx="3"/>`;
    }
    const knurl = [];
    for (let x = 272; x <= 368; x += 6) knurl.push(`<line x1="${x}" y1="${cy - 4}" x2="${x + 3}" y2="${cy + 4}"/>`);
    return `
      <svg class="barbell" viewBox="0 0 640 170" role="img" aria-label="${doneCount} of ${planned} planned sessions done this week">
        <rect class="bar-sleeve" x="26" y="${cy - 7}" width="170" height="14" rx="3"/>
        <rect class="bar-sleeve" x="444" y="${cy - 7}" width="170" height="14" rx="3"/>
        <rect class="bar-shaft" x="206" y="${cy - 4}" width="228" height="8" rx="2"/>
        <g class="bar-knurl">${knurl.join('')}</g>
        <rect class="bar-collar" x="196" y="${cy - 17}" width="10" height="34" rx="2"/>
        <rect class="bar-collar" x="434" y="${cy - 17}" width="10" height="34" rx="2"/>
        ${plates}
      </svg>`;
  }

  function weekStrip(built) {
    const today = U.today();
    const mon = U.monday(today);
    const items = U.range(mon, U.addDays(mon, 6)).map((k, i) => {
      const planDay = built.days.find((d) => d.weekday === i);
      const trained = M.trained(k);
      let state = 'rest';
      let text = 'Rest';
      if (trained) {
        state = 'done';
        const d = R.store.day(k);
        text = (d.workout.title || 'Trained');
      } else if (planDay && k < today) {
        state = 'missed';
        text = `Missed ${planDay.name}`;
      } else if (planDay) {
        state = 'planned';
        text = planDay.name;
      }
      const isToday = k === today;
      return `<li><a class="day day-${state}${isToday ? ' is-today' : ''}" href="#log/${k}"${isToday ? ' aria-current="date"' : ''}>
        <span class="day-name">${U.WD[i]}</span>
        <span class="day-num">${U.parse(k).getDate()}</span>
        <span class="day-text">${U.esc(text)}</span>
      </a></li>`;
    });
    return `<ol class="week-strip" aria-label="This week">${items.join('')}</ol>`;
  }

  /* ---------- Scoreboard ---------- */
  function periods() {
    const today = U.today();
    if (R.state.settings.compareMode === 'calendar') {
      const mon = U.monday(today);
      const lastMon = U.addDays(mon, -7);
      return {
        cur: [mon, today],
        prev: [lastMon, U.addDays(mon, -1)],
        prevSameDay: [lastMon, U.addDays(lastMon, U.wd(today))],
        curName: 'this week',
        prevName: 'last week',
        visitsPrevName: 'by this day last week',
      };
    }
    return {
      cur: [U.addDays(today, -6), today],
      prev: [U.addDays(today, -13), U.addDays(today, -7)],
      prevSameDay: [U.addDays(today, -13), U.addDays(today, -7)],
      curName: 'last 7 days',
      prevName: 'the 7 days before',
      visitsPrevName: 'in the 7 days before',
    };
  }

  /** mood: 'good' | 'bad' | 'neutral' for a change, given which direction is desirable */
  function mood(diff, want) {
    if (!diff || want === 0) return 'neutral';
    return Math.sign(diff) === want ? 'good' : 'bad';
  }

  function deltaPill(cur, prev, want, opts) {
    opts = opts || {};
    if (cur == null) return '';
    if (prev == null) return `<span class="delta delta-neutral">No earlier data</span>`;
    const diff = cur - prev;
    const m = mood(diff, want);
    const flat = Math.abs(diff) < (opts.flat || 1e-9);
    let text;
    if (prev === 0) {
      text = `${U.signed(diff, opts.absDig || 0)}${opts.absUnit ? ' ' + opts.absUnit : ''}`;
    } else {
      const pct = (diff / Math.abs(prev)) * 100;
      const dig = opts.pctDig != null ? opts.pctDig : Math.abs(pct) < 10 ? 1 : 0;
      text = `${U.n(Math.abs(pct), dig)}%`;
    }
    if (flat) return `<span class="delta delta-neutral" aria-label="No change">No change</span>`;
    const up = diff > 0;
    const words = `${up ? 'Up' : 'Down'} ${text} on ${opts.prevName}`;
    return `<span class="delta delta-${m}" aria-label="${U.esc(words)}">${up ? ARROW_UP : ARROW_DOWN}${text}</span>`;
  }

  function scoreboard(built) {
    const P = periods();
    const goal = R.state.settings.goal;
    const cur = M.period(P.cur[0], P.cur[1]);
    const prev = M.period(P.prev[0], P.prev[1]);
    const prevVisits = M.period(P.prevSameDay[0], P.prevSameDay[1]).visits;
    const hasHistory = Object.keys(R.state.logs).some((k) => k < P.cur[0]);

    // Visits
    const today = U.today();
    const four = M.period(U.addDays(today, -27), today).visits / 4;
    const visits = `
      <div class="score-col">
        <h2 class="score-label">Gym visits</h2>
        <p class="score-value"><span class="big">${cur.visits}</span><span class="unit">${P.curName}</span></p>
        ${deltaPill(cur.visits, hasHistory ? prevVisits : null, 1, { absUnit: cur.visits - prevVisits === 1 || cur.visits - prevVisits === -1 ? 'visit' : 'visits', prevName: P.prevName })}
        <p class="score-note">${hasHistory ? `${U.plural(prevVisits, 'visit')} ${P.visitsPrevName}. ` : ''}Averaging ${U.n(four, 1)} a week over 4 weeks; your plan has ${built.days.length}.</p>
      </div>`;

    // Weight
    const wantW = goal === 'lose' ? -1 : goal === 'gain' ? 1 : 0;
    const latest = M.latestWeight();
    let weightBody;
    if (cur.weightAvg != null) {
      const diffKg = prev.weightAvg != null ? cur.weightAvg - prev.weightAvg : null;
      weightBody = `
        <p class="score-value"><span class="big">${U.n(cur.weightAvg, 1)}</span><span class="unit">kg, average ${P.curName}</span></p>
        ${deltaPill(cur.weightAvg, prev.weightAvg, wantW, { pctDig: 1, flat: 0.05, prevName: P.prevName })}
        <p class="score-note">${diffKg == null ? 'Weigh in next week to see the change.' : Math.abs(diffKg) < 0.05 ? `Same as ${P.prevName} (${U.n(prev.weightAvg, 1)} kg).` : `${diffKg < 0 ? 'Down' : 'Up'} ${U.n(Math.abs(diffKg), 1)} kg from ${U.n(prev.weightAvg, 1)} kg ${P.prevName}.`} ${U.plural(cur.weighIns, 'weigh-in')} in this period.</p>`;
    } else {
      weightBody = `
        <p class="score-value"><span class="big">${latest ? U.n(latest.w, 1) : '–'}</span><span class="unit">${latest ? 'kg, last weigh-in' : 'kg'}</span></p>
        <p class="score-note">${latest ? `No weigh-ins ${P.curName}. Last one was ${U.fmtDate(latest.k)}.` : 'No weigh-ins yet.'} <a href="#weight">Log your weight</a></p>`;
    }
    const weight = `<div class="score-col"><h2 class="score-label">Weight</h2>${weightBody}</div>`;

    // Deficit
    const wantD = goal === 'lose' ? 1 : goal === 'gain' ? -1 : 0;
    let defBody;
    if (R.state.settings.bmr == null) {
      defBody = `<p class="score-value"><span class="big">–</span><span class="unit">kcal a day</span></p>
        <p class="score-note">Add your BMR in <a href="#settings">Settings</a> to calculate your deficit.</p>`;
    } else if (cur.deficitAvg != null) {
      const surplus = cur.deficitAvg < 0;
      defBody = `
        <p class="score-value"><span class="big">${U.n(Math.abs(cur.deficitAvg))}</span><span class="unit">kcal a day${surplus ? ' surplus' : goal === 'gain' ? ' deficit' : ''}, ${P.curName}</span></p>
        ${deltaPill(cur.deficitAvg, prev.deficitAvg, wantD, { prevName: P.prevName, flat: 5, absUnit: 'kcal' })}
        <p class="score-note">Based on ${U.plural(cur.deficitDays, 'day')} with food logged.${prev.deficitAvg != null ? ` ${cap(P.prevName)}: ${U.n(Math.abs(prev.deficitAvg))} kcal a day${prev.deficitAvg < 0 ? ' surplus' : ''}.` : ''}</p>`;
    } else {
      defBody = `<p class="score-value"><span class="big">–</span><span class="unit">kcal a day</span></p>
        <p class="score-note">No food logged ${P.curName}. <a href="#log/${U.today()}">Log what you ate</a></p>`;
    }
    const deficit = `<div class="score-col"><h2 class="score-label">${goal === 'gain' ? 'Daily balance' : 'Daily deficit'}</h2>${defBody}</div>`;

    const note = goal === 'lose' && cur.deficitAvg != null && cur.deficitAvg > 1000
      ? `<p class="notice notice-warn">Your average deficit is over 1,000 kcal a day. Deficits that large tend to cost muscle and strength; 300–500 kcal is a better target while lifting.</p>`
      : '';

    return `<section class="score" aria-label="How you are doing">${visits}${weight}${deficit}</section>${note}`;
  }

  /* ---------- Today ---------- */
  function todaySession(built) {
    const today = U.today();
    const day = built.days.find((d) => d.weekday === U.wd(today));
    const log = R.store.day(today);
    const trained = M.trained(today);

    if (trained) {
      const w = log.workout;
      const names = w.exercises.map((e) => U.esc(e.name));
      return `<h2 class="panel-title">Today's session</h2>
        <p class="today-name">${U.esc(w.title || 'Workout')} <span class="tag tag-good">Done</span></p>
        ${names.length ? `<p class="muted">${names.slice(0, 6).join(', ')}${names.length > 6 ? ` and ${names.length - 6} more` : ''}.</p>` : ''}
        <p class="actions"><a class="btn" href="#log/${today}">Open today's log</a></p>`;
    }

    if (!day) {
      const next = [1, 2, 3, 4, 5, 6, 7].map((i) => U.addDays(today, i)).find((k) => built.days.some((d) => d.weekday === U.wd(k)));
      const nd = next && built.days.find((d) => d.weekday === U.wd(next));
      return `<h2 class="panel-title">Today's session</h2>
        <p class="today-name">Rest day</p>
        <p class="muted">Walk 8–10k steps and eat your protein. Light cardio is fine.${nd ? ` Next up is ${U.esc(nd.name)} on ${U.WD_LONG[U.wd(next)]}.` : ''}</p>
        <p class="actions"><a class="btn" href="#log/${today}">Log something anyway</a></p>`;
    }

    const rows = day.slots.map((s) => `<li><span>${U.esc(s.ex.name)}</span><span class="dose">${R.program.dose(s)}</span></li>`).join('');
    return `<h2 class="panel-title">Today's session</h2>
      <p class="today-name">${U.esc(day.name)} <span class="muted small">about ${day.minutes} min</span></p>
      <p class="muted">${U.esc(day.focus)}.</p>
      <ul class="mini-list">${rows}</ul>
      <p class="actions">
        <button class="btn btn-primary" type="button" data-action="log-plan" data-idx="${day.idx}">Log this session</button>
        <a class="btn btn-quiet" href="#plan">See the plan</a>
      </p>`;
  }

  function todayEnergy() {
    const today = U.today();
    const eaten = M.consumed(today);
    const burned = M.burned(today);
    const def = M.deficit(today);
    const prot = M.protein(today);
    const target = M.proteinTarget();
    const bmr = R.state.settings.bmr;
    const goal = R.state.settings.goal;
    const good = def == null ? '' : (goal === 'gain' ? def <= 0 : goal === 'lose' ? def > 0 : Math.abs(def) < 300) ? 'is-good' : 'is-bad';

    const pct = target && prot != null ? Math.min(100, Math.round((prot / target) * 100)) : 0;
    return `<h2 class="panel-title">Today's energy</h2>
      <dl class="energy">
        <div><dt>Eaten</dt><dd>${eaten != null ? U.n(eaten) : '–'}<small> kcal</small></dd></div>
        <div><dt>Burned in training</dt><dd>${burned != null ? U.n(burned) : '–'}<small> kcal</small></dd></div>
        <div class="${good}"><dt>${def != null && def < 0 ? 'Surplus' : 'Deficit'}</dt><dd>${def != null ? U.n(Math.abs(def)) : '–'}<small> kcal</small></dd></div>
      </dl>
      ${bmr == null ? '<p class="muted">Add your BMR in <a href="#settings">Settings</a> and the deficit is worked out for you.</p>' : ''}
      <div class="meter-wrap">
        <p class="meter-label"><span>Protein</span><span>${prot != null ? U.n(prot) : 0} ${target ? `of ${U.n(target)} g` : 'g'}</span></p>
        <div class="meter" role="meter" aria-label="Protein today" aria-valuemin="0" aria-valuemax="${target || 100}" aria-valuenow="${prot || 0}"><span style="width:${pct}%"></span></div>
        ${target ? '' : '<p class="small muted">Log your weight to get a protein target.</p>'}
      </div>
      <p class="actions"><a class="btn" href="#log/${today}">Log food</a></p>`;
  }

  /* ---------- Page ---------- */
  function render(el) {
    const built = R.program.build(R.state.plan);
    const today = U.today();
    const mon = U.monday(today);
    const weekKeys = U.range(mon, U.addDays(mon, 6));
    const doneCount = weekKeys.filter(M.trained).length;
    const planned = built.days.length;
    const animate = !R.ui.barAnimated;
    R.ui.barAnimated = true;

    const empty = R.state.settings.bmr == null && Object.keys(R.state.logs).length === 0;
    const onboarding = empty ? `
      <section class="panel onboarding">
        <h2 class="panel-title">Get set up</h2>
        <ol class="steps">
          <li><a href="#settings">Enter your BMR</a> once. It is used for every day's deficit.</li>
          <li><a href="#plan">Choose your training days</a> and the plan fills itself in.</li>
          <li><a href="#log/${today}">Log today</a>: your workout, food and weight.</li>
        </ol>
        <p class="muted small">Want to look around first? <button class="link-btn" type="button" data-action="load-example">Load seven weeks of example data</button>. You can delete it in Settings.</p>
      </section>` : '';

    const mode = R.state.settings.compareMode;
    const weekText = doneCount === 0
      ? `Nothing on the bar yet. Each session you log this week adds a plate.`
      : doneCount >= planned
        ? `${doneCount} of ${planned} planned sessions done. Fully loaded.`
        : `${doneCount} of ${planned} planned sessions done.`;

    el.innerHTML = `
      <header class="page-head">
        <div>
          <h1 class="h1">${greeting()}</h1>
          <p class="lede">${U.fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div class="seg" role="group" aria-label="Compare period">
          <button type="button" data-compare="rolling" aria-pressed="${mode === 'rolling'}">Last 7 days</button>
          <button type="button" data-compare="calendar" aria-pressed="${mode === 'calendar'}">This week</button>
        </div>
      </header>
      ${onboarding}
      <section class="hero panel" aria-labelledby="bar-title">
        <div class="hero-head">
          <h2 id="bar-title" class="h2">This week's bar</h2>
          <p class="muted">${weekText}</p>
        </div>
        ${barbell(planned, doneCount, animate)}
        ${weekStrip(built)}
      </section>
      ${scoreboard(built)}
      <div class="grid-2">
        <section class="panel">${todaySession(built)}</section>
        <section class="panel">${todayEnergy()}</section>
      </div>
      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h2 class="panel-title">Weight, last 60 days</h2><a class="small" href="#weight">All weigh-ins</a></div>
          <div class="chart-box" id="dash-weight"></div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2 class="panel-title">Daily deficit, last 14 days</h2><a class="small" href="#log">Calendar</a></div>
          <div class="chart-box" id="dash-deficit"></div>
        </section>
      </div>`;

    // Charts
    const from = U.addDays(today, -59);
    const pts = M.weights().filter((p) => p.k >= from).map((p) => ({ k: p.k, y: p.w }));
    const wBox = el.querySelector('#dash-weight');
    if (pts.length >= 2) {
      R.charts.mount(wBox, (w) => R.charts.line(w, { from, to: today, points: pts, avgDays: 7, unit: 'kg', label: 'Weight over the last 60 days with 7-day average' }));
      wBox.insertAdjacentHTML('afterend', '<p class="chart-legend"><span class="key key-line"></span>7-day average <span class="key key-dot"></span>Weigh-ins</p>');
    } else {
      wBox.innerHTML = `<p class="empty">Log your weight a few times and the trend shows up here. <a href="#weight">Add a weigh-in</a></p>`;
    }

    const dKeys = U.range(U.addDays(today, -13), today);
    const dVals = dKeys.map(M.deficit);
    const dBox = el.querySelector('#dash-deficit');
    if (dVals.some((v) => v != null)) {
      const goal = R.state.settings.goal;
      const good = (v) => (goal === 'gain' ? v <= 0 : goal === 'lose' ? v >= 0 : true);
      R.charts.mount(dBox, (w) => R.charts.bars(w, { keys: dKeys, values: dVals, good, label: 'Daily calorie deficit over the last 14 days' }));
    } else {
      dBox.innerHTML = `<p class="empty">${R.state.settings.bmr == null ? 'Set your BMR in <a href="#settings">Settings</a>, then log food to see your daily deficit.' : `Log food on a few days to see your deficit. <a href="#log/${today}">Log today</a>`}</p>`;
    }

    el.onclick = (e) => {
      const cmp = e.target.closest('[data-compare]');
      if (cmp) {
        R.state.settings.compareMode = cmp.dataset.compare;
        R.store.save();
        render(el);
        return;
      }
      const act = e.target.closest('[data-action]');
      if (!act) return;
      if (act.dataset.action === 'log-plan') {
        if (R.actions.logPlanDay(today, Number(act.dataset.idx))) location.hash = `#log/${today}`;
      } else if (act.dataset.action === 'load-example') {
        R.actions.loadExample();
        R.ui.barAnimated = false;
        render(el);
      }
    };
  }

  R.views.dashboard = { title: 'Overview', render };
})(window.R);
