// ==========================================
// STATE MANAGEMENT & INITIAL SEED DATA
// ==========================================

const STUDENT_TIPS = [
    "Selalu prioritaskan kebutuhan kuliah dan kos sebelum menyisihkan untuk hiburan. Buat rasio 50:30:20 untuk Kebutuhan, Keinginan, dan Tabungan.",
    "Bawa botol minum sendiri saat kuliah. Selain ramah lingkungan, hal ini bisa menghemat pengeluaran air minum hingga Rp 150.000 sebulan!",
    "Manfaatkan diskon mahasiswa untuk software pendukung kuliah, Spotify, YouTube Premium, maupun transportasi umum.",
    "Sebelum membeli buku pelajaran fisik baru, coba cari e-book gratis di perpus kampus atau beli buku bekas dari kakak tingkat.",
    "Usahakan memasak sendiri di kost daripada jajan di luar. Anda bisa menghemat hingga 50% biaya makanan bulanan.",
    "Catat setiap pengeluaran sekecil apapun. Pengeluaran kecil seperti parkir, tisu, dan cemilan seringkali menjadi 'kebocoran' anggaran terbesar."
];

const DEFAULT_TRANSACTIONS = [
    { id: "tx-1", title: "Uang Saku Bulanan", type: "pemasukan", category: "Lainnya", amount: 1800000, date: "2026-06-01" },
    { id: "tx-2", title: "Gaji Freelance Penerjemah", type: "pemasukan", category: "Lainnya", amount: 750000, date: "2026-06-05" },
    { id: "tx-3", title: "Bayar Kost Bulan Juni", type: "pengeluaran", category: "Kost", amount: 750000, date: "2026-06-02" },
    { id: "tx-4", title: "Buku Paket Aljabar Linier", type: "pengeluaran", category: "Pendidikan", amount: 165000, date: "2026-06-03" },
    { id: "tx-5", title: "Beli Token Listrik Kost", type: "pengeluaran", category: "Kost", amount: 100000, date: "2026-06-04" },
    { id: "tx-6", title: "Makan Siang Warteg (Seminggu)", type: "pengeluaran", category: "Makanan", amount: 150000, date: "2026-06-07" },
    { id: "tx-7", title: "Isi Bensin Motor", type: "pengeluaran", category: "Transportasi", amount: 50000, date: "2026-06-08" },
    { id: "tx-8", title: "Nonton Film & Kopi Senja", type: "pengeluaran", category: "Hiburan", amount: 90000, date: "2026-06-09" }
];

const DEFAULT_BUDGETS = {
    "Makanan": 500000,
    "Transportasi": 200000,
    "Pendidikan": 300000,
    "Kost": 900000,
    "Hiburan: Nomaden": 250000, // Hiburan
    "Hiburan": 250000,
    "Lainnya": 400000
};

const DEFAULT_SAVINGS = [
    { id: "sv-1", name: "Laptop Baru untuk Tugas Akhir", target: 8000000, current: 3200000, deadline: "2026-12-15" },
    { id: "sv-2", name: "Dana Darurat Semester Genap", target: 1500000, current: 900000, deadline: "2026-09-30" },
    { id: "sv-3", name: "Sertifikasi Cloud Practitioner", target: 1200000, current: 1200000, deadline: "2026-06-25" }
];

const DEFAULT_NOTIFICATIONS = [
    { id: "nt-1", title: "Target Tabungan Tercapai!", message: "Celengan 'Sertifikasi Cloud Practitioner' telah terkumpul 100%. Selamat!", type: "success", read: false, time: "Baru saja" },
    { id: "nt-2", title: "Pengeluaran Kost Mendekati Batas", message: "Biaya Kost Anda sudah mencapai 94% dari batas anggaran bulanan.", type: "warning", read: false, time: "1 jam yang lalu" },
    { id: "nt-3", title: "Selamat Datang di MajuKeuangan!", message: "Mulai catat transaksi harian Anda dan kelola keuangan agar bebas krisis akhir bulan.", type: "info", read: true, time: "1 hari yang lalu" }
];

// App state variables loaded from localStorage or using default data
let state = {
    users: JSON.parse(localStorage.getItem("mk_users")) || [],
    currentUser: JSON.parse(localStorage.getItem("mk_current_user")) || null,
    transactions: [],
    budgets: {},
    savings: [],
    notifications: [],
    currentTipIndex: 0
};

// Seed a default test account if users list is empty
if (state.users.length === 0) {
    const testUser = {
        fullname: "Rizky Fanani",
        username: "rizky",
        univ: "Universitas Brawijaya",
        password: "password",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120"
    };
    state.users.push(testUser);
    localStorage.setItem("mk_users", JSON.stringify(state.users));
}

// Load namespaced user data
function loadUserData(username) {
    state.transactions = JSON.parse(localStorage.getItem(`mk_transactions_${username}`)) || DEFAULT_TRANSACTIONS;
    state.budgets = JSON.parse(localStorage.getItem(`mk_budgets_${username}`)) || DEFAULT_BUDGETS;
    state.savings = JSON.parse(localStorage.getItem(`mk_savings_${username}`)) || DEFAULT_SAVINGS;
    state.notifications = JSON.parse(localStorage.getItem(`mk_notifications_${username}`)) || DEFAULT_NOTIFICATIONS;
}

// Global chart variables for Chart.js instances
let trendChart = null;
let categoryChart = null;

// Pagination variables
let currentPage = 1;
const itemsPerPage = 8;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Format number to Indonesian Rupiah currency
function formatRupiah(num) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(num);
}

// Format Date string to clean Indonesian format (DD MMM YYYY)
function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

// Get Icon based on Category
function getCategoryIconName(category) {
    switch (category) {
        case "Makanan": return "utensils";
        case "Transportasi": return "bike";
        case "Pendidikan": return "graduation-cap";
        case "Kost": return "home";
        case "Hiburan": return "party-popper";
        default: return "help-circle";
    }
}

// Get category css class
function getCategoryCssClass(category) {
    switch (category) {
        case "Makanan": return "makanan";
        case "Transportasi": return "transportasi";
        case "Pendidikan": return "pendidikan";
        case "Kost": return "kost";
        case "Hiburan": return "hiburan";
        default: return "lainnya";
    }
}

