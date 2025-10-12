const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const { register, collectHttpMetrics } = require('./src/metrics');

const app = express();
const PORT = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(collectHttpMetrics);

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'mysql://root:root@mysql-auth:3306/auth_db', {
    dialect: 'mysql',
    logging: false,
    retry: {
        max: 5,
        timeout: 60000,
        match: [
            /ETIMEDOUT/,
            /EHOSTUNREACH/,
            /ECONNRESET/,
            /ECONNREFUSED/,
            /ETIMEDOUT/,
            /ESOCKETTIMEDOUT/,
            /EHOSTUNREACH/,
            /EPIPE/,
            /EAI_AGAIN/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/
        ]
    }
});

// Booking Model (aligned to existing DB columns)
const Booking = sequelize.define('Booking', {
    booking_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    sitter_id: DataTypes.INTEGER,
    service_id: DataTypes.INTEGER,
    pet_id: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    total_price: DataTypes.DECIMAL(10,2),
    status: { type: DataTypes.ENUM('pending','confirmed','completed','cancelled'), defaultValue: 'pending' },
    payment_status: { type: DataTypes.ENUM('unpaid','paid','refunded'), defaultValue: 'unpaid' },
}, { tableName: 'bookings', timestamps: true });

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('JWT verification error:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        console.log('JWT verification successful for user:', user.id);
        req.user = user;
        next();
    });
};

// Test database connection
async function connectToDatabase() {
    let retries = 5;
    while (retries) {
        try {
            await sequelize.authenticate();
            console.log('Database connection established successfully.');
            await sequelize.sync();
            console.log('Database synced successfully.');
            break;
        } catch (error) {
            console.log(`Unable to connect to the database. Retrying... ${error.message}`);
            retries -= 1;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Booking service is working', timestamp: new Date().toISOString() });
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

// Get all bookings for a user
app.get('/bookings', authenticateToken, async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            where: { user_id: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json({ bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Get booking by ID
app.get('/bookings/:id', authenticateToken, async (req, res) => {
    try {
        const booking = await Booking.findOne({
            where: { 
                booking_id: req.params.id,
                user_id: req.user.id
            }
        });
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        
        res.json({ booking });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ message: 'Error fetching booking' });
    }
});

// Create new booking
app.post('/bookings', authenticateToken, async (req, res) => {
    try {
        const {
            pet_id,
            start_date,
            end_date,
            sitter_id,
            price_per_hour,
            // extra fields are ignored if not present in schema
        } = req.body;

        // Calculate total hours and price
        const startDateTime = new Date(start_date);
        const endDateTime = new Date(end_date);
        const hours = Math.max(0, Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60)));
        const hourlyRate = parseFloat(price_per_hour) > 0 ? parseFloat(price_per_hour) : 50.00; // allow override from selected service
        const total_price = hours * hourlyRate;

        const booking = await Booking.create({
            user_id: req.user.id,
            pet_id,
            sitter_id: sitter_id || null,
            service_id: req.body.service_id || null,
            start_date: startDateTime,
            end_date: endDateTime,
            total_price,
            status: 'pending'
        });

        res.status(201).json({ 
            message: 'Booking created successfully', 
            booking 
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Error creating booking' });
    }
});

// Update booking
app.put('/bookings/:id', authenticateToken, async (req, res) => {
    try {
        const booking = await Booking.findOne({
            where: { 
                booking_id: req.params.id,
                user_id: req.user.id
            }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

    const { start_date, end_date, status, price_per_hour } = req.body;

        // Recalculate if dates changed
        let updateData = { status };

        if (start_date && end_date) {
            const startDateTime = new Date(start_date);
            const endDateTime = new Date(end_date);
            const hours = Math.max(0, Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60)));
            const hourlyRate = parseFloat(price_per_hour) > 0 ? parseFloat(price_per_hour) : 50.00; // recompute with provided price if any
            updateData = {
                ...updateData,
                start_date: startDateTime,
                end_date: endDateTime,
                total_price: hours * hourlyRate,
            };
        }

        await booking.update(updateData);
        
        res.json({ 
            message: 'Booking updated successfully', 
            booking 
        });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ message: 'Error updating booking' });
    }
});

// Cancel booking
app.delete('/bookings/:id', authenticateToken, async (req, res) => {
    try {
        const booking = await Booking.findOne({
            where: { 
                booking_id: req.params.id,
                user_id: req.user.id
            }
        });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        await booking.update({ status: 'cancelled' });
        
        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'Error cancelling booking' });
    }
});

// Start server
connectToDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Booking service is running on http://0.0.0.0:${PORT}`);
    });
});

// Admin: Get all bookings
app.get('/admin/bookings', authenticateToken, async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json({ bookings });
    } catch (error) {
        console.error('Error fetching all bookings (admin):', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Admin: Update booking status
app.put('/admin/bookings/:id/status', authenticateToken, async (req, res) => {
    try {
    const { status } = req.body || {};
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const booking = await Booking.findOne({ where: { booking_id: req.params.id } });
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        await booking.update({ status });
        return res.json({ message: 'Status updated successfully', booking });
    } catch (error) {
        console.error('Error updating booking status (admin):', error);
        res.status(500).json({ message: 'Error updating booking status' });
    }
});