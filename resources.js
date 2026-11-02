/* GCSE ONTRACK — secure Resource Library.
 * Dynamic content is built with textContent and DOM attributes, not inline HTML.
 */
(() => {
  "use strict";

  const RESOURCE_KEY = "resources";
  const $ = id => document.getElementById(id);
  const COLOURS = {
    Maths: "#2563eb",
    English: "#7c3aed",
    Biology: "#16a34a",
    Chemistry: "#06b6d4",
    Physics: "#f59e0b",
    History: "#dc2626",
    Geography: "#059669",
    Business: "#9333ea",
    "Computer Science": "#0ea5e9"
  };

  let resources = getCollection(RESOURCE_KEY).map(item => normalise(item));
  let currentSearch = "";
  let currentSubject = "All Subjects";
  let currentSort = "newest";
  let openNewTab = true;
  let showArchived = false;
  let showDeleted = false;

  function cleanText(value, maxLength, fallback = "") {
    return String(value ?? fallback).trim().slice(0, maxLength);
  }

  function safeHttpUrl(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol)) return "";
      if (!url.hostname || url.username || url.password) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function normalise(item) {
    const source = item && typeof item === "object" && !Array.isArray(item)
      ? item
      : {};
    const rawId = String(source.id ?? "");
    const id = /^[A-Za-z0-9_-]{1,80}$/.test(rawId) ? rawId : uid("res");
    const rawPriority = String(source.priority ?? "Medium");
    const rating = Number(source.rating);
    const created = Number(source.created);
    const subject = cleanText(source.subject, 60, "General") || "General";
    const relatedSubjects = Array.isArray(source.relatedSubjects)
      ? [...new Set(source.relatedSubjects.map(value => cleanText(value, 60)).filter(value => value && value !== subject))].slice(0, 20)
      : [];

    return {
      id,
      shortId: /^[A-Z0-9]{3,12}$/.test(String(source.shortId ?? ""))
        ? String(source.shortId)
        : Math.random().toString(36).slice(2, 8).toUpperCase(),
      title: cleanText(source.title, 140, "Untitled resource") || "Untitled resource",
      // Unsafe or malformed legacy URLs are retained as records but no longer linked.
      url: safeHttpUrl(source.url),
      subject,
      relatedSubjects,
      tag: cleanText(source.tag, 100),
      note: cleanText(source.note, 1200),
      priority: ["High", "Medium", "Low"].includes(rawPriority) ? rawPriority : "Medium",
      rating: Number.isFinite(rating) ? Math.max(1, Math.min(5, rating)) : 3,
      favourite: Boolean(source.favourite),
      pinned: Boolean(source.pinned),
      archived: Boolean(source.archived),
      deleted: Boolean(source.deleted),
      deletedDate: source.deletedDate || null,
      clicks: Math.max(0, Number(source.clicks) || 0),
      created: Number.isFinite(created) && created > 0 ? created : Date.now(),
      lastEdited: source.lastEdited || null,
      lastOpened: source.lastOpened || null
    };
  }

  function snapshot() {
    return resources.map(item => ({ ...item }));
  }

  function saveResources(previous = null) {
    try {
      setCollection(RESOURCE_KEY, resources);
      return true;
    } catch (error) {
      if (previous) resources = previous;
      console.error("GCSE ONTRACK Resource Library save failed:", error);
      alert("Your browser could not save this change. Export your library if possible, then free some browser storage and try again.");
      return false;
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function makeAction(label, action, item, className = "btn secondary small") {
    const button = element("button", className, label);
    button.type = "button";
    button.dataset.resourceAction = action;
    button.dataset.resourceId = item.id;
    return button;
  }

  function addBadge(host, text) {
    host.appendChild(element("span", "badge", text));
  }

  function clearForm() {
    ["titleInput", "urlInput", "tagInput", "noteInput"].forEach(id => {
      if ($(id)) $(id).value = "";
    });
    if ($("subjectInput")) $("subjectInput").value = "";
    if ($("priorityInput")) $("priorityInput").value = "Medium";
    if ($("ratingInput")) $("ratingInput").value = "3";
  }

  function addResource() {
    const subject = $("subjectInput")?.value.trim() || "";
    const title = $("titleInput")?.value.trim() || "";
    const rawUrl = $("urlInput")?.value.trim() || "";
    const urlInput = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const url = safeHttpUrl(urlInput);

    if (!subject) return alert("Choose a subject.");
    if (!title) return alert("Enter a resource title.");
    if (title.length > 140) return alert("Keep the resource title to 140 characters or fewer.");
    if (!url) return alert("Enter a valid http or https resource link.");
    if (resources.some(item => !item.deleted && item.url === url)) {
      return alert("That resource is already in your library.");
    }

    const previous = snapshot();
    resources.unshift({
      id: uid("res"),
      shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
      title,
      url,
      subject: cleanText(subject, 60, "General"),
      tag: cleanText($("tagInput")?.value, 100),
      note: cleanText($("noteInput")?.value, 1200),
      priority: ["High", "Medium", "Low"].includes($("priorityInput")?.value)
        ? $("priorityInput").value
        : "Medium",
      rating: Math.max(1, Math.min(5, Number($("ratingInput")?.value) || 3)),
      favourite: false,
      pinned: false,
      archived: false,
      deleted: false,
      deletedDate: null,
      clicks: 0,
      created: Date.now(),
      lastEdited: null,
      lastOpened: null
    });

    if (!saveResources(previous)) return;
    clearForm();
    showArchived = false;
    showDeleted = false;
    renderResources();
  }

  function getFilteredResources() {
    let list = resources.filter(item => showDeleted
      ? item.deleted
      : showArchived
        ? item.archived && !item.deleted
        : !item.archived && !item.deleted);

    if (currentSearch) {
      const query = currentSearch.toLowerCase();
      list = list.filter(item =>
        [item.title, item.subject, ...item.relatedSubjects, item.tag, item.note, item.url, item.priority]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (currentSubject !== "All Subjects") {
      list = list.filter(item => item.subject === currentSubject || item.relatedSubjects.includes(currentSubject));
    }

    const priority = { High: 3, Medium: 2, Low: 1 };
    const sorters = {
      newest: (a, b) => b.created - a.created,
      oldest: (a, b) => a.created - b.created,
      alphabetical: (a, b) => a.title.localeCompare(b.title),
      mostOpened: (a, b) => b.clicks - a.clicks,
      recentlyEdited: (a, b) => (b.lastEdited || 0) - (a.lastEdited || 0),
      favourites: (a, b) => Number(b.favourite) - Number(a.favourite),
      rating: (a, b) => b.rating - a.rating,
      priority: (a, b) => priority[b.priority] - priority[a.priority]
    };

    const sorter = sorters[currentSort] || sorters.newest;
    return list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || sorter(a, b));
  }

  function renderResources() {
    const grid = $("resourceGrid");
    if (!grid) return;

    const list = getFilteredResources();
    $("resultsText").textContent = `${list.length} shown • ${resources.length} total • ${resources.filter(item => item.archived && !item.deleted).length} archived • ${resources.filter(item => item.deleted).length} deleted`;
    grid.replaceChildren();

    if (!list.length) {
      const empty = element("div", "empty");
      empty.appendChild(element("h2", "", showDeleted ? "Recycle Bin is empty" : showArchived ? "Archive is empty" : "No resources found"));
      empty.appendChild(element("p", "", "Try another filter or add a resource."));
      grid.appendChild(empty);
      updateResourceStats();
      return;
    }

    list.forEach(item => {
      const card = element("article", "card");
      card.style.borderLeft = `7px solid ${COLOURS[item.subject] || "var(--primary)"}`;

      const badges = element("div", "actions");
      if (item.pinned) addBadge(badges, "📌 PINNED");
      if (Date.now() - item.created < 7 * 86400000 && !item.deleted) addBadge(badges, "🆕 NEW");
      addBadge(badges, item.subject);
      addBadge(badges, `${item.priority} Priority`);
      addBadge(badges, `⭐ ${item.rating}/5`);
      card.appendChild(badges);

      card.appendChild(element("h2", "", item.title));
      card.appendChild(element("div", "muted", `${item.shortId}${item.tag ? ` • ${item.tag}` : ""}`));
      if (item.relatedSubjects.length) {
        card.appendChild(element("div", "muted", `Also linked to: ${item.relatedSubjects.join(", ")}`));
      }
      card.appendChild(element("p", "", item.note || "No notes."));

      if (item.url) {
        const link = element("a", "", item.url);
        link.href = item.url;
        link.target = openNewTab ? "_blank" : "_self";
        link.rel = "noopener noreferrer";
        link.addEventListener("click", () => trackResourceOpen(item.id));
        card.appendChild(link);

        let host = "";
        try { host = new URL(item.url).hostname.replace(/^www\./, ""); } catch { /* URL already validated. */ }
        card.appendChild(element("div", "muted", `🌐 ${host}`));
      } else {
        card.appendChild(element("p", "muted", "This saved record has no safe web link. Edit it to add a valid link."));
      }

      const actions = element("div", "actions");
      actions.style.marginTop = "16px";
      if (item.deleted) {
        actions.append(
          makeAction("♻ Restore", "restore-deleted", item, "btn success small"),
          makeAction("🗑 Delete Forever", "delete-forever", item, "btn danger small")
        );
      } else if (item.archived) {
        actions.append(makeAction("↩ Restore", "restore-archived", item, "btn success small"));
      } else {
        actions.append(
          makeAction("✏ Edit", "edit", item),
          ...(item.url ? [makeAction("📋 Copy", "copy", item)] : []),
          makeAction(item.pinned ? "📌 Unpin" : "📍 Pin", "pin", item),
          makeAction(item.favourite ? "⭐ Unfavourite" : "☆ Favourite", "favourite", item),
          makeAction("🗄 Archive", "archive", item, "btn warning small"),
          makeAction("🗑 Delete", "delete", item, "btn danger small")
        );
      }
      card.appendChild(actions);

      const meta = element("div", "muted");
      meta.style.marginTop = "15px";
      meta.style.fontSize = "13px";
      meta.style.display = "flex";
      meta.style.gap = "14px";
      meta.style.flexWrap = "wrap";
      [
        `📅 Added ${dateText(item.created)}`,
        `✏ Edited ${dateText(item.lastEdited)}`,
        `🕒 Last opened ${dateText(item.lastOpened)}`,
        `👆 ${item.clicks} opens`
      ].forEach(value => meta.appendChild(element("span", "", value)));
      card.appendChild(meta);
      grid.appendChild(card);
    });

    updateResourceStats();
  }

  function updateResourceStats() {
    if ($("totalResources")) $("totalResources").textContent = resources.filter(item => !item.deleted && !item.archived).length;
    if ($("totalFavourites")) $("totalFavourites").textContent = resources.filter(item => item.favourite && !item.deleted).length;
    if ($("totalClicks")) $("totalClicks").textContent = resources.reduce((sum, item) => sum + item.clicks, 0);
    if ($("totalSubjects")) {
      const subjects = resources.filter(item => !item.deleted).flatMap(item => [item.subject, ...item.relatedSubjects]);
      $("totalSubjects").textContent = new Set(subjects).size;
    }
    if ($("archivedCount")) $("archivedCount").textContent = resources.filter(item => item.archived && !item.deleted).length;
    if ($("deletedCount")) $("deletedCount").textContent = resources.filter(item => item.deleted).length;
    if ($("libraryStatus")) $("libraryStatus").textContent = resources.length
      ? `${resources.length} resource${resources.length === 1 ? "" : "s"} stored in this browser.`
      : "Your library is empty.";
  }

  function editResource(id) {
    const item = resources.find(record => record.id === id);
    if (!item) return;

    const title = prompt("Title", item.title);
    if (title === null) return;
    const rawUrl = prompt("URL (must start with https:// or http://)", item.url);
    if (rawUrl === null) return;
    const url = safeHttpUrl(rawUrl);
    if (!url) return alert("That link is not valid. Only http and https links are allowed.");
    const tag = prompt("Topic / Tag", item.tag);
    if (tag === null) return;
    const note = prompt("Notes", item.note);
    if (note === null) return;
    if (!title.trim()) return alert("A resource title is required.");

    const previous = snapshot();
    Object.assign(item, {
      title: cleanText(title, 140),
      url,
      tag: cleanText(tag, 100),
      note: cleanText(note, 1200),
      lastEdited: Date.now()
    });
    if (saveResources(previous)) renderResources();
  }

  function mutateResource(id, action) {
    const item = resources.find(record => record.id === id);
    if (!item) return;

    if (action === "edit") return editResource(id);
    if (action === "copy") return copyResourceLink(id);
    if (action === "delete" && !confirm("Move this resource to the Recycle Bin?")) return;
    if (action === "archive" && !confirm("Archive this resource?")) return;
    if (action === "delete-forever" && !confirm("Permanently delete this resource? This cannot be undone.")) return;

    const previous = snapshot();
    switch (action) {
      case "pin": item.pinned = !item.pinned; break;
      case "favourite": item.favourite = !item.favourite; break;
      case "archive": item.archived = true; break;
      case "delete": item.deleted = true; item.deletedDate = Date.now(); break;
      case "restore-archived": item.archived = false; showArchived = false; break;
      case "restore-deleted": item.deleted = false; item.deletedDate = null; showDeleted = false; break;
      case "delete-forever": resources = resources.filter(record => record.id !== id); break;
      default: return;
    }

    if (saveResources(previous)) renderResources();
  }

  function trackResourceOpen(id) {
    const item = resources.find(record => record.id === id);
    if (!item) return;
    const previous = snapshot();
    item.clicks += 1;
    item.lastOpened = Date.now();
    saveResources(previous);
  }

  async function copyResourceLink(id) {
    const item = resources.find(record => record.id === id);
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.url);
      alert("Link copied.");
    } catch {
      prompt("Copy this link:", item.url);
    }
  }

  function exportResourceLibrary() {
    const blob = new Blob([JSON.stringify(resources, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gcse-ontrack-resources.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importResourceLibrary(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("This backup is larger than 2 MB. Please export smaller batches or check that you selected a GCSE ONTRACK resource backup.");
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("The backup must contain a list of resources.");
      if (parsed.length > 500) throw new Error("This backup contains more than 500 resources. Import a smaller backup batch.");

      const previous = snapshot();
      const knownUrls = new Set(resources.map(item => item.url).filter(Boolean));
      let added = 0;
      let skipped = 0;

      parsed.forEach(raw => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          skipped += 1;
          return;
        }
        const url = safeHttpUrl(raw.url);
        const title = cleanText(raw.title, 140);
        const subject = cleanText(raw.subject, 60, "General");
        if (!url || !title || !subject || knownUrls.has(url)) {
          skipped += 1;
          return;
        }

        const item = normalise({ ...raw, id: uid("res"), url, title, subject });
        item.id = uid("res"); // Imported IDs are never trusted or reused.
        resources.push(item);
        knownUrls.add(url);
        added += 1;
      });

      if (!added) {
        throw new Error("No new valid resources were found. Check that the file is a GCSE ONTRACK resource backup with http or https links.");
      }
      if (!saveResources(previous)) return;
      renderResources();
      alert(`Imported ${added} resource${added === 1 ? "" : "s"}.${skipped ? ` Skipped ${skipped} invalid or duplicate entr${skipped === 1 ? "y" : "ies"}.` : ""}`);
    } catch (error) {
      console.error("Resource backup import failed:", error);
      alert(error instanceof SyntaxError
        ? "This file is not valid JSON. Choose a GCSE ONTRACK resource backup."
        : error.message || "The resource backup could not be imported.");
    }
  }

  function openSelectedSubject() {
    const subject = $("subjectInput")?.value || "";
    if (!subject) return alert("Choose a subject.");
    const matches = resources.filter(item => (item.subject === subject || item.relatedSubjects.includes(subject)) && !item.deleted && !item.archived && item.url);
    if (!matches.length) return alert("No active resources with safe links were found for this subject.");
    if (openNewTab) {
      matches.forEach(item => window.open(item.url, "_blank", "noopener,noreferrer"));
    } else {
      window.location.assign(matches[0].url);
    }
  }

  function handleResourceAction(event) {
    const button = event.target.closest("button[data-resource-action]");
    if (!button) return;
    mutateResource(button.dataset.resourceId, button.dataset.resourceAction);
  }

  function start() {
    if (!$('resourceGrid')) return;

    // Records are normalised in memory for safe rendering. They are persisted
    // only after a real user change, so opening the page cannot overwrite data.
    resources = resources.map(normalise);

    $("addResourceBtn")?.addEventListener("click", addResource);
    $("searchInput")?.addEventListener("input", event => {
      currentSearch = event.target.value;
      renderResources();
    });
    $("subjectFilter")?.addEventListener("change", event => {
      currentSubject = event.target.value;
      renderResources();
    });
    $("sortSelect")?.addEventListener("change", event => {
      currentSort = event.target.value;
      renderResources();
    });
    $("resetFiltersBtn")?.addEventListener("click", () => {
      currentSearch = "";
      currentSubject = "All Subjects";
      currentSort = "newest";
      showArchived = false;
      showDeleted = false;
      $("searchInput").value = "";
      $("subjectFilter").value = "All Subjects";
      $("sortSelect").value = "newest";
      renderResources();
    });
    $("toggleTabMode")?.addEventListener("click", event => {
      openNewTab = !openNewTab;
      event.currentTarget.textContent = openNewTab ? "🌐 New Tab" : "📄 Same Tab";
    });
    $("exportBtn")?.addEventListener("click", exportResourceLibrary);
    $("importBtn")?.addEventListener("click", () => $("importFile")?.click());
    $("importFile")?.addEventListener("change", async event => {
      await importResourceLibrary(event.target.files?.[0]);
      event.target.value = "";
    });
    $("clearLibraryBtn")?.addEventListener("click", () => {
      if (!confirm("Delete every resource from this browser? Export a backup first if you may need these links later.")) return;
      const previous = snapshot();
      resources = [];
      if (saveResources(previous)) renderResources();
    });
    $("archiveBtn")?.addEventListener("click", () => {
      showArchived = true;
      showDeleted = false;
      renderResources();
    });
    $("recycleBinBtn")?.addEventListener("click", () => {
      showDeleted = true;
      showArchived = false;
      renderResources();
    });
    $("openSubjectBtn")?.addEventListener("click", openSelectedSubject);
    $("resourceGrid")?.addEventListener("click", handleResourceAction);

    renderResources();
  }

  document.addEventListener("DOMContentLoaded", start, { once: true });
})();
