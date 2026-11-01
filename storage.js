/* GCSE ONTRACK — shared, backwards-compatible browser storage.
 * Existing legacy data is copied forward, never deleted or overwritten.
 */
(() => {
  "use strict";

  const LEGACY_KEY = "gcseOnTrack_vFinal";

  function readLegacyData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (error) {
      console.warn("GCSE ONTRACK: legacy storage could not be read.", error);
      return {};
    }
  }

  function readData() {
    return readLegacyData();
  }

  function writeData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new TypeError("Storage data must be an object.");
    }
    localStorage.setItem(LEGACY_KEY, JSON.stringify(data));
  }

  function migrateLegacyCollections() {
    const legacy = readLegacyData();

    Object.entries(legacy).forEach(([key, value]) => {
      if (!/^[A-Za-z0-9:_-]{1,80}$/.test(key)) return;

      // A current top-level value always wins. Never overwrite it.
      if (localStorage.getItem(key) !== null) return;

      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // The untouched legacy object remains available as a recovery copy.
        console.warn(`GCSE ONTRACK: could not migrate "${key}" yet.`, error);
      }
    });
  }

  function readStoredValue(key) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        return { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: true, value: null };
      }
    }

    const legacy = readLegacyData();
    return Object.prototype.hasOwnProperty.call(legacy, key)
      ? { found: true, value: legacy[key] }
      : { found: false, value: null };
  }

  function getCollection(key) {
    const stored = readStoredValue(key);
    return Array.isArray(stored.value) ? stored.value : [];
  }

  function setCollection(key, value) {
    if (typeof key !== "string" || !/^[A-Za-z0-9:_-]{1,80}$/.test(key)) {
      throw new TypeError("Invalid storage collection key.");
    }
    if (!Array.isArray(value)) {
      throw new TypeError("Collection data must be an array.");
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix = "item") {
    const randomPart = window.crypto?.randomUUID
      ? window.crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    const safePrefix = String(prefix).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "item";
    return `${safePrefix}_${randomPart}`;
  }

  function esc(value) {
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  function dateText(value) {
    if (!value) return "Never";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Never"
      : date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });
  }

  // Migrate before page-specific scripts (such as the dashboard) read data.
  migrateLegacyCollections();

  Object.assign(window, {
    readData,
    writeData,
    getCollection,
    setCollection,
    uid,
    esc,
    dateText
  });

  document.addEventListener("DOMContentLoaded", () => {
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach(link => {
      if (link.getAttribute("href") === page) link.classList.add("active");
    });
  });
})();
