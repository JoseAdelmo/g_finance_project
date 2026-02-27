// DOM Elements
const toggleTheme = document.getElementById('checkbox');
const form = document.getElementById('transaction-form');
const typeInput = document.getElementById('type');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const transactionList = document.getElementById('transaction-list');

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const totalBalanceEl = document.getElementById('total-balance');

const tipTextEl = document.getElementById('tip-text');
const tipsPanel = document.getElementById('tips-panel');
const mobileToggle = document.getElementById('mobile-toggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('overlay');

let myChart;

// Data State
let transactions = [];

// Initialize App
function init() {
    // Set default date to today
    dateInput.valueAsDate = new Date();

    // Theme logic
    const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
    if (currentTheme) {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(currentTheme);
        if (currentTheme === 'dark-mode') {
            toggleTheme.checked = true;
        }
    }

    // Load transactions from local storage
    const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
    if (localStorageTransactions !== null) {
        transactions = localStorageTransactions;
    }

    updateDOM();
    initChart();
}

// Theme Toggle
toggleTheme.addEventListener('change', function (e) {
    if (e.target.checked) {
        document.body.classList.replace('light-mode', 'dark-mode');
        localStorage.setItem('theme', 'dark-mode');
    } else {
        document.body.classList.replace('dark-mode', 'light-mode');
        localStorage.setItem('theme', 'light-mode');
    }
    // Update chart colors on theme change
    if (myChart) {
        myChart.destroy();
        initChart();
    }
});

// Format currency
function formatCurrency(amount) {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Add transaction
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const type = typeInput.value;
    const description = descriptionInput.value.trim();
    const amount = +parseFloat(amountInput.value).toFixed(2);
    const date = dateInput.value;

    if (description === '' || isNaN(amount) || amount <= 0) {
        alert('Por favor, insira valores válidos.');
        return;
    }

    const transaction = {
        id: generateID(),
        type,
        description,
        amount,
        date
    };

    transactions.push(transaction);

    // Update Local Storage & DOM
    updateStorage();
    updateDOM();
    updateChart();

    // Reset Form
    descriptionInput.value = '';
    amountInput.value = '';
    dateInput.valueAsDate = new Date();
});

// Generate random ID
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// Delete transaction
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateStorage();
    updateDOM();
    updateChart();
}

// Expose to window for inline onclick handler
window.deleteTransaction = deleteTransaction;

// Update storage
function updateStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Update DOM
function updateDOM() {
    // Clear list
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = '<li class="empty-state">Nenhuma transação registrada.</li>';
    } else {
        // Sort by date descending
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedTransactions.forEach(transaction => {
            const li = document.createElement('li');
            li.classList.add('transaction-item');

            const isIncome = transaction.type === 'income';
            const iconClass = isIncome ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
            const sign = isIncome ? '+' : '-';

            // Format date string to dd/mm/yyyy
            const tDate = new Date(transaction.date + 'T00:00:00'); // append time to avoid timezone shift
            const dateStr = tDate.toLocaleDateString('pt-BR');

            li.innerHTML = `
                <div class="transaction-info ${transaction.type}">
                    <div class="transaction-icon">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description}</h4>
                        <p>${dateStr}</p>
                    </div>
                </div>
                <div class="transaction-amount-action">
                    <span class="t-amount ${transaction.type}">${sign} ${formatCurrency(transaction.amount)}</span>
                    <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            transactionList.appendChild(li);
        });
    }

    // Update Totals
    const amounts = transactions.map(t => ({ amount: t.amount, type: t.type }));

    const income = amounts
        .filter(item => item.type === 'income')
        .reduce((acc, item) => (acc += item.amount), 0);

    const expense = amounts
        .filter(item => item.type === 'expense')
        .reduce((acc, item) => (acc += item.amount), 0);

    const balance = income - expense;

    totalIncomeEl.innerText = formatCurrency(income);
    totalExpenseEl.innerText = formatCurrency(expense);
    totalBalanceEl.innerText = formatCurrency(balance);

    // Update Financial Tip
    generateTip(income, expense);
}

// Generate Tip
function generateTip(income, expense) {
    if (income === 0 && expense === 0) {
        tipTextEl.innerText = "Adicione transações para receber dicas personalizadas sobre seus hábitos de consumo.";
        tipsPanel.style.borderLeftColor = "var(--accent-primary)";
        return;
    }

    if (income === 0 && expense > 0) {
        tipTextEl.innerText = "Atenção: Você tem despesas registradas mas nenhuma receita. Cuidado para não estourar o limite!";
        tipsPanel.style.borderLeftColor = "var(--danger-color)";
        return;
    }

    const expenseRatio = expense / income;

    if (expenseRatio > 0.8) {
        tipTextEl.innerText = "Alerta: Suas despesas ultrapassam 80% das suas receitas. Considere revisar seus gastos não essenciais para manter uma margem de segurança.";
        tipsPanel.style.borderLeftColor = "var(--danger-color)";
    } else if (expenseRatio > 0.5) {
        tipTextEl.innerText = "Boa gestão: Suas despesas estão em um nível aceitável, mas tente guardar ao menos 20% do que ganha para criar uma reserva de emergência.";
        tipsPanel.style.borderLeftColor = "var(--warning-color)";
    } else {
        tipTextEl.innerText = "Excelente! Seus gastos estão bem controlados em relação aos seus ganhos. Excelente oportunidade para investir o excedente!";
        tipsPanel.style.borderLeftColor = "var(--success-color)";
    }
}

// Chart.js Setup
function initChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');

    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#a3aed1' : '#a3aed1';
    const gridColor = isDark ? '#1b254b' : '#e0e5f2';

    // Group transactions by month for the chart
    const chartData = getChartData();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: chartData.incomeData,
                    backgroundColor: 'rgba(5, 205, 153, 0.8)',
                    borderRadius: 4
                },
                {
                    label: 'Despesas',
                    data: chartData.expenseData,
                    backgroundColor: 'rgba(238, 93, 80, 0.8)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                            }
                            return label;
                        }
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
    if (!myChart) return;
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

    // Group by YYYY-MM
    const grouped = {};

    transactions.forEach(t => {
        const d = new Date(t.date + 'T00:00:00');
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (!grouped[key]) {
            grouped[key] = { income: 0, expense: 0, sortKey: key, label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` };
        }

        if (t.type === 'income') grouped[key].income += t.amount;
        else grouped[key].expense += t.amount;
    });

    // Sort chronologically
    const sortedKeys = Object.keys(grouped).sort();

    // Take last 6 months
    const recentKeys = sortedKeys.slice(-6);

    const labels = recentKeys.map(k => grouped[k].label);
    const incomeData = recentKeys.map(k => grouped[k].income);
    const expenseData = recentKeys.map(k => grouped[k].expense);

    return { labels, incomeData, expenseData };
}

// Sidebar nav - update active state on click
document.querySelectorAll('nav ul li a').forEach(link => {
    link.addEventListener('click', function () {
        document.querySelectorAll('nav ul li').forEach(li => li.classList.remove('active'));
        this.parentElement.classList.add('active');

        // Close sidebar on mobile after clicking a link
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });
});

// Mobile Sidebar Toggle Logic
function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('show');
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

if (mobileToggle) {
    mobileToggle.addEventListener('click', toggleSidebar);
}

if (overlay) {
    overlay.addEventListener('click', closeSidebar);
}

// Run init
init();
