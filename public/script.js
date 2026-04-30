let userData = null;

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('pass').value;
    
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if(res.ok) {
        userData = data.user;
        showDashboard();
    } else { alert(data.message); }
}

function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    document.getElementById('user-display').innerText = userData.email;
    document.getElementById('balance-display').innerText = userData.balance + "$";
    
    // إظهار لوحة الأدمن إذا كان المستخدم أدمن
    if(userData.role === 'admin') {
        document.getElementById('admin-panel').style.display = 'block';
    }
}

// وظيفة الأدمن لتعديل الرصيد
async function updateUserBalance() {
    const targetEmail = document.getElementById('target-email').value;
    const newBalance = document.getElementById('new-bal').value;
    
    const res = await fetch('/api/admin/update-balance', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ targetEmail, newBalance })
    });
    const data = await res.json();
    alert(data.message);
}

async function trade(dir) {
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const win = Math.random() > 0.5; // محاكاة فوز أو خسارة

    const res = await fetch('/api/trade', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ amount, win })
    });
    const data = await res.json();
    document.getElementById('balance-display').innerText = data.newBalance + "$";
}
