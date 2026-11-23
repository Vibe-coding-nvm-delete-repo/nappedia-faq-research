/* =========================================================================
 * Nappedia Research > Brands Workspace (v2)
 * Renders Benchmarks & Averages, Brand Universe (1,376+ Active US + 68 Audit),
 * Brand Models Catalog (with clickable Brand -> Models cross-filter),
 * 50-Field Data Schema, and Sources & Discovery Exhaustion Log.
 * Universal 10 compliant (light shadows and subtle tints only).
 * ========================================================================= */
(function () {
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const fmtUsd = v => (typeof v === "number" && !Number.isNaN(v)) ? "$" + Math.round(v).toLocaleString() : "—";

  const TYPE_CLASS = {
    "Memory Foam": "t-foam",
    "Hybrid": "t-hybrid",
    "All-Latex": "t-latex",
    "Organic Hybrid": "t-organic",
    "Innerspring": "t-spring",
    "Air / Smart": "t-smart",
    "Gel Grid": "t-grid",
    "Crib / Kids": "t-crib",
    "RV / Custom": "t-rv",
    "Specialty (Crib)": "t-crib",
    "Medical / Alternating Pressure": "t-rv",
  };

  function typePill(t) {
    if (!t) return "—";
    const cls = TYPE_CLASS[t] || "t-default";
    return `<span class="b-type-pill ${cls}">${esc(t)}</span>`;
  }

  function fgPill(status) {
    if (status === "No") return `<span class="b-fg-pill fg-no">No</span>`;
    if (status === "Historical (Removed)") return `<span class="b-fg-pill fg-hist" title="Used fiberglass pre-2023/2024; phased out">Historical</span>`;
    if (status === "Yes") return `<span class="b-fg-pill fg-yes">Yes</span>`;
    return `<span class="b-muted">—</span>`;
  }

  function lawsuitPill(cnt) {
    if (cnt == null) return `<span class="b-muted">—</span>`;
    if (cnt === 0) return `<span class="b-law-pill law-zero">0</span>`;
    return `<span class="b-law-pill law-hit">${cnt}</span>`;
  }

  const bState = {
    sub: "benchmarks", // benchmarks | directory | models | schema | sources
    scope: "active",   // active | primary | directory | excluded
    q: "",
    seg: "",
    ftype: "",
    brk: "",
    fg: "",
    law: "",
    sort: "tier_name",
    limit: 100,
    expanded: new Set(),
    // Models tab state
    mBrand: "",
    mType: "",
    mQ: "",
    mSort: "brand_asc",
    mLimit: 120,
  };

  function copyStat(btn) {
    const txt = btn.dataset.copy || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
    const old = btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = old;
      btn.classList.remove("copied");
    }, 1200);
  }

  function jumpToBrandModels(brandSlug) {
    bState.mBrand = brandSlug || "";
    bState.mType = "";
    bState.mQ = "";
    bState.mLimit = 200;
    if (window.setBrandSub) {
      window.setBrandSub("models", false);
    } else {
      bState.sub = "models";
    }
    const h = brandSlug ? `#brands-models?brand=${encodeURIComponent(brandSlug)}` : "#brands-models";
    history.replaceState(null, "", h);
    window.renderBrandsWorkspace("models", brandSlug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderBenchmarks(root, data) {
    const bm = data.benchmarks;
    const c = bm.counts;
    const brkCard = bm.cards.find(x => x.id === "mandatory_breakin_rate") || {};
    const avgAllCard = bm.cards.find(x => x.id === "avg_queen_all") || {};
    const maxPrice = Math.max(...bm.by_construction_type.map(r => r.avg_sale_usd), 1);

    const groupsOrder = [
      "Pricing & Value",
      "Trial & Returns",
      "Warranty & Durability",
      "Safety & Certifications",
      "Ownership & Logistics",
    ];

    const groupedHtml = groupsOrder.map(grp => {
      const cards = bm.cards.filter(x => x.group === grp);
      if (!cards.length) return "";
      return `
        <div class="b-section-head">
          <h3>${esc(grp)}</h3>
          <span class="b-section-sub">Click "Copy Stat" on any card to paste a citation-ready sentence into Nappedia content</span>
        </div>
        <div class="b-cards-grid">
          ${cards.map(card => `
            <article class="b-stat-card">
              <div class="b-stat-top">
                <span class="b-stat-label">${esc(card.title)}</span>
                <span class="b-n-pill">n=${card.n}</span>
              </div>
              <div class="b-stat-val">${esc(card.headline)}</div>
              <div class="b-stat-sub">${esc(card.sub)}</div>
              ${card.snippet ? `
                <div class="b-stat-foot">
                  <button class="b-copy-btn" type="button" data-copy="${esc(card.snippet)}">Copy Stat</button>
                  <span class="b-stat-date">Verified ${esc(bm.verified_date)}</span>
                </div>
              ` : ""}
            </article>
          `).join("")}
        </div>
      `;
    }).join("");

    const distBarList = (title, obj, totalBase) => {
      const entries = Object.entries(obj || {});
      const maxV = Math.max(...entries.map(e => e[1]), 1);
      return `
        <div class="card b-dist-card">
          <div class="b-card-head">
            <h3>${esc(title)}</h3>
            <span class="b-n-pill">n=${totalBase}</span>
          </div>
          <div class="b-bars">
            ${entries.map(([k, v]) => {
              const p = totalBase ? ((v / totalBase) * 100).toFixed(1) : "0.0";
              const w = Math.max(4, Math.round((v / maxV) * 100));
              return `
                <div class="b-bar-row">
                  <div class="b-bar-lbl" title="${esc(k)}">${esc(k)}</div>
                  <div class="b-bar-track"><div class="b-bar-fill" style="width:${w}%"></div></div>
                  <div class="b-bar-num"><strong>${v}</strong> <span>(${p}%)</span></div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    };

    const brkTotal = Object.values(bm.breakin_distribution || {}).reduce((a, b) => a + b, 0);
    const trialTotal = Object.values(bm.trial_distribution || {}).reduce((a, b) => a + b, 0);
    const sagTotal = Object.values(bm.sag_distribution || {}).reduce((a, b) => a + b, 0);
    const parentTotal = c.primary_verified_brands;

    root.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Active US Mattress Brands</div>
          <div class="kpi-val">${c.active_us_brands.toLocaleString()}</div>
          <div class="kpi-sub">${c.total_discovered_entities.toLocaleString()} discovered · ${c.calrecycle_registered_brands || 0} CalRecycle CA-registered</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Primary-Verified &amp; Models</div>
          <div class="kpi-val">${c.primary_verified_brands} <span style="font-size:15px;color:var(--sub);font-family:Inter,sans-serif;font-weight:600;">(${(c.total_models_tracked || 0).toLocaleString()} models)</span></div>
          <div class="kpi-sub">Live official policy, fiberglass &amp; catalog scrape (${esc(bm.verified_date)})</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avg Queen Sale Price</div>
          <div class="kpi-val">${esc(avgAllCard.headline || "—")}</div>
          <div class="kpi-sub">Memory Foam ${fmtUsd((bm.by_construction_type.find(x => x.type === "Memory Foam") || {}).avg_sale_usd)} · Hybrid ${fmtUsd((bm.by_construction_type.find(x => x.type === "Hybrid") || {}).avg_sale_usd)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Force Mandatory Break-In</div>
          <div class="kpi-val">${esc(brkCard.headline || "—")}</div>
          <div class="kpi-sub">${esc((brkCard.sub || "").split("·")[1] || "Require 30+ day minimum sleep")}</div>
        </div>
      </div>

      <div class="card b-type-card">
        <div class="b-card-head">
          <div>
            <h3>Average Queen Price by Mattress Construction Type</h3>
            <p class="b-card-desc">Flagship Queen street/sale price vs. list MSRP across primary-verified US brands (zero unverified estimates in denominators).</p>
          </div>
          <span class="b-n-pill">n=${bm.by_construction_type.reduce((s, r) => s + r.n, 0)} verified</span>
        </div>
        <div class="b-table-wrap">
          <table class="b-table">
            <thead>
              <tr>
                <th>Construction Type</th>
                <th class="num">Verified (n)</th>
                <th class="num">Avg Queen Sale</th>
                <th class="num">Median Sale</th>
                <th>Sale Price Range</th>
                <th class="num">Avg MSRP</th>
                <th class="b-col-bar">Relative Price</th>
              </tr>
            </thead>
            <tbody>
              ${bm.by_construction_type.map(r => {
                const pctW = Math.max(8, Math.round((r.avg_sale_usd / maxPrice) * 100));
                return `
                  <tr>
                    <td>${typePill(r.type)}</td>
                    <td class="num">${r.n}</td>
                    <td class="num"><strong>${fmtUsd(r.avg_sale_usd)}</strong></td>
                    <td class="num">${fmtUsd(r.median_sale_usd)}</td>
                    <td>${fmtUsd(r.min_sale_usd)} – ${fmtUsd(r.max_sale_usd)}</td>
                    <td class="num">${fmtUsd(r.avg_msrp_usd)}</td>
                    <td class="b-col-bar"><div class="b-bar-track"><div class="b-bar-fill b-fill-teal" style="width:${pctW}%"></div></div></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      ${groupedHtml}

      <div class="b-dist-grid">
        ${distBarList("Mandatory Break-In Period Distribution", bm.breakin_distribution, brkTotal)}
        ${distBarList("Sleep Trial Length Distribution", bm.trial_distribution, trialTotal)}
        ${distBarList("Warranty Sag Threshold Distribution", bm.sag_distribution, sagTotal)}
        ${distBarList("Active US Brands by Market Segment", bm.segment_counts_all_active, c.active_us_brands)}
        ${distBarList("Parent Company Concentration (Core 80)", bm.parent_company_counts, parentTotal)}
        ${distBarList("Third-Party Certification Adoption (Core 80)", bm.certification_counts, parentTotal)}
      </div>
    `;

    root.querySelectorAll(".b-copy-btn").forEach(btn => {
      btn.addEventListener("click", () => copyStat(btn));
    });
  }

  function filterBrands(allBrands) {
    let rows = allBrands.filter(b => {
      if (bState.scope === "active") return b.us_active_status === "Active US";
      if (bState.scope === "primary") return b.verification_tier === "PRIMARY_VERIFIED";
      if (bState.scope === "directory") return b.us_active_status === "Active US" && b.verification_tier !== "PRIMARY_VERIFIED";
      if (bState.scope === "excluded") return b.us_active_status !== "Active US";
      return true;
    });

    if (bState.q) {
      const ql = bState.q.toLowerCase();
      rows = rows.filter(b =>
        (b.brand_name || "").toLowerCase().includes(ql) ||
        (b.parent_company || "").toLowerCase().includes(ql) ||
        (b.flagship_model || "").toLowerCase().includes(ql) ||
        (b.market_segment || "").toLowerCase().includes(ql) ||
        (b.fiberglass_exact_name || "").toLowerCase().includes(ql) ||
        (b.hq_location || "").toLowerCase().includes(ql) ||
        (b.certifications || []).join(" ").toLowerCase().includes(ql)
      );
    }
    if (bState.seg) rows = rows.filter(b => b.market_segment === bState.seg);
    if (bState.ftype) rows = rows.filter(b => b.flagship_type === bState.ftype || (b.types_offered || []).includes(bState.ftype));
    if (bState.brk === "30plus") rows = rows.filter(b => typeof b.mandatory_break_in_days === "number" && b.mandatory_break_in_days >= 30);
    else if (bState.brk === "any") rows = rows.filter(b => b.mandatory_break_in_required === true);
    else if (bState.brk === "none") rows = rows.filter(b => b.mandatory_break_in_required === false);

    if (bState.fg === "no") rows = rows.filter(b => b.fiberglass_status === "No");
    else if (bState.fg === "hist") rows = rows.filter(b => b.fiberglass_status === "Historical (Removed)" || b.fiberglass_status === "Yes");

    if (bState.law === "any") rows = rows.filter(b => typeof b.lawsuit_count === "number" && b.lawsuit_count > 0);
    else if (bState.law === "zero") rows = rows.filter(b => b.lawsuit_count === 0);

    rows = rows.slice().sort((a, b) => {
      if (bState.sort === "name_asc") return (a.brand_name || "").localeCompare(b.brand_name || "");
      if (bState.sort === "price_asc") return (a.queen_sale_usd ?? 999999) - (b.queen_sale_usd ?? 999999);
      if (bState.sort === "price_desc") return (b.queen_sale_usd ?? -1) - (a.queen_sale_usd ?? -1);
      if (bState.sort === "models_desc") return (b.models_count ?? 0) - (a.models_count ?? 0);
      if (bState.sort === "lawsuits_desc") return (b.lawsuit_count ?? -1) - (a.lawsuit_count ?? -1);
      if (bState.sort === "founded_asc") return (a.founded_year ?? 9999) - (b.founded_year ?? 9999);
      const ta = a.verification_tier === "PRIMARY_VERIFIED" ? 0 : 1;
      const tb = b.verification_tier === "PRIMARY_VERIFIED" ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return (a.brand_name || "").localeCompare(b.brand_name || "");
    });
    return rows;
  }

  function renderBrandDrawer(b) {
    if (b.verification_tier !== "PRIMARY_VERIFIED") {
      return `
        <div class="b-drawer">
          <div class="b-drawer-grid">
            <div>
              <h4>Discovery &amp; Classification</h4>
              <p><strong>Status:</strong> ${esc(b.us_active_status)} (${esc(b.verification_tier)}) ${b.calrecycle_registered ? '<span class="b-cal-badge">CalRecycle CA-Reg</span>' : ""}</p>
              <p><strong>Market Segment:</strong> ${esc(b.market_segment)} · <strong>Sales Channel:</strong> ${esc(b.sales_channel || "—")}</p>
              <p><strong>Parent / Account:</strong> ${esc(b.parent_company || "Unverified")} · <strong>HQ:</strong> ${esc(b.hq_location || "—")}</p>
              ${b.audit_reason ? `<p><strong>Audit Note:</strong> ${esc(b.audit_reason)}</p>` : ""}
            </div>
            <div>
              <h4>Discovery Provenance &amp; Next Step</h4>
              <p><strong>Discovered Via:</strong> ${(b.discovery_sources || []).map(s => `<span class="pill p-search">${esc(s)}</span>`).join(" ")}</p>
              <p><strong>Types Offered:</strong> ${(b.types_offered || []).map(t => typePill(t)).join(" ") || "—"}</p>
              <p><strong>Reference Link:</strong> <a href="${esc(b.website_url)}" target="_blank" rel="noopener">${esc(b.website_url)} &#8599;</a></p>
            </div>
          </div>
        </div>
      `;
    }
    const warStr = b.is_lifetime_warranty ? "Lifetime" : (b.warranty_years ? `${b.warranty_years} years` : "Unverified");
    const spread = (b.queen_msrp_usd && b.queen_sale_usd)
      ? Math.round(((b.queen_msrp_usd - b.queen_sale_usd) / b.queen_msrp_usd) * 100) + "% off MSRP"
      : "—";
    const ev = b.live_evidence_snippets || {};
    const quotes = [...(ev.breakin || []), ...(ev.sag || []), ...(ev.slat || []), ...(ev.return_fee || [])].slice(0, 3);

    return `
      <div class="b-drawer">
        <div class="b-drawer-grid">
          <div>
            <h4>Pricing, Ownership &amp; Models</h4>
            <p><strong>Flagship Priced:</strong> ${esc(b.flagship_model || "—")} ${typePill(b.flagship_type)}</p>
            <p><strong>Queen Price:</strong> <strong>${fmtUsd(b.queen_sale_usd)}</strong> sale · ${fmtUsd(b.queen_msrp_usd)} MSRP (${esc(spread)})</p>
            <p><strong>Parent Company:</strong> ${esc(b.parent_company || "Independent")} · <strong>Founded:</strong> ${b.founded_year || "—"} · ${esc(b.hq_location || "—")}</p>
            <p><strong>Manufacturing:</strong> ${esc(b.made_in_usa || "Unverified")} · <strong>Split King:</strong> ${b.offers_split_king ? "Yes" : "No"} · <strong>Flippable:</strong> ${b.offers_flippable_or_dual ? "Yes" : "No"}</p>
            <p><strong>White-Glove:</strong> ${b.white_glove_available ? (b.white_glove_fee_usd === 0 ? "Free" : fmtUsd(b.white_glove_fee_usd)) : "Not offered"} · <strong>0% APR Financing:</strong> ${b.financing_zero_apr ? "Yes" : "No"} · <strong>Models:</strong> <button class="b-model-link" type="button" data-jump-brand="${esc(b.slug)}">View ${b.models_count || 0} models &#8594;</button></p>
          </div>
          <div>
            <h4>Trial, Warranty, Fiberglass &amp; Lawsuits</h4>
            <p><strong>Sleep Trial:</strong> ${b.trial_nights ? b.trial_nights + " nights" : "No brand trial"} · <strong>Mandatory Break-In:</strong> ${b.mandatory_break_in_required ? `Yes (${b.mandatory_break_in_days} days)` : "No (0 days)"} · <strong>Returns:</strong> ${b.free_returns ? "Free ($0)" : (b.return_fee_usd ? fmtUsd(b.return_fee_usd) + " fee" : "Fee / Exchange")}</p>
            <p><strong>Warranty:</strong> ${esc(warStr)} · <strong>Non-Prorated:</strong> ${b.non_prorated_years ? b.non_prorated_years + " yrs" : "—"} · <strong>Sag Threshold:</strong> ${b.sag_threshold_inches ? b.sag_threshold_inches + '"' : "—"} · <strong>Max Slat Gap:</strong> ${b.max_slat_spacing_inches ? b.max_slat_spacing_inches + '"' : "—"}</p>
            <p><strong>Fiberglass:</strong> ${fgPill(b.fiberglass_status)} · <strong>Exact Material Spec:</strong> ${esc(b.fiberglass_exact_name || b.fire_barrier_type || "Undisclosed")}</p>
            <p><strong>Documented Lawsuits / FTC Actions (${b.lawsuit_count ?? 0}):</strong> ${esc(b.lawsuit_summary || "None documented.")}</p>
            <p><strong>Certifications:</strong> ${(b.certifications || []).length ? b.certifications.map(c => `<span class="pill p-study">${esc(c)}</span>`).join(" ") : "None disclosed"}</p>
          </div>
        </div>
        ${quotes.length ? `
          <div class="b-quotes">
            <strong>Live Scraped Verbatim Policy Evidence (${esc(b.verified_date)}):</strong>
            ${quotes.map(q => `<div class="b-quote-item">"${esc(q)}"</div>`).join("")}
          </div>
        ` : ""}
        <div class="b-sources-strip">
          <strong>Primary Sources:</strong>
          ${(b.source_urls || []).slice(0, 4).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48))} &#8599;</a>`).join(" · ")}
        </div>
      </div>
    `;
  }

  function renderDirectory(root, data) {
    const c = data.benchmarks.counts;
    const allSegs = [...new Set(data.brands.filter(b => b.us_active_status === "Active US").map(b => b.market_segment))].sort();
    const allTypes = ["Memory Foam", "Hybrid", "Innerspring", "All-Latex", "Organic Hybrid", "Air / Smart", "Gel Grid", "Crib / Kids", "RV / Custom"];

    root.innerHTML = `
      <div class="b-scope-bar">
        <button class="b-scope-pill ${bState.scope === "active" ? "active" : ""}" data-scope="active" type="button">All Active US <span>${c.active_us_brands.toLocaleString()}</span></button>
        <button class="b-scope-pill ${bState.scope === "primary" ? "active" : ""}" data-scope="primary" type="button">Primary-Verified Core <span>${c.primary_verified_brands}</span></button>
        <button class="b-scope-pill ${bState.scope === "directory" ? "active" : ""}" data-scope="directory" type="button">Directory &amp; CalRecycle Queue <span>${c.directory_queued_brands.toLocaleString()}</span></button>
        <button class="b-scope-pill ${bState.scope === "excluded" ? "active" : ""}" data-scope="excluded" type="button">Excluded Audit Log <span>${c.discontinued_or_non_us}</span></button>
      </div>

      <div class="card">
        <div class="b-controls">
          <input id="bSearch" class="b-input" type="search" placeholder="Search brand, parent, model, fiberglass, city/state..." value="${esc(bState.q)}">
          <select id="bSeg" class="b-select" aria-label="Market Segment">
            <option value="">All Segments</option>
            ${allSegs.map(s => `<option value="${esc(s)}" ${bState.seg === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
          </select>
          <select id="bType" class="b-select" aria-label="Mattress Type">
            <option value="">All Types</option>
            ${allTypes.map(t => `<option value="${esc(t)}" ${bState.ftype === t ? "selected" : ""}>${esc(t)}</option>`).join("")}
          </select>
          <select id="bBrk" class="b-select" aria-label="Mandatory Break-In">
            <option value="">Break-In: All</option>
            <option value="30plus" ${bState.brk === "30plus" ? "selected" : ""}>Forces 30+ Day Break-In</option>
            <option value="any" ${bState.brk === "any" ? "selected" : ""}>Any Forced Break-In</option>
            <option value="none" ${bState.brk === "none" ? "selected" : ""}>No Mandatory Wait (0d)</option>
          </select>
          <select id="bFg" class="b-select" aria-label="Fiberglass">
            <option value="">Fiberglass: All</option>
            <option value="no" ${bState.fg === "no" ? "selected" : ""}>Fiberglass-Free (No)</option>
            <option value="hist" ${bState.fg === "hist" ? "selected" : ""}>Historical / Yes</option>
          </select>
          <select id="bLaw" class="b-select" aria-label="Lawsuits">
            <option value="">Lawsuits: All</option>
            <option value="any" ${bState.law === "any" ? "selected" : ""}>Has Lawsuits / FTC (1+)</option>
            <option value="zero" ${bState.law === "zero" ? "selected" : ""}>0 Documented</option>
          </select>
          <select id="bSort" class="b-select" aria-label="Sort Brands">
            <option value="tier_name" ${bState.sort === "tier_name" ? "selected" : ""}>Sort: Verified First</option>
            <option value="name_asc" ${bState.sort === "name_asc" ? "selected" : ""}>Sort: Name A–Z</option>
            <option value="models_desc" ${bState.sort === "models_desc" ? "selected" : ""}>Sort: Most Models</option>
            <option value="price_asc" ${bState.sort === "price_asc" ? "selected" : ""}>Sort: Queen Price Low–High</option>
            <option value="price_desc" ${bState.sort === "price_desc" ? "selected" : ""}>Sort: Queen Price High–Low</option>
            <option value="lawsuits_desc" ${bState.sort === "lawsuits_desc" ? "selected" : ""}>Sort: Most Lawsuits</option>
            <option value="founded_asc" ${bState.sort === "founded_asc" ? "selected" : ""}>Sort: Oldest Brand First</option>
          </select>
        </div>

        <div class="b-table-wrap">
          <table class="b-table" id="bDirTable">
            <thead>
              <tr>
                <th>Brand</th>
                <th class="num b-col-hide-md">Est.</th>
                <th class="b-col-seg-hide-sm">Type</th>
                <th class="b-col-hide-sm">Models</th>
                <th class="num">Queen</th>
                <th class="b-col-hide-sm">Trial / Wait</th>
                <th class="b-col-hide-md">Fiberglass</th>
                <th class="num b-col-hide-md">Lawsuits</th>
                <th class="b-col-hide-md">Warranty</th>
              </tr>
            </thead>
            <tbody id="bDirTbody"></tbody>
          </table>
        </div>
        <div class="b-foot" id="bDirFoot"></div>
      </div>
    `;

    function renderTableOnly() {
      const rows = filterBrands(data.brands);
      const shown = rows.slice(0, bState.limit);
      const tbody = document.getElementById("bDirTbody");
      if (!shown.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--sub);">No brands match your current filters.</td></tr>`;
      } else {
        tbody.innerHTML = shown.map(b => {
          const isOpen = bState.expanded.has(b.slug);
          const tierDot = b.verification_tier === "PRIMARY_VERIFIED"
            ? `<span class="dot-done" title="Primary-Verified Core Dossier"></span>`
            : `<span class="b-dot-dir" title="${esc(b.verification_tier)}"></span>`;
          const warLbl = b.is_lifetime_warranty ? "Lifetime" : (b.warranty_years ? `${b.warranty_years} yr` : "—");
          const brkTag = b.mandatory_break_in_required === true
            ? `<span class="pill p-forum">${b.mandatory_break_in_days}d wait</span>`
            : (b.mandatory_break_in_required === false ? `<span class="pill p-study">0d</span>` : "");
          const trialCell = b.trial_nights != null
            ? `${b.trial_nights === 0 ? "None" : b.trial_nights + "n"} ${brkTag}`
            : "—";
          const modelsCell = (b.models_count && b.models_count > 0)
            ? `<button class="b-model-link" type="button" data-jump-brand="${esc(b.slug)}">${b.models_count} ${b.models_count === 1 ? "model" : "models"} &#8594;</button>`
            : `<span class="b-muted">—</span>`;
          const calTag = b.calrecycle_registered ? ` <span class="b-cal-badge" title="Registered in California CalRecycle Oct 2026 Registry">CA</span>` : "";

          return `
            <tr class="b-data-row ${isOpen ? "open" : ""}" data-slug="${esc(b.slug)}" tabindex="0">
              <td>
                <div class="b-name-cell">${tierDot} <strong>${esc(b.brand_name)}</strong>${calTag}</div>
                <div class="b-name-sub">${esc(b.parent_company || (b.verification_tier === "PRIMARY_VERIFIED" ? "Independent" : (b.discovery_sources || [])[0] || ""))} · ${esc(b.market_segment)}</div>
              </td>
              <td class="num b-col-hide-md">${b.founded_year || "—"}</td>
              <td class="b-col-seg-hide-sm">${typePill(b.flagship_type || (b.types_offered || [])[0])}</td>
              <td class="b-col-hide-sm">${modelsCell}</td>
              <td class="num"><strong>${fmtUsd(b.queen_sale_usd)}</strong></td>
              <td class="b-col-hide-sm">${trialCell}</td>
              <td class="b-col-hide-md">${fgPill(b.fiberglass_status)}</td>
              <td class="num b-col-hide-md">${lawsuitPill(b.lawsuit_count)}</td>
              <td class="b-col-hide-md">${esc(warLbl)}</td>
            </tr>
            ${isOpen ? `<tr class="b-drawer-row"><td colspan="9">${renderBrandDrawer(b)}</td></tr>` : ""}
          `;
        }).join("");

        tbody.querySelectorAll(".b-model-link").forEach(btn => {
          btn.addEventListener("click", e => {
            e.stopPropagation();
            jumpToBrandModels(btn.dataset.jumpBrand);
          });
        });

        tbody.querySelectorAll("tr.b-data-row").forEach(tr => {
          const toggle = () => {
            const s = tr.dataset.slug;
            if (bState.expanded.has(s)) bState.expanded.delete(s);
            else bState.expanded.add(s);
            renderTableOnly();
          };
          tr.addEventListener("click", toggle);
          tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
        });
      }

      const foot = document.getElementById("bDirFoot");
      foot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${rows.length.toLocaleString()} matching brands</span>`
        + (shown.length < rows.length ? `<button class="load-btn" type="button" id="bLoadAll">Show all ${rows.length.toLocaleString()}</button>` : "");
      const btn = document.getElementById("bLoadAll");
      if (btn) btn.addEventListener("click", () => { bState.limit = rows.length; renderTableOnly(); });
    }

    root.querySelectorAll(".b-scope-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        bState.scope = btn.dataset.scope;
        bState.limit = 100;
        bState.expanded.clear();
        renderDirectory(root, data);
      });
    });
    document.getElementById("bSearch").addEventListener("input", e => { bState.q = e.target.value; bState.limit = 100; renderTableOnly(); });
    document.getElementById("bSeg").addEventListener("change", e => { bState.seg = e.target.value; bState.limit = 100; renderTableOnly(); });
    document.getElementById("bType").addEventListener("change", e => { bState.ftype = e.target.value; bState.limit = 100; renderTableOnly(); });
    document.getElementById("bBrk").addEventListener("change", e => { bState.brk = e.target.value; bState.limit = 100; renderTableOnly(); });
    document.getElementById("bFg").addEventListener("change", e => { bState.fg = e.target.value; bState.limit = 100; renderTableOnly(); });
    document.getElementById("bLaw").addEventListener("change", e => { bState.law = e.target.value; bState.limit = 100; renderTableOnly(); });
    document.getElementById("bSort").addEventListener("change", e => { bState.sort = e.target.value; renderTableOnly(); });

    renderTableOnly();
  }

  function renderModels(root, data) {
    const models = data.models || [];
    const brandsMap = new Map();
    models.forEach(m => { if (!brandsMap.has(m.brand_slug)) brandsMap.set(m.brand_slug, m.brand_name); });
    const brandOpts = [...brandsMap.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const typeOpts = [...new Set(models.map(m => m.model_type).filter(Boolean))].sort();
    const activeBrandName = bState.mBrand ? (brandsMap.get(bState.mBrand) || bState.mBrand) : "";

    root.innerHTML = `
      ${activeBrandName ? `
        <div class="b-filter-banner">
          <span>Filtered to brand: <strong>${esc(activeBrandName)}</strong></span>
          <button class="b-copy-btn" type="button" id="mClearBrand">Show All Brands</button>
        </div>
      ` : ""}
      <div class="card">
        <div class="b-controls">
          <input id="mSearch" class="b-input" type="search" placeholder="Search model name or brand..." value="${esc(bState.mQ)}">
          <select id="mBrandSel" class="b-select" aria-label="Filter by Brand">
            <option value="">All Brands (${brandOpts.length})</option>
            ${brandOpts.map(([sl, nm]) => `<option value="${esc(sl)}" ${bState.mBrand === sl ? "selected" : ""}>${esc(nm)}</option>`).join("")}
          </select>
          <select id="mTypeSel" class="b-select" aria-label="Filter by Type">
            <option value="">All Construction Types</option>
            ${typeOpts.map(t => `<option value="${esc(t)}" ${bState.mType === t ? "selected" : ""}>${esc(t)}</option>`).join("")}
          </select>
          <select id="mSortSel" class="b-select" aria-label="Sort Models">
            <option value="brand_asc" ${bState.mSort === "brand_asc" ? "selected" : ""}>Sort: Brand A–Z</option>
            <option value="model_asc" ${bState.mSort === "model_asc" ? "selected" : ""}>Sort: Model A–Z</option>
            <option value="price_asc" ${bState.mSort === "price_asc" ? "selected" : ""}>Sort: Queen Price Low–High</option>
            <option value="price_desc" ${bState.mSort === "price_desc" ? "selected" : ""}>Sort: Queen Price High–Low</option>
          </select>
        </div>

        <div class="b-table-wrap">
          <table class="b-table" id="mTable">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Model Name</th>
                <th>Type</th>
                <th class="num">Queen Price</th>
                <th class="b-col-hide-sm">Catalog Source</th>
                <th class="b-col-hide-sm">Official Link</th>
              </tr>
            </thead>
            <tbody id="mTbody"></tbody>
          </table>
        </div>
        <div class="b-foot" id="mFoot"></div>
      </div>
    `;

    function renderModelsTableOnly() {
      let rows = models.slice();
      if (bState.mBrand) rows = rows.filter(m => m.brand_slug === bState.mBrand);
      if (bState.mType) rows = rows.filter(m => m.model_type === bState.mType);
      if (bState.mQ) {
        const ql = bState.mQ.toLowerCase();
        rows = rows.filter(m => (m.model_name || "").toLowerCase().includes(ql) || (m.brand_name || "").toLowerCase().includes(ql));
      }
      rows.sort((a, b) => {
        if (bState.mSort === "model_asc") return (a.model_name || "").localeCompare(b.model_name || "");
        if (bState.mSort === "price_asc") return (a.queen_price_usd ?? 999999) - (b.queen_price_usd ?? 999999);
        if (bState.mSort === "price_desc") return (b.queen_price_usd ?? -1) - (a.queen_price_usd ?? -1);
        const bc = (a.brand_name || "").localeCompare(b.brand_name || "");
        return bc !== 0 ? bc : (a.model_name || "").localeCompare(b.model_name || "");
      });

      const shown = rows.slice(0, bState.mLimit);
      const tbody = document.getElementById("mTbody");
      if (!shown.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--sub);">No models match your current filter.</td></tr>`;
      } else {
        tbody.innerHTML = shown.map(m => `
          <tr>
            <td><strong>${esc(m.brand_name)}</strong></td>
            <td>${esc(m.model_name)}</td>
            <td>${typePill(m.model_type)}</td>
            <td class="num"><strong>${fmtUsd(m.queen_price_usd)}</strong></td>
            <td class="b-col-hide-sm"><span class="b-muted">${esc(m.source || "")}</span></td>
            <td class="b-col-hide-sm"><a href="${esc(m.url)}" target="_blank" rel="noopener">View &#8599;</a></td>
          </tr>
        `).join("");
      }

      const foot = document.getElementById("mFoot");
      foot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${rows.length.toLocaleString()} models</span>`
        + (shown.length < rows.length ? `<button class="load-btn" type="button" id="mLoadAll">Show all ${rows.length.toLocaleString()}</button>` : "");
      const btn = document.getElementById("mLoadAll");
      if (btn) btn.addEventListener("click", () => { bState.mLimit = rows.length; renderModelsTableOnly(); });
    }

    const clr = document.getElementById("mClearBrand");
    if (clr) clr.addEventListener("click", () => {
      bState.mBrand = "";
      history.replaceState(null, "", "#brands-models");
      renderModels(root, data);
    });
    document.getElementById("mSearch").addEventListener("input", e => { bState.mQ = e.target.value; renderModelsTableOnly(); });
    document.getElementById("mBrandSel").addEventListener("change", e => {
      bState.mBrand = e.target.value;
      history.replaceState(null, "", bState.mBrand ? `#brands-models?brand=${encodeURIComponent(bState.mBrand)}` : "#brands-models");
      renderModels(root, data);
    });
    document.getElementById("mTypeSel").addEventListener("change", e => { bState.mType = e.target.value; renderModelsTableOnly(); });
    document.getElementById("mSortSel").addEventListener("change", e => { bState.mSort = e.target.value; renderModelsTableOnly(); });

    renderModelsTableOnly();
  }

  function renderSchema(root, data) {
    const pv = data.brands.filter(b => b.verification_tier === "PRIMARY_VERIFIED");
    const fillFor = key => {
      if (!pv.length) return 0;
      const n = pv.filter(b => {
        const v = b[key];
        if (v === null || v === undefined || v === "" || v === "Unverified" || v === "Undisclosed") return false;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length;
      return Math.round((n / pv.length) * 100);
    };

    root.innerHTML = `
      <div class="card b-intro-card">
        <h3>Nappedia Brand Intelligence Data Schema (${data.meta.schema_field_count} Fields across ${data.meta.schema_domain_count} Domains)</h3>
        <p class="b-card-desc">Every field is engineered to power defensible, sample-size-transparent statistics inside Nappedia brand reviews, comparisons, and buyer FAQs. Live fill rates below reflect verified non-null coverage across the ${pv.length} primary-verified core brands.</p>
      </div>
      ${data.schema_domains.map(dom => `
        <div class="card b-schema-card">
          <div class="b-card-head">
            <div>
              <h3>${esc(dom.name)}</h3>
              <p class="b-card-desc">${esc(dom.why_it_matters)}</p>
            </div>
            <span class="b-n-pill">${dom.fields.length} fields</span>
          </div>
          <div class="b-table-wrap">
            <table class="b-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Key</th>
                  <th>Type / Unit</th>
                  <th>Example</th>
                  <th class="num">Core Fill %</th>
                  <th>Nappedia Content Use</th>
                </tr>
              </thead>
              <tbody>
                ${dom.fields.map(f => {
                  const pct = fillFor(f.key);
                  return `
                    <tr>
                      <td><strong>${esc(f.label)}</strong></td>
                      <td><code>${esc(f.key)}</code></td>
                      <td>${esc(f.type)} <span class="b-muted">(${esc(f.unit)})</span></td>
                      <td>${esc(f.example)}</td>
                      <td class="num"><strong>${pct}%</strong></td>
                      <td>${esc(f.content_use)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `).join("")}
    `;
  }

  function renderSources(root, data) {
    const c = data.benchmarks.counts;
    const rounds = data.discovery_rounds || [];
    root.innerHTML = `
      <div class="card b-intro-card">
        <h3>Independent Discovery &amp; 90/10 Exhaustion Proof</h3>
        <p class="b-card-desc">
          <strong>Zero StandardCommand Data Used:</strong> This entire US mattress brand universe (${c.active_us_brands.toLocaleString()} active US brands + ${c.discontinued_or_non_us} audited non-active/non-US entities) was discovered independently from California's statutory CalRecycle registry (Oct 13, 2026), GoodBed, 10 review/lab indexes, live Google+Bing A–Z autocomplete, and niche verticals.
        </p>
        <p class="b-card-desc" style="margin-top:8px;">
          <strong>Strict Denominator Integrity:</strong> Every average and percentage in the Benchmarks tab is computed deterministically in Python strictly over verified, non-null primary records (with explicit <code>n=X</code> badges). Undisclosed or blocked fields remain <code>null</code> and never pollute averages.
        </p>
      </div>

      ${rounds.length ? `
        <div class="card b-schema-card">
          <div class="b-card-head">
            <h3>Multi-Round Discovery Exhaustion Log</h3>
            <span class="b-n-pill">${rounds.length} angles logged</span>
          </div>
          <div class="b-table-wrap">
            <table class="b-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Sources &amp; Angles Harvested</th>
                  <th class="num">New Active Added</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rounds.map(r => `
                  <tr>
                    <td><strong>${esc(r.round)}</strong></td>
                    <td>${esc(r.sources)}</td>
                    <td class="num"><strong>+${(r.new_active_added || 0).toLocaleString()}</strong></td>
                    <td><span class="pill ${r.status.startsWith("BLOCKED") ? "p-forum" : "p-study"}">${esc(r.status)}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}

      <div class="card b-schema-card">
        <div class="b-card-head">
          <h3>Primary &amp; Directory Research Sources (${data.research_sources.length})</h3>
          <span class="b-n-pill">Verified ${esc(data.meta.verified_date)}</span>
        </div>
        <div class="b-table-wrap">
          <table class="b-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Role in US Brand Discovery &amp; Verification</th>
              </tr>
            </thead>
            <tbody>
              ${data.research_sources.map(s => `
                <tr>
                  <td><strong><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} &#8599;</a></strong></td>
                  <td><span class="pill p-search">${esc(s.type)}</span></td>
                  <td>${esc(s.role)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  window.renderBrandsWorkspace = function (subTab, brandFilterSlug) {
    const data = window.NAPPEDIA_BRANDS;
    const root = document.getElementById("brandsContent");
    if (!root || !data) return;
    if (subTab) bState.sub = subTab;
    if (typeof brandFilterSlug === "string") bState.mBrand = brandFilterSlug;

    document.querySelectorAll("#brandTabs .cat-tab").forEach(btn => {
      const act = btn.dataset.bsub === bState.sub;
      btn.classList.toggle("active", act);
      btn.setAttribute("aria-selected", act ? "true" : "false");
    });

    if (bState.sub === "benchmarks") renderBenchmarks(root, data);
    else if (bState.sub === "directory") renderDirectory(root, data);
    else if (bState.sub === "models") renderModels(root, data);
    else if (bState.sub === "schema") renderSchema(root, data);
    else if (bState.sub === "sources") renderSources(root, data);
  };
})();
