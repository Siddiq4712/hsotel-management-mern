const {
  Menu, Item, ItemCategory, User, MenuItem, Hostel,Attendance,Enrollment,DailyMessCharge,
  MenuSchedule, UOM, ItemStock, DailyConsumption,MessBill,
  Store, ItemStore, InventoryTransaction, ConsumptionLog,IncomeType,AdditionalIncome, StudentFee,
  InventoryBatch, SpecialFoodItem, FoodOrder, FoodOrderItem,MessDailyExpense,ExpenseType,SpecialConsumption,SpecialConsumptionItem
} = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment')
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
const UNIVERSAL_ROUNDING_INCOME_TYPE_NAME = 'Rounding Adjustments'; // More generic name for primary aggregate
const MENU_ROUNDING_INCOME_TYPE_NAME = 'Menu Rounding Adjustments'; // For per-menu rounding
const DAILY_CHARGE_ROUNDING_INCOME_TYPE_NAME = 'Daily Charge Calculation Adjustments'; // For per-student calculation rounding

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
    // Actual rounding for charges happens when the menu is marked served.
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

    // Corrected SQL query with no JS comments
    const query = `
      WITH LastPurchase AS (
        SELECT
          it.item_id,
          it.store_id,
          it.quantity,
          it.unit_price,
          it.transaction_date,
          ROW_NUMBER() OVER(PARTITION BY it.item_id ORDER BY it.transaction_date DESC, it.id DESC) as rn
        FROM \`tbl_InventoryTransaction\` AS it
        WHERE it.transaction_type = 'purchase' AND it.hostel_id = :hostel_id
      )
      SELECT
        stock.*,
        item.name AS "Item.name",
        item.category_id AS "Item.category_id",
        category.name AS "Item.tbl_ItemCategory.name",
        uom.abbreviation AS "Item.UOM.abbreviation",
        item.unit_id AS "Item.unit_id",
        lp.quantity as last_bought_qty,
        lp.unit_price as last_bought_unit_price,
        (lp.quantity * lp.unit_price) as last_bought_overall_cost,
        store.name as last_bought_store_name,
        lp.store_id as last_bought_store_id
      FROM \`tbl_ItemStock\` AS stock
      JOIN \`tbl_Item\` AS item ON item.id = stock.item_id
      LEFT JOIN \`tbl_ItemCategory\` AS category ON category.id = item.category_id
      LEFT JOIN \`tbl_UOM\` as uom ON uom.id = item.unit_id
      LEFT JOIN (SELECT * FROM LastPurchase WHERE rn = 1) AS lp ON lp.item_id = stock.item_id
      LEFT JOIN \`tbl_Store\` AS store ON store.id = lp.store_id
      WHERE stock.hostel_id = :hostel_id
      ${low_stock === 'true' ? "AND stock.current_stock <= stock.minimum_stock" : ""}
      ORDER BY item.name ASC;
    `;

    const itemStocks = await sequelize.query(query, {
      replacements: { hostel_id },
      type: sequelize.QueryTypes.SELECT,
      nest: false
    });

    // Corrected formatting map to include the new ID
    const formattedData = itemStocks.map(stock => ({
      id: stock.id,
      item_id: stock.item_id,
      hostel_id: stock.hostel_id,
      current_stock: stock.current_stock,
      minimum_stock: stock.minimum_stock,
      last_purchase_date: stock.last_purchase_date,
      last_updated: stock.last_updated,
      last_bought_qty: stock.last_bought_qty,
      last_bought_unit_price: stock.last_bought_unit_price,
      last_bought_overall_cost: stock.last_bought_overall_cost,
      last_bought_store_name: stock.last_bought_store_name,
      last_bought_store_id: stock.last_bought_store_id, // <<< CRUCIAL LINE
      Item: {
        name: stock['Item.name'],
        category_id: stock['Item.category_id'],
        unit_id: stock['Item.unit_id'],
        tbl_ItemCategory: { name: stock['Item.tbl_ItemCategory.name'] },
        UOM: { abbreviation: stock['Item.UOM.abbreviation'] }
      }
    }));

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
              attributes: [], // We don't need category attributes either
              required: true,
            }
          ]
        },
      ],
      // MODIFIED: Group the results by the category name
      group: [sequelize.col('tbl_Item->tbl_ItemCategory.name')],
      order: [[sequelize.col('tbl_Item->tbl_ItemCategory.name'), 'ASC']],
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
      include: [
        {
          model: Menu,
          attributes: ['name'],
          include: [
            {
              model: MenuItem,
              as: 'tbl_Menu_Items',
              include: [{ model: Item, as: 'tbl_Item', include: [{ model: UOM, as: 'UOM' }] }]
            }
          ]
        }
      ],
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

    const menuTotalCost = parseFloat(schedule.total_cost || 0);
    const estimatedServings = parseFloat(schedule.estimated_servings || 0);

    let rawCostPerServing = 0;
    if (estimatedServings > 0) {
      rawCostPerServing = menuTotalCost / estimatedServings;
    }
    
    // REMOVED: All daily rounding logic for the menu cost.

    const consumptions = schedule.Menu.tbl_Menu_Items.map(menuItem => {
      let unitId = menuItem.unit_id;
      if (!unitId && menuItem.tbl_Item && menuItem.tbl_Item.unit_id) {
        unitId = menuItem.tbl_Item.unit_id;
      }
      if (!unitId) { console.warn(`No unit_id found for item ${menuItem.item_id}, using default unit ID: 1`); unitId = 1; }
      return {
        item_id: menuItem.item_id,
        quantity_consumed: parseFloat(menuItem.quantity),
        unit: unitId,
        consumption_date: schedule.scheduled_date,
        meal_type: schedule.meal_time
      };
    });

    const { lowStockItems } = await _recordBulkConsumptionLogic(consumptions, hostel_id, userId, transaction);

    // MODIFIED: Store the raw, unrounded cost per serving.
    await schedule.update({
      status: 'served',
      cost_per_serving: rawCostPerServing 
    }, { transaction });

    // REMOVED: The logic to create/update AdditionalIncome for rounding is gone.

    await transaction.commit();
    res.status(200).json({
      success: true,
      message: 'Menu marked as served and stock updated.',
      data: {
        lowStockItems,
        // MODIFIED: Return the raw cost for informational purposes.
        costPerServing: parseFloat(rawCostPerServing.toFixed(4)), 
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[markMenuAsServed] Error:', error.message, error.stack);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
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
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
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
      console.log(`[CreateMenu] Batch ${i+1}: ID=${batch.id}, Date=${batch.purchase_date}, Price=${batch.unit_price}, Remaining=${batch.quantity_remaining}`);
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

const calculateAndApplyDailyMessCharges = async (req, res) => {
  const { date } = req.body;
  const { hostel_id, id: userId } = req.user;

  if (!date) {
    return res.status(400).json({ success: false, message: 'A specific date is required.' });
  }
  if (!hostel_id) {
    return res.status(401).json({ success: false, message: 'User is not associated with a hostel.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const dailyMenuCostResult = await MenuSchedule.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('cost_per_serving')), 'totalDailyMenuCost']
      ],
      where: { hostel_id, scheduled_date: date, status: 'served' },
      raw: true,
      transaction
    });
    // NOTE: This value is now a sum of RAW, unrounded menu costs.
    const totalDailyMenuCost = parseFloat(dailyMenuCostResult.totalDailyMenuCost || 0);

    const detailedExpensesRaw = await MessDailyExpense.findAll({
      attributes: [
        [sequelize.col('ExpenseType.name'), 'expenseTypeName'],
        [sequelize.fn('SUM', sequelize.col('MessDailyExpense.amount')), 'amount']
      ],
      where: { hostel_id, expense_date: date },
      include: [
        { model: ExpenseType, as: 'ExpenseType', attributes: [], where: { name: { [Op.ne]: 'others' } }, required: true }
      ],
      group: ['ExpenseType.name'],
      raw: true,
      transaction
    });

    let totalOtherExpenses = 0;
    const detailedExpenses = detailedExpensesRaw.map(exp => {
      const amount = parseFloat(exp.amount || 0);
      totalOtherExpenses += amount;
      return { expenseTypeName: exp.expenseTypeName, amount: amount };
    });

    const totalChargeableAmount = totalDailyMenuCost + totalOtherExpenses;

    if (totalChargeableAmount <= 0) {
      await transaction.rollback();
      return res.status(200).json({
        success: true,
        message: `No valid daily menu costs or relevant expenses found for ${date}. No charges applied.`,
        data: { /* ... */ }
      });
    }

    // ... (logic to find active students and attendance remains the same) ...

    const activeEnrollments = await Enrollment.findAll({ /* ... */ });
    const allActiveStudentIds = activeEnrollments.map(e => e.student_id);
    
    // ... (handling for no active students remains the same) ...

    const attendanceRecords = await Attendance.findAll({ /* ... */ });
    const attendanceMap = new Map(attendanceRecords.map(att => [att.student_id, att.status]));
    
    // ... (loop to determine students to charge remains the same) ...
    let studentsOnODCount = 0;
    const studentIdsToCharge = [];
    const recordsToCreateOrUpdate = [];
    for (const studentId of allActiveStudentIds) { /* ... */ }


    const divisorCount = studentIdsToCharge.length;
    let rawDailyCostPerStudent = 0;

    if (divisorCount > 0) {
      rawDailyCostPerStudent = totalChargeableAmount / divisorCount;
    } else {
      await transaction.rollback();
      return res.status(200).json({ /* ... response for no students to charge */ });
    }

    // REMOVED: All daily rounding logic.

    const finalRecordsWithAmounts = recordsToCreateOrUpdate.map(record => {
      if (record.is_charged) {
        // MODIFIED: Store the raw, unrounded amount.
        return { ...record, amount: rawDailyCostPerStudent };
      }
      return record;
    });

    if (finalRecordsWithAmounts.length > 0) {
      await DailyMessCharge.bulkCreate(finalRecordsWithAmounts, {
        updateOnDuplicate: ['amount', 'attendance_status', 'is_charged'],
        transaction
      });
    }

    // REMOVED: Logic to create/update AdditionalIncome for rounding.

    await transaction.commit();

    res.status(200).json({
      success: true,
      // MODIFIED: Message now reflects the raw, unrounded daily cost.
      message: `Successfully applied daily mess charges of ₹${rawDailyCostPerStudent.toFixed(4)} (gross total: ₹${totalChargeableAmount.toFixed(2)}) to ${divisorCount} students for ${date}.`,
      data: {
        date,
        dailyCost: rawDailyCostPerStudent,
        rawDailyCostPerStudent: parseFloat(rawDailyCostPerStudent.toFixed(4)),
        totalChargeableAmount,
        totalDailyMenuCost,
        detailedExpenses,
        studentsCharged: divisorCount,
        studentsExempt: studentsOnODCount,
        totalRoundingAdjustment: 0 // Set to 0 as it's no longer calculated here
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error calculating daily mess charges:', error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

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
// In messController.js

// In messController.js

const generateMonthlyMessReport = async (req, res) => {
  try {
    const { month, year, college } = req.query;
    const { hostel_id } = req.user;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required.' });
    }
    
    const startDate = moment({ year, month: month - 1 }).startOf('month').toDate();
    const endDate = moment({ year, month: month - 1 }).endOf('month').toDate();
    
    // Join with Enrollment to filter by college
    let studentIncludeClause = {
        model: Enrollment,
        as: 'tbl_Enrollments',
        attributes: [], // We only need it for filtering
        required: true,
    };

    if (college && college !== 'all') {
        studentIncludeClause.where = { college: college };
    }

    const students = await User.findAll({
      where: { hostel_id, role: 'student', is_active: true },
      include: [studentIncludeClause],
      attributes: ['id', 'username'],
      raw: true,
    });

    if (students.length === 0) {
        return res.json({ success: true, data: [] });
    }

    const studentIds = students.map(s => s.id);
    
    const messCharges = await DailyMessCharge.findAll({
      where: { 
        hostel_id, 
        student_id: {[Op.in]: studentIds},
        is_charged: true,
        date: { [Op.between]: [startDate, endDate] } 
      },
      group: ['student_id'],
      attributes: [
        'student_id', 
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_mess_bill'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'mess_days']
      ],
      raw: true,
    });

    const foodOrders = await FoodOrder.findAll({
      where: { 
        hostel_id, student_id: {[Op.in]: studentIds},
        status: { [Op.ne]: 'cancelled' }, 
        payment_status: { [Op.ne]: 'refunded' },
        order_date: { [Op.between]: [startDate, endDate] } 
      },
      group: ['student_id'],
      attributes: ['student_id', [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_special_food_cost']],
      raw: true,
    });
    
    const otherFees = await StudentFee.findAll({
        where: { hostel_id, month, year, student_id: {[Op.in]: studentIds} },
        attributes: ['student_id', 'fee_type', 'amount'],
        raw: true
    });
    
    const messChargeMap = new Map(messCharges.map(item => [item.student_id, { amount: parseFloat(item.total_mess_bill), days: item.mess_days }]));
    const foodOrderMap = new Map(foodOrders.map(item => [item.student_id, parseFloat(item.total_special_food_cost)]));
    const bedChargeMap = new Map();
    otherFees.forEach(fee => {
        if (fee.fee_type === 'bed_charge') {
             bedChargeMap.set(fee.student_id, parseFloat(fee.amount));
        }
    });

    const fixedCharges = { hinduIndianExpress: 28.18 };

    const reportData = students.map(student => {
      const messData = messChargeMap.get(student.id) || { amount: 0, days: 0 };
      const additionalAmount = foodOrderMap.get(student.id) || 0;
      const bedCharges = bedChargeMap.get(student.id) || 0;
      
      const total = messData.amount + additionalAmount + bedCharges + fixedCharges.hinduIndianExpress;
      const netAmount = total;
      const finalAmount = Math.round(netAmount);
      const roundingUp = finalAmount - netAmount;

      // Calculate the daily rate
      const dailyRate = messData.days > 0 ? messData.amount / messData.days : 0;

      return {
        studentId: student.id,
        name: student.username,
        regNo: student.username,
        messDays: messData.days,
        messAmount: messData.amount,
        additionalAmount: additionalAmount,
        bedCharges: bedCharges,
        hinduIndianExpress: fixedCharges.hinduIndianExpress,
        total: total,
        netAmount: netAmount,
        roundingUp: roundingUp,
        finalAmount: finalAmount,
        dailyRate: dailyRate,
      };
    }).sort((a, b) => a.regNo.localeCompare(b.regNo));

    res.json({ success: true, data: reportData });

  } catch (error) {
    console.error('Error generating monthly mess report:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
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
  calculateAndApplyDailyMessCharges,
  getRoundingAdjustments,
  getMenuRoundingAdjustments,
  getDailyChargeRoundingAdjustments,
  getLatestPurchaseReport,
  correctLastPurchase,
  getMessFeeSummary,
  getStudentFeeBreakdown,
  createStudentFee,
  generateMonthlyMessReport,
  getDailyConsumptionDetails,
};