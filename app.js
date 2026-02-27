// State
let transactions = [];
try {
    transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    transactions = transactions.filter(t => t && t.type && !isNaN(parseFloat(t.amount)));
    transactions.forEach(t => t.amount = parseFloat(t.amount));
} catch (e) {
    transactions = [];
}

let myChart = null;

// DOM Elements
const transactionForm = document.getElementById('transaction-form');
const transactionList = document.getElementById('transaction-list');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('total-balance');
const themeToggle = document.getElementById('checkbox');
const mobileToggle = document.getElementById('mobile-toggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('overlay');

// Initialize
function init() {
    updateSummary();
    renderTransactions();
    initChart();

    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.checked = true;
    }
}

// Update Summary Cards
function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expenses;

    if (totalIncomeEl) totalIncomeEl.innerText = formatCurrency(income);
    if (totalExpensesEl) totalExpensesEl.innerText = formatCurrency(expenses);
    if (balanceEl) balanceEl.innerText = formatCurrency(balance);
}

// Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount);
}

// Render Transactions
function renderTransactions() {
    if (!transactionList) return;
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = '<li class="empty-state">Nenhuma transação registrada.</li>';
        return;
    }

    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedTransactions.forEach(t => {
        const li = document.createElement('li');
        li.classList.add('transaction-item');

        const icon = t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down';

        li.innerHTML = `
            <div class="transaction-info ${t.type}">
                <div class="transaction-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${t.description}</h4>
                    <p>${formatDate(t.date)}</p>
                </div>
            </div>
            <div class="transaction-amount-action">
                <span class="t-amount ${t.type}">
                    ${formatCurrency(t.amount)}
                </span>
                <button class="btn-delete" onclick="deleteTransaction(${t.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        transactionList.appendChild(li);
    });
}

// Format Date
function formatDate(dateStr) {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return 'Data inválida';
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return d.toLocaleDateString('pt-BR', options);
    } catch (e) {
        return 'Data inválida';
    }
}

// Add Transaction
if (transactionForm) {
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.getElementById('type').value;
        const description = document.getElementById('description').value;
        const amountValue = document.getElementById('amount').value;
        const date = document.getElementById('date').value;

        const amount = parseFloat(amountValue);

        if (!description || isNaN(amount) || !date) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const newTransaction = {
            id: Date.now(),
            type,
            description,
            amount,
            date
        };

        transactions.push(newTransaction);
        saveAndRefresh();
        transactionForm.reset();
    });
}

// Delete Transaction
window.deleteTransaction = function (id) {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveAndRefresh();
    }
};

// Save to LocalStorage and Refresh UI
function saveAndRefresh() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateSummary();
    renderTransactions();
    updateChart();
}

// Theme Switcher
if (themeToggle) {
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }

        if (myChart) {
            destroyAndReinitChart();
        }
    });
}

function destroyAndReinitChart() {
    if (myChart) {
        myChart.destroy();
        initChart();
    }
}

// Chart.js initialization
function initChart() {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isDark = document.body.classList.contains('dark-mode');

    const textColor = isDark ? '#a3aed1' : '#2b3674';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    const data = getChartData();

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar', // Restored to bar chart
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: data.incomeData,
                    backgroundColor: '#05cd99',
                    borderRadius: 5,
                    borderWidth: 0
                },
                {
                    label: 'Despesas',
                    data: data.expenseData,
                    backgroundColor: '#ee5d50',
                    borderRadius: 5,
                    borderWidth: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: window.innerWidth > 480,
                    position: 'top',
                    labels: {
                        color: textColor,
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

function updateChart() {
    if (!myChart) {
        initChart();
        return;
    }

    myChart.options.plugins.legend.display = window.innerWidth > 480;

    const data = getChartData();
    myChart.data.labels = data.labels;
    myChart.data.datasets[0].data = data.incomeData;
    myChart.data.datasets[1].data = data.expenseData;
    myChart.update();
}

function getChartData() {
    if (transactions.length === 0) {
        return { labels: ['Mês Atual'], incomeData: [0], expenseData: [0] };
    }

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const grouped = {};

    transactions.forEach(t => {
        try {
            const d = new Date(t.date + 'T00:00:00');
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!grouped[key]) {
                grouped[key] = { income: 0, expense: 0, sortKey: key, label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` };
            }
            if (t.type === 'income') grouped[key].income += t.amount;
            else grouped[key].expense += t.amount;
        } catch (e) { }
    });

    const sortedKeys = Object.keys(grouped).sort();
    const recentKeys = sortedKeys.slice(-6);

    const labels = recentKeys.map(k => grouped[k].label);
    const incomeData = recentKeys.map(k => grouped[k].income);
    const expenseData = recentKeys.map(k => grouped[k].expense);

    return { labels, incomeData, expenseData };
}

// UI Event Listeners
document.querySelectorAll('nav ul li a').forEach(link => {
    link.addEventListener('click', function () {
        document.querySelectorAll('nav ul li').forEach(li => li.classList.remove('active'));
        this.parentElement.classList.add('active');
        if (window.innerWidth <= 1024) closeSidebar();
    });
});

function toggleSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('active');
    overlay.classList.toggle('show');
}

function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('active');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

if (mobileToggle) mobileToggle.addEventListener('click', toggleSidebar);
if (overlay) overlay.addEventListener('click', closeSidebar);

window.addEventListener('resize', () => {
    if (myChart) {
        myChart.options.plugins.legend.display = window.innerWidth > 480;
        myChart.update('none');
    }
});

init();
