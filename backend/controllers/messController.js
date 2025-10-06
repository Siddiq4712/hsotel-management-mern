const ExcelJS = require('exceljs');
const {
  Menu, Item, ItemCategory, User, MenuItem, Hostel, Attendance, Enrollment, DailyMessCharge,
  MenuSchedule, UOM, ItemStock, DailyConsumption, MessBill,Session, CreditToken,Concern,
  Store, ItemStore, InventoryTransaction, ConsumptionLog, IncomeType, AdditionalIncome, StudentFee,
  InventoryBatch, SpecialFoodItem, FoodOrder, FoodOrderItem, MessDailyExpense, ExpenseType, SpecialConsumption, SpecialConsumptionItem,Newspaper
} = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment');
// const { getSessions } = require('./wardenController');

// Custom rounding function: <= 0.20 rounds down, > 0.20 rounds up
function customRounding(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;

  const integerPart = Math.floor(num);
  const fractionalPart = num - integerPart;

  if (fractionalPart <= 0.20) {
    return integerPart;
  } else {
    return Math.ceil(num);
  }
}
const UNIVERSAL_ROUNDING_INCOME_TYPE_NAME = 'Rounding Adjustments';
const MENU_ROUNDING_INCOME_TYPE_NAME = 'Menu Rounding Adjustments';
const DAILY_CHARGE_ROUNDING_INCOME_TYPE_NAME = 'Daily Charge Calculation Adjustments';

