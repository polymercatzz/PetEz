const express = require('express');
const router = express.Router();
const petsitterController = require('../controllers/petsitterController');

// Middleware: require authenticated sitter role for sitter area
function requireSitter(req, res, next) {
	const user = req.session.user;
	if (!user) {
		return res.redirect('/');
	}
	if (user.role !== 'sitter') {
		// If user is admin, send to admin; otherwise to user area
		return res.redirect(user.role === 'admin' ? '/admin' : '/user');
	}
	next();
}

// Pet sitter view routes
// Land sitters on jobs dashboard by default
router.get('/', requireSitter, (req, res) => res.redirect('/petsitter/register'));
router.get('/profile', requireSitter, petsitterController.getPetsitterProfile);
router.get('/register', requireSitter, petsitterController.getPetsitterRegister);
router.get('/jobs', requireSitter, petsitterController.getAvailableJobs);
router.get('/history', requireSitter, petsitterController.getJobHistory);
router.get('/work/:id', requireSitter, petsitterController.getWorkDetail);

// API routes for pet sitter
router.post('/api/register', requireSitter, petsitterController.registerPetsitter);
router.get('/api/profile', requireSitter, petsitterController.getPetsitterProfileData);
router.put('/api/profile', requireSitter, petsitterController.updatePetsitterProfile);
router.get('/api/jobs', requireSitter, petsitterController.getJobs);
router.post('/api/jobs/:id/accept', requireSitter, petsitterController.acceptJob);
router.put('/api/jobs/:id/status', requireSitter, petsitterController.updateBookingStatus);
router.get('/api/my-jobs', requireSitter, petsitterController.getPetsitterBookings);

// Service management routes
router.get('/api/services', requireSitter, petsitterController.getSitterServices);
router.post('/api/services', requireSitter, petsitterController.addSitterService);
router.put('/api/services/:id', requireSitter, petsitterController.updateSitterService);
router.delete('/api/services/:id', requireSitter, petsitterController.deleteSitterService);

// Analytics routes
router.get('/api/earnings', requireSitter, petsitterController.getSitterEarnings);
router.get('/api/statistics', requireSitter, petsitterController.getSitterStatistics);

module.exports = router;