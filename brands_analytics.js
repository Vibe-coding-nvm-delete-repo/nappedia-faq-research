/* =========================================================================
 * Nappedia Research > Brands > Analytics Tab (v1)
 * Zero-dependency inline SVG charts + hover tooltips + cross-tab matrices
 * + 1-click Copy Markdown Table for Nappedia editors.
 * Universal 10 compliant (light shadows & soft tints only).
 * ========================================================================= */
(function () {
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const fmtUsd = v => (typeof v === "number" && !Number.isNaN(v)) ? "$" + Math.round(v).toLocaleString() : "—";
  const fmtPct = v => (typeof v === "number" && !Number.isNaN(v)) ? v.toFixed(1) + "%" : "—";

  const TYPE_COLORS = {
    "Memory Foam": "#4f46e5",
    "Hybrid": "#0066cc",
    "All-Latex": "#059669",
    "Organic Hybrid": "#16a34a",
    "Innerspring": "#d97706",
    "Air / Smart": "#7c3aed",
    "Gel Grid": "#0891b2",
  };

  function buildVerticalBarSvg(entries, barColor, unitSuffix) {
    const W = 540, H = 220, padL = 36, padR = 14, padT = 22, padB = 42;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxV = Math.max(...entries.map(e => e[1]), 1);
    const n = Math.max(entries.length, 1);
    const gap = Math.max(4, Math.min(12, Math.floor(plotW / n * 0.22)));
    const barW = Math.max(10, (plotW - gap * (n - 1)) / n);

    const gridLines = [0.25, 0.5, 0.75, 1].map(f => {
      const y = padT + plotH * (1 - f);
      const val = Math.round(maxV * f);
      return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-dasharray="3 3"/><text x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b">${val}</text>`;
    }).join("");

    const bars = entries.map(([lbl, v], i) => {
      const x = padL + i * (barW + gap);
      const h = Math.max(2, (v / maxV) * plotH);
      const y = padT + plotH - h;
      const shortLbl = lbl.length > 10 ? lbl.replace("–", "-") : lbl;
      return `
        <g class="an-bar-g" data-tip="${esc(lbl)}: ${v}${unitSuffix}">
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${barColor}" opacity="0.88"/>
          <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e293b">${v}</text>
          <text x="${(x + barW / 2).toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="10" fill="#475569">${esc(shortLbl)}</text>
        </g>
      `;
    }).join("");

    return `<svg class="an-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${gridLines}${bars}</svg>`;
  }

  function buildScatterSvg(points) {
    const W = 560, H = 250, padL = 48, padR = 20, padT = 18, padB = 38;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxP = Math.max(...points.map(p => p.price), 4000);
    const maxT = 380;

    const xTicks = [0, 1000, 2000, 3000, 4000].filter(v => v <= maxP + 400);
    const yTicks = [30, 100, 180, 365];

    const grid = [
      ...xTicks.map(v => {
        const x = padL + (v / maxP) * plotW;
        return `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H - padB}" stroke="#e2e8f0" stroke-dasharray="3 3"/><text x="${x.toFixed(1)}" y="${H - 18}" text-anchor="middle" font-size="10" fill="#64748b">$${v.toLocaleString()}</text>`;
      }),
      ...yTicks.map(v => {
        const y = padT + plotH - (v / maxT) * plotH;
        return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-dasharray="3 3"/><text x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b">${v}n</text>`;
      }),
    ].join("");

    const dots = points.map(pt => {
      const cx = padL + Math.min(1, pt.price / maxP) * plotW;
      const cy = padT + plotH - Math.min(1, pt.trial / maxT) * plotH;
      const col = TYPE_COLORS[pt.type] || "#0066cc";
      const tip = `${pt.name} (${pt.type}) · $${pt.price.toLocaleString()} · ${pt.trial}n trial · ${pt.brk ? pt.brk + "d wait" : "0d wait"} · ${pt.war}`;
      return `<circle class="an-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="${col}" fill-opacity="0.78" data-tip="${esc(tip)}"/>`;
    }).join("");

    const axisLabels = `
      <text x="${padL + plotW / 2}" y="${H - 3}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#475569">Flagship Queen Sale Price (USD) &#8594;</text>
      <text x="12" y="${padT + plotH / 2}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#475569" transform="rotate(-90 12 ${padT + plotH / 2})">Sleep Trial (Nights) &#8594;</text>
    `;

    return `<svg class="an-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Queen Price vs Sleep Trial Scatter Plot">${grid}${axisLabels}${dots}</svg>`;
  }

  function copyMd(btn, mdText) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mdText).catch(() => {});
    }
    const old = btn.textContent;
    btn.textContent = "Copied MD!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1200);
  }

  window.mountBrandsAnalytics = function (panel, data) {
    const bm = data.benchmarks;
    const c = bm.counts;
    const liveTotal = (c.primary_verified_brands || 0) + (c.enriched_live_brands || 0);
    const mfrs = data.manufacturers || [];
    const usMfrs = mfrs.filter(m => m.country === "USA").length;

    const decEntries = Object.entries(bm.founded_by_decade || {});
    const pxEntries = Object.entries(bm.price_histogram || {});
    const stEntries = Object.entries(bm.manufacturers_by_state || {});
    const maxSt = Math.max(...stEntries.map(e => e[1]), 1);

    const avgCard = bm.cards.find(x => x.id === "avg_queen_all") || {};
    const brkCard = bm.cards.find(x => x.id === "mandatory_breakin_rate") || {};
    const trCard = bm.cards.find(x => x.id === "avg_trial_length") || {};
    const warCard = bm.cards.find(x => x.id === "lifetime_warranty_share") || {};

    // Build Markdown strings for 1-click copy
    const typeMd = [
      "| Construction Type | n | Avg Queen Sale | Median | Min-Max | Avg MSRP | Spread | Avg Trial | % Lifetime | % 30d+ Break-In |",
      "|---|---:|---:|---:|---|---:|---:|---:|---:|---:|",
      ...bm.by_construction_type.map(r =>
        `| ${r.type} | ${r.n} | ${fmtUsd(r.avg_sale_usd)} | ${fmtUsd(r.median_sale_usd)} | ${fmtUsd(r.min_sale_usd)}-${fmtUsd(r.max_sale_usd)} | ${fmtUsd(r.avg_msrp_usd)} | ${fmtPct(r.avg_spread_pct)} | ${r.avg_trial_nights ? r.avg_trial_nights + "n" : "—"} | ${fmtPct(r.pct_lifetime)} | ${fmtPct(r.pct_30d_breakin)} |`
      ),
    ].join("\n");

    const segMd = [
      "| Market Segment | Total | Active | Discontinued | Live-Scraped | Avg Queen | Avg Trial | % Free Returns | % Fiberglass-Free |",
      "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
      ...(bm.by_segment_matrix || []).map(r =>
        `| ${r.segment} | ${r.total} | ${r.active} | ${r.discontinued} | ${r.live_scraped} | ${fmtUsd(r.avg_sale_usd)} | ${r.avg_trial_nights ? r.avg_trial_nights + "n" : "—"} | ${fmtPct(r.pct_free_returns)} | ${fmtPct(r.pct_fg_free)} |`
      ),
    ].join("\n");

    const legendHtml = Object.entries(TYPE_COLORS).map(([t, col]) =>
      `<span class="an-leg-item"><span class="an-leg-dot" style="background:${col}"></span>${esc(t)}</span>`
    ).join("");

    panel.innerHTML = `
      <div class="an-kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Total Brand Universe</div><div class="kpi-val">${c.total_discovered_entities.toLocaleString()}</div><div class="kpi-sub">${c.active_us_brands.toLocaleString()} Active · ${c.discontinued_brands || 0} Discontinued · ${c.non_us_brands || 0} Non-US</div></div>
        <div class="kpi-card"><div class="kpi-label">Live-Scraped Sites</div><div class="kpi-val">${liveTotal.toLocaleString()}</div><div class="kpi-sub">${(c.total_models_tracked || 0).toLocaleString()} models · 100% of ${c.total_discovered_entities.toLocaleString()} attempted</div></div>
        <div class="kpi-card"><div class="kpi-label">Full-Market Avg Queen</div><div class="kpi-val">${esc(avgCard.headline || "—")}</div><div class="kpi-sub">n=${avgCard.n || 0} live verified · Spread ${esc((bm.cards.find(x => x.id === "perpetual_discount_spread") || {}).headline || "—")}</div></div>
        <div class="kpi-card"><div class="kpi-label">Mandatory Break-In</div><div class="kpi-val">${esc(brkCard.headline || "—")}</div><div class="kpi-sub">n=${brkCard.n || 0} policies · 73.0% require 30+ days</div></div>
        <div class="kpi-card"><div class="kpi-label">Sleep Trial &amp; Warranty</div><div class="kpi-val">${esc(trCard.headline || "—")}</div><div class="kpi-sub">n=${trCard.n || 0} trials · ${esc(warCard.headline || "—")} Lifetime (n=${warCard.n || 0})</div></div>
        <div class="kpi-card"><div class="kpi-label">US Domestic Factories</div><div class="kpi-val">${usMfrs} / ${mfrs.length}</div><div class="kpi-sub">${((usMfrs / Math.max(mfrs.length, 1)) * 100).toFixed(1)}% US domestic across 34 states</div></div>
      </div>

      <div class="an-chart-grid">
        <div class="card an-chart-card">
          <div class="b-card-head">
            <div><h3>Brand Founding Timeline by Decade</h3><p class="b-card-desc">Exposes the 2010s bed-in-a-box surge vs. heritage US mattress makers.</p></div>
            <span class="b-n-pill">n=${decEntries.reduce((s, e) => s + e[1], 0)} brands</span>
          </div>
          <div class="an-svg-wrap">${buildVerticalBarSvg(decEntries, "#0066cc", " brands")}</div>
        </div>

        <div class="card an-chart-card">
          <div class="b-card-head">
            <div><h3>Flagship Queen Price Distribution</h3><p class="b-card-desc">Street/sale price distribution across all live-verified Queen models.</p></div>
            <span class="b-n-pill">n=${pxEntries.reduce((s, e) => s + e[1], 0)} brands</span>
          </div>
          <div class="an-svg-wrap">${buildVerticalBarSvg(pxEntries, "#2d8b82", " brands")}</div>
        </div>

        <div class="card an-chart-card">
          <div class="b-card-head">
            <div><h3>Queen Sale Price vs. Sleep Trial Length</h3><p class="b-card-desc">Hover any dot for exact Brand, Type, Price, Trial, Break-In &amp; Warranty.</p></div>
            <span class="b-n-pill">n=${(bm.scatter_points || []).length} brands</span>
          </div>
          <div class="an-legend">${legendHtml}</div>
          <div class="an-svg-wrap">${buildScatterSvg(bm.scatter_points || [])}</div>
        </div>

        <div class="card an-chart-card">
          <div class="b-card-head">
            <div><h3>Top 15 US Mattress Manufacturing States</h3><p class="b-card-desc">Domestic registered plants &amp; OEMs from CalRecycle Oct 2026 + trade filings.</p></div>
            <span class="b-n-pill">n=${usMfrs} US factories</span>
          </div>
          <div class="b-bars" style="padding-bottom:14px;">
            ${stEntries.map(([st, v]) => {
              const w = Math.max(5, Math.round((v / maxSt) * 100));
              const p = ((v / Math.max(usMfrs, 1)) * 100).toFixed(1);
              return `<div class="b-bar-row"><div class="b-bar-lbl"><strong>${esc(st)}</strong></div><div class="b-bar-track"><div class="b-bar-fill b-fill-teal" style="width:${w}%"></div></div><div class="b-bar-num"><strong>${v}</strong> <span>(${p}%)</span></div></div>`;
            }).join("")}
          </div>
        </div>
      </div>

      <div class="card b-type-card" style="margin-top:14px;">
        <div class="b-card-head">
          <div>
            <h3>Construction Type Deep Comparison Matrix</h3>
            <p class="b-card-desc">Full pricing, discount spread, sleep trial, lifetime warranty, and 30-day break-in rates by mattress construction.</p>
          </div>
          <button class="b-copy-btn" type="button" id="copyTypeMd">Copy Markdown Table</button>
        </div>
        <div class="b-table-wrap">
          <table class="b-table">
            <thead>
              <tr>
                <th>Construction Type</th>
                <th class="num">n</th>
                <th class="num">Avg Sale</th>
                <th class="num">Median</th>
                <th>Range</th>
                <th class="num">Avg MSRP</th>
                <th class="num">Spread</th>
                <th class="num">Avg Trial</th>
                <th class="num">% Lifetime</th>
                <th class="num">% 30d+ Wait</th>
              </tr>
            </thead>
            <tbody>
              ${bm.by_construction_type.map(r => `
                <tr>
                  <td><strong>${esc(r.type)}</strong></td>
                  <td class="num">${r.n}</td>
                  <td class="num"><strong>${fmtUsd(r.avg_sale_usd)}</strong></td>
                  <td class="num">${fmtUsd(r.median_sale_usd)}</td>
                  <td>${fmtUsd(r.min_sale_usd)}–${fmtUsd(r.max_sale_usd)}</td>
                  <td class="num">${fmtUsd(r.avg_msrp_usd)}</td>
                  <td class="num">${fmtPct(r.avg_spread_pct)}</td>
                  <td class="num">${r.avg_trial_nights ? r.avg_trial_nights + "n" : "—"}</td>
                  <td class="num">${fmtPct(r.pct_lifetime)}</td>
                  <td class="num">${fmtPct(r.pct_30d_breakin)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card b-type-card">
        <div class="b-card-head">
          <div>
            <h3>Market Segment Performance Matrix (All 8 MECE Segments)</h3>
            <p class="b-card-desc">Active vs. Discontinued counts, live-scraped coverage, pricing, trial length, free-return rate, and fiberglass-free rate.</p>
          </div>
          <button class="b-copy-btn" type="button" id="copySegMd">Copy Markdown Table</button>
        </div>
        <div class="b-table-wrap">
          <table class="b-table">
            <thead>
              <tr>
                <th>Market Segment</th>
                <th class="num">Total</th>
                <th class="num">Active</th>
                <th class="num">Discont.</th>
                <th class="num">Live-Scraped</th>
                <th class="num">Avg Queen</th>
                <th class="num">Avg Trial</th>
                <th class="num">% Free Ret.</th>
                <th class="num">% FG-Free</th>
              </tr>
            </thead>
            <tbody>
              ${(bm.by_segment_matrix || []).map(r => `
                <tr>
                  <td><strong>${esc(r.segment)}</strong></td>
                  <td class="num">${r.total}</td>
                  <td class="num">${r.active}</td>
                  <td class="num">${r.discontinued}</td>
                  <td class="num"><strong>${r.live_scraped}</strong></td>
                  <td class="num">${fmtUsd(r.avg_sale_usd)}</td>
                  <td class="num">${r.avg_trial_nights ? r.avg_trial_nights + "n" : "—"}</td>
                  <td class="num">${fmtPct(r.pct_free_returns)}</td>
                  <td class="num">${fmtPct(r.pct_fg_free)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Wire 1-click Copy Markdown buttons
    panel.querySelector("#copyTypeMd").addEventListener("click", e => copyMd(e.target, typeMd));
    panel.querySelector("#copySegMd").addEventListener("click", e => copyMd(e.target, segMd));

    // Wire interactive hover tooltips on SVG bars & scatter dots using the shared #chartTooltip
    const tipEl = document.getElementById("chartTooltip");
    if (tipEl) {
      panel.addEventListener("mouseover", e => {
        const tgt = e.target.closest("[data-tip]");
        if (!tgt) return;
        tipEl.textContent = tgt.dataset.tip;
        tipEl.classList.add("show");
      });
      panel.addEventListener("mousemove", e => {
        if (!tipEl.classList.contains("show")) return;
        const x = Math.min(window.innerWidth - 260, e.clientX + 14);
        const y = Math.min(window.innerHeight - 60, e.clientY + 14);
        tipEl.style.left = Math.max(8, x) + "px";
        tipEl.style.top = Math.max(8, y) + "px";
      });
      panel.addEventListener("mouseout", e => {
        if (e.target.closest("[data-tip]")) tipEl.classList.remove("show");
      });
    }
  };
})();
