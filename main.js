const express = require('express');
const app = express();
const PORT = 3000;

const path = require("path");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Set EJS
app.set('view engine', 'ejs');

// Set public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'temp/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});