// Save state to localStorage
function saveState() {
    if (state.currentUser) {
        const username = state.currentUser.username;
        localStorage.setItem(`mk_transactions_${username}`, JSON.stringify(state.transactions));
        localStorage.setItem(`mk_budgets_${username}`, JSON.stringify(state.budgets));
        localStorage.setItem(`mk_savings_${username}`, JSON.stringify(state.savings));
        localStorage.setItem(`mk_notifications_${username}`, JSON.stringify(state.notifications));
    }
    localStorage.setItem("mk_users", JSON.stringify(state.users));
    localStorage.setItem("mk_current_user", JSON.stringify(state.currentUser));
}

// Trigger Lucide Icon rendering
function refreshIcons() {
    lucide.createIcons();
}

// ==========================================
// SPA ROUTING & CORE NAVIGATION
// ==========================================

function initNavigation() {
    const menuItems = document.querySelectorAll(".menu-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute("data-tab");

            // Change active nav class
            menuItems.forEach(mi => mi.classList.remove("active"));
            item.classList.add("active");

            // Change visible page view
            tabContents.forEach(tc => {
                tc.classList.remove("active");
                if (tc.id === `${targetTab}-tab`) {
                    tc.classList.add("active");
                }
            });

            // Update Header Title
            const title = item.querySelector("span").textContent;
            pageTitle.textContent = title === "Notifikasi" ? "Pusat Notifikasi" : title;

            // Trigger specific page load actions (like charts)
            if (targetTab === "laporan") {
                renderCharts();
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 1024) {
                // Not strictly needed but nice to handle
            }
        });
    });

    // Handle Quick Links (e.g. "Lihat Semua" button redirects)
    document.querySelectorAll("[data-go-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-go-tab");
            const navLink = document.querySelector(`.menu-item[data-tab="${targetTab}"]`);
            if (navLink) navLink.click();
        });
    });

    // Display Current Date in header
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("current-date").textContent = new Date().toLocaleDateString('id-ID', dateOptions);
}

// ==========================================
// THEME SWITCHER
// ==========================================

function initTheme() {
    const themeToggle = document.getElementById("theme-toggle");
    const currentTheme = localStorage.getItem("mk_theme") || "dark";

    if (currentTheme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
    } else {
        document.body.classList.add("dark-theme");
        document.body.classList.remove("light-theme");
    }

    themeToggle.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            localStorage.setItem("mk_theme", "light");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            localStorage.setItem("mk_theme", "dark");
        }

        // Re-render charts to adjust gridline/label colors according to new theme
        if (document.getElementById("laporan-tab").classList.contains("active")) {
            renderCharts();
        }
    });
}

// ==========================================
// CORE CALCULATION LOGIC
// ==========================================

function calculateFinancials() {
    // Total income
    const totalIncome = state.transactions
        .filter(t => t.type === "pemasukan")
        .reduce((sum, t) => sum + t.amount, 0);

    // Total expenses (from transactions)
    const totalExpense = state.transactions
        .filter(t => t.type === "pengeluaran")
        .reduce((sum, t) => sum + t.amount, 0);

    // Main Balance = Income - Expense
    // (Note: Savings deposits will be deducted from this main balance and held in Savings goals)
    const totalDeposited = state.savings.reduce((sum, s) => sum + s.current, 0);
    
    // Balance available in wallet
    const mainBalance = totalIncome - totalExpense;

    return {
        mainBalance,
        totalIncome,
        totalExpense
    };
}

// ==========================================
// SYSTEM ALERTS & NOTIFICATIONS LOGIC
// ==========================================

function checkBudgetThresholds(category, newExpenseAmount = 0) {
    // Calculate total expense for this category in current month
    const currentCategoryExpense = state.transactions
        .filter(t => t.type === "pengeluaran" && t.category === category)
        .reduce((sum, t) => sum + t.amount, 0);

    const budgetLimit = state.budgets[category] || 0;
    if (budgetLimit === 0) return;

    const percentageUsed = (currentCategoryExpense / budgetLimit) * 100;
    
    if (percentageUsed >= 100) {
        addNotification(
            "Batas Anggaran Terlampaui!",
            `Pengeluaran kategori ${category} Anda telah melampaui batas anggaran (100%+).`,
            "danger"
        );
    } else if (percentageUsed >= 80) {
        addNotification(
            "Anggaran Mendekati Batas",
            `Pengeluaran kategori ${category} Anda sudah mencapai ${Math.round(percentageUsed)}% dari anggaran bulanan.`,
            "warning"
        );
    }
}

function addNotification(title, message, type = "info") {
    const newNoti = {
        id: "nt-" + Date.now(),
        title,
        message,
        type,
        read: false,
        time: "Baru saja"
    };
    state.notifications.unshift(newNoti);
    saveState();
    updateNotificationsUI();
}

// ==========================================
// RENDERING DASHBOARD PAGE
// ==========================================

