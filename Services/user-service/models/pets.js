module.exports = (sequelize, DataTypes) => {
  const Pet = sequelize.define('Pet', {
    pet_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: DataTypes.STRING,
    species: DataTypes.STRING,
  }, { tableName: 'pets', timestamps: true });
  return Pet;
};