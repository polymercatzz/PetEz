const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin view routes
router.get('/', adminController.getAdminHome);
router.get('/users', adminController.getUsers);
router.get('/bookings', adminController.getBookings);
router.get('/approval', adminController.getApproval);


module.exports = router;