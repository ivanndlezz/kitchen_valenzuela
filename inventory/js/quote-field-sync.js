/**
 * quote-field-sync.js
 * Keeps quote line fields connected to product data until a quote line
 * explicitly overrides a field.
 */

(function () {
  const RETROACTIVE = "retroactive";
  const STANDALONE = "standalone";
  const SYNC_FIELDS = [
    "unitPrice",
    "baseCost",
    "transferCost",
    "currency",
    "exchangeRate",
    "deliveryNote",
    "utilityType",
    "utilityValue"
  ];

  const DEFAULT_FIELD_BEHAVIOR = SYNC_FIELDS.reduce((map, field) => {
    map[field] = RETROACTIVE;
    return map;
  }, {});

  function firstNumber(...values) {
    for (const value of values) {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) return num;
    }
    return 0;
  }

  function normalizeCurrency(value) {
    return String(value || "MXN").toUpperCase() === "USD" ? "USD" : "MXN";
  }

  function normalizeUtilityType(value) {
    return String(value || "percent") === "amount" ? "amount" : "percent";
  }

  function getProductQuoteSnapshot(product = {}) {
    const currency = normalizeCurrency(product.quoteCurrency || product.currency || "MXN");
    const exchangeRate = Number(product.quoteExchangeRate || product.exchangeRate) || 1;

    return {
      unitPrice: firstNumber(
        product.precio,
        product.Precio,
        product.price,
        product.salePrice,
        product.sale_price,
        product.precioVenta,
        product.precio_venta
      ),
      baseCost: firstNumber(
        product.costo,
        product.Costo,
        product.cost,
        product.baseCost,
        product.base_cost
      ),
      transferCost: firstNumber(
        product.CostoEnvio,
        product.costoEnvio,
        product.costoTraslado,
        product.costo_traslado,
        product.transferCost,
        product.transfer_cost,
        product.shippingCost,
        product.shipping_cost,
        product.traslado
      ),
      currency,
      exchangeRate,
      deliveryNote: product.deliveryNote || "",
      utilityType: normalizeUtilityType(product.quoteUtilityType || product.quote_utility_type),
      utilityValue: firstNumber(
        product.quoteUtilityValue,
        product.quote_utility_value,
        product.utilityValue,
        product.utility_value,
        product.utilidadEsperada,
        product.utilidad_esperada
      )
    };
  }

  function normalizeFieldBehavior(behavior = {}) {
    return SYNC_FIELDS.reduce((map, field) => {
      map[field] = behavior?.[field] === STANDALONE ? STANDALONE : RETROACTIVE;
      return map;
    }, {});
  }

  function ensureLineFieldBehavior(line) {
    if (!line || typeof line !== "object") return normalizeFieldBehavior();
    line.fieldBehavior = normalizeFieldBehavior(line.fieldBehavior);
    return line.fieldBehavior;
  }

  function isSyncedField(field) {
    return SYNC_FIELDS.includes(field);
  }

  function markStandalone(line, field) {
    if (!line || !isSyncedField(field)) return line;
    const behavior = ensureLineFieldBehavior(line);
    behavior[field] = STANDALONE;
    return line;
  }

  function markRetroactive(line, field) {
    if (!line || !isSyncedField(field)) return line;
    const behavior = ensureLineFieldBehavior(line);
    behavior[field] = RETROACTIVE;
    return line;
  }

  function collectProductKeys(source = {}) {
    source = source || {};
    const product = source.product || source;
    return [
      source.productId,
      source.id,
      source.codigo,
      source.code,
      product.id,
      product.codigo,
      product.productId,
      product.code,
      product.Codigo
    ]
      .filter(value => value !== undefined && value !== null && value !== "")
      .map(value => String(value));
  }

  function productMatchesLine(product, line) {
    const productKeys = new Set(collectProductKeys(product));
    return collectProductKeys(line).some(key => productKeys.has(key));
  }

  function applyProductToLine(line, product, options = {}) {
    if (!line || !product) return line;

    const behavior = ensureLineFieldBehavior(line);
    const mergedProduct = { ...(line.product || {}), ...product };
    const snapshot = getProductQuoteSnapshot(mergedProduct);

    line.product = mergedProduct;
    if (!line.productId) line.productId = mergedProduct.codigo || mergedProduct.id || "";

    SYNC_FIELDS.forEach((field) => {
      if (options.force || behavior[field] !== STANDALONE) {
        line[field] = snapshot[field];
      }
    });

    return line;
  }

  function syncActiveQuoteFromProduct(product, options = {}) {
    if (!product || !Array.isArray(window.AppState?.quoteItems)) return false;

    let changed = false;
    window.AppState.quoteItems = window.AppState.quoteItems.map((line) => {
      if (!productMatchesLine(product, line)) return line;
      changed = true;
      return applyProductToLine(line, product, options);
    });

    if (!changed) return false;

    if (typeof window.renderQuoteTable === "function") {
      window.renderQuoteTable();
    } else if (typeof window.recalculateQuote === "function") {
      window.recalculateQuote();
    }

    if (options.persist !== false && typeof window.saveDraftQuotation === "function") {
      window.saveDraftQuotation();
    }

    return true;
  }

  function emitProductUpdated(product, source = "product") {
    if (!product) return;
    window.dispatchEvent(new CustomEvent("product:updated", {
      detail: {
        product,
        productId: product.id || product.codigo || product.productId || "",
        source
      }
    }));
  }

  window.addEventListener("product:updated", (event) => {
    syncActiveQuoteFromProduct(event.detail?.product, { source: event.detail?.source });
  });

  window.QuoteFieldSync = {
    RETROACTIVE,
    STANDALONE,
    SYNC_FIELDS,
    DEFAULT_FIELD_BEHAVIOR,
    getProductQuoteSnapshot,
    normalizeFieldBehavior,
    ensureLineFieldBehavior,
    isSyncedField,
    markStandalone,
    markRetroactive,
    applyProductToLine,
    syncActiveQuoteFromProduct,
    emitProductUpdated
  };
})();
