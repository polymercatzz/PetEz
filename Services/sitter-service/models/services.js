module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Service', {
    service_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sitter_id: { type: DataTypes.INTEGER, allowNull: false },
    service_type: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    price_per_hour: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
    availability: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'services', timestamps: true });
};
