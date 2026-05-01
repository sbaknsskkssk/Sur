const express = require('express');
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');
require('dotenv').config(); 

const app = express();

// 1. إعدادات قاعدة البيانات
const pool = new Pool({
    connectionString: process.env.STORAGE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
// تعريف مجلد الملفات العامة (الصور والصفحات)
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'ali-basra-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } 
}));

// 2. دالة تهيئة الجداول
const initDB = async () => {
    try {
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
            CREATE TABLE IF NOT EXISTS withdrawals (
                id SERIAL PRIMARY KEY,
                user_id INT,
                amount FLOAT,
                address TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Database Tables Ready!");
    } catch (err) {
        console.error("❌ Database Error:", err);
    }
};
initDB();

// 3. ربط المسارات (Routes)
const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trade');
const referralRoutes = require('./routes/referral');
const accountRoutes = require('./routes/account');

app.use('/api/auth', authRoutes(pool));
app.use('/api/trade', tradeRoutes(pool));
app.use('/api/referral', referralRoutes(pool));
app.use('/api/account', accountRoutes(pool));

// 4. توجيه الصفحة الرئيسية (هذا يحل مشكلة Not Found)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Quantum Master Server Running...'));
