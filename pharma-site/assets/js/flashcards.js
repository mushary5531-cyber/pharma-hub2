// ===== FLASHCARDS ENGINE =====

let fcCards = [];
let fcQueue = [];
let fcCurrent = 0;
let fcFlipped = false;

function initFlashcards(cards) {
  fcCards = cards || [];
  restartFlashcards();
}

function restartFlashcards() {
  fcQueue = [...fcCards];
  shuffleArray(fcQueue);
  fcCurrent = 0;
  fcFlipped = false;
  document.getElementById('fcDone').style.display = 'none';
  document.getElementById('flashcard').style.display = '';
  document.getElementById('fcProgress').style.display = '';
  showCard();
}

function showCard() {
  if (fcCurrent >= fcQueue.length) {
    document.getElementById('fcDone').style.display = 'block';
    document.getElementById('flashcard').style.display = 'none';
    document.getElementById('fcControls').style.display = 'none';
    document.getElementById('fcProgress').style.display = 'none';
    return;
  }

  const card = fcQueue[fcCurrent];
  document.getElementById('fcFront').textContent = card.front;
  document.getElementById('fcBack').textContent = card.back;
  document.getElementById('fcProgress').textContent =
    `${fcCurrent + 1} / ${fcQueue.length}`;

  const fc = document.getElementById('flashcard');
  fc.classList.remove('flipped');
  fcFlipped = false;
  document.getElementById('fcControls').style.display = 'none';
}

function flipCard() {
  if (fcCurrent >= fcQueue.length) return;
  const fc = document.getElementById('flashcard');
  fcFlipped = !fcFlipped;
  fc.classList.toggle('flipped', fcFlipped);
  document.getElementById('fcControls').style.display = fcFlipped ? 'flex' : 'none';
}

function rateCard(rating) {
  const card = fcQueue[fcCurrent];
  // Record in spaced-repetition store
  const lectureId = new URLSearchParams(location.search).get('id');
  if (card && lectureId && typeof SRS !== 'undefined') {
    SRS.review(lectureId, card.front, rating);
  }
  if (rating === 'again') {
    // Move to end of this session (relearn now)
    const c = fcQueue.splice(fcCurrent, 1)[0];
    fcQueue.push(c);
    // don't increment fcCurrent
  } else {
    fcCurrent++;
    saveCardProgress(rating);
  }
  fcFlipped = false;
  showCard();
}

function saveCardProgress(rating) {
  const lectureId = new URLSearchParams(location.search).get('id');
  if (!lectureId) return;
  try {
    const raw = localStorage.getItem(`ph_${lectureId}`);
    const p = raw ? JSON.parse(raw) : { done: false, cards: 0, cardsKnown: 0, quizzesDone: 0 };
    p.cards = fcCards.length;
    if (rating === 'good' || rating === 'easy') p.cardsKnown = (p.cardsKnown || 0) + 1;
    localStorage.setItem(`ph_${lectureId}`, JSON.stringify(p));
  } catch {}
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Keyboard shortcuts (only when flashcards mode is active)
document.addEventListener('keydown', e => {
  if (typeof currentMode !== 'undefined' && currentMode !== 'flashcards') return;
  if (fcCurrent >= fcQueue.length) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
  else if (fcFlipped && ['1', '2', '3', '4'].includes(e.key)) {
    rateCard(['again', 'hard', 'good', 'easy'][parseInt(e.key) - 1]);
  }
});
