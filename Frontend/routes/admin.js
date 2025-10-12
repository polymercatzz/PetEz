const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Simple auth middleware similar to user routes
const requireAuth = (req, res, next) => {
	if (!req.session || !req.session.user) {
		if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
			return res.status(401).json({ message: 'Authentication required' });
		}
		return res.redirect('/');
	}
	if (!req.session.token) {
		return res.status(401).json({ message: 'Authentication token missing' });
	}
	next();
};

	// Role guard: only admin can access admin area
	const requireAdmin = (req, res, next) => {
		const role = req.session?.user?.role;
		if (role !== 'admin') {
			if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
				return res.status(403).json({ message: 'Admin access required' });
			}
			return res.redirect('/');
		}
		next();
	};

// Admin view routes
router.get('/', requireAuth, requireAdmin, adminController.getAdminHome);
router.get('/users', requireAuth, requireAdmin, adminController.getUsers);
router.get('/bookings', requireAuth, requireAdmin, adminController.getBookings);
router.get('/approval', requireAuth, requireAdmin, adminController.getApproval);


// Admin API to update user status
router.put('/api/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
	const { id } = req.params;
	const { status } = req.body || {};
	const dockerUrl = `http://auth-service:3002/api/users/${id}/status`;
	const localUrl = `http://localhost:3002/api/users/${id}/status`;
	try {
		const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${req.session.token}` };
		let resp = await fetch(dockerUrl, {
			method: 'PUT',
			headers,
			body: JSON.stringify({ status })
		}).catch(() => null);
		if (!resp) {
			resp = await fetch(localUrl, {
				method: 'PUT',
				headers,
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
router.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
	const { id } = req.params;
	const dockerUrl = `http://auth-service:3002/api/users/${id}`;
	const localUrl = `http://localhost:3002/api/users/${id}`;
	try {
		const headers = { 'Authorization': `Bearer ${req.session.token}` };
		let resp = await fetch(dockerUrl, { method: 'DELETE', headers }).catch(() => null);
		if (!resp) {
			resp = await fetch(localUrl, { method: 'DELETE', headers });
		}
		const data = await resp.json().catch(() => ({}));
		return res.status(resp.status).json(data);
	} catch (err) {
		console.error('Proxy delete user error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

module.exports = router;
 
// Booking admin APIs
// Note: export augmentation - ensure this code runs before module.exports if reordering is needed
router.get('/api/bookings', requireAuth, requireAdmin, async (req, res) => {
	const dockerUrl = 'http://booking-service:3006/admin/bookings';
	const localUrl = 'http://localhost:3006/admin/bookings';
	try {
		const headers = { 'Authorization': `Bearer ${req.session.token}` };
		let resp = await fetch(dockerUrl, { headers }).catch(() => null);
		if (!resp) resp = await fetch(localUrl, { headers });
		const data = await resp.json().catch(() => ({}));
		return res.status(resp.status).json(data);
	} catch (err) {
		console.error('Proxy fetch bookings error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

router.put('/api/bookings/:id/status', requireAuth, requireAdmin, async (req, res) => {
	const { id } = req.params;
	const { status } = req.body || {};
	const dockerUrl = `http://booking-service:3006/admin/bookings/${id}/status`;
	const localUrl = `http://localhost:3006/admin/bookings/${id}/status`;
	try {
		const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${req.session.token}` };
		let resp = await fetch(dockerUrl, { method: 'PUT', headers, body: JSON.stringify({ status }) }).catch(() => null);
		if (!resp) resp = await fetch(localUrl, { method: 'PUT', headers, body: JSON.stringify({ status }) });
		const data = await resp.json().catch(() => ({}));
		return res.status(resp.status).json(data);
	} catch (err) {
		console.error('Proxy update booking status error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// Admin API to update user role
router.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
	const { id } = req.params;
	const { role } = req.body || {};
	const dockerUrl = `http://auth-service:3002/api/users/${id}/role`;
	const localUrl = `http://localhost:3002/api/users/${id}/role`;
	try {
		const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${req.session.token}` };
		let resp = await fetch(dockerUrl, { method: 'PUT', headers, body: JSON.stringify({ role }) }).catch(() => null);
		if (!resp) {
			resp = await fetch(localUrl, { method: 'PUT', headers, body: JSON.stringify({ role }) });
		}
		const data = await resp.json().catch(() => ({}));
		return res.status(resp.status).json(data);
	} catch (err) {
		console.error('Proxy update role error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});