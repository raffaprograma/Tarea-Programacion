const STORAGE_KEY = "creditCardsApp_v1";

const state = {
  cards: [],
  expenses: []
};

const moneyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2
});

const cardForm = document.getElementById("cardForm");
const expenseForm = document.getElementById("expenseForm");

const cardNameInput = document.getElementById("cardName");
const cardLimitInput = document.getElementById("cardLimit");

const expenseCardSelect = document.getElementById("expenseCard");
const expenseAmountInput = document.getElementById("expenseAmount");
const expenseCategorySelect = document.getElementById("expenseCategory");
const expenseDescriptionInput = document.getElementById("expenseDescription");
const expenseDateInput = document.getElementById("expenseDate");

const totalAvailableEl = document.getElementById("totalAvailable");
const totalLimitEl = document.getElementById("totalLimit");
const totalSpentEl = document.getElementById("totalSpent");
const totalCardsEl = document.getElementById("totalCards");

const cardsGrid = document.getElementById("cardsGrid");
const expenseTable = document.getElementById("expenseTable");
const filterCard = document.getElementById("filterCard");

const exportCsvBtn = document.getElementById("exportCsv");
const clearAllBtn = document.getElementById("clearAll");

init();

function init() {
  loadData();
  setToday();
  render();

  cardForm.addEventListener("submit", addCard);
  expenseForm.addEventListener("submit", addExpense);
  filterCard.addEventListener("change", renderExpenseTable);

  cardsGrid.addEventListener("click", handleCardActions);
  expenseTable.addEventListener("click", handleExpenseActions);

  exportCsvBtn.addEventListener("click", exportCSV);
  clearAllBtn.addEventListener("click", clearAllData);
}

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) return;

  try {
    const parsedData = JSON.parse(savedData);

    state.cards = Array.isArray(parsedData.cards) ? parsedData.cards : [];
    state.expenses = Array.isArray(parsedData.expenses) ? parsedData.expenses : [];
  } catch (error) {
    console.error("Error cargando datos:", error);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setToday() {
  const today = new Date().toISOString().split("T")[0];
  expenseDateInput.value = today;
}

function generateId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function addCard(event) {
  event.preventDefault();

  const name = cardNameInput.value.trim();
  const limit = Number(cardLimitInput.value);

  if (!name || limit <= 0) {
    alert("Completa correctamente el nombre y el límite de la tarjeta.");
    return;
  }

  const newCard = {
    id: generateId(),
    name,
    limit
  };

  state.cards.push(newCard);
  saveData();
  render();

  cardForm.reset();
}

function addExpense(event) {
  event.preventDefault();

  const cardId = expenseCardSelect.value;
  const amount = Number(expenseAmountInput.value);
  const category = expenseCategorySelect.value;
  const description = expenseDescriptionInput.value.trim();
  const date = expenseDateInput.value;

  if (!cardId || amount <= 0 || !category || !description || !date) {
    alert("Completa todos los campos del gasto.");
    return;
  }

  const selectedCard = state.cards.find(card => card.id === cardId);

  if (!selectedCard) {
    alert("La tarjeta seleccionada no existe.");
    return;
  }

  const currentSpent = getCardSpent(cardId);
  const newTotal = currentSpent + amount;

  if (newTotal > selectedCard.limit) {
    const confirmOverLimit = confirm(
      "Este gasto hará que pases el límite de esta tarjeta. ¿Deseas registrarlo de todas formas?"
    );

    if (!confirmOverLimit) return;
  }

  const newExpense = {
    id: generateId(),
    cardId,
    amount,
    category,
    description,
    date
  };

  state.expenses.push(newExpense);
  saveData();
  render();

  expenseForm.reset();
  setToday();
}

function getCardSpent(cardId) {
  return state.expenses
    .filter(expense => expense.cardId === cardId)
    .reduce((total, expense) => total + Number(expense.amount), 0);
}

function getCardById(cardId) {
  return state.cards.find(card => card.id === cardId);
}

function getTotals() {
  const totalLimit = state.cards.reduce((total, card) => total + Number(card.limit), 0);
  const totalSpent = state.expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  const totalAvailable = totalLimit - totalSpent;

  return {
    totalLimit,
    totalSpent,
    totalAvailable
  };
}

function getStatus(percentage) {
  if (percentage >= 100) {
    return {
      className: "danger",
      text: "Límite alcanzado"
    };
  }

  if (percentage >= 80) {
    return {
      className: "warning",
      text: "Cerca del límite"
    };
  }

  return {
    className: "good",
    text: "Controlada"
  };
}

function render() {
  renderSummary();
  renderCardOptions();
  renderCards();
  renderExpenseTable();
}

function renderSummary() {
  const totals = getTotals();

  totalLimitEl.textContent = formatMoney(totals.totalLimit);
  totalSpentEl.textContent = formatMoney(totals.totalSpent);
  totalAvailableEl.textContent = formatMoney(totals.totalAvailable);
  totalCardsEl.textContent = state.cards.length;
}

function renderCardOptions() {
  const currentExpenseValue = expenseCardSelect.value;
  const currentFilterValue = filterCard.value;

  expenseCardSelect.innerHTML = `<option value="">Selecciona una tarjeta</option>`;
  filterCard.innerHTML = `<option value="all">Todas las tarjetas</option>`;

  state.cards.forEach(card => {
    const option1 = document.createElement("option");
    option1.value = card.id;
    option1.textContent = card.name;
    expenseCardSelect.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = card.id;
    option2.textContent = card.name;
    filterCard.appendChild(option2);
  });

  if (state.cards.some(card => card.id === currentExpenseValue)) {
    expenseCardSelect.value = currentExpenseValue;
  }

  if (currentFilterValue === "all" || state.cards.some(card => card.id === currentFilterValue)) {
    filterCard.value = currentFilterValue;
  }
}

function renderCards() {
  if (state.cards.length === 0) {
    cardsGrid.innerHTML = `
      <div class="empty">
        Todavía no has agregado tarjetas. Agrega tu primera tarjeta para comenzar.
      </div>
    `;
    return;
  }

  cardsGrid.innerHTML = state.cards.map(card => {
    const spent = getCardSpent(card.id);
    const available = Number(card.limit) - spent;
    const percentage = card.limit > 0 ? (spent / card.limit) * 100 : 0;
    const status = getStatus(percentage);
    const progressWidth = Math.min(percentage, 100);

    return `
      <article class="credit-card">
        <div class="card-top">
          <h3 class="card-name">${escapeHTML(card.name)}</h3>
          <span class="badge ${status.className}">${status.text}</span>
        </div>

        <div class="card-numbers">
          <div class="number-row">
            <span>Límite</span>
            <strong>${formatMoney(card.limit)}</strong>
          </div>

          <div class="number-row">
            <span>Gastado</span>
            <strong>${formatMoney(spent)}</strong>
          </div>

          <div class="number-row">
            <span>Disponible</span>
            <strong>${formatMoney(available)}</strong>
          </div>
        </div>

        <div class="progress">
          <div class="progress-fill ${status.className}" style="width: ${progressWidth}%"></div>
        </div>

        <div class="number-row">
          <span>Uso actual</span>
          <strong>${percentage.toFixed(1)}%</strong>
        </div>

        <div class="card-actions">
          <button class="small-btn" data-action="use-card" data-id="${card.id}">
            Registrar gasto
          </button>

          <button class="small-btn delete" data-action="delete-card" data-id="${card.id}">
            Eliminar
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderExpenseTable() {
  const selectedCard = filterCard.value;

  let expensesToShow = [...state.expenses];

  if (selectedCard !== "all") {
    expensesToShow = expensesToShow.filter(expense => expense.cardId === selectedCard);
  }

  expensesToShow.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (expensesToShow.length === 0) {
    expenseTable.innerHTML = `
      <tr>
        <td colspan="6" class="empty">No hay gastos registrados.</td>
      </tr>
    `;
    return;
  }

  expenseTable.innerHTML = expensesToShow.map(expense => {
    const card = getCardById(expense.cardId);

    return `
      <tr>
        <td>${formatDate(expense.date)}</td>
        <td>${card ? escapeHTML(card.name) : "Tarjeta eliminada"}</td>
        <td>${escapeHTML(expense.category)}</td>
        <td>${escapeHTML(expense.description)}</td>
        <td class="amount">${formatMoney(expense.amount)}</td>
        <td>
          <button 
            class="small-btn delete" 
            data-action="delete-expense" 
            data-id="${expense.id}">
            Borrar
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function handleCardActions(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const cardId = button.dataset.id;

  if (action === "use-card") {
    expenseCardSelect.value = cardId;
    expenseAmountInput.focus();
    window.scrollTo({
      top: expenseForm.offsetTop - 80,
      behavior: "smooth"
    });
  }

  if (action === "delete-card") {
    deleteCard(cardId);
  }
}

function handleExpenseActions(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const expenseId = button.dataset.id;

  if (action === "delete-expense") {
    deleteExpense(expenseId);
  }
}

function deleteCard(cardId) {
  const card = getCardById(cardId);

  if (!card) return;

  const confirmDelete = confirm(
    `¿Seguro que deseas eliminar "${card.name}"? También se eliminarán sus gastos.`
  );

  if (!confirmDelete) return;

  state.cards = state.cards.filter(card => card.id !== cardId);
  state.expenses = state.expenses.filter(expense => expense.cardId !== cardId);

  saveData();
  render();
}

function deleteExpense(expenseId) {
  const confirmDelete = confirm("¿Seguro que deseas borrar este gasto?");

  if (!confirmDelete) return;

  state.expenses = state.expenses.filter(expense => expense.id !== expenseId);

  saveData();
  render();
}

function clearAllData() {
  const confirmClear = confirm(
    "Esto borrará todas las tarjetas y todos los gastos guardados. ¿Deseas continuar?"
  );

  if (!confirmClear) return;

  state.cards = [];
  state.expenses = [];

  saveData();
  render();
}

function exportCSV() {
  if (state.expenses.length === 0) {
    alert("No hay gastos para exportar.");
    return;
  }

  const headers = ["Fecha", "Tarjeta", "Categoría", "Descripción", "Monto"];

  const rows = state.expenses.map(expense => {
    const card = getCardById(expense.cardId);

    return [
      expense.date,
      card ? card.name : "Tarjeta eliminada",
      expense.category,
      expense.description,
      expense.amount
    ];
  });

  const csvContent = [
    headers,
    ...rows
  ]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "gastos_tarjetas_credito.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
