// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================

const SUPABASE_URL = 'https://vqeplhwacgpcofuivnru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZXBsaHdhY2dwY29mdWl2bnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQyNzAsImV4cCI6MjA5Nzk2MDI3MH0.Hg7xLX30U8Odx50bebdEfGyNWX_zdbGKKwP9nrGnkeM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// AUTH FUNCTIONS
// ==========================================

async function sbRegister(username, password, fullname, univ, avatar) {
    const email = `${username.toLowerCase()}@mk.majukeuangan`;

    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
        if (error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already been registered')) {
            throw new Error('Username sudah terdaftar! Pilih username lain.');
        }
        throw new Error(error.message);
    }

    const userId = data.user.id;

    const { error: profileErr } = await sb.from('profiles').insert({
        id: userId,
        username: username.toLowerCase(),
        fullname,
        univ,
        avatar
    });
    if (profileErr) throw new Error(profileErr.message);

    await sbSeedDefaultData(userId);

    return { id: userId, username: username.toLowerCase(), fullname, univ, avatar };
}

async function sbLogin(username, password) {
    const email = `${username.toLowerCase()}@mk.majukeuangan`;

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
        throw new Error('Username atau password salah!');
    }

    const userId = data.user.id;
    const { data: profile, error: profileErr } = await sb.from('profiles')
        .select('*').eq('id', userId).single();
    if (profileErr) throw new Error('Gagal memuat profil pengguna.');

    return { id: userId, ...profile };
}

async function sbLogout() {
    const { error } = await sb.auth.signOut();
    if (error) console.warn('Logout error:', error.message);
}

async function sbGetCurrentSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;

    const userId = session.user.id;
    const { data: profile } = await sb.from('profiles')
        .select('*').eq('id', userId).single();
    if (!profile) return null;

    return { id: userId, ...profile };
}

// ==========================================
// DATA LOADING
// ==========================================

