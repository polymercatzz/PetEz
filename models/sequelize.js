require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
        },
    }
);

// Initialize all models
const User = require('./User')(sequelize);
const PetSitter = require('./PetSitter')(sequelize);
const Pet = require('./Pet')(sequelize);
const Booking = require('./Booking')(sequelize);
const Review = require('./Review')(sequelize);
const Payment = require('./Payment')(sequelize);

// Define associations/relationships

// User associations
User.hasOne(PetSitter, { 
  foreignKey: 'userId', 
  onDelete: 'CASCADE',
  as: 'petSitterProfile'
});

User.hasMany(Pet, { 
  foreignKey: 'userId', 
  onDelete: 'CASCADE',
  as: 'pets'
});

User.hasMany(Booking, { 
  foreignKey: 'userId', 
  onDelete: 'CASCADE',
  as: 'bookings'
});

User.hasMany(Review, { 
  foreignKey: 'userId', 
  onDelete: 'CASCADE',
  as: 'reviews'
});

// PetSitter associations
PetSitter.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

PetSitter.hasMany(Booking, { 
  foreignKey: 'petSitterId', 
  onDelete: 'CASCADE',
  as: 'bookings'
});

PetSitter.hasMany(Review, { 
  foreignKey: 'petSitterId', 
  onDelete: 'CASCADE',
  as: 'reviews'
});

// Pet associations
Pet.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'owner'
});

Pet.hasMany(Booking, { 
  foreignKey: 'petId', 
  onDelete: 'CASCADE',
  as: 'bookings'
});

// Booking associations
Booking.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

Booking.belongsTo(PetSitter, { 
  foreignKey: 'petSitterId',
  as: 'petSitter'
});

Booking.belongsTo(Pet, { 
  foreignKey: 'petId',
  as: 'pet'
});

Booking.hasOne(Review, { 
  foreignKey: 'bookingId', 
  onDelete: 'CASCADE',
  as: 'review'
});

Booking.hasOne(Payment, { 
  foreignKey: 'bookingId', 
  onDelete: 'CASCADE',
  as: 'payment'
});

// Review associations
Review.belongsTo(Booking, { 
  foreignKey: 'bookingId',
  as: 'booking'
});

Review.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

Review.belongsTo(PetSitter, { 
  foreignKey: 'petSitterId',
  as: 'petSitter'
});

// Payment associations
Payment.belongsTo(Booking, { 
  foreignKey: 'bookingId',
  as: 'booking'
});

// Export sequelize instance and models
module.exports = {
  sequelize,
  User,
  PetSitter,
  Pet,
  Booking,
  Review,
  Payment
};