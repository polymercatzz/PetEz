const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    full_name: DataTypes.STRING,
    age: { type: DataTypes.INTEGER },
    phone: DataTypes.STRING,
    email: { type: DataTypes.STRING, allowNull: false },
    address: DataTypes.TEXT,
    district: DataTypes.STRING,
    province: DataTypes.STRING,
    postal_code: DataTypes.STRING,
    role: { type: DataTypes.ENUM('user', 'sitter', 'admin'), defaultValue: 'user' },
    status: { type: DataTypes.ENUM('active', 'suspended'), defaultValue: 'active' },
  }, { 
    tableName: 'users', 
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  // Instance method to check password
  User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  return User;
};
