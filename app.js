/* ═══════════════════════════════════════════
   ProfiCalc – app.js  (Main Application Logic)
   ═══════════════════════════════════════════ */

'use strict';

/* ─── Storage Keys ─── */
const KEYS = {
  products:     'proficalc_products',
  transactions: 'proficalc_transactions',
};

/* ─── State ─── */
let pendingDeleteId = null;

/* ════════════════════════════════════════════
   STORAGE HELPERS
   ════════════════════════════════════════════ */
function getProducts()     { return JSON.parse(localStorage.getItem(KEYS.products)     || '[]'); }
function getTransactions() { return JSON.parse(localStorage.getItem(KEYS.transactions) || '[]'); }

function saveProducts(arr)     { localStorage.setItem(KEYS.products,     JSON.stringify(arr)); }
function saveTransactions(arr) { localStorage.setItem(KEYS.transactions, JSON.stringify(arr)); }

/* ════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════ */
function navigate(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  const navItem = document.getElementById('nav-' + pageId);
  if (navItem) navItem.classList.add('active');

  // Page-specific refresh
  const refreshMap = {
    'dashboard':   refreshDashboard,
    'products':    renderProductTable,
    'billing':     populateBillingDropdown,
    'damage':      populateDamageDropdown,
    'transactions':renderTransactions,
    'reports':     refreshReports,
    'export':      refreshExportCounts,
  };

  if (refreshMap[pageId]) refreshMap[pageId]();

  // Close mobile sidebar
  closeSidebar();
}

/* Nav link clicks */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigate(item.dataset.page);
  });
});

/* ════════════════════════════════════════════
   MOBILE SIDEBAR
   ════════════════════════════════════════════ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');

  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('show', sidebar.classList.contains('open'));
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('show');
}

/* ════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ════════════════════════════════════════════ */
let toastTimer;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3000);
}

/* ════════════════════════════════════════════
   MODAL
   ════════════════════════════════════════════ */
function openModal(productId, productName) {
  pendingDeleteId = productId;
  document.getElementById('modal-msg').textContent =
    `"${productName}" will be permanently removed along with all its data.`;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  pendingDeleteId = null;
  document.getElementById('modal-overlay').style.display = 'none';
}

document.getElementById('modal-confirm').addEventListener('click', () => {
  if (pendingDeleteId !== null) {
    deleteProduct(pendingDeleteId);
    closeModal();
  }
});

/* Close modal on overlay click */
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ════════════════════════════════════════════
   FORMAT HELPERS
   ════════════════════════════════════════════ */
