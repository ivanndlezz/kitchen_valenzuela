/**
 * Storage Module — Love Shack v3
 * localStorage CRUD + UUID generation for reservation persistence
 */

const STORAGE_KEY = 'loveshack_v3_reservations';
const CLIENTS_KEY = 'loveshack_v3_clients';
const JSON_URL = './data/reservations.json'; // v3 data source
const SAVE_SERVER_URL = 'http://localhost:8765/save_v3';

/**
 * Load reservations from the external JSON file
 */
async function loadFromJSON() {
  try {
    const response = await fetch(JSON_URL + '?t=' + Date.now());
    if (!response.ok) return [];
    const raw = await response.json();
    // Normalize legacy records to v3 format
    return raw.map(normalizeReservation);
  } catch (e) {
    console.warn('Storage: Could not load JSON file', e);
    return [];
  }
}

/**
 * Save reservations to the external JSON file via save server
 */
async function saveToJSON(reservations) {
  try {
    const response = await fetch(SAVE_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservations),
    });
    return response.ok;
  } catch (e) {
    console.warn('Storage: Save server not reachable', e);
    return false;
  }
}

/**
 * Compare local data with JSON data
 */
async function checkSyncStatus() {
  const localItems = getAllReservations();
  const jsonItems = await loadFromJSON();

  const localIds = new Set(localItems.map(r => r.id));
  const jsonIds = new Set(jsonItems.map(r => r.id));

  const onlyInLocal = localItems.filter(r => !jsonIds.has(r.id));
  const onlyInJson = jsonItems.filter(r => !localIds.has(r.id));

  // Find conflicts (items in both with different timestamps)
  const conflicts = localItems.filter(r => {
    if (!jsonIds.has(r.id)) return false;
    const jsonItem = jsonItems.find(jr => jr.id === r.id);
    return r.updatedAt !== jsonItem.updatedAt;
  });

  return {
    localCount: localItems.length,
    jsonCount: jsonItems.length,
    onlyInLocal,
    onlyInJson,
    conflicts,
    hasWarnings: onlyInLocal.length > 0 || onlyInJson.length > 0 || conflicts.length > 0
  };
}


/**
 * Get all reservations from localStorage
 * @returns {Array} Array of normalized reservation objects
 */
function getAllReservations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const raw = data ? JSON.parse(data) : [];
    // Normalize each reservation to v3 format (handles legacy flat records)
    let normalized = raw.map(normalizeReservation);

    // Auto-cleanup: remove drafts that are past their tripDate
    const now = new Date();
    const originalLength = normalized.length;
    normalized = normalized.filter((r) => {
      if (r.status !== 'draft') return true;
      const tripDate = r.data?.step2_details?.tripDate;
      if (!tripDate) return true; // Keep drafts without a date
      return new Date(tripDate + 'T23:59:59') >= now;
    });

    if (normalized.length !== originalLength) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch (e) {
    console.error('Storage: Failed to read reservations', e);
    return [];
  }
}

/**
 * Get all registered clients
 * @returns {Array}
 */
function getAllClients() {
  try {
    const data = localStorage.getItem(CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Storage: Failed to read clients', e);
    return [];
  }
}

/**
 * Find or create a client in the registry
 * @param {Object} data - { customerName, customerEmail, customerPhone }
 * @returns {string} The clientId (e.g. CLI-001)
 */
function getOrRegisterClient(data) {
  const name = (data.customerName || '').trim();
  if (!name) return 'CLI-UNKNOWN';

  const clients = getAllClients();
  const email = (data.customerEmail || '').toLowerCase().trim();
  
  // Try to find by email first (more unique), then by name
  let client = null;
  if (email) {
    client = clients.find(c => c.email === email);
  }
  
  if (!client) {
    client = clients.find(c => c.name.toLowerCase() === name.toLowerCase());
  }

  if (client) {
    // Optional: update info if missing
    let updated = false;
    if (!client.email && email) { client.email = email; updated = true; }
    if (!client.phone && data.customerPhone) { client.phone = data.customerPhone; updated = true; }
    if (updated) {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    }
    return client.id;
  }

  // Create new client
  const newId = `CLI-${String(clients.length + 1).padStart(3, '0')}`;
  const newClient = {
    id: newId,
    name: name,
    email: email,
    phone: data.customerPhone || '',
    createdAt: new Date().toISOString()
  };
  
  clients.push(newClient);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  return newId;
}

/**
 * Save all reservations to localStorage
 * @param {Array} reservations
 */
function saveAll(reservations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  } catch (e) {
    console.error('Storage: Failed to save reservations', e);
  }
}

