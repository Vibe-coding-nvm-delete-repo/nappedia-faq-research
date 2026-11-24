/* =========================================================================
 * Nappedia Research > Comparisons Workspace (Full SERP-Verified Explorer)
 * Lists all SERP- & Autocomplete-verified Brand-vs-Brand, Same-Brand Model-vs-Model,
 * and Cross-Brand Model-vs-Model comparison pairs with hoverover SERP evidence.
 * Universal 10 compliant (light shadows and soft tints only).
 * ========================================================================= */
(function () {
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const scorePill = v => {
    const cls = v >= 8 ? "ft-hi" : (v >= 6 ? "ft-mid" : (v >= 4 ? "ft-lo" : "ft-low"));
    return `<span class="ft-score-pill ${cls}">${v}</span>`;
  };

  const TYPE_BADGE = {
    "Brand vs Brand": "t-hybrid",
    "Same-Brand Model vs Model": "t-organic",
    "Cross-Brand Model vs Model": "t-smart",
  };

  const EV_BADGE = {
    "SERP + Autocomplete": "ft-hi",
    "Multi-Site SERP": "ft-hi",
    "Competitor SERP": "ft-mid",
    "Search Autocomplete": "ft-lo",
  };

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  let mounted = false;
  const cState = {
    scope: "all",
    type: "",
    tier: "",
    q: "",
    sortCol: "strength", // strength | pair | type | vol | conv | serp_cnt | in_hub
    sortDir: "desc",
    limit: 150,
  };

  window.renderComparisonsHub = function () {
    if (mounted) return;
    const root = document.getElementById("comparisonsHubContent");
    const plan = window.NAPPEDIA_COMPARISONS_PLAN;
    const serpData = window.NAPPEDIA_COMPARISONS_SERP;
    if (!root || !plan) return;
    mounted = true;

    const pairs = (serpData && Array.isArray(serpData.pairs)) ? serpData.pairs : [];
    const byType = (serpData && serpData.by_type) || {};
    const byTier = (serpData && serpData.by_tier) || {};
    const templates = plan.templates || [];

    pairs.forEach(p => {
      p._q = `${p.pair} ${p.brand_a} ${p.brand_b} ${p.type} ${p.ev_tier}`.toLowerCase();
      p._strength = (p.serp_cnt * 3) + p.ac_cnt;
    });

    const bvbCnt = byType["Brand vs Brand"] || pairs.filter(p => p.type === "Brand vs Brand").length;
    const sameMCnt = byType["Same-Brand Model vs Model"] || pairs.filter(p => p.type === "Same-Brand Model vs Model").length;
    const crossMCnt = byType["Cross-Brand Model vs Model"] || pairs.filter(p => p.type === "Cross-Brand Model vs Model").length;
    const modelTotalCnt = sameMCnt + crossMCnt;
    const bothEvCnt = byTier["SERP + Autocomplete"] || pairs.filter(p => p.ev_tier === "SERP + Autocomplete").length;
    const multiSerpCnt = pairs.filter(p => p.serp_cnt >= 2).length;
    const notInHubCnt = pairs.filter(p => !p.in_hub).length;

    const macroCnt = document.getElementById("cnt-macro-comparisons");
    if (macroCnt && pairs.length) macroCnt.textContent = pairs.length.toLocaleString();

    root.innerHTML = `
      <div class="ft-kpi-grid">
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Verified Comparison Pairs</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;">${pairs.length.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">Backed by live SERP pages &amp; search autocomplete</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Brand vs Brand Pairs</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;color:var(--accent);">${bvbCnt.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">Across ${plan.live_brands || 543} live mattress brands</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Model vs Model Pairs</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;color:#15803d;">${modelTotalCnt.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">${sameMCnt.toLocaleString()} Same-Brand · ${crossMCnt.toLocaleString()} Cross-Brand</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Not Yet in Hub</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;">${notInHubCnt.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">${bothEvCnt.toLocaleString()} have BOTH Competitor SERPs + Autocomplete</div>
        </div>
      </div>

      <div class="card b-intro-card" style="margin-bottom:14px;">
        <h3>SERP-Verified Brand &amp; Model Comparison Explorer (${pairs.length.toLocaleString()} Pairs)</h3>
        <p class="b-card-desc">Every pair below is backed by real search proof — live dedicated <code>-vs-</code> comparison pages found on top mattress review sites (Mattress Clarity, Mattress Nerd, Sleepopolis, NapLab, Sleep Advisor, GoodBed, Sleep Foundation) and/or real US search autocomplete queries. Hover over any <strong>SERP Proof</strong> badge to inspect the exact live URLs and search queries.</p>
        <div class="ft-legend">
          <span><strong>SERP + Autocomplete:</strong> Both live competitor pages AND active US search autocomplete</span>
          <span><strong>Multi-Site SERP:</strong> 2+ competing mattress sites built a dedicated page for this exact pair</span>
          <span><strong>Templates Moved Here:</strong> ${templates.length} comparison page types removed from Brand FAQ Types · General material comparisons stay in <a href="#comparisons" style="color:var(--accent);font-weight:600;">FAQs &rarr; Comparisons</a></span>
        </div>
      </div>

      <div class="b-scope-bar" id="cmpScopeBar">
        <button class="b-scope-pill active" data-cscope="all" type="button">All Pairs <span>${pairs.length.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-cscope="both" type="button">SERP + Autocomplete <span>${bothEvCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-cscope="multi_serp" type="button">2+ Competitor SERPs <span>${multiSerpCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-cscope="bvb" type="button">Brand vs Brand <span>${bvbCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-cscope="same_m" type="button">Same-Brand Models <span>${sameMCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-cscope="cross_m" type="button">Cross-Brand Models <span>${crossMCnt.toLocaleString()}</span></button>
        <button class="b-scope-pill" data-cscope="not_hub" type="button">Not Yet in Hub <span>${notInHubCnt.toLocaleString()}</span></button>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="b-controls">
          <input id="cmpSearch" class="b-input" type="search" placeholder="Search brand or model (e.g. Saatva, Helix Midnight, Purple, WinkBed, Tempur)...">
          <select id="cmpTypeSel" class="b-select" aria-label="Filter by Comparison Type">
            <option value="">All Types (3)</option>
            <option value="Brand vs Brand">Brand vs Brand (${bvbCnt})</option>
            <option value="Same-Brand Model vs Model">Same-Brand Model vs Model (${sameMCnt})</option>
            <option value="Cross-Brand Model vs Model">Cross-Brand Model vs Model (${crossMCnt})</option>
          </select>
          <select id="cmpTierSel" class="b-select" aria-label="Filter by Evidence Tier">
            <option value="">All Evidence Tiers</option>
            <option value="SERP + Autocomplete">SERP + Autocomplete (${bothEvCnt})</option>
            <option value="Multi-Site SERP">Multi-Site SERP (${byTier["Multi-Site SERP"] || 0})</option>
            <option value="Competitor SERP">Competitor SERP (${byTier["Competitor SERP"] || 0})</option>
            <option value="Search Autocomplete">Search Autocomplete (${byTier["Search Autocomplete"] || 0})</option>
          </select>
          <button id="cmpExportCsv" class="util-btn" type="button">Export CSV</button>
        </div>
        <div class="b-table-wrap">
          <table class="b-table" id="cmpPairsTable">
            <thead id="cmpThead">
              <tr>
                <th class="sortable num b-col-hide-sm" data-col="strength" style="width:48px;">#</th>
                <th class="sortable" data-col="pair">Comparison Pair</th>
                <th class="sortable b-col-hide-sm" data-col="type">Type</th>
                <th class="sortable num" data-col="vol">Vol</th>
                <th class="sortable num" data-col="conv">Conv</th>
                <th class="sortable" data-col="serp_cnt">SERP Proof (Hover)</th>
                <th class="sortable num b-col-hide-sm" data-col="in_hub">In Hub</th>
              </tr>
            </thead>
            <tbody id="cmpTbody"></tbody>
          </table>
        </div>
        <div class="b-foot" id="cmpFoot"></div>
      </div>

      <details class="card b-intro-card">
        <summary style="cursor:pointer;font-weight:700;font-size:14px;color:var(--ink);">Moved Comparison Page Templates (${templates.length}) — Click to expand</summary>
        <div class="b-table-wrap" style="margin-top:10px;">
          <table class="b-table" id="cmpTable">
            <thead>
              <tr>
                <th class="num b-col-hide-sm" style="width:44px;">#</th>
                <th>Comparison Template</th>
                <th class="b-col-hide-md">Applies To</th>
                <th class="num">Vol</th>
                <th class="num">Conv</th>
                <th class="num">Pages</th>
              </tr>
            </thead>
            <tbody>
              ${templates.map(t => `
                <tr>
                  <td class="num b-muted b-col-hide-sm">${t.id}</td>
                  <td><div class="ft-title">${esc(t.template)}</div><div class="ft-note">${esc(t.note)}</div></td>
                  <td class="b-col-hide-md" style="white-space:nowrap;">${esc(t.applies_to)}</td>
                  <td class="num">${scorePill(t.vol)}</td>
                  <td class="num">${scorePill(t.conv)}</td>
                  <td class="num">${scorePill(t.scale)}<div class="ft-est-sub">~${(t.est_pages || 0).toLocaleString()}</div></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </details>
    `;

    const thead = document.getElementById("cmpThead");
    const tbody = document.getElementById("cmpTbody");
    const foot = document.getElementById("cmpFoot");
    let currentFiltered = [];
    const pairById = new Map(pairs.map(p => [String(p.id), p]));

    function buildCmpPopoverHtml(p) {
      const urlItems = (p.urls || []).map(u => `
        <div class="sp-item">
          <span class="sp-tag sp-tag-ded">SERP Page</span>
          <a href="${esc(u.url)}" target="_blank" rel="noopener">${esc(u.title || p.pair)}</a>
          <div class="sp-dom">${esc(u.domain)}</div>
        </div>
      `).join("");
      const acItems = (p.ac || []).map(q => `
        <div class="sp-ac-chip">&ldquo;${esc(q)}&rdquo;</div>
      `).join("");
      return `
        <div class="sp-head">
          <strong>${esc(p.pair)}</strong>
          <span class="ft-score-pill ${EV_BADGE[p.ev_tier] || "ft-mid"}">${esc(p.ev_tier)}</span>
        </div>
        <div class="sp-meta">${p.serp_cnt} live competitor SERP page${p.serp_cnt === 1 ? "" : "s"} · ${p.ac_cnt} US search autocomplete match${p.ac_cnt === 1 ? "" : "es"}</div>
        ${urlItems ? `<div class="sp-sec-lbl">Live Dedicated Comparison Pages</div><div class="sp-list">${urlItems}</div>` : ""}
        ${acItems ? `<div class="sp-sec-lbl">Live US Search Autocomplete Queries</div><div class="sp-ac-wrap">${acItems}</div>` : ""}
      `;
    }

    function updateHeaders() {
      thead.querySelectorAll("th.sortable").forEach(th => {
        const active = th.dataset.col === cState.sortCol;
        th.classList.toggle("sorted", active);
        const base = th.dataset.label || th.textContent.replace(/ [▲▼]$/, "");
        th.dataset.label = base;
        th.textContent = active ? `${base} ${cState.sortDir === "asc" ? "▲" : "▼"}` : base;
      });
    }

    function renderRows() {
      const q = cState.q.trim().toLowerCase();
      let list = pairs.filter(p => {
        if (cState.scope === "both" && p.ev_tier !== "SERP + Autocomplete") return false;
        if (cState.scope === "multi_serp" && p.serp_cnt < 2) return false;
        if (cState.scope === "bvb" && p.type !== "Brand vs Brand") return false;
        if (cState.scope === "same_m" && p.type !== "Same-Brand Model vs Model") return false;
        if (cState.scope === "cross_m" && p.type !== "Cross-Brand Model vs Model") return false;
        if (cState.scope === "not_hub" && p.in_hub) return false;
        if (cState.type && p.type !== cState.type) return false;
        if (cState.tier && p.ev_tier !== cState.tier) return false;
        if (q && !p._q.includes(q)) return false;
        return true;
      });

      const col = cState.sortCol;
      const dir = cState.sortDir;
      list.sort((a, b) => {
        let c = 0;
        if (col === "strength") c = dir === "asc" ? (a._strength - b._strength) : (b._strength - a._strength);
        else if (col === "pair") c = dir === "asc" ? a.pair.localeCompare(b.pair) : b.pair.localeCompare(a.pair);
        else if (col === "type") c = dir === "asc" ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
        else if (col === "vol") c = dir === "asc" ? (a.vol - b.vol) : (b.vol - a.vol);
        else if (col === "conv") c = dir === "asc" ? (a.conv - b.conv) : (b.conv - a.conv);
        else if (col === "serp_cnt") c = dir === "asc" ? (a.serp_cnt - b.serp_cnt) : (b.serp_cnt - a.serp_cnt);
        else if (col === "in_hub") c = dir === "asc" ? ((a.in_hub ? 1 : 0) - (b.in_hub ? 1 : 0)) : ((b.in_hub ? 1 : 0) - (a.in_hub ? 1 : 0));
        return c || (a.id - b.id);
      });

      currentFiltered = list;
      updateHeaders();

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--sub);">No comparison pairs match your filters.</td></tr>`;
        foot.innerHTML = `<span>Showing 0 of ${pairs.length.toLocaleString()} verified comparison pairs</span>`;
        return;
      }

      const shown = list.slice(0, cState.limit);
      tbody.innerHTML = shown.map(p => {
        const badgeLbl = p.serp_cnt > 0 && p.ac_cnt > 0
          ? `${p.serp_cnt} SERP · ${p.ac_cnt} AC`
          : (p.serp_cnt > 0 ? `${p.serp_cnt} SERP${p.serp_cnt === 1 ? "" : "s"}` : `${p.ac_cnt} AC`);
        return `
          <tr>
            <td class="num b-muted b-col-hide-sm">${p.id}</td>
            <td>
              <div class="ft-title">${esc(p.pair)}</div>
              <div class="ft-note">${esc(p.brand_a)}${p.brand_b !== p.brand_a ? ` vs ${esc(p.brand_b)}` : " (Same Brand)"}</div>
              <span class="b-type-pill ft-mob-cat ${TYPE_BADGE[p.type] || "t-default"}">${esc(p.type)}</span>
            </td>
            <td class="b-col-hide-sm"><span class="b-type-pill ${TYPE_BADGE[p.type] || "t-default"}">${esc(p.type)}</span></td>
            <td class="num">${scorePill(p.vol)}</td>
            <td class="num">${scorePill(p.conv)}</td>
            <td>
              <button class="serp-proof-btn ${EV_BADGE[p.ev_tier] || "ft-mid"}" type="button" data-cmpid="${p.id}" aria-label="View SERP proof for ${esc(p.pair)}">
                <span>${esc(badgeLbl)}</span>
                <span class="sp-ico" aria-hidden="true">&#9432;</span>
              </button>
            </td>
            <td class="num b-col-hide-sm">${p.in_hub ? `<span class="b-fg-pill fg-no">Yes</span>` : `<span class="b-muted">0</span>`}</td>
          </tr>
        `;
      }).join("");

      const moreBtn = shown.length < list.length
        ? `<button id="cmpLoadMore" class="load-btn" type="button" style="margin-left:10px;">Show +250 more (${(list.length - shown.length).toLocaleString()} left)</button>`
        : "";
      foot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${list.length.toLocaleString()} matching comparison pairs (${pairs.length.toLocaleString()} total verified)</span>${moreBtn}`;
      const lm = document.getElementById("cmpLoadMore");
      if (lm) lm.addEventListener("click", () => { cState.limit += 250; renderRows(); });
    }

    // Bind hover + click popover on SERP Proof buttons
    if (window.bindSerpPopover) {
      window.bindSerpPopover(tbody, ".serp-proof-btn", btn => {
        const p = pairById.get(btn.dataset.cmpid);
        return p ? buildCmpPopoverHtml(p) : "";
      });
    }

    document.getElementById("cmpScopeBar").addEventListener("click", e => {
      const btn = e.target.closest(".b-scope-pill");
      if (!btn) return;
      cState.scope = btn.dataset.cscope || "all";
      cState.limit = 150;
      document.querySelectorAll("#cmpScopeBar .b-scope-pill").forEach(b => b.classList.toggle("active", b === btn));
      renderRows();
    });
    document.getElementById("cmpSearch").addEventListener("input", debounce(e => { cState.q = e.target.value; cState.limit = 150; renderRows(); }, 120));
    document.getElementById("cmpTypeSel").addEventListener("change", e => { cState.type = e.target.value; cState.limit = 150; renderRows(); });
    document.getElementById("cmpTierSel").addEventListener("change", e => { cState.tier = e.target.value; cState.limit = 150; renderRows(); });
    thead.addEventListener("click", e => {
      const th = e.target.closest("th.sortable");
      if (!th) return;
      const col = th.dataset.col;
      if (cState.sortCol === col) cState.sortDir = cState.sortDir === "desc" ? "asc" : "desc";
      else {
        cState.sortCol = col;
        cState.sortDir = (col === "pair" || col === "type") ? "asc" : "desc";
      }
      renderRows();
    });
    document.getElementById("cmpExportCsv").addEventListener("click", () => {
      const headers = ["id", "pair", "type", "brand_a", "brand_b", "vol_1_10", "conv_1_10", "evidence_tier", "serp_pages_count", "autocomplete_count", "in_hub", "top_serp_url", "top_autocomplete_query"];
      const csvRows = [headers.join(",")].concat(currentFiltered.map(p => [
        p.id, p.pair, p.type, p.brand_a, p.brand_b, p.vol, p.conv, p.ev_tier, p.serp_cnt, p.ac_cnt,
        p.in_hub ? "Yes" : "No", (p.urls[0] && p.urls[0].url) || "", p.ac[0] || ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")));
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `nappedia_comparisons_serp_verified_${currentFiltered.length}.csv`;
      a.click();
    });

    renderRows();
  };
})();
