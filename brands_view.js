/* =========================================================================
 * Nappedia Research > Brands Workspace (v1)
 * Renders Benchmarks & Averages, Brand Universe (496 Active US + 68 Audit),
 * 46-Field Data Schema, and Sources & Methodology.
 * Universal 10 compliant (light shadows and subtle tints only).
 * ========================================================================= */
(function () {
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const fmtUsd = v => (typeof v === "number" && !Number.isNaN(v)) ? "$" + Math.round(v).toLocaleString() : "—";

  const bState = {
    sub: "benchmarks", // benchmarks | directory | schema | sources
    scope: "active",   // active | primary | directory | excluded
    q: "",
    seg: "",
    ftype: "",
    brk: "",
    war: "",
    sort: "tier_name",
    limit: 100,
    expanded: new Set(),
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
          <div class="kpi-sub">${c.total_discovered_entities} discovered · ${c.discontinued_or_non_us} defunct/non-US audited</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Primary-Verified Dossiers</div>
          <div class="kpi-val">${c.primary_verified_brands}</div>
          <div class="kpi-sub">Live official policy &amp; pricing scrape (${esc(bm.verified_date)})</div>
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
                    <td><strong>${esc(r.type)}</strong></td>
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
        (b.certifications || []).join(" ").toLowerCase().includes(ql)
      );
    }
    if (bState.seg) rows = rows.filter(b => b.market_segment === bState.seg);
    if (bState.ftype) rows = rows.filter(b => b.flagship_type === bState.ftype || (b.types_offered || []).includes(bState.ftype));
    if (bState.brk === "30plus") rows = rows.filter(b => typeof b.mandatory_break_in_days === "number" && b.mandatory_break_in_days >= 30);
    else if (bState.brk === "any") rows = rows.filter(b => b.mandatory_break_in_required === true);
    else if (bState.brk === "none") rows = rows.filter(b => b.mandatory_break_in_required === false);

    if (bState.war === "lifetime") rows = rows.filter(b => b.is_lifetime_warranty === true);
    else if (bState.war === "20plus") rows = rows.filter(b => !b.is_lifetime_warranty && typeof b.warranty_years === "number" && b.warranty_years >= 20);
    else if (bState.war === "10to15") rows = rows.filter(b => !b.is_lifetime_warranty && typeof b.warranty_years === "number" && b.warranty_years >= 10 && b.warranty_years <= 15);

    rows = rows.slice().sort((a, b) => {
      if (bState.sort === "name_asc") return (a.brand_name || "").localeCompare(b.brand_name || "");
      if (bState.sort === "price_asc") return (a.queen_sale_usd ?? 999999) - (b.queen_sale_usd ?? 999999);
      if (bState.sort === "price_desc") return (b.queen_sale_usd ?? -1) - (a.queen_sale_usd ?? -1);
      if (bState.sort === "trial_desc") return (b.trial_nights ?? -1) - (a.trial_nights ?? -1);
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
              <p><strong>Status:</strong> ${esc(b.us_active_status)} (${esc(b.verification_tier)})</p>
              <p><strong>Market Segment:</strong> ${esc(b.market_segment)}</p>
              <p><strong>Sales Channel:</strong> ${esc(b.sales_channel || "—")}</p>
              <p><strong>Parent Company:</strong> ${esc(b.parent_company || "Unverified")}</p>
              ${b.audit_reason ? `<p><strong>Audit Note:</strong> ${esc(b.audit_reason)}</p>` : ""}
            </div>
            <div>
              <h4>Discovery Provenance &amp; Next Step</h4>
              <p><strong>Discovered Via:</strong> ${(b.discovery_sources || []).map(s => `<span class="pill p-search">${esc(s)}</span>`).join(" ")}</p>
              <p><strong>Types Offered:</strong> ${esc((b.types_offered || []).join(", ") || "—")}</p>
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
            <h4>Pricing, Ownership &amp; Logistics</h4>
            <p><strong>Flagship Priced:</strong> ${esc(b.flagship_model || "—")} (${esc(b.flagship_type || "—")})</p>
            <p><strong>Queen Price:</strong> <strong>${fmtUsd(b.queen_sale_usd)}</strong> sale · ${fmtUsd(b.queen_msrp_usd)} MSRP (${esc(spread)})</p>
            <p><strong>Parent Company:</strong> ${esc(b.parent_company || "Independent")} · Founded ${b.founded_year || "—"} · ${esc(b.hq_location || "—")}</p>
            <p><strong>Manufacturing:</strong> ${esc(b.made_in_usa || "Unverified")} · <strong>Split King:</strong> ${b.offers_split_king ? "Yes" : "No"} · <strong>Flippable:</strong> ${b.offers_flippable_or_dual ? "Yes" : "No"}</p>
            <p><strong>White-Glove:</strong> ${b.white_glove_available ? (b.white_glove_fee_usd === 0 ? "Free" : fmtUsd(b.white_glove_fee_usd)) : "Not offered"} · <strong>0% APR Financing:</strong> ${b.financing_zero_apr ? "Yes" : "No"}</p>
          </div>
          <div>
            <h4>Trial, Returns, Warranty &amp; Safety</h4>
            <p><strong>Sleep Trial:</strong> ${b.trial_nights ? b.trial_nights + " nights" : "No brand trial"} · <strong>Mandatory Break-In:</strong> ${b.mandatory_break_in_required ? `Yes (${b.mandatory_break_in_days} days)` : "No (0 days)"}</p>
            <p><strong>Returns:</strong> ${b.free_returns ? "Free ($0)" : (b.return_fee_usd ? fmtUsd(b.return_fee_usd) + " fee" : "Fee / Exchange-only")} · ${esc(b.return_method || "")}</p>
            <p><strong>Warranty:</strong> ${esc(warStr)} · <strong>Non-Prorated:</strong> ${b.non_prorated_years ? b.non_prorated_years + " yrs" : "—"} · <strong>Sag Threshold:</strong> ${b.sag_threshold_inches ? b.sag_threshold_inches + '"' : "—"} · <strong>Max Slat Gap:</strong> ${b.max_slat_spacing_inches ? b.max_slat_spacing_inches + '"' : "—"}</p>
            <p><strong>Fiberglass-Free:</strong> ${esc(b.fiberglass_free || "Unverified")} · <strong>Fire Barrier:</strong> ${esc(b.fire_barrier_type || "Undisclosed")}</p>
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
        <button class="b-scope-pill ${bState.scope === "active" ? "active" : ""}" data-scope="active" type="button">All Active US <span>${c.active_us_brands}</span></button>
        <button class="b-scope-pill ${bState.scope === "primary" ? "active" : ""}" data-scope="primary" type="button">Primary-Verified Core <span>${c.primary_verified_brands}</span></button>
        <button class="b-scope-pill ${bState.scope === "directory" ? "active" : ""}" data-scope="directory" type="button">Directory Queue <span>${c.directory_queued_brands}</span></button>
        <button class="b-scope-pill ${bState.scope === "excluded" ? "active" : ""}" data-scope="excluded" type="button">Excluded Audit Log <span>${c.discontinued_or_non_us}</span></button>
      </div>

      <div class="card">
        <div class="b-controls">
          <input id="bSearch" class="b-input" type="search" placeholder="Search brand, parent company, model, certification..." value="${esc(bState.q)}">
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
          <select id="bWar" class="b-select" aria-label="Warranty">
            <option value="">Warranty: All</option>
            <option value="lifetime" ${bState.war === "lifetime" ? "selected" : ""}>Lifetime Warranty</option>
            <option value="20plus" ${bState.war === "20plus" ? "selected" : ""}>20–30 Years</option>
            <option value="10to15" ${bState.war === "10to15" ? "selected" : ""}>10–15 Years</option>
          </select>
          <select id="bSort" class="b-select" aria-label="Sort Brands">
            <option value="tier_name" ${bState.sort === "tier_name" ? "selected" : ""}>Sort: Verified First</option>
            <option value="name_asc" ${bState.sort === "name_asc" ? "selected" : ""}>Sort: Name A–Z</option>
            <option value="price_asc" ${bState.sort === "price_asc" ? "selected" : ""}>Sort: Queen Price Low–High</option>
            <option value="price_desc" ${bState.sort === "price_desc" ? "selected" : ""}>Sort: Queen Price High–Low</option>
            <option value="trial_desc" ${bState.sort === "trial_desc" ? "selected" : ""}>Sort: Longest Sleep Trial</option>
            <option value="founded_asc" ${bState.sort === "founded_asc" ? "selected" : ""}>Sort: Oldest Brand First</option>
          </select>
        </div>

        <div class="b-table-wrap">
          <table class="b-table" id="bDirTable">
            <thead>
              <tr>
                <th>Brand</th>
                <th class="b-col-seg-hide-sm">Segment</th>
                <th class="b-col-hide-sm">Flagship Type</th>
                <th class="num">Queen Sale</th>
                <th class="num b-col-hide-sm">Trial</th>
                <th class="b-col-hide-sm">Break-In</th>
                <th class="b-col-hide-md">Warranty</th>
                <th class="b-col-hide-md">Return Fee</th>
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
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--sub);">No brands match your current filters.</td></tr>`;
      } else {
        tbody.innerHTML = shown.map(b => {
          const isOpen = bState.expanded.has(b.slug);
          const tierDot = b.verification_tier === "PRIMARY_VERIFIED"
            ? `<span class="dot-done" title="Primary-Verified Core Dossier"></span>`
            : `<span class="b-dot-dir" title="${esc(b.verification_tier)}"></span>`;
          const warLbl = b.is_lifetime_warranty ? "Lifetime" : (b.warranty_years ? `${b.warranty_years} yr` : "—");
          const brkLbl = b.mandatory_break_in_required === true
            ? `<span class="pill p-forum">${b.mandatory_break_in_days}d wait</span>`
            : (b.mandatory_break_in_required === false ? `<span class="pill p-study">None</span>` : "—");
          const feeLbl = b.free_returns === true
            ? `<span class="pill p-study">$0 Free</span>`
            : (b.return_fee_usd ? `<span class="pill p-gap">${fmtUsd(b.return_fee_usd)}</span>` : (b.free_returns === false ? "Fee/Exch" : "—"));
          return `
            <tr class="b-data-row ${isOpen ? "open" : ""}" data-slug="${esc(b.slug)}" tabindex="0">
              <td>
                <div class="b-name-cell">${tierDot} <strong>${esc(b.brand_name)}</strong></div>
                <div class="b-name-sub">${esc(b.parent_company || (b.verification_tier === "PRIMARY_VERIFIED" ? "Independent" : (b.discovery_sources || [])[0] || ""))} · ${esc(b.market_segment)}</div>
              </td>
              <td class="b-col-seg-hide-sm"><span class="b-seg-tag">${esc(b.market_segment)}</span></td>
              <td class="b-col-hide-sm">${esc(b.flagship_type || (b.types_offered || [])[0] || "—")}</td>
              <td class="num"><strong>${fmtUsd(b.queen_sale_usd)}</strong></td>
              <td class="num b-col-hide-sm">${b.trial_nights != null ? (b.trial_nights === 0 ? "None" : b.trial_nights + "n") : "—"}</td>
              <td class="b-col-hide-sm">${brkLbl}</td>
              <td class="b-col-hide-md">${esc(warLbl)}</td>
              <td class="b-col-hide-md">${feeLbl}</td>
            </tr>
            ${isOpen ? `<tr class="b-drawer-row"><td colspan="8">${renderBrandDrawer(b)}</td></tr>` : ""}
          `;
        }).join("");

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
    document.getElementById("bWar").addEventListener("change", e => { bState.war = e.target.value; bState.limit = 100; renderTableOnly(); });
    document.getElementById("bSort").addEventListener("change", e => { bState.sort = e.target.value; renderTableOnly(); });

    renderTableOnly();
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
    root.innerHTML = `
      <div class="card b-intro-card">
        <h3>Independent Discovery &amp; Anti-Hallucination Methodology</h3>
        <p class="b-card-desc">
          <strong>Zero StandardCommand Data Used:</strong> This entire US mattress brand universe (${c.active_us_brands} active US brands + ${c.discontinued_or_non_us} audited non-active/non-US entities) was discovered independently from external public directories, official brand websites, and trade records so Nappedia can audit gaps objectively.
        </p>
        <p class="b-card-desc" style="margin-top:8px;">
          <strong>Strict Denominator Integrity:</strong> Every average and percentage in the Benchmarks tab is computed deterministically in Python strictly over verified, non-null primary records (with explicit <code>n=X</code> badges). Undisclosed or blocked fields remain <code>null</code> and never pollute averages.
        </p>
      </div>
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

  window.renderBrandsWorkspace = function (subTab) {
    const data = window.NAPPEDIA_BRANDS;
    const root = document.getElementById("brandsContent");
    if (!root || !data) return;
    if (subTab) bState.sub = subTab;

    document.querySelectorAll("#brandTabs .cat-tab").forEach(btn => {
      const act = btn.dataset.bsub === bState.sub;
      btn.classList.toggle("active", act);
      btn.setAttribute("aria-selected", act ? "true" : "false");
    });

    if (bState.sub === "benchmarks") renderBenchmarks(root, data);
    else if (bState.sub === "directory") renderDirectory(root, data);
    else if (bState.sub === "schema") renderSchema(root, data);
    else if (bState.sub === "sources") renderSources(root, data);
  };
})();
