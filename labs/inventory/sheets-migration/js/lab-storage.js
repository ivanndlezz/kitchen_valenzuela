/**
 * lab-storage.js
 * Isolates this migration lab from the production Inventory localStorage keys.
 */

(function () {
  const prefix = "kv-lab-sheets:";
  const shouldPrefix = (key) => {
    return typeof key === "string" && (
      key.startsWith("kv-") ||
      key === "reviewEnabled"
    );
  };

  const normalizeKey = (key) => {
    if (!shouldPrefix(key) || key.startsWith(prefix)) return key;
    return `${prefix}${key}`;
  };

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.getItem = function (key) {
    return originalGetItem.call(this, normalizeKey(key));
  };

  Storage.prototype.setItem = function (key, value) {
    return originalSetItem.call(this, normalizeKey(key), value);
  };

  Storage.prototype.removeItem = function (key) {
    return originalRemoveItem.call(this, normalizeKey(key));
  };

  window.InventoryLabStorage = {
    prefix,
    normalizeKey,
  };
})();
