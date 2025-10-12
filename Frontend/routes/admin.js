const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin view routes
router.get('/', adminController.getAdminHome);
router.get('/users', adminController.getUsers);
router.get('/bookings', adminController.getBookings);
router.get('/approval', adminController.getApproval);


// Admin API to update user status
router.put('/api/users/:id/status', async (req, res) => {
	const { id } = req.params;
	const { status } = req.body || {};
	const dockerUrl = `http://auth-service:3002/api/users/${id}/status`;
	const localUrl = `http://localhost:3002/api/users/${id}/status`;
	try {
		let resp = await fetch(dockerUrl, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status })
		}).catch(() => null);
		if (!resp) {
			resp = await fetch(localUrl, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});
		}
		const data = await resp.json().catch(() => ({}));
		return res.status(resp.status).json(data);
	} catch (err) {
		console.error('Proxy update status error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// Admin API to delete user
router.delete('/api/users/:id', async (req, res) => {
	const { id } = req.params;
	const dockerUrl = `http://auth-service:3002/api/users/${id}`;
	const localUrl = `http://localhost:3002/api/users/${id}`;
	try {
		let resp = await fetch(dockerUrl, { method: 'DELETE' }).catch(() => null);
		if (!resp) {
			resp = await fetch(localUrl, { method: 'DELETE' });
		}
		const data = await resp.json().catch(() => ({}));
		return res.status(resp.status).json(data);
	} catch (err) {
		console.error('Proxy delete user error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

module.exports = router;