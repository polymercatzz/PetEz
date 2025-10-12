const express = require('express');
const session = require('express-session');
const axios = require('axios');
const app = express();
const PORT = 3001;

const path = require("path");

// Import routers
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');
const petsitterRouter = require('./routes/petsitter');

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'frontend-session-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS
app.set('view engine', 'ejs');

// Set public directory
app.use(express.static(path.join(__dirname, 'public')));

// Use routers
app.use('/admin', adminRouter);
app.use('/user', userRouter);
app.use('/petsitter', petsitterRouter);

app.get('/', (req, res) => {
    res.render('index', { title: 'PetEz - Pet Sitting Service' });
});

app.post('/', (req, res) => {
    const { email, password } = req.body;
    console.log(`Received contact form submission: Email=${email}, Password=${password}`);
    res.redirect('/user/');
});

app.post('/login', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    console.log(email, password);
    if (!email || !password) {
        return res.status(400).render('index', { 
            title: 'PetEz - Pet Sitting Service',
            error: 'กรุณากรอกอีเมลและรหัสผ่าน',
            success: null,
            activeTab: 'login',
            form: { email }
        });
    }

    const dockerUrl = 'http://auth-service:3002/login';
    const localUrl = 'http://localhost:3002/login';

    async function postLogin(url) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }));
            throw Object.assign(new Error(errorData.message || 'Authentication failed'), { status: response.status });
        }
        return response.json();
    }

    try {
        const data = await postLogin(dockerUrl).catch(async (e) => {
            // Only fallback on network/connectivity errors
            return await postLogin(localUrl);
        });

        console.log('Login successful:', data);
        req.session.user = data.user;
        req.session.token = data.token;
        req.session.loginTime = new Date();
        // Redirect admin straight to admin dashboard, others to user area
        if (data.user && data.user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/user/');
    } catch (error) {
        const status = error.status || 500;
        console.error('Login error:', error.message || error);
        const message = (status === 401 || status === 403)
            ? (error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
            : 'เกิดข้อผิดพลาดจากระบบ ลองใหม่อีกครั้ง';
        return res.status(status).render('index', {
            title: 'PetEz - Pet Sitting Service',
            error: message,
            success: null,
            activeTab: 'login',
            form: { email }
        });
    }
});


app.post('/register', async (req, res) => {
    const { 
        email, 
        password, 
        confirmPassword, 
        username, 
        firstName, 
        lastName, 
        age, 
        phone, 
        address, 
        district, 
        province, 
        postalCode 
    } = req.body;

    if (!email || !password || !username) {
        return res.status(400).render('index', {
            title: 'PetEz - Pet Sitting Service',
            error: 'กรุณากรอกอีเมล ชื่อผู้ใช้ และรหัสผ่าน',
            success: null,
            activeTab: 'register',
            form: { email, username, firstName, lastName, age, phone, address, district, province, postalCode }
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).render('index', {
            title: 'PetEz - Pet Sitting Service',
            error: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
            success: null,
            activeTab: 'register',
            form: { email, username, firstName, lastName, age, phone, address, district, province, postalCode }
        });
    }
    
    const dockerUrl = 'http://auth-service:3002/register';
    const localUrl = 'http://localhost:3002/register';

    async function postRegister(url) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, password, username, firstName, lastName, age, phone, address, district, province, postalCode 
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
            throw Object.assign(new Error(errorData.message || 'Registration failed'), { status: response.status });
        }
        return response.json();
    }

    try {
        await postRegister(dockerUrl).catch(async () => {
            return await postRegister(localUrl);
        });
        console.log('Registration successful');
        return res.status(200).render('index', {
            title: 'PetEz - Pet Sitting Service',
            error: null,
            success: 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ',
            activeTab: 'login',
            form: {}
        });
    } catch (error) {
        const status = error.status || 500;
        console.error('Registration error:', error.message || error);
        const message = (status >= 400 && status < 500)
            ? (error.message || 'สมัครสมาชิกไม่สำเร็จ')
            : 'เกิดข้อผิดพลาดจากระบบ ลองใหม่อีกครั้ง';
        return res.status(status).render('index', {
            title: 'PetEz - Pet Sitting Service',
            error: message,
            success: null,
            activeTab: 'register',
            form: { email, username, firstName, lastName, age, phone, address, district, province, postalCode }
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

app.get('/session', (req, res) => {
    if (req.session.user) {
        return res.status(200).json({
            message: 'Session active',
            user: req.session.user,
            loginTime: req.session.loginTime
        });
    } else {
        return res.status(401).json({ message: 'No active session' });
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