function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/* ════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════ */
function refreshDashboard() {
  const products     = getProducts();
  const transactions = getTransactions();

  // Metrics
  let totalSales  = 0;
  let totalProfit = 0;
  let damageLoss  = 0;

  transactions.forEach(t => {
    if (t.type === 'sale') {
      totalSales  += t.amount;
      totalProfit += t.profit;
    } else if (t.type === 'damage') {
      damageLoss += t.amount;
    }
  });

  const netProfit = totalProfit - damageLoss;

  document.getElementById('m-sales').textContent        = fmt(totalSales);
  document.getElementById('m-profit').textContent       = fmt(totalProfit);
  document.getElementById('m-damage').textContent       = fmt(damageLoss);
  document.getElementById('m-net').textContent          = fmt(netProfit);
  document.getElementById('m-products').textContent     = products.length;
  document.getElementById('m-transactions').textContent = transactions.length;

  // Net profit color
  const netEl = document.getElementById('m-net');
  netEl.style.color = netProfit >= 0 ? 'var(--green)' : 'var(--red)';

  // Trend indicators
  document.getElementById('m-sales-trend').textContent   = totalSales > 0   ? '▲ Active'   : '—';
  document.getElementById('m-profit-trend').textContent  = totalProfit > 0  ? '▲ Earning'  : '—';
  document.getElementById('m-damage-trend').textContent  = damageLoss > 0   ? '▼ Loss'     : '—';
  document.getElementById('m-net-trend').textContent     = netProfit >= 0   ? '▲ Positive' : '▼ Negative';
  document.getElementById('m-net-trend').className       = 'metric-trend ' + (netProfit >= 0 ? 'up' : 'down');
  document.getElementById('m-products-trend').textContent = products.length + ' items';
  document.getElementById('m-txn-trend').textContent     = transactions.length + ' records';

  // Date
  const now = new Date();
  document.getElementById('dashboard-date').textContent =
    now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('topbar-date').textContent =
    now.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });

  // Low stock alerts
  const lowStockContainer = document.getElementById('low-stock-container');
  const lowStock = products.filter(p => p.stock < 5);
  if (lowStock.length === 0) {
    lowStockContainer.innerHTML = '<div class="empty-state">✅ All products have sufficient stock</div>';
  } else {
    const html = '<div class="low-stock-list">' +
      lowStock.map(p =>
        `<div class="low-stock-badge">⚠️ <strong>${p.name}</strong> — ${p.stock} left</div>`
      ).join('') + '</div>';
    lowStockContainer.innerHTML = html;
  }

  // Today's summary
  const todayStr = today();
  const todayTxns = transactions.filter(t => t.date.startsWith(todayStr));
  const todaySummaryContainer = document.getElementById('today-summary-container');

  if (todayTxns.length === 0) {
    todaySummaryContainer.innerHTML = '<div class="empty-state">No transactions recorded today</div>';
  } else {
    let todayRows = todayTxns.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${t.productName}</td>
        <td><span class="badge ${t.type === 'sale' ? 'badge-sale' : 'badge-damage'}">${t.type === 'sale' ? '📦 Sale' : '⚠️ Damage'}</span></td>
        <td>${t.qty}</td>
        <td>${fmt(t.amount)}</td>
        <td style="color:${t.type === 'sale' ? 'var(--green)' : 'var(--red)'}">${t.type === 'sale' ? '+' + fmt(t.profit) : '-' + fmt(t.amount)}</td>
      </tr>
    `).join('');

    todaySummaryContainer.innerHTML = `
      <div class="table-wrap">
        <table class="today-table">
          <thead>
            <tr><th>#</th><th>Product</th><th>Type</th><th>Qty</th><th>Amount</th><th>Profit/Loss</th></tr>
          </thead>
          <tbody>${todayRows}</tbody>
        </table>
      </div>
    `;
  }
}

/* ════════════════════════════════════════════
   ADD PRODUCT
   ════════════════════════════════════════════ */
function addProduct(e) {
  e.preventDefault();

  const name      = document.getElementById('p-name').value.trim();
  const qty       = parseInt(document.getElementById('p-qty').value);
  const wholesale = parseFloat(document.getElementById('p-wholesale').value);
  const selling   = parseFloat(document.getElementById('p-selling').value);

  if (!name || isNaN(qty) || isNaN(wholesale) || isNaN(selling)) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  if (selling < wholesale) {
    showToast('⚠️ Selling price is less than wholesale!', 'warning');
  }

  const products = getProducts();

  // Check duplicate name (case-insensitive)
  if (products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('Product with this name already exists', 'error');
    return;
  }

  const product = {
    id:        Date.now(),
    name,
    stock:     qty,
    initStock: qty,
    damage:    0,
    wholesale,
    selling,
    createdAt: new Date().toISOString(),
  };

  products.push(product);
  saveProducts(products);

  showToast(`✅ "${name}" added successfully!`, 'success');
  document.getElementById('add-product-form').reset();
  document.getElementById('profit-preview').textContent = 'Enter prices to see margin';
}

/* Live profit preview */
document.getElementById('p-wholesale').addEventListener('input', updateProfitPreview);
document.getElementById('p-selling').addEventListener('input', updateProfitPreview);

function updateProfitPreview() {
  const ws  = parseFloat(document.getElementById('p-wholesale').value);
  const sp  = parseFloat(document.getElementById('p-selling').value);
  const el  = document.getElementById('profit-preview');

  if (!isNaN(ws) && !isNaN(sp)) {
    const margin = sp - ws;
    const pct    = ws > 0 ? ((margin / ws) * 100).toFixed(1) : 0;
    if (margin >= 0) {
      el.textContent = `Margin: ${fmt(margin)} per unit (${pct}% profit)`;
      el.style.color = 'var(--green)';
      el.style.borderColor = 'rgba(34,197,94,.25)';
    } else {
      el.textContent = `⚠️ Loss: ${fmt(Math.abs(margin))} per unit`;
      el.style.color = 'var(--red)';
      el.style.borderColor = 'rgba(239,68,68,.25)';
    }
  } else {
    el.textContent = 'Enter prices to see margin';
    el.style.color = '';
    el.style.borderColor = '';
  }
}

/* ════════════════════════════════════════════
   PRODUCT LIST
   ════════════════════════════════════════════ */
function renderProductTable(query = '') {
  let products = getProducts();
  const q = (query || document.getElementById('search-input').value || '').toLowerCase().trim();
  if (q) products = products.filter(p => p.name.toLowerCase().includes(q));

  const tbody = document.getElementById('products-tbody');

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">${q ? '🔍 No products match your search' : '📦 No products added yet'}</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map((p, i) => {
    const margin = p.selling - p.wholesale;
    const marginPct = p.wholesale > 0 ? ((margin / p.wholesale) * 100).toFixed(1) : 'N/A';
    const marginClass = margin >= 0 ? 'margin-good' : 'margin-bad';
    const stockClass  = p.stock === 0 ? 'badge-red' : p.stock < 5 ? 'badge-orange' : 'badge-green';

    return `
      <tr>
        <td style="color:var(--muted);font-size:.8rem">${i + 1}</td>
        <td>
          <div style="font-weight:600">${escHtml(p.name)}</div>
          <div style="font-size:.72rem;color:var(--muted)">Added ${new Date(p.createdAt).toLocaleDateString('en-IN')}</div>
        </td>
        <td><span class="badge ${stockClass}">${p.stock}</span></td>
        <td><span class="badge badge-red">${p.damage}</span></td>
        <td>${fmt(p.wholesale)}</td>
        <td>${fmt(p.selling)}</td>
        <td><span class="margin-pill ${marginClass}">${margin >= 0 ? '+' : ''}${fmt(margin)} (${marginPct}%)</span></td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="navigate('billing')" title="Bill this product">🧾</button>
            <button class="btn btn-danger btn-sm" onclick="openModal(${p.id}, '${escHtml(p.name).replace(/'/g,'\\\'')}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterProducts() {
  renderProductTable();
}

