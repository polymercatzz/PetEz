const express = require('express');
const session = require('express-session');
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
        return res.status(400).send('Email and password are required.');
    }
    const authApiUrl = 'http://localhost:3002/login';
    try {
        const response = await fetch(authApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }));
            
            console.error('External API authentication failed:', response.status, errorData.message);
            return res.status(401).send(errorData.message || 'Invalid credentials');
        }
        const data = await response.json();
        console.log('Login successful:', data);

        req.session.user = data.user;
        req.session.token = data.token;
        req.session.loginTime = new Date();
        
        res.redirect('/user/');
    } catch (error) {
        console.error('Network or server error during login:', error);
        res.status(500).send('Internal server error during authentication check.');
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
        return res.status(400).send('Email, username and password are required.');
    }
    
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }
    
    const authApiUrl = 'http://localhost:3002/register';
    try {
        const response = await fetch(authApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email, 
                password, 
                username, 
                firstName, 
                lastName, 
                age, 
                phone, 
                address, 
                district, 
                province, 
                postalCode 
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
            console.error('External API registration failed:', response.status, errorData.message);
            return res.status(400).send(errorData.message || 'Registration failed');
        }
        
        const data = await response.json();
        console.log('Registration successful:', data);
        res.redirect('/');
    } catch (error) {
        console.error('Network or server error during registration:', error);
        res.status(500).send('Internal server error during registration.');
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
