/* GCSE ONTRACK — planning, organisation and progress command centre. */
(() => {
  "use strict";
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
  const dayIds = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const pad = n => String(n).padStart(2, "0");
  const duration = s => Math.max(0, Number(s.durationMinutes) || 0);
  function readState() {
    const model = read("gcoStudyPlanner_v1") || {};
    const progressRaw = read("progressData");
    return {
      model, sessions: Array.isArray(model.sessions) ? model.sessions : [],
      subjects: Array.isArray(model.subjects) ? model.subjects : [],
      progress: Array.isArray(progressRaw) ? (progressRaw[0] || {}) : (progressRaw || {}),
      resources: (Array.isArray(read("resources")) ? read("resources") : []).filter(x => x && !x.deleted && !x.archived)
    };
  }
  function streak(p) {
    const set = new Set([...(Array.isArray(p.activeDays) ? p.activeDays : []), ...(Array.isArray(p.history) ? p.history : [])].map(x => String(x).slice(0, 10)));
    const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    let cursor = set.has(iso(new Date())) ? new Date() : shift(new Date(), -1), total = 0;
    while (set.has(iso(cursor))) { total++; cursor = shift(cursor, -1); }
    return total;
  }
  function renderHome() {
    const host = document.getElementById("gcoHomeDashboard"); if (!host) return;
    const d = readState(), all = d.sessions.filter(s => s && s.kind !== "break");
    const planned = all.filter(s => s.status === "planned"), completed = all.filter(s => s.status === "completed"), missed = all.filter(s => s.status === "missed");
    const today = new Date().getDay(), now = new Date().getHours() * 60 + new Date().getMinutes();
    const upcoming = planned.map(s => ({ s, day: dayIds.indexOf(s.day) })).filter(x => x.day >= today).sort((a, b) => a.day - b.day || Number(a.s.startMinutes) - Number(b.s.startMinutes));
    const next = upcoming.find(x => x.day > today || Number(x.s.startMinutes) >= now) || upcoming[0] || null;
    const rate = all.length ? Math.round(completed.length / all.length * 100) : 0;
    const metrics = { gcoMetricPlanned: planned.length, gcoMetricCompleted: completed.length, gcoMetricResources: d.resources.length, gcoMetricStreak: streak(d.progress), gcoMetricRate: rate + "%", gcoMetricMinutes: completed.reduce((n, s) => n + duration(s), 0) + "m", gcoWeekResourceCount: d.resources.length, gcoWeekCompletedCount: completed.length };
    Object.entries(metrics).forEach(([id, value]) => { const e = document.getElementById(id); if (e) e.textContent = value; });
    const bar = document.getElementById("gcoWeekProgress"); if (bar) bar.style.width = rate + "%";
    const cap = document.getElementById("gcoWeekProgressText"); if (cap) cap.textContent = completed.length + " of " + all.length + " planned sessions completed";
    const title = document.getElementById("gcoNextTitle"), detail = document.getElementById("gcoNextDetail"), action = document.getElementById("gcoNextAction");
    if (title && detail && action) {
      if (next) {
        const s = next.s, t = Number(s.startMinutes), time = Number.isFinite(t) ? pad(Math.floor(t / 60)) + ":" + pad(t % 60) : "Time not set";
        title.textContent = (s.subject ? s.subject + " — " : "") + (s.topic || s.title || "Study session");
        detail.textContent = dayNames[next.day] + " · " + time + " · " + duration(s) + " minutes";
        action.href = "timetable.html"; action.textContent = "Open this week's timetable →";
      } else if (!all.length) {
        title.textContent = "Build a realistic week"; detail.textContent = "Choose your subjects, topics and available study windows. You can adjust every session later.";
        action.href = "plan.html"; action.textContent = "Set up my planner →";
      } else {
        title.textContent = "Your planned sessions are up to date"; detail.textContent = "Review your activity and decide what deserves attention next.";
        action.href = "progress.html"; action.textContent = "Review my progress →";
      }
    }
    const status = document.getElementById("gcoHomeStatus"); if (status) status.textContent = all.length ? "Your week at a glance" : "Start with a plan";
    const context = document.getElementById("gcoHomeContext");
    if (context) {
      if (!d.subjects.length) context.textContent = "Start with your subjects and exam boards. Your plan is stored in this browser; export backups before changing device.";
      else if (!d.resources.length) context.textContent = "Your plan is in place. Save the third-party resources you actually use, then attach them to the right topic sessions.";
      else if (missed.length) context.textContent = missed.length + " session(s) need rescheduling or a conscious decision to leave them. Keep the plan realistic.";
      else context.textContent = "Your plan, saved resources and completed sessions are connected. Use the timetable to act, then review progress.";
    }
  }
  function renderProgressOverview() {
    const marker = document.getElementById("quickActions"); if (!marker || document.getElementById("gcoScheduleProgress")) return;
    const d = readState(), all = d.sessions.filter(s => s && s.kind !== "break"), planned = all.filter(s => s.status === "planned"), completed = all.filter(s => s.status === "completed"), missed = all.filter(s => s.status === "missed");
    const rate = all.length ? Math.round(completed.length / all.length * 100) : 0, minutes = completed.reduce((n, s) => n + duration(s), 0);
    const panel = document.createElement("section"); panel.id = "gcoScheduleProgress"; panel.className = "gco-progress-overview";
    panel.innerHTML = '<div class="gco-section-head"><div><span class="gco-kicker">CONNECTED TO YOUR TIMETABLE</span><h2>Weekly plan progress</h2><p>These figures come from sessions you mark in your timetable, not predicted grades.</p></div><a href="timetable.html">Manage timetable →</a></div><div class="gco-progress-stats"><div><strong>' + completed.length + '</strong><span>Completed</span></div><div><strong>' + planned.length + '</strong><span>Still planned</span></div><div><strong>' + missed.length + '</strong><span>Missed</span></div><div><strong>' + minutes + '</strong><span>Minutes completed</span></div></div><div class="gco-progress-track"><span style="width:' + rate + '%"></span></div><p class="gco-progress-caption">' + rate + '% of recorded sessions completed</p>';
    marker.parentNode.insertBefore(panel, marker);
  }
  document.addEventListener("DOMContentLoaded", () => { renderHome(); renderProgressOverview(); });
})();
