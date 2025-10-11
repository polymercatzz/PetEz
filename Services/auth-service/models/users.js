module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    full_name: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    address: DataTypes.TEXT,
    district: DataTypes.STRING,
    province: DataTypes.STRING,
    postal_code: DataTypes.STRING,
    role: { type: DataTypes.ENUM('user', 'sitter', 'admin'), defaultValue: 'user' },
    status: { type: DataTypes.ENUM('active', 'suspended'), defaultValue: 'active' },
  }, { tableName: 'users', timestamps: true });
};
