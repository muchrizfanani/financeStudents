import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'database.db');

let dbInstance = null;

// Singleton: satu koneksi dipakai ulang, bukan dibuka baru tiap panggilan
export async function getDb() {
    if (!dbInstance) {
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        await dbInstance.run('PRAGMA foreign_keys = ON');
    }
    return dbInstance;
}

// Initialize tables and seed initial data
export async function initDb() {
    const db = await getDb();

    // Create tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            univ TEXT NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            amount INTEGER NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS budgets (
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            limit_amount INTEGER NOT NULL,
            PRIMARY KEY (user_id, category),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS savings (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            target INTEGER NOT NULL,
            current INTEGER NOT NULL,
            deadline TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            read INTEGER DEFAULT 0,
            time TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
    `);

    // Check if the default developer user exists
    const devUser = await db.get("SELECT * FROM users WHERE username = ?", ["rizky"]);

    if (!devUser) {
        // Insert test user
        const result = await db.run(
            "INSERT INTO users (fullname, username, univ, password, avatar) VALUES (?, ?, ?, ?, ?)",
            [
                "Rizky Fanani",
                "rizky",
                "Universitas Brawijaya",
                "password",
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120"
            ]
        );
        const userId = result.lastID;

        // Seed default transactions for dev user
        const transactions = [
            { id: "tx-1", title: "Uang Saku Bulanan", type: "pemasukan", category: "Lainnya", amount: 1800000, date: "2026-06-01" },
            { id: "tx-2", title: "Gaji Freelance Penerjemah", type: "pemasukan", category: "Lainnya", amount: 750000, date: "2026-06-05" },
            { id: "tx-3", title: "Bayar Kost Bulan Juni", type: "pengeluaran", category: "Kost", amount: 750000, date: "2026-06-02" },
            { id: "tx-4", title: "Buku Paket Aljabar Linier", type: "pengeluaran", category: "Pendidikan", amount: 165000, date: "2026-06-03" },
            { id: "tx-5", title: "Beli Token Listrik Kost", type: "pengeluaran", category: "Kost", amount: 100000, date: "2026-06-04" },
            { id: "tx-6", title: "Makan Siang Warteg (Seminggu)", type: "pengeluaran", category: "Makanan", amount: 150000, date: "2026-06-07" },
            { id: "tx-7", title: "Isi Bensin Motor", type: "pengeluaran", category: "Transportasi", amount: 50000, date: "2026-06-08" },
            { id: "tx-8", title: "Nonton Film & Kopi Senja", type: "pengeluaran", category: "Hiburan", amount: 90000, date: "2026-06-09" }
        ];

        for (const tx of transactions) {
            await db.run(
                "INSERT INTO transactions (id, user_id, title, type, category, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [tx.id, userId, tx.title, tx.type, tx.category, tx.amount, tx.date]
            );
        }

        // Seed default budgets for dev user
        const budgets = {
            "Makanan": 500000,
            "Transportasi": 200000,
            "Pendidikan": 300000,
            "Kost": 900000,
            "Hiburan": 250000,
            "Lainnya": 400000
        };

        for (const [cat, limit] of Object.entries(budgets)) {
            await db.run(
                "INSERT INTO budgets (user_id, category, limit_amount) VALUES (?, ?, ?)",
                [userId, cat, limit]
            );
        }

        // Seed default savings for dev user
        const savings = [
            { id: "sv-1", name: "Laptop Baru untuk Tugas Akhir", target: 8000000, current: 3200000, deadline: "2026-12-15" },
            { id: "sv-2", name: "Dana Darurat Semester Genap", target: 1500000, current: 900000, deadline: "2026-09-30" },
            { id: "sv-3", name: "Sertifikasi Cloud Practitioner", target: 1200000, current: 1200000, deadline: "2026-06-25" }
        ];

        for (const sv of savings) {
            await db.run(
                "INSERT INTO savings (id, user_id, name, target, current, deadline) VALUES (?, ?, ?, ?, ?, ?)",
                [sv.id, userId, sv.name, sv.target, sv.current, sv.deadline]
            );
        }

        // Seed default notifications for dev user
        const notifications = [
            { id: "nt-1", title: "Target Tabungan Tercapai!", message: "Celengan 'Sertifikasi Cloud Practitioner' telah terkumpul 100%. Selamat!", type: "success", read: 0, time: "Baru saja" },
            { id: "nt-2", title: "Pengeluaran Kost Mendekati Batas", message: "Biaya Kost Anda sudah mencapai 94% dari batas anggaran bulanan.", type: "warning", read: 0, time: "1 jam yang lalu" },
            { id: "nt-3", title: "Selamat Datang di MajuKeuangan!", message: "Mulai catat transaksi harian Anda dan kelola keuangan agar bebas krisis akhir bulan.", type: "info", read: 1, time: "1 hari yang lalu" }
        ];

        for (const nt of notifications) {
            await db.run(
                "INSERT INTO notifications (id, user_id, title, message, type, read, time) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [nt.id, userId, nt.title, nt.message, nt.type, nt.read, nt.time]
            );
        }

        console.log("Database initialized and seeded successfully for default developer user 'rizky'!");
    }
}
