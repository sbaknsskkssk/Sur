const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'ali-basra-secret-2026',
    resave: false,
    saveUninitialized: true
}));

// قاعدة بيانات وهمية (تختفي عند ريستارت السيرفر - اربط Postgres لاحقاً للحفظ الدائم)
let users = [
    { id: 1, email: "admin@trade.com", password: "123", balance: 1000, role: "admin" }
];

// تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ message: 'خطأ في البيانات' });
    req.session.userId = user.id;
    req.session.role = user.role || "user";
    res.json({ user: { email: user.email, balance: user.balance, role: user.role } });
});

// إنشاء حساب
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (users.find(u => u.email === email)) return res.status(400).json({ message: 'المستخدم موجود' });
    const newUser = { id: Date.now(), email, password, balance: 0, role: "user" };
    users.push(newUser);
    req.session.userId = newUser.id;
    res.json({ user: newUser });
});

// --- وظيفة الأدمن (زيادة ونقصان الرصيد) ---
app.post('/api/admin/update-balance', (req, res) => {
    if (req.session.role !== "admin") return res.status(403).json({ message: 'غير مسموح لك' });
    const { targetEmail, newBalance } = req.body;
    const user = users.find(u => u.email === targetEmail);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    
    user.balance = parseFloat(newBalance);
    res.json({ message: `تم تحديث رصيد ${targetEmail} إلى ${newBalance}$` });
});

// تنفيذ الصفقة
app.post('/api/trade', (req, res) => {
    const user = users.find(u => u.id === req.session.userId);
    if (!user) return res.status(401).json({ message: 'سجل دخولك' });
    
    const { amount, win } = req.body; // المنطق هنا: الربح/الخسارة يتم تحديده من الواجهة أو السيرفر
    if (user.balance < amount) return res.status(400).json({ message: 'رصيدك قليل' });

    user.balance += win ? (amount * 0.1) : -amount;
    res.json({ newBalance: user.balance });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running...'));
