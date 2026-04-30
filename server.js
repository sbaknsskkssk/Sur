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
    saveUninitialized: true
}));

// تجهيز قاعدة البيانات المتكاملة
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE,
                password TEXT,
                balance FLOAT DEFAULT 1000.0,
                referrer_id INTEGER,
                team_earnings FLOAT DEFAULT 0.0
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                type TEXT, -- 'deposit' or 'withdraw'
                amount FLOAT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query("INSERT INTO users (email, password, balance) VALUES ('admin@trade.com', '123', 1000) ON CONFLICT DO NOTHING");
        console.log("Database Ready 🚀");
    } catch (e) { console.error("DB Init Error:", e); }
};
initDB();

// مسار التداول المطور بأسعار CryptoCompare
app.post('/api/trade', async (req, res) => {
    const { amount, botPower } = req.body;
    const userId = req.session.userId || 1;

    try {
        // جلب السعر الحقيقي (بديل بينانس)
        const priceResp = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
        const btcPrice = priceResp.data.USD;

        const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
        let balance = userRes.rows[0].balance;

        if (balance < amount) return res.status(400).json({ message: 'رصيدك لا يكفي لهذه العملية' });

        // احتمالية الربح بناءً على قوة البوت
        const isWin = (Math.random() * 100) < botPower;
        let message = "";
        
        if (isWin) {
            const profit = amount * (botPower / 100);
            balance += profit;
            message = `✅ السعر المباشر للبيتكوين ${btcPrice}$. البوت نفذ عملية ناجحة وربحت ${profit.toFixed(2)}$!`;
        } else {
            balance -= amount;
            message = `❌ السعر المباشر ${btcPrice}$. تقلبات السوق أدت لخسارة ${amount.toFixed(2)}$.`;
        }

        await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [balance, userId]);
        res.json({ newBalance: balance.toFixed(2), message: message });

    } catch (err) {
        res.status(500).json({ message: "خطأ في جلب بيانات السوق" });
    }
});

// مسار الإيداع والسحب (إرسال طلب)
app.post('/api/request-transaction', async (req, res) => {
    const { type, amount } = req.body;
    const userId = req.session.userId || 1;
    try {
        await pool.query('INSERT INTO transactions (user_id, type, amount) VALUES ($1, $2, $3)', [userId, type, amount]);
        res.json({ message: "تم إرسال طلبك للإدارة بنجاح" });
    } catch (e) { res.status(500).send("خطأ في الطلب"); }
});

// جلب بيانات الحساب كاملة
app.get('/api/user-data', async (req, res) => {
    const userId = req.session.userId || 1;
    try {
        const result = await pool.query('SELECT balance, team_earnings FROM users WHERE id = $1', [userId]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).send("خطأ"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Quantum Server V2 Running...'));
