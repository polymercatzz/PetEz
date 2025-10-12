const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 3003;

// Import routers
const usersRouter = require('./routes/userRoutes');

app.use('/api/users', usersRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});