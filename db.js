/**
 * db.js — IndexedDB wrapper
 * Object stores:
 *   expenses  { id (autoIncrement), name, amount, category, date, note }
 *   sales     { id (autoIncrement), name, amount, category, date, note }
 *   settings  { key, value }
 */

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('MoneyMapDB', 2);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('sales')) {
        db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

/* ── Settings ── */
function getSetting(key) {
  return new Promise((resolve) => {
    const tx = _db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
  });
}

function setSetting(key, value) {
  return new Promise((resolve) => {
    const tx = _db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key, value });
    tx.oncomplete = resolve;
  });
}

/* ── Expenses CRUD ── */
function getAllExpenses() {
  return new Promise((resolve) => {
    const tx = _db.transaction('expenses', 'readonly');
    const req = tx.objectStore('expenses').getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

function addExpenseToDB(expense) {
  return new Promise((resolve) => {
    const tx = _db.transaction('expenses', 'readwrite');
    tx.objectStore('expenses').add(expense);
    tx.oncomplete = resolve;
  });
}

function deleteExpenseFromDB(id) {
  return new Promise((resolve) => {
    const tx = _db.transaction('expenses', 'readwrite');
    tx.objectStore('expenses').delete(id);
    tx.oncomplete = resolve;
  });
}

function clearAllExpenses() {
  return new Promise((resolve) => {
    const tx = _db.transaction('expenses', 'readwrite');
    tx.objectStore('expenses').clear();
    tx.oncomplete = resolve;
  });
}

/* ── Sales CRUD ── */
function getAllSales() {
  return new Promise((resolve) => {
    const tx = _db.transaction('sales', 'readonly');
    const req = tx.objectStore('sales').getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

function addSaleToDB(sale) {
  return new Promise((resolve) => {
    const tx = _db.transaction('sales', 'readwrite');
    tx.objectStore('sales').add(sale);
    tx.oncomplete = resolve;
  });
}

function deleteSaleFromDB(id) {
  return new Promise((resolve) => {
    const tx = _db.transaction('sales', 'readwrite');
    tx.objectStore('sales').delete(id);
    tx.oncomplete = resolve;
  });
}

function clearAllSales() {
  return new Promise((resolve) => {
    const tx = _db.transaction('sales', 'readwrite');
    tx.objectStore('sales').clear();
    tx.oncomplete = resolve;
  });
}
