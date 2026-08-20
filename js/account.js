/* GCSE OnTrack — Account authentication */
(function(){
"use strict";
const $=id=>document.getElementById(id);
function msg(text,error=false){const e=$("accountMessage");e.textContent=text;e.style.display="block";e.style.borderLeft=`4px solid ${error?"#ef4444":"#2563eb"}`;}
function ready(){if(!window.supabaseClient){msg("Supabase is not configured yet. Add your credentials in js/supabase.js.",true);return false}return true}
async function refresh(){if(!ready())return;const {data,error}=await supabaseClient.auth.getSession();if(error)return msg(error.message,true);if(data.session){$("loggedInPanel").style.display="block";$("accountEmail").textContent=data.session.user.email||""}else $("loggedInPanel").style.display="none"}
$("signupForm")?.addEventListener("submit",async e=>{e.preventDefault();if(!ready())return;const email=$("signupEmail").value.trim(),password=$("signupPassword").value;if(password.length<8)return msg("Password must be at least 8 characters.",true);const {data,error}=await supabaseClient.auth.signUp({email,password});if(error)return msg(error.message,true);msg(data.session?"Account created and signed in.":"Account created. Check your email if confirmation is enabled.");refresh()});
$("loginForm")?.addEventListener("submit",async e=>{e.preventDefault();if(!ready())return;const {error}=await supabaseClient.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error)return msg(error.message,true);msg("Signed in successfully.");refresh()});
$("logoutBtn")?.addEventListener("click",async()=>{if(!ready())return;const {error}=await supabaseClient.auth.signOut();if(error)return msg(error.message,true);msg("Logged out.");refresh()});
$("resetPassword")?.addEventListener("click",async()=>{if(!ready())return;const email=prompt("Enter your account email:");if(!email)return;const redirect=location.origin+location.pathname.replace(/[^/]*$/,"")+"account.html";const {error}=await supabaseClient.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirect});if(error)msg(error.message,true);else msg("If that email exists, a password-reset email has been requested.")});
document.addEventListener("DOMContentLoaded",refresh);
})();
