import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { initDb, getDb } from './db.js';

// Hashing password menggunakan SHA-256 + salt (node:crypto built-in, tanpa dependency baru)
function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false; // format lama (plain text) — tolak
    const attempt = createHash('sha256').update(salt + password).digest('hex');
    // timingSafeEqual mencegah timing attack
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve public/ di root ('/images/logo.svg') — sama dengan Vite dev server
app.use(express.static(path.join(__dirname, 'public')));
// Serve HTML/JS/CSS frontend (index.html, app.js, style.css)
app.use(express.static(__dirname));

// Initialize Database on Startup
initDb().catch(err => {
    console.error("Database initialization failed:", err);
});

// Middleware to extract user ID from headers (for prototype authentication)
const authenticateUser = (req, res, next) => {
    const userIdHeader = req.headers['x-user-id'];
    
    // Auth endpoints don't require this header
    if (req.path.startsWith('/api/auth')) {
        return next();
    }

    if (!userIdHeader) {
        return res.status(401).json({ error: "Unauthorized: Missing x-user-id header" });
    }

    req.userId = parseInt(userIdHeader, 10);
    next();
};

app.use(authenticateUser);

// ==========================================
// 1. AUTHENTICATION ROUTING
// ==========================================

// Register Account
app.post('/api/auth/register', async (req, res) => {
    const { fullname, username, univ, password, avatar } = req.body;
    
    if (!fullname || !username || !univ || !password || !avatar) {
        return res.status(400).json({ error: "Missing required registration parameters." });
    }

    try {
        const db = await getDb();
        
        // Check if username already exists
        const existingUser = await db.get("SELECT * FROM users WHERE username = ?", [username.toLowerCase()]);
        if (existingUser) {
            return res.status(400).json({ error: "Username sudah terdaftar! Gunakan username lain." });
        }

        // Insert new user — password di-hash sebelum disimpan
        const hashedPwd = hashPassword(password);
        const result = await db.run(
            "INSERT INTO users (fullname, username, univ, password, avatar) VALUES (?, ?, ?, ?, ?)",
            [fullname, username.toLowerCase(), univ, hashedPwd, avatar]
        );
        const userId = result.lastID;

        // --- Auto seed default data for the new user ---
        
        // Seed default transactions
        const defaultTx = [
            { id: `tx-${Date.now()}-1`, title: "Uang Saku Bulanan", type: "pemasukan", category: "Lainnya", amount: 1500000, date: new Date().toISOString().split('T')[0] },
            { id: `tx-${Date.now()}-2`, title: "Makan Siang Pertama", type: "pengeluaran", category: "Makanan", amount: 25000, date: new Date().toISOString().split('T')[0] }
        ];
        for (const tx of defaultTx) {
            await db.run(
                "INSERT INTO transactions (id, user_id, title, type, category, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [tx.id, userId, tx.title, tx.type, tx.category, tx.amount, tx.date]
            );
        }

        // Seed default budgets
        const defaultBudgets = {
            "Makanan": 600000,
            "Transportasi": 200000,
            "Pendidikan": 300000,
            "Kost": 800000,
            "Hiburan": 250000,
            "Lainnya": 400000
        };
        for (const [cat, limit] of Object.entries(defaultBudgets)) {
            await db.run(
                "INSERT INTO budgets (user_id, category, limit_amount) VALUES (?, ?, ?)",
                [userId, cat, limit]
            );
        }

        // Seed default savings
        await db.run(
            "INSERT INTO savings (id, user_id, name, target, current, deadline) VALUES (?, ?, ?, ?, ?, ?)",
            [`sv-${Date.now()}`, userId, "Tabungan Laptop Baru", 6000000, 1000000, new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
        );

        // Seed default notification
        await db.run(
            "INSERT INTO notifications (id, user_id, title, message, type, read, time) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [`nt-${Date.now()}`, userId, "Akun Berhasil Dibuat", "Selamat datang di MajuKeuangan! Kami telah menyiapkan anggaran default untuk membantu Anda.", "success", 0, "Baru saja"]
        );

        const newUser = { id: userId, fullname, username: username.toLowerCase(), univ, avatar };
        res.status(201).json(newUser);

    } catch (err) {
        console.error("Registration failed:", err);
        res.status(500).json({ error: "Internal server registration error" });
    }
});

// Login Account
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required." });
    }

    try {
        const db = await getDb();
        const user = await db.get("SELECT * FROM users WHERE username = ?", [username.toLowerCase()]);
        
        if (!user) {
            return res.status(404).json({ error: "Username tidak ditemukan." });
        }

        // Verifikasi password dengan hash; tolak jika format lama (plain text)
        if (!verifyPassword(password, user.password)) {
            return res.status(401).json({ error: "Password salah!" });
        }

        // Return user without password
        const userResponse = {
            id: user.id,
            fullname: user.fullname,
            username: user.username,
            univ: user.univ,
            avatar: user.avatar
        };

        res.json(userResponse);

    } catch (err) {
        console.error("Login failed:", err);
        res.status(500).json({ error: "Internal server login error" });
    }
});