function updateDashboardUI() {
    const financials = calculateFinancials();

    // 1. Render Top Summary Cards
    document.getElementById("dash-balance").textContent = formatRupiah(financials.mainBalance);
    document.getElementById("dash-income").textContent = formatRupiah(financials.totalIncome);
    document.getElementById("dash-expense").textContent = formatRupiah(financials.totalExpense);

    // Calculate overall budget percentage spending
    const totalBudgets = Object.values(state.budgets).reduce((a, b) => a + b, 0);
    const budgetPct = totalBudgets > 0 ? Math.round((financials.totalExpense / totalBudgets) * 100) : 0;
    
    const budgetPercentageText = document.getElementById("dash-expense-percentage");
    budgetPercentageText.textContent = `${budgetPct}% dari Anggaran`;
    budgetPercentageText.className = `trend ${budgetPct > 90 ? 'down' : 'up'}`;
    budgetPercentageText.innerHTML = budgetPct > 90 ? 
        `<i data-lucide="arrow-up"></i> ${budgetPct}% dari Anggaran` : 
        `<i data-lucide="arrow-down"></i> ${budgetPct}% dari Anggaran`;

    // 2. Render Categories Budget Progress on Dashboard (Top 3 highest usage or standard list)
    const dashBudgetList = document.getElementById("dash-budget-list");
    dashBudgetList.innerHTML = "";

    const categories = Object.keys(state.budgets);
    categories.slice(0, 4).forEach(cat => {
        const limit = state.budgets[cat] || 0;
        const spent = state.transactions
            .filter(t => t.type === "pengeluaran" && t.category === cat)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
        let colorClass = "var(--accent)";
        if (pct >= 100) colorClass = "var(--rose)";
        else if (pct >= 80) colorClass = "var(--amber)";
        else colorClass = "var(--emerald)";

        const item = document.createElement("div");
        item.className = "budget-summary-item";
        item.innerHTML = `
            <div class="budget-info">
                <span class="budget-name">
                    <span class="category-icon-indicator" style="background-color: ${colorClass}"></span>
                    ${cat}
                </span>
                <span class="budget-value">${formatRupiah(spent)} / <span class="text-muted">${formatRupiah(limit)}</span></span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${colorClass};"></div>
            </div>
        `;
        dashBudgetList.appendChild(item);
    });

    // 3. Render Recent Transactions Table (Show last 4)
    const recentTxBody = document.getElementById("dash-recent-transactions");
    recentTxBody.innerHTML = "";

    const recentTx = state.transactions.slice(0, 4);
    if (recentTx.length === 0) {
        recentTxBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Belum ada transaksi.</td></tr>`;
    } else {
        recentTx.forEach(tx => {
            const amountFormatted = tx.type === "pemasukan" ? `+ ${formatRupiah(tx.amount)}` : `- ${formatRupiah(tx.amount)}`;
            const amountClass = tx.type === "pemasukan" ? "text-emerald" : "";
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div class="category-tag">
                        <i data-lucide="${getCategoryIconName(tx.category)}"></i>
                        <span>${tx.title}</span>
                    </div>
                </td>
                <td>${tx.category}</td>
                <td>${formatDate(tx.date)}</td>
                <td class="amount-text ${amountClass}">${amountFormatted}</td>
            `;
            recentTxBody.appendChild(tr);
        });
    }

    // 4. Render Quick Savings Targets (Show last 2)
    const dashSavingsList = document.getElementById("dash-savings-list");
    dashSavingsList.innerHTML = "";

    const activeSavings = state.savings.slice(0, 2);
    if (activeSavings.length === 0) {
        dashSavingsList.innerHTML = `<p class="text-muted text-center py-4">Belum ada target tabungan.</p>`;
    } else {
        activeSavings.forEach(sv => {
            const pct = sv.target > 0 ? Math.round((sv.current / sv.target) * 100) : 0;
            const div = document.createElement("div");
            div.className = "quick-saving-item";
            div.innerHTML = `
                <div class="saving-meta">
                    <div class="saving-title-group">
                        <div class="saving-icon-circle"><i data-lucide="piggy-bank"></i></div>
                        <div>
                            <h4>${sv.name}</h4>
                        </div>
                    </div>
                    <span class="saving-percent">${pct}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${pct}%; background-color: var(--accent);"></div>
                </div>
                <div class="saving-amount-numbers">
                    <span>Terisi: ${formatRupiah(sv.current)}</span>
                    <span>Target: ${formatRupiah(sv.target)}</span>
                </div>
            `;
            dashSavingsList.appendChild(div);
        });
    }

    // Rotator tips loader
    document.getElementById("financial-tip").textContent = `"${STUDENT_TIPS[state.currentTipIndex]}"`;

    refreshIcons();
}

// Tips of the day rotators
document.getElementById("btn-next-tip").addEventListener("click", () => {
    state.currentTipIndex = (state.currentTipIndex + 1) % STUDENT_TIPS.length;
    document.getElementById("financial-tip").textContent = `"${STUDENT_TIPS[state.currentTipIndex]}"`;
});

// Quick adding handlers from Dashboard
document.getElementById("btn-add-expense-quick").addEventListener("click", () => {
    openTransactionModal("pengeluaran");
});
document.getElementById("btn-add-income-quick").addEventListener("click", () => {
    openTransactionModal("pemasukan");
});

// ==========================================
// RENDERING TRANSACTIONS PAGE (WITH PAGINATION/FILTERS)
// ==========================================

function updateTransactionsUI() {
    const typeFilter = document.getElementById("filter-type").value;
    const categoryFilter = document.getElementById("filter-category").value;
    const dateFilter = document.getElementById("filter-date").value;
    const globalSearch = document.getElementById("global-search").value.toLowerCase();

    // Filter transaction lists
    let filteredList = state.transactions.filter(t => {
        const matchesType = typeFilter === "all" || t.type === typeFilter;
        const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
        const matchesDate = !dateFilter || t.date === dateFilter;
        const matchesSearch = t.title.toLowerCase().includes(globalSearch) || 
                              t.category.toLowerCase().includes(globalSearch);

        return matchesType && matchesCategory && matchesDate && matchesSearch;
    });

    // Pagination
    const totalItems = filteredList.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredList.slice(startIdx, startIdx + itemsPerPage);

    // Render Table
    const tableBody = document.getElementById("transactions-list-table");
    tableBody.innerHTML = "";

    if (paginatedItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px 0;">Tidak ada transaksi yang cocok.</td></tr>`;
    } else {
        paginatedItems.forEach(tx => {
            const amountFormatted = tx.type === "pemasukan" ? `+ ${formatRupiah(tx.amount)}` : `- ${formatRupiah(tx.amount)}`;
            const amountClass = tx.type === "pemasukan" ? "amount-text pemasukan" : "amount-text pengeluaran";
            const typeLabel = tx.type === "pemasukan" ? "Pemasukan" : "Pengeluaran";
            const typeClass = tx.type === "pemasukan" ? "pemasukan" : "pengeluaran";
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${tx.title}</strong></td>
                <td><span class="badge-type ${typeClass}">${typeLabel}</span></td>
                <td>
                    <div class="category-tag">
                        <i data-lucide="${getCategoryIconName(tx.category)}"></i>
                        <span>${tx.category}</span>
                    </div>
                </td>
                <td>${formatDate(tx.date)}</td>
                <td class="${amountClass}">${amountFormatted}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon-only" onclick="editTransaction('${tx.id}')" title="Edit"><i data-lucide="edit"></i></button>
                        <button class="btn-icon-only danger" onclick="deleteTransaction('${tx.id}')" title="Hapus"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Render Pagination Control
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = `
        <div class="pagination-info">Menampilkan ${totalItems > 0 ? startIdx + 1 : 0}-${Math.min(startIdx + itemsPerPage, totalItems)} dari ${totalItems} transaksi</div>
        <div class="pagination-btns">
            <button class="btn btn-secondary btn-sm" id="btn-prev-page" ${currentPage === 1 ? "disabled" : ""}><i data-lucide="chevron-left"></i></button>
            <button class="btn btn-secondary btn-sm" id="btn-next-page" ${currentPage === totalPages ? "disabled" : ""}><i data-lucide="chevron-right"></i></button>
        </div>
    `;

    // Add Pagination Listeners
    document.getElementById("btn-prev-page")?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            updateTransactionsUI();
        }
    });
    document.getElementById("btn-next-page")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateTransactionsUI();
        }
    });

    refreshIcons();
}

