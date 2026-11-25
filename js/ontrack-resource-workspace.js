/* GCSE ONTRACK — third-party resource workspace. Uses existing Resource Library and planner data. */
(() => {
  "use strict";
  const MODEL_KEY = "gcoStudyPlanner_v1", $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const text = (v, n = 180) => String(v == null ? "" : v).trim().slice(0, n);
  let dialog = null, observer = null, queued = false;
  const readModel = () => { try { const v = JSON.parse(localStorage.getItem(MODEL_KEY) || "null"); return v && typeof v === "object" ? v : {}; } catch { return {}; } };
  const getResources = () => typeof window.getCollection === "function" ? window.getCollection("resources") : (() => { try { const v = JSON.parse(localStorage.getItem("resources") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } })();
  const setResources = v => typeof window.setCollection === "function" ? window.setCollection("resources", v) : localStorage.setItem("resources", JSON.stringify(v));
  function el(tag, cls, value) { const x = document.createElement(tag); if (cls) x.className = cls; if (value !== undefined) x.textContent = String(value); return x; }
  function button(value, fn, cls) { const b = el("button", cls || "gco-rw-btn", value); b.type = "button"; b.addEventListener("click", fn); return b; }
  function safeUrl(raw) { try { const u = new URL(String(raw || "").trim()); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : ""; } catch { return ""; } }
  function videoId(url) {
    try { const u = new URL(url); if (u.hostname.endsWith("youtu.be")) return u.pathname.split("/").filter(Boolean)[0] || ""; if (u.hostname.includes("youtube.com")) { if (u.pathname === "/watch") return u.searchParams.get("v") || ""; const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/); return m ? m[1] : ""; } } catch {} return "";
  }
  function openDialog(title, subtitle) {
    if (!dialog) {
      dialog = el("dialog", "gco-rw-dialog"); const shell = el("div", "gco-rw-shell"), header = el("header", "gco-rw-header"), heading = el("div", "gco-rw-heading");
      heading.append(el("span", "gco-kicker", "GCSE ONTRACK RESOURCE VIEWER")); const h = el("h2"); h.id = "gcoRwTitle"; const sub = el("p", "gco-rw-subtitle"); sub.id = "gcoRwSubtitle"; heading.append(h, sub);
      header.append(heading, button("×", () => dialog.close(), "gco-rw-close")); const body = el("div", "gco-rw-body"); body.id = "gcoRwBody"; const foot = el("footer", "gco-rw-footer"); foot.id = "gcoRwFooter";
      shell.append(header, body, foot); dialog.appendChild(shell); document.body.appendChild(dialog); dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
    }
    $("#gcoRwTitle", dialog).textContent = title || "Resource"; $("#gcoRwSubtitle", dialog).textContent = subtitle || ""; $("#gcoRwBody", dialog).replaceChildren(); $("#gcoRwFooter", dialog).replaceChildren(); if (!dialog.open) dialog.showModal(); return dialog;
  }
  function launchFrame(url, title, host) {
    const frame = el("iframe", "gco-rw-frame"); frame.src = url; frame.title = title || "Third-party resource"; frame.loading = "eager"; frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allow = "fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-read; clipboard-write";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"); host.replaceChildren(frame);
  }
  function trackOpen(url) { const rows = getResources(), item = rows.find(x => x && !x.deleted && x.url === url); if (!item) return; item.clicks = Math.max(0, Number(item.clicks) || 0) + 1; item.lastOpened = Date.now(); try { setResources(rows); } catch (e) { console.warn("OnTrack open count could not be saved.", e); } }
  function openResource(raw, title) {
    const url = safeUrl(raw); if (!url) { alert("This resource link is not a valid web address."); return; }
    const d = openDialog(title || "Third-party resource", "Opening inside GCSE ONTRACK wherever the provider permits embedding."); const body = $("#gcoRwBody", d), foot = $("#gcoRwFooter", d), viewer = el("div", "gco-rw-viewer"), id = videoId(url);
    if (id) {
      const poster = el("div", "gco-rw-video-poster"), img = document.createElement("img"); img.src = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg"; img.alt = "Video thumbnail"; img.loading = "eager"; poster.appendChild(img);
      const source = new URL(url), rawStart = String(source.searchParams.get("start") || source.searchParams.get("t") || "0"), rawEnd = String(source.searchParams.get("end") || "");
      const sm = rawStart.match(/(\d+)/), em = rawEnd.match(/(\d+)/);
      const start = sm ? Math.max(0, Number(sm[1])) : 0;
      let end = em ? Math.max(0, Number(em[1])) : start + 600;
      if (!end || end <= start || end - start > 600) end = start + 600;
      let embed = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?rel=0&modestbranding=1&playsinline=1";
      if (start) embed += "&start=" + Math.floor(start);
      embed += "&end=" + Math.floor(end);
      poster.append(button("Load video player", () => launchFrame(embed, title || "Video lesson", viewer), "gco-rw-play"));
      poster.append(el("p", "", "Tap to load the video player. ONTRACK limits an embedded YouTube preview to a maximum of 10 minutes.")); viewer.appendChild(poster);
    } else {
      const u = new URL(url);
      viewer.classList.add(/\.pdf$/i.test(u.pathname) ? "is-document" : "is-webpage");
      const ready = el("div", "gco-rw-page-poster");
      ready.append(el("strong", "", "Ready to open inside GCSE ONTRACK"));
      ready.append(el("p", "", "The provider page loads only when you tap below, so opening the viewer does not start a heavy page or player unexpectedly."));
      ready.append(button("Load provider page inside ONTRACK", () => launchFrame(url, title || "Third-party resource", viewer), "gco-rw-play"));
      viewer.appendChild(ready);
    }
    body.append(viewer, el("p", "gco-rw-provider-note", "Some providers restrict in-page display, require sign-in or disable embedding. GCSE ONTRACK cannot override those restrictions; the provider link remains available below."));
    const fallback = el("a", "gco-rw-fallback", "Open provider page in a new tab ↗"); fallback.href = url; fallback.target = "_blank"; fallback.rel = "noopener noreferrer"; fallback.addEventListener("click", () => trackOpen(url));
    foot.append(fallback, button("Close", () => d.close(), "gco-rw-close-text")); trackOpen(url);
  }
  const tags = item => String(item.tag || "").split(";").map(x => x.trim()).filter(Boolean);
  const subjectMatch = (item, s) => String(item.subject || "").toLowerCase() === text(s.subject, 80).toLowerCase() || (Array.isArray(item.relatedSubjects) && item.relatedSubjects.some(x => String(x).toLowerCase() === text(s.subject, 80).toLowerCase()));
  const topicMatch = (item, s) => tags(item).some(x => x.toLowerCase() === text(s.topic, 140).toLowerCase());
  function sessionFrom(card, model) {
    const id = String(card.dataset.sessionId || ""), exact = (model.sessions || []).find(x => String(x.id || "") === id); if (exact) return exact;
    const heading = $(":scope > h3", card)?.textContent || "", i = heading.indexOf(" — "); return i < 0 ? null : { id: "", subject: heading.slice(0, i).trim(), topic: heading.slice(i + 3).trim() };
  }
  function prefs(model) { const saved = model.topicLearningHub_v1 || {}; return { root: saved, auto: saved.settings ? saved.settings.autoAttach !== false : true, overrides: saved.overrides || {} }; }
  function savePrefs(model, p) { p.root.settings = Object.assign({}, p.root.settings, { autoAttach: p.auto }); p.root.overrides = p.overrides; model.topicLearningHub_v1 = p.root; localStorage.setItem(MODEL_KEY, JSON.stringify(model)); }
  function sessionKey(s) { return s.id ? "id:" + s.id : text(s.subject, 80).toLowerCase() + "::" + text(s.topic, 140).toLowerCase(); }
  function saveItem(session, title, url, type, note) {
    const rows = getResources(), existing = rows.find(x => x && !x.deleted && safeUrl(x.url) === url);
    if (existing) { const t = tags(existing); if (!t.some(x => x.toLowerCase() === session.topic.toLowerCase())) t.push(session.topic); existing.tag = t.join("; ").slice(0, 100); existing.lastEdited = Date.now(); }
    else rows.unshift({ id: typeof window.uid === "function" ? window.uid("res") : "res_" + Date.now(), shortId: Math.random().toString(36).slice(2, 8).toUpperCase(), title: text(title, 140), url, subject: text(session.subject, 60) || "General", tag: text(session.topic, 100), note: (text(type, 40) + (note ? " · " + text(note, 1000) : "")).slice(0, 1200), priority: "Medium", rating: 3, favourite: false, pinned: false, archived: false, deleted: false, deletedDate: null, clicks: 0, created: Date.now(), lastEdited: null, lastOpened: null });
    setResources(rows);
  }
  function addDialog(session, refresh) {
    const d = openDialog("Add a third-party resource", session.subject + " — " + session.topic), body = $("#gcoRwBody", d), foot = $("#gcoRwFooter", d), form = el("form", "gco-rw-form");
    const title = document.createElement("input"); title.required = true; title.maxLength = 140; title.placeholder = "e.g. AQA topic practice questions";
    const url = document.createElement("input"); url.required = true; url.type = "url"; url.placeholder = "Paste the direct HTTPS link";
    const type = document.createElement("select"); ["Video lesson", "Practice questions", "Flashcards", "Past-paper questions", "Notes / guide", "Other"].forEach(v => { const o = el("option", "", v); o.value = v; type.appendChild(o); });
    const note = document.createElement("input"); note.maxLength = 1000; note.placeholder = "e.g. Foundation tier, start at 03:20";
    [["Resource title", title], ["Provider URL", url], ["Resource type", type], ["Optional note", note]].forEach(([name, input]) => { const row = el("label", "gco-rw-field"); row.append(el("span", "", name), input); form.appendChild(row); });
    form.append(el("p", "gco-rw-note", "Saved in your existing Resource Library and tagged to this timetable topic.")); body.appendChild(form);
    foot.append(button("Save to this topic", () => { if (!title.value.trim()) { title.focus(); return; } const valid = safeUrl(url.value); if (!valid || new URL(valid).protocol !== "https:") { url.setCustomValidity("Enter a valid HTTPS resource address."); url.reportValidity(); return; } try { saveItem(session, title.value, valid, type.value, note.value); d.close(); refresh(); } catch (e) { console.error(e); alert("The resource could not be saved. Existing library records were left unchanged."); } }, "gco-rw-primary"), button("Cancel", () => d.close(), "gco-rw-close-text"));
  }
  function attachDialog(session, refresh) {
    const d = openDialog("Attach a saved resource", session.subject + " — " + session.topic), body = $("#gcoRwBody", d), foot = $("#gcoRwFooter", d);
    const all = getResources(), candidates = all.filter(x => x && !x.deleted && !x.archived && subjectMatch(x, session));
    if (!candidates.length) body.appendChild(el("p", "gco-rw-empty", "No saved links for this subject yet. Add a direct provider link to this topic first."));
    candidates.forEach(item => { const row = el("article", "gco-rw-saved-choice"), info = el("div", ""); info.append(el("strong", "", item.title), el("p", "gco-rw-note", (item.tag || "No topic tag") + " · " + item.url)); row.append(info, button("Attach", () => { const t = tags(item); if (!t.some(x => x.toLowerCase() === session.topic.toLowerCase())) t.push(session.topic); item.tag = t.join("; ").slice(0, 100); try { setResources(all); d.close(); refresh(); } catch (e) { alert("Could not attach this resource. Try again."); } }, "gco-rw-small")); body.appendChild(row); });
    foot.appendChild(button("Close", () => d.close(), "gco-rw-close-text"));
  }
  function legacyOwn(session, model) { const hub = model.topicLearningHub_v1 || {}, own = hub.own || {}; const key = session.id ? "id:" + session.id : text(session.subject, 80).toLowerCase() + "::" + text(session.topic, 140).toLowerCase(); const alt = text(session.subject, 80).toLowerCase() + "::" + text(session.topic, 140).toLowerCase(); return [...(Array.isArray(own[key]) ? own[key] : []), ...(key !== alt && Array.isArray(own[alt]) ? own[alt] : [])]; }
  function detach(item, topic) { const all = getResources(), stored = all.find(x => x && x.id === item.id); if (!stored) return; stored.tag = tags(stored).filter(x => x.toLowerCase() !== topic.toLowerCase()).join("; ").slice(0, 100); setResources(all); }
  function renderCard(card, session, model) {
    if (!session || !session.subject || !session.topic || card.classList.contains("kind-break")) return;
    const p = prefs(model), key = sessionKey(session), override = p.overrides[key], attached = override === "show" || (override !== "hide" && p.auto);
    const recommended = card.querySelectorAll(".session-resources"); recommended.forEach(x => { x.style.display = attached ? "" : "none"; });
    const rows = getResources().filter(x => x && !x.deleted && !x.archived && subjectMatch(x, session) && topicMatch(x, session));
    const legacy = legacyOwn(session, model);
    const signature = [key, attached, rows.map(x => x.id + ":" + (x.tag || "")).join(","), legacy.map(x => x && x.url).join(",")].join("|");
    const old = card.querySelector(".gco-session-library");
    if (old && old.dataset.signature === signature) return;
    if (old) old.remove();
    const panel = el("details", "gco-session-library"); panel.dataset.topic = session.topic; panel.dataset.subject = session.subject; panel.dataset.signature = signature;
    panel.appendChild(el("summary", "", "My resources for this topic · " + (rows.length + legacy.length)));
    panel.appendChild(el("p", "gco-rw-inline-note", "Personal third-party links saved to this topic. Open them inside GCSE ONTRACK where the provider allows it."));
    const list = el("div", "gco-session-library-list");
    rows.forEach(item => { const row = el("article", "gco-session-library-item"), main = el("div", "gco-session-library-main"); main.append(el("strong", "", item.title), el("span", "", item.url)); row.append(main, button("Open inside site", () => openResource(item.url, item.title), "gco-rw-small"), button("Remove from topic", () => { detach(item, session.topic); renderCard(card, session, readModel()); }, "gco-rw-remove")); list.appendChild(row); });
    legacy.forEach(item => { if (!item || !safeUrl(item.url)) return; const row = el("article", "gco-session-library-item"), main = el("div", "gco-session-library-main"); main.append(el("strong", "", item.title || "Previously saved resource"), el("span", "", item.type || "Saved link · retained from the previous resource panel")); row.append(main, button("Open inside site", () => openResource(item.url, item.title), "gco-rw-small")); list.appendChild(row); });
    if (!rows.length && !legacy.length) list.appendChild(el("p", "gco-rw-empty", "No personal links are attached yet. Use Add resource or Attach saved."));
    panel.appendChild(list);
    const actions = el("div", "gco-session-library-actions"); actions.append(button("＋ Add resource", () => addDialog(session, () => { card.querySelector(".gco-session-library")?.remove(); renderCard(card, session, readModel()); }), "gco-rw-primary"), button("Attach saved", () => attachDialog(session, () => { card.querySelector(".gco-session-library")?.remove(); renderCard(card, session, readModel()); }), "gco-rw-secondary"));
    if (!attached && recommended.length) actions.append(button("＋ Show recommended links", () => { const m = readModel(), q = prefs(m); q.overrides[key] = "show"; savePrefs(m, q); updatePanels(); }, "gco-rw-secondary"));
    else if (attached && recommended.length) actions.append(button("Hide recommendations for this topic", () => { const m = readModel(), q = prefs(m); q.overrides[key] = "hide"; savePrefs(m, q); updatePanels(); }, "gco-rw-secondary"));
    panel.appendChild(actions); const actionHost = card.querySelector(".session-actions"); if (actionHost) card.insertBefore(panel, actionHost); else card.appendChild(panel);
  }
  function updatePanels() {
    const host = $("#weeklySchedule"); if (!host) return;
    const model = readModel();
    if (!$("#gcoResourceSettings")) insertSettings();
    $$(".timetable-session-card", host).forEach(card => {
      const session = sessionFrom(card, model);
      if (session) renderCard(card, session, model);
    });
  }
  function intercept(event) { const a = event.target.closest("a[href]"); if (!a) return; if (!(a.closest(".session-resources") || a.closest("#resourceGrid") || a.closest(".resource-card"))) return; const url = safeUrl(a.href); if (!url || new URL(url).origin === location.origin) return; event.preventDefault(); openResource(url, a.textContent.trim() || "Third-party resource"); }
  function insertSettings() {
    const host = $("#weeklySchedule"); if (!host || $("#gcoResourceSettings")) return;
    const model = readModel(), p = prefs(model), box = el("section", "gco-resource-settings"); box.id = "gcoResourceSettings";
    const label = el("label", "gco-resource-settings-label"), input = document.createElement("input"); input.type = "checkbox"; input.checked = p.auto; label.append(input, el("span", "", "Automatically show recommended third-party links in timetable sessions"));
    box.append(label, el("p", "", "Turn this off to keep sessions uncluttered. You can still show recommendations for individual topics or attach your own saved links."));
    input.addEventListener("change", () => { const m = readModel(), next = prefs(m); next.auto = input.checked; try { savePrefs(m, next); updatePanels(); } catch (e) { input.checked = !input.checked; alert("Your preference could not be saved. Try again."); } });
    const parent = host.closest(".timetable-panel") || host.parentElement; parent.insertBefore(box, host);
  }
  function install() {
    document.addEventListener("click", intercept, true); updatePanels(); const host = $("#weeklySchedule");
    if (host && !observer) { observer = new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; updatePanels(); }); }); observer.observe(host, { childList: true, subtree: true }); }
  }
  document.addEventListener("DOMContentLoaded", install, { once: true }); if (document.readyState !== "loading") install();
})();
