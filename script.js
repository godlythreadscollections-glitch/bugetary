/**
 * script.js — App logic
 * Dashboard + analytics inline, modals for Expenses, Sales & Profile.
 */

const CAT_COLORS = {
  Food:'#1D9E75', Transport:'#378ADD', Shopping:'#D4537E',
  Health:'#E24B4A', Entertainment:'#BA7517', Bills:'#639922',
  Education:'#533AB7', Other:'#888780',
  // Sales categories
  Product:'#0EA5E9', Service:'#8B5CF6', Subscription:'#F59E0B',
  Consulting:'#10B981', Commission:'#EC4899'
};

const SALE_COLORS = {
  Product:'#0EA5E9', Service:'#8B5CF6', Subscription:'#F59E0B',
  Consulting:'#10B981', Commission:'#EC4899', Other:'#6B7280'
};

let currentFilter    = 'All';
let currentSaleFilter = 'All';
let catChart    = null;
let trendChart  = null;
let yearlyChart = null;

/* ─────────────────────────────────────────
   MODAL HELPERS
───────────────────────────────────────── */
function openModal(name) {
  const id = 'modal-' + name;
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
  if (name === 'profile') renderProfile();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function backdropClose(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['modal-expenses','modal-sales','modal-profile'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('open')) closeModal(id);
    });
  }
});

/* ─────────────────────────────────────────
   FORMATTING
───────────────────────────────────────── */
function fmt(n) { return Math.round(n).toLocaleString('en-IN'); }
function today() { return new Date().toISOString().slice(0, 10); }

/* ─────────────────────────────────────────
   REFRESH UI
───────────────────────────────────────── */
async function refreshUI() {
  const [expenses, sales] = await Promise.all([getAllExpenses(), getAllSales()]);

  const totalExp  = expenses.reduce((s, e) => s + e.amount, 0);
  const totalSale = sales.reduce((s, e) => s + e.amount, 0);
  const profit    = totalSale - totalExp;
  const avgSale   = sales.length ? Math.round(totalSale / sales.length) : 0;

  // Expense card
  document.getElementById('db-spent').textContent    = fmt(totalExp);
  document.getElementById('db-txn').textContent      = expenses.length;

  const maxVal = Math.max(totalExp, totalSale, 1);
  const expPct  = Math.min(100, Math.round(totalExp  / maxVal * 100));
  const salePct = Math.min(100, Math.round(totalSale / maxVal * 100));

  const bar = document.getElementById('prog-bar');
  bar.style.width      = expPct + '%';
  bar.style.background = expPct >= 90 ? '#E24B4A' : expPct >= 70 ? '#BA7517' : '#1D9E75';

  // Sales card
  document.getElementById('db-sales').textContent    = fmt(totalSale);
  document.getElementById('db-txn-sale').textContent = sales.length;
  document.getElementById('db-avg-sale').textContent = fmt(avgSale);
  document.getElementById('sales-bar').style.width   = salePct + '%';

  // Profit card
  const profitEl = document.getElementById('db-profit');
  profitEl.textContent = (profit >= 0 ? '+' : '-') + fmt(Math.abs(profit));
  profitEl.style.color = profit >= 0 ? 'var(--teal)' : 'var(--red)';

  const badge = document.getElementById('profit-badge');
  if (profit > 0) {
    badge.textContent  = '▲ In Profit';
    badge.className    = 'profit-badge profit-pos';
  } else if (profit < 0) {
    badge.textContent  = '▼ In Loss';
    badge.className    = 'profit-badge profit-neg';
  } else {
    badge.textContent  = '— Break-even';
    badge.className    = 'profit-badge';
  }

  document.getElementById('card-profit').className =
    'metric-card ' + (profit > 0 ? 'safe' : profit < 0 ? 'danger' : 'neutral');

  renderRecent(expenses);
  renderRecentSales(sales);
  renderExpenseList(expenses);
  renderSaleList(sales);
  renderCharts(expenses, sales);
}

/* ─────────────────────────────────────────
   ITEM HTML TEMPLATES
───────────────────────────────────────── */
function expenseHTML(e) {
  return `<div class="expense-item">
    <div class="expense-cat-badge" style="background:${CAT_COLORS[e.category]}22;">${e.category[0]}</div>
    <div class="expense-details">
      <div class="expense-name">${e.name}</div>
      <div class="expense-meta">${e.category} · ${e.date}${e.note?' · '+e.note:''}</div>
    </div>
    <div class="expense-amount" style="color:${CAT_COLORS[e.category]||'#888'}">${fmt(e.amount)}</div>
    <button class="expense-del" onclick="deleteExp(${e.id})" title="Delete">✕</button>
  </div>`;
}

