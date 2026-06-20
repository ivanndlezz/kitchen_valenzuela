/**
 * state.js
 * Global Shared Application State and DOM caches
 */

window.AppState = {
  products: [],
  filteredProducts: [],
  brands: [],
  filters: {
    text: "",
    category: "all",
    brand: "all",
    stockFilter: "all",
    sort: "name-asc",
    view: "grid",
  },
  theme: "dark",
  activeScannerTab: "photo",
  activeDrawerTab: "product",
  activeWarehouseId: "all",
  activeUserId: "",
  activeRoleId: "",
  
  // Quotations & Clients
  quoteItems: [],
  clients: [],
  quotations: [],
  currentQuoteId: null,
  quoteStep: 1,
  quoteClientId: null,
  qlFilter: 'all'
};

window.DOM = {
  themeBtn: null,
  scanBtn: null,
  productsContainer: null,
  searchInput: null,
  categoryTabsContainer: null,
  brandSelect: null,
  stockFilterSelect: null,
  sortSelect: null,
  viewGridBtn: null,
  viewListBtn: null,

  // Metrics
  metricTotalProducts: null,
  metricTotalStock: null,
  metricLowStock: null,
  metricTotalBrands: null,

  // Scrim & Drawer
  scrim: null,
  detailDrawer: null,
  closeDrawerBtn: null,
  drawerBody: null,
  drawerActions: null,
  drawerTabsContainer: null,
  drawerTabProduct: null,
  drawerTabForm: null,
  drawerViewProduct: null,
  drawerViewForm: null,

  // Scanner Modal
  scannerModal: null,
  scannerCloseBtn: null,
  scannerTabsContainer: null,
  cameraInput: null,
  triggerPhotoBtn: null,
  startVideoBtn: null,
  stopVideoBtn: null,

  // Toast Container
  toastContainer: null,
};
