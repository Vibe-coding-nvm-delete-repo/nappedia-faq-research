// Nappedia Brand Reviews Pipeline View (3rd Macro Tab)
// Fast, sortable, filterable 543-brand stage tracker grounded in data/brand_reviews_tracker.js
(function () {
  const rvState = {
    stage: "all",       // all | live | merged_deploying | shipping | built_qa | pending
    wave: "all",        // all | 0..34
    lane: "all",        // all | live_v2 | static_d9_upgrade | nextjs_migration
    q: "",
    sortKey: "stageOrder",
    sortDir: "asc",
    limit: 100,
  };

  const STAGE_META = {
    live:             { label: "Live on Nappedia",          short: "Live",             color: "#15803d", bg: "#dcfce7" },
    merged_deploying: { label: "Merged (Deploying MR !428)",short: "Merged / Deploying",color: "#0369a1", bg: "#e0f2fe" },
    shipping:         { label: "Critic-Cleared (MR !428)",  short: "Shipping MR !428", color: "#1d4ed8", bg: "#dbeafe" },
    built_qa:         { label: "Written & Visual-QA",       short: "Built / Visual-QA",color: "#b45309", bg: "#fef3c7" },
    pending:          { label: "Pending Writer (Prepped)",  short: "Pending Writer",   color: "#475569", bg: "#f1f5f9" },
  };

  const COLS = [
    { key: "brand",      label: "Brand",      num: false },
    { key: "stageOrder", label: "Stage",      num: false },
    { key: "wave",       label: "Wave",       num: true  },
    { key: "score",      label: "Priority",   num: true  },
    { key: "words",      label: "Words",      num: true  },
    { key: "fk",         label: "FK Grade",   num: true  },
    { key: "faqs",       label: "FAQs",       num: true  },
    { key: "critic",     label: "Critic / QA",num: false },
    { key: "mr",         label: "Release",    num: false },
  ];

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getFilteredSorted(rows) {
    const q = rvState.q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (rvState.stage !== "all" && r.stage !== rvState.stage) return false;
      if (rvState.wave !== "all" && String(r.wave) !== rvState.wave) return false;
      if (rvState.lane !== "all" && r.sourceKind !== rvState.lane) return false;
      if (q) {
        const hay = `${r.brand} ${r.slug} ${r.waveLabel} ${r.stageLabel} ${r.mr} ${r.brandType}`.toLowerCase();
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
      // Stable secondary tie-break: stageOrder asc, wave asc, brand asc
      if (a.stageOrder !== b.stageOrder) return a.stageOrder - b.stageOrder;
      if (a.wave !== b.wave) return a.wave - b.wave;
      return a.brand.localeCompare(b.brand);
    });
    return out;
  }

  function exportCsv(rows) {
    const headers = ["Brand", "Slug", "Stage", "Wave", "PriorityScore", "Words", "FKGrade", "FAQs", "Critic", "Release", "SourceKind", "URL"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([
        r.brand, r.slug, r.stageLabel, r.waveLabel, r.score, r.words || "", r.fk ?? "", r.faqs || "", r.critic, r.mr, r.sourceKind, r.url,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nappedia-brand-reviews-${rvState.stage}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function renderTableOnly(data) {
    const filtered = getFilteredSorted(data.rows);
    const shown = filtered.slice(0, rvState.limit);

    const thead = document.getElementById("rvThead");
    const tbody = document.getElementById("rvTbody");
    const tfoot = document.getElementById("rvTfoot");
    const statLine = document.getElementById("rvStatLine");
    if (!thead || !tbody || !tfoot) return;

    statLine.textContent = `Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} matching brand reviews (${data.summary.written_total.toLocaleString()} of ${data.summary.total.toLocaleString()} written · ${data.summary.live.toLocaleString()} live now · ${(data.summary.merged_deploying + data.summary.shipping).toLocaleString()} deploying in MR !428)`;

    thead.innerHTML = `<tr>${COLS.map((c) => {
      const sorted = rvState.sortKey === c.key;
      const arrow = sorted ? (rvState.sortDir === "asc" ? " &#9650;" : " &#9660;") : "";
      return `<th class="sortable${sorted ? " sorted" : ""}${c.num ? " num" : ""}" data-sort="${c.key}">${c.label}${arrow}</th>`;
    }).join("")}<th>Page</th></tr>`;

    thead.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (rvState.sortKey === key) {
          rvState.sortDir = rvState.sortDir === "asc" ? "desc" : "asc";
        } else {
          rvState.sortKey = key;
          rvState.sortDir = key === "brand" || key === "stageOrder" || key === "wave" ? "asc" : "desc";
        }
        renderTableOnly(data);
      });
    });

    if (!shown.length) {
      tbody.innerHTML = `<tr><td colspan="${COLS.length + 1}" style="text-align:center;padding:32px;color:var(--sub);">No brand reviews match the active filters.</td></tr>`;
    } else {
      const frag = [];
      for (const r of shown) {
        const sm = STAGE_META[r.stage] || STAGE_META.pending;
        const fkTxt = r.fk !== null && r.fk !== undefined ? r.fk.toFixed(2) : "—";
        const fkColor = r.fk !== null && r.fk <= 8.0 ? "#15803d" : (r.fk > 8.0 ? "#b45309" : "var(--sub)");
        const liveBtn = r.stage === "live"
          ? `<a class="rv-live-link" href="${esc(r.url)}" target="_blank" rel="noopener">Live &#8599;</a>`
          : `<a class="rv-live-link rv-live-muted" href="${esc(r.url)}" target="_blank" rel="noopener">URL &#8599;</a>`;
        frag.push(
          `<tr>` +
          `<td><strong>${esc(r.brand)}</strong><div class="rv-slug">${esc(r.slug)}</div></td>` +
          `<td><span class="rv-badge" style="background:${sm.bg};color:${sm.color};">${esc(sm.short)}</span></td>` +
          `<td class="num">${r.wave === 0 ? "Core 14" : "W" + r.wave}</td>` +
          `<td class="num">${r.score || "—"}</td>` +
          `<td class="num">${r.words ? r.words.toLocaleString() : "—"}</td>` +
          `<td class="num" style="color:${fkColor};font-weight:600;">${fkTxt}</td>` +
          `<td class="num">${r.faqs || "—"}</td>` +
          `<td>${esc(r.critic)}</td>` +
          `<td><span class="rv-mr">${esc(r.mr)}</span></td>` +
          `<td>${liveBtn}</td>` +
          `</tr>`
        );
      }
      tbody.innerHTML = frag.join("");
    }

    const moreBtn = shown.length < filtered.length
      ? `<button class="load-btn" id="rvShowAllBtn" type="button">Show all ${filtered.length.toLocaleString()} rows</button>`
      : (filtered.length > 100 ? `<button class="load-btn" id="rvCollapseBtn" type="button">Show first 100</button>` : "");
    tfoot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} brand reviews (Total catalog: ${data.summary.total.toLocaleString()})</span><div style="display:flex;gap:8px;align-items:center;">${moreBtn}<button class="mini-btn" id="rvCsvBtn" type="button">Export CSV</button></div>`;

    const showAll = document.getElementById("rvShowAllBtn");
    if (showAll) showAll.addEventListener("click", () => { rvState.limit = filtered.length; renderTableOnly(data); });
    const collapse = document.getElementById("rvCollapseBtn");
    if (collapse) collapse.addEventListener("click", () => { rvState.limit = 100; renderTableOnly(data); });
    const csvBtn = document.getElementById("rvCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", () => exportCsv(filtered));
  }

  let shellMounted = false;
  window.renderReviewsWorkspace = function () {
    const data = window.NAPPEDIA_BRAND_REVIEWS;
    const root = document.getElementById("reviewsContent");
    if (!root || !data) return;

    if (!shellMounted) {
      const s = data.summary;
      const pctWritten = ((s.written_total / s.total) * 100).toFixed(1);
      const pctLive = ((s.live / s.total) * 100).toFixed(1);
      const deploying = s.merged_deploying + s.shipping;
      const pctPostMr = (((s.live + deploying) / s.total) * 100).toFixed(1);

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
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      });

      root.innerHTML = `
        <div class="rv-kpi-grid">
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Total Catalog</div>
            <div class="rv-kpi-val">${s.total.toLocaleString()}</div>
            <div class="rv-kpi-sub">14 Core v2 + 529 Wave Plan</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Written to v3.1</div>
            <div class="rv-kpi-val" style="color:#0066cc;">${s.written_total.toLocaleString()}</div>
            <div class="rv-kpi-sub">${pctWritten}% of full catalog</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Live on Nappedia</div>
            <div class="rv-kpi-val" style="color:#15803d;">${s.live.toLocaleString()}</div>
            <div class="rv-kpi-sub">${pctLive}% live (Core + W1-5, 7-13)</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Deploying in MR !428</div>
            <div class="rv-kpi-val" style="color:#1d4ed8;">${deploying.toLocaleString()}</div>
            <div class="rv-kpi-sub">${s.merged_deploying} merged + ${s.shipping} queued (${pctPostMr}% live next)</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Written / Visual-QA</div>
            <div class="rv-kpi-val" style="color:#b45309;">${s.built_qa.toLocaleString()}</div>
            <div class="rv-kpi-sub">Waves 25, 27, 28 (awaiting critic)</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Pending Writer</div>
            <div class="rv-kpi-val" style="color:#475569;">${s.pending.toLocaleString()}</div>
            <div class="rv-kpi-sub">Waves 29-34 + W6 (100% prepped)</div>
          </div>
        </div>

        <section class="card rv-card">
          <div class="rv-pipe-head">
            <div>
              <h2 class="card-title">Brand Review v3.1 Rollout Pipeline</h2>
              <div class="stat-line" id="rvStatLine"></div>
            </div>
            <div class="rv-updated">Snapshot: ${esc(updatedDate)}</div>
          </div>
          <div class="rv-bar-track" aria-label="Pipeline stage breakdown">${barSegments}</div>
          <div class="rv-pills" id="rvStagePills">${stagePills}</div>
          <div class="toolbar rv-toolbar">
            <input class="search-input" id="rvSearch" type="search" placeholder="Search 543 brands by name, slug, wave, or MR..." aria-label="Search brand reviews">
            <select class="filter-select" id="rvWaveFilter" aria-label="Filter by wave">
              <option value="all">All Waves (Core + W1–W34)</option>
              ${waveOptions}
            </select>
            <select class="filter-select" id="rvLaneFilter" aria-label="Filter by lane">
              <option value="all">All Source Types</option>
              <option value="live_v2">Core v2 (14)</option>
              <option value="static_d9_upgrade">Static D9 Upgrade (504)</option>
              <option value="nextjs_migration">Next.js Migration (25)</option>
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
      `;

      document.querySelectorAll("#rvStagePills .rv-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          rvState.stage = btn.dataset.stage;
          rvState.limit = 100;
          document.querySelectorAll("#rvStagePills .rv-pill").forEach((b) => b.classList.toggle("active", b.dataset.stage === rvState.stage));
          renderTableOnly(data);
        });
      });

      document.getElementById("rvSearch").addEventListener("input", (e) => {
        rvState.q = e.target.value;
        rvState.limit = 100;
        renderTableOnly(data);
      });
      document.getElementById("rvWaveFilter").addEventListener("change", (e) => {
        rvState.wave = e.target.value;
        rvState.limit = 100;
        renderTableOnly(data);
      });
      document.getElementById("rvLaneFilter").addEventListener("change", (e) => {
        rvState.lane = e.target.value;
        rvState.limit = 100;
        renderTableOnly(data);
      });

      shellMounted = true;
    }

    renderTableOnly(data);
  };
})();
