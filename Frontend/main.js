const express = require('express');
const app = express();
const PORT = 3001;

const path = require("path");

// Import routers
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');
const petsitterRouter = require('./routes/petsitter');

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

app.post('/register', (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, age, phoneNumber, district, province, postalCode, address } = req.body;
    console.log(`Received registration: Name=${firstName} ${lastName}, Email=${email}, Password=${password} ConfirmPassword=${confirmPassword}, Age=${age}, Phone=${phoneNumber}, District=${district}, Province=${province}, PostalCode=${postalCode}, Address=${address}`);
    res.redirect('/user/');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
