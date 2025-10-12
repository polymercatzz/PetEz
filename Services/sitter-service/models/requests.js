module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Request', {
    request_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    sitter_id: DataTypes.INTEGER,
    pet_id: DataTypes.INTEGER,
    service_type: DataTypes.STRING,
    description: DataTypes.TEXT,
    preferred_date: DataTypes.DATE,
    status: { type: DataTypes.ENUM('open','accepted','completed','cancelled'), defaultValue: 'open' },
  }, { tableName: 'requests', timestamps: true });
};