// Setup filter listeners
document.getElementById("filter-type").addEventListener("change", () => { currentPage = 1; updateTransactionsUI(); });
document.getElementById("filter-category").addEventListener("change", () => { currentPage = 1; updateTransactionsUI(); });
document.getElementById("filter-date").addEventListener("change", () => { currentPage = 1; updateTransactionsUI(); });
document.getElementById("btn-reset-filters").addEventListener("click", () => {
    document.getElementById("filter-type").value = "all";
    document.getElementById("filter-category").value = "all";
    document.getElementById("filter-date").value = "";
    currentPage = 1;
    updateTransactionsUI();
});

// Search input global filter
document.getElementById("global-search").addEventListener("input", () => {
    currentPage = 1;
    updateTransactionsUI();
});

// ==========================================
// RENDERING BUDGETS PAGE
// ==========================================

function updateBudgetsUI() {
    const budgetCardsContainer = document.getElementById("budget-cards-container");
    budgetCardsContainer.innerHTML = "";

    const categories = Object.keys(state.budgets);
    categories.forEach(cat => {
        const limit = state.budgets[cat] || 0;
        const spent = state.transactions
            .filter(t => t.type === "pengeluaran" && t.category === cat)
            .reduce((sum, t) => sum + t.amount, 0);

        const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
        const remaining = limit - spent;
        
        let colorClass = "";
        let borderClass = "";
        let pctTextClass = "text-muted";
        
        if (pct >= 100) {
            colorClass = "var(--rose)";
            pctTextClass = "text-rose font-bold";
        } else if (pct >= 80) {
            colorClass = "var(--amber)";
            pctTextClass = "text-amber font-bold";
        } else {
            colorClass = "var(--emerald)";
        }

        const card = document.createElement("div");
        card.className = "card budget-card";
        card.innerHTML = `
            <div class="budget-card-header">
                <div class="category-info">
                    <div class="category-icon ${getCategoryCssClass(cat)}">
                        <i data-lucide="${getCategoryIconName(cat)}"></i>
                    </div>
                    <div class="category-details">
                        <h4>${cat}</h4>
                        <span>Batas: ${formatRupiah(limit)}</span>
                    </div>
                </div>
                <button class="btn-icon-only" onclick="editBudgetLimit('${cat}')" title="Atur Limit"><i data-lucide="settings"></i></button>
            </div>
            
            <div class="budget-numeric-group">
                <div class="budget-numeric-display">
                    <span class="budget-numeric">${formatRupiah(spent)}</span>
                    <span class="budget-percentage-text ${pctTextClass}">${pct}% Terpakai</span>
                </div>
                <div class="progress-bar-container mt-2">
                    <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${colorClass};"></div>
                </div>
            </div>
            
            <div class="budget-card-footer">
                <span>Sisa Anggaran:</span>
                <strong style="color: ${remaining < 0 ? 'var(--rose)' : 'inherit'}">${remaining < 0 ? '-' : ''}${formatRupiah(Math.abs(remaining))}</strong>
            </div>
        `;
        budgetCardsContainer.appendChild(card);
    });

    refreshIcons();
}

// ==========================================
// RENDERING TABUNGAN (SAVINGS) PAGE
// ==========================================

function updateSavingsUI() {
    const container = document.getElementById("savings-cards-container");
    container.innerHTML = "";

    if (state.savings.length === 0) {
        container.innerHTML = `
            <div class="card span-all" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p class="text-muted">Belum ada target tabungan. Ayo buat celengan pertamamu!</p>
            </div>
        `;
        return;
    }

    state.savings.forEach(sv => {
        const pct = sv.target > 0 ? Math.min(Math.round((sv.current / sv.target) * 100), 100) : 0;
        const isCompleted = sv.current >= sv.target;
        
        const card = document.createElement("div");
        card.className = `card saving-card ${isCompleted ? 'completed' : ''}`;
        
        card.innerHTML = `
            ${isCompleted ? '<div class="completed-badge-ribbon">TERCAPAI</div>' : ''}
            <div class="saving-card-header">
                <div class="category-info">
                    <div class="saving-icon-bg">
                        <i data-lucide="piggy-bank"></i>
                    </div>
                    <div class="saving-card-details">
                        <h4>${sv.name}</h4>
                        <span>Target: ${formatDate(sv.deadline)}</span>
                    </div>
                </div>
                <button class="btn-icon-only danger" onclick="deleteSavingGoal('${sv.id}')" title="Hapus Target"><i data-lucide="trash-2"></i></button>
            </div>
            
            <div>
                <div class="saving-numeric-display">
                    <span>${formatRupiah(sv.current)}</span>
                    <span class="saving-goal-num">/ ${formatRupiah(sv.target)}</span>
                </div>
                <div class="progress-bar-container mt-3">
                    <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${isCompleted ? 'var(--emerald)' : 'var(--accent)'};"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-top:8px;">
                    <span>Terkumpul: ${pct}%</span>
                    <span>Sisa: ${formatRupiah(Math.max(0, sv.target - sv.current))}</span>
                </div>
            </div>
            
            <div class="saving-card-footer-btns">
                <button class="btn btn-secondary btn-sm" onclick="openSavingActionModal('${sv.id}', 'tarik')" ${sv.current === 0 ? 'disabled' : ''}><i data-lucide="minus"></i> Tarik</button>
                <button class="btn btn-primary btn-sm" onclick="openSavingActionModal('${sv.id}', 'setor')" ${isCompleted ? 'disabled' : ''}><i data-lucide="plus"></i> Setor</button>
            </div>
        `;
        container.appendChild(card);
    });

    refreshIcons();
}

// ==========================================
// RENDERING NOTIFIKASI PAGE
// ==========================================