/**
 * Get a single reservation by ID (normalized to v3 format)
 * @param {string} id
 * @returns {Object|null}
 */
function getReservation(id) {
  const all = getAllReservations();
  return all.find((r) => r.id === id) || null;
}

/**
 * Create a new draft reservation
 * @returns {Object} The new draft reservation object
 */
function createDraft() {
  const now = new Date().toISOString();
  const draft = {
    id: generateUUID(),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    currentStep: 1,
    sync_status: 'pending',
    airtable_id: null,
    data: {
      step1_pricing: {
        pricingType: 'regular',
        durationHours: 3,
        passengers: 14,
        extraPassengers: 0,
        hourlyRate: 600,
        baseTripCost: 1800,
        extraPassengerCharge: 0,
        estimatedSubtotal: 1800,
      },
      step2_details: {
        tourType: '',
        tripDate: '',
        startTime: '',
        endTime: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        notes: '',
      },
      step3_adjustments: {
        bookingSource: 'direct',
        repriceType: '',
        repriceDiscount: 0,
        extrasAmount: 0,
        fishingLicenses: 0,
        finalBusinessPrice: 1800,
        finalCustomerPrice: 1800,
        feeAmount: 0,
        deposit: 0,
        balance: 1800,
      },
    },
  };

  const all = getAllReservations();
  all.push(draft);
  saveAll(all);
  return draft;
}

/**
 * Update a specific step's data in a reservation
 * @param {string} id - Reservation ID
 * @param {string} stepKey - e.g. 'step1_pricing', 'step2_details', 'step3_adjustments'
 * @param {Object} stepData - Data to merge into the step
 * @returns {Object|null} Updated reservation or null
 */
function updateReservation(id, stepKey, stepData) {
  const all = getAllReservations();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  // Merge step data
  all[idx].data[stepKey] = {
    ...all[idx].data[stepKey],
    ...stepData,
  };
  
  // If updating customer details, ensure clientId is updated/assigned
  if (stepKey === 'step2_details') {
    const s2 = all[idx].data.step2_details;
    all[idx].clientId = getOrRegisterClient({
      customerName: s2.customerName,
      customerEmail: s2.customerEmail,
      customerPhone: s2.customerPhone
    });
  }

  all[idx].updatedAt = new Date().toISOString();
  if (all[idx].status !== 'draft') {
    all[idx].sync_status = 'pending';
  }

  saveAll(all);

  // Auto-sync if not draft and manager exists
  if (window.SyncManager && all[idx].status !== 'draft') {
    // Debounce or just fire and forget
    window.SyncManager.syncReservation(id).catch(e => console.warn('Auto-sync failed:', e));
  }

  return all[idx];
}

/**
 * Update the current step tracker
 * @param {string} id
 * @param {number} step - 1, 2, or 3
 */
function updateCurrentStep(id, step) {
  const all = getAllReservations();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return;

  all[idx].currentStep = step;
  all[idx].updatedAt = new Date().toISOString();
  saveAll(all);
}

/**
 * Promote a draft to a confirmed booking
 * @param {string} id
 * @returns {Object|null}
 */
function promoteToBooking(id) {
  const all = getAllReservations();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  all[idx].status = 'reservado';
  all[idx].currentStep = 3;
  all[idx].updatedAt = new Date().toISOString();
  all[idx].sync_status = 'pending';
  saveAll(all);
  
  return all[idx];
}

/**
 * Update the status of a reservation
 * @param {string} id
 * @param {string} status
 */
function updateStatus(id, status) {
  const all = getAllReservations();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return;

  all[idx].status = status;
  all[idx].updatedAt = new Date().toISOString();
  all[idx].sync_status = 'pending';
  saveAll(all);

  // Trigger async sync if SyncManager is available
  if (window.SyncManager && status !== 'draft') {
    window.SyncManager.syncReservation(id).catch(console.error);
  }
}

/**
 * Map legacy tour names to v3 tour type strings
 */
