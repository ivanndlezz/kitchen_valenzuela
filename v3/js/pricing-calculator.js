/**
 * Pricing Calculator Module
 * Handles all reservation pricing calculations including:
 * - Two pricing types: Regular ($600/hr, $100 extra) and Snack ($450/hr, $75 extra)
 * - Multiple booking sources with different fee rules per pricing type
 * - Extra passenger charges
 * - Extra services (fishing licenses, etc.)
 * - Reprice discounts (%, #, $, coupon)
 * - Source fees (Get My Boat, Viator, etc.)
 */

class PricingCalculator {
  constructor(rules = null) {
    // Load rules from parameter or use defaults
    if (rules) {
      this.rules = rules;
    } else {
      // Try to load from JSON file
      this.rules = this.loadRules();
    }

    // Set up constants from rules
    this.CONSTANTS = this.rules.constants;

    // Create pricing types lookup
    this.pricingTypesMap = {};
    this.rules.pricingTypes.forEach((type) => {
      this.pricingTypesMap[type.id] = type;
    });

    // Create sources lookup
    this.sourcesMap = {};
    this.rules.sources.forEach((source) => {
      this.sourcesMap[source.id] = source;
    });

    // Create reprice types lookup
    this.repriceTypesMap = {};
    this.rules.repriceTypes.forEach((type) => {
      this.repriceTypesMap[type.code] = type;
    });

    // Create fee rules lookup
    // feeRules[sourceId][pricingTypeId] = { hasFee, feePercentage }
    this.feeRules = this.rules.feeRules || {};
  }

  /**
   * Load rules from JSON file
   */
  loadRules() {
    // Default rules if JSON file not available
    return {
      version: "2.0.0",
      constants: {
        minDuration: 2,
        maxDuration: 8,
        maxPassengers: 50,
      },
      pricingTypes: [
        {
          id: "regular",
          name: "Regular",
          hourlyRate: 600,
          extraPassengerRate: 100,
        },
        {
          id: "snack",
          name: "Snack Price",
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
        },
        {
          id: "get-my-boat",
          name: "Get My Boat",
          hasFee: true,
          feePercentage: 0.115,
        },
        { id: "viator", name: "Viator", hasFee: true, feePercentage: 0.15 },
        {
          id: "fareharbor",
          name: "🚦 Fareharbor",
          hasFee: true,
          feePercentage: 0.12,
        },
        {
          id: "travel-cabo-tours",
          name: "Travel Cabo Tours",
          hasFee: true,
          feePercentage: 0.1,
        },
      ],
      feeRules: {
        // Get My Boat fee rules per pricing type
        "get-my-boat": {
          regular: { hasFee: true, feePercentage: 0.115 }, // $500/hr + 11.5% fee
          snack: { hasFee: true, feePercentage: 0.115 }, // $450/hr + 11.5% fee
        },
        // Other sources keep their default fees
      },
      repriceTypes: [
        { code: "", name: "None", prefix: "" },
        { code: "%", name: "Percentage", prefix: "%" },
        { code: "#", name: "Fixed Amount", prefix: "$" },
        { code: "$", name: "Fixed Price", prefix: "$" },
        { code: "coupon", name: "Coupon", prefix: "$" },
      ],
      tourTypes: [
        "Bay Trip",
        "Whale Watching",
        "Snorkeling Tour",
        "Sunset Cruise",
        "Fishing",
      ],
    };
  }

  /**
   * Get effective fee for a source + pricing type combination
   * @param {string} sourceId - Booking source ID
   * @param {string} pricingTypeId - Pricing type ID (regular or snack)
   * @returns {Object} Fee configuration { hasFee, feePercentage, feeNote }
   */
  getEffectiveFee(sourceId, pricingTypeId = "regular") {
    const source = this.sourcesMap[sourceId] || this.sourcesMap["direct"];

    // Check if there's a specific fee rule for this source + pricing type
    if (this.feeRules[sourceId] && this.feeRules[sourceId][pricingTypeId]) {
      const feeRule = this.feeRules[sourceId][pricingTypeId];
      return {
        hasFee: feeRule.hasFee,
        feePercentage: feeRule.feePercentage,
        feeNote: feeRule.hasFee
          ? `${(feeRule.feePercentage * 100).toFixed(1)}% fee`
          : null,
      };
    }

    // Fall back to source default
    return {
      hasFee: source.hasFee,
      feePercentage: source.feePercentage,
      feeNote: source.feeNote,
    };
  }