function updateNotificationsUI() {
    const container = document.getElementById("notifications-container");
    const badge = document.getElementById("noti-badge");
    const dot = document.getElementById("noti-dot");
    
    // Count unread
    const unreadCount = state.notifications.filter(n => !n.read).length;
    
    // Badges update
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? "block" : "none";
    dot.style.display = unreadCount > 0 ? "block" : "none";

    container.innerHTML = "";

    if (state.notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>Tidak ada pemberitahuan.</p>
            </div>
        `;
        return;
    }

    state.notifications.forEach(n => {
        let iconName = "info";
        let statusClass = "info";
        if (n.type === "success") { iconName = "check-circle-2"; statusClass = "success"; }
        else if (n.type === "warning") { iconName = "alert-triangle"; statusClass = "warning"; }
        else if (n.type === "danger") { iconName = "alert-octagon"; statusClass = "danger"; }

        const item = document.createElement("div");
        item.className = `notification-item ${n.read ? '' : 'unread'}`;
        item.innerHTML = `
            <div class="noti-icon-box ${statusClass}">
                <i data-lucide="${iconName}"></i>
            </div>
            <div class="noti-item-content">
                <div class="noti-item-header">
                    <h4>${n.title}</h4>
                    <span class="noti-time">${n.time}</span>
                </div>
                <p>${n.message}</p>
            </div>
            ${n.read ? '' : `<div class="unread-dot" onclick="markAsRead('${n.id}')" title="Tandai sudah dibaca"></div>`}
        `;
        container.appendChild(item);
    });

    refreshIcons();
}

// Notification Actions
function markAsRead(id) {
    const noti = state.notifications.find(n => n.id === id);
    if (noti) {
        noti.read = true;
        saveState();
        updateNotificationsUI();
    }
}

document.getElementById("btn-mark-all-read").addEventListener("click", () => {
    state.notifications.forEach(n => n.read = true);
    saveState();
    updateNotificationsUI();
});

document.getElementById("btn-clear-notifications").addEventListener("click", () => {
    state.notifications = [];
    saveState();
    updateNotificationsUI();
});

document.getElementById("noti-quick-btn").addEventListener("click", () => {
    document.querySelector('.menu-item[data-tab="notifikasi"]').click();
});

// ==========================================
// RENDERING LAPORAN PAGE (CHART.JS VISUALS)
// ==========================================

function renderCharts() {
    const isDark = document.body.classList.contains("dark-theme");
    const textColor = isDark ? "#94a3b8" : "#475569";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

    // Chart.js global overrides
    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.font.size = 12;

    // --- 1. PREPARE DATA ---
    const categories = Object.keys(state.budgets);
    const categoryExpenseData = categories.map(cat => {
        return state.transactions
            .filter(t => t.type === "pengeluaran" && t.category === cat)
            .reduce((sum, t) => sum + t.amount, 0);
    });

    // Generate weekly income/expense trend data for current month (June 2026 for prototype context)
    // We group by week: Week 1 (1-7), Week 2 (8-14), Week 3 (15-21), Week 4 (22-30)
    const weeks = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"];
    const weeklyIncome = [0, 0, 0, 0];
    const weeklyExpense = [0, 0, 0, 0];

    state.transactions.forEach(t => {
        const date = new Date(t.date);
        const day = date.getDate();
        let weekIdx = 0;
        
        if (day <= 7) weekIdx = 0;
        else if (day <= 14) weekIdx = 1;
        else if (day <= 21) weekIdx = 2;
        else weekIdx = 3;

        if (t.type === "pemasukan") {
            weeklyIncome[weekIdx] += t.amount;
        } else {
            weeklyExpense[weekIdx] += t.amount;
        }
    });

    // --- 2. RENDER TREND LINE CHART ---
    const trendCtx = document.getElementById("trendChart")?.getContext("2d");
    if (trendCtx) {
        if (trendChart) trendChart.destroy();
        
        trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: weeklyIncome,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: isDark ? '#08090d' : '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Pengeluaran',
                        data: weeklyExpense,
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#f43f5e',
                        pointBorderColor: isDark ? '#08090d' : '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // We use our custom legend in HTML
                    },
                    tooltip: {
                        padding: 12,
                        cornerRadius: 8,
                        backgroundColor: isDark ? '#11131c' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#94a3b8' : '#475569',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${formatRupiah(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) return `Rp ${value / 1000000}jt`;
                                if (value >= 1000) return `Rp ${value / 1000}rb`;
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 3. RENDER CATEGORIES DOUGHNUT CHART ---
    const categoryCtx = document.getElementById("categoryChart")?.getContext("2d");
    if (categoryCtx) {
        if (categoryChart) categoryChart.destroy();

        // Check if there is any expense
        const totalExp = categoryExpenseData.reduce((a,b) => a+b, 0);

        categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: totalExp > 0 ? categoryExpenseData : [1, 1, 1, 1, 1, 1], // fallback template if empty
                    backgroundColor: [
                        '#6366f1', // Makanan
                        '#f59e0b', // Transportasi
                        '#10b981', // Pendidikan
                        '#0ea5e9', // Kost
                        '#ec4899', // Hiburan
                        '#94a3b8'  // Lainnya
                    ],
                    borderWidth: isDark ? 3 : 2,
                    borderColor: isDark ? '#12141c' : '#ffffff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        padding: 12,
                        cornerRadius: 8,
                        backgroundColor: isDark ? '#11131c' : '#ffffff',
                        bodyColor: isDark ? '#ffffff' : '#0f172a',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                if (totalExp === 0) return ` ${context.label}: Rp 0 (Belum ada data)`;
                                const pct = Math.round((context.raw / totalExp) * 100);
                                return ` ${context.label}: ${formatRupiah(context.raw)} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // --- 4. HEALTH INSIGHT LOGIC ---
    updateFinancialInsights(weeklyIncome, weeklyExpense, categoryExpenseData, categories);
}

function updateFinancialInsights(income, expense, expenseData, categories) {
    const totalIncome = income.reduce((a,b) => a+b,0);
    const totalExpense = expense.reduce((a,b) => a+b,0);
    
    // Insight Ratio text
    const ratioText = document.getElementById("insight-ratio-text");
    if (totalIncome > totalExpense) {
        const surplus = totalIncome - totalExpense;
        ratioText.innerHTML = `Pemasukan Anda bulan ini lebih besar daripada pengeluaran. Anda memiliki surplus dana sebesar <strong>${formatRupiah(surplus)}</strong> yang siap dialokasikan untuk target Tabungan Anda. Sangat baik!`;
    } else if (totalIncome === totalExpense && totalIncome > 0) {
        ratioText.innerHTML = `Keuangan Anda seimbang secara pas-pasang. Saldo tersisa adalah Rp 0. Cobalah memangkas pengeluaran hiburan untuk mulai menabung dana darurat.`;
    } else {
        const deficit = totalExpense - totalIncome;
        ratioText.innerHTML = `Pengeluaran Anda bulan ini melebihi pemasukan dengan defisit sebesar <strong class="text-rose">${formatRupiah(deficit)}</strong>. Anda menggunakan tabungan lama atau berutang. Segera evaluasi kategori pengeluaran Anda!`;
    }

    // Top Expense Category Text
    const topExpenseText = document.getElementById("insight-top-expense-text");
    const badgeCategory = document.getElementById("insight-category-badge");
    
    let maxExpense = -1;
    let maxCategoryIdx = -1;
    for(let i=0; i < expenseData.length; i++) {
        if(expenseData[i] > maxExpense) {
            maxExpense = expenseData[i];
            maxCategoryIdx = i;
        }
    }

    if (maxExpense > 0 && maxCategoryIdx !== -1) {
        const topCat = categories[maxCategoryIdx];
        const pct = Math.round((maxExpense / totalExpense) * 100);
        
        topExpenseText.innerHTML = `Kategori <strong>"${topCat}"</strong> merupakan pengeluaran terbesar Anda bulan ini, mengambil porsi sekitar <strong>${pct}%</strong> dari total pengeluaran (yaitu sebesar <strong>${formatRupiah(maxExpense)}</strong>).`;
        
        if (topCat === "Hiburan" && pct > 20) {
            badgeCategory.textContent = "Potensi Boros";
            badgeCategory.className = "insight-badge warning";
        } else {
            badgeCategory.textContent = "Kategori Utama";
            badgeCategory.className = "insight-badge info";
        }
    } else {
        topExpenseText.textContent = "Belum ada catatan pengeluaran bulan ini. Mulai tambahkan transaksi pengeluaran Anda.";
        badgeCategory.textContent = "Tidak Ada Data";
        badgeCategory.className = "insight-badge info";
    }
}

// ==========================================
// MODAL MANAGEMENT & EVENT LISTENERS
// ==========================================

const modalOverlayTransactions = document.getElementById("modal-transaction");
const modalOverlayBudgets = document.getElementById("modal-budget");
const modalOverlaySavings = document.getElementById("modal-saving");
const modalOverlaySavingAction = document.getElementById("modal-saving-action");

function closeModal(modalElement) {
    modalElement.classList.remove("active");
}

function openModal(modalElement) {
    modalElement.classList.add("active");
}

// Attach close event to buttons inside modals
document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
        closeModal(modalOverlayTransactions);
        closeModal(modalOverlayBudgets);
        closeModal(modalOverlaySavings);
        closeModal(modalOverlaySavingAction);
    });
});

