/* Recomp: state, persistence and derived numbers.
   Everything lives in localStorage under one key; nothing leaves the browser. */
(function (R) {
  'use strict';

  const U = R.util;
  const KEY = 'recomp:data:v1';

  function defaults() {
    return {
      version: 1,
      settings: {
        name: '',
        goal: 'lose', // lose | maintain | gain
        bmr: null,
        baseline: 0, // everyday activity on top of BMR, kcal/day
        proteinPerKg: 2.0,
        theme: 'auto',
        compareMode: 'rolling', // rolling | calendar
        calc: { sex: 'male', age: '', height: '', bf: '' },
      },
      plan: { days: 4, weekdays: [0, 1, 3, 4], splitId: 'ul4', session: 60, overrides: {} },
      logs: {},
      customFoods: [],
    };
  }

  const numOrNull = (v) => (v == null || v === '' || !isFinite(Number(v)) ? null : Number(v));

  function normalizeDay(d) {
    d = d && typeof d === 'object' ? d : {};
    const w = d.workout && typeof d.workout === 'object' ? d.workout : {};
    return {
      workout: {
        done: !!w.done,
        title: typeof w.title === 'string' ? w.title : '',
        notes: typeof w.notes === 'string' ? w.notes : '',
        exercises: Array.isArray(w.exercises)
          ? w.exercises.map((e) => ({
              id: typeof e.id === 'string' ? e.id : '',
              name: typeof e.name === 'string' ? e.name : (R.exById[e.id] ? R.exById[e.id].name : 'Exercise'),
              target: typeof e.target === 'string' ? e.target : '',
              sets: Array.isArray(e.sets) ? e.sets.map((s) => ({ kg: s && s.kg != null ? String(s.kg) : '', reps: s && s.reps != null ? String(s.reps) : '' })) : [],
            }))
          : [],
      },
      foods: Array.isArray(d.foods)
        ? d.foods
            .filter((f) => f && isFinite(Number(f.kcal)))
            .map((f) => ({
              id: typeof f.id === 'string' ? f.id : U.uid(),
              name: typeof f.name === 'string' ? f.name : 'Food',
              qty: numOrNull(f.qty),
              unit: typeof f.unit === 'string' ? f.unit : '',
              kcal: Number(f.kcal),
              p: numOrNull(f.p) || 0,
            }))
        : [],
      burned: numOrNull(d.burned),
      weight: numOrNull(d.weight),
    };
  }

  function normalize(raw) {
    const base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    const s = Object.assign({}, base.settings, raw.settings || {});
    s.calc = Object.assign({}, base.settings.calc, (raw.settings && raw.settings.calc) || {});
    s.bmr = numOrNull(s.bmr);
    s.baseline = numOrNull(s.baseline) || 0;
    s.proteinPerKg = numOrNull(s.proteinPerKg) || 2.0;
    if (!['lose', 'maintain', 'gain'].includes(s.goal)) s.goal = 'lose';
    if (!['auto', 'light', 'dark'].includes(s.theme)) s.theme = 'auto';
    if (!['rolling', 'calendar'].includes(s.compareMode)) s.compareMode = 'rolling';

    const p = Object.assign({}, base.plan, raw.plan || {});
    p.days = Math.min(7, Math.max(1, parseInt(p.days, 10) || 4));
    p.session = [45, 60, 75, 90].includes(Number(p.session)) ? Number(p.session) : 60;
    p.weekdays = R.program.weekdaysFor({ days: p.days, weekdays: Array.isArray(p.weekdays) ? p.weekdays.map(Number) : [] });
    if (!R.SPLITS.some((x) => x.id === p.splitId && x.days === p.days)) p.splitId = R.program.recommended(p.days).id;
    p.overrides = p.overrides && typeof p.overrides === 'object' ? p.overrides : {};

    const logs = {};
    if (raw.logs && typeof raw.logs === 'object') {
      Object.keys(raw.logs).forEach((k) => { if (U.isKey(k)) logs[k] = normalizeDay(raw.logs[k]); });
    }

    const customFoods = Array.isArray(raw.customFoods)
      ? raw.customFoods
          .filter((c) => c && c.name && isFinite(Number(c.kcal)))
          .map((c) => ({
            id: typeof c.id === 'string' ? c.id : U.uid(),
            name: String(c.name),
            unit: c.unit || 'g',
            per: numOrNull(c.per) || 100,
            kcal: Number(c.kcal),
            p: numOrNull(c.p) || 0,
            def: numOrNull(c.def) || numOrNull(c.per) || 100,
          }))
      : [];

    return { version: 1, settings: s, plan: p, logs, customFoods };
  }

  function isEmptyDay(d) {
    const w = d.workout;
    const noWorkout = !w || (!w.done && !w.title && !w.notes && !w.exercises.length);
    return noWorkout && !d.foods.length && d.burned == null && d.weight == null;
  }

  /** Copy of state without empty days, for saving and export */
  function serializable() {
    const st = R.state;
    const logs = {};
    Object.keys(st.logs).sort().forEach((k) => { if (!isEmptyDay(st.logs[k])) logs[k] = st.logs[k]; });
    return Object.assign({}, st, { logs });
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return defaults();
    }
  }

  let timer = null;
  let warned = false;

  function save() {
    clearTimeout(timer);
    timer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(serializable()));
    } catch (e) {
      if (!warned) {
        warned = true;
        R.toast('Changes could not be saved in this browser. Export a backup from Settings.');
      }
    }
  }

  R.state = load();

  R.store = {
    KEY,
    defaults,
    normalize,
    save,
    saveSoon() { clearTimeout(timer); timer = setTimeout(save, 300); },
    flush() { if (timer) save(); },
    day(k) { return R.state.logs[k] || null; },
    ensureDay(k) {
      if (!R.state.logs[k]) R.state.logs[k] = normalizeDay(null);
      return R.state.logs[k];
    },
    replace(data) { R.state = normalize(data); save(); },
    reset() { R.state = defaults(); save(); },
    exportJSON() { return JSON.stringify(serializable(), null, 2); },
    normalizeDay,
  };

  window.addEventListener('pagehide', () => R.store.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') R.store.flush(); });

  /* ---------- Derived numbers ---------- */
  const M = {
    bmr() { return R.state.settings.bmr; },

    consumed(k) {
      const d = R.state.logs[k];
      if (!d || !d.foods.length) return null;
      return Math.round(U.sum(d.foods.map((f) => f.kcal)));
    },

    protein(k) {
      const d = R.state.logs[k];
      if (!d || !d.foods.length) return null;
      return Math.round(U.sum(d.foods.map((f) => f.p)));
    },

    burned(k) {
      const d = R.state.logs[k];
      return d && d.burned != null ? d.burned : null;
    },

    /** Total energy out: BMR + everyday activity + logged exercise */
    expenditure(k) {
      const bmr = M.bmr();
      if (bmr == null) return null;
      return bmr + (R.state.settings.baseline || 0) + (M.burned(k) || 0);
    },

    /** Positive = deficit, negative = surplus. Null without intake or BMR. */
    deficit(k) {
      const c = M.consumed(k);
      const e = M.expenditure(k);
      return c == null || e == null ? null : Math.round(e - c);
    },

    trained(k) {
      const d = R.state.logs[k];
      return !!(d && d.workout && d.workout.done);
    },

    weight(k) {
      const d = R.state.logs[k];
      return d && d.weight != null ? d.weight : null;
    },

    /** Sorted [{k, w}] of all weigh-ins */
    weights() {
      return Object.keys(R.state.logs)
        .filter((k) => R.state.logs[k].weight != null)
        .sort()
        .map((k) => ({ k, w: R.state.logs[k].weight }));
    },

    latestWeight(upTo) {
      const ws = M.weights().filter((x) => !upTo || x.k <= upTo);
      return ws.length ? ws[ws.length - 1] : null;
    },

    proteinTarget() {
      const lw = M.latestWeight();
      return lw ? Math.round(lw.w * R.state.settings.proteinPerKg) : null;
    },

    /** Summary over an inclusive date range */
    period(a, b) {
      const keys = U.range(a, b);
      const deficits = keys.map(M.deficit).filter((x) => x != null);
      const weights = keys.map(M.weight).filter((x) => x != null);
      return {
        keys,
        visits: keys.filter(M.trained).length,
        deficitAvg: deficits.length ? U.mean(deficits) : null,
        deficitDays: deficits.length,
        weightAvg: weights.length ? U.mean(weights) : null,
        weighIns: weights.length,
      };
    },
  };

  R.metrics = M;
})(window.R);