function saleHTML(s) {
  const col = SALE_COLORS[s.category] || '#0EA5E9';
  return `<div class="expense-item sale-item">
    <div class="expense-cat-badge" style="background:${col}22;">${s.category[0]}</div>
    <div class="expense-details">
      <div class="expense-name">${s.name}</div>
      <div class="expense-meta">${s.category} · ${s.date}${s.note?' · '+s.note:''}</div>
    </div>
    <div class="expense-amount" style="color:${col}">+${fmt(s.amount)}</div>
    <button class="expense-del" onclick="deleteSale(${s.id})" title="Delete">✕</button>
  </div>`;
}

/* ─────────────────────────────────────────
   RECENT LISTS
───────────────────────────────────────── */
function renderRecent(expenses) {
  const recent = [...expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  document.getElementById('recent-list').innerHTML = recent.length
    ? recent.map(expenseHTML).join('')
    : '<div class="empty-state"><div class="icon">💸</div><p>No expenses yet.</p></div>';
}

function renderRecentSales(sales) {
  const recent = [...sales].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
  document.getElementById('recent-sales-list').innerHTML = recent.length
    ? recent.map(saleHTML).join('')
    : '<div class="empty-state"><div class="icon">📈</div><p>No sales yet — click "Add Sale" to get started.</p></div>';
}

/* ─────────────────────────────────────────
   FULL LISTS (modal)
───────────────────────────────────────── */
function renderExpenseList(expenses) {
  const filtered = currentFilter === 'All' ? expenses : expenses.filter(e=>e.category===currentFilter);
  const sorted   = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));
  document.getElementById('expense-list').innerHTML = sorted.length
    ? sorted.map(expenseHTML).join('')
    : '<div class="empty-state"><div class="icon">🔍</div><p>No expenses in this category.</p></div>';
}

function renderSaleList(sales) {
  const filtered = currentSaleFilter === 'All' ? sales : sales.filter(s=>s.category===currentSaleFilter);
  const sorted   = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));
  document.getElementById('sale-list').innerHTML = sorted.length
    ? sorted.map(saleHTML).join('')
    : '<div class="empty-state"><div class="icon">🔍</div><p>No sales in this category.</p></div>';
}

/* ─────────────────────────────────────────
   FILTERS
───────────────────────────────────────── */
function setFilter(cat, btn, type) {
  if (type === 'exp') {
    currentFilter = cat;
    document.querySelectorAll('#modal-expenses .filter-chip').forEach(c=>c.classList.remove('active'));
    btn.classList.add('active');
    getAllExpenses().then(renderExpenseList);
  } else {
    currentSaleFilter = cat;
    document.querySelectorAll('#modal-sales .filter-chip').forEach(c=>c.classList.remove('active'));
    btn.classList.add('active');
    getAllSales().then(renderSaleList);
  }
}

/* ─────────────────────────────────────────
   ADD EXPENSE
───────────────────────────────────────── */
async function addExpense() {
  const name   = document.getElementById('expName').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const cat    = document.getElementById('expCat').value;
  const date   = document.getElementById('expDate').value || today();
  const note   = document.getElementById('expNote').value.trim();
  if (!name || !amount || amount <= 0) { toast('Please fill in name and a valid amount.', 'error'); return; }
  await addExpenseToDB({ name, amount, category: cat, date, note });
  document.getElementById('expName').value   = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expNote').value   = '';
  toast('Expense added!', 'success');
  await refreshUI();
}

/* ─────────────────────────────────────────
   ADD SALE
───────────────────────────────────────── */
async function addSale() {
  const name   = document.getElementById('saleName').value.trim();
  const amount = parseFloat(document.getElementById('saleAmount').value);
  const cat    = document.getElementById('saleCat').value;
  const date   = document.getElementById('saleDate').value || today();
  const note   = document.getElementById('saleNote').value.trim();
  if (!name || !amount || amount <= 0) { toast('Please fill in name and a valid amount.', 'error'); return; }
  await addSaleToDB({ name, amount, category: cat, date, note });
  document.getElementById('saleName').value   = '';
  document.getElementById('saleAmount').value = '';
  document.getElementById('saleNote').value   = '';
  toast('Sale added!', 'sales');
  await refreshUI();
}

