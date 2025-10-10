'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tbl_users', 'google_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    
    await queryInterface.addColumn('tbl_users', 'profile_picture', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tbl_users', 'google_id');
    await queryInterface.removeColumn('tbl_users', 'profile_picture');
  }
};
