const express = require('express');
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');
const axios = require('axios');
const app = express();

// الربط مع قاعدة البيانات (المتغير STORAGE_URL من Vercel)
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

// دالة لإنشاء الجدول في القاعدة إذا لم يكن موجوداً (تلقائياً)
const initDB = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            balance FLOAT DEFAULT 1000.0
        );
    `);
    // إضافة حساب الأدمن إذا لم يكن موجوداً
    await pool.query("INSERT INTO users (email, password, balance) VALUES ('admin@trade.com', '123', 1000) ON CONFLICT DO NOTHING");
};
initDB();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تسجيل الدخول من قاعدة البيانات
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'خطأ في البيانات' });
        
        const user = result.rows[0];
        req.session.userId = user.id;
        res.json({ user: { email: user.email, balance: user.balance } });
    } catch (err) { res.status(500).send(err.message); }
});

// تنفيذ صفقة البوت بالأسعار الحقيقية
app.post('/api/trade', async (req, res) => {
    const { amount, botPower } = req.body;
    const userId = req.session.userId || 1; // 1 للأدمن افتراضياً

    try {
        // 1. جلب السعر من بينانس
        const binanceResp = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const currentPrice = parseFloat(binanceResp.data.price);

        // 2. جلب رصيد المستخدم من القاعدة
        const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
        let balance = userRes.rows[0].balance;

        if (balance < amount) return res.status(400).json({ message: 'رصيدك قليل' });

        // 3. منطق الربح والخسارة بناءً على قوة البوت
        const isWin = (Math.random() * 100) < (botPower || 70); 
        let profit = 0;
        let message = "";

        if (isWin) {
            profit = amount * 0.2; // ربح 20%
            balance += profit;
            message = `✅ السعر الحقيقي الآن ${currentPrice}$. البوت نجح في الصفقة وربحت ${profit}$!`;
        } else {
            balance -= amount;
            message = `❌ السعر الحقيقي الآن ${currentPrice}$. السوق كان متقلباً وخسرت ${amount}$`;
        }

        // 4. تحديث الرصيد في قاعدة البيانات (ليحفظ للأبد)
        await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [balance, userId]);

        res.json({ newBalance: balance.toFixed(2), message: message });
    } catch (err) {
        res.status(500).json({ message: "خطأ في السيرفر أو الاتصال ببينانس" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Quantum Server Running...'));