// Close when overlay is clicked
[modalOverlayTransactions, modalOverlayBudgets, modalOverlaySavings, modalOverlaySavingAction].forEach(overlay => {
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeModal(overlay);
        }
    });
});

// --- 1. Transaction Form Modal Controls ---
function openTransactionModal(defaultType = "pengeluaran") {
    // Reset form
    document.getElementById("form-transaction").reset();
    document.getElementById("trans-id").value = "";
    document.getElementById("transaction-modal-title").textContent = "Tambah Transaksi Baru";
    document.getElementById("trans-date").value = new Date().toISOString().split('T')[0];

    // Setup Type Toggle active styling
    const expenseBtn = document.getElementById("type-expense-btn");
    const incomeBtn = document.getElementById("type-income-btn");
    
    if (defaultType === "pengeluaran") {
        expenseBtn.classList.add("active");
        expenseBtn.querySelector("input").checked = true;
        incomeBtn.classList.remove("active");
    } else {
        incomeBtn.classList.add("active");
        incomeBtn.querySelector("input").checked = true;
        expenseBtn.classList.remove("active");
    }

    openModal(modalOverlayTransactions);
}

// Hook transaction type selectors in modal
document.querySelectorAll('.transaction-type-selector .type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.transaction-type-selector .type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.querySelector("input").checked = true;
    });
});

// Add Transaction trigger button
document.getElementById("btn-add-transaction").addEventListener("click", () => {
    openTransactionModal("pengeluaran");
});

// Form Transaction Submit
document.getElementById("form-transaction").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const id = document.getElementById("trans-id").value;
    const type = document.querySelector('input[name="trans-type"]:checked').value;
    const title = document.getElementById("trans-title").value;
    const amount = parseInt(document.getElementById("trans-amount").value);
    const category = document.getElementById("trans-category").value;
    const date = document.getElementById("trans-date").value;

    if (id) {
        // Edit existing transaction
        const idx = state.transactions.findIndex(t => t.id === id);
        if (idx !== -1) {
            state.transactions[idx] = { id, title, type, category, amount, date };
        }
    } else {
        // Create new transaction
        const newTx = {
            id: "tx-" + Date.now(),
            title,
            type,
            category,
            amount,
            date
        };
        
        // Add to front of list
        state.transactions.unshift(newTx);
        
        // Logical threshold check for warnings
        if (type === "pengeluaran") {
            checkBudgetThresholds(category, amount);
        }
    }

    saveState();
    closeModal(modalOverlayTransactions);
    
    // Refresh all view grids
    updateDashboardUI();
    updateTransactionsUI();
    updateBudgetsUI();
    if (document.getElementById("laporan-tab").classList.contains("active")) {
        renderCharts();
    }
});

