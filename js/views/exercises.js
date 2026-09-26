/* Recomp: exercise library. */
(function (R) {
  'use strict';

  const U = R.util;

  function matches(e, f) {
    if (f.muscle && e.muscle !== f.muscle) return false;
    if (f.equip && e.equip !== f.equip) return false;
    if (f.type && e.type !== f.type) return false;
    if (f.q) {
      const hay = [e.name, R.muscleName(e.muscle), e.sec.map(R.muscleName).join(' '), e.vars.join(' '), R.EQUIPMENT[e.equip]].join(' ').toLowerCase();
      return f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
    }
    return true;
  }

  function item(e) {
    const sec = e.sec.map(R.muscleName);
    return `<li class="lib-item">
      <div class="lib-head">
        <h3 class="lib-name">${U.esc(e.name)}</h3>
        <span class="tags"><span class="tag">${R.EQUIPMENT[e.equip]}</span><span class="tag">${R.TYPES[e.type]}</span></span>
      </div>
      ${sec.length ? `<p class="small muted">Also works ${U.esc(U.list(sec).toLowerCase())}.</p>` : ''}
      <p class="lib-tip">${U.esc(e.tip)}</p>
      ${e.vars.length ? `<p class="small"><span class="muted">Variations:</span> ${U.esc(U.list(e.vars))}.</p>` : ''}
      <button class="btn btn-small btn-quiet" type="button" data-add="${e.id}">Add to today's log</button>
    </li>`;
  }

  function results(f) {
    const hits = R.EXERCISES.filter((e) => matches(e, f));
    if (!hits.length) {
      return `<p class="empty">No exercises match these filters. <button class="link-btn" type="button" data-action="clear">Clear filters</button></p>`;
    }
    const groups = R.MUSCLES.map((m) => {
      const list = hits.filter((e) => e.muscle === m.id);
      if (!list.length) return '';
      return `<section class="lib-group" aria-labelledby="mg-${m.id}">
        <div class="lib-group-head">
          <h2 class="h2" id="mg-${m.id}">${U.esc(m.name)}</h2>
          <p class="muted">${U.esc(m.about)}</p>
        </div>
        <ul class="lib-list">${list.map(item).join('')}</ul>
      </section>`;
    }).join('');
    return `<p class="muted small count" aria-live="polite">Showing ${hits.length} of ${R.EXERCISES.length} exercises.</p>${groups}`;
  }

  function render(el) {
    const f = R.ui.lib;
    const muscleOpts = ['<option value="">All muscles</option>'].concat(
      Array.from(new Set(R.MUSCLES.map((m) => m.group))).map((g) =>
        `<optgroup label="${U.esc(g)}">${R.MUSCLES.filter((m) => m.group === g).map((m) => `<option value="${m.id}"${f.muscle === m.id ? ' selected' : ''}>${U.esc(m.name)}</option>`).join('')}</optgroup>`)
    ).join('');
    const equipOpts = ['<option value="">Any equipment</option>'].concat(
      Object.keys(R.EQUIPMENT).map((k) => `<option value="${k}"${f.equip === k ? ' selected' : ''}>${R.EQUIPMENT[k]}</option>`)
    ).join('');
    const typeSeg = [['', 'All'], ['compound', 'Compound'], ['isolation', 'Isolation'], ['cardio', 'Cardio']]
      .map(([v, l]) => `<button type="button" data-type="${v}" aria-pressed="${f.type === v}">${l}</button>`).join('');

    el.innerHTML = `
      <header class="page-head">
        <div>
          <h1 class="h1">Exercises</h1>
          <p class="lede">Every muscle, the main gym exercises for it and the variations that train it the same way.</p>
        </div>
      </header>
      <div class="filters panel">
        <label class="field grow"><span class="field-label">Search</span><input type="search" id="lib-q" value="${U.esc(f.q)}" placeholder="Try 'row', 'cable' or 'glutes'" autocomplete="off"></label>
        <label class="field"><span class="field-label">Muscle</span><select id="lib-muscle">${muscleOpts}</select></label>
        <label class="field"><span class="field-label">Equipment</span><select id="lib-equip">${equipOpts}</select></label>
        <div class="field"><span class="field-label" id="lbl-type">Type</span><div class="seg" role="group" aria-labelledby="lbl-type">${typeSeg}</div></div>
      </div>
      <div id="lib-results">${results(f)}</div>`;

    const out = el.querySelector('#lib-results');
    const refresh = () => { out.innerHTML = results(f); };

    el.oninput = (e) => {
      if (e.target.id === 'lib-q') { f.q = e.target.value; refresh(); }
    };
    el.onchange = (e) => {
      if (e.target.id === 'lib-muscle') { f.muscle = e.target.value; refresh(); }
      if (e.target.id === 'lib-equip') { f.equip = e.target.value; refresh(); }
    };
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.type != null) {
        f.type = b.dataset.type;
        el.querySelectorAll('[data-type]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        refresh();
      } else if (b.dataset.add) {
        R.actions.addExerciseToDay(U.today(), b.dataset.add);
      } else if (b.dataset.action === 'clear') {
        R.ui.lib = { q: '', muscle: '', equip: '', type: '' };
        render(el);
      }
    };
  }

  R.views.exercises = { title: 'Exercises', render };
})(window.R);
