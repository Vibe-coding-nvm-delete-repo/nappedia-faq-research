// Nappedia Brand Reviews, Live v3.3 Model Reviews & Scored Models Pipeline View (Macro Tab: #reviews)
// Fast, sortable, filterable 591-brand + 190 live v3.3 model reviews + 15k+ scored models workspace
// Grounded in data/brand_reviews_tracker.js, data/live_model_reviews.js & data/reviews_models_scored.js
(function () {
  const rvState = {
    subtab: "brands",   // brands | live_models | models
    stage: "all",       // all | live | merged_deploying | shipping | built_qa | pending
    wave: "all",
    lane: "all",
    q: "",
    sortKey: "liveModels",
    sortDir: "desc",
    limit: 100,
    // Live v3.3 Model Reviews subtab state
    lmWave: "all",      // all | s4 | s3 | s12
    lmBrand: "all",
    lmQ: "",
    lmSortKey: "b",     // b=Brand, m=Model, wk=Wave, t=Type, p=Queen $, w=Words, d=Verified
    lmSortDir: "asc",
    lmLimit: 250,
    // Models catalog subtab state
    mBrand: "",
    mStatus: "all",     // all | A | D
    mLive: "all",       // all | live | unbuilt
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

  const WAVE_BADGE = {
    b25: { short: "25-Brand Fill (New)",     color: "#0f766e", bg: "#ccfbf1" },
    s4:  { short: "Story 4 (New Flagships)", color: "#15803d", bg: "#dcfce7" },
    s3:  { short: "Story 3 (v1 Retired)",    color: "#0369a1", bg: "#e0f2fe" },
    s12: { short: "Story 1+2 (Tier 0)",      color: "#5b21b6", bg: "#ede9fe" },
  };

  const COLS = [
    { key: "brand", label: "Brand", num: false, tip: "Mattress brand display name and its canonical URL slug on Nappedia.com." },
    { key: "stageOrder", label: "Stage", num: false, tip: "Current rollout stage: Live = deployed on Nappedia.com; Pending = queued wave." },
    { key: "liveModels", label: "Live Models", num: true, tip: "Number of dedicated live v3.3 model review pages currently deployed on Nappedia.com for this brand. Click to open all live links." },
    { key: "wave", label: "Wave", num: true, tip: "Rollout batch number: Core 14 flagship baseline or W1–W35 factory waves." },
    { key: "models", label: "Catalog", num: true, tip: "Exact zero-duplicate canonical mattress models cataloged for this brand (Active + Discontinued). Click to inspect & sort all models for this brand." },
    { key: "avgModelVol", label: "Avg Vol", num: true, tip: "Average Search Volume Potential (1–10) across all canonical models for this brand (10 = highest search demand)." },
    { key: "avgModelComp", label: "Avg Comp", num: true, tip: "Average SERP Winnability / Competitiveness (1–10) across all models for this brand (10 = lowest competition / easiest to rank #1)." },
    { key: "avgModelScore", label: "Avg Score", num: true, tip: "Equal average of Avg Vol (1–10) and Avg Comp (1–10) across all models for this brand." },
    { key: "words", label: "Words", num: true, tip: "Total rendered body word count of the compiled brand review page." },
    { key: "fk", label: "FK Grade", num: true, tip: "Flesch-Kincaid reading grade level of the prose (<= 8.0 target)." },
    { key: "critic", label: "Critic / QA", num: false, tip: "Independent first-principles critic score (/10)." },
  ];

  const LIVE_MODEL_COLS = [
    { key: "m",  label: "Model Name", num: false, tip: "Dedicated v3.3 model review page title on Nappedia.com." },
    { key: "b",  label: "Brand",      num: false, tip: "Parent mattress brand hub on Nappedia.com." },
    { key: "wk", label: "Rollout",    num: false, tip: "Release story: Story 4 (40 net-new flagships), Story 3 (58 legacy v1 retirements), or Story 1+2 (92 Tier 0 flagships)." },
    { key: "t",  label: "Type",       num: false, tip: "Verified mattress build category from the v3.3 model spec." },
    { key: "p",  label: "Queen $",    num: true,  tip: "Verified Queen street/list price in USD from the live v3.3 page." },
    { key: "w",  label: "Words",      num: true,  tip: "Exact rendered body word count from the deployed v3.3 HTML on main." },
    { key: "d",  label: "Verified",   num: false, tip: "Date verified and published on Nappedia.com." },
  ];

  const MODEL_COLS = [
    { key: "m", label: "Model Name", num: false, tip: "Zero-duplicate canonical mattress model name." },
    { key: "b", label: "Brand", num: false, tip: "Parent mattress brand on Nappedia." },
    { key: "t", label: "Type", num: false, tip: "Mattress construction type (Hybrid, Memory Foam, Latex, Innerspring, etc.)." },
    { key: "ms", label: "Status", num: false, tip: "Active = currently sold; Discontinued = retired / historical model." },
    { key: "p", label: "Queen $", num: true, tip: "Verified Queen street/sale price in USD when published." },
    { key: "v", label: "Vol (1–10)", num: true, tip: "Total Search Volume Potential (1–10, where 10 = highest consumer search demand)." },
    { key: "c", label: "Comp (1–10)", num: true, tip: "SERP Competitiveness / Winnability (1–10, where 10 = lowest SERP competition / easiest to win #1)." },
    { key: "a", label: "Avg Score", num: true, tip: "Equal average of Vol (1–10) and Comp (1–10): (Vol + Comp) / 2." },
    { key: "lu", label: "Live Page", num: false, tip: "Direct link to the live v3.3 model review page on Nappedia.com when published." },
  ];

  const PAGE_COL_TIP = "Direct link to open the live page on Nappedia.com.";

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
        const hay = `${r.brand} ${r.slug} ${r.waveLabel} ${r.stageLabel} ${r.mr} ${r.engine || "v3.3"} ${r.brandType}`.toLowerCase();
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
      if ((b.liveModels || 0) !== (a.liveModels || 0)) return (b.liveModels || 0) - (a.liveModels || 0);
      if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
      return a.brand.localeCompare(b.brand);
    });
    return out;
  }

  function getFilteredSortedLiveModels(models) {
    const q = rvState.lmQ.trim().toLowerCase();
    const out = models.filter((m) => {
      if (rvState.lmWave !== "all" && m.wk !== rvState.lmWave) return false;
      if (rvState.lmBrand !== "all" && m.bls !== rvState.lmBrand) return false;
      if (q) {
        const hay = `${m.b} ${m.m} ${m.ms} ${m.t} ${m.fm} ${m.bd} ${m.wl}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const k = rvState.lmSortKey;
    const dir = rvState.lmSortDir === "asc" ? 1 : -1;
    const waveRank = { b25: 0, s4: 1, s3: 2, s12: 3 };
    out.sort((a, b) => {
      let va = k === "wk" ? (waveRank[a.wk] || 9) : a[k];
      let vb = k === "wk" ? (waveRank[b.wk] || 9) : b[k];
      if (va === null || va === undefined || va === "") va = rvState.lmSortDir === "asc" ? Infinity : -Infinity;
      if (vb === null || vb === undefined || vb === "") vb = rvState.lmSortDir === "asc" ? Infinity : -Infinity;
      if (typeof va === "number" && typeof vb === "number") {
        if (va !== vb) return (va - vb) * dir;
      } else {
        const cmp = String(va).localeCompare(String(vb));
        if (cmp !== 0) return cmp * dir;
      }
      if (a.b !== b.b) return a.b.localeCompare(b.b);
      return a.m.localeCompare(b.m);
    });
    return out;
  }

  function getFilteredSortedModels(models) {
    const q = rvState.mQ.trim().toLowerCase();
    const out = models.filter((m) => {
      if (rvState.mBrand && m.b !== rvState.mBrand) return false;
      if (rvState.mStatus !== "all" && m.ms !== rvState.mStatus) return false;
      if (rvState.mLive === "live" && !m.lu) return false;
      if (rvState.mLive === "unbuilt" && m.lu) return false;
      if (q) {
        const hay = `${m.b} ${m.m} ${m.t} ${m.lu || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const k = rvState.mSortKey;
    const dir = rvState.mSortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      let va = k === "lu" ? (a.lu ? 1 : 0) : a[k];
      let vb = k === "lu" ? (b.lu ? 1 : 0) : b[k];
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

  function downloadCsv(filename, headers, rows) {
    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
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
    const liveModTot = s.live_model_reviews || 0;
    const liveModBrands = s.brands_with_live_models || 0;
    statLine.textContent = `Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} brands · ${liveModTot.toLocaleString()} live v3.3 model pages across ${liveModBrands} brands (0 legacy v1 remaining)`;

    thead.innerHTML = `<tr>${COLS.map((c) => {
      const sorted = rvState.sortKey === c.key;
      const arrow = sorted ? (rvState.sortDir === "asc" ? " &#9650;" : " &#9660;") : "";
      return `<th class="sortable${sorted ? " sorted" : ""}${c.num ? " num" : ""}" data-sort="${c.key}">` +
        `<span class="rv-th-inner"><span>${c.label}${arrow}</span>` +
        `<span class="rv-help" tabindex="0" role="button" data-title="${esc(c.label)}" data-tip="${esc(c.tip)}" aria-label="${esc(c.label)}: ${esc(c.tip)}">?</span>` +
        `</span></th>`;
    }).join("")}<th><span class="rv-th-inner"><span>Hub</span><span class="rv-help" tabindex="0" role="button" data-title="Hub" data-tip="${esc(PAGE_COL_TIP)}" aria-label="Hub: ${esc(PAGE_COL_TIP)}">?</span></span></th></tr>`;

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
        const liveModCell = (r.liveModels || 0) > 0
          ? `<button class="rv-live-mod-jump" data-bls="${esc(r.liveSlug)}" type="button" style="background:#dcfce7;color:#15803d;border:none;border-radius:999px;padding:3px 9px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;">${r.liveModels} live &#8594;</button>`
          : `<span style="color:var(--sub);font-size:12px;">0</span>`;
        const modCell = r.models > 0
          ? `<button class="rv-mod-jump" data-brand="${esc(r.brand)}" type="button" style="background:#eff6ff;color:#0066cc;border:none;border-radius:999px;padding:3px 9px;font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;">${r.models} &#8594;</button>`
          : `<span title="Bespoke / custom-built maker with no standard named retail model SKUs" style="background:#f1f5f9;color:#64748b;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600;">Custom</span>`;
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
          `<td class="num">${liveModCell}</td>` +
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
      tbody.querySelectorAll(".rv-live-mod-jump").forEach((btn) => {
        btn.addEventListener("click", () => {
          rvState.subtab = "live_models";
          rvState.lmBrand = btn.dataset.bls;
          rvState.lmWave = "all";
          rvState.lmQ = "";
          const sel = document.getElementById("rvLmBrandFilter");
          if (sel) sel.value = rvState.lmBrand;
          const inp = document.getElementById("rvLmSearch");
          if (inp) inp.value = "";
          document.querySelectorAll("#rvLmWavePills .rv-pill").forEach((b) => b.classList.toggle("active", b.dataset.lmwave === "all"));
          switchSubtab(data);
        });
      });
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
    if (csvBtn) csvBtn.addEventListener("click", () => downloadCsv(
      `nappedia-brand-reviews-${rvState.stage}.csv`,
      ["Brand", "Slug", "Stage", "LiveModels_v33", "Wave", "CatalogModels", "AvgModelVol", "AvgModelComp", "AvgModelScore", "Words", "FKGrade", "Critic", "URL"],
      filtered.map((r) => [r.brand, r.slug, r.stageLabel, r.liveModels || 0, r.waveLabel, r.models || 0, r.avgModelVol ?? "", r.avgModelComp ?? "", r.avgModelScore ?? "", r.words || "", r.fk ?? "", r.critic, r.url])
    ));
  }

  function renderLiveModelsTable(data) {
    const lmData = window.NAPPEDIA_LIVE_MODELS;
    const allLive = (lmData && lmData.models) || [];
    const filtered = getFilteredSortedLiveModels(allLive);
    const shown = filtered.slice(0, rvState.lmLimit);

    const thead = document.getElementById("rvLmThead");
    const tbody = document.getElementById("rvLmTbody");
    const tfoot = document.getElementById("rvLmTfoot");
    const statLine = document.getElementById("rvLmStatLine");
    if (!thead || !tbody || !tfoot) return;

    const avgWords = filtered.length ? Math.round(filtered.reduce((a, x) => a + (x.w || 0), 0) / filtered.length) : 0;
    statLine.textContent = `Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} live v3.3 model reviews on nappedia.com (Mean length: ${avgWords.toLocaleString()} words · 0 legacy v1 templates remaining)`;

    thead.innerHTML = `<tr>${LIVE_MODEL_COLS.map((c) => {
      const sorted = rvState.lmSortKey === c.key;
      const arrow = sorted ? (rvState.lmSortDir === "asc" ? " &#9650;" : " &#9660;") : "";
      return `<th class="sortable${sorted ? " sorted" : ""}${c.num ? " num" : ""}" data-lmsort="${c.key}">` +
        `<span class="rv-th-inner"><span>${c.label}${arrow}</span>` +
        `<span class="rv-help" tabindex="0" role="button" data-title="${esc(c.label)}" data-tip="${esc(c.tip)}" aria-label="${esc(c.label)}: ${esc(c.tip)}">?</span>` +
        `</span></th>`;
    }).join("")}<th><span class="rv-th-inner"><span>Live Page</span><span class="rv-help" tabindex="0" role="button" data-title="Live Page" data-tip="${esc(PAGE_COL_TIP)}" aria-label="Live Page: ${esc(PAGE_COL_TIP)}">?</span></span></th></tr>`;

    thead.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", (e) => {
        if (e.target.closest(".rv-help")) return;
        const key = th.dataset.lmsort;
        if (rvState.lmSortKey === key) {
          rvState.lmSortDir = rvState.lmSortDir === "asc" ? "desc" : "asc";
        } else {
          rvState.lmSortKey = key;
          rvState.lmSortDir = (key === "p" || key === "w" || key === "d") ? "desc" : "asc";
        }
        renderLiveModelsTable(data);
      });
    });
    wireHelpButtons(thead);

    if (!shown.length) {
      tbody.innerHTML = `<tr><td colspan="${LIVE_MODEL_COLS.length + 1}" style="text-align:center;padding:32px;color:var(--sub);">No live model reviews match the active filters.</td></tr>`;
    } else {
      const frag = [];
      for (const m of shown) {
        const wb = WAVE_BADGE[m.wk] || WAVE_BADGE.s12;
        const priceTxt = m.p ? `$${Number(m.p).toLocaleString()}` : "—";
        frag.push(
          `<tr>` +
          `<td><strong>${esc(m.m)}</strong><div class="rv-slug">${esc(m.ms)}</div></td>` +
          `<td><a href="${esc(m.hu)}" target="_blank" rel="noopener" style="color:var(--ink);font-weight:600;">${esc(m.b)}</a></td>` +
          `<td><span class="rv-badge" style="background:${wb.bg};color:${wb.color};">${esc(wb.short)}</span></td>` +
          `<td>${esc(m.t)}</td>` +
          `<td class="num">${priceTxt}</td>` +
          `<td class="num">${m.w ? m.w.toLocaleString() : "—"}</td>` +
          `<td style="white-space:nowrap;">${esc(m.d)}</td>` +
          `<td><a class="rv-live-link" href="${esc(m.u)}" target="_blank" rel="noopener">Live &#8599;</a></td>` +
          `</tr>`
        );
      }
      tbody.innerHTML = frag.join("");
    }

    const moreBtn = shown.length < filtered.length
      ? `<button class="load-btn" id="rvLmShowAllBtn" type="button">Show all ${filtered.length.toLocaleString()} live models</button>`
      : "";
    tfoot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} live v3.3 model reviews (${allLive.length} total live · +2 Titan 308 redirects active)</span><div style="display:flex;gap:8px;align-items:center;">${moreBtn}<button class="mini-btn" id="rvLmCsvBtn" type="button">Export CSV</button></div>`;

    const showAll = document.getElementById("rvLmShowAllBtn");
    if (showAll) showAll.addEventListener("click", () => { rvState.lmLimit = filtered.length; renderLiveModelsTable(data); });
    const csvBtn = document.getElementById("rvLmCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", () => downloadCsv(
      `nappedia-live-model-reviews-v33-${rvState.lmWave}.csv`,
      ["Brand", "Model", "Slug", "RolloutWave", "Type", "QueenUSD", "Firmness", "Words", "VerifiedDate", "Engine", "LiveURL", "BrandHubURL"],
      filtered.map((m) => [m.b, m.m, m.ms, m.wl, m.t, m.p ?? "", m.fm, m.w, m.d, m.ev, m.u, m.hu])
    ));
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
    const liveInView = filtered.filter((x) => x.lu).length;
    statLine.textContent = `Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} scored models (${liveInView.toLocaleString()} live v3.3 pages · Mean Priority Avg: ${avgAll}/10)`;

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
        const liveCell = m.lu
          ? `<a class="rv-live-link" href="${esc(m.lu)}" target="_blank" rel="noopener" style="color:#15803d;">Live ${esc(m.lv || "v3.3")} &#8599;</a>`
          : `<span style="color:var(--sub);font-size:12px;">—</span>`;
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
          `<td>${liveCell}</td>` +
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
    if (csvBtn) csvBtn.addEventListener("click", () => downloadCsv(
      `nappedia-scored-models${rvState.mBrand ? "-" + rvState.mBrand.toLowerCase().replace(/[^a-z0-9]+/g, "-") : ""}.csv`,
      ["Brand", "Model", "Type", "Status", "QueenUSD", "VolScore_1_10", "CompWinScore_1_10", "AvgPriorityScore_1_10", "LiveURL"],
      filtered.map((m) => [m.b, m.m, m.t, m.ms === "D" ? "Discontinued" : "Active", m.p ?? "", m.v, m.c, m.a, m.lu || ""])
    ));
  }

  function switchSubtab(data) {
    const bp = document.getElementById("rvBrandsPanel");
    const lp = document.getElementById("rvLiveModelsPanel");
    const mp = document.getElementById("rvModelsPanel");
    if (bp) bp.style.display = rvState.subtab === "brands" ? "" : "none";
    if (lp) lp.style.display = rvState.subtab === "live_models" ? "" : "none";
    if (mp) mp.style.display = rvState.subtab === "models" ? "" : "none";
    document.querySelectorAll("#rvSubtabs .rv-pill").forEach((b) => {
      b.classList.toggle("active", b.dataset.subtab === rvState.subtab);
    });
    if (rvState.subtab === "brands") renderBrandsTable(data);
    else if (rvState.subtab === "live_models") renderLiveModelsTable(data);
    else renderModelsTable(data);
  }

  let shellMounted = false;
  window.renderReviewsWorkspace = function () {
    const data = window.NAPPEDIA_BRAND_REVIEWS;
    const lmData = window.NAPPEDIA_LIVE_MODELS;
    const mData = window.NAPPEDIA_REVIEWS_MODELS;
    const root = document.getElementById("reviewsContent");
    if (!root || !data) return;

    wireGlobalTooltipDismiss();

    if (!shellMounted) {
      const s = data.summary;
      const totalMods = (mData && mData.totalModels) || s.total_canonical_models || 0;
      const totalLiveMods = (lmData && lmData.totalLiveModels) || s.live_model_reviews || 0;
      const totalLiveModBrands = (lmData && lmData.totalBrands) || s.brands_with_live_models || 0;
      const wc = (lmData && lmData.waveCounts) || { s4: 0, s3: 0, s12: 0 };
      const pctWritten = ((s.written_total / s.total) * 100).toFixed(1);
      const pctLive = ((s.live / s.total) * 100).toFixed(1);

      const waveNums = [...new Set(data.rows.map((r) => r.wave))].sort((a, b) => a - b);
      const waveOptions = waveNums.map((w) => `<option value="${w}">${w === 0 ? "Core 14 (Live v2)" : "Wave " + w}</option>`).join("");

      const lmBrandMap = new Map();
      for (const m of ((lmData && lmData.models) || [])) {
        const cur = lmBrandMap.get(m.bls) || { name: m.b, count: 0 };
        cur.count += 1;
        lmBrandMap.set(m.bls, cur);
      }
      const lmBrandOptions = [...lmBrandMap.entries()]
        .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
        .map(([bls, info]) => `<option value="${esc(bls)}">${esc(info.name)} (${info.count})</option>`)
        .join("");

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

      const lmWavePills = [
        { k: "all", label: "All Live v3.3", count: totalLiveMods },
        { k: "b25", label: "25-Brand Fill (New)", count: wc.b25 || 0, color: "#0f766e" },
        { k: "s4",  label: "Story 4: New Flagships", count: wc.s4, color: "#15803d" },
        { k: "s3",  label: "Story 3: Legacy v1 Retired", count: wc.s3, color: "#0369a1" },
        { k: "s12", label: "Story 1+2: Tier 0", count: wc.s12, color: "#5b21b6" },
      ].map((p) => {
        const dot = p.color ? `<span class="rv-dot" style="background:${p.color};"></span>` : "";
        return `<button class="rv-pill${rvState.lmWave === p.k ? " active" : ""}" data-lmwave="${p.k}" type="button">${dot}<span>${p.label}</span><span class="tab-count">${p.count}</span></button>`;
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
          <div class="rv-kpi" id="rvKpiLiveModels" style="cursor:pointer;" title="Click to browse all ${totalLiveMods} live v3.3 model review URLs">
            <div class="rv-kpi-lbl">Live Model Pages</div>
            <div class="rv-kpi-val" style="color:#15803d;">${totalLiveMods.toLocaleString()}</div>
            <div class="rv-kpi-sub">${totalLiveModBrands} brands · 0 legacy v1 left</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Zero-Dup Catalog</div>
            <div class="rv-kpi-val" style="color:#0066cc;">${totalMods.toLocaleString()}</div>
            <div class="rv-kpi-sub">Across ${s.brands_with_models || 591}/${s.total} brands</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Scoring Model</div>
            <div class="rv-kpi-val" style="color:#15803d;">1–10 Avg</div>
            <div class="rv-kpi-sub">50% Vol + 50% SERP Win</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Engine Version</div>
            <div class="rv-kpi-val">${esc(data.engineVersion || "v3.3")}</div>
            <div class="rv-kpi-sub">All ${totalLiveMods} models on v3.3</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Pending / Next Wave</div>
            <div class="rv-kpi-val" style="color:#475569;">${s.pending.toLocaleString()}</div>
            <div class="rv-kpi-sub">${s.pending === 0 ? "0 remaining" : "Queued Wave A+B"}</div>
          </div>
        </div>

        <div class="rv-pills" id="rvSubtabs" style="margin-bottom:14px;">
          <button class="rv-pill active" data-subtab="brands" type="button"><span>Brand Reviews &amp; Avg Model Score</span><span class="tab-count">${s.total.toLocaleString()}</span></button>
          <button class="rv-pill" data-subtab="live_models" type="button"><span class="rv-dot" style="background:#15803d;"></span><span>Live Model Reviews (v3.3)</span><span class="tab-count">${totalLiveMods.toLocaleString()}</span></button>
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

        <section class="card rv-card" id="rvLiveModelsPanel" style="display:none;">
          <div class="rv-pipe-head">
            <div>
              <h2 class="card-title">Live Model Review Pages on Nappedia.com (v3.3)</h2>
              <div class="stat-line" id="rvLmStatLine"></div>
            </div>
            <div class="rv-updated">Main commit: ${esc((lmData && lmData.commitSha) || "live")} · ${esc(updatedDate)}</div>
          </div>
          <div class="rv-pills" id="rvLmWavePills">${lmWavePills}</div>
          <div class="toolbar rv-toolbar">
            <input class="search-input" id="rvLmSearch" type="search" placeholder="Search ${totalLiveMods} live model reviews by model, brand, type, or firmness..." aria-label="Search live model reviews">
            <select class="filter-select" id="rvLmBrandFilter" aria-label="Filter by brand">
              <option value="all">All ${totalLiveModBrands} Brands (${totalLiveMods} models)</option>
              ${lmBrandOptions}
            </select>
          </div>
          <div class="b-table-wrap">
            <table class="b-table rv-table">
              <thead id="rvLmThead"></thead>
              <tbody id="rvLmTbody"></tbody>
            </table>
          </div>
          <div class="table-foot" id="rvLmTfoot"></div>
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
            <select class="filter-select" id="rvModLiveFilter" aria-label="Filter by live review page">
              <option value="all">All Models (Live + Unbuilt)</option>
              <option value="live">Live on Nappedia (${totalLiveMods})</option>
              <option value="unbuilt">Not Yet Built</option>
            </select>
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

      document.getElementById("rvKpiLiveModels").addEventListener("click", () => {
        rvState.subtab = "live_models";
        switchSubtab(data);
      });

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

      document.querySelectorAll("#rvLmWavePills .rv-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          rvState.lmWave = btn.dataset.lmwave;
          document.querySelectorAll("#rvLmWavePills .rv-pill").forEach((b) => b.classList.toggle("active", b.dataset.lmwave === rvState.lmWave));
          renderLiveModelsTable(data);
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

      document.getElementById("rvLmSearch").addEventListener("input", (e) => {
        rvState.lmQ = e.target.value;
        renderLiveModelsTable(data);
      });
      document.getElementById("rvLmBrandFilter").addEventListener("change", (e) => {
        rvState.lmBrand = e.target.value;
        renderLiveModelsTable(data);
      });

      document.getElementById("rvModSearch").addEventListener("input", (e) => {
        rvState.mQ = e.target.value;
        rvState.mLimit = 100;
        renderModelsTable(data);
      });
      document.getElementById("rvModLiveFilter").addEventListener("change", (e) => {
        rvState.mLive = e.target.value;
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
