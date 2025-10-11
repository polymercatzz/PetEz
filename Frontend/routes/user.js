const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontrol');

// User view routes
router.get('/', userController.getUserMain);
router.get('/profile', userController.getUserProfile);
router.get('/bookings', userController.getUserBookings);
router.get('/history', userController.getUserHistory);
router.get('/book/:id', userController.getBookingForm);

// Profile management routes
router.post('/profile/update', userController.updateProfile);
router.post('/profile/change-password', userController.changePassword);

// Pet management routes
router.get('/pets', userController.getPets);
router.post('/pets', userController.addPet);
router.put('/pets/:id', userController.updatePet);
router.delete('/pets/:id', userController.deletePet);

module.exports = router;