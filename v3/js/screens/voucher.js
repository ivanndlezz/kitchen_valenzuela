/**
 * Voucher Screen — Love Shack v3
 * Confirmation letter for customers (Printable)
 * Exact copy from original reservations system
 */

const VoucherScreen = {
  container: null,
  reservationId: null,
  _originalTitle: document.title,

  render(container, params) {
    this.container = container;
    this.reservationId = params.id;

    const reservation = window.Storage.getReservation(this.reservationId);
    if (!reservation) {
      window.App.navigate('#/dashboard');
      return;
    }

    // Update App Header
    this.updateHeader();

    // Prepare data
    const s1 = reservation.data.step1_pricing || {};
    const s2 = reservation.data.step2_details || {};
    const s3 = reservation.data.step3_adjustments || {};

    const tripDateStr = s2.tripDate ? this.formatDate(s2.tripDate) : 'Pending';
    const startTime = s2.startTime || '11:00';
    const duration = parseInt(s1.durationHours) || 4;
    const timeRange = this.calculateTimeRange(startTime, duration);

    const tourName = (s2.tourType || 'NOT SPECIFIED').toUpperCase();
    const tourIcon = this.getTourIcon(s2.tourType);
    
    const adults = parseInt(s1.adults || s1.passengers) || 0;
    const kids = parseInt(s1.kids) || 0;
    const infants = parseInt(s1.infants) || 0;
    const extraPaxCount = parseInt(s1.extraPassengers || 0);
    const totalPax = adults + kids + infants;

    // Pricing components (Focus on Business Revenue)
    const rate = parseFloat(s1.hourlyRate) || 0;
    const basePrice = parseFloat(s1.baseTripCost || (rate * duration));
    const extraPaxCost = parseFloat(s1.extraPassengerCharge || 0);
    const adjustment = parseFloat(s3.priceAdjustment || 0);
    const extrasAmount = parseFloat(s3.extrasAmount || 0);
    
    // "Business Receives" matches Step 3 logic
    const businessReceives = basePrice + extraPaxCost + adjustment + extrasAmount;
    
    const deposit = parseFloat(s3.deposit) || 0;
    const balance = businessReceives - deposit;

    const foodName = s2.foodType || "MEXICAN BUFFET & NATIONAL OPEN BAR";
    const foodIncludeHtml = this.getFoodIncludeHtml(foodName);

    // Generate Business Folio (Nomenclature: IG MMDD-MMDD TIME)
    const businessFolio = this.generateBusinessFolio(reservation);

    // Dynamic Title for Print/Tab identification
    const guestName = s2.customerName || 'Guest';
    document.title = `${guestName} - Reserva: ${businessFolio}`;

    container.innerHTML = `
      <div class="voucher-screen">
        <div class="voucher-page">
          <!-- HEADER -->
          <div class="v-header">
            <div class="v-logo-box">
              <img src="https://www.loveshackcruises.com/wp-content/uploads/2025/06/newLogo.png" alt="Loveshack Cruises">
            </div>
            <div class="v-center-header">
              <div class="v-tour-title">
                <div class="v-tour-name">${tourName}</div>&nbsp;TOUR 
                <div class="v-tour-icon">${tourIcon}</div>
              </div>
            </div>
            <div class="v-right-header">
              <div class="v-res-number">Reservation: ${businessFolio}</div>
              Office México: 01-52- 624-105-1238<br>
              Cell Phone: 011-52-624-157-2797
            </div>
          </div>

          <!-- ADDRESS -->
          <div class="v-address-bar">
            Office Address: Plaza Náutica Loc. E1-B Cabo San Lucas CSL CP: 23450<br>
            e-mail: booking@loveshackcruises.com &nbsp;&nbsp; website: www.loveshackcruises.com
          </div>

          <!-- CLIENT INFO -->
          <div class="v-info-grid">
            <span class="v-label">Contact:</span>
            <span class="v-value">${this.escapeHtml(s2.customerName || 'Guest')}</span>
            <span></span><span></span>

            <span class="v-label">Name:</span>
            <span class="v-value gold">${this.escapeHtml(s2.customerName || 'Guest')}</span>
            <span class="v-label" style="text-align: right; padding-right: 4px">Phone:</span>
            <span class="v-value">${this.escapeHtml(s2.customerPhone || '')}</span>

            <span></span><span></span>
            <span class="v-label" style="text-align: right; padding-right: 4px">Email:</span>
            <span class="v-value">${this.escapeHtml(s2.customerEmail || '')}</span>

            <span class="v-label">Source:</span>
            <span class="v-value">${this.getSourceLabel(s3.bookingSource || s1.source || 'direct')}</span>
            <span></span><span></span>
          </div>

          <!-- RESERVATION DETAILS -->
          <div class="v-res-details">
            <span class="v-label">Reservation:</span>
            <span class="v-value">${businessFolio}</span>
            <span class="v-label">Food:</span>
            <span class="v-value">${foodName}</span>

            <span class="v-label">Date:</span>
            <span class="v-value">${tripDateStr}</span>
            <span class="v-label">Notes:</span>
            <span class="v-value">${this.escapeHtml(s2.notes || '')}</span>

            <span class="v-label">Time:</span>
            <span class="v-value">${timeRange}</span>
            <span></span><span class="v-value"></span>

            <span class="v-label">Hours:</span>
            <span class="v-value">${duration} HOURS</span>
            <span></span><span></span>

            <span class="v-label">Tour Name:</span>
            <span class="v-value">${tourName}</span>
            <span></span><span></span>
          </div>

          <!-- PASSENGERS -->
          <div class="v-passengers-row">
            <span class="v-label">Passengers:</span>
            <span class="v-value" style="text-align: center">${totalPax} PPL</span>
            <div class="v-pax-cell">${adults}<br>ADULTS</div>
            <div class="v-pax-cell">${kids}<br>KIDS</div>
            <div class="v-pax-cell">${infants}<br>INFANTS</div>
            <div class="v-pax-cell">${extraPaxCount > 0 ? extraPaxCount : '--'}<br>EXTRA PP</div>
          </div>

          <div class="v-hotel-row"><strong>Hotel:</strong> ${this.escapeHtml(s2.hotel || 'Not specified')}</div>

          <!-- NOTICE -->
          <div class="v-notice-box">
            <div style="font-weight: 700;">Please be at our dock 10 minutes before departure.</div>
            <div>We are located at Blue Marlin Dock #3, next to Breathless Hotel, at the Marina Fundadores</div>
            <div>Don't forget to bring your swimwear, comfortable shoes, sandals, no high heels, sun protection and towels. Wheelchair is not allowed,</div>
            <div>*This trip does not include transportation.</div>
            
            <div class="v-crew-tips">
              <span class="crew">CREW TIPS ARE NOT INCLUDED.</span>
              <span style="font-weight: 700">15% to 20% of the total price is recommended.</span>
            </div>
          </div>

          <!-- MAIN TABLE -->
          <div class="v-main-table">
            <div class="v-left-col">
              <span class="v-col-title">Reservation payments:</span>

              <div class="v-payment-row">
                <span style="color: #555">Hourly Rate (up to 14 pax):</span>
                <span>$${rate} / hr</span>
              </div>

              <div class="v-pricing-breakdown">
                <div class="v-breakdown-title" style="font-weight: 700; margin-bottom: 8px;">Price Breakdown</div>
                
                <div class="v-breakdown-row">
                  <span>Base trip — ${duration} hrs × ${rate}</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>

                ${extraPaxCost > 0 ? `
                <div class="v-breakdown-row">
                  <span>Extra passengers (${extraPaxCount} pax)</span>
                  <span>${extraPaxCost.toFixed(2)}</span>
                </div>
                ` : ''}

                ${extrasAmount > 0 ? `
                <div class="v-breakdown-row">
                  <span>Extra services</span>
                  <span>${extrasAmount.toFixed(2)}</span>
                </div>
                ` : ''}

                ${adjustment !== 0 ? `
                <div class="v-breakdown-row">
                  <span>Price Adjustment</span>
                  <span>${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)}</span>
                </div>
                ` : ''}
                
                <div class="v-breakdown-row total">
                  <span>Business Receives</span>
                  <span class="amount">${businessReceives.toFixed(2)} USD</span>
                </div>
              </div>

              <div class="v-payment-row">
                <span>Amount:</span>
                <span class="v-amount">$${businessReceives.toFixed(2)} USD</span>
              </div>
              <div class="v-payment-row">
                <span>Deposit: </span>
                <span class="v-amount">${deposit > 0 ? '$' + deposit.toFixed(2) : '--'}</span>
              </div>
              <div class="v-payment-row">
                <span>Balance:</span>
                <span class="v-amount">$${balance.toFixed(2)} USD</span>
              </div>

              <div class="v-balance-warning">
                REMAINING BALANCE MUST BE PAID AT<br>THE CHECK-IN WITH CASH.
              </div>
            </div>

            <div class="v-right-col">
              <span class="v-col-title">THIS TRIP INCLUDE:</span>
              <div class="v-include-text">
                ${foodIncludeHtml}
                <p><strong>Cancellations:</strong></p>
                <p class="v-no-show">NO SHOW, NO REFUND</p>
                
                 <div class="v-extras-row" style="display: flex; gap: 20px; font-size: 9px; color: #666;">
                   <div>
                     <div>Extra Pax: $100</div>
                     <div>Loss of equipment: $40.00</div>
                   </div>
                   <div>
                     <div>Extra hour: $${rate}</div>
                   </div>
                 </div>

                 <div style="margin-top: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; font-size: 10px; line-height: 1.5;">
                   <div style="font-weight: 700; margin-bottom: 4px;">📷 To preserve the memory of your trip, we have a photographer on board.</div>
                   <div>Photos are not included in the price and are optional for clients to purchase.</div>
                 </div>
               </div>
             </div>
          </div>

          <!-- BOTTOM -->
          <div class="v-bottom-row">
            <div class="v-bottom-cell"><em>Amount:</em> &nbsp; $${businessReceives.toFixed(2)} USD</div>
            <div class="v-bottom-cell"><em>Balance:</em> &nbsp; $${balance.toFixed(2)} USD</div>
          </div>

          <div class="v-payment-method">
            Payment method of this charter: &nbsp;<strong>${(s3.paymentMethod || 'CASH').toUpperCase()}</strong>
          </div>

          <!-- FOOTER -->
          <div class="v-footer">
            Thank you for choosing Love Shack Cruises!<br>
            We look forward to seeing you on board!
          </div>
        </div>
      </div>
    `;
  },

  updateHeader() {
    const header = document.querySelector('.app-header');
    if (!header) return;

    // Save original header content if not saved
    if (!this._originalHeader) {
      this._originalHeader = header.innerHTML;
    }

    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;" class="no-print">
        <button class="btn btn-secondary" onclick="window.history.back()" style="padding: 8px 12px;">
          <i class="ti ti-arrow-left"></i> Back
        </button>
        <div style="font-weight: 700; font-size: 16px;">Voucher Preview</div>
        <button class="btn btn-primary" onclick="window.print()" style="padding: 8px 16px;">
          <i class="ti ti-printer"></i> Print Voucher
        </button>
      </div>
    `;
  },

  generateBusinessFolio(reservation) {
    const s1 = reservation.data.step1_pricing || {};
    const s2 = reservation.data.step2_details || {};
    const createdAt = new Date(reservation.createdAt || Date.now());
    const tripDate = s2.tripDate ? new Date(s2.tripDate + 'T12:00:00') : new Date();

    const pad = (n) => String(n).padStart(2, '0');
    
    // Agent Code (default IG)
    const agent = "IG";
    
    // MMDD for creation and trip
    const confMMDD = `${pad(createdAt.getMonth() + 1)}${pad(createdAt.getDate())}`;
    const tripMMDD = `${pad(tripDate.getMonth() + 1)}${pad(tripDate.getDate())}`;

    // Time Formatting (7A, 11A, 330P etc)
    const time = s2.startTime || "11:00";
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'P' : 'A';
    const h12 = hours % 12 || 12;
    const timeStr = minutes === 0 ? `${h12}${ampm}` : `${h12}${minutes}${ampm}`;

    return `${agent} ${confMMDD}-${tripMMDD} ${timeStr}`;
  },

  formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  },

  calculateTimeRange(start, duration) {
    const [h, m] = start.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(h, m, 0);

    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    const fmt = (date) => {
      let hh = date.getHours();
      const mm = String(date.getMinutes()).padStart(2, '0');
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      return `${hh}:${mm} ${ampm}`;
    };

    return `${fmt(startDate)} — ${fmt(endDate)}`;
  },

  getTourIcon(tourType) {
    const name = (tourType || 'SNORKEL').toUpperCase();
    if (name.includes('SNORKEL')) return `<svg id="Capa_2" data-name="Capa 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 57.43 64.03"><defs><style>.cls-1{fill:#bba764;}</style></defs><g id="Capa_1-2" data-name="Capa 1"><g><path class="cls-1" d="M57.43,29.51c0-3.53-1.38-6.85-3.87-9.34-1.84-1.84-4.12-3.06-6.6-3.58V.75c0-.41-.34-.75-.75-.75h-5.38c-.41,0-.75.34-.75.75v15.55H13.21c-3.53,0-6.84,1.37-9.34,3.87-2.5,2.49-3.87,5.81-3.87,9.34,0,7.28,5.93,13.21,13.21,13.21h8.04c.28,0,.54-.16.67-.41l3.62-7.2h6.37l3.62,7.2c.13.25.39.41.67.41h3.89v10.22c0,2.41-1.96,4.38-4.38,4.38s-4.38-1.96-4.38-4.38v-4.04h3.38c.41,0,.75-.34.75-.75s-.34-.75-.75-.75h-11.99c-.41,0-.75.34-.75.75s.34.75.75.75h2.23v4.12c0,6.07,4.94,11,11,11s11-4.94,11-11v-10.59c5.98-1.26,10.47-6.58,10.47-12.92ZM41.58,1.5h3.88v14.8h-3.88V1.5ZM45.46,53.02c0,5.24-4.26,9.5-9.5,9.5s-9.5-4.26-9.5-9.5v-4.12h3.38v4.04c0,3.24,2.64,5.88,5.88,5.88s5.88-2.64,5.88-5.88v-10.22h2.64c.42,0,.83-.02,1.24-.06v10.36ZM44.22,41.22h-7.58l-3.62-7.2c-.13-.25-.39-.41-.67-.41h-7.29c-.28,0-.54.16-.67.41l-3.62,7.2h-7.58c-6.46,0-11.71-5.25-11.71-11.71,0-3.13,1.22-6.07,3.43-8.28,2.21-2.21,5.15-3.43,8.28-3.43h31.01c3.13,0,6.07,1.22,8.28,3.43,2.21,2.21,3.43,5.15,3.43,8.28,0,6.46-5.25,11.71-11.71,11.71Z"/><path class="cls-1" d="M23.18,23.79l-1.52.76c-.92.46-2,.38-2.84-.21-1.34-.94-3.07-1.04-4.5-.25l-3.4,1.85c-.36.2-.5.65-.3,1.02.14.25.39.39.66.39.12,0,.24-.03.36-.09l3.4-1.85c.93-.51,2.06-.45,2.92.16,1.29.9,2.96,1.02,4.37.32l1.52-.76c.37-.19.52-.64.33-1.01s-.63-.52-1.01-.33Z"/></g></g></svg>`;
    if (name.includes('SUNSET')) return `<svg id="Capa_2" data-name="Capa 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101.47 71.97"><defs><style>.cls-1{fill:#bba764;}</style></defs><g id="Capa_1-2" data-name="Capa 1"><g><path class="cls-1" d="M50.73,23.55c.41,0,.75-.34.75-.75V.75c0-.41-.34-.75-.75-.75s-.75.34-.75.75v22.05c0,.41.34.75.75.75Z"/><path class="cls-1" d="M60.15,24.84c.1.04.2.06.29.06.29,0,.57-.17.69-.46l5.56-13.02c.16-.38-.01-.82-.4-.98-.38-.16-.82.01-.98.39l-5.56,13.02c-.16.38.01.82.4.98Z"/><path class="cls-1" d="M70.49,31.73c.19,0,.38-.07.53-.22l15.59-15.59c.29-.29.29-.77,0-1.06s-.77-.29-1.06,0l-15.59,15.59c-.29.29-.29.77,0,1.06.15.15.34.22.53.22Z"/><path class="cls-1" d="M75.7,39.09c.12.29.4.47.7.47.09,0,.19-.02.28-.05l13.14-5.28c.38-.15.57-.59.42-.98-.15-.39-.59-.57-.98-.42l-13.14,5.28c-.38.15-.57.59-.42.98Z"/><path class="cls-1" d="M100.72,49.98h-28.69c-.4-11.41-9.79-20.58-21.3-20.58s-20.89,9.17-21.29,20.58H6.63s0,0,0,0H.75c-.41,0-.75.34-.75.75s.34.75.75.75h22.05s0,0,0,0h7.34s0,0,0,0h41.17s0,0,0,0h29.4c.41,0,.75-.34.75-.75s-.34-.75-.75-.75ZM50.73,30.91c10.69,0,19.43,8.49,19.83,19.08H30.91c.4-10.59,9.13-19.08,19.82-19.08Z"/><path class="cls-1" d="M10.84,36.15l13.02,5.56c.1.04.2.06.29.06.29,0,.57-.17.69-.46.16-.38-.01-.82-.4-.98l-13.02-5.56c-.38-.16-.82.01-.98.39-.16.38.01.82.4.98Z"/><path class="cls-1" d="M30.45,31.51c.15.15.34.22.53.22s.38-.07.53-.22c.29-.29.29-.77,0-1.06l-15.59-15.59c-.29-.29-.77-.29-1.06,0s-.29.77,0,1.06l15.59,15.59Z"/><path class="cls-1" d="M38.11,25.35c.12.29.4.47.7.47.09,0,.19-.02.28-.05.38-.15.57-.59.42-.98l-5.28-13.14c-.15-.38-.59-.57-.98-.42-.38.15-.57.59-.42.98l5.28,13.14Z"/><path class="cls-1" d="M70.81,54.54H30.15c-.41,0-.75.34-.75.75s.34.75.75.75h40.66c.41,0,.75-.34.75-.75s-.34-.75-.75-.75Z"/><path class="cls-1" d="M69.19,58.69h-37.11c-.41,0-.75.34-.75.75s.34.75.75.75h37.11c.41,0,.75-.34.75-.75s-.34-.75-.75-.75Z"/><path class="cls-1" d="M66.8,62.92h-31.62c-.41,0-.75.34-.75.75s.34.75.75.75h31.62c.41,0,.75-.34.75-.75s-.34-.75-.75-.75Z"/><path class="cls-1" d="M61.37,66.91h-21.01c-.41,0-.75.34-.75.75s.34.75.75.75h21.01c.41,0,.75-.34.75-.75s-.34-.75-.75-.75Z"/><path class="cls-1" d="M54.88,70.47h-8.03c-.41,0-.75.34-.75.75s.34.75.75.75h8.03c.41,0,.75-.34.75-.75s-.34-.75-.75-.75Z"/></g></g></svg>`;
    if (name.includes('FISHING')) return `<svg id="Capa_2" data-name="Capa 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 47.61 73.63"><defs><style>.cls-1{fill:#bba764;}</style></defs><g id="Capa_1-2" data-name="Capa 1"><path class="cls-1" d="M35.66,15.81c-.92-.39-1.83-.78-2.69-1.16v-1.41c3.32-.37,5.89-3.18,5.89-6.6,0-3.67-2.97-6.64-6.64-6.64s-6.58,2.92-6.64,6.54c-.27.24-.52.52-.71.87-1.13,2.08.47,4.5,2.56,5.98,1.13.8,2.52,1.52,4.04,2.23v17.23c-4.72,1.3-8.79,2.71-9.5,5.35-.41,1.51.3,3.16,2.18,5.03.15.15.34.22.53.22s.38-.07.53-.22c.29-.29.29-.77,0-1.06-1.44-1.44-2.04-2.64-1.79-3.58.49-1.82,4.04-3.07,8.05-4.19v22.74c0,8.26-6.72,14.99-14.99,14.99s-14.98-6.72-14.98-14.99v-21.11l5.08,5.08c.29.29.77.29,1.06,0s.29-.77,0-1.06l-6.36-6.36c-.21-.21-.54-.28-.82-.16-.28.12-.46.39-.46.69v22.92c0,9.09,7.39,16.49,16.48,16.49s16.49-7.4,16.49-16.49v-23.15c.41-.11.81-.22,1.22-.32,6.6-1.75,13.42-3.55,13.42-8.05,0-4.74-6.07-7.32-11.95-9.81ZM28.3,12.17c-1.17-.83-2.2-2.05-2.28-3.15.87,2.27,2.95,3.95,5.45,4.23v.71c-1.2-.58-2.28-1.16-3.17-1.79ZM33.8,32.22c-.28.07-.56.15-.83.22v-16.15c.69.3,1.39.6,2.11.9,5.42,2.3,11.03,4.68,11.03,8.43,0,3.34-6.54,5.08-12.3,6.6Z"/></g></svg>`;
    return `<svg id="Capa_2" data-name="Capa 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 57.86 61.31"><defs><style>.cls-1{fill:#bba764;}</style></defs><g id="Capa_1-2" data-name="Capa 1"><path class="cls-1" d="M57.11,31.46h-8.75c-.12-.41-.24-.82-.38-1.2-.05-.15-.11-.3-.17-.45l4.05-4.05c.29-.29.29-.77,0-1.06s-.77-.29-1.06,0l-4.39,4.39s0,0,0,0l-2.57,2.57c-.07.07-.12.15-.16.24-.08.18-.08.39,0,.57.08.18.22.33.41.41.09.04.19.06.29.06h2.83c.03.14.07.27.1.42.66,3.37.38,6.85-.81,10.08-.23.62-.45,1.13-.69,1.61-1.87,3.94-5.09,7.11-9.06,8.94-.52.25-1.05.46-1.61.65-.81.29-1.7.53-2.64.72-.92.18-1.86.28-2.79.32V17.58h7.4c.41,0,.75-.34.75-.75s-.34-.75-.75-.75h-7.4v-3.79c3.03-.4,5.37-2.98,5.37-6.12,0-3.41-2.77-6.17-6.17-6.17s-6.18,2.77-6.18,6.17c0,3.17,2.4,5.79,5.48,6.13v3.77h-7.51c-.41,0-.75.34-.75.75s.34.75.75.75h7.51v38.12c-1.96-.07-3.92-.44-5.78-1.13-.64-.25-1.15-.46-1.62-.69-3.94-1.88-7.11-5.1-8.93-9.06-.27-.57-.48-1.09-.66-1.62-.29-.81-.53-1.7-.72-2.64-.5-2.54-.46-5.12.09-7.6h2.94c.1,0,.19-.02.29-.06.18-.08.33-.22.41-.41.08-.18.08-.39,0-.57-.04-.09-.09-.17-.16-.24l-2.66-2.66s0,0,0,0l-4.31-4.31c-.29-.29-.77-.29-1.06,0s-.29.77,0,1.06l3.97,3.97c-.22.57-.41,1.14-.57,1.72H.75c-.41,0-.75.34-.75.75s.34.75.75.75h8.28c-.52,2.59-.55,5.26-.03,7.89.2,1.01.46,1.98.77,2.84.19.57.43,1.15.72,1.76,1.96,4.27,5.38,7.74,9.64,9.78.5.24,1.05.48,1.74.74,2.04.75,4.16,1.14,6.31,1.22v3.37c0,.41.34.75.75.75s.75-.34.75-.75v-3.38c1.03-.04,2.06-.14,3.08-.34,1.02-.2,1.98-.46,2.85-.78.6-.2,1.19-.44,1.75-.71,4.28-1.97,7.75-5.4,9.77-9.64.26-.52.5-1.08.75-1.75,1.29-3.49,1.59-7.25.88-10.89,0-.04-.02-.08-.03-.13h8.39c.41,0,.75-.34.75-.75s-.34-.75-.75-.75ZM24.2,6.17c0-2.58,2.1-4.67,4.68-4.67s4.67,2.1,4.67,4.67-2.1,4.67-4.67,4.67-4.68-2.1-4.68-4.67ZM11.13,30.9l.56.56h-.73c.06-.19.12-.37.18-.56ZM46.17,31.46l.47-.47c.05.15.1.31.15.47h-.62Z"/></g></svg>`;
  },

  getFoodIncludeHtml(foodName) {
     if (foodName.includes("MEXICAN BUFFET")) {
       return `
        <p><strong>Mexican Buffet:</strong> Chicken and beef Skewers, guacamole, chips, tortillas, quesadillas, and salsas</p>
        <p><strong>National Open Bar:</strong> Tequila, Rum, Vodka, light canned Beer, Soft drinks, and bottled water.</p>
       `;
     }
     if (foodName.includes("TACOS")) {
       return `
        <p><strong>Tacos Menu:</strong> Beef and chicken tacos, guacamole, chips, tortillas, quesadillas, and salsas</p>
        <p><strong>National Open Bar:</strong> Tequila, Rum, Vodka, light canned Beer, Soft drinks, and bottled water.</p>
       `;
     }
     return `<p>${foodName}</p>`;
  },

  getSourceLabel(sourceId) {
    const map = {
      direct: "📞 Direct",
      "get-my-boat": "🐬 GMB",
      viator: "✈️ Viator",
      fareharbor: "🚦 FH",
    };
    return map[sourceId] || sourceId;
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  destroy() {
    // Restore title
    document.title = this._originalTitle;
    
    // Restore header if we saved it
    if (this._originalHeader) {
      const header = document.querySelector('.app-header');
      if (header) header.innerHTML = this._originalHeader;
      this._originalHeader = null;
    }
    this.container = null;
    this.reservationId = null;
  },
};

window.VoucherScreen = VoucherScreen;
