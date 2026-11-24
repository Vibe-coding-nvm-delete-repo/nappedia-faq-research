/* =========================================================================
 * Nappedia Research > Brands Workspace (v3 — Ultra-Low Latency Edition)
 * - Persistent lazy-mounted panels (<2ms tab switching, zero DOM rebuilds)
 * - 1-click column-header sorting on ALL tables (Brands, Models, Manufacturers)
 *   with null-always-last sorting & live asc/desc arrows
 * - Single delegated listeners on thead/tbody + pre-indexed search/sort keys
 * - Never excludes Discontinued brands: every brand stays in Brand Universe
 *   with color-coded Status badges (Active / Discontinued / Non-US)
 * - Universal 10 compliant (light shadows and soft tints only)
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

  const MFR_TYPE_CLASS = {
    "Major Conglomerate": "t-smart",
    "Vertically Integrated D2C": "t-hybrid",
    "OEM / Private-Label": "t-foam",
    "Regional Factory-Direct": "t-organic",
    "Luxury Artisan": "t-spring",
    "Foam / Latex / Coil Supplier": "t-grid",
    "Medical / Specialty": "t-crib",
    "International Importer": "t-rv",
  };

  function typePill(t) {
    if (!t) return "—";
    return `<span class="b-type-pill ${TYPE_CLASS[t] || "t-default"}">${esc(t)}</span>`;
  }

  function statusPill(st) {
    if (st === "Active US") return `<span class="b-st-pill st-active">Active</span>`;
    if (st === "Discontinued / Defunct") return `<span class="b-st-pill st-disc">Discontinued</span>`;
    if (st === "Non-US / Canada-Only") return `<span class="b-st-pill st-nonus">Non-US</span>`;
    return `<span class="b-st-pill st-nonus">${esc(st || "—")}</span>`;
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

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // Null-always-last comparator (keeps missing/blank cells at bottom on BOTH asc and desc)
  function cmpNullable(a, b, dir, isStr) {
    const aNull = (a === null || a === undefined || a === "");
    const bNull = (b === null || b === undefined || b === "");
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    const c = isStr ? String(a).localeCompare(String(b)) : (a - b);
    return dir === "asc" ? c : -c;
  }

  // Pre-index all arrays ONCE on first access for <5ms filtering & sorting
  let indexed = false;
  function ensureIndexed(data) {
    if (indexed) return;
    indexed = true;
    (data.brands || []).forEach(b => {
      b._q = (
        (b.brand_name || "") + " " + (b.parent_company || "") + " " + (b.flagship_model || "") + " " +
        (b.market_segment || "") + " " + (b.fiberglass_exact_name || "") + " " + (b.hq_location || "") + " " +
        (b.us_active_status || "") + " " + (b.certifications || []).join(" ")
      ).toLowerCase();
      b._type = b.flagship_type || (b.types_offered || [])[0] || "";
      b._warNum = b.is_lifetime_warranty ? 999 : (typeof b.warranty_years === "number" ? b.warranty_years : null);
      b._fgRank = b.fiberglass_status === "No" ? 0 : (b.fiberglass_status === "Historical (Removed)" ? 1 : (b.fiberglass_status === "Yes" ? 2 : null));
      b._hasData = (b.verification_tier === "PRIMARY_VERIFIED" || b.verification_tier === "ENRICHED_LIVE") ? 1 : 0;
      b._tierRank = b.verification_tier === "PRIMARY_VERIFIED" ? 0 : (b.verification_tier === "ENRICHED_LIVE" ? 1 : 2);
    });
    (data.models || []).forEach(m => {
      m._q = ((m.brand_name || "") + " " + (m.model_name || "") + " " + (m.model_type || "")).toLowerCase();
    });
    (data.manufacturers || []).forEach(m => {
      m._q = ((m.manufacturer_name || "") + " " + (m.dba_name || "") + " " + (m.brands_made || "") + " " + (m.city || "") + " " + (m.state || "") + " " + (m.notes || "")).toLowerCase();
      m._loc = [m.city, m.state, m.country !== "USA" ? m.country : ""].filter(Boolean).join(", ") || m.country || "";
    });
  }

  const bState = {
    sub: "benchmarks",
    // Brand Universe state
    scope: "all",      // all | enriched | needs_scrape | discontinued
    statusFilter: "",  // "" | Active US | Discontinued / Defunct | Non-US / Canada-Only
    q: "",
    seg: "",
    ftype: "",
    brk: "",
    fg: "",
    law: "",
    sortCol: "tier",   // tier | name | status | founded | type | models | price | trial | fg | lawsuits | warranty
    sortDir: "asc",
    limit: 100,
    expanded: new Set(),
    // Models tab state
    mBrand: "",
    mType: "",
    mQ: "",
    mSortCol: "brand", // brand | model | type | price
    mSortDir: "asc",
    mLimit: 120,
    // Manufacturers tab state
    mfQ: "",
    mfType: "",
    mfCountry: "",
    mfState: "",
    mfSortCol: "major", // major | name | type | founded | loc
    mfSortDir: "asc",
    mfLimit: 120,
    // Brand FAQ Types tab state
    ftScope: "all",     // all | top8 | zero_hub | hi_vol | hi_conv | no_overlap
    ftCat: "",
    ftLevel: "",
    ftQ: "",
    ftSortCol: "avg",   // id | template | category | applies_to | vol | conv | avg | hub_pages | competes
    ftSortDir: "desc",
  };

  const mounted = {};
  let panelsCreated = false;

  function ensurePanels(root) {
    if (panelsCreated) return;
    panelsCreated = true;
    root.innerHTML = `
      <div id="bpanel-benchmarks" style="display:none;"></div>
      <div id="bpanel-analytics" style="display:none;"></div>
      <div id="bpanel-directory" style="display:none;"></div>
      <div id="bpanel-models" style="display:none;"></div>
      <div id="bpanel-faq_types" style="display:none;"></div>
      <div id="bpanel-manufacturers" style="display:none;"></div>
      <div id="bpanel-schema" style="display:none;"></div>
      <div id="bpanel-sources" style="display:none;"></div>
    `;
  }

  function copyStat(btn) {
    const txt = btn.dataset.copy || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
    const old = btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1100);
  }

  function jumpToBrandModels(brandSlug) {
    bState.mBrand = brandSlug || "";
    bState.mType = "";
    bState.mQ = "";
    bState.mLimit = 200;
    if (window.setBrandSub) window.setBrandSub("models", false);
    else bState.sub = "models";
    history.replaceState(null, "", brandSlug ? `#brands-models?brand=${encodeURIComponent(brandSlug)}` : "#brands-models");
    window.renderBrandsWorkspace("models", brandSlug);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function mountBenchmarks(panel, data) {
    const bm = data.benchmarks;
    const c = bm.counts;
    const brkCard = bm.cards.find(x => x.id === "mandatory_breakin_rate") || {};
    const avgAllCard = bm.cards.find(x => x.id === "avg_queen_all") || {};
    const maxPrice = Math.max(...bm.by_construction_type.map(r => r.avg_sale_usd), 1);

    const groupsOrder = ["Pricing & Value", "Trial & Returns", "Warranty & Durability", "Safety & Certifications", "Ownership & Logistics"];
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
    const enrichedCount = (c.primary_verified_brands || 0) + (c.enriched_live_brands || 0);

    panel.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total US Mattress Brands</div>
          <div class="kpi-val">${c.total_discovered_entities.toLocaleString()}</div>
          <div class="kpi-sub">${c.active_us_brands.toLocaleString()} Active · ${c.discontinued_brands || 0} Discontinued · ${c.calrecycle_registered_brands || 0} CA-Reg</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Live-Scraped Brands &amp; Models</div>
          <div class="kpi-val">${enrichedCount.toLocaleString()} <span style="font-size:15px;color:var(--sub);font-family:Inter,sans-serif;font-weight:600;">(${(c.total_models_tracked || 0).toLocaleString()} models)</span></div>
          <div class="kpi-sub">${c.primary_verified_brands} full dossiers + ${c.enriched_live_brands || 0} bulk-scraped official sites</div>
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
            <p class="b-card-desc">Flagship Queen street/sale price vs. list MSRP across live-verified US brands (zero unverified estimates in denominators).</p>
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
        ${distBarList("Parent Company Concentration", bm.parent_company_counts, c.primary_verified_brands)}
        ${distBarList("Third-Party Certification Adoption", bm.certification_counts, enrichedCount)}
      </div>
    `;

    panel.addEventListener("click", e => {
      const btn = e.target.closest(".b-copy-btn");
      if (btn) copyStat(btn);
    });
  }

  function renderBrandDrawer(b) {
    const warStr = b.is_lifetime_warranty ? "Lifetime" : (b.warranty_years ? `${b.warranty_years} years` : "Unverified");
    const spread = (b.queen_msrp_usd && b.queen_sale_usd)
      ? Math.round(((b.queen_msrp_usd - b.queen_sale_usd) / b.queen_msrp_usd) * 100) + "% off MSRP"
      : "—";
    const ev = b.live_evidence_snippets || {};
    const quotes = [...(ev.breakin || []), ...(ev.sag || []), ...(ev.slat || []), ...(ev.return_fee || [])].slice(0, 3);
    const hasModels = (b.models_count && b.models_count > 0);

    return `
      <div class="b-drawer">
        <div class="b-drawer-grid">
          <div>
            <h4>Overview, Ownership &amp; Pricing</h4>
            <p><strong>Status:</strong> ${statusPill(b.us_active_status)} ${b.calrecycle_registered ? '<span class="b-cal-badge">CalRecycle CA-Reg</span>' : ""} · <strong>Segment:</strong> ${esc(b.market_segment)}</p>
            <p><strong>Flagship / Types:</strong> ${esc(b.flagship_model || "—")} ${(b.types_offered || []).slice(0, 4).map(typePill).join(" ")}</p>
            <p><strong>Queen Price:</strong> <strong>${fmtUsd(b.queen_sale_usd)}</strong> sale · ${fmtUsd(b.queen_msrp_usd)} MSRP (${esc(spread)})</p>
            <p><strong>Parent / Account:</strong> ${esc(b.parent_company || "Independent / Unverified")} · <strong>Founded:</strong> ${b.founded_year || "—"} · ${esc(b.hq_location || "—")}</p>
            <p><strong>Manufacturing:</strong> ${esc(b.made_in_usa || "Unverified")} · <strong>White-Glove:</strong> ${b.white_glove_available ? (b.white_glove_fee_usd === 0 ? "Free" : (b.white_glove_fee_usd ? fmtUsd(b.white_glove_fee_usd) : "Offered")) : "—"} · ${hasModels ? `<button class="b-model-link" type="button" data-jump-brand="${esc(b.slug)}">View ${b.models_count} ${b.models_count === 1 ? "model" : "models"} &#8594;</button>` : "<strong>Models:</strong> Pending scrape"}</p>
          </div>
          <div>
            <h4>Trial, Warranty, Fiberglass &amp; Lawsuits</h4>
            <p><strong>Sleep Trial:</strong> ${b.trial_nights != null ? (b.trial_nights === 0 ? "No brand trial" : b.trial_nights + " nights") : "Unverified"} · <strong>Break-In:</strong> ${b.mandatory_break_in_required === true ? `Yes (${b.mandatory_break_in_days}d)` : (b.mandatory_break_in_required === false ? "No (0d)" : "Unverified")} · <strong>Returns:</strong> ${b.free_returns === true ? "Free ($0)" : (b.return_fee_usd ? fmtUsd(b.return_fee_usd) + " fee" : "Unverified")}</p>
            <p><strong>Warranty:</strong> ${esc(warStr)} · <strong>Non-Prorated:</strong> ${b.non_prorated_years ? b.non_prorated_years + " yrs" : "—"} · <strong>Sag:</strong> ${b.sag_threshold_inches ? b.sag_threshold_inches + '"' : "—"} · <strong>Max Slat:</strong> ${b.max_slat_spacing_inches ? b.max_slat_spacing_inches + '"' : "—"}</p>
            <p><strong>Fiberglass:</strong> ${fgPill(b.fiberglass_status)} · <strong>Exact Spec:</strong> ${esc(b.fiberglass_exact_name || b.fire_barrier_type || "Undisclosed")}</p>
            <p><strong>Lawsuits / FTC (${b.lawsuit_count ?? 0}):</strong> ${b.cpsc_recall_flag ? '<span class="b-fg-pill b-fg-yes">CPSC Recall</span> ' : ""}${esc(b.lawsuit_summary || "No major federal class actions documented.")}</p>
            <p><strong>Certifications:</strong> ${(b.certifications || []).length ? b.certifications.map(c => `<span class="pill p-study">${esc(c)}</span>`).join(" ") : "None disclosed"}</p>
            ${(b.channel_classification || b.evidence_note) ? `<p><strong>Channel &amp; Audit Note:</strong> ${b.channel_classification ? `<span class="b-cal-badge">${esc(b.channel_classification)}</span> ` : ""}${esc(b.evidence_note || "")}</p>` : ""}
          </div>
        </div>
        ${quotes.length ? `
          <div class="b-quotes">
            <strong>Live Scraped Verbatim Policy Evidence (${esc(b.verified_date)}):</strong>
            ${quotes.map(q => `<div class="b-quote-item">"${esc(q)}"</div>`).join("")}
          </div>
        ` : ""}
        <div class="b-sources-strip">
          <strong>Sources:</strong>
          ${(b.source_urls || [b.website_url]).filter(Boolean).slice(0, 4).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48))} &#8599;</a>`).join(" · ")}
        </div>
      </div>
    `;
  }

  function mountDirectory(panel, data) {
    const c = data.benchmarks.counts;
    const enrichedCnt = (c.primary_verified_brands || 0) + (c.enriched_live_brands || 0);
    const needsCnt = c.total_discovered_entities - enrichedCnt;
    const missingNapCnt = data.brands.filter(b => b.on_nappedia_reviews === false && b.us_active_status === "Active US").length;
    const allSegs = [...new Set(data.brands.map(b => b.market_segment).filter(Boolean))].sort();
    const allTypes = ["Memory Foam", "Hybrid", "Innerspring", "All-Latex", "Organic Hybrid", "Air / Smart", "Gel Grid", "Crib / Kids", "RV / Custom"];

    panel.innerHTML = `
      <div class="b-scope-bar" id="bScopeBar">
        <button class="b-scope-pill active" data-scope="all" type="button">All Brands <span>${c.total_discovered_entities.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-scope="missing_nappedia" type="button">Missing on Nappedia <span>${missingNapCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-scope="enriched" type="button">Live-Scraped Data <span>${enrichedCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-scope="needs_scrape" type="button">Registry-Only Queue <span>${needsCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-scope="discontinued" type="button">Discontinued <span>${(c.discontinued_brands || 0).toLocaleString()}</span></button>
      </div>

      <div class="card">
        <div class="b-controls">
          <input id="bSearch" class="b-input" type="search" placeholder="Search brand, parent, model, fiberglass, city/state...">
          <select id="bStatus" class="b-select" aria-label="Brand Status">
            <option value="">Status: All</option>
            <option value="Active US">Active US</option>
            <option value="Discontinued / Defunct">Discontinued</option>
            <option value="Non-US / Canada-Only">Non-US</option>
          </select>
          <select id="bSeg" class="b-select" aria-label="Market Segment">
            <option value="">All Segments</option>
            ${allSegs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
          </select>
          <select id="bType" class="b-select" aria-label="Mattress Type">
            <option value="">All Types</option>
            ${allTypes.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
          </select>
          <select id="bBrk" class="b-select" aria-label="Mandatory Break-In">
            <option value="">Break-In: All</option>
            <option value="30plus">Forces 30+ Day Break-In</option>
            <option value="any">Any Forced Break-In</option>
            <option value="none">No Mandatory Wait (0d)</option>
          </select>
          <select id="bFg" class="b-select" aria-label="Fiberglass">
            <option value="">Fiberglass: All</option>
            <option value="no">Fiberglass-Free (No)</option>
            <option value="hist">Historical / Yes</option>
          </select>
          <select id="bLaw" class="b-select" aria-label="Lawsuits">
            <option value="">Lawsuits: All</option>
            <option value="any">Has Lawsuits / FTC (1+)</option>
            <option value="zero">0 Documented</option>
          </select>
        </div>

        <div class="b-table-wrap">
          <table class="b-table" id="bDirTable">
            <thead id="bDirThead">
              <tr>
                <th class="sortable" data-col="name">Brand</th>
                <th class="sortable b-col-hide-md" data-col="status">Status</th>
                <th class="sortable num b-col-hide-md" data-col="founded">Est.</th>
                <th class="sortable b-col-seg-hide-sm" data-col="type">Type</th>
                <th class="sortable b-col-hide-sm" data-col="models">Models</th>
                <th class="sortable num" data-col="price">Queen</th>
                <th class="sortable b-col-hide-sm" data-col="trial">Trial / Wait</th>
                <th class="sortable b-col-hide-md" data-col="fg">Fiberglass</th>
                <th class="sortable num b-col-hide-md" data-col="lawsuits">Lawsuits</th>
                <th class="sortable b-col-hide-md" data-col="warranty">Warranty</th>
              </tr>
            </thead>
            <tbody id="bDirTbody"></tbody>
          </table>
        </div>
        <div class="b-foot" id="bDirFoot"></div>
      </div>
    `;

    const thead = document.getElementById("bDirThead");
    const tbody = document.getElementById("bDirTbody");
    const foot = document.getElementById("bDirFoot");
    const brandsBySlug = new Map(data.brands.map(b => [b.slug, b]));

    function updateHeaderArrows() {
      thead.querySelectorAll("th.sortable").forEach(th => {
        const c = th.dataset.col;
        const base = th.dataset.lbl || (th.dataset.lbl = th.textContent.trim());
        th.textContent = (bState.sortCol === c) ? `${base} ${bState.sortDir === "asc" ? "▲" : "▼"}` : base;
        th.classList.toggle("sorted", bState.sortCol === c);
      });
    }

    function renderDirRows() {
      let rows = data.brands;
      const ql = bState.q.toLowerCase();
      const filtered = [];
      for (let i = 0; i < rows.length; i++) {
        const b = rows[i];
        if (bState.scope === "enriched" && !b._hasData) continue;
        if (bState.scope === "needs_scrape" && b._hasData) continue;
        if (bState.scope === "discontinued" && b.us_active_status !== "Discontinued / Defunct") continue;
        if (bState.scope === "missing_nappedia" && !(b.on_nappedia_reviews === false && b.us_active_status === "Active US")) continue;
        if (bState.statusFilter && b.us_active_status !== bState.statusFilter) continue;
        if (ql && !b._q.includes(ql)) continue;
        if (bState.seg && b.market_segment !== bState.seg) continue;
        if (bState.ftype && b._type !== bState.ftype && !(b.types_offered || []).includes(bState.ftype)) continue;
        if (bState.brk === "30plus" && !(typeof b.mandatory_break_in_days === "number" && b.mandatory_break_in_days >= 30)) continue;
        if (bState.brk === "any" && b.mandatory_break_in_required !== true) continue;
        if (bState.brk === "none" && b.mandatory_break_in_required !== false) continue;
        if (bState.fg === "no" && b.fiberglass_status !== "No") continue;
        if (bState.fg === "hist" && b.fiberglass_status !== "Historical (Removed)" && b.fiberglass_status !== "Yes") continue;
        if (bState.law === "any" && !(typeof b.lawsuit_count === "number" && b.lawsuit_count > 0)) continue;
        if (bState.law === "zero" && b.lawsuit_count !== 0) continue;
        filtered.push(b);
      }

      const col = bState.sortCol;
      const dir = bState.sortDir;
      filtered.sort((a, b) => {
        if (col === "tier") return (a._tierRank - b._tierRank) || (a.brand_name || "").localeCompare(b.brand_name || "");
        if (col === "name") return cmpNullable(a.brand_name, b.brand_name, dir, true);
        if (col === "status") return cmpNullable(a.us_active_status, b.us_active_status, dir, true) || (a.brand_name || "").localeCompare(b.brand_name || "");
        if (col === "founded") return cmpNullable(a.founded_year, b.founded_year, dir, false);
        if (col === "type") return cmpNullable(a._type, b._type, dir, true);
        if (col === "models") return cmpNullable(a.models_count || null, b.models_count || null, dir, false);
        if (col === "price") return cmpNullable(a.queen_sale_usd, b.queen_sale_usd, dir, false);
        if (col === "trial") return cmpNullable(a.trial_nights, b.trial_nights, dir, false);
        if (col === "fg") return cmpNullable(a._fgRank, b._fgRank, dir, false);
        if (col === "lawsuits") return cmpNullable(a.lawsuit_count, b.lawsuit_count, dir, false);
        if (col === "warranty") return cmpNullable(a._warNum, b._warNum, dir, false);
        return 0;
      });

      updateHeaderArrows();
      const shown = filtered.slice(0, bState.limit);
      if (!shown.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--sub);">No brands match your current filters.</td></tr>`;
      } else {
        const html = [];
        for (let i = 0; i < shown.length; i++) {
          const b = shown[i];
          const isOpen = bState.expanded.has(b.slug);
          const tierDot = b.verification_tier === "PRIMARY_VERIFIED"
            ? `<span class="dot-done" title="Full Verified Dossier"></span>`
            : (b.verification_tier === "ENRICHED_LIVE"
              ? `<span class="b-dot-live" title="Live-Scraped Official Site"></span>`
              : `<span class="b-dot-dir" title="Registry Queue"></span>`);
          const warLbl = b.is_lifetime_warranty ? "Lifetime" : (b.warranty_years ? `${b.warranty_years} yr` : "—");
          const brkTag = b.mandatory_break_in_required === true
            ? `<span class="pill p-forum">${b.mandatory_break_in_days}d wait</span>`
            : (b.mandatory_break_in_required === false ? `<span class="pill p-study">0d</span>` : "");
          const trialCell = b.trial_nights != null ? `${b.trial_nights === 0 ? "None" : b.trial_nights + "n"} ${brkTag}` : (brkTag || "—");
          const modelsCell = (b.models_count && b.models_count > 0)
            ? `<button class="b-model-link" type="button" data-jump-brand="${esc(b.slug)}">${b.models_count} ${b.models_count === 1 ? "model" : "models"} &#8594;</button>`
            : `<span class="b-muted">—</span>`;
          const calTag = b.calrecycle_registered ? ` <span class="b-cal-badge" title="CalRecycle Oct 2026 CA-Registered">CA</span>` : "";

          html.push(`
            <tr class="b-data-row ${isOpen ? "open" : ""}" data-slug="${esc(b.slug)}" tabindex="0">
              <td>
                <div class="b-name-cell">${tierDot} <strong>${esc(b.brand_name)}</strong>${calTag}</div>
                <div class="b-name-sub">${esc(b.parent_company || (b._hasData ? "Independent" : (b.discovery_sources || [])[0] || ""))} · ${esc(b.market_segment)}</div>
              </td>
              <td class="b-col-hide-md">${statusPill(b.us_active_status)}</td>
              <td class="num b-col-hide-md">${b.founded_year || "—"}</td>
              <td class="b-col-seg-hide-sm">${typePill(b._type)}</td>
              <td class="b-col-hide-sm">${modelsCell}</td>
              <td class="num"><strong>${fmtUsd(b.queen_sale_usd)}</strong></td>
              <td class="b-col-hide-sm">${trialCell}</td>
              <td class="b-col-hide-md">${fgPill(b.fiberglass_status)}</td>
              <td class="num b-col-hide-md">${lawsuitPill(b.lawsuit_count)}</td>
              <td class="b-col-hide-md">${esc(warLbl)}</td>
            </tr>
          `);
          if (isOpen) html.push(`<tr class="b-drawer-row"><td colspan="10">${renderBrandDrawer(b)}</td></tr>`);
        }
        tbody.innerHTML = html.join("");
      }

      foot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} matching brands</span>`
        + (shown.length < filtered.length ? `<button class="load-btn" type="button" id="bLoadAll">Show all ${filtered.length.toLocaleString()}</button>` : "");
    }

    // Delegated listeners (attached ONCE!)
    document.getElementById("bScopeBar").addEventListener("click", e => {
      const btn = e.target.closest(".b-scope-pill");
      if (!btn) return;
      bState.scope = btn.dataset.scope;
      bState.limit = 100;
      document.querySelectorAll("#bScopeBar .b-scope-pill").forEach(x => x.classList.toggle("active", x === btn));
      renderDirRows();
    });

    thead.addEventListener("click", e => {
      const th = e.target.closest("th.sortable");
      if (!th) return;
      const col = th.dataset.col;
      if (bState.sortCol === col) {
        bState.sortDir = bState.sortDir === "asc" ? "desc" : "asc";
      } else {
        bState.sortCol = col;
        bState.sortDir = (col === "price" || col === "models" || col === "trial" || col === "lawsuits" || col === "warranty") ? "desc" : "asc";
      }
      renderDirRows();
    });

    tbody.addEventListener("click", e => {
      const jump = e.target.closest(".b-model-link");
      if (jump) { e.stopPropagation(); jumpToBrandModels(jump.dataset.jumpBrand); return; }
      const tr = e.target.closest("tr.b-data-row");
      if (!tr) return;
      const slug = tr.dataset.slug;
      if (bState.expanded.has(slug)) {
        bState.expanded.delete(slug);
        tr.classList.remove("open");
        if (tr.nextElementSibling && tr.nextElementSibling.classList.contains("b-drawer-row")) tr.nextElementSibling.remove();
      } else {
        bState.expanded.add(slug);
        tr.classList.add("open");
        const b = brandsBySlug.get(slug);
        if (b) {
          const dr = document.createElement("tr");
          dr.className = "b-drawer-row";
          dr.innerHTML = `<td colspan="10">${renderBrandDrawer(b)}</td>`;
          tr.after(dr);
        }
      }
    });

    foot.addEventListener("click", e => {
      if (e.target.id === "bLoadAll") { bState.limit = data.brands.length; renderDirRows(); }
    });

    document.getElementById("bSearch").addEventListener("input", debounce(e => { bState.q = e.target.value; bState.limit = 100; renderDirRows(); }, 60));
    document.getElementById("bStatus").addEventListener("change", e => { bState.statusFilter = e.target.value; bState.limit = 100; renderDirRows(); });
    document.getElementById("bSeg").addEventListener("change", e => { bState.seg = e.target.value; bState.limit = 100; renderDirRows(); });
    document.getElementById("bType").addEventListener("change", e => { bState.ftype = e.target.value; bState.limit = 100; renderDirRows(); });
    document.getElementById("bBrk").addEventListener("change", e => { bState.brk = e.target.value; bState.limit = 100; renderDirRows(); });
    document.getElementById("bFg").addEventListener("change", e => { bState.fg = e.target.value; bState.limit = 100; renderDirRows(); });
    document.getElementById("bLaw").addEventListener("change", e => { bState.law = e.target.value; bState.limit = 100; renderDirRows(); });

    renderDirRows();
  }

  let updateModelsViewFn = null;
  function mountModels(panel, data) {
    const models = data.models || [];
    const brandsMap = new Map();
    let actCnt = 0, discCnt = 0;
    models.forEach(m => {
      if (!brandsMap.has(m.brand_slug)) brandsMap.set(m.brand_slug, m.brand_name);
      if (m.model_status && m.model_status !== "Active") discCnt++; else actCnt++;
    });
    const brandOpts = [...brandsMap.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const typeOpts = [...new Set(models.map(m => m.model_type).filter(Boolean))].sort();
    if (!bState.mStatus) bState.mStatus = "";

    panel.innerHTML = `
      <div class="b-scope-bar" id="mScopeBar">
        <button class="b-scope-pill active" data-mscope="" type="button">All Models <span>${models.length.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-mscope="Active" type="button">Active <span>${actCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-mscope="Discontinued / Historical" type="button">Discontinued / Historical <span>${discCnt.toLocaleString()}</span></button>
      </div>
      <div id="mFilterBannerWrap"></div>
      <div class="card">
        <div class="b-controls">
          <input id="mSearch" class="b-input" type="search" placeholder="Search model name or brand...">
          <select id="mBrandSel" class="b-select" aria-label="Filter by Brand">
            <option value="">All Brands (${brandOpts.length})</option>
            ${brandOpts.map(([sl, nm]) => `<option value="${esc(sl)}">${esc(nm)}</option>`).join("")}
          </select>
          <select id="mTypeSel" class="b-select" aria-label="Filter by Type">
            <option value="">All Construction Types</option>
            ${typeOpts.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
          </select>
        </div>
        <div class="b-table-wrap">
          <table class="b-table" id="mTable">
            <thead id="mThead">
              <tr>
                <th class="sortable" data-col="brand">Brand</th>
                <th class="sortable" data-col="model">Model Name</th>
                <th class="sortable" data-col="status">Status</th>
                <th class="sortable" data-col="type">Type</th>
                <th class="sortable num" data-col="price">Queen Price</th>
                <th class="b-col-hide-sm">Catalog Source</th>
                <th class="b-col-hide-sm">Link</th>
              </tr>
            </thead>
            <tbody id="mTbody"></tbody>
          </table>
        </div>
        <div class="b-foot" id="mFoot"></div>
      </div>
    `;

    const thead = document.getElementById("mThead");
    const tbody = document.getElementById("mTbody");
    const foot = document.getElementById("mFoot");
    const bannerWrap = document.getElementById("mFilterBannerWrap");
    const brandSel = document.getElementById("mBrandSel");

    function modelStatusPill(st) {
      if (st && st !== "Active") return `<span class="b-st-pill st-disc">Discontinued</span>`;
      return `<span class="b-st-pill st-active">Active</span>`;
    }

    function renderModelRows() {
      brandSel.value = bState.mBrand;
      const activeBrandName = bState.mBrand ? (brandsMap.get(bState.mBrand) || bState.mBrand) : "";
      bannerWrap.innerHTML = activeBrandName
        ? `<div class="b-filter-banner"><span>Filtered to brand: <strong>${esc(activeBrandName)}</strong></span><button class="b-copy-btn" type="button" id="mClearBrand">Show All Brands</button></div>`
        : "";

      const ql = bState.mQ.toLowerCase();
      const filtered = [];
      for (let i = 0; i < models.length; i++) {
        const m = models[i];
        const mst = m.model_status || "Active";
        if (bState.mStatus && mst !== bState.mStatus) continue;
        if (bState.mBrand && m.brand_slug !== bState.mBrand) continue;
        if (bState.mType && m.model_type !== bState.mType) continue;
        if (ql && !m._q.includes(ql)) continue;
        filtered.push(m);
      }
      const col = bState.mSortCol, dir = bState.mSortDir;
      filtered.sort((a, b) => {
        if (col === "brand") return cmpNullable(a.brand_name, b.brand_name, dir, true) || (a.model_name || "").localeCompare(b.model_name || "");
        if (col === "model") return cmpNullable(a.model_name, b.model_name, dir, true);
        if (col === "status") return cmpNullable(a.model_status || "Active", b.model_status || "Active", dir, true);
        if (col === "type") return cmpNullable(a.model_type, b.model_type, dir, true);
        if (col === "price") return cmpNullable(a.queen_price_usd, b.queen_price_usd, dir, false);
        return 0;
      });

      thead.querySelectorAll("th.sortable").forEach(th => {
        const c = th.dataset.col;
        const base = th.dataset.lbl || (th.dataset.lbl = th.textContent.trim());
        th.textContent = (col === c) ? `${base} ${dir === "asc" ? "▲" : "▼"}` : base;
        th.classList.toggle("sorted", col === c);
      });

      const shown = filtered.slice(0, bState.mLimit);
      tbody.innerHTML = shown.length ? shown.map(m => `
        <tr>
          <td><strong>${esc(m.brand_name)}</strong></td>
          <td>${esc(m.model_name)}</td>
          <td>${modelStatusPill(m.model_status)}</td>
          <td>${typePill(m.model_type)}</td>
          <td class="num"><strong>${fmtUsd(m.queen_price_usd)}</strong></td>
          <td class="b-col-hide-sm"><span class="b-muted">${esc(m.source || "")}</span></td>
          <td class="b-col-hide-sm"><a href="${esc(m.url)}" target="_blank" rel="noopener">View &#8599;</a></td>
        </tr>
      `).join("") : `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--sub);">No models match your current filter.</td></tr>`;

      foot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} models</span>`
        + (shown.length < filtered.length ? `<button class="load-btn" type="button" id="mLoadMore">Show +250 more</button>` : "");
    }

    updateModelsViewFn = renderModelRows;

    document.getElementById("mScopeBar").addEventListener("click", e => {
      const btn = e.target.closest(".b-scope-pill");
      if (!btn) return;
      bState.mStatus = btn.dataset.mscope;
      bState.mLimit = 150;
      document.querySelectorAll("#mScopeBar .b-scope-pill").forEach(x => x.classList.toggle("active", x === btn));
      renderModelRows();
    });
    bannerWrap.addEventListener("click", e => {
      if (e.target.id === "mClearBrand") {
        bState.mBrand = "";
        history.replaceState(null, "", "#brands-models");
        renderModelRows();
      }
    });
    thead.addEventListener("click", e => {
      const th = e.target.closest("th.sortable");
      if (!th) return;
      const col = th.dataset.col;
      if (bState.mSortCol === col) bState.mSortDir = bState.mSortDir === "asc" ? "desc" : "asc";
      else { bState.mSortCol = col; bState.mSortDir = col === "price" ? "desc" : "asc"; }
      renderModelRows();
    });
    foot.addEventListener("click", e => {
      if (e.target.id === "mLoadMore") { bState.mLimit += 250; renderModelRows(); }
    });
    document.getElementById("mSearch").addEventListener("input", debounce(e => { bState.mQ = e.target.value; renderModelRows(); }, 60));
    brandSel.addEventListener("change", e => {
      bState.mBrand = e.target.value;
      history.replaceState(null, "", bState.mBrand ? `#brands-models?brand=${encodeURIComponent(bState.mBrand)}` : "#brands-models");
      renderModelRows();
    });
    document.getElementById("mTypeSel").addEventListener("change", e => { bState.mType = e.target.value; renderModelRows(); });

    renderModelRows();
  }

  function mountManufacturers(panel, data) {
    const mfrs = data.manufacturers || [];
    const usCount = mfrs.filter(m => m.country === "USA").length;
    const intlCount = mfrs.length - usCount;
    const typeOpts = [...new Set(mfrs.map(m => m.mfr_type).filter(Boolean))].sort();
    const stateOpts = [...new Set(mfrs.filter(m => m.country === "USA" && m.state).map(m => m.state))].sort();

    panel.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Registered Manufacturers</div><div class="kpi-val">${mfrs.length.toLocaleString()}</div><div class="kpi-sub">Major conglomerates, OEMs, factories &amp; CalRecycle Oct 2026 registry</div></div>
        <div class="kpi-card"><div class="kpi-label">US Domestic Factories / OEMs</div><div class="kpi-val">${usCount.toLocaleString()}</div><div class="kpi-sub">${((usCount / Math.max(mfrs.length, 1)) * 100).toFixed(1)}% headquartered in the United States</div></div>
        <div class="kpi-card"><div class="kpi-label">International Suppliers</div><div class="kpi-val">${intlCount.toLocaleString()}</div><div class="kpi-sub">Registered overseas factories exporting mattresses into the US</div></div>
        <div class="kpi-card"><div class="kpi-label">US States Represented</div><div class="kpi-val">${stateOpts.length}</div><div class="kpi-sub">Filter by state below to find regional &amp; factory-direct plants</div></div>
      </div>
      <div class="card">
        <div class="b-controls">
          <input id="mfSearch" class="b-input" type="search" placeholder="Search manufacturer, DBA, brand owned, city, state...">
          <select id="mfTypeSel" class="b-select" aria-label="Manufacturer Type"><option value="">All Manufacturer Types</option>${typeOpts.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select>
          <select id="mfCountrySel" class="b-select" aria-label="Country"><option value="">All Countries</option><option value="USA">USA Domestic (${usCount})</option><option value="INTL">International (${intlCount})</option></select>
          <select id="mfStateSel" class="b-select" aria-label="US State"><option value="">All US States</option>${stateOpts.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}</select>
        </div>
        <div class="b-table-wrap">
          <table class="b-table" id="mfTable">
            <thead id="mfThead">
              <tr>
                <th class="sortable" data-col="name">Manufacturer / Legal Account</th>
                <th class="sortable" data-col="type">Type</th>
                <th class="sortable num b-col-hide-md" data-col="founded">Est.</th>
                <th class="sortable" data-col="loc">Location</th>
                <th class="b-col-hide-sm">Brands Owned / Manufactured</th>
                <th class="b-col-hide-md">Role / Notes</th>
              </tr>
            </thead>
            <tbody id="mfTbody"></tbody>
          </table>
        </div>
        <div class="b-foot" id="mfFoot"></div>
      </div>
    `;

    const thead = document.getElementById("mfThead");
    const tbody = document.getElementById("mfTbody");
    const foot = document.getElementById("mfFoot");

    function renderMfrRows() {
      const ql = bState.mfQ.toLowerCase();
      const filtered = [];
      for (let i = 0; i < mfrs.length; i++) {
        const m = mfrs[i];
        if (bState.mfType && m.mfr_type !== bState.mfType) continue;
        if (bState.mfCountry === "USA" && m.country !== "USA") continue;
        if (bState.mfCountry === "INTL" && m.country === "USA") continue;
        if (bState.mfState && m.state !== bState.mfState) continue;
        if (ql && !m._q.includes(ql)) continue;
        filtered.push(m);
      }
      const col = bState.mfSortCol, dir = bState.mfSortDir;
      if (col !== "major") {
        filtered.sort((a, b) => {
          if (col === "name") return cmpNullable(a.manufacturer_name, b.manufacturer_name, dir, true);
          if (col === "type") return cmpNullable(a.mfr_type, b.mfr_type, dir, true);
          if (col === "founded") return cmpNullable(a.founded_year, b.founded_year, dir, false);
          if (col === "loc") return cmpNullable(a._loc, b._loc, dir, true);
          return 0;
        });
      }

      thead.querySelectorAll("th.sortable").forEach(th => {
        const c = th.dataset.col;
        const base = th.dataset.lbl || (th.dataset.lbl = th.textContent.trim());
        th.textContent = (col === c) ? `${base} ${dir === "asc" ? "▲" : "▼"}` : base;
        th.classList.toggle("sorted", col === c);
      });

      const shown = filtered.slice(0, bState.mfLimit);
      tbody.innerHTML = shown.length ? shown.map(m => {
        const cls = MFR_TYPE_CLASS[m.mfr_type] || "t-default";
        const calTag = m.calrecycle_registered ? ` <span class="b-cal-badge" title="CalRecycle Oct 2026 Registry">CA</span>` : "";
        return `
          <tr>
            <td>
              <div><strong>${esc(m.manufacturer_name)}</strong>${calTag}</div>
              ${m.dba_name && m.dba_name !== m.manufacturer_name ? `<div class="b-muted">DBA: ${esc(m.dba_name)}</div>` : ""}
              ${m.address ? `<div class="b-muted">${esc(m.address)}</div>` : ""}
            </td>
            <td><span class="b-type-pill ${cls}">${esc(m.mfr_type)}</span></td>
            <td class="num b-col-hide-md">${m.founded_year || "—"}</td>
            <td>${esc(m._loc || "—")}</td>
            <td class="b-col-hide-sm">${esc(m.brands_made || "—")}</td>
            <td class="b-col-hide-md"><span class="b-muted">${esc(m.notes || "")}</span></td>
          </tr>
        `;
      }).join("") : `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--sub);">No manufacturers match your filters.</td></tr>`;

      foot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} manufacturers</span>`
        + (shown.length < filtered.length ? `<button class="load-btn" type="button" id="mfLoadAll">Show all ${filtered.length.toLocaleString()}</button>` : "");
    }

    thead.addEventListener("click", e => {
      const th = e.target.closest("th.sortable");
      if (!th) return;
      const col = th.dataset.col;
      if (bState.mfSortCol === col) bState.mfSortDir = bState.mfSortDir === "asc" ? "desc" : "asc";
      else { bState.mfSortCol = col; bState.mfSortDir = "asc"; }
      renderMfrRows();
    });
    foot.addEventListener("click", e => {
      if (e.target.id === "mfLoadAll") { bState.mfLimit = mfrs.length; renderMfrRows(); }
    });
    document.getElementById("mfSearch").addEventListener("input", debounce(e => { bState.mfQ = e.target.value; bState.mfLimit = 120; renderMfrRows(); }, 60));
    document.getElementById("mfTypeSel").addEventListener("change", e => { bState.mfType = e.target.value; bState.mfLimit = 120; renderMfrRows(); });
    document.getElementById("mfCountrySel").addEventListener("change", e => { bState.mfCountry = e.target.value; bState.mfLimit = 120; renderMfrRows(); });
    document.getElementById("mfStateSel").addEventListener("change", e => { bState.mfState = e.target.value; bState.mfLimit = 120; renderMfrRows(); });

    renderMfrRows();
  }

  function mountSchema(panel, data) {
    const filled = data.brands.filter(b => b._hasData);
    const fillFor = key => {
      if (!filled.length) return 0;
      const n = filled.filter(b => {
        const v = b[key];
        if (v === null || v === undefined || v === "" || v === "Unverified" || v === "Undisclosed") return false;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length;
      return Math.round((n / filled.length) * 100);
    };

    panel.innerHTML = `
      <div class="card b-intro-card">
        <h3>Nappedia Brand Intelligence Data Schema (${data.meta.schema_field_count} Fields across ${data.meta.schema_domain_count} Domains)</h3>
        <p class="b-card-desc">Live fill rates below reflect verified non-null coverage across all ${filled.length.toLocaleString()} live-scraped US brands.</p>
      </div>
      ${data.schema_domains.map(dom => `
        <div class="card b-schema-card">
          <div class="b-card-head"><div><h3>${esc(dom.name)}</h3><p class="b-card-desc">${esc(dom.why_it_matters)}</p></div><span class="b-n-pill">${dom.fields.length} fields</span></div>
          <div class="b-table-wrap">
            <table class="b-table">
              <thead><tr><th>Field</th><th>Key</th><th>Type / Unit</th><th>Example</th><th class="num">Scraped Fill %</th><th>Nappedia Content Use</th></tr></thead>
              <tbody>
                ${dom.fields.map(f => `
                  <tr>
                    <td><strong>${esc(f.label)}</strong></td>
                    <td><code>${esc(f.key)}</code></td>
                    <td>${esc(f.type)} <span class="b-muted">(${esc(f.unit)})</span></td>
                    <td>${esc(f.example)}</td>
                    <td class="num"><strong>${fillFor(f.key)}%</strong></td>
                    <td>${esc(f.content_use)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `).join("")}
    `;
  }

  function mountSources(panel, data) {
    const c = data.benchmarks.counts;
    const rounds = data.discovery_rounds || [];
    panel.innerHTML = `
      <div class="card b-intro-card">
        <h3>Independent Discovery &amp; 90/10 Exhaustion Proof</h3>
        <p class="b-card-desc"><strong>Zero StandardCommand Data Used:</strong> Every brand (${c.total_discovered_entities.toLocaleString()} total: ${c.active_us_brands.toLocaleString()} Active US, ${c.discontinued_brands || 0} Discontinued, ${c.non_us_brands || 0} Non-US) was discovered independently from California's statutory CalRecycle registry (Oct 13, 2026), GoodBed, 10 review/lab indexes, live Google+Bing A–Z autocomplete, and niche verticals. Discontinued brands are kept in-table with a clear status badge rather than excluded.</p>
      </div>
      ${rounds.length ? `
        <div class="card b-schema-card">
          <div class="b-card-head"><h3>Multi-Round Discovery Exhaustion Log</h3><span class="b-n-pill">${rounds.length} angles logged</span></div>
          <div class="b-table-wrap">
            <table class="b-table">
              <thead><tr><th>Round</th><th>Sources &amp; Angles Harvested</th><th class="num">Added</th><th>Status</th></tr></thead>
              <tbody>
                ${rounds.map(r => `<tr><td><strong>${esc(r.round)}</strong></td><td>${esc(r.sources)}</td><td class="num"><strong>+${(r.new_active_added || 0).toLocaleString()}</strong></td><td><span class="pill ${r.status.startsWith("BLOCKED") ? "p-forum" : "p-study"}">${esc(r.status)}</span></td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}
      <div class="card b-schema-card">
        <div class="b-card-head"><h3>Primary &amp; Directory Research Sources (${data.research_sources.length})</h3><span class="b-n-pill">Verified ${esc(data.meta.verified_date)}</span></div>
        <div class="b-table-wrap">
          <table class="b-table">
            <thead><tr><th>Source</th><th>Type</th><th>Role in US Brand Discovery &amp; Verification</th></tr></thead>
            <tbody>
              ${data.research_sources.map(s => `<tr><td><strong><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} &#8599;</a></strong></td><td><span class="pill p-search">${esc(s.type)}</span></td><td>${esc(s.role)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function mountFaqTypes(panel) {
    const payload = window.NAPPEDIA_BRAND_FAQ_TYPES;
    if (!payload || !Array.isArray(payload.items)) {
      panel.innerHTML = `<div class="card b-intro-card"><h3>Brand FAQ Types</h3><p class="b-card-desc">Dataset failed to load.</p></div>`;
      return;
    }
    const items = payload.items;
    const sum = payload.summary || {};
    const cats = payload.categories || [...new Set(items.map(x => x.category))];
    const levels = [...new Set(items.map(x => x.applies_to))].sort();

    items.forEach(x => {
      x._q = `${x.template} ${x.category} ${x.applies_to} ${x.note}`.toLowerCase();
      x._compRank = x.competes === "No" ? 0 : (x.competes === "Low" ? 1 : (x.competes === "Medium" ? 2 : 3));
    });

    const catClassMap = {};
    const palette = ["t-foam", "t-hybrid", "t-latex", "t-organic", "t-spring", "t-smart", "t-grid", "t-crib", "t-rv", "t-foam", "t-hybrid", "t-smart"];
    cats.forEach((c, idx) => { catClassMap[c] = palette[idx % palette.length]; });

    const scorePill = v => {
      const cls = v >= 8 ? "ft-hi" : (v >= 6 ? "ft-mid" : (v >= 4 ? "ft-lo" : "ft-low"));
      return `<span class="ft-score-pill ${cls}">${v}</span>`;
    };
    const overlapPill = c => {
      if (c === "No") return `<span class="b-fg-pill fg-no">No</span>`;
      if (c === "Low") return `<span class="b-fg-pill st-nonus">Low</span>`;
      if (c === "Medium") return `<span class="b-fg-pill fg-hist">Medium</span>`;
      return `<span class="b-fg-pill fg-yes">High</span>`;
    };

    const top8Cnt = items.filter(x => x.avg >= 8).length;
    const hiScaleCnt = items.filter(x => x.scale >= 8).length;
    const zeroHubCnt = items.filter(x => x.hub_pages === 0).length;
    const hiVolCnt = items.filter(x => x.vol >= 8).length;
    const hiConvCnt = items.filter(x => x.conv >= 8).length;
    const noOverCnt = items.filter(x => x.competes === "No").length;
    const totalEstPages = sum.total_est_pages || items.reduce((s, x) => s + (x.est_pages || 0), 0);

    panel.innerHTML = `
      <div class="ft-kpi-grid">
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Brand FAQ Page Types</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;">${items.length}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">Across ${cats.length} categories (comparisons moved out)</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Top Priority (3-Vector 8.0+)</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;color:#15803d;">${top8Cnt}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">Needs strong Vol + Conv + 300+ Pages</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Hundreds of Pages (300+)</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;color:var(--accent);">${hiScaleCnt}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">~${totalEstPages.toLocaleString()} est. potential pages total</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Avg Rating (3 Vectors · 1–10)</div>
          <div style="font-size:22px;font-weight:800;margin-top:6px;">${sum.avg_vol || "6.2"} <span style="font-size:12px;font-weight:600;color:var(--sub);">Vol</span> · ${sum.avg_conv || "5.1"} <span style="font-size:12px;font-weight:600;color:var(--sub);">Conv</span> · ${sum.avg_scale || "7.2"} <span style="font-size:12px;font-weight:600;color:var(--sub);">Pages</span></div>
          <div style="font-size:12px;color:var(--sub);margin-top:4px;">${zeroHubCnt} types still have 0 pages in Hub today</div>
        </div>
      </div>

      <div class="card b-intro-card" style="margin-bottom:14px;">
        <h3>All ${items.length} Brand &amp; Model Mattress FAQ Page Types</h3>
        <p class="b-card-desc">Every non-comparison brand and model FAQ page type we can write across your 543 live brands (591 with upcoming), rated on 3 vectors (1–10 each): <strong>Potential Volume</strong>, <strong>Convertibility</strong>, and <strong>Page # (Scale)</strong>. Small-scale topics can't reach Top Priority. Comparison pages now live in their own <a href="#model-comparisons" style="color:var(--accent);font-weight:600;">Comparisons</a> section.</p>
        <div class="ft-legend">
          <span><strong>Potential Volume (1–10):</strong> <code>9–10</code> Massive demand · <code>7–8</code> High recurring searches · <code>5–6</code> Solid mid-tier · <code>1–4</code> Niche</span>
          <span><strong>Convertibility (1–10):</strong> <code>9–10</code> Wallet out, ready to buy · <code>7–8</code> Strong pre-buy filter · <code>1–3</code> Post-purchase help</span>
          <span><strong>Page # / Scale (1–10):</strong> <code>9–10</code> 450–800+ pages · <code>8</code> 300–449 pages · <code>6–7</code> 120–299 pages · <code>1–5</code> Under 120 pages (lowers total score)</span>
        </div>
      </div>

      <div class="b-scope-bar" id="ftScopeBar">
        <button class="b-scope-pill active" data-ftscope="all" type="button">All Types <span>${items.length}</span></button>
        <button class="b-scope-pill" data-ftscope="top8" type="button">Top Priority (8.0+) <span>${top8Cnt}</span></button>
        <button class="b-scope-pill" data-ftscope="hi_scale" type="button">300+ Pages (Scale 8+) <span>${hiScaleCnt}</span></button>
        <button class="b-scope-pill" data-ftscope="zero_hub" type="button">0 in Hub Today <span>${zeroHubCnt}</span></button>
        <button class="b-scope-pill" data-ftscope="hi_vol" type="button">High Volume (8+) <span>${hiVolCnt}</span></button>
        <button class="b-scope-pill" data-ftscope="hi_conv" type="button">High Convertibility (8+) <span>${hiConvCnt}</span></button>
        <button class="b-scope-pill" data-ftscope="no_overlap" type="button">No Review Overlap <span>${noOverCnt}</span></button>
      </div>

      <div class="card">
        <div class="b-controls">
          <input id="ftSearch" class="b-input" type="search" placeholder="Search FAQ type, category, or note (e.g. fiberglass, HSA, Costco, warranty)...">
          <select id="ftCatSel" class="b-select" aria-label="Filter by Category">
            <option value="">All Categories (${cats.length})</option>
            ${cats.map(c => `<option value="${esc(c)}">${esc(c)} (${items.filter(x => x.category === c).length})</option>`).join("")}
          </select>
          <select id="ftLevelSel" class="b-select" aria-label="Filter by Applies To">
            <option value="">Applies To: All</option>
            ${levels.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join("")}
          </select>
          <button id="ftExportCsv" class="util-btn" type="button">Export CSV</button>
        </div>
        <div class="b-table-wrap">
          <table class="b-table" id="ftTable">
            <thead id="ftThead">
              <tr>
                <th class="sortable num b-col-hide-sm" data-col="id" style="width:44px;">#</th>
                <th class="sortable" data-col="template">FAQ Page Type</th>
                <th class="sortable b-col-hide-sm" data-col="category">Category</th>
                <th class="sortable b-col-hide-md" data-col="applies_to">Applies To</th>
                <th class="sortable num" data-col="vol">Vol</th>
                <th class="sortable num" data-col="conv">Conv</th>
                <th class="sortable num" data-col="scale">Pages</th>
                <th class="sortable num" data-col="avg">Score</th>
                <th class="sortable num b-col-hide-sm" data-col="hub_pages">In Hub</th>
                <th class="sortable b-col-hide-md" data-col="competes">Overlap</th>
              </tr>
            </thead>
            <tbody id="ftTbody"></tbody>
          </table>
        </div>
        <div class="b-foot" id="ftFoot"></div>
      </div>
    `;

    const thead = document.getElementById("ftThead");
    const tbody = document.getElementById("ftTbody");
    const foot = document.getElementById("ftFoot");
    let currentFiltered = [];

    function updateHeaders() {
      thead.querySelectorAll("th.sortable").forEach(th => {
        const active = th.dataset.col === bState.ftSortCol;
        th.classList.toggle("sorted", active);
        const base = th.dataset.label || th.textContent.replace(/ [▲▼]$/, "");
        th.dataset.label = base;
        th.textContent = active ? `${base} ${bState.ftSortDir === "asc" ? "▲" : "▼"}` : base;
      });
    }

    function renderRows() {
      const q = bState.ftQ.trim().toLowerCase();
      let list = items.filter(x => {
        if (bState.ftScope === "top8" && x.avg < 8) return false;
        if (bState.ftScope === "hi_scale" && x.scale < 8) return false;
        if (bState.ftScope === "zero_hub" && x.hub_pages !== 0) return false;
        if (bState.ftScope === "hi_vol" && x.vol < 8) return false;
        if (bState.ftScope === "hi_conv" && x.conv < 8) return false;
        if (bState.ftScope === "no_overlap" && x.competes !== "No") return false;
        if (bState.ftCat && x.category !== bState.ftCat) return false;
        if (bState.ftLevel && x.applies_to !== bState.ftLevel) return false;
        if (q && !x._q.includes(q)) return false;
        return true;
      });

      const col = bState.ftSortCol;
      const dir = bState.ftSortDir;
      list.sort((a, b) => {
        let c = 0;
        if (col === "id") c = cmpNullable(a.id, b.id, dir, false);
        else if (col === "template") c = cmpNullable(a.template, b.template, dir, true);
        else if (col === "category") c = cmpNullable(a.category, b.category, dir, true);
        else if (col === "applies_to") c = cmpNullable(a.applies_to, b.applies_to, dir, true);
        else if (col === "vol") c = cmpNullable(a.vol, b.vol, dir, false) || (b.scale - a.scale) || (b.conv - a.conv);
        else if (col === "conv") c = cmpNullable(a.conv, b.conv, dir, false) || (b.scale - a.scale) || (b.vol - a.vol);
        else if (col === "scale") c = cmpNullable(a.est_pages, b.est_pages, dir, false) || cmpNullable(a.scale, b.scale, dir, false) || (b.avg - a.avg);
        else if (col === "avg") c = cmpNullable(a.avg, b.avg, dir, false) || (b.scale - a.scale) || (b.conv - a.conv) || (b.vol - a.vol);
        else if (col === "hub_pages") c = cmpNullable(a.hub_pages, b.hub_pages, dir, false);
        else if (col === "competes") c = cmpNullable(a._compRank, b._compRank, dir, false);
        return c || (a.id - b.id);
      });

      currentFiltered = list;
      updateHeaders();

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--sub);">No FAQ page types match your filters.</td></tr>`;
        foot.textContent = `Showing 0 of ${items.length} Brand FAQ page types`;
        return;
      }

      tbody.innerHTML = list.map(x => `
        <tr>
          <td class="num b-muted b-col-hide-sm">${x.id}</td>
          <td>
            <div class="ft-title">${esc(x.template)}</div>
            <div class="ft-note">${esc(x.note)}</div>
            <span class="b-type-pill ft-mob-cat ${catClassMap[x.category] || "t-default"}">${esc(x.category)}</span>
          </td>
          <td class="b-col-hide-sm"><span class="b-type-pill ${catClassMap[x.category] || "t-default"}">${esc(x.category)}</span></td>
          <td class="b-col-hide-md" style="white-space:nowrap;">${esc(x.applies_to)}</td>
          <td class="num">${scorePill(x.vol)}</td>
          <td class="num">${scorePill(x.conv)}</td>
          <td class="num">
            ${scorePill(x.scale)}
            <div class="ft-est-sub">~${(x.est_pages || 0).toLocaleString()}</div>
          </td>
          <td class="num"><strong>${x.avg.toFixed(1)}</strong></td>
          <td class="num b-col-hide-sm">${x.hub_pages === 0 ? `<span class="b-muted">0</span>` : `<strong>${x.hub_pages}</strong>`}</td>
          <td class="b-col-hide-md">${overlapPill(x.competes)}</td>
        </tr>
      `).join("");

      const avgV = (list.reduce((s, x) => s + x.vol, 0) / list.length).toFixed(1);
      const avgC = (list.reduce((s, x) => s + x.conv, 0) / list.length).toFixed(1);
      const avgP = (list.reduce((s, x) => s + x.scale, 0) / list.length).toFixed(1);
      const sumP = list.reduce((s, x) => s + (x.est_pages || 0), 0).toLocaleString();
      foot.textContent = `Showing ${list.length} of ${items.length} Brand FAQ page types · Avg Vol: ${avgV}/10 · Avg Conv: ${avgC}/10 · Avg Page #: ${avgP}/10 (~${sumP} est. pages)`;
    }

    document.getElementById("ftScopeBar").addEventListener("click", e => {
      const btn = e.target.closest(".b-scope-pill");
      if (!btn) return;
      bState.ftScope = btn.dataset.ftscope || "all";
      document.querySelectorAll("#ftScopeBar .b-scope-pill").forEach(b => b.classList.toggle("active", b === btn));
      renderRows();
    });
    document.getElementById("ftSearch").addEventListener("input", debounce(e => { bState.ftQ = e.target.value; renderRows(); }, 120));
    document.getElementById("ftCatSel").addEventListener("change", e => { bState.ftCat = e.target.value; renderRows(); });
    document.getElementById("ftLevelSel").addEventListener("change", e => { bState.ftLevel = e.target.value; renderRows(); });
    thead.addEventListener("click", e => {
      const th = e.target.closest("th.sortable");
      if (!th) return;
      const col = th.dataset.col;
      if (bState.ftSortCol === col) bState.ftSortDir = bState.ftSortDir === "desc" ? "asc" : "desc";
      else {
        bState.ftSortCol = col;
        bState.ftSortDir = (col === "vol" || col === "conv" || col === "scale" || col === "avg" || col === "hub_pages") ? "desc" : "asc";
      }
      renderRows();
    });
    document.getElementById("ftExportCsv").addEventListener("click", () => {
      const headers = ["id", "template", "category", "applies_to", "volume_1_10", "convertibility_1_10", "page_scale_1_10", "est_potential_pages", "combined_score", "in_hub_pages", "review_overlap", "note"];
      const csvRows = [headers.join(",")].concat(currentFiltered.map(x => [
        x.id, x.template, x.category, x.applies_to, x.vol, x.conv, x.scale, x.est_pages, x.avg.toFixed(1), x.hub_pages, x.competes, x.note
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")));
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "nappedia_brand_faq_types_106_scored.csv";
      a.click();
    });

    renderRows();
  }

  window.renderBrandsWorkspace = function (subTab, brandFilterSlug) {
    const data = window.NAPPEDIA_BRANDS;
    const root = document.getElementById("brandsContent");
    if (!root || !data) return;
    ensureIndexed(data);
    ensurePanels(root);
    if (subTab) bState.sub = subTab;
    if (typeof brandFilterSlug === "string") bState.mBrand = brandFilterSlug;

    document.querySelectorAll("#brandTabs .cat-tab").forEach(btn => {
      const act = btn.dataset.bsub === bState.sub;
      btn.classList.toggle("active", act);
      btn.setAttribute("aria-selected", act ? "true" : "false");
    });

    const subKeys = ["benchmarks", "analytics", "directory", "models", "faq_types", "manufacturers", "schema", "sources"];
    for (let i = 0; i < subKeys.length; i++) {
      const k = subKeys[i];
      const p = document.getElementById("bpanel-" + k);
      if (p) p.style.display = (k === bState.sub) ? "" : "none";
    }

    const activePanel = document.getElementById("bpanel-" + bState.sub);
    if (!mounted[bState.sub]) {
      mounted[bState.sub] = true;
      if (bState.sub === "benchmarks") mountBenchmarks(activePanel, data);
      else if (bState.sub === "analytics" && window.mountBrandsAnalytics) window.mountBrandsAnalytics(activePanel, data);
      else if (bState.sub === "directory") mountDirectory(activePanel, data);
      else if (bState.sub === "models") mountModels(activePanel, data);
      else if (bState.sub === "faq_types") mountFaqTypes(activePanel);
      else if (bState.sub === "manufacturers") mountManufacturers(activePanel, data);
      else if (bState.sub === "schema") mountSchema(activePanel, data);
      else if (bState.sub === "sources") mountSources(activePanel, data);
    } else if (bState.sub === "models" && updateModelsViewFn) {
      updateModelsViewFn();
    }
  };
})();
