/* Recomp: shared helpers. Loaded first; everything hangs off window.R. */
window.R = window.R || {};

(function (R) {
  'use strict';

  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const LOCALE = 'en-GB';

  const pad = (n) => String(n).padStart(2, '0');

  /** Date -> 'YYYY-MM-DD' in local time */
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /** 'YYYY-MM-DD' -> Date at local midnight */
  const parse = (k) => {
    const [y, m, d] = String(k).split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const isKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k)) && !isNaN(parse(k).getTime());

  const today = () => key(new Date());

  const addDays = (k, n) => {
    const d = parse(k);
    d.setDate(d.getDate() + n);
    return key(d);
  };

  /** Weekday index with Monday = 0 */
  const wd = (k) => (parse(k).getDay() + 6) % 7;

  const monday = (k) => addDays(k, -wd(k));

  /** Whole days from a to b (b - a), DST-safe */
  const dayNum = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

  /** Inclusive list of keys from a to b */
  const range = (a, b) => {
    const out = [];
    for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
    return out;
  };

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Locale number, '–' for missing */
  const n = (v, dig = 0) =>
    v == null || !isFinite(v)
      ? '–'
      : Number(v).toLocaleString(LOCALE, { minimumFractionDigits: dig, maximumFractionDigits: dig });

  /** Signed number with a real minus sign */
  const signed = (v, dig = 0) => {
    if (v == null || !isFinite(v)) return '–';
    const r = Number(Number(v).toFixed(dig));
    if (r === 0) return n(0, dig);
    return (r > 0 ? '+' : '\u2212') + n(Math.abs(r), dig);
  };

  const fmtDate = (k, opts) =>
    parse(k).toLocaleDateString(LOCALE, opts || { weekday: 'short', day: 'numeric', month: 'short' });

  /** Parse user input: accepts comma decimals, returns null for blank/invalid */
  const num = (v) => {
    if (v == null) return null;
    const s = String(v).trim().replace(',', '.');
    if (s === '') return null;
    const x = Number(s);
    return isFinite(x) ? x : null;
  };

  const mean = (arr) => {
    const a = arr.filter((x) => x != null && isFinite(x));
    return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  };

  const sum = (arr) => arr.reduce((s, x) => s + (x == null || !isFinite(x) ? 0 : Number(x)), 0);

  /** ['a','b','c'] -> 'a, b and c' */
  const list = (arr) =>
    arr.length <= 1 ? arr[0] || '' : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

  const plural = (count, word, many) => `${n(count)} ${count === 1 ? word : many || word + 's'}`;

  const uid = () => Math.random().toString(36).slice(2, 9);

  R.util = { WD, WD_LONG, pad, key, parse, isKey, today, addDays, wd, monday, dayNum, range, esc, n, signed, fmtDate, num, mean, sum, list, plural, uid };
  R.views = R.views || {};

  let toastTimer = null;
  R.toast = (msg) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };
})(window.R);
