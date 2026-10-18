/* GCSE OnTrack — data-aware home dashboard. No API calls or paid services. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch { return fallback; }
  }

  function isoToday() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function asISO(value) {
    const s = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return "";
  }

  function streakFrom(days) {
    const set = new Set(days.filter(Boolean));
    const today = isoToday();
    const shift = (date, delta) => {
      const [y, m, d] = date.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + delta);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    };
    let cursor = set.has(today) ? today : shift(today, -1);
    if (!set.has(cursor)) return 0;
    let count = 0;
    while (set.has(cursor)) { count++; cursor = shift(cursor, -1); }
    return count;
  }

  function start() {
    const planValue = read("revisionPlan", null);
    const plan = Array.isArray(planValue) ? (planValue[0] || null) : planValue;
    const resourcesValue = read("resources", []);
    const resources = Array.isArray(resourcesValue) ? resourcesValue : [];
    const progressValue = read("progressData", []);
    const progress = Array.isArray(progressValue) ? (progressValue[0] || {}) : (progressValue || {});
    const papers = Math.max(0, Number(progress.papers) || 0);
    const activeDays = Array.isArray(progress.activeDays) ? progress.activeDays.map(asISO) : [];
    const legacyDays = Array.isArray(progress.history) ? progress.history.map(asISO) : [];
    const streak = streakFrom([...activeDays, ...legacyDays]);
    const activeResources = resources.filter(r => r && !r.deleted && !r.archived).length;

    $("dashboardPapers").textContent = papers;
    $("dashboardResources").textContent = activeResources;
    $("dashboardStreak").textContent = streak;

    let title = "Let's get your revision organised.";
    let intro = "Set up a realistic plan first. Then save the resources you actually use and record your practice.";
    let actionText = "Make my plan →";
    let href = "plan.html";
    let status = "Start simple";

    const examDate = plan && plan.examDate ? new Date(`${plan.examDate}T00:00:00`) : null;
    const daysUntil = examDate && !Number.isNaN(examDate.getTime())
      ? Math.ceil((examDate.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)
      : null;

    if (!plan || !plan.subjects || !plan.subjects.length) {
      title = "First, make a revision plan.";
      intro = "Choose your exam date, subjects and weekly study time. OnTrack will turn that into a starting structure.";
      actionText = "Create my plan →";
      href = "plan.html";
      status = "Step 1 of 3";
      $("dashboardPlanSummary").textContent = "Recommended order: plan → save resources → record progress.";
    } else if (!activeResources) {
      title = "Save the resources you already trust.";
      intro = "Add the past papers, lesson links and notes you actually use. They will be easier to find next time.";
      actionText = "Build my library →";
      href = "resources.html";
      status = "Keep going";
      $("dashboardPlanSummary").textContent = `${plan.subjects.length} subject${plan.subjects.length === 1 ? "" : "s"} in your plan${daysUntil !== null && daysUntil > 0 ? ` · ${daysUntil} days until your exam date` : ""}.`;
    } else if (!papers) {
      title = "Turn revision into practice.";
      intro = "Choose a paper or exam-question set, attempt it before checking answers, then record that you completed it.";
      actionText = "Open progress →";
      href = "progress.html";
      status = "Next useful step";
      $("dashboardPlanSummary").textContent = `${plan.subjects.length} planned subjects · ${activeResources} saved resources. Detailed score-based diagnosis is available in Premium.`;
    } else if (!activeDays.includes(isoToday()) && !legacyDays.includes(isoToday())) {
      title = "Keep the habit going today.";
      intro = "Choose one manageable task, focus on it, and mark today's goal when you've done the work.";
      actionText = "Record today's progress →";
      href = "progress.html";
      status = streak ? `${streak}-day streak` : "One step today";
      $("dashboardPlanSummary").textContent = `${papers} paper${papers === 1 ? "" : "s"} recorded · ${activeResources} resources saved.`;
    } else {
      title = "Good work. Choose your next useful action.";
      intro = "Use the resources you have saved, practise a weak topic, or review the work you have already completed.";
      actionText = "Find papers & lessons →";
      href = "past-papers.html";
      status = "Keep building";
      $("dashboardPlanSummary").textContent = `${papers} papers logged · ${activeResources} resources · ${streak}-day current streak.`;
    }

    $("dashboardTitle").textContent = title;
    $("dashboardIntro").textContent = intro;
    $("dashboardAction").textContent = actionText;
    $("dashboardAction").href = href;
    $("dashboardStatus").textContent = status;

    if (plan && $("dashboardPlanSummary").textContent === "Your next step will adapt to what you've saved.") {
      $("dashboardPlanSummary").textContent = `${plan.subjects.length} subject${plan.subjects.length === 1 ? "" : "s"} planned${daysUntil !== null && daysUntil > 0 ? ` · ${daysUntil} days until the exam date` : ""}.`;
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();
