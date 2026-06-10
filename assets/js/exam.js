// ===== Mock / comprehensive exam engine =====
let scopes = new Set(['mid1', 'mid2', 'final']);
let qCount = 20;
let pool = [];        // all available {q,options,answer,explanation,lectureId,lectureTitle}
let examQs = [];
let exIdx = 0, exScore = 0, exAnswered = false;
let perLecture = {};  // lectureTitle -> {right,total}
let wrong = [];
let timerInt = null, startTime = 0;

async function loadPool() {
  let lectures = [];
  try { lectures = (await (await fetch('data/index.json')).json()).lectures; }
  catch { return; }
  const sets = await Promise.all(lectures.map(async l => {
    try {
      const d = await (await fetch(`data/${l.exam}/${l.slug}.json`)).json();
      return (d.mcqs || []).map(m => ({ ...m, exam: l.exam, lectureId: l.id, lectureTitle: l.title }));
    } catch { return []; }
  }));
  pool = sets.flat();
  updatePoolInfo();
}

function updatePoolInfo() {
  const n = pool.filter(q => scopes.has(q.exam)).length;
  document.getElementById('poolInfo').textContent = `متاح ${n} سؤال ضمن النطاق المختار.`;
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---- setup interactions ----
document.querySelectorAll('[data-scope]').forEach(b => b.addEventListener('click', () => {
  const s = b.dataset.scope;
  b.classList.toggle('active');
  if (scopes.has(s)) scopes.delete(s); else scopes.add(s);
  if (scopes.size === 0) { scopes.add(s); b.classList.add('active'); }
  updatePoolInfo();
}));
document.querySelectorAll('.count-chip').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.count-chip').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); qCount = parseInt(b.dataset.count);
}));

document.getElementById('startExamBtn').addEventListener('click', startExam);

function startExam() {
  examQs = shuffle(pool.filter(q => scopes.has(q.exam))).slice(0, qCount);
  if (examQs.length === 0) return;
  exIdx = 0; exScore = 0; perLecture = {}; wrong = [];
  document.getElementById('examSetup').style.display = 'none';
  document.getElementById('examRun').style.display = 'block';
  startTime = Date.now();
  timerInt = setInterval(tick, 1000);
  showEx();
}

function tick() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  document.getElementById('exTimer').textContent = `⏱️ ${m}:${String(s % 60).padStart(2, '0')}`;
}

function showEx() {
  if (exIdx >= examQs.length) return finishExam();
  exAnswered = false;
  const q = examQs[exIdx];
  document.getElementById('exNum').textContent = `سؤال ${exIdx + 1} / ${examQs.length}`;
  document.getElementById('exProgress').style.width = `${(exIdx / examQs.length) * 100}%`;
  document.getElementById('exQ').textContent = q.q;
  const opts = document.getElementById('exOptions');
  opts.innerHTML = '';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'quiz-option';
    b.textContent = o;
    b.onclick = () => pickEx(i, b);
    opts.appendChild(b);
  });
  document.getElementById('exNextBtn').style.display = 'none';
}

function pickEx(i, btn) {
  if (exAnswered) return;
  exAnswered = true;
  const q = examQs[exIdx];
  const correct = q.answer;
  const opts = document.getElementById('exOptions').children;
  Array.from(opts).forEach((b, idx) => {
    if (idx === correct) b.classList.add('correct');
    else if (idx === i) b.classList.add('wrong');
    b.disabled = true;
  });
  // record (no per-question feedback text shown until report, but color helps learning)
  perLecture[q.lectureTitle] = perLecture[q.lectureTitle] || { right: 0, total: 0 };
  perLecture[q.lectureTitle].total++;
  if (i === correct) { exScore++; perLecture[q.lectureTitle].right++; }
  else wrong.push({ ...q, picked: i });
  document.getElementById('exNextBtn').style.display = 'block';
}

document.getElementById('exNextBtn').addEventListener('click', () => { exIdx++; showEx(); });

function finishExam() {
  clearInterval(timerInt);
  document.getElementById('examRun').style.display = 'none';
  document.getElementById('examResult').style.display = 'block';
  const pct = Math.round((exScore / examQs.length) * 100);
  document.getElementById('exScore').textContent = `${exScore} / ${examQs.length} (${pct}%)`;
  document.getElementById('exVerdict').textContent =
    pct >= 85 ? 'ممتاز! جاهز للامتحان 🎯' : pct >= 70 ? 'جيد، راجع نقاط ضعفك.' : 'يحتاج مراجعة أكثر 💪';
  const tb = document.getElementById('exBreakdown');
  tb.innerHTML = Object.entries(perLecture).sort((a, b) => (a[1].right / a[1].total) - (b[1].right / b[1].total))
    .map(([t, v]) => {
      const p = Math.round((v.right / v.total) * 100);
      const color = p >= 70 ? 'var(--green)' : 'var(--red)';
      return `<tr><td>${t}</td><td>${v.right}/${v.total}</td><td style="color:${color};font-weight:700">${p}%</td></tr>`;
    }).join('');
  const rv = document.getElementById('exReview');
  if (wrong.length === 0) { document.getElementById('exReviewBox').style.display = 'none'; }
  else {
    rv.innerHTML = wrong.map(q => `
      <div class="ex-review-item">
        <div class="ex-rev-q">❓ ${q.q}</div>
        <div class="ex-rev-wrong">إجابتك: ${q.options[q.picked]}</div>
        <div class="ex-rev-right">✅ الصحيح: ${q.options[q.answer]}</div>
        <div class="ex-rev-exp">${q.explanation || ''}</div>
        <a class="ex-rev-link" href="lecture.html?id=${q.lectureId}">↗ ${q.lectureTitle}</a>
      </div>`).join('');
  }
}

// Keyboard: 1-4 select option, Enter = next
document.addEventListener('keydown', e => {
  if (document.getElementById('examRun').style.display === 'none') return;
  if (!exAnswered && ['1', '2', '3', '4'].includes(e.key)) {
    const opts = document.getElementById('exOptions').children;
    const i = parseInt(e.key) - 1;
    if (opts[i]) pickEx(i, opts[i]);
  } else if (exAnswered && e.key === 'Enter') {
    exIdx++; showEx();
  }
});

loadPool();

