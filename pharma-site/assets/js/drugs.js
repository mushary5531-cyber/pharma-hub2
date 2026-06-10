// ===== Global drug index =====
let drugRows = [];

async function drugsLoad() {
  let lectures = [];
  try { lectures = (await (await fetch('data/index.json')).json()).lectures; }
  catch { return; }
  const sets = await Promise.all(lectures.map(async l => {
    try {
      const d = await (await fetch(`data/${l.exam}/${l.slug}.json`)).json();
      return (d.key_drugs || []).map(k => ({
        name: k.name, cls: k.class || '—', lectureId: l.id, lectureTitle: l.title
      }));
    } catch { return []; }
  }));
  // merge duplicates (same drug in multiple lectures)
  const map = new Map();
  sets.flat().forEach(r => {
    const key = r.name.toLowerCase();
    if (!map.has(key)) map.set(key, { name: r.name, cls: r.cls, lectures: [] });
    map.get(key).lectures.push({ id: r.lectureId, title: r.lectureTitle });
  });
  drugRows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  document.getElementById('drugCount').textContent = `${drugRows.length} دواء عبر كل المحاضرات`;
  render('');
}

function render(q) {
  q = q.toLowerCase();
  const rows = drugRows.filter(r => !q || r.name.toLowerCase().includes(q) || r.cls.toLowerCase().includes(q));
  document.getElementById('drugBody').innerHTML = rows.map(r => {
    const links = r.lectures.map(l => `<a href="lecture.html?id=${l.id}" class="drug-lec-link">${l.title}</a>`).join('، ');
    return `<tr><td><strong>${r.name}</strong></td><td>${r.cls}</td><td>${links}</td></tr>`;
  }).join('');
}

document.getElementById('drugSearch').addEventListener('input', e => render(e.target.value.trim()));

drugsLoad();
