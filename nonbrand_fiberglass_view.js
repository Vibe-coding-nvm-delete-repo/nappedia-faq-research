/* Interactive Non-Brand Fiberglass (170 Validated Pages) Workspace for Nappedia Research Hub */
(function () {
  const nbfgState = {
    sub: "faqs",      // faqs | commercial | epic | overlap | merged | oos
    q: "",
    family: "",
    status: "",       // "" | net_new | overlap | retailer | drafted
    tier: "",         // "" | T1 | T2 | T3
    storyId: "",      // "" | S00..S14
    limit: 200,
  };

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pill(text, bg, color) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${bg};color:${color};white-space:nowrap;">${esc(text)}</span>`;
  }

  function downloadCsv(rows, filename) {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const lines = [keys.join(",")].concat(
      rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  window.renderNbfgView = function () {
    const data = window.NAPPEDIA_NONBRAND_FIBERGLASS;
    const root = document.getElementById("nbfgContent");
    if (!root || !data) return;
    const s = data.summary;
    const overlapAll = data.faq_pages.concat(data.commercial_guides).filter(x => x.live_guide_overlap === "OVERLAPS_LIVE_GUIDE");
    const families = Array.from(new Set(data.faq_pages.concat(data.commercial_guides).map(x => x.family))).sort();

    // Filter active dataset
    const q = nbfgState.q.trim().toLowerCase();
    const isEpicTab = (nbfgState.sub === "epic");
    let rows = [];
    if (nbfgState.sub === "faqs") rows = data.faq_pages;
    else if (nbfgState.sub === "commercial") rows = data.commercial_guides;
    else if (nbfgState.sub === "epic") rows = (data.epic_stories || []);
    else if (nbfgState.sub === "overlap") rows = overlapAll;
    else if (nbfgState.sub === "merged") rows = data.merged_twins;
    else rows = data.out_of_scope;

    const filtered = rows.filter(r => {
      if (isEpicTab) {
        if (nbfgState.storyId && r.id !== nbfgState.storyId) return false;
        if (q) {
          const hay = `${r.id} ${r.wave} ${r.title} ${r.value_prop} ${(r.pages_preview || []).map(p => p.title).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }
      if (nbfgState.family && r.family !== nbfgState.family) return false;
      if (nbfgState.tier && r.tier !== nbfgState.tier) return false;
      if (nbfgState.status === "net_new" && r.live_guide_overlap !== "NET_NEW") return false;
      if (nbfgState.status === "overlap" && r.live_guide_overlap !== "OVERLAPS_LIVE_GUIDE") return false;
      if (nbfgState.status === "retailer" && !r.has_retailer) return false;
      if (nbfgState.status === "drafted" && r.draft_status !== "DRAFTED_READY") return false;
      if (q) {
        const hay = `${r.id || ""} ${r.title || ""} ${r.query || ""} ${r.slug || ""} ${r.family || ""} ${r.live_guide_url || ""} ${r.merged_into_label || ""} ${r.reason || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const isKeptTab = (nbfgState.sub === "faqs" || nbfgState.sub === "commercial" || nbfgState.sub === "overlap");
    const shown = filtered.slice(0, nbfgState.limit);

    const kpis = [
      { lbl: "Non-Brand FAQs", val: s.kept_faq, sub: `${s.faq_net_new} net-new · ${s.faq_overlaps_live_guide} overlap /guides/` },
      { lbl: "Commercial Guides", val: s.kept_commercial, sub: `${s.comm_net_new} net-new · ${s.comm_overlaps_live_guide} overlap /guides/` },
      { lbl: "Total Validated Pages", val: s.kept_total, sub: `${s.faq_retailer_pages} retailer FAQs · ${s.faq_drafted_ready} drafted ready` },
      { lbl: "90/10 Exhaustion", val: "DRY", sub: `${s.total_probes.toLocaleString()} probes · ${s.total_unique_in_scope_kws.toLocaleString()} US KWs` },
      { lbl: "Dual-Critic Gate", val: "PASS", sub: "Wave 2: 9.80/9.90 · Wave 3: 9.85/10" },
    ];

    let thead = "";
    let tbody = "";
    if (isKeptTab) {
      thead = `<tr>
        <th class="num" style="width:48px;">#</th>
        <th style="width:58px;">Tier</th>
        <th class="num" style="width:62px;">Score</th>
        <th>Page Title &amp; Target Slug</th>
        <th>Main Search Query</th>
        <th>Family</th>
        <th>Live /guides/ Status</th>
        <th>Tags</th>
      </tr>`;
      tbody = shown.map(r => {
        const tierPill = r.tier === "T1"
          ? pill("T1", "#e4f2e9", "#166534")
          : r.tier === "T2"
          ? pill("T2", "#e8f0fe", "#1d4ed8")
          : pill("T3", "#f3f4f6", "#4b5563");
        const ovHtml = r.live_guide_overlap === "OVERLAPS_LIVE_GUIDE"
          ? `${pill("OVERLAPS /guides/", "#fef3c7", "#92400e")}<div style="margin-top:4px;font-size:11px;"><a href="${esc(r.live_guide_url)}" target="_blank" rel="noopener" style="color:#0066cc;text-decoration:underline;word-break:break-all;">${esc(r.live_guide_url.replace("https://www.nappedia.com", ""))} &#8599;</a></div>`
          : pill("NET_NEW", "#e4f2e9", "#166534");
        const tags = [];
        if (r.has_retailer) tags.push(pill("Retailer", "#ede9fe", "#5b21b6"));
        if (r.draft_status === "DRAFTED_READY") tags.push(pill("Draft Ready", "#dcfce7", "#166534"));
        if (r.decision === "keep_commercial") tags.push(pill("Commercial", "#fce7f3", "#9d174d"));
        return `<tr>
          <td class="num"><strong>${r.rank}</strong></td>
          <td>${tierPill}</td>
          <td class="num"><strong>${Number(r.score).toFixed(2)}</strong></td>
          <td>
            <div style="font-weight:600;color:var(--ink,#111827);line-height:1.35;">${esc(r.title)}</div>
            <div style="font-size:11px;color:var(--muted,#6b7280);margin-top:2px;"><code>/answers/${esc(r.slug)}</code> · ${esc(r.id)}</div>
          </td>
          <td style="font-size:13px;">${esc(r.query)}</td>
          <td style="font-size:12px;color:var(--muted,#4b5563);">${esc(r.family)}</td>
          <td>${ovHtml}</td>
          <td style="display:flex;flex-wrap:wrap;gap:4px;">${tags.join("") || '<span style="font-size:11px;color:#9ca3af;">FAQ</span>'}</td>
        </tr>`;
      }).join("");
    let epicCardsHtml = "";
    if (isEpicTab) {
      const fmtCode = s => esc(s).replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:4px;font-size:11px;">$1</code>');
      epicCardsHtml = `<div style="display:flex;flex-direction:column;gap:12px;padding:12px 16px 16px;">${
        shown.map(st => {
          const typePill = st.type === "pillar_hub"
            ? pill("Pillar Hub", "#fce7f3", "#9d174d")
            : st.type === "faq_batch"
            ? pill("FAQ Batch", "#e4f2e9", "#166534")
            : st.type === "commercial_batch"
            ? pill("Commercial", "#ede9fe", "#5b21b6")
            : pill(st.type, "#f3f4f6", "#4b5563");
          const splitPills = st.page_count
            ? `${pill(st.page_count + " Pages", "#e8f0fe", "#1d4ed8")} ${pill(st.net_new_count + " NET_NEW", "#e4f2e9", "#166534")} ${st.overlap_count ? pill(st.overlap_count + " OVERLAP", "#fef3c7", "#92400e") : ""}`
            : pill("Hub / Ops", "#f3f4f6", "#4b5563");
          const pagesList = (st.pages_preview || []).length
            ? `<details style="margin-top:10px;"><summary style="cursor:pointer;font-size:12px;font-weight:600;color:#0066cc;">View all ${st.page_count} assigned pages</summary><div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:12px;word-break:break-word;">${st.pages_preview.map((p, idx) => `<div><strong>${idx + 1}.</strong> <code>${esc(p.id)}</code> [${esc(p.tier)}|${Number(p.score).toFixed(2)}] ${esc(p.title)} <span style="color:#6b7280;">(/answers/${esc(p.slug)})</span></div>`).join("")}</div></details>`
            : "";
          return `<article style="background:#ffffff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(15,23,42,0.08);">
            <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
                <strong style="font-size:13px;"><code>${esc(st.id)}</code></strong>
                ${typePill}
                <span style="font-size:12px;color:var(--muted,#6b7280);">${esc(st.wave)}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">${splitPills}</div>
            </div>
            <div style="font-weight:700;color:var(--ink,#111827);font-size:15px;line-height:1.35;">${fmtCode(st.title)}</div>
            <div style="font-size:13px;color:var(--muted,#374151);margin-top:6px;line-height:1.5;">${fmtCode(st.value_prop)}</div>
            <div style="font-size:12px;color:#4b5563;margin-top:8px;line-height:1.45;"><strong>Definition of Done:</strong> ${fmtCode((st.dod || []).join(" · "))}</div>
            ${pagesList}
          </article>`;
        }).join("") || '<div style="text-align:center;padding:24px;color:#6b7280;">No matching stories.</div>'
      }</div>`;
    } else if (nbfgState.sub === "merged") {
      thead = `<tr><th style="width:96px;">ID</th><th>Family</th><th>Original Query</th><th>Merged Into Canonical Page</th><th>Reason</th></tr>`;
      tbody = shown.map(r => `<tr>
        <td><code>${esc(r.id)}</code></td>
        <td style="font-size:12px;">${esc(r.family)}</td>
        <td>${esc(r.query)}</td>
        <td style="font-weight:600;color:#166534;">${esc(r.merged_into_label)}</td>
        <td style="font-size:12px;color:var(--muted,#4b5563);">${esc(r.reason)}</td>
      </tr>`).join("");
    } else {
      thead = `<tr><th style="width:96px;">ID</th><th>Family</th><th>Original Query</th><th>Exclusion Reason</th></tr>`;
      tbody = shown.map(r => `<tr>
        <td><code>${esc(r.id)}</code></td>
        <td style="font-size:12px;">${esc(r.family)}</td>
        <td>${esc(r.query)}</td>
        <td style="font-size:12px;color:var(--muted,#4b5563);">${esc(r.reason)}</td>
      </tr>`).join("");
    }

    root.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:14px;">
        ${kpis.map(k => `
          <div class="card" style="padding:14px 16px;margin:0;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--muted,#6b7280);">${esc(k.lbl)}</div>
            <div style="font-size:24px;font-weight:700;color:var(--ink,#111827);margin:4px 0 2px;">${esc(k.val)}</div>
            <div style="font-size:12px;color:var(--muted,#4b5563);">${esc(k.sub)}</div>
          </div>
        `).join("")}
      </div>

      <main class="card">
        <div class="card-head" style="flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="card-title" style="margin:0;">Non-Brand Fiberglass + Mattress FAQs (${s.kept_total} Validated Pages)</h2>
            <div class="stat-line">57 seed clusters across 10 MECE families · 0 drops (${s.gate_total.toLocaleString()} candidates reconciled) · Live /guides/ overlaps tagged, never hidden</div>
          </div>
          <div class="seg-group" role="tablist" aria-label="Non-Brand Fiberglass Views" style="flex-wrap:wrap;">
            <button class="seg-btn ${nbfgState.sub === "faqs" ? "active" : ""}" data-nbfgsub="faqs" type="button">Non-Brand FAQs (${s.kept_faq})</button>
            <button class="seg-btn ${nbfgState.sub === "commercial" ? "active" : ""}" data-nbfgsub="commercial" type="button">Commercial Guides (${s.kept_commercial})</button>
            <button class="seg-btn ${nbfgState.sub === "epic" ? "active" : ""}" data-nbfgsub="epic" type="button">Epic &amp; Stories (${(data.epic_stories || []).length})</button>
            <button class="seg-btn ${nbfgState.sub === "overlap" ? "active" : ""}" data-nbfgsub="overlap" type="button">Live /guides/ Overlap (${overlapAll.length})</button>
            <button class="seg-btn ${nbfgState.sub === "merged" ? "active" : ""}" data-nbfgsub="merged" type="button">Merged Twins (${s.merged_twins})</button>
            <button class="seg-btn ${nbfgState.sub === "oos" ? "active" : ""}" data-nbfgsub="oos" type="button">Out-of-Scope (${s.out_of_scope})</button>
          </div>
        </div>

        <div class="toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <input id="nbfgSearch" type="search" placeholder="Search all ${rows.length} rows (title, query, slug, family)..." value="${esc(nbfgState.q)}" style="flex:1;min-width:200px;max-width:100%;padding:8px 12px;border-radius:8px;border:none;background:#f3f4f6;font-size:13px;" />
          ${!isEpicTab ? `
            <select id="nbfgFamily" style="max-width:100%;padding:8px 10px;border-radius:8px;border:none;background:#f3f4f6;font-size:13px;">
              <option value="">All 10 Families</option>
              ${families.map(f => `<option value="${esc(f)}" ${nbfgState.family === f ? "selected" : ""}>${esc(f)}</option>`).join("")}
            </select>
          ` : ""}
          ${isKeptTab ? `
            <select id="nbfgStatus" style="max-width:100%;padding:8px 10px;border-radius:8px;border:none;background:#f3f4f6;font-size:13px;">
              <option value="" ${nbfgState.status === "" ? "selected" : ""}>All Statuses</option>
              <option value="net_new" ${nbfgState.status === "net_new" ? "selected" : ""}>NET_NEW Only</option>
              <option value="overlap" ${nbfgState.status === "overlap" ? "selected" : ""}>OVERLAPS_LIVE_GUIDE Only</option>
              <option value="retailer" ${nbfgState.status === "retailer" ? "selected" : ""}>Retailer FAQs Only</option>
              <option value="drafted" ${nbfgState.status === "drafted" ? "selected" : ""}>Draft Ready Only</option>
            </select>
            <select id="nbfgTier" style="max-width:100%;padding:8px 10px;border-radius:8px;border:none;background:#f3f4f6;font-size:13px;">
              <option value="" ${nbfgState.tier === "" ? "selected" : ""}>All Tiers</option>
              <option value="T1" ${nbfgState.tier === "T1" ? "selected" : ""}>T1 Only</option>
              <option value="T2" ${nbfgState.tier === "T2" ? "selected" : ""}>T2 Only</option>
              <option value="T3" ${nbfgState.tier === "T3" ? "selected" : ""}>T3 Only</option>
            </select>
          ` : ""}
          <button id="nbfgCsvBtn" class="mini-btn" type="button">Export CSV (${filtered.length})</button>
        </div>

        ${isEpicTab ? epicCardsHtml : `
        <div class="table-wrap" style="overflow-x:auto;">
          <table>
            <thead>${thead}</thead>
            <tbody>${tbody || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#6b7280;">No matching rows.</td></tr>'}</tbody>
          </table>
        </div>
        `}

        <div class="table-foot">
          <span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} rows</span>
          ${shown.length < filtered.length ? `<button class="load-btn" id="nbfgShowAll" type="button">Show all ${filtered.length.toLocaleString()} rows</button>` : ""}
        </div>
      </main>
    `;

    root.querySelectorAll("[data-nbfgsub]").forEach(btn => {
      btn.addEventListener("click", () => {
        nbfgState.sub = btn.dataset.nbfgsub;
        nbfgState.limit = 200;
        window.renderNbfgView();
      });
    });
    const searchEl = document.getElementById("nbfgSearch");
    if (searchEl) {
      searchEl.addEventListener("input", e => {
        nbfgState.q = e.target.value;
        window.renderNbfgView();
        const el = document.getElementById("nbfgSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }
    const famEl = document.getElementById("nbfgFamily");
    if (famEl) famEl.addEventListener("change", e => { nbfgState.family = e.target.value; window.renderNbfgView(); });
    const stEl = document.getElementById("nbfgStatus");
    if (stEl) stEl.addEventListener("change", e => { nbfgState.status = e.target.value; window.renderNbfgView(); });
    const tierEl = document.getElementById("nbfgTier");
    if (tierEl) tierEl.addEventListener("change", e => { nbfgState.tier = e.target.value; window.renderNbfgView(); });
    const csvBtn = document.getElementById("nbfgCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", () => downloadCsv(filtered, `nappedia-nonbrand-fiberglass-${nbfgState.sub}.csv`));
    const allBtn = document.getElementById("nbfgShowAll");
    if (allBtn) allBtn.addEventListener("click", () => { nbfgState.limit = filtered.length; window.renderNbfgView(); });
  };
})();
