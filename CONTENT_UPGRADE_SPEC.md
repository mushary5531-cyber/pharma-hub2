# Pharma Memory Hub — Content Upgrade Spec (for Claude Code)

> **Audience:** Claude Code, with write access to the `pharma-site` repo.
> **Author of spec:** content was verified against the original lecture PDFs in `PHARMA SLIDES/` (MID1, MID2, FINAL). Those slides are the single source of truth for all medical content. Do **not** invent facts not present in the slides; where this spec lists a drug/fact, it was taken from the corresponding slide deck.
> **Goal:** Turn the site from a "nice review tool" into a *complete replacement* for the lectures that lets the student guarantee full marks: (1) close every content gap vs. the slides, (2) add high-yield exam-oriented structures, (3) add real study mechanics (spaced repetition, progress, mock exam), (4) integrate the community mnemonics in `MONOMIMCS/`.

---

## 0. Repo facts already verified (don't re-investigate)

- Runtime data lives in `data/{mid1,mid2,final}/<slug>.json`. The app fetches `data/${exam}/${slug}.json` (`lecture.js:16`) and `data/index.json` (`app.js:10`).
- **There is a stale duplicate of every JSON at the repo root** (`pharma-site/*.json`). These are NOT used by the app and differ from the live `data/` copies. **Action:** delete the root-level `*.json` duplicates (keep `index.json`? no — the live one is `data/index.json`). Remove `index.html.html` (accidental duplicate) too. Keep only one canonical copy of each lecture under `data/`.
- Current per-lecture JSON schema: `id, slug, title, exam, topics, summary, key_drugs[], mnemonics[], flashcards[], mcqs[]`.
- 27 lectures total (9 / 9 / 9). All currently have ~16–20 flashcards and 5 MCQs each — **MCQ counts are too low for "full mark" prep**; target is raised below.
- Existing render modes in `lecture.js`: `mnemonics` (default), plus summary box, key-drugs table, flashcards, quiz. `quiz.js` shuffles and scores. `flashcards.js` flips cards.

---

## 1. Extended JSON schema (backwards-compatible)

Add the following **optional** fields to the per-lecture JSON. All renderers must treat them as optional (hide the section if absent), so partially-upgraded lectures keep working.

```jsonc
{
  // ... existing fields ...

  "high_yield": [                         // exam "must-know" bullets, the 10–15 facts that win marks
    { "point": "Aspirin irreversibly inhibits COX → effect lasts platelet lifetime (~7–10 days)",
      "tag": "mechanism" }                // tag ∈ mechanism|indication|adverse|contraindication|interaction|pk|classification
  ],

  "comparison_tables": [                  // side-by-side tables (the #1 exam format)
    {
      "title": "Competitive vs Non-competitive antagonism",
      "columns": ["Feature", "Competitive", "Non-competitive"],
      "rows": [
        ["Binding site", "Same as agonist", "Different (allosteric)"],
        ["Overcome by ↑agonist?", "Yes", "No"],
        ["Effect on Emax", "Unchanged", "Decreased"],
        ["Effect on EC50", "Increased", "Unchanged"]
      ]
    }
  ],

  "classification": {                     // drug-class tree for grouping-type questions
    "title": "Penicillins",
    "groups": [
      { "name": "Natural (narrow)", "drugs": ["Penicillin G (IV)", "Penicillin V (PO)"] },
      { "name": "Antistaphylococcal (β-lactamase resistant)", "drugs": ["Methicillin","Nafcillin","Oxacillin","Cloxacillin","Dicloxacillin","Flucloxacillin"] },
      { "name": "Aminopenicillins (extended)", "drugs": ["Ampicillin (IV)","Amoxicillin (PO)"] },
      { "name": "Antipseudomonal", "drugs": ["Carbenicillin","Ticarcillin","Piperacillin"] }
    ]
  },

  "key_drugs": [                          // EXTEND existing objects with optional fields:
    { "name": "Amphotericin B", "class": "Polyene", "note": "...",
      "moa": "Binds ergosterol → membrane pores → ion leakage → fungicidal",
      "uses": "DOC life-threatening systemic mycoses (cryptococcal meningitis)",
      "adverse": "Nephrotoxicity (dose-dependent), hypokalemia, infusion fever/rigors, anemia",
      "pk": "Slow IV infusion; t½ ~2 weeks; poor CNS penetration",
      "pearl": "Give normal saline before/after to reduce nephrotoxicity" }
  ],

  "flashcards": [ { "front": "...", "back": "...", "tag": "high-yield" } ],  // optional tag

  "mcqs": [ {
      "q": "...", "options": ["..."], "answer": 0, "explanation": "...",
      "difficulty": "easy|medium|hard",     // optional
      "source_topic": "Penicillins"          // optional, for mock-exam filtering
  } ]
}
```

