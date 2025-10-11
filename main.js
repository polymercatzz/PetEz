require('dotenv').config();

const express = require('express');
const { sequelize } = require('./models/sequelize');
const app = express();
const PORT = 3000;

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
    res.redirect('/');
});

sequelize.sync({ alter: true })
  .then(() => {
    console.log("Database synced");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error("DB Error:", err));