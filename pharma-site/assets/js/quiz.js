// ===== QUIZ ENGINE =====

let quizQuestions = [];
let qCurrent = 0;
let qScore = 0;
let qAnswered = false;

function initQuiz(questions) {
  quizQuestions = questions || [];
  if (quizQuestions.length === 0) {
    document.getElementById('quizEmpty').style.display = 'block';
    document.getElementById('quizMain').style.display = 'none';
    return;
  }
  restartQuiz();
}

function restartQuiz() {
  quizQuestions = [...quizQuestions];
  shuffleArray(quizQuestions);
  qCurrent = 0;
  qScore = 0;
  qAnswered = false;

  document.getElementById('quizEmpty').style.display = 'none';
  document.getElementById('quizResult').classList.remove('show');
  document.getElementById('quizMain').style.display = '';
  showQuestion();
}

function showQuestion() {
  if (qCurrent >= quizQuestions.length) {
    showResult();
    return;
  }

  const q = quizQuestions[qCurrent];
  qAnswered = false;

  // Progress
  const pct = (qCurrent / quizQuestions.length) * 100;
  document.getElementById('qProgressFill').style.width = `${pct}%`;
  document.getElementById('qNum').textContent = `سؤال ${qCurrent + 1} من ${quizQuestions.length}`;
  document.getElementById('qText').textContent = q.q;

  // Options
  const optsEl = document.getElementById('qOptions');
  optsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(i, q.answer, btn);
    optsEl.appendChild(btn);
  });

  // Hide explanation + next
  const expEl = document.getElementById('qExplanation');
  expEl.classList.remove('show');
  expEl.innerHTML = '';
  document.getElementById('qNextBtn').classList.remove('show');
}

function selectAnswer(chosen, correct, btn) {
  if (qAnswered) return;
  qAnswered = true;

  const opts = document.querySelectorAll('.quiz-option');
  opts.forEach(o => o.disabled = true);

  if (chosen === correct) {
    btn.classList.add('correct');
    qScore++;
  } else {
    btn.classList.add('wrong');
    opts[correct].classList.add('correct');
  }

  // Explanation
  const q = quizQuestions[qCurrent];
  if (q.explanation) {
    const expEl = document.getElementById('qExplanation');
    expEl.innerHTML = `<strong>💡 التفسير:</strong> ${q.explanation}`;
    expEl.classList.add('show');
  }

  document.getElementById('qNextBtn').classList.add('show');
}

function nextQuestion() {
  qCurrent++;
  showQuestion();
}

function showResult() {
  document.getElementById('quizMain').style.display = 'none';
  const resultEl = document.getElementById('quizResult');
  resultEl.classList.add('show');
  document.getElementById('qProgressFill').style.width = '100%';

  const pct = Math.round((qScore / quizQuestions.length) * 100);
  document.getElementById('quizScore').textContent = `${pct}%`;

  let msg = '';
  if (pct >= 90) msg = '🏆 ممتاز! أنت تعرف هذه المحاضرة بشكل رائع.';
  else if (pct >= 70) msg = '✅ جيد جداً! راجع الأسئلة الي غلطت فيها.';
  else if (pct >= 50) msg = '📚 مقبول. ينفع تراجع المنمونيكس مرة ثانية.';
  else msg = '🔄 تحتاج مراجعة. ارجع للمنمونيكس والبطاقات أولاً.';

  document.getElementById('quizResultText').textContent =
    `${qScore} صح من ${quizQuestions.length} — ${msg}`;

  saveQuizProgress();
}

function saveQuizProgress() {
  const lectureId = new URLSearchParams(location.search).get('id');
  if (!lectureId) return;
  try {
    const raw = localStorage.getItem(`ph_${lectureId}`);
    const p = raw ? JSON.parse(raw) : { done: false, cards: 0, cardsKnown: 0, quizzesDone: 0 };
    p.quizzesDone = (p.quizzesDone || 0) + 1;
    const pct = Math.round((qScore / quizQuestions.length) * 100);
    if (pct >= 70) p.done = true;
    localStorage.setItem(`ph_${lectureId}`, JSON.stringify(p));
  } catch {}
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