**Renderer work in `lecture.js`:** add three new collapsible sections after the summary box and before flashcards, rendered only when present: **High-Yield** (badge-colored bullets grouped by `tag`), **Comparison Tables** (responsive `<table>` reusing the key-drugs table styling), and **Classification** (nested list / tree). Add `moa/uses/adverse/pk/pearl` as an expandable detail row under each key-drug table row (click to expand).

---

## 2. New study features (the "qualitative leap")

Implement these as new JS modules + minimal UI. Use **`localStorage`** for all persistence (no backend). Namespace keys as `phh:<feature>:<lectureId>`.

### 2.1 Spaced Repetition (SRS) for flashcards — highest priority
- Add a new file `assets/js/srs.js`. Implement a lightweight **SM-2 / Leitner hybrid**: each card stores `{ ease, interval, due, box }` in `localStorage` keyed by a stable card hash (hash of `front`).
- On the flashcard screen add review buttons: **Again / Hard / Good / Easy** (Anki-style). Update interval accordingly. "Again" → box 1 (due now); "Good" → next box; intervals e.g. `[10m, 1d, 3d, 7d, 16d, 35d]`.
- Add a **"Due today"** entry on the home page that aggregates due cards across *all* lectures into one review session. This is what turns the site into a daily-driver.

### 2.2 Progress tracking + dashboard
- Track per lecture: % flashcards "mature" (box ≥ 4), best quiz score, last-studied date, # MCQs attempted.
- On `index.html`, add a progress ring/bar per lecture card and an overall **exam-readiness %** per exam block (MID1 / MID2 / Final). Formula suggestion: `0.5*mature_cards% + 0.5*best_quiz%`, averaged across the exam's lectures.
- Add a small "weak topics" list: lectures whose readiness < 60%, surfaced at the top.

### 2.3 Mock / comprehensive exam mode
- New page `exam.html` + `assets/js/exam.js`. Let the student pick a scope (MID1 / MID2 / Final / All) and a count (e.g. 40 Q). Pull MCQs across all lectures in scope, shuffle, **timed** (e.g. 1 min/Q), no per-question feedback until the end, then show a scored report with per-lecture breakdown and a "review wrong answers" list that feeds those topics back into SRS.
- This requires raising MCQ counts (see §3).

### 2.4 High-Yield sheet (print/exam-eve view)
- New page `highyield.html` that concatenates every lecture's `high_yield[]` + `comparison_tables[]` into one scrollable, printable cram sheet, filterable by exam. Add `@media print` CSS.

### 2.5 Search & cross-links
- Extend the existing search (`app.js`) to also search inside `key_drugs`, `high_yield`, and flashcard text (currently title/topic only). Build a small client-side index from `index.json` + lazy-loaded lecture JSON.
- Add a global **drug index** page (`drugs.html`) listing every drug across all lectures with its class and a link to its lecture(s) — invaluable for "which lecture was X in" recall.