  /**
   * Calculate base price for the trip
   * @param {Object} trip - Trip details { duration, adults, tourType }
   * @param {string} pricingTypeId - Pricing type ID (regular or snack)
   * @param {string} sourceId - Booking source ID
   * @param {number} manualHourlyRate - Manual hourly rate override
   * @param {number} manualExtraPaxRate - Manual extra passenger rate override
   * @returns {Object} Base price breakdown
   */
  calculateBasePrice(
    trip,
    pricingTypeId = "regular",
    sourceId = "direct",
    manualHourlyRate = null,
    manualExtraPaxRate = null,
  ) {
    const pricingType =
      this.pricingTypesMap[pricingTypeId] || this.pricingTypesMap["regular"];
    const duration = Math.max(trip.duration || 2, this.CONSTANTS.minDuration);
    const passengers = Math.min(trip.adults || 1, this.CONSTANTS.maxPassengers);

    // Get hourly rate - apply $100 discount for Get My Boat on Regular pricing
    let hourlyRate = manualHourlyRate || pricingType.hourlyRate;
    if (
      !manualHourlyRate &&
      sourceId === "get-my-boat" &&
      pricingTypeId === "regular"
    ) {
      hourlyRate = 500; // $600 - $100 discount
    }

    // Base trip cost (hours × hourly rate)
    const baseTripCost = duration * hourlyRate;

    // Extra passengers beyond included (14)
    const extraPassengers = Math.max(0, passengers - 14);
    const extraPassengerRate = manualExtraPaxRate || pricingType.extraPassengerRate;
    const extraPassengerCharge = extraPassengers * extraPassengerRate;

    return {
      baseTripCost,
      hourlyRate,
      duration,
      passengers,
      extraPassengers,
      extraPassengerCharge,
      extraPassengerCharge,
      subtotal: baseTripCost + extraPassengerCharge,
      pricingTypeId: pricingType.id,
      pricingTypeName: pricingType.name,
      extraPassengerRate: extraPassengerRate,
    };
  }

  /**
   * Calculate extra services cost
   * @param {Object} extras - Extra services { fishingLicenses, amount }
   * @param {string} tourType - Type of tour
   * @returns {Object} Extra services breakdown
   */
  calculateExtras(extras, tourType = null) {
    const breakdown = {
      fishingLicenses: 0,
      fishingLicenseCost: 0,
      otherExtras: 0,
      total: 0,
    };

    if (!extras) return breakdown;

    // Fishing licenses (only for Fishing tours, $22 each)
    if (extras.fishingLicenses && tourType === "Fishing") {
      breakdown.fishingLicenses = parseInt(extras.fishingLicenses) || 0;
      breakdown.fishingLicenseCost = breakdown.fishingLicenses * 22;
    }

    // Other extras amount from input
    if (extras.amount !== undefined && extras.amount !== null) {
      breakdown.otherExtras = parseFloat(extras.amount) || 0;
    }

    breakdown.total = breakdown.fishingLicenseCost + breakdown.otherExtras;
    return breakdown;
  }

  /**
   * Apply reprice discount to subtotal
   * @param {number} subtotal - Base subtotal
   * @param {string} repriceType - Type of reprice (%, #, $, coupon)
   * @param {number} repriceDiscount - Discount value
   * @returns {Object} Reprice breakdown
   */
  applyReprice(subtotal, repriceType, repriceDiscount) {
    const breakdown = {
      originalSubtotal: subtotal,
      repriceType,
      repriceDiscount: parseFloat(repriceDiscount) || 0,
      discountedAmount: 0,
      finalPrice: subtotal,
    };

    // If no reprice type or discount, return subtotal
    if (!repriceType || !repriceDiscount || repriceDiscount === 0) {
      breakdown.finalPrice = subtotal;
      return breakdown;
    }

    switch (repriceType) {
      case "%":
        // Percentage discount
        breakdown.discountedAmount =
          subtotal * (breakdown.repriceDiscount / 100);
        breakdown.finalPrice = subtotal - breakdown.discountedAmount;
        break;

      case "#":
        // Fixed amount discount
        breakdown.discountedAmount = Math.min(
          breakdown.repriceDiscount,
          subtotal,
        );
        breakdown.finalPrice = subtotal - breakdown.discountedAmount;
        break;

      case "$":
        // Fixed final price (override)
        breakdown.finalPrice = breakdown.repriceDiscount;
        break;

      case "coupon":
        // Coupon price (same as $)
        breakdown.finalPrice = breakdown.repriceDiscount;
        break;

      default:
        breakdown.finalPrice = subtotal;
    }

    return breakdown;
  }

