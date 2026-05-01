const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

module.exports = (pool) => {

    // 1. إعداد مرسل الإيميلات (استخدم Gmail أو أي خدمة أخرى)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com', // إيميلك هنا
            pass: 'your-app-password'      // كلمة مرور التطبيقات من جوجل
        }
    });

    // 2. مسار إنشاء حساب جديد وإرسال كود التحقق
    router.post('/register', async (req, res) => {
        const { email, password, referralCode } = req.body;
        const verificationCode = Math.floor(100000 + Math.random() * 900000); // كود من 6 أرقام

        try {
            // إدخال المستخدم في قاعدة البيانات بحالة "غير موثق"
            const result = await pool.query(
                'INSERT INTO users (email, password, v_code, is_verified, balance, referred_by) VALUES ($1, $2, $3, false, 0, $4) RETURNING id',
                [email, password, verificationCode, referralCode || null]
            );

            // إرسال الإيميل للمستخدم
            const mailOptions = {
                from: '"Quantum Support" <your-email@gmail.com>',
                to: email,
                subject: 'كود التحقق من حساب كوانتم الخاص بك',
                text: `كود التحقق الخاص بك هو: ${verificationCode}`
            };

            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: "تم إرسال كود التحقق إلى بريدك الإلكتروني" });

        } catch (err) {
            console.error(err);
            res.status(400).json({ success: false, message: "هذا الإيميل مسجل مسبقاً أو هناك خطأ" });
        }
    });

    // 3. مسار التأكد من كود التحقق (Verify OTP)
    router.post('/verify', async (req, res) => {
        const { email, code } = req.body;
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1 AND v_code = $2', [email, code]);
            
            if (result.rows.length > 0) {
                await pool.query('UPDATE users SET is_verified = true, balance = 10.0 WHERE email = $1', [email]); // هدية 10$ عند التفعيل
                res.json({ success: true, message: "تم تفعيل الحساب بنجاح!" });
            } else {
                res.status(400).json({ success: false, message: "كود التحقق غير صحيح" });
            }
        } catch (err) { res.status(500).send(err.message); }
    });

    // 4. مسار تسجيل الدخول
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
            const user = result.rows[0];

            if (!user) return res.status(401).json({ message: "بيانات خاطئة" });
            if (!user.is_verified) return res.status(403).json({ message: "يرجى تفعيل الحساب أولاً" });

            req.session.userId = user.id;
            res.json({ success: true, user: { email: user.email, balance: user.balance } });
        } catch (err) { res.status(500).send(err.message); }
    });

    return router;
};
