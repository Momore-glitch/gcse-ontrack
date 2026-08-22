/* GCSE OnTrack — subscriptions */
(function(){
"use strict";
const $=id=>document.getElementById(id);
 async function updateHomePremiumCard(session){

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

    if (error) return;

    if (
        data &&
        ["active", "trialing"].includes(data.status)
    ) {

        text.textContent =
            "Your Premium access is active. Keep using your advanced GCSE OnTrack tools.";

        button.textContent =
            "⭐ Premium Active";

        button.href =
            "subscription.html";

    } else {

        text.textContent =
            "Unlock smarter revision tools, premium resources and advanced study features.";

        button.textContent =
            "⭐ Upgrade to Premium";

        button.href =
            "subscription.html";
    }
}
function msg(t,e=false){const x=$("subscriptionMessage");if(!x)return;x.textContent=t;x.style.display="block";x.style.borderLeft=`4px solid ${e?"#ef4444":"#2563eb"}`;}
async function getClient(){if(!window.supabaseClient){msg("Account system unavailable. Refresh and sign in again.",true);return null}return window.supabaseClient}
async function load(){
 const s=await getClient();if(!s)return;
 const {data:{session}}=await s.auth.getSession();
 updateHomePremiumCard(session);
 if(!session){$("subscriptionStatus").innerHTML="<strong>Not signed in.</strong><br>Sign in before upgrading.";$("upgradeBtn").disabled=true;return}
 const {data,error}=await s.from("subscriptions").select("status,current_period_end,cancel_at_period_end").eq("user_id",session.user.id).maybeSingle();
 if(error){msg(error.message,true);return}
 if(data&&["active","trialing"].includes(data.status)){
  const end=data.current_period_end?new Date(data.current_period_end).toLocaleDateString("en-GB"):"—";
  $("subscriptionStatus").innerHTML=`<strong>⭐ Premium active.</strong><br>Current period ends: ${end}${data.cancel_at_period_end?"<br>Cancellation is scheduled at period end.":""}`;
  $("upgradeBtn").style.display="none";$("manageBtn").style.display="inline-block";
 }else{$("subscriptionStatus").innerHTML="<strong>Free plan</strong><br>Upgrade whenever you're ready.";$("manageBtn").style.display="none"}
}
$("upgradeBtn")?.addEventListener("click",async()=>{
 const s=await getClient();if(!s)return;
 const {data:{session}}=await s.auth.getSession();if(!session)return msg("Please sign in first.",true);
 $("upgradeBtn").disabled=true;$("upgradeBtn").textContent="Opening checkout…";
 const {data,error}=await s.functions.invoke("create-checkout");
 if(error||!data?.url){$("upgradeBtn").disabled=false;$("upgradeBtn").textContent="Upgrade to Premium";msg(error?.message||"Checkout could not be opened.",true);return}
 location.href=data.url;
});
$("manageBtn")?.addEventListener("click",async()=>{
 const s=await getClient();if(!s)return;
 const {data,error}=await s.functions.invoke("customer-portal");
 if(error||!data?.url){msg(error?.message||"Billing portal could not be opened.",true);return}
 location.href=data.url;
});
document.addEventListener("DOMContentLoaded",load);
})();
