/**
 * Pricing Rules Configuration
 * This file provides the pricing rules as a JavaScript object
 * that can be loaded inline without needing a separate JSON file.
 */

window.PRICING_RULES = {
  version: "2.0.0",
  lastUpdated: "2026-02-09",
  constants: {
    minDuration: 2,
    maxDuration: 8,
    maxPassengers: 50,
  },
  pricingTypes: [
    {
      id: "regular",
      name: "Regular",
      description: "Standard pricing: $600/hour, $100 extra passenger",
      hourlyRate: 600,
      extraPassengerRate: 100,
    },
    {
      id: "snack",
      name: "Snack Price",
      description: "Discounted pricing: $450/hour, $75 extra passenger",
      hourlyRate: 450,
      extraPassengerRate: 75,
    },
  ],
  sources: [
    {
      id: "direct",
      name: "📞 Direct - Call",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "get-my-boat",
      name: "🐬 Get My Boat",
      hasFee: true,
      feePercentage: 0.115,
      feeNote: "11.5% fee",
    },
    {
      id: "viator",
      name: "✈️ Viator",
      hasFee: true,
      feePercentage: 0.15,
      feeNote: "15% fee",
    },
    {
      id: "fareharbor",
      name: "🚦 Fareharbor",
      hasFee: true,
      feePercentage: 0.12,
      feeNote: "12% fee",
    },
    {
      id: "travel-cabo-tours",
      name: "🌴 Travel Cabo Tours",
      hasFee: true,
      feePercentage: 0.1,
      feeNote: "10% fee",
    },
    {
      id: "anchor-rides",
      name: "⚓ Anchor Rides",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "andres-lopez",
      name: "👤 Andres Lopez",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "mauricio-bojorquez",
      name: "👤 Mauricio Bojorquez",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "jose-ferron",
      name: "👤 Jose Ferron",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "ramiro-munguia",
      name: "👤 Ramiro Munguia",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "adriana-transcabo",
      name: "👩 Adriana Transcabo",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "grand-solmar",
      name: "🏨 Grand Solmar - Luis Roberts",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
    {
      id: "eduardo-araujo",
      name: "👤 Eduardo Araujo",
      hasFee: false,
      feePercentage: 0,
      feeNote: null,
    },
  ],
  // Fee rules: which sources charge fees for which pricing types
  // Key = source ID, value = object with pricingTypeId -> fee config
  feeRules: {
    "get-my-boat": {
      regular: { hasFee: true, feePercentage: 0.115 }, // $500/hr + 11.5% fee
      snack: { hasFee: true, feePercentage: 0.115 }, // $450/hr + 11.5% fee
    },
    viator: {
      regular: { hasFee: true, feePercentage: 0.15 },
      snack: { hasFee: true, feePercentage: 0.15 },
    },
    fareharbor: {
      regular: { hasFee: true, feePercentage: 0.12 },
      snack: { hasFee: true, feePercentage: 0.12 },
    },
    "travel-cabo-tours": {
      regular: { hasFee: true, feePercentage: 0.1 },
      snack: { hasFee: true, feePercentage: 0.1 },
    },
    // Direct and other sources have no fees by default
  },
  tourTypes: [
    "Bay Trip",
    "Whale Watching",
    "Snorkeling Tour",
    "Sunset Cruise",
    "Fishing",
  ],
  repriceTypes: [
    {
      code: "",
      name: "None",
      description: "No discount applied",
      prefix: "",
    },
    {
      code: "%",
      name: "Percentage",
      description: "Percentage discount",
      prefix: "%",
    },
    {
      code: "#",
      name: "Fixed Amount",
      description: "Fixed amount discount",
      prefix: "$",
    },
    {
      code: "$",
      name: "Fixed Price",
      description: "Override to fixed final price",
      prefix: "$",
    },
    {
      code: "coupon",
      name: "Coupon",
      description: "Coupon price override",
      prefix: "$",
    },
  ],
};
