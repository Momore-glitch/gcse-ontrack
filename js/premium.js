/* GCSE OnTrack — Premium access */
(function () {
    "use strict";

    window.isPremiumUser = async function () {
        if (!window.supabaseClient) return false;

        try {
            const {
                data: { session }
            } = await window.supabaseClient.auth.getSession();

            if (!session) return false;

            const { data, error } = await window.supabaseClient
                .from("subscriptions")
                .select("status,current_period_end,cancel_at_period_end")
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (error) {
                console.error("Premium check failed:", error);
                return false;
            }

            return !!(
                data &&
                ["active", "trialing"].includes(data.status)
            );

        } catch (error) {
            console.error("Premium check error:", error);
            return false;
        }
    };


    /* HOME / PREMIUM RESOURCE CARD */

    async function updatePremiumResources() {
        const text = document.getElementById("premiumCardText");
        const button = document.getElementById("premiumHomeBtn");

        if (!text || !button) return;

        const premium = await window.isPremiumUser();

        if (premium) {
            text.textContent =
                "⭐ Your Premium access is active. Premium resources and advanced study tools are available to you.";

            button.textContent = "⭐ Premium Active";
            button.href = "subscription.html";
        } else {
            text.textContent =
                "Unlock advanced resource tools and premium study materials.";

            button.textContent = "⭐ Upgrade to Premium";
            button.href = "subscription.html";
        }
    }

    async function updateResourcesPagePremiumCard() {
        const text = document.getElementById("premiumResourcesText");
        const button = document.getElementById("premiumResourcesBtn");

        if (!text || !button) return;

        const premium = await window.isPremiumUser();

        if (premium) {
            text.textContent =
                "⭐ Premium access is active. Your advanced resources and study tools are unlocked.";

            button.textContent = "⭐ Premium Unlocked";
            button.href = "subscription.html";
        } else {
            text.textContent =
                "Unlock advanced resource tools and premium study materials.";

            button.textContent = "⭐ Upgrade to Premium";
            button.href = "subscription.html";
        }
    }


    /* PREMIUM TOOLKIT LOCK */

    async function protectPremiumPack() {
        const locked = document.getElementById("premiumToolkitLocked");
        const unlocked = document.getElementById("premiumToolkitUnlocked");

        if (!locked || !unlocked) return;

        const premium = await window.isPremiumUser();

        if (premium) {
            locked.style.display = "none";
            unlocked.style.display = "block";
        } else {
            locked.style.display = "block";
            unlocked.style.display = "none";
        }
    }


    /* PREMIUM SESSION STORAGE */

    function readPremiumSessions() {
        try {
            const parsed = JSON.parse(localStorage.getItem("premiumStudySessions") || "[]");
            return Array.isArray(parsed)
                ? parsed.filter(item => item && typeof item === "object" && !Array.isArray(item))
                : [];
        } catch (error) {
            console.warn("Could not read saved Premium sessions.", error);
            return [];
        }
    }

    function safeSessionSteps(value) {
        return Array.isArray(value)
            ? value.slice(0, 12).map(step => String(step ?? "").slice(0, 180))
            : [];
    }


    /* SMART STUDY SESSION GENERATOR */

    function setupPremiumSessionGenerator() {
        const button = document.getElementById("generatePremiumSession");
        if (!button) return;

        button.addEventListener("click", async function () {
            const premium = await window.isPremiumUser();

            if (!premium) {
                window.location.href = "subscription.html";
                return;
            }

            const subject = document.getElementById("premiumSubject").value;
            const topic = document.getElementById("premiumTopic").value.trim();
            const time = Number(document.getElementById("premiumTime").value);
            const result = document.getElementById("premiumSessionResult");

            if (!subject || !topic) {
                result.style.display = "block";
                result.textContent = "Choose a subject and enter a topic first.";
                return;
            }

            let session = [];

            if (time === 25) {
                session = [
                    "5 min — Recall everything you already know",
                    "10 min — Learn/review the key ideas",
                    "7 min — Answer exam-style questions",
                    "3 min — Mark mistakes and write one improvement"
                ];
            } else if (time === 40) {
                session = [
                    "5 min — Quick recall",
                    "15 min — Learn/review the topic",
                    "15 min — Exam-style questions",
                    "5 min — Mark and correct"
                ];
            } else if (time === 60) {
                session = [
                    "10 min — Active recall",
                    "20 min — Topic review",
                    "20 min — Exam-style practice",
                    "10 min — Mark, correct and identify weak points"
                ];
            } else {
                session = [
                    "10 min — Active recall",
                    "25 min — Deep topic review",
                    "30 min — Exam-style practice",
                    "15 min — Mark, correct and create an error list",
                    "10 min — Final recall without notes"
                ];
            }

            const savedSession = {
                subject: String(subject).slice(0, 60),
                topic: String(topic).slice(0, 120),
                time: [25, 40, 60, 90].includes(time) ? time : 90,
                steps: session,
                created: new Date().toISOString()
            };

            const history = readPremiumSessions();
            history.unshift(savedSession);

            try {
                localStorage.setItem("premiumStudySessions", JSON.stringify(history.slice(0, 20)));
            } catch (error) {
                console.error("Could not save the Premium session.", error);
                result.textContent = "Your browser could not save this session. Check available storage and try again.";
                result.style.display = "block";
                return;
            }

            result.replaceChildren();
            result.style.display = "block";

            const heading = document.createElement("h3");
            heading.textContent = `📚 ${savedSession.subject}: ${savedSession.topic}`;
            result.appendChild(heading);

            const duration = document.createElement("p");
            const durationStrong = document.createElement("strong");
            durationStrong.textContent = `${savedSession.time}-minute Premium session`;
            duration.appendChild(durationStrong);
            result.appendChild(duration);

            const list = document.createElement("ol");
            savedSession.steps.forEach(step => {
                const item = document.createElement("li");
                item.textContent = step;
                list.appendChild(item);
            });
            result.appendChild(list);

            const rule = document.createElement("p");
            rule.textContent = "Rule: Don't just reread. Test yourself, find the gaps, then fix them.";
            result.appendChild(rule);

            const savedBadge = document.createElement("div");
            savedBadge.className = "badge";
            savedBadge.textContent = "✅ Session saved";
            result.appendChild(savedBadge);

            loadSavedPremiumSessions();
            updatePremiumStudyInsights();
            updateWeakTopics();
        });
    }


    /* SAVED SESSIONS */

    function loadSavedPremiumSessions() {
        const list = document.getElementById("savedSessionsList");
        const clearButton = document.getElementById("clearSavedSessions");
        if (!list) return;

        const history = readPremiumSessions();
        list.replaceChildren();

        if (!history.length) {
            list.appendChild(createTextElement("p", "muted", "No saved sessions yet."));
        } else {
            history.slice(0, 20).forEach(session => {
                const panel = createTextElement("div", "panel", "");
                panel.style.marginTop = "12px";

                const heading = createTextElement("strong", "", `${String(session.subject ?? "Subject").slice(0, 60)}: ${String(session.topic ?? "Topic").slice(0, 120)}`);
                panel.appendChild(heading);

                const duration = createTextElement("p", "muted", `${Number(session.time) || 0}-minute session`);
                panel.appendChild(duration);

                const steps = document.createElement("ol");
                safeSessionSteps(session.steps).forEach(step => {
                    steps.appendChild(createTextElement("li", "", step));
                });
                panel.appendChild(steps);
                list.appendChild(panel);
            });
        }

        if (clearButton && !clearButton.dataset.listenerAdded) {
            clearButton.dataset.listenerAdded = "true";
            clearButton.addEventListener("click", function () {
                localStorage.removeItem("premiumStudySessions");
                loadSavedPremiumSessions();
                updatePremiumStudyInsights();
                updateWeakTopics();
            });
        }
    }


    /* STUDY INSIGHTS */

    function updatePremiumStudyInsights() {
        const history = readPremiumSessions();
        const sessions = document.getElementById("insightSessions");
        const minutes = document.getElementById("insightMinutes");
        const subjects = document.getElementById("insightSubjects");
        const latest = document.getElementById("insightLatest");
        const message = document.getElementById("insightMessage");

        if (!sessions || !minutes || !subjects || !latest) return;

        const totalMinutes = history.reduce((total, session) =>
            total + Math.max(0, Math.min(240, Number(session.time) || 0)), 0);
        const subjectList = [...new Set(history.map(session =>
            String(session.subject || "").slice(0, 60)).filter(Boolean))];

        sessions.textContent = history.length;
        minutes.textContent = totalMinutes;
        subjects.textContent = subjectList.length;
        latest.textContent = history.length
            ? String(history[0].topic || "Topic").slice(0, 120)
            : "—";

        if (!message) return;
        if (!history.length) {
            message.textContent = "Generate your first Premium study session to start building your study insights.";
        } else if (history.length < 3) {
            message.textContent = "Good start. Keep generating sessions to build a clearer picture of your revision.";
        } else {
            message.textContent = `You've planned ${totalMinutes} minutes across ${subjectList.length} subject${subjectList.length === 1 ? "" : "s"}. Keep your sessions focused and consistent.`;
        }
    }


    /* WEAK-TOPIC DETECTOR */

    function updateWeakTopics() {
        const list = document.getElementById("weakTopicsList");
        if (!list) return;

        const history = readPremiumSessions();
        list.replaceChildren();

        if (!history.length) {
            list.appendChild(createTextElement("p", "muted", "Generate study sessions to start detecting weak topics."));
            return;
        }

        const topicCounts = new Map();
        history.forEach(session => {
            const subject = String(session.subject || "Subject").slice(0, 60);
            const topic = String(session.topic || "Topic").slice(0, 120);
            const key = `${subject} — ${topic}`;
            topicCounts.set(key, (topicCounts.get(key) || 0) + 1);
        });

        [...topicCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([topic, count], index) => {
                const panel = createTextElement("div", "panel", "");
                panel.style.marginTop = "10px";
                panel.appendChild(createTextElement("strong", "", `${index + 1}. ${topic}`));
                panel.appendChild(createTextElement("p", "muted", `Planned ${count} time${count === 1 ? "" : "s"}`));
                list.appendChild(panel);
            });
    }


    /* PREMIUM ERROR BANK */

    function setupPremiumErrorBank() {
        const host = document.getElementById("premiumErrorBankHost");
        if (!host) return;

        const render = () => {
            let errors = [];
            try {
                const parsed = JSON.parse(localStorage.getItem("premiumErrorBank") || "[]");
                errors = Array.isArray(parsed)
                    ? parsed.filter(item => item && typeof item === "object" && !Array.isArray(item)).slice(0, 100)
                    : [];
            } catch (error) {
                console.warn("Could not read Premium Error Bank.", error);
            }

            host.replaceChildren();
            const section = createTextElement("section", "panel", "");
            section.id = "premiumErrorBank";
            section.appendChild(createTextElement("h2", "", "❌ Premium Error Bank"));
            section.appendChild(createTextElement("p", "muted", "Record mistakes once, then use them as targeted revision."));

            const form = document.createElement("form");
            form.id = "premiumErrorForm";
            const grid = createTextElement("div", "grid grid2", "");

            const fields = [
                ["errorSubject", "Subject", "e.g. Biology", "input"],
                ["errorTopic", "Topic", "e.g. Cell biology", "input"],
                ["errorWrong", "What did you get wrong?", "Briefly describe the mistake...", "textarea"],
                ["errorCorrect", "What is the correct answer?", "Write the correct answer...", "textarea"],
                ["errorWhy", "Why did you make the mistake?", "What caused the error?", "textarea"]
            ];

            function appendField(parent, [id, labelText, placeholder, kind]) {
                const wrapper = createTextElement("div", "", "");
                const label = createTextElement("label", "", labelText);
                label.htmlFor = id;
                wrapper.appendChild(label);
                const field = document.createElement(kind);
                field.id = id;
                field.required = id !== "errorWhy";
                field.placeholder = placeholder;
                if (kind === "textarea") field.rows = 3;
                wrapper.appendChild(field);
                parent.appendChild(wrapper);
            }

            fields.slice(0, 2).forEach(field => appendField(grid, field));
            form.appendChild(grid);
            fields.slice(2).forEach(field => appendField(form, field));
            const actions = createTextElement("div", "actions", "");
            actions.style.marginTop = "12px";
            const submit = createTextElement("button", "btn", "➕ Add to Error Bank");
            submit.type = "submit";
            actions.appendChild(submit);
            form.appendChild(actions);
            section.appendChild(form);

            const list = createTextElement("div", "", "");
            list.id = "premiumErrorList";
            list.style.marginTop = "20px";
            section.appendChild(list);
            host.appendChild(section);

            if (!errors.length) {
                list.appendChild(createTextElement("p", "muted", "No mistakes logged yet. Add your first one above."));
            } else {
                errors.forEach((item, index) => {
                    const panel = createTextElement("div", "panel", "");
                    panel.style.marginTop = "12px";
                    const heading = createTextElement("strong", "", `${String(item.subject || "Subject").slice(0, 60)} — ${String(item.topic || "Topic").slice(0, 120)}`);
                    panel.appendChild(heading);
                    panel.appendChild(createTextElement("p", "muted", new Date(item.created).toLocaleDateString("en-GB")));
                    panel.appendChild(createTextElement("p", "", `❌ Mistake: ${String(item.wrong || "").slice(0, 1000)}`));
                    panel.appendChild(createTextElement("p", "", `✅ Correct: ${String(item.correct || "").slice(0, 1000)}`));
                    if (item.why) panel.appendChild(createTextElement("p", "", `🧠 Why: ${String(item.why).slice(0, 1000)}`));
                    const remove = createTextElement("button", "btn secondary", "Delete");
                    remove.type = "button";
                    remove.dataset.deleteError = String(index);
                    panel.appendChild(remove);
                    list.appendChild(panel);
                });
            }

            form.addEventListener("submit", event => {
                event.preventDefault();
                const newError = {
                    subject: document.getElementById("errorSubject").value.trim().slice(0, 60),
                    topic: document.getElementById("errorTopic").value.trim().slice(0, 120),
                    wrong: document.getElementById("errorWrong").value.trim().slice(0, 1000),
                    correct: document.getElementById("errorCorrect").value.trim().slice(0, 1000),
                    why: document.getElementById("errorWhy").value.trim().slice(0, 1000),
                    created: new Date().toISOString()
                };
                errors.unshift(newError);
                try {
                    localStorage.setItem("premiumErrorBank", JSON.stringify(errors.slice(0, 100)));
                    render();
                } catch (error) {
                    console.error("Could not save Premium Error Bank entry.", error);
                    alert("Your browser could not save this entry. Check available storage and try again.");
                }
            });

            list.addEventListener("click", event => {
                const button = event.target.closest("button[data-delete-error]");
                if (!button) return;
                const index = Number(button.dataset.deleteError);
                if (!Number.isInteger(index) || index < 0 || index >= errors.length) return;
                errors.splice(index, 1);
                try {
                    localStorage.setItem("premiumErrorBank", JSON.stringify(errors));
                    render();
                } catch (error) {
                    console.error("Could not update Premium Error Bank.", error);
                    alert("Your browser could not update this entry. Try again.");
                }
            });
        };

        if (window.isPremiumUser) {
            window.isPremiumUser().then(premium => {
                if (premium) {
                    render();
                } else {
                    host.replaceChildren();
                    const section = createTextElement("section", "panel", "");
                    section.appendChild(createTextElement("h2", "", "⭐ Premium Error Bank"));
                    section.appendChild(createTextElement("p", "muted", "The Error Bank is available with GCSE OnTrack Premium."));
                    const link = createTextElement("a", "btn", "⭐ Upgrade to Premium");
                    link.href = "subscription.html";
                    section.appendChild(link);
                    host.appendChild(section);
                }
            }).catch(error => {
                console.error("Premium access check failed for Error Bank.", error);
            });
        }
    }

    function createTextElement(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = String(text);
        return node;
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* INITIALISE */

    document.addEventListener("DOMContentLoaded", async function () {
        await updatePremiumResources();
        await updateResourcesPagePremiumCard();
        await protectPremiumPack();
        setupPremiumSessionGenerator();
        setupPremiumErrorBank();

        if (await window.isPremiumUser()) {
            loadSavedPremiumSessions();
            updatePremiumStudyInsights();
            updateWeakTopics();
        }
    });
})();
