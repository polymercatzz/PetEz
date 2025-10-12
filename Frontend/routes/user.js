const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontrol');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
router.get('/create-booking', userController.getCreateBooking); // legacy create-booking (still usable)
router.get('/create', userController.getCreateRequest); // new: request creation page
router.get('/edit-booking/:id', userController.getEditBooking);
router.get('/history', userController.getUserHistory);
router.get('/book/:id', userController.getBookingForm); // booking by service
router.get('/sitter/regis', (req, res)=>{
    const user = req.session.user;
    if(!user) return res.redirect('/');
    res.render('user/sitter_regis', { title: 'สมัครเป็นพี่เลี้ยงสัตว์', activeMenu: 'sitter-regis', user });
});

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

// Requests
router.post('/api/requests', requireAuth, userController.addRequest);

// Sitter registration
router.post('/api/sitter/register', requireAuth, userController.registerSitter);

// Upload docs for sitter registration (store locally and return file path)
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'sitter');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
        cb(null, `${Date.now()}_${base}${ext}`);
    }
});
const upload = multer({ storage });

router.post('/api/sitter/upload-id', requireAuth, upload.single('id_card'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const relPath = `/uploads/sitter/${req.file.filename}`;
    return res.status(200).json({ message: 'Uploaded', path: relPath });
});

module.exports = router;