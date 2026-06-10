// ===== Spaced Repetition (SM-2 / Leitner hybrid) =====
// Single store: localStorage["phh:srs"] = { [cardKey]: {box,ease,interval,due,reps} }
// cardKey = `${lectureId}|${hash(front)}`. Intervals in days; box 0 = due now.

const SRS = (() => {
  const KEY = 'phh:srs';
  const DAY = 86400000;
  const STEPS = [0, 1, 3, 7, 16, 35]; // days per box

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }

  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function keyFor(lectureId, front) { return `${lectureId}|${hash(front || '')}`; }

  function get(lectureId, front) {
    const s = load();
    return s[keyFor(lectureId, front)] || null;
  }

  // rating ∈ 'again' | 'hard' | 'good' | 'easy'
  function review(lectureId, front, rating) {
    const s = load();
    const k = keyFor(lectureId, front);
    const c = s[k] || { box: 0, ease: 2.5, interval: 0, due: 0, reps: 0 };
    if (rating === 'again') {
      c.box = 0; c.ease = Math.max(1.3, c.ease - 0.2);
    } else if (rating === 'hard') {
      c.box = Math.max(1, c.box); c.ease = Math.max(1.3, c.ease - 0.05);
    } else if (rating === 'good') {
      c.box = Math.min(STEPS.length - 1, c.box + 1);
    } else if (rating === 'easy') {
      c.box = Math.min(STEPS.length - 1, c.box + 2); c.ease += 0.1;
    }
    c.reps = (c.reps || 0) + 1;
    const baseDays = STEPS[c.box];
    c.interval = baseDays;
    // box 0 due in 10 minutes, otherwise days * ease scaling
    c.due = baseDays === 0 ? Date.now() + 10 * 60000
                           : Date.now() + Math.round(baseDays * (c.ease / 2.5)) * DAY;
    s[k] = c; save(s);
    return c;
  }

  function isDue(lectureId, front) {
    const c = get(lectureId, front);
    return !c || c.due <= Date.now();
  }
  function isMature(lectureId, front) {
    const c = get(lectureId, front);
    return !!c && c.box >= 4;
  }

  // Stats for one lecture given its card list
  function lectureStats(lectureId, cards) {
    let due = 0, mature = 0, seen = 0;
    (cards || []).forEach(c => {
      const st = get(lectureId, c.front);
      if (st) { seen++; if (st.box >= 4) mature++; }
      if (isDue(lectureId, c.front)) due++;
    });
    return { total: (cards || []).length, due, mature, seen };
  }

  return { keyFor, get, review, isDue, isMature, lectureStats };
})();

if (typeof window !== 'undefined') window.SRS = SRS;
