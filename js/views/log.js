/* Recomp: calendar and day log (workout, food and energy, weight). */
(function (R) {
  'use strict';

  const U = R.util;
  const M = R.metrics;
  const X_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  const EMPTY = () => R.store.normalizeDay(null);
  const view = (k) => R.store.day(k) || EMPTY();

  function onTrack(def) {
    const goal = R.state.settings.goal;
    if (goal === 'gain') return def <= 0;
    if (goal === 'lose') return def > 0;
    return Math.abs(def) < 300;
  }

  /** Column label for the second number in a set row */
  function repLabel(ex) {
    const e = R.exById[ex.id];
    if (e && e.type === 'cardio') return ['Level', 'Minutes'];
    if (e && e.dose && / s$/.test(e.dose)) return ['kg', 'Seconds'];
    if (e && e.dose && / m$/.test(e.dose)) return ['kg', 'Metres'];
    return ['kg', 'Reps'];
  }

  function lastTime(k, ex) {
    const keys = Object.keys(R.state.logs).filter((x) => x < k).sort().reverse();
    for (const x of keys) {
      const w = R.state.logs[x].workout;
      const hit = w && w.exercises.find((e) => (ex.id ? e.id === ex.id : e.name === ex.name) && e.sets.some((s) => s.kg !== '' || s.reps !== ''));
      if (hit) return { k: x, sets: hit.sets.filter((s) => s.kg !== '' || s.reps !== '') };
    }
    return null;
  }

  const setText = (s) => (s.kg !== '' && s.reps !== '' ? `${s.kg} × ${s.reps}` : s.kg !== '' ? `${s.kg} kg` : `${s.reps}`);

  /* ---------- Calendar ---------- */
  function calendarHTML(sel) {
    const month = R.ui.logMonth;
    const [y, m] = month.split('-').map(Number);
    const first = `${month}-01`;
    const count = new Date(y, m, 0).getDate();
    const lead = U.wd(first);
    const today = U.today();
    const title = U.parse(first).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="cal-cell is-blank" aria-hidden="true"></span>';
    for (let d = 1; d <= count; d++) {
      const k = `${month}-${U.pad(d)}`;
      const trained = M.trained(k);
      const def = M.deficit(k);
      const w = M.weight(k);
      const parts = [U.fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' })];
      if (trained) parts.push('trained');
      if (def != null) parts.push(`${def >= 0 ? 'deficit' : 'surplus'} ${U.n(Math.abs(def))} kcal`);
      if (w != null) parts.push(`${U.n(w, 1)} kg`);
      const cls = ['cal-cell', k === sel ? 'is-selected' : '', k === today ? 'is-today' : '', k > today ? 'is-future' : ''].join(' ').trim();
      cells += `<a class="${cls}" href="#log/${k}" aria-label="${U.esc(parts.join(', '))}"${k === sel ? ' aria-current="true"' : ''}>
        <span class="cal-num">${d}</span>
        ${trained ? '<span class="cal-bar" aria-hidden="true"></span>' : ''}
        ${def != null ? `<span class="cal-bal ${onTrack(def) ? 'is-good' : 'is-bad'}" aria-hidden="true">${U.signed(-def)}</span>` : ''}
        ${w != null ? `<span class="cal-w" aria-hidden="true">${U.n(w, 1)}</span>` : ''}
      </a>`;
    }

    return `<div class="cal-head">
        <h2 class="h2">${title}</h2>
        <div class="cal-nav">
          <button class="icon-btn" type="button" data-month="-1" aria-label="Previous month"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button class="btn btn-small btn-quiet" type="button" data-month="0">Today</button>
          <button class="icon-btn" type="button" data-month="1" aria-label="Next month"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      </div>
      <div class="cal-grid">
        ${U.WD.map((w) => `<span class="cal-wd" aria-hidden="true">${w.slice(0, 2)}</span>`).join('')}
        ${cells}
      </div>
      <p class="cal-legend small muted"><span class="key key-bar"></span>Trained <span class="key key-num">−420</span>Net calories, green when on track for your goal <span class="key key-w">82.4</span>Weight</p>`;
  }

  /* ---------- Workout ---------- */
  function workoutHTML(k) {
    const d = view(k);
    const w = d.workout;
    const built = R.program.build(R.state.plan);
    const planDay = built.days.find((x) => x.weekday === U.wd(k));
    const fillOpts = built.days.map((x) => `<option value="${x.idx}"${planDay && planDay.idx === x.idx ? ' selected' : ''}>${U.esc(x.name)} (${U.WD[x.weekday]})</option>`).join('');

    const exs = w.exercises.map((ex, ei) => {
      const [c1, c2] = repLabel(ex);
      const last = lastTime(k, ex);
      const rows = ex.sets.map((s, si) => {
        const ph = last && last.sets[si] ? last.sets[si] : null;
        return `<tr>
          <th scope="row">${si + 1}</th>
          <td><input type="text" inputmode="decimal" data-ei="${ei}" data-si="${si}" data-k="kg" value="${U.esc(s.kg)}" placeholder="${ph ? U.esc(ph.kg) : ''}" aria-label="${U.esc(ex.name)}, set ${si + 1}, ${c1}"></td>
          <td><input type="text" inputmode="decimal" data-ei="${ei}" data-si="${si}" data-k="reps" value="${U.esc(s.reps)}" placeholder="${ph ? U.esc(ph.reps) : ''}" aria-label="${U.esc(ex.name)}, set ${si + 1}, ${c2}"></td>
          <td><button class="icon-btn" type="button" data-action="rm-set" data-ei="${ei}" data-si="${si}" aria-label="Remove set ${si + 1} of ${U.esc(ex.name)}">${X_ICON}</button></td>
        </tr>`;
      }).join('');
      const info = [];
      if (ex.target) info.push(`Plan: ${U.esc(ex.target)}.`);
      if (last) info.push(`Last time, ${U.fmtDate(last.k, { day: 'numeric', month: 'short' })}: ${U.esc(last.sets.map(setText).join(', '))}.`);
      return `<li class="log-ex">
        <div class="log-ex-head">
          <h4>${U.esc(ex.name)}</h4>
          <button class="icon-btn" type="button" data-action="rm-ex" data-ei="${ei}" aria-label="Remove ${U.esc(ex.name)}">${X_ICON}</button>
        </div>
        ${info.length ? `<p class="small muted">${info.join(' ')}</p>` : ''}
        ${ex.sets.length ? `<table class="sets"><thead><tr><th scope="col">Set</th><th scope="col">${c1}</th><th scope="col">${c2}</th><th scope="col"><span class="sr-only">Remove</span></th></tr></thead><tbody>${rows}</tbody></table>` : ''}
        <button class="btn btn-small btn-quiet" type="button" data-action="add-set" data-ei="${ei}">Add set</button>
      </li>`;
    }).join('');

    return `<div class="sec-head">
        <h3 class="h3">Workout</h3>
        <label class="switch"><input type="checkbox" role="switch" data-f="done"${w.done ? ' checked' : ''}><span class="switch-ui" aria-hidden="true"></span><span>Trained</span></label>
      </div>
      <div class="form-row">
        <label class="field grow"><span class="field-label">Session name</span><input type="text" data-f="title" value="${U.esc(w.title)}" placeholder="${planDay ? U.esc(planDay.name) : 'For example: Upper A'}"></label>
        <div class="field">
          <label class="field-label" for="fill-sel">Fill from the plan</label>
          <div class="inline-group"><select id="fill-sel">${fillOpts}</select><button class="btn btn-small" type="button" data-action="fill">Fill in</button></div>
        </div>
      </div>
      ${exs ? `<ol class="log-ex-list">${exs}</ol>` : '<p class="empty small">No exercises yet. Fill them in from the plan or add them one by one.</p>'}
      <div class="inline-group add-ex">
        <label class="sr-only" for="add-ex-sel">Exercise to add</label>
        <select id="add-ex-sel">${R.exerciseOptionsHTML(R.ui.lastEx)}</select>
        <button class="btn btn-small" type="button" data-action="add-ex">Add exercise</button>
      </div>
      <label class="field"><span class="field-label">Notes</span><textarea data-f="notes" rows="2" placeholder="How it went, what to change next time">${U.esc(w.notes)}</textarea></label>`;
  }

  /* ---------- Food and energy ---------- */
  function equationHTML(k) {
    const s = R.state.settings;
    const eaten = M.consumed(k);
    const burned = M.burned(k);
    const def = M.deficit(k);
    const term = (v, label, cls) => `<span class="term${cls ? ' ' + cls : ''}"><span class="t-val">${v}</span><span class="t-lab">${label}</span></span>`;
    if (s.bmr == null) {
      return `<p class="notice">Eaten so far: <strong>${eaten != null ? U.n(eaten) : 0} kcal</strong>. Add your BMR in <a href="#settings">Settings</a> to see the deficit.</p>`;
    }
    let h = term(U.n(s.bmr), 'BMR');
    if (s.baseline) h += '<span class="op">+</span>' + term(U.n(s.baseline), 'everyday activity');
    h += '<span class="op">+</span>' + term(U.n(burned || 0), 'burned');
    h += '<span class="op">\u2212</span>' + term(eaten != null ? U.n(eaten) : '0', 'eaten');
    h += '<span class="op">=</span>';
    h += def == null
      ? term('–', 'log food to see it', 'result')
      : term(U.n(Math.abs(def)), def >= 0 ? 'deficit' : 'surplus', `result ${onTrack(def) ? 'is-good' : 'is-bad'}`);
    return `<div class="equation" role="group" aria-label="Energy balance in kcal">${h}</div>`;
  }

  function foodListHTML(k) {
    const d = view(k);
    if (!d.foods.length) return '<p class="empty small">Nothing logged yet.</p>';
    const items = d.foods.map((f, fi) => `<li>
        <span class="f-name">${U.esc(f.name)}</span>
        <span class="f-qty">${f.qty != null ? `${U.n(f.qty, f.qty % 1 ? 1 : 0)} ${U.esc(f.unit)}` : ''}</span>
        <span class="f-kcal">${U.n(f.kcal)} kcal</span>
        <span class="f-p">${U.n(f.p, f.p % 1 ? 1 : 0)} g protein</span>
        <button class="icon-btn" type="button" data-action="rm-food" data-fi="${fi}" aria-label="Remove ${U.esc(f.name)}">${X_ICON}</button>
      </li>`).join('');
    const target = M.proteinTarget();
    return `<ul class="food-list">${items}</ul>
      <p class="food-total"><span>Total</span><span>${U.n(M.consumed(k))} kcal</span><span>${U.n(M.protein(k))} g protein${target ? ` of ${U.n(target)}` : ''}</span></p>`;
  }

  function foodFormHTML() {
    if (R.ui.foodTab === 'number') {
      return `<div class="form-row food-form">
        <label class="field grow"><span class="field-label">What was it</span><input type="text" id="num-name" placeholder="For example: Dinner out"></label>
        <label class="field"><span class="field-label">Calories (kcal)</span><input type="text" inputmode="numeric" id="num-kcal"></label>
        <label class="field"><span class="field-label">Protein (g)</span><input type="text" inputmode="decimal" id="num-p" placeholder="Optional"></label>
        <button class="btn btn-primary" type="button" data-action="add-number">Add</button>
      </div>`;
    }
    const food = R.foodById(R.ui.lastFood) || R.FOODS[0];
    return `<div class="form-row food-form">
      <label class="field grow"><span class="field-label">Food</span><select id="food-sel">${R.foodOptionsHTML(food.id)}</select></label>
      <label class="field"><span class="field-label">Amount (<span id="food-unit">${U.esc(food.unit)}</span>)</span><input type="text" inputmode="decimal" id="food-qty" value="${food.def}"></label>
      <button class="btn btn-primary" type="button" data-action="add-food">Add</button>
    </div>
    <p class="small muted" id="food-preview" aria-live="polite">${preview(food, food.def)}</p>`;
  }

  function preview(food, qty) {
    if (!food || qty == null || qty <= 0) return 'Enter an amount.';
    const c = R.foodCalc(food, qty);
    return `That is ${U.n(c.kcal)} kcal and ${U.n(c.p, c.p % 1 ? 1 : 0)} g protein.`;
  }

  function foodHTML(k) {
    const d = view(k);
    const tab = R.ui.foodTab;
    return `<h3 class="h3">Food and energy</h3>
      <div id="eq">${equationHTML(k)}</div>
      <label class="field field-inline"><span class="field-label">Burned in training or cardio</span><span class="with-unit"><input type="text" inputmode="numeric" data-f="burned" value="${d.burned != null ? d.burned : ''}" placeholder="0"><span>kcal</span></span></label>
      <div class="tabs" role="tablist" aria-label="How to log food">
        <button type="button" role="tab" data-tab="list" aria-selected="${tab === 'list'}">From food list</button>
        <button type="button" role="tab" data-tab="number" aria-selected="${tab === 'number'}">Type a number</button>
      </div>
      <div id="food-form" role="tabpanel">${foodFormHTML()}</div>
      <div id="food-list">${foodListHTML(k)}</div>`;
  }

  function weightHTML(k) {
    const d = view(k);
    return `<h3 class="h3">Body weight</h3>
      <label class="field field-inline"><span class="field-label">Weight</span><span class="with-unit"><input type="text" inputmode="decimal" data-f="weight" value="${d.weight != null ? d.weight : ''}" placeholder="${M.latestWeight(k) ? U.n(M.latestWeight(k).w, 1) : ''}"><span>kg</span></span></label>
      <p class="small muted">Weigh in the morning after the toilet and before eating, so days compare fairly.</p>`;
  }

  function dayHTML(k) {
    const prev = U.addDays(k, -1);
    const next = U.addDays(k, 1);
    return `<div class="day-head">
        <h2 class="h2" id="day-title">${U.fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
        <div class="cal-nav">
          <a class="icon-btn" href="#log/${prev}" aria-label="Previous day"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
          <a class="icon-btn" href="#log/${next}" aria-label="Next day"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        </div>
      </div>
      <section class="day-sec" id="sec-workout" aria-label="Workout">${workoutHTML(k)}</section>
      <section class="day-sec" id="sec-food" aria-label="Food and energy">${foodHTML(k)}</section>
      <section class="day-sec" id="sec-weight" aria-label="Body weight">${weightHTML(k)}</section>`;
  }

  /* ---------- Page ---------- */
  function render(el, param) {
    const today = U.today();
    const k = param && U.isKey(param) ? param : R.ui.selected && U.isKey(R.ui.selected) ? R.ui.selected : today;
    if (!param || param !== k) history.replaceState(null, '', `#log/${k}`);
    R.ui.selected = k;
    R.ui.logMonth = k.slice(0, 7);

    el.innerHTML = `
      <header class="page-head">
        <div>
          <h1 class="h1">Log</h1>
          <p class="lede">Pick a day to record training, food and weight. Everything saves as you type.</p>
        </div>
      </header>
      <div class="log-layout">
        <section class="panel cal-panel" id="cal" aria-label="Calendar">${calendarHTML(k)}</section>
        <section class="panel day-panel" id="day" aria-labelledby="day-title">${dayHTML(k)}</section>
      </div>`;

    if (R.ui.scrollToDay) {
      R.ui.scrollToDay = false;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.querySelector('#day').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    const $ = (s) => el.querySelector(s);
    const day = () => R.store.ensureDay(k);
    const refreshCal = () => { $('#cal').innerHTML = calendarHTML(k); };
    const refreshWorkout = (focusSel) => {
      $('#sec-workout').innerHTML = workoutHTML(k);
      if (focusSel) { const f = $(focusSel); if (f) f.focus(); }
    };
    const refreshFood = () => { $('#eq').innerHTML = equationHTML(k); $('#food-list').innerHTML = foodListHTML(k); };

    function addFood() {
      const food = R.foodById($('#food-sel').value);
      const qty = U.num($('#food-qty').value);
      if (!food || qty == null || qty <= 0) { R.toast('Enter an amount above zero.'); $('#food-qty').focus(); return; }
      const c = R.foodCalc(food, qty);
      day().foods.push({ id: U.uid(), name: food.name, qty, unit: food.unit, kcal: c.kcal, p: c.p });
      R.store.save();
      refreshFood();
      refreshCal();
      $('#food-qty').focus();
      $('#food-qty').select();
    }

    function addNumber() {
      const kcal = U.num($('#num-kcal').value);
      if (kcal == null) { R.toast('Enter the calories as a number.'); $('#num-kcal').focus(); return; }
      const name = $('#num-name').value.trim() || 'Calories';
      day().foods.push({ id: U.uid(), name, qty: null, unit: '', kcal: Math.round(kcal), p: U.num($('#num-p').value) || 0 });
      R.store.save();
      refreshFood();
      refreshCal();
      $('#num-name').value = '';
      $('#num-kcal').value = '';
      $('#num-p').value = '';
      $('#num-name').focus();
    }

    el.oninput = (e) => {
      const t = e.target;
      if (t.dataset.k) {
        const d = day();
        const set = d.workout.exercises[Number(t.dataset.ei)].sets[Number(t.dataset.si)];
        set[t.dataset.k] = t.value.trim();
        if (t.value.trim() && !d.workout.done) {
          d.workout.done = true;
          const sw = $('[data-f="done"]');
          if (sw) sw.checked = true;
          refreshCal();
        }
        R.store.saveSoon();
      } else if (t.dataset.f === 'title' || t.dataset.f === 'notes') {
        day().workout[t.dataset.f] = t.value;
        R.store.saveSoon();
      } else if (t.dataset.f === 'burned') {
        day().burned = U.num(t.value);
        R.store.saveSoon();
        $('#eq').innerHTML = equationHTML(k);
        refreshCal();
      } else if (t.dataset.f === 'weight') {
        const v = U.num(t.value);
        day().weight = v != null && v > 0 ? v : null;
        R.store.saveSoon();
        refreshCal();
      } else if (t.id === 'food-qty') {
        $('#food-preview').textContent = preview(R.foodById($('#food-sel').value), U.num(t.value));
      }
    };

    el.onchange = (e) => {
      const t = e.target;
      if (t.dataset.f === 'done') {
        day().workout.done = t.checked;
        R.store.save();
        refreshCal();
      } else if (t.id === 'food-sel') {
        R.ui.lastFood = t.value;
        const food = R.foodById(t.value);
        $('#food-unit').textContent = food.unit;
        $('#food-qty').value = food.def;
        $('#food-preview').textContent = preview(food, food.def);
      } else if (t.id === 'add-ex-sel') {
        R.ui.lastEx = t.value;
      }
    };

    el.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'food-qty') { e.preventDefault(); addFood(); }
      if (['num-name', 'num-kcal', 'num-p'].includes(e.target.id)) { e.preventDefault(); addNumber(); }
    };

    el.onclick = (e) => {
      if (e.target.closest('.cal-cell') && window.matchMedia('(max-width: 860px)').matches) R.ui.scrollToDay = true;
      const b = e.target.closest('button');
      if (!b) return;

      if (b.dataset.month != null) {
        const step = Number(b.dataset.month);
        if (step === 0) {
          if (k === today) { R.ui.logMonth = today.slice(0, 7); refreshCal(); } else location.hash = `#log/${today}`;
          return;
        }
        const [y, m] = R.ui.logMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + step, 1);
        R.ui.logMonth = `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}`;
        refreshCal();
        const again = $(`[data-month="${step}"]`);
        if (again) again.focus();
        return;
      }
      if (b.dataset.tab) {
        R.ui.foodTab = b.dataset.tab;
        $('#sec-food').innerHTML = foodHTML(k);
        const tb = $(`[data-tab="${b.dataset.tab}"]`);
        if (tb) tb.focus();
        return;
      }

      const a = b.dataset.action;
      const d = R.store.day(k);
      if (a === 'fill') {
        if (R.actions.logPlanDay(k, Number($('#fill-sel').value))) { refreshWorkout(); refreshCal(); }
      } else if (a === 'add-ex') {
        const id = $('#add-ex-sel').value;
        R.ui.lastEx = id;
        R.actions.addExerciseToDay(k, id, true);
        refreshWorkout();
        const heads = el.querySelectorAll('.log-ex');
        if (heads.length) { const inp = heads[heads.length - 1].querySelector('input'); if (inp) inp.focus(); }
      } else if (a === 'rm-ex') {
        const ei = Number(b.dataset.ei);
        const ex = d.workout.exercises[ei];
        const hasData = ex.sets.some((s) => s.kg !== '' || s.reps !== '');
        if (hasData && !confirm(`Remove ${ex.name} and its logged sets?`)) return;
        d.workout.exercises.splice(ei, 1);
        R.store.save();
        refreshWorkout('#add-ex-sel');
      } else if (a === 'add-set') {
        const ei = Number(b.dataset.ei);
        const sets = d.workout.exercises[ei].sets;
        const prev = sets[sets.length - 1];
        sets.push({ kg: prev ? prev.kg : '', reps: '' });
        R.store.save();
        refreshWorkout(`[data-ei="${ei}"][data-si="${sets.length - 1}"][data-k="reps"]`);
      } else if (a === 'rm-set') {
        const ei = Number(b.dataset.ei);
        d.workout.exercises[ei].sets.splice(Number(b.dataset.si), 1);
        R.store.save();
        refreshWorkout(`[data-action="add-set"][data-ei="${ei}"]`);
      } else if (a === 'add-food') {
        addFood();
      } else if (a === 'add-number') {
        addNumber();
      } else if (a === 'rm-food') {
        d.foods.splice(Number(b.dataset.fi), 1);
        R.store.save();
        refreshFood();
        refreshCal();
        const next = $('[data-action="rm-food"]') || $('#food-sel') || $('#num-name');
        if (next) next.focus();
      }
    };
  }

  R.views.log = { title: 'Log', render };
})(window.R);
