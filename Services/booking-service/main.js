const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware
app.use(cors());
app.use(express.json());

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

// Booking Model
const Booking = sequelize.define('Booking', {
    booking_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    pet_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'pets',
            key: 'pet_id'
        }
    },
    sitter_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Can be null if no sitter assigned yet
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    total_hours: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    service_type: {
        type: DataTypes.ENUM('sitting', 'walking', 'boarding', 'grooming'),
        allowNull: false,
        defaultValue: 'sitting'
    },
    special_instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    price_per_hour: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50.00
    },
    total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
    },
    emergency_contact: {
        type: DataTypes.STRING(20),
        allowNull: true
    }
}, {
    tableName: 'bookings',
    timestamps: true
});

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
            service_type,
            special_instructions,
            location,
            price_per_hour,
            emergency_contact
        } = req.body;

        // Calculate total hours and price
        const startDateTime = new Date(start_date);
        const endDateTime = new Date(end_date);
        const total_hours = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60));
        const hourly_rate = price_per_hour || 50.00;
        const total_price = total_hours * hourly_rate;

        const booking = await Booking.create({
            user_id: req.user.id,
            pet_id,
            start_date: startDateTime,
            end_date: endDateTime,
            total_hours,
            service_type: service_type || 'sitting',
            special_instructions,
            location,
            price_per_hour: hourly_rate,
            total_price,
            emergency_contact,
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

        const {
            start_date,
            end_date,
            service_type,
            special_instructions,
            location,
            price_per_hour,
            emergency_contact,
            status
        } = req.body;

        // Recalculate if dates changed
        let updateData = {
            service_type,
            special_instructions,
            location,
            emergency_contact,
            status
        };

        if (start_date && end_date) {
            const startDateTime = new Date(start_date);
            const endDateTime = new Date(end_date);
            const total_hours = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60));
            const hourly_rate = price_per_hour || booking.price_per_hour;
            
            updateData = {
                ...updateData,
                start_date: startDateTime,
                end_date: endDateTime,
                total_hours,
                price_per_hour: hourly_rate,
                total_price: total_hours * hourly_rate
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
    app.listen(PORT, () => {
        console.log(`Booking service is running on http://localhost:${PORT}`);
    });
});