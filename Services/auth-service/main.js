const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { Op } = require('sequelize');
const { User, Pet, initDatabase } = require('./src/models/index');

const app = express();
const PORT = 3002;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production';

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

// Initialize DB and start server later

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

// Routes
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isPasswordValid = await user.checkPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.user_id, 
                email: user.email, 
                username: user.username,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        req.session.user = {
            id: user.user_id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            age: user.age,
            phone: user.phone,
            address: user.address,
            district: user.district,
            province: user.province,
            postal_code: user.postal_code,
            role: user.role,
            loginTime: new Date()
        };
        return res.status(200).json({ 
            message: 'Login successful',
            token: token,
            user: { 
                id: user.user_id, 
                email: user.email, 
                username: user.username,
                full_name: user.full_name,
                age: user.age,
                phone: user.phone,
                address: user.address,
                district: user.district,
                province: user.province,
                postal_code: user.postal_code,
                role: user.role 
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/register', async (req, res) => {
    const { 
        email, 
        password, 
        username, 
        firstName, 
        lastName, 
        age, 
        phone, 
        address, 
        district, 
        province, 
        postalCode 
    } = req.body;
    if (!email || !password || !username) {
        return res.status(400).json({ message: 'Email, username and password are required' });
    }
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
            where: { 
                [require('sequelize').Op.or]: [
                    { email: email },
                    { username: username }
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email or username already exists' });
        }
        const full_name = firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || null);
        const newUser = await User.create({
            email,
            username,
            password,
            full_name,
            age: age ? parseInt(age) : null,
            phone,
            address,
            district,
            province,
            postal_code: postalCode
        });
        return res.status(201).json({ 
            message: 'User registered successfully',
            user: {
                id: newUser.user_id,
                email: newUser.email,
                username: newUser.username,
                full_name: newUser.full_name,
                age: newUser.age,
                phone: newUser.phone,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Error during registration:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: error.errors.map(e => e.message) 
            });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Email or username already exists' });
        }

        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/session', (req, res) => {
    if (req.session.user) {
        return res.status(200).json({ 
            message: 'Session active',
            user: req.session.user
        });
    } else {
        return res.status(401).json({ message: 'No active session' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logout successful' });
    });
});

app.get('/verify', verifyToken, (req, res) => {
    return res.status(200).json({ 
        message: 'Token is valid',
        user: req.user 
    });
});

// Protected route example
app.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['user_id', 'username', 'email', 'full_name', 'age', 'phone', 'address', 'district', 'province', 'postal_code', 'role', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update profile endpoint
app.put('/profile/update', verifyToken, async (req, res) => {
    try {
        const { username, firstName, lastName, age, phone, address, district, province, postalCode } = req.body;
        
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if username is being changed and if it's already taken
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ where: { username } });
            if (existingUser) {
                return res.status(409).json({ message: 'Username already exists' });
            }
        }

        const full_name = firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || null);

        const updateData = {};
        if (username) updateData.username = username;
        if (full_name !== undefined) updateData.full_name = full_name;
        if (age) updateData.age = parseInt(age);
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (district) updateData.district = district;
        if (province) updateData.province = province;
        if (postalCode) updateData.postal_code = postalCode;

        await user.update(updateData);

        // Update session data
        if (req.session.user) {
            req.session.user = {
                ...req.session.user,
                username: user.username,
                full_name: user.full_name
            };
        }

        return res.status(200).json({ 
            message: 'Profile updated successfully',
            user: {
                id: user.user_id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                age: user.age,
                phone: user.phone,
                address: user.address,
                district: user.district,
                province: user.province,
                postal_code: user.postal_code,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: error.errors.map(e => e.message) 
            });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Change password endpoint
app.put('/profile/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.checkPassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Update password (will be hashed by the beforeUpdate hook)
        await user.update({ password: newPassword });

        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: error.errors.map(e => e.message) 
            });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Pet management endpoints

// Get user's pets
app.get('/pets', verifyToken, async (req, res) => {
    try {
        const pets = await Pet.findAll({
            where: { user_id: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({ pets });
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add new pet
app.post('/pets', verifyToken, async (req, res) => {
    try {
        const {
            name,
            type,
            breed,
            age,
            weight,
            behavior,
            food_medicine,
            health_history
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: 'Pet name and type are required' });
        }

        const newPet = await Pet.create({
            user_id: req.user.id,
            name,
            type,
            breed,
            age,
            weight,
            behavior,
            food_medicine,
            health_history
        });

        return res.status(201).json({
            message: 'Pet added successfully',
            pet: newPet
        });
    } catch (error) {
        console.error('Error adding pet:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors.map(e => e.message)
            });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update pet
app.put('/pets/:id', verifyToken, async (req, res) => {
    try {
        const petId = req.params.id;
        const {
            name,
            type,
            breed,
            age,
            weight,
            behavior,
            food_medicine,
            health_history
        } = req.body;

        const pet = await Pet.findOne({
            where: {
                pet_id: petId,
                user_id: req.user.id
            }
        });

        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }

        await pet.update({
            name,
            type,
            breed,
            age,
            weight,
            behavior,
            food_medicine,
            health_history
        });

        return res.status(200).json({
            message: 'Pet updated successfully',
            pet: pet
        });
    } catch (error) {
        console.error('Error updating pet:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.errors.map(e => e.message)
            });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete pet
app.delete('/pets/:id', verifyToken, async (req, res) => {
    try {
        const petId = req.params.id;

        const pet = await Pet.findOne({
            where: {
                pet_id: petId,
                user_id: req.user.id
            }
        });

        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }

        await pet.destroy();

        return res.status(200).json({ message: 'Pet deleted successfully' });
    } catch (error) {
        console.error('Error deleting pet:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/users/all', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            where: { role: { [Op.ne]: 'admin' } },
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all sitters
app.get('/api/sitters/all', async (req, res) => {
    try {
        const sitters = await User.findAll({
            attributes: { exclude: ['password'] },
            where: { role: 'sitter' },
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({ sitters });
    } catch (error) {
        console.error('Error fetching sitters:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update user status (admin)
app.put('/api/users/:id/status', async (req, res) => {
    try {
        const userId = req.params.id;
        const { status } = req.body || {};
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.update({ status });
        const plain = user.get({ plain: true });
        delete plain.password;
        return res.status(200).json({ message: 'Status updated', user: plain });
    } catch (error) {
        console.error('Error updating user status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete user (admin)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.destroy();
        return res.status(200).json({ message: 'User deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        // Possible FK constraint
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Start server after DB initialized
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Auth service is running on http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
