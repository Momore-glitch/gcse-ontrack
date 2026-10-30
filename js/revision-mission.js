/* GCSE OnTrack — Free Revision Mission Builder.
   All mission content is stored locally in this browser. No account is required.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "gcoRevisionMission_v1";
  const $ = id => document.getElementById(id);

  const form = $("missionForm");
  const workspace = $("missionWorkspace");
  const stepsList = $("missionSteps");

  if (!form || !workspace || !stepsList) return;

  let intervalId = null;
  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        mission: saved.mission && typeof saved.mission === "object"
          ? saved.mission
          : null,
        history: Array.isArray(saved.history) ? saved.history.slice(0, 20) : []
      };
    } catch {
      return { mission: null, history: [] };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      setStatus("Your browser couldn't save this mission. Free up browser storage and try again.", true);
      return false;
    }
  }

  function setStatus(message, isError = false) {
    const output = $("missionStatus");
    if (!output) return;
    output.textContent = message;
    output.style.color = isError ? "#a32f2a" : "#785914";
  }

  function safeText(value) {
    return String(value ?? "");
  }

  function durationMinutes(weights, total) {
    const exact = weights.map(weight => total * weight);
    const minutes = exact.map(value => Math.floor(value));
    let left = total - minutes.reduce((sum, value) => sum + value, 0);

    const order = exact
      .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
      .sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < left; i++) {
      minutes[order[i % order.length].index] += 1;
    }

    return minutes;
  }

  function stepTemplates(method) {
    if (method === "exam") {
      return [
        {
          title: "Attempt exam-style questions",
          detail: "Work without notes. Pay attention to command words, working and the number of marks available.",
          weight: .55
        },
        {
          title: "Mark your answers",
          detail: "Use the mark scheme or trusted answers. Identify exactly where you gained or lost marks.",
          weight: .20
        },
        {
          title: "Correct the gaps",
          detail: "Rewrite incomplete answers and add the detail the mark scheme expected.",
          weight: .15
        },
        {
          title: "Record one improvement",
          detail: "Write one exam technique or knowledge point to use next time.",
          weight: .10
        }
      ];
    }

    if (method === "mistake") {
      return [
        {
          title: "Try the question again",
          detail: "Cover the correction and attempt the question independently first.",
          weight: .35
        },
        {
          title: "Find the exact gap",
          detail: "Compare your attempt with the correct method. Identify what you misunderstood, forgot or missed.",
          weight: .25
        },
        {
          title: "Explain the correction",
          detail: "Write or say the correct method in your own words, without copying it.",
          weight: .25
        },
        {
          title: "Test it once more",
          detail: "Try a similar question or make one short retrieval question to revisit later.",
          weight: .15
        }
      ];
    }

    return [
      {
        title: "Recall without notes",
        detail: "Write everything you remember about the topic. Do not check your notes yet.",
        weight: .25
      },
      {
        title: "Test what you remember",
        detail: "Answer short questions or make your own questions from memory. Focus on details, not just headings.",
        weight: .35
      },
      {
        title: "Check and correct",
        detail: "Use your notes, textbook or a trusted lesson to check gaps and correct inaccurate points.",
        weight: .25
      },
      {
        title: "Lock in the learning",
        detail: "Write three key takeaways and one question you should revisit.",
        weight: .15
      }
    ];
  }

  function createMission(subject, topic, method, duration) {
    const templates = stepTemplates(method);
    const allocated = durationMinutes(templates.map(step => step.weight), duration);

    return {
      subject,
      topic,
      method,
      duration,
      createdAt: Date.now(),
      remainingSeconds: duration * 60,
      timerRunning: false,
      status: "active",
      reflection: "",
      steps: templates.map((step, index) => ({
        id: `step_${index + 1}`,
        title: step.title,
        detail: step.detail,
        minutes: allocated[index],
        done: false
      }))
    };
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  function completedCount(mission) {
    return mission.steps.filter(step => step.done).length;
  }

  function renderSteps() {
    const mission = state.mission;
    if (!mission) return;

    stepsList.replaceChildren();

    mission.steps.forEach((step, index) => {
      const item = document.createElement("li");
      item.className = `mission-step${step.done ? " done" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!step.done;
      checkbox.id = `missionStep${index}`;
      checkbox.dataset.stepIndex = String(index);
      checkbox.setAttribute("aria-label", `Complete: ${step.title}`);

      const content = document.createElement("div");

      const title = document.createElement("h3");
      title.textContent = step.title;

      const detail = document.createElement("p");
      detail.textContent = step.detail;

      const time = document.createElement("span");
      time.className = "mission-step-time";
      time.textContent = `${step.minutes} minute${step.minutes === 1 ? "" : "s"}`;

      content.append(title, detail, time);
      item.append(checkbox, content);
      stepsList.append(item);
    });

    const done = completedCount(mission);
    const total = mission.steps.length;
    const percent = Math.round((done / total) * 100);

    $("missionProgressText").textContent = `${done} of ${total} complete`;
    $("missionProgressFill").style.width = `${percent}%`;
    $("missionProgressBar").setAttribute("aria-valuenow", String(percent));
  }

  function renderHistory() {
    const container = $("missionHistory");
    if (!container) return;

    container.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "mission-empty";
      empty.textContent = "Your completed sessions will appear here.";
      container.append(empty);
      return;
    }

    state.history.slice(0, 8).forEach(item => {
      const row = document.createElement("div");
      row.className = "mission-history-item";

      const detail = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${item.subject}: ${item.topic}`;

      const meta = document.createElement("div");
      meta.className = "muted";
      const date = new Date(item.completedAt);
      meta.textContent =
        `${date.toLocaleDateString("en-GB")} · ${item.duration} min · ${item.completedSteps}/${item.totalSteps} steps`;

      detail.append(title, meta);

      const result = document.createElement("strong");
      result.textContent = `${item.percent}%`;

      row.append(detail, result);
      container.append(row);
    });
  }

  function renderMission() {
    const mission = state.mission;

    if (!mission) {
      workspace.hidden = true;
      renderHistory();
      return;
    }

    workspace.hidden = false;
    $("missionWorkspaceTitle").textContent = `${mission.subject}: ${mission.topic}`;
    $("missionSubtitle").textContent =
      `${mission.duration} minutes · ${methodName(mission.method)} · Built ${new Date(mission.createdAt).toLocaleDateString("en-GB")}`;

    $("missionClock").textContent = formatTime(mission.remainingSeconds);
    $("missionStart").disabled = !!mission.timerRunning || mission.status === "completed";
    $("missionPause").disabled = !mission.timerRunning;
    $("missionReset").disabled = mission.status === "completed";
    $("finishMission").disabled = mission.status === "completed";
    $("missionReflection").value = mission.reflection || "";

    if (mission.status === "completed") {
      $("missionTimerStatus").textContent = "Session saved. Start a new mission whenever you're ready.";
      setStatus("Mission completed and saved on this device.");
    } else if (mission.remainingSeconds === 0) {
      $("missionTimerStatus").textContent = "Time is up. Finish your final check and record the outcome.";
    } else if (mission.timerRunning) {
      $("missionTimerStatus").textContent = "Timer running. Keep your attention on this topic.";
    } else {
      $("missionTimerStatus").textContent = "Ready when you are.";
    }

    renderSteps();
    renderHistory();
  }

  function methodName(method) {
    return ({
      recall: "Active recall",
      exam: "Exam practice",
      mistake: "Fix a mistake"
    })[method] || "Active recall";
  }

  function stopTimer() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function startTimer() {
    const mission = state.mission;
    if (!mission || mission.status === "completed" || mission.remainingSeconds <= 0) return;

    stopTimer();
    mission.timerRunning = true;
    saveState();
    renderMission();

    intervalId = window.setInterval(() => {
      if (!state.mission || !state.mission.timerRunning) {
        stopTimer();
        return;
      }

      const current = state.mission;
      current.remainingSeconds = Math.max(0, current.remainingSeconds - 1);

      if (current.remainingSeconds <= 0) {
        current.timerRunning = false;
        stopTimer();
      }

      saveState();
      $("missionClock").textContent = formatTime(current.remainingSeconds);
      $("missionStart").disabled = current.timerRunning || current.remainingSeconds === 0;
      $("missionPause").disabled = !current.timerRunning;

      if (current.remainingSeconds === 0) {
        $("missionTimerStatus").textContent = "Time is up. Finish your final check and record the outcome.";
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!state.mission) return;
    state.mission.timerRunning = false;
    stopTimer();
    saveState();
    renderMission();
    $("missionTimerStatus").textContent = "Timer paused. Resume when you're ready.";
  }

  function resetTimer() {
    if (!state.mission || state.mission.status === "completed") return;
    pauseTimer();
    state.mission.remainingSeconds = state.mission.duration * 60;
    saveState();
    renderMission();
    $("missionTimerStatus").textContent = "Timer reset.";
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const subject = $("missionSubject").value.trim();
    const topic = $("missionTopic").value.trim();
    const method = $("missionMethod").value;
    const duration = Number($("missionDuration").value);

    if (!subject || !topic || ![15, 25, 40].includes(duration)) {
      setStatus("Choose a subject, enter one topic and select a session length.", true);
      return;
    }

    if (state.mission && state.mission.status === "active") {
      const done = completedCount(state.mission);
      const total = state.mission.steps.length;
      const confirmReplace = window.confirm(
        `Replace your current mission? ${done} of ${total} steps are complete.`
      );
      if (!confirmReplace) return;
    }

    stopTimer();
    state.mission = createMission(subject, topic, method, duration);
    saveState();
    renderMission();
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("Mission created. Start the timer when you're ready.");
  });

  stepsList.addEventListener("change", event => {
    const checkbox = event.target.closest("input[data-step-index]");
    if (!checkbox || !state.mission) return;

    const index = Number(checkbox.dataset.stepIndex);
    if (!Number.isInteger(index) || !state.mission.steps[index]) return;

    state.mission.steps[index].done = checkbox.checked;
    saveState();
    renderSteps();
  });

  $("missionStart").addEventListener("click", startTimer);
  $("missionPause").addEventListener("click", pauseTimer);
  $("missionReset").addEventListener("click", resetTimer);

  $("missionReflection").addEventListener("input", event => {
    if (!state.mission) return;
    state.mission.reflection = event.target.value.slice(0, 500);
    saveState();
  });

  $("finishMission").addEventListener("click", () => {
    const mission = state.mission;
    if (!mission || mission.status === "completed") return;

    const done = completedCount(mission);
    const total = mission.steps.length;

    if (done < total) {
      const proceed = window.confirm(
        `You've completed ${done} of ${total} steps. Save this as a partial session?`
      );
      if (!proceed) return;
    }

    stopTimer();
    mission.timerRunning = false;
    mission.status = "completed";
    mission.completedAt = Date.now();
    mission.reflection = $("missionReflection").value.trim();

    const percent = Math.round((done / total) * 100);

    state.history.unshift({
      subject: mission.subject,
      topic: mission.topic,
      duration: mission.duration,
      completedSteps: done,
      totalSteps: total,
      percent,
      reflection: mission.reflection,
      completedAt: mission.completedAt
    });

    state.history = state.history.slice(0, 20);
    saveState();
    renderMission();
    setStatus(
      done === total
        ? "Excellent — all mission steps completed and saved."
        : "Your partial session has been saved. You can return to the topic later."
    );
  });

  $("newMission").addEventListener("click", () => {
    if (state.mission && state.mission.status === "active") {
      if (!window.confirm("Start a new mission and replace the current unfinished one?")) {
        return;
      }
    }

    stopTimer();
    state.mission = null;
    saveState();
    renderMission();
    $("missionTopic").focus();
    setStatus("Choose a new topic to build your next mission.");
  });

  window.addEventListener("pagehide", () => {
    if (state.mission && state.mission.timerRunning) {
      state.mission.timerRunning = false;
      saveState();
    }
    stopTimer();
  });

  renderMission();
})();
