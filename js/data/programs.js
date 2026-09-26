/* Recomp: training programme logic.
   A split is a list of day templates. Each template is a list of slots: a movement
   pattern, a role (how it is dosed) and a priority. Short sessions keep the
   highest-priority slots; long sessions keep everything and add sets. */
(function (R) {
  'use strict';

  const ROLES = {
    main: { label: 'Main lift', sets: 3, reps: '5–8', effort: 'Stop 1–2 reps before failure', rest: '2–3 min rest', min: 3.2 },
    secondary: { label: 'Secondary', sets: 3, reps: '8–12', effort: 'Stop 1–2 reps before failure', rest: '2 min rest', min: 2.6 },
    iso: { label: 'Isolation', sets: 3, reps: '10–15', effort: 'Go close to failure', rest: '60–90 s rest', min: 1.8 },
    core: { label: 'Core', sets: 3, reps: '10–15', effort: 'Slow, controlled reps', rest: '60 s rest', min: 1.5 },
    cardio: { label: 'Cardio', sets: 1, reps: '30–40 min', effort: 'Easy pace, you can still talk', rest: '', min: 35 },
  };

  /* Muscles that respond well to higher reps */
  const HIGH_REP = ['sidedelts', 'reardelts', 'calves', 'abs', 'forearms'];

  /* Ordered recommendations per movement pattern. The nth time a pattern
     appears in a week, it uses pool[n % length], so repeated days get variety. */
  const POOLS = {
    squat: ['back-squat', 'hack-squat', 'leg-press', 'front-squat', 'smith-squat'],
    hinge: ['romanian-deadlift', 'deadlift', 'trap-bar-deadlift', 'good-morning'],
    lunge: ['bulgarian-split-squat', 'walking-lunge', 'reverse-lunge', 'step-up'],
    hpush: ['bench-press', 'db-bench-press', 'machine-chest-press', 'dip'],
    incline: ['incline-db-press', 'incline-bench-press', 'machine-chest-press'],
    vpush: ['overhead-press', 'seated-db-press', 'machine-shoulder-press', 'landmine-press'],
    hpull: ['chest-supported-row', 'barbell-row', 'seated-cable-row', 't-bar-row', 'machine-row', 'one-arm-db-row'],
    vpull: ['lat-pulldown', 'pull-up', 'chin-up', 'single-arm-pulldown'],
    lats: ['single-arm-pulldown', 'straight-arm-pulldown', 'one-arm-db-row'],
    chestiso: ['cable-fly', 'pec-deck', 'db-fly'],
    sidedelt: ['cable-lateral-raise', 'db-lateral-raise', 'machine-lateral-raise'],
    reardelt: ['reverse-pec-deck', 'face-pull', 'rear-delt-fly'],
    biceps: ['incline-db-curl', 'cable-curl', 'hammer-curl', 'preacher-curl', 'barbell-curl'],
    triceps: ['overhead-cable-extension', 'rope-pushdown', 'skullcrusher', 'overhead-db-extension'],
    armpress: ['close-grip-bench', 'triceps-dip'],
    quadiso: ['leg-extension', 'sissy-squat'],
    hamcurl: ['seated-leg-curl', 'lying-leg-curl', 'nordic-curl'],
    glute: ['hip-thrust', 'cable-pull-through', 'glute-bridge'],
    calves: ['standing-calf-raise', 'seated-calf-raise', 'leg-press-calf-raise'],
    abs: ['cable-crunch', 'hanging-leg-raise', 'ab-wheel', 'reverse-crunch'],
    obliques: ['pallof-press', 'cable-woodchop', 'side-plank'],
    traps: ['db-shrug', 'barbell-shrug'],
    forearms: ['wrist-curl', 'reverse-curl', 'farmers-carry'],
    lowerback: ['back-extension', 'reverse-hyper', 'bird-dog'],
    adductors: ['adductor-machine', 'copenhagen-plank', 'sumo-squat'],
    cardio: ['incline-walk', 'stationary-bike', 'rowing-machine', 'stair-climber'],
  };

  const S = (p, role, pr) => ({ p, role, pr });

  const TEMPLATES = {
    fullTotal: { base: 'Full body', focus: 'Every major muscle in one session', slots: [
      S('squat', 'main', 1), S('hpush', 'main', 1), S('hpull', 'main', 1), S('hinge', 'secondary', 1),
      S('vpull', 'secondary', 2), S('vpush', 'secondary', 2), S('sidedelt', 'iso', 2),
      S('biceps', 'iso', 3), S('triceps', 'iso', 3), S('hamcurl', 'iso', 3), S('calves', 'iso', 4), S('abs', 'core', 4),
    ] },
    fullA: { base: 'Full body', focus: 'Squat, horizontal press and row', slots: [
      S('squat', 'main', 1), S('hpush', 'main', 1), S('hpull', 'secondary', 1),
      S('hamcurl', 'iso', 2), S('sidedelt', 'iso', 2),
      S('biceps', 'iso', 3), S('triceps', 'iso', 3), S('calves', 'iso', 3), S('abs', 'core', 4),
    ] },
    fullB: { base: 'Full body', focus: 'Hip hinge, incline press and pull-down', slots: [
      S('hinge', 'main', 1), S('incline', 'secondary', 1), S('vpull', 'secondary', 1),
      S('lunge', 'secondary', 2), S('sidedelt', 'iso', 2),
      S('reardelt', 'iso', 3), S('triceps', 'iso', 3), S('biceps', 'iso', 3), S('obliques', 'core', 4),
    ] },
    fullC: { base: 'Full body', focus: 'Squat variation, overhead press and row', slots: [
      S('squat', 'main', 1), S('vpush', 'main', 1), S('hpull', 'secondary', 1),
      S('hamcurl', 'iso', 2), S('chestiso', 'iso', 2), S('sidedelt', 'iso', 2),
      S('biceps', 'iso', 3), S('triceps', 'iso', 3), S('calves', 'iso', 3), S('abs', 'core', 4),
    ] },
    upperA: { base: 'Upper', focus: 'Chest, back, shoulders and arms, heavier pressing and rowing', slots: [
      S('hpush', 'main', 1), S('hpull', 'main', 1),
      S('incline', 'secondary', 2), S('vpull', 'secondary', 2), S('sidedelt', 'iso', 2),
      S('triceps', 'iso', 3), S('biceps', 'iso', 3), S('reardelt', 'iso', 4),
    ] },
    upperB: { base: 'Upper', focus: 'Chest, back, shoulders and arms, overhead press and pull-down focus', slots: [
      S('vpush', 'main', 1), S('vpull', 'main', 1),
      S('hpush', 'secondary', 2), S('hpull', 'secondary', 2), S('sidedelt', 'iso', 2),
      S('chestiso', 'iso', 3), S('biceps', 'iso', 3), S('triceps', 'iso', 3), S('reardelt', 'iso', 4),
    ] },
    lowerA: { base: 'Lower', focus: 'Quads, hamstrings, glutes and calves, squat focus', slots: [
      S('squat', 'main', 1), S('hinge', 'secondary', 1),
      S('quadiso', 'iso', 2), S('hamcurl', 'iso', 2),
      S('calves', 'iso', 3), S('abs', 'core', 3), S('adductors', 'iso', 4),
    ] },
    lowerB: { base: 'Lower', focus: 'Hamstrings, glutes, quads and calves, hinge focus', slots: [
      S('hinge', 'main', 1), S('lunge', 'secondary', 1),
      S('glute', 'secondary', 2), S('hamcurl', 'iso', 2),
      S('quadiso', 'iso', 3), S('calves', 'iso', 3), S('obliques', 'core', 4),
    ] },
    push: { base: 'Push', focus: 'Chest, shoulders and triceps', slots: [
      S('hpush', 'main', 1), S('vpush', 'secondary', 1),
      S('incline', 'secondary', 2), S('sidedelt', 'iso', 2), S('triceps', 'iso', 2),
      S('chestiso', 'iso', 3), S('triceps', 'iso', 4),
    ] },
    pull: { base: 'Pull', focus: 'Back, rear delts and biceps', slots: [
      S('vpull', 'main', 1), S('hpull', 'secondary', 1),
      S('lats', 'secondary', 2), S('reardelt', 'iso', 2), S('biceps', 'iso', 2),
      S('traps', 'iso', 3), S('biceps', 'iso', 4), S('forearms', 'iso', 5),
    ] },
    legs: { base: 'Legs', focus: 'Quads, hamstrings, glutes and calves', slots: [
      S('squat', 'main', 1), S('hinge', 'secondary', 1),
      S('lunge', 'secondary', 2), S('hamcurl', 'iso', 2),
      S('quadiso', 'iso', 3), S('calves', 'iso', 3), S('abs', 'core', 4),
    ] },
    chest: { base: 'Chest', focus: 'Chest with some triceps', slots: [
      S('hpush', 'main', 1), S('incline', 'secondary', 1),
      S('hpush', 'secondary', 2), S('chestiso', 'iso', 2),
      S('chestiso', 'iso', 3), S('triceps', 'iso', 4),
    ] },
    back: { base: 'Back', focus: 'Lats, upper back and rear delts', slots: [
      S('vpull', 'main', 1), S('hpull', 'main', 1),
      S('hpull', 'secondary', 2), S('lats', 'iso', 2),
      S('reardelt', 'iso', 3), S('traps', 'iso', 3), S('lowerback', 'core', 4),
    ] },
    shoulders: { base: 'Shoulders', focus: 'All three delt heads and traps', slots: [
      S('vpush', 'main', 1), S('sidedelt', 'iso', 1),
      S('reardelt', 'iso', 2), S('sidedelt', 'iso', 2),
      S('traps', 'iso', 3), S('abs', 'core', 4),
    ] },
    arms: { base: 'Arms', focus: 'Biceps, triceps and forearms', slots: [
      S('armpress', 'secondary', 1), S('biceps', 'iso', 1),
      S('triceps', 'iso', 2), S('biceps', 'iso', 2),
      S('triceps', 'iso', 3), S('forearms', 'iso', 3), S('abs', 'core', 4),
    ] },
    legsFull: { base: 'Legs', focus: 'Quads, hamstrings, glutes, adductors and calves', slots: [
      S('squat', 'main', 1), S('hinge', 'secondary', 1),
      S('lunge', 'secondary', 2), S('quadiso', 'iso', 2), S('hamcurl', 'iso', 2),
      S('glute', 'secondary', 3), S('calves', 'iso', 3), S('adductors', 'iso', 4),
    ] },
    recovery: { base: 'Recovery', focus: 'Easy cardio and core, no heavy lifting', slots: [
      S('cardio', 'cardio', 1), S('abs', 'core', 2), S('obliques', 'core', 2), S('lowerback', 'core', 3),
    ] },
  };

  const SPLITS = [
    { id: 'fb1', days: 1, rec: true, extraSet: true, name: 'Full body', templates: ['fullTotal'],
      why: 'With one session a week, a single full-body workout with an extra set on the big lifts is the only way to reach every muscle.' },
    { id: 'fb2', days: 2, rec: true, extraSet: true, name: 'Full body A and B', templates: ['fullA', 'fullB'],
      why: 'Two full-body sessions train every muscle twice a week, the frequency research supports for keeping and building muscle.' },
    { id: 'ul2', days: 2, extraSet: true, name: 'Upper and lower', templates: ['upperA', 'lowerA'],
      why: 'More exercises per region, but each muscle is trained only once a week.' },
    { id: 'fb3', days: 3, rec: true, name: 'Full body A, B and C', templates: ['fullA', 'fullB', 'fullC'],
      why: 'Every muscle three times a week with manageable sessions. The classic choice for three days.' },
    { id: 'ulf3', days: 3, name: 'Upper, lower and full body', templates: ['upperA', 'lowerA', 'fullC'],
      why: 'A middle ground: every muscle twice a week with a bit more focus per session.' },
    { id: 'ppl3', days: 3, name: 'Push, pull, legs', templates: ['push', 'pull', 'legs'],
      why: 'Easy to follow, but each muscle gets only one session a week. It works better at five or six days.' },
    { id: 'ul4', days: 4, rec: true, name: 'Upper and lower, twice', templates: ['upperA', 'lowerA', 'upperB', 'lowerB'],
      why: 'Each muscle twice a week with room for enough volume. The most proven four-day setup.' },
    { id: 'fb4', days: 4, name: 'Full body, four days', templates: ['fullA', 'fullB', 'fullC', 'fullA'],
      why: 'Shorter sessions spread over four days. Good when your time per visit is limited.' },
    { id: 'ulppl', days: 5, rec: true, name: 'Upper and lower plus push, pull, legs', templates: ['upperA', 'lowerA', 'push', 'pull', 'legs'],
      why: 'Combines both approaches so every muscle is trained twice a week over five sessions.' },
    { id: 'bro5', days: 5, name: 'Body-part split', templates: ['chest', 'back', 'legsFull', 'shoulders', 'arms'],
      why: 'One muscle group a day. Lots of volume per session, but each muscle is trained only once a week, which is less effective for most people.' },
    { id: 'ppl6', days: 6, rec: true, name: 'Push, pull, legs, twice', templates: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
      why: 'Every muscle twice a week with plenty of exercise variety. Suits people who like being in the gym most days.' },
    { id: 'ul6', days: 6, name: 'Upper and lower, three times', templates: ['upperA', 'lowerA', 'upperB', 'lowerB', 'upperA', 'lowerA'],
      why: 'Each muscle three times a week with shorter sessions.' },
    { id: 'ppl7', days: 7, rec: true, name: 'Push, pull, legs, twice, plus recovery', templates: ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'recovery'],
      why: 'Six lifting days and one easy cardio and core day. Muscle is rebuilt during rest, so keep the seventh day light.' },
    { id: 'ul7', days: 7, name: 'Upper and lower, three times, plus recovery', templates: ['upperA', 'lowerA', 'upperB', 'lowerB', 'upperA', 'lowerA', 'recovery'],
      why: 'High frequency with a light seventh day for cardio and core.' },
  ];

  const DEFAULT_WEEKDAYS = {
    1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
  };

  const WARMUP_MIN = 8;
  const LETTERS = 'ABCDEFG';

  const GUIDELINES = [
    { title: 'Keep lifting heavy', text: 'Heavy training is the signal that tells your body to hold on to muscle while you eat less. Keep main lifts in the 5–8 rep range and aim to keep your numbers.' },
    { title: 'Train each muscle about twice a week', text: 'Roughly 10–20 hard sets per muscle per week, spread over two or more sessions.' },
    { title: 'Push close to failure', text: 'End most sets 1–2 reps before failure. Isolation exercises can go closer.' },
    { title: 'Progress with double progression', text: 'Work within a rep range. Once every set reaches the top of it, add the smallest weight step and build back up.' },
    { title: 'Eat enough protein', text: '1.6–2.2 g per kg of body weight a day, spread over three to five meals.' },
    { title: 'Lose slowly', text: 'Aim for 0.5–1% of body weight a week. Faster than that usually costs strength and muscle. A daily deficit of 300–500 kcal gets most people there.' },
    { title: 'Walk more', text: '8–10k steps a day and easy cardio away from leg days add to the deficit without eating into recovery.' },
    { title: 'Sleep 7–9 hours', text: 'Short sleep during a diet shifts weight loss away from fat and towards muscle.' },
  ];

  const splitsFor = (days) => SPLITS.filter((s) => s.days === days);
  const recommended = (days) => SPLITS.find((s) => s.days === days && s.rec);

  function weekdaysFor(plan) {
    const w = Array.from(new Set((plan.weekdays || []).filter((x) => x >= 0 && x <= 6))).sort((a, b) => a - b);
    return w.length === plan.days ? w : DEFAULT_WEEKDAYS[plan.days].slice();
  }

  function repsFor(role, ex) {
    if ((role === 'iso' || role === 'core') && HIGH_REP.includes(ex.muscle)) return '12–20';
    return ROLES[role].reps;
  }

  /** Human dose string, e.g. "3 × 8–12 per leg" or "20–40 min" */
  function dose(slot) {
    const ex = slot.ex;
    if (slot.role === 'cardio' || ex.type === 'cardio') return ex.dose || ROLES.cardio.reps;
    return `${slot.sets} × ${ex.dose || slot.reps}${ex.side ? ' ' + ex.side : ''}`;
  }

  function slotMinutes(slot) {
    if (slot.role === 'cardio' || slot.ex.type === 'cardio') return ROLES.cardio.min;
    return slot.sets * ROLES[slot.role].min;
  }

  /** Build the week: split, days with ordered slots, trimmed slots and estimated minutes */
  function build(plan) {
    const days = Math.min(7, Math.max(1, plan.days || 4));
    const split = SPLITS.find((s) => s.id === plan.splitId && s.days === days) || recommended(days);
    const weekdays = weekdaysFor({ days, weekdays: plan.weekdays });
    const budget = plan.session || 60;
    const overrides = plan.overrides || {};

    const baseCount = {};
    split.templates.forEach((t) => { baseCount[TEMPLATES[t].base] = (baseCount[TEMPLATES[t].base] || 0) + 1; });
    const seenBase = {};
    const occurrences = {};

    const out = split.templates.map((tid, di) => {
      const t = TEMPLATES[tid];
      let name = t.base;
      if (baseCount[t.base] > 1) {
        seenBase[t.base] = seenBase[t.base] || 0;
        name += ' ' + LETTERS[seenBase[t.base]++];
      }

      const slots = t.slots.map((s, si) => {
        const pool = POOLS[s.p];
        const occ = occurrences[s.p] || 0;
        occurrences[s.p] = occ + 1;
        const key = `${split.id}:${di}:${si}`;
        const ov = overrides[key];
        const exId = ov && R.exById[ov] ? ov : pool[occ % pool.length];
        const ex = R.exById[exId];
        const slot = {
          key, pattern: s.p, role: s.role, pr: s.pr, ex, pool,
          sets: ROLES[s.role].sets + (split.extraSet && s.pr === 1 && s.role !== 'cardio' ? 1 : 0),
          reps: repsFor(s.role, ex),
          rest: ROLES[s.role].rest, effort: ROLES[s.role].effort,
          overridden: !!(ov && R.exById[ov]), extra: false, index: si,
        };
        slot.minutes = slotMinutes(slot);
        return slot;
      });

      // Fit to the session length: priority 1 always, then by priority while time allows
      const order = slots.slice().sort((a, b) => a.pr - b.pr || a.index - b.index);
      let used = WARMUP_MIN;
      const keep = new Set();
      order.forEach((s) => {
        if (s.pr === 1 || used + s.minutes <= budget) { keep.add(s); used += s.minutes; }
      });

      // Time left over: one extra set per lifting exercise, most important first
      order.forEach((s) => {
        if (!keep.has(s) || s.role === 'cardio' || s.role === 'core' || s.ex.type === 'cardio' || s.sets >= 4) return;
        const per = ROLES[s.role].min;
        if (used + per <= budget) { s.sets += 1; s.minutes += per; s.extra = true; used += per; }
      });

      return {
        idx: di, tid, name, base: t.base, focus: t.focus, weekday: weekdays[di],
        slots: slots.filter((s) => keep.has(s)),
        trimmed: slots.filter((s) => !keep.has(s)),
        minutes: Math.round(used / 5) * 5,
      };
    });

    return { split, days: out, weekdays, budget };
  }

  /** Programme day scheduled on a weekday (0 = Monday), or null for rest days */
  function forWeekday(plan, wdIdx, built) {
    const b = built || build(plan);
    return b.days.find((d) => d.weekday === wdIdx) || null;
  }

  const VOLUME_MUSCLES = ['chest', 'lats', 'upperback', 'frontdelts', 'sidedelts', 'reardelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];

  /** Weekly hard sets per muscle (secondary muscles count half) and days trained */
  function volume(built) {
    const vol = {};
    const freq = {};
    built.days.forEach((d) => {
      const today = {};
      d.slots.forEach((s) => {
        if (s.ex.type === 'cardio') return;
        today[s.ex.muscle] = (today[s.ex.muscle] || 0) + s.sets;
        s.ex.sec.forEach((m) => { today[m] = (today[m] || 0) + s.sets * 0.5; });
      });
      Object.keys(today).forEach((m) => {
        vol[m] = (vol[m] || 0) + today[m];
        if (today[m] >= 3) freq[m] = (freq[m] || 0) + 1;
      });
    });
    return VOLUME_MUSCLES.map((m) => ({ id: m, name: R.muscleName(m), sets: vol[m] || 0, days: freq[m] || 0 }));
  }

  R.ROLES = ROLES;
  R.POOLS = POOLS;
  R.TEMPLATES = TEMPLATES;
  R.SPLITS = SPLITS;
  R.DEFAULT_WEEKDAYS = DEFAULT_WEEKDAYS;
  R.GUIDELINES = GUIDELINES;
  R.program = { build, forWeekday, volume, dose, splitsFor, recommended, weekdaysFor, WARMUP_MIN };
})(window.R);
