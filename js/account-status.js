/* GCSE OnTrack — Global Account Status */

document.addEventListener("DOMContentLoaded", async () => {

    const accountLink =
        document.querySelector('a[href="account.html"]');

    if (!accountLink) return;

    if (
        !window.supabaseClient ||
        !window.supabaseClient.auth
    ) {
        accountLink.textContent = "👤 Account";
        return;
    }

    const {
        data,
        error
    } = await window.supabaseClient.auth.getSession();

    if (error || !data.session) {
        accountLink.textContent = "👤 Sign In";
        accountLink.href = "account.html";
        return;
    }

    const email =
        data.session.user.email || "Account";

    accountLink.textContent =
        `👤 ${email}`;

    accountLink.title =
        `Signed in as ${email}`;
});
