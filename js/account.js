/* GCSE OnTrack — Account */

(function () {

"use strict";

const $ = id => document.getElementById(id);

function showMessage(text, error = false) {

    const box = $("accountMessage");

    if (!box) return;

    box.textContent = text;
    box.style.display = "block";

    box.style.borderLeft =
        error
        ? "4px solid #ef4444"
        : "4px solid #2563eb";
}


function getClient() {

    if (
        !window.supabaseClient ||
        !window.supabaseClient.auth
    ) {

        showMessage(
            "The account system could not connect to Supabase. Refresh the page and try again.",
            true
        );

        return null;
    }

    return window.supabaseClient;
}


/* CREATE ACCOUNT */

$("signupForm")?.addEventListener(
"submit",
async function (event) {

    event.preventDefault();

    const supabase = getClient();

    if (!supabase) return;

    const email =
        $("signupEmail").value.trim();

    const password =
        $("signupPassword").value;

    if (password.length < 8) {

        showMessage(
            "Password must be at least 8 characters.",
            true
        );

        return;
    }

    /* CONFIRMATION REDIRECT */

    const redirectURL =
        window.location.origin +
        "/gcse-ontrack/account.html";

    const {
        data,
        error
    } =
    await supabase.auth.signUp({

        email,
        password,

        options: {

            emailRedirectTo:
                redirectURL

        }

    });

    if (error) {

        showMessage(
            error.message,
            true
        );

        return;
    }

    if (data.session) {

        showMessage(
            "✅ Account created successfully."
        );

    } else {

        showMessage(
            "✅ Account created! Check your email and click the confirmation link to finish signing up."
        );
    }

    updateAccount();
});


/* SIGN IN */

$("loginForm")?.addEventListener(
"submit",
async function (event) {

    event.preventDefault();

    const supabase = getClient();

    if (!supabase) return;

    const email =
        $("loginEmail").value.trim();

    const password =
        $("loginPassword").value;

    const {
        error
    } =
    await supabase.auth.signInWithPassword({

        email,
        password

    });

    if (error) {

        showMessage(
            error.message,
            true
        );

        return;
    }

    showMessage(
        "✅ You're signed in!"
    );

    updateAccount();
});


/* FORGOT PASSWORD */

$("resetPassword")?.addEventListener(
"click",
async function () {

    const supabase = getClient();

    if (!supabase) return;

    const email =
        prompt(
            "Enter the email address linked to your account:"
        );

    if (!email) return;

    const redirectURL =
        window.location.origin +
        "/gcse-ontrack/account.html";

    const {
        error
    } =
    await supabase.auth.resetPasswordForEmail(

        email.trim(),

        {
            redirectTo:
                redirectURL
        }

    );

    if (error) {

        showMessage(
            error.message,
            true
        );

        return;
    }

    showMessage(
        "📧 Password reset email requested. Check your inbox."
    );

});


/* LOG OUT */

$("logoutBtn")?.addEventListener(
"click",
async function () {

    const supabase = getClient();

    if (!supabase) return;

    const {
        error
    } =
    await supabase.auth.signOut();

    if (error) {

        showMessage(
            error.message,
            true
        );

        return;
    }

    showMessage(
        "You've been logged out."
    );

    updateAccount();
});


/* ACCOUNT STATUS */

async function updateAccount() {

    const supabase = getClient();

    if (!supabase) return;

    const {
        data,
        error
    } =
    await supabase.auth.getSession();

    if (error) {

        showMessage(
            error.message,
            true
        );

        return;
    }

    const session =
        data.session;

    const panel =
        $("loggedInPanel");

    if (!panel) return;

    if (session) {

        panel.style.display =
            "block";

        $("accountEmail").textContent =
            session.user.email || "";

    } else {

        panel.style.display =
            "none";
    }
}


/* INITIALISE */

document.addEventListener(
"DOMContentLoaded",
function () {

    updateAccount();

});
})();
