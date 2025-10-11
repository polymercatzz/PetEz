const sequelize = require('../config/sequelize');
const { DataTypes } = require('sequelize');

// Import model definitions
const UserModel = require('./users');
const PetModel = require('./pets');

// Initialize models
const User = UserModel(sequelize, DataTypes);
const Pet = PetModel(sequelize, DataTypes);

// Define associations
User.hasMany(Pet, { foreignKey: 'user_id', as: 'pets' });
Pet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sync database (create tables if they don't exist)
const initDatabase = async () => {
  let retries = 5;
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      
      // Sync all models - force true will drop and recreate tables
      await sequelize.sync({ force: false, alter: true });
      console.log('Database synced successfully.');
      break;
    } catch (error) {
      console.error('Unable to connect to the database. Retrying...', error.message);
      retries--;
      if (retries === 0) {
        console.error('Failed to connect to database after multiple attempts');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
    }
  }
};

module.exports = {
  sequelize,
  User,
  Pet,
  initDatabase
};