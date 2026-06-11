/**
 * commercial-screen.js
 * Coordinates quote and client flows inside the commercial scope.
 */

(function () {
  let activeFlow = "quotes";
  let isMounted = false;

  function getQuotesSection() {
    return document.getElementById("section-quotes");
  }

  function getClientsSection() {
    return document.getElementById("section-clients");
  }

  function mountClientsIntoCommercialScope() {
    if (isMounted) return;

    const quotesSection = getQuotesSection();
    const clientsSection = getClientsSection();
    if (!quotesSection || !clientsSection) return;

    clientsSection.classList.remove("app-section");
    clientsSection.classList.add("commercial-subview");
    clientsSection.hidden = true;
    quotesSection.appendChild(clientsSection);
    isMounted = true;
  }

  function setActiveTab(flow) {
    document.querySelectorAll("[data-commercial-flow]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.commercialFlow === flow);
    });
  }

  function setQuoteViewsVisible(visible) {
    const quoteList = document.getElementById("quote-list-view");
    const quoteStepper = document.getElementById("quote-stepper-view");
    if (quoteList) quoteList.hidden = !visible;
    if (quoteStepper) quoteStepper.hidden = !visible;
  }

  window.showCommercialFlow = function (flow) {
    mountClientsIntoCommercialScope();
    activeFlow = flow === "clients" ? "clients" : "quotes";
    setActiveTab(activeFlow);

    const clientsSection = getClientsSection();
    const showingClients = activeFlow === "clients";
    setQuoteViewsVisible(!showingClients);
    if (clientsSection) clientsSection.hidden = !showingClients;

    if (showingClients && window.renderClientsView) {
      window.renderClientsView();
    } else if (!showingClients && window.renderQuotesView) {
      window.renderQuotesView();
    }
  };

  window.getCommercialFlow = function () {
    return activeFlow;
  };

  document.addEventListener("DOMContentLoaded", () => {
    mountClientsIntoCommercialScope();

    document.querySelectorAll("[data-commercial-flow]").forEach((button) => {
      button.addEventListener("click", () => {
        const flow = button.dataset.commercialFlow;
        window.location.hash = flow === "clients" ? "#/clients" : "#/quotation";
      });
    });
  });
})();
