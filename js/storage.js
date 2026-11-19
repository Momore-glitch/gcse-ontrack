/* GCSE ONTRACK — shared, backwards-compatible browser storage.
 * Existing legacy data is copied forward, never deleted or overwritten.
 * A separate recovery snapshot protects student data from accidental code changes.
 */
(() => {
  "use strict";

  const LEGACY_KEY = "gcseOnTrack_vFinal";
  const BACKUP_KEY = "gcoAutoBackup_v1";
  const APP_DATA_KEYS = [
    "gcseOnTrack_vFinal", "revisionPlan", "ontrack_timetable_final",
    "gcoStudyPlanner_v1", "resources", "progressData", "gcoFreeMistakes_v1",
    "premiumStudySessions", "premiumErrorBank"
  ];
  const MAX_BACKUP_CHARS = 1800000;
  let backupBusy = false;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeGetItem = Storage.prototype.getItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  const nativeClear = Storage.prototype.clear;

  function restoreMissingAppData() {
    try {
      const raw = nativeGetItem.call(localStorage, BACKUP_KEY);
      if (!raw) return;
      const backup = JSON.parse(raw);
      if (!backup || backup.version !== 1 || !backup.data || typeof backup.data !== "object") return;
      backupBusy = true;
      Object.entries(backup.data).forEach(([key, value]) => {
        if (!APP_DATA_KEYS.includes(key) || typeof value !== "string") return;
        if (nativeGetItem.call(localStorage, key) !== null) return;
        // Restore only missing keys. Existing values, including intentional [] or {}, win.
        nativeSetItem.call(localStorage, key, value);
      });
    } catch (error) {
      console.warn("GCSE ONTRACK: automatic recovery copy could not be restored.", error);
    } finally {
      backupBusy = false;
    }
  }

  function snapshotAppData() {
    if (backupBusy) return;
    const data = {};
    try {
      APP_DATA_KEYS.forEach(key => {
        const value = nativeGetItem.call(localStorage, key);
        if (value !== null) data[key] = value;
      });
      if (!Object.keys(data).length) return;
      const snapshot = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data });
      // Keep the last known-good snapshot if it is too large or browser quota is low.
      if (snapshot.length > MAX_BACKUP_CHARS) {
        console.warn("GCSE ONTRACK: automatic backup skipped because the data set is too large.");
        return;
      }
      backupBusy = true;
      nativeSetItem.call(localStorage, BACKUP_KEY, snapshot);
    } catch (error) {
      console.warn("GCSE ONTRACK: automatic backup could not be updated; existing data was left untouched.", error);
    } finally {
      backupBusy = false;
    }
  }

  function installDataProtection() {
    try {
      if (Storage.prototype.__gcoDataProtectionInstalled) return;
      Storage.prototype.setItem = function (key, value) {
        const result = nativeSetItem.call(this, key, value);
        if (this === localStorage && APP_DATA_KEYS.includes(String(key)) && !backupBusy) snapshotAppData();
        return result;
      };
      Storage.prototype.removeItem = function (key) {
        const result = nativeRemoveItem.call(this, key);
        if (this === localStorage && APP_DATA_KEYS.includes(String(key)) && !backupBusy) {
          restoreMissingAppData();
          snapshotAppData();
        }
        return result;
      };
      Storage.prototype.clear = function () {
        if (this !== localStorage) return nativeClear.call(this);
        const backup = nativeGetItem.call(localStorage, BACKUP_KEY);
        nativeClear.call(this);
        if (backup !== null) nativeSetItem.call(localStorage, BACKUP_KEY, backup);
        restoreMissingAppData();
        snapshotAppData();
      };
      Object.defineProperty(Storage.prototype, "__gcoDataProtectionInstalled", { value: true, configurable: false });
    } catch (error) {
      console.warn("GCSE ONTRACK: automatic data protection could not be installed.", error);
    }
  }

  // Run recovery before legacy migration and before page-specific scripts.
  restoreMissingAppData();
  installDataProtection();

  function readLegacyData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.warn("GCSE ONTRACK: legacy storage could not be read.", error);
      return {};
    }
  }

  function readData() {
    return readLegacyData();
  }

  function writeData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new TypeError("Storage data must be an object.");
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
      try { return { found: true, value: JSON.parse(raw) }; }
      catch { return { found: true, value: null }; }
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
    if (typeof key !== "string" || !/^[A-Za-z0-9:_-]{1,80}$/.test(key)) throw new TypeError("Invalid storage collection key.");
    if (!Array.isArray(value)) throw new TypeError("Collection data must be an array.");
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
    return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  // Migrate before page-specific scripts (such as the dashboard) read data.
  migrateLegacyCollections();
  snapshotAppData();

  Object.assign(window, { readData, writeData, getCollection, setCollection, uid, esc, dateText });

  document.addEventListener("DOMContentLoaded", () => {
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach(link => {
      if (link.getAttribute("href") === page) link.classList.add("active");
    });
  });
})();
