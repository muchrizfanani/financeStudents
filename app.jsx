import React, { useState, useEffect } from 'react';
import { 
    WalletCards, LayoutDashboard, ArrowLeftRight, PieChart, 
    BarChart3, PiggyBank, Bell, LogOut, Search, Sun, Moon, 
    Info, Coins, TrendingUp, TrendingDown, ArrowDownLeft, 
    ArrowUpRight, Plus, ChevronRight, RotateCcw, Edit, 
    Trash2, X, Settings, CheckCircle2, AlertTriangle, AlertOctagon,
    Inbox, User, Home, Bike, GraduationCap, PartyPopper, HelpCircle,
    CheckCheck
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';

// Register ChartJS plugins
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

// Constant Tips list
const STUDENT_TIPS = [
    "Selalu prioritaskan kebutuhan kuliah dan kos sebelum menyisihkan untuk hiburan. Buat rasio 50:30:20 untuk Kebutuhan, Keinginan, dan Tabungan.",
    "Bawa botol minum sendiri saat kuliah. Selain ramah lingkungan, hal ini bisa menghemat pengeluaran air minum hingga Rp 150.000 sebulan!",
    "Manfaatkan diskon mahasiswa untuk software pendukung kuliah, Spotify, YouTube Premium, maupun transportasi umum.",
    "Sebelum membeli buku pelajaran fisik baru, coba cari e-book gratis di perpus kampus atau beli buku bekas dari kakak tingkat.",
    "Usahakan memasak sendiri di kost daripada jajan di luar. Anda bisa menghemat hingga 50% biaya makanan bulanan.",
    "Catat setiap pengeluaran sekecil apapun. Pengeluaran kecil seperti parkir, tisu, dan cemilan seringkali menjadi 'kebocoran' anggaran terbesar."
];

// Helper: Format to IDR
const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(num);
};

// Helper: Format Date
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
};

// Helper: Category Icons
const getCategoryIcon = (category, size = 18) => {
    switch (category) {
        case "Makanan": return <UtensilsIcon size={size} />;
        case "Transportasi": return <Bike size={size} />;
        case "Pendidikan": return <GraduationCap size={size} />;
        case "Kost": return <Home size={size} />;
        case "Hiburan": return <PartyPopper size={size} />;
        default: return <HelpCircle size={size} />;
    }
};

const UtensilsIcon = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
);

const getCategoryCssClass = (category) => {
    switch (category) {
        case "Makanan": return "makanan";
        case "Transportasi": return "transportasi";
        case "Pendidikan": return "pendidikan";
        case "Kost": return "kost";
        case "Hiburan": return "hiburan";
        default: return "lainnya";
    }
};

