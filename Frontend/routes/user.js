const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontrol');

// Authentication middleware for API routes
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        console.log('Authentication required - no user in session');
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        return res.redirect('/login');
    }
    if (!req.session.token) {
        console.log('Authentication required - no token in session');
        return res.status(401).json({ message: 'Authentication token missing' });
    }
    next();
};

// User view routes
router.get('/', userController.getUserMain);
router.get('/profile', userController.getUserProfile);
router.get('/bookings', userController.getUserBookings);
router.get('/create-booking', userController.getCreateBooking);
router.get('/edit-booking/:id', userController.getEditBooking);
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

// Booking management routes
router.get('/api/bookings', requireAuth, userController.getBookings);
router.post('/api/bookings', requireAuth, userController.addBooking);
router.put('/api/bookings/:id', requireAuth, userController.updateBooking);
router.delete('/api/bookings/:id', requireAuth, userController.cancelBooking);

module.exports = router;