const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontrol');

// User view routes
router.get('/', userController.getUserMain);
router.get('/profile', userController.getUserProfile);
router.get('/bookings', userController.getUserBookings);
router.get('/history', userController.getUserHistory);
router.get('/book/:id', userController.getBookingForm);


module.exports = router;