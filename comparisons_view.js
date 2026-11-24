/* =========================================================================
 * Nappedia Research > Comparisons Workspace (Starter Hub)
 * Separate from Brand FAQs so we can generate Brand-vs-Brand and
 * Model-vs-Model permutations and filter to pairs with real search volume.
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

  let mounted = false;

  window.renderComparisonsHub = function () {
    if (mounted) return;
    const root = document.getElementById("comparisonsHubContent");
    const plan = window.NAPPEDIA_COMPARISONS_PLAN;
    if (!root || !plan) return;
    mounted = true;

    const templates = plan.templates || [];
    const totalHub = (plan.current_hub_brand_vs_brand || 0)
      + (plan.current_hub_same_brand_models || 0)
      + (plan.current_hub_cross_brand_models || 0);

    root.innerHTML = `
      <div class="ft-kpi-grid">
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Brands Ready to Pair</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;">${(plan.live_brands || 543).toLocaleString()}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">Live today (${(plan.total_brands || 591).toLocaleString()} with upcoming)</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Canonical Models</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;">${(plan.canonical_models || 15027).toLocaleString()}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">Deduplicated models across all 591 brands</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Comparison Page Types</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;color:var(--accent);">${templates.length}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">Moved out of Brand FAQ Types</div>
        </div>
        <div class="rv-kpi">
          <div class="rv-kpi-lbl">Pairs in Hub Today</div>
          <div style="font-size:26px;font-weight:800;margin-top:4px;color:#15803d;">${totalHub.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px;">${plan.current_hub_brand_vs_brand} Brand vs Brand · ${plan.current_hub_same_brand_models} Model vs Model</div>
        </div>
      </div>

      <div class="card b-intro-card" style="margin-bottom:14px;">
        <h3>Brand &amp; Model Comparison Pages (Separate Section)</h3>
        <p class="b-card-desc">Comparison pages live here instead of inside <strong>Brand FAQ Types</strong>. Why? Comparing two brands or two models creates thousands of possible pairs. Next, we will run a dedicated pair-finder across our ${(plan.canonical_models || 15027).toLocaleString()} models to find every exact matchup that people actually search for on Google.</p>
        <div class="ft-legend">
          <span><strong>Status:</strong> Starter workspace ready — permutation mining paused while we prioritize multi-hundred-page Brand FAQs first.</span>
          <span>Looking for general mattress-type comparisons (like Memory Foam vs Hybrid)? Those stay in <a href="#comparisons" style="color:var(--accent);font-weight:600;">FAQs &rarr; Comparisons</a>.</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <div class="b-card-head">
          <h3>Comparison Page Templates (${templates.length})</h3>
          <span class="b-n-pill">Removed from Brand FAQ Types</span>
        </div>
        <div class="b-table-wrap">
          <table class="b-table" id="cmpTable">
            <thead>
              <tr>
                <th class="num b-col-hide-sm" style="width:44px;">#</th>
                <th>Comparison Page Type</th>
                <th class="b-col-hide-md">Applies To</th>
                <th class="num">Vol</th>
                <th class="num">Conv</th>
                <th class="num">Pages</th>
                <th class="num b-col-hide-sm">In Hub</th>
                <th class="b-col-hide-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              ${templates.map(t => `
                <tr>
                  <td class="num b-muted b-col-hide-sm">${t.id}</td>
                  <td>
                    <div class="ft-title">${esc(t.template)}</div>
                    <div class="ft-note">${esc(t.note)}</div>
                  </td>
                  <td class="b-col-hide-md" style="white-space:nowrap;">${esc(t.applies_to)}</td>
                  <td class="num">${scorePill(t.vol)}</td>
                  <td class="num">${scorePill(t.conv)}</td>
                  <td class="num">
                    ${scorePill(t.scale)}
                    <div class="ft-est-sub">~${(t.est_pages || 0).toLocaleString()}</div>
                  </td>
                  <td class="num b-col-hide-sm">${t.hub_pages === 0 ? `<span class="b-muted">0</span>` : `<strong>${t.hub_pages.toLocaleString()}</strong>`}</td>
                  <td class="b-col-hide-sm"><span class="b-type-pill t-smart">${esc(t.status)}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="cmp-steps-grid">
        <div class="card b-intro-card">
          <h3>1. Smart Pair Builder</h3>
          <p class="b-card-desc">Group our ${(plan.canonical_models || 15027).toLocaleString()} models by brand, mattress type (foam, hybrid, latex, air), and price tier so we only test matchups real shoppers compare.</p>
        </div>
        <div class="card b-intro-card">
          <h3>2. Search Volume Check</h3>
          <p class="b-card-desc">Test Same-Brand and Cross-Brand pairs with Google Suggest &amp; DeepSeek Search to keep only the matchups that have real monthly searches.</p>
        </div>
        <div class="card b-intro-card">
          <h3>3. Ranked Build Queue</h3>
          <p class="b-card-desc">Sort every verified pair by search volume, buyer readiness, and whether both brand reviews are already live on Nappedia.</p>
        </div>
      </div>
    `;
  };
})();