// ==========================================
// 2. TRANSACTIONS API ROUTING
// ==========================================

// Get User's Transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC", 
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Transaction
app.post('/api/transactions', async (req, res) => {
    const { title, type, category, date } = req.body;
    const amount = parseInt(req.body.amount, 10);
    const txId = `tx-${Date.now()}`;

    if (!title || !type || !category || !date) {
        return res.status(400).json({ error: "All transaction parameters required." });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Jumlah transaksi harus berupa angka positif." });
    }

    try {
        const db = await getDb();
        await db.run(
            "INSERT INTO transactions (id, user_id, title, type, category, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [txId, req.userId, title, type, category, amount, date]
        );
        
        const newTx = { id: txId, user_id: req.userId, title, type, category, amount, date };
        res.status(201).json(newTx);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Transaction
app.put('/api/transactions/:id', async (req, res) => {
    const { title, type, category, amount, date } = req.body;
    const { id } = req.params;

    try {
        const db = await getDb();
        const tx = await db.get("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [id, req.userId]);
        if (!tx) {
            return res.status(404).json({ error: "Transaction not found." });
        }

        await db.run(
            "UPDATE transactions SET title = ?, type = ?, category = ?, amount = ?, date = ? WHERE id = ? AND user_id = ?",
            [title, type, category, amount, date, id, req.userId]
        );
        
        res.json({ id, title, type, category, amount, date });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Transaction
app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        const tx = await db.get("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [id, req.userId]);
        if (!tx) {
            return res.status(404).json({ error: "Transaction not found." });
        }

        await db.run("DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, req.userId]);
        res.json({ success: true, message: "Transaction deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. BUDGETS API ROUTING
// ==========================================

// Get User's Budgets
app.get('/api/budgets', async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all("SELECT * FROM budgets WHERE user_id = ?", [req.userId]);
        
        // Transform list into key-value category map
        const budgetMap = {};
        rows.forEach(r => {
            budgetMap[r.category] = r.limit_amount;
        });
        res.json(budgetMap);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set Category Budget Limit
app.put('/api/budgets', async (req, res) => {
    const { category, limit } = req.body;

    if (!category || limit === undefined) {
        return res.status(400).json({ error: "Category and limit required." });
    }

    try {
        const db = await getDb();
        // Insert or Replace syntax for SQLite
        await db.run(
            "INSERT OR REPLACE INTO budgets (user_id, category, limit_amount) VALUES (?, ?, ?)",
            [req.userId, category, limit]
        );
        res.json({ category, limit });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. SAVINGS GOALS API ROUTING
// ==========================================

// Get User's Savings goals
app.get('/api/savings', async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all("SELECT * FROM savings WHERE user_id = ?", [req.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new Saving Goal
app.post('/api/savings', async (req, res) => {
    const { name, target, current, deadline } = req.body;
    const svId = `sv-${Date.now()}`;

    if (!name || !target || !deadline) {
        return res.status(400).json({ error: "Name, target, and deadline required." });
    }

    try {
        const db = await getDb();
        await db.run(
            "INSERT INTO savings (id, user_id, name, target, current, deadline) VALUES (?, ?, ?, ?, ?, ?)",
            [svId, req.userId, name, target, current || 0, deadline]
        );
        res.status(201).json({ id: svId, user_id: req.userId, name, target, current: current || 0, deadline });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Setor / Tarik Savings goal action (integrates directly with Main Balance)
app.post('/api/savings/:id/action', async (req, res) => {
    const { id } = req.params;
    const { mode } = req.body;
    const amount = parseInt(req.body.amount, 10);

    if (!mode) {
        return res.status(400).json({ error: "Mode (setor/tarik) and amount required." });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Jumlah harus berupa angka positif." });
    }

    try {
        const db = await getDb();
        const goal = await db.get("SELECT * FROM savings WHERE id = ? AND user_id = ?", [id, req.userId]);
        if (!goal) {
            return res.status(404).json({ error: "Target celengan tidak ditemukan." });
        }

        let newCurrent = goal.current;
        let txTitle = "";
        let txType = "";

        if (mode === "setor") {
            newCurrent += amount;
            txTitle = `Setor Celengan: ${goal.name}`;
            txType = "pengeluaran";
        } else {
            newCurrent -= amount;
            txTitle = `Tarik Celengan: ${goal.name}`;
            txType = "pemasukan";
        }

        // Update target current balance
        await db.run("UPDATE savings SET current = ? WHERE id = ? AND user_id = ?", [newCurrent, id, req.userId]);

        // Add corresponding wallet transaction
        const txId = `tx-${Date.now()}`;
        const todayStr = new Date().toISOString().split('T')[0];
        await db.run(
            "INSERT INTO transactions (id, user_id, title, type, category, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [txId, req.userId, txTitle, txType, "Lainnya", amount, todayStr]
        );

        // Check if target completed to trigger a notification
        if (mode === "setor" && newCurrent >= goal.target) {
            const ntId = `nt-${Date.now()}`;
            await db.run(
                "INSERT INTO notifications (id, user_id, title, message, type, read, time) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [ntId, req.userId, "Celengan Sukses Terkumpul!", `Selamat! Target Tabungan "${goal.name}" Anda telah tercapai 100%.`, "success", 0, "Baru saja"]
            );
        }

        res.json({ id, current: newCurrent, transaction: { id: txId, title: txTitle, type: txType, amount, date: todayStr } });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Savings Goal
app.delete('/api/savings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        const goal = await db.get("SELECT * FROM savings WHERE id = ? AND user_id = ?", [id, req.userId]);
        if (!goal) {
            return res.status(404).json({ error: "Goal not found." });
        }
        await db.run("DELETE FROM savings WHERE id = ? AND user_id = ?", [id, req.userId]);
        res.json({ success: true, message: "Goal deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. NOTIFICATIONS API ROUTING
// ==========================================

// Get User's Notifications
app.get('/api/notifications', async (req, res) => {
    try {
        const db = await getDb();
        const rows = await db.all(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC",
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add notification
app.post('/api/notifications', async (req, res) => {
    const { title, message, type } = req.body;
    const ntId = `nt-${Date.now()}`;

    try {
        const db = await getDb();
        await db.run(
            "INSERT INTO notifications (id, user_id, title, message, type, read, time) VALUES (?, ?, ?, ?, ?, 0, ?)",
            [ntId, req.userId, title, message, type || "info", "Baru saja"]
        );
        res.status(201).json({ id: ntId, title, message, type: type || "info", read: 0, time: "Baru saja" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        await db.run(
            "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all notifications as read
app.post('/api/notifications/read-all', async (req, res) => {
    try {
        const db = await getDb();
        await db.run(
            "UPDATE notifications SET read = 1 WHERE user_id = ?",
            [req.userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all notifications
app.post('/api/notifications/clear', async (req, res) => {
    try {
        const db = await getDb();
        await db.run("DELETE FROM notifications WHERE user_id = ?", [req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
