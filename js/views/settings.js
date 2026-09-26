/* Recomp: settings, BMR, custom foods and data. */
(function (R) {
  'use strict';

  const U = R.util;
  const M = R.metrics;
  const UNITS = ['g', 'ml', 'piece', 'slice', 'serving', 'scoop', 'bar', 'cup'];

  function estimates() {
    const c = R.state.settings.calc;
    const lw = M.latestWeight();
    const w = U.num(c.weight) || (lw ? lw.w : null);
    const h = U.num(c.height);
    const a = U.num(c.age);
    const bf = U.num(c.bf);
    const out = {};
    if (w && h && a) out.mifflin = Math.round(10 * w + 6.25 * h - 5 * a + (c.sex === 'female' ? -161 : 5));
    if (w && bf != null && bf > 2 && bf < 60) out.katch = Math.round(370 + 21.6 * w * (1 - bf / 100));
    return out;
  }

  function estimateHTML() {
    const e = estimates();
    if (e.mifflin == null && e.katch == null) return '<p class="small muted">Fill in age, height and weight to get an estimate.</p>';
    let h = '<div class="estimates">';
    if (e.mifflin != null) h += `<div class="estimate"><p><strong>${U.n(e.mifflin)} kcal</strong> <span class="muted">Mifflin–St Jeor, based on age, height and weight</span></p><button class="btn btn-small" type="button" data-use="${e.mifflin}">Use this BMR</button></div>`;
    if (e.katch != null) h += `<div class="estimate"><p><strong>${U.n(e.katch)} kcal</strong> <span class="muted">Katch–McArdle, based on lean mass; better if your body-fat figure is reliable</span></p><button class="btn btn-small" type="button" data-use="${e.katch}">Use this BMR</button></div>`;
    return h + '</div>';
  }

  function customFoodsHTML() {
    const list = R.state.customFoods;
    const items = list.length
      ? `<ul class="plain-list">${list.map((c) => `<li><span><strong>${U.esc(c.name)}</strong> <span class="muted">${U.n(c.kcal)} kcal and ${U.n(c.p, c.p % 1 ? 1 : 0)} g protein per ${U.n(c.per, c.per % 1 ? 1 : 0)} ${U.esc(c.unit)}</span></span><button class="btn btn-small btn-quiet" type="button" data-rm-food="${U.esc(c.id)}">Remove</button></li>`).join('')}</ul>`
      : '<p class="small muted">Foods you add here appear at the top of the food list in the log.</p>';
    return items;
  }

  function seg(name, current, options) {
    return options.map(([v, l]) => `<button type="button" data-${name}="${v}" aria-pressed="${current === v}">${l}</button>`).join('');
  }

  function render(el) {
    const s = R.state.settings;
    const c = s.calc;
    const lw = M.latestWeight();

    el.innerHTML = `
      <header class="page-head">
        <div>
          <h1 class="h1">Settings</h1>
          <p class="lede">Set these once. Everything else is calculated from them.</p>
        </div>
      </header>
      <div class="grid-2 grid-settings">
        <div class="stack">
          <section class="panel">
            <h2 class="panel-title">You</h2>
            <label class="field"><span class="field-label">Name</span><input type="text" data-s="name" value="${U.esc(s.name)}" placeholder="Used in the greeting" autocomplete="given-name"></label>
            <div class="field"><span class="field-label" id="lbl-goal">Goal</span><div class="seg" role="group" aria-labelledby="lbl-goal">${seg('goal', s.goal, [['lose', 'Lose fat'], ['maintain', 'Maintain'], ['gain', 'Gain muscle']])}</div>
              <p class="small muted">Decides which way the arrows on the overview count as good.</p></div>
            <div class="field"><span class="field-label" id="lbl-theme">Appearance</span><div class="seg" role="group" aria-labelledby="lbl-theme">${seg('theme', s.theme, [['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']])}</div></div>
          </section>

          <section class="panel">
            <h2 class="panel-title">Energy</h2>
            <label class="field field-inline"><span class="field-label">BMR</span><span class="with-unit"><input type="text" inputmode="numeric" data-s="bmr" value="${s.bmr != null ? s.bmr : ''}" placeholder="1800"><span>kcal a day</span></span></label>
            <p class="small muted">Your basal metabolic rate: what your body burns at complete rest. It is the starting point for every day's deficit.</p>

            <details class="estimator"${s.bmr == null ? ' open' : ''}>
              <summary>Estimate your BMR</summary>
              <div class="field"><span class="field-label" id="lbl-sex">Sex</span><div class="seg seg-small" role="group" aria-labelledby="lbl-sex">${seg('sex', c.sex, [['male', 'Male'], ['female', 'Female']])}</div></div>
              <div class="form-row">
                <label class="field"><span class="field-label">Age</span><input type="text" inputmode="numeric" data-c="age" value="${U.esc(c.age)}"></label>
                <label class="field"><span class="field-label">Height (cm)</span><input type="text" inputmode="numeric" data-c="height" value="${U.esc(c.height)}"></label>
                <label class="field"><span class="field-label">Weight (kg)</span><input type="text" inputmode="decimal" data-c="weight" value="${U.esc(c.weight || '')}" placeholder="${lw ? U.n(lw.w, 1) : ''}"></label>
                <label class="field"><span class="field-label">Body fat %</span><input type="text" inputmode="decimal" data-c="bf" value="${U.esc(c.bf)}" placeholder="Optional"></label>
              </div>
              <div id="estimates">${estimateHTML()}</div>
            </details>

            <label class="field field-inline"><span class="field-label">Everyday activity</span><span class="with-unit"><input type="text" inputmode="numeric" data-s="baseline" value="${s.baseline || ''}" placeholder="0"><span>kcal a day</span></span></label>
            <p class="small muted">BMR leaves out walking, working and moving around. If you log that as burned calories each day, leave this at 0. Otherwise a desk job with some walking is roughly 300 kcal, an active job 500–700.</p>

            <label class="field field-inline"><span class="field-label">Protein target</span><span class="with-unit"><input type="text" inputmode="decimal" data-s="proteinPerKg" value="${s.proteinPerKg}"><span>g per kg</span></span></label>
            <p class="small muted">1.6–2.2 g per kg of body weight helps keep muscle on a cut.${lw ? ` At ${U.n(lw.w, 1)} kg that is <span id="prot-target">${U.n(M.proteinTarget())}</span> g a day.` : ''}</p>
          </section>
        </div>

        <div class="stack">
          <section class="panel">
            <h2 class="panel-title">My foods</h2>
            <form class="form-row" id="cf-form" novalidate>
              <label class="field grow"><span class="field-label">Name</span><input type="text" id="cf-name" placeholder="For example: My protein oats"></label>
              <label class="field"><span class="field-label">Per</span><input type="text" inputmode="decimal" id="cf-per" value="100"></label>
              <label class="field"><span class="field-label">Unit</span><select id="cf-unit">${UNITS.map((u) => `<option>${u}</option>`).join('')}</select></label>
              <label class="field"><span class="field-label">kcal</span><input type="text" inputmode="decimal" id="cf-kcal"></label>
              <label class="field"><span class="field-label">Protein (g)</span><input type="text" inputmode="decimal" id="cf-p"></label>
              <button class="btn btn-primary" type="submit">Add food</button>
            </form>
            <div id="cf-list">${customFoodsHTML()}</div>
          </section>

          <section class="panel">
            <h2 class="panel-title">Your data</h2>
            <p class="small muted">Everything is stored in this browser only. Nothing is sent anywhere. Export a backup now and then, or to move to another device.</p>
            <div class="button-row">
              <button class="btn" type="button" data-action="export">Export backup</button>
              <label class="btn">Import backup<input type="file" accept="application/json,.json" id="import-file" class="sr-only"></label>
              <button class="btn" type="button" data-action="example">Load example data</button>
            </div>
            <div class="danger">
              <p class="small"><strong>Delete all data.</strong> Removes every log, weigh-in, setting and custom food from this browser.</p>
              <button class="btn btn-danger" type="button" data-action="wipe">Delete all data</button>
            </div>
          </section>
        </div>
      </div>`;

    const $ = (q) => el.querySelector(q);

    el.oninput = (e) => {
      const t = e.target;
      if (t.dataset.s) {
        const key = t.dataset.s;
        if (key === 'name') s.name = t.value;
        else if (key === 'bmr') { const v = U.num(t.value); s.bmr = v && v > 0 ? Math.round(v) : null; }
        else if (key === 'baseline') { const v = U.num(t.value); s.baseline = v && v > 0 ? Math.round(v) : 0; }
        else if (key === 'proteinPerKg') {
          const v = U.num(t.value);
          if (v && v > 0 && v < 5) s.proteinPerKg = v;
          const pt = $('#prot-target');
          if (pt) pt.textContent = U.n(M.proteinTarget());
        }
        R.store.saveSoon();
      } else if (t.dataset.c) {
        c[t.dataset.c] = t.value.trim();
        $('#estimates').innerHTML = estimateHTML();
        R.store.saveSoon();
      }
    };

    el.onchange = (e) => {
      if (e.target.id !== 'import-file') return;
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try { data = JSON.parse(reader.result); } catch (err) { R.toast('That file is not a Recomp backup (it is not valid JSON).'); return; }
        if (!data || typeof data !== 'object' || (!data.logs && !data.settings)) { R.toast('That file is not a Recomp backup.'); return; }
        if (!confirm('Replace everything in this browser with the backup?')) return;
        R.store.replace(data);
        R.applyTheme();
        R.ui.barAnimated = false;
        R.toast('Backup imported.');
        render(el);
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    el.onsubmit = (e) => {
      e.preventDefault();
      const name = $('#cf-name').value.trim();
      const per = U.num($('#cf-per').value);
      const kcal = U.num($('#cf-kcal').value);
      if (!name) { R.toast('Give the food a name.'); $('#cf-name').focus(); return; }
      if (!per || per <= 0) { R.toast('Enter the amount the values are for.'); $('#cf-per').focus(); return; }
      if (kcal == null || kcal < 0) { R.toast('Enter the calories.'); $('#cf-kcal').focus(); return; }
      const unit = $('#cf-unit').value;
      R.state.customFoods.push({ id: U.uid(), name, unit, per, kcal, p: U.num($('#cf-p').value) || 0, def: per });
      R.store.save();
      R.toast(`Added ${name}.`);
      $('#cf-list').innerHTML = customFoodsHTML();
      ['#cf-name', '#cf-kcal', '#cf-p'].forEach((q) => { $(q).value = ''; });
      $('#cf-name').focus();
    };

    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.goal) { s.goal = b.dataset.goal; R.store.save(); render(el); $(`[data-goal="${s.goal}"]`).focus(); }
      else if (b.dataset.theme) { s.theme = b.dataset.theme; R.store.save(); R.applyTheme(); render(el); $(`[data-theme="${s.theme}"]`).focus(); }
      else if (b.dataset.sex) {
        c.sex = b.dataset.sex;
        el.querySelectorAll('[data-sex]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        $('#estimates').innerHTML = estimateHTML();
        R.store.save();
      } else if (b.dataset.use) {
        s.bmr = Number(b.dataset.use);
        R.store.save();
        $('[data-s="bmr"]').value = s.bmr;
        R.toast(`BMR set to ${U.n(s.bmr)} kcal.`);
      } else if (b.dataset.rmFood) {
        R.state.customFoods = R.state.customFoods.filter((x) => x.id !== b.dataset.rmFood);
        R.store.save();
        $('#cf-list').innerHTML = customFoodsHTML();
      } else if (b.dataset.action === 'export') {
        R.store.flush();
        const blob = new Blob([R.store.exportJSON()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recomp-backup-${U.today()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        R.toast('Backup exported.');
      } else if (b.dataset.action === 'example') {
        if (Object.keys(R.state.logs).length && !confirm('Example data fills the last seven weeks and replaces anything logged on those days. Continue?')) return;
        R.actions.loadExample();
        R.ui.barAnimated = false;
        R.toast('Example data loaded. Have a look at the overview.');
        render(el);
      } else if (b.dataset.action === 'wipe') {
        if (!confirm('Delete all logs, weigh-ins, settings and custom foods from this browser? This cannot be undone.')) return;
        R.store.reset();
        R.applyTheme();
        R.ui.barAnimated = false;
        R.toast('All data deleted.');
        render(el);
      }
    };
  }

  R.views.settings = { title: 'Settings', render };
})(window.R);