/* ─────────────────────────────────────────
   DELETE
───────────────────────────────────────── */
async function deleteExp(id) {
  await deleteExpenseFromDB(id);
  toast('Expense removed.', 'success');
  await refreshUI();
}
async function deleteSale(id) {
  await deleteSaleFromDB(id);
  toast('Sale removed.', 'success');
  await refreshUI();
}

/* ─────────────────────────────────────────
   CHARTS
───────────────────────────────────────── */
async function renderCharts(expenses, sales) {
  if (!expenses) expenses = await getAllExpenses();
  if (!sales)    sales    = await getAllSales();

  // ── Category bar chart: expenses vs sales ──
  const expTotals  = {};
  const saleTotals = {};
  expenses.forEach(e => { expTotals[e.category]  = (expTotals[e.category]||0)  + e.amount; });
  sales.forEach(s    => { saleTotals[s.category] = (saleTotals[s.category]||0) + s.amount; });

  const allCats = [...new Set([...Object.keys(expTotals), ...Object.keys(saleTotals)])];

  // Cat mini-cards (expenses)
  document.getElementById('cat-grid').innerHTML = allCats.length
    ? allCats.map(c => {
        const isExp  = expTotals[c]  !== undefined;
        const isSale = saleTotals[c] !== undefined;
        const col    = CAT_COLORS[c] || '#888';
        return `<div class="cat-card">
          <div class="cat-icon" style="color:${col}">${c[0]}</div>
          <div class="cat-name">${c}</div>
          ${isExp  ? `<div class="cat-total" style="color:var(--red)">−${fmt(expTotals[c])}</div>` : ''}
          ${isSale ? `<div class="cat-total" style="color:var(--teal)">+${fmt(saleTotals[c])}</div>` : ''}
        </div>`;
      }).join('')
    : '<div class="empty-state" style="grid-column:1/-1"><p>No data yet.</p></div>';

  if (catChart) catChart.destroy();
  if (allCats.length) {
    catChart = new Chart(document.getElementById('catChart'), {
      type: 'bar',
      data: {
        labels: allCats,
        datasets: [
          { label:'Expenses', data: allCats.map(c=>Math.round(expTotals[c]||0)),
            backgroundColor:'rgba(226,75,74,0.75)', borderRadius:4, borderSkipped:false },
          { label:'Sales',    data: allCats.map(c=>Math.round(saleTotals[c]||0)),
            backgroundColor:'rgba(29,158,117,0.75)', borderRadius:4, borderSkipped:false }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:true, labels:{ color:'#555', font:{size:11} } } },
        scales:{
          x:{ ticks:{ color:'#888', font:{size:11} } },
          y:{ ticks:{ color:'#888', font:{size:11}, callback:v=>v.toLocaleString() }, grid:{ color:'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }

  // ── 14-day trend: expenses + sales lines ──
  const now = new Date();
  const days = []; const dayExp = {}; const daySale = {};
  for (let i=13; i>=0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i);
    const k = d.toISOString().slice(0,10);
    days.push(k); dayExp[k]=0; daySale[k]=0;
  }
  expenses.forEach(e=>{ if(dayExp[e.date]!==undefined) dayExp[e.date]+=e.amount; });
  sales.forEach(s   =>{ if(daySale[s.date]!==undefined) daySale[s.date]+=s.amount; });
  const labels = days.map(d=>d.slice(5));

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trendChart'), {
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Expenses', data:days.map(d=>Math.round(dayExp[d])),
          borderColor:'#E24B4A', backgroundColor:'rgba(226,75,74,0.06)',
          tension:0.35, fill:true, pointBackgroundColor:'#E24B4A', pointRadius:3 },
        { label:'Sales', data:days.map(d=>Math.round(daySale[d])),
          borderColor:'#1D9E75', backgroundColor:'rgba(29,158,117,0.06)',
          tension:0.35, fill:true, pointBackgroundColor:'#1D9E75', pointRadius:3 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:true, labels:{ color:'#555', font:{size:11} } } },
      scales:{
        x:{ ticks:{ color:'#888', font:{size:10} } },
        y:{ ticks:{ color:'#888', font:{size:10}, callback:v=>v.toLocaleString() }, grid:{ color:'rgba(0,0,0,0.05)' } }
      }
    }
  });

  // ── Yearly chart: monthly profit + sales spikes ──
  const year = new Date().getFullYear();
  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthExp    = new Array(12).fill(0);
  const monthSale   = new Array(12).fill(0);
  const monthProfit = new Array(12).fill(0);

  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() === year) monthExp[d.getMonth()] += e.amount;
  });
  sales.forEach(s => {
    const d = new Date(s.date);
    if (d.getFullYear() === year) monthSale[d.getMonth()] += s.amount;
  });
  for (let i=0; i<12; i++) monthProfit[i] = Math.round(monthSale[i] - monthExp[i]);

  if (yearlyChart) yearlyChart.destroy();
  yearlyChart = new Chart(document.getElementById('yearlyChart'), {
    type:'bar',
    data:{
      labels: monthLabels,
      datasets:[
        { label:'Sales',   data:monthSale.map(Math.round),
          backgroundColor:'rgba(29,158,117,0.7)', borderRadius:5, borderSkipped:false, yAxisID:'y' },
        { label:'Expenses', data:monthExp.map(Math.round),
          backgroundColor:'rgba(226,75,74,0.5)', borderRadius:5, borderSkipped:false, yAxisID:'y' },
        { label:'Net Profit', data:monthProfit,
          type:'line', borderColor:'#533AB7', backgroundColor:'rgba(83,58,183,0.1)',
          tension:0.4, fill:true, pointBackgroundColor: monthProfit.map(v=>v>=0?'#533AB7':'#E24B4A'),
          pointRadius:4, borderWidth:2, yAxisID:'y' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:true, labels:{ color:'#555', font:{size:11} } } },
      scales:{
        x:{ ticks:{ color:'#888', font:{size:11} } },
        y:{ ticks:{ color:'#888', font:{size:11}, callback:v=>v.toLocaleString() },
            grid:{ color:'rgba(0,0,0,0.05)' } }
      }
    }
  });
}

