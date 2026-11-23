/* =========================================================================
   NAPPEDIA RESEARCH HUB — AREA #3: BRAND FAQS WORKSPACE
   Universal 10 compliant (zero CSS borders / border-colors; light shadows & tints)
   ========================================================================= */
(function () {
  const SRC_LABELS = {
    google: { label: "Google", bg: "#eef5ff", fg: "#0066cc" },
    bing: { label: "Bing", bg: "#ecfdf5", fg: "#047857" },
    youtube: { label: "YouTube", bg: "#fef2f2", fg: "#b91c1c" },
    amazon: { label: "Amazon", bg: "#fffbeb", fg: "#b45309" },
    ddg: { label: "DDG", bg: "#fff7ed", fg: "#c2410c" },
    yahoo: { label: "Yahoo", bg: "#f5f3ff", fg: "#6d28d9" },
    reddit: { label: "Reddit", bg: "#fef2f2", fg: "#dc2626" },
    tmu: { label: "TMU", bg: "#f0fdf4", fg: "#15803d" },
    "18cat_proof": { label: "18-Cat", bg: "#f1f5f9", fg: "#475569" },
    brand_seeds: { label: "Seed", bg: "#f1f5f9", fg: "#475569" },
  };

  const bfState = {
    sub: "explorer",      // explorer | brands | audit
    sideMode: "pillar",   // pillar | brand
    pillar: "",
    brand: "",
    q: "",
    sideQ: "",
    tier: "",
    src: "",
    limit: 100,
    auditTab: "merged",   // merged | excluded | telemetry
    expanded: new Set(),
  };

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSourceChips(sources) {
    return (sources || [])
      .map((s) => {
        const meta = SRC_LABELS[s] || { label: s, bg: "#f1f5f9", fg: "#475569" };
        return `<span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;background:${meta.bg};color:${meta.fg};margin:1px 3px 1px 0;">${esc(meta.label)}</span>`;
      })
      .join("");
  }

  function setBrandFaqSub(sub, resetHash = true) {
    bfState.sub = sub;
    if (resetHash) {
      history.replaceState(null, "", sub === "explorer" ? "#brand-faqs" : "#brand-faqs-" + sub);
    }
    renderBrandFaqsView();
  }
  window.setBrandFaqSub = setBrandFaqSub;

  function openBrandFaqsForBrand(brandSlug) {
    bfState.sub = "explorer";
    bfState.sideMode = "brand";
    bfState.brand = brandSlug || "";
    bfState.pillar = "";
    bfState.limit = 100;
    renderBrandFaqsView();
  }
  window.openBrandFaqsForBrand = openBrandFaqsForBrand;

  function renderBrandFaqsView() {
    const BF = window.NAPPEDIA_BRAND_FAQS;
    const root = document.getElementById("brandFaqsContent");
    if (!root) return;
    if (!BF || !BF.summary) {
      root.innerHTML = `<div class="panel" style="padding:28px;text-align:center;color:var(--muted);">Brand FAQs dataset is loading or not yet built.</div>`;
      return;
    }

    const s = BF.summary;
    // Update sub-tab active states & counts
    const cExp = document.getElementById("cnt-bf-explorer");
    const cBr = document.getElementById("cnt-bf-brands");
    const cAud = document.getElementById("cnt-bf-audit");
    if (cExp) cExp.textContent = s.kept_pages.toLocaleString();
    if (cBr) cBr.textContent = s.brands_covered.toLocaleString();
    if (cAud) cAud.textContent = (s.merged_twins + s.excluded).toLocaleString();

    document.querySelectorAll("#brandFaqTabs .cat-tab").forEach((btn) => {
      const act = btn.dataset.bfsub === bfState.sub;
      btn.classList.toggle("active", act);
      btn.setAttribute("aria-selected", act ? "true" : "false");
    });

    const kpiHtml = `
      <div class="dash-kpis" style="margin-bottom:18px;">
        <div class="kpi-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
            <span class="kpi-label">VALIDATED BRAND FAQS</span>
            <span class="pill p-valid">100% VERIFIED</span>
          </div>
          <div class="kpi-val">${s.kept_pages.toLocaleString()}</div>
          <div class="kpi-sub"><strong>${s.tier1_pages.toLocaleString()}</strong> Tier 1 &middot; <strong>${s.tier2_pages.toLocaleString()}</strong> Tier 2 across <strong>${s.pillars_active}/10</strong> Intent Pillars</div>
        </div>
        <div class="kpi-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
            <span class="kpi-label">BRANDS &amp; RETAILERS</span>
            <span class="pill p-search">ENTITY COVERAGE</span>
          </div>
          <div class="kpi-val">${s.brands_covered.toLocaleString()}</div>
          <div class="kpi-sub">Flagship US mattress brands &amp; major retailers (separate from editorial FAQs)</div>
        </div>
        <div class="kpi-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
            <span class="kpi-label">MULTI-SOURCE LIVE PROOF</span>
            <span class="pill p-gap">${s.live_sources_used.length} SOURCES</span>
          </div>
          <div class="kpi-val">${s.total_unique_raw_queries.toLocaleString()}</div>
          <div class="kpi-sub">Google, Bing, YouTube, Amazon, DDG, Yahoo, Reddit r/Mattress &amp; TMU</div>
        </div>
        <div class="kpi-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
            <span class="kpi-label">ZERO-DROP AUDIT FUNNEL</span>
            <span class="pill p-valid">0 DROPPED</span>
          </div>
          <div class="kpi-val">${s.evaluated_candidates.toLocaleString()}</div>
          <div class="kpi-sub"><strong>${s.merged_twins.toLocaleString()}</strong> merged twins &middot; <strong>${s.excluded.toLocaleString()}</strong> noise excluded &middot; <strong>${s.multisource_pages.toLocaleString()}</strong> multi-source</div>
        </div>
      </div>
    `;

    if (bfState.sub === "brands") {
      renderBrandsMatrix(root, kpiHtml, BF);
    } else if (bfState.sub === "audit") {
      renderAuditView(root, kpiHtml, BF);
    } else {
      renderExplorerView(root, kpiHtml, BF);
    }
  }

  function renderExplorerView(root, kpiHtml, BF) {
    const qLow = bfState.q.trim().toLowerCase();
    const filtered = BF.pages.filter((p) => {
      if (bfState.pillar && p.pillar_id !== bfState.pillar) return false;
      if (bfState.brand && p.brand_slug !== bfState.brand) return false;
      if (bfState.tier && String(p.tier) !== bfState.tier) return false;
      if (bfState.src && !(p.sources || []).includes(bfState.src)) return false;
      if (qLow) {
        const hay = (p.clean_title + " " + p.brand_name + " " + p.pillar_name + " " + (p.variants || []).join(" ")).toLowerCase();
        if (!hay.includes(qLow)) return false;
      }
      return true;
    });

    const sideQ = bfState.sideQ.trim().toLowerCase();
    let sideItemsHtml = "";
    const sideBtnStyle = (act) =>
      `border:none;width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;padding:8px 10px;border-radius:9px;font-size:12.5px;cursor:pointer;margin-bottom:3px;transition:background .12s;${
        act
          ? "background:var(--accent-soft);color:var(--accent);font-weight:700;"
          : "background:transparent;color:var(--ink);font-weight:500;"
      }`;
    const cntPillStyle = (act) =>
      `font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;flex-shrink:0;${
        act ? "background:#ffffff;color:var(--accent);" : "background:#edf1f5;color:var(--sub);"
      }`;
    if (bfState.sideMode === "pillar") {
      sideItemsHtml += `<button style="${sideBtnStyle(bfState.pillar === "")}" data-bf-pillar="" type="button"><span>All Intent Pillars</span><span style="${cntPillStyle(bfState.pillar === "")}">${BF.pages.length}</span></button>`;
      BF.pillars.forEach((pl) => {
        if (sideQ && !pl.name.toLowerCase().includes(sideQ)) return;
        const act = bfState.pillar === pl.id;
        sideItemsHtml += `<button style="${sideBtnStyle(act)}" data-bf-pillar="${esc(pl.id)}" type="button"><span>${esc(pl.name)}</span><span style="${cntPillStyle(act)}">${pl.kept}</span></button>`;
      });
    } else {
      sideItemsHtml += `<button style="${sideBtnStyle(bfState.brand === "")}" data-bf-brand="" type="button"><span>All Brands &amp; Retailers</span><span style="${cntPillStyle(bfState.brand === "")}">${BF.pages.length}</span></button>`;
      BF.brands.forEach((b) => {
        if (sideQ && !b.brand_name.toLowerCase().includes(sideQ)) return;
        const act = bfState.brand === b.slug;
        sideItemsHtml += `<button style="${sideBtnStyle(act)}" data-bf-brand="${esc(b.slug)}" type="button"><span>${esc(b.brand_name)}</span><span style="${cntPillStyle(act)}">${b.kept}</span></button>`;
      });
    }

    const shown = filtered.slice(0, bfState.limit);
    const rowsHtml = shown.length
      ? shown
          .map((p) => {
            const isExp = bfState.expanded.has(p.id);
            const varsHtml = isExp
              ? `<tr class="exp-row"><td colspan="6" style="background:#f8fafc;padding:12px 16px;">
                  <div style="font-size:12px;color:var(--muted);margin-bottom:6px;"><strong>Proven Live Query Variants (${p.variant_count}):</strong></div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                    ${(p.variants || []).slice(0, 18).map((v) => `<span style="background:#ffffff;padding:3px 9px;border-radius:8px;font-size:12px;box-shadow:0 1px 2px rgba(15,23,42,.06);">${esc(v)}</span>`).join("")}
                  </div>
                  ${
                    (p.community_urls || []).length
                      ? `<div style="font-size:12px;margin-top:6px;"><strong>Community Threads:</strong> ${(p.community_urls || []).map((u, idx) => `<a href="${esc(u)}" target="_blank" rel="noopener" style="color:#0066cc;margin-right:10px;">Thread #${idx + 1} &#8599;</a>`).join("")}</div>`
                      : ""
                  }
                </td></tr>`
              : "";
            return `
              <tr data-bf-row="${esc(p.id)}" style="cursor:pointer;">
                <td style="width:48px;color:var(--muted);font-weight:600;">#${p.rank}</td>
                <td style="width:145px;">
                  <button type="button" class="mini-btn" data-bf-quickbrand="${esc(p.brand_slug)}" style="font-size:12px;padding:3px 9px;font-weight:600;background:#eef5ff;color:#0066cc;">${esc(p.brand_name)}</button>
                </td>
                <td>
                  <div style="font-weight:600;color:var(--ink);line-height:1.35;">${esc(p.clean_title)}</div>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px;">${esc(p.pillar_name)} &middot; ${p.variant_count} proven query variant${p.variant_count === 1 ? "" : "s"}</div>
                </td>
                <td style="width:76px;text-align:center;">
                  <span class="pill p-t${p.tier}">Tier ${p.tier}</span>
                </td>
                <td style="width:210px;">${renderSourceChips(p.sources)}</td>
                <td style="width:78px;text-align:right;">
                  <button type="button" class="mini-btn" data-bf-copy="${esc(p.clean_title)}" title="Copy FAQ title">Copy</button>
                </td>
              </tr>
              ${varsHtml}
            `;
          })
          .join("")
      : `<tr><td colspan="6" style="padding:28px;text-align:center;color:var(--muted);">No Brand FAQs match the current filters.</td></tr>`;

    const activeFilterLabel = [
      bfState.brand ? `Brand: ${BF.brands.find((b) => b.slug === bfState.brand)?.brand_name || bfState.brand}` : "",
      bfState.pillar ? `Pillar: ${BF.pillars.find((pl) => pl.id === bfState.pillar)?.name || bfState.pillar}` : "",
      bfState.src ? `Source: ${bfState.src}` : "",
      bfState.tier ? `Tier ${bfState.tier}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const selStyle = "border:none;background:var(--control);color:var(--ink);padding:8px 12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;outline:none;";
    root.innerHTML = `
      ${kpiHtml}
      <div class="workspace">
        <aside class="sidebar card" style="padding:14px;">
          <div style="display:flex;gap:6px;margin-bottom:10px;background:#edf1f5;padding:4px;border-radius:10px;">
            <button type="button" class="mini-btn" data-bf-sidemode="pillar" style="border:none;flex:1;padding:6px 8px;border-radius:8px;${bfState.sideMode === "pillar" ? "background:#fff;color:#0066cc;font-weight:700;box-shadow:0 1px 3px rgba(15,23,42,.08);" : "background:transparent;color:var(--sub);"}">Pillars (10)</button>
            <button type="button" class="mini-btn" data-bf-sidemode="brand" style="border:none;flex:1;padding:6px 8px;border-radius:8px;${bfState.sideMode === "brand" ? "background:#fff;color:#0066cc;font-weight:700;box-shadow:0 1px 3px rgba(15,23,42,.08);" : "background:transparent;color:var(--sub);"}">Brands (${BF.brands.length})</button>
          </div>
          <input type="search" id="bfSideSearch" class="search-input" placeholder="Filter ${bfState.sideMode === "pillar" ? "pillars" : "brands"}..." value="${esc(bfState.sideQ)}" style="width:100%;margin-bottom:10px;border:none;background:var(--control);border-radius:9px;padding:8px 10px;" />
          <div class="topic-list" style="max-height:560px;overflow-y:auto;">${sideItemsHtml}</div>
        </aside>
        <main class="main-col card" style="padding:16px;">
          <div class="controls-bar" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px;">
            <input type="search" id="bfSearch" class="search-input" placeholder="Search brand FAQs (e.g. Purple fiberglass, Saatva warranty, Costco return)..." value="${esc(bfState.q)}" style="flex:1 1 260px;border:none;background:var(--control);border-radius:10px;padding:8px 12px;" />
            <select id="bfTierSel" style="${selStyle}">
              <option value="">All Tiers</option>
              <option value="1" ${bfState.tier === "1" ? "selected" : ""}>Tier 1 Only</option>
              <option value="2" ${bfState.tier === "2" ? "selected" : ""}>Tier 2 Only</option>
            </select>
            <select id="bfSrcSel" style="${selStyle}">
              <option value="">All Sources (${BF.summary.live_sources_used.length})</option>
              ${BF.summary.live_sources_used.map((src) => `<option value="${esc(src)}" ${bfState.src === src ? "selected" : ""}>${esc((SRC_LABELS[src] || { label: src }).label)}</option>`).join("")}
            </select>
            ${
              activeFilterLabel
                ? `<button type="button" id="bfClearFilters" class="mini-btn" style="border:none;background:#fef2f2;color:#b91c1c;">Clear Filters</button>`
                : ""
            }
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">
            Showing <strong>${shown.length.toLocaleString()}</strong> of <strong>${filtered.length.toLocaleString()}</strong> validated Brand FAQs${activeFilterLabel ? ` &middot; ${esc(activeFilterLabel)}` : ""} &middot; Click any row to inspect proven live variants &amp; community links.
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Brand / Retailer</th>
                  <th>Canonical Brand FAQ</th>
                  <th style="text-align:center;">Tier</th>
                  <th>Live Sources</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          ${
            filtered.length > shown.length
              ? `<div style="text-align:center;margin-top:14px;"><button type="button" id="bfLoadMore" class="util-btn">Load More (${filtered.length - shown.length} remaining)</button></div>`
              : ""
          }
        </main>
      </div>
    `;

    // Wire events cleanly
    const searchEl = document.getElementById("bfSearch");
    if (searchEl) {
      searchEl.addEventListener("input", (e) => {
        bfState.q = e.target.value;
        bfState.limit = 100;
        const pos = e.target.selectionStart;
        renderBrandFaqsView();
        const el2 = document.getElementById("bfSearch");
        if (el2) { el2.focus(); el2.setSelectionRange(pos, pos); }
      });
    }
    const sideEl = document.getElementById("bfSideSearch");
    if (sideEl) {
      sideEl.addEventListener("input", (e) => {
        bfState.sideQ = e.target.value;
        const pos = e.target.selectionStart;
        renderBrandFaqsView();
        const el2 = document.getElementById("bfSideSearch");
        if (el2) { el2.focus(); el2.setSelectionRange(pos, pos); }
      });
    }
    const tierEl = document.getElementById("bfTierSel");
    if (tierEl) tierEl.addEventListener("change", (e) => { bfState.tier = e.target.value; bfState.limit = 100; renderBrandFaqsView(); });
    const srcEl = document.getElementById("bfSrcSel");
    if (srcEl) srcEl.addEventListener("change", (e) => { bfState.src = e.target.value; bfState.limit = 100; renderBrandFaqsView(); });
    const clearEl = document.getElementById("bfClearFilters");
    if (clearEl) clearEl.addEventListener("click", () => { bfState.pillar = ""; bfState.brand = ""; bfState.tier = ""; bfState.src = ""; bfState.q = ""; bfState.limit = 100; renderBrandFaqsView(); });
    const moreEl = document.getElementById("bfLoadMore");
    if (moreEl) moreEl.addEventListener("click", () => { bfState.limit += 100; renderBrandFaqsView(); });

    root.querySelectorAll("[data-bf-sidemode]").forEach((b) =>
      b.addEventListener("click", () => { bfState.sideMode = b.dataset.bfSidemode; bfState.sideQ = ""; renderBrandFaqsView(); })
    );
    root.querySelectorAll("[data-bf-pillar]").forEach((b) =>
      b.addEventListener("click", () => { bfState.pillar = b.dataset.bfPillar; bfState.limit = 100; renderBrandFaqsView(); })
    );
    root.querySelectorAll("[data-bf-brand]").forEach((b) =>
      b.addEventListener("click", () => { bfState.brand = b.dataset.bfBrand; bfState.limit = 100; renderBrandFaqsView(); })
    );
    root.querySelectorAll("[data-bf-quickbrand]").forEach((b) =>
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        bfState.brand = b.dataset.bfQuickbrand;
        bfState.sideMode = "brand";
        bfState.limit = 100;
        renderBrandFaqsView();
      })
    );
    root.querySelectorAll("[data-bf-copy]").forEach((b) =>
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const txt = b.dataset.bfCopy;
        if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
        b.textContent = "Copied";
        setTimeout(() => (b.textContent = "Copy"), 1100);
      })
    );
    root.querySelectorAll("[data-bf-row]").forEach((tr) =>
      tr.addEventListener("click", () => {
        const id = tr.dataset.bfRow;
        if (bfState.expanded.has(id)) bfState.expanded.delete(id);
        else bfState.expanded.add(id);
        renderBrandFaqsView();
      })
    );
  }

  function renderBrandsMatrix(root, kpiHtml, BF) {
    const rowsHtml = BF.brands
      .map(
        (b, idx) => `
        <tr>
          <td style="width:44px;color:var(--muted);">${idx + 1}</td>
          <td style="font-weight:700;color:var(--ink);">${esc(b.brand_name)}</td>
          <td style="color:var(--muted);font-size:13px;">${esc(b.segment)}</td>
          <td style="text-align:right;font-weight:700;">${b.kept}</td>
          <td style="text-align:right;">${b.t1}</td>
          <td style="text-align:right;">${b.t2}</td>
          <td style="text-align:right;">${b.variants.toLocaleString()}</td>
          <td>${renderSourceChips(b.sources)}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button type="button" class="mini-btn" data-open-bf-brand="${esc(b.slug)}" style="color:#0066cc;background:#eef5ff;font-weight:600;white-space:nowrap;">View FAQs &rarr;</button>
          </td>
        </tr>`
      )
      .join("");

    root.innerHTML = `
      ${kpiHtml}
      <div class="panel" style="padding:18px;">
        <h2 style="margin:0 0 12px;font-size:18px;">Brand &amp; Retailer FAQ Coverage Matrix (${BF.brands.length} Entities)</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Brand / Retailer</th>
                <th>Segment</th>
                <th style="text-align:right;">FAQs</th>
                <th style="text-align:right;">T1</th>
                <th style="text-align:right;">T2</th>
                <th style="text-align:right;">Variants</th>
                <th>Live Sources</th>
                <th style="text-align:right;">Explore</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
    root.querySelectorAll("[data-open-bf-brand]").forEach((btn) =>
      btn.addEventListener("click", () => openBrandFaqsForBrand(btn.dataset.openBfBrand))
    );
  }

  function renderAuditView(root, kpiHtml, BF) {
    const tab = bfState.auditTab;
    let bodyHtml = "";
    if (tab === "telemetry") {
      const stats = (BF.exhaustion && BF.exhaustion.sources_stats) || {};
      bodyHtml = `
        <table>
          <thead><tr><th>Live Source</th><th>Verified Harvest Telemetry</th></tr></thead>
          <tbody>
            ${Object.entries(stats)
              .map(([k, v]) => `<tr><td style="font-weight:700;">${esc(k)}</td><td style="font-family:monospace;font-size:12px;">${esc(JSON.stringify(v))}</td></tr>`)
              .join("")}
          </tbody>
        </table>`;
    } else if (tab === "excluded") {
      const rows = (BF.audit && BF.audit.excluded) || [];
      bodyHtml = `
        <table>
          <thead><tr><th>ID</th><th>Brand</th><th>Raw Query</th><th>Exclusion Reason</th></tr></thead>
          <tbody>
            ${rows.slice(0, 150).map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.brand_name)}</td><td>${esc(r.query)}</td><td style="color:var(--muted);font-size:12px;">${esc(r.reason)}</td></tr>`).join("")}
          </tbody>
        </table>`;
    } else {
      const rows = (BF.audit && BF.audit.merged) || [];
      bodyHtml = `
        <table>
          <thead><tr><th>ID</th><th>Brand</th><th>Merged Query</th><th>Canonical Target</th><th>Reason</th></tr></thead>
          <tbody>
            ${rows.slice(0, 150).map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.brand_name)}</td><td>${esc(r.query)}</td><td style="font-weight:600;">${esc(r.canonical_title)}</td><td style="color:var(--muted);font-size:12px;">${esc(r.reason)}</td></tr>`).join("")}
          </tbody>
        </table>`;
    }

    root.innerHTML = `
      ${kpiHtml}
      <div class="panel" style="padding:18px;">
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
          <button type="button" class="mini-btn" data-bf-aud="merged" style="${tab === "merged" ? "background:#0066cc;color:#fff;" : ""}">Merged Twins (${(BF.audit.merged || []).length})</button>
          <button type="button" class="mini-btn" data-bf-aud="excluded" style="${tab === "excluded" ? "background:#0066cc;color:#fff;" : ""}">Excluded Noise (${(BF.audit.excluded || []).length})</button>
          <button type="button" class="mini-btn" data-bf-aud="telemetry" style="${tab === "telemetry" ? "background:#0066cc;color:#fff;" : ""}">Live Multi-Source Telemetry</button>
        </div>
        <div class="table-wrap">${bodyHtml}</div>
      </div>
    `;
    root.querySelectorAll("[data-bf-aud]").forEach((btn) =>
      btn.addEventListener("click", () => { bfState.auditTab = btn.dataset.bfAud; renderBrandFaqsView(); })
    );
  }

  window.renderBrandFaqsView = renderBrandFaqsView;
})();