// Edit Transaction handler (Global helper)
window.editTransaction = function(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    // Fill form
    document.getElementById("trans-id").value = tx.id;
    document.getElementById("trans-title").value = tx.title;
    document.getElementById("trans-amount").value = tx.amount;
    document.getElementById("trans-category").value = tx.category;
    document.getElementById("trans-date").value = tx.date;
    document.getElementById("transaction-modal-title").textContent = "Ubah Catatan Transaksi";

    const expenseBtn = document.getElementById("type-expense-btn");
    const incomeBtn = document.getElementById("type-income-btn");
    
    if (tx.type === "pengeluaran") {
        expenseBtn.classList.add("active");
        expenseBtn.querySelector("input").checked = true;
        incomeBtn.classList.remove("active");
    } else {
        incomeBtn.classList.add("active");
        incomeBtn.querySelector("input").checked = true;
        expenseBtn.classList.remove("active");
    }

    openModal(modalOverlayTransactions);
};

// Delete Transaction handler
window.deleteTransaction = function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState();
        updateDashboardUI();
        updateTransactionsUI();
        updateBudgetsUI();
        if (document.getElementById("laporan-tab").classList.contains("active")) {
            renderCharts();
        }
    }
};

// --- 2. Budget Limit Modal Controls ---
window.editBudgetLimit = function(category) {
    document.getElementById("budget-category-id").value = category;
    document.getElementById("budget-category-display").textContent = category;
    document.getElementById("budget-limit").value = state.budgets[category] || 0;
    
    openModal(modalOverlayBudgets);
};

// Form Budget Submit
document.getElementById("form-budget").addEventListener("submit", (e) => {
    e.preventDefault();
    const category = document.getElementById("budget-category-id").value;
    const limit = parseInt(document.getElementById("budget-limit").value);

    state.budgets[category] = limit;
    saveState();
    closeModal(modalOverlayBudgets);

    // Refresh UI
    updateDashboardUI();
    updateBudgetsUI();
});

// --- 3. Savings Goal Creation Modal Controls ---
document.getElementById("btn-add-saving-goal").addEventListener("click", () => {
    document.getElementById("form-saving").reset();
    document.getElementById("saving-deadline").value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default +30 days
    openModal(modalOverlaySavings);
});

// Form Savings Submit
document.getElementById("form-saving").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("saving-name").value;
    const target = parseInt(document.getElementById("saving-target").value);
    const deadline = document.getElementById("saving-deadline").value;
    const initialAmt = parseInt(document.getElementById("saving-start").value) || 0;

    const newGoal = {
        id: "sv-" + Date.now(),
        name,
        target,
        current: initialAmt,
        deadline
    };

    state.savings.unshift(newGoal);

    // If initial amount exists, reflect it in main balance as a deduction?
    // We treat the savings target's money as separate, so we don't automatically withdraw initial amount from main balance.
    // However, subsequent deposit/withdrawals WILL affect main balance.

    saveState();
    closeModal(modalOverlaySavings);

    updateDashboardUI();
    updateSavingsUI();
});

// Delete Savings Goal
window.deleteSavingGoal = function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus target tabungan ini?")) {
        state.savings = state.savings.filter(s => s.id !== id);
        saveState();
        updateDashboardUI();
        updateSavingsUI();
    }
};

// --- 4. Savings Setor/Tarik Actions ---
window.openSavingActionModal = function(id, mode = "setor") {
    const goal = state.savings.find(s => s.id === id);
    if (!goal) return;

    document.getElementById("saving-action-id").value = id;
    document.getElementById("saving-action-mode").value = mode;
    document.getElementById("saving-action-name").textContent = goal.name;
    
    const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
    document.getElementById("saving-action-progress").textContent = `Terisi: ${formatRupiah(goal.current)} / ${formatRupiah(goal.target)} (${pct}%)`;
    
    // Customize Labels
    const title = document.getElementById("saving-action-title");
    const submitBtn = document.getElementById("btn-saving-action-submit");
    const helper = document.getElementById("saving-action-helper");
    const inputAmount = document.getElementById("saving-action-amount");

    inputAmount.value = "";

    if (mode === "setor") {
        title.textContent = "Setor ke Celengan";
        submitBtn.textContent = "Setor Uang";
        submitBtn.className = "btn btn-primary";
        helper.textContent = "Uang akan diambil dari Saldo Utama Anda dan dimasukkan ke Celengan.";
        // Set maximum possible deposit to remaining target
        inputAmount.max = goal.target - goal.current;
    } else {
        title.textContent = "Tarik dari Celengan";
        submitBtn.textContent = "Tarik Uang";
        submitBtn.className = "btn btn-outline-danger";
        helper.textContent = "Uang akan dipindahkan dari Celengan kembali ke Saldo Utama Anda.";
        // Set maximum possible withdrawal to current savings
        inputAmount.max = goal.current;
    }

    openModal(modalOverlaySavingAction);
};

// Form Saving Action Submit (Tarik / Setor)
document.getElementById("form-saving-action").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("saving-action-id").value;
    const mode = document.getElementById("saving-action-mode").value;
    const amount = parseInt(document.getElementById("saving-action-amount").value);

    const goal = state.savings.find(s => s.id === id);
    if (!goal) return;

    const financials = calculateFinancials();

    if (mode === "setor") {
        // Check if main balance is sufficient
        if (amount > financials.mainBalance) {
            alert("Maaf, Saldo Utama Anda tidak mencukupi untuk melakukan setoran ini.");
            return;
        }

        // Check if exceeds remaining target
        const remaining = goal.target - goal.current;
        if (amount > remaining) {
            alert(`Jumlah setoran melebihi sisa target tabungan (Sisa target: ${formatRupiah(remaining)}).`);
            return;
        }

        // Update saving amount
        goal.current += amount;
        
        // Add matching transaction of type 'pengeluaran' with tag 'Lainnya' or virtual 'Tabungan'
        // to balance out the main balance automatically
        const newTx = {
            id: "tx-" + Date.now(),
            title: `Setor Celengan: ${goal.name}`,
            type: "pengeluaran",
            category: "Lainnya",
            amount: amount,
            date: new Date().toISOString().split('T')[0]
        };
        state.transactions.unshift(newTx);

        // Check if goal achieved
        if (goal.current >= goal.target) {
            addNotification(
                "Celengan Sukses Terkumpul!",
                `Selamat! Target Tabungan "${goal.name}" Anda telah tercapai 100%.`,
                "success"
            );
        }

    } else {
        // Withdrawal mode
        if (amount > goal.current) {
            alert("Jumlah penarikan melebihi saldo celengan saat ini.");
            return;
        }

        // Deduct from savings goal
        goal.current -= amount;

        // Add matching transaction of type 'pemasukan' with category 'Lainnya' 
        // to increase the main balance automatically
        const newTx = {
            id: "tx-" + Date.now(),
            title: `Tarik Celengan: ${goal.name}`,
            type: "pemasukan",
            category: "Lainnya",
            amount: amount,
            date: new Date().toISOString().split('T')[0]
        };
        state.transactions.unshift(newTx);
    }

    saveState();
    closeModal(modalOverlaySavingAction);

    // Refresh UI
    updateDashboardUI();
    updateTransactionsUI();
    updateSavingsUI();
    updateNotificationsUI();
    if (document.getElementById("laporan-tab").classList.contains("active")) {
        renderCharts();
    }
});

