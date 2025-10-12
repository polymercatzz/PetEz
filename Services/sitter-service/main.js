const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { User, Pet, Sitter, Service, Booking, Transaction, Request, sequelize, initDatabase } = require('./models/index');
const { Op } = require('sequelize');
const { register, collectHttpMetrics } = require('./src/metrics');

const app = express();
const PORT = 3004;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production';

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3001', 'http://frontend:3001'],
    credentials: true
}));

// Session configuration
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.json());
app.use(collectHttpMetrics);

// Initialize database and create tables
initDatabase();

// JWT middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access token is required' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Health check
app.get('/health', (req, res) => {
    res.status(200).send('Sitter Service OK');
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

// ========================================
// SITTER REGISTRATION & PROFILE ENDPOINTS
// ========================================

// Register as pet sitter
app.post('/register', verifyToken, async (req, res) => {
    try {
        const { id_card_doc, services } = req.body || {};

        // Check if user is already a sitter
        const existingSitter = await Sitter.findOne({ where: { sitter_id: req.user.id } });
        if (existingSitter) {
            return res.status(409).json({ message: 'User is already registered as a sitter' });
        }

        // Create sitter profile (user_id mirrors sitter_id in this service)
        const newSitter = await Sitter.create({
            sitter_id: req.user.id,
            user_id: req.user.id,
            id_card_doc: id_card_doc || null,
            verified: false,
            approval_status: 'pending'
        });

        // Create services if provided
        if (services && Array.isArray(services)) {
            for (const service of services) {
                await Service.create({
                    sitter_id: req.user.id,
                    service_type: service.service_type || service.type,
                    price_per_hour: service.price_per_hour ?? service.price ?? 0,
                    description: service.description || ''
                });
            }
        }

        res.status(201).json({ message: 'Sitter registration successful', sitter: newSitter });
    } catch (error) {
        console.error('Error registering sitter:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get sitter profile
app.get('/profile', verifyToken, async (req, res) => {
    try {
        const sitter = await Sitter.findOne({
            where: { sitter_id: req.user.id },
            include: [
                {
                    model: Service,
                    attributes: ['service_id', 'service_type', 'price_per_hour', 'description', 'availability']
                }
            ]
        });

        if (!sitter) {
            return res.status(404).json({ message: 'Sitter profile not found' });
        }

        res.status(200).json({ sitter });
    } catch (error) {
        console.error('Error fetching sitter profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update sitter profile
app.put('/profile', verifyToken, async (req, res) => {
    try {
        const { bio, experience } = req.body;

        const sitter = await Sitter.findOne({
            where: { sitter_id: req.user.id }
        });

        if (!sitter) {
            return res.status(404).json({ message: 'Sitter profile not found' });
        }

        await sitter.update({
            bio: bio || sitter.bio,
            experience: experience || sitter.experience
        });

        res.status(200).json({
            message: 'Profile updated successfully',
            sitter
        });
    } catch (error) {
        console.error('Error updating sitter profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ========================================
// SERVICE MANAGEMENT ENDPOINTS
// ========================================

// Public: list available services (no auth required)
app.get('/public/services', async (req, res) => {
    try {
        const { service_type, availability } = req.query;

        const whereClause = {};
        if (service_type) whereClause.service_type = service_type;
        if (availability !== undefined) whereClause.availability = availability === 'true';

        const services = await Service.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({ services });
    } catch (error) {
        console.error('Error fetching public services:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Public: get a single service by id (no auth required)
app.get('/public/services/:id', async (req, res) => {
    try {
        const service = await Service.findOne({ where: { service_id: req.params.id } });
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        return res.status(200).json({ service });
    } catch (error) {
        console.error('Error fetching public service by id:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Get sitter services
app.get('/services', verifyToken, async (req, res) => {
    try {
        const services = await Service.findAll({
            where: { sitter_id: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ services });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add new service
app.post('/services', verifyToken, async (req, res) => {
    try {
        const { service_type, price_per_hour, description, availability } = req.body;

        if (!service_type || !price_per_hour) {
            return res.status(400).json({ message: 'Service type and price are required' });
        }

        // Verify sitter exists
        const sitter = await Sitter.findOne({
            where: { sitter_id: req.user.id }
        });

        if (!sitter) {
            return res.status(404).json({ message: 'Sitter profile not found. Please register as a sitter first.' });
        }

        const newService = await Service.create({
            sitter_id: req.user.id,
            service_type,
            price_per_hour,
            description: description || '',
            availability: availability || true
        });

        res.status(201).json({
            message: 'Service added successfully',
            service: newService
        });
    } catch (error) {
        console.error('Error adding service:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update service
app.put('/services/:id', verifyToken, async (req, res) => {
    try {
        const serviceId = req.params.id;
        const { service_type, price_per_hour, description, availability } = req.body;

        const service = await Service.findOne({
            where: { 
                service_id: serviceId,
                sitter_id: req.user.id 
            }
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        await service.update({
            service_type: service_type || service.service_type,
            price_per_hour: price_per_hour || service.price_per_hour,
            description: description || service.description,
            availability: availability !== undefined ? availability : service.availability
        });

        res.status(200).json({
            message: 'Service updated successfully',
            service
        });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete service
app.delete('/services/:id', verifyToken, async (req, res) => {
    try {
        const serviceId = req.params.id;

        const service = await Service.findOne({
            where: { 
                service_id: serviceId,
                sitter_id: req.user.id 
            }
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        await service.destroy();

        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ========================================
// JOB/BOOKING MANAGEMENT ENDPOINTS
// ========================================

// Create a request to contact/engage a sitter (user inquiry)
app.post('/requests', verifyToken, async (req, res) => {
    try {
        const { sitter_id, pet_id, description, preferred_date } = req.body || {};

        if (!pet_id) {
            return res.status(400).json({ message: 'pet_id is required' });
        }

        const request = await Request.create({
            user_id: req.user.id,
            sitter_id: sitter_id || null,
            pet_id: pet_id || null,
            description: description || '',
            preferred_date: preferred_date ? new Date(preferred_date) : null,
            status: 'open'
        });

        return res.status(201).json({ message: 'Request created successfully', request });
    } catch (error) {
        console.error('Error creating request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Get available jobs for sitters
app.get('/jobs', verifyToken, async (req, res) => {
    try {
        const { status, service_type } = req.query;

        let whereClause = {
            status: status || 'pending'
        };

        // Get jobs/bookings that are available
        const jobs = await Booking.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['username', 'full_name', 'phone', 'address']
                },
                {
                    model: Service,
                    where: service_type ? { service_type } : {},
                    required: false,
                    include: [
                        {
                            model: Sitter,
                            include: [
                                {
                                    model: User,
                                    attributes: ['username', 'full_name']
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ jobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Accept a job
app.post('/jobs/:id/accept', verifyToken, async (req, res) => {
    try {
        const bookingId = req.params.id;

        // Verify sitter exists
        const sitter = await Sitter.findOne({
            where: { sitter_id: req.user.id }
        });

        if (!sitter) {
            return res.status(404).json({ message: 'Sitter profile not found' });
        }

        // Check if sitter is approved
        if (sitter.approval_status !== 'approved') {
            return res.status(403).json({ message: 'Sitter account not approved yet' });
        }

        const booking = await Booking.findOne({
            where: { booking_id: bookingId }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Job not found' });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Job is no longer available' });
        }

        // Update booking with sitter assignment
        await booking.update({
            sitter_id: req.user.id,
            status: 'accepted'
        });

        res.status(200).json({
            message: 'Job accepted successfully',
            booking
        });
    } catch (error) {
        console.error('Error accepting job:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get sitter's accepted jobs/bookings
app.get('/my-jobs', verifyToken, async (req, res) => {
    try {
        const { status } = req.query;

        let whereClause = {
            sitter_id: req.user.id
        };

        if (status) {
            whereClause.status = status;
        }

        const myJobs = await Booking.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['username', 'full_name', 'phone', 'address']
                },
                {
                    model: Service,
                    attributes: ['service_type', 'price_per_hour', 'description']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({ 
            jobs: myJobs,
            total: myJobs.length 
        });
    } catch (error) {
        console.error('Error fetching my jobs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update job status
app.put('/jobs/:id/status', verifyToken, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['accepted', 'in_progress', 'completed', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const booking = await Booking.findOne({
            where: { 
                booking_id: bookingId,
                sitter_id: req.user.id 
            }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Job not found or not assigned to you' });
        }

        await booking.update({ status });

        res.status(200).json({
            message: 'Job status updated successfully',
            booking
        });
    } catch (error) {
        console.error('Error updating job status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ========================================
// EARNINGS AND STATISTICS
// ========================================

// Get sitter earnings
app.get('/earnings', verifyToken, async (req, res) => {
    try {
        const { period } = req.query; // daily, weekly, monthly, yearly

        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case 'daily':
                dateFilter = {
                    createdAt: {
                        [Op.gte]: new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    }
                };
                break;
            case 'weekly':
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                dateFilter = {
                    createdAt: {
                        [Op.gte]: weekStart
                    }
                };
                break;
            case 'monthly':
                dateFilter = {
                    createdAt: {
                        [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1)
                    }
                };
                break;
        }

        const completedJobs = await Booking.findAll({
            where: {
                sitter_id: req.user.id,
                status: 'completed',
                ...dateFilter
            },
            include: [
                {
                    model: Service,
                    attributes: ['price_per_hour']
                }
            ]
        });

        const totalEarnings = completedJobs.reduce((total, job) => {
            return total + (job.total_price || 0);
        }, 0);

        res.status(200).json({
            period: period || 'all_time',
            total_earnings: totalEarnings,
            completed_jobs: completedJobs.length,
            jobs: completedJobs
        });
    } catch (error) {
        console.error('Error fetching earnings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get sitter statistics
app.get('/statistics', verifyToken, async (req, res) => {
    try {
        const sitter = await Sitter.findOne({
            where: { sitter_id: req.user.id }
        });

        if (!sitter) {
            return res.status(404).json({ message: 'Sitter profile not found' });
        }

        const totalJobs = await Booking.count({
            where: { sitter_id: req.user.id }
        });

        const completedJobs = await Booking.count({
            where: { 
                sitter_id: req.user.id,
                status: 'completed'
            }
        });

        const activeServices = await Service.count({
            where: { 
                sitter_id: req.user.id,
                availability: true
            }
        });

        res.status(200).json({
            sitter_info: {
                experience: sitter.experience,
                verified: sitter.verified,
                approval_status: sitter.approval_status
            },
            statistics: {
                total_jobs: totalJobs,
                completed_jobs: completedJobs,
                success_rate: totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(2) : 0,
                active_services: activeServices
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ========================================
// ADMIN: APPROVAL MANAGEMENT ENDPOINTS
// ========================================

// List sitters by approval status (default pending)
app.get('/admin/sitters', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.query; // pending|approved|rejected
        const where = {};
        if (status) where.approval_status = status;
        const sitters = await Sitter.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
        console.log('Sitters fetched for admin:', sitters.length);
        return res.status(200).json({ sitters });
    } catch (error) {
        console.error('Error fetching sitters for admin:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Update sitter approval status
app.put('/admin/sitters/:id/status', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params; // sitter_id
        const { status } = req.body || {};
        const allowed = ['pending', 'approved', 'rejected'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const sitter = await Sitter.findOne({ where: { sitter_id: id } });
        if (!sitter) return res.status(404).json({ message: 'Sitter not found' });
        await sitter.update({
            approval_status: status,
            verified: status === 'approved'
        });
        // If approved, also update user role to 'sitter' in auth-service
        if (status === 'approved') {
            try {
                const authUrl = `http://auth-service:3002/api/users/${sitter.user_id || sitter.sitter_id}/role`;
                const resp = await fetch(authUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        // Forward admin's Authorization header
                        'Authorization': req.headers['authorization'] || ''
                    },
                    body: JSON.stringify({ role: 'sitter' })
                });
                if (!resp.ok) {
                    const text = await resp.text().catch(() => '');
                    console.warn('Auth role update failed:', resp.status, text);
                }
            } catch (e) {
                console.warn('Failed to call auth-service to set role sitter:', e.message);
            }
        }
        return res.status(200).json({ message: 'Sitter status updated', sitter });
    } catch (error) {
        console.error('Error updating sitter status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete sitter (admin reject: remove sitter and related services)
app.delete('/admin/sitters/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const sitter = await Sitter.findOne({ where: { sitter_id: id } });
        if (!sitter) return res.status(404).json({ message: 'Sitter not found' });
        // Remove dependent services first for safety
        await Service.destroy({ where: { sitter_id: id } });
        await Sitter.destroy({ where: { sitter_id: id } });
        return res.status(200).json({ message: 'Sitter deleted' });
    } catch (error) {
        console.error('Error deleting sitter:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Sitter Service is running on http://localhost:${PORT}`);
});

module.exports = app;