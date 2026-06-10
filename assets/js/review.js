// ===== Due-today cross-lecture review =====
let rvQueue = [];   // {front, back, lectureId, lectureTitle}
let rvIdx = 0;
let rvFlipped = false;

async function rvInit() {
  let lectures = [];
  try {
    const res = await fetch('data/index.json');
    lectures = (await res.json()).lectures;
  } catch { rvFinish(); return; }

  // Fetch every lecture's flashcards and collect due cards
  const all = await Promise.all(lectures.map(async l => {
    try {
      const r = await fetch(`data/${l.exam}/${l.slug}.json`);
      const d = await r.json();
      return (d.flashcards || []).map(c => ({
        front: c.front, back: c.back, lectureId: l.id, lectureTitle: l.title
      }));
    } catch { return []; }
  }));

  const flat = all.flat();
  // Cards already studied and now due (priority), plus a capped batch of new cards
  const NEW_LIMIT = 30;
  const seenDue = flat.filter(c => { const st = SRS.get(c.lectureId, c.front); return st && st.due <= Date.now(); });
  const fresh = flat.filter(c => !SRS.get(c.lectureId, c.front));
  shuffle(seenDue); shuffle(fresh);
  rvQueue = seenDue.concat(fresh.slice(0, NEW_LIMIT));

  const extra = fresh.length > NEW_LIMIT ? ` (+${fresh.length - NEW_LIMIT} جديدة لاحقاً)` : '';
  document.getElementById('dueMeta').textContent =
    `${rvQueue.length} بطاقة لهذه الجلسة: ${seenDue.length} مراجعة + ${Math.min(fresh.length, NEW_LIMIT)} جديدة${extra}`;

  if (rvQueue.length === 0) { rvFinish(); return; }
  rvIdx = 0;
  rvShow();
}

function rvShow() {
  if (rvIdx >= rvQueue.length) { rvFinish(); return; }
  const c = rvQueue[rvIdx];
  document.getElementById('rvFront').textContent = c.front;
  document.getElementById('rvBack').textContent = c.back;
  document.getElementById('rvSource').textContent = `📚 ${c.lectureTitle}`;
  document.getElementById('rvProgress').textContent = `${rvIdx + 1} / ${rvQueue.length}`;
  const fc = document.getElementById('flashcard');
  fc.classList.remove('flipped');
  rvFlipped = false;
  document.getElementById('rvControls').style.display = 'none';
}

function rvFlip() {
  if (rvIdx >= rvQueue.length) return;
  rvFlipped = !rvFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', rvFlipped);
  document.getElementById('rvControls').style.display = rvFlipped ? 'flex' : 'none';
}

function rvRate(rating) {
  const c = rvQueue[rvIdx];
  if (c) SRS.review(c.lectureId, c.front, rating);
  if (rating === 'again') {
    const card = rvQueue.splice(rvIdx, 1)[0];
    rvQueue.push(card);
  } else {
    rvIdx++;
  }
  rvFlipped = false;
  rvShow();
}

function rvFinish() {
  document.getElementById('reviewArea').style.display = 'none';
  document.getElementById('rvDone').style.display = 'block';
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (rvIdx >= rvQueue.length) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); rvFlip(); }
  else if (rvFlipped && ['1', '2', '3', '4'].includes(e.key)) {
    rvRate(['again', 'hard', 'good', 'easy'][parseInt(e.key) - 1]);
  }
});

rvInit();
