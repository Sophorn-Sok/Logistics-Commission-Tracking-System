const STORAGE_KEYS = {
  loads: 'ltcs_loads',
  commission: 'ltcs_commission',
  theme: 'ltcs_theme',
  sort: 'ltcs_sort'
};

const elements = {
  loadForm: document.getElementById('loadForm'),
  topbar: document.querySelector('.topbar'),
  date: document.getElementById('date'),
  routeName: document.getElementById('routeName'),
  region: document.getElementById('region'),
  customerName: document.getElementById('customerName'),
  ourRate: document.getElementById('ourRate'),
  driverRate: document.getElementById('driverRate'),
  notes: document.getElementById('notes'),
  calculatedProfit: document.getElementById('calculatedProfit'),
  loadTableBody: document.getElementById('loadTableBody'),
  totalLoads: document.getElementById('totalLoads'),
  totalRevenue: document.getElementById('totalRevenue'),
  totalDriverCost: document.getElementById('totalDriverCost'),
  totalProfit: document.getElementById('totalProfit'),
  estimatedCommission: document.getElementById('estimatedCommission'),
  commissionPercent: document.getElementById('commissionPercent'),
  commissionEarned: document.getElementById('commissionEarned'),
  monthlyLoads: document.getElementById('monthlyLoads'),
  monthlyRevenue: document.getElementById('monthlyRevenue'),
  monthlyDriverCost: document.getElementById('monthlyDriverCost'),
  monthlyProfit: document.getElementById('monthlyProfit'),
  monthlyCommission: document.getElementById('monthlyCommission'),
  summaryTitle: document.getElementById('summaryTitle'),
  searchInput: document.getElementById('searchInput'),
  regionFilter: document.getElementById('regionFilter'),
  clearFilters: document.getElementById('clearFilters'),
  sortDate: document.getElementById('sortDate'),
  sortIndicator: document.getElementById('sortIndicator'),
  themeToggle: document.getElementById('themeToggle'),
  printReport: document.getElementById('printReport'),
  exportCsv: document.getElementById('exportCsv'),
  cancelEdit: document.getElementById('cancelEdit'),
  formTitle: document.getElementById('formTitle'),
  submitButton: document.getElementById('submitButton'),
  emptyState: document.getElementById('emptyState'),
  topRoutes: document.getElementById('topRoutes')
};

