require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// ตั้งค่าการเชื่อมต่อ MySQL จาก .env
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// โหลดเฉพาะ Transaction model ที่จำเป็นสำหรับ service นี้
db.Transaction = require('./transactions')(sequelize, DataTypes);

module.exports = db;
