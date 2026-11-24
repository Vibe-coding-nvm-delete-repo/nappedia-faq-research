// Nappedia Sitemap & Legacy URL Cleanup Workspace (5th Macro Tab)
// Covers 100% of the 3,631-URL universe (3,105 live sitemap + 1,359 redirects + 205 deletions)
// Grounded in data/url_audit.js (generated from $0-gated census + live HTTP probes).
(function () {
  const urlState = {
    sub: "table",       // table | analysis | process
    preset: "all",      // all | action_needed | live_sitemap | 308_REDIRECT_NEW | 308_REDIRECT_UPDATE_TARGET | 308_REDIRECT_RETAIN | 410_GONE_DELETE | KEEP | KEEP_HOLD_FOR_D9_MODEL | PROTECT_SYSTEM
    family: "all",
    smFilter: "all",    // all | in_live | not_in_live | remove | add
    flagFilter: "all",  // all | boilerplate | hotel_stub | oem_minor | has_inbound | noindex
    q: "",
    sortKey: "ao",
    sortDir: "asc",
    limit: 100,
  };

  const ACTION_META = {
    "308_REDIRECT_NEW":           { label: "308 Redirect (New)",       short: "308 New",      color: "#0066cc", bg: "#e8f2fc" },
    "308_REDIRECT_UPDATE_TARGET": { label: "308 Fix Stale Target",     short: "308 Fix",      color: "#b45309", bg: "#fef3c7" },
    "410_GONE_DELETE":            { label: "410 Gone / Delete",        short: "410 Delete",   color: "#991b1b", bg: "#fee2e2" },
    "308_REDIRECT_RETAIN":        { label: "308 Redirect (Retain)",    short: "308 Retain",   color: "#5b21b6", bg: "#ede9fe" },
    "KEEP_HOLD_FOR_D9_MODEL":     { label: "Hold for D9 Model",        short: "Hold (D9)",    color: "#0369a1", bg: "#e0f2fe" },
    "KEEP":                       { label: "Keep Live (200)",          short: "Keep Live",    color: "#15803d", bg: "#dcfce7" },
    "PROTECT_SYSTEM":             { label: "Protect / System",         short: "System",       color: "#475569", bg: "#f1f5f9" },
  };

  const FAMILY_LABELS = {
    "modern-d9-brand-review": "D9 Brand Review",
    "legacy-catalog-brand": "Legacy /catalog/<brand>",
    "legacy-catalog-record": "Legacy /catalog/<brand>/<id>",
    "legacy-research-model-dossier": "Legacy /research/<model>",
    "legacy-questions-article": "Q&A /questions/*/*",
    "modern-local-stores": "Local Stores",
    "legacy-guides-article": "Guides /guides/*/*",
    "modern-answer-page": "Modern /answers/*",
    "modern-d9-model-review": "D9 Model Review",
    "legacy-reviews-model": "Legacy /reviews/<brand>/<model>",
    "legacy-mattresses-model": "Legacy /mattresses/*/*",
    "legacy-catalog-family": "Legacy /catalog/*/families/*",
    "legacy-reviews-brand": "Legacy /reviews/<brand>",
    "legacy-brands-family": "Legacy /brands/*/families/*",
    "modern-clinical-study": "Clinical Studies",
    "modern-compare-pair": "Compare Pairs",
    "core-policy-utility": "Core Policy & Safety",
    "legacy-guides-category": "Legacy /guides/<cat>",
    "legacy-root-misc": "Legacy Root Duplicates",
    "system-admin": "Admin (401)",
    "legacy-questions-cluster": "Legacy /questions/<cluster>",
    "core-hub": "Core Hubs",
    "legacy-brands-brand": "Legacy /brands/<brand>",
    "legacy-mattress-files": "Legacy /mattress-files/*",
    "legacy-hazard": "Legacy /hazard/*",
    "system-error-page": "System Error (404)",
    "core-author": "Author Page",
    "core-utility-search": "Search Utility",
    "legacy-catalog-hub": "Legacy /catalog Hub",
    "legacy-brands-hub": "Legacy /brands Hub",
    "legacy-mattresses-hub": "Legacy /mattresses Hub",
    "legacy-questions-hub": "Legacy /questions Hub",
    "legacy-guides-hub": "Legacy /guides Hub",
    "legacy-research-studies": "Legacy /research/studies",
    "legacy-trailing-slash-dup": "Trailing Slash Dup",
  };

  const COLS = [
    { key: "p",   label: "URL Path",     num: false, tip: "Canonical path on nappedia.com. Click to open live URL in a new tab." },
    { key: "f",   label: "Family",       num: false, tip: "Structural URL family from the 35-family census." },
    { key: "cs",  label: "Current",      num: true,  tip: "Current HTTP status served by worker/index.ts (200, 308, 401) and live sitemap.xml membership." },
    { key: "ao",  label: "Decision",     num: false, tip: "Recommended action: 308 New, 308 Fix Stale Target, 308 Retain, 410 Delete, Keep Live, Hold for D9 Model, or System Protect." },
    { key: "t",   label: "Target URL",   num: false, tip: "Verified single-hop canonical destination for all 1,359 redirects (0 loops, 0 chains)." },
    { key: "w",   label: "Words",        num: true,  tip: "Rendered body word count extracted from the built HTML in dist/client." },
    { key: "inb", label: "Links",        num: true,  tip: "Number of inbound internal links pointing to this URL from modern public/ templates." },
    { key: "why", label: "Why",          num: false, tip: "Plain-English SEO and architectural reason for this exact decision." },
  ];

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function famLabel(f) {
    return FAMILY_LABELS[f] || f;
  }

  function showTip(anchor, title, text) {
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

  function hideTip() {
    const tip = document.getElementById("rvColTooltip");
    if (!tip) return;
    tip.classList.remove("visible");
    tip.setAttribute("aria-hidden", "true");
  }

  function getFilteredSorted(rows) {
    const q = urlState.q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (urlState.preset === "action_needed") {
        if (r.a !== "308_REDIRECT_NEW" && r.a !== "308_REDIRECT_UPDATE_TARGET" && r.a !== "410_GONE_DELETE") return false;
      } else if (urlState.preset === "live_sitemap") {
        if (r.sm !== 1) return false;
      } else if (urlState.preset !== "all") {
        if (r.a !== urlState.preset) return false;
      }
      if (urlState.family !== "all" && r.f !== urlState.family) return false;
      if (urlState.smFilter === "in_live" && r.sm !== 1) return false;
      if (urlState.smFilter === "not_in_live" && r.sm !== 0) return false;
      if (urlState.smFilter === "remove" && !(r.sma === "REMOVE_FROM_SITEMAP" && r.sm === 1)) return false;
      if (urlState.smFilter === "add" && r.sma !== "ADD_TO_SITEMAP") return false;
      if (urlState.flagFilter === "boilerplate" && r.bp !== 1) return false;
      if (urlState.flagFilter === "hotel_stub" && r.st !== "hotel_or_cruise_stub") return false;
      if (urlState.flagFilter === "oem_minor" && r.st !== "oem_or_minor_brand") return false;
      if (urlState.flagFilter === "has_inbound" && r.inb <= 0) return false;
      if (urlState.flagFilter === "noindex" && r.ni !== 1) return false;
      if (q) {
        const hay = `${r.p} ${r.ep} ${r.f} ${famLabel(r.f)} ${r.t} ${r.ct} ${r.a} ${r.st} ${r.why} ${r.ttl}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const k = urlState.sortKey;
    const dir = urlState.sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      let va = a[k], vb = b[k];
      if (va === null || va === undefined || va === "") va = urlState.sortDir === "asc" ? "\uffff" : "";
      if (vb === null || vb === undefined || vb === "") vb = urlState.sortDir === "asc" ? "\uffff" : "";
      if (typeof va === "number" && typeof vb === "number") {
        if (va !== vb) return (va - vb) * dir;
      } else {
        const cmp = String(va).localeCompare(String(vb));
        if (cmp !== 0) return cmp * dir;
      }
      if (a.ao !== b.ao) return a.ao - b.ao;
      return a.p.localeCompare(b.p);
    });
    return out;
  }

  function exportCsv(rows) {
    const headers = ["URL Path", "Encoded Path", "Family", "SubType", "Current HTTP", "In Live Sitemap", "Words", "Modern Inbound Links", "Boilerplate URN", "Decision", "Target URL", "Sitemap Action", "Rationale", "Page Title"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([
        r.p, r.ep || r.p, r.f, r.st, r.cs, r.sm ? "YES" : "NO", r.w, r.inb, r.bp ? "YES" : "NO",
        r.a, r.t, r.sma, r.why, r.ttl,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nappedia-url-audit-${urlState.preset}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function jumpToTableFilter(opts) {
    urlState.sub = "table";
    urlState.preset = opts.preset ?? "all";
    urlState.family = opts.family ?? "all";
    urlState.smFilter = opts.smFilter ?? "all";
    urlState.flagFilter = opts.flagFilter ?? "all";
    urlState.q = opts.q ?? "";
    urlState.limit = 100;
    if (window.setUrlsSub) window.setUrlsSub("table", true);
    else renderUrlsWorkspace();
    const searchEl = document.getElementById("urlSearch");
    if (searchEl) searchEl.value = urlState.q;
    const famEl = document.getElementById("urlFamilyFilter");
    if (famEl) famEl.value = urlState.family;
    const smEl = document.getElementById("urlSmFilter");
    if (smEl) smEl.value = urlState.smFilter;
    const flEl = document.getElementById("urlFlagFilter");
    if (flEl) flEl.value = urlState.flagFilter;
    document.querySelectorAll("#urlPresetPills .rv-pill").forEach((b) => {
      b.classList.toggle("active", b.dataset.preset === urlState.preset);
    });
    renderTableOnly(window.NAPPEDIA_URL_AUDIT);
    const tbl = document.getElementById("urlsTableCard");
    if (tbl) tbl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderTableOnly(data) {
    const filtered = getFilteredSorted(data.rows);
    const shown = filtered.slice(0, urlState.limit);

    const thead = document.getElementById("urlThead");
    const tbody = document.getElementById("urlTbody");
    const tfoot = document.getElementById("urlTfoot");
    const statLine = document.getElementById("urlStatLine");
    if (!thead || !tbody || !tfoot) return;

    const s = data.summary;
    statLine.textContent = `Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} matching URLs (Universe: ${s.total.toLocaleString()} · Live sitemap: ${s.liveSitemap.toLocaleString()} · Redirect: ${s.totalRedirects.toLocaleString()} · Delete 410: ${s.byAction["410_GONE_DELETE"].toLocaleString()})`;

    thead.innerHTML = `<tr>${COLS.map((c) => {
      const sorted = urlState.sortKey === c.key;
      const arrow = sorted ? (urlState.sortDir === "asc" ? " &#9650;" : " &#9660;") : "";
      return `<th class="sortable${sorted ? " sorted" : ""}${c.num ? " num" : ""}" data-sort="${c.key}">` +
        `<span class="rv-th-inner"><span>${c.label}${arrow}</span>` +
        `<span class="rv-help" tabindex="0" role="button" data-title="${esc(c.label)}" data-tip="${esc(c.tip)}" aria-label="${esc(c.label)}: ${esc(c.tip)}">?</span>` +
        `</span></th>`;
    }).join("")}</tr>`;

    thead.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", (e) => {
        if (e.target.closest(".rv-help")) return;
        const key = th.dataset.sort;
        if (urlState.sortKey === key) {
          urlState.sortDir = urlState.sortDir === "asc" ? "desc" : "asc";
        } else {
          urlState.sortKey = key;
          urlState.sortDir = key === "w" || key === "inb" ? "desc" : "asc";
        }
        renderTableOnly(data);
      });
    });

    thead.querySelectorAll(".rv-help").forEach((btn) => {
      const open = () => showTip(btn, btn.dataset.title, btn.dataset.tip);
      btn.addEventListener("mouseenter", open);
      btn.addEventListener("focus", open);
      btn.addEventListener("mouseleave", hideTip);
      btn.addEventListener("blur", hideTip);
      btn.addEventListener("click", (e) => { e.stopPropagation(); open(); });
    });

    if (!shown.length) {
      tbody.innerHTML = `<tr><td colspan="${COLS.length}" style="text-align:center;padding:32px;color:var(--sub);">No URLs match the active filters.</td></tr>`;
    } else {
      const frag = [];
      for (const r of shown) {
        const am = ACTION_META[r.a] || ACTION_META.PROTECT_SYSTEM;
        const liveHref = `https://www.nappedia.com${r.ep || r.p}`;
        const smChip = r.sm === 1
          ? (r.sma === "REMOVE_FROM_SITEMAP"
              ? `<span class="u-chip u-chip-warn">In Sitemap (Prune)</span>`
              : `<span class="u-chip u-chip-ok">In Sitemap</span>`)
          : (r.sma === "ADD_TO_SITEMAP"
              ? `<span class="u-chip u-chip-add">Add to Sitemap</span>`
              : `<span class="u-chip u-chip-muted">Not in SM</span>`);
        const statusColor = r.cs === 200 ? "#15803d" : (r.cs === 308 ? "#5b21b6" : "#475569");
        const bpChip = r.bp ? `<span class="u-chip u-chip-red" title="Contains placeholder 'Certified Domestic Bedding Fabrication Facility' / 'State Bedding License' boilerplate">Boilerplate</span>` : "";
        const subChip = r.st === "hotel_or_cruise_stub"
          ? `<span class="u-chip u-chip-muted">Hotel/Cruise</span>`
          : (r.st === "oem_or_minor_brand" ? `<span class="u-chip u-chip-amber">OEM/Minor</span>` : "");

        let targetCell = `<span style="color:var(--sub);">—</span>`;
        if (r.t) {
          const staleNote = r.a === "308_REDIRECT_UPDATE_TARGET" && r.ct
            ? `<div class="u-sub-line">was: <code>${esc(r.ct)}</code></div>`
            : "";
          targetCell = `<a class="u-target-link" href="https://www.nappedia.com${esc(r.t)}" target="_blank" rel="noopener">${esc(r.t)} &#8599;</a>${staleNote}`;
        } else if (r.a === "410_GONE_DELETE") {
          targetCell = `<span class="u-410-txt">HTTP 410 Gone</span>`;
        } else if (r.a === "KEEP" || r.a === "KEEP_HOLD_FOR_D9_MODEL") {
          targetCell = `<span style="color:#15803d;font-size:12px;">Self-canonical</span>`;
        }

        frag.push(
          `<tr>` +
          `<td class="u-path-cell"><a class="u-path-link" href="${esc(liveHref)}" target="_blank" rel="noopener">${esc(r.p)}</a>${r.ttl ? `<div class="u-title-sub">${esc(r.ttl)}</div>` : ""}<div class="u-chip-row">${bpChip}${subChip}</div></td>` +
          `<td><span class="u-fam-pill">${esc(famLabel(r.f))}</span></td>` +
          `<td class="num"><div style="font-weight:700;color:${statusColor};font-variant-numeric:tabular-nums;">${r.cs || "—"}</div><div>${smChip}</div></td>` +
          `<td><span class="rv-badge" style="background:${am.bg};color:${am.color};">${esc(am.short)}</span></td>` +
          `<td class="u-target-cell">${targetCell}</td>` +
          `<td class="num">${r.w ? r.w.toLocaleString() : "—"}</td>` +
          `<td class="num">${r.inb ? `<strong>${r.inb.toLocaleString()}</strong>` : "0"}</td>` +
          `<td class="u-why-cell">${esc(r.why)}</td>` +
          `</tr>`
        );
      }
      tbody.innerHTML = frag.join("");
    }

    const moreBtns = [];
    if (shown.length < filtered.length) {
      if (filtered.length - shown.length > 400) {
        moreBtns.push(`<button class="load-btn" id="urlShow500Btn" type="button">Show 500</button>`);
      }
      moreBtns.push(`<button class="load-btn" id="urlShowAllBtn" type="button">Show all ${filtered.length.toLocaleString()}</button>`);
    } else if (filtered.length > 100) {
      moreBtns.push(`<button class="load-btn" id="urlCollapseBtn" type="button">Show first 100</button>`);
    }
    tfoot.innerHTML = `<span>Showing ${shown.length.toLocaleString()} of ${filtered.length.toLocaleString()} matching URLs (Total universe: ${data.summary.total.toLocaleString()})</span><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${moreBtns.join("")}<button class="mini-btn" id="urlCsvBtn" type="button">Export Filtered CSV</button></div>`;

    const b500 = document.getElementById("urlShow500Btn");
    if (b500) b500.addEventListener("click", () => { urlState.limit = 500; renderTableOnly(data); });
    const bAll = document.getElementById("urlShowAllBtn");
    if (bAll) bAll.addEventListener("click", () => { urlState.limit = filtered.length; renderTableOnly(data); });
    const bCol = document.getElementById("urlCollapseBtn");
    if (bCol) bCol.addEventListener("click", () => { urlState.limit = 100; renderTableOnly(data); });
    const bCsv = document.getElementById("urlCsvBtn");
    if (bCsv) bCsv.addEventListener("click", () => exportCsv(filtered));
  }

  function renderAnalysisSection(data) {
    const s = data.summary;
    const famRows = data.families.map((f) => {
      const actionBits = [];
      if (f.keep) actionBits.push(`<span class="rv-badge" style="background:#dcfce7;color:#15803d;">Keep ${f.keep}</span>`);
      if (f.hold) actionBits.push(`<span class="rv-badge" style="background:#e0f2fe;color:#0369a1;">Hold ${f.hold}</span>`);
      if (f.r308New) actionBits.push(`<span class="rv-badge" style="background:#e8f2fc;color:#0066cc;">308 New ${f.r308New}</span>`);
      if (f.r308Fix) actionBits.push(`<span class="rv-badge" style="background:#fef3c7;color:#b45309;">308 Fix ${f.r308Fix}</span>`);
      if (f.r308Retain) actionBits.push(`<span class="rv-badge" style="background:#ede9fe;color:#5b21b6;">308 Retain ${f.r308Retain}</span>`);
      if (f.g410) actionBits.push(`<span class="rv-badge" style="background:#fee2e2;color:#991b1b;">410 Del ${f.g410}</span>`);
      if (f.protect) actionBits.push(`<span class="rv-badge" style="background:#f1f5f9;color:#475569;">System ${f.protect}</span>`);
      return `<tr class="u-fam-row" data-family="${esc(f.family)}">` +
        `<td><strong>${esc(famLabel(f.family))}</strong><div class="rv-slug">${esc(f.family)}</div></td>` +
        `<td class="num"><strong>${f.total.toLocaleString()}</strong></td>` +
        `<td class="num">${f.live200.toLocaleString()}</td>` +
        `<td class="num">${f.liveSm.toLocaleString()}</td>` +
        `<td class="num">${f.avgWords ? f.avgWords.toLocaleString() : "—"}</td>` +
        `<td><div class="u-chip-row">${actionBits.join("")}</div></td>` +
        `<td><button class="mini-btn u-inspect-fam" data-family="${esc(f.family)}" type="button">Filter Table &rarr;</button></td>` +
        `</tr>`;
    }).join("");

    return `
      <div class="u-analysis-grid">
        <section class="card u-spotlight-card">
          <div class="u-eyebrow">Spotlight Audit · Trigger URL</div>
          <h2 class="card-title" style="margin-bottom:6px;">Why <code>/catalog/american-national-manufacturing</code> Should Be 410 Gone</h2>
          <p class="u-lead">Probed live on <strong>2026-11-24</strong>: serves HTTP <code>200 OK</code>, sits in live <code>sitemap.xml</code>, has <strong>0 inbound links</strong> from modern pages, and contains <strong>634 words</strong> of legacy Next.js boilerplate.</p>
          <div class="u-fact-grid">
            <div class="u-fact-box">
              <div class="u-fact-lbl">Root Cause in Worker</div>
              <div class="u-fact-val"><code>worker/index.ts:926</code> serves <code>/catalog/*.html</code> as 200 <em>before</em> the line-951 wildcard redirect to <code>/reviews</code> ever runs.</div>
            </div>
            <div class="u-fact-box">
              <div class="u-fact-lbl">Unverified Placeholder Copy</div>
              <div class="u-fact-val">Raw HTML literally prints <em>"Certified Domestic Bedding Fabrication Facility (Corona, CA)"</em> and <em>"URN: State Bedding License (Corona, CA)"</em> — found on <strong>284 of 516</strong> <code>/catalog/&lt;brand&gt;</code> pages.</div>
            </div>
            <div class="u-fact-box">
              <div class="u-fact-lbl">Why 410 Gone (Not 308 to /reviews)</div>
              <div class="u-fact-val">Google treats mass redirects of unmatched brands to a generic hub as <strong>Soft 404s</strong>. HTTP <code>410 Gone</code> de-indexes boilerplate cleanly. Tagged <code>oem_or_minor_brand</code> so it upgrades to a <code>308</code> if a D9 review ships later.</div>
            </div>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="mini-btn" id="uInspectAnfBtn" type="button">Inspect Row in Table &rarr;</button>
            <button class="mini-btn" id="uInspectBoilerplateBtn" type="button">View All ${s.boilerplateTotal} Boilerplate Pages &rarr;</button>
            <button class="mini-btn" id="uInspect410Btn" type="button">View All ${s.byAction["410_GONE_DELETE"]} Deletion Candidates &rarr;</button>
          </div>
        </section>

        <section class="card u-bugs-card">
          <div class="u-eyebrow" style="color:#991b1b;">5 Live Production Bugs Caught</div>
          <h2 class="card-title" style="margin-bottom:10px;">Verified Against Live nappedia.com (41 Live Probes)</h2>
          <ol class="u-bug-list">
            <li><strong>125 Stale 308s Landing on Legacy Pages:</strong> <code>/catalog/saatva</code>, <code>/brands/saatva</code>, <code>/reviews-saatva</code> redirect to old <code>/reviews/saatva</code> (200) instead of <code>/reviews/saatva-mattress-review</code>. Same for <code>/catalog/awara</code> and 54 <code>/mattresses/*/*</code> rules. <button class="u-inline-btn" data-jump-preset="308_REDIRECT_UPDATE_TARGET" type="button">See all 125 &rarr;</button></li>
            <li><strong>25 Legacy <code>/reviews/&lt;brand&gt;</code> Pages Still Live (200):</strong> Old 87–500w stubs (<code>/reviews/awara</code>, <code>/reviews/emma</code>, <code>/reviews/vispring</code>) plus old <code>/reviews/saatva</code> (via <code>STATIC_ALIASES</code>) serve 200 right next to their live D9 reviews. <button class="u-inline-btn" data-jump-family="legacy-reviews-brand" type="button">See all 53 &rarr;</button></li>
            <li><strong>1,099 Legacy URLs Polluting Live <code>sitemap.xml</code>:</strong> 464 <code>/catalog/&lt;brand&gt;</code>, 503 thin <code>/catalog/&lt;brand&gt;/&lt;id&gt;</code> doorway cards (avg 323w), 79 <code>/catalog/*/families/*</code>, 36 <code>/brands/*/families/*</code>, 16 overlapping <code>/research/*</code>, and <code>/catalog</code>. <button class="u-inline-btn" data-jump-sm="remove" type="button">See all 1,099 &rarr;</button></li>
            <li><strong>5 Live Root Duplicate Templates:</strong> <code>/saatva</code>, <code>/saatva-brand-page</code>, <code>/sleep-quiz-v2</code>, <code>/nappedia_quiz_interactive_v2</code>, and <code>noindex</code> <code>/mattress-comparison</code> (7,613w) all return 200 live today. <button class="u-inline-btn" data-jump-family="legacy-root-misc" type="button">See all 10 &rarr;</button></li>
            <li><strong><code>/fiberglass</code> Missing from Sitemap + 3 Dead Redirect Files:</strong> <code>/fiberglass</code> has <strong>665 inbound links</strong> from modern reviews yet is absent from <code>sitemap.xml</code>. Meanwhile root <code>_redirects</code> (1,087 lines), <code>public/_redirects</code> (1,102), and <code>redirects.json</code> (6,524) are never deployed. <button class="u-inline-btn" data-jump-sm="add" type="button">See 2 additions &rarr;</button></li>
          </ol>
        </section>
      </div>

      <section class="card u-decision-card">
        <div class="u-eyebrow" style="color:#0369a1;">Strategic Decision Call · Two Choices Needed Before Implementation</div>
        <h2 class="card-title" style="margin-bottom:10px;">Decision 1: The 345 Non-Overlapping <code>/research/&lt;model&gt;</code> Dossiers (Avg 3,667 Words)</h2>
        <div class="u-choice-grid">
          <div class="u-choice-box u-choice-rec">
            <div class="u-choice-head"><strong>Option A: Hold at 200 Until D9 Model Page Ships</strong> <span class="rv-badge" style="background:#dcfce7;color:#15803d;">Recommended</span></div>
            <p>Matches <code>lib/redirect-policy.mjs</code> ("hold-until-successor-live"). Unlike <code>/catalog/*</code> boilerplate, these 345 pages are deep 3,200–3,700 word source-led dossiers. Redirect only the 16 that already have a live D9 model review now; 308 the rest 1:1 as each D9 model review publishes.</p>
          </div>
          <div class="u-choice-box">
            <div class="u-choice-head"><strong>Option B: Immediate 308 to Parent D9 Brand Review</strong> <span class="rv-badge" style="background:#fef3c7;color:#b45309;">Aggressive</span></div>
            <p>Immediately 308 all 345 to their parent brand's <code>/reviews/&lt;brand&gt;-mattress-review</code> and delete <code>app/research/[slug]</code>, reserving <code>/research/*</code> exclusively for the 26 clinical studies. Cleaner URL tree, but surrenders 345 dedicated model-level pages until D9 replacements ship.</p>
          </div>
        </div>
        <p style="margin:12px 0 0;font-size:13px;color:var(--sub);"><strong>Decision 2:</strong> Confirm <code>410 Gone</code> + delete for the <strong>205 unmatched <code>/catalog/&lt;brand&gt;</code> stubs</strong> (109 <code>hotel_or_cruise_stub</code> + 96 <code>oem_or_minor_brand</code>, including <code>american-national-manufacturing</code>). Note: 260 <code>/questions/*/*</code> (avg 1,412w) and 202 <code>/guides/*/*</code> (avg 1,750w) are <strong>KEEP</strong> because all 462 have 0 overlap with <code>/answers/*</code> and are actively linked from <code>/answers</code>.</p>
      </section>

      <section class="card rv-card">
        <div class="rv-pipe-head">
          <div>
            <h2 class="card-title">Complete 35-Family Breakdown (All 3,631 Unique URLs)</h2>
            <div class="stat-line">Click any family to jump directly to its rows in the Full URL &amp; Sitemap Table.</div>
          </div>
        </div>
        <div class="b-table-wrap">
          <table class="b-table rv-table">
            <thead>
              <tr>
                <th>URL Family</th>
                <th class="num">Total</th>
                <th class="num">Live 200</th>
                <th class="num">In Sitemap</th>
                <th class="num">Avg Words</th>
                <th>Action Breakdown</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>${famRows}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderProcessSection(data) {
    const s = data.summary;
    const steps = [
      {
        num: "Phase 1",
        title: "Operator Sign-Off (2 Binary Decisions)",
        badge: "Gate Before Code",
        color: "#0369a1",
        bg: "#e0f2fe",
        owner: "Chris",
        items: [
          "Confirm <strong>Option A (Hold at 200)</strong> vs. <strong>Option B (Immediate 308 to D9 brand)</strong> for the 345 non-overlapping <code>/research/&lt;model&gt;</code> dossiers.",
          "Confirm <strong>HTTP 410 Gone + Delete</strong> for the 205 unmatched <code>/catalog/&lt;brand&gt;</code> boilerplate profiles (109 hotel/cruise stubs + 96 OEM/minor brands including <code>american-national-manufacturing</code>).",
        ],
      },
      {
        num: "Phase 2",
        title: "Generate Worker Redirect Map & 410 Handler",
        badge: "worker/index.ts",
        color: "#0066cc",
        bg: "#e8f2fc",
        owner: "Engineering",
        items: [
          `Generate a checked-in <code>worker/legacy-redirects.generated.ts</code> map directly from the verified ledger covering all <strong>${s.byAction["308_REDIRECT_NEW"].toLocaleString()} new 308s</strong>, <strong>${s.byAction["308_REDIRECT_UPDATE_TARGET"].toLocaleString()} repaired stale 308s</strong>, and <strong>${s.byAction["308_REDIRECT_RETAIN"].toLocaleString()} retained 308s</strong> (total <strong>${s.totalRedirects.toLocaleString()}</strong> single-hop 308 rules).`,
          "Remove <code>/catalog</code> and <code>/catalog/*</code> from the line-926 asset override block in <code>worker/index.ts</code> (keep only <code>/questions/*/*</code> and <code>/guides/*/*</code>).",
          "Remove legacy <code>/reviews/saatva</code> and <code>/saatva</code> from <code>STATIC_ALIASES</code> so they 308 straight to <code>/reviews/saatva-mattress-review</code>.",
          `Return <strong>HTTP 410 Gone</strong> (minimal clean HTML + <code>Cache-Control: public, max-age=86400</code>) for the <strong>${s.byAction["410_GONE_DELETE"].toLocaleString()}</strong> unmatched <code>/catalog/*</code> boilerplate stubs instead of a soft-404 wildcard redirect to <code>/reviews</code>.`,
        ],
      },
      {
        num: "Phase 3",
        title: "Prune & Repair Canonical sitemap.xml",
        badge: "app/sitemap.xml/route.ts",
        color: "#5b21b6",
        bg: "#ede9fe",
        owner: "Engineering",
        items: [
          `Remove <strong>${s.sitemapRemovals.toLocaleString()}</strong> legacy URLs from <code>app/sitemap.xml/route.ts</code>: <code>/catalog</code> hub, <code>allBrandsMasterData</code> <code>/catalog/*</code> profiles, <code>expansionBrands</code> records, <code>expansionDeepResearch</code> families, <code>/brands/*/families/*</code>, and the 16 overlapping <code>/research/*</code> dossiers.`,
          "Add <code>/fiberglass</code> (665 modern inbound links) and <code>/authors/justine-pinto</code> to <code>app/sitemap.xml/route.ts</code>.",
          "Include the 48 Wave A+B D9 brand reviews (bringing D9 brand reviews live in sitemap from 543 to 591).",
        ],
      },
      {
        num: "Phase 4",
        title: "Delete Dead Routes, Root Templates & Stale Redirect Files",
        badge: "Repo Hygiene",
        color: "#991b1b",
        bg: "#fee2e2",
        owner: "Engineering",
        items: [
          "Delete retired Next.js route directories: <code>app/catalog/</code>, <code>app/brands/</code>, <code>app/mattresses/</code>, <code>app/mattress-comparison/</code> (and rewrite the 19 residual internal links pointing at <code>/brands/*/families/*</code> or <code>/catalog/*/families/*</code>).",
          "Delete duplicate root HTML templates from <code>public/</code>: <code>saatva-brand-page.html</code>, <code>reviews-saatva.html</code>, <code>sleep-quiz-v2.html</code>, <code>nappedia_quiz_interactive_v2.html</code>, and remove them from <code>VETTED_ROOT_HTML</code> / promotion blocks in <code>scripts/prepare_static_deploy.mjs</code>.",
          "Delete the 3 undeployed legacy redirect files: root <code>_redirects</code> (1,087 lines), <code>public/_redirects</code> (1,102 lines), and <code>redirects.json</code> (6,524 lines) so <code>worker/index.ts</code> is the single source of truth.",
        ],
      },
      {
        num: "Phase 5",
        title: "$0 Deterministic Pre-Deploy Verification Gate",
        badge: "Zero-Defect Gate",
        color: "#15803d",
        bg: "#dcfce7",
        owner: "Automated CI",
        items: [
          "Run <code>pnpm run build</code> and <code>pnpm run release:audit</code>.",
          "Execute a <code>$0</code> Worker matrix test against all <strong>1,564</strong> legacy URLs asserting: 0 redirect loops, 0 redirect chains (every 308 target returns 200 in 1 hop), every 410 stub returns HTTP 410, 0 legacy URLs remain in <code>dist/client/sitemap.xml</code>, and 100% of the 462 active <code>/questions/*/*</code> and <code>/guides/*/*</code> articles still return 200.",
        ],
      },
      {
        num: "Phase 6",
        title: "Deploy, Live Probe & 365-Day Retention Tracking",
        badge: "Production Rollout",
        color: "#b45309",
        bg: "#fef3c7",
        owner: "Ops / SEO",
        items: [
          "Deploy via <code>pnpm run deploy:cf</code> and run a live HTTP probe sweep confirming 308/410/200 parity on <code>https://www.nappedia.com</code>.",
          "Resubmit <code>https://www.nappedia.com/sitemap.xml</code> in Google Search Console and Bing Webmaster Tools; monitor GSC Page Indexing for clean de-indexing of the 205 <code>410</code> URLs and canonical consolidation of the 1,359 <code>308</code> URLs.",
          "Sync the new cutover date into StandardCommand (<code>scripts/sync_nappedia_redirects.mjs</code>) and enforce the mandatory <strong>365-day minimum retention window</strong> per <code>lib/redirect-policy.mjs</code>.",
        ],
      },
    ];

    return `
      <section class="card rv-card" style="margin-bottom:14px;">
        <div class="rv-pipe-head">
          <div>
            <h2 class="card-title">Fully Scoped 6-Phase URL Cleanup &amp; Migration Process</h2>
            <div class="stat-line">Compliant with <code>standardcommand/lib/redirect-policy.mjs</code> (single-hop 308, zero soft-404 hub dumps, 365-day retention, $0 pre-deploy gates).</div>
          </div>
          <button class="mini-btn" id="uProcJumpTable" type="button">Open 3,631-URL Ledger &rarr;</button>
        </div>
        <div class="u-phase-grid">
          ${steps.map((st) => `
            <article class="u-phase-card">
              <div class="u-phase-top">
                <span class="u-phase-num">${esc(st.num)}</span>
                <span class="rv-badge" style="background:${st.bg};color:${st.color};">${esc(st.badge)}</span>
              </div>
              <h3 class="u-phase-title">${esc(st.title)}</h3>
              <ul class="u-phase-list">${st.items.map((it) => `<li>${it}</li>`).join("")}</ul>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  let shellMounted = false;

  function applySubVisibility(data) {
    const tEl = document.getElementById("urlsSubTable");
    const aEl = document.getElementById("urlsSubAnalysis");
    const pEl = document.getElementById("urlsSubProcess");
    if (tEl) tEl.style.display = urlState.sub === "table" ? "" : "none";
    if (aEl) aEl.style.display = urlState.sub === "analysis" ? "" : "none";
    if (pEl) pEl.style.display = urlState.sub === "process" ? "" : "none";
    document.querySelectorAll("#urlsSubTabs .cat-tab").forEach((b) => {
      const active = b.dataset.usub === urlState.sub;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (urlState.sub === "table" && data) renderTableOnly(data);
  }

  window.setUrlsSub = function (sub, updateHash = true) {
    if (!["table", "analysis", "process"].includes(sub)) sub = "table";
    urlState.sub = sub;
    if (updateHash) {
      const h = sub === "table" ? "#urls" : `#urls-${sub}`;
      history.replaceState(null, "", h);
    }
    if (shellMounted) applySubVisibility(window.NAPPEDIA_URL_AUDIT);
  };

  window.renderUrlsWorkspace = function () {
    const data = window.NAPPEDIA_URL_AUDIT;
    const root = document.getElementById("urlsContent");
    if (!root || !data) return;

    if (!shellMounted) {
      const s = data.summary;
      const a = s.byAction;
      const updatedDate = new Date(data.generatedAt).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
      }) + " ET";

      const barOrder = ["KEEP", "KEEP_HOLD_FOR_D9_MODEL", "308_REDIRECT_NEW", "308_REDIRECT_UPDATE_TARGET", "308_REDIRECT_RETAIN", "410_GONE_DELETE", "PROTECT_SYSTEM"];
      const barSegments = barOrder.map((k) => {
        const count = a[k] || 0;
        const pct = ((count / s.total) * 100).toFixed(2);
        const am = ACTION_META[k];
        return `<div class="rv-bar-seg" style="width:${pct}%;background:${am.color};" title="${am.label}: ${count.toLocaleString()} (${pct}%)"></div>`;
      }).join("");

      const presetPills = [
        { k: "all", label: "All URLs", count: s.total },
        { k: "live_sitemap", label: "In Live Sitemap", count: s.liveSitemap, color: "#0066cc" },
        { k: "action_needed", label: "Action Needed (Redirect + Delete)", count: s.actionRequired, color: "#dc2626" },
        { k: "308_REDIRECT_NEW", label: "308 New", count: a["308_REDIRECT_NEW"], color: ACTION_META["308_REDIRECT_NEW"].color },
        { k: "308_REDIRECT_UPDATE_TARGET", label: "308 Fix Stale", count: a["308_REDIRECT_UPDATE_TARGET"], color: ACTION_META["308_REDIRECT_UPDATE_TARGET"].color },
        { k: "410_GONE_DELETE", label: "410 Delete", count: a["410_GONE_DELETE"], color: ACTION_META["410_GONE_DELETE"].color },
        { k: "308_REDIRECT_RETAIN", label: "308 Retain", count: a["308_REDIRECT_RETAIN"], color: ACTION_META["308_REDIRECT_RETAIN"].color },
        { k: "KEEP", label: "Keep Live", count: a["KEEP"], color: ACTION_META["KEEP"].color },
        { k: "KEEP_HOLD_FOR_D9_MODEL", label: "Hold (D9 Model)", count: a["KEEP_HOLD_FOR_D9_MODEL"], color: ACTION_META["KEEP_HOLD_FOR_D9_MODEL"].color },
        { k: "PROTECT_SYSTEM", label: "System", count: a["PROTECT_SYSTEM"], color: ACTION_META["PROTECT_SYSTEM"].color },
      ].map((p) => {
        const dot = p.color ? `<span class="rv-dot" style="background:${p.color};"></span>` : "";
        return `<button class="rv-pill${urlState.preset === p.k ? " active" : ""}" data-preset="${p.k}" type="button">${dot}<span>${p.label}</span><span class="tab-count">${p.count.toLocaleString()}</span></button>`;
      }).join("");

      const familyOptions = data.families.map((f) =>
        `<option value="${esc(f.family)}">${esc(famLabel(f.family))} (${f.total.toLocaleString()})</option>`
      ).join("");

      root.innerHTML = `
        <div class="rv-kpi-grid">
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Total URL Universe</div>
            <div class="rv-kpi-val">${s.total.toLocaleString()}</div>
            <div class="rv-kpi-sub">0 missed · 35 URL families</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Live Sitemap</div>
            <div class="rv-kpi-val" style="color:#0066cc;">${s.liveSitemap.toLocaleString()}</div>
            <div class="rv-kpi-sub">${s.sitemapRemovals.toLocaleString()} legacy URLs to prune</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Keep Live (200)</div>
            <div class="rv-kpi-val" style="color:#15803d;">${a["KEEP"].toLocaleString()}</div>
            <div class="rv-kpi-sub">591 D9 reviews + active hubs</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">308 Redirects</div>
            <div class="rv-kpi-val" style="color:#5b21b6;">${s.totalRedirects.toLocaleString()}</div>
            <div class="rv-kpi-sub">${a["308_REDIRECT_NEW"].toLocaleString()} new · ${a["308_REDIRECT_UPDATE_TARGET"]} fix · ${a["308_REDIRECT_RETAIN"]} retain</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">410 Gone / Delete</div>
            <div class="rv-kpi-val" style="color:#991b1b;">${a["410_GONE_DELETE"].toLocaleString()}</div>
            <div class="rv-kpi-sub">${s.catalogBrandBreakdown.delete410HotelStubs} hotel/cruise · ${s.catalogBrandBreakdown.delete410NonHotelOemOrMinor} OEM/minor</div>
          </div>
          <div class="rv-kpi">
            <div class="rv-kpi-lbl">Hold for D9 Model</div>
            <div class="rv-kpi-val" style="color:#0369a1;">${a["KEEP_HOLD_FOR_D9_MODEL"].toLocaleString()}</div>
            <div class="rv-kpi-sub">Deep ~3,667w /research dossiers</div>
          </div>
        </div>

        <div id="urlsSubTable">
          <section class="card rv-card" id="urlsTableCard">
            <div class="rv-pipe-head">
              <div>
                <h2 class="card-title">Full Sitemap &amp; Legacy URL Action Ledger</h2>
                <div class="stat-line" id="urlStatLine"></div>
              </div>
              <div class="rv-updated">Audited: ${esc(updatedDate)} · $0 Gate PASS</div>
            </div>
            <div class="rv-bar-track" aria-label="URL action distribution">${barSegments}</div>
            <div class="rv-pills" id="urlPresetPills">${presetPills}</div>
            <div class="toolbar rv-toolbar">
              <input class="search-input" id="urlSearch" type="search" placeholder="Search 3,631 URLs (e.g. american-national-manufacturing, /catalog/, saatva, 410)..." aria-label="Search URLs">
              <select class="filter-select" id="urlFamilyFilter" aria-label="Filter by URL family">
                <option value="all">All 35 Families (${s.total.toLocaleString()})</option>
                ${familyOptions}
              </select>
              <select class="filter-select" id="urlSmFilter" aria-label="Filter by sitemap status">
                <option value="all">All Sitemap States</option>
                <option value="in_live">In Live Sitemap (${s.liveSitemap.toLocaleString()})</option>
                <option value="remove">Remove from Sitemap (${s.sitemapRemovals.toLocaleString()})</option>
                <option value="add">Add to Sitemap (${s.sitemapAdditions.length})</option>
                <option value="not_in_live">Not in Live Sitemap (${(s.total - s.liveSitemap).toLocaleString()})</option>
              </select>
              <select class="filter-select" id="urlFlagFilter" aria-label="Filter by content flag">
                <option value="all">All Flags</option>
                <option value="boilerplate">Boilerplate URN/Facility (${s.boilerplateTotal})</option>
                <option value="hotel_stub">410: Hotel / Cruise Stub (${s.catalogBrandBreakdown.delete410HotelStubs})</option>
                <option value="oem_minor">410: OEM / Minor Brand (${s.catalogBrandBreakdown.delete410NonHotelOemOrMinor})</option>
                <option value="has_inbound">Has Modern Inbound Links</option>
                <option value="noindex">Noindex Pages</option>
              </select>
            </div>
            <div class="b-table-wrap">
              <table class="b-table rv-table u-table">
                <thead id="urlThead"></thead>
                <tbody id="urlTbody"></tbody>
              </table>
            </div>
            <div class="table-foot" id="urlTfoot"></div>
          </section>
        </div>

        <div id="urlsSubAnalysis" style="display:none;">
          ${renderAnalysisSection(data)}
        </div>

        <div id="urlsSubProcess" style="display:none;">
          ${renderProcessSection(data)}
        </div>
      `;

      // Wire table controls
      document.querySelectorAll("#urlPresetPills .rv-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          urlState.preset = btn.dataset.preset;
          urlState.limit = 100;
          document.querySelectorAll("#urlPresetPills .rv-pill").forEach((b) => b.classList.toggle("active", b.dataset.preset === urlState.preset));
          renderTableOnly(data);
        });
      });
      document.getElementById("urlSearch").addEventListener("input", (e) => {
        urlState.q = e.target.value;
        urlState.limit = 100;
        renderTableOnly(data);
      });
      document.getElementById("urlFamilyFilter").addEventListener("change", (e) => {
        urlState.family = e.target.value;
        urlState.limit = 100;
        renderTableOnly(data);
      });
      document.getElementById("urlSmFilter").addEventListener("change", (e) => {
        urlState.smFilter = e.target.value;
        urlState.limit = 100;
        renderTableOnly(data);
      });
      document.getElementById("urlFlagFilter").addEventListener("change", (e) => {
        urlState.flagFilter = e.target.value;
        urlState.limit = 100;
        renderTableOnly(data);
      });

      // Wire analysis jump buttons
      const anfBtn = document.getElementById("uInspectAnfBtn");
      if (anfBtn) anfBtn.addEventListener("click", () => jumpToTableFilter({ q: "american-national-manufacturing" }));
      const bpBtn = document.getElementById("uInspectBoilerplateBtn");
      if (bpBtn) bpBtn.addEventListener("click", () => jumpToTableFilter({ flagFilter: "boilerplate" }));
      const delBtn = document.getElementById("uInspect410Btn");
      if (delBtn) delBtn.addEventListener("click", () => jumpToTableFilter({ preset: "410_GONE_DELETE" }));
      const procBtn = document.getElementById("uProcJumpTable");
      if (procBtn) procBtn.addEventListener("click", () => jumpToTableFilter({ preset: "action_needed" }));

      root.querySelectorAll(".u-inspect-fam").forEach((btn) => {
        btn.addEventListener("click", () => jumpToTableFilter({ family: btn.dataset.family }));
      });
      root.querySelectorAll("[data-jump-preset]").forEach((btn) => {
        btn.addEventListener("click", () => jumpToTableFilter({ preset: btn.dataset.jumpPreset }));
      });
      root.querySelectorAll("[data-jump-family]").forEach((btn) => {
        btn.addEventListener("click", () => jumpToTableFilter({ family: btn.dataset.jumpFamily }));
      });
      root.querySelectorAll("[data-jump-sm]").forEach((btn) => {
        btn.addEventListener("click", () => jumpToTableFilter({ smFilter: btn.dataset.jumpSm }));
      });

      shellMounted = true;
    }

    applySubVisibility(data);
  };
})();
