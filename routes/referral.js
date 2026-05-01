const express = require('express');
const router = express.Router();

module.exports = (pool) => {

    // 1. مسار جلب بيانات الفريق (عدد الأعضاء والأرباح)
    router.get('/my-team', async (req, res) => {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ message: "سجل دخولك" });

        try {
            // جلب المستخدمين الذين تسجلوا عن طريق هذا المستخدم
            const teamRes = await pool.query(
                'SELECT email, balance, is_verified FROM users WHERE referred_by = $1', 
                [userId.toString()]
            );
            
            // حساب إجمالي أرباح الفريق (مثلاً عمولة 10% من أرصدتهم)
            let teamProfit = 0;
            teamRes.rows.forEach(member => {
                if(member.is_verified) teamProfit += (member.balance * 0.10);
            });

            res.json({
                success: true,
                count: teamRes.rows.length,
                members: teamRes.rows,
                totalProfit: teamProfit.toFixed(2)
            });
        } catch (err) {
            res.status(500).json({ success: false, message: "خطأ في جلب بيانات الفريق" });
        }
    });

    return router;
};
