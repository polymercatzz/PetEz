module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Service', {
    service_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sitter_id: { type: DataTypes.INTEGER, allowNull: false },
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    price_per_day: DataTypes.DECIMAL(10,2),
    duration_hours: DataTypes.INTEGER,
    available_days: DataTypes.STRING,
  }, { tableName: 'services', timestamps: true });
};
