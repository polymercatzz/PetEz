const express = require('express');
const router = express.Router();
const petsitterController = require('../controllers/petsitterController');

// Pet sitter view routes
router.get('/', petsitterController.getPetsitterProfile);
router.get('/profile', petsitterController.getPetsitterProfile);
router.get('/register', petsitterController.getPetsitterRegister);
router.get('/jobs', petsitterController.getAvailableJobs);
router.get('/history', petsitterController.getJobHistory);
router.get('/work/:id', petsitterController.getWorkDetail);

// API routes for pet sitter
router.post('/api/register', petsitterController.registerPetsitter);
router.get('/api/profile', petsitterController.getPetsitterProfileData);
router.put('/api/profile', petsitterController.updatePetsitterProfile);
router.get('/api/jobs', petsitterController.getJobs);
router.post('/api/jobs/:id/accept', petsitterController.acceptJob);
router.get('/api/bookings', petsitterController.getPetsitterBookings);
router.put('/api/bookings/:id/status', petsitterController.updateBookingStatus);

module.exports = router;