async function sbLoadAllData(userId) {
    const [txRes, budRes, svRes, ntRes] = await Promise.all([
        sb.from('transactions').select('*').eq('user_id', userId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        sb.from('budgets').select('*').eq('user_id', userId),
        sb.from('savings').select('*').eq('user_id', userId),
        sb.from('notifications').select('*').eq('user_id', userId)
            .order('created_at', { ascending: false })
    ]);

    // Lempar error jika ada kegagalan query kritis
    if (txRes.error)  throw new Error('Gagal memuat transaksi: ' + txRes.error.message);
    if (budRes.error) throw new Error('Gagal memuat anggaran: '  + budRes.error.message);
    if (svRes.error)  throw new Error('Gagal memuat tabungan: '  + svRes.error.message);
    // Notifikasi tidak kritis — lanjut meski error
    if (ntRes.error) console.warn('Gagal memuat notifikasi:', ntRes.error.message);

    const budgetMap = {};
    (budRes.data || []).forEach(b => { budgetMap[b.category] = b.limit_amount; });

    return {
        transactions: (txRes.data || []).map(t => ({
            id: t.id, title: t.title, type: t.type,
            category: t.category, amount: Number(t.amount), date: t.date
        })),
        budgets: budgetMap,
        savings: (svRes.data || []).map(s => ({
            id: s.id, name: s.name, target: Number(s.target),
            current: Number(s.current), deadline: s.deadline
        })),
        notifications: (ntRes.data || []).map(n => ({
            id: n.id, title: n.title, message: n.message,
            type: n.type, read: Boolean(n.read), time: n.time
        }))
    };
}

// ==========================================
// SYNC FUNCTIONS (fire-and-forget)
// Called after state changes — Supabase syncs in background
// ==========================================

function sbSyncTransaction(userId, tx) {
    sb.from('transactions').upsert({
        id: tx.id, user_id: userId, title: tx.title, type: tx.type,
        category: tx.category, amount: tx.amount, date: tx.date
    }).then(({ error }) => { if (error) console.warn('Sync tx:', error.message); });
}

function sbDeleteTransaction(txId, userId) {
    sb.from('transactions').delete().eq('id', txId).eq('user_id', userId)
        .then(({ error }) => { if (error) console.warn('Delete tx:', error.message); });
}

function sbSyncBudget(userId, category, limit) {
    sb.from('budgets').upsert({ user_id: userId, category, limit_amount: limit })
        .then(({ error }) => { if (error) console.warn('Sync budget:', error.message); });
}

function sbDeleteBudget(userId, category) {
    sb.from('budgets').delete().eq('user_id', userId).eq('category', category)
        .then(({ error }) => { if (error) console.warn('Delete budget:', error.message); });
}

function sbSyncSaving(userId, sv) {
    sb.from('savings').upsert({
        id: sv.id, user_id: userId, name: sv.name,
        target: sv.target, current: sv.current, deadline: sv.deadline
    }).then(({ error }) => { if (error) console.warn('Sync saving:', error.message); });
}

function sbDeleteSaving(svId, userId) {
    sb.from('savings').delete().eq('id', svId).eq('user_id', userId)
        .then(({ error }) => { if (error) console.warn('Delete saving:', error.message); });
}

function sbAddNotification(userId, noti) {
    sb.from('notifications').insert({
        id: noti.id, user_id: userId, title: noti.title,
        message: noti.message, type: noti.type, read: noti.read, time: noti.time
    }).then(({ error }) => { if (error) console.warn('Add notif:', error.message); });
}

function sbMarkNotifRead(notiId, userId) {
    sb.from('notifications').update({ read: true })
        .eq('id', notiId).eq('user_id', userId)
        .then(({ error }) => { if (error) console.warn('Mark read:', error.message); });
}

function sbMarkAllNotifsRead(userId) {
    sb.from('notifications').update({ read: true }).eq('user_id', userId)
        .then(({ error }) => { if (error) console.warn('Mark all read:', error.message); });
}

function sbClearAllNotifs(userId) {
    sb.from('notifications').delete().eq('user_id', userId)
        .then(({ error }) => { if (error) console.warn('Clear notifs:', error.message); });
}

// ==========================================
// DEFAULT DATA SEEDING (new user registration)
// ==========================================

async function sbSeedDefaultData(userId) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    // Tanggal awal bulan berjalan (untuk transaksi pemasukan awal)
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const deadline1 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deadline2 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const t = Date.now();

    // Transaksi default agar dashboard tidak kosong saat pertama login
    const transactions = [
        {
            id: `tx-${t}-1`, user_id: userId,
            title: 'Uang Saku Bulanan', type: 'pemasukan',
            category: 'Lainnya', amount: 1500000, date: firstOfMonth
        },
        {
            id: `tx-${t}-2`, user_id: userId,
            title: 'Makan Siang Pertama', type: 'pengeluaran',
            category: 'Makanan', amount: 25000, date: today
        }
    ];

    // Anggaran default per kategori
    const budgets = [
        { user_id: userId, category: 'Makanan',      limit_amount: 500000  },
        { user_id: userId, category: 'Transportasi', limit_amount: 200000  },
        { user_id: userId, category: 'Pendidikan',   limit_amount: 300000  },
        { user_id: userId, category: 'Kost',         limit_amount: 800000  },
        { user_id: userId, category: 'Hiburan',      limit_amount: 250000  },
        { user_id: userId, category: 'Lainnya',      limit_amount: 400000  }
    ];

    // Target tabungan contoh
    const savings = [
        {
            id: `sv-${t}`, user_id: userId,
            name: 'Tabungan Laptop Baru', target: 6000000,
            current: 0, deadline: deadline1
        },
        {
            id: `sv-${t}-2`, user_id: userId,
            name: 'Dana Darurat', target: 1000000,
            current: 0, deadline: deadline2
        }
    ];

    const notifications = [
        {
            id: `nt-${t}`, user_id: userId,
            title: 'Selamat Datang di MajuKeuangan!',
            message: 'Akun Anda berhasil dibuat. Anggaran dan celengan default telah disiapkan. Mulai catat transaksi harian Anda!',
            type: 'success', read: false, time: 'Baru saja'
        }
    ];

    // Insert semua tabel sekaligus; tangkap error tiap tabel agar tidak membatalkan yang lain
    const results = await Promise.allSettled([
        sb.from('transactions').insert(transactions),
        sb.from('budgets').insert(budgets),
        sb.from('savings').insert(savings),
        sb.from('notifications').insert(notifications)
    ]);

    results.forEach((r, i) => {
        const names = ['transactions','budgets','savings','notifications'];
        if (r.status === 'rejected' || r.value?.error) {
            console.warn(`Seed ${names[i]} error:`, r.reason || r.value.error.message);
        }
    });
}
