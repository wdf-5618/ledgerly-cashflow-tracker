"use strict";

// Ledgerly is a learning demo. It keeps a single transaction list in browser
// storage and derives the monthly totals and visible rows from that list.
const STORAGE_KEY = "ledgerly.transactions.v1";
const MAX_AMOUNT = 999999999999;
const TYPES = ["income", "expense"];
const INCOME_CATEGORIES = ["Sales", "Salary", "Services", "Refund", "Other"];
const EXPENSE_CATEGORIES = ["Food", "Transport", "Stock / Supplies", "Rent / Utilities", "Marketing", "Other"];

const el = {
  form: document.querySelector("#transaction-form"),
  typeInput: document.querySelector("#transaction-type"),
  typeButtons: [...document.querySelectorAll("[data-type]")],
  description: document.querySelector("#transaction-description"),
  amount: document.querySelector("#transaction-amount"),
  date: document.querySelector("#transaction-date"),
  category: document.querySelector("#transaction-category"),
  notes: document.querySelector("#transaction-notes"),
  formHeading: document.querySelector("#form-heading"),
  submit: document.querySelector("#submit-transaction"),
  cancelEdit: document.querySelector("#cancel-edit"),
  formError: document.querySelector("#form-error"),
  formStatus: document.querySelector("#form-status"),
  month: document.querySelector("#month-filter"),
  periodHeading: document.querySelector("#period-heading"),
  search: document.querySelector("#transaction-search"),
  sort: document.querySelector("#sort-transactions"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  list: document.querySelector("#transaction-list"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyDescription: document.querySelector("#empty-description"),
  emptyAction: document.querySelector("#empty-action"),
  incomeTotal: document.querySelector("#total-income"),
  expenseTotal: document.querySelector("#total-expenses"),
  netBalance: document.querySelector("#net-balance"),
  balanceCard: document.querySelector(".balance-card"),
  balanceNote: document.querySelector("#balance-note"),
  transactionCount: document.querySelector("#transaction-count"),
  visibleCount: document.querySelector("#visible-count"),
  countAll: document.querySelector("#count-all"),
  countIncome: document.querySelector("#count-income"),
  countExpense: document.querySelector("#count-expense"),
  incomeBar: document.querySelector("#income-bar"),
  expenseBar: document.querySelector("#expense-bar"),
  barCaption: document.querySelector("#bar-caption"),
  listFooter: document.querySelector("#list-footer"),
  dateLabel: document.querySelector("#date-label"),
  exportButton: document.querySelector("#export-csv"),
  toast: document.querySelector("#toast")
};

let transactions = loadTransactions();
let activeFilter = "all";
let editingId = null;
let toastTimer = null;

function currentMonthKey(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function localDateKey(date = new Date()) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function selectedMonth() {
  return /^\d{4}-\d{2}$/.test(el.month.value) ? el.month.value : currentMonthKey();
}

function sampleTransactions() {
  // Fictional records are used on first launch so the dashboard demonstrates
  // both income and expense states before the user adds any personal data.
  const today = new Date();
  const dateInMonth = (daysAgo) => {
    const date = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - daysAgo));
    return localDateKey(date);
  };
  const now = Date.now();
  return [
    { id: "sample-income-1", type: "income", description: "Daily shop sales", amount: 185000, date: dateInMonth(0), category: "Sales", notes: "Sample record", createdAt: now - 4000, updatedAt: now - 4000 },
    { id: "sample-expense-1", type: "expense", description: "Stock replenishment", amount: 72000, date: dateInMonth(1), category: "Stock / Supplies", notes: "Sample record", createdAt: now - 3000, updatedAt: now - 3000 },
    { id: "sample-expense-2", type: "expense", description: "Transport to supplier", amount: 12500, date: dateInMonth(2), category: "Transport", notes: "", createdAt: now - 2000, updatedAt: now - 2000 },
    { id: "sample-income-2", type: "income", description: "Website maintenance", amount: 95000, date: dateInMonth(3), category: "Services", notes: "Sample record", createdAt: now - 1000, updatedAt: now - 1000 }
  ];
}

function normalizeTransaction(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const amount = Number(item.amount);
  if (typeof item.id !== "string" || typeof item.description !== "string") return null;
  if (!TYPES.includes(item.type) || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
  if (!validDateKey(item.date)) return null;
  const categoryOptions = item.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return {
    id: item.id,
    type: item.type,
    description: item.description.trim().slice(0, 120),
    amount,
    date: item.date,
    category: categoryOptions.includes(item.category) ? item.category : "Other",
    notes: typeof item.notes === "string" ? item.notes.slice(0, 240) : "",
    createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
    updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now()
  };
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return sampleTransactions();
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTransaction).filter(Boolean);
  } catch (error) {
    console.warn("Could not read transactions from this browser.", error);
    return sampleTransactions();
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (error) {
    // A storage write can fail in private browsing or when browser storage is
    // full. Keep the current screen usable, but do not claim the data persisted.
    console.warn("Could not save transactions in this browser.", error);
    return false;
  }
}

function makeElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatMoney(value) {
  return "MMK " + Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDate(dateKey) {
  return new Date(dateKey + "T12:00:00").toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric"
  });
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long", year: "numeric"
  });
}

