// ===== LECTURE PAGE =====

let lectureData = null;
let currentMode = 'mnemonics';

async function loadLecture() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { location.href = 'index.html'; return; }

  // Determine exam folder from id prefix
  const exam = id.split('-')[0]; // mid1, mid2, final
  const slug = id.split('-').slice(2).join('-');

  try {
    const res = await fetch(`data/${exam}/${slug}.json`);
    if (!res.ok) throw new Error('not found');
    lectureData = await res.json();
    renderLecture();
  } catch (e) {
    console.error(e);
    document.getElementById('loadingState').innerHTML =
      '<p style="color:var(--red);text-align:center;padding:60px">تعذّر تحميل المحاضرة.</p>';
  }
}

function renderLecture() {
  document.title = `${lectureData.title} | Pharma Memory Hub`;

  // Header
  document.getElementById('lectureTitle').textContent = lectureData.title;
  const exam = lectureData.exam;
  const badgeClass = exam === 'mid1' ? 'badge-mid1' : exam === 'mid2' ? 'badge-mid2' : 'badge-final';
  const examLabel = exam === 'mid1' ? 'MID 1' : exam === 'mid2' ? 'MID 2' : 'Final';
  const topics = (lectureData.topics || []).slice(0, 4).map(t =>
    `<span class="topic-tag">${t}</span>`).join('');
  document.getElementById('lectureMeta').innerHTML =
    `<span class="exam-badge ${badgeClass}">${examLabel}</span>${topics}`;

  // Summary
  if (lectureData.summary) {
    document.getElementById('summaryText').textContent = lectureData.summary;
  } else {
    document.getElementById('summaryBox').style.display = 'none';
  }

  // Key drugs table (with optional expandable detail row)
  const drugs = lectureData.key_drugs || [];
  if (drugs.length > 0) {
    const tbody = document.getElementById('keyDrugsBody');
    tbody.innerHTML = drugs.map((d, i) => {
      const det = buildDrugDetail(d);
      const expandable = det ? ' class="kd-row" onclick="toggleDrug(' + i + ')" style="cursor:pointer"' : '';
      const caret = det ? '<span class="kd-caret" id="kd-caret-' + i + '">▾</span> ' : '';
      const detailRow = det
        ? `<tr class="kd-detail" id="kd-detail-${i}" style="display:none"><td colspan="3">${det}</td></tr>`
        : '';
      return `<tr${expandable}><td>${caret}${d.name}</td><td>${d.class || '—'}</td><td>${d.note || '—'}</td></tr>${detailRow}`;
    }).join('');
  } else {
    document.getElementById('keyDrugsBox').style.display = 'none';
  }

  // High-Yield
  renderHighYield(lectureData.high_yield || []);
  // Classification
  renderClassification(lectureData.classification);
  // Comparison tables
  renderComparisons(lectureData.comparison_tables || []);

  // Mnemonics
  const mnemonics = lectureData.mnemonics || [];
  const container = document.getElementById('mnemonicsContainer');
  if (mnemonics.length === 0) {
    document.getElementById('mnemonicsEmpty').style.display = 'block';
  } else {
    container.innerHTML = mnemonics.map(m => buildMnemonicCard(m)).join('');
  }

  // Flashcards
  initFlashcards(lectureData.flashcards || []);

  // Quiz
  initQuiz(lectureData.mcqs || []);

  // Show page
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('pageContent').style.display = 'block';
}

function buildMnemonicCard(m) {
  const typeClass = {
    acronym: 'type-acronym',
    story: 'type-story',
    visual: 'type-visual'
  }[m.type] || 'type-story';

  const typeLabel = {
    acronym: '🔤 اختصار',
    story: '📖 قصة',
    visual: '🎨 بصري'
  }[m.type] || '📖 قصة';

  const coversHtml = (m.covers || []).map(d =>
    `<span class="drug-tag">${d}</span>`).join('');

  const sourceHtml = m.source_ref
    ? `<div style="margin-top:10px;font-size:0.75rem;color:var(--text3)">📌 المصدر: ${m.source_ref}</div>`
    : '';

  return `
    <div class="mnemonic-card">
      <span class="mnemonic-type ${typeClass}">${typeLabel}</span>
      <h3>${m.title}</h3>
      <div class="body">${m.body}</div>
      ${coversHtml ? `<div class="covers">${coversHtml}</div>` : ''}
      ${sourceHtml}
    </div>
  `;
}

// ----- Extended key-drug detail -----
function buildDrugDetail(d) {
  const rows = [
    ['🎯 الآلية (MOA)', d.moa],
    ['✅ الاستخدامات', d.uses],
    ['⚠️ الآثار الجانبية', d.adverse],
    ['💊 الحركية (PK)', d.pk],
    ['💡 ملاحظة', d.pearl]
  ].filter(r => r[1]);
  if (rows.length === 0) return '';
  return '<div class="kd-detail-inner">' +
    rows.map(r => `<div class="kd-detail-line"><span class="kd-k">${r[0]}:</span> ${r[1]}</div>`).join('') +
    '</div>';
}
function toggleDrug(i) {
  const row = document.getElementById('kd-detail-' + i);
  const caret = document.getElementById('kd-caret-' + i);
  if (!row) return;
  const open = row.style.display === 'none';
  row.style.display = open ? 'table-row' : 'none';
  if (caret) caret.textContent = open ? '▴' : '▾';
}

// ----- High-Yield -----
function renderHighYield(items) {
  if (!items || items.length === 0) return;
  const tagLabel = { mechanism:'آلية', indication:'استخدام', adverse:'آثار', contraindication:'موانع', interaction:'تداخل', pk:'حركية', classification:'تصنيف' };
  document.getElementById('highYieldList').innerHTML = items.map(it => {
    const t = it.tag ? `<span class="hy-tag hy-${it.tag}">${tagLabel[it.tag] || it.tag}</span>` : '';
    return `<div class="hy-item">⭐ ${t}<span>${it.point}</span></div>`;
  }).join('');
  document.getElementById('highYieldBox').style.display = 'block';
}

// ----- Classification -----
function renderClassification(c) {
  if (!c || !c.groups) return;
  const html = `<div class="cls-title">${c.title || ''}</div>` +
    c.groups.map(g =>
      `<div class="cls-group"><div class="cls-name">${g.name}</div>` +
      `<div class="cls-drugs">${(g.drugs||[]).map(x => `<span class="drug-tag">${x}</span>`).join('')}</div></div>`
    ).join('');
  document.getElementById('classificationContent').innerHTML = html;
  document.getElementById('classificationBox').style.display = 'block';
}

// ----- Comparison tables -----
function renderComparisons(tables) {
  if (!tables || tables.length === 0) return;
  const box = document.getElementById('comparisonBox');
  box.innerHTML = tables.map(t => {
    const head = `<tr>${(t.columns||[]).map(c => `<th>${c}</th>`).join('')}</tr>`;
    const body = (t.rows||[]).map(r => `<tr>${r.map((c,i) => i===0 ? `<th class="cmp-rowhead">${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<div class="summary-box"><h2>⚖️ ${t.title}</h2>` +
      `<div class="cmp-wrap"><table class="key-drugs-table cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div></div>`;
  }).join('');
  box.style.display = 'block';
}

function switchMode(mode) {
  currentMode = mode;
  ['mnemonics', 'flashcards', 'quiz'].forEach(m => {
    document.getElementById(`mode-${m}`).style.display = m === mode ? 'block' : 'none';
    document.querySelector(`[data-mode="${m}"]`).classList.toggle('active', m === mode);
  });
}

// Start
loadLecture();