// ==========================================
// AUTHENTICATION LOGIC & EVENT LISTENERS
// ==========================================

function initAuth() {
    const authContainer = document.getElementById("auth-container");
    const mainAppContainer = document.getElementById("main-app-container");
    const loginView = document.getElementById("login-view");
    const registerView = document.getElementById("register-view");

    const linkToRegister = document.getElementById("link-to-register");
    const linkToLogin = document.getElementById("link-to-login");

    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");
    const btnLogout = document.getElementById("btn-logout");

    // Toggle between Login and Register views
    linkToRegister.addEventListener("click", (e) => {
        e.preventDefault();
        loginView.classList.remove("active");
        registerView.classList.add("active");
    });

    linkToLogin.addEventListener("click", (e) => {
        e.preventDefault();
        registerView.classList.remove("active");
        loginView.classList.add("active");
    });

    // Handle avatar options selection grid
    const avatarOptions = document.querySelectorAll(".avatar-option");
    avatarOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            avatarOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            opt.querySelector("input").checked = true;
        });
    });

    // Login Form Submit
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById("login-username").value.trim().toLowerCase();
        const passwordInput = document.getElementById("login-password").value;

        // Search user database
        const user = state.users.find(u => u.username === usernameInput);

        if (!user) {
            alert("Username tidak ditemukan!");
            return;
        }

        if (user.password !== passwordInput) {
            alert("Password yang Anda masukkan salah!");
            return;
        }

        // Login Success
        state.currentUser = user;
        saveState();
        
        // Load data namespaced by username
        loadUserData(user.username);
        
        // Enter dashboard view
        enterMainApplication();
    });

    // Register Form Submit
    formRegister.addEventListener("submit", (e) => {
        e.preventDefault();
        const fullname = document.getElementById("reg-fullname").value.trim();
        const username = document.getElementById("reg-username").value.trim().toLowerCase();
        const univ = document.getElementById("reg-univ").value.trim();
        const password = document.getElementById("reg-password").value;
        const avatar = document.querySelector('input[name="reg-avatar"]:checked').value;

        // Check availability
        const exists = state.users.some(u => u.username === username);
        if (exists) {
            alert("Username sudah terdaftar! Silakan gunakan username lain.");
            return;
        }

        // Create new account
        const newUser = { fullname, username, univ, password, avatar };
        state.users.push(newUser);
        state.currentUser = newUser;
        saveState();

        // Seed data for the new user
        loadUserData(username);
        saveState(); // Saves default values namespaced for this user

        // Transition to main dashboard
        enterMainApplication();
        
        // Reset register forms
        formRegister.reset();
        avatarOptions.forEach(o => o.classList.remove("active"));
        avatarOptions[0].classList.add("active");
        avatarOptions[0].querySelector("input").checked = true;
    });

    // Logout Click
    btnLogout.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Apakah Anda yakin ingin keluar dari MajuKeuangan?")) {
            logoutUser();
        }
    });
}

function enterMainApplication() {
    const authContainer = document.getElementById("auth-container");
    const mainAppContainer = document.getElementById("main-app-container");

    // Bind sidebar details
    document.getElementById("user-avatar").src = state.currentUser.avatar;
    document.getElementById("user-name").textContent = state.currentUser.fullname;
    document.getElementById("user-univ").textContent = state.currentUser.univ;

    // Reset default active tab to Dashboard
    const dashboardTab = document.querySelector('.menu-item[data-tab="dashboard"]');
    if (dashboardTab) dashboardTab.click();

    // Transition effect
    authContainer.style.opacity = "0";
    setTimeout(() => {
        authContainer.style.display = "none";
        mainAppContainer.style.display = "flex";
        mainAppContainer.style.opacity = "1";
        
        // Re-render UI grids with logged-in user state data
        updateDashboardUI();
        updateTransactionsUI();
        updateBudgetsUI();
        updateSavingsUI();
        updateNotificationsUI();
    }, 200);
}

function logoutUser() {
    const authContainer = document.getElementById("auth-container");
    const mainAppContainer = document.getElementById("main-app-container");

    state.currentUser = null;
    saveState();

    mainAppContainer.style.opacity = "0";
    setTimeout(() => {
        mainAppContainer.style.display = "none";
        authContainer.style.display = "flex";
        authContainer.style.opacity = "1";
        document.getElementById("form-login").reset();
        
        // Set forms back to login state
        document.getElementById("register-view").classList.remove("active");
        document.getElementById("login-view").classList.add("active");
    }, 200);
}

// ==========================================
// INITIALIZATION ON DOM CONTENT LOADED
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Navigation SPA Init
    initNavigation();

    // 2. Dark/Light Theme System Init
    initTheme();

    // 3. Authentication Forms & Flow Init
    initAuth();

    // 4. Initial Auth state check
    if (state.currentUser) {
        // Load namespaced user data
        loadUserData(state.currentUser.username);
        
        // Set profile sidebar element values
        document.getElementById("user-avatar").src = state.currentUser.avatar;
        document.getElementById("user-name").textContent = state.currentUser.fullname;
        document.getElementById("user-univ").textContent = state.currentUser.univ;
        
        // Show app UI
        document.getElementById("auth-container").style.display = "none";
        document.getElementById("main-app-container").style.display = "flex";
        document.getElementById("main-app-container").style.opacity = "1";
        
        // Initial rendering
        updateDashboardUI();
        updateTransactionsUI();
        updateBudgetsUI();
        updateSavingsUI();
        updateNotificationsUI();
    } else {
        // Show login/register panel
        document.getElementById("auth-container").style.display = "flex";
        document.getElementById("auth-container").style.opacity = "1";
        document.getElementById("main-app-container").style.display = "none";
    }
});
