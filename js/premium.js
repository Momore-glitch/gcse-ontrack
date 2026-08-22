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


    async function updatePremiumResources() {

        const card =
            document.getElementById("premiumResourcesCard");

        const text =
            document.getElementById("premiumResourcesText");

        const button =
            document.getElementById("premiumResourcesBtn");

        if (!card || !text || !button) return;

        const premium =
            await window.isPremiumUser();

        if (premium) {

            text.textContent =
                "⭐ Your Premium access is active. Premium resources and advanced study tools are available to you.";

            button.textContent =
                "⭐ Premium Active";

            button.href =
                "subscription.html";

        } else {

            text.textContent =
                "Unlock advanced resource tools and premium study materials.";

            button.textContent =
                "⭐ Upgrade to Premium";

            button.href =
                "subscription.html";
        }
    }


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        await updatePremiumResources();
        await protectPremiumPack();
    }
);
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

})();
