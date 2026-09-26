/* Recomp: routing, shared actions and start-up. Loaded last. */
(function (R) {
  'use strict';

  const U = R.util;

  R.ui = {
    logMonth: U.today().slice(0, 7),
    selected: null,
    foodTab: 'list',
    lastFood: 'chicken-breast',
    lastEx: 'bench-press',
    lib: { q: '', muscle: '', equip: '', type: '' },
    weightRange: 90,
    barAnimated: false,
    scrollToDay: false,
  };

  R.applyTheme = () => {
    const t = R.state.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  };

  const emptySets = (n) => Array.from({ length: n }, () => ({ kg: '', reps: '' }));

  R.actions = {
    /** Fill a day with a plan session. Returns false if the person cancels. */
    logPlanDay(k, idx) {
      const built = R.program.build(R.state.plan);
      const pd = built.days[idx];
      if (!pd) return false;
      const d = R.store.ensureDay(k);
      const logged = d.workout.exercises.some((e) => e.sets.some((s) => s.kg !== '' || s.reps !== ''));
      if (d.workout.exercises.length && !confirm(logged
        ? `Replace the exercises and sets already logged for ${U.fmtDate(k)} with ${pd.name}?`
        : `Replace the exercises listed for ${U.fmtDate(k)} with ${pd.name}?`)) return false;
      d.workout.exercises = pd.slots.map((s) => ({
        id: s.ex.id,
        name: s.ex.name,
        target: R.program.dose(s),
        sets: emptySets(s.ex.type === 'cardio' || s.role === 'cardio' ? 1 : s.sets),
      }));
      d.workout.title = pd.name;
      d.workout.done = true;
      R.store.save();
      R.toast(`${pd.name} added to ${U.fmtDate(k)}.`);
      return true;
    },

    addExerciseToDay(k, exId, quiet) {
      const ex = R.exById[exId];
      if (!ex) return;
      const d = R.store.ensureDay(k);
      d.workout.exercises.push({ id: ex.id, name: ex.name, target: '', sets: emptySets(ex.type === 'cardio' ? 1 : 3) });
      R.store.save();
      if (!quiet) R.toast(`${ex.name} added to today's log.`);
    },

    /** Seven weeks of plausible history ending yesterday */
    loadExample() {
      const s = R.state.settings;
      if (s.bmr == null) { s.bmr = 1850; if (!s.baseline) s.baseline = 300; }
      const today = U.today();
      const built = R.program.build(R.state.plan);
      const start = U.addDays(today, -49);
      const rnd = () => Math.random();
      const base = {};
      const round = (v, step) => Math.round(v / step) * step;
      const rangeOf = (str) => { const m = String(str).match(/\d+/g) || ['8']; return [Number(m[0]), Number(m[1] || m[0])]; };

      const baseFor = (ex) => {
        if (base[ex.id] != null) return base[ex.id];
        let b = '';
        if (ex.type === 'compound' && ex.equip === 'barbell') b = 55 + round(rnd() * 40, 5);
        else if (ex.type === 'compound' && ex.equip === 'machine') b = 60 + round(rnd() * 60, 10);
        else if (ex.type === 'compound' && (ex.equip === 'dumbbell' || ex.equip === 'other')) b = 20 + round(rnd() * 14, 2);
        else if (ex.type === 'compound' && ex.equip === 'cable') b = 45 + round(rnd() * 25, 5);
        else if (ex.type === 'isolation' && ex.equip === 'dumbbell') b = 8 + round(rnd() * 10, 2);
        else if (ex.type === 'isolation' && (ex.equip === 'cable' || ex.equip === 'machine')) b = 15 + round(rnd() * 35, 5);
        else if (ex.type === 'isolation' && ex.equip === 'barbell') b = 25 + round(rnd() * 15, 2.5);
        base[ex.id] = b;
        return b;
      };

      for (let i = 0; i < 49; i++) {
        const k = U.addDays(start, i);
        const d = R.store.normalizeDay(null);
        const week = Math.floor(i / 7);
        const pd = built.days.find((x) => x.weekday === U.wd(k));

        if (pd && rnd() < 0.87) {
          d.workout.done = true;
          d.workout.title = pd.name;
          d.workout.exercises = pd.slots.map((sl) => {
            const ex = sl.ex;
            if (ex.type === 'cardio' || sl.role === 'cardio') {
              return { id: ex.id, name: ex.name, target: R.program.dose(sl), sets: [{ kg: String(5 + Math.floor(rnd() * 4)), reps: String(25 + Math.floor(rnd() * 3) * 5) }] };
            }
            const b = baseFor(ex);
            const kg = b === '' ? '' : String(round(b * (1 + 0.012 * week), ex.equip === 'dumbbell' ? 1 : 2.5));
            const [lo, hi] = rangeOf(ex.dose || sl.reps);
            const sets = Array.from({ length: sl.sets }, (_, j) => ({ kg, reps: String(Math.max(lo, hi - j - (rnd() < 0.4 ? 1 : 0))) }));
            return { id: ex.id, name: ex.name, target: R.program.dose(sl), sets };
          });
          d.burned = 220 + Math.round(rnd() * 18) * 10;
        } else if (!pd && rnd() < 0.3) {
          d.burned = 120 + Math.round(rnd() * 10) * 10;
        }

        if (rnd() < 0.75) d.weight = Math.round((86.4 - 0.075 * i + (rnd() - 0.5) * 0.9) * 10) / 10;

        if (rnd() < 0.92) {
          const out = s.bmr + (s.baseline || 0) + (d.burned || 0);
          const target = rnd() < 0.08 ? out + 100 + rnd() * 300 : out - (300 + rnd() * 250);
          const add = (id, qty) => {
            const f = R.foodById(id);
            const c = R.foodCalc(f, qty);
            d.foods.push({ id: U.uid(), name: f.name, qty, unit: f.unit, kcal: c.kcal, p: c.p });
          };
          add('oats', 60); add('whey', 1); add('banana', 1); add('quark', 250); add('chicken-breast', 150); add('rice-cooked', 200);
          const rest = Math.max(0, target - U.sum(d.foods.map((f) => f.kcal)));
          if (rest > 50) {
            d.foods.push({ id: U.uid(), name: 'Lunch', qty: null, unit: '', kcal: Math.round(rest * 0.55), p: 25 });
            d.foods.push({ id: U.uid(), name: 'Snacks', qty: null, unit: '', kcal: Math.round(rest * 0.45), p: 6 });
          }
        }
        R.state.logs[k] = d;
      }
      R.store.save();
    },
  };

  /* ---------- Router ---------- */
  const ROUTES = ['dashboard', 'plan', 'exercises', 'log', 'weight', 'settings'];
  let current = null;

  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, param] = h.split('/');
    const v = ROUTES.includes(name) ? name : 'dashboard';
    const el = document.getElementById('view');

    R.store.flush();
    R.charts.cleanup();
    el.onclick = el.oninput = el.onchange = el.onsubmit = el.onkeydown = null;

    R.views[v].render(el, param);
    document.title = `${R.views[v].title} | Recomp`;

    document.querySelectorAll('[data-route]').forEach((a) => {
      if (a.dataset.route === v) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (current !== v) {
      if (current !== null) {
        window.scrollTo(0, 0);
        el.focus({ preventScroll: true });
      }
      current = v;
    }
  }

  R.route = route;
  R.applyTheme();
  window.addEventListener('hashchange', route);
  route();
})(window.R);
