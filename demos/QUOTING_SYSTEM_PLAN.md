# Quotation System Implementation Plan (3-Step Workflow)
# For Kitchen Valenzuela Inventory

## Overview

This document outlines the **current state** and implementation plan for the 3-step quotation workflow in Kitchen Valenzuela Inventory, inspired by v3's reservation flow.

**Note:** Unlike v3 reservations, this quoting system does NOT require:
- Time slots/hours
- Passenger numbers
- Commission percentages

---

## Current Implementation Status

### Already Implemented ✅

The quotation system is **already functional** with the following components:

| Component | Location | Status |
|-----------|----------|--------|
| Storage Layer | `js/storage.js` (lines 65-86) | ✅ `loadQuotationsFromStorage`, `saveQuotationsToStorage`, `generateQuoteFolio` |
| Stepper Logic | `js/screens/quotation-screen.js` | ✅ `goToStep()`, `initStepper()`, step validation |
| Step 1: Pricing | `js/screens/quotation-screen.js` | ✅ Product search, add to quote, quantity adjustment |
| Step 2: Client | `js/screens/quotation-screen.js` | ✅ Client selection dropdown, inline creation |
| Step 3: Overview | `js/screens/quotation-screen.js` | ✅ Summary display, totals with 16% IVA |
| Export Features | `js/screens/quotation-screen.js` | ✅ `exportQuoteToPDF`, `exportQuoteToWhatsApp` |
| Confirmation | `js/screens/quotation-screen.js` | ✅ `confirmQuotation()` sets status to 'reserved' |

### Problem: No URL Persistence

Unlike v3, the current stepper does NOT update the URL hash. When the page reloads or user navigates away and back:
- The `currentQuoteId` is lost
- The `quoteItems` are lost (flat state in AppState)
- User must restart the quotation

---

## Proposed Solution: Hash-Based Routing (v3 Pattern)

### Routes to Implement

```
#/quotation/new                    → Create draft + open step 1
#/quotation/{id}/step1            → Open quotation at step 1 (pricing)
#/quotation/{id}/step2            → Open quotation at step 2 (client)
#/quotation/{id}/step3            → Open quotation at step 3 (overview)
#/quotation/{id}/overview         → Alternative to step3
```

---

## Required Changes

### 1. Add Hash Routing to `js/app.js`

```javascript
// Add to route() function in v3-style
if (hash === '#/quotation/new') {
  createNewQuotation(); // creates draft and redirects to #/quotation/{id}/step1
} else if (hash.match(/^#\/quotation\/([^/]+)\/step1/)) {
  const id = hash.match(/^#\/quotation\/([^/]+)\/step1/)[1];
  window.QuotationStepper.init(id, 1);
} else if (hash.match(/^#\/quotation\/([^/]+)\/step2/)) {
  const id = hash.match(/^#\/quotation\/([^/]+)\/step2/)[1];
  window.QuotationStepper.init(id, 2);
} else if (hash.match(/^#\/quotation\/([^/]+)\/step3/)) {
  const id = hash.match(/^#\/quotation\/([^/]+)\/step3/)[1];
  window.QuotationStepper.init(id, 3);
}
```

### 2. Modify `js/screens/quotation-screen.js`

**Key Changes:**
- `goToStep(step)` should update URL: `window.location.hash = '#/quotation/${currentQuoteId}/step${step}'`
- On hash change, re-initialize stepper from LocalStorage
- Save draft on each step change (before navigating)

### 3. Update State Management

```javascript
// In state.js - Add draft tracking
window.AppState = {
  ...existing state...,
  quotationDraft: null, // Track in-progress quotation for persistence
};

// Helper to resume draft
function getActiveDraft() {
  return window.AppState.quotations.find(q => q.status === 'draft' && q.currentStep);
}
```

---

## Implementation Steps

### Phase 1: Add Routes to App

- [ ] Add route handlers in `js/app.js`
- [ ] Add `createNewQuotation()` function
- [ ] Add `navigateToQuotation(id, step)` helper

### Phase 2: Modify Stepper for URL Persistence

- [ ] Update `goToStep()` to set hash
- [ ] Add `handleHashChange()` for URL changes
- [ ] Modify `initStepper()` to accept pre-populated quotation

### Phase 3: Auto-Save Draft on Navigation

- [ ] Call `saveDraftQuotation()` before each step transition
- [ ] Load draft from storage on page load

---

## Technical Notes

1. **Follow v3's router pattern** exactly for consistency
2. **Drafts persist** in localStorage via `kv-catalog-quotations`
3. **No need for nested data structure** - flat state works with URL persistence
4. **IVA remains 16%** - simple tax calculation