// Nappedia Brand Reviews & Scored Models Pipeline View (3rd Macro Tab: #reviews)
// Fast, sortable, filterable 591-brand + 13,648-model priority workspace
// Grounded in data/brand_reviews_tracker.js & data/reviews_models_scored.js
(function () {
  const rvState = {
    subtab: "brands",   // brands | models
    stage: "all",       // all | live | merged_deploying | shipping | built_qa | pending
    wave: "all",
    lane: "all",
    q: "",
    sortKey: "stageOrder",
    sortDir: "asc",
    limit: 100,
    // Models subtab state
    mBrand: "",
    mStatus: "all",     // all | A | D
    mQ: "",
    mSortKey: "a",      // a=Avg Priority, v=Volume, c=Comp/Win, p=Queen $, b=Brand, m=Model
    mSortDir: "desc",
    mLimit: 100,
  };

  const STAGE_META = {
    live:             { label: "Live on Nappedia",               short: "Live",             color: "#15803d", bg: "#dcfce7" },
    merged_deploying: { label: "Merged to Main (Deploying)",     short: "Deploying",        color: "#0369a1", bg: "#e0f2fe" },
    shipping:         { label: "Critic-Cleared (In GitLab CI)",  short: "Shipping",         color: "#1d4ed8", bg: "#dbeafe" },
    built_qa:         { label: "Critic-Cleared (Ready to Ship)", short: "Ready to Ship",    color: "#b45309", bg: "#fef3c7" },
    pending:          { label: "Pending Writer (Prepped)",       short: "Pending Writer",   color: "#475569", bg: "#f1f5f9" },
  };

  const COLS = [
    { key: "brand", label: "Brand", num: false, tip: "Mattress brand display name and its canonical URL slug on Nappedia.com." },
    { key: "stageOrder", label: "Stage", num: false, tip: "Current rollout stage: Live = deployed on Nappedia.com; Pending = queued wave." },
    { key: "wave", label: "Wave", num: true, tip: "Rollout batch number: Core 14 flagship baseline or W1–W35 factory waves." },
    { key: "models", label: "Models", num: true, tip: "Exact zero-duplicate canonical mattress models cataloged for this brand (Active + Discontinued). Click to inspect & sort all models for this brand." },
    { key: "avgModelVol", label: "Avg Vol", num: true, tip: "Average Search Volume Potential (1–10) across all canonical models for this brand (10 = highest search demand)." },
    { key: "avgModelComp", label: "Avg Comp", num: true, tip: "Average SERP Winnability / Competitiveness (1–10) across all models for this brand (10 = lowest competition / easiest to rank #1)." },
    { key: "avgModelScore", label: "Avg Score", num: true, tip: "Equal average of Avg Vol (1–10) and Avg Comp (1–10) across all models for this brand. Sort descending to see which brand has the highest-priority model lineup to target first." },
    { key: "words", label: "Words", num: true, tip: "Total rendered body word count of the compiled review page." },
    { key: "fk", label: "FK Grade", num: true, tip: "Flesch-Kincaid reading grade level of the prose (<= 8.0 target)." },
    { key: "critic", label: "Critic / QA", num: false, tip: "Independent first-principles critic score (/10)." },
  ];

  const MODEL_COLS = [
    { key: "m", label: "Model Name", num: false, tip: "Zero-duplicate canonical mattress model name." },
    { key: "b", label: "Brand", num: false, tip: "Parent mattress brand on Nappedia." },
    { key: "t", label: "Type", num: false, tip: "Mattress construction type (Hybrid, Memory Foam, Latex, Innerspring, etc.)." },
    { key: "ms", label: "Status", num: false, tip: "Active = currently sold; Discontinued = retired / historical model." },
    { key: "p", label: "Queen $", num: true, tip: "Verified Queen street/sale price in USD when published." },
    { key: "v", label: "Vol (1–10)", num: true, tip: "Total Search Volume Potential (1–10, where 10 = highest consumer search demand)." },
    { key: "c", label: "Comp (1–10)", num: true, tip: "SERP Competitiveness / Winnability (1–10, where 10 = lowest SERP competition / easiest to win #1)." },
    { key: "a", label: "Avg Score", num: true, tip: "Equal average of Vol (1–10) and Comp (1–10): (Vol + Comp) / 2. Sort descending to see the highest-opportunity models to target first." },
  ];

  const PAGE_COL_TIP = "Direct link to open the live brand review page on Nappedia.com.";

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function scoreColor(val) {
    if (val === null || val === undefined) return "var(--sub)";
    if (val >= 7.0) return "#15803d";
    if (val >= 5.5) return "#0066cc";
    return "#64748b";
  }

  let tooltipWired = false;
  function showColTooltip(anchor, title, text) {
    const tip = document.getElementById("rvColTooltip");
    if (!tip) return;
    tip.innerHTML = `<strong>${esc(title)}</strong>${esc(text)}`;
    tip.setAttribute("aria-hidden", "false");
    tip.classList.add("visible");
    const rect = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth || 260;
    const th = tip.offsetHeight || 64;
    let left = rect.left + rect.width / 2 - tw / 2;
    if (left < 10) left = 10;
    if (left + tw > window.innerWidth - 10) left = window.innerWidth - tw - 10;
    let top = rect.bottom + 8;
    if (top + th > window.innerHeight - 10) top = rect.top - th - 8;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  function hideColTooltip() {
    const tip = document.getElementById("rvColTooltip");
    if (!tip) return;
    tip.classList.remove("visible");
    tip.setAttribute("aria-hidden", "true");
  }

  function wireGlobalTooltipDismiss() {
    if (tooltipWired) return;
    tooltipWired = true;
    window.addEventListener("scroll", hideColTooltip, true);
    window.addEventListener("resize", hideColTooltip);
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".rv-help")) hideColTooltip();
    });
  }

  function wireHelpButtons(container) {
    container.querySelectorAll(".rv-help").forEach((btn) => {
      const open = () => showColTooltip(btn, btn.dataset.title, btn.dataset.tip);
      btn.addEventListener("mouseenter", open);
      btn.addEventListener("focus", open);
      btn.addEventListener("mouseleave", hideColTooltip);
      btn.addEventListener("blur", hideColTooltip);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        open();
      });
    });
  }

  function getFilteredSortedBrands(rows) {
    const q = rvState.q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (rvState.stage !== "all" && r.stage !== rvState.stage) return false;
      if (rvState.wave !== "all" && String(r.wave) !== rvState.wave) return false;
      if (rvState.lane !== "all" && r.sourceKind !== rvState.lane) return false;
      if (q) {
        const hay = `${r.brand} ${r.slug} ${r.waveLabel} ${r.stageLabel} ${r.mr} ${r.engine || "v3.1"} ${r.brandType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const k = rvState.sortKey;
    const dir = rvState.sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      let va = a[k], vb = b[k];
      if (va === null || va === undefined || va === "") va = rvState.sortDir === "asc" ? Infinity : -Infinity;
      if (vb === null || vb === undefined || vb === "") vb = rvState.sortDir === "asc" ? Infinity : -Infinity;
      if (typeof va === "number" && typeof vb === "number") {
        if (va !== vb) return (va - vb) * dir;
      } else {
        const cmp = String(va).localeCompare(String(vb));
        if (cmp !== 0) return cmp * dir;
      }
      if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
      return a.brand.localeCompare(b.brand);
    });
    return out;
  }

  function getFilteredSortedModels(models) {
    const q = rvState.mQ.trim().toLowerCase();
    const out = models.filter((m) => {
      if (rvState.mBrand && m.b !== rvState.mBrand) return false;
      if (rvState.mStatus !== "all" && m.ms !== rvState.mStatus) return false;
      if (q) {
        const hay = `${m.b} ${m.m} ${m.t}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const k = rvState.mSortKey;
    const dir = rvState.mSortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      let va = a[k], vb = b[k];
      if (va === null || va === undefined || va === "") va = rvState.mSortDir === "asc" ? Infinity : -Infinity;
      if (vb === null || vb === undefined || vb === "") vb = rvState.mSortDir === "asc" ? Infinity : -Infinity;
      if (typeof va === "number" && typeof vb === "number") {
        if (va !== vb) return (va - vb) * dir;
      } else {
        const cmp = String(va).localeCompare(String(vb));
        if (cmp !== 0) return cmp * dir;
      }
      if (b.a !== a.a) return b.a - a.a;
      if (b.v !== a.v) return b.v - a.v;
      return a.m.localeCompare(b.m);
    });
    return out;
  }

  function exportBrandsCsv(rows) {
    const headers = ["Brand", "Slug", "Stage", "Wave", "Models", "AvgModelVol", "AvgModelComp", "AvgModelScore", "Words", "FKGrade", "Critic", "URL"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([
        r.brand, r.slug, r.stageLabel, r.waveLabel, r.models || 0,
        r.avgModelVol ?? "", r.avgModelComp ?? "", r.avgModelScore ?? "",
        r.words || "", r.fk ?? "", r.critic, r.url,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nappedia-brand-reviews-scored-${rvState.stage}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function exportModelsCsv(models) {
    const headers = ["Brand", "Model", "Type", "Status", "QueenUSD", "VolScore_1_10", "CompWinScore_1_10", "AvgPriorityScore_1_10"];
    const lines = [headers.join(",")];
    for (const m of models) {
      lines.push([
        m.b, m.m, m.t, m.ms === "D" ? "Discontinued" : "Active", m.p ?? "", m.v, m.c, m.a,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nappedia-scored-models${rvState.mBrand ? "-" + rvState.mBrand.toLowerCase().replace(/[^a-z0-9]+/g, "-") : ""}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function renderBrandsTable(data) {
    const filtered = getFilteredSortedBrands(data.rows);
    const shown = filtered.slice(0, rvState.limit);

    const thead = document.getElementById("rvThead");
    const tbody = document.getElementById("rvTbody");
    const tfoot = document.getElementById("rvTfoot");
    const statLine = document.getElementById("rvStatLine");
    if (!thead || !tbody || !tfoot) return;

    const s = data.summary;
    const totalMods = (s.total_canonical_models || 0).toLocaleString();
    statLine.textContent = `Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} brands · ${totalMods} zero-dup canonical models scored (1–10 Vol, Comp & Avg) · Sort by Avg Score to prioritize outreach/builds`;

    thead.innerHTML = `<tr>${COLS.map((c) => {
      const sorted = rvState.sortKey === c.key;
      const arrow = sorted ? (rvState.sortDir === "asc" ? " &#9650;" : " &#9660;") : "";
      return `<th class="sortable${sorted ? " sorted" : ""}${c.num ? " num" : ""}" data-sort="${c.key}">` +
        `<span class="rv-th-inner"><span>${c.label}${arrow}</span>` +
        `<span class="rv-help" tabindex="0" role="button" data-title="${esc(c.label)}" data-tip="${esc(c.tip)}" aria-label="${esc(c.label)}: ${esc(c.tip)}">?</span>` +
        `</span></th>`;
    }).join("")}<th><span class="rv-th-inner"><span>Page</span><span class="rv-help" tabindex="0" role="button" data-title="Page" data-tip="${esc(PAGE_COL_TIP)}" aria-label="Page: ${esc(PAGE_COL_TIP)}">?</span></span></th></tr>`;

    thead.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", (e) => {
        if (e.target.closest(".rv-help")) return;
        const key = th.dataset.sort;
        if (rvState.sortKey === key) {
          rvState.sortDir = rvState.sortDir === "asc" ? "desc" : "asc";
        } else {
          rvState.sortKey = key;
          rvState.sortDir = key === "brand" || key === "stageOrder" || key === "wave" ? "asc" : "desc";
        }
        renderBrandsTable(data);
      });
    });
    wireHelpButtons(thead);

    if (!shown.length) {
      tbody.innerHTML = `<tr><td colspan="${COLS.length + 1}" style="text-align:center;padding:32px;color:var(--sub);">No brand reviews match the active filters.</td></tr>`;
    } else {
      const frag = [];
      for (const r of shown) {
        const sm = STAGE_META[r.stage] || STAGE_META.pending;
        const fkTxt = r.fk !== null && r.fk !== undefined ? r.fk.toFixed(2) : "—";
        const fkColor = r.fk !== null && r.fk <= 8.0 ? "#15803d" : (r.fk > 8.0 ? "#b45309" : "var(--sub)");
        const modCell = r.models > 0
          ? `<button class="rv-mod-jump" data-brand="${esc(r.brand)}" type="button" style="background:#eff6ff;color:#0066cc;border:none;border-radius:999px;padding:3px 9px;font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;">${r.models} &#8594;</button>`
          : `<span style="color:var(--sub);">0</span>`;
        const volTxt = r.avgModelVol !== null && r.avgModelVol !== undefined ? r.avgModelVol.toFixed(2) : "—";
        const compTxt = r.avgModelComp !== null && r.avgModelComp !== undefined ? r.avgModelComp.toFixed(2) : "—";
        const avgTxt = r.avgModelScore !== null && r.avgModelScore !== undefined ? r.avgModelScore.toFixed(2) : "—";
        const liveBtn = r.stage === "live"
          ? `<a class="rv-live-link" href="${esc(r.url)}" target="_blank" rel="noopener">Live &#8599;</a>`
          : `<a class="rv-live-link rv-live-muted" href="${esc(r.url)}" target="_blank" rel="noopener">URL &#8599;</a>`;
        frag.push(
          `<tr>` +
          `<td><strong>${esc(r.brand)}</strong><div class="rv-slug">${esc(r.slug)}</div></td>` +
          `<td><span class="rv-badge" style="background:${sm.bg};color:${sm.color};">${esc(sm.short)}</span></td>` +
          `<td class="num">${r.wave === 0 ? "Core 14" : "W" + r.wave}</td>` +
          `<td class="num">${modCell}</td>` +
          `<td class="num">${volTxt}</td>` +
          `<td class="num">${compTxt}</td>` +
          `<td class="num" style="font-weight:700;color:${scoreColor(r.avgModelScore)};">${avgTxt}</td>` +
          `<td class="num">${r.words ? r.words.toLocaleString() : "—"}</td>` +
          `<td class="num" style="color:${fkColor};font-weight:600;">${fkTxt}</td>` +
          `<td>${esc(r.critic)}</td>` +
          `<td>${liveBtn}</td>` +
          `</tr>`
        );
      }
      tbody.innerHTML = frag.join("");
      tbody.querySelectorAll(".rv-mod-jump").forEach((btn) => {
        btn.addEventListener("click", () => {
          rvState.subtab = "models";
          rvState.mBrand = btn.dataset.brand;
          rvState.mLimit = 100;
          switchSubtab(data);
        });
      });
    }

    const moreBtn = shown.length < filtered.length
      ? `<button class="load-btn" id="rvShowAllBtn" type="button">Show all ${filtered.length.toLocaleString()} rows</button>`
      : (filtered.length > 100 ? `<button class="load-btn" id="rvCollapseBtn" type="button">Show first 100</button>` : "");
    tfoot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} brand reviews (Total catalog: ${data.summary.total.toLocaleString()})</span><div style="display:flex;gap:8px;align-items:center;">${moreBtn}<button class="mini-btn" id="rvCsvBtn" type="button">Export CSV</button></div>`;

    const showAll = document.getElementById("rvShowAllBtn");
    if (showAll) showAll.addEventListener("click", () => { rvState.limit = filtered.length; renderBrandsTable(data); });
    const collapse = document.getElementById("rvCollapseBtn");
    if (collapse) collapse.addEventListener("click", () => { rvState.limit = 100; renderBrandsTable(data); });
    const csvBtn = document.getElementById("rvCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", () => exportBrandsCsv(filtered));
  }

  function renderModelsTable(data) {
    const mData = window.NAPPEDIA_REVIEWS_MODELS;
    const allModels = (mData && mData.models) || [];
    const filtered = getFilteredSortedModels(allModels);
    const shown = filtered.slice(0, rvState.mLimit);

    const thead = document.getElementById("rvModThead");
    const tbody = document.getElementById("rvModTbody");
    const tfoot = document.getElementById("rvModTfoot");
    const statLine = document.getElementById("rvModStatLine");
    const brandChip = document.getElementById("rvModBrandChip");
    if (!thead || !tbody || !tfoot) return;

    if (brandChip) {
      if (rvState.mBrand) {
        brandChip.style.display = "inline-flex";
        brandChip.innerHTML = `<span>Brand: <strong>${esc(rvState.mBrand)}</strong></span><button id="rvClearBrandBtn" type="button" style="background:none;border:none;color:#0066cc;font-weight:700;cursor:pointer;margin-left:6px;">&times;</button>`;
        const clr = document.getElementById("rvClearBrandBtn");
        if (clr) clr.addEventListener("click", () => { rvState.mBrand = ""; rvState.mLimit = 100; renderModelsTable(data); });
      } else {
        brandChip.style.display = "none";
      }
    }

    const avgAll = filtered.length
      ? (filtered.reduce((acc, x) => acc + x.a, 0) / filtered.length).toFixed(2)
      : "—";
    statLine.textContent = `Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} zero-dup canonical models (Mean Priority Avg: ${avgAll}/10 · 10 = Highest Vol & Easiest SERP)`;

    thead.innerHTML = `<tr>${MODEL_COLS.map((c) => {
      const sorted = rvState.mSortKey === c.key;
      const arrow = sorted ? (rvState.mSortDir === "asc" ? " &#9650;" : " &#9660;") : "";
      return `<th class="sortable${sorted ? " sorted" : ""}${c.num ? " num" : ""}" data-msort="${c.key}">` +
        `<span class="rv-th-inner"><span>${c.label}${arrow}</span>` +
        `<span class="rv-help" tabindex="0" role="button" data-title="${esc(c.label)}" data-tip="${esc(c.tip)}" aria-label="${esc(c.label)}: ${esc(c.tip)}">?</span>` +
        `</span></th>`;
    }).join("")}</tr>`;

    thead.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", (e) => {
        if (e.target.closest(".rv-help")) return;
        const key = th.dataset.msort;
        if (rvState.mSortKey === key) {
          rvState.mSortDir = rvState.mSortDir === "asc" ? "desc" : "asc";
        } else {
          rvState.mSortKey = key;
          rvState.mSortDir = key === "m" || key === "b" || key === "t" ? "asc" : "desc";
        }
        renderModelsTable(data);
      });
    });
    wireHelpButtons(thead);

    if (!shown.length) {
      tbody.innerHTML = `<tr><td colspan="${MODEL_COLS.length}" style="text-align:center;padding:32px;color:var(--sub);">No models match the active filters.</td></tr>`;
    } else {
      const frag = [];
      for (const m of shown) {
        const isDisc = m.ms === "D";
        const stBadge = isDisc
          ? `<span class="rv-badge" style="background:#f1f5f9;color:#475569;">Discontinued</span>`
          : `<span class="rv-badge" style="background:#dcfce7;color:#15803d;">Active</span>`;
        const priceTxt = m.p ? `$${Number(m.p).toLocaleString()}` : "—";
        frag.push(
          `<tr>` +
          `<td><strong>${esc(m.m)}</strong></td>` +
          `<td>${esc(m.b)}</td>` +
          `<td>${esc(m.t)}</td>` +
          `<td>${stBadge}</td>` +
          `<td class="num">${priceTxt}</td>` +
          `<td class="num" style="font-weight:600;">${m.v}</td>` +
          `<td class="num" style="font-weight:600;">${m.c}</td>` +
          `<td class="num" style="font-weight:700;color:${scoreColor(m.a)};">${Number(m.a).toFixed(1)}</td>` +
          `</tr>`
        );
      }
      tbody.innerHTML = frag.join("");
    }

    const moreBtn = shown.length < filtered.length
      ? `<button class="load-btn" id="rvModShowMoreBtn" type="button">Load +200 more (${filtered.length.toLocaleString()} total)</button>`
      : (filtered.length > 100 ? `<button class="load-btn" id="rvModCollapseBtn" type="button">Show first 100</button>` : "");
    tfoot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} scored models</span><div style="display:flex;gap:8px;align-items:center;">${moreBtn}<button class="mini-btn" id="rvModCsvBtn" type="button">Export CSV</button></div>`;

    const showMore = document.getElementById("rvModShowMoreBtn");
    if (showMore) showMore.addEventListener("click", () => { rvState.mLimit += 200; renderModelsTable(data); });
    const collapse = document.getElementById("rvModCollapseBtn");
    if (collapse) collapse.addEventListener("click", () => { rvState.mLimit = 100; renderModelsTable(data); });
    const csvBtn = document.getElementById("rvModCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", () => exportModelsCsv(filtered));
  }

  function switchSubtab(data) {
    const isBrands = rvState.subtab === "brands";
    const bp = document.getElementById("rvBrandsPanel");
    const mp = document.getElementById("rvModelsPanel");
    if (bp) bp.style.display = isBrands ? "" : "none";
    if (mp) mp.style.display = isBrands ? "none" : "";
    document.querySelectorAll("#rvSubtabs .rv-pill").forEach((b) => {
      b.classList.toggle("active", b.dataset.subtab === rvState.subtab);
    });
    if (isBrands) renderBrandsTable(data);
    else renderModelsTable(data);
  }

  let shellMounted = false;
  window.renderReviewsWorkspace = function () {
    const data = window.NAPPEDIA_BRAND_REVIEWS;
    const mData = window.NAPPEDIA_REVIEWS_MODELS;
    const root = document.getElementById("reviewsContent");
    if (!root || !data) return;

    wireGlobalTooltipDismiss();

    if (!shellMounted) {
      const s = data.summary;
      const totalMods = (mData && mData.totalModels) || s.total_canonical_models || 0;
      const pctWritten = ((s.written_total / s.total) * 100).toFixed(1);
      const pctLive = ((s.live / s.total) * 100).toFixed(1);

      const waveNums = [...new Set(data.rows.map((r) => r.wave))].sort((a, b) => a - b);
      const waveOptions = waveNums.map((w) => `<option value="${w}">${w === 0 ? "Core 14 (Live v2)" : "Wave " + w}</option>`).join("");

      const stageOrderKeys = ["live", "merged_deploying", "shipping", "built_qa", "pending"];
      const barSegments = stageOrderKeys.map((k) => {
        const pct = ((s[k] / s.total) * 100).toFixed(2);
        const sm = STAGE_META[k];
        return `<div class="rv-bar-seg" style="width:${pct}%;background:${sm.color};" title="${sm.label}: ${s[k]} (${pct}%)"></div>`;
      }).join("");

      const stagePills = [
        { k: "all", label: "All Stages", count: s.total },
        ...stageOrderKeys.map((k) => ({ k, label: STAGE_META[k].short, count: s[k], color: STAGE_META[k].color })),
      ].map((p) => {
        const dot = p.color ? `<span class="rv-dot" style="background:${p.color};"></span>` : "";
        return `<button class="rv-pill${rvState.stage === p.k ? " active" : ""}" data-stage="${p.k}" type="button">${dot}<span>${p.label}</span><span class="tab-count">${p.count}</span></button>`;
      }).join("");

      const updatedDate = new Date(data.generatedAt).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
      }) + " ET";

      root.innerHTML = `
        <div class="rv-kpi-grid">
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Brand Pages</div>
            <div class="rv-kpi-val">${s.total.toLocaleString()}</div>
            <div class="rv-kpi-sub">${s.live.toLocaleString()} live (${pctLive}%)</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Zero-Dup Models</div>
            <div class="rv-kpi-val" style="color:#0066cc;">${totalMods.toLocaleString()}</div>
            <div class="rv-kpi-sub">Across ${s.brands_with_models || 556}/${s.total} brands</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Scoring Model</div>
            <div class="rv-kpi-val" style="color:#15803d;">1–10 Avg</div>
            <div class="rv-kpi-sub">50% Vol + 50% SERP Win</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Engine Version</div>
            <div class="rv-kpi-val">${esc(data.engineVersion || "v3.1")}</div>
            <div class="rv-kpi-sub">${pctWritten}% written &amp; QA'd</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Pending / Next Wave</div>
            <div class="rv-kpi-val" style="color:#475569;">${s.pending.toLocaleString()}</div>
            <div class="rv-kpi-sub">${s.pending === 0 ? "0 remaining" : "Queued Wave A+B"}</div>
          </div>
        </div>

        <div class="rv-pills" id="rvSubtabs" style="margin-bottom:14px;">
          <button class="rv-pill active" data-subtab="brands" type="button"><span>Brand Reviews &amp; Avg Model Score</span><span class="tab-count">${s.total.toLocaleString()}</span></button>
          <button class="rv-pill" data-subtab="models" type="button"><span>Scored Models Catalog (1–10)</span><span class="tab-count">${totalMods.toLocaleString()}</span></button>
        </div>

        <section class="card rv-card" id="rvBrandsPanel">
          <div class="rv-pipe-head">
            <div>
              <h2 class="card-title">Brand Review Rollout &amp; Model Popularity Priority</h2>
              <div class="stat-line" id="rvStatLine"></div>
            </div>
            <div class="rv-updated">Snapshot: ${esc(updatedDate)}</div>
          </div>
          <div class="rv-bar-track" aria-label="Pipeline stage breakdown">${barSegments}</div>
          <div class="rv-pills" id="rvStagePills">${stagePills}</div>
          <div class="toolbar rv-toolbar">
            <input class="search-input" id="rvSearch" type="search" placeholder="Search ${s.total} brands by name, slug, wave, or stage..." aria-label="Search brand reviews">
            <select class="filter-select" id="rvWaveFilter" aria-label="Filter by wave">
              <option value="all">All Waves (Core + W1–W35)</option>
              ${waveOptions}
            </select>
            <select class="filter-select" id="rvLaneFilter" aria-label="Filter by lane">
              <option value="all">All Source Types</option>
              <option value="live_v2">Core v2 (14)</option>
              <option value="static_d9_upgrade">Static D9 Upgrade</option>
              <option value="nextjs_migration">Next.js Migration</option>
            </select>
          </div>
          <div class="b-table-wrap">
            <table class="b-table rv-table">
              <thead id="rvThead"></thead>
              <tbody id="rvTbody"></tbody>
            </table>
          </div>
          <div class="table-foot" id="rvTfoot"></div>
        </section>

        <section class="card rv-card" id="rvModelsPanel" style="display:none;">
          <div class="rv-pipe-head">
            <div>
              <h2 class="card-title">Scored Mattress Models Catalog (1–10 Volume, SERP Comp &amp; Avg)</h2>
              <div class="stat-line" id="rvModStatLine"></div>
            </div>
            <div id="rvModBrandChip" style="display:none;align-items:center;background:#eff6ff;color:#0066cc;border-radius:999px;padding:4px 12px;font-size:13px;"></div>
          </div>
          <div class="toolbar rv-toolbar">
            <input class="search-input" id="rvModSearch" type="search" placeholder="Search ${totalMods.toLocaleString()} models by model name, brand, or type..." aria-label="Search scored models">
            <select class="filter-select" id="rvModStatusFilter" aria-label="Filter model status">
              <option value="all">All Statuses (Active + Discontinued)</option>
              <option value="A">Active Models Only</option>
              <option value="D">Discontinued / Historical Only</option>
            </select>
          </div>
          <div class="b-table-wrap">
            <table class="b-table rv-table">
              <thead id="rvModThead"></thead>
              <tbody id="rvModTbody"></tbody>
            </table>
          </div>
          <div class="table-foot" id="rvModTfoot"></div>
        </section>
      `;

      document.querySelectorAll("#rvSubtabs .rv-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          rvState.subtab = btn.dataset.subtab;
          switchSubtab(data);
        });
      });

      document.querySelectorAll("#rvStagePills .rv-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          rvState.stage = btn.dataset.stage;
          rvState.limit = 100;
          document.querySelectorAll("#rvStagePills .rv-pill").forEach((b) => b.classList.toggle("active", b.dataset.stage === rvState.stage));
          renderBrandsTable(data);
        });
      });

      document.getElementById("rvSearch").addEventListener("input", (e) => {
        rvState.q = e.target.value;
        rvState.limit = 100;
        renderBrandsTable(data);
      });
      document.getElementById("rvWaveFilter").addEventListener("change", (e) => {
        rvState.wave = e.target.value;
        rvState.limit = 100;
        renderBrandsTable(data);
      });
      document.getElementById("rvLaneFilter").addEventListener("change", (e) => {
        rvState.lane = e.target.value;
        rvState.limit = 100;
        renderBrandsTable(data);
      });

      document.getElementById("rvModSearch").addEventListener("input", (e) => {
        rvState.mQ = e.target.value;
        rvState.mLimit = 100;
        renderModelsTable(data);
      });
      document.getElementById("rvModStatusFilter").addEventListener("change", (e) => {
        rvState.mStatus = e.target.value;
        rvState.mLimit = 100;
        renderModelsTable(data);
      });

      shellMounted = true;
    }

    switchSubtab(data);
  };
})();
