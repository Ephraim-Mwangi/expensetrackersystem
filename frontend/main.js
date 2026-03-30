// ─────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────
const API_BASE = 'https://expensetrackersystem-t3wj.onrender.com/api';

function getToken() {
    return localStorage.getItem('authToken');
}

// ─────────────────────────────────────────────────────────────
//  API REQUEST HELPER
// ─────────────────────────────────────────────────────────────
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = getToken();

    // No token = not logged in, go to login page
    if (!token) {
        console.warn('No token found, redirecting to login.');
        if (!window.location.pathname.includes('login') && window.location.pathname !== '/') {
            window.location.href = '/';
        }
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
    };

    console.log(`API Request: ${method} ${API_BASE}${endpoint}`);
    console.log('Authorization header:', `Token ${token.substring(0, 10)}...`);

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        console.log(`Response status: ${response.status}`);

        if (response.status === 401) {
            console.error('401 Unauthorized — token invalid or expired');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
            return null;
        }

        if (response.status === 204) return null; // DELETE success

        const data = await response.json();
        console.log('Response data:', data);
        return data;

    } catch (err) {
        console.error('Network error:', err);
        return null;
    }
}

function parseApiError(data) {
    if (!data) return 'An unknown error occurred.';
    if (data.error)  return data.error;
    if (data.detail) return data.detail;
    const messages = [];
    for (const [field, errors] of Object.entries(data)) {
        const errorList = Array.isArray(errors) ? errors.join(', ') : errors;
        messages.push(`${field}: ${errorList}`);
    }
    return messages.join('\n') || 'An unknown error occurred.';
}
document.addEventListener('DOMContentLoaded', async () => {
    // Load currency first before rendering amounts
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const res  = await fetch(`${API_BASE}/currency/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            const data = await res.json();
            localStorage.setItem('userCurrency', data.currency);
            const sel = document.getElementById('currencySelect');
            if (sel) sel.value = data.currency;
        } catch(e) {}
    }

    loadDashboard();
    loadTransactions();
    loadAnalytics();
    setupAddTransaction();

    document.querySelector('.search-wrapper input')?.addEventListener('input', loadTransactions);
    document.querySelector('.filter-wrapper select')?.addEventListener('change', loadTransactions);
});

// ─────────────────────────────────────────────────────────────
//  LOGIN PAGE  (index.html)
// ─────────────────────────────────────────────────────────────
let isLoginMode = true;

function switchTab(mode) {
    const loginTab  = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const nameGroup = document.getElementById('name-group');
    const submitBtn = document.getElementById('submit-btn');
    if (!loginTab) return;

    isLoginMode = (mode === 'login');
    loginTab.classList.toggle('active',  isLoginMode);
    signupTab.classList.toggle('active', !isLoginMode);
    nameGroup.style.display = isLoginMode ? 'none' : 'block';
    submitBtn.textContent   = isLoginMode ? 'Login' : 'Sign Up';
}

const authForm = document.getElementById('authForm');
if (authForm) {
    authForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('fullname')?.value.trim() || '';

        if (!email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            let response, data;

            if (isLoginMode) {
                response = await fetch(`${API_BASE}/auth/login/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
            } else {
                response = await fetch(`${API_BASE}/auth/register/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, full_name: fullName })
                });
            }

            data = await response.json();
            console.log('Auth response:', data);

            if (!response.ok) {
                alert(parseApiError(data));
                return;
            }

            // Save token and user info
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            console.log('Token saved:', data.token);
            console.log('Redirecting to /dashboard/');

            window.location.href = '/dashboard.html';

        } catch (err) {
            console.error('Auth error:', err);
            alert('Could not reach the server. Is Django running?');
        }
    });
}


// ─────────────────────────────────────────────────────────────
//  SHARED: load user profile into sidebar
// ─────────────────────────────────────────────────────────────
function loadUserProfile() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
        const user = JSON.parse(userStr);
        const avatarEl = document.querySelector('.avatar');
        const nameEl   = document.querySelector('.user-info h4');
        const emailEl  = document.querySelector('.user-info p');

        if (avatarEl) avatarEl.textContent = user.avatar_letter || (user.username?.[0]?.toUpperCase()) || 'U';
        if (nameEl)   nameEl.textContent   = user.full_name || user.username || 'User';
        if (emailEl)  emailEl.textContent  = user.email || '';
    } catch (e) {
        console.error('Failed to parse user from localStorage', e);
    }
}


// ─────────────────────────────────────────────────────────────
//  DASHBOARD PAGE  (dashboard.html)
// ─────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (!document.getElementById('expensesChart')) return;

    loadUserProfile();

    console.log('Loading dashboard data...');
    const data = await apiRequest('/dashboard/');
    if (!data) {
        console.error('No dashboard data returned');
        return;
    }

    // Update stat cards
    // Update stat cards using IDs
    document.getElementById('total-income').textContent     = formatCurrency(data.total_income);
    document.getElementById('total-expenses').textContent   = formatCurrency(data.total_expenses);
    document.getElementById('balance').textContent          = formatCurrency(data.balance);
    document.getElementById('transaction-count').textContent = data.transaction_count;

    // Update recent transactions
    const list = document.querySelector('.transaction-list');
    if (list) {
        if (data.recent_transactions && data.recent_transactions.length) {
            list.innerHTML = data.recent_transactions.map(t => `
                <div class="t-item">
                    <div class="t-icon ${t.type === 'income' ? 'green' : 'red'}-bg">
                        <i class="fa-solid fa-${categoryIcon(t.category)}"></i>
                    </div>
                    <div class="t-info">
                        <h4>${capitalize(t.category)}</h4>
                        <p>${t.title || t.description || ''}</p>
                    </div>
                    <div class="t-amount ${t.type === 'income' ? 'green' : 'red'}-text">
                     ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}   
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p style="padding:1rem;color:#94a3b8;">No transactions this month.</p>';
        }
    }

    // Render doughnut chart
    const ctx = document.getElementById('expensesChart');
    if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Bills', 'Shopping', 'Food', 'Healthcare', 'Transport', 'Entertainment'],
                datasets: [{
                    data: [50, 19, 15, 8, 5, 5],
                    backgroundColor: ['#5c6bc0','#ec407a','#ef5350','#66bb6a','#ffa726','#ab47bc'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, padding: 20 } }
                },
                cutout: '60%'
            }
        });
    }
}