  /**
   * Calculate source fee based on pricing type
   * @param {number} finalPrice - Final business price
   * @param {string} sourceId - Booking source ID
   * @param {string} pricingTypeId - Pricing type ID (regular or snack)
   * @returns {Object} Fee breakdown
   */
  calculateSourceFee(
    finalPrice,
    sourceId = "direct",
    pricingTypeId = "regular",
  ) {
    const source = this.sourcesMap[sourceId] || this.sourcesMap["direct"];
    const effectiveFee = this.getEffectiveFee(sourceId, pricingTypeId);

    const breakdown = {
      sourceId: source.id,
      sourceName: source.name,
      pricingTypeId: pricingTypeId,
      hasFee: effectiveFee.hasFee,
      feePercentage: effectiveFee.feePercentage,
      feeAmount: 0,
      feeNote: effectiveFee.feeNote,
      totalCharged: finalPrice,
    };

    if (effectiveFee.hasFee) {
      // Fee is included in customer price, so business receives less
      // customer pays = business_price / (1 - fee_percentage)
      breakdown.totalCharged = finalPrice / (1 - effectiveFee.feePercentage);
      breakdown.feeAmount = breakdown.totalCharged - finalPrice;
    }

    return breakdown;
  }

  /**
   * Main calculation function - combines all steps
   * @param {Object} reservation - Full reservation data
   * @returns {Object} Complete pricing breakdown
   */
  calculate(reservation) {
    const { trip, pricingType, source, extras, reprice } = reservation;

    // Default pricing type to 'regular' if not specified
    const effectivePricingType = pricingType || "regular";

    // Step 1: Calculate base price
    const basePricing = this.calculateBasePrice(
      trip,
      effectivePricingType,
      source,
      reservation.manualHourlyRate,
      reservation.manualExtraPaxRate,
    );

    // Step 2: Calculate extras
    const extrasPricing = this.calculateExtras(extras, trip?.tourType);

    // Step 3: Calculate subtotal
    const subtotal = basePricing.subtotal + extrasPricing.total;

    // Step 4: Apply reprice
    const repriceResult = this.applyReprice(
      subtotal,
      reprice?.type,
      reprice?.discount,
    );

    // Step 5: Calculate source fee (pass pricing type for fee rules)
    const feeResult = this.calculateSourceFee(
      repriceResult.finalPrice,
      source,
      effectivePricingType,
    );

    // Return complete breakdown
    return {
      basePricing,
      extrasPricing,
      subtotal,
      reprice: repriceResult,
      fee: feeResult,
      summary: {
        basePrice: basePricing.subtotal,
        extras: extrasPricing.total,
        subtotal,
        discount: repriceResult.discountedAmount,
        businessPrice: repriceResult.finalPrice,
        fee: feeResult.feeAmount,
        customerPrice: feeResult.totalCharged,
      },
    };
  }

  /**
   * Format price as currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Validate reservation data
   * @param {Object} reservation - Reservation to validate
   * @returns {Object} Validation result with errors array
   */
  validate(reservation) {
    const errors = [];

    if (!reservation.trip) {
      errors.push("Trip information is required");
    } else {
      if (!reservation.trip.duration || reservation.trip.duration < 2) {
        errors.push("Duration must be at least 2 hours");
      }
      if (reservation.trip.duration > 8) {
        errors.push("Duration cannot exceed 8 hours");
      }
      if (!reservation.trip.adults || reservation.trip.adults < 1) {
        errors.push("At least 1 adult is required");
      }
      if (reservation.trip.adults > 50) {
        errors.push("Maximum 50 passengers allowed");
      }
    }

    // Validate pricing type
    if (
      reservation.pricingType &&
      !this.pricingTypesMap[reservation.pricingType]
    ) {
      errors.push("Invalid pricing type");
    }

    // Validate source
    if (reservation.source && !this.sourcesMap[reservation.source]) {
      errors.push("Invalid booking source");
    }

    // Validate reprice
    if (
      reservation.reprice?.type &&
      !this.repriceTypesMap[reservation.reprice.type]
    ) {
      errors.push("Invalid reprice type");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all available pricing types
   * @returns {Array} List of pricing type objects
   */
  getPricingTypes() {
    return this.rules.pricingTypes;
  }

  /**
   * Get all available sources
   * @returns {Array} List of source objects
   */
  getSources() {
    return this.rules.sources;
  }

  /**
   * Get all available reprice types
   * @returns {Array} List of reprice type objects
   */
  getRepriceTypes() {
    return this.rules.repriceTypes;
  }

  /**
   * Get all available tour types
   * @returns {Array} List of tour type strings
   */
  getTourTypes() {
    return this.rules.tourTypes;
  }

  /**
   * Get pricing type by ID
   * @param {string} pricingTypeId - Pricing type ID
   * @returns {Object} Pricing type object
   */
  getPricingType(pricingTypeId) {
    return this.pricingTypesMap[pricingTypeId] || null;
  }

  /**
   * Get source by ID
   * @param {string} sourceId - Source ID
   * @returns {Object} Source object
   */
  getSource(sourceId) {
    return this.sourcesMap[sourceId] || null;
  }
}

// Export for different environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = PricingCalculator;
}

// Also make available globally for browser use
if (typeof window !== "undefined") {
  window.PricingCalculator = PricingCalculator;
}
