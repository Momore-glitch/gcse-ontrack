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
