/* GCSE OnTrack — Free Mistake & Fix Log. Stored locally in this browser. */
(() => {
  "use strict";

  const KEY = "gcoFreeMistakes_v1";
  const $ = id => document.getElementById(id);

  const form = $("mistakeLogForm");
  const list = $("mistakeLogList");

  if (!form || !list) return;

  let entries = [];

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    entries = Array.isArray(saved) ? saved : [];
  } catch {
    entries = [];
  }

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const today = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries));
      return true;
    } catch {
      status("Could not save. Check available browser storage.", true);
      return false;
    }
  };

  const status = (message, error = false) => {
    const el = $("mistakeLogStatus");

    if (el) {
      el.textContent = message;
      el.style.color = error ? "#b91c1c" : "#3155a4";
    }
  };

  const pretty = value => {
    if (!value) return "No date set";

    const d = new Date(value + "T00:00:00");

    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString("en-GB");
  };

  function render() {
    const filter = $("mistakeLogFilter")?.value || "all";

    const visible = entries
      .filter(item =>
        filter === "all" ||
        (filter === "review" && !item.reviewed) ||
        (filter === "reviewed" && item.reviewed)
      )
      .sort((a, b) =>
        Number(a.reviewed) - Number(b.reviewed) ||
        String(a.reviewBy || "9999-99-99").localeCompare(
          String(b.reviewBy || "9999-99-99")
        ) ||
        b.createdAt - a.createdAt
      );

    const count = $("mistakeLogCount");

    if (count) {
      count.textContent =
        `${entries.length} saved · ` +
        `${entries.filter(x => !x.reviewed).length} to revisit`;
    }

    if (!visible.length) {
      list.innerHTML =
        '<div class="mistake-empty">' +
        "No entries here yet. Add one mistake and its correction after your next practice question." +
        "</div>";

      return;
    }

    list.innerHTML = visible.map(item => `
      <article class="mistake-card ${item.reviewed ? "reviewed" : ""}">
        <div class="mistake-card-top">
          <div>
            <h3>${esc(item.topic)}</h3>
            <div class="mistake-meta">
              ${esc(item.subject)} · Added ${esc(pretty(item.createdDate))} ·
              ${item.reviewed ? "Reviewed" : "Needs review"}
            </div>
          </div>
          <span class="mistake-count">
            ${item.reviewed ? "Understood" : "Revisit"}
          </span>
        </div>

        <div class="mistake-section">
          <strong>What went wrong</strong>
          <p>${esc(item.mistake)}</p>
        </div>

        <div class="mistake-section">
          <strong>Correct method / next step</strong>
          <p>${esc(item.fix)}</p>
        </div>

        <div class="mistake-meta" style="margin-top:10px">
          Review date: ${esc(pretty(item.reviewBy))}
        </div>

        <div class="mistake-actions">
          <button class="btn secondary small" type="button"
            data-review="${esc(item.id)}">
            ${item.reviewed ? "Mark to revisit" : "Mark understood"}
          </button>

          <button class="btn secondary small" type="button"
            data-edit="${esc(item.id)}">
            Edit
          </button>

          <button class="btn danger small" type="button"
            data-delete="${esc(item.id)}">
            Delete
          </button>
        </div>
      </article>
    `).join("");
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const editId = $("mistakeEditId").value;

    const payload = {
      subject: $("mistakeSubject").value.trim(),
      topic: $("mistakeTopic").value.trim(),
      mistake: $("mistakeWhatWentWrong").value.trim(),
      fix: $("mistakeCorrection").value.trim(),
      reviewBy: $("mistakeReviewDate").value || today()
    };

    if (
      !payload.subject ||
      !payload.topic ||
      !payload.mistake ||
      !payload.fix
    ) {
      status(
        "Complete the subject, topic, mistake and correction fields.",
        true
      );
      return;
    }

    if (editId) {
      const old = entries.find(x => x.id === editId);

      if (!old) {
        status("That entry could not be found. Please try again.", true);
        resetForm();
        return;
      }

      Object.assign(old, payload, { updatedAt: Date.now() });
      status("Mistake updated.");
    } else {
      entries.unshift({
        id: (
          crypto?.randomUUID
            ? crypto.randomUUID()
            : `mistake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        ),
        ...payload,
        reviewed: false,
        createdAt: Date.now(),
        createdDate: today()
      });

      status("Saved. Revisit this correction on the review date.");
    }

    if (!save()) return;

    resetForm();
    render();

    if (typeof window.gcoTrack === "function") {
      window.gcoTrack("free_mistake_saved");
    }
  });

  function resetForm() {
    form.reset();

    $("mistakeEditId").value = "";
    $("mistakeLogSubmit").textContent = "Save mistake & fix";
    $("mistakeLogCancelEdit").hidden = true;
    $("mistakeReviewDate").value = today();
  }

  $("mistakeLogCancelEdit")?.addEventListener("click", () => {
    resetForm();
    status("Edit cancelled.");
  });

  $("mistakeLogFilter")?.addEventListener("change", render);

  list.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    if (button.dataset.review) {
      const item = entries.find(x => x.id === button.dataset.review);

      if (!item) return;

      item.reviewed = !item.reviewed;
      item.lastReviewedAt = item.reviewed ? Date.now() : null;

      save();
      render();

      status(
        item.reviewed
          ? "Marked understood. If you forget it later, mark it to revisit again."
          : "Added back to your review list."
      );
    } else if (button.dataset.delete) {
      const item = entries.find(x => x.id === button.dataset.delete);

      if (!item) return;

      if (!confirm(`Delete the mistake log entry “${item.topic}”?`)) {
        return;
      }

      entries = entries.filter(x => x.id !== item.id);

      save();
      render();
      status("Entry deleted.");
    } else if (button.dataset.edit) {
      const item = entries.find(x => x.id === button.dataset.edit);

      if (!item) return;

      $("mistakeEditId").value = item.id;
      $("mistakeSubject").value = item.subject;
      $("mistakeTopic").value = item.topic;
      $("mistakeWhatWentWrong").value = item.mistake;
      $("mistakeCorrection").value = item.fix;
      $("mistakeReviewDate").value = item.reviewBy || today();
      $("mistakeLogSubmit").textContent = "Save changes";
      $("mistakeLogCancelEdit").hidden = false;

      form.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      $("mistakeTopic").focus();
    }
  });

  $("mistakeExport")?.addEventListener("click", () => {
    const blob = new Blob(
      [
        JSON.stringify({
          exportedAt: new Date().toISOString(),
          version: 1,
          mistakes: entries
        }, null, 2)
      ],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "gcse-ontrack-mistake-log.json";
    a.click();

    URL.revokeObjectURL(url);
    status("Mistake log exported.");
  });

  $("mistakeImport")?.addEventListener("click", () => {
    $("mistakeImportFile")?.click();
  });

  $("mistakeImportFile")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());

      const incoming = Array.isArray(parsed)
        ? parsed
        : parsed.mistakes;

      if (!Array.isArray(incoming)) {
        throw new Error("Expected a mistake list.");
      }

      const clean = incoming
        .filter(x =>
          x &&
          x.subject &&
          x.topic &&
          x.mistake &&
          x.fix
        )
        .map(x => ({
          id: String(
            x.id ||
            `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          ),
          subject: String(x.subject).slice(0, 80),
          topic: String(x.topic).slice(0, 120),
          mistake: String(x.mistake).slice(0, 1000),
          fix: String(x.fix).slice(0, 1000),
          reviewBy: String(x.reviewBy || today()).slice(0, 10),
          reviewed: !!x.reviewed,
          createdAt: Number(x.createdAt) || Date.now(),
          createdDate: String(x.createdDate || today()).slice(0, 10)
        }));

      if (!clean.length) {
        throw new Error("No valid mistake entries found.");
      }

      if (
        !confirm(
          `Import ${clean.length} entries? Existing entries with the same IDs will be replaced.`
        )
      ) {
        return;
      }

      const map = new Map(entries.map(x => [x.id, x]));

      clean.forEach(x => map.set(x.id, x));
      entries = [...map.values()];

      save();
      render();
      status(`Imported ${clean.length} entries.`);
    } catch (error) {
      status(
        "Could not import that file. Choose a GCSE OnTrack mistake-log JSON backup.",
        true
      );
    } finally {
      event.target.value = "";
    }
  });

  $("mistakeReviewDate").value = today();
  render();
})();
