-- ==========================================
-- MajuKeuangan - Supabase Database Setup
-- Jalankan script ini di Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Paste → Run
-- ==========================================

-- Tabel profil pengguna (extend Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  fullname TEXT NOT NULL,
  univ TEXT NOT NULL,
  avatar TEXT DEFAULT ''
);

-- Tabel transaksi
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pemasukan', 'pengeluaran')),
  category TEXT NOT NULL,
  amount BIGINT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel anggaran per kategori
CREATE TABLE IF NOT EXISTS budgets (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  limit_amount BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category)
);

-- Tabel tabungan / celengan
CREATE TABLE IF NOT EXISTS savings (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target BIGINT NOT NULL,
  current BIGINT DEFAULT 0,
  deadline DATE NOT NULL
);

-- Tabel notifikasi
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  time TEXT DEFAULT 'Baru saja',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- Setiap user hanya bisa akses data miliknya sendiri
-- ==========================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Transactions
CREATE POLICY "tx_select" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tx_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tx_update" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tx_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Budgets
CREATE POLICY "budgets_select" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- Savings
CREATE POLICY "savings_select" ON savings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_insert" ON savings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_update" ON savings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "savings_delete" ON savings FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notif_select"  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert"  ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_update"  ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_delete"  ON notifications FOR DELETE USING (auth.uid() = user_id);