/* ─────────────────────────────────────────
   PROFILE
───────────────────────────────────────── */
async function renderProfile() {
  const [expenses, sales] = await Promise.all([getAllExpenses(), getAllSales()]);
  const totalExp  = expenses.reduce((s,e)=>s+e.amount,0);
  const totalSale = sales.reduce((s,e)=>s+e.amount,0);
  const profit    = totalSale - totalExp;
  const avgExp    = expenses.length ? Math.round(totalExp/expenses.length) : 0;

  document.getElementById('stat-row').innerHTML = `
    <div class="stat-box"><div class="s-val">${fmt(totalExp)}</div><div class="s-lbl">Total Expenses</div></div>
    <div class="stat-box"><div class="s-val" style="color:var(--teal)">${fmt(totalSale)}</div><div class="s-lbl">Total Sales</div></div>
    <div class="stat-box"><div class="s-val" style="color:${profit>=0?'var(--teal)':'var(--red)'}">${profit>=0?'+':''}${fmt(profit)}</div><div class="s-lbl">Net Profit</div></div>`;

  let alert = '';
  if (profit > 0)
    alert = `<div class="alert-box success">✅ Profitable — you're up ${fmt(profit)} this period.</div>`;
  else if (profit < 0)
    alert = `<div class="alert-box danger">🚨 In the red by ${fmt(Math.abs(profit))} — expenses exceed sales.</div>`;
  else
    alert = `<div class="alert-box warning">⚖️ Break-even — sales exactly cover expenses.</div>`;

  document.getElementById('alerts-section').innerHTML = alert;
}

/* ─────────────────────────────────────────
   EXPORT CSV
───────────────────────────────────────── */
async function exportData() {
  const [expenses, sales] = await Promise.all([getAllExpenses(), getAllSales()]);
  if (!expenses.length && !sales.length) { toast('No data to export.', 'error'); return; }
  const rows = [
    'Type,ID,Name,Amount,Category,Date,Note',
    ...expenses.map(e=>`Expense,${e.id},"${e.name}",${e.amount},${e.category},${e.date},"${e.note||''}"`),
    ...sales.map(s=>`Sale,${s.id},"${s.name}",${s.amount},${s.category},${s.date},"${s.note||''}"`)
  ];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.join('\n')], {type:'text/csv'}));
  a.download = 'moneymap_data.csv';
  a.click();
  toast('CSV exported!', 'success');
}

/* ─────────────────────────────────────────
   CLEAR ALL
───────────────────────────────────────── */
async function clearAll() {
  if (!confirm('Clear all expenses and sales? This cannot be undone.')) return;
  await Promise.all([clearAllExpenses(), clearAllSales()]);
  closeModal('modal-profile');
  toast('All data cleared.', 'success');
  await refreshUI();
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  setTimeout(()=>el.classList.remove('show'), 2500);
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
async function init() {
  await openDB();
  document.getElementById('expDate').value  = today();
  document.getElementById('saleDate').value = today();
  await refreshUI();
}

init();
