const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontrol');

// User view routes
router.get('/', userController.getUserMain);
router.get('/profile', userController.getUserProfile);
router.get('/bookings', userController.getUserBookings);
router.get('/history', userController.getUserHistory);
router.get('/book/:id', userController.getBookingForm);

// API routes for user
router.post('/api/register', userController.registerUser);
router.post('/api/login', userController.loginUser);
router.get('/api/profile', userController.getUserProfileData);
router.put('/api/profile', userController.updateUserProfile);
router.post('/api/bookings', userController.createBooking);
router.get('/api/bookings', userController.getUserBookingsData);

module.exports = router;