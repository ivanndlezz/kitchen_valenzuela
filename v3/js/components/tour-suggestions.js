/**
 * Tour Suggestions Component - Love Shack v3
 * Recommends a tour type based on duration and start time.
 */

const TourSuggestions = {
  tours: {
    bay: { id: "Bay Trip", emoji: "🌊", label: "Bay Trip" },
    sunset: { id: "Sunset Cruise", emoji: "🌅", label: "Sunset Cruise" },
    snorkel: { id: "Snorkeling Tour", emoji: "🤿", label: "Snorkeling Tour" },
    fishing: { id: "Fishing", emoji: "🎣", label: "Fishing" },
  },

  /**
   * Helper to parse "HH:MM" into minutes for easy comparison.
   * "15:30" -> 15 * 60 + 30 = 930
   */
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + (m || 0);
  },

  /**
   * Gets the recommended tour based on business logic rules.
   * @param {number} durationHours
   * @param {string} startTime "HH:MM" in 24h format
   * @returns {Object|null} Tour object or null
   */
  getSuggestion(durationHours, startTime) {
    // 1. Duration >= 5 hrs OR Start time is exactly 7:00 AM -> Fishing
    if (durationHours >= 5 || startTime === "07:00") {
      return this.tours.fishing;
    }

    // 2. Duration exactly 2 hours -> Bay Trip
    if (durationHours === 2) {
      return this.tours.bay;
    }

    // Threshold: 3:30 PM (15:30) is 930 minutes
    const thresholdMins = this.timeToMinutes("14:00");
    const startMins = this.timeToMinutes(startTime);

    if (durationHours > 2) {
      // 3. Duration > 2 AND Start time > 15:30 -> Sunset
      if (startTime && startMins > thresholdMins) {
        return this.tours.sunset;
      }

      // 4. Duration is 3 or 4 hrs AND Start time <= 15:30 -> Snorkeling
      if (
        (durationHours === 3 || durationHours === 4) &&
        startTime &&
        startMins <= thresholdMins
      ) {
        return this.tours.snorkel;
      }
    }

    return null;
  },

  /**
   * Generates the HTML for the suggestion pill.
   */
  renderPill(suggestion, isCurrentlySelected) {
    if (!suggestion) return "";

    if (isCurrentlySelected) {
      return `
        <div class="tour-suggestion-pill selected">
          <span class="suggestion-icon">✓</span>
          <span class="suggestion-text">Excelente elección</span>
        </div>
      `;
    }

    return `
      <div class="tour-suggestion-pill active" data-suggested-tour="${suggestion.id}">
        <span class="suggestion-icon">✨</span>
        <span class="suggestion-text">Sugerencia: <strong>${suggestion.emoji} ${suggestion.label}</strong></span>
        <svg class="suggestion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    `;
  },
};

window.TourSuggestions = TourSuggestions;
