'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tbl_SpecialFoodItem', 'expiry_time', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Optional expiry time for ordering deadline'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tbl_SpecialFoodItem', 'expiry_time');
  }
};