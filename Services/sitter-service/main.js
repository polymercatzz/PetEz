const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { User, Pet, Sitter, Service, Booking, Transaction, Request, sequelize, initDatabase } = require('./models/index');
const { Op } = require('sequelize');

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

// Health check
app.get('/health', (req, res) => {
    res.status(200).send('Sitter Service OK');
});

// ========================================
// SITTER REGISTRATION & PROFILE ENDPOINTS
// ========================================

// Register as pet sitter
app.post('/register', verifyToken, async (req, res) => {
    try {
        const { bio, experience, services } = req.body;
        
        if (!bio || !experience) {
            return res.status(400).json({ message: 'Bio and experience are required' });
        }

        // Check if user is already a sitter
        const existingSitter = await Sitter.findOne({
            where: { sitter_id: req.user.id }
        });

        if (existingSitter) {
            return res.status(409).json({ message: 'User is already registered as a sitter' });
        }

        // Create sitter profile
        const newSitter = await Sitter.create({
            sitter_id: req.user.id,
            bio,
            experience,
            verified: false,
            approval_status: 'pending'
        });

        // Create services if provided
        if (services && Array.isArray(services)) {
            for (const service of services) {
                await Service.create({
                    sitter_id: req.user.id,
                    service_type: service.type,
                    price_per_hour: service.price,
                    description: service.description || ''
                });
            }
        }

        res.status(201).json({
            message: 'Sitter registration successful',
            sitter: newSitter
        });
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
                    model: User,
                    attributes: ['email', 'username', 'full_name', 'phone']
                },
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

// Start server
app.listen(PORT, () => {
    console.log(`Sitter Service is running on http://localhost:${PORT}`);
});

module.exports = app;