function categoryOptionsFor(type) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function setTransactionType(type) {
  const normalizedType = TYPES.includes(type) ? type : "income";
  el.typeInput.value = normalizedType;
  el.typeButtons.forEach((button) => {
    const selected = button.dataset.type === normalizedType;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-income", selected && normalizedType === "income");
    button.classList.toggle("is-expense", selected && normalizedType === "expense");
  });

  const previousCategory = el.category.value;
  const options = categoryOptionsFor(normalizedType);
  el.category.replaceChildren(...options.map((category) => {
    const option = makeElement("option", "", category);
    option.value = category;
    return option;
  }));
  el.category.value = options.includes(previousCategory) ? previousCategory : (normalizedType === "income" ? "Sales" : "Food");
}

function currentMonthTransactions() {
  const month = selectedMonth();
  return transactions.filter((transaction) => transaction.date.slice(0, 7) === month);
}

function compareTransactions(a, b) {
  switch (el.sort.value) {
    case "oldest":
      return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
    case "amount-desc":
      return b.amount - a.amount || b.date.localeCompare(a.date);
    case "amount-asc":
      return a.amount - b.amount || b.date.localeCompare(a.date);
    case "newest":
    default:
      return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  }
}

function getVisibleTransactions() {
  const query = el.search.value.trim().toLocaleLowerCase();
  return currentMonthTransactions().filter((transaction) => {
    if (activeFilter !== "all" && transaction.type !== activeFilter) return false;
    if (!query) return true;
    return [transaction.description, transaction.category, transaction.notes, transaction.date, transaction.type]
      .join(" ").toLocaleLowerCase().includes(query);
  }).sort(compareTransactions);
}

function makeTransactionCard(transaction) {
  const row = makeElement("article", "transaction-row");
  const symbol = makeElement("span", "transaction-symbol" + (transaction.type === "expense" ? " expense" : ""), transaction.type === "income" ? "↗" : "↘");
  symbol.setAttribute("aria-hidden", "true");

  const main = makeElement("div", "transaction-main");
  main.append(makeElement("h3", "transaction-description", transaction.description));
  const meta = makeElement("div", "transaction-meta");
  meta.append(makeElement("span", "category-chip", transaction.category));
  meta.append(makeElement("span", "", formatDate(transaction.date)));
  if (transaction.notes) meta.append(makeElement("span", "", "· " + transaction.notes));
  main.append(meta);

  const amountPrefix = transaction.type === "income" ? "+" : "−";
  const amount = makeElement("div", "transaction-amount" + (transaction.type === "expense" ? " expense" : ""), amountPrefix + " " + formatMoney(transaction.amount));

  const actions = makeElement("div", "transaction-actions");
  const edit = makeElement("button", "icon-action", "✎");
  edit.type = "button";
  edit.title = "Edit transaction";
  edit.setAttribute("aria-label", "Edit transaction " + transaction.description);
  edit.addEventListener("click", () => beginEdit(transaction.id));

  const remove = makeElement("button", "icon-action delete", "×");
  remove.type = "button";
  remove.title = "Delete transaction";
  remove.setAttribute("aria-label", "Delete transaction " + transaction.description);
  remove.addEventListener("click", () => deleteTransaction(transaction.id));

  actions.append(edit, remove);
  row.append(symbol, main, amount, actions);
  return row;
}