// MENU MANAGEMENT - Complete CRUD
const createMenu = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, meal_type, description, estimated_servings, preparation_time, items } = req.body;
    const hostel_id = req.user.hostel_id;

    console.log('Received menu data:', req.body); // Debug log

    if (!name || !meal_type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Name and meal type are required'
      });
    }

    // Step 1: Create the main menu record
    const menu = await Menu.create({
      hostel_id,
      name,
      meal_type,
      description,
      estimated_servings,
      preparation_time,
      date: new Date()
    }, { transaction });

    // Step 2: If ingredients (items) are provided, create them
    if (items && Array.isArray(items) && items.length > 0) {
      // Fetch all UOM records to map abbreviations to IDs
      const uomRecords = await UOM.findAll({}, { transaction });
      const uomMap = {};

      // Create a map of abbreviation to ID for quick lookup
      uomRecords.forEach(uom => {
        uomMap[uom.abbreviation.toLowerCase()] = uom.id;
      });

      // Process the menu items
      const menuItems = items.map(item => {
        // Convert the unit abbreviation to unit_id
        let unit_id = null;

        if (item.unit && typeof item.unit === 'string') {
          unit_id = uomMap[item.unit.toLowerCase()];
        }

        // If unit_id wasn't found, use a default (you might want to handle this differently)
        if (!unit_id) {
          console.warn(`No UOM found for abbreviation: ${item.unit}`);
          // Use the first UOM as a fallback
          unit_id = uomRecords.length > 0 ? uomRecords[0].id : 1;
        }

        return {
          menu_id: menu.id,
          item_id: item.item_id,
          quantity: item.quantity,
          unit_id: unit_id, // Use the mapped unit_id instead of the unit string
          preparation_notes: item.preparation_notes || ''
        };
      });

      // Log the items being created for debugging
      console.log('Creating menu items:', menuItems);

      await MenuItem.bulkCreate(menuItems, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: menu,
      message: 'Menu and its items created successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Menu creation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      originalError: error.original ? {
        message: error.original.message,
        code: error.original.code
      } : 'No original error'
    });
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// GET MENUS
const getMenus = async (req, res) => {
  try {
    const { meal_type, search } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (meal_type && meal_type !== 'all') {
      whereClause.meal_type = meal_type;
    }

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const menus = await Menu.findAll({
      where: whereClause,
      include: [
        {
          model: MenuItem,
          as: 'tbl_Menu_Items',
          required: false,
          include: [
            {
              model: Item,
              as: 'tbl_Item',
              required: false,
              include: [
                {
                  model: ItemCategory,
                  as: 'tbl_ItemCategory',
                  required: false,
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: menus });
  } catch (error) {
    console.error('Menus fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    const menu = await Menu.findOne({
      where: { id, hostel_id },
      include: [
        {
          model: MenuItem,
          as: 'tbl_Menu_Items',
          include: [
            {
              model: Item,
              as: 'tbl_Item',
              include: [{
                model: ItemCategory,
                as: 'tbl_ItemCategory'
              }]
            }
          ]
        }
      ]
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    res.json({ success: true, data: menu });
  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, meal_type, description, estimated_servings, preparation_time } = req.body;
    const hostel_id = req.user.hostel_id;

    const menu = await Menu.findOne({
      where: { id, hostel_id }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    await menu.update({
      name,
      meal_type,
      description,
      estimated_servings,
      preparation_time
    });

    res.json({
      success: true,
      data: menu,
      message: 'Menu updated successfully'
    });
  } catch (error) {
    console.error('Menu update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    const menu = await Menu.findOne({
      where: { id, hostel_id }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    // Delete associated menu items first
    await MenuItem.destroy({ where: { menu_id: id } });
    await menu.destroy();

    res.json({
      success: true,
      message: 'Menu deleted successfully'
    });
  } catch (error) {
    console.error('Menu deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ITEM MANAGEMENT - Complete CRUD
const createItem = async (req, res) => {
  try {
    const { name, category_id, unit_price, unit_id, description } = req.body;

    if (!name || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required'
      });
    }

    const item = await Item.create({
      name,
      category_id,
      unit_price: unit_price || 0,
      unit_id,
      description
    });

    const itemWithCategory = await Item.findByPk(item.id, {
      include: [
        {
          model: ItemCategory,
          as: 'tbl_ItemCategory'
        },
        {
          model: UOM,
          as: 'UOM',
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: itemWithCategory,
      message: 'Item created successfully'
    });
  } catch (error) {
    console.error('Item creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getItems = async (req, res) => {
  try {
    const { category_id, search } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = {};

    if (category_id && category_id !== 'all') {
      whereClause.category_id = category_id;
    }

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    // First, get all the items
    const items = await Item.findAll({
      where: whereClause,
      include: [
        {
          model: ItemCategory,
          as: 'tbl_ItemCategory'
        },
        {
          model: UOM,
          as: 'UOM',
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    // Get the latest stock entry for each item
    const itemIds = items.map(item => item.id);

    // Query to get the latest stock for each item
    const latestStocks = await sequelize.query(`
      WITH RankedStocks AS (
        SELECT 
          id, item_id, current_stock, minimum_stock, last_purchase_date,
          ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY updatedAt DESC) as rn
        FROM tbl_ItemStock
        WHERE hostel_id = :hostel_id AND item_id IN (:itemIds)
      )
      SELECT * FROM RankedStocks WHERE rn = 1
    `, {
      replacements: { hostel_id, itemIds },
      type: sequelize.QueryTypes.SELECT,
      raw: true
    });

    // Create a map for quick lookup of stock data
    const stockMap = {};
    latestStocks.forEach(stock => {
      stockMap[stock.item_id] = {
        current_stock: parseFloat(stock.current_stock),
        minimum_stock: parseFloat(stock.minimum_stock),
        last_purchase_date: stock.last_purchase_date
      };
    });

    // Format the response with the latest stock data
    const formattedItems = items.map(item => {
      const itemJSON = item.toJSON();
      const stockData = stockMap[item.id] || { current_stock: 0, minimum_stock: 0, last_purchase_date: null };

      return {
        ...itemJSON,
        stock_quantity: stockData.current_stock,
        minimum_stock: stockData.minimum_stock,
        last_purchase_date: stockData.last_purchase_date
      };
    });

    res.json({ success: true, data: formattedItems });
  } catch (error) {
    console.error('Items fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id, {
      include: [
        {
          model: ItemCategory,
          as: 'tbl_ItemCategory'
        },
        {
          model: UOM,
          as: 'UOM',
          required: false
        }
      ]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Item fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, unit_price, unit_id, description } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    await item.update({
      name,
      category_id,
      unit_price,
      unit_id,
      description
    });

    const updatedItem = await Item.findByPk(id, {
      include: [
        {
          model: ItemCategory,
          as: 'tbl_ItemCategory'
        },
        {
          model: UOM,
          as: 'UOM',
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully'
    });
  } catch (error) {
    console.error('Item update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if item is being used in menus
    const menuItemCount = await MenuItem.count({ where: { item_id: id } });
    if (menuItemCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete item that is being used in menus'
      });
    }

    await item.destroy();
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Item deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ITEM CATEGORY MANAGEMENT - Complete CRUD
const createItemCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const category = await ItemCategory.create({
      name,
      description
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getItemCategories = async (req, res) => {
  try {
    const { search } = req.query;

    let whereClause = {};

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const categories = await ItemCategory.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateItemCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await ItemCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await category.update({
      name,
      description
    });

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteItemCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ItemCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category is being used
    const itemCount = await Item.count({ where: { category_id: id } });
    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that is being used by items'
      });
    }

    await category.destroy();
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Category deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MENU ITEM MANAGEMENT - Complete CRUD
const addItemsToMenu = async (req, res) => {
  try {
    const { menu_id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    // Verify menu belongs to user's hostel
    const menu = await Menu.findOne({
      where: { id: menu_id, hostel_id: req.user.hostel_id }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    const menuItems = await MenuItem.bulkCreate(
      items.map(item => ({
        menu_id: parseInt(menu_id),
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit,
        preparation_notes: item.preparation_notes
      }))
    );

    res.status(201).json({
      success: true,
      data: menuItems,
      message: 'Items added to menu successfully'
    });
  } catch (error) {
    console.error('Menu items creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMenuWithItems = async (req, res) => {
  try {
    const { menu_id } = req.params;
    const hostel_id = req.user.hostel_id;

    const menu = await Menu.findOne({
      where: { id: menu_id, hostel_id },
      include: [
        {
          model: MenuItem,
          as: 'tbl_Menu_Items',
          include: [
            {
              model: Item,
              as: 'tbl_Item',
              include: [{
                model: ItemCategory,
                as: 'tbl_ItemCategory'
              }]
            }
          ]
        }
      ]
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    res.json({
      success: true,
      data: {
        menu: menu,
        menu_items: menu.tbl_Menu_Items || []
      }
    });
  } catch (error) {
    console.error('Menu with items fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const removeItemFromMenu = async (req, res) => {
  try {
    const { menu_id, item_id } = req.params;

    // Verify menu belongs to user's hostel
    const menu = await Menu.findOne({
      where: { id: menu_id, hostel_id: req.user.hostel_id }
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    const deleted = await MenuItem.destroy({
      where: {
        menu_id: parseInt(menu_id),
        item_id: parseInt(item_id)
      }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from menu successfully'
    });
  } catch (error) {
    console.error('Menu item deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MENU SCHEDULING
const scheduleMenu = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { menu_id, scheduled_date, meal_time } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!menu_id || !scheduled_date || !meal_time) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Menu ID, date, and meal time are required' });
    }

    const menu = await Menu.findOne({
      where: { id: menu_id, hostel_id },
      include: [{ model: MenuItem, as: 'tbl_Menu_Items', include: [{ model: Item, as: 'tbl_Item', attributes: ['id', 'name', 'unit_price'] }] }],
      transaction
    });

    if (!menu) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    const menuEstimatedServings = menu.estimated_servings;
    if (menuEstimatedServings <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'The selected menu has zero or invalid estimated servings. Please update the menu.' });
    }

    let total_cost = 0; // This will store the RAW total cost of ingredients
    if (menu.tbl_Menu_Items && menu.tbl_Menu_Items.length > 0) {
      total_cost = menu.tbl_Menu_Items.reduce((sum, menuItem) => {
        const itemPrice = parseFloat(menuItem.tbl_Item.unit_price) || 0;
        const itemQuantity = parseFloat(menuItem.quantity) || 0;
        return sum + (itemPrice * itemQuantity);
      }, 0);
    }

    // At scheduling time, cost_per_serving is just an initial estimate (raw, unrounded)
    const initial_raw_cost_per_serving = total_cost / menuEstimatedServings;

    const schedule = await MenuSchedule.create({
      hostel_id,
      menu_id,
      scheduled_date,
      meal_time,
      status: 'scheduled',
      estimated_servings: menuEstimatedServings,
      total_cost: total_cost, // Store RAW total cost
      cost_per_serving: initial_raw_cost_per_serving, // Store RAW cost per serving initially
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ success: true, data: schedule, message: 'Menu scheduled successfully with initial cost calculation' });
  } catch (error) {
    await transaction.rollback();
    console.error('Schedule menu error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// getMenuSchedule
const getMenuSchedule = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (start_date && end_date) {
      whereClause.scheduled_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const schedules = await MenuSchedule.findAll({
      where: whereClause,
      include: [
        {
          model: Menu,
          include: [
            {
              model: MenuItem,
              as: 'tbl_Menu_Items',
              required: false,
              include: [
                {
                  model: Item,
                  as: 'tbl_Item',
                  required: false,
                  include: [
                    {
                      model: ItemCategory,
                      as: 'tbl_ItemCategory',
                      required: false,
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      order: [['scheduled_date', 'DESC'], ['meal_time', 'ASC']]
    });

    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Get menu schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMenuSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { menu_id, meal_time, estimated_servings, status } = req.body;
    const hostel_id = req.user.hostel_id;

    const schedule = await MenuSchedule.findOne({ where: { id, hostel_id } });
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    // Recalculate cost if menu or servings change
    let total_cost = schedule.total_cost;
    let cost_per_serving = schedule.cost_per_serving;

    if (estimated_servings > 0 && (schedule.menu_id !== menu_id || schedule.estimated_servings !== estimated_servings)) {
      const menu = await Menu.findOne({
        where: { id: menu_id, hostel_id },
        include: [{ model: MenuItem, as: 'tbl_Menu_Items', include: [{ model: Item, as: 'tbl_Item' }] }]
      });
      if (menu) {
        total_cost = menu.tbl_Menu_Items.reduce((sum, item) => sum + (parseFloat(item.tbl_Item.unit_price || 0) * parseFloat(item.quantity)), 0);
        cost_per_serving = total_cost / estimated_servings;
      }
    }

    await schedule.update({
      menu_id,
      meal_time,
      status,
      estimated_servings,
      total_cost,
      cost_per_serving
    });

    res.json({ success: true, data: schedule, message: "Schedule updated successfully" });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteMenuSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    const result = await MenuSchedule.destroy({ where: { id, hostel_id } });

    if (result === 0) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }
    res.json({ success: true, message: "Schedule deleted successfully" });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// UOM MANAGEMENT
const createUOM = async (req, res) => {
  try {
    const { name, abbreviation, type } = req.body;

    if (!name || !abbreviation || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, abbreviation, and type are required'
      });
    }

    const uom = await UOM.create({
      name,
      abbreviation,
      type
    });

    res.status(201).json({
      success: true,
      data: uom,
      message: 'UOM created successfully'
    });
  } catch (error) {
    console.error('UOM creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUOMs = async (req, res) => {
  try {
    const { type } = req.query;

    let whereClause = {};

    if (type && type !== 'all') {
      whereClause.type = type;
    }

    const uoms = await UOM.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: uoms
    });
  } catch (error) {
    console.error('Get UOMs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateUOM = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, abbreviation, type } = req.body;

    const uom = await UOM.findByPk(id);
    if (!uom) {
      return res.status(404).json({
        success: false,
        message: 'UOM not found'
      });
    }

    await uom.update({ name, abbreviation, type });

    res.json({
      success: true,
      data: uom,
      message: 'UOM updated successfully'
    });
  } catch (error) {
    console.error('UOM update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteUOM = async (req, res) => {
  try {
    const { id } = req.params;

    const uom = await UOM.findByPk(id);
    if (!uom) {
      return res.status(404).json({
        success: false,
        message: 'UOM not found'
      });
    }

    // Check if UOM is being used
    const itemCount = await Item.count({ where: { unit_id: id } });

    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete UOM that is being used'
      });
    }

    await uom.destroy();
    res.json({
      success: true,
      message: 'UOM deleted successfully'
    });
  } catch (error) {
    console.error('UOM deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MENU COST CALCULATION
const calculateMenuCost = async (req, res) => {
  try {
    const { menu_id } = req.params;
    const hostel_id = req.user.hostel_id;

    const menu = await Menu.findOne({
      where: { id: menu_id, hostel_id },
      include: [
        {
          model: MenuItem,
          as: 'tbl_Menu_Items',
          include: [
            {
              model: Item,
              as: 'tbl_Item',
              attributes: ['id', 'name', 'unit_price']
            }
          ]
        }
      ]
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    let totalCost = 0;
    const itemCosts = menu.tbl_Menu_Items.map(menuItem => {
      const itemCost = parseFloat(menuItem.quantity) * parseFloat(menuItem.tbl_Item.unit_price || 0);
      totalCost += itemCost;

      return {
        item_id: menuItem.tbl_Item.id,
        item_name: menuItem.tbl_Item.name,
        quantity: menuItem.quantity,
        unit: menuItem.unit,
        unit_price: menuItem.tbl_Item.unit_price,
        total_cost: itemCost
      };
    });

    const costPerServing = menu.estimated_servings > 0 ? totalCost / menu.estimated_servings : 0;

    res.json({
      success: true,
      data: {
        menu_id: menu.id,
        menu_name: menu.name,
        total_cost: totalCost,
        estimated_servings: menu.estimated_servings,
        cost_per_serving: costPerServing,
        item_costs: itemCosts
      }
    });
  } catch (error) {
    console.error('Menu cost calculation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DASHBOARD AND STATISTICS
const getMessDashboardStats = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;

    const totalMenus = await Menu.count({ where: { hostel_id } });
    const totalItems = await Item.count();

    // Low stock items
    const lowStockCount = await ItemStock.count({
      where: {
        hostel_id,
        [Op.where]: sequelize.where(
          sequelize.col('current_stock'),
          Op.lte,
          sequelize.col('minimum_stock')
        )
      }
    });

    res.json({
      success: true,
      data: {
        totalMenus,
        totalItems,
        lowStockCount
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// STOCK MANAGEMENT - Updated for FIFO
const updateItemStock = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Extract hostel_id from the authenticated user rather than the request body
    const hostel_id = req.user.hostel_id;
    const { item_id, quantity, unit_price, purchase_date, expiry_date } = req.body;

    // Validate inputs
    if (!item_id || !quantity || !unit_price) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Missing required fields: item_id, quantity, unit_price' });
    }

    // Ensure Item and Hostel exist
    const item = await Item.findByPk(item_id, { transaction });
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const hostel = await Hostel.findByPk(hostel_id, { transaction });
    if (!hostel) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    // Update or create ItemStock with the user's hostel_id
    let itemStock = await ItemStock.findOne({ where: { item_id, hostel_id }, transaction });
    if (itemStock) {
      await itemStock.update(
        {
          current_stock: parseFloat(itemStock.current_stock) + parseFloat(quantity),
          last_purchase_date: purchase_date || new Date()
        },
        { transaction }
      );
    } else {
      itemStock = await ItemStock.create(
        {
          item_id,
          hostel_id,
          current_stock: quantity,
          minimum_stock: 0,
          last_purchase_date: purchase_date || new Date()
        },
        { transaction }
      );
    }

    // Create InventoryBatch with the user's hostel_id
    const batch = await InventoryBatch.create(
      {
        item_id,
        hostel_id,
        quantity_purchased: parseFloat(quantity),
        quantity_remaining: parseFloat(quantity),
        unit_price: parseFloat(unit_price),
        purchase_date: purchase_date || new Date(),
        expiry_date: expiry_date || null,
        status: 'active'
      },
      { transaction }
    );

    await transaction.commit();
    res.json({ success: true, message: 'Stock and batch updated', data: { itemStock, batch } });
  } catch (error) {
    await transaction.rollback();
    console.error('Update stock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getItemStock = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    const { low_stock } = req.query;

    const query = `
      WITH LastPurchase AS (
        SELECT
          it.item_id,
          it.store_id,
          it.quantity,
          it.unit_price,
          it.transaction_date,
          ROW_NUMBER() OVER (PARTITION BY it.item_id ORDER BY it.transaction_date DESC, it.id DESC) as rn
        FROM \`tbl_InventoryTransaction\` AS it
        WHERE it.transaction_type = 'purchase' AND it.hostel_id = :hostel_id
      ),
      FifoBatch AS (
        SELECT
          ib.item_id,
          ib.unit_price AS fifo_unit_price,
          ib.quantity_remaining AS fifo_batch_remaining
        FROM \`tbl_InventoryBatch\` AS ib
        WHERE ib.hostel_id = :hostel_id
          AND ib.status = 'active'
          AND ib.quantity_remaining > 0
        ORDER BY ib.purchase_date ASC, ib.id ASC
        LIMIT 1
      )
      SELECT
        stock.*,
        item.name AS "Item.name",
        item.category_id AS "Item.category_id",
        category.name AS "Item.tbl_ItemCategory.name",
        uom.abbreviation AS "Item.UOM.abbreviation",
        item.unit_id AS "Item.unit_id",
        item.unit_price AS "Item.base_unit_price", -- Added base unit price from Item model
        lp.quantity as last_bought_qty,
        lp.unit_price as last_bought_unit_price,
        (lp.quantity * lp.unit_price) as last_bought_overall_cost,
        store.name as last_bought_store_name,
        lp.store_id as last_bought_store_id,
        fb.fifo_unit_price,
        fb.fifo_batch_remaining
      FROM \`tbl_ItemStock\` AS stock
      JOIN \`tbl_Item\` AS item ON item.id = stock.item_id
      LEFT JOIN \`tbl_ItemCategory\` AS category ON category.id = item.category_id
      LEFT JOIN \`tbl_UOM\` as uom ON uom.id = item.unit_id
      LEFT JOIN (SELECT * FROM LastPurchase WHERE rn = 1) AS lp ON lp.item_id = stock.item_id
      LEFT JOIN \`tbl_Store\` AS store ON store.id = lp.store_id
      LEFT JOIN FifoBatch AS fb ON fb.item_id = stock.item_id -- Join with FIFO batch CTE
      WHERE stock.hostel_id = :hostel_id
      ${low_stock === 'true' ? "AND stock.current_stock <= stock.minimum_stock" : ""}
      ORDER BY item.name ASC;
    `;
    // --- END MODIFIED QUERY ---

    const itemStocks = await sequelize.query(query, {
      replacements: { hostel_id },
      type: sequelize.QueryTypes.SELECT,
      nest: false
    });

    // --- MODIFIED DATA MAPPING ---
    const formattedData = itemStocks.map(stock => {
      // Determine the effective unit price to display in the main stock list
      // Prioritize FIFO price if available, otherwise use last_bought_unit_price, then item base price
      const effectiveUnitPrice = stock.fifo_unit_price
        || stock.last_bought_unit_price
        || stock['Item.base_unit_price']
        || 0;
      return {
        id: stock.id,
        item_id: stock.item_id,
        hostel_id: stock.hostel_id,
        current_stock: parseFloat(stock.current_stock),
        minimum_stock: parseFloat(stock.minimum_stock),
        last_purchase_date: stock.last_purchase_date,
        last_updated: stock.last_updated,
        last_bought_qty: parseFloat(stock.last_bought_qty || 0),
        last_bought_unit_price: parseFloat(stock.last_bought_unit_price || 0),
        last_bought_overall_cost: parseFloat(stock.last_bought_overall_cost || 0),
        last_bought_store_name: stock.last_bought_store_name,
        last_bought_store_id: stock.last_bought_store_id,
        fifo_unit_price: parseFloat(stock.fifo_unit_price || 0), // Current FIFO batch unit price
        fifo_batch_remaining: parseFloat(stock.fifo_batch_remaining || 0), // Quantity in that FIFO batch
        effective_unit_price: parseFloat(effectiveUnitPrice), // The price to show in the main list
        Item: {
          name: stock['Item.name'],
          category_id: stock['Item.category_id'],
          unit_id: stock['Item.unit_id'],
          unit_price: parseFloat(stock['Item.base_unit_price'] || 0), // Base item unit price
          tbl_ItemCategory: { name: stock['Item.tbl_ItemCategory.name'] },
          UOM: { abbreviation: stock['Item.UOM.abbreviation'] }
        }
      };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('Item stock fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getDailyConsumption = async (req, res) => {
  try {
    const { date, meal_type, item_id } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (date) whereClause.consumption_date = date;
    if (meal_type) whereClause.meal_type = meal_type;
    if (item_id) whereClause.item_id = item_id;

    const consumptions = await DailyConsumption.findAll({
      where: whereClause,
      include: [
        {
          model: Item,
          include: [{
            model: ItemCategory,
            as: 'tbl_ItemCategory'
          }]
        },
        {
          model: User,
          as: 'ConsumptionRecordedBy',
          attributes: ['id', 'username']
        },
        {
          model: ConsumptionLog,
          as: 'ConsumptionLogs',
          required: false,
          include: [
            {
              model: InventoryBatch,
              as: 'tbl_InventoryBatch',
              required: false
            }
          ]
        }
      ],
      order: [['consumption_date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: consumptions
    });
  } catch (error) {
    console.error('Daily consumption fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const _recordBulkConsumptionLogic = async (consumptions, hostel_id, user_id, transaction) => {
  console.log("[FIFO LOGIC] Starting consumption processing...");

  const lowStockItems = [];
  const createdDailyConsumptions = [];

  for (const consumption of consumptions) {
    try {
      console.log(`[FIFO LOGIC] Processing item_id: ${consumption.item_id}, quantity: ${consumption.quantity_consumed}`);

      if (!consumption.item_id || !consumption.quantity_consumed || parseFloat(consumption.quantity_consumed) <= 0) {
        throw new Error('Invalid consumption data: Missing item_id or a valid, positive quantity_consumed.');
      }

      let unitId = consumption.unit;
      if (!unitId) {
        const itemForUnit = await Item.findByPk(consumption.item_id, { transaction });
        if (!itemForUnit || !itemForUnit.unit_id) {
          throw new Error(`Cannot determine unit for item_id: ${consumption.item_id}. Please ensure the item has a default unit.`);
        }
        unitId = itemForUnit.unit_id;
      }

      let remainingToConsume = parseFloat(consumption.quantity_consumed);

      const currentStock = await ItemStock.findOne({
        where: { item_id: consumption.item_id, hostel_id },
        transaction
      });

      if (!currentStock || parseFloat(currentStock.current_stock) < remainingToConsume) {
        throw new Error(`Insufficient stock for item: ${consumption.item_id}`);
      }

      const batches = await InventoryBatch.findAll({
        where: {
          item_id: consumption.item_id,
          hostel_id,
          status: 'active',
          quantity_remaining: { [Op.gt]: 0 }
        },
        order: [['purchase_date', 'ASC'], ['id', 'ASC']],
        transaction
      });

      if (batches.length === 0) {
        throw new Error(`Stock inconsistency for item ID: ${consumption.item_id}. No active batches available.`);
      }

      console.log(`[FIFO LOGIC] Found ${batches.length} active batch(es) for item ${consumption.item_id}.`);

      for (const batch of batches) {
        if (remainingToConsume <= 0) break;

        const quantityFromThisBatch = Math.min(remainingToConsume, parseFloat(batch.quantity_remaining));
        const costFromThisBatch = quantityFromThisBatch * parseFloat(batch.unit_price);

        console.log(`[FIFO LOGIC] Deducting ${quantityFromThisBatch} from batch #${batch.id} (Unit Price: ${batch.unit_price}). Cost: ${costFromThisBatch}`);

        batch.quantity_remaining = parseFloat(batch.quantity_remaining) - quantityFromThisBatch;

        if (batch.quantity_remaining <= 0) {
          batch.status = 'depleted';
        }

        await batch.save({ transaction });
        remainingToConsume -= quantityFromThisBatch;

        const dailyConsumption = await DailyConsumption.create({
          hostel_id,
          item_id: consumption.item_id,
          consumption_date: consumption.consumption_date || new Date(),
          quantity_consumed: quantityFromThisBatch,
          unit: unitId,
          meal_type: consumption.meal_type || 'snacks',
          recorded_by: user_id, // This will now correctly receive the integer ID
          total_cost: costFromThisBatch,
        }, { transaction });

        createdDailyConsumptions.push(dailyConsumption);

        await ConsumptionLog.create({
          daily_consumption_id: dailyConsumption.id,
          batch_id: batch.id,
          quantity_consumed: quantityFromThisBatch,
          cost: costFromThisBatch,
          meal_type: consumption.meal_type || 'snacks',
        }, { transaction });
      }

      if (remainingToConsume > 0) {
        throw new Error(`Could not consume all requested quantity for item ID: ${consumption.item_id}.`);
      }

      currentStock.current_stock = parseFloat(currentStock.current_stock) - parseFloat(consumption.quantity_consumed);
      currentStock.last_updated = new Date();
      await currentStock.save({ transaction });

      console.log(`[FIFO LOGIC] ItemStock for item ${consumption.item_id} updated. New stock: ${currentStock.current_stock}`);

      if (currentStock.current_stock <= parseFloat(currentStock.minimum_stock)) {
        const itemInfo = await Item.findByPk(consumption.item_id, {
          include: [{ model: UOM, as: 'UOM' }],
          transaction
        });

        if (itemInfo) {
          lowStockItems.push({
            name: itemInfo.name,
            current_stock: currentStock.current_stock,
            unit: itemInfo.UOM ? itemInfo.UOM.abbreviation : 'units',
            minimum_stock: currentStock.minimum_stock
          });
        }
      }
    } catch (error) {
      console.error(`[FIFO LOGIC] FATAL ERROR processing item ${consumption?.item_id}: ${error.message}`);
      throw error;
    }
  }

  console.log("[FIFO LOGIC] Consumption processing finished.");

  return { lowStockItems, createdDailyConsumptions };
};


// Add this to your messController.js
const getItemFIFOPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    console.log(`[API] Getting FIFO price for item ${id} in hostel ${hostel_id}`);

    // Get the oldest active batch with remaining quantity
    const oldestBatch = await InventoryBatch.findOne({
      where: {
        item_id: id,
        hostel_id,
        status: 'active',
        quantity_remaining: { [Op.gt]: 0 }
      },
      order: [['purchase_date', 'ASC']],
      attributes: ['id', 'unit_price', 'purchase_date', 'quantity_remaining']
    });

    // Get the item for fallback price
    const item = await Item.findByPk(id, {
      attributes: ['unit_price']
    });

    if (oldestBatch) {
      console.log(`[API] Found FIFO price for item ${id}: ${oldestBatch.unit_price} from batch ${oldestBatch.id}`);
      res.json({
        success: true,
        data: {
          fifo_price: oldestBatch.unit_price,
          batch_id: oldestBatch.id,
          purchase_date: oldestBatch.purchase_date,
          quantity_remaining: oldestBatch.quantity_remaining,
          base_price: item ? item.unit_price : 0
        }
      });
    } else {
      console.log(`[API] No active batches found for item ${id}, using base price: ${item ? item.unit_price : 0}`);
      res.json({
        success: true,
        data: {
          fifo_price: item ? item.unit_price : 0,
          batch_id: null,
          base_price: item ? item.unit_price : 0
        }
      });
    }
  } catch (error) {
    console.error('Error fetching FIFO price:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// In your backend controller (likely messController.js)
// In messController.js
const getItemBatches = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    const batches = await InventoryBatch.findAll({
      where: {
        item_id: id,
        hostel_id
      },
      attributes: [
        'id', 'purchase_date', 'unit_price',
        'quantity_purchased', 'quantity_remaining',
        'status', 'expiry_date'
      ],
      order: [
        ['status', 'ASC'], // Active batches first
        ['purchase_date', 'ASC'] // FIFO order
      ]
    });

    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const fetchBatchPrices = async (itemId) => {
  try {
    // Add an API endpoint to get the active batches for an item
    const response = await messAPI.getItemBatches(itemId);
    const batches = response.data.data || [];

    if (batches.length > 0) {
      // Use the oldest batch for FIFO pricing (or weighted average if preferred)
      return batches[0].unit_price;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch batch prices for item ${itemId}:`, error);
    return null;
  }
};

// Then in the handleQuantityChange function
const handleQuantityChange = async (itemId, value) => {
  console.log(`[CreateMenu] Quantity changed for item ${itemId} to ${value}`);

  // Only calculate if quantity > 0
  let updatedItems;

  if (value > 0) {
    setDataLoading(true);
    try {
      const itemIndex = items.findIndex(item => item.id === itemId);
      const currentItem = items[itemIndex];

      // Calculate the multi-batch price
      const batchCalculation = await calculateMultiBatchPrice(itemId, value);

      // Update the item with batch breakdown
      updatedItems = [...items];
      updatedItems[itemIndex] = {
        ...currentItem,
        quantity: value,
        multi_batch_price: batchCalculation.totalCost,
        multi_batch_breakdown: batchCalculation.batchBreakdown,
        average_unit_price: batchCalculation.averageUnitPrice,
        // Keep track of single batch price for comparison
        fifo_price: batchCalculation.batchBreakdown.length > 0
          ? batchCalculation.batchBreakdown[0].unit_price
          : null,
        fifo_batch_id: batchCalculation.batchBreakdown.length > 0
          ? batchCalculation.batchBreakdown[0].batch_id
          : null,
        is_multi_batch: batchCalculation.batchBreakdown.length > 1
      };

      console.log(`[CreateMenu] Updated item with multi-batch calculation:`,
        updatedItems[itemIndex].multi_batch_breakdown);

    } catch (error) {
      console.error(`[CreateMenu] Error in quantity change:`, error);
      message.error('Failed to calculate batch prices');

      // Simple fallback - just update quantity
      updatedItems = items.map(item =>
        item.id === itemId ? { ...item, quantity: value } : item
      );
    } finally {
      setDataLoading(false);
    }
  } else {
    // Reset everything if quantity is 0
    updatedItems = items.map(item =>
      item.id === itemId ? {
        ...item,
        quantity: 0,
        fifo_price: null,
        fifo_batch_id: null,
        multi_batch_price: null,
        multi_batch_breakdown: null,
        average_unit_price: null,
        is_multi_batch: false
      } : item
    );
  }

  setItems(updatedItems);

  // Update menuItems for cost calculation
  updateMenuItems(updatedItems);
};

// Update the updateMenuItems function to use batch prices
const updateMenuItems = (updatedItems) => {
  console.log("[CreateMenu] Updating menu items for cost calculation");

  const selectedItems = updatedItems.filter(item => item.quantity > 0)
    .map(item => {
      // Use multi-batch price if available
      let totalCost = item.multi_batch_price;
      let unitPrice = item.average_unit_price;

      // Fallback to simple calculation if no multi-batch price
      if (totalCost === null || totalCost === undefined) {
        unitPrice = item.fifo_price !== null ? item.fifo_price : (item.unit_price || 0);
        totalCost = unitPrice * item.quantity;
      }

      console.log(`[CreateMenu] Menu item ${item.id}: Quantity=${item.quantity}, Total Cost=${totalCost}, Unit Price=${unitPrice}`);

      // Add batch breakdown for tooltip
      let batchDetails = null;
      if (item.multi_batch_breakdown && item.multi_batch_breakdown.length > 0) {
        batchDetails = item.multi_batch_breakdown.map(b =>
          `${b.quantity} × ₹${b.unit_price} = ₹${b.cost}`
        ).join(', ');
      }

      return {
        item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.UOM?.abbreviation || 'unit',
        unit_price: unitPrice,
        is_fifo_price: item.fifo_price !== null,
        is_multi_batch: item.is_multi_batch,
        batch_details: batchDetails,
        category: item.tbl_ItemCategory?.name || 'N/A',
        preparation_notes: item.preparation_notes || '',
        total_cost: totalCost
      };
    });

  setMenuItems(selectedItems);

  // Log the total cost
  const totalCost = selectedItems.reduce((sum, item) => sum + item.total_cost, 0);
  console.log(`[CreateMenu] Total menu cost: ${totalCost}`);
};

// Update the `recordBulkConsumption` API handler to use the new logic
const recordBulkConsumption = async (req, res) => {
  const { consumptions } = req.body;
  const hostel_id = req.user.hostel_id;
  const user_id = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    if (!consumptions || !Array.isArray(consumptions) || consumptions.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Consumptions array is required' });
    }

    const { createdConsumptions, lowStockItems } = await _recordBulkConsumptionLogic(
      consumptions,
      hostel_id,
      user_id,
      transaction
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Consumptions recorded successfully',
      data: {
        consumptions: createdConsumptions,
        lowStockItems,
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Bulk consumption record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// INVENTORY PURCHASE
// In messController.js

// In messController.js
const recordInventoryPurchase = async (req, res) => {
  const { items } = req.body;
  const { hostel_id, id: user_id } = req.user;
  console.log('[API] recordInventoryPurchase CALLED at', new Date().toISOString());
  console.log('[API] User:', { hostel_id, user_id });
  console.log('[API] Received items:', JSON.stringify(items, null, 2));

  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error('[API Error] Purchase failed: Items array is missing or empty.');
    return res.status(400).json({ success: false, message: 'Items array is required.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const createdBatches = [];
    for (const item of items) {
      console.log(`[API LOOP] --- Processing item_id: ${item.item_id} ---`);

      // 1. Validate Item Data
      if (!item.item_id || !item.quantity || item.unit_price === undefined || !item.store_id || !item.unit) {
        throw new Error(`Missing required fields in item: ${JSON.stringify(item)}`);
      }
      console.log('[API LOOP] Step 1: Basic validation passed.');

      // 2. Validate Item Exists
      const itemRecord = await Item.findByPk(item.item_id, { transaction });
      if (!itemRecord) {
        throw new Error(`Item with ID ${item.item_id} not found.`);
      }
      console.log(`[API LOOP] Step 2: Found item "${itemRecord.name}" in DB.`);

      // 3. Validate Store Exists
      const storeRecord = await Store.findByPk(item.store_id, { transaction });
      if (!storeRecord) {
        throw new Error(`Store with ID ${item.store_id} not found.`);
      }
      console.log(`[API LOOP] Step 3: Found store "${storeRecord.name}" in DB.`);

      // 4. Validate Unit (UOM)
      console.log(`[API LOOP] Step 4: Validating unit. Searching for abbreviation: "${item.unit}"`);
      const uomRecord = await UOM.findOne({ where: { abbreviation: item.unit }, transaction });
      if (!uomRecord) {
        throw new Error(`Unit with abbreviation "${item.unit}" NOT FOUND in tbl_UOM.`);
      }
      console.log(`[API LOOP] Found UOM record: ID=${uomRecord.id}, Name=${uomRecord.name}. Item's required unit_id is ${itemRecord.unit_id}.`);
      if (itemRecord.unit_id !== uomRecord.id) {
        throw new Error(`Unit mismatch for item "${itemRecord.name}". Item requires unit_id ${itemRecord.unit_id}, but received unit "${item.unit}" which is ID ${uomRecord.id}.`);
      }
      console.log('[API LOOP] Unit validation passed.');

      // 5. Create Inventory Batch
      console.log('[API LOOP] Step 5: Creating InventoryBatch...');
      const batch = await InventoryBatch.create({
        item_id: item.item_id, hostel_id,
        quantity_purchased: parseFloat(item.quantity), quantity_remaining: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price), purchase_date: new Date(), status: 'active',
      }, { transaction });
      console.log(`[API LOOP] Created InventoryBatch ID: ${batch.id}`);

      // 6. Create Inventory Transaction
      console.log('[API LOOP] Step 6: Creating InventoryTransaction...');
      await InventoryTransaction.create({
        item_id: item.item_id, hostel_id, store_id: item.store_id, transaction_date: batch.purchase_date,
        quantity: batch.quantity_purchased, unit: item.unit, unit_price: batch.unit_price,
        transaction_type: 'purchase', recorded_by: user_id,
      }, { transaction });
      console.log('[API LOOP] Created InventoryTransaction.');

      // 7. Update Item Stock
      console.log('[API LOOP] Step 7: Updating ItemStock...');
      let itemStock = await ItemStock.findOne({ where: { item_id: item.item_id, hostel_id }, transaction });
      if (itemStock) {
        await itemStock.increment('current_stock', { by: parseFloat(item.quantity), transaction });
        await itemStock.update({ last_purchase_date: new Date() }, { transaction });
        console.log(`[API LOOP] Incremented stock for item ${item.item_id}.`);
      } else {
        await ItemStock.create({
          item_id: item.item_id, hostel_id, current_stock: parseFloat(item.quantity),
          minimum_stock: 0, last_purchase_date: new Date(),
        }, { transaction });
        console.log(`[API LOOP] Created new stock record for item ${item.item_id}.`);
      }
      console.log(`[API LOOP] --- Finished processing item_id: ${item.item_id} ---`);
      createdBatches.push(batch);
    }

    await transaction.commit();
    console.log('[API] Transaction committed successfully.');
    return res.status(201).json({ success: true, message: 'Purchases recorded successfully.', data: { createdBatches } });

  } catch (error) {
    await transaction.rollback();
    console.error('[API FATAL ERROR] Transaction rolled back. Reason:', error.message);
    console.error(error.stack); // Print full stack trace
    return res.status(500).json({ success: false, message: `Failed to record purchases: ${error.message}` });
  }
};


const getInventoryTransactions = async (req, res) => {
  try {
    const { transaction_type, item_id, store_id, from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (transaction_type) {
      whereClause.transaction_type = transaction_type;
    }

    if (item_id) {
      whereClause.item_id = item_id;
    }

    if (store_id) {
      whereClause.store_id = store_id;
    }

    if (from_date && to_date) {
      whereClause.transaction_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const transactions = await InventoryTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: Item,
          include: [{
            model: ItemCategory,
            as: 'tbl_ItemCategory'
          }]
        },
        {
          model: Store,
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'RecordedBy',
          attributes: ['id', 'username']
        }
      ],
      order: [['transaction_date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Inventory transactions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// STORE MANAGEMENT
const createStore = async (req, res) => {
  try {
    const { name, address, contact_number } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Store name is required'
      });
    }

    const store = await Store.create({
      name,
      address,
      contact_number,
      is_active: true
    });

    res.status(201).json({
      success: true,
      data: store,
      message: 'Store created successfully'
    });
  } catch (error) {
    console.error('Store creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getStores = async (req, res) => {
  try {
    const { search, is_active } = req.query;

    let whereClause = {};

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const stores = await Store.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('Stores fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contact_number, is_active } = req.body;

    const store = await Store.findByPk(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    await store.update({
      name,
      address,
      contact_number,
      is_active
    });

    res.json({
      success: true,
      data: store,
      message: 'Store updated successfully'
    });
  } catch (error) {
    console.error('Store update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;

    const store = await Store.findByPk(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Check if store is being used
    const itemStoreCount = await ItemStore.count({ where: { store_id: id } });
    const transactionCount = await InventoryTransaction.count({ where: { store_id: id } });

    if (itemStoreCount > 0 || transactionCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Store is in use and cannot be deleted'
      });
    }

    await store.destroy();
    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Store deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Item-Store Mapping
const mapItemToStore = async (req, res) => {
  try {
    const { item_id, store_id, price, is_preferred } = req.body;

    if (!item_id || !store_id) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and Store ID are required'
      });
    }

    // Check if mapping already exists
    const existingMapping = await ItemStore.findOne({
      where: { item_id, store_id }
    });

    if (existingMapping) {
      await existingMapping.update({
        price,
        is_preferred
      });

      res.json({
        success: true,
        data: existingMapping,
        message: 'Item-Store mapping updated successfully'
      });
    } else {
      const newMapping = await ItemStore.create({
        item_id,
        store_id,
        price,
        is_preferred
      });

      res.status(201).json({
        success: true,
        data: newMapping,
        message: 'Item-Store mapping created successfully'
      });
    }
  } catch (error) {
    console.error('Item-Store mapping error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getItemStores = async (req, res) => {
  try {
    const { item_id } = req.query;

    let whereClause = {};

    if (item_id) {
      whereClause.item_id = item_id;
    }

    const itemStores = await ItemStore.findAll({
      where: whereClause,
      include: [
        {
          model: Store,
          attributes: ['id', 'name', 'address', 'contact_number']
        },
        {
          model: Item,
          include: [{
            model: ItemCategory,
            as: 'tbl_ItemCategory'
          }]
        }
      ],
      order: [['is_preferred', 'DESC'], ['price', 'ASC']]
    });

    res.json({
      success: true,
      data: itemStores
    });
  } catch (error) {
    console.error('Item stores fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeItemStoreMapping = async (req, res) => {
  try {
    const { id } = req.params;

    const mapping = await ItemStore.findByPk(id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Item-Store mapping not found'
      });
    }

    await mapping.destroy();
    res.json({
      success: true,
      message: 'Item-Store mapping removed successfully'
    });
  } catch (error) {
    console.error('Item-Store mapping removal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// SPECIAL FOOD ITEMS MANAGEMENT
const createSpecialFoodItem = async (req, res) => {
  try {
    const { name, description, price, preparation_time_minutes, category, image_url } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required'
      });
    }

    const foodItem = await SpecialFoodItem.create({
      name,
      description,
      price,
      preparation_time_minutes,
      category,
      image_url,
      is_available: true
    });

    res.status(201).json({
      success: true,
      data: foodItem,
      message: 'Special food item created successfully'
    });
  } catch (error) {
    console.error('Special food item creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSpecialFoodItems = async (req, res) => {
  try {
    const { category, is_available, search } = req.query;
    let whereClause = {};
    if (category) {
      whereClause.category = category;
    }
    if (is_available !== undefined) {
      whereClause.is_available = is_available === 'true';
    }
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }
    const foodItems = await SpecialFoodItem.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, data: foodItems });
  } catch (error) {
    console.error('Special food items fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getSpecialFoodItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const foodItem = await SpecialFoodItem.findByPk(id);
    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Special food item not found'
      });
    }

    res.json({
      success: true,
      data: foodItem
    });
  } catch (error) {
    console.error('Special food item fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateSpecialFoodItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, preparation_time_minutes, category, image_url, is_available } = req.body;

    const foodItem = await SpecialFoodItem.findByPk(id);
    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Special food item not found'
      });
    }

    await foodItem.update({
      name,
      description,
      price,
      preparation_time_minutes,
      category,
      image_url,
      is_available
    });

    res.json({
      success: true,
      data: foodItem,
      message: 'Special food item updated successfully'
    });
  } catch (error) {
    console.error('Special food item update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSpecialFoodItem = async (req, res) => {
  try {
    const { id } = req.params;

    const foodItem = await SpecialFoodItem.findByPk(id);
    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Special food item not found'
      });
    }

    // Check if food item is used in any orders
    const orderItemCount = await FoodOrderItem.count({ where: { food_item_id: id } });
    if (orderItemCount > 0) {
      // Instead of deleting, just mark as unavailable
      await foodItem.update({ is_available: false });
      return res.json({
        success: true,
        message: 'Special food item has been used in orders. Marked as unavailable instead of deleting.'
      });
    }

    await foodItem.destroy();
    res.json({
      success: true,
      message: 'Special food item deleted successfully'
    });
  } catch (error) {
    console.error('Special food item deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// FOOD ORDERS MANAGEMENT
const createFoodOrder = async (req, res) => {
  try {
    const { items, requested_time, notes } = req.body;
    const student_id = req.user.id;
    const hostel_id = req.user.hostel_id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one food item is required'
      });
    }

    if (!requested_time) {
      return res.status(400).json({
        success: false,
        message: 'Requested time is required'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Fetch food items to validate and get prices
      const foodItemIds = items.map(item => item.food_item_id);
      const foodItems = await SpecialFoodItem.findAll({
        where: {
          id: { [Op.in]: foodItemIds },
          is_available: true
        },
        transaction
      });

      if (foodItems.length !== foodItemIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more food items are not available'
        });
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = items.map(item => {
        const foodItem = foodItems.find(fi => fi.id === item.food_item_id);
        const subtotal = parseFloat(foodItem.price) * item.quantity;
        totalAmount += subtotal;

        return {
          food_item_id: item.food_item_id,
          quantity: item.quantity,
          unit_price: foodItem.price,
          subtotal,
          special_instructions: item.special_instructions
        };
      });

      // Create order
      const foodOrder = await FoodOrder.create({
        student_id,
        hostel_id,
        requested_time,
        total_amount: totalAmount,
        notes,
        status: 'pending',
        payment_status: 'pending',
        order_date: new Date()
      }, { transaction });

      // Create order items
      await Promise.all(orderItems.map(item =>
        FoodOrderItem.create({
          food_order_id: foodOrder.id,
          food_item_id: item.food_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          special_instructions: item.special_instructions
        }, { transaction })
      ));

      await transaction.commit();

      // Fetch the complete order with items
      const completeOrder = await FoodOrder.findByPk(foodOrder.id, {
        include: [{
          model: FoodOrderItem,
          include: [{
            model: SpecialFoodItem
          }]
        }, {
          model: User,
          as: 'Student',
          attributes: ['id', 'username', 'email']
        }]
      });

      res.status(201).json({
        success: true,
        data: completeOrder,
        message: 'Food order created successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Food order creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFoodOrders = async (req, res) => {
  try {
    const { status, from_date, to_date, student_id } = req.query;
    const user = req.user;

    let whereClause = {};

    // If student, show only their orders
    if (user.role === 'student') {
      whereClause.student_id = user.id;
    } else {
      // For mess staff, show orders from their hostel
      whereClause.hostel_id = user.hostel_id;

      // Filter by student if provided
      if (student_id) {
        whereClause.student_id = student_id;
      }
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by date range
    if (from_date && to_date) {
      whereClause.order_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const orders = await FoodOrder.findAll({
      where: whereClause,
      include: [{
        model: FoodOrderItem,
        include: [{
          model: SpecialFoodItem,
          attributes: ['id', 'name', 'price', 'category']
        }]
      }, {
        model: User,
        as: 'Student',
        attributes: ['id', 'username', 'email']
      }],
      order: [['order_date', 'DESC']]
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Food orders fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFoodOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // If student, ensure they can only view their own orders
    if (user.role === 'student') {
      whereClause.student_id = user.id;
    }

    const order = await FoodOrder.findOne({
      where: whereClause,
      include: [{
        model: FoodOrderItem,
        include: [{
          model: SpecialFoodItem
        }]
      }, {
        model: User,
        as: 'Student',
        attributes: ['id', 'username', 'email']
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Food order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Food order fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFoodOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const hostel_id = req.user.hostel_id;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Find the order
    const order = await FoodOrder.findOne({
      where: { id, hostel_id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Food order not found'
      });
    }

    // Update status
    await order.update({ status });

    // Fetch updated order with details
    const updatedOrder = await FoodOrder.findByPk(id, {
      include: [{
        model: FoodOrderItem,
        include: [{
          model: SpecialFoodItem
        }]
      }, {
        model: User,
        as: 'Student',
        attributes: ['id', 'username', 'email']
      }]
    });

    res.json({
      success: true,
      data: updatedOrder,
      message: `Food order status updated to ${status}`
    });
  } catch (error) {
    console.error('Food order status update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;
    const hostel_id = req.user.hostel_id;

    // Validate payment status
    const validStatuses = ['pending', 'paid', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    // Find the order
    const order = await FoodOrder.findOne({
      where: { id, hostel_id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Food order not found'
      });
    }

    // Update payment status
    await order.update({ payment_status });

    res.json({
      success: true,
      data: order,
      message: `Payment status updated to ${payment_status}`
    });
  } catch (error) {
    console.error('Payment status update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const cancelFoodOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = { id };

    // If student, ensure they can only cancel their own orders
    if (user.role === 'student') {
      whereClause.student_id = user.id;
      whereClause.status = 'pending'; // Students can only cancel pending orders
    } else {
      // For mess staff, they should be from the correct hostel
      whereClause.hostel_id = user.hostel_id;
    }

    const order = await FoodOrder.findOne({ where: whereClause });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Food order not found or cannot be cancelled'
      });
    }

    // Update status to cancelled
    await order.update({
      status: 'cancelled',
      // If already paid, mark for refund
      payment_status: order.payment_status === 'paid' ? 'refunded' : order.payment_status
    });

    res.json({
      success: true,
      data: order,
      message: 'Food order cancelled successfully'
    });
  } catch (error) {
    console.error('Food order cancellation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Generate Monthly Food Order Report
const getMonthlyFoodOrderReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const hostel_id = req.user.hostel_id;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Set date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    endDate.setHours(23, 59, 59, 999);

    // Find all completed orders for the month
    const orders = await FoodOrder.findAll({
      where: {
        hostel_id,
        order_date: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.in]: ['delivered', 'ready']
        },
        payment_status: {
          [Op.ne]: 'refunded'
        }
      },
      include: [{
        model: FoodOrderItem,
        include: [{
          model: SpecialFoodItem,
          attributes: ['id', 'name', 'price', 'category']
        }]
      }, {
        model: User,
        as: 'Student',
        attributes: ['id', 'username', 'email']
      }]
    });

    // Aggregate data by student
    const studentSummary = {};
    orders.forEach(order => {
      const studentId = order.student_id;
      if (!studentSummary[studentId]) {
        studentSummary[studentId] = {
          student_id: studentId,
          student_name: order.Student.username,
          student_email: order.Student.email,
          orders: [],
          total_amount: 0
        };
      }

      studentSummary[studentId].orders.push({
        order_id: order.id,
        order_date: order.order_date,
        total_amount: order.total_amount,
        items: order.FoodOrderItems.map(item => ({
          name: item.SpecialFoodItem.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        }))
      });

      studentSummary[studentId].total_amount += parseFloat(order.total_amount);
    });

    res.json({
      success: true,
      data: {
        month,
        year,
        students: Object.values(studentSummary),
        total_orders: orders.length,
        total_revenue: orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0)
      }
    });
  } catch (error) {
    console.error('Monthly food order report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getItemsByStoreId = async (req, res) => {
  try {
    const { store_id } = req.params;
    const itemStores = await ItemStore.findAll({
      where: { store_id },
      include: [
        {
          model: Item,
          include: [{ model: UOM, as: 'UOM', required: false }]
        }
      ],
      order: [[Item, 'name', 'ASC']]
    });
    if (!itemStores || itemStores.length === 0) {
      return res.status(404).json({ success: false, message: 'No items mapped to this store yet.' });
    }
    const items = itemStores.map(is => ({
      item_id: is.item_id,
      name: is.Item.name,
      unit_price: is.price,
      unit: is.Item.UOM?.abbreviation || 'unit', // Return UOM abbreviation
      unit_id: is.Item.unit_id // Optional: include for reference
    }));
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching items by store:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getStoresByItemId = async (req, res) => {
  try {
    const { item_id } = req.params;

    const itemStores = await ItemStore.findAll({
      where: { item_id },
      include: [
        {
          model: Store,
          attributes: ['id', 'name']
        }
      ],
      order: [['is_preferred', 'DESC'], ['updatedAt', 'DESC']]
    });

    if (!itemStores) {
      return res.status(404).json({ success: false, message: 'No stores mapped to this item yet.' });
    }

    const stores = itemStores.map(is => ({
      store_id: is.store_id,
      name: is.Store.name,
      price: is.price,
      is_preferred: is.is_preferred
    }));

    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('Error fetching stores by item:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// In messController.js

const getSummarizedConsumptionReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const hostel_id = req.user.hostel_id;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Start and end date are required.' });
    }

    // The main change is in this database query
    const result = await DailyConsumption.findAll({
      where: {
        hostel_id,
        consumption_date: { [Op.between]: [start_date, end_date] },
      },
      // MODIFIED: Select the category name and sum the cost
      attributes: [
        [sequelize.col('tbl_Item->tbl_ItemCategory.name'), 'category_name'],
        [sequelize.fn('SUM', sequelize.col('DailyConsumption.total_cost')), 'total_cost'],
      ],
      // MODIFIED: Include Item and its associated ItemCategory to access the category name
      include: [
        {
          model: Item,
          as: 'tbl_Item',
          attributes: [], // We don't need item attributes in the final result
          required: true,
          include: [
            {
              model: ItemCategory,
              as: 'tbl_ItemCategory',
              attributes: [],
              required: true,
            }
          ]
        },
      ],
      // MODIFIED: Group the results by the category name
      group: [sequelize.col('tbl_Item->tbl_ItemCategory.name')],
      order: [['category_name', 'ASC']], // Order by alias
      raw: true, // Keep it raw for a clean result
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating summarized consumption report:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};


// In messController.js

const markMenuAsServed = async (req, res) => {
  const { id } = req.params; // MenuSchedule ID
  const { hostel_id, id: userId } = req.user;
  const transaction = await sequelize.transaction();

  try {
    const schedule = await MenuSchedule.findByPk(id, {
      include: [{
        model: Menu,
        include: [{
            model: MenuItem,
            as: 'tbl_Menu_Items',
            include: [{ model: Item, as: 'tbl_Item', include: [{ model: UOM, as: 'UOM' }] }]
        }]
      }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!schedule || schedule.hostel_id !== hostel_id) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Menu schedule not found or unauthorized' });
    }
    if (schedule.status === 'served') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Menu is already marked as served' });
    }

    // --- Step 1: Record inventory consumption ---
    const consumptions = schedule.Menu.tbl_Menu_Items.map(menuItem => ({
      item_id: menuItem.item_id,
      quantity_consumed: parseFloat(menuItem.quantity),
      unit: menuItem.tbl_Item.unit_id,
      consumption_date: schedule.scheduled_date,
      meal_type: schedule.meal_time
    }));

    const { lowStockItems } = await _recordBulkConsumptionLogic(consumptions, hostel_id, userId, transaction);
    
    // Recalculate the exact cost from consumption logs for accuracy
    const totalServedMenuCostForDay = (await DailyConsumption.sum('total_cost', {
        where: { consumption_date: schedule.scheduled_date, meal_type: schedule.meal_time, hostel_id },
        transaction
    })) || 0;


    // --- Step 2: Identify chargeable students (Man-Days) ---
    const activeEnrollments = await Enrollment.findAll({
      where: { hostel_id }, // FIXED: Removed 'end_date' filter to avoid "Unknown column" error. Assumes all enrolled students are active. Add 'is_active: true' if the model has an 'is_active' field.
      attributes: ['student_id'],
      raw: true,
      transaction
    });
    const allActiveStudentIds = activeEnrollments.map(e => e.student_id);

    if (allActiveStudentIds.length === 0) {
      await schedule.update({ status: 'served' }, { transaction });
      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: 'Menu marked as served. No active students found for this day.',
        data: { lowStockItems }
      });
    }

    const attendanceRecords = await Attendance.findAll({
      where: { student_id: { [Op.in]: allActiveStudentIds }, date: schedule.scheduled_date },
      attributes: ['student_id', 'status'],
      raw: true,
      transaction
    });
    const attendanceMap = new Map(attendanceRecords.map(att => [att.student_id, att.status]));

    const dailyChargesToCreate = [];
    let studentsToChargeCount = 0;

    for (const studentId of allActiveStudentIds) {
      const attendanceStatus = attendanceMap.get(studentId) || 'absent';
      const is_charged = (attendanceStatus === 'present');

      if (is_charged) {
        studentsToChargeCount++;
      }
      
      dailyChargesToCreate.push({
        hostel_id,
        student_id: studentId,
        date: schedule.scheduled_date,
        amount: 0, // This will be updated with the raw menu cost portion
        attendance_status: attendanceStatus,
        is_charged: is_charged,
      });
    }

    // --- Step 3: Record the daily charge with only the menu cost portion ---
    const rawMenuCostPerStudent = studentsToChargeCount > 0 ? totalServedMenuCostForDay / studentsToChargeCount : 0;
    
    const finalDailyCharges = dailyChargesToCreate.map(charge => ({
        ...charge,
        amount: charge.is_charged ? rawMenuCostPerStudent : 0
    }));

    if (finalDailyCharges.length > 0) {
      await DailyMessCharge.bulkCreate(finalDailyCharges, {
        updateOnDuplicate: ['amount', 'attendance_status', 'is_charged'],
        transaction
      });
    }
    
    await schedule.update({ status: 'served' }, { transaction });
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      message: `Menu served. Raw menu cost of ₹${rawMenuCostPerStudent.toFixed(2)} recorded for ${studentsToChargeCount} present students.`,
      data: { lowStockItems }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[markMenuAsServed] Error:', error.message, error.stack);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};
// DEPRECATED: This function is replaced by the new monthly calculation in generateMonthlyMessReport.
// Ensure frontend calls `markMenuAsServed` to record daily menu costs.
const calculateAndApplyDailyMessCharges = async (req, res) => {
  return res.status(200).json({
    success: false,
    message: 'This endpoint is deprecated. Daily menu costs are now recorded via `markMenuAsServed`, and total monthly charges are calculated via `generateMonthlyMessReport`.'
  });
};


const createMessDailyExpense = async (req, res) => {
  try {
    const { expense_type_id, amount, expense_date, description } = req.body;
    const hostel_id = req.user.hostel_id;
    const recorded_by = req.user.id; // User recording the expense

    if (!expense_type_id || !amount || parseFloat(amount) <= 0 || !expense_date) {
      return res.status(400).json({
        success: false,
        message: 'Expense type, amount, and date are required'
      });
    }

    const messExpense = await MessDailyExpense.create({
      hostel_id,
      expense_type_id,
      amount,
      expense_date,
      description,
      recorded_by
    });

    res.status(201).json({
      success: true,
      data: messExpense,
      message: 'Mess daily expense recorded successfully'
    });
  } catch (error) {
    console.error('Mess daily expense creation error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getMessDailyExpenses = async (req, res) => {
  try {
    const { expense_type_id, from_date, to_date, search } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (expense_type_id && expense_type_id !== 'all') {
      whereClause.expense_type_id = expense_type_id;
    }

    if (from_date && to_date) {
      whereClause.expense_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    if (search) {
      whereClause[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        // Ensure ExpenseType is included in query if searching by its name
        // This might require a join in raw SQL or specific Sequelize include setup
        // For eager loading to work with '$ExpenseType.name$', ExpenseType must be included.
        // As per your models, ExpenseType is associated.
        { '$ExpenseType.name$': { [Op.like]: `%${search}%` } }
      ];
    }

    const expenses = await MessDailyExpense.findAll({
      where: whereClause,
      include: [
        {
          model: ExpenseType,
          as: 'ExpenseType',
          attributes: ['id', 'name'],
          required: false // Use required: false if you want to include expenses without a type if type filter is not active
        },
        {
          model: User,
          as: 'RecordedBy',
          attributes: ['id', 'username']
        }
      ],
      order: [['expense_date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    console.error('Get mess daily expenses error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getMessDailyExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    const expense = await MessDailyExpense.findOne({
      where: { id, hostel_id },
      include: [
        {
          model: ExpenseType,
          as: 'ExpenseType',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'RecordedBy',
          attributes: ['id', 'username']
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Mess daily expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    console.error('Get mess daily expense by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const updateMessDailyExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { expense_type_id, amount, expense_date, description } = req.body;
    const hostel_id = req.user.hostel_id;

    const messExpense = await MessDailyExpense.findOne({ where: { id, hostel_id } });

    if (!messExpense) {
      return res.status(404).json({ success: false, message: 'Mess daily expense not found' });
    }

    await messExpense.update({
      expense_type_id,
      amount,
      expense_date,
      description
    });

    res.json({ success: true, data: messExpense, message: 'Mess daily expense updated successfully' });
  } catch (error) {
    console.error('Update mess daily expense error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const deleteMessDailyExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    const result = await MessDailyExpense.destroy({ where: { id, hostel_id } });

    if (result === 0) {
      return res.status(404).json({ success: false, message: 'Mess daily expense not found' });
    }

    res.json({ success: true, message: 'Mess daily expense deleted successfully' });
  } catch (error) {
    console.error('Delete mess daily expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// const createExpenseTypeForMess = async (req, res) => {
//   try {
//     const { name, description } = req.body;

//     if (!name) {
//       return res.status(400).json({
//         success: false,
//         message: 'Expense Type name is required'
//       });
//     }

//     const expenseType = await ExpenseType.create({
//       name,
//       description,
//       is_active: true // Default to active when created
//     });

//     res.status(201).json({
//       success: true,
//       data: expenseType,
//       message: 'Expense Type created successfully'
//     });
//   } catch (error) {
//     console.error('Mess Expense Type creation error:', error);
//     res.status(500).json({ success: false, message: 'Server error: ' + error.message });
//   }
// };
const createExpenseType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const expenseType = await ExpenseType.create({
      name,
      description
    });

    res.status(201).json({
      success: true,
      data: expenseType,
      message: 'Expense type created successfully'
    });
  } catch (error) {
    console.error('Expense type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getExpenseTypes = async (req, res) => {
  try {
    const { search } = req.query;

    let whereClause = { is_active: true };

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const expenseTypes = await ExpenseType.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: expenseTypes });
  } catch (error) {
    console.error('Expense types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateExpenseType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const expenseType = await ExpenseType.findByPk(id);

    if (!expenseType) {
      return res.status(404).json({
        success: false,
        message: 'Expense type not found'
      });
    }

    await expenseType.update({
      name,
      description
    });

    res.json({
      success: true,
      data: expenseType,
      message: 'Expense type updated successfully'
    });
  } catch (error) {
    console.error('Expense type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteExpenseType = async (req, res) => {
  try {
    const { id } = req.params;

    const expenseType = await ExpenseType.findByPk(id);

    if (!expenseType) {
      return res.status(404).json({
        success: false,
        message: 'Expense type not found'
      });
    }

    await expenseType.update({ is_active: false });

    res.json({
      success: true,
      message: 'Expense type deactivated successfully'
    });
  } catch (error) {
    console.error('Expense type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Add this function to your CreateMenu component
const calculateMultiBatchPrice = async (itemId, requestedQuantity) => {
  try {
    console.log(`[CreateMenu] Calculating multi-batch price for item ${itemId}, quantity ${requestedQuantity}`);

    // Get all active batches for this item
    const response = await messAPI.getItemBatches(itemId);
    const batches = response.data.data || [];

    // Filter active batches with remaining quantity and sort by purchase date (FIFO)
    const activeBatches = batches
      .filter(batch => batch.status === 'active' && batch.quantity_remaining > 0)
      .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));

    console.log(`[CreateMenu] Found ${activeBatches.length} active batches for multi-batch calculation:`);
    activeBatches.forEach((batch, i) => {
      console.log(`[CreateMenu] Batch ${i + 1}: ID=${batch.id}, Date=${batch.purchase_date}, Price=${batch.unit_price}, Remaining=${batch.quantity_remaining}`);
    });

    if (activeBatches.length === 0) {
      console.log(`[CreateMenu] No active batches found, returning 0`);
      return {
        totalCost: 0,
        batchBreakdown: [],
        averageUnitPrice: 0
      };
    }

    // Calculate how much to take from each batch
    let remainingToConsume = requestedQuantity;
    let totalCost = 0;
    const batchBreakdown = [];

    for (const batch of activeBatches) {
      if (remainingToConsume <= 0) break;

      const batchRemaining = parseFloat(batch.quantity_remaining);
      const batchPrice = parseFloat(batch.unit_price);

      // How much to take from this batch
      const consumeFromBatch = Math.min(remainingToConsume, batchRemaining);
      const batchCost = consumeFromBatch * batchPrice;

      console.log(`[CreateMenu] Using ${consumeFromBatch} from batch ${batch.id} at price ${batchPrice}, cost: ${batchCost}`);

      totalCost += batchCost;
      remainingToConsume -= consumeFromBatch;

      batchBreakdown.push({
        batch_id: batch.id,
        quantity: consumeFromBatch,
        unit_price: batchPrice,
        cost: batchCost,
        purchase_date: batch.purchase_date
      });
    }

    // If we still have remaining quantity that couldn't be fulfilled
    if (remainingToConsume > 0) {
      console.warn(`[CreateMenu] Not enough stock to fulfill requested quantity. Short by ${remainingToConsume}`);
    }

    // Calculate weighted average unit price
    const consumedQuantity = requestedQuantity - remainingToConsume;
    const averageUnitPrice = consumedQuantity > 0 ? totalCost / consumedQuantity : 0;

    console.log(`[CreateMenu] Multi-batch calculation complete. Total cost: ${totalCost}, Average unit price: ${averageUnitPrice}`);

    return {
      totalCost,
      batchBreakdown,
      averageUnitPrice,
      consumedQuantity
    };
  } catch (error) {
    console.error(`[CreateMenu] Error calculating multi-batch price:`, error);
    return {
      totalCost: 0,
      batchBreakdown: [],
      averageUnitPrice: 0,
      error: error.message
    };
  }
};
// In messController.js

// ... other controller functions

// In messController.js

const createSpecialConsumption = async (req, res) => {
  const { name, description, consumption_date, items } = req.body;
  const hostel_id = req.user.hostel_id;
  const user_id = req.user.id;
  const transaction = await sequelize.transaction();

  try {
    if (!name || !consumption_date) {
      throw new Error('Consumption name and date are required.');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item must be provided for consumption.');
    }

    const consumptionsForLogic = items.map(item => ({
      item_id: item.item_id,
      quantity_consumed: parseFloat(item.quantity_consumed),
      unit: item.unit_id,
      consumption_date,
      meal_type: 'snacks', // Use a generic meal_type
      // No need for recorded_by here, we pass it directly to the logic function
    }));

    // --- FIX #1: Pass user_id and get the created records directly ---
    const { lowStockItems, createdDailyConsumptions } = await _recordBulkConsumptionLogic(
      consumptionsForLogic,
      hostel_id,
      user_id, // Pass the user_id
      transaction
    );

    // --- FIX #2: No need for the extra DB query anymore ---
    // REMOVED: const createdDailyConsumptions = await DailyConsumption.findAll(...)

    if (!createdDailyConsumptions || createdDailyConsumptions.length === 0) {
      throw new Error("Failed to record any item consumptions in the database.");
    }

    const totalCost = createdDailyConsumptions.reduce((sum, record) => sum + parseFloat(record.total_cost), 0);

    const specialConsumption = await SpecialConsumption.create({
      hostel_id,
      name,
      description,
      consumption_date,
      recorded_by: user_id,
      total_cost: totalCost,
    }, { transaction });

    const consumptionItemPromises = createdDailyConsumptions.map(dc => {
      return SpecialConsumptionItem.create({
        special_consumption_id: specialConsumption.id,
        item_id: dc.item_id,
        daily_consumption_id: dc.id,
        quantity_consumed: dc.quantity_consumed,
        unit_id: dc.unit,
        cost: dc.total_cost,
      }, { transaction });
    });

    await Promise.all(consumptionItemPromises);

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Special consumption recorded successfully.',
      data: {
        ...specialConsumption.toJSON(),
        lowStockItems,
      },
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Special consumption creation error:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};


const getSpecialConsumptions = async (req, res) => {
  try {
    const { from_date, to_date, search } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (from_date && to_date) {
      whereClause.consumption_date = { [Op.between]: [from_date, to_date] };
    }

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const consumptions = await SpecialConsumption.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'RecordedBy', attributes: ['id', 'username'] }
      ],
      order: [['consumption_date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({ success: true, data: consumptions });
  } catch (error) {
    console.error('Get special consumptions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSpecialConsumptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = req.user.hostel_id;

    const consumption = await SpecialConsumption.findOne({
      where: { id, hostel_id },
      include: [
        { model: User, as: 'RecordedBy', attributes: ['id', 'username'] },
        {
          model: SpecialConsumptionItem,
          as: 'ItemsConsumed',
          include: [
            { model: Item, attributes: ['id', 'name'] },
            { model: UOM, attributes: ['id', 'abbreviation'] },
          ],
        },
      ],
    });

    if (!consumption) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    res.json({ success: true, data: consumption });
  } catch (error) {
    console.error('Get special consumption by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// In messController.js

// NEW: Function to get Additional Income related to menu rounding
const getMenuRoundingAdjustments = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

    const roundingIncomeType = await IncomeType.findOne({
      where: { name: MENU_ROUNDING_INCOME_TYPE_NAME }
    });

    if (!roundingIncomeType) {
      return res.status(200).json({ success: true, data: [], message: 'No "Menu Rounding Adjustments" income type found.' });
    }

    let whereClause = {
      hostel_id,
      income_type_id: roundingIncomeType.id
    };

    if (from_date && to_date) {
      whereClause.received_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const adjustments = await AdditionalIncome.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'IncomeReceivedBy', attributes: ['id', 'username'] },
        { model: IncomeType, as: 'IncomeType', attributes: ['id', 'name'] }
      ],
      order: [['received_date', 'DESC']],
    });

    res.status(200).json({ success: true, data: adjustments });

  } catch (error) {
    console.error('Error fetching menu rounding adjustments:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

// NEW: Function to get Additional Income related to daily charge rounding
const getDailyChargeRoundingAdjustments = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

    const roundingIncomeType = await IncomeType.findOne({
      where: { name: DAILY_CHARGE_ROUNDING_INCOME_TYPE_NAME }
    });

    if (!roundingIncomeType) {
      return res.status(200).json({ success: true, data: [], message: 'No "Daily Charge Rounding Adjustments" income type found.' });
    }

    let whereClause = {
      hostel_id,
      income_type_id: roundingIncomeType.id
    };

    if (from_date && to_date) {
      whereClause.received_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const adjustments = await AdditionalIncome.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'IncomeReceivedBy', attributes: ['id', 'username'] },
        { model: IncomeType, as: 'IncomeType', attributes: ['id', 'name'] }
      ],
      order: [['received_date', 'DESC']],
    });

    res.status(200).json({ success: true, data: adjustments });

  } catch (error) {
    console.error('Error fetching daily charge rounding adjustments:', error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

// REVISED getRoundingAdjustments: Now fetches all relevant rounding types
const getRoundingAdjustments = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

    // Find all IncomeTypes whose names contain keywords related to rounding
    const roundingIncomeTypes = await IncomeType.findAll({
      where: {
        name: {
          [Op.or]: [
            { [Op.like]: `%${MENU_ROUNDING_INCOME_TYPE_NAME}%` },
            { [Op.like]: `%${DAILY_CHARGE_ROUNDING_INCOME_TYPE_NAME}%` },
            { [Op.like]: `%Rounding Adjustments%` } // Catch older/generic ones like your ID 6
            // Add any other specific names from your tbl_IncomeType that are related to rounding
          ]
        }
      }
    });

    const roundingIncomeTypeIds = roundingIncomeTypes.map(type => type.id);

    if (roundingIncomeTypeIds.length === 0) {
      return res.status(200).json({ success: true, data: [], message: 'No relevant rounding adjustment income types found.' });
    }

    let whereClause = {
      hostel_id,
      income_type_id: { [Op.in]: roundingIncomeTypeIds } // Filter by all identified rounding IDs
    };

    if (from_date && to_date) {
      whereClause.received_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const adjustments = await AdditionalIncome.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'IncomeReceivedBy', attributes: ['id', 'username'] },
        { model: IncomeType, as: 'IncomeType', attributes: ['id', 'name'] }
      ],
      order: [['received_date', 'DESC']],
    });

    res.status(200).json({ success: true, data: adjustments });

  } catch (error) {
    console.error('Error fetching rounding adjustments:', error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};
// Add this new function inside messController.js

// In messController.js
const getLatestPurchaseReport = async (req, res) => {
  try {
    const { hostel_id } = req.user;
    const { store_id } = req.query;

    const replacements = { hostel_id };

    const whereConditions = [
      `it.transaction_type = 'purchase'`,
      `it.hostel_id = :hostel_id`
    ];

    if (store_id) {
      whereConditions.push(`it.store_id = :store_id`);
      replacements.store_id = store_id;
    }

    const whereClauseString = whereConditions.join(' AND ');

    const query = `
      WITH LatestTransactions AS (
        SELECT
          it.item_id,
          it.store_id,
          it.quantity,
          it.unit_price,
          it.transaction_date,
          ROW_NUMBER() OVER(PARTITION BY it.item_id ORDER BY it.transaction_date DESC, it.id DESC) as rn
        FROM \`tbl_InventoryTransaction\` AS it
        WHERE ${whereClauseString}
      )
      SELECT
        i.name AS "itemName",
        s.name AS "storeName",
        lt.quantity,
        lt.unit_price AS "unitPrice",
        (lt.quantity * lt.unit_price) AS "totalCost"
      FROM LatestTransactions AS lt
      JOIN \`tbl_Item\` AS i ON i.id = lt.item_id
      LEFT JOIN \`tbl_Store\` AS s ON s.id = lt.store_id -- <<< THIS IS THE FIX (was JOIN)
      WHERE lt.rn = 1
      ORDER BY i.name;
    `;

    const reportData = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    res.json({ success: true, data: reportData });
  } catch (error) {
    console.error('Error generating latest purchase report:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const correctLastPurchase = async (req, res) => {
  const { item_id, new_quantity, new_unit_price } = req.body;
  const { hostel_id } = req.user;
  const transaction = await sequelize.transaction();

  try {
    if (!item_id || new_quantity === undefined || new_unit_price === undefined) {
      throw new Error("Item ID, new quantity, and new unit price are required.");
    }

    // 1. Find the latest inventory BATCH for this item
    const latestBatch = await InventoryBatch.findOne({
      where: { item_id, hostel_id },
      order: [['purchase_date', 'DESC'], ['id', 'DESC']],
      transaction
    });

    if (!latestBatch) {
      throw new Error("No purchase batch found for this item to correct.");
    }

    // 2. IMPORTANT: Check if items from this batch have already been consumed
    if (latestBatch.quantity_remaining < latestBatch.quantity_purchased) {
      throw new Error("Cannot correct purchase: Items from this batch have already been consumed. Please handle this as a stock adjustment.");
    }

    // 3. Find the corresponding inventory TRANSACTION to correct
    const latestTransaction = await InventoryTransaction.findOne({
      where: {
        item_id,
        hostel_id,
        transaction_type: 'purchase',
        // Match the transaction to the batch by date and price (this assumes one purchase per item per day, which is reasonable)
        // A better approach in the future would be to link transaction_id to batch_id
        transaction_date: latestBatch.purchase_date,
        unit_price: latestBatch.unit_price,
        quantity: latestBatch.quantity_purchased,
      },
      order: [['createdAt', 'DESC']],
      transaction
    });

    if (!latestTransaction) {
      throw new Error("Could not find the matching purchase transaction log to correct.");
    }

    const old_quantity = parseFloat(latestBatch.quantity_purchased);
    const quantity_difference = parseFloat(new_quantity) - old_quantity;

    // 4. Update the Inventory Batch
    await latestBatch.update({
      quantity_purchased: new_quantity,
      quantity_remaining: new_quantity, // Since none was consumed, remaining equals purchased
      unit_price: new_unit_price
    }, { transaction });

    // 5. Update the Inventory Transaction Log
    await latestTransaction.update({
      quantity: new_quantity,
      unit_price: new_unit_price
    }, { transaction });

    // 6. Adjust the main Item Stock total
    const itemStock = await ItemStock.findOne({ where: { item_id, hostel_id }, transaction });
    if (itemStock) {
      // Adjust by the difference
      itemStock.current_stock = parseFloat(itemStock.current_stock) + quantity_difference;
      await itemStock.save({ transaction });
    }

    await transaction.commit();
    res.json({ success: true, message: 'Last purchase corrected successfully.' });

  } catch (error) {
    await transaction.rollback();
    console.error('Error correcting last purchase:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const getMessFeeSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { hostel_id } = req.user;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required query parameters.'
      });
    }

    // 1. Get all active students in the hostel
    const students = await User.findAll({
      where: {
        hostel_id,
        role: 'student',
        is_active: true
      },
      attributes: ['id', 'username', 'email'],
      order: [['username', 'ASC']]
    });

    if (students.length === 0) {
      return res.json({
        success: true,
        data: { students: [], summary: {} }
      });
    }

    // 2. Get all mess bills for the specified month and year
    const bills = await MessBill.findAll({
      where: {
        hostel_id,
        month,
        year
      }
    });

    // 3. Create a map for quick lookup of bills by student_id
    const billMap = new Map();
    bills.forEach(bill => billMap.set(bill.student_id, bill));

    // 4. Combine student data with their bill information
    let totalAmount = 0;
    let pendingAmount = 0;
    let paidAmount = 0;
    let pendingBills = 0;
    let paidBills = 0;

    const studentsWithFees = students.map(student => {
      const studentJSON = student.toJSON();
      const bill = billMap.get(student.id);

      if (bill) {
        totalAmount += parseFloat(bill.amount);
        if (bill.status === 'paid') {
          paidAmount += parseFloat(bill.amount);
          paidBills++;
        } else {
          pendingAmount += parseFloat(bill.amount);
          pendingBills++;
        }
        return {
          ...studentJSON,
          amount: bill.amount,
          status: bill.status,
          due_date: bill.due_date,
          payment_date: bill.payment_date,
          bill_id: bill.id
        };
      } else {
        return {
          ...studentJSON,
          amount: 0,
          status: 'not_generated',
          due_date: null,
          payment_date: null,
          bill_id: null
        };
      }
    });

    res.json({
      success: true,
      data: {
        students: studentsWithFees,
        summary: {
          totalStudents: students.length,
          totalAmount: totalAmount.toFixed(2),
          pendingAmount: pendingAmount.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          billsGenerated: bills.length,
          pendingBills,
          paidBills
        }
      }
    });

  } catch (error) {
    console.error('Error fetching mess fee summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};
// Add this new function to messController.js
const getStudentFeeBreakdown = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { hostel_id } = req.user;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required.' });
    }

    // 1. Get all active students
    const students = await User.findAll({
      where: { hostel_id, role: 'student', is_active: true },
      attributes: ['id', 'username', 'email'],
      raw: true,
    });

    // 2. Get aggregated Daily Mess Charges
    const messCharges = await DailyMessCharge.findAll({
      where: { hostel_id, date: { [Op.between]: [new Date(year, month - 1, 1), new Date(year, month, 0)] } },
      group: ['student_id'],
      attributes: ['student_id', [sequelize.fn('SUM', sequelize.col('amount')), 'total_mess_bill']],
      raw: true,
    });

    // 3. Get aggregated Special Food Orders
    const foodOrders = await FoodOrder.findAll({
      where: { hostel_id, status: 'delivered', order_date: { [Op.between]: [new Date(year, month - 1, 1), new Date(year, month, 0)] } },
      group: ['student_id'],
      attributes: ['student_id', [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_special_food_cost']],
      raw: true,
    });

    // 4. Get aggregated Other Fees (Water Bill, etc.)
    const otherFees = await StudentFee.findAll({
      where: { hostel_id, month, year },
      group: ['student_id', 'fee_type'],
      attributes: ['student_id', 'fee_type', [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']],
      raw: true,
    });

    // 5. Create maps for efficient lookup
    const messChargeMap = new Map(messCharges.map(item => [item.student_id, parseFloat(item.total_mess_bill)]));
    const foodOrderMap = new Map(foodOrders.map(item => [item.student_id, parseFloat(item.total_special_food_cost)]));
    const waterBillMap = new Map();
    const otherExpenseMap = new Map();

    otherFees.forEach(fee => {
      if (fee.fee_type === 'water_bill') {
        waterBillMap.set(fee.student_id, parseFloat(fee.total_amount));
      } else { // Aggregate all other types into 'other_expenses'
        const current = otherExpenseMap.get(fee.student_id) || 0;
        otherExpenseMap.set(fee.student_id, current + parseFloat(fee.total_amount));
      }
    });

    // 6. Combine all data
    const feeBreakdown = students.map(student => {
      const mess_bill = messChargeMap.get(student.id) || 0;
      const special_food_cost = foodOrderMap.get(student.id) || 0;
      const water_bill = waterBillMap.get(student.id) || 0;
      const other_expenses = otherExpenseMap.get(student.id) || 0;
      const total = mess_bill + special_food_cost + water_bill + other_expenses;

      return {
        ...student,
        mess_bill: mess_bill.toFixed(2),
        special_food_cost: special_food_cost.toFixed(2),
        water_bill: water_bill.toFixed(2),
        other_expenses: other_expenses.toFixed(2),
        total: total.toFixed(2),
      };
    });

    res.json({ success: true, data: feeBreakdown });

  } catch (error) {
    console.error('Error fetching student fee breakdown:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
const getSessions = async (req, res) => {
    try {
        const sessions = await Session.findAll({ where: { is_active: true }, order: [['start_date', 'DESC']] });
        res.json({ success: true, data: sessions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching sessions: ' + error.message });
    }
};

// Also, add CRUD functions for the new StudentFee model
const createStudentFee = async (req, res) => {
  try {
    const { student_id, fee_type, amount, description, month, year } = req.body;
    const { hostel_id, id: issued_by } = req.user;

    const fee = await StudentFee.create({
      student_id, hostel_id, fee_type, amount, description, month, year, issued_by
    });

    res.status(201).json({ success: true, data: fee, message: 'Fee created successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const createBulkStudentFee = async (req, res) => {
  console.log('--- [START] Create Bulk Student Fee ---');
  const { session_id, fee_type, amount, description, month, year } = req.body;
  const { hostel_id, id: issued_by } = req.user;
  const transaction = await sequelize.transaction();

  try {
    console.log('[LOG] Received payload:', req.body);
    if (!session_id || !fee_type || !amount || !description || !month || !year) {
      throw new Error('Session, fee type, amount, description, and month/year are required.');
    }
    if (parseFloat(amount) <= 0) {
      throw new Error('Amount must be a positive number.');
    }

    console.log(`[LOG] Finding students for Session ID: ${session_id}`);
    const enrollments = await Enrollment.findAll({
      where: { session_id, hostel_id },
      attributes: ['student_id'],
      raw: true,
      transaction,
    });

    const studentIds = enrollments.map(e => e.student_id);

    if (studentIds.length === 0) {
      throw new Error('No students found for the selected session.');
    }
    console.log(`[LOG] Found ${studentIds.length} students to apply fee to.`);

    const feesToCreate = studentIds.map(student_id => ({
      student_id, hostel_id, fee_type, amount, description, month, year, issued_by,
    }));
    
    console.log('[LOG] Prepared fees for bulk creation:', feesToCreate.slice(0, 2)); // Log first 2 for brevity

    const createdFees = await StudentFee.bulkCreate(feesToCreate, { transaction });
    await transaction.commit();

    console.log('--- [END] Bulk Fee Creation Successful ---');
    res.status(201).json({
      success: true,
      message: `Successfully charged ${createdFees.length} students for "${description}".`,
      data: createdFees,
    });

  } catch (error) {
    await transaction.rollback();
    console.error('--- [ERROR] Creating bulk student fee:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};
const getStudentFees = async (req, res) => {
    try {
        const { month, year, fee_type } = req.query;
        const { hostel_id } = req.user;

        let whereClause = { hostel_id };
        if (month) whereClause.month = month;
        if (year) whereClause.year = year;
        if (fee_type) whereClause.fee_type = fee_type;

        const fees = await StudentFee.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'Student', attributes: ['id', 'username'] },
                { model: User, as: 'IssuedBy', attributes: ['id', 'username'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 100
        });

        res.json({ success: true, data: fees });

    } catch (error) {
        console.error('Error fetching student fees:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};
const createIncomeEntry = async (req, res) => {
  console.log('--- [START] Create Income Entry (Cash Token/Sister Concern) ---');
  const { type, amount, description, date } = req.body;
  const { hostel_id, id: recorded_by } = req.user;

  try {
    console.log('[LOG] Received payload:', req.body);
    if (!type || !amount || !date) {
      throw new Error('Type, amount, and date are required.');
    }

    // Find or create the IncomeType to ensure it exists
    const [incomeType] = await IncomeType.findOrCreate({
      where: { name: type },
      defaults: { name: type, description: `Entries for ${type}` }
    });

    const newEntry = await AdditionalIncome.create({
      hostel_id,
      income_type_id: incomeType.id,
      amount: parseFloat(amount),
      description,
      received_date: date,
      received_by: recorded_by,
    });
    
    console.log('[LOG] Successfully created new AdditionalIncome entry.');
    console.log('--- [END] Create Income Entry ---');

    res.status(201).json({
      success: true,
      message: `Entry for '${type}' created successfully.`,
      data: newEntry,
    });

  } catch (error) {
    console.error('--- [ERROR] Creating Income Entry:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

const getIncomeEntries = async (req, res) => {
  console.log('--- [START] Get Income Entries ---');
  try {
    const { hostel_id } = req.user;
    
    // Find the IDs for the two specific types
    const incomeTypes = await IncomeType.findAll({
        where: { name: { [Op.in]: ['Sister Concern Bill', 'Cash Token'] } },
        attributes: ['id']
    });
    const typeIds = incomeTypes.map(t => t.id);

    const entries = await AdditionalIncome.findAll({
      where: {
        hostel_id,
        income_type_id: { [Op.in]: typeIds }
      },
      include: [
        { model: IncomeType, as: 'IncomeType' },
        { model: User, as: 'IncomeReceivedBy', attributes: ['id', 'username'] }
      ],
      order: [['received_date', 'DESC']],
      limit: 200,
    });

    console.log(`[LOG] Found ${entries.length} income entries.`);
    console.log('--- [END] Get Income Entries ---');
    res.json({ success: true, data: entries });

  } catch (error) {
    console.error('--- [ERROR] Fetching Income Entries:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};
const generateMonthlyMessReport = async (req, res) => {
  console.log('--- [START] Generating Monthly Mess Report (Final Version) ---');
  try {
    const { month, year } = req.query;
    const { hostel_id } = req.user;

    console.log(`[LOG] Report requested for Month: ${month}, Year: ${year}, Hostel ID: ${hostel_id}`);

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required.' });
    }

    const startDate = moment({ year, month: month - 1 }).startOf('month').toDate();
    const endDate = moment({ year, month: month - 1 }).endOf('month').toDate();
    
    // 1. Get all active students for the report
    const students = await User.findAll({ where: { hostel_id, role: 'student', is_active: true }, attributes: ['id', 'username'], raw: true });
    if (students.length === 0) {
      console.log('[LOG] No active students found. Exiting.');
      return res.json({ success: true, data: [], summary: {} });
    }
    const studentIds = students.map(s => s.id);
    console.log(`[LOG] Found ${students.length} active students.`);

    // 2. Calculate Total Man-Days for the Month
    const totalManDays = await DailyMessCharge.count({ where: { hostel_id, student_id: { [Op.in]: studentIds }, is_charged: true, date: { [Op.between]: [startDate, endDate] } } });
    console.log(`[LOG] Total Man-Days for the month: ${totalManDays}`);
    
    // 3. Calculate Total Gross Expenses
    const totalFoodIngredientCost = (await DailyConsumption.sum('total_cost', { where: { hostel_id, consumption_date: { [Op.between]: [startDate, endDate] } } })) || 0;
    const totalOtherMessExpenses = (await MessDailyExpense.sum('amount', { where: { hostel_id, expense_date: { [Op.between]: [startDate, endDate] } } })) || 0;
    const grandTotalGrossExpenses = totalFoodIngredientCost + totalOtherMessExpenses;
    console.log(`[LOG] Total Gross Expenses: ${grandTotalGrossExpenses} (Food: ${totalFoodIngredientCost} + Other: ${totalOtherMessExpenses})`);

    // 4. Calculate Total Deductions/Income
    console.log('[LOG] Summing all deductions...');
    const creditSisterConcernBill = (await CreditToken.sum('amount', { 
        where: { hostel_id, date: { [Op.between]: [startDate, endDate] } } 
    })) || 0;
    console.log(`[LOG] Deduction - Credit Token (Sister Concern): ${creditSisterConcernBill}`);
    
    const cashTokenIncomeType = await IncomeType.findOne({ where: { name: 'Cash Token' } });
    let cashToken = 0; if (cashTokenIncomeType) { cashToken = (await AdditionalIncome.sum('amount', { where: { hostel_id, income_type_id: cashTokenIncomeType.id, received_date: { [Op.between]: [startDate, endDate] } } })) || 0; }
    console.log(`[LOG] Deduction - Cash Token: ${cashToken}`);
    
    const studentAdditionalCreditToken = (await FoodOrder.sum('total_amount', { where: { hostel_id, status: 'delivered', payment_status: 'paid', order_date: { [Op.between]: [startDate, endDate] } } })) || 0;
    console.log(`[LOG] Deduction - Student Special Orders: ${studentAdditionalCreditToken}`);
    
    const studentGuestIncomeType = await IncomeType.findOne({ where: { name: 'Student Guest Income' } });
    let studentGuestIncome = 0; if (studentGuestIncomeType) { studentGuestIncome = (await AdditionalIncome.sum('amount', { where: { hostel_id, income_type_id: studentGuestIncomeType.id, received_date: { [Op.between]: [startDate, endDate] } } })) || 0; }
    console.log(`[LOG] Deduction - Student Guest Income: ${studentGuestIncome}`);
    
    const totalDeductions = creditSisterConcernBill + cashToken + studentAdditionalCreditToken + studentGuestIncome;
    console.log(`[LOG] Total Deductions: ${totalDeductions}`);
    
    // 5. Calculate Adjusted Total Expenses and Monthly Daily Rate
    const adjustedTotalExpenses = grandTotalGrossExpenses - totalDeductions;
    const monthlyDailyRate = totalManDays > 0 ? adjustedTotalExpenses / totalManDays : 0;
    console.log(`[LOG] Adjusted Total Expenses: ${adjustedTotalExpenses}`);
    console.log(`[LOG] Calculated Daily Rate: ${monthlyDailyRate}`);
    
    // 6. Fetch and Map ALL other fees for the month
    console.log(`[LOG] Fetching StudentFee records for Month: ${month}, Year: ${year}`);
    const otherFees = await StudentFee.findAll({
      where: { hostel_id, month, year, student_id: { [Op.in]: studentIds } },
      attributes: ['student_id', 'fee_type', 'amount'],
      raw: true
    });
    console.log('[LOG] Raw `otherFees` fetched from DB:', otherFees);

    const bedChargeMap = new Map();
    const paperBillMap = new Map();
    const newspaperBillMap = new Map();

    otherFees.forEach(fee => {
      const studentId = fee.student_id;
      const amount = parseFloat(fee.amount);
      if (fee.fee_type === 'bed_charge') {
        bedChargeMap.set(studentId, (bedChargeMap.get(studentId) || 0) + amount);
      } else if (fee.fee_type === 'paper_bill') {
        paperBillMap.set(studentId, (paperBillMap.get(studentId) || 0) + amount);
      } else if (fee.fee_type === 'newspaper') {
        newspaperBillMap.set(studentId, (newspaperBillMap.get(studentId) || 0) + amount);
      }
    });
    console.log('[LOG] `paperBillMap` after processing:', Object.fromEntries(paperBillMap));
    console.log('[LOG] `newspaperBillMap` after processing:', Object.fromEntries(newspaperBillMap));
    
    // 7. Fetch Mess Days and Special Order amounts per student
    const studentMessDaysData = await DailyMessCharge.findAll({ attributes: ['student_id', [sequelize.fn('COUNT', sequelize.col('id')), 'mess_days']], where: { hostel_id, student_id: { [Op.in]: studentIds }, is_charged: true, date: { [Op.between]: [startDate, endDate] } }, group: ['student_id'], raw: true, });
    const messDaysMap = new Map(studentMessDaysData.map(item => [item.student_id, item.mess_days]));
    const studentFoodOrdersData = await FoodOrder.findAll({ attributes: ['student_id', [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_special_food_cost']], where: { hostel_id, student_id: { [Op.in]: studentIds }, status: 'delivered', payment_status: 'paid', order_date: { [Op.between]: [startDate, endDate] } }, group: ['student_id'], raw: true, });
    const foodOrderMap = new Map(studentFoodOrdersData.map(item => [item.student_id, parseFloat(item.total_special_food_cost)]));

    // 8. Generate Final Report Data for Each Student
    const reportData = students.map(student => {
      const studentMessDays = parseInt(messDaysMap.get(student.id) || 0);
      const messAmount = monthlyDailyRate * studentMessDays;
      const additionalAmount = foodOrderMap.get(student.id) || 0;
      const bedCharges = bedChargeMap.get(student.id) || 0;
      const paperBillAmount = paperBillMap.get(student.id) || 0;
      const newspaperAmount = newspaperBillMap.get(student.id) || 0;

      // Combine paper and newspaper bills into a single value for the total calculation
      const totalPaperAndNewspaper = paperBillAmount + newspaperAmount;

      if (student.id < students[5].id) {
          console.log(`[LOG] For student ${student.id} (${student.username}), found combined paper/newspaper amount: ${totalPaperAndNewspaper}`);
      }
      
      const totalRaw = messAmount + additionalAmount + bedCharges + totalPaperAndNewspaper;
      const finalAmount = Math.round(totalRaw);
      const roundingUp = finalAmount - totalRaw;

      return {
        studentId: student.id, name: student.username, regNo: student.username,
        messDays: studentMessDays, dailyRate: monthlyDailyRate, messAmount,
        additionalAmount, bedCharges,
        paperBill: paperBillAmount,
        hinduIndianExpress: newspaperAmount,
        total: totalRaw, netAmount: totalRaw, roundingUp, finalAmount,
      };
    }).sort((a, b) => a.regNo.localeCompare(b.regNo));
    
    // 9. Construct the Final Summary Object
    const summary = {
        subTotal: grandTotalGrossExpenses,
        totalFoodIngredientCost: totalFoodIngredientCost,
        totalOtherMessExpenses: totalOtherMessExpenses,
        cashToken,
        creditToken: creditSisterConcernBill,
        studentAdditionalCreditToken,
        studentGuestIncome,
        totalDeductions,
        totalExpenses: adjustedTotalExpenses,
        messDays: totalManDays,
        dailyRate: monthlyDailyRate,
    };
    
    console.log('--- [END] Mess Report Generation Successful ---');
    res.json({ success: true, data: reportData, summary });

  } catch (error) {
    console.error('--- [ERROR] Generating monthly mess report:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
const createConcern = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new Error('Concern name is required.');
    const concern = await Concern.create({ name, description });
    res.status(201).json({ success: true, data: concern });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all active concerns
const getConcerns = async (req, res) => {
  try {
    const concerns = await Concern.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    res.json({ success: true, data: concerns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a concern
const updateConcern = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    const concern = await Concern.findByPk(id);
    if (!concern) return res.status(404).json({ success: false, message: 'Concern not found.' });
    await concern.update({ name, description, is_active });
    res.json({ success: true, data: concern });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const deleteConcern = async (req, res) => {
  try {
    const { id } = req.params;
    const concern = await Concern.findByPk(id);
    if (!concern) return res.status(404).json({ success: false, message: 'Concern not found.' });
    await concern.destroy();
    res.json({ success: true, message: 'Concern deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDailyConsumptionDetails = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { hostel_id } = req.user;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required.' });
    }

    const startDate = moment({ year, month: month - 1 }).startOf('month').format('YYYY-MM-DD');
    const endDate = moment({ year, month: month - 1 }).endOf('month').format('YYYY-MM-DD');

    // This query groups total cost by both date and category name
    const result = await DailyConsumption.findAll({
      where: {
        hostel_id,
        consumption_date: { [Op.between]: [startDate, endDate] },
      },
      attributes: [
        'consumption_date',
        [sequelize.col('tbl_Item->tbl_ItemCategory.name'), 'category_name'],
        [sequelize.fn('SUM', sequelize.col('DailyConsumption.total_cost')), 'daily_total_cost'],
      ],
      include: [
        {
          model: Item,
          as: 'tbl_Item',
          attributes: [],
          required: true,
          include: [
            {
              model: ItemCategory,
              as: 'tbl_ItemCategory',
              attributes: [],
              required: true,
            }
          ]
        },
      ],
      group: ['consumption_date', sequelize.col('tbl_Item->tbl_ItemCategory.name')],
      order: [['consumption_date', 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching daily consumption details:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};


const exportStockToExcel = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    console.log(`[Export] User ${req.user.id} from Hostel ${hostel_id} is requesting stock export.`);

    const hostel = await Hostel.findByPk(hostel_id);
    if (!hostel) {
      console.error(`[Export Error] Hostel with ID ${hostel_id} not found for export request.`);
      return res.status(404).json({ success: false, message: 'Hostel not found.' });
    }

    // --- MODIFIED QUERY TO INCLUDE BACKTICKS AROUND ALIASES ---
    const query = `
      SELECT
        \`is\`.item_id,             -- Added backticks around alias 'is'
        \`is\`.current_stock,       -- Added backticks around alias 'is'
        \`is\`.minimum_stock,       -- Added backticks around alias 'is'
        \`i\`.name AS item_name,    -- Added backticks around alias 'i'
        \`uom\`.abbreviation AS unit_abbreviation, -- Added backticks around alias 'uom'
        \`i\`.unit_price AS item_base_unit_price,  -- Added backticks around alias 'i'
        (
          SELECT ib.unit_price
          FROM \`tbl_InventoryBatch\` AS ib
          WHERE ib.item_id = \`is\`.item_id -- Reference outer alias with backticks
            AND ib.hostel_id = \`is\`.hostel_id -- Reference outer alias with backticks
            AND ib.status = 'active'
            AND ib.quantity_remaining > 0
          ORDER BY ib.purchase_date ASC, ib.id ASC
          LIMIT 1
        ) AS fifo_unit_price
      FROM \`tbl_ItemStock\` AS \`is\` -- Added backticks around alias 'is'
      JOIN \`tbl_Item\` AS \`i\` ON \`i\`.id = \`is\`.item_id -- Added backticks around alias 'i'
      LEFT JOIN \`tbl_UOM\` AS \`uom\` ON \`uom\`.id = \`i\`.unit_id -- Added backticks around alias 'uom'
      WHERE \`is\`.hostel_id = :hostel_id -- Reference outer alias with backticks
      ORDER BY \`i\`.name ASC; -- Reference outer alias with backticks
    `;
    console.log("[Export] Executing SQL Query:", query);

    const stocks = await sequelize.query(query, {
      replacements: { hostel_id },
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`[Export] Fetched ${stocks.length} stock items.`);
    // console.log("[Export] Raw stock data:", JSON.stringify(stocks, null, 2)); // Uncomment for full data dump if needed

    // Check if data is coming back correctly before processing
    if (!stocks || stocks.length === 0) {
      console.warn("[Export] No stock data found for export. Generating an empty report.");
      // The rest of the code will handle creating an Excel file even if no data.
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stock Report');

    // Header: College Name
    worksheet.addRow(['NATIONAL ENGINEERING COLLEGE GENTS HOSTEL']);
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Header: Address
    worksheet.addRow(['K.R. NAGAR - 628 503']);
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Header: Date
    worksheet.addRow([`Stock as on ${moment().format('DD.MM.YYYY')}`]);
    worksheet.getCell('A3').font = { bold: true, size: 12 };
    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Add a blank row
    worksheet.addRow([]);

    // Manually add column headers (row 5)
    const headerRow = worksheet.addRow(['Sl.No.', 'Name of the Items', 'Qty', 'Balance stock', 'U.Rate', 'Amount']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Set column widths (manually since we're not using `worksheet.columns`)
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 10;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 15;

    let totalAmount = 0;

    stocks.forEach((stock, index) => {
      // Log each stock item before processing its values
      console.log(`[Export] Processing stock item ${index + 1}:`, stock);

      const itemName = stock.item_name || 'Unknown Item';
      const unitAbbreviation = stock.unit_abbreviation || '';
      const balanceStock = parseFloat(stock.current_stock || 0); // Ensure fallback for null/undefined
      const unitRate = parseFloat(stock.fifo_unit_price || stock.item_base_unit_price || 0); // Ensure fallback
      const amount = balanceStock * unitRate;
      totalAmount += amount;

      const row = worksheet.addRow([
        index + 1,
        itemName,
        unitAbbreviation,
        balanceStock.toFixed(3),
        unitRate.toFixed(2), // Display the FIFO unit price or fallback
        amount.toFixed(2)
      ]);

      // Format cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Align cells
      row.getCell(3).alignment = { horizontal: 'center' }; // Qty
      row.getCell(4).alignment = { horizontal: 'right' };  // Balance stock
      row.getCell(5).alignment = { horizontal: 'right' };  // U.Rate
      row.getCell(6).alignment = { horizontal: 'right' };  // Amount
    });
    console.log(`[Export] Total calculated amount: ${totalAmount.toFixed(2)}`);

    // Total row
    const totalRow = worksheet.addRow(['', '', '', '', 'Total amount', totalAmount.toFixed(2)]);
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(6).font = { bold: true };
    totalRow.getCell(6).alignment = { horizontal: 'right' };

    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Amount in words
    worksheet.addRow([]);
    const amountInWordsRow = worksheet.addRow([`Amount in words: ${convertNumberToWords(totalAmount.toFixed(2))} only`]);
    amountInWordsRow.getCell('A').font = { italic: true };
    worksheet.mergeCells(`A${amountInWordsRow.number}:F${amountInWordsRow.number}`);

    // Signature row
    worksheet.addRow([]);
    worksheet.addRow([]);
    const signatureRow = worksheet.addRow(['ASSOCIATE WARDEN', 'WARDEN', '', '', '', 'DIRECTOR']);
    signatureRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // Download Excel
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="StockReport_${moment().format('YYYYMMDD_HHmmss')}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting stock to Excel:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      originalError: error.original ? {
        message: error.original.message,
        code: error.original.code,
        sqlState: error.original.sqlState, // Added SQL state for more detail
        sql: error.original.sql // Added SQL query that caused the error
      } : 'No original error'
    });
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
// Helper function to convert numbers to words (Indian format)
function convertNumberToWords(num) {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n) {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? ' ' + units[digit] : '');
  }

  function convert(num) {
    if (num === 0) return 'Zero';
    let words = '';
    const parts = String(num).split('.');
    let integerPart = parseInt(parts[0], 10);
    let fractionalPart = parts[1] ? parseInt(parts[1], 10) : 0;

    if (integerPart >= 10000000) {
      words += convertChunk(Math.floor(integerPart / 10000000)) + ' Crore ';
      integerPart %= 10000000;
    }
    if (integerPart >= 100000) {
      words += convertChunk(Math.floor(integerPart / 100000)) + ' Lakh ';
      integerPart %= 100000;
    }
    if (integerPart >= 1000) {
      words += convertChunk(Math.floor(integerPart / 1000)) + ' Thousand ';
      integerPart %= 1000;
    }
    if (integerPart >= 100) {
      words += convertChunk(Math.floor(integerPart / 100)) + ' Hundred ';
      integerPart %= 100;
    }
    if (integerPart > 0) {
      words += convertChunk(integerPart);
    }

    words = words.trim();

    if (fractionalPart > 0) {
      words += ' Paise ' + convertChunk(fractionalPart);
    }

    return words || 'Zero';
  }

  const [whole, paise] = num.toString().split('.');
  let result = convert(parseInt(whole, 10));
  if (paise && parseInt(paise, 10) > 0) {
    result += ' ,paise ' + convertChunk(parseInt(paise, 10));
  }

  return result;
}
// In messController.js

// In messController.js
const exportUnitRateCalculation = async (req, res) => {
  try {
    const { month, year } = req.query; // Expecting month (1-12) and year
    const { hostel_id } = req.user;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required query parameters.' });
    }

    // Moment.js months are 0-indexed, so subtract 1 for correct date creation
    const startOfMonthMoment = moment({ year, month: month - 1 }).startOf('month');
    const endOfMonthMoment = moment({ year, month: month - 1 }).endOf('month');
    const previousMonthEndMoment = startOfMonthMoment.clone().subtract(1, 'second'); // End of the day before the report month starts

    const startOfMonth = startOfMonthMoment.format('YYYY-MM-DD HH:mm:ss');
    const endOfMonth = endOfMonthMoment.format('YYYY-MM-DD HH:mm:ss');
    const previousMonthEnd = previousMonthEndMoment.format('YYYY-MM-DD HH:mm:ss');

    console.log(`[UnitRateExport] Generating report for Hostel ${hostel_id}, Month: ${month}/${year}`);
    console.log(`[UnitRateExport] Report Month: ${startOfMonthMoment.format('MMMM YYYY')}`);
    console.log(`[UnitRateExport] Date Range for Purchases/Consumption: ${startOfMonth} to ${endOfMonth}`);
    console.log(`[UnitRateExport] Cut-off for Opening Stock: up to ${previousMonthEnd}`);

    // --- Step 1: Main Query to get aggregated data (Opening, Purchase, Last Unit Price) ---
    const mainReportQuery = `
      WITH AllItems AS (
          SELECT id, name, unit_id, unit_price FROM \`tbl_Item\`
      ),
      ItemUOMs AS (
          SELECT id, abbreviation FROM \`tbl_UOM\`
      ),
      -- Calculate effective opening stock quantity and its weighted average value
      OpeningBalances AS (
          SELECT
              ib.item_id,
              SUM(ib.quantity_remaining) AS opening_quantity,
              -- Calculate weighted average unit price for opening balance
              CASE 
                WHEN SUM(ib.quantity_remaining) > 0 THEN SUM(ib.quantity_remaining * ib.unit_price) / SUM(ib.quantity_remaining)
                ELSE 0 
              END AS opening_unit_rate
          FROM \`tbl_InventoryBatch\` AS ib
          WHERE ib.hostel_id = :hostel_id
            AND ib.purchase_date <= :previousMonthEnd
            AND ib.status = 'active'
            AND ib.quantity_remaining > 0
          GROUP BY ib.item_id
      ),
      -- Aggregate purchases for the current month
      MonthlyPurchases AS (
          SELECT
              ib.item_id,
              SUM(ib.quantity_purchased) AS purchase_qty,
              SUM(ib.quantity_purchased * ib.unit_price) AS purchase_amount
          FROM \`tbl_InventoryBatch\` AS ib
          WHERE ib.hostel_id = :hostel_id
            AND ib.purchase_date BETWEEN :startOfMonth AND :endOfMonth
            AND ib.quantity_purchased > 0 -- Only consider actual purchases
          GROUP BY ib.item_id
      ),
      -- Get last purchase unit price (most recent overall)
      LastPurchaseUnitPrice AS (
          SELECT 
              ib.item_id,
              ib.unit_price AS last_unit_price
          FROM \`tbl_InventoryBatch\` ib
          INNER JOIN (
              SELECT item_id, MAX(purchase_date) max_date
              FROM \`tbl_InventoryBatch\`
              WHERE hostel_id = :hostel_id
              GROUP BY item_id
          ) latest ON ib.item_id = latest.item_id AND ib.purchase_date = latest.max_date
          WHERE ib.hostel_id = :hostel_id
      )
      -- Main SELECT to bring it all together for each item
      SELECT
          ai.id AS item_id,
          ai.name AS item_name,
          iu.abbreviation AS unit_abbreviation,
          
          -- Opening Balance
          COALESCE(ob.opening_quantity, 0) AS opening_qty,
          -- Fallback to item's base unit_price if no batches contribute to opening balance
          COALESCE(ob.opening_unit_rate, ai.unit_price, 0) AS old_unit_rate,
          
          -- Purchases during the month
          COALESCE(mp.purchase_qty, 0) AS purchase_qty,
          COALESCE(mp.purchase_amount, 0) AS purchase_amount,
          
          -- Last unit price
          COALESCE(lpu.last_unit_price, ai.unit_price, 0) AS last_unit_price
          
      FROM AllItems AS ai
      LEFT JOIN ItemUOMs AS iu ON ai.unit_id = iu.id
      LEFT JOIN OpeningBalances AS ob ON ai.id = ob.item_id
      LEFT JOIN MonthlyPurchases AS mp ON ai.id = mp.item_id
      LEFT JOIN LastPurchaseUnitPrice AS lpu ON ai.id = lpu.item_id
      ORDER BY ai.name ASC;
    `;

    const reportData = await sequelize.query(mainReportQuery, {
      replacements: { hostel_id, startOfMonth, endOfMonth, previousMonthEnd },
      type: sequelize.QueryTypes.SELECT,
    });
    console.log(`[UnitRateExport] Fetched ${reportData.length} aggregated item data rows.`);

    // --- Excel Generation ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Unit Rate Calculation');

    // --- Header Rows ---
    worksheet.addRow(['NATIONAL ENGINEERING COLLEGE, Gents Hostel, K.R.Nagar']);
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    const monthName = startOfMonthMoment.format('MMMM YYYY').toUpperCase();
    worksheet.addRow([`Unit Rate Calculation - ${monthName}`]);
    worksheet.getCell('A2').font = { bold: true, size: 14 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.addRow([]); // Blank row

    // Fixed column structure
    const totalColsInReport = 10;
    const lastColumnLetter = 'J';

    // Merge title and subtitle rows across all columns
    worksheet.mergeCells(`A1:${lastColumnLetter}1`);
    worksheet.mergeCells(`A2:${lastColumnLetter}2`);

    // Header Row 1 - Main Categories
    const headerRow1Data = [
      'Sl. No',
      'Name of the Items',
      `Opening Balance ${startOfMonthMoment.format('MMM')}`, null, null, // Opening (3 cols)
      'Purchase during', null, null, // Purchase (3 cols)
      'Grand Total', null // Grand Total (2 cols)
    ];

    const headerRow1 = worksheet.addRow(headerRow1Data);

    // Header Row 2 - Sub-categories
    const headerRow2Data = [
      null, null, // Sl.No, Name
      'Qty', 'Old Unit Rate', 'Total Amount', // Opening
      'Qty', 'Unit Rate', 'Amount', // Purchase
      'Qty', 'Amount' // Grand Total
    ];

    const headerRow2 = worksheet.addRow(headerRow2Data);

    // Merging header cells (rows 4-5, 1-based)
    let currentHeaderCol = 1;
    worksheet.mergeCells(4, currentHeaderCol, 5, currentHeaderCol); currentHeaderCol++; // Sl. No
    worksheet.mergeCells(4, currentHeaderCol, 5, currentHeaderCol); currentHeaderCol++; // Name
    worksheet.mergeCells(4, currentHeaderCol, 4, currentHeaderCol + 2); currentHeaderCol += 3; // Opening Balance
    worksheet.mergeCells(4, currentHeaderCol, 4, currentHeaderCol + 2); currentHeaderCol += 3; // Purchase during
    worksheet.mergeCells(4, currentHeaderCol, 4, currentHeaderCol + 1); currentHeaderCol += 2; // Grand Total

    // Styling headers
    [headerRow1, headerRow2].forEach(row => {
      row.font = { bold: true };
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      row.eachCell(cell => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // Set column widths
    worksheet.columns = [
      { key: 'sl_no', width: 5 },
      { key: 'name', width: 30 },
      { key: 'open_qty', width: 10 },
      { key: 'old_unit_rate', width: 12 },
      { key: 'open_total_amount', width: 15 },
      { key: 'purchase_qty', width: 10 },
      { key: 'purchase_unit_rate', width: 12 },
      { key: 'purchase_amount', width: 15 },
      { key: 'grand_total_qty', width: 10 },
      { key: 'grand_total_amount', width: 15 }
    ];

    // Data Rows
    let grandTotalOverallAmount = 0;
    let grandTotalQty = 0;

    for (const [index, item] of reportData.entries()) {
      const rowData = [];

      // Sl. No
      rowData.push(index + 1);

      // Name of the Items
      rowData.push(item.item_name + (item.unit_abbreviation ? ` (${item.unit_abbreviation})` : ''));

      // Opening Balance
      const openingQty = parseFloat(item.opening_qty || 0);
      const oldUnitRate = parseFloat(item.old_unit_rate || 0);
      const openingTotalAmount = openingQty * oldUnitRate;
      rowData.push(openingQty, oldUnitRate, openingTotalAmount);

      // Purchases during the month
      const purchaseQty = parseFloat(item.purchase_qty || 0);
      const lastUnitPrice = parseFloat(item.last_unit_price || 0);
      const purchaseAmount = parseFloat(item.purchase_amount || 0);
      rowData.push(purchaseQty, lastUnitPrice, purchaseAmount);

      // Grand Total
      const grandTotalQtyItem = openingQty + purchaseQty;
      const grandTotalAmount = openingTotalAmount + purchaseAmount;
      rowData.push(grandTotalQtyItem, grandTotalAmount);
      grandTotalOverallAmount += grandTotalAmount;
      grandTotalQty += grandTotalQtyItem;

      const newRow = worksheet.addRow(rowData);

      // Apply formatting for the new row
      newRow.eachCell((cell, colIndex) => { // colIndex is 1-based
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        // Number formats
        if ([3, 6, 9].includes(colIndex)) {
          cell.numFmt = '0.000'; // Qty columns
        } else if ([4, 5, 7, 8, 10].includes(colIndex)) {
          cell.numFmt = '0.00'; // Rate and Amount columns
        }
      });
    }

    // Grand Total Row (for the entire report summary)
    const lastDataRowNumber = worksheet.lastRow.number;
    const totalRow = worksheet.getRow(lastDataRowNumber + 1);

    // Label "Grand Total" merged from B to H (before I=9)
    const grandTotalLabelStartCol = 2; // B
    const grandTotalLabelEndCol = 8; // H
    worksheet.mergeCells(lastDataRowNumber + 1, grandTotalLabelStartCol, lastDataRowNumber + 1, grandTotalLabelEndCol);

    totalRow.getCell(grandTotalLabelStartCol).value = 'Grand Total';
    totalRow.getCell(grandTotalLabelStartCol).font = { bold: true };
    totalRow.getCell(grandTotalLabelStartCol).alignment = { horizontal: 'right' };

    // Grand Total Qty in I (9)
    totalRow.getCell(9).value = grandTotalQty;
    totalRow.getCell(9).numFmt = '0.000';
    totalRow.getCell(9).font = { bold: true };

    // Grand Total Amount in J (10)
    totalRow.getCell(10).value = grandTotalOverallAmount;
    totalRow.getCell(10).numFmt = '0.00';
    totalRow.getCell(10).font = { bold: true };

    // Apply borders to the total row
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Signatures
    const signatureRowNumber = worksheet.lastRow.number + 3; // 3 blank rows after the total row
    const signatureRow = worksheet.getRow(signatureRowNumber);

    signatureRow.getCell(2).value = 'ASSOCIATE WARDEN';
    signatureRow.getCell(2).font = { bold: true };
    signatureRow.getCell(2).alignment = { horizontal: 'center' };

    // Positions for WARDEN (col D=4) and DIRECTOR (col J=10)
    const wardenCol = 5;
    const directorCol = 10;

    signatureRow.getCell(wardenCol).value = 'WARDEN';
    signatureRow.getCell(wardenCol).font = { bold: true };
    signatureRow.getCell(wardenCol).alignment = { horizontal: 'center' };

    signatureRow.getCell(directorCol).value = 'DIRECTOR';
    signatureRow.getCell(directorCol).font = { bold: true };
    signatureRow.getCell(directorCol).alignment = { horizontal: 'center' };

    // Finalize and send
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="UnitRateCalculation_${monthName}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('[UnitRateExport] Error exporting unit rate calculation:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
const createCreditToken = async (req, res) => {
  console.log('--- [START] Create Credit Token ---');
  const { concern_id, amount, date } = req.body;
  const { hostel_id, id: recorded_by } = req.user;

  try {
    console.log('[LOG] Received payload for CREATE:', req.body);
    if (!concern_id || !amount || !date) {
      throw new Error('Concern, amount, and date are required.');
    }
    if (parseFloat(amount) <= 0) {
      throw new Error('Amount must be a positive number.');
    }

    const newEntry = await CreditToken.create({
      hostel_id,
      concern_id,
      amount: parseFloat(amount),
      date,
      recorded_by,
    });

    console.log('[LOG] Successfully created new CreditToken entry:', newEntry.toJSON());
    console.log('--- [END] Create Credit Token ---');

    res.status(201).json({
      success: true,
      message: `Credit Token entry created successfully.`,
      data: newEntry,
    });
  } catch (error) {
    console.error('--- [ERROR] Creating Credit Token:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

// READ all Credit Token entries
const getCreditTokens = async (req, res) => {
  console.log('--- [START] Get Credit Tokens ---');
  try {
    const { hostel_id } = req.user;
    const entries = await CreditToken.findAll({
      where: { hostel_id },
      include: [
        { model: Concern, as: 'Concern' },
        { model: User, as: 'RecordedBy', attributes: ['id', 'username'] }
      ],
      order: [['date', 'DESC']],
      limit: 200, // Increased limit to show more recent history
    });
    console.log(`[LOG] Found ${entries.length} CreditToken entries.`);
    console.log('--- [END] Get Credit Tokens ---');
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('--- [ERROR] Fetching Credit Tokens:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// UPDATE an existing Credit Token entry
const updateCreditToken = async (req, res) => {
    console.log('--- [START] Update Credit Token ---');
    const { id } = req.params;
    const { concern_id, amount, date } = req.body;
    const { hostel_id } = req.user;

    try {
        console.log(`[LOG] Received payload for UPDATE (ID: ${id}):`, req.body);
        const entry = await CreditToken.findOne({ where: { id, hostel_id } });

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Entry not found.' });
        }

        await entry.update({
            concern_id,
            amount: parseFloat(amount),
            date,
        });
        
        console.log('[LOG] Successfully updated entry.');
        console.log('--- [END] Update Credit Token ---');
        res.json({ success: true, message: 'Credit Token entry updated successfully.', data: entry });

    } catch (error) {
        console.error('--- [ERROR] Updating Credit Token:', error);
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
};

// DELETE a Credit Token entry
const deleteCreditToken = async (req, res) => {
    console.log('--- [START] Delete Credit Token ---');
    const { id } = req.params;
    const { hostel_id } = req.user;

    try {
        console.log(`[LOG] Request to DELETE entry with ID: ${id}`);
        const result = await CreditToken.destroy({ where: { id, hostel_id } });

        if (result === 0) {
            return res.status(404).json({ success: false, message: 'Entry not found.' });
        }

        console.log('[LOG] Successfully deleted entry.');
        console.log('--- [END] Delete Credit Token ---');
        res.json({ success: true, message: 'Credit Token entry deleted successfully.' });

    } catch (error) {
        console.error('--- [ERROR] Deleting Credit Token:', error);
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
};


module.exports = {
  createMenu,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  createItemCategory,
  getItemCategories,
  updateItemCategory,
  deleteItemCategory,
  addItemsToMenu,
  getMenuWithItems,
  updateMenuItems,
  removeItemFromMenu,
  scheduleMenu,
  getMenuSchedule,
  updateMenuSchedule,
  deleteMenuSchedule,
  createUOM,
  getUOMs,
  updateUOM,
  deleteUOM,
  calculateMenuCost,
  getMessDashboardStats,
  updateItemStock,
  getItemStock,
  getDailyConsumption,
  recordBulkConsumption,
  recordInventoryPurchase,
  getInventoryTransactions,
  createStore,
  getStores,
  updateStore,
  deleteStore,
  mapItemToStore,
  getItemStores,
  removeItemStoreMapping,
  createSpecialFoodItem,
  getSpecialFoodItems,
  getSpecialFoodItemById,
  updateSpecialFoodItem,
  deleteSpecialFoodItem,
  createFoodOrder,
  getFoodOrders,
  getFoodOrderById,
  updateFoodOrderStatus,
  updatePaymentStatus,
  cancelFoodOrder,
  getMonthlyFoodOrderReport,
  getItemsByStoreId,
  getStoresByItemId,
  getSummarizedConsumptionReport,
  markMenuAsServed,
  createMessDailyExpense,
  getMessDailyExpenses,
  getMessDailyExpenseById,
  updateMessDailyExpense,
  deleteMessDailyExpense,
  createExpenseType,
  getExpenseTypes,
  updateExpenseType,
  deleteExpenseType,
  getItemBatches,
  getItemFIFOPrice,
  calculateMultiBatchPrice,
  _recordBulkConsumptionLogic,
  fetchBatchPrices,
  createSpecialConsumption,
  getSpecialConsumptions,
  getSpecialConsumptionById,
  calculateAndApplyDailyMessCharges, // Deprecated
  getRoundingAdjustments,
  getMenuRoundingAdjustments,
  getDailyChargeRoundingAdjustments,
  getLatestPurchaseReport,
  correctLastPurchase,
  getMessFeeSummary,
  getStudentFeeBreakdown,
  createStudentFee,
  generateMonthlyMessReport,
  exportStockToExcel,
  getDailyConsumptionDetails,
  exportUnitRateCalculation,
  createBulkStudentFee,
  getStudentFees,
  getSessions,
  createCreditToken,
  getCreditTokens,
  updateCreditToken,
  deleteCreditToken,
  createConcern,
  getConcerns,
  updateConcern,
  deleteConcern,
  getIncomeEntries,
  createIncomeEntry,
};
