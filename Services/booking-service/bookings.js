module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Booking', {
    booking_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    sitter_id: DataTypes.INTEGER,
    service_id: DataTypes.INTEGER,
    pet_id: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    total_price: DataTypes.DECIMAL(10,2),
    status: { type: DataTypes.ENUM('pending','confirmed','completed','cancelled'), defaultValue: 'pending' },
    payment_status: { type: DataTypes.ENUM('unpaid','paid','refunded'), defaultValue: 'unpaid' },
  }, { tableName: 'bookings', timestamps: true });
};