let loads = loadFromStorage(STORAGE_KEYS.loads, []);
let commissionPercent = Number(loadFromStorage(STORAGE_KEYS.commission, 10));
let theme = loadFromStorage(STORAGE_KEYS.theme, 'light');
let sortDirection = loadFromStorage(STORAGE_KEYS.sort, 'desc');
let editId = null;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function loadFromStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue === null ? fallback : JSON.parse(rawValue);
  } catch (error) {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function parseNumber(value) {
  return Number.parseFloat(value) || 0;
}

function calculateProfit(load) {
  // Profit is the negotiated margin: our rate minus the driver or broker cost.
  return parseNumber(load.ourRate) - parseNumber(load.driverRate);
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function loadMonthKey(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getFilteredLoads() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const selectedRegion = elements.regionFilter.value;

  return [...loads]
    .filter((load) => {
      const matchesSearch = !searchTerm
        || load.customerName.toLowerCase().includes(searchTerm)
        || load.routeName.toLowerCase().includes(searchTerm);
      const matchesRegion = selectedRegion === 'all' || load.region === selectedRegion;
      return matchesSearch && matchesRegion;
    })
    .sort((first, second) => {
      const firstDate = new Date(first.date).getTime();
      const secondDate = new Date(second.date).getTime();
      return sortDirection === 'asc' ? firstDate - secondDate : secondDate - firstDate;
    });
}

function getTotals(dataset) {
  return dataset.reduce(
    (accumulator, load) => {
      const profit = calculateProfit(load);
      accumulator.totalLoads += 1;
      accumulator.totalRevenue += parseNumber(load.ourRate);
      accumulator.totalDriverCost += parseNumber(load.driverRate);
      accumulator.totalProfit += profit;
      return accumulator;
    },
    {
      totalLoads: 0,
      totalRevenue: 0,
      totalDriverCost: 0,
      totalProfit: 0
    }
  );
}

function updateMetrics() {
  const allTotals = getTotals(loads);
  const monthlyLoads = loads.filter((load) => loadMonthKey(load.date) === currentMonthKey());
  const monthlyTotals = getTotals(monthlyLoads);
  const commissionValue = allTotals.totalProfit * (commissionPercent / 100);
  const monthlyCommissionValue = monthlyTotals.totalProfit * (commissionPercent / 100);

  elements.totalLoads.textContent = allTotals.totalLoads;
  elements.totalRevenue.textContent = formatCurrency(allTotals.totalRevenue);
  elements.totalDriverCost.textContent = formatCurrency(allTotals.totalDriverCost);
  elements.totalProfit.textContent = formatCurrency(allTotals.totalProfit);
  elements.estimatedCommission.textContent = formatCurrency(commissionValue);

  elements.monthlyLoads.textContent = monthlyTotals.totalLoads;
  elements.monthlyRevenue.textContent = formatCurrency(monthlyTotals.totalRevenue);
  elements.monthlyDriverCost.textContent = formatCurrency(monthlyTotals.totalDriverCost);
  elements.monthlyProfit.textContent = formatCurrency(monthlyTotals.totalProfit);
  elements.monthlyCommission.textContent = formatCurrency(monthlyCommissionValue);
  elements.commissionEarned.textContent = formatCurrency(commissionValue);
  elements.summaryTitle.textContent = `This Month (${new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' })})`;
}

function renderTable() {
  const visibleLoads = getFilteredLoads();

  elements.loadTableBody.innerHTML = '';
  elements.emptyState.classList.toggle('hidden', visibleLoads.length > 0);

  visibleLoads.forEach((load) => {
    const row = document.createElement('tr');
    const profit = calculateProfit(load);

    row.innerHTML = `
      <td data-label="Date">${formatDate(load.date)}</td>
      <td data-label="Route">${escapeHtml(load.routeName)}</td>
      <td data-label="Region">${escapeHtml(load.region)}</td>
      <td data-label="Customer">${escapeHtml(load.customerName)}</td>
      <td data-label="Our Rate">${formatCurrency(load.ourRate)}</td>
      <td data-label="Driver Rate">${formatCurrency(load.driverRate)}</td>
      <td data-label="Profit">${formatCurrency(profit)}</td>
      <td data-label="Actions">
        <div class="action-group">
          <button class="edit-btn" data-action="edit" data-id="${load.id}" type="button">Edit</button>
          <button class="delete-btn" data-action="delete" data-id="${load.id}" type="button">Delete</button>
        </div>
      </td>
    `;

    elements.loadTableBody.appendChild(row);
  });
}

function renderTopRoutes() {
  const profitsByRoute = loads.reduce((accumulator, load) => {
    const key = load.routeName.trim();
    if (!accumulator[key]) {
      accumulator[key] = { routeName: key, totalProfit: 0, loads: 0 };
    }
    accumulator[key].totalProfit += calculateProfit(load);
    accumulator[key].loads += 1;
    return accumulator;
  }, {});

  const sortedRoutes = Object.values(profitsByRoute)
    .sort((first, second) => second.totalProfit - first.totalProfit)
    .slice(0, 5);

  elements.topRoutes.innerHTML = '';

  if (sortedRoutes.length === 0) {
    elements.topRoutes.innerHTML = '<p class="empty-state">Add loads to see your highest profit routes.</p>';
    return;
  }

  sortedRoutes.forEach((route, index) => {
    const item = document.createElement('div');
    item.className = 'route-item';
    item.innerHTML = `
      <div>
        <span class="route-meta">#${index + 1} ${escapeHtml(route.routeName)}</span>
        <strong>${formatCurrency(route.totalProfit)}</strong>
      </div>
      <div class="route-meta">${route.loads} load${route.loads === 1 ? '' : 's'}</div>
    `;
    elements.topRoutes.appendChild(item);
  });
}

// Charts removed: analytic visuals no longer rendered.

function updateSortUI() {
  elements.sortIndicator.textContent = sortDirection === 'asc' ? '↑' : '↓';
}

function setTheme(nextTheme) {
  theme = nextTheme;
  document.body.classList.toggle('dark', theme === 'dark');
  elements.themeToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  saveToStorage(STORAGE_KEYS.theme, theme);
}

function resetForm() {
  editId = null;
  elements.loadForm.reset();
  elements.date.valueAsDate = new Date();
  elements.formTitle.textContent = 'Add Load';
  elements.submitButton.textContent = 'Add Load';
  elements.cancelEdit.classList.add('hidden');
  updateCalculatedProfit();
}

function updateCalculatedProfit() {
  const profit = parseNumber(elements.ourRate.value) - parseNumber(elements.driverRate.value);
  elements.calculatedProfit.textContent = formatCurrency(profit);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function saveLoads() {
  saveToStorage(STORAGE_KEYS.loads, loads);
}

function renderAll() {
  updateSortUI();
  updateMetrics();
  renderTable();
  renderTopRoutes();
  // Charts removed: handled separately if needed
}

function handleSubmit(event) {
  event.preventDefault();

  const load = {
    id: editId || crypto.randomUUID(),
    date: elements.date.value,
    routeName: elements.routeName.value.trim(),
    region: elements.region.value,
    customerName: elements.customerName.value.trim(),
    ourRate: parseNumber(elements.ourRate.value),
    driverRate: parseNumber(elements.driverRate.value),
    notes: elements.notes.value.trim(),
    createdAt: editId ? loads.find((item) => item.id === editId)?.createdAt || new Date().toISOString() : new Date().toISOString()
  };

  const existingProfit = calculateProfit(load);

  if (!load.date || !load.routeName || !load.region || !load.customerName) {
    return;
  }

  if (editId) {
    loads = loads.map((item) => (item.id === editId ? load : item));
  } else {
    loads.unshift(load);
  }

  saveLoads();
  renderAll();
  resetForm();
}

function handleTableAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const loadId = button.dataset.id;

  if (button.dataset.action === 'delete') {
    loads = loads.filter((load) => load.id !== loadId);
    saveLoads();
    renderAll();
    return;
  }

  if (button.dataset.action === 'edit') {
    const load = loads.find((item) => item.id === loadId);
    if (!load) return;

    editId = load.id;
    elements.date.value = load.date;
    elements.routeName.value = load.routeName;
    elements.region.value = load.region;
    elements.customerName.value = load.customerName;
    elements.ourRate.value = load.ourRate;
    elements.driverRate.value = load.driverRate;
    elements.notes.value = load.notes || '';
    elements.formTitle.textContent = 'Edit Load';
    elements.submitButton.textContent = 'Update Load';
    elements.cancelEdit.classList.remove('hidden');
    updateCalculatedProfit();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function exportCsvFile() {
  const header = ['Date', 'Route', 'Region', 'Customer', 'Our Rate', 'Driver Rate', 'Profit', 'Notes'];
  const rows = loads.map((load) => [
    load.date,
    load.routeName,
    load.region,
    load.customerName,
    load.ourRate,
    load.driverRate,
    calculateProfit(load),
    (load.notes || '').replaceAll('"', '""')
  ]);

  const csvContent = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value)}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `logistics-load-report-${currentMonthKey()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function seedDefaults() {
  if (!elements.date.value) {
    elements.date.valueAsDate = new Date();
  }
  elements.commissionPercent.value = commissionPercent;
  setTheme(theme);
  updateSortUI();
}

function initializeEvents() {
  elements.loadForm.addEventListener('submit', handleSubmit);
  elements.loadTableBody.addEventListener('click', handleTableAction);
  elements.ourRate.addEventListener('input', updateCalculatedProfit);
  elements.driverRate.addEventListener('input', updateCalculatedProfit);
  elements.commissionPercent.addEventListener('input', () => {
    commissionPercent = Math.min(100, Math.max(0, parseNumber(elements.commissionPercent.value)));
    elements.commissionPercent.value = commissionPercent;
    saveToStorage(STORAGE_KEYS.commission, commissionPercent);
    updateMetrics();
  });
  elements.searchInput.addEventListener('input', renderTable);
  elements.regionFilter.addEventListener('change', renderTable);
  elements.clearFilters.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.regionFilter.value = 'all';
    renderTable();
  });
  elements.sortDate.addEventListener('click', () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    saveToStorage(STORAGE_KEYS.sort, sortDirection);
    updateSortUI();
    renderTable();
  });
  elements.themeToggle.addEventListener('click', () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  });
  elements.printReport.addEventListener('click', () => window.print());
  elements.exportCsv.addEventListener('click', exportCsvFile);
  elements.cancelEdit.addEventListener('click', resetForm);
  window.addEventListener('resize', () => {
    // Handle resize if charts exist
  });
  // Topbar scroll handling for professional sticky appearance
  function handleTopbarScroll() {
    if (!elements.topbar) return;
    const y = window.scrollY || window.pageYOffset;
    elements.topbar.classList.toggle('scrolled', y > 8);
  }
  window.addEventListener('scroll', handleTopbarScroll, { passive: true });
  // initialize state
  handleTopbarScroll();
}

function ensureDemoData() {
  if (loads.length > 0) return;

  
  

  saveLoads();
}

seedDefaults();
ensureDemoData();
initializeEvents();
resetForm();
renderAll();
