let isLogin = true;

// التبديل بين واجهة الدخول والتسجيل
function toggleForm() {
    isLogin = !isLogin;
    const title = document.getElementById('form-title');
    const loginBtn = document.getElementById('login-btn');
    const regBtn = document.getElementById('reg-btn');
    const refInput = document.getElementById('referral');
    const toggleLink = document.getElementById('toggle-link');

    title.innerText = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
    loginBtn.style.display = isLogin ? 'block' : 'none';
    regBtn.style.display = isLogin ? 'none' : 'block';
    refInput.style.display = isLogin ? 'none' : 'block';
    
    toggleLink.innerHTML = isLogin ? 
        'ليس لديك حساب؟ <span>سجل الآن</span>' : 'لديك حساب بالفعل؟ <span>سجل دخولك</span>';
}

// معالجة إنشاء حساب جديد
async function handleRegister() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const referralCode = document.getElementById('referral').value;

    if(!email || !password) return alert("يرجى ملء كافة الحقول");

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password, referralCode })
        });

        const data = await res.json();
        if(data.success) {
            alert("تم التسجيل بنجاح! تحقق من بريدك.");
            localStorage.setItem('pendingEmail', email);
            window.location.href = 'verify.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("خطأ في الاتصال بالسيرفر");
    }
}

// معالجة تسجيل الدخول
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if(!email || !password) return alert("يرجى ملء الحقول");

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if(data.success) {
            window.location.href = 'trade.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("فشل الدخول، تأكد من اتصالك");
    }
}
