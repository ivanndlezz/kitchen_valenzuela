/**
 * taxonomy-reconciliation.js
 * Local report and alias helpers for imported Caja Soft taxonomy values.
 */

(function () {
  const REPORT_KEY = "kv-taxonomy-reconciliation-report";
  let configuredAliases = {};

  function normalizeToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function normalizeAliasConfig(rawAliases) {
    const aliases = {};
    const source = rawAliases && typeof rawAliases === "object" ? rawAliases : {};

    const singularScopes = {
      categories: "category",
      subcategories: "subcategory",
      brands: "brand",
      units: "unit",
    };

    ["categories", "subcategories", "brands", "units"].forEach((scope) => {
      aliases[scope] = {};
      const values = source[scope] || source[singularScopes[scope]] || {};

      if (Array.isArray(values)) {
        values.forEach((item) => {
          if (!item || typeof item !== "object") return;
          const from = String(item.from || item.origen || item.source || "").trim();
          const to = String(item.to || item.destino || item.target || "").trim();
          if (from && to) aliases[scope][normalizeToken(from)] = to;
        });
        return;
      }

      Object.entries(values || {}).forEach(([from, to]) => {
        const cleanFrom = String(from || "").trim();
        const cleanTo = String(to || "").trim();
        if (cleanFrom && cleanTo) aliases[scope][normalizeToken(cleanFrom)] = cleanTo;
      });
    });

    return aliases;
  }

  function setAliases(rawAliases) {
    configuredAliases = normalizeAliasConfig(rawAliases);
    return configuredAliases;
  }

  function getAliases() {
    const configAliases = window.ProductFormConfig?.TAXONOMY_ALIASES;
    if (configAliases && configAliases !== configuredAliases) {
      configuredAliases = normalizeAliasConfig(configAliases);
    }
    return configuredAliases;
  }

  function resolveAlias(scope, value) {
    const cleanScope = String(scope || "").trim();
    const cleanValue = String(value || "").trim();
    if (!cleanScope || !cleanValue) return "";
    return getAliases()[cleanScope]?.[normalizeToken(cleanValue)] || "";
  }

  function normalizeProduct(product) {
    if (!product) return product;
    const next = { ...product };
    const fields = [
      ["categories", "categoriaCodigo"],
      ["subcategories", "subCategoria"],
      ["brands", "marca"],
      ["units", "unitCode"],
      ["units", "saleUnitCode"],
      ["units", "purchaseUnitCode"],
    ];

    fields.forEach(([scope, key]) => {
      const alias = resolveAlias(scope, next[key]);
      if (alias) next[key] = alias;
    });

    return next;
  }

  function normalizeProducts(products) {
    return (products || []).map(normalizeProduct);
  }

  function makeDefinedIndex(scope) {
    const config = window.ProductFormConfig || {};
    const index = new Map();

    const add = (value, label) => {
      const token = normalizeToken(value);
      if (token) index.set(token, { value: String(value), label: String(label || value) });
    };

    if (scope === "brands") {
      (config.BRANDS || []).forEach((brand) => add(brand, brand));
    } else if (scope === "units") {
      Object.entries(config.UNITS || {}).forEach(([key, label]) => {
        add(key, label);
        add(label, label);
        add(String(label).replace(/\s*\([^)]*\)\s*/g, ""), label);
      });
    } else if (scope === "categories") {
      Object.entries(config.CATEGORIES || {}).forEach(([key, item]) => {
        const label = typeof item === "object" ? item.name : item;
        add(key, label);
        add(label, label);
      });
    } else if (scope === "subcategories") {
      Object.values(config.CATEGORIES || {}).forEach((item) => {
        (item?.subcategories || []).forEach((sub) => add(sub, sub));
      });
    }

    return index;
  }

  function makeExactDefinedIndex(scope) {
    const config = window.ProductFormConfig || {};
    const index = new Map();

    const add = (value, label) => {
      const token = normalizeToken(value);
      if (token) index.set(token, { value: String(value), label: String(label || value) });
    };

    if (scope === "brands") {
      (config.BRANDS || []).forEach((brand) => add(brand, brand));
    } else if (scope === "units") {
      Object.entries(config.UNITS || {}).forEach(([key, label]) => {
        add(key, label);
        add(label, label);
      });
    } else if (scope === "categories") {
      Object.entries(config.CATEGORIES || {}).forEach(([key, item]) => {
        const label = typeof item === "object" ? item.name : item;
        add(key, label);
        add(label, label);
      });
    } else if (scope === "subcategories") {
      Object.values(config.CATEGORIES || {}).forEach((item) => {
        (item?.subcategories || []).forEach((sub) => add(sub, sub));
      });
    }

    return index;
  }

  function addObserved(bucket, scope, value, product) {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return;
    const key = normalizeToken(cleanValue);
    if (!bucket[scope][key]) {
      bucket[scope][key] = {
        value: cleanValue,
        count: 0,
        examples: [],
      };
    }

    const entry = bucket[scope][key];
    entry.count += 1;
    if (entry.examples.length < 5) {
      entry.examples.push({
        id: product.airtable_id || product.id || "",
        code: product.codigo || "",
        name: product.nombre || "",
      });
    }
  }

  function buildReport(products) {
    const observed = {
      brands: {},
      categories: {},
      subcategories: {},
      units: {},
    };

    (products || []).forEach((product) => {
      addObserved(observed, "brands", product.marca, product);
      addObserved(observed, "categories", product.categoriaCodigo, product);
      addObserved(observed, "subcategories", product.subCategoria, product);
      addObserved(observed, "units", product.unitCode, product);
      addObserved(observed, "units", product.saleUnitCode, product);
      addObserved(observed, "units", product.purchaseUnitCode, product);
    });

    const report = {
      generatedAt: new Date().toISOString(),
      productCount: (products || []).length,
      missing: {},
      needsMapping: {},
      aliasesApplied: {},
    };

    Object.keys(observed).forEach((scope) => {
      const defined = makeDefinedIndex(scope);
      const exactDefined = makeExactDefinedIndex(scope);
      report.missing[scope] = [];
      report.needsMapping[scope] = [];
      report.aliasesApplied[scope] = [];

      Object.values(observed[scope]).forEach((entry) => {
        const token = normalizeToken(entry.value);
        const alias = resolveAlias(scope, entry.value);

        if (alias) {
          report.aliasesApplied[scope].push({ ...entry, alias });
          return;
        }

        if (!defined.has(token)) {
          report.missing[scope].push(entry);
          return;
        }

        if (!exactDefined.has(token)) {
          report.needsMapping[scope].push({
            ...entry,
            suggestion: defined.get(token),
          });
        }
      });
    });

    return report;
  }

  function saveReport(report) {
    try {
      localStorage.setItem(REPORT_KEY, JSON.stringify(report));
    } catch (error) {
      console.warn("TaxonomyReconciliation: failed to save local report", error);
    }
  }

  function getReport() {
    try {
      return JSON.parse(localStorage.getItem(REPORT_KEY) || "null");
    } catch (error) {
      console.warn("TaxonomyReconciliation: failed to read local report", error);
      return null;
    }
  }

  function getAliasFieldName(fields = {}) {
    return ["Aliases", "aliases", "TaxonomyAliases", "taxonomy_aliases"]
      .find((fieldName) => Object.prototype.hasOwnProperty.call(fields, fieldName)) || "Aliases";
  }

  function parseJson(value, fallback) {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  async function loadConfigsRecord() {
    if (!window.SyncManager || typeof window.SyncManager.shumRequest !== "function") {
      throw new Error("SyncManager no cargado");
    }

    const result = await window.SyncManager.shumRequest("list", {
      baseId: window.SyncManager.config.baseId,
      table: "configs",
    });
    const record = result?.records?.[0];
    if (!record?.id) throw new Error("No se encontró el registro configs");
    return record;
  }

  function parseCategories(fields) {
    const rawCategories = parseJson(fields.Categorias, {});
    const rawSubcategories = parseJson(fields.Subcategorias, {});
    const categories = rawCategories && typeof rawCategories === "object" && !Array.isArray(rawCategories)
      ? { ...rawCategories }
      : {};

    Object.entries(categories).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        categories[key] = {
          name: String(value.name || value.label || value.nombre || key).trim(),
          subcategories: Array.isArray(value.subcategories) ? [...value.subcategories] : [],
        };
      } else {
        categories[key] = {
          name: String(value || key).trim(),
          subcategories: [],
        };
      }

      if (Array.isArray(rawSubcategories?.[key])) {
        categories[key].subcategories = [...rawSubcategories[key]];
      }
    });

    return categories;
  }

  function normalizeTextList(rawValues) {
    const values = Array.isArray(rawValues)
      ? rawValues
      : rawValues && typeof rawValues === "object"
        ? Object.values(rawValues)
        : [];

    return Array.from(new Set(values.map(value => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object") return String(value.name || value.nombre || value.label || "").trim();
      return String(value || "").trim();
    }).filter(Boolean)));
  }

  async function saveAlias(scope, from, to) {
    const cleanScope = String(scope || "").trim();
    const cleanFrom = String(from || "").trim();
    const cleanTo = String(to || "").trim();

    if (!cleanScope || !cleanFrom || !cleanTo) {
      throw new Error("Alias incompleto");
    }

    const record = await loadConfigsRecord();
    const fields = record.fields || {};
    const aliasFieldName = getAliasFieldName(fields);
    const rawAliases = parseJson(fields[aliasFieldName], {});
    if (!rawAliases[cleanScope] || Array.isArray(rawAliases[cleanScope])) {
      rawAliases[cleanScope] = {};
    }
    rawAliases[cleanScope][cleanFrom] = cleanTo;

    await window.SyncManager.shumRequest("update", {
      baseId: window.SyncManager.config.baseId,
      table: "configs",
      recordId: record.id,
      data: {
        [aliasFieldName]: JSON.stringify(rawAliases),
      },
    });

    const aliases = setAliases(rawAliases);
    if (window.ProductFormConfig) {
      window.ProductFormConfig.TAXONOMY_ALIASES = aliases;
    }
    return aliases;
  }

  async function saveImportedValue(scope, value, context = {}) {
    const cleanScope = String(scope || "").trim();
    const cleanValue = String(value || "").trim();
    if (!cleanScope || !cleanValue) throw new Error("Dato importado incompleto");

    const record = await loadConfigsRecord();
    const fields = record.fields || {};
    const categories = parseCategories(fields);
    const brands = normalizeTextList(parseJson(fields.Marcas, []));
    const payload = {};

    if (cleanScope === "brands") {
      if (!brands.some(brand => normalizeToken(brand) === normalizeToken(cleanValue))) {
        brands.push(cleanValue);
      }
      payload.Marcas = JSON.stringify(brands);
    } else if (cleanScope === "categories") {
      if (!categories[cleanValue]) {
        categories[cleanValue] = { name: cleanValue, subcategories: [] };
      }
      payload.Categorias = JSON.stringify(categories);
      payload.Subcategorias = JSON.stringify(
        Object.fromEntries(Object.entries(categories).map(([key, item]) => [key, item.subcategories || []]))
      );
    } else if (cleanScope === "subcategories") {
      const categoryKey = String(context.categoryKey || "").trim();
      if (!categoryKey) throw new Error("Selecciona una categoría antes de agregar la subcategoría");
      if (!categories[categoryKey]) {
        categories[categoryKey] = { name: categoryKey, subcategories: [] };
      }
      const subs = categories[categoryKey].subcategories || [];
      if (!subs.some(sub => normalizeToken(sub) === normalizeToken(cleanValue))) {
        subs.push(cleanValue);
      }
      categories[categoryKey].subcategories = subs;
      payload.Categorias = JSON.stringify(categories);
      payload.Subcategorias = JSON.stringify(
        Object.fromEntries(Object.entries(categories).map(([key, item]) => [key, item.subcategories || []]))
      );
    } else {
      throw new Error("Este tipo de dato solo puede mapearse a existente");
    }

    await window.SyncManager.shumRequest("update", {
      baseId: window.SyncManager.config.baseId,
      table: "configs",
      recordId: record.id,
      data: payload,
    });

    if (window.ProductFormConfig) {
      if (payload.Marcas && Array.isArray(window.ProductFormConfig.BRANDS)) {
        window.ProductFormConfig.BRANDS.splice(0, window.ProductFormConfig.BRANDS.length, ...brands);
      }
      if (payload.Categorias && window.ProductFormConfig.CATEGORIES) {
        Object.keys(window.ProductFormConfig.CATEGORIES).forEach(key => delete window.ProductFormConfig.CATEGORIES[key]);
        Object.assign(window.ProductFormConfig.CATEGORIES, categories);
      }
    }

    return { categories, brands };
  }

  function run(products) {
    const report = buildReport(products || []);
    saveReport(report);
    window.dispatchEvent(new CustomEvent("taxonomy:reconciliation-report", {
      detail: { report },
    }));
    return report;
  }

  window.TaxonomyReconciliation = {
    REPORT_KEY,
    buildReport,
    getAliases,
    getReport,
    normalizeAliasConfig,
    normalizeProduct,
    normalizeProducts,
    normalizeToken,
    resolveAlias,
    run,
    saveAlias,
    saveImportedValue,
    setAliases,
  };
})();
