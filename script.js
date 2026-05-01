const express = require('express');
const path = require('path');
const session = require('express-session');
const { Pool } = require('pg');
const app = express();

// الربط مع قاعدة البيانات (تأكد أن STORAGE_URL موجود في Vercel)
const pool = new Pool({
    connectionString: process.env.STORAGE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'quantum_ali_2026',
    resave: false,
    saveUninitialized: false
}));

// --- ربط الأجزاء البرمجية ---
const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trade');

app.use('/api/auth', authRoutes(pool));
app.use('/api/trade', tradeRoutes(pool));

// الصفحة التي تفتح أول ما يدخل المستخدم (صفحة الدخول)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Quantum Server is Running...'));
