const express = require('express');
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');
require('dotenv').config(); // لتأمين بيانات قاعدة البيانات

const app = express();

// الربط مع قاعدة بيانات Vercel Postgres
const pool = new Pool({
    connectionString: process.env.STORAGE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'ali-basra-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } 
}));

// دالة إنشاء الجداول المتطورة (للحسابات، الإحالات، والتحقق)
const initDB = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            balance FLOAT DEFAULT 0.0,
            v_code TEXT,
            is_verified BOOLEAN DEFAULT false,
            referred_by TEXT,
            last_free_trade TEXT
        );
    `);
    console.log("Database Tables Ready!");
};
initDB();

// --- ربط الملفات البرمجية (Routes) ---
const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trade');
const referralRoutes = require('./routes/referral');

app.use('/api/auth', authRoutes(pool));
app.use('/api/trade', tradeRoutes(pool));
app.use('/api/referral', referralRoutes(pool));

// توجيه الصفحة الرئيسية لـ login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Quantum Master Server Running...'));
