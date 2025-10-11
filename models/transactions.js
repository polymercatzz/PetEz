module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Transaction', {
    transaction_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    booking_id: DataTypes.INTEGER,
    amount: DataTypes.DECIMAL(10,2),
    payment_method: DataTypes.STRING,
    payment_date: DataTypes.DATE,
    status: { type: DataTypes.ENUM('success','failed','refund'), defaultValue: 'success' },
  }, { tableName: 'transactions', timestamps: true });
};
