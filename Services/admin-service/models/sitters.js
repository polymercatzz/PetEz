module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Sitter', {
    sitter_id: { type: DataTypes.INTEGER, primaryKey: true },
    bio: DataTypes.TEXT,
    experience: DataTypes.INTEGER,
    id_card_doc: DataTypes.STRING,
    verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    approval_status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  }, { tableName: 'sitters', timestamps: true });
};
