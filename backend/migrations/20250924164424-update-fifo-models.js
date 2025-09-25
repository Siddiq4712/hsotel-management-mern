'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Data migration for InventoryBatch
      await queryInterface.addColumn('tbl_InventoryBatch', 'quantity_purchased', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00, // Temporary default for migration
        comment: 'Original quantity purchased in this batch',
      }, { transaction });
      await queryInterface.sequelize.query(
        'UPDATE tbl_InventoryBatch SET quantity_purchased = quantity_remaining WHERE quantity_purchased = 0',
        { transaction }
      );
      await queryInterface.addColumn('tbl_InventoryBatch', 'expiry_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Optional expiry date for perishable items',
      }, { transaction });
      await queryInterface.addColumn('tbl_InventoryBatch', 'status', {
        type: Sequelize.ENUM('active', 'depleted', 'expired'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Batch status for FIFO management',
      }, { transaction });
      await queryInterface.sequelize.query(
        'UPDATE tbl_InventoryBatch SET status = "active" WHERE status IS NULL',
        { transaction }
      );
      await queryInterface.addIndex('tbl_InventoryBatch', ['item_id', 'hostel_id', 'purchase_date'], { transaction });
      await queryInterface.addIndex('tbl_InventoryBatch', ['status'], { transaction });

      // Data migration for ConsumptionLog
      await queryInterface.addColumn('tbl_ConsumptionLog', 'meal_type', {
        type: Sequelize.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
        allowNull: false,
        defaultValue: 'lunch', // Temporary default for migration
        comment: 'Meal type for which this consumption was recorded',
      }, { transaction });
      await queryInterface.sequelize.query(
        'UPDATE tbl_ConsumptionLog SET meal_type = "lunch" WHERE meal_type IS NULL',
        { transaction }
      );
      await queryInterface.addIndex('tbl_ConsumptionLog', ['daily_consumption_id'], { transaction });
      await queryInterface.addIndex('tbl_ConsumptionLog', ['batch_id'], { transaction });

      // Data migration for ItemStock
      await queryInterface.addColumn('tbl_ItemStock', 'last_purchase_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date of the most recent batch purchase',
      }, { transaction });

      // Data migration for DailyConsumption
      const uomMapping = {
        'kg': 1, // Replace with actual UOM ID for 'kg'
        'liter': 2, // Replace with actual UOM ID for 'liter'
        // Add other mappings
      };
      for (const [uomName, uomId] of Object.entries(uomMapping)) {
        await queryInterface.sequelize.query(
          'UPDATE tbl_DailyConsumption SET unit = :uomId WHERE unit = :uomName',
          { replacements: { uomId, uomName }, transaction }
        );
      }
      await queryInterface.changeColumn('tbl_DailyConsumption', 'unit', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tbl_UOM', key: 'id' },
        comment: 'Unit of measurement (linked to UOM)',
      }, { transaction });
      await queryInterface.addColumn('tbl_DailyConsumption', 'total_cost', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total cost of consumption based on FIFO batches',
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Revert InventoryBatch
      await queryInterface.removeColumn('tbl_InventoryBatch', 'quantity_purchased', { transaction });
      await queryInterface.removeColumn('tbl_InventoryBatch', 'expiry_date', { transaction });
      await queryInterface.removeColumn('tbl_InventoryBatch', 'status', { transaction });
      await queryInterface.removeIndex('tbl_InventoryBatch', ['item_id', 'hostel_id', 'purchase_date'], { transaction });
      await queryInterface.removeIndex('tbl_InventoryBatch', ['status'], { transaction });

      // Revert ConsumptionLog
      await queryInterface.removeColumn('tbl_ConsumptionLog', 'meal_type', { transaction });
      await queryInterface.removeIndex('tbl_ConsumptionLog', ['daily_consumption_id'], { transaction });
      await queryInterface.removeIndex('tbl_ConsumptionLog', ['batch_id'], { transaction });

      // Revert ItemStock
      await queryInterface.removeColumn('tbl_ItemStock', 'last_purchase_date', { transaction });

      // Revert DailyConsumption
      await queryInterface.changeColumn('tbl_DailyConsumption', 'unit', {
        type: Sequelize.STRING,
        allowNull: false,
      }, { transaction });
      await queryInterface.removeColumn('tbl_DailyConsumption', 'total_cost', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};