/* GCSE ONTRACK — in-site resource viewer.
 * Opens topic videos, practice pages and PDFs inside an accessible dialog.
 * It does not proxy providers or bypass their frame/security restrictions.
 */
(() => {
  "use strict";

  const HOST_ID = "weeklySchedule";
  const VIEWER_ID = "gcoResourceViewer";
  const ALLOWED_PROTOCOLS = new Set(["https:"]);

  const clean = (value, max = 180) => String(value ?? "").trim().slice(0, max);

  function safeHttpsUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function youtubeEmbedUrl(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      let id = "";

      if (host === "youtu.be") {
        id = url.pathname.split("/").filter(Boolean)[0] || "";
      } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
        if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
        else {
          const parts = url.pathname.split("/").filter(Boolean);
          if (["embed", "shorts", "live"].includes(parts[0])) id = parts[1] || "";
        }
      }

      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return "";
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    } catch {
      return "";
    }
  }

  function resourceKind(link, role) {
    const url = link.href.split("?")[0].toLowerCase();
    const label = `${role} ${link.textContent || ""}`.toLowerCase();
    if (youtubeEmbedUrl(link.href) || /video|lesson/.test(label)) return "video";
    if (url.endsWith(".pdf") || /past paper|question paper|mark scheme|pdf/.test(label)) return "document";
    return "practice";
  }

  function addStyles() {
    if (document.getElementById("gcoResourceViewerStyles")) return;
    const style = document.createElement("style");
    style.id = "gcoResourceViewerStyles";
    style.textContent = `
      dialog.gco-resource-viewer {
        width: min(1040px, calc(100vw - 24px));
        max-width: none;
        max-height: calc(100dvh - 24px);
        padding: 0;
        border: 0;
        border-radius: 18px;
        overflow: hidden;
        background: #fff;
        color: #142033;
        box-shadow: 0 24px 80px rgba(0,0,0,.34);
      }
      dialog.gco-resource-viewer::backdrop {
        background: rgba(7, 14, 30, .76);
        backdrop-filter: blur(4px);
      }
      .gco-rv-shell { display: grid; grid-template-rows: auto minmax(240px, 1fr) auto; max-height: calc(100dvh - 24px); }
      .gco-rv-head { display:flex; align-items:center; gap:14px; padding:14px 18px; border-bottom:1px solid #e6eaf0; }
      .gco-rv-heading { min-width:0; flex:1; }
      .gco-rv-type { display:inline-block; margin-bottom:4px; color:#087b78; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
      .gco-rv-title { margin:0; font-size:16px; line-height:1.3; overflow-wrap:anywhere; }
      .gco-rv-close { flex:0 0 auto; width:40px; height:40px; border:0; border-radius:12px; background:#edf2f7; color:#182438; font-size:25px; line-height:1; cursor:pointer; }
      .gco-rv-close:hover { background:#dfe8f0; }
      .gco-rv-frame-wrap { min-height:0; height:min(68vh, 700px); background:#101827; }
      .gco-resource-viewer.is-video .gco-rv-frame-wrap { height:auto; aspect-ratio:16/9; min-height:0; max-height:min(68vh, 600px); }
      .gco-rv-frame { display:block; width:100%; height:100%; min-height:0; border:0; background:#fff; }
      .gco-rv-foot { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 16px; border-top:1px solid #e6eaf0; }
      .gco-rv-note { margin:0; color:#536174; font-size:12px; line-height:1.45; }
      .gco-rv-fallback { display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; min-height:40px; padding:9px 13px; border-radius:10px; background:#0a7775; color:#fff; font-size:13px; font-weight:700; text-decoration:none; }
      .gco-rv-fallback:hover { background:#075e5d; }
      @media (max-width:640px) {
        dialog.gco-resource-viewer { width:calc(100vw - 12px); max-height:calc(100dvh - 12px); border-radius:14px; }
        .gco-rv-shell { max-height:calc(100dvh - 12px); grid-template-rows:auto minmax(220px,1fr) auto; }
        .gco-rv-head { padding:11px 12px; gap:8px; }
        .gco-rv-title { font-size:14px; }
        .gco-rv-close { width:36px; height:36px; }
        .gco-rv-frame-wrap { height:68dvh; }
        .gco-resource-viewer.is-video .gco-rv-frame-wrap { height:auto; max-height:58dvh; }
        .gco-rv-foot { align-items:stretch; flex-direction:column; padding:10px 12px; gap:8px; }
        .gco-rv-fallback { width:100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function createViewer() {
    const existing = document.getElementById(VIEWER_ID);
    if (existing) return existing;

    const dialog = document.createElement("dialog");
    dialog.id = VIEWER_ID;
    dialog.className = "gco-resource-viewer";
    dialog.setAttribute("aria-labelledby", "gcoResourceViewerTitle");

    const shell = document.createElement("div");
    shell.className = "gco-rv-shell";

    const header = document.createElement("header");
    header.className = "gco-rv-head";
    const heading = document.createElement("div");
    heading.className = "gco-rv-heading";
    const type = document.createElement("span");
    type.className = "gco-rv-type";
    type.id = "gcoResourceViewerType";
    const title = document.createElement("h2");
    title.className = "gco-rv-title";
    title.id = "gcoResourceViewerTitle";
    heading.append(type, title);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "gco-rv-close";
    close.setAttribute("aria-label", "Close resource viewer");
    close.title = "Return to timetable";
    close.textContent = "×";
    close.addEventListener("click", () => dialog.close());
    header.append(heading, close);

    const frameWrap = document.createElement("div");
    frameWrap.className = "gco-rv-frame-wrap";
    frameWrap.id = "gcoResourceViewerFrameWrap";

    const footer = document.createElement("footer");
    footer.className = "gco-rv-foot";
    const note = document.createElement("p");
    note.className = "gco-rv-note";
    note.textContent = "Displayed inside GCSE ONTRACK where the provider permits embedding. Some providers may block this view or require sign-in.";
    const fallback = document.createElement("a");
    fallback.className = "gco-rv-fallback";
    fallback.id = "gcoResourceViewerFallback";
    fallback.target = "_blank";
    fallback.rel = "noopener noreferrer";
    fallback.textContent = "Open provider page in a new tab";
    footer.append(note, fallback);

    shell.append(header, frameWrap, footer);
    dialog.appendChild(shell);
    dialog.addEventListener("close", () => {
      const frame = dialog.querySelector("iframe.gco-rv-frame");
      if (frame) frame.src = "about:blank";
      frameWrap.replaceChildren();
      dialog.classList.remove("is-video");
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function openResource(link) {
    const originalUrl = safeHttpsUrl(link.href);
    if (!originalUrl) return;

    const card = link.closest(".session-resource-item, .gco-topic-resource-item, article");
    const role = clean(card?.querySelector(".resource-role, .topic-guide-resource-role")?.textContent, 80);
    const title = clean(link.textContent, 180) || "Revision resource";
    const kind = resourceKind(link, role);
    const embedUrl = youtubeEmbedUrl(originalUrl) || originalUrl;
    const dialog = createViewer();
    const frameWrap = dialog.querySelector("#gcoResourceViewerFrameWrap");
    const fallback = dialog.querySelector("#gcoResourceViewerFallback");

    dialog.querySelector("#gcoResourceViewerType").textContent = kind === "video"
      ? "Video lesson" : kind === "document" ? "Past paper / document" : "Practice / flashcards";
    dialog.querySelector("#gcoResourceViewerTitle").textContent = title;
    fallback.href = originalUrl;
    frameWrap.replaceChildren();

    const frame = document.createElement("iframe");
    frame.className = "gco-rv-frame";
    frame.title = `${title} — displayed inside GCSE ONTRACK`;
    frame.src = embedUrl;
    frame.loading = "eager";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    // Keep ordinary practice-page navigation inside the embedded frame.
    // Do not grant top-navigation or popup permissions to third-party pages.
    if (kind === "practice") frame.setAttribute("sandbox", "allow-forms allow-scripts allow-same-origin");
    frameWrap.appendChild(frame);
    dialog.classList.toggle("is-video", kind === "video");

    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else window.open(originalUrl, "_blank", "noopener,noreferrer");
    }
  }

  function install() {
    const host = document.getElementById(HOST_ID);
    if (!host || host.dataset.gcoResourceViewerInstalled === "true") return;
    addStyles();
    createViewer();

    host.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a.session-resource-link");
      if (!link || !host.contains(link)) return;
      const url = safeHttpsUrl(link.href);
      if (!url) return;
      event.preventDefault();
      openResource(link);
    });

    host.dataset.gcoResourceViewerInstalled = "true";
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  if (document.readyState !== "loading") install();

  if (window.__GCO_RESOURCE_VIEWER_TEST_MODE__ === true) {
    window.GCOResourceViewerTest = Object.freeze({ safeHttpsUrl, youtubeEmbedUrl, resourceKind });
  }
})();
