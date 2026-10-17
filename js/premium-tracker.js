/* GCSE OnTrack — Premium Revision Evidence Tracker
 * Zero-cost, browser-local storage. Does not upload records to a server.
 */
(() => {
  "use strict";
  const KEY = "gcoPremiumEvidence_v1";
  const $ = id => document.getElementById(id);
  let records = [];

  const safeText = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function todayLocal() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function readRecords() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value.filter(item => item && typeof item === "object") : [];
    } catch (error) {
      console.error("Could not read revision evidence:", error);
      return [];
    }
  }

  function storeRecords() {
    try {
      localStorage.setItem(KEY, JSON.stringify(records.slice(0, 500)));
      return true;
    } catch (error) {
      console.error("Could not save revision evidence:", error);
      if ($("formMessage")) $("formMessage").textContent = "Could not save. Export a backup and remove older records to free browser storage.";
      return false;
    }
  }

  function showGate(type) {
    const gate = $("accessGate");
    const content = {
      signin: `<h2>Sign in to continue</h2><p class="muted">Your Premium status is linked to your GCSE OnTrack account.</p><a class="btn" href="account.html">Sign in / create account</a>`,
      premium: `<h2>🔒 Premium feature</h2><p class="muted">The revision evidence tracker is for Premium members. Upgrade to unlock paper-score logging, topic signals and next-step recommendations.</p><a class="btn" href="subscription.html">Explore Premium</a>`,
      error: `<h2>Can't verify your account</h2><p class="muted">Refresh the page and try again. Your browser records have not been changed.</p><a class="btn secondary" href="index.html">Back to Home</a>`
    };
    gate.innerHTML = content[type] || content.error;
    gate.hidden = false;
    $("trackerApp").hidden = true;
  }

  async function checkAccess() {
    if (!window.supabaseClient?.auth) return showGate("error");
    try {
      const { data, error } = await window.supabaseClient.auth.getSession();
      if (error) throw error;
      const session = data?.session;
      if (!session) return showGate("signin");
      const result = await window.supabaseClient.from("subscriptions")
        .select("status").eq("user_id", session.user.id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data || !["active", "trialing"].includes(result.data.status)) return showGate("premium");
      $("accessGate").hidden = true;
      $("trackerApp").hidden = false;
      start();
    } catch (error) {
      console.error("Premium access check failed:", error);
      showGate("error");
    }
  }

  function recordShape(item) {
    const scoreValue = item.score === "" || item.score === null || item.score === undefined ? null : Number(item.score);
    return {
      id: String(item.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      kind: item.kind === "resource" ? "resource" : "paper",
      subject: String(item.subject || "Other").slice(0, 60),
      board: String(item.board || "").slice(0, 40),
      title: String(item.title || "Untitled record").slice(0, 140),
      topic: String(item.topic || "Unspecified topic").slice(0, 120),
      score: Number.isFinite(scoreValue) && scoreValue >= 0 && scoreValue <= 100 ? scoreValue : null,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || "")) ? item.date : todayLocal(),
      url: String(item.url || "").slice(0, 500),
      mistakes: String(item.mistakes || "").slice(0, 1200),
      next: String(item.next || "").slice(0, 700),
      createdAt: String(item.createdAt || new Date().toISOString())
    };
  }

  function validHttpUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "Date unknown" : date.toLocaleDateString("en-GB");
  }

  function renderSummary() {
    const papers = records.filter(r => r.kind === "paper");
    const resources = records.filter(r => r.kind === "resource");
    const scored = papers.filter(r => Number.isFinite(r.score));
    const avg = scored.length ? scored.reduce((sum, r) => sum + r.score, 0) / scored.length : null;
    const topicStats = new Map();
    scored.forEach(record => {
      const key = `${record.subject} — ${record.topic}`;
      const stat = topicStats.get(key) || { total: 0, count: 0 };
      stat.total += record.score;
      stat.count += 1;
      topicStats.set(key, stat);
    });
    const needsReview = [...topicStats.entries()].filter(([, v]) => v.count >= 1 && v.total / v.count < 60);
    $("paperTotal").textContent = papers.length;
    $("resourceTotal").textContent = resources.length;
    $("averageScore").textContent = avg === null ? "—" : `${Math.round(avg)}%`;
    $("reviewTopicTotal").textContent = needsReview.length;

    const recommendations = $("recommendations");
    if (!scored.length) {
      recommendations.innerHTML = `<div class="empty"><strong>No scored paper yet</strong><p>Log a paper and add your percentage after marking it. The tracker can then highlight topics to revisit.</p></div>`;
      return;
    }
    const sorted = [...topicStats.entries()].sort((a, b) => (a[1].total / a[1].count) - (b[1].total / b[1].count));
    const low = sorted.filter(([, v]) => v.total / v.count < 60).slice(0, 4);
    const suggestions = [];
    if (low.length) {
      low.forEach(([topic, stat]) => suggestions.push(`<div class="insight-item"><strong>Review priority: ${safeText(topic)}</strong><p style="margin:5px 0 0">Recorded average: ${Math.round(stat.total / stat.count)}% across ${stat.count} scored attempt${stat.count === 1 ? "" : "s"}. Review your errors, then retry questions on this topic.</p></div>`));
    } else {
      const [topic, stat] = sorted[0];
      suggestions.push(`<div class="insight-item"><strong>Next useful check: ${safeText(topic)}</strong><p style="margin:5px 0 0">Your lowest recorded topic average is ${Math.round(stat.total / stat.count)}%. Try a fresh set of exam questions to check whether it holds.</p></div>`);
    }
    const latestAction = [...records].sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .find(r => r.next && (r.kind === "paper" || r.kind === "resource"));
    if (latestAction) suggestions.push(`<div class="insight-item"><strong>Your recorded next step</strong><p style="margin:5px 0 0">${safeText(latestAction.next)}</p><span class="muted">From: ${safeText(latestAction.subject)} — ${safeText(latestAction.topic)}</span></div>`);
    if (scored.length < 3) suggestions.push(`<p class="muted" style="margin-top:12px">Early signal only: log a few more marked attempts before relying on a trend. These suggestions are based only on the records you enter; they do not predict grades.</p>`);
    recommendations.innerHTML = suggestions.join("");
  }

  function renderRecords() {
    const filter = $("kindFilter").value;
    const query = $("recordSearch").value.trim().toLowerCase();
    const visible = [...records].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""))
      .filter(r => filter === "all" || r.kind === filter)
      .filter(r => [r.subject, r.board, r.title, r.topic, r.mistakes, r.next].join(" ").toLowerCase().includes(query));
    $("recordCountBadge").textContent = `${records.length} record${records.length === 1 ? "" : "s"}`;
    const host = $("recordList");
    if (!visible.length) {
      host.innerHTML = `<div class="empty"><h3>${records.length ? "No matching records" : "No records yet"}</h3><p>${records.length ? "Try changing the search or filter." : "Log your first paper or resource above. One useful record is enough to begin."}</p></div>`;
      return;
    }
    host.innerHTML = visible.map(record => {
      const url = validHttpUrl(record.url);
      return `<article class="panel record-card">
        <div class="actions" style="justify-content:space-between;align-items:flex-start">
          <div><span class="badge">${record.kind === "paper" ? "Past paper" : "Resource used"}</span><h3 style="margin:10px 0 4px">${safeText(record.title)}</h3><p class="muted" style="margin:0">${safeText(record.subject)}${record.board ? ` · ${safeText(record.board)}` : ""}</p></div>
          ${record.kind === "paper" && record.score !== null ? `<strong style="font-size:1.45rem;color:${record.score < 60 ? "#b45309" : "#15803d"}">${safeText(record.score)}%</strong>` : ""}
        </div>
        <div class="record-meta"><span class="badge">Topic: ${safeText(record.topic)}</span><span class="muted">${formatDate(record.date)}</span></div>
        ${record.mistakes ? `<p><strong>Challenge / mistake:</strong><br>${safeText(record.mistakes).replace(/\n/g, "<br>")}</p>` : ""}
        ${record.next ? `<p><strong>Next action:</strong><br>${safeText(record.next).replace(/\n/g, "<br>")}</p>` : ""}
        ${url ? `<p><a href="${safeText(url)}" target="_blank" rel="noopener noreferrer">Open linked resource ↗</a></p>` : ""}
        <div class="actions"><button class="btn secondary small" type="button" data-delete-record="${safeText(record.id)}">Delete record</button></div>
      </article>`;
    }).join("");
  }

  function render() { renderSummary(); renderRecords(); }

  function addRecord(event) {
    event.preventDefault();
    const kind = $("recordKind").value;
    const scoreRaw = $("recordScore").value.trim();
    if (kind === "paper" && scoreRaw !== "" && (!Number.isFinite(Number(scoreRaw)) || Number(scoreRaw) < 0 || Number(scoreRaw) > 100)) {
      $("formMessage").textContent = "Score must be between 0 and 100, or leave it blank until the paper is marked.";
      return;
    }
    const url = $("recordUrl").value.trim();
    if (url && !validHttpUrl(url)) {
      $("formMessage").textContent = "Enter a valid http or https link, or leave the link field empty.";
      return;
    }
    const record = recordShape({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind, subject: $("recordSubject").value.trim(), board: $("recordBoard").value.trim(),
      title: $("recordTitle").value.trim(), topic: $("recordTopic").value.trim(),
      score: kind === "paper" && scoreRaw !== "" ? Number(scoreRaw) : null,
      date: $("recordDate").value || todayLocal(), url,
      mistakes: $("recordMistakes").value.trim(), next: $("recordNext").value.trim(),
      createdAt: new Date().toISOString()
    });
    if (!record.subject || !record.title || !record.topic) {
      $("formMessage").textContent = "Add a subject, record name and topic to save this.";
      return;
    }
    records.unshift(record);
    records = records.slice(0, 500);
    if (!storeRecords()) return;
    $("evidenceForm").reset();
    $("recordDate").value = todayLocal();
    $("scoreWrap").hidden = false;
    $("recordScore").disabled = false;
    $("formMessage").textContent = "Saved on this browser. Your next step is recorded with it.";
    render();
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ product: "GCSE OnTrack", version: 1, exportedAt: new Date().toISOString(), records }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `gcse-ontrack-revision-evidence-${todayLocal()}.json`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    $("backupMessage").textContent = "Backup exported. Keep the file somewhere safe.";
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const imported = Array.isArray(data) ? data : data.records;
      if (!Array.isArray(imported)) throw new Error("This file doesn't contain a revision evidence backup.");
      const existing = new Set(records.map(r => r.id));
      const cleaned = imported.slice(0, 500).map(recordShape).filter(r => !existing.has(r.id));
      records = [...cleaned, ...records].slice(0, 500);
      if (!storeRecords()) return;
      render();
      $("backupMessage").textContent = `Imported ${cleaned.length} new record${cleaned.length === 1 ? "" : "s"}.`;
    } catch (error) {
      $("backupMessage").textContent = error.message || "Could not import this file. Choose a GCSE OnTrack JSON backup.";
    } finally { event.target.value = ""; }
  }

  function start() {
    records = readRecords().map(recordShape);
    if ($("recordDate")) $("recordDate").value = todayLocal();
    $("recordKind").addEventListener("change", () => {
      const isPaper = $("recordKind").value === "paper";
      $("scoreWrap").hidden = !isPaper;
      if (!isPaper) $("recordScore").value = "";
    });
    $("evidenceForm").addEventListener("submit", addRecord);
    $("recordSearch").addEventListener("input", renderRecords);
    $("kindFilter").addEventListener("change", renderRecords);
    $("recordList").addEventListener("click", event => {
      const button = event.target.closest("[data-delete-record]");
      if (!button) return;
      const id = button.dataset.deleteRecord;
      records = records.filter(record => record.id !== id);
      if (storeRecords()) { render(); $("backupMessage").textContent = "Record deleted."; }
    });
    $("exportRecords").addEventListener("click", exportBackup);
    $("importRecordsBtn").addEventListener("click", () => $("importRecordsFile").click());
    $("importRecordsFile").addEventListener("change", importBackup);
    $("clearRecords").addEventListener("click", () => {
      if (!records.length) { $("backupMessage").textContent = "There are no records to clear."; return; }
      if (!confirm("Delete all revision evidence records from this browser? Export a backup first if you might need them.")) return;
      records = [];
      if (storeRecords()) { render(); $("backupMessage").textContent = "All records cleared from this browser."; }
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", checkAccess);
})();
