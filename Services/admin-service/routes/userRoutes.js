const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// API route to get all users
router.get('/all', userController.getAllUsers);

module.exports = router;