function deleteProduct(id) {
  let products = getProducts();
  const name = (products.find(p => p.id === id) || {}).name || 'Product';
  products = products.filter(p => p.id !== id);
  saveProducts(products);
  renderProductTable();
  showToast(`🗑️ "${name}" deleted`, 'error');
}

/* ════════════════════════════════════════════
   BILLING
   ════════════════════════════════════════════ */
function populateBillingDropdown() {
  const products = getProducts().filter(p => p.stock > 0);
  const sel = document.getElementById('b-product');
  sel.innerHTML = '<option value="">— Choose a product —</option>' +
    products.map(p => `<option value="${p.id}">${escHtml(p.name)} (Stock: ${p.stock})</option>`).join('');
  resetBilling();
}

function updateBillingPreview() {
  const id  = parseInt(document.getElementById('b-product').value);
  const qty = parseInt(document.getElementById('b-qty').value);
  const products = getProducts();
  const product  = products.find(p => p.id === id);

  if (product) {
    document.getElementById('b-stock').textContent = `${product.stock} units available`;
    document.getElementById('b-stock').style.color = product.stock < 5 ? 'var(--orange)' : 'var(--green)';
  }

  const preview = document.getElementById('bill-preview');

  if (product && qty > 0) {
    const total  = product.selling * qty;
    const profit = (product.selling - product.wholesale) * qty;

    document.getElementById('bp-name').textContent   = product.name;
    document.getElementById('bp-qty').textContent    = qty + ' units';
    document.getElementById('bp-unit').textContent   = fmt(product.selling) + ' /unit';
    document.getElementById('bp-total').textContent  = fmt(total);
    document.getElementById('bp-profit').textContent = fmt(profit);

    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

function processBilling(e) {
  e.preventDefault();

  const id  = parseInt(document.getElementById('b-product').value);
  const qty = parseInt(document.getElementById('b-qty').value);

  if (!id || isNaN(qty) || qty < 1) {
    showToast('Please select a product and enter a valid quantity', 'error');
    return;
  }

  let products = getProducts();
  const idx    = products.findIndex(p => p.id === id);

  if (idx === -1) { showToast('Product not found', 'error'); return; }

  const product = products[idx];

  if (qty > product.stock) {
    showToast(`⚠️ Only ${product.stock} units in stock!`, 'warning');
    return;
  }

  // Process sale
  const total  = product.selling * qty;
  const profit = (product.selling - product.wholesale) * qty;

  products[idx].stock -= qty;
  saveProducts(products);

  // Save transaction
  const txns = getTransactions();
  txns.push({
    id:          Date.now(),
    type:        'sale',
    productId:   id,
    productName: product.name,
    qty,
    amount:      total,
    profit,
    date:        new Date().toISOString(),
  });
  saveTransactions(txns);

  showToast(`✅ Sold ${qty} × ${product.name} for ${fmt(total)}`, 'success');

  // Low stock warning
  if (products[idx].stock < 5 && products[idx].stock > 0) {
    setTimeout(() => showToast(`⚠️ Low stock: ${product.name} has only ${products[idx].stock} left`, 'warning'), 3200);
  }
  if (products[idx].stock === 0) {
    setTimeout(() => showToast(`🚨 ${product.name} is now OUT OF STOCK!`, 'error'), 3200);
  }

  document.getElementById('billing-form').reset();
  document.getElementById('bill-preview').style.display = 'none';
  document.getElementById('b-stock').textContent = '—';
  populateBillingDropdown();
}

function resetBilling() {
  document.getElementById('bill-preview').style.display = 'none';
  document.getElementById('b-stock').textContent = '—';
}

/* ════════════════════════════════════════════
   DAMAGE ENTRY
   ════════════════════════════════════════════ */
function populateDamageDropdown() {
  const products = getProducts().filter(p => p.stock > 0);
  const sel = document.getElementById('d-product');
  sel.innerHTML = '<option value="">— Choose a product —</option>' +
    products.map(p => `<option value="${p.id}">${escHtml(p.name)} (Stock: ${p.stock})</option>`).join('');
  resetDamage();
}

function updateDamagePreview() {
  const id  = parseInt(document.getElementById('d-product').value);
  const qty = parseInt(document.getElementById('d-qty').value);
  const products = getProducts();
  const product  = products.find(p => p.id === id);

  if (product) {
    document.getElementById('d-stock').textContent = `${product.stock} units available`;
  }

  const preview = document.getElementById('damage-preview');

  if (product && qty > 0) {
    const loss = product.wholesale * qty;
    document.getElementById('dp-name').textContent  = product.name;
    document.getElementById('dp-qty').textContent   = qty + ' units';
    document.getElementById('dp-unit').textContent  = fmt(product.wholesale) + ' /unit';
    document.getElementById('dp-total').textContent = fmt(loss);
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

function processDamage(e) {
  e.preventDefault();

  const id  = parseInt(document.getElementById('d-product').value);
  const qty = parseInt(document.getElementById('d-qty').value);

  if (!id || isNaN(qty) || qty < 1) {
    showToast('Please select a product and enter damage quantity', 'error');
    return;
  }

  let products = getProducts();
  const idx    = products.findIndex(p => p.id === id);

  if (idx === -1) { showToast('Product not found', 'error'); return; }

  const product = products[idx];

  if (qty > product.stock) {
    showToast(`⚠️ Only ${product.stock} units in stock!`, 'warning');
    return;
  }

  // Process damage
  const loss = product.wholesale * qty;
  products[idx].stock  -= qty;
  products[idx].damage += qty;
  saveProducts(products);

  // Save transaction
  const txns = getTransactions();
  txns.push({
    id:          Date.now(),
    type:        'damage',
    productId:   id,
    productName: product.name,
    qty,
    amount:      loss,
    profit:      -loss,
    date:        new Date().toISOString(),
  });
  saveTransactions(txns);

  showToast(`⚠️ Damage recorded: ${qty} × ${product.name} = Loss of ${fmt(loss)}`, 'warning');

  document.getElementById('damage-form').reset();
  document.getElementById('damage-preview').style.display = 'none';
  document.getElementById('d-stock').textContent = '—';
  populateDamageDropdown();
}

function resetDamage() {
  document.getElementById('damage-preview').style.display = 'none';
  document.getElementById('d-stock').textContent = '—';
}

/* ════════════════════════════════════════════
   TRANSACTIONS
   ════════════════════════════════════════════ */
function renderTransactions() {
  let txns   = getTransactions().slice().reverse();
  const q    = (document.getElementById('txn-search').value || '').toLowerCase();
  const type = document.getElementById('txn-filter').value;

  if (q)         txns = txns.filter(t => t.productName.toLowerCase().includes(q));
  if (type !== 'all') txns = txns.filter(t => t.type === type);

  const tbody = document.getElementById('txn-tbody');

  if (txns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No transactions found</td></tr>';
    return;
  }

  tbody.innerHTML = txns.map((t, i) => {
    const isSale   = t.type === 'sale';
    const plColor  = isSale ? 'var(--green)' : 'var(--red)';
    const plSign   = isSale ? '+' : '-';
    const plValue  = isSale ? t.profit : t.amount;
    return `
      <tr>
        <td style="color:var(--muted);font-size:.8rem">${i + 1}</td>
        <td style="font-size:.82rem;color:var(--muted)">${fmtDate(t.date)}</td>
        <td style="font-weight:600">${escHtml(t.productName)}</td>
        <td><span class="badge ${isSale ? 'badge-sale' : 'badge-damage'}">${isSale ? '📦 Sale' : '⚠️ Damage'}</span></td>
        <td>${t.qty}</td>
        <td>${fmt(t.amount)}</td>
        <td style="color:${plColor};font-weight:700">${plSign}${fmt(plValue)}</td>
      </tr>
    `;
  }).join('');
}

function filterTransactions() {
  renderTransactions();
}

/* ════════════════════════════════════════════
   CLEAR ALL DATA
   ════════════════════════════════════════════ */
function clearAllData() {
  if (!confirm('⚠️ This will DELETE ALL products, transactions, and records permanently. Are you sure?')) return;
  localStorage.removeItem(KEYS.products);
  localStorage.removeItem(KEYS.transactions);
  showToast('All data cleared', 'error');
  navigate('dashboard');
}

/* ════════════════════════════════════════════
   AUTHENTICATION
   ════════════════════════════════════════════ */
function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('loggedInUser');
  window.location.replace('login.html');
}

function initAuth() {
  // Display logged-in username in sidebar
  const username = localStorage.getItem('loggedInUser') || 'User';
  const usernameEl = document.getElementById('sidebar-username');
  const avatarEl   = document.getElementById('sidebar-avatar');
  if (usernameEl) usernameEl.textContent = username;
  if (avatarEl)   avatarEl.textContent   = username.charAt(0).toUpperCase();
}

/* ════════════════════════════════════════════
   REPORTS & ANALYTICS
   ════════════════════════════════════════════ */
let currentReportPeriod = 'week';

function switchReportTab(period) {
  currentReportPeriod = period;
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector(`.report-tab[data-period="${period}"]`);
  if (btn) btn.classList.add('active');
  refreshReports();
}

function getDateRange(period) {
  const now   = new Date();
  const start = new Date();
  if (period === 'week') {
    const day = now.getDay() || 7;
    start.setDate(now.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    return { start: new Date(0), end: new Date(now.getTime() + 86400000) };
  }
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function calcStats(txns) {
  let sales = 0, profit = 0, damage = 0;
  txns.forEach(t => {
    if (t.type === 'sale')   { sales += t.amount; profit += t.profit; }
    if (t.type === 'damage') { damage += t.amount; }
  });
  const net    = profit - damage;
  const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : 0;
  return { sales, profit, damage, net, margin, count: txns.length };
}

function refreshReports() {
  const period  = currentReportPeriod;
  const { start, end } = getDateRange(period);
  const allTxns = getTransactions();

  const txns = allTxns.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  const stats = calcStats(txns);

  document.getElementById('r-sales').textContent  = fmt(stats.sales);
  document.getElementById('r-profit').textContent = fmt(stats.profit);
  document.getElementById('r-damage').textContent = fmt(stats.damage);
  document.getElementById('r-net').textContent    = fmt(stats.net);
  document.getElementById('r-txns').textContent   = stats.count;
  document.getElementById('r-margin').textContent = stats.margin + '%';

  document.getElementById('r-net').style.color    = stats.net >= 0    ? 'var(--green)' : 'var(--red)';
  document.getElementById('r-margin').style.color = stats.margin >= 0 ? 'var(--green)' : 'var(--red)';

  // Period label
  const labels = {
    week:  `${start.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} – ${end.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}`,
    month: start.toLocaleDateString('en-IN', { month:'long', year:'numeric' }),
    year:  start.getFullYear().toString(),
    all:   'All Time',
  };
  document.getElementById('report-period-label').textContent = labels[period];

  renderReportBreakdown(period, allTxns);
  renderTopProducts(txns);
}

function renderReportBreakdown(period, allTxns) {
  const tbody = document.getElementById('report-tbody');
  const { start, end } = getDateRange(period);
  const groups = {};

  allTxns.forEach(t => {
    const d = new Date(t.date);
    if (d < start || d > end) return;

    let key;
    if (period === 'year') {
      key = d.toLocaleDateString('en-IN', { month:'long', year:'numeric' });
    } else {
      key = d.toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    }

    if (!groups[key]) groups[key] = { sales:0, profit:0, damage:0, count:0 };
    if (t.type === 'sale')   { groups[key].sales += t.amount; groups[key].profit += t.profit; }
    if (t.type === 'damage') { groups[key].damage += t.amount; }
    groups[key].count++;
  });

  const keys = Object.keys(groups);
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No data for this period</td></tr>';
    return;
  }

  tbody.innerHTML = keys.map(k => {
    const g   = groups[k];
    const net = g.profit - g.damage;
    const nc  = net >= 0 ? 'var(--green)' : 'var(--red)';
    const ns  = net >= 0 ? '+' : '-';
    return `<tr>
      <td style="font-weight:600">${k}</td>
      <td>${fmt(g.sales)}</td>
      <td style="color:var(--green)">${fmt(g.profit)}</td>
      <td style="color:var(--red)">${fmt(g.damage)}</td>
      <td style="color:${nc};font-weight:700">${ns}${fmt(Math.abs(net))}</td>
      <td><span class="badge badge-sale">${g.count}</span></td>
    </tr>`;
  }).join('');
}

function renderTopProducts(txns) {
  const map = {};
  txns.filter(t => t.type === 'sale').forEach(t => {
    if (!map[t.productName]) map[t.productName] = { qty:0, revenue:0, profit:0 };
    map[t.productName].qty     += t.qty;
    map[t.productName].revenue += t.amount;
    map[t.productName].profit  += t.profit;
  });

  const sorted = Object.entries(map).sort((a,b) => b[1].revenue - a[1].revenue).slice(0, 10);
  const tbody  = document.getElementById('top-products-tbody');

  if (!sorted.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No sales data for this period</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(([name, d], i) => `<tr>
    <td style="color:var(--muted)">${i+1}</td>
    <td style="font-weight:600">${escHtml(name)}</td>
    <td>${d.qty} units</td>
    <td>${fmt(d.revenue)}</td>
    <td style="color:${d.profit>=0?'var(--green)':'var(--red)'};font-weight:700">${fmt(d.profit)}</td>
  </tr>`).join('');
}

/* ════════════════════════════════════════════
   DATA VIEWER
   ════════════════════════════════════════════ */
let currentDataView = 'profit';

function refreshExportCounts() {
  // renamed but kept for nav refresh map compatibility
  switchDataView(currentDataView, true);
}

function switchDataView(view, silent) {
  currentDataView = view;

  // Toggle tabs
  document.querySelectorAll('#dv-tabs .report-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`#dv-tabs [data-dv="${view}"]`);
  if (activeTab) activeTab.classList.add('active');

  // Toggle panels
  document.getElementById('dv-profit').style.display = view === 'profit' ? '' : 'none';
  document.getElementById('dv-stock').style.display  = view === 'stock'  ? '' : 'none';

  if (view === 'profit') renderProfitHistory();
  else                   renderStockData();
}

/* ── Profit History ── */
function renderProfitHistory() {
  const q      = (document.getElementById('dv-profit-search').value || '').toLowerCase();
  const type   = document.getElementById('dv-profit-type').value;
  const period = document.getElementById('dv-profit-period').value;

  let txns = getTransactions().slice().reverse(); // newest first

  // Period filter
  if (period !== 'all') {
    const { start, end } = period === 'today'
      ? (() => {
          const s = new Date(); s.setHours(0,0,0,0);
          const e = new Date(); e.setHours(23,59,59,999);
          return { start: s, end: e };
        })()
      : getDateRange(period);
    txns = txns.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
  }

  // Type filter
  if (type !== 'all') txns = txns.filter(t => t.type === type);

  // Search filter
  if (q) txns = txns.filter(t => t.productName.toLowerCase().includes(q));

  // Summary strip
  const stats = calcStats(txns);
  const strip = document.getElementById('dv-profit-strip');
  strip.innerHTML = `
    <div class="dv-stat">💰 <span>Sales</span> <strong>${fmt(stats.sales)}</strong></div>
    <div class="dv-stat">📈 <span>Gross Profit</span> <strong style="color:var(--green)">${fmt(stats.profit)}</strong></div>
    <div class="dv-stat">📉 <span>Damage Loss</span> <strong style="color:var(--red)">${fmt(stats.damage)}</strong></div>
    <div class="dv-stat">🏆 <span>Net Profit</span> <strong style="color:${stats.net>=0?'var(--green)':'var(--red)'}">${fmt(stats.net)}</strong></div>
    <div class="dv-stat">🧾 <span>Records</span> <strong>${stats.count}</strong></div>
  `;

  // Table
  const tbody = document.getElementById('dv-profit-tbody');
  if (!txns.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No records found for this filter</td></tr>';
    document.getElementById('dv-profit-count').textContent = '';
    return;
  }

  tbody.innerHTML = txns.map((t, i) => {
    const isSale = t.type === 'sale';
    const pl     = isSale ? t.profit : -t.amount;
    const plColor = pl >= 0 ? 'var(--green)' : 'var(--red)';
    return `<tr>
      <td style="color:var(--muted);font-size:.8rem">${i+1}</td>
      <td style="font-size:.82rem;color:var(--muted)">${fmtDate(t.date)}</td>
      <td style="font-weight:600">${escHtml(t.productName)}</td>
      <td><span class="badge ${isSale?'badge-sale':'badge-damage'}">${isSale?'📦 Sale':'⚠️ Damage'}</span></td>
      <td>${t.qty}</td>
      <td>${fmt(t.amount)}</td>
      <td style="color:${plColor};font-weight:700">${pl>=0?'+':''}${fmt(pl)}</td>
    </tr>`;
  }).join('');

  document.getElementById('dv-profit-count').textContent = `Showing ${txns.length} record${txns.length!==1?'s':''}`;
}

/* ── Stock Data ── */
function renderStockData() {
  const q      = (document.getElementById('dv-stock-search').value || '').toLowerCase();
  const filter = document.getElementById('dv-stock-filter').value;
  const txns   = getTransactions();

  // Build profit earned per product from transactions
  const profitMap = {};
  txns.forEach(t => {
    if (t.type === 'sale') {
      profitMap[t.productId] = (profitMap[t.productId] || 0) + t.profit;
    }
  });

  let prds = getProducts();

  // Search
  if (q) prds = prds.filter(p => p.name.toLowerCase().includes(q));

  // Stock filter
  if      (filter === 'low') prds = prds.filter(p => p.stock > 0 && p.stock < 5);
  else if (filter === 'out') prds = prds.filter(p => p.stock === 0);
  else if (filter === 'ok')  prds = prds.filter(p => p.stock >= 5);

  // Summary strip
  const totalStock  = prds.reduce((s, p) => s + p.stock, 0);
  const totalDamage = prds.reduce((s, p) => s + p.damage, 0);
  const lowCount    = prds.filter(p => p.stock > 0 && p.stock < 5).length;
  const outCount    = prds.filter(p => p.stock === 0).length;
  const totalEarned = prds.reduce((s, p) => s + (profitMap[p.id] || 0), 0);

  const strip = document.getElementById('dv-stock-strip');
  strip.innerHTML = `
    <div class="dv-stat">📦 <span>Products</span> <strong>${prds.length}</strong></div>
    <div class="dv-stat">✅ <span>Total Units</span> <strong>${totalStock}</strong></div>
    <div class="dv-stat">⚠️ <span>Low Stock</span> <strong style="color:var(--orange)">${lowCount}</strong></div>
    <div class="dv-stat">🚫 <span>Out of Stock</span> <strong style="color:var(--red)">${outCount}</strong></div>
    <div class="dv-stat">💸 <span>Damage Units</span> <strong style="color:var(--red)">${totalDamage}</strong></div>
    <div class="dv-stat">🏆 <span>Profit Earned</span> <strong style="color:var(--green)">${fmt(totalEarned)}</strong></div>
  `;

  const tbody = document.getElementById('dv-stock-tbody');
  if (!prds.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No products found</td></tr>';
    document.getElementById('dv-stock-count').textContent = '';
    return;
  }

  tbody.innerHTML = prds.map((p, i) => {
    const margin      = p.selling - p.wholesale;
    const marginColor = margin >= 0 ? 'var(--green)' : 'var(--red)';
    const earned      = profitMap[p.id] || 0;
    let statusBadge;
    if      (p.stock === 0)         statusBadge = '<span class="badge badge-red">🚫 Out of Stock</span>';
    else if (p.stock < 5)           statusBadge = '<span class="badge badge-orange">⚠️ Low Stock</span>';
    else                            statusBadge = '<span class="badge badge-green">✅ In Stock</span>';
    return `<tr>
      <td style="color:var(--muted);font-size:.8rem">${i+1}</td>
      <td style="font-weight:600">${escHtml(p.name)}</td>
      <td><span class="badge ${p.stock===0?'badge-red':p.stock<5?'badge-orange':'badge-green'}">${p.stock}</span></td>
      <td><span class="badge badge-red">${p.damage}</span></td>
      <td>${fmt(p.wholesale)}</td>
      <td>${fmt(p.selling)}</td>
      <td style="color:${marginColor};font-weight:600">${margin>=0?'+':''}${fmt(margin)}</td>
      <td style="color:var(--green);font-weight:700">${fmt(earned)}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }).join('');

  document.getElementById('dv-stock-count').textContent = `Showing ${prds.length} product${prds.length!==1?'s':''}`;
}


function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvRow(arr) {
  return arr.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
}

function exportTransactionsCSV() {
  const txns = getTransactions();
  if (!txns.length) { showToast('No transactions to export','warning'); return; }
  const header = csvRow(['#','Date & Time','Product','Type','Quantity','Amount (INR)','Profit/Loss (INR)']);
  const rows   = txns.map((t,i) => csvRow([
    i+1,
    new Date(t.date).toLocaleString('en-IN'),
    t.productName,
    t.type === 'sale' ? 'Sale' : 'Damage',
    t.qty,
    t.amount.toFixed(2),
    (t.type === 'sale' ? t.profit : -t.amount).toFixed(2),
  ]));
  const date = new Date().toISOString().slice(0,10);
  downloadFile('\uFEFF' + [header,...rows].join('\r\n'), `ProfiCalc_Transactions_${date}.csv`, 'text/csv;charset=utf-8;');
  showToast(`✅ Exported ${txns.length} transactions`, 'success');
}

function exportProductsCSV() {
  const prds = getProducts();
  if (!prds.length) { showToast('No products to export','warning'); return; }
  const header = csvRow(['#','Product Name','Stock Qty','Damage Qty','Wholesale (INR)','Selling (INR)','Margin (INR)','Margin %','Added Date']);
  const rows   = prds.map((p,i) => {
    const margin = p.selling - p.wholesale;
    const mpct   = p.wholesale > 0 ? ((margin/p.wholesale)*100).toFixed(1) : '0';
    return csvRow([i+1, p.name, p.stock, p.damage, p.wholesale.toFixed(2), p.selling.toFixed(2), margin.toFixed(2), mpct+'%', new Date(p.createdAt).toLocaleDateString('en-IN')]);
  });
  const date = new Date().toISOString().slice(0,10);
  downloadFile('\uFEFF' + [header,...rows].join('\r\n'), `ProfiCalc_Products_${date}.csv`, 'text/csv;charset=utf-8;');
  showToast(`✅ Exported ${prds.length} products`, 'success');
}

function exportMonthlyCSV() {
  const txns = getTransactions();
  if (!txns.length) { showToast('No transactions to generate report','warning'); return; }
  const monthMap = {};
  txns.forEach(t => {
    const d   = new Date(t.date);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const lbl = d.toLocaleDateString('en-IN', { month:'long', year:'numeric' });
    if (!monthMap[key]) monthMap[key] = { label:lbl, sales:0, profit:0, damage:0, count:0 };
    if (t.type==='sale')   { monthMap[key].sales+=t.amount; monthMap[key].profit+=t.profit; }
    if (t.type==='damage') { monthMap[key].damage+=t.amount; }
    monthMap[key].count++;
  });
  const header = csvRow(['Month','Total Sales (INR)','Gross Profit (INR)','Damage Loss (INR)','Net Profit (INR)','Transactions']);
  const rows   = Object.keys(monthMap).sort().map(k => {
    const m = monthMap[k]; const net = m.profit - m.damage;
    return csvRow([m.label, m.sales.toFixed(2), m.profit.toFixed(2), m.damage.toFixed(2), net.toFixed(2), m.count]);
  });
  const all = calcStats(txns);
  rows.push(csvRow(['TOTAL', all.sales.toFixed(2), all.profit.toFixed(2), all.damage.toFixed(2), all.net.toFixed(2), txns.length]));
  const date = new Date().toISOString().slice(0,10);
  downloadFile('\uFEFF' + [header,...rows].join('\r\n'), `ProfiCalc_Monthly_Report_${date}.csv`, 'text/csv;charset=utf-8;');
  showToast('✅ Monthly report exported', 'success');
}

function exportFullBackup() {
  const backup = { exportedAt: new Date().toISOString(), exportedBy: localStorage.getItem('loggedInUser')||'unknown', products: getProducts(), transactions: getTransactions() };
  const date = new Date().toISOString().slice(0,10);
  downloadFile(JSON.stringify(backup, null, 2), `ProfiCalc_Backup_${date}.json`, 'application/json');
  showToast('💾 Full backup downloaded!', 'success');
}

/* ════════════════════════════════════════════
   ESCAPE HTML
   ════════════════════════════════════════════ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════ */
(function init() {
  initAuth();
  navigate('dashboard');
})();