function mapLegacyTour(tourName) {
  if (!tourName) return '';
  const t = tourName.toLowerCase();
  if (t.includes('bay')) return 'Bay Trip';
  if (t.includes('whale')) return 'Whale Watching';
  if (t.includes('snorkel')) return 'Snorkeling Tour';
  if (t.includes('sunset')) return 'Sunset Cruise';
  if (t.includes('fishing')) return 'Fishing';
  return tourName; // fallback: keep original
}

/**
 * Map legacy status values to v3 status strings
 */
function mapLegacyStatus(status) {
  if (!status) return 'draft';
  const s = status.toLowerCase();
  if (s === 'completed') return 'completado';
  if (s === 'confirmed') return 'reservado';
  if (s === 'cancelled' || s === 'canceled') return 'cancelado';
  if (s === 'draft' || s === 'borrador') return 'draft';
  if (s === 'tentative' || s === 'tentativo') return 'tentativo';
  return status; // fallback: keep original
}

/**
 * Normalize a reservation record to v3 nested format
 * Legacy records have flat fields; v3 records have data.step1_pricing, etc.
 * @param {Object} r - Raw reservation object
 * @returns {Object} Normalized reservation with nested data structure
 */
function normalizeReservation(r) {
  // If already normalized (has data.step1_pricing), return as-is
  if (r.data && r.data.step1_pricing) return r;

  // Legacy flat format → convert to nested
  const duration = parseInt(r.hours || r.reservationHours || 3);
  const passengers = parseInt(r.adults || 1);
  const extraPassengers = parseInt(r.extraPassengers || r.extraPax || 0);
  
  // Hourly rate inference
  let hourlyRate = parseFloat(r.hourlyRate);
  if (isNaN(hourlyRate) || hourlyRate <= 0) {
    // Estimate from basePrice/duration or default
    hourlyRate = duration > 0 ? (parseFloat(r.basePrice) || 0) / duration : 600;
    if (hourlyRate <= 0) hourlyRate = 600;
  }

  // Base trip cost
  const baseTripCost = parseFloat(r.basePrice) || (duration * hourlyRate);

  // Extra passenger charge (unitario) — prioritize explicit fee, else derive from total
  let extraPassengerCharge = 100; // default
  if (r.extraPassengerFee && !isNaN(parseFloat(r.extraPassengerFee))) {
    extraPassengerCharge = parseFloat(r.extraPassengerFee);
  } else if (extraPassengers > 0 && r.extraPassengerCost && !isNaN(parseFloat(r.extraPassengerCost))) {
    // extraPassengerCost is total, divide to get unit rate
    extraPassengerCharge = parseFloat(r.extraPassengerCost) / extraPassengers;
  }

  const extraPassengerTotal = extraPassengers * extraPassengerCharge;
  const finalBusinessPrice = baseTripCost + extraPassengerTotal;
  const finalCustomerPrice = parseFloat(r.totalPrice) || finalBusinessPrice;
  const extrasAmount = finalCustomerPrice - finalBusinessPrice;

  // Infer pricing type from hourlyRate (heuristic)
  let pricingType = 'regular';
  if (hourlyRate < 550) pricingType = 'snack';

  // Build nested structure
  const normalized = {
    ...r,
    clientId: r.clientId || getOrRegisterClient({
      customerName: r.guestName || r.contactName || r.customerName || '',
      customerEmail: r.contactEmail || r.customerEmail || '',
      customerPhone: r.contactPhone || r.customerPhone || ''
    }),
    status: mapLegacyStatus(r.status),
    currentStep: r.status === 'draft' ? (r.currentStep || 1) : 3,
    data: {
      step1_pricing: {
        pricingType: r.pricingType || pricingType,
        durationHours: duration,
        passengers: passengers,
        extraPassengers: extraPassengers,
        hourlyRate: hourlyRate,
        baseTripCost: baseTripCost,
        extraPassengerCharge: extraPassengerCharge,
        estimatedSubtotal: finalBusinessPrice,
      },
      step2_details: {
        tourType: mapLegacyTour(r.tourName || r.tourType || ''),
        tripDate: r.reservationDate || r.tripDate || '',
        startTime: r.reservationTime || r.startTime || '',
        endTime: r.endTime || (r.reservationTime ? addHours(r.reservationTime, duration) : ''),
        customerName: r.guestName || r.contactName || r.customerName || '',
        customerPhone: r.contactPhone || r.customerPhone || '',
        customerEmail: r.contactEmail || r.customerEmail || '',
        notes: r.notes || '',
      },
      step3_adjustments: {
        bookingSource: mapLegacySource(r.reservationSource || r.bookingSource || 'direct'),
        repriceType: '',
        repriceDiscount: 0,
        extrasAmount: extrasAmount,
        fishingLicenses: 0,
        finalBusinessPrice: finalBusinessPrice,
        finalCustomerPrice: finalCustomerPrice,
        feeAmount: 0,
        deposit: parseFloat(r.deposit || 0),
        balance: parseFloat(r.balance || finalCustomerPrice),
      },
    },
  };

  return normalized;
}

