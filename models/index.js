// Export all models from a single entry point
const {
  sequelize,
  User,
  PetSitter,
  Pet,
  Booking,
  Review,
  Payment
} = require('./sequelize');

module.exports = {
  sequelize,
  User,
  PetSitter,
  Pet,
  Booking,
  Review,
  Payment
};