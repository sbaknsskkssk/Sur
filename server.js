const express = require('express');
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');
const axios = require('axios');
const app = express();

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
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // يوم كامل
}));

const initDB = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            balance FLOAT DEFAULT 0.0
        );
    `);
};
initDB();

// مسار جلب بيانات المستخدم الحالي
app.get('/api/user-data', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "غير مسجل" });
    const result = await pool.query('SELECT email, balance FROM users WHERE id = $1', [req.session.userId]);
    res.json(result.rows[0]);
});

// تسجيل حساب جديد
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (email, password, balance) VALUES ($1, $2, 10.0) RETURNING id', 
            [email, password]
        );
        req.session.userId = result.rows[0].id;
        res.json({ success: true });
    } catch (e) { res.status(400).json({ message: "الإيميل مسجل مسبقاً" }); }
});

// تسجيل دخول
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length > 0) {
        req.session.userId = result.rows[0].id;
        res.json({ success: true });
    } else {
        res.status(401).json({ message: "بيانات خاطئة" });
    }
});

// منطق التداول (الربح الدائم)
app.post('/api/trade', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "سجل دخولك" });
    const { amount, botPower } = req.body;

    try {
        const priceResp = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
        const btcPrice = priceResp.data.USD;

        const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [req.session.userId]);
        let balance = userRes.rows[0].balance;

        if (balance < amount) return res.status(400).json({ message: 'رصيدك لا يكفي' });

        // البوت يربح دائماً بناءً على القوة
        const profit = amount * (botPower / 100);
        balance += profit;

        const scenarios = [
            `📈 السعر صعد لـ ${btcPrice}$، البوت فتح صفقة شراء وربحت ${profit.toFixed(2)}$!`,
            `📉 السعر هبط لـ ${btcPrice}$، البوت فتح صفقة بيع وربحت ${profit.toFixed(2)}$!`
        ];
        const message = scenarios[Math.floor(Math.random() * scenarios.length)];

        await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [balance, req.session.userId]);
        res.json({ newBalance: balance.toFixed(2), message: message });
    } catch (err) { res.status(500).json({ message: "خطأ في الاتصال بالسوق" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Quantum Server Active'));