export default function App() {
    // --- AUTH & USER STATE ---
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("mk_user");
        return saved ? JSON.parse(saved) : null;
    });

    const [authMode, setAuthMode] = useState("login"); // login | register
    const [activeTab, setActiveTab] = useState("dashboard");
    const [theme, setTheme] = useState(() => localStorage.getItem("mk_theme") || "dark");
    const [globalSearch, setGlobalSearch] = useState("");
    const [avatarPreview, setAvatarPreview] = useState(null); // base64 preview for register
    const [authError, setAuthError] = useState(""); // inline error messages

    // --- APPLICATION DATA STATE ---
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState({});
    const [savings, setSavings] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    // --- MODAL STATE ---
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null); // null for new, tx object for edit
    
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [budgetLimitInput, setBudgetLimitInput] = useState("");

    const [isSavingModalOpen, setIsSavingModalOpen] = useState(false);
    
    const [isSavingActionModalOpen, setIsSavingActionModalOpen] = useState(false);
    const [selectedSaving, setSelectedSaving] = useState(null);
    const [savingActionMode, setSavingActionMode] = useState("setor"); // setor | tarik
    const [savingAmountInput, setSavingAmountInput] = useState("");

    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // --- FILTER STATE (replaces DOM queries) ---
    const [filterType, setFilterType] = useState("all");
    const [filterCategory, setFilterCategory] = useState("all");
    const [filterDate, setFilterDate] = useState("");

    // --- EFFECT: Theme configuration ---
    useEffect(() => {
        if (theme === "light") {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
        }
        localStorage.setItem("mk_theme", theme);
    }, [theme]);

    // --- EFFECT: Fetch data when user changes ---
    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // --- API CALLS ---
    const fetchData = async () => {
        if (!user) return;
        const headers = { 'x-user-id': user.id };
        try {
            const [txRes, budgetRes, savingRes, notiRes] = await Promise.all([
                fetch('/api/transactions', { headers }).then(r => r.json()),
                fetch('/api/budgets', { headers }).then(r => r.json()),
                fetch('/api/savings', { headers }).then(r => r.json()),
                fetch('/api/notifications', { headers }).then(r => r.json())
            ]);
            
            setTransactions(txRes);
            setBudgets(budgetRes);
            setSavings(savingRes);
            setNotifications(notiRes);
        } catch (err) {
            console.error("Failed to fetch backend data:", err);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");
        const username = e.target.username.value.trim().toLowerCase();
        const password = e.target.password.value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (!res.ok) {
                setAuthError(data.error || "Login gagal. Periksa username dan password.");
                return;
            }

            setUser(data);
            localStorage.setItem("mk_user", JSON.stringify(data));
            setActiveTab("dashboard");
        } catch (err) {
            setAuthError("Tidak dapat terhubung ke server. Pastikan backend berjalan.");
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");
        const fullname = e.target.fullname.value.trim();
        const username = e.target.username.value.trim().toLowerCase();
        const univ = e.target.univ.value.trim();
        const password = e.target.password.value;
        
        // avatar: gunakan preview base64, atau fallback ke avatar default
        const avatar = avatarPreview || "https://ui-avatars.com/api/?name=" + encodeURIComponent(fullname) + "&background=6366f1&color=fff&size=120";

        if (password.length < 6) {
            setAuthError("Password minimal 6 karakter.");
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, username, univ, password, avatar })
            });
            const data = await res.json();

            if (!res.ok) {
                setAuthError(data.error || "Pendaftaran gagal.");
                return;
            }

            setUser(data);
            localStorage.setItem("mk_user", JSON.stringify(data));
            setActiveTab("dashboard");
        } catch (err) {
            setAuthError("Tidak dapat terhubung ke server. Pastikan backend berjalan.");
        }
    };

    // Handles photo upload from gallery → convert to base64
    const handleAvatarFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setAuthError("File harus berupa gambar (JPG, PNG, dll).");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setAuthError("Ukuran foto maksimal 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setAvatarPreview(ev.target.result);
            setAuthError("");
        };
        reader.readAsDataURL(file);
    };

    const handleLogout = () => {
        if (window.confirm("Apakah Anda yakin ingin keluar?")) {
            setUser(null);
            localStorage.removeItem("mk_user");
            setTransactions([]);
            setBudgets({});
            setSavings([]);
            setNotifications([]);
        }
    };

    const handleTransactionSubmit = async (e) => {
        e.preventDefault();
        const title = e.target.title.value.trim();
        const type = e.target.type.value;
        const category = e.target.category.value;
        const amount = parseInt(e.target.amount.value, 10);
        const date = e.target.date.value;

        const headers = { 
            'Content-Type': 'application/json',
            'x-user-id': user.id 
        };
        const body = JSON.stringify({ title, type, category, amount, date });

        try {
            let res;
            if (selectedTx) {
                res = await fetch(`/api/transactions/${selectedTx.id}`, {
                    method: 'PUT',
                    headers,
                    body
                });
            } else {
                res = await fetch('/api/transactions', {
                    method: 'POST',
                    headers,
                    body
                });
            }

            if (res.ok) {
                setIsTxModalOpen(false);
                setSelectedTx(null);
                fetchData();

                // Trigger budget warnings if expense
                if (type === "pengeluaran") {
                    checkAndTriggerBudgetWarning(category, amount);
                }
            } else {
                const data = await res.json();
                alert(data.error || "Gagal menyimpan transaksi.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const checkAndTriggerBudgetWarning = async (category, newAmt) => {
        // Local calculation of category spending
        const catSpent = transactions
            .filter(t => t.type === "pengeluaran" && t.category === category)
            .reduce((sum, t) => sum + t.amount, 0) + newAmt;
        
        const limit = budgets[category] || 0;
        if (limit === 0) return;

        const pct = (catSpent / limit) * 100;
        let title = "";
        let message = "";
        let type = "info";

        if (pct >= 100) {
            title = "Batas Anggaran Terlampaui!";
            message = `Pengeluaran kategori ${category} Anda telah melampaui batas anggaran (100%+).`;
            type = "danger";
        } else if (pct >= 80) {
            title = "Anggaran Mendekati Batas";
            message = `Pengeluaran kategori ${category} Anda sudah mencapai ${Math.round(pct)}% dari anggaran bulanan.`;
            type = "warning";
        } else {
            return;
        }

        // Send to backend
        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': user.id 
                },
                body: JSON.stringify({ title, message, type })
            });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
        try {
            const res = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleBudgetSubmit = async (e) => {
        e.preventDefault();
        const limit = parseInt(budgetLimitInput, 10);
        try {
            const res = await fetch('/api/budgets', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ category: selectedCategory, limit })
            });
            if (res.ok) {
                setIsBudgetModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateSavingGoal = async (e) => {
        e.preventDefault();
        const name = e.target.name.value.trim();
        const target = parseInt(e.target.target.value, 10);
        const current = parseInt(e.target.current.value, 10) || 0;
        const deadline = e.target.deadline.value;

        try {
            const res = await fetch('/api/savings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ name, target, current, deadline })
            });
            if (res.ok) {
                setIsSavingModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteSavingGoal = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus target celengan ini?")) return;
        try {
            const res = await fetch(`/api/savings/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSavingGoalActionSubmit = async (e) => {
        e.preventDefault();
        const amount = parseInt(savingAmountInput, 10);
        
        // Validation checking
        const financials = calculateFinancials();
        if (savingActionMode === "setor") {
            if (amount > financials.mainBalance) {
                alert("Maaf, Saldo Utama Anda tidak mencukupi.");
                return;
            }
            const remaining = selectedSaving.target - selectedSaving.current;
            if (amount > remaining) {
                alert(`Jumlah setoran melebihi sisa target tabungan (Sisa target: ${formatRupiah(remaining)}).`);
                return;
            }
        } else {
            if (amount > selectedSaving.current) {
                alert("Jumlah penarikan melebihi saldo celengan saat ini.");
                return;
            }
        }

        try {
            const res = await fetch(`/api/savings/${selectedSaving.id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ mode: savingActionMode, amount })
            });
            if (res.ok) {
                setIsSavingActionModalOpen(false);
                setSavingAmountInput("");
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkNotificationRead = async (id) => {
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'x-user-id': user.id }
            });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllNotificationsRead = async () => {
        try {
            await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: { 'x-user-id': user.id }
            });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleClearNotifications = async () => {
        try {
            await fetch('/api/notifications/clear', {
                method: 'POST',
                headers: { 'x-user-id': user.id }
            });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    // --- CORE CALCULATIONS ---
    const calculateFinancials = () => {
        const totalIncome = transactions
            .filter(t => t.type === "pemasukan")
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === "pengeluaran")
            .reduce((sum, t) => sum + t.amount, 0);

        const mainBalance = totalIncome - totalExpense;

        return {
            mainBalance,
            totalIncome,
            totalExpense
        };
    };

    // Open modals
    const openEditTxModal = (tx) => {
        setSelectedTx(tx);
        setIsTxModalOpen(true);
    };

    const openEditBudgetModal = (category) => {
        setSelectedCategory(category);
        setBudgetLimitInput(budgets[category] || 0);
        setIsBudgetModalOpen(true);
    };

    const openSavingActionModal = (goal, mode) => {
        setSelectedSaving(goal);
        setSavingActionMode(mode);
        setIsSavingActionModalOpen(true);
    };

    // Financial calculations
    const financials = calculateFinancials();
    const unreadNotifications = notifications.filter(n => !n.read).length;

    // --- AUTH VIEW (IF NOT LOGGED IN) ---
    if (!user) {
        return (
            <div className="auth-container">
                <div className={`auth-box ${authMode === "register" ? "auth-box-tall" : ""}`}>
                    <div className="auth-brand-panel">
                        <div className="brand-panel-glow"></div>
                        <div className="brand-logo">
                            <div className="logo">
                                <WalletCards size={20} />
                            </div>
                            <span>Maju<span className="highlight">Keuangan</span></span>
                        </div>
                        <div className="brand-panel-content">
                            <h2>Kelola Keuangan Kuliahmu dengan Cerdas</h2>
                            <p>Catat transaksi harian, susun batas anggaran per kategori, kumpulkan celengan impian, dan dapatkan analisis laporan finansial secara otomatis.</p>
                        </div>
                        <div className="brand-panel-footer">
                            <p>&copy; 2026 MajuKeuangan. Edisi React Fullstack.</p>
                        </div>
                    </div>

                    <div className="auth-forms-panel">
                        {authMode === "login" ? (
                            <div className="auth-form-view active">
                                <div className="form-header">
                                    <h2>Selamat Datang Kembali!</h2>
                                    <p>Masuk ke akun keuangan mahasiswa Anda untuk melanjutkan.</p>
                                </div>
                                <form onSubmit={handleLoginSubmit}>
                                    <div className="form-group">
                                        <label htmlFor="login-username">Username</label>
                                        <input type="text" name="username" placeholder="Masukkan username Anda" required autoComplete="username" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="login-password">Password</label>
                                        <input type="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
                                    </div>
                                    {authError && <div className="auth-error-msg"><AlertTriangle size={14} /> {authError}</div>}
                                    <div className="form-actions-inline">
                                        <label className="checkbox-container">
                                            <input type="checkbox" defaultChecked />
                                            <span className="checkmark"></span>
                                            Ingat Saya
                                        </label>
                                        <span style={{ cursor: 'pointer' }} className="forgot-link" onClick={() => setAuthError("Gunakan username: rizky, password: password")}>Lupa Password?</span>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-block">Masuk Sekarang</button>
                                </form>
                                <div className="form-footer">
                                    <p>Belum punya akun? <span style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }} onClick={() => { setAuthMode("register"); setAuthError(""); setAvatarPreview(null); }}>Daftar Akun Baru</span></p>
                                </div>
                            </div>
                        ) : (
                            <div className="auth-form-view active">
                                <div className="form-header">
                                    <h2>Mulai Akun Baru</h2>
                                    <p>Buat akun keuangan mahasiswamu hanya dalam beberapa langkah.</p>
                                </div>
                                <form onSubmit={handleRegisterSubmit}>
                                    <div className="form-group">
                                        <label>Nama Lengkap</label>
                                        <input type="text" name="fullname" placeholder="Contoh: Budi Santoso" required />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Username</label>
                                            <input type="text" name="username" placeholder="budisantoso" required autoComplete="username" />
                                        </div>
                                        <div className="form-group">
                                            <label>Nama Universitas</label>
                                            <input type="text" name="univ" placeholder="Universitas Indonesia" required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Password</label>
                                        <input type="password" name="password" placeholder="Minimal 6 karakter" minLength="6" required autoComplete="new-password" />
                                    </div>
                                    
                                    {/* FOTO PROFIL — Upload dari Galeri */}
                                    <div className="form-group">
                                        <label>Foto Profil</label>
                                        <div className="avatar-upload-area">
                                            <div className="avatar-upload-preview">
                                                {avatarPreview ? (
                                                    <img src={avatarPreview} alt="Preview foto profil" />
                                                ) : (
                                                    <div className="avatar-upload-placeholder">
                                                        <User size={32} />
                                                        <span>Belum ada foto</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="avatar-upload-controls">
                                                <label className="btn btn-secondary btn-sm avatar-file-btn" htmlFor="avatar-file-input">
                                                    <User size={14} /> Pilih dari Galeri
                                                </label>
                                                <input 
                                                    id="avatar-file-input"
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={handleAvatarFileChange}
                                                    style={{ display: 'none' }}
                                                />
                                                {avatarPreview && (
                                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setAvatarPreview(null)}>
                                                        <X size={14} /> Hapus Foto
                                                    </button>
                                                )}
                                                <p className="avatar-upload-hint">JPG, PNG, GIF — maks. 2MB. Jika tidak dipilih, foto default akan dibuat otomatis.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {authError && <div className="auth-error-msg"><AlertTriangle size={14} /> {authError}</div>}
                                    <button type="submit" className="btn btn-primary btn-block">Daftar Akun</button>
                                </form>
                                <div className="form-footer">
                                    <p>Sudah punya akun? <span style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }} onClick={() => { setAuthMode("login"); setAuthError(""); }}>Masuk Disini</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- MAIN APPLICATION VIEW ---
    return (
        <div className="app-container" style={{ display: 'flex' }}>
            
            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <WalletCards size={20} />
                        </div>
                        <span className="logo-text">Maju<span className="highlight">Keuangan</span></span>
                    </div>
                </div>
                
                <nav className="sidebar-menu">
                    <button className={`menu-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button className={`menu-item ${activeTab === "transaksi" ? "active" : ""}`} onClick={() => setActiveTab("transaksi")}>
                        <ArrowLeftRight size={20} />
                        <span>Transaksi</span>
                    </button>
                    <button className={`menu-item ${activeTab === "anggaran" ? "active" : ""}`} onClick={() => setActiveTab("anggaran")}>
                        <PieChart size={20} />
                        <span>Anggaran</span>
                    </button>
                    <button className={`menu-item ${activeTab === "laporan" ? "active" : ""}`} onClick={() => setActiveTab("laporan")}>
                        <BarChart3 size={20} />
                        <span>Laporan</span>
                    </button>
                    <button className={`menu-item ${activeTab === "tabungan" ? "active" : ""}`} onClick={() => setActiveTab("tabungan")}>
                        <PiggyBank size={20} />
                        <span>Tabungan</span>
                    </button>
                    <button className={`menu-item ${activeTab === "notifikasi" ? "active" : ""}`} onClick={() => setActiveTab("notifikasi")}>
                        <Bell size={20} />
                        <span>Notifikasi</span>
                        {unreadNotifications > 0 && <span className="badge">{unreadNotifications}</span>}
                    </button>
                    <button className="menu-item logout-menu-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Keluar</span>
                    </button>
                </nav>
                
                <div className="user-profile">
                    <div className="avatar">
                        <img src={user.avatar} alt={user.fullname} />
                    </div>
                    <div className="user-info">
                        <h4 className="user-name">{user.fullname}</h4>
                        <p className="user-status">Mahasiswa Aktif</p>
                        <p className="user-univ">{user.univ}</p>
                    </div>
                </div>
            </aside>
            
            {/* Main Content Area */}
            <main className="main-content">
                
                {/* Header */}
                <header className="app-header">
                    <div className="header-left">
                        <h1 id="page-title" style={{ textTransform: 'capitalize' }}>{activeTab}</h1>
                        <p className="current-date">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="header-right">
                        <div className="search-box">
                            <Search size={18} />
                            <input 
                                type="text" 
                                placeholder="Cari transaksi, tabungan..." 
                                value={globalSearch} 
                                onChange={(e) => setGlobalSearch(e.target.value)} 
                            />
                        </div>
                        
                        <button className="theme-toggle-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        
                        <button className="icon-btn noti-btn" onClick={() => setActiveTab("notifikasi")}>
                            <Bell size={20} />
                            {unreadNotifications > 0 && <span className="dot"></span>}
                        </button>
                    </div>
                </header>
                
                {/* Content Container (Tabs) */}
                <div className="content-body">
                    
                    {/* 1. DASHBOARD PAGE */}
                    {activeTab === "dashboard" && (
                        <section className="tab-content active">
                            <div className="summary-grid">
                                <div className="summary-card balance">
                                    <div className="card-glow"></div>
                                    <div className="card-header">
                                        <span>Total Saldo</span>
                                        <div className="card-icon"><Coins size={18} /></div>
                                    </div>
                                    <h2 className="amount">{formatRupiah(financials.mainBalance)}</h2>
                                    <div className="card-footer">
                                        <span className="trend up"><TrendingUp size={14} /> +4.2%</span>
                                        <span className="footer-desc">dari bulan lalu</span>
                                    </div>
                                </div>
                                
                                <div className="summary-card income">
                                    <div className="card-header">
                                        <span>Pemasukan Bulan Ini</span>
                                        <div className="card-icon"><ArrowDownLeft size={18} /></div>
                                    </div>
                                    <h2 className="amount text-emerald">{formatRupiah(financials.totalIncome)}</h2>
                                    <div className="card-footer">
                                        <span className="trend up"><TrendingUp size={14} /> Uang Saku & Kerja Sampingan</span>
                                    </div>
                                </div>
                                
                                <div className="summary-card expense">
                                    <div className="card-header">
                                        <span>Pengeluaran Bulan Ini</span>
                                        <div className="card-icon"><ArrowUpRight size={18} /></div>
                                    </div>
                                    <h2 className="amount text-rose">{formatRupiah(financials.totalExpense)}</h2>
                                    <div className="card-footer">
                                        <span className="trend down"><TrendingDown size={14} /> Alokasi Belanja</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="details-grid">
                                <div className="col-left">
                                    <div className="card dashboard-card">
                                        <div className="card-title-container">
                                            <h3>Ringkasan Anggaran Kategori</h3>
                                            <button className="text-btn" onClick={() => setActiveTab("anggaran")}>Lihat Semua</button>
                                        </div>
                                        <div className="budget-summary-list">
                                            {Object.keys(budgets).slice(0, 4).map(cat => {
                                                const limit = budgets[cat] || 0;
                                                const spent = transactions
                                                    .filter(t => t.type === "pengeluaran" && t.category === cat)
                                                    .reduce((sum, t) => sum + t.amount, 0);
                                                const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
                                                
                                                let colorClass = "var(--accent)";
                                                if (pct >= 100) colorClass = "var(--rose)";
                                                else if (pct >= 80) colorClass = "var(--amber)";
                                                else colorClass = "var(--emerald)";

                                                return (
                                                    <div className="budget-summary-item" key={cat}>
                                                        <div className="budget-info">
                                                            <span className="budget-name">
                                                                <span className="category-icon-indicator" style={{ backgroundColor: colorClass }}></span>
                                                                {cat}
                                                            </span>
                                                            <span className="budget-value">{formatRupiah(spent)} / <span className="text-muted">{formatRupiah(limit)}</span></span>
                                                        </div>
                                                        <div className="progress-bar-container">
                                                            <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: colorClass }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    <div className="card dashboard-card">
                                        <div className="card-title-container">
                                            <h3>Transaksi Terbaru</h3>
                                            <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedTx(null); setIsTxModalOpen(true); }}><Plus size={14} /> Pengeluaran</button>
                                                <button className="btn btn-primary btn-sm" onClick={() => { setSelectedTx(null); setIsTxModalOpen(true); }}><Plus size={14} /> Pemasukan</button>
                                            </div>
                                        </div>
                                        <div className="table-container">
                                            <table className="recent-table">
                                                <thead>
                                                    <tr>
                                                        <th>Deskripsi</th>
                                                        <th>Kategori</th>
                                                        <th>Tanggal</th>
                                                        <th>Jumlah</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactions.slice(0, 4).map(tx => (
                                                        <tr key={tx.id}>
                                                            <td>
                                                                <div className="category-tag">
                                                                    {getCategoryIcon(tx.category, 14)}
                                                                    <span>{tx.title}</span>
                                                                </div>
                                                            </td>
                                                            <td>{tx.category}</td>
                                                            <td>{formatDate(tx.date)}</td>
                                                            <td className={`amount-text ${tx.type === "pemasukan" ? "text-emerald" : ""}`}>
                                                                {tx.type === "pemasukan" ? `+ ${formatRupiah(tx.amount)}` : `- ${formatRupiah(tx.amount)}`}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {transactions.length === 0 && (
                                                        <tr>
                                                            <td colSpan="4" className="text-center text-muted">Belum ada transaksi.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="col-right">
                                    <div className="card dashboard-card">
                                        <div className="card-title-container">
                                            <h3>Target Celengan (Tabungan)</h3>
                                            <button className="text-btn" onClick={() => setActiveTab("tabungan")}>Lihat Detail</button>
                                        </div>
                                        <div className="quick-savings-list">
                                            {savings.slice(0, 2).map(sv => {
                                                const pct = sv.target > 0 ? Math.round((sv.current / sv.target) * 100) : 0;
                                                return (
                                                    <div className="quick-saving-item" key={sv.id}>
                                                        <div className="saving-meta">
                                                            <div className="saving-title-group">
                                                                <div className="saving-icon-circle"><PiggyBank size={16} /></div>
                                                                <h4>{sv.name}</h4>
                                                            </div>
                                                            <span className="saving-percent">{pct}%</span>
                                                        </div>
                                                        <div className="progress-bar-container">
                                                            <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}></div>
                                                        </div>
                                                        <div className="saving-amount-numbers">
                                                            <span>Terisi: {formatRupiah(sv.current)}</span>
                                                            <span>Target: {formatRupiah(sv.target)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {savings.length === 0 && <p className="text-muted text-center py-4">Belum ada target tabungan.</p>}
                                        </div>
                                    </div>
                                    
                                    <div className="card tip-card">
                                        <div className="tip-glow"></div>
                                        <div className="tip-icon"><Info size={20} /></div>
                                        <div className="tip-content">
                                            <h4>Tips Keuangan Mahasiswa</h4>
                                            <p>"{STUDENT_TIPS[currentTipIndex]}"</p>
                                            <button className="btn-text" onClick={() => setCurrentTipIndex((prev) => (prev + 1) % STUDENT_TIPS.length)}>
                                                Tips Selanjutnya <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                    
                    {/* 2. TRANSAKSI PAGE */}
                    {activeTab === "transaksi" && (
                        <section className="tab-content active">
                            <div className="page-actions-bar">
                                <div className="filters">
                                    <div className="select-wrapper">
                                        <select id="filter-type" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                                            <option value="all">Semua Tipe</option>
                                            <option value="pemasukan">Pemasukan</option>
                                            <option value="pengeluaran">Pengeluaran</option>
                                        </select>
                                    </div>
                                    <div className="select-wrapper">
                                        <select id="filter-category" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}>
                                            <option value="all">Semua Kategori</option>
                                            <option value="Makanan">Makanan & Minuman</option>
                                            <option value="Transportasi">Transportasi</option>
                                            <option value="Pendidikan">Kuliah & Buku</option>
                                            <option value="Kost">Kos & Bulanan</option>
                                            <option value="Hiburan">Hiburan & Sosialisasi</option>
                                            <option value="Lainnya">Lain-lain</option>
                                        </select>
                                    </div>
                                    <input type="date" id="filter-date" className="date-input" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
                                    <button className="btn btn-secondary btn-sm" onClick={() => {
                                        setFilterType("all");
                                        setFilterCategory("all");
                                        setFilterDate("");
                                        setGlobalSearch("");
                                        setCurrentPage(1);
                                    }}><RotateCcw size={14} /> Reset</button>
                                </div>
                                <button className="btn btn-primary" onClick={() => { setSelectedTx(null); setIsTxModalOpen(true); }}><Plus size={16} /> Tambah Transaksi</button>
                            </div>
                            
                            <div className="card">
                                <div className="table-container">
                                    <table className="main-table">
                                        <thead>
                                            <tr>
                                                <th>Nama Transaksi</th>
                                                <th>Tipe</th>
                                                <th>Kategori</th>
                                                <th>Tanggal</th>
                                                <th>Jumlah</th>
                                                <th className="actions-header">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const filtered = transactions.filter(t => {
                                                    const matchesType = filterType === "all" || t.type === filterType;
                                                    const matchesCat = filterCategory === "all" || t.category === filterCategory;
                                                    const matchesDate = !filterDate || t.date === filterDate;
                                                    const matchesSearch = t.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
                                                                          t.category.toLowerCase().includes(globalSearch.toLowerCase());
                                                    return matchesType && matchesCat && matchesDate && matchesSearch;
                                                });

                                                const totalItems = filtered.length;
                                                const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                                                const startIdx = (currentPage - 1) * itemsPerPage;
                                                const pageItems = filtered.slice(startIdx, startIdx + itemsPerPage);

                                                return (
                                                    <>
                                                        {pageItems.map(tx => (
                                                            <tr key={tx.id}>
                                                                <td><strong>{tx.title}</strong></td>
                                                                <td><span className={`badge-type ${tx.type}`}>{tx.type === "pemasukan" ? "Pemasukan" : "Pengeluaran"}</span></td>
                                                                <td>
                                                                    <div className="category-tag">
                                                                        {getCategoryIcon(tx.category, 14)}
                                                                        <span>{tx.category}</span>
                                                                    </div>
                                                                </td>
                                                                <td>{formatDate(tx.date)}</td>
                                                                <td className={`amount-text ${tx.type === "pemasukan" ? "pemasukan" : "pengeluaran"}`}>
                                                                    {tx.type === "pemasukan" ? `+ ${formatRupiah(tx.amount)}` : `- ${formatRupiah(tx.amount)}`}
                                                                </td>
                                                                <td>
                                                                    <div className="actions-cell">
                                                                        <button className="btn-icon-only" onClick={() => openEditTxModal(tx)}><Edit size={14} /></button>
                                                                        <button className="btn-icon-only danger" onClick={() => handleDeleteTransaction(tx.id)}><Trash2 size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {filtered.length === 0 && (
                                                            <tr>
                                                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Tidak ada transaksi yang cocok.</td>
                                                            </tr>
                                                        )}
                                                        {filtered.length > 0 && (
                                                            <tr style={{ border: 'none' }}>
                                                                <td colSpan="6" style={{ padding: 0 }}>
                                                                    <div className="pagination-footer">
                                                                        <div className="pagination-info">Menampilkan {startIdx + 1}-{Math.min(startIdx + itemsPerPage, totalItems)} dari {totalItems} transaksi</div>
                                                                        <div className="pagination-btns">
                                                                            <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</button>
                                                                            <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                    
                    {/* 3. ANGGARAN PAGE */}
                    {activeTab === "anggaran" && (
                        <section className="tab-content active">
                            <div className="alert alert-info">
                                <div className="alert-icon"><Info size={20} /></div>
                                <div className="alert-content">
                                    <h4>Kelola Anggaran Bulanan</h4>
                                    <p>Tentukan batas maksimum pengeluaran untuk setiap kategori agar tidak mengalami krisis keuangan di akhir bulan. Sistem akan memberikan notifikasi jika pemakaian kategori melebihi 80%.</p>
                                </div>
                            </div>
                            
                            <div className="budget-grid">
                                {Object.keys(budgets).map(cat => {
                                    const limit = budgets[cat] || 0;
                                    const spent = transactions
                                        .filter(t => t.type === "pengeluaran" && t.category === cat)
                                        .reduce((sum, t) => sum + t.amount, 0);
                                    const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
                                    const remaining = limit - spent;
                                    
                                    let colorClass = "var(--emerald)";
                                    let pctTextClass = "text-muted";
                                    if (pct >= 100) {
                                        colorClass = "var(--rose)";
                                        pctTextClass = "text-rose font-bold";
                                    } else if (pct >= 80) {
                                        colorClass = "var(--amber)";
                                        pctTextClass = "text-amber font-bold";
                                    }

                                    return (
                                        <div className="card budget-card" key={cat}>
                                            <div className="budget-card-header">
                                                <div className="category-info">
                                                    <div className={`category-icon ${getCategoryCssClass(cat)}`}>
                                                        {getCategoryIcon(cat, 18)}
                                                    </div>
                                                    <div className="category-details">
                                                        <h4>{cat}</h4>
                                                        <span>Batas: {formatRupiah(limit)}</span>
                                                    </div>
                                                </div>
                                                <button className="btn-icon-only" onClick={() => openEditBudgetModal(cat)}><Settings size={14} /></button>
                                            </div>
                                            
                                            <div className="budget-numeric-group">
                                                <div className="budget-numeric-display">
                                                    <span className="budget-numeric">{formatRupiah(spent)}</span>
                                                    <span className={`budget-percentage-text ${pctTextClass}`}>{pct}% Terpakai</span>
                                                </div>
                                                <div className="progress-bar-container" style={{ marginTop: '8px' }}>
                                                    <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: colorClass }}></div>
                                                </div>
                                            </div>
                                            
                                            <div className="budget-card-footer">
                                                <span>Sisa Anggaran:</span>
                                                <strong style={{ color: remaining < 0 ? 'var(--rose)' : 'inherit' }}>
                                                    {remaining < 0 ? '-' : ''}{formatRupiah(Math.abs(remaining))}
                                                </strong>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                    
                    {/* 4. LAPORAN PAGE */}
                    {activeTab === "laporan" && (
                        <section className="tab-content active">
                            <div className="reports-grid">
                                <div className="card report-card span-2">
                                    <div className="card-header-chart">
                                        <h3>Tren Keuangan Bulanan</h3>
                                        <div className="chart-legend-custom">
                                            <span className="legend-item"><span className="dot-in bg-emerald"></span> Pemasukan</span>
                                            <span className="legend-item"><span className="dot-in bg-rose"></span> Pengeluaran</span>
                                        </div>
                                    </div>
                                    <div className="chart-wrapper">
                                        <Line 
                                            data={{
                                                labels: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"],
                                                datasets: [
                                                    {
                                                        label: 'Pemasukan',
                                                        data: (() => {
                                                            const w = [0,0,0,0];
                                                            transactions.filter(t => t.type === "pemasukan").forEach(t => {
                                                                const day = new Date(t.date).getDate();
                                                                const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
                                                                w[idx] += t.amount;
                                                            });
                                                            return w;
                                                        })(),
                                                        borderColor: '#10b981',
                                                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                                        borderWidth: 3,
                                                        tension: 0.3,
                                                        fill: true
                                                    },
                                                    {
                                                        label: 'Pengeluaran',
                                                        data: (() => {
                                                            const w = [0,0,0,0];
                                                            transactions.filter(t => t.type === "pengeluaran").forEach(t => {
                                                                const day = new Date(t.date).getDate();
                                                                const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
                                                                w[idx] += t.amount;
                                                            });
                                                            return w;
                                                        })(),
                                                        borderColor: '#f43f5e',
                                                        backgroundColor: 'rgba(244, 63, 94, 0.05)',
                                                        borderWidth: 3,
                                                        tension: 0.3,
                                                        fill: true
                                                    }
                                                ]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: { grid: { color: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" } },
                                                    x: { grid: { display: false } }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="card report-card">
                                    <h3>Distribusi Pengeluaran Kategori</h3>
                                    <div className="chart-wrapper doughnut-wrapper">
                                        <Doughnut 
                                            data={{
                                                labels: Object.keys(budgets),
                                                datasets: [{
                                                    data: Object.keys(budgets).map(cat => {
                                                        return transactions
                                                            .filter(t => t.type === "pengeluaran" && t.category === cat)
                                                            .reduce((sum, t) => sum + t.amount, 0);
                                                    }),
                                                    backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#0ea5e9', '#ec4899', '#94a3b8'],
                                                    borderColor: theme === "dark" ? '#12141c' : '#ffffff',
                                                    borderWidth: 2
                                                }]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { position: 'bottom' } }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="card report-insight-card">
                                <div className="insight-header">
                                    <TrendingUp className="text-emerald" size={24} />
                                    <h3>Rekomendasi & Analisis Kesehatan Keuangan</h3>
                                </div>
                                <div className="insight-content">
                                    <div className="insight-row">
                                        <div className="insight-badge good">Sangat Sehat</div>
                                        <div className="insight-text">
                                            <h4>Rasio Pemasukan vs Pengeluaran</h4>
                                            <p>
                                                Pemasukan Anda bulan ini {financials.totalIncome > financials.totalExpense ? 'lebih besar' : 'lebih kecil'} daripada pengeluaran. 
                                                Selisih dana Anda sebesar <strong>{formatRupiah(Math.max(0, financials.totalIncome - financials.totalExpense))}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="insight-row">
                                        <div className="insight-badge warning">Perlu Diperhatikan</div>
                                        <div className="insight-text">
                                            <h4>Kategori Pengeluaran Terbesar</h4>
                                            <p>
                                                Pastikan limit anggaran bulanan untuk pengeluaran sekunder (seperti hiburan dan jajan di cafe) diatur seminimal mungkin untuk menabung dana darurat.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                    
                    {/* 5. TABUNGAN PAGE */}
                    {activeTab === "tabungan" && (
                        <section className="tab-content active">
                            <div className="page-actions-bar">
                                <div className="info-text">
                                    <h3>Raih Mimpimu dengan Celengan Digital</h3>
                                    <p>Kumpulkan uang secara bertahap untuk kebutuhan masa depan seperti laptop, sertifikasi, atau liburan semester.</p>
                                </div>
                                <button className="btn btn-primary" onClick={() => setIsSavingModalOpen(true)}><Plus size={16} /> Tambah Target Baru</button>
                            </div>
                            
                            <div className="savings-grid">
                                {savings.map(sv => {
                                    const pct = sv.target > 0 ? Math.min(Math.round((sv.current / sv.target) * 100), 100) : 0;
                                    const isCompleted = sv.current >= sv.target;
                                    return (
                                        <div className={`card saving-card ${isCompleted ? 'completed' : ''}`} key={sv.id}>
                                            {isCompleted && <div className="completed-badge-ribbon">TERCAPAI</div>}
                                            <div className="saving-card-header">
                                                <div className="category-info">
                                                    <div className="saving-icon-bg">
                                                        <PiggyBank size={18} />
                                                    </div>
                                                    <div className="saving-card-details">
                                                        <h4>{sv.name}</h4>
                                                        <span>Target: {formatDate(sv.deadline)}</span>
                                                    </div>
                                                </div>
                                                <button className="btn-icon-only danger" onClick={() => handleDeleteSavingGoal(sv.id)}><Trash2 size={14} /></button>
                                            </div>
                                            
                                            <div>
                                                <div className="saving-numeric-display">
                                                    <span>{formatRupiah(sv.current)}</span>
                                                    <span className="saving-goal-num">/ {formatRupiah(sv.target)}</span>
                                                </div>
                                                <div className="progress-bar-container" style={{ marginTop: '12px' }}>
                                                    <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: isCompleted ? 'var(--emerald)' : 'var(--accent)' }}></div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                                    <span>Terkumpul: {pct}%</span>
                                                    <span>Sisa: {formatRupiah(Math.max(0, sv.target - sv.current))}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="saving-card-footer-btns">
                                                <button className="btn btn-secondary btn-sm" disabled={sv.current === 0} onClick={() => openSavingActionModal(sv, "tarik")}>Tarik</button>
                                                <button className="btn btn-primary btn-sm" disabled={isCompleted} onClick={() => openSavingActionModal(sv, "setor")}>Setor</button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {savings.length === 0 && (
                                    <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                                        <p className="text-muted">Belum ada target tabungan. Ayo buat celengan pertamamu!</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                    
                    {/* 6. NOTIFIKASI PAGE */}
                    {activeTab === "notifikasi" && (
                        <section className="tab-content active">
                            <div className="page-actions-bar">
                                <div className="info-text">
                                    <h3>Pusat Aktivitas & Pemberitahuan</h3>
                                    <p>Dapatkan pembaruan langsung tentang keuangan, target tabungan, dan peringatan batas pengeluaran Anda.</p>
                                </div>
                                <div className="actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={handleMarkAllNotificationsRead}><CheckCheck size={14} /> Tandai Semua Dibaca</button>
                                    <button className="btn btn-outline-danger btn-sm" onClick={handleClearNotifications}><Trash2 size={14} /> Hapus Semua</button>
                                </div>
                            </div>
                            
                            <div className="card noti-list-card">
                                <div className="notifications-list">
                                    {notifications.map(n => {
                                        let statusClass = "info";
                                        let notiIcon = <Info size={16} />;
                                        if (n.type === "success") { statusClass = "success"; notiIcon = <CheckCircle2 size={16} />; }
                                        else if (n.type === "warning") { statusClass = "warning"; notiIcon = <AlertTriangle size={16} />; }
                                        else if (n.type === "danger") { statusClass = "danger"; notiIcon = <AlertOctagon size={16} />; }

                                        return (
                                            <div className={`notification-item ${n.read ? '' : 'unread'}`} key={n.id}>
                                                <div className={`noti-icon-box ${statusClass}`}>
                                                    {notiIcon}
                                                </div>
                                                <div className="noti-item-content">
                                                    <div className="noti-item-header">
                                                        <h4>{n.title}</h4>
                                                        <span className="noti-time">{n.time}</span>
                                                    </div>
                                                    <p>{n.message}</p>
                                                </div>
                                                {!n.read && (
                                                    <div 
                                                        className="unread-dot" 
                                                        onClick={() => handleMarkNotificationRead(n.id)} 
                                                        title="Tandai sudah dibaca"
                                                        style={{ cursor: 'pointer' }}
                                                    ></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {notifications.length === 0 && (
                                        <div className="empty-state">
                                            <Inbox size={48} />
                                            <p>Tidak ada pemberitahuan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                    
                </div>
            </main>
            
            {/* ==================== MODALS ==================== */}
            
            {/* 1. MODAL TAMBAH/EDIT TRANSAKSI */}
            {isTxModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{selectedTx ? "Ubah Catatan Transaksi" : "Tambah Transaksi Baru"}</h3>
                            <button className="modal-close" onClick={() => setIsTxModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleTransactionSubmit}>
                            <div className="form-group">
                                <label>Tipe Transaksi</label>
                                <div className="transaction-type-selector">
                                    <select name="type" defaultValue={selectedTx ? selectedTx.type : "pengeluaran"} required>
                                        <option value="pengeluaran">Pengeluaran</option>
                                        <option value="pemasukan">Pemasukan</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Deskripsi Transaksi</label>
                                <input type="text" name="title" defaultValue={selectedTx ? selectedTx.title : ""} placeholder="Contoh: Beli Buku Aljabar Linier" required />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Jumlah (Rp)</label>
                                    <input type="number" name="amount" defaultValue={selectedTx ? selectedTx.amount : ""} placeholder="0" min="1" required />
                                </div>
                                <div className="form-group">
                                    <label>Kategori</label>
                                    <select name="category" defaultValue={selectedTx ? selectedTx.category : "Makanan"} required>
                                        <option value="Makanan">Makanan & Minuman</option>
                                        <option value="Transportasi">Transportasi</option>
                                        <option value="Pendidikan">Kuliah & Buku</option>
                                        <option value="Kost">Kos & Bulanan</option>
                                        <option value="Hiburan">Hiburan & Sosialisasi</option>
                                        <option value="Lainnya">Lain-lain</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Tanggal</label>
                                <input type="date" name="date" defaultValue={selectedTx ? selectedTx.date : new Date().toISOString().split('T')[0]} required />
                            </div>
                            
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsTxModalOpen(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary">Simpan Transaksi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* 2. MODAL EDIT ANGGARAN */}
            {isBudgetModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Atur Anggaran Kategori</h3>
                            <button className="modal-close" onClick={() => setIsBudgetModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleBudgetSubmit}>
                            <div className="form-group">
                                <label>Kategori</label>
                                <div className="category-display">{selectedCategory}</div>
                            </div>
                            <div className="form-group">
                                <label>Batas Anggaran Bulanan (Rp)</label>
                                <input 
                                    type="number" 
                                    value={budgetLimitInput} 
                                    onChange={(e) => setBudgetLimitInput(e.target.value)} 
                                    placeholder="0" 
                                    min="0" 
                                    required 
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsBudgetModalOpen(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary">Simpan Batas</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* 3. MODAL TAMBAH TARGET TABUNGAN */}
            {isSavingModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Tambah Target Celengan Baru</h3>
                            <button className="modal-close" onClick={() => setIsSavingModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateSavingGoal}>
                            <div className="form-group">
                                <label>Nama Target Tabungan</label>
                                <input type="text" name="name" placeholder="Contoh: Beli Laptop Asus ROG" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Target Uang (Rp)</label>
                                    <input type="number" name="target" placeholder="0" min="1000" required />
                                </div>
                                <div className="form-group">
                                    <label>Target Tanggal Tercapai</label>
                                    <input type="date" name="deadline" defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Saldo Awal Celengan (Rp - Opsional)</label>
                                <input type="number" name="current" placeholder="0" min="0" defaultValue="0" />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsSavingModalOpen(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary">Buat Target</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* 4. MODAL SETOR/TARIK TABUNGAN */}
            {isSavingActionModalOpen && selectedSaving && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{savingActionMode === "setor" ? "Setor ke Celengan" : "Tarik dari Celengan"}</h3>
                            <button className="modal-close" onClick={() => setIsSavingActionModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSavingGoalActionSubmit}>
                            <div className="saving-info-display card mb-4">
                                <div className="saving-name-label">{selectedSaving.name}</div>
                                <div className="saving-progress-text">
                                    Terisi: {formatRupiah(selectedSaving.current)} / {formatRupiah(selectedSaving.target)} ({Math.round((selectedSaving.current/selectedSaving.target)*100)}%)
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Jumlah Uang (Rp)</label>
                                <input 
                                    type="number" 
                                    value={savingAmountInput} 
                                    onChange={(e) => setSavingAmountInput(e.target.value)} 
                                    placeholder="0" 
                                    min="1" 
                                    required 
                                />
                                <span className="helper-text">
                                    {savingActionMode === "setor" 
                                        ? "Uang akan dialihkan dari Saldo Utama Anda ke Celengan." 
                                        : "Uang akan dikembalikan dari Celengan ke Saldo Utama Anda."}
                                </span>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsSavingActionModalOpen(false)}>Batal</button>
                                <button 
                                    type="submit" 
                                    className={`btn ${savingActionMode === "setor" ? "btn-primary" : "btn-outline-danger"}`}
                                >
                                    {savingActionMode === "setor" ? "Setor Uang" : "Tarik Uang"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
        </div>
    );
}