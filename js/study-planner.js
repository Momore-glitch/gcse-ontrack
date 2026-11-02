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
      .map(name => ({ id: makeId("subject"), name, topics: [], targetGrade: "", weeklyMinutes: null, examBoard: "" }));

    const availability = {};
    DAYS.forEach(day => {
      const firstStart = day.id === "Sat" || day.id === "Sun" ? "10:00" : "16:00";
      availability[day.id] = {
        windows: [
          { minutes: 0, start: firstStart },
          { minutes: 0, start: day.id === "Sat" || day.id === "Sun" ? "14:00" : "19:00" }
        ]
      };
    });

    return {
      version: 2,
      mode: oldPlan.examDate ? "exam" : "weekly",
      examDate: cleanString(oldPlan.examDate, 10),
      subjects: oldSubjects,
      sessionLength: 25,
      breakMinutes: 5,
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
      examBoard: cleanString(item.examBoard, 40),
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
          : null,
        examBoard: ["AQA", "Pearson Edexcel", "OCR", "Eduqas", "WJEC", "CCEA", "Pearson BTEC"].includes(String(subject?.examBoard || ""))
          ? String(subject.examBoard)
          : ""
      })).filter(subject => subject.name);
      model.sessions = safeArray(model.sessions).map(normaliseSession).filter(Boolean);
      model.availability = model.availability && typeof model.availability === "object" ? model.availability : {};
      DAYS.forEach(day => {
        const savedDay = model.availability[day.id] || {};
        const firstStart = day.id === "Sat" || day.id === "Sun" ? "10:00" : "16:00";
        const secondStart = day.id === "Sat" || day.id === "Sun" ? "14:00" : "19:00";
        const legacyWindows = [
          { minutes: savedDay.minutes, start: savedDay.start || firstStart },
          { minutes: 0, start: secondStart }
        ];
        const windows = Array.isArray(savedDay.windows) ? savedDay.windows : legacyWindows;
        model.availability[day.id] = {
          windows: [0, 1].map(index => {
            const savedWindow = windows[index] || {};
            const start = /^\d{2}:\d{2}$/.test(String(savedWindow.start || "")) ? savedWindow.start : (index === 0 ? firstStart : secondStart);
            return { minutes: Math.max(0, Math.min(180, Number(savedWindow.minutes) || 0)), start };
          })
        };
      });
      model.mode = model.mode === "exam" ? "exam" : "weekly";
      const savedLength = Number(model.sessionLength);
      model.sessionLength = Number.isInteger(savedLength) && savedLength >= 15 && savedLength <= 90 && savedLength % 5 === 0 ? savedLength : 25;
      model.breakMinutes = [0, 5, 10, 15].includes(Number(model.breakMinutes)) ? Number(model.breakMinutes) : 5;
      return model;
    }
    return initialModel();
  }

  let model = loadModel();
  const subjectDrafts = new Map();

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
      const boardField = [...document.querySelectorAll("[data-subject-board]")]
        .find(field => field.dataset.subjectBoard === name);
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
        weeklyMinutes,
        examBoard: ["AQA", "Pearson Edexcel", "OCR", "Eduqas", "WJEC", "CCEA", "Pearson BTEC"].includes(String(boardField?.value || "")) ? boardField.value : ""
      });
    }
    const lowerNames = settings.map(subject => subject.name.toLowerCase());
    if (new Set(lowerNames).size !== lowerNames.length) throw new Error("Each subject can only be selected once. Remove duplicate subject names before generating your plan.");
    if (!settings.length) throw new Error("Select at least one subject to build your plan.");
    return settings;
  }

  function captureSubjectDrafts() {
    document.querySelectorAll("[data-subject-topics]").forEach(topicField => {
      const name = topicField.dataset.subjectTopics;
      const gradeField = [...document.querySelectorAll("[data-subject-grade]")]
        .find(field => field.dataset.subjectGrade === name);
      const boardField = [...document.querySelectorAll("[data-subject-board]")]
        .find(field => field.dataset.subjectBoard === name);
      const minutesField = [...document.querySelectorAll("[data-subject-minutes]")]
        .find(field => field.dataset.subjectMinutes === name);
      subjectDrafts.set(name, {
        topics: topicField.value,
        targetGrade: gradeField?.value || "",
        examBoard: boardField?.value || "",
        weeklyMinutes: minutesField?.value || ""
      });
    });
  }

  function renderSubjectSettings() {
    const host = $("subjectSettings");
    if (!host) return;
    captureSubjectDrafts();
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
      const draft = subjectDrafts.get(name);
      const values = draft || saved || {};
      const card = createElement("div", "subject-setting-card");
      const heading = createElement("strong", "", name);
      const topicLabel = createElement("label", "", "Topic focus (required)");
      const topicInput = createElement("textarea", "", "");
      topicInput.rows = 2;
      topicInput.maxLength = 700;
      topicInput.placeholder = "e.g. Algebra; Ratio; Graphs";
      topicInput.value = draft ? String(values.topics || "") : safeArray(values.topics).join("; ");
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
      gradeSelect.value = values.targetGrade || "";
      gradeLabel.appendChild(gradeSelect);
      const boardLabel = createElement("label", "", "Exam board / awarding organisation (optional)");
      const boardSelect = createElement("select");
      boardSelect.dataset.subjectBoard = name;
      [["", "Not set / not sure"], ["AQA", "AQA"], ["Pearson Edexcel", "Pearson Edexcel"], ["OCR", "OCR"], ["Eduqas", "Eduqas"], ["WJEC", "WJEC"], ["CCEA", "CCEA"], ["Pearson BTEC", "Pearson BTEC"]].forEach(([value, label]) => {
        const option = createElement("option", "", label);
        option.value = value;
        boardSelect.appendChild(option);
      });
      boardSelect.value = values.examBoard || "";
      boardLabel.appendChild(boardSelect);
      const timeLabel = createElement("label", "", "Weekly study-time target (minutes, optional)");
      const timeInput = createElement("input");
      timeInput.type = "number";
      timeInput.min = "15";
      timeInput.max = "1800";
      timeInput.step = "5";
      timeInput.inputMode = "numeric";
      timeInput.placeholder = "Leave blank to share remaining available time";
      timeInput.value = values.weeklyMinutes ? String(values.weeklyMinutes) : "";
      timeInput.dataset.subjectMinutes = name;
      timeLabel.appendChild(timeInput);
      const timeHint = createElement("p", "field-hint", "This is a weekly target, not just a weighting. The planner will not deliberately give this subject more time than you enter. Subjects left blank share the remaining available study time.");
      card.append(heading, topicLabel, gradeLabel, boardLabel, timeLabel, timeHint);
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
    if (!Number.isInteger(sessionLength) || sessionLength < 15 || sessionLength > 90 || sessionLength % 5 !== 0) {
      return setNotice(message, "Choose a session length from 15 to 90 minutes in five-minute steps.", true);
    }
    const breakMinutes = Number($("breakLength").value);
    if (![0, 5, 10, 15].includes(breakMinutes)) return setNotice(message, "Choose a valid break length.", true);

    const availability = {};
    let totalWindowMinutes = 0;
    let invalidWindowMessage = "";
    DAYS.forEach(day => {
      const windows = [1, 2].map(index => {
        const rawMinutes = String(document.querySelector(`[data-day-window-minutes="${day.id}-${index}"]`)?.value ?? "0").trim();
        const parsedMinutes = Number(rawMinutes);
        const minutes = Number.isFinite(parsedMinutes) ? parsedMinutes : NaN;
        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180 || minutes % 5 !== 0) {
          invalidWindowMessage = `${day.label}, window ${index}, must be 0–180 minutes in five-minute steps.`;
        }
        const defaultStart = index === 1 ? (day.id === "Sat" || day.id === "Sun" ? "10:00" : "16:00") : (day.id === "Sat" || day.id === "Sun" ? "14:00" : "19:00");
        const start = document.querySelector(`[data-day-window-start="${day.id}-${index}"]`)?.value || defaultStart;
        const startValue = timeToMinutes(start);
        if (minutes > 0 && (startValue === null || startValue + minutes > 1440)) {
          invalidWindowMessage = `${day.label}, window ${index}, runs past midnight. Choose an earlier start or shorter duration.`;
        }
        totalWindowMinutes += minutes;
        return { minutes, start };
      });
      const active = windows.filter(window => window.minutes > 0).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      if (active.reduce((sum, window) => sum + window.minutes, 0) > 180) {
        invalidWindowMessage = `${day.label} exceeds the 180-minute daily planning limit. Reduce the windows to keep the week manageable.`;
      }
      for (let index = 1; index < active.length; index += 1) {
        if (timeToMinutes(active[index].start) < timeToMinutes(active[index - 1].start) + active[index - 1].minutes) {
          invalidWindowMessage = `${day.label}'s availability windows overlap. Adjust the start time or duration.`;
        }
      }
      availability[day.id] = { windows };
    });
    if (invalidWindowMessage) return setNotice(message, invalidWindowMessage, true);
    if (!totalWindowMinutes) return setNotice(message, "Choose at least one availability window and enter some available study time.", true);

    const explicitTargets = subjects.filter(subject => Number(subject.weeklyMinutes) > 0);
    const explicitTargetTotal = explicitTargets.reduce((sum, subject) => sum + Number(subject.weeklyMinutes), 0);
    const subjectsWithoutTarget = subjects.filter(subject => !Number(subject.weeklyMinutes));
    if (explicitTargetTotal > totalWindowMinutes) {
      return setNotice(message, "Your subject time targets exceed the total weekly availability. Reduce the targets or add another availability window.", true);
    }
    if (subjectsWithoutTarget.length && explicitTargets.length && explicitTargetTotal >= totalWindowMinutes) {
      return setNotice(message, "There is no remaining time for subjects without a target. Reduce the set targets or enter a target for every subject.", true);
    }
    const sharedMinutes = subjectsWithoutTarget.length
      ? Math.floor(((totalWindowMinutes - explicitTargetTotal) / subjectsWithoutTarget.length) / 5) * 5
      : 0;
    if (subjectsWithoutTarget.length && sharedMinutes < 15) {
      return setNotice(message, "There is less than 15 minutes available per untargeted subject. Set a weekly target for each subject or increase the available time.", true);
    }
    const subjectTargets = subjects.map(subject => Number(subject.weeklyMinutes) || sharedMinutes);
    const assignedMinutes = subjects.map(() => 0);
    let breakTimeScheduled = 0;
    const nextSessions = model.sessions.filter(session => session.source !== "generated");
    let conflictMessage = "";
    let subjectIndex = 0;
    const topicPositions = new Map(subjects.map(subject => [subject.name, 0]));
    let generatedCount = 0;

    DAYS.forEach(day => {
      const dayWindows = availability[day.id].windows.slice().filter(window => window.minutes > 0).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      dayWindows.forEach(window => {
        if (conflictMessage || !window.minutes) return;
        let remaining = window.minutes;
        let cursor = timeToMinutes(window.start);
        let breakDue = false;

        while (remaining >= 15) {
          const eligible = subjects
            .map((subject, index) => ({ subject, index, left: subjectTargets[index] - assignedMinutes[index] }))
            .filter(item => item.left >= 15);
          if (!eligible.length) break;

          if (breakDue && breakMinutes > 0) {
            if (remaining < breakMinutes + 15) break;
            const breakOverlap = nextSessions.find(session =>
              session.day === day.id &&
              cursor < session.startMinutes + session.durationMinutes &&
              cursor + breakMinutes > session.startMinutes
            );
            if (breakOverlap) {
              conflictMessage = `${day.label} has an existing timetable block at ${minutesToTime(breakOverlap.startMinutes)}. Adjust that block or the availability window.`;
              return;
            }
            nextSessions.push({
              id: makeId("break"), day: day.id, startMinutes: cursor,
              durationMinutes: breakMinutes, kind: "break", subject: "",
              topic: "Short rest", title: "Short break", status: "planned",
              source: "generated", steps: [], createdAt: new Date().toISOString(), completedAt: ""
            });
            cursor += breakMinutes;
            remaining -= breakMinutes;
            breakTimeScheduled += breakMinutes;
            breakDue = false;
          }

          let chosen = eligible[0];
          let bestRatio = Infinity;
          for (let offset = 0; offset < subjects.length; offset += 1) {
            const candidateIndex = (subjectIndex + offset) % subjects.length;
            const left = subjectTargets[candidateIndex] - assignedMinutes[candidateIndex];
            if (left < 15) continue;
            const ratio = assignedMinutes[candidateIndex] / Math.max(1, subjectTargets[candidateIndex]);
            if (ratio < bestRatio) {
              bestRatio = ratio;
              chosen = { subject: subjects[candidateIndex], index: candidateIndex, left };
            }
          }

          let duration = Math.min(sessionLength, remaining, chosen.left);
          // Avoid leaving a tiny 5–10 minute fragment of a subject target.
          // A target only 5 minutes longer can stay as one session (25 min for
          // a 20-minute preference). Otherwise split into two workable blocks
          // when both can be at least 15 minutes (e.g. 30 = 15 + 15).
          if (chosen.left > sessionLength && chosen.left - sessionLength < 15) {
            const firstOfTwo = chosen.left - 15;
            if (chosen.left <= 90 && chosen.left - sessionLength <= 5) {
              duration = chosen.left;
            } else if (firstOfTwo >= 15) {
              duration = firstOfTwo;
            } else if (chosen.left <= 90) {
              duration = chosen.left;
            } else {
              duration = sessionLength;
            }
          }
          duration = Math.floor(duration / 5) * 5;
          if (duration < 15) break;

          const overlap = nextSessions.find(session =>
            session.day === day.id &&
            cursor < session.startMinutes + session.durationMinutes &&
            cursor + duration > session.startMinutes
          );
          if (overlap) {
            conflictMessage = `${day.label} has an existing ${overlap.kind === "break" ? "break" : "timetable block"} at ${minutesToTime(overlap.startMinutes)}. Change that block or adjust the availability window.`;
            return;
          }

          const subject = chosen.subject;
          const topicIndex = topicPositions.get(subject.name) || 0;
          const topic = subject.topics[topicIndex % subject.topics.length];
          topicPositions.set(subject.name, topicIndex + 1);
          assignedMinutes[chosen.index] += duration;
          subjectIndex = chosen.index + 1;

          nextSessions.push({
            id: makeId("session"), day: day.id, startMinutes: cursor,
            durationMinutes: duration, kind: "study", subject: subject.name,
            examBoard: subject.examBoard || "", topic, title: `${subject.name} — ${topic}`,
            status: "planned", source: "generated", steps: sessionSteps(duration),
            createdAt: new Date().toISOString(), completedAt: ""
          });
          generatedCount += 1;
          cursor += duration;
          remaining -= duration;
          breakDue = true;
        }
      });
    });

    if (conflictMessage) return setNotice(message, conflictMessage, true);
    if (!generatedCount) return setNotice(message, "There is not enough available time to create a 15-minute session. Increase one or more days.", true);

    model = {
      ...model,
      mode,
      examDate,
      subjects,
      sessionLength,
      breakMinutes,
      availability,
      sessions: nextSessions,
      planCreatedAt: new Date().toISOString()
    };

    if (!saveModel()) return;
    restorePlanForm();
    renderAll();
    const allocatedTotal = assignedMinutes.reduce((sum, value) => sum + value, 0);
    const totalSubjectTargets = subjectTargets.reduce((sum, value) => sum + value, 0);
    const unscheduledTargetMinutes = Math.max(0, totalSubjectTargets - allocatedTotal);
    const unusedWindowMinutes = Math.max(0, totalWindowMinutes - allocatedTotal - breakTimeScheduled);
    const detail = unscheduledTargetMinutes
      ? `${unscheduledTargetMinutes} minutes of subject targets could not fit around your breaks and existing commitments. You can add another window or adjust the targets.`
      : `${unusedWindowMinutes} minutes of availability remain free.`;
    setNotice(message, `${generatedCount} study sessions created (${allocatedTotal} study minutes). Subject time targets are weekly limits, not just weightings. ${detail} Your existing manual and imported blocks were kept.`);
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
      const value = model.availability[day.id] || { windows: [] };
      [1, 2].forEach(index => {
        const slot = safeArray(value.windows)[index - 1] || {};
        const minutesInput = document.querySelector(`[data-day-window-minutes="${day.id}-${index}"]`);
        const startInput = document.querySelector(`[data-day-window-start="${day.id}-${index}"]`);
        if (minutesInput) minutesInput.value = String(slot.minutes || 0);
        if (startInput) startInput.value = slot.start || (index === 1 ? (day.id === "Sat" || day.id === "Sun" ? "10:00" : "16:00") : (day.id === "Sat" || day.id === "Sun" ? "14:00" : "19:00"));
      });
    });
    if ($("breakLength")) $("breakLength").value = String(model.breakMinutes);
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
    host.appendChild(createElement("p", "resource-preview-hint", "Open a session in your timetable to see topic-matched learning, practice and official assessment resources. You can save useful links straight to your Resource Library."));
  }


  function examBoardResource(board, subject) {
    const links = {
      "AQA": { label: "AQA past papers, mark schemes and examiner reports", url: "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder", note: "Use papers that match your current specification; availability varies when specifications change." },
      "Pearson Edexcel": { label: "Pearson Edexcel past papers and mark schemes", url: "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html", note: "Some recent papers are restricted to teachers and exams officers; use the materials available to students." },
      "OCR": { label: "OCR past paper finder", url: "https://www.ocr.org.uk/qualifications/past-paper-finder/", note: "Use the official filters to select the correct qualification, subject and exam series." },
      "Eduqas": { label: "Eduqas past papers and mark schemes", url: "https://www.eduqas.co.uk/home/past-papers-and-mark-schemes/", note: "Select your subject and qualification to reach its past-paper area." },
      "WJEC": { label: "WJEC searchable question bank", url: "https://questionbank.resources.wjec.co.uk/", note: "Browse the subject area and check that the questions match your qualification." },
      "CCEA": { label: "CCEA GCSE past papers", url: "https://apps.ccea.org.uk/pastpapers/", note: "Choose the correct GCSE subject and specification period." }
    };
    if (board === "Pearson BTEC") {
      if (/\b(it|digital information technology)\b/i.test(subject)) {
        return {
          label: "Pearson BTEC Digital Information Technology (2022 Tech Award)",
          url: "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022.html",
          note: "This page is for the 2022 Digital Information Technology Tech Award. Check with your teacher that this is your exact qualification and specification."
        };
      }
      return {
        label: "Pearson student resources and qualification materials",
        url: "https://www.pearson.com/en-gb/schools/secondary/parents-learners/student-resources.html",
        note: "BTEC resources differ by qualification and component. Check the exact title and version with your teacher."
      };
    }
    return links[board] || null;
  }

  function resourcesForSession(session) {
    const subject = cleanString(session.subject, 60);
    const topic = cleanString(session.topic, 120);
    const board = cleanString(session.examBoard || model.subjects.find(item => item.name === subject)?.examBoard, 40);
    const lower = subject.toLowerCase();
    const isMaths = lower.includes("math");
    const isScience = /biology|chemistry|physics|science/.test(lower);
    const isComputing = /computer science|computing/.test(lower);
    const isIT = /\b(it|digital information technology)\b/i.test(subject);
    const items = [];

    if (isMaths) {
      items.push({
        title: "Learn the method — Maths Genie",
        label: `Open the topic list and choose ${topic}; lessons include worked examples and practice`,
        url: "https://www.mathsgenie.co.uk/gcse/maths",
        role: "Learn and practise"
      });
    } else if (isIT) {
      items.push({
        title: board === "Pearson BTEC" ? "BTEC Digital IT — 2022 Tech Award page" : "Pearson student and qualification resources",
        label: board === "Pearson BTEC"
          ? "This link covers the 2022 BTEC Tech Award in Digital Information Technology. Use it only if the qualification title and version match your course; otherwise follow your teacher's component brief."
          : "Check your exact BTEC qualification, component and version before using any learning or assessment material.",
        url: board === "Pearson BTEC"
          ? "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022.html"
          : "https://www.pearson.com/en-gb/schools/secondary/parents-learners/student-resources.html",
        role: "Qualification-specific learning"
      });
    } else if (isScience || /business|history|geography|english/.test(lower)) {
      items.push({
        title: "Build understanding — Cognito",
        label: `Choose ${subject}, check the exam board where available, then locate ${topic}`,
        url: "https://go.cognitoedu.org/gcse",
        role: "Learn and check understanding"
      });
    }

    if (isMaths || isScience || isComputing) {
      items.push({
        title: "Targeted questions — Physics & Maths Tutor",
        label: `Use the topic-question sections and mark schemes for ${topic}`,
        url: "https://www.physicsandmathstutor.com/",
        role: "Exam-style practice"
      });
    } else if (!isIT) {
      items.push({
        title: "Interactive course — Seneca",
        label: `Find a GCSE ${subject} course and complete the sections related to ${topic}`,
        url: "https://senecalearning.com/en-gb/",
        role: "Retrieval practice"
      });
    }

    const official = examBoardResource(board, subject);
    if (official) {
      if (!items.some(item => item.url === official.url)) {
        items.push({ title: official.label, label: official.note || `Filter for ${subject} and check that the material matches your current specification. Some recent papers may be restricted to teachers.`, url: official.url, role: "Official assessment materials" });
      }
    }

    return { subject, topic, board, items: items.slice(0, 3) };
  }

  function saveRecommendedResource(item, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }
    const resources = window.getCollection("resources");
    const existing = resources.find(resource => resource && resource.url === item.url && !resource.deleted);
    if (existing) {
      if (session.subject && existing.subject !== session.subject && !safeArray(existing.relatedSubjects).includes(session.subject)) {
        existing.relatedSubjects = [...safeArray(existing.relatedSubjects), session.subject].slice(0, 20);
      }
      const tags = String(existing.tag || "").split(";").map(value => value.trim()).filter(Boolean);
      if (session.topic && !tags.some(value => value.toLowerCase() === session.topic.toLowerCase())) tags.push(session.topic);
      existing.tag = tags.join("; ").slice(0, 100);
      const addition = `Also suggested for ${session.subject}: ${session.topic}.`;
      if (!String(existing.note || "").includes(addition)) existing.note = `${String(existing.note || "").trim()} ${addition}`.trim().slice(0, 1200);
      try {
        window.setCollection("resources", resources);
        button.textContent = "✓ Topic added to saved resource";
        button.disabled = true;
      } catch (error) {
        console.error("Could not update saved recommendation", error);
        button.textContent = "Could not update — try Resource Library";
      }
      return;
    }
    const entry = {
      id: typeof window.uid === "function" ? window.uid("res") : `res_${Date.now()}`,
      shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
      title: `${session.subject}: ${session.topic} — ${item.role}`.slice(0, 140),
      url: item.url,
      subject: session.subject || "General",
      tag: session.topic || "GCSE revision",
      note: `Suggested for a GCSE ONTRACK study session. Resource type: ${item.role}. Exam board: ${session.examBoard || "not set"}. Check that the page matches your exact qualification and specification.`,
      priority: "Medium", rating: 3, favourite: false, pinned: false,
      archived: false, deleted: false, deletedDate: null, clicks: 0,
      created: Date.now(), lastEdited: null, lastOpened: null
    };
    try {
      window.setCollection("resources", [entry, ...resources]);
      button.textContent = "✓ Saved to library";
      button.disabled = true;
    } catch (error) {
      console.error("Could not save recommended resource", error);
      button.textContent = "Could not save — try Resource Library";
    }
  }

  function appendResourceRecommendations(host, session) {
    if (!host || session.kind === "break") return;
    const data = resourcesForSession(session);
    const panel = createElement("details", "session-resources");
    const heading = createElement("summary", "", "📚 Recommended resources for this topic");
    panel.appendChild(heading);
    panel.appendChild(createElement("p", "field-hint", `Focus: ${data.topic}. Use the same exam board and qualification as your course${data.board ? ` (${data.board})` : ""}.`));
    if (!data.board) panel.appendChild(createElement("p", "resource-board-note", "No exam board selected yet. Choose your board in the Study Planner to reveal the correct official assessment link."));
    const list = createElement("div", "session-resource-list");
    data.items.forEach(item => {
      const card = createElement("div", "session-resource-item");
      const role = createElement("span", "resource-role", item.role);
      const link = createElement("a", "session-resource-link", item.title);
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const description = createElement("p", "muted", item.label);
      const save = makeButton("＋ Save to Resource Library", "btn secondary small", () => saveRecommendedResource(item, session, save));
      card.append(role, link, description, save);
      list.appendChild(card);
    });
    if (!data.items.length) list.appendChild(createElement("p", "muted", "Add an exam board and subject details in the Study Planner to see more specific recommendations."));
    panel.appendChild(list);
    panel.appendChild(createElement("p", "resource-disclaimer", "GCSE ONTRACK links to external providers; free access and topic coverage can vary. Check the topic and specification before revising. Use a short explanation first, then test yourself with questions and mark schemes."));
    host.appendChild(panel);
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
      appendResourceRecommendations(card, session);
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
