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

// ✅ โหลดเฉพาะ models ที่เกี่ยวข้องกับ sitter service
db.Sitter = require('./sitters')(sequelize, DataTypes);
db.Service = require('./services')(sequelize, DataTypes);
db.Request = require('./requests')(sequelize, DataTypes);

// ======================================================
// 🧩 RELATIONS ทั้งหมด
// ======================================================

// Relations เฉพาะที่จำเป็นใน service นี้
db.Sitter.hasMany(db.Service, { foreignKey: 'sitter_id', onDelete: 'CASCADE' });
db.Service.belongsTo(db.Sitter, { foreignKey: 'sitter_id' });

db.Sitter.hasMany(db.Request, { foreignKey: 'sitter_id', onDelete: 'SET NULL' });
db.Request.belongsTo(db.Sitter, { foreignKey: 'sitter_id' });

// Sync database (create tables if they don't exist)
const initDatabase = async () => {
  let retries = 5;
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('Sitter Service: Database connection established successfully.');
      
      // Sync all models - force false will not drop existing tables
      await sequelize.sync({ force: false, alter: true });
      console.log('Sitter Service: Database synced successfully.');
      break;
    } catch (error) {
      console.error('Sitter Service: Unable to connect to the database. Retrying...', error.message);
      retries--;
      if (retries === 0) {
        console.error('Sitter Service: Failed to connect to database after multiple attempts');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
    }
  }
};

db.initDatabase = initDatabase;

module.exports = db;
