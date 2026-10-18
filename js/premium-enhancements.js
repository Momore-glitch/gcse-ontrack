/* GCSE OnTrack — Premium workflow enhancements
 * No external APIs or hosting. Uses existing browser-local records.
 */
(() => {
  "use strict";

  const KEYS = {
    records: "gcoPremiumEvidence_v1",
    sessions: "premiumStudySessions",
    errors: "premiumErrorBank"
  };

  const $ = id => document.getElementById(id);

  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  const newId = () => (
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const today = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const read = key => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Premium save failed", error);
      status(
        "Browser storage is full. Export a backup and remove older records before trying again."
      );
      return false;
    }
  };

  function status(message) {
    const el = $("premiumWorkspaceStatus");
    if (el) el.textContent = message;
  }

  function dayOffset(base, days) {
    const d = new Date(`${base || today()}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function dateLabel(v) {
    const d = new Date(`${v || today()}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? "Date not set"
      : d.toLocaleDateString("en-GB");
  }

  function canonical(item, keys) {
    return keys
      .map(k => String(item?.[k] ?? "").trim().toLowerCase())
      .join("¦");
  }

  function normaliseSessions() {
    const sessions = read(KEYS.sessions).slice(0, 100);
    let changed = false;

    sessions.forEach(s => {
      if (!s.id) {
        s.id = newId();
        changed = true;
      }

      if (typeof s.completed !== "boolean") {
        s.completed = !!s.completedAt;
        changed = true;
      }

      if (typeof s.reflection !== "string") {
        s.reflection = String(s.outcomeNotes || "");
        changed = true;
      }
    });

    if (changed) write(KEYS.sessions, sessions);

    return sessions;
  }

  function normaliseErrors() {
    const errors = read(KEYS.errors).slice(0, 250);
    let changed = false;

    errors.forEach(e => {
      if (!e.id) {
        e.id = newId();
        changed = true;
      }

      if (!Number.isFinite(Number(e.repetitions))) {
        e.repetitions = e.mastered ? 3 : 0;
        changed = true;
      }

      if (typeof e.reviewOn !== "string") {
        e.reviewOn = e.reviewed
          ? today()
          : String(e.created || today()).slice(0, 10);
        changed = true;
      }

      if (typeof e.mastered !== "boolean") {
        e.mastered = false;
        changed = true;
      }
    });

    if (changed) write(KEYS.errors, errors);

    return errors;
  }

  function addWorkspace() {
    const app = $("trackerApp");

    if (!app || $("premiumWorkflowWorkspace")) return;

    app.insertAdjacentHTML("beforeend", `
      <section id="premiumWorkflowWorkspace"
               class="premium-workspace"
               aria-labelledby="workflowHeading">

        <header class="pageHeader" style="margin-top:30px">
          <span class="eyebrow">Premium workflow</span>
          <h2 id="workflowHeading">Turn revision records into action</h2>
          <p>
            Use your scores, saved sessions and mistake log together.
            All records remain in this browser.
          </p>
        </header>

        <section class="panel"
                 style="margin-bottom:18px"
                 aria-labelledby="trendHeading">

          <h2 id="trendHeading">Score trend and next steps</h2>

          <p class="muted">
            Recent marked-paper scores appear here.
            A few scores show direction, not a predicted GCSE grade.
          </p>

          <div id="premiumScoreTrend"></div>
          <div id="premiumNextRecommendations"
               style="margin-top:14px"></div>
        </section>

        <div class="grid grid2" style="align-items:start">

          <section class="panel" aria-labelledby="sessionHeading">
            <h2 id="sessionHeading">Study session follow-through</h2>

            <p class="muted">
              Mark generated sessions complete only after doing the work.
              Planned time and completed time are kept separate.
            </p>

            <div id="premiumSessionStats"
                 class="notice"
                 style="margin-bottom:14px"></div>

            <div id="premiumSessionList"></div>
          </section>

          <section class="panel" aria-labelledby="errorHeading">
            <h2 id="errorHeading">Mistake self-test</h2>

            <p class="muted">
              Read the mistake, try to recall the correct answer,
              then reveal it. Successful recall schedules the next
              review further into the future.
            </p>

            <div id="premiumErrorReviewList"></div>
          </section>

        </div>

        <section class="panel"
                 style="margin-top:18px"
                 aria-labelledby="backupHeading">

          <h2 id="backupHeading">Your Premium data and report</h2>

          <p class="muted">
            A complete backup includes tracker records, saved sessions
            and Error Bank entries. Keep it somewhere safe before
            clearing browser data or changing device.
          </p>

          <div class="actions screen-only" id="premiumBackupActions">

            <button type="button"
                    class="btn secondary"
                    id="premiumExportAll">
              Export complete backup
            </button>

            <button type="button"
                    class="btn secondary"
                    id="premiumImportAll">
              Import backup
            </button>

            <input type="file"
                   id="premiumImportFile"
                   accept="application/json,.json"
                   hidden>

            <button type="button"
                    class="btn"
                    id="premiumPrintReport">
              Print / save progress report
            </button>

          </div>

          <p id="premiumWorkspaceStatus"
             class="muted"
             role="status"
             aria-live="polite"
             style="margin:12px 0 0"></p>

          <p class="muted" style="margin:12px 0 0">
            Privacy note: this feature uses browser storage only.
            It does not upload your notes, marks or mistakes to GCSE OnTrack.
          </p>

        </section>
      </section>
    `);

    const style = document.createElement("style");

    style.textContent = `
      .premium-workspace .workflow-card {
        border: 1px solid var(--border);
        border-radius: 13px;
        padding: 14px;
        margin: 10px 0;
        background: var(--surface);
      }

      .premium-workspace .workflow-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        align-items: center;
        margin: 8px 0;
      }

      .premium-workspace .score-row {
        display: grid;
        grid-template-columns: minmax(110px, 1.1fr)
                               minmax(90px, 2fr) 52px;
        gap: 10px;
        align-items: center;
        margin: 11px 0;
      }

      .premium-workspace .score-track {
        height: 10px;
        border-radius: 999px;
        background: var(--surface2);
        overflow: hidden;
      }

      .premium-workspace .score-fill {
        height: 100%;
        border-radius: 999px;
        background: var(--primary);
      }

      .premium-workspace .answer-box {
        white-space: pre-wrap;
        background: var(--surface2);
        border-radius: 10px;
        padding: 12px;
        margin-top: 10px;
      }

      .premium-workspace .workflow-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      .premium-workspace .workflow-actions .btn {
        font-size: .88rem;
      }

      @media(max-width:600px) {
        .premium-workspace .score-row {
          grid-template-columns: 1fr 56px;
        }

        .premium-workspace .score-track {
          grid-column: 1 / -1;
          grid-row: 2;
        }
      }

      @media print {
        body {
          background: #fff !important;
          color: #111 !important;
          font-size: 10pt !important;
        }

        .container {
          width: 100% !important;
          margin: 0 !important;
        }

        nav, footer, .screen-only, #accessGate, #evidenceForm, .eyebrow {
          display: none !important;
        }

        #trackerApp[hidden] {
          display: block !important;
        }

        #trackerApp {
          display: block !important;
        }

        #trackerApp > .grid.grid2 {
          display: block !important;
        }

        #trackerApp > .grid.grid2 > .panel:has(#evidenceForm) {
          display: none !important;
        }

        .panel, .card, .workflow-card {
          box-shadow: none !important;
          break-inside: avoid;
          border: 1px solid #ccc !important;
        }

        .premium-workspace .grid,
        .premium-workspace .grid2 {
          display: block !important;
        }

        a {
          color: #111 !important;
          text-decoration: none !important;
        }

        .answer-box {
          display: block !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function renderScoreTrend() {
    const host = $("premiumScoreTrend");
    const recs = read(KEYS.records);

    if (!host) return;

    const scored = recs
      .filter(r =>
        r &&
        r.kind !== "resource" &&
        Number.isFinite(Number(r.score)) &&
        r.score !== "" &&
        r.score !== null &&
        r.score !== undefined &&
        Number(r.score) >= 0 &&
        Number(r.score) <= 100
      )
      .sort((a, b) =>
        String(a.date || "").localeCompare(String(b.date || "")) ||
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      )
      .slice(-8);

    if (!scored.length) {
      host.innerHTML = `
        <div class="empty">
          <strong>No marked paper logged yet</strong>
          <p>
            Add your first marked past paper above; your recent scores
            and possible next steps will appear here.
          </p>
        </div>
      `;

      $("premiumNextRecommendations").innerHTML = `
        <p class="muted">
          Tip: include the topic you found hardest and a concrete
          next action when logging a paper.
        </p>
      `;

      return;
    }

    host.innerHTML = scored.map(r => `
      <div class="score-row">
        <div>
          <strong>${esc(r.subject || "Subject")}</strong>
          <div class="muted" style="font-size:.82rem">
            ${esc(r.topic || r.title || "Topic")} · ${dateLabel(r.date)}
          </div>
        </div>

        <div class="score-track"
             aria-label="${Math.round(Number(r.score))}%">
          <div class="score-fill"
               style="width:${Math.max(0, Math.min(100, Number(r.score)))}%">
          </div>
        </div>

        <strong>${Math.round(Number(r.score))}%</strong>
      </div>
    `).join("");

    const grouped = new Map();

    recs.filter(r =>
      r &&
      r.kind !== "resource" &&
      r.score !== "" &&
      r.score !== null &&
      Number.isFinite(Number(r.score))
    ).forEach(r => {
      const subject = String(r.subject || "Other");
      const topic = String(r.topic || "Unspecified");
      const key = `${subject} — ${topic}`;

      if (!grouped.has(key)) grouped.set(key, []);

      grouped.get(key).push(Number(r.score));
    });

    const ranked = [...grouped.entries()]
      .map(([topic, scores]) => ({
        topic,
        scores,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        attempts: scores.length
      }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3);

    const actions = ranked.map(item => {
      const first = item.topic.split(" — ");
      const subject = first[0] || "GCSE";
      const topic = first.slice(1).join(" — ") || "revision";
      const search = `GCSE ${subject} ${topic}`;
      const videoUrl =
        `https://www.youtube.com/results?search_query=${encodeURIComponent(search)}`;

      return `
        <article class="workflow-card">
          <strong>Review ${esc(item.topic)}</strong>

          <div class="workflow-meta">
            <span class="badge">
              ${Math.round(item.avg)}% recorded average
            </span>

            <span class="badge">
              ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}
            </span>
          </div>

          <p class="muted">
            Try a targeted explanation, then answer fresh exam questions
            and log the next result.
          </p>

          <div class="workflow-actions">
            <a class="btn secondary" href="past-papers.html">
              Browse papers & lessons
            </a>

            <a class="btn secondary"
               href="${esc(videoUrl)}"
               target="_blank"
               rel="noopener noreferrer">
              Find a topic video ↗
            </a>
          </div>
        </article>
      `;
    });

    const overall = scored.length >= 2
      ? Number(scored[scored.length - 1].score) -
        Number(scored[scored.length - 2].score)
      : null;

    const trend = overall === null
      ? "Log another marked paper to compare two attempts."
      : `Most recent score ${overall >= 0 ? "rose" : "fell"} by ${Math.abs(Math.round(overall))} percentage points compared with the previous logged paper. This is a comparison of two records, not a grade prediction.`;

    $("premiumNextRecommendations").innerHTML = `
      <div class="notice">
        <strong>Recent score comparison</strong>
        <p style="margin:5px 0 0">${esc(trend)}</p>
      </div>

      <h3 style="margin-top:18px">Topics to consider revisiting</h3>

      ${actions.join("") || `
        <p class="muted">
          Log topic-level scores to build useful review signals.
        </p>
      `}

      <p class="muted" style="margin-top:10px">
        Topic averages are only as reliable as the records you enter.
        Paper difficulty and mark allocations can differ.
      </p>
    `;
  }

  function renderSessions() {
    const host = $("premiumSessionList");

    if (!host) return;

    const sessions = normaliseSessions()
      .sort((a, b) =>
        String(b.created || "").localeCompare(String(a.created || ""))
      );

    const completed = sessions.filter(
      s => s.completed || s.completedAt
    );

    const plannedMins = sessions.reduce(
      (n, s) => n + Math.max(0, Number(s.time) || 0),
      0
    );

    const completedMins = completed.reduce(
      (n, s) => n + Math.max(0, Number(s.time) || 0),
      0
    );

    $("premiumSessionStats").innerHTML = `
      <strong>${completed.length}/${sessions.length} sessions completed</strong>
      <br>
      <span class="muted">
        ${completedMins} completed minutes ·
        ${Math.max(0, plannedMins - completedMins)}
        minutes still planned or in progress.
      </span>
    `;

    if (!sessions.length) {
      host.innerHTML = `
        <div class="empty">
          <strong>No saved sessions yet</strong>
          <p>
            Generate a study session in My Resources first.
            It will appear here so you can record whether you completed it.
          </p>
          <a class="btn secondary" href="resources.html">
            Open My Resources →
          </a>
        </div>
      `;

      return;
    }

    host.innerHTML = sessions.slice(0, 15).map(s => `
      <article class="workflow-card">
        <div class="workflow-meta">
          <span class="badge">
            ${s.completed || s.completedAt ? "Completed" : "Planned"}
          </span>
          <span class="muted">
            ${Math.max(0, Number(s.time) || 0)} minutes
          </span>
        </div>

        <strong>
          ${esc(s.subject || "Subject")}: ${esc(s.topic || "Topic")}
        </strong>

        <p class="muted" style="margin:6px 0">
          ${esc(s.steps?.join(" · ") || "Structured study session")}
        </p>

        ${s.completedAt ? `
          <p class="muted">
            Completed ${dateLabel(String(s.completedAt).slice(0, 10))}
            ${s.reflection ? ` · ${esc(s.reflection)}` : ""}
          </p>

          <button class="btn secondary small"
                  type="button"
                  data-reopen-session="${esc(s.id)}">
            Mark planned again
          </button>
        ` : `
          <button class="btn small"
                  type="button"
                  data-complete-session="${esc(s.id)}">
            Mark session complete
          </button>
        `}
      </article>
    `).join("");
  }

  function renderErrors() {
    const host = $("premiumErrorReviewList");

    if (!host) return;

    const errors = normaliseErrors().sort((a, b) =>
      String(a.reviewOn || "").localeCompare(String(b.reviewOn || ""))
    );

    if (!errors.length) {
      host.innerHTML = `
        <div class="empty">
          <strong>No mistakes saved yet</strong>
          <p>
            Add mistakes from the Premium Error Bank on your Progress page.
            They will appear here for active recall.
          </p>
          <a class="btn secondary" href="progress.html">
            Open Progress →
          </a>
        </div>
      `;

      return;
    }

    const due = errors.filter(
      e => !e.mastered && String(e.reviewOn || today()) <= today()
    ).length;

    host.innerHTML = `
      <p class="muted">
        ${due} item${due === 1 ? "" : "s"} due for review ·
        ${errors.filter(e => e.mastered).length} marked mastered
      </p>
    ` + errors.slice(0, 12).map(e => {
      const answer = esc(
        e.correct || e.answer || "No correct answer was saved."
      ).replace(/\n/g, "<br>");

      const mistake = esc(e.wrong || e.mistake || "");
      const why = esc(e.why || "");

      const dueText = e.mastered
        ? "Mastered"
        : (
          String(e.reviewOn || today()) <= today()
            ? "Due now"
            : `Review ${dateLabel(e.reviewOn)}`
        );

      return `
        <article class="workflow-card">
          <div class="workflow-meta">
            <span class="badge">
              ${esc(e.subject || "Subject")} · ${esc(e.topic || "Topic")}
            </span>
            <span class="badge">${esc(dueText)}</span>
          </div>

          <p>
            <strong>Try to recall:</strong><br>
            ${mistake.replace(/\n/g, "<br>")}
          </p>

          ${why ? `
            <p class="muted">
              <strong>Why it happened:</strong> ${why}
            </p>
          ` : ""}

          <div data-answer-box="${esc(e.id)}"
               class="answer-box"
               hidden>
            <strong>Correct answer</strong><br>
            ${answer}
          </div>

          <div class="workflow-actions">
            <button class="btn secondary small"
                    type="button"
                    data-reveal-answer="${esc(e.id)}">
              Reveal answer
            </button>

            <button class="btn small"
                    type="button"
                    data-error-result="remembered"
                    data-error-id="${esc(e.id)}">
              I recalled it
            </button>

            <button class="btn secondary small"
                    type="button"
                    data-error-result="again"
                    data-error-id="${esc(e.id)}">
              Need more practice
            </button>
          </div>

          <p class="muted" style="font-size:.83rem;margin:9px 0 0">
            ${Number(e.repetitions) || 0}
            successful recall${Number(e.repetitions) === 1 ? "" : "s"} logged.
          </p>
        </article>
      `;
    }).join("");
  }

  function renderAll() {
    renderScoreTrend();
    renderSessions();
    renderErrors();
  }

  function exportAll() {
    const bundle = {
      product: "GCSE OnTrack",
      backupType: "premium-complete",
      version: 2,
      exportedAt: new Date().toISOString(),
      evidenceRecords: read(KEYS.records),
      sessions: read(KEYS.sessions),
      errors: read(KEYS.errors)
    };

    const blob = new Blob(
      [JSON.stringify(bundle, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `gcse-ontrack-complete-backup-${today()}.json`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    status(
      "Complete backup downloaded: tracker records, saved sessions and Error Bank entries are included."
    );
  }

  function mergeUnique(existing, incoming, keyFn, limit) {
    const seen = new Set(existing.map(keyFn));
    const added = [];

    incoming.slice(0, limit).forEach(item => {
      const key = keyFn(item);

      if (!seen.has(key)) {
        seen.add(key);
        added.push(item);
      }
    });

    return [...added, ...existing].slice(0, limit);
  }

  async function importAll(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      if (file.size > 5_000_000) {
        throw new Error(
          "This backup is larger than 5 MB. Choose a smaller GCSE OnTrack backup."
        );
      }

      const data = JSON.parse(await file.text());

      const records = Array.isArray(data)
        ? data
        : (data.evidenceRecords || data.records);

      if (!Array.isArray(records)) {
        throw new Error(
          "This file isn't a recognised GCSE OnTrack Premium backup."
        );
      }

      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      const errors = Array.isArray(data.errors) ? data.errors : [];

      const oldRecords = read(KEYS.records);

      const newRecords = mergeUnique(
        oldRecords,
        records,
        r => String(
          r.id || canonical(r, ["subject", "title", "topic", "date"])
        ),
        500
      );

      const oldSessions = read(KEYS.sessions);

      const newSessions = mergeUnique(
        oldSessions,
        sessions,
        s => String(
          s.id || canonical(s, ["subject", "topic", "created"])
        ),
        100
      );

      const oldErrors = read(KEYS.errors);

      const newErrors = mergeUnique(
        oldErrors,
        errors,
        e => String(
          e.id || canonical(e, ["subject", "topic", "wrong", "created"])
        ),
        250
      );

      if (
        !write(KEYS.records, newRecords) ||
        !write(KEYS.sessions, newSessions) ||
        !write(KEYS.errors, newErrors)
      ) {
        throw new Error(
          "The browser could not store all imported data. Export a backup and free some space, then retry."
        );
      }

      status(
        `Import complete: ${newRecords.length - oldRecords.length} new tracker records, ${newSessions.length - oldSessions.length} sessions and ${newErrors.length - oldErrors.length} mistakes added. Reloading…`
      );

      setTimeout(() => location.reload(), 700);

    } catch (error) {
      status(
        error.message ||
        "Couldn't import this backup. Check the JSON file and try again."
      );

    } finally {
      event.target.value = "";
    }
  }

  function completeSession(id) {
    const sessions = normaliseSessions();
    const s = sessions.find(x => String(x.id) === String(id));

    if (!s) return;

    const reflection = prompt(
      "One quick reflection (optional): what did you learn or still find difficult?",
      s.reflection || ""
    );

    s.completed = true;
    s.completedAt = new Date().toISOString();

    s.reflection = reflection === null
      ? (s.reflection || "")
      : reflection.trim();

    if (write(KEYS.sessions, sessions)) {
      renderSessions();
      status(
        "Session marked complete. Your completed-time total has been updated."
      );
    }
  }

  function reviewError(id, result) {
    const errors = normaliseErrors();
    const e = errors.find(x => String(x.id) === String(id));

    if (!e) return;

    if (result === "remembered") {
      e.repetitions = Math.max(0, Number(e.repetitions) || 0) + 1;

      const gaps = [1, 3, 7, 14, 30];

      e.reviewOn = dayOffset(
        today(),
        gaps[Math.min(e.repetitions - 1, gaps.length - 1)]
      );

      e.reviewedAt = new Date().toISOString();
      e.mastered = e.repetitions >= 5;

      status(
        e.mastered
          ? "Five successful recalls logged. This item is marked mastered; continue reviewing it occasionally."
          : `Correct recall logged. Next review: ${dateLabel(e.reviewOn)}.`
      );

    } else {
      e.repetitions = 0;
      e.mastered = false;
      e.reviewOn = today();

      status(
        "Keep this item on today's review list. Read the explanation, then test yourself again later."
      );
    }

    if (write(KEYS.errors, errors)) renderErrors();
  }

  function handleWorkspaceClick(event) {
    const target = event.target.closest("button");

    if (!target) return;

    if (target.id === "premiumExportAll") {
      exportAll();
    }

    if (target.id === "premiumImportAll") {
      $("premiumImportFile").click();
    }

    if (target.id === "premiumPrintReport") {
      status(
        "Use the browser print dialog to print or save this report as PDF."
      );
      window.print();
    }

    if (target.dataset.completeSession) {
      completeSession(target.dataset.completeSession);
    }

    if (target.dataset.reopenSession) {
      const sessions = normaliseSessions();

      const s = sessions.find(
        x => String(x.id) === String(target.dataset.reopenSession)
      );

      if (s) {
        s.completed = false;
        s.completedAt = null;

        if (write(KEYS.sessions, sessions)) {
          renderSessions();
          status("Session returned to your planned list.");
        }
      }
    }

    if (target.dataset.revealAnswer) {
      const box = document.querySelector(
        `[data-answer-box="${CSS.escape(target.dataset.revealAnswer)}"]`
      );

      if (box) {
        box.hidden = !box.hidden;
        target.textContent = box.hidden
          ? "Reveal answer"
          : "Hide answer";
      }
    }

    if (target.dataset.errorResult) {
      reviewError(
        target.dataset.errorId,
        target.dataset.errorResult
      );
    }
  }

  function start() {
    const app = $("trackerApp");

    addWorkspace();

    const workspace = $("premiumWorkflowWorkspace");

    if (!workspace || workspace.dataset.ready) return;

    workspace.dataset.ready = "true";

    workspace.addEventListener("click", handleWorkspaceClick);

    $("premiumImportFile").addEventListener("change", importAll);

    let active = false;

    const activateAfterAccess = () => {
      if (active || !app || app.hidden) return;

      active = true;

      renderAll();

      const list = $("recordList");

      if (list && "MutationObserver" in window) {
        const recordObserver = new MutationObserver(
          () => renderScoreTrend()
        );

        recordObserver.observe(list, {
          childList: true,
          subtree: true
        });
      }

      window.addEventListener("storage", event => {
        if (Object.values(KEYS).includes(event.key)) {
          renderAll();
        }
      });
    };

    activateAfterAccess();

    if (!active && app && "MutationObserver" in window) {
      const accessObserver = new MutationObserver(() => {
        activateAfterAccess();

        if (active) accessObserver.disconnect();
      });

      accessObserver.observe(app, {
        attributes: true,
        attributeFilter: ["hidden"]
      });
    }
  }

  // This section lives inside the existing account-gated tracker,
  // so it stays hidden until Premium access is verified.
  document.addEventListener("DOMContentLoaded", start);
})();
