/* GCSE OnTrack — Progress tracker, accurate activity streak and focus timer. */
(() => {
  "use strict";
  const KEY = "progressData";
  const $ = id => document.getElementById(id);
  const defaults = {
    papers: 0, streak: 0, target: "", history: [], subjects: {},
    timerMinutes: 25, timerSeconds: 0, activeDays: [], goalDays: []
  };
  const saved = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? (raw[0] || {}) : (raw || {});
    } catch { return {}; }
  })();
  let data = { ...defaults, ...saved };
  if (!Array.isArray(data.history)) data.history = [];
  if (!data.subjects || typeof data.subjects !== "object" || Array.isArray(data.subjects)) data.subjects = {};
  if (!Array.isArray(data.activeDays)) data.activeDays = [];
  if (!Array.isArray(data.goalDays)) data.goalDays = [];
  let timerInterval = null;
  let remainingSeconds = Math.max(0, (Number(data.timerMinutes) || 25) * 60 + (Number(data.timerSeconds) || 0));

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  function localISO(date = new Date()) {
    const d = new Date(date.getTime());
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function dateToISO(value) {
    const s = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    return "";
  }

  function shiftISO(iso, days) {
    const [year, month, day] = iso.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function prettyDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB");
  }

  function normaliseDays() {
    const migratedHistory = data.history.map(dateToISO).filter(Boolean);
    data.activeDays = [...new Set([...data.activeDays.map(dateToISO), ...migratedHistory].filter(Boolean))].sort();
    data.goalDays = [...new Set(data.goalDays.map(dateToISO).filter(Boolean))].sort();
    data.papers = Math.max(0, Number(data.papers) || 0);
    Object.entries(data.subjects).forEach(([subject, value]) => {
      data.subjects[subject] = Math.max(0, Math.min(100, Number(value) || 0));
    });
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify([data]));
      return true;
    } catch (error) {
      console.error("Progress save failed:", error);
      const message = $("goalMessage") || $("timerStatus");
      if (message) message.textContent = "Your browser could not save this change. Export your resource backups and free up browser storage before trying again.";
      return false;
    }
  }

  function currentStreak() {
    const days = new Set(data.activeDays);
    const today = localISO();
    let cursor = days.has(today) ? today : shiftISO(today, -1);
    if (!days.has(cursor)) return 0;
    let total = 0;
    while (days.has(cursor)) { total++; cursor = shiftISO(cursor, -1); }
    return total;
  }

  function registerActivity(message) {
    const today = localISO();
    data.activeDays = [...new Set([...data.activeDays, today])].sort();
    data.history.push(`${message} · ${prettyDate(today)}`);
    data.history = data.history.slice(-40);
    data.streak = currentStreak();
    save();
  }

  function renderTimer() {
    const safe = Math.max(0, remainingSeconds);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    if ($("timer")) $("timer").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (timerInterval === null) {
      if ($("timerMinutes")) $("timerMinutes").value = minutes;
      if ($("timerSeconds")) $("timerSeconds").value = seconds;
    }
  }

  function renderSubjects() {
    const host = $("subjectProgress");
    if (!host) return;
    const entries = Object.entries(data.subjects);
    $("progressSummary").textContent = entries.length
      ? `${entries.length} subject${entries.length === 1 ? "" : "s"} tracked. Ratings are your own confidence estimates, not assessed grades.`
      : "No subjects tracked yet. Add the subjects you want to prioritise.";
    host.innerHTML = entries.map(([subject, value]) => `
      <article class="subject-progress-card">
        <div class="subject-progress-top"><strong>${escapeHTML(subject)}</strong><strong>${value}%</strong></div>
        <div class="progressbar" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHTML(subject)} self-rated confidence"><span style="width:${value}%"></span></div>
        <div class="actions" style="margin-top:10px">
          <button type="button" class="btn secondary small" data-progress-change="-10" data-subject="${encodeURIComponent(subject)}" aria-label="Lower ${escapeHTML(subject)} confidence by 10 points">−10</button>
          <button type="button" class="btn secondary small" data-progress-change="10" data-subject="${encodeURIComponent(subject)}" aria-label="Raise ${escapeHTML(subject)} confidence by 10 points">+10</button>
          <button type="button" class="btn secondary small" data-remove-subject="${encodeURIComponent(subject)}">Remove</button>
        </div>
      </article>`).join("") || `<div class="empty"><strong>Add your first subject</strong><p>Use these confidence ratings to help decide what to practise next.</p></div>`;
  }

  function renderHistory() {
    const list = $("historyList");
    if (!list) return;
    const items = data.history.slice(-10).reverse();
    list.innerHTML = items.map(item => `<li>${escapeHTML(item)}</li>`).join("") || `<li class="muted">No activity yet. Complete a revision goal or record a paper to start your history.</li>`;
  }

  function renderGuidance() {
    const today = localISO();
    const goalDone = data.goalDays.includes(today);
    const activeToday = data.activeDays.includes(today);
    if ($("dailyGuidanceTitle")) $("dailyGuidanceTitle").textContent = goalDone ? "Today's goal is recorded." : activeToday ? "You've done some revision today." : "Choose one manageable task.";
    if ($("dailyGuidance")) $("dailyGuidance").textContent = goalDone
      ? "You have recorded today's goal. Keep the rest of the plan realistic; a small, focused session is enough to keep momentum."
      : activeToday
        ? "Your revision activity counts towards your streak. Mark today's goal when you've finished your planned task."
        : "Choose one paper, topic or short study session. Mark today's goal when you've actually completed the task.";
    if ($("completeGoal")) {
      $("completeGoal").disabled = goalDone;
      $("completeGoal").textContent = goalDone ? "✅ Today's goal recorded" : "✅ Record today's goal";
    }
  }

  function renderProgress() {
    if (!$("progressPage")) return;
    $("paperCount").textContent = data.papers;
    $("streak").textContent = currentStreak();
    $("targetMessage").textContent = data.target ? `Grade ${data.target}` : "—";
    if ($("targetGrade")) $("targetGrade").value = data.target || "";
    renderSubjects();
    renderHistory();
    renderGuidance();
    renderTimer();
  }

  function addPaper() {
    data.papers += 1;
    registerActivity("Past paper completed");
    renderProgress();
    if ($("goalMessage")) $("goalMessage").textContent = "Paper recorded. For detailed scores, topic diagnosis and next-action tracking, use the Premium evidence tracker.";
  }

  function completeGoal() {
    const today = localISO();
    if (data.goalDays.includes(today)) {
      if ($("goalMessage")) $("goalMessage").textContent = "You've already recorded today's goal. Your current streak is safe for today.";
      return;
    }
    data.goalDays = [...data.goalDays, today].sort();
    registerActivity("Daily revision goal completed");
    renderProgress();
    if ($("goalMessage")) $("goalMessage").textContent = `Today's goal recorded. Current streak: ${currentStreak()} day${currentStreak() === 1 ? "" : "s"}.`;
  }

  function addSubject() {
    const input = $("progressSubject");
    const subject = input.value.trim();
    if (!subject) { input.focus(); return; }
    const existing = Object.keys(data.subjects).find(s => s.toLowerCase() === subject.toLowerCase());
    if (existing) {
      if ($("goalMessage")) $("goalMessage").textContent = "That subject is already being tracked.";
      return;
    }
    data.subjects[subject.slice(0, 60)] = 0;
    input.value = "";
    save();
    renderProgress();
    input.focus();
  }

  function changeSubject(subject, delta) {
    if (!(subject in data.subjects)) return;
    data.subjects[subject] = Math.max(0, Math.min(100, data.subjects[subject] + delta));
    save();
    renderSubjects();
  }

  function removeSubject(subject) {
    if (!(subject in data.subjects)) return;
    if (!confirm(`Remove ${subject} from your subject confidence tracker?`)) return;
    delete data.subjects[subject];
    save();
    renderProgress();
  }

  function saveTargetGrade() {
    data.target = $("targetGrade").value;
    save();
    renderProgress();
    if ($("goalMessage")) $("goalMessage").textContent = data.target ? `Target saved: Grade ${data.target}.` : "Target cleared.";
  }

  function pauseTimer() {
    if (timerInterval !== null) clearInterval(timerInterval);
    timerInterval = null;
    renderTimer();
  }

  function setTimerFromInputs() {
    pauseTimer();
    const minutes = Math.max(0, Math.min(999, Number($("timerMinutes").value) || 0));
    const seconds = Math.max(0, Math.min(59, Number($("timerSeconds").value) || 0));
    remainingSeconds = minutes * 60 + seconds;
    data.timerMinutes = minutes;
    data.timerSeconds = seconds;
    save();
    renderTimer();
    if ($("timerStatus")) $("timerStatus").textContent = remainingSeconds ? "Timer ready. Start when you're ready to focus." : "Choose a duration greater than zero.";
  }

  function startTimer() {
    if (timerInterval !== null) return;
    if (remainingSeconds <= 0) {
      setTimerFromInputs();
      if (remainingSeconds <= 0) return;
    }
    if ($("timerStatus")) $("timerStatus").textContent = "Focus session running. The timer stays on this page.";
    timerInterval = setInterval(() => {
      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        remainingSeconds = 0;
        data.timerMinutes = 0;
        data.timerSeconds = 0;
        save();
        registerActivity("Focus timer completed");
        renderProgress();
        if ($("timerStatus")) $("timerStatus").textContent = "Focus session complete. Take a short break, then decide what to do next.";
        alert("Focus session complete. Well done for finishing the session.");
        return;
      }
      remainingSeconds -= 1;
      renderTimer();
    }, 1000);
  }

  function resetTimer() {
    pauseTimer();
    remainingSeconds = Math.max(0, (Number(data.timerMinutes) || 0) * 60 + (Number(data.timerSeconds) || 0));
    renderTimer();
    if ($("timerStatus")) $("timerStatus").textContent = "Timer reset to your saved duration.";
  }

  function applyPreset(minutes) {
    pauseTimer();
    data.timerMinutes = minutes;
    data.timerSeconds = 0;
    remainingSeconds = minutes * 60;
    save();
    renderTimer();
    if ($("timerStatus")) $("timerStatus").textContent = `${minutes}-minute focus session ready.`;
  }


  function exportProgressBackup() {
    const bundle = {
      product: "GCSE OnTrack",
      backupType: "progress-only",
      version: 1,
      exportedAt: new Date().toISOString(),
      progressData: data
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gcse-ontrack-progress-${localISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if ($("backupStatus")) $("backupStatus").textContent = "Progress backup downloaded. Store it somewhere safe. Your resource library has a separate export option.";
  }

  async function importProgressBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("That file is larger than expected for a progress backup.");
      const parsed = JSON.parse(await file.text());
      const incoming = parsed.progressData || (Array.isArray(parsed) ? parsed[0] : null);
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        throw new Error("This file does not contain a recognised progress backup.");
      }
      if (!confirm("Import this backup? It will replace the progress data currently saved in this browser. Export your current data first if you need to keep it.")) return;
      data = { ...defaults, ...incoming };
      if (!Array.isArray(data.history)) data.history = [];
      if (!Array.isArray(data.activeDays)) data.activeDays = [];
      if (!Array.isArray(data.goalDays)) data.goalDays = [];
      if (!data.subjects || typeof data.subjects !== "object" || Array.isArray(data.subjects)) data.subjects = {};
      normaliseDays();
      if (!save()) throw new Error("The browser could not save the imported data.");
      remainingSeconds = Math.max(0, (Number.isFinite(Number(data.timerMinutes)) ? Number(data.timerMinutes) : 25) * 60 + (Number(data.timerSeconds) || 0));
      renderProgress();
      if ($("backupStatus")) $("backupStatus").textContent = "Progress backup imported successfully.";
    } catch (error) {
      if ($("backupStatus")) $("backupStatus").textContent = error.message || "Could not import that progress backup.";
    } finally {
      event.target.value = "";
    }
  }

  function init() {
    if (!$("progressPage")) return;
    normaliseDays();
    data.streak = currentStreak();
    save();

    $("addPaper")?.addEventListener("click", addPaper);
    $("completeGoal")?.addEventListener("click", completeGoal);
    $("addSubject")?.addEventListener("click", addSubject);
    $("progressSubject")?.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); addSubject(); }
    });
    $("saveTarget")?.addEventListener("click", saveTargetGrade);
    $("exportProgressBackup")?.addEventListener("click", exportProgressBackup);
    $("importProgressBackupBtn")?.addEventListener("click", () => $("importProgressBackupFile")?.click());
    $("importProgressBackupFile")?.addEventListener("change", importProgressBackup);
    $("setTimer")?.addEventListener("click", setTimerFromInputs);
    $("startTimer")?.addEventListener("click", startTimer);
    $("pauseTimer")?.addEventListener("click", () => { pauseTimer(); if ($("timerStatus")) $("timerStatus").textContent = "Timer paused."; });
    $("resetTimer")?.addEventListener("click", resetTimer);
    document.querySelectorAll("[data-timer-preset]").forEach(button => button.addEventListener("click", () => applyPreset(Number(button.dataset.timerPreset))));
    $("subjectProgress")?.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.progressChange) changeSubject(decodeURIComponent(button.dataset.subject), Number(button.dataset.progressChange));
      if (button.dataset.removeSubject) removeSubject(decodeURIComponent(button.dataset.removeSubject));
    });
    if ($("targetGrade")) $("targetGrade").value = data.target || "";
    renderProgress();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("beforeunload", () => { if (timerInterval !== null) clearInterval(timerInterval); });
})();