function render() {
  const monthItems = currentMonthTransactions();
  const visibleItems = getVisibleTransactions();
  const income = monthItems.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthItems.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const net = income - expenses;
  const monthIncomeCount = monthItems.filter((item) => item.type === "income").length;
  const monthExpenseCount = monthItems.filter((item) => item.type === "expense").length;

  el.periodHeading.textContent = formatMonth(selectedMonth()) + " cash flow";
  el.incomeTotal.textContent = formatMoney(income);
  el.expenseTotal.textContent = formatMoney(expenses);
  el.netBalance.textContent = formatMoney(net);
  el.balanceCard.classList.toggle("is-negative", net < 0);
  el.balanceNote.textContent = net > 0 ? "More income than spending" : net < 0 ? "Spending is above income" : "Income and expenses are equal";
  el.transactionCount.textContent = String(monthItems.length);
  el.visibleCount.textContent = String(visibleItems.length);
  el.countAll.textContent = String(monthItems.length);
  el.countIncome.textContent = String(monthIncomeCount);
  el.countExpense.textContent = String(monthExpenseCount);

  // Scale the comparison bar to the monthly total so neither value is
  // accidentally shown as a percentage of the other.
  const totalFlow = income + expenses;
  el.incomeBar.style.width = totalFlow ? (income / totalFlow * 100) + "%" : "0%";
  el.expenseBar.style.width = totalFlow ? (expenses / totalFlow * 100) + "%" : "0%";
  el.barCaption.textContent = totalFlow
    ? "Income " + Math.round(income / totalFlow * 100) + "% · Expenses " + Math.round(expenses / totalFlow * 100) + "% of total movement"
    : "No money movement recorded for this month";

  el.filterButtons.forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  el.list.replaceChildren(...visibleItems.map(makeTransactionCard));
  el.emptyState.hidden = visibleItems.length > 0;

  if (visibleItems.length === 0 && monthItems.length === 0) {
    el.emptyTitle.textContent = "A clear page to start.";
    el.emptyDescription.textContent = "There are no entries for this month yet. Add a transaction to begin.";
    el.emptyAction.textContent = "Add a transaction ↗";
  } else if (visibleItems.length === 0) {
    el.emptyTitle.textContent = "No transactions match this view.";
    el.emptyDescription.textContent = "Try another search or switch to a different transaction filter.";
    el.emptyAction.textContent = "Clear search and filters ↗";
  }

  if (monthItems.length === 0) {
    el.listFooter.textContent = "No transactions recorded for " + formatMonth(selectedMonth()) + ".";
  } else {
    el.listFooter.textContent = monthItems.length + " transaction" + (monthItems.length === 1 ? "" : "s") + " recorded in " + formatMonth(selectedMonth()) + ".";
  }
}

function setFormMode(isEditing) {
  el.formHeading.textContent = isEditing ? "Edit transaction" : "Add a transaction";
  el.submit.innerHTML = isEditing ? "Save changes" : '<span aria-hidden="true">＋</span> Add transaction';
  el.cancelEdit.hidden = !isEditing;
}

function resetForm() {
  editingId = null;
  el.form.reset();
  setTransactionType("income");
  el.date.value = localDateKey();
  el.formError.hidden = true;
  el.formError.textContent = "";
  el.formStatus.textContent = "";
  setFormMode(false);
}