/**
 * Map legacy source names to v3 source IDs
 */
function mapLegacySource(source) {
  if (!source) return 'direct';
  const s = source.toLowerCase();
  if (s.includes('get my boat') || s.includes('gmb')) return 'get-my-boat';
  if (s.includes('viator')) return 'viator';
  if (s.includes('fareharbor')) return 'fareharbor';
  if (s.includes('travel cabo') || s.includes('tct')) return 'travel-cabo-tours';
  if (s.includes('referido') || s.includes('directo') || s.includes('direct')) return 'direct';
  return 'direct';
}

/**
 * Add hours to a time string (HH:MM) — used during normalization
 */
function addHours(timeStr, hours) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/**
 * Generate a UUID v4
 */
function generateUUID() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Delete a reservation
 * @param {string} id
 * @returns {boolean}
 */
function deleteReservation(id) {
  const all = getAllReservations();
  const filtered = all.filter((r) => r.id !== id);
  if (filtered.length === all.length) return false;

  saveAll(filtered);
  return true;
}

/**
 * Export all reservations as a JSON string
 * @returns {string}
 */
function exportJSON() {
  return JSON.stringify(getAllReservations(), null, 2);
}

/**
 * Import reservations from a JSON string (merges with existing)
 * @param {string} jsonString
 * @returns {Object} { imported: number, duplicates: number, errors: number }
 */
function importJSON(jsonString) {
  const result = { imported: 0, duplicates: 0, errors: 0 };
  try {
    const incoming = JSON.parse(jsonString);
    if (!Array.isArray(incoming)) {
      result.errors = 1;
      return result;
    }

    const existing = getAllReservations();
    const existingIds = new Set(existing.map((r) => r.id));

  incoming.forEach((item) => {
    if (!item.id) {
      result.errors++;
      return;
    }
    if (existingIds.has(item.id)) {
      result.duplicates++;
      return;
    }
    // Normalize legacy items to v3 format before adding
    existing.push(normalizeReservation(item));
    result.imported++;
  });

    saveAll(existing);
  } catch (e) {
    result.errors++;
  }
  return result;
}

/**
 * Get count by status
 * @returns {Object} { draft, reservado, tentativo, completado, cancelado, total }
 */
function getCounts() {
  const all = getAllReservations();
  const counts = { draft: 0, reservado: 0, tentativo: 0, completado: 0, cancelado: 0, total: all.length };
  all.forEach((r) => {
    if (counts[r.status] !== undefined) counts[r.status]++;
  });
  return counts;
}

/**
 * Auto-import legacy reservations from JSON file if localStorage is empty
 */
async function autoImportLegacy() {
  const existing = getAllReservations();
  if (existing.length > 0) {
    return { imported: 0, reason: 'already_has_data' };
  }
  const raw = await loadFromJSON();
  if (raw.length === 0) return { imported: 0, reason: 'no_remote_data' };
  
  // Save normalized reservations to localStorage
  saveAll(raw);
  return { imported: raw.length };
}

// Export as global module
window.Storage = {
  generateUUID,
  getAllReservations,
  getReservation,
  createDraft,
  updateReservation,
  updateCurrentStep,
  promoteToBooking,
  deleteReservation,
  exportJSON,
  importJSON,
  getCounts,
  loadFromJSON,
  saveToJSON,
  checkSyncStatus,
  saveAll,
  autoImportLegacy,
  getAllClients,
  getOrRegisterClient,
  addHours,
};
