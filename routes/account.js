const express = require('express');
const router = express.Router();

module.exports = (pool) => {

    // مسار إرسال طلب سحب جديد
    router.post('/withdraw', async (req, res) => {
        const { amount, address } = req.body;
        const userId = req.session.userId;

        if (!userId) return res.status(401).json({ success: false, message: "سجل دخولك أولاً" });

        try {
            // التأكد من رصيد المستخدم
            const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
            const balance = userRes.rows[0].balance;

            if (amount < 10) return res.status(400).json({ success: false, message: "الحد الأدنى للسحب هو 10$" });
            if (balance < amount) return res.status(400).json({ success: false, message: "رصيدك غير كافٍ" });

            // خصم الرصيد وتسجيل الطلب
            await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);
            await pool.query(
                'INSERT INTO withdrawals (user_id, amount, address) VALUES ($1, $2, $3)',
                [userId, amount, address]
            );

            res.json({ success: true, message: "تم إرسال طلب السحب بنجاح، سيتم المعالجة خلال 24 ساعة" });
        } catch (err) {
            res.status(500).json({ success: false, message: "خطأ في السيرفر" });
        }
    });

    return router;
};