### 2.6 Quiz upgrades
- In `quiz.js`: after finishing, push wrong-answer topics into SRS/weak-topics. Add an "explain why others are wrong" toggle (use `explanation`). Support `difficulty` filter.

---

## 3. Per-lecture content gaps (verified against slides)

For **every** lecture, raise the floor to: **summary ≥ 120 words, key_drugs covering all drugs named on the slides, ≥ 25 flashcards, ≥ 12 MCQs (mix of difficulties), ≥ 3 mnemonics, plus `high_yield` and at least one `comparison_table` where the slides invite a comparison.** Below are the *specific* gaps found per lecture — these are additions, not the full target.

### MID 1
- **introduction-to-pharmacology** — solid. Add `high_yield` (pharmacology vs pharmacy vs therapeutics; sources of drugs; ADME one-liner). Add comparison: *Pharmacokinetics vs Pharmacodynamics*.
- **drug-dosage-forms** — add forms detail from slides (solid/liquid/semisolid/gaseous; sustained-release vs enteric-coated rationale). Comparison: *Enteric-coated vs Sustained-release*.
- **route-of-drug-administration** — add full route comparison table (onset, bioavailability, first-pass, use). Add: sublingual avoids first-pass; IV = 100% bioavailability/fastest; rectal partial first-pass bypass.
- **pharmacodynamics** — strong already. Add comparison tables: *Agonist vs Antagonist vs Partial vs Inverse agonist*; *Competitive vs Non-competitive antagonism*; *Potency vs Efficacy*. Add `high_yield` for TI = TD50/ED50, therapeutic window.
- **pharmacokinetics** — add named example drugs from slides (e.g. **Amoxicillin** as PK example), zero- vs first-order kinetics, clearance/half-life/Vd definitions, bioavailability. Comparison: *Zero-order vs First-order kinetics*. Add hepatic/renal disease effects on PK.
- **adr** — add ADR type classification (Type A augmented vs Type B bizarre, C/D/E), and slide examples (**thiazides** → metabolic effects). Comparison: *Type A vs Type B ADR*. Add `high_yield` on Rawlins–Thompson classification.
- **drug-drug-interactions** — **biggest MID1 gap.** Slides name many concrete pairs missing from JSON: **Cimetidine** (enzyme inhibitor), **Tetracyclines** + antacids/dairy (chelation), **Telithromycin**, **Tolbutamide**, **Ampicillin**, **Ganciclovir**, **Heparin**, **Imidazole**, oral **Contraceptive** failure with enzyme inducers. Add: enzyme **inducers** (rifampicin, phenytoin, carbamazepine, barbiturates, chronic alcohol) vs **inhibitors** (cimetidine, ketoconazole, erythromycin, grapefruit juice). Add comparison table *Enzyme Inducers vs Inhibitors* and a pharmacokinetic vs pharmacodynamic interaction split.
- **toxicology** — add antidotes table (paracetamol→N-acetylcysteine, opioids→naloxone, **benzodiazepine**→flumazenil, organophosphates→atropine+pralidoxime, iron→deferoxamine, methanol→fomepizole/ethanol). Add phases of toxicology. Comparison: *Toxicity vs Side effect vs ADR*.
- **iv-fluid-therapy** — add crystalloid vs colloid comparison; tonicity (hypo/iso/hypertonic) with examples (0.9% NaCl, D5W, Ringer's lactate); indications. Comparison table *Crystalloids vs Colloids*.

### MID 2
- **autocoids** — add histamine receptors (H1–H4) effects; H1 vs H2 blockers. Comparison *H1 vs H2 receptors*.
- **cholinergic-agonists** — add direct (bethanechol, pilocarpine, carbachol, methacholine) vs indirect (neostigmine, physostigmine, edrophonium, **pseudo/acetylcholinesterase** inhibitors); organophosphates. Comparison *Direct vs Indirect cholinomimetics*; *Neostigmine vs Physostigmine* (CNS penetration).
- **cholinergic-antagonists** — add **Atropine**, **Homatropine**, scopolamine, ipratropium, glycopyrrolate; anticholinesterase reversal. Note pseudocholinesterase. Comparison *Atropine vs Glycopyrrolate*; muscarinic blockade organ effects table.
- **adrenergic-agonists** — add **Cocaine** (reuptake inhibitor) and indirect agonists (amphetamine, tyramine, ephedrine), direct (NE, epi, isoproterenol, phenylephrine, dobutamine, salbutamol). Note **Atropine** interplay. Comparison *α1 vs α2 vs β1 vs β2 vs β3 effects*; *Direct vs Indirect vs Mixed sympathomimetics*.
- **adrenergic-receptors** — richest MID2 deck. Add full receptor–effector table (Gq/Gs/Gi, second messengers), **Mirtazapine** (α2 antagonist) example, organ responses. Comparison *Adrenergic receptor subtypes & signaling*.
- **nsaids** — **under-built (only 6 key_drugs).** Add aspirin (irreversible COX), ibuprofen, naproxen, diclofenac, indomethacin, ketorolac, **celecoxib** (COX-2 selective), paracetamol (weak peripheral). Add COX-1 vs COX-2 mechanism, GI/renal/CV adverse effects, Reye syndrome, aspirin antiplatelet. Comparison *COX-1 vs COX-2*; *Non-selective NSAID vs COX-2 selective vs Paracetamol*.
- **gout** — add acute (NSAIDs, **colchicine**, glucocorticoids) vs chronic (**allopurinol**, **febuxostat** = xanthine oxidase inhibitors; **probenecid** = uricosuric; **rasburicase**). Mechanism of colchicine (microtubule). Comparison *Acute vs Chronic gout therapy*; *Allopurinol vs Probenecid*. **Do not give uricosurics in acute attack** — high-yield.
- **eicosanoids** — add PG/TX/LT synthesis pathway (COX vs LOX), misoprostol, latanoprost, montelukast/zafirlukast, zileuton. Comparison *COX pathway vs LOX pathway*.
- **dmards** — add methotrexate (DHF reductase), hydroxychloroquine, sulfasalazine, leflunomide, biologics (TNF-α inhibitors: etanercept, infliximab, adalimumab; rituximab; tocilizumab). Comparison *csDMARDs vs bDMARDs*; MTX adverse/monitoring high-yield.

### FINAL (antimicrobials — largest content gaps)
- **cell-wall-inhibitors** — **major gaps.** Add the full penicillin classification (use the `classification` object in §1: natural, antistaphylococcal **Nafcillin/Oxacillin/Cloxacillin/Dicloxacillin/Flucloxacillin/Methicillin**, aminopenicillins **Ampicillin/Amoxicillin**, antipseudomonal **Carbenicillin/Ticarcillin/Piperacillin**), β-lactamase inhibitor combos (Augmentin, Unasyn, Zosyn, Timentin), cephalosporins by generation, carbapenems, monobactam (aztreonam), **Vancomycin**, **Daptomycin**, teicoplanin. MOA (PBP/transpeptidase inhibition → bactericidal), resistance (β-lactamase, altered PBP = MRSA/VRSA, porin, efflux). Comparison *Penicillin classes & spectrum*; *Cephalosporin generations*. High-yield: bactericidal, only on actively dividing cells, inactive vs fungi/virus/mycoplasma.
- **protein-synthesis-inhibitors** — add 30S (**aminoglycosides**: Streptomycin/Tobramycin/Amikacin/Gentamicin/Neomycin; **tetracyclines**) vs 50S (**Clindamycin, Chloramphenicol, Erythromycin/macrolides, Linezolid**). Aminoglycoside toxicities (nephro/oto/neuromuscular/teratogen), concentration-dependent killing. Comparison *30S vs 50S inhibitors*; *Bactericidal vs Bacteriostatic*. (Integrate the two community mnemonics — see §4.)
- **nucleic-acid-inhibitors** — add **fluoroquinolone generations** (see mnemonic §4), **Sulfonamides**/trimethoprim (folate synthesis: PABA→DHF→THF; sequential block), **Rifampicin** (RNA polymerase), **Metronidazole** (DNA damage in anaerobes), **Cimetidine** interaction note. Comparison *Sulfonamide vs Trimethoprim (folate pathway steps)*; *Quinolone generations & spectrum*.
- **antifungal** — add **Amphotericin B** (full profile per slides), **Flucytosine**, azoles (**ketoconazole, fluconazole, itraconazole, voriconazole, posaconazole** — ergosterol synthesis via 14-α-demethylase), echinocandins (**caspofungin, micafungin, anidulafungin** — β-glucan synthesis), **Nystatin** (topical polyene), **Terbinafine** (squalene epoxidase), **Griseofulvin** (microtubule). Comparison *Polyenes vs Azoles vs Echinocandins (target)*. High-yield: ampho B nephrotoxicity prophylaxis with saline.
- **antiparasitic** — add antimalarials (chloroquine, mefloquine, primaquine, artemisinins, quinine), antiprotozoals (metronidazole, pentavalent antimonials for leishmania), anthelmintics (albendazole/mebendazole, praziquantel, ivermectin). Comparison *Tissue vs Blood schizonticides*.
- **antiviral** — **major gaps.** Add by class: anti-influenza neuraminidase inhibitors (**oseltamivir, zanamivir**), uncoating inhibitors (**amantadine, rimantadine**), **ribavirin** (guanosine analogue), anti-herpes (**acyclovir, valacyclovir, ganciclovir, foscarnet**), anti-hepatitis (interferon, **lamivudine, adefovir, entecavir, tenofovir**), anti-HIV classes (NRTI **zidovudine**, NNRTI, protease inhibitors, **integrase** inhibitors). MOA + key adverse (acyclovir nephrotoxicity, zidovudine anemia, amantadine CNS). Comparison *Acyclovir vs Ganciclovir*; *Neuraminidase inhibitors vs Uncoating inhibitors*. High-yield: oseltamivir effective ≤48h, prodrug, oral.
- **anticancer-1** — **only 5 key_drugs.** Add alkylating agents (cyclophosphamide, busulfan, nitrosoureas, cisplatin/carboplatin/oxaliplatin), antimetabolites (methotrexate, 5-FU, cytarabine, 6-MP). Cell-cycle specific vs non-specific. Integrate **Chemo Man** mnemonic (§4). Comparison *Cell-cycle specific vs non-specific*.
- **anticancer-2** — add antitumor antibiotics (doxorubicin/daunorubicin, bleomycin, dactinomycin), vinca alkaloids (vincristine, vinblastine), taxanes (paclitaxel, docetaxel), topoisomerase inhibitors, hormonal (tamoxifen), **carboplatin**. Toxicity table (Chemo Man). Comparison *Drug → signature toxicity* (doxorubicin=cardiotoxic, bleomycin=pulmonary fibrosis, cisplatin=nephro/ototoxic, vincristine=neuropathy, cyclophosphamide=hemorrhagic cystitis).
- **hepatitis-c** — slide is short; ensure DAAs/interferon+ribavirin combo is covered; cross-link to antiviral lecture.

> When filling these, also raise each lecture's **MCQs to ≥12** (currently 5) and **flashcards to ≥25**, sourcing every fact from that lecture's PDF.

---

## 4. Community mnemonics to integrate (`MONOMIMCS/`)

Add these as `mnemonics[]` objects in the named lectures. Keep the existing Arabic mnemonics; these are additive. For the two image mnemonics (Chemo Man), recreate as text + optionally store the image under `assets/img/` and reference it.

**→ `final/protein-synthesis-inhibitors.json`** (add 3):
```json
{ "type": "acronym", "title": "مواقع التثبيط: Buy AT 30s, CCEL at 50s",
  "body": "30S: Aminoglycosides + Tetracyclines (AT). 50S: Clindamycin, Chloramphenicol, Erythromycin, Linezolid (CCEL).",
  "covers": ["30S inhibitors","50S inhibitors","Aminoglycosides","Tetracyclines","Macrolides","Linezolid"] }
```
```json
{ "type": "acronym", "title": "Aminoglycosides: STAG-N + Mean GNATS caNNOT kill anaerobes",
  "body": "الأدوية: Streptomycin, Tobramycin, Amikacin, Gentamicin, Neomycin. لا تقتل اللاهوائيات (تحتاج O2 للدخول). السُّميّة (NNOT): Nephrotoxicity, Neuromuscular blockade, Ototoxicity, Teratogen.",
  "covers": ["Streptomycin","Tobramycin","Amikacin","Gentamicin","Neomycin","Nephrotoxicity","Ototoxicity","Neuromuscular blockade","Teratogenicity","Anaerobes"] }
```
```json
{ "type": "story", "title": "المضادات المعتمدة على الزمن: Time kills the Pretty Cool Microbes, Like Crazy",
  "body": "Time-dependent killing: Penicillins, Cephalosporins, Macrolides (Pretty Cool Microbes) + Clindamycin, Linezolid (Like Crazy). يقابلها concentration-dependent مثل الأمينوغليكوزيدات والكوينولونات.",
  "covers": ["Time-dependent killing","Penicillins","Cephalosporins","Macrolides","Clindamycin","Linezolid"] }
```

**→ `final/nucleic-acid-inhibitors.json`** (Quinolone generations — Arabic QUEEN/flexing story, verbatim from the student's notes):
```json
{ "type": "story", "title": "أجيال الكوينولونات: QUEEN تتفاخر (flexing → -floxacin)",
  "body": "كل الأدوية تنتهي بـ -floxacin (flexing = الكوينز يتفاخرون). الجيل 2: ملكة اسمها نور (Norfloxacin)، صبورة (Ciprofloxacin)، وهي OP (Ofloxacin + Pefloxacin). الجيل 3: تحب love (Levofloxacin)، قطوتها (Gatifloxacin)، تأكل صبار (Sparfloxacin). الجيل 4: تُدلَّع تروفة (Trovafloxacin)، وهي الـ maximum (Moxifloxacin).",
  "covers": ["Norfloxacin","Ciprofloxacin","Ofloxacin","Pefloxacin","Levofloxacin","Gatifloxacin","Sparfloxacin","Trovafloxacin","Moxifloxacin","Quinolone generations"] }
```

**→ `final/cell-wall-inhibitors.json`** (antipseudomonal CAMPFIRE):
```json
{ "type": "acronym", "title": "ضد Pseudomonas: CAMPFIRE",
  "body": "Carbapenems, Aminoglycosides, Monobactams, Polymyxins, Fluoroquinolones, thIRd & fourth gen cephalosporins, Extended-spectrum penicillins.",
  "covers": ["Carbapenems","Aminoglycosides","Monobactams","Polymyxins","Fluoroquinolones","3rd/4th gen cephalosporins","Antipseudomonal penicillins","Pseudomonas aeruginosa"] }
```

**→ `anticancer-1.json` and `anticancer-2.json`** (Chemo Man — split the toxicities; put the core set in both or reference):
```json
{ "type": "visual", "title": "Chemo Man — سُميّات العلاج الكيميائي",
  "body": "خريطة الجسم: الرأس/الأعصاب N = Nitrosoureas (عصبي، يعبر BBB). العيون/الأذن C = Cisplatin/Carboplatin (نيفرو/أوتو). القلب D = Doxorubicin/Daunorubicin (سُمّية قلبية). الصدر B = Bleomycin/Busulfan (تليف رئوي). البطن MF = Methotrexate + 5-FU (كبت نقي العظم). المثانة P = cycloPhosphamide (التهاب مثانة نزفي → اعطِ Mesna). الأطراف V = Vinca alkaloids (اعتلال أعصاب طرفي). Tamoxifen → تغيّر حدّة الإبصار.",
  "covers": ["Doxorubicin cardiotoxicity","Bleomycin pulmonary fibrosis","Cisplatin nephrotoxicity","Cyclophosphamide hemorrhagic cystitis","Vincristine neuropathy","Methotrexate","5-Fluorouracil","Nitrosoureas","Tamoxifen"] }
```

**Cross-cutting mnemonics** — these don't map to a single lecture. Create a small new lecture-like card OR add to the most relevant deck and surface on the High-Yield page:
- **Pregnancy-unsafe antibiotics — "SAFE Moms Take Really Good Care":** Sulfonamides (kernicterus), Aminoglycosides (ototoxicity), Fluoroquinolones (cartilage), Erythromycin estolate (cholestatic hepatitis), Metronidazole (mutagenesis), Tetracyclines (teeth/bone), Ribavirin (teratogen), Griseofulvin (malformations), Chloramphenicol (grey baby syndrome). → add to `cell-wall-inhibitors` or a new "Antibiotics — High Yield Cross-Cutting" entry, and to the High-Yield page.
- **Renal-safe antibiotics — "DANCER":** Doxycycline, Azithromycin, Nafcillin (monitor), Ceftriaxone/Cefoperazone, Erythromycin, Rifampicin.

---

## 5. Global content-quality rules (apply during the rewrite)

1. **Slides are the source of truth.** Every key drug, MOA, adverse effect, and number must be traceable to that lecture's PDF. Don't add facts only because they're "textbook-true" if the lecture didn't cover them — the exam follows the slides.
2. **Bilingual style:** keep explanations in Arabic (matching current voice) but keep all drug names, enzymes, and technical terms in English exactly as on the slides.
3. **MCQ quality:** plausible distractors, one correct answer, every option's right/wrong rationale in `explanation`. Mix `difficulty`. Include at least a few "classification" and "compare" style stems (the exam's favorites).
4. **Flashcards:** prefer active-recall phrasing ("Mechanism of X?", "Signature toxicity of Y?", "Which class does Z belong to?"). Tag the killer facts `"tag":"high-yield"`.
5. **Validate JSON:** run `python -m json.tool` on every edited file; the app silently fails to load a lecture if JSON is malformed.
6. Keep `data/index.json` in sync (titles/slugs/topics) and update topic tags to reflect new content.

---

## 6. Suggested execution order

1. Cleanup: delete root `*.json` duplicates + `index.html.html`; confirm app still loads from `data/`.
2. Schema + renderers (§1): add high_yield / comparison_tables / classification rendering and extended key-drug detail rows.
3. Content pass per lecture (§3 + §4), Final antimicrobials first (largest gaps), then MID2, then MID1. Validate JSON after each.
4. Features (§2): SRS → progress dashboard → drug index/search → mock exam → high-yield/print page.
5. Verify (§7).

## 7. Acceptance criteria / verification checklist

- [ ] No stale duplicate JSON at repo root; every lecture loads from `data/`.
- [ ] Each lecture: summary ≥120 words, key_drugs cover all slide-named drugs, ≥25 flashcards, ≥12 MCQs, ≥3 mnemonics, ≥1 comparison table.
- [ ] All 9 community mnemonics integrated in the correct lectures (§4).
- [ ] New sections render only when data present; old lectures don't break.
- [ ] SRS persists across reload; "Due today" aggregates across lectures.
- [ ] Progress dashboard shows per-exam readiness; mock exam pulls cross-lecture MCQs and scores by lecture.
- [ ] High-Yield page prints cleanly; drug index links to lectures.
- [ ] Every edited JSON passes `python -m json.tool`.
- [ ] Spot-check 5 random new facts against the matching PDF in `PHARMA SLIDES/`.
```
