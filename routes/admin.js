const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin view routes
router.get('/', adminController.getAdminHome);
router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.get('/bookings', adminController.getBookings);
router.get('/approval', adminController.getApproval);

// API routes for admin
router.get('/api/users', adminController.getAllUsers);
router.put('/api/users/:id/status', adminController.updateUserStatus);
router.get('/api/bookings', adminController.getAllBookings);

module.exports = router;