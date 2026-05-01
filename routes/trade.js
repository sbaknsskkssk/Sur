const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = (pool) => {

    // 1. مسار البوت المجاني (ربح 3% ثابت مرة واحدة في اليوم)
    router.post('/free-trade', async (req, res) => {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ success: false, message: "سجل دخولك أولاً" });

        try {
            const userRes = await pool.query('SELECT balance, last_free_trade FROM users WHERE id = $1', [userId]);
            const user = userRes.rows[0];

            const today = new Date().toDateString();
            if (user.last_free_trade === today) {
                return res.json({ success: false, message: "لقد استهلكت صفقتك المجانية اليوم. عد غداً!" });
            }

            const profit = user.balance * 0.03; // ربح 3%
            const newBalance = user.balance + profit;

            await pool.query(
                'UPDATE users SET balance = $1, last_free_trade = $2 WHERE id = $3',
                [newBalance, today, userId]
            );

            res.json({ 
                success: true, 
                message: `✅ نجحت الصفقة المجانية! ربحت ${profit.toFixed(2)}$ (نسبة 3%)`,
                newBalance: newBalance.toFixed(2)
            });
        } catch (err) { res.status(500).json({ success: false, message: "خطأ في السيرفر" }); }
    });

    // 2. مسار الصفقات المدفوعة (الربح الدائم بناءً على قوة البوت)
    router.post('/execute', async (req, res) => {
        const { amount, botPower } = req.body;
        const userId = req.session.userId;

        if (!userId) return res.status(401).json({ success: false, message: "سجل دخولك أولاً" });

        try {
            // جلب سعر البيتكوين الحقيقي لإعطاء مصداقية للصفقة
            const priceResp = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
            const btcPrice = priceResp.data.USD;

            const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
            let balance = userRes.rows[0].balance;

            if (balance < amount) return res.status(400).json({ success: false, message: 'رصيدك غير كافٍ لهذه الصفقة' });

            // منطق "الربح الدائم": الربح = المبلغ * (قوة البوت / 100)
            const profit = amount * (botPower / 100);
            const newBalance = balance + profit;

            await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

            // تنويع الرسائل لتبدو كأنها صفقات حقيقية
            const scenarios = [
                `📈 تحليل كوانتم: السعر الحالي ${btcPrice}$. تم دخول صفقة Long بنجاح. الربح: ${profit.toFixed(2)}$`,
                `📉 تحليل كوانتم: السعر الحالي ${btcPrice}$. تم دخول صفقة Short بنجاح. الربح: ${profit.toFixed(2)}$`
            ];
            const message = scenarios[Math.floor(Math.random() * scenarios.length)];

            res.json({ success: true, newBalance: newBalance.toFixed(2), message: message });
        } catch (err) { res.status(500).json({ success: false, message: "خطأ في الاتصال بسوق العملات" }); }
    });

    return router;
};
