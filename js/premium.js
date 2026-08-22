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

            const { data, error } =
                await window.supabaseClient
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


    async function protectPremiumPack() {
    const pack = document.getElementById("premiumResourcePack");
    if (!pack) return;

    const premium = await window.isPremiumUser();

    if (premium) {
        pack.style.display = "block";
    } else {
        pack.style.display = "block";
    }
}

    function setupPremiumSessionGenerator() {
    const button = document.getElementById("generatePremiumSession");

    if (!button) return;

    button.addEventListener("click", async function () {
        const premium = await window.isPremiumUser();

        if (!premium) {
            window.location.href = "subscription.html";
            return;
        }

        const subject =
            document.getElementById("premiumSubject").value;

        const topic =
            document.getElementById("premiumTopic").value.trim();

        const time =
            Number(document.getElementById("premiumTime").value);

        const result =
            document.getElementById("premiumSessionResult");

        if (!subject || !topic) {
            result.style.display = "block";
            result.innerHTML =
                "<strong>Choose a subject and enter a topic first.</strong>";
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
            subject,
            topic,
            time,
            steps: session,
            created: new Date().toISOString()
        };

        const history =
            JSON.parse(
                localStorage.getItem("premiumStudySessions") || "[]"
            );

        history.unshift(savedSession);

        localStorage.setItem(
            "premiumStudySessions",
            JSON.stringify(history.slice(0, 20))
        );

        result.style.display = "block";

        result.innerHTML = `
            <h3>📚 ${subject}: ${topic}</h3>
            <p><strong>${time}-minute Premium session</strong></p>

            <ol>
                ${session.map(step => `<li>${step}</li>`).join("")}
            </ol>

            <p>
                <strong>Rule:</strong>
                Don't just reread. Test yourself, find the gaps, then fix them.
            </p>

            <div class="badge">
                ✅ Session saved
            </div>
        `;
    });
}


    function loadSavedPremiumSessions() {
    const list = document.getElementById("savedSessionsList");
    const clearButton = document.getElementById("clearSavedSessions");

    if (!list) return;

    const history = JSON.parse(
        localStorage.getItem("premiumStudySessions") || "[]"
    );

    if (!history.length) {
        list.innerHTML =
            '<p class="muted">No saved sessions yet.</p>';
    } else {
        list.innerHTML = history.map((session, index) => `
            <div class="panel" style="margin-top:12px;">
                <strong>${session.subject}: ${session.topic}</strong>
                <p class="muted">
                    ${session.time}-minute session
                </p>

                <ol>
                    ${session.steps
                        .map(step => `<li>${step}</li>`)
                        .join("")}
                </ol>
            </div>
        `).join("");
    }

    clearButton?.addEventListener("click", function () {
        localStorage.removeItem("premiumStudySessions");
        loadSavedPremiumSessions();
    });
}


function updatePremiumStudyInsights() {
    const history = JSON.parse(
        localStorage.getItem("premiumStudySessions") || "[]"
    );

    const sessions = document.getElementById("insightSessions");
    const minutes = document.getElementById("insightMinutes");
    const subjects = document.getElementById("insightSubjects");
    const latest = document.getElementById("insightLatest");
    const message = document.getElementById("insightMessage");

    if (!sessions || !minutes || !subjects || !latest) return;

    const totalMinutes = history.reduce(
        (total, session) => total + Number(session.time || 0),
        0
    );

    const subjectList = [
        ...new Set(history.map(session => session.subject))
    ];

    sessions.textContent = history.length;
    minutes.textContent = totalMinutes;
    subjects.textContent = subjectList.length;
    latest.textContent = history.length
        ? history[0].topic
        : "—";

    if (history.length === 0) {
        message.textContent =
            "Generate your first Premium study session to start building your study insights.";
    } else if (history.length < 3) {
        message.textContent =
            "Good start. Keep generating sessions to build a clearer picture of your revision.";
    } else {
        message.textContent =
            `You've planned ${totalMinutes} minutes across ${subjectList.length} subject${subjectList.length === 1 ? "" : "s"}. Keep your sessions focused and consistent.`;
    }
}

    document.addEventListener(
    "DOMContentLoaded",
    async function () {
        await updatePremiumResources();
        await protectPremiumPack();
        setupPremiumSessionGenerator();

        if (await window.isPremiumUser()) {
            loadSavedPremiumSessions();
            updatePremiumStudyInsights();
        }
    }
);
    
})();
