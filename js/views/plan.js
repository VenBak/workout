/* Recomp: weekly plan page. */
(function (R) {
  'use strict';

  const U = R.util;
  const BADGE = ['red', 'blue', 'yellow', 'green', 'white', 'red', 'blue'];

  function opt(id, sel) {
    const e = R.exById[id];
    return e ? `<option value="${e.id}"${id === sel ? ' selected' : ''}>${U.esc(e.name)}</option>` : '';
  }

  function swapOptions(slot) {
    const pool = slot.pool;
    const base = R.exById[pool[0]].muscle;
    const same = R.EXERCISES.filter((e) => e.muscle === base && !pool.includes(e.id)).map((e) => e.id);
    let html = '';
    if (!pool.includes(slot.ex.id) && !same.includes(slot.ex.id)) {
      html += `<optgroup label="Your choice">${opt(slot.ex.id, slot.ex.id)}</optgroup>`;
    }
    html += `<optgroup label="Recommended for this slot">${pool.map((id) => opt(id, slot.ex.id)).join('')}</optgroup>`;
    if (same.length) html += `<optgroup label="Other ${U.esc(R.muscleName(base).toLowerCase())} exercises">${same.map((id) => opt(id, slot.ex.id)).join('')}</optgroup>`;
    return html;
  }

  function exRow(slot, dayName) {
    const ex = slot.ex;
    const sec = ex.sec.map(R.muscleName);
    const meta = R.muscleName(ex.muscle) + (sec.length ? `, plus ${U.list(sec).toLowerCase()}` : '');
    const cardio = ex.type === 'cardio' || slot.role === 'cardio';
    const detail = cardio ? R.ROLES.cardio.effort : `${slot.rest}. ${slot.effort}.`;
    const id = `swap-${slot.key.replace(/:/g, '-')}`;
    return `<li class="ex-row${slot.overridden ? ' is-swapped' : ''}">
      <div class="ex-main">
        <label class="sr-only" for="${id}">Exercise ${slot.index + 1} of ${U.esc(dayName)}</label>
        <select class="swap" id="${id}" data-key="${slot.key}" data-default="${slot.pool[0]}">${swapOptions(slot)}</select>
        <p class="ex-meta">${U.esc(meta)}</p>
      </div>
      <div class="ex-dose">
        <strong>${R.program.dose(slot)}</strong>
        <span>${U.esc(detail)}${slot.extra ? ' Extra set added because you have time.' : ''}</span>
      </div>
      <details class="ex-more">
        <summary>How to do it</summary>
        <p>${U.esc(ex.tip)}</p>
        ${ex.vars.length ? `<p class="muted">Variations: ${U.esc(U.list(ex.vars))}.</p>` : ''}
      </details>
    </li>`;
  }

  function dayCard(day) {
    const trimmed = day.trimmed.length
      ? `<p class="trimmed">Left out to fit ${R.state.plan.session} minutes: ${U.esc(U.list(day.trimmed.map((s) => s.ex.name)))}. Choose a longer session to include ${day.trimmed.length === 1 ? 'it' : 'them'}.</p>`
      : '';
    return `<article class="day-card" aria-labelledby="day-${day.idx}">
      <header class="day-card-head">
        <span class="wd-badge badge-${BADGE[day.idx]}" aria-hidden="true">${U.WD[day.weekday]}</span>
        <div class="day-card-title">
          <h3 id="day-${day.idx}"><span class="sr-only">${U.WD_LONG[day.weekday]}: </span>${U.esc(day.name)}</h3>
          <p class="muted">${U.esc(day.focus)}. About ${day.minutes} minutes including warm-up.</p>
        </div>
        <button class="btn btn-small" type="button" data-action="log-day" data-idx="${day.idx}">Log this session today</button>
      </header>
      <ol class="ex-list">${day.slots.map((s) => exRow(s, day.name)).join('')}</ol>
      ${trimmed}
    </article>`;
  }

  function volumePanel(built) {
    const rows = R.program.volume(built).map((v) => {
      const pct = Math.min(100, (v.sets / 26) * 100);
      const state = v.sets < 10 ? 'low' : v.sets > 20 ? 'high' : 'ok';
      return `<li class="vol-row vol-${state}">
        <span class="vol-name">${U.esc(v.name)}</span>
        <span class="vol-track" aria-hidden="true"><span class="vol-band"></span><span class="vol-fill" style="width:${pct.toFixed(1)}%"></span></span>
        <span class="vol-num">${U.n(v.sets, v.sets % 1 ? 1 : 0)} sets<small>${v.days ? `, ${U.plural(v.days, 'day')}` : ''}</small></span>
      </li>`;
    }).join('');
    return `<section class="panel">
      <h2 class="panel-title">Weekly sets per muscle</h2>
      <p class="muted small">The shaded band is 10–20 sets, where most people keep and build muscle. Muscles that only assist count as half a set.</p>
      <ul class="vol-list">${rows}</ul>
    </section>`;
  }

  function guidelines() {
    return `<section class="panel">
      <h2 class="panel-title">Training on a cut</h2>
      <dl class="guide">${R.GUIDELINES.map((g) => `<dt>${U.esc(g.title)}</dt><dd>${U.esc(g.text)}</dd>`).join('')}</dl>
    </section>`;
  }

  function render(el) {
    const plan = R.state.plan;
    const built = R.program.build(plan);
    const splits = R.program.splitsFor(plan.days);
    const hasSwaps = Object.keys(plan.overrides).some((k) => k.startsWith(built.split.id + ':'));

    const daysSeg = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      `<button type="button" data-days="${n}" aria-pressed="${plan.days === n}">${n}</button>`).join('');
    const wdChips = U.WD.map((w, i) =>
      `<button type="button" class="chip" data-wd="${i}" aria-pressed="${built.weekdays.includes(i)}" aria-label="${U.WD_LONG[i]}">${w}</button>`).join('');
    const sessSeg = [45, 60, 75, 90].map((m) =>
      `<button type="button" data-session="${m}" aria-pressed="${plan.session === m}">${m} min</button>`).join('');

    const splitCards = splits.map((s) => {
      const names = [];
      const b = R.program.build(Object.assign({}, plan, { splitId: s.id }));
      b.days.forEach((d) => names.push(d.name));
      return `<label class="split-card">
        <input type="radio" name="split" value="${s.id}"${s.id === built.split.id ? ' checked' : ''}>
        <span class="split-body">
          <span class="split-name">${U.esc(s.name)}${s.rec ? ' <span class="tag tag-blue">Recommended</span>' : ''}</span>
          <span class="split-why">${U.esc(s.why)}</span>
          <span class="split-days">${U.esc(names.join(', '))}</span>
        </span>
      </label>`;
    }).join('');

    const week = [0, 1, 2, 3, 4, 5, 6].map((wdIdx) => {
      const day = built.days.find((d) => d.weekday === wdIdx);
      if (day) return dayCard(day);
      return `<div class="rest-row"><span class="wd-badge badge-rest" aria-hidden="true">${U.WD[wdIdx]}</span><p><strong>${U.WD_LONG[wdIdx]}: rest.</strong> <span class="muted">Walk 8–10k steps; easy cardio is fine.</span></p></div>`;
    }).join('');

    el.innerHTML = `
      <header class="page-head">
        <div>
          <h1 class="h1">Your plan</h1>
          <p class="lede">Choose how often you can train. With fewer days, each session covers more muscles.</p>
        </div>
      </header>
      <div class="layout-aside">
        <div class="stack">
          <section class="panel setup">
            <div class="field-row">
              <span class="field-label" id="lbl-days">Days a week</span>
              <div class="seg" role="group" aria-labelledby="lbl-days">${daysSeg}</div>
            </div>
            <div class="field-row">
              <span class="field-label" id="lbl-wd">Training days</span>
              <div class="chips" role="group" aria-labelledby="lbl-wd">${wdChips}</div>
            </div>
            <div class="field-row">
              <span class="field-label" id="lbl-sess">Time per session</span>
              <div class="seg" role="group" aria-labelledby="lbl-sess">${sessSeg}</div>
            </div>
            <fieldset class="splits">
              <legend class="field-label">Split</legend>
              ${splitCards}
            </fieldset>
          </section>
          <div class="week-head">
            <h2 class="h2">The week</h2>
            ${hasSwaps ? '<button class="btn btn-quiet btn-small" type="button" data-action="reset-swaps">Undo exercise swaps</button>' : ''}
          </div>
          <p class="muted small week-hint">Use the exercise menus to swap in something your gym has. Sets, reps and rest stay the same.</p>
          <div class="week">${week}</div>
        </div>
        <aside class="stack">
          ${volumePanel(built)}
          ${guidelines()}
        </aside>
      </div>`;

    const rerender = (focusSel) => {
      render(el);
      if (focusSel) {
        const f = el.querySelector(focusSel);
        if (f) f.focus();
      }
    };

    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.days) {
        const n = Number(b.dataset.days);
        plan.days = n;
        plan.weekdays = R.DEFAULT_WEEKDAYS[n].slice();
        plan.splitId = R.program.recommended(n).id;
        R.store.save();
        rerender(`[data-days="${n}"]`);
      } else if (b.dataset.wd) {
        const i = Number(b.dataset.wd);
        let w = built.weekdays.slice();
        if (w.includes(i)) {
          if (w.length === 1) { R.toast('Keep at least one training day.'); return; }
          w = w.filter((x) => x !== i);
        } else {
          w.push(i);
        }
        w.sort((a, c) => a - c);
        const changed = w.length !== plan.days;
        plan.days = w.length;
        plan.weekdays = w;
        if (changed || !R.SPLITS.some((s) => s.id === plan.splitId && s.days === plan.days)) plan.splitId = R.program.recommended(plan.days).id;
        R.store.save();
        rerender(`[data-wd="${i}"]`);
      } else if (b.dataset.session) {
        plan.session = Number(b.dataset.session);
        R.store.save();
        rerender(`[data-session="${plan.session}"]`);
      } else if (b.dataset.action === 'log-day') {
        const k = U.today();
        if (R.actions.logPlanDay(k, Number(b.dataset.idx))) location.hash = `#log/${k}`;
      } else if (b.dataset.action === 'reset-swaps') {
        Object.keys(plan.overrides).forEach((k) => { if (k.startsWith(built.split.id + ':')) delete plan.overrides[k]; });
        R.store.save();
        R.toast('Exercise swaps undone.');
        rerender();
      }
    };

    el.onchange = (e) => {
      const t = e.target;
      if (t.name === 'split') {
        plan.splitId = t.value;
        R.store.save();
        rerender(`input[name="split"][value="${t.value}"]`);
      } else if (t.classList.contains('swap')) {
        const key = t.dataset.key;
        // Store a swap only when it differs from what the plan would pick
        delete plan.overrides[key];
        const natural = R.program.build(plan).days.flatMap((d) => d.slots.concat(d.trimmed)).find((s) => s.key === key);
        if (!natural || natural.ex.id !== t.value) plan.overrides[key] = t.value;
        R.store.save();
        rerender(`#${t.id}`);
      }
    };
  }

  R.views.plan = { title: 'Plan', render };
})(window.R);
