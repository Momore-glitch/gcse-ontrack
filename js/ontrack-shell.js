/* GCSE ONTRACK — unified navigation and shared site shell. */
(() => {
  "use strict";
  const links = [["index.html", "Home"], ["plan.html", "Planner"], ["timetable.html", "Timetable"], ["progress.html", "Progress"], ["resources.html", "Resource Centre"]];
  const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  function link(href, label) {
    const a = document.createElement("a"); a.href = href; a.textContent = label;
    if (href === current) { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
    return a;
  }
  function install() {
    document.querySelectorAll("nav").forEach(old => {
      const nav = document.createElement("nav"); nav.className = "gco-main-nav"; nav.setAttribute("aria-label", "Main navigation");
      const brand = link("index.html", "GCSE ONTRACK"); brand.className = "gco-brand-link"; brand.setAttribute("aria-label", "GCSE ONTRACK home"); nav.appendChild(brand);
      const primary = document.createElement("div"); primary.className = "gco-nav-primary"; links.forEach(x => primary.appendChild(link(x[0], x[1]))); nav.appendChild(primary);
      const more = document.createElement("details"); more.className = "gco-nav-more"; const summary = document.createElement("summary"); summary.textContent = "More"; more.appendChild(summary);
      const menu = document.createElement("div"); menu.className = "gco-nav-menu";
      [["past-papers.html", "Papers & video lessons"], ["guides.html", "Study guides"], ["account.html", "Account"], ["subscription.html", "Membership"]].forEach(x => menu.appendChild(link(x[0], x[1])));
      more.appendChild(menu); nav.appendChild(more); old.replaceWith(nav);
    });
    document.body.classList.add("gco-app"); document.body.dataset.gcoPage = current.replace(".html", "");
  }
  document.addEventListener("DOMContentLoaded", install, { once: true });
})();
