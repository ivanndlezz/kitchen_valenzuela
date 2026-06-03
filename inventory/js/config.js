// config.js — Global configuration constants & helpers
window.Config = window.Config || {};
window.Config.IMAGE_BASE_URL = "https://kitchencleanvalenzuela.net/assets/uploads/";
window.Config.CLIENTS_TABLE = "clients";


/**
 * Resolve a product image filename to a full URL.
 * If the value already starts with "http", return as-is.
 * If it's "no_image.png" or empty, return null (caller shows fallback).
 * Otherwise, prepend IMAGE_BASE_URL.
 */
window.Config.resolveImageUrl = function (raw) {
  if (!raw || raw === "no_image.png") return null;
  if (raw.startsWith("http")) return raw;
  return window.Config.IMAGE_BASE_URL + raw;
};
