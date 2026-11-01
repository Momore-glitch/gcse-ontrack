/* GCSE ONTRACK — connected Study Planner and Weekly Timetable.
 * One browser-local data model powers both pages. Legacy plans and timetable
 * entries are imported without deleting or overwriting their original keys.
 */
(() => {
  "use strict";

  const STORE_KEY = "gcoStudyPlanner_v1";
  const DAYS = [
    { id: "Mon", label: "Monday" },
    { id: "Tue", label: "Tuesday" },
    { id: "Wed", label: "Wednesday" },
    { id: "Thu", label: "Thursday" },
    { id: "Fri", label: "Friday" },
    { id: "Sat", label: "Saturday" },
    { id: "Sun", label: "Sunday" }
  ];
  const $ = id => document.getElementById(id);
  const safeArray = value => Array.isArray(value) ? value : [];

  function parseJSON(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  }

  function readLegacyCollection(key) {
    try {
      if (typeof window.getCollection === "function") {
        const value = window.getCollection(key);
        if (Array.isArray(value)) return value;
      }
    } catch (error) {
      console.warn("Could not read an older GCSE ONTRACK plan.", error);
    }
    const parsed = parseJSON(localStorage.getItem(key), []);
    return Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
  }

  function localDateISO(date = new Date()) {
    const value = new Date(date.getTime());
    value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
    return value.toISOString().slice(0, 10);
  }

  function makeId(prefix = "session") {
    const random = window.crypto?.randomUUID
      ? window.crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}_${random}`;
  }

  function cleanString(value, max = 140) {
    return String(value ?? "").trim().slice(0, max);
  }

  function validDay(value) {
    return DAYS.some(day => day.id === value);
  }

  function timeToMinutes(value) {
    const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function minutesToTime(value) {
    const total = Math.max(0, Math.min(1440, Number(value) || 0));
    if (total === 1440) return "00:00";
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function legacySessions() {
    const stored = parseJSON(localStorage.getItem("ontrack_timetable_final"), {});
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return [];
    const imported = [];
    Object.entries(stored).forEach(([key, tasks]) => {
      const match = key.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)_(\d{2}:\d{2})$/);
      if (!match || !Array.isArray(tasks)) return;
      const startMinutes = timeToMinutes(match[2]);
      if (startMinutes === null) return;
      tasks.forEach(task => {
        const title = cleanString(task, 160);
        if (!title) return;
        const parts = title.split(/\s+[—–-]\s+/, 2);
        const hasSubject = parts.length === 2;
        imported.push({
          id: makeId("legacy"),
          day: match[1],
          startMinutes,
          durationMinutes: 60,
          kind: "study",
          subject: hasSubject ? cleanString(parts[0], 60) : "Imported timetable task",
          topic: hasSubject ? cleanString(parts[1], 120) : title,
          title,
          status: "planned",
          source: "legacy",
          legacyDurationEstimated: true,
          steps: [],
          createdAt: new Date().toISOString()
        });
      });
    });
    return imported;
  }

  function initialModel() {
    const oldPlan = readLegacyCollection("revisionPlan")[0] || {};
    const oldSubjects = safeArray(oldPlan.subjects)
      .map(name => cleanString(name, 60))
      .filter(Boolean)
      .map(name => ({ id: makeId("subject"), name, topics: [], targetGrade: "", weeklyMinutes: null }));

    const availability = {};
    DAYS.forEach(day => {
      availability[day.id] = {
        minutes: 0,
        start: day.id === "Sat" || day.id === "Sun" ? "10:00" : "16:00"
      };
    });

    return {
      version: 1,
      mode: oldPlan.examDate ? "exam" : "weekly",
      examDate: cleanString(oldPlan.examDate, 10),
      subjects: oldSubjects,
      sessionLength: 25,
      availability,
      sessions: legacySessions(),
      legacyPlan: oldPlan && Object.keys(oldPlan).length ? oldPlan : null,
      updatedAt: new Date().toISOString()
    };
  }

  function normaliseSession(item) {
    if (!item || typeof item !== "object") return null;
    const day = validDay(item.day) ? item.day : "Mon";
    const startMinutes = Math.max(0, Math.min(1439, Number(item.startMinutes) || 0));
    const durationMinutes = Math.max(5, Math.min(240, Number(item.durationMinutes) || 25));
    const kind = ["study", "catchup", "break"].includes(item.kind) ? item.kind : "study";
    const status = ["planned", "completed", "missed"].includes(item.status) ? item.status : "planned";
    return {
      id: /^[A-Za-z0-9_-]{1,100}$/.test(String(item.id || "")) ? String(item.id) : makeId(),
      day,
      startMinutes,
      durationMinutes,
      kind,
      subject: cleanString(item.subject, 60),
      topic: cleanString(item.topic, 120),
      title: cleanString(item.title, 160),
      status,
      source: ["generated", "manual", "legacy"].includes(item.source) ? item.source : "manual",
      legacyDurationEstimated: Boolean(item.legacyDurationEstimated),
      steps: safeArray(item.steps).slice(0, 8).map(step => cleanString(step, 180)),
      createdAt: cleanString(item.createdAt, 40) || new Date().toISOString(),
      completedAt: cleanString(item.completedAt, 40)
    };
  }

  function loadModel() {
    const saved = parseJSON(localStorage.getItem(STORE_KEY), null);
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      const model = { ...initialModel(), ...saved };
      model.subjects = safeArray(model.subjects).map(subject => ({
        id: cleanString(subject?.id, 100) || makeId("subject"),
        name: cleanString(subject?.name, 60),
        topics: safeArray(subject?.topics).map(topic => cleanString(topic, 120)).filter(Boolean),
        targetGrade: /^[1-9]$/.test(String(subject?.targetGrade || "")) ? String(subject.targetGrade) : "",
        weeklyMinutes: Number.isFinite(Number(subject?.weeklyMinutes)) && Number(subject.weeklyMinutes) >= 15
          ? Math.min(1800, Number(subject.weeklyMinutes))
          : null
      })).filter(subject => subject.name);
      model.sessions = safeArray(model.sessions).map(normaliseSession).filter(Boolean);
      model.availability = model.availability && typeof model.availability === "object" ? model.availability : {};
      DAYS.forEach(day => {
        const savedDay = model.availability[day.id] || {};
        model.availability[day.id] = {
          minutes: Math.max(0, Math.min(180, Number(savedDay.minutes) || 0)),
          start: /^\d{2}:\d{2}$/.test(String(savedDay.start || "")) ? savedDay.start : (day.id === "Sat" || day.id === "Sun" ? "10:00" : "16:00")
        };
      });
      model.mode = model.mode === "exam" ? "exam" : "weekly";
      model.sessionLength = [25, 40, 50].includes(Number(model.sessionLength)) ? Number(model.sessionLength) : 25;
      return model;
    }
    return initialModel();
  }

  let model = loadModel();

  function saveModel() {
    model.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(model));
      return true;
    } catch (error) {
      console.error("Could not save the GCSE ONTRACK study plan.", error);
      alert("Your browser could not save this change. Check available storage and try again. Your older plan and timetable data have not been deleted.");
      return false;
    }
  }

  function dayLabel(id) {
    return DAYS.find(day => day.id === id)?.label || id;
  }

  function sessionSteps(duration) {
    if (duration <= 18) return [
      "5 min — Recall what you already know",
      `${duration - 8} min — Practise one focused question or task`,
      "3 min — Check, correct and note one improvement"
    ];
    if (duration <= 24) return [
      "5 min — Closed-book recall",
      `${duration - 8} min — Focused practice`,
      "3 min — Mark and correct"
    ];
    if (duration === 25) return [
      "5 min — Closed-book recall",
      "10 min — Review the key ideas",
      "7 min — Answer an exam-style question",
      "3 min — Mark and correct"
    ];
    if (duration <= 35) return [
      "5 min — Closed-book recall",
      `${duration - 13} min — Review and practise the topic`,
      "5 min — Exam-style check",
      "3 min — Mark and correct"
    ];
    if (duration <= 45) return [
      "5 min — Quick retrieval practice",
      "15 min — Learn or review the topic",
      "15 min — Exam-style questions",
      `${duration - 35} min — Mark, correct and record one improvement`
    ];
    return [
      "10 min — Closed-book recall",
      `${duration - 30} min — Focused topic learning or review`,
      "15 min — Exam-style questions or applied practice",
      "5 min — Mark, correct and identify what to revisit"
    ];
  }

  function selectedSubjectsFromForm() {
    const selected = [...document.querySelectorAll("#subjectChoices input[type=checkbox]:checked")]
      .map(input => input.value);
    const settings = [];
    for (const name of selected) {
      const topicField = [...document.querySelectorAll("[data-subject-topics]")]
        .find(field => field.dataset.subjectTopics === name);
      const gradeField = [...document.querySelectorAll("[data-subject-grade]")]
        .find(field => field.dataset.subjectGrade === name);
      const minutesField = [...document.querySelectorAll("[data-subject-minutes]")]
        .find(field => field.dataset.subjectMinutes === name);
      const topics = cleanString(topicField?.value, 700)
        .split(/[;\n]+/)
        .map(topic => cleanString(topic, 120))
        .filter(Boolean);
      if (!topics.length) {
        topicField?.focus();
        throw new Error(`Add at least one topic for ${name}. Separate multiple topics with semicolons.`);
      }
      const rawMinutes = String(minutesField?.value || "").trim();
      const weeklyMinutes = rawMinutes === "" ? null : Number(rawMinutes);
      if (rawMinutes !== "" && (!Number.isInteger(weeklyMinutes) || weeklyMinutes < 15 || weeklyMinutes > 1800 || weeklyMinutes % 5 !== 0)) {
        minutesField?.focus();
        throw new Error(`Enter a weekly time allocation for ${name} in five-minute steps, from 15 to 1,800 minutes, or leave it blank.`);
      }
      settings.push({
        id: makeId("subject"),
        name,
        topics,
        targetGrade: /^[1-9]$/.test(String(gradeField?.value || "")) ? gradeField.value : "",
        weeklyMinutes
      });
    }
    if (!settings.length) throw new Error("Select at least one subject to build your plan.");
    return settings;
  }

  function renderSubjectSettings() {
    const host = $("subjectSettings");
    if (!host) return;
    const checked = [...document.querySelectorAll("#subjectChoices input[type=checkbox]:checked")];
    host.replaceChildren();

    if (!checked.length) {
      host.appendChild(createElement("p", "muted", "Select at least one subject to add its topic focus."));
      return;
    }

    const savedByName = new Map(model.subjects.map(subject => [subject.name, subject]));
    checked.forEach(input => {
      const name = input.value;
      const saved = savedByName.get(name);
      const card = createElement("div", "subject-setting-card");
      const heading = createElement("strong", "", name);
      const topicLabel = createElement("label", "", "Topic focus (required)");
      const topicInput = createElement("textarea", "", "");
      topicInput.rows = 2;
      topicInput.maxLength = 700;
      topicInput.placeholder = "e.g. Algebra; Ratio; Graphs";
      topicInput.value = safeArray(saved?.topics).join("; ");
      topicInput.dataset.subjectTopics = name;
      topicLabel.appendChild(topicInput);
      const gradeLabel = createElement("label", "", "Target grade (optional)");
      const gradeSelect = createElement("select", "", "");
      gradeSelect.dataset.subjectGrade = name;
      const options = [["", "No target set"], ...Array.from({ length: 9 }, (_, index) => [String(index + 1), `Grade ${index + 1}`]).reverse()];
      options.forEach(([value, label]) => {
        const option = createElement("option", "", label);
        option.value = value;
        gradeSelect.appendChild(option);
      });
      gradeSelect.value = saved?.targetGrade || "";
      gradeLabel.appendChild(gradeSelect);
      const timeLabel = createElement("label", "", "Weekly time allocation (minutes, optional)");
      const timeInput = createElement("input");
      timeInput.type = "number";
      timeInput.min = "15";
      timeInput.max = "1800";
      timeInput.step = "5";
      timeInput.inputMode = "numeric";
      timeInput.placeholder = "Leave blank to share remaining time";
      timeInput.value = saved?.weeklyMinutes ? String(saved.weeklyMinutes) : "";
      timeInput.dataset.subjectMinutes = name;
      timeLabel.appendChild(timeInput);
      const timeHint = createElement("p", "field-hint", "This guides the relative share of the week's study sessions. Subjects left blank share the remaining time evenly; daily availability still sets the limit.");
      card.append(heading, topicLabel, gradeLabel, timeLabel, timeHint);
      host.appendChild(card);
    });
  }

  function createElement(tag, className = "", text = undefined) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function setNotice(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-error", isError);
  }

  function generatePlan(event) {
    event.preventDefault();
    const message = $("planFormMessage");
    setNotice(message, "");

    let subjects;
    try { subjects = selectedSubjectsFromForm(); }
    catch (error) { setNotice(message, error.message, true); return; }

    const mode = document.querySelector('input[name="planMode"]:checked')?.value === "exam" ? "exam" : "weekly";
    const examDate = mode === "exam" ? $("examDate").value : "";
    if (mode === "exam") {
      if (!examDate) return setNotice(message, "Choose the exam date before generating an exam-preparation plan.", true);
      if (examDate < localDateISO()) return setNotice(message, "Choose today or a future date. Past exam dates cannot be used.", true);
    }

    const sessionLength = Number($("sessionLength").value);
    if (![25, 40, 50].includes(sessionLength)) return setNotice(message, "Choose a valid study-session length.", true);

    const availability = {};
    let totalWindowMinutes = 0;
    let invalidWindowDay = "";
    DAYS.forEach(day => {
      const minutes = Math.max(0, Math.min(180, Number(document.querySelector(`[data-day-minutes="${day.id}"]`)?.value) || 0));
      const start = document.querySelector(`[data-day-start="${day.id}"]`)?.value || "16:00";
      const startValue = timeToMinutes(start);
      if (minutes > 0 && (startValue === null || startValue + minutes > 1440)) {
        invalidWindowDay = day.label;
      }
      availability[day.id] = { minutes, start };
      totalWindowMinutes += minutes;
    });
    if (invalidWindowDay) return setNotice(message, `${invalidWindowDay}'s available time cannot run past midnight. Choose an earlier start time or a shorter window.`, true);
    if (!totalWindowMinutes) return setNotice(message, "Choose at least one day and enter some available study time.", true);

    const explicitTargets = subjects.filter(subject => Number(subject.weeklyMinutes) > 0);
    const explicitTargetTotal = explicitTargets.reduce((sum, subject) => sum + Number(subject.weeklyMinutes), 0);
    const subjectsWithoutTarget = subjects.filter(subject => !Number(subject.weeklyMinutes));
    if (explicitTargetTotal > totalWindowMinutes) {
      return setNotice(message, "Your subject time allocations exceed the total weekly time available. Reduce the allocations or increase your available time.", true);
    }
    if (subjectsWithoutTarget.length && explicitTargets.length && explicitTargetTotal >= totalWindowMinutes) {
      return setNotice(message, "There is no time left to share with subjects whose allocation is blank. Reduce the set allocations or enter a target for every selected subject.", true);
    }
    const sharedMinutes = subjectsWithoutTarget.length
      ? (totalWindowMinutes - explicitTargetTotal) / subjectsWithoutTarget.length
      : 0;
    const subjectWeights = subjects.map(subject => Number(subject.weeklyMinutes) || sharedMinutes || 1);
    const useWeightedAllocation = explicitTargets.length > 0;
    const assignedMinutes = subjects.map(() => 0);

    const nextSessions = model.sessions.filter(session => session.source !== "generated");
    let conflictMessage = "";
    let subjectIndex = 0;
    const topicPositions = new Map(subjects.map(subject => [subject.name, 0]));
    let generatedCount = 0;

    DAYS.forEach(day => {
      const dayPlan = availability[day.id];
      if (!dayPlan.minutes) return;
      let remaining = dayPlan.minutes;
      let cursor = timeToMinutes(dayPlan.start);
      if (cursor === null) return;

      while (remaining >= 15) {
        const duration = Math.min(sessionLength, remaining);
        const occupied = nextSessions.filter(session => session.day === day.id);
        const overlap = occupied.find(session =>
          cursor < session.startMinutes + session.durationMinutes &&
          cursor + duration > session.startMinutes
        );
        if (overlap) {
          conflictMessage = `${day.label} has an existing ${overlap.kind === "break" ? "break" : "timetable block"} at ${minutesToTime(overlap.startMinutes)}. Change that block or adjust the day's available start time, then generate again.`;
          return;
        }
        let chosenIndex = subjectIndex % subjects.length;
        if (useWeightedAllocation) {
          let bestRatio = Infinity;
          for (let offset = 0; offset < subjects.length; offset += 1) {
            const candidate = (subjectIndex + offset) % subjects.length;
            const ratio = assignedMinutes[candidate] / subjectWeights[candidate];
            if (ratio < bestRatio) {
              bestRatio = ratio;
              chosenIndex = candidate;
            }
          }
        }
        const subject = subjects[chosenIndex];
        const topicIndex = topicPositions.get(subject.name) || 0;
        const topic = subject.topics[topicIndex % subject.topics.length];
        topicPositions.set(subject.name, topicIndex + 1);
        assignedMinutes[chosenIndex] += duration;
        subjectIndex = chosenIndex + 1;

        nextSessions.push({
          id: makeId("session"),
          day: day.id,
          startMinutes: cursor,
          durationMinutes: duration,
          kind: "study",
          subject: subject.name,
          topic,
          title: `${subject.name} — ${topic}`,
          status: "planned",
          source: "generated",
          steps: sessionSteps(duration),
          createdAt: new Date().toISOString(),
          completedAt: ""
        });
        generatedCount += 1;
        cursor += duration;
        remaining -= duration;

        if (remaining > 5) {
          const breakOverlap = nextSessions.find(session =>
            session.day === day.id &&
            cursor < session.startMinutes + session.durationMinutes &&
            cursor + 5 > session.startMinutes
          );
          if (breakOverlap) {
            conflictMessage = `${day.label} has an existing timetable block at ${minutesToTime(breakOverlap.startMinutes)}. Change that block or adjust the day's available start time, then generate again.`;
            return;
          }
          nextSessions.push({
            id: makeId("break"),
            day: day.id,
            startMinutes: cursor,
            durationMinutes: 5,
            kind: "break",
            subject: "",
            topic: "Short rest",
            title: "Short break",
            status: "planned",
            source: "generated",
            steps: [],
            createdAt: new Date().toISOString(),
            completedAt: ""
          });
          cursor += 5;
          remaining -= 5;
        }
      }
    });

    if (conflictMessage) return setNotice(message, conflictMessage, true);
    if (!generatedCount) return setNotice(message, "There is not enough available time to create a 15-minute session. Increase one or more days.", true);

    model = {
      ...model,
      mode,
      examDate,
      subjects,
      sessionLength,
      availability,
      sessions: nextSessions,
      planCreatedAt: new Date().toISOString()
    };

    if (!saveModel()) return;
    restorePlanForm();
    renderAll();
    setNotice(message, `${generatedCount} study sessions created. Your timetable has been updated, and your existing manual or imported blocks were kept.`);
  }

  function restorePlanForm() {
    if (!$('studyPlanForm')) return;
    const modeInput = document.querySelector(`input[name="planMode"][value="${model.mode}"]`);
    if (modeInput) modeInput.checked = true;
    $("examDate").value = model.examDate || "";
    $("sessionLength").value = String(model.sessionLength || 25);

    const choices = $("subjectChoices");
    const existing = new Set([...choices.querySelectorAll("input[type=checkbox]")].map(input => input.value));
    model.subjects.forEach(subject => {
      if (!existing.has(subject.name)) addSubjectOption(subject.name);
    });
    choices.querySelectorAll("input[type=checkbox]").forEach(input => {
      input.checked = model.subjects.some(subject => subject.name === input.value);
    });
    DAYS.forEach(day => {
      const value = model.availability[day.id] || { minutes: 0, start: "16:00" };
      const minutesSelect = document.querySelector(`[data-day-minutes="${day.id}"]`);
      const startInput = document.querySelector(`[data-day-start="${day.id}"]`);
      if (minutesSelect) minutesSelect.value = String(value.minutes || 0);
      if (startInput) startInput.value = value.start || "16:00";
    });
    $("examDateWrap").hidden = model.mode !== "exam";
    renderSubjectSettings();
  }

  function addSubjectOption(name) {
    const clean = cleanString(name, 60);
    if (!clean) return;
    const exists = [...$("subjectChoices").querySelectorAll("input[type=checkbox]")]
      .some(input => input.value.toLowerCase() === clean.toLowerCase());
    if (exists) return;
    const label = createElement("label", "subject-choice");
    const checkbox = createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = clean;
    const span = createElement("span", "", clean);
    label.append(checkbox, span);
    $("subjectChoices").appendChild(label);
    checkbox.addEventListener("change", renderSubjectSettings);
    checkbox.checked = true;
    renderSubjectSettings();
  }

  function planStats() {
    const study = model.sessions.filter(session => session.kind !== "break");
    const planned = study.filter(session => session.status === "planned");
    const completed = study.filter(session => session.status === "completed");
    return {
      study,
      planned,
      completed,
      minutes: study.reduce((total, session) => total + session.durationMinutes, 0),
      plannedMinutes: planned.reduce((total, session) => total + session.durationMinutes, 0),
      subjects: new Set(study.map(session => session.subject).filter(Boolean)).size
    };
  }

  function renderSummary() {
    const stats = planStats();
    const examDate = model.examDate ? new Date(`${model.examDate}T00:00:00`) : null;
    const daysRemaining = examDate && !Number.isNaN(examDate.getTime())
      ? Math.ceil((examDate.getTime() - new Date(`${localDateISO()}T00:00:00`).getTime()) / 86400000)
      : null;
    if ($("savedPlanTitle")) {
      $("savedPlanTitle").textContent = model.sessions.length
        ? `${stats.study.length} study or catch-up blocks saved`
        : "No weekly schedule generated yet";
      $("savedPlanDescription").textContent = model.mode === "exam" && daysRemaining !== null
        ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} until your exam. Your plan remains editable and can be adjusted as your results change.`
        : "Weekly learning plan. Change your availability or subjects whenever your circumstances change.";
    }
    if ($("summarySessions")) $("summarySessions").textContent = stats.study.length;
    if ($("summaryMinutes")) $("summaryMinutes").textContent = stats.minutes;
    if ($("summarySubjects")) $("summarySubjects").textContent = stats.subjects;
    if ($("replaceGeneratedPlan")) {
      $("replaceGeneratedPlan").disabled = !model.sessions.some(session => session.source === "generated");
    }
  }

  function renderPlanPreview() {
    const host = $("generatedPlanPreview");
    if (!host) return;
    host.replaceChildren();
    const study = model.sessions.filter(session => session.kind !== "break");
    if (!study.length) {
      const empty = createElement("div", "empty");
      empty.append(createElement("strong", "", "Your weekly plan will appear here"));
      empty.append(createElement("p", "", "Choose subjects, topics and available time, then generate your schedule."));
      host.appendChild(empty);
      return;
    }
    const grouped = DAYS.map(day => ({ day, sessions: model.sessions.filter(session => session.day === day.id).sort((a, b) => a.startMinutes - b.startMinutes) }))
      .filter(group => group.sessions.length);
    grouped.forEach(group => {
      const dayCard = createElement("article", "preview-day-card");
      const heading = createElement("h3", "", group.day.label);
      const count = group.sessions.filter(session => session.kind !== "break").length;
      const summary = createElement("span", "badge", `${count} session${count === 1 ? "" : "s"}`);
      const top = createElement("div", "preview-day-top");
      top.append(heading, summary);
      dayCard.appendChild(top);
      group.sessions.forEach(session => {
        const line = createElement("p", "preview-session-line");
        const time = createElement("strong", "", minutesToTime(session.startMinutes));
        const detail = session.kind === "break" ? "Short break" : `${session.subject} — ${session.topic}`;
        line.append(time, document.createTextNode(` · ${detail} · ${session.durationMinutes} min`));
        dayCard.appendChild(line);
      });
      host.appendChild(dayCard);
    });
  }

  function makeButton(label, className, handler) {
    const button = createElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function hasConflict(day, start, duration, exceptId = "") {
    const end = start + duration;
    return model.sessions.some(session => {
      if (session.id === exceptId || session.day !== day) return false;
      const otherEnd = session.startMinutes + session.durationMinutes;
      return start < otherEnd && end > session.startMinutes;
    });
  }

  function markSession(id, status) {
    const session = model.sessions.find(item => item.id === id);
    if (!session) return;
    session.status = status;
    session.completedAt = status === "completed" ? new Date().toISOString() : "";
    if (saveModel()) renderTimetable();
  }

  function createMoveForm(session) {
    const form = createElement("form", "move-session-form");

    const dayLabelNode = createElement("label", "", "Day");
    const daySelect = createElement("select");
    DAYS.forEach(day => {
      const option = createElement("option", "", day.label);
      option.value = day.id;
      daySelect.appendChild(option);
    });
    daySelect.value = session.day;
    dayLabelNode.appendChild(daySelect);

    const timeLabel = createElement("label", "", "Start time");
    const timeInput = createElement("input");
    timeInput.type = "time";
    timeInput.required = true;
    timeInput.value = minutesToTime(session.startMinutes);
    timeLabel.appendChild(timeInput);

    const durationLabel = createElement("label", "", "Duration (minutes)");
    const durationSelect = createElement("select");
    [15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120].forEach(value => {
      const option = createElement("option", "", `${value} minutes`);
      option.value = String(value);
      durationSelect.appendChild(option);
    });
    durationSelect.value = String(session.durationMinutes);
    durationLabel.appendChild(durationSelect);

    const subjectLabel = createElement("label", "", "Subject");
    const subjectSelect = createElement("select");
    const blankSubject = createElement("option", "", session.kind === "break" ? "No subject" : "Choose subject");
    blankSubject.value = "";
    subjectSelect.appendChild(blankSubject);
    model.subjects.forEach(subject => {
      const option = createElement("option", "", subject.name);
      option.value = subject.name;
      subjectSelect.appendChild(option);
    });
    subjectSelect.value = session.subject || "";
    subjectSelect.disabled = session.kind === "break";
    subjectLabel.appendChild(subjectSelect);

    const topicLabel = createElement("label", "", session.kind === "break" ? "Break label" : "Topic / activity");
    const topicInput = createElement("input");
    topicInput.type = "text";
    topicInput.maxLength = 120;
    topicInput.value = session.topic || "";
    topicLabel.appendChild(topicInput);

    const actions = createElement("div", "actions move-session-actions");
    const save = createElement("button", "btn small", "Save changes");
    save.type = "submit";
    const cancel = createElement("button", "btn secondary small", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => form.remove());
    actions.append(save, cancel);
    form.append(dayLabelNode, timeLabel, durationLabel, subjectLabel, topicLabel, actions);

    form.addEventListener("submit", event => {
      event.preventDefault();
      const start = timeToMinutes(timeInput.value);
      const duration = Number(durationSelect.value);
      const subject = session.kind === "break" ? "" : cleanString(subjectSelect.value, 60);
      const topic = cleanString(topicInput.value, 120);
      if (start === null || !Number.isFinite(duration) || start + duration > 1440) {
        alert("Check the start time and duration. A block cannot run past midnight.");
        return;
      }
      if (session.kind !== "break" && (!subject || !topic)) {
        alert("Choose a subject and enter a topic or activity.");
        return;
      }
      if (hasConflict(daySelect.value, start, duration, session.id)) {
        alert("That time overlaps another block. Choose a different time.");
        return;
      }
      session.day = daySelect.value;
      session.startMinutes = start;
      session.durationMinutes = duration;
      session.subject = subject;
      session.topic = topic;
      session.title = session.kind === "break" ? (topic || "Break / rest") : `${subject} — ${topic}`;
      session.steps = session.kind === "break" ? [] : sessionSteps(duration);
      // An edited or rescheduled completed/missed item returns to the planned list.
      session.status = "planned";
      session.completedAt = "";
      if (saveModel()) renderTimetable();
    });
    return form;
  }

  function createSessionCard(session) {
    const card = createElement("article", `timetable-session-card kind-${session.kind} status-${session.status}`);
    const top = createElement("div", "session-card-top");
    const time = createElement("strong", "session-time", `${minutesToTime(session.startMinutes)}–${minutesToTime(session.startMinutes + session.durationMinutes)}`);
    const badges = createElement("div", "session-badges");
    const typeLabel = session.kind === "catchup" ? "Catch-up" : session.kind === "break" ? "Break" : "Study";
    badges.appendChild(createElement("span", "badge", typeLabel));
    badges.appendChild(createElement("span", `badge status-badge ${session.status}`, session.status === "completed" ? "Completed" : session.status === "missed" ? "Missed" : "Planned"));
    top.append(time, badges);
    card.appendChild(top);

    if (session.kind === "break") {
      card.appendChild(createElement("h3", "", session.title || "Short break"));
      card.appendChild(createElement("p", "muted", `${session.durationMinutes} minutes to rest before the next task.`));
    } else {
      card.appendChild(createElement("h3", "", session.subject ? `${session.subject} — ${session.topic || "Topic not set"}` : (session.topic || session.title || "Study session")));
      card.appendChild(createElement("p", "muted session-duration", `${session.durationMinutes} minutes${session.source === "generated" ? " · Generated from your weekly plan" : session.source === "legacy" ? " · Imported from your old timetable" : " · Added manually"}`));
      if (session.legacyDurationEstimated) {
        card.appendChild(createElement("p", "legacy-estimate-note", "The previous timetable did not store durations. This imported block has a 60-minute estimate; edit or move it to correct the time."));
      }
      if (session.steps.length) {
        const details = createElement("details", "session-steps");
        details.appendChild(createElement("summary", "", "Session structure"));
        const list = createElement("ol");
        session.steps.forEach(step => list.appendChild(createElement("li", "", step)));
        details.appendChild(list);
        card.appendChild(details);
      }
    }

    const actions = createElement("div", "actions session-actions");
    if (session.kind !== "break") {
      if (session.status !== "completed") {
        actions.appendChild(makeButton("✓ Mark complete", "btn success small", () => markSession(session.id, "completed")));
      } else {
        actions.appendChild(makeButton("Undo completion", "btn secondary small", () => markSession(session.id, "planned")));
      }
      if (session.status === "planned") {
        actions.appendChild(makeButton("Mark missed", "btn secondary small", () => markSession(session.id, "missed")));
      }
    }
    actions.appendChild(makeButton(session.status === "missed" ? "Reschedule / edit" : "Edit / move", "btn secondary small", () => {
      const old = card.querySelector(".move-session-form");
      if (old) old.remove(); else card.appendChild(createMoveForm(session));
    }));
    actions.appendChild(makeButton("Delete", "btn danger small", () => {
      if (!confirm("Remove this timetable block?")) return;
      model.sessions = model.sessions.filter(item => item.id !== session.id);
      if (saveModel()) renderTimetable();
    }));
    card.appendChild(actions);
    return card;
  }

  function renderTimetable() {
    const host = $("weeklySchedule");
    if (!host) return;
    const stats = planStats();
    if ($("ttSummarySessions")) $("ttSummarySessions").textContent = stats.planned.length;
    if ($("ttSummaryCompleted")) $("ttSummaryCompleted").textContent = stats.completed.length;
    if ($("ttSummaryMinutes")) $("ttSummaryMinutes").textContent = stats.minutes;
    if ($("timetableTitle")) $("timetableTitle").textContent = stats.study.length ? `${stats.study.length} study and catch-up blocks` : "Your timetable is ready to build";
    if ($("timetableDescription")) $("timetableDescription").textContent = model.mode === "exam" && model.examDate
      ? `Exam preparation plan · exam date ${new Date(`${model.examDate}T00:00:00`).toLocaleDateString("en-GB")}. Edit sessions as your workload changes.`
      : "Weekly learning plan. Add study sessions, rest blocks and catch-up time as needed.";

    const notice = $("timetableNotice");
    const hasLegacy = model.sessions.some(session => session.legacyDurationEstimated);
    if (notice) {
      notice.hidden = !hasLegacy;
      notice.textContent = hasLegacy
        ? "Some entries were imported from your old timetable. Their original duration was not saved, so each is temporarily shown as 60 minutes. Use Move or edit the duration by deleting and re-adding the block if needed. The original timetable data remains untouched."
        : "";
    }

    host.replaceChildren();
    if (!model.sessions.length) {
      const empty = createElement("div", "empty");
      empty.append(createElement("strong", "", "No sessions yet"));
      empty.append(createElement("p", "", "Build your first schedule in the Study Planner."));
      const link = createElement("a", "btn", "Build my plan →");
      link.href = "plan.html";
      empty.appendChild(link);
      host.appendChild(empty);
      populateManualSubjects();
      return;
    }

    DAYS.forEach(day => {
      const sessions = model.sessions.filter(session => session.day === day.id)
        .sort((a, b) => a.startMinutes - b.startMinutes);
      const section = createElement("section", "timetable-day");
      const heading = createElement("div", "timetable-day-heading");
      const title = createElement("h3", "", day.label);
      const count = createElement("span", "badge", `${sessions.filter(session => session.kind !== "break").length} block${sessions.filter(session => session.kind !== "break").length === 1 ? "" : "s"}`);
      heading.append(title, count);
      section.appendChild(heading);
      if (!sessions.length) {
        section.appendChild(createElement("p", "muted day-empty", "Rest day / no sessions planned."));
      } else {
        const list = createElement("div", "timetable-session-list");
        sessions.forEach(session => list.appendChild(createSessionCard(session)));
        section.appendChild(list);
      }
      host.appendChild(section);
    });
    populateManualSubjects();
  }

  function populateManualSubjects() {
    const select = $("manualSubject");
    if (!select) return;
    const current = select.value;
    select.replaceChildren();
    const blank = createElement("option", "", "Choose subject (optional for breaks)");
    blank.value = "";
    select.appendChild(blank);
    model.subjects.forEach(subject => {
      const option = createElement("option", "", subject.name);
      option.value = subject.name;
      select.appendChild(option);
    });
    if (model.subjects.some(subject => subject.name === current)) select.value = current;
  }

  function addManualSession(event) {
    event.preventDefault();
    const kind = $("manualKind").value;
    const subject = cleanString($("manualSubject").value, 60);
    const topic = cleanString($("manualTopic").value, 120);
    const day = $("manualDay").value;
    const start = timeToMinutes($("manualTime").value);
    const duration = Number($("manualDuration").value);
    const message = $("manualSessionMessage");
    setNotice(message, "");

    if (!validDay(day) || start === null || ![15, 20, 25, 30, 40, 45, 50, 60, 75, 90].includes(duration) || start + duration > 1440) {
      return setNotice(message, "Check the day, start time and duration. A block cannot run past midnight.", true);
    }
    if (kind !== "break" && (!subject || !topic)) {
      return setNotice(message, "Choose a subject and enter a topic or activity.", true);
    }
    if (hasConflict(day, start, duration)) {
      return setNotice(message, "That time overlaps another block. Choose a different time.", true);
    }

    const session = {
      id: makeId("manual"), day, startMinutes: start, durationMinutes: duration,
      kind, subject: kind === "break" ? "" : subject,
      topic: kind === "break" ? (topic || "Short break") : topic,
      title: kind === "break" ? (topic || "Break / rest") : `${subject} — ${topic}`,
      status: "planned", source: "manual", steps: kind === "break" ? [] : sessionSteps(duration),
      createdAt: new Date().toISOString(), completedAt: ""
    };
    model.sessions.push(session);
    if (!saveModel()) return;
    $("manualTopic").value = "";
    renderTimetable();
    setNotice(message, "Block added to your connected timetable.");
  }

  function toggleExamDate() {
    const mode = document.querySelector('input[name="planMode"]:checked')?.value;
    $("examDateWrap").hidden = mode !== "exam";
  }

  function bindPlanPage() {
    if (!$('studyPlanForm')) return;
    restorePlanForm();
    $("studyPlanForm").addEventListener("submit", generatePlan);
    document.querySelectorAll('input[name="planMode"]').forEach(input => input.addEventListener("change", toggleExamDate));
    $("subjectChoices").addEventListener("change", renderSubjectSettings);
    $("addCustomSubject").addEventListener("click", () => {
      const input = $("customSubject");
      const name = cleanString(input.value, 60);
      if (!name) return input.focus();
      addSubjectOption(name);
      input.value = "";
    });
    $("customSubject").addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        $("addCustomSubject").click();
      }
    });
    $("replaceGeneratedPlan").addEventListener("click", () => {
      if (!confirm("Remove all sessions generated by the planner? Manual and imported timetable blocks will remain.")) return;
      model.sessions = model.sessions.filter(session => session.source !== "generated");
      if (saveModel()) renderAll();
    });
    renderAll();
  }

  function bindTimetablePage() {
    if (!$('weeklySchedule')) return;
    $("manualSessionForm").addEventListener("submit", addManualSession);
    $("manualKind").addEventListener("change", () => {
      const isBreak = $("manualKind").value === "break";
      $("manualSubject").disabled = isBreak;
      $("manualTopic").placeholder = isBreak ? "Optional break label" : "e.g. Algebraic fractions";
    });
    $("clearGeneratedSessions").addEventListener("click", () => {
      if (!model.sessions.some(session => session.source === "generated")) return;
      if (!confirm("Remove sessions created by the Study Planner? Manual and imported blocks will remain.")) return;
      model.sessions = model.sessions.filter(session => session.source !== "generated");
      if (saveModel()) renderTimetable();
    });
    $("clearAllWeeklySessions").addEventListener("click", () => {
      if (!model.sessions.length) return;
      if (!confirm("Clear all sessions from this connected weekly timetable? Your original older plan and timetable backup keys will remain untouched.")) return;
      model.sessions = [];
      if (saveModel()) renderTimetable();
    });
    renderTimetable();
  }

  function renderAll() {
    renderSummary();
    renderPlanPreview();
    renderTimetable();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Persist the first migrated model only after successful JSON conversion.
    if (localStorage.getItem(STORE_KEY) === null) saveModel();
    bindPlanPage();
    bindTimetablePage();
  }, { once: true });
})();
