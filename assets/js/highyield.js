// ===== High-Yield cram sheet (all lectures) =====
let hyData = [];
let hyScopes = new Set(['mid1', 'mid2', 'final']);

async function hyLoad() {
  let lectures = [];
  try { lectures = (await (await fetch('data/index.json')).json()).lectures; }
  catch { return; }
  hyData = await Promise.all(lectures.map(async l => {
    try {
      const d = await (await fetch(`data/${l.exam}/${l.slug}.json`)).json();
      return { id: l.id, exam: l.exam, title: l.title,
               high_yield: d.high_yield || [], comparison_tables: d.comparison_tables || [],
               classification: d.classification || null };
    } catch { return { id: l.id, exam: l.exam, title: l.title, high_yield: [], comparison_tables: [], classification: null }; }
  }));
  hyRender();
}

function hyRender() {
  const tagLabel = { mechanism:'آلية', indication:'استخدام', adverse:'آثار', contraindication:'موانع', interaction:'تداخل', pk:'حركية', classification:'تصنيف' };
  const wrap = document.getElementById('hyContent');
  const visible = hyData.filter(l => hyScopes.has(l.exam) &&
    (l.high_yield.length || l.comparison_tables.length || l.classification));
  if (visible.length === 0) { wrap.innerHTML = '<p style="text-align:center;color:var(--text3)">لا يوجد محتوى ضمن النطاق.</p>'; return; }
  wrap.innerHTML = visible.map(l => {
    const hy = l.high_yield.map(it => {
      const t = it.tag ? `<span class="hy-tag hy-${it.tag}">${tagLabel[it.tag] || it.tag}</span>` : '';
      return `<div class="hy-item">⭐ ${t}<span>${it.point}</span></div>`;
    }).join('');
    const cmp = l.comparison_tables.map(t => {
      const head = `<tr>${(t.columns||[]).map(c => `<th>${c}</th>`).join('')}</tr>`;
      const body = (t.rows||[]).map(r => `<tr>${r.map((c,i) => i===0 ? `<th class="cmp-rowhead">${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('');
      return `<div class="cmp-wrap"><h4>⚖️ ${t.title}</h4><table class="key-drugs-table cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    }).join('');
    return `<div class="summary-box hy-lecture">
      <h2><a href="lecture.html?id=${l.id}" class="hy-lec-link">${l.title}</a></h2>
      ${hy}${cmp}
    </div>`;
  }).join('');
}

document.querySelectorAll('[data-hy]').forEach(b => b.addEventListener('click', () => {
  const s = b.dataset.hy;
  b.classList.toggle('active');
  if (hyScopes.has(s)) hyScopes.delete(s); else hyScopes.add(s);
  if (hyScopes.size === 0) { hyScopes.add(s); b.classList.add('active'); }
  hyRender();
}));

hyLoad();