// ─────────────────────────────────────────────────────────────
//  TRANSACTIONS PAGE  (transactions.html)
// ─────────────────────────────────────────────────────────────
async function loadTransactions() {
    const list = document.querySelector('.transaction-list-full');
    if (!list) return;

    loadUserProfile();

    const search     = document.querySelector('.search-wrapper input')?.value || '';
    const typeFilter = document.querySelector('.filter-wrapper select')?.value || '';

    let endpoint = '/transactions/?';
    if (search)                                   endpoint += `search=${encodeURIComponent(search)}&`;
    if (typeFilter && typeFilter !== 'All Types') endpoint += `type=${typeFilter.toLowerCase()}&`;

    const transactions = await apiRequest(endpoint);
    if (!transactions) return;

    list.innerHTML = transactions.length
        ? transactions.map(t => `
            <div class="t-row" data-id="${t.id}">
                <div class="t-left">
                    <div class="t-icon ${t.type === 'income' ? 'blue' : categoryColor(t.category)}-bg">
                        <i class="fa-solid fa-${categoryIcon(t.category)}"></i>
                    </div>
                    <div class="t-desc">
                        <div class="t-title">
                            <h4>${capitalize(t.category)}</h4>
                            <span class="tag ${t.type}">${t.type}</span>
                        </div>
                        <p class="t-subtitle">${t.title || t.description || ''}</p>
                        <p class="t-date">${formatDate(t.date)}</p>
                    </div>
                </div>
                <div class="t-right">
                    <span class="amount ${t.type === 'income' ? 'green' : 'red'}-text">
                      ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}  
                    </span>
                    <button class="delete-btn" onclick="deleteTransaction(${t.id})">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('')
        : '<p style="padding:2rem;color:#94a3b8;text-align:center;">No transactions found.</p>';
}

async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    await apiRequest(`/transactions/${id}/`, 'DELETE');
    loadTransactions();
}

function setupAddTransaction() {
    const addBtn = document.querySelector('.add-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box">
                <h3>Add Transaction</h3>
                <div class="input-group">
                    <label>Title</label>
                    <input type="text" id="m-title" placeholder="e.g. Grocery run" />
                </div>
                <div class="input-group">
                    <label>Amount ($)</label>
                    <input type="number" id="m-amount" placeholder="0.00" min="0" step="0.01" />
                </div>
                <div class="input-group">
                    <label>Type</label>
                    <select id="m-type">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Category</label>
                    <select id="m-category">
                        <option value="salary">Salary</option>
                        <option value="freelance">Freelance</option>
                        <option value="bills">Bills & Utilities</option>
                        <option value="shopping">Shopping</option>
                        <option value="food">Food & Dining</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="transportation">Transportation</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Date</label>
                    <input type="date" id="m-date" value="${new Date().toISOString().split('T')[0]}" />
                </div>
                <div class="modal-actions">
                    <button class="submit-btn" id="m-save">Save</button>
                    <button class="cancel-btn" id="m-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

// Use event delegation instead of getElementById
modal.addEventListener('click', async (e) => {
    if (e.target.id === 'm-cancel' || e.target.closest('#m-cancel')) {
        modal.remove();
        return;
    }

    if (e.target.id === 'm-save' || e.target.closest('#m-save')) {
    const titleEl    = modal.querySelector('#m-title');
    const amountEl   = modal.querySelector('#m-amount');
    const typeEl     = modal.querySelector('#m-type');
    const categoryEl = modal.querySelector('#m-category');
    const dateEl     = modal.querySelector('#m-date');

    const payload = {
        title:       titleEl?.value.trim(),
        amount:      parseFloat(amountEl?.value),
        type:        typeEl?.value,
        category:    categoryEl?.value,
        date:        dateEl?.value,
        description: '',
    };

    console.log('Saving transaction:', payload);

    if (!payload.title || !payload.amount || !payload.date) {
        alert(`Please fill in all fields.\nTitle: "${payload.title}"\nAmount: ${payload.amount}\nDate: "${payload.date}"`);
        return;
    }

    const result = await apiRequest('/transactions/', 'POST', payload);
    console.log('Save result:', result);

    if (result && result.id) {
        modal.remove();
        loadTransactions();
    } else {
        alert('Failed to save transaction. Check the console for details.');
    }
}
});
    });
}


// ─────────────────────────────────────────────────────────────
//  ANALYTICS PAGE  (analytics.html)
// ─────────────────────────────────────────────────────────────
async function loadAnalytics() {
    if (!document.getElementById('monthlyTrendChart')) return;

    loadUserProfile();

    const data = await apiRequest('/analytics/');
    if (!data) return;

    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.color = '#64748b';
    const colorIncome  = '#2dd4bf';
    const colorExpense = '#f87171';

    new Chart(document.getElementById('monthlyTrendChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: data.monthly_labels,
            datasets: [
                { label: 'Income',   data: data.monthly_income,   borderColor: colorIncome,  backgroundColor: 'rgba(45,212,191,0.1)', tension: 0.4, fill: true },
                { label: 'Expenses', data: data.monthly_expenses, borderColor: colorExpense, backgroundColor: 'rgba(248,113,113,0.1)', tension: 0.4, fill: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    const cats   = Object.keys(data.category_breakdown);
    const barInc = cats.map(c => data.category_breakdown[c].income  || 0);
    const barExp = cats.map(c => data.category_breakdown[c].expense || 0);
    new Chart(document.getElementById('categoryBarChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: cats.map(capitalize),
            datasets: [
                { label: 'Income',   data: barInc, backgroundColor: colorIncome,  borderRadius: 4 },
                { label: 'Expenses', data: barExp, backgroundColor: colorExpense, borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    const expLabels = Object.keys(data.expense_distribution);
    if (expLabels.length) {
        new Chart(document.getElementById('expensePieChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: expLabels.map(capitalize),
                datasets: [{ data: expLabels.map(k => data.expense_distribution[k]),
                    backgroundColor: ['#6366f1','#ec4899','#ef4444','#10b981','#f59e0b','#8b5cf6'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    const incLabels = Object.keys(data.income_distribution);
    if (incLabels.length) {
        new Chart(document.getElementById('incomePieChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: incLabels.map(capitalize),
                datasets: [{ data: incLabels.map(k => data.income_distribution[k]),
                    backgroundColor: ['#10b981','#3b82f6','#f59e0b','#8b5cf6'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}


// ─────────────────────────────────────────────────────────────
//  LOGOUT
// ─────────────────────────────────────────────────────────────
document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await apiRequest('/auth/logout/', 'POST');
        } catch (e) {}
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
});


// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function categoryIcon(cat) {
    const icons = {
        salary: 'briefcase', freelance: 'laptop', bills: 'bolt',
        shopping: 'bag-shopping', food: 'burger', healthcare: 'house-medical',
        entertainment: 'film', transportation: 'gas-pump', transport: 'gas-pump',
        other: 'circle-dot'
    };
    return icons[(cat || '').toLowerCase()] || 'circle-dot';
}

function categoryColor(cat) {
    const colors = {
        healthcare: 'green', shopping: 'purple', entertainment: 'orange',
        food: 'red', transportation: 'yellow', transport: 'yellow', bills: 'blue'
    };
    return colors[(cat || '').toLowerCase()] || 'blue';
}


// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadTransactions();
    loadAnalytics();
    setupAddTransaction();

    document.querySelector('.search-wrapper input')?.addEventListener('input', loadTransactions);
    document.querySelector('.filter-wrapper select')?.addEventListener('change', loadTransactions);
});
function formatCurrency(amount) {
    const CURRENCY_SYMBOLS = {
        USD: '$', EUR: '€', GBP: '£', KES: 'KSh',
        NGN: '₦', GHS: '₵', ZAR: 'R', UGX: 'USh',
        TZS: 'TSh', CAD: 'C$', AUD: 'A$', JPY: '¥', INR: '₹'
    };
    const currency = localStorage.getItem('userCurrency') || 'USD';
    const symbol   = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
}


function toggleMobileNav() {
    document.querySelector('.sidebar').classList.toggle('mobile-nav-open');
}