require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// ✅ ตั้งค่าการเชื่อมต่อ MySQL จาก .env
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false, // ปิด log SQL
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// ✅ โหลด models ทั้งหมด
db.User = require('./users')(sequelize, DataTypes);
db.Pet = require('./pets')(sequelize, DataTypes);
db.Sitter = require('./sitters')(sequelize, DataTypes);
db.Service = require('./services')(sequelize, DataTypes);
db.Booking = require('./bookings')(sequelize, DataTypes);
db.Transaction = require('./transactions')(sequelize, DataTypes);
db.Request = require('./requests')(sequelize, DataTypes);

// ======================================================
// 🧩 RELATIONS ทั้งหมด
// ======================================================

// 1. User ↔ Pet
db.User.hasMany(db.Pet, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Pet.belongsTo(db.User, { foreignKey: 'user_id' });

// 2. User ↔ Booking
db.User.hasMany(db.Booking, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Booking.belongsTo(db.User, { foreignKey: 'user_id' });

// 3. Sitter ↔ User
db.Sitter.belongsTo(db.User, { foreignKey: 'sitter_id', onDelete: 'CASCADE' });

// 4. Sitter ↔ Service
db.Sitter.hasMany(db.Service, { foreignKey: 'sitter_id', onDelete: 'CASCADE' });
db.Service.belongsTo(db.Sitter, { foreignKey: 'sitter_id' });

// 5. Service ↔ Booking
db.Service.hasMany(db.Booking, { foreignKey: 'service_id', onDelete: 'CASCADE' });
db.Booking.belongsTo(db.Service, { foreignKey: 'service_id' });

// 6. Sitter ↔ Booking
db.Sitter.hasMany(db.Booking, { foreignKey: 'sitter_id', onDelete: 'CASCADE' });
db.Booking.belongsTo(db.Sitter, { foreignKey: 'sitter_id' });

// 7. Pet ↔ Booking
db.Pet.hasMany(db.Booking, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
db.Booking.belongsTo(db.Pet, { foreignKey: 'pet_id' });

// 8. Booking ↔ Transaction
db.Booking.hasOne(db.Transaction, { foreignKey: 'booking_id', onDelete: 'CASCADE' });
db.Transaction.belongsTo(db.Booking, { foreignKey: 'booking_id' });

// 9. User ↔ Request
db.User.hasMany(db.Request, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Request.belongsTo(db.User, { foreignKey: 'user_id' });

// 10. Sitter ↔ Request
db.Sitter.hasMany(db.Request, { foreignKey: 'sitter_id', onDelete: 'SET NULL' });
db.Request.belongsTo(db.Sitter, { foreignKey: 'sitter_id' });

// 11. Pet ↔ Request
db.Pet.hasMany(db.Request, { foreignKey: 'pet_id', onDelete: 'CASCADE' });
db.Request.belongsTo(db.Pet, { foreignKey: 'pet_id' });

module.exports = db;
