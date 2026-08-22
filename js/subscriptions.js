/* GCSE OnTrack — subscriptions */
(function () {
    "use strict";

    const $ = id => document.getElementById(id);


    function msg(text, error = false) {
        const element = $("subscriptionMessage");

        if (!element) return;

        element.textContent = text;
        element.style.display = "block";
        element.style.borderLeft =
            `4px solid ${error ? "#ef4444" : "#2563eb"}`;
    }


    async function getClient() {

        if (!window.supabaseClient) {
            msg(
                "Account system unavailable. Refresh and sign in again.",
                true
            );

            return null;
        }

        return window.supabaseClient;
    }


    async function updateHomePremiumCard(session) {

        const card = $("premiumCard");
        const text = $("premiumCardText");
        const button = $("premiumHomeBtn");

        if (!card || !text || !button) return;


        if (!session) {

            text.textContent =
                "Unlock smarter revision tools, premium resources and advanced study features.";

            button.textContent =
                "⭐ Upgrade to Premium";

            button.href =
                "subscription.html";

            return;
        }


        const { data, error } =
            await window.supabaseClient
                .from("subscriptions")
                .select("status")
                .eq("user_id", session.user.id)
                .maybeSingle();


        if (error) {
            console.error(
                "Home Premium status error:",
                error
            );

            return;
        }


        if (
            data &&
            ["active", "trialing"].includes(data.status)
        ) {

            text.textContent =
                "Your Premium access is active. Keep using your advanced GCSE OnTrack tools.";

            button.textContent =
                "⭐ Premium Active";

        } else {

            text.textContent =
                "Unlock smarter revision tools, premium resources and advanced study features.";

            button.textContent =
                "⭐ Upgrade to Premium";
        }


        button.href = "subscription.html";
    }


    async function load() {

        const s = await getClient();

        if (!s) return;


        const {
            data: { session }
        } = await s.auth.getSession();


        await updateHomePremiumCard(session);


        /*
         * Handle Stripe Checkout return.
         */

        const params =
            new URLSearchParams(window.location.search);

        const checkout =
            params.get("checkout");


        if (checkout === "success") {

            msg(
                "✅ Checkout completed. Your Premium status will update when Stripe confirms the subscription."
            );

        } else if (checkout === "cancelled") {

            msg(
                "Checkout was cancelled. No subscription was created."
            );
        }


        if (!session) {

            $("subscriptionStatus").innerHTML =
                "<strong>Not signed in.</strong><br>Sign in before upgrading.";

            $("upgradeBtn").disabled = true;

            return;
        }


        const {
            data,
            error
        } = await s
            .from("subscriptions")
            .select(
                "status,current_period_end,cancel_at_period_end"
            )
            .eq("user_id", session.user.id)
            .maybeSingle();


        if (error) {

            console.error(
                "Subscription lookup error:",
                error
            );

            msg(
                "Unable to check your subscription status.",
                true
            );

            return;
        }


        if (
            data &&
            ["active", "trialing"].includes(data.status)
        ) {

            const end =
                data.current_period_end
                    ? new Date(
                        data.current_period_end
                    ).toLocaleDateString("en-GB")
                    : "—";


            $("subscriptionStatus").innerHTML =
                `<strong>⭐ Premium active.</strong><br>
                Current period ends: ${end}
                ${
                    data.cancel_at_period_end
                        ? "<br>Cancellation is scheduled at period end."
                        : ""
                }`;


            $("upgradeBtn").style.display = "none";
            $("manageBtn").style.display = "inline-block";


        } else {

            $("subscriptionStatus").innerHTML =
                "<strong>Free plan</strong><br>Upgrade whenever you're ready.";

            $("upgradeBtn").style.display = "inline-block";
            $("manageBtn").style.display = "none";
        }
    }


    /*
     * Upgrade button
     */

    $("upgradeBtn")?.addEventListener(
        "click",
        async function () {

            const s = await getClient();

            if (!s) return;


            const {
                data: { session }
            } = await s.auth.getSession();


            if (!session) {

                msg(
                    "Please sign in first.",
                    true
                );

                return;
            }


            $("upgradeBtn").disabled = true;
            $("upgradeBtn").textContent =
                "Opening checkout…";


            const {
                data,
                error
            } = await s.functions.invoke(
                "create-checkout"
            );


            if (error || !data?.url) {

                $("upgradeBtn").disabled = false;

                $("upgradeBtn").textContent =
                    "⭐ Upgrade to Premium";

                msg(
                    error?.message ||
                    "Checkout could not be opened.",
                    true
                );

                return;
            }


            window.location.href = data.url;
        }
    );


    /*
     * Customer portal
     */

    $("manageBtn")?.addEventListener(
        "click",
        async function () {

            const s = await getClient();

            if (!s) return;


            $("manageBtn").disabled = true;
            $("manageBtn").textContent =
                "Opening portal…";


            const {
                data,
                error
            } = await s.functions.invoke(
                "customer-portal"
            );


            if (error || !data?.url) {

                $("manageBtn").disabled = false;

                $("manageBtn").textContent =
                    "Manage Subscription";

                msg(
                    error?.message ||
                    "Billing portal could not be opened.",
                    true
                );

                return;
            }


            window.location.href = data.url;
        }
    );


    document.addEventListener(
        "DOMContentLoaded",
        load
    );

})();