function beginEdit(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;
  editingId = id;
  setTransactionType(transaction.type);
  el.description.value = transaction.description;
  el.amount.value = String(transaction.amount);
  el.date.value = transaction.date;
  el.category.value = transaction.category;
  el.notes.value = transaction.notes;
  el.formError.hidden = true;
  el.formStatus.textContent = "Editing this entry. Save or cancel your changes.";
  setFormMode(true);
  el.description.focus();
  document.querySelector(".form-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function validateForm() {
  const description = el.description.value.trim();
  const amount = Number(el.amount.value);
  const date = el.date.value;
  const type = el.typeInput.value;
  if (!description) return "Please enter a description.";
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return "Amount must be greater than zero and within the supported limit.";
  if (!validDateKey(date)) return "Please choose a valid transaction date.";
  if (!TYPES.includes(type)) return "Please choose income or expense.";
  return "";
}

function handleSubmit(event) {
  event.preventDefault();
  el.formError.hidden = true;
  el.formStatus.textContent = "";
  const error = validateForm();
  if (error) {
    el.formError.textContent = error;
    el.formError.hidden = false;
    return;
  }

  const now = Date.now();
  const newDetails = {
    type: el.typeInput.value,
    description: el.description.value.trim(),
    amount: Number(el.amount.value),
    date: el.date.value,
    category: el.category.value,
    notes: el.notes.value.trim()
  };

  if (editingId) {
    const transaction = transactions.find((item) => item.id === editingId);
    if (!transaction) {
      resetForm();
      render();
      return;
    }
    Object.assign(transaction, newDetails, { updatedAt: now });
    const saved = saveTransactions();
    resetForm();
    render();
    showToast(saved ? "Transaction updated." : "Updated on screen, but the browser could not save the change.");
    return;
  }

  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : now.toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  transactions.unshift({ id, ...newDetails, createdAt: now, updatedAt: now });
  const saved = saveTransactions();
  resetForm();
  render();
  showToast(saved ? "Transaction added." : "Added on screen, but the browser could not save the change.");
  el.description.focus();
}

function deleteTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;
  if (!window.confirm('Delete "' + transaction.description + '"? This cannot be undone.')) return;
  transactions = transactions.filter((item) => item.id !== id);
  if (editingId === id) resetForm();
  const saved = saveTransactions();
  render();
  showToast(saved ? "Transaction deleted." : "Deleted on screen, but the browser could not save the change.");
}

function csvCell(value) {
  // Quote every field and escape embedded quotes so commas and notes do not
  // shift columns when opened in a spreadsheet.
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

function exportCsv() {
  const rows = currentMonthTransactions().sort(compareTransactions);
  if (rows.length === 0) {
    showToast("There are no transactions to export for this month.");
    return;
  }
  const header = ["date", "type", "description", "category", "amount_mmk", "notes"];
  const body = rows.map((item) => [item.date, item.type, item.description, item.category, item.amount.toFixed(2), item.notes]);
  const csv = "\uFEFF" + [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ledgerly-transactions-" + selectedMonth() + ".csv";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("Monthly CSV export created.");
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove("is-visible"), 2600);
}

function updateDateLabel() {
  el.dateLabel.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  }).toLocaleUpperCase();
}

el.form.addEventListener("submit", handleSubmit);
el.typeButtons.forEach((button) => {
  button.addEventListener("click", () => setTransactionType(button.dataset.type));
});
el.cancelEdit.addEventListener("click", () => {
  resetForm();
  el.description.focus();
});
el.month.addEventListener("change", render);
el.search.addEventListener("input", render);
el.sort.addEventListener("change", render);
el.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    render();
  });
});
el.exportButton.addEventListener("click", exportCsv);
el.emptyAction.addEventListener("click", () => {
  if (currentMonthTransactions().length === 0) {
    el.description.focus();
    return;
  }
  el.search.value = "";
  activeFilter = "all";
  render();
  el.search.focus();
});
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
  if (event.key === "/" && !isTyping && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    el.search.focus();
  }
  if (event.key === "Escape" && document.activeElement === el.search) {
    el.search.value = "";
    render();
    el.search.blur();
  }
});

// The date picker begins at today's local date; the monthly view defaults to
// the current month so newly entered records appear in the active report.
el.month.value = currentMonthKey();
el.date.value = localDateKey();
setTransactionType("income");
updateDateLabel();
render();
