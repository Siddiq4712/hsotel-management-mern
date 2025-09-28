const {
  Menu, Item, ItemCategory, User, MenuItem, Hostel,
  MenuSchedule, UOM, ItemStock, DailyConsumption,
  Store, ItemStore, InventoryTransaction, ConsumptionLog,
  InventoryBatch, SpecialFoodItem, FoodOrder, FoodOrderItem,MessDailyExpense,ExpenseType
} = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// MENU MANAGEMENT - Complete CRUD
/*const createMenu = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, meal_type, description, estimated_servings, preparation_time, items } = req.body;
    const hostel_id = req.user.hostel_id;

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
      const menuItems = items.map(item => ({
        menu_id: menu.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit_id,
        preparation_notes: item.preparation_notes
      }));
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};*/
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
      whereClause.name = { [Op.iLike]: `%${search}%` };
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
      whereClause.name = { [Op.iLike]: `%${search}%` };
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
      whereClause.name = { [Op.iLike]: `%${search}%` };
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
    const { menu_id, scheduled_date, meal_time } = req.body; // REMOVED estimated_servings from req.body
    const hostel_id = req.user.hostel_id;

    if (!menu_id || !scheduled_date || !meal_time) { // Adjusted validation
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Menu ID, date, and meal time are required',
      });
    }

    // Fetch the menu with its items to calculate the cost
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
              attributes: ['id', 'name', 'unit_price'],
            },
          ],
        }
      ],
      transaction
    });

    if (!menu) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    // Use the estimated_servings from the fetched Menu record
    const menuEstimatedServings = menu.estimated_servings;

    if (menuEstimatedServings <= 0) { // Validate Menu's estimated_servings
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'The selected menu has zero or invalid estimated servings. Please update the menu.'
      });
    }

    // Calculate total cost
    let total_cost = 0;
    if (menu.tbl_Menu_Items && menu.tbl_Menu_Items.length > 0) {
      total_cost = menu.tbl_Menu_Items.reduce((sum, menuItem) => {
        const itemPrice = parseFloat(menuItem.tbl_Item.unit_price) || 0;
        const itemQuantity = parseFloat(menuItem.quantity) || 0;
        return sum + (itemPrice * itemQuantity);
      }, 0);
    }

    const cost_per_serving = total_cost / menuEstimatedServings; // Use Menu's servings

    // Create the schedule with calculated costs
    const schedule = await MenuSchedule.create({
      hostel_id,
      menu_id,
      scheduled_date,
      meal_time,
      status: 'scheduled',
      estimated_servings: menuEstimatedServings, // Use Menu's estimated_servings
      total_cost,
      cost_per_serving,
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Menu scheduled successfully with cost calculation',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Schedule menu error:', error);
    // Provide a more specific error for client-side issues vs server-side
    const errorMessage = error.message.includes("undefined") ? "Invalid data provided for scheduling." : "Server error";
    res.status(500).json({ success: false, message: errorMessage + ': ' + error.message });
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

    let whereClause = { hostel_id };

    if (low_stock === 'true') {
      whereClause = {
        ...whereClause,
        [Op.where]: sequelize.where(
          sequelize.col('current_stock'),
          Op.lte,
          sequelize.col('minimum_stock')
        )
      };
    }

    const itemStocks = await ItemStock.findAll({
      where: whereClause,
      include: [{
        model: Item,
        include: [{
          model: ItemCategory,
          as: 'tbl_ItemCategory'
        }]
      }],
      order: [['last_updated', 'DESC']]
    });

    res.json({
      success: true,
      data: itemStocks
    });
  } catch (error) {
    console.error('Item stock fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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

const _recordBulkConsumptionLogic = async (consumptions, hostel_id, transaction) => {
  console.log("[FIFO] Starting consumption processing with FIFO logic");
  const lowStockItems = [];
  
  for (const consumption of consumptions) {
    try {
      console.log(`[FIFO] Processing item ${consumption.item_id}, quantity ${consumption.quantity_consumed}`);
      
      // Validate required properties
      if (!consumption.item_id || !consumption.quantity_consumed) {
        console.error('[FIFO] Missing required consumption properties:', consumption);
        throw new Error('Invalid consumption data: missing required fields');
      }
      
      // Make sure we have a valid unit value
      if (consumption.unit === undefined || consumption.unit === null) {
        const item = await Item.findByPk(consumption.item_id, {
          include: [{ model: UOM, as: 'UOM' }],
          transaction
        });
        
        consumption.unit = item?.unit_id || 1;
        console.log(`[FIFO] Using unit_id ${consumption.unit} for item ${consumption.item_id}`);
      }
      
      let remaining = consumption.quantity_consumed;
      
      // Get the latest ItemStock record
      const currentStock = await ItemStock.findOne({
        where: { item_id: consumption.item_id, hostel_id },
        order: [['updatedAt', 'DESC']],
        transaction
      });
      
      if (!currentStock || currentStock.current_stock < consumption.quantity_consumed) {
        console.error(`[FIFO] Insufficient stock for item ${consumption.item_id}. Required: ${consumption.quantity_consumed}, Available: ${currentStock?.current_stock || 0}`);
        throw new Error(`Insufficient stock for item ID: ${consumption.item_id}`);
      }
      
      // Find active batches
      const batches = await InventoryBatch.findAll({
        where: {
          item_id: consumption.item_id,
          hostel_id,
          status: 'active',
          quantity_remaining: { [Op.gt]: 0 }
        },
        order: [['purchase_date', 'ASC']], // FIFO order - oldest first
        transaction
      });

      console.log(`[FIFO] Found ${batches.length} active batches for item ${consumption.item_id}`);
      console.log(`[FIFO] Batches:`, batches.map(b => ({
        id: b.id, 
        purchase_date: b.purchase_date, 
        qty_remaining: b.quantity_remaining,
        unit_price: b.unit_price
      })));
      
      // If no active batches but we have stock, create a synthetic batch
      if (batches.length === 0) {
        console.warn(`[FIFO] No active batches found for item ${consumption.item_id}, but stock exists. Creating a synthetic batch.`);
        
        const item = await Item.findByPk(consumption.item_id, { transaction });
        
        if (!item) {
          throw new Error(`Item not found: ${consumption.item_id}`);
        }
        
        const syntheticBatch = await InventoryBatch.create({
          item_id: consumption.item_id,
          hostel_id,
          quantity_purchased: currentStock.current_stock,
          quantity_remaining: currentStock.current_stock,
          unit_price: item.unit_price || 0,
          purchase_date: currentStock.last_purchase_date || new Date(),
          status: 'active'
        }, { transaction });
        
        console.log(`[FIFO] Created synthetic batch ${syntheticBatch.id} with ${syntheticBatch.quantity_remaining} quantity`);
        
        batches.push(syntheticBatch);
      }
      
      // Process the consumption against batches (FIFO)
      let totalCost = 0;
      
      for (const batch of batches) {
        if (remaining <= 0) break;
        
        const deduct = Math.min(remaining, batch.quantity_remaining);
        console.log(`[FIFO] Deducting ${deduct} from batch ${batch.id} with unit price ${batch.unit_price}`);
        
        // Calculate the cost using batch's unit price
        const batchCost = deduct * parseFloat(batch.unit_price);
        totalCost += batchCost;
        
        console.log(`[FIFO] Batch cost: ${batchCost} (${deduct} × ${batch.unit_price}), Total cost so far: ${totalCost}`);
        
        // Update the batch
        batch.quantity_remaining -= deduct;
        
        // CRITICAL FIX: Mark batch as depleted when empty
        if (batch.quantity_remaining <= 0) {
          console.log(`[FIFO] Batch ${batch.id} is now depleted, updating status to 'depleted'`);
          batch.status = 'depleted';
        }
        
        await batch.save({ transaction });
        remaining -= deduct;

        console.log(`[FIFO] Creating DailyConsumption for item ${consumption.item_id}`);
        const dailyConsumption = await DailyConsumption.create({
          hostel_id,
          item_id: consumption.item_id,
          consumption_date: consumption.consumption_date || new Date(),
          quantity_consumed: deduct,
          unit: consumption.unit,
          meal_type: consumption.meal_type || 'dinner',
          recorded_by: consumption.recorded_by || 1,
          total_cost: batchCost
        }, { transaction });

        console.log(`[FIFO] Creating ConsumptionLog for dailyConsumption ${dailyConsumption.id}, cost: ${batchCost}`);
        await ConsumptionLog.create({
          daily_consumption_id: dailyConsumption.id,
          batch_id: batch.id,
          quantity_consumed: deduct,
          cost: batchCost,
          meal_type: consumption.meal_type || 'dinner'
        }, { transaction });
      }

      if (remaining > 0) {
        console.error(`[FIFO] Something went wrong - couldn't consume all requested quantity. Remaining: ${remaining}`);
        throw new Error(`Could not consume all requested quantity for item ID: ${consumption.item_id}`);
      }

      // Update ItemStock
      console.log(`[FIFO] Updating ItemStock for item ${consumption.item_id}. Current: ${currentStock.current_stock}, Consumed: ${consumption.quantity_consumed}`);
      currentStock.current_stock -= consumption.quantity_consumed;
      currentStock.last_updated = new Date();
      
      if (currentStock.current_stock <= currentStock.minimum_stock) {
        console.log(`[FIFO] Low stock detected for item ${consumption.item_id}: ${currentStock.current_stock} <= ${currentStock.minimum_stock}`);
        const item = await Item.findByPk(consumption.item_id, {
          include: [{ model: UOM, as: 'UOM' }],
          transaction
        });
        
        if (item) {
          lowStockItems.push({
            name: item.name,
            current_stock: currentStock.current_stock,
            unit: item.UOM ? item.UOM.abbreviation : 'unit',
            minimum_stock: currentStock.minimum_stock
          });
        }
      }
      
      await currentStock.save({ transaction });
      console.log(`[FIFO] ItemStock updated successfully. New stock level: ${currentStock.current_stock}`);
    } catch (error) {
      console.error(`[FIFO] Error processing item ${consumption?.item_id}:`, error.message);
      throw error;
    }
  }
  
  console.log('[FIFO] Low stock items:', lowStockItems);
  return lowStockItems;
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
const recordInventoryPurchase = async (req, res) => {
  const { items } = req.body;
  const hostel_id = req.user.hostel_id;
  const transaction = await sequelize.transaction();

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items array is required');
    }

    const createdBatches = [];

    for (const item of items) {
      if (!item.item_id) {
        console.error('Missing item_id for inventory item');
        continue;
      }

      try {
        // Create a new inventory batch for this purchase
        const newBatch = await InventoryBatch.create({
          item_id: item.item_id,
          hostel_id,
          quantity_purchased: parseFloat(item.quantity),
          quantity_remaining: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          purchase_date: item.transaction_date || new Date(),
          expiry_date: item.expiry_date || null,
          status: 'active'
        }, { transaction });

        createdBatches.push(newBatch);

        // Update or create the ItemStock record
        let itemStock = await ItemStock.findOne({
          where: { item_id: item.item_id, hostel_id },
          transaction
        });

        if (itemStock) {
          // Calculate the new weighted average unit price
          const existingStock = parseFloat(itemStock.current_stock);
          const existingPrice = parseFloat(itemStock.unit_price || 0);
          const newQuantity = parseFloat(item.quantity);
          const newPrice = parseFloat(item.unit_price);

          const newAveragePrice = ((existingStock * existingPrice) + (newQuantity * newPrice)) / (existingStock + newQuantity);

          await itemStock.update({
            current_stock: existingStock + newQuantity,
            unit_price: newAveragePrice,
            last_purchase_date: item.transaction_date || new Date()
          }, { transaction });
        } else {
          itemStock = await ItemStock.create({
            item_id: item.item_id,
            hostel_id,
            current_stock: item.quantity,
            unit_price: item.unit_price,
            minimum_stock: 0,
            last_purchase_date: item.transaction_date || new Date()
          }, { transaction });
        }
      } catch (itemError) {
        throw itemError;
      }
    }

    await transaction.commit();
    res.status(201).json({
      success: true,
      message: 'Purchases recorded and inventory batches created.',
      data: createdBatches
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Inventory purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
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
      whereClause.name = { [Op.iLike]: `%${search}%` };
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
      whereClause.name = { [Op.iLike]: `%${search}%` };
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

    if (!itemStores) {
      return res.status(404).json({ success: false, message: 'No items mapped to this store yet.' });
    }

    // Format the response
    const items = itemStores.map(is => ({
      item_id: is.item_id,
      name: is.Item.name,
      unit_price: is.price,
      unit: is.Item.UOM?.abbreviation || 'unit'
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

const getSummarizedConsumptionReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const hostel_id = req.user.hostel_id;

    if (!start_date || !end_date) throw new Error('Start and end date are required.');

    const result = await DailyConsumption.findAll({
      where: {
        hostel_id,
        consumption_date: { [Op.between]: [start_date, end_date] },
      },
      attributes: [
        [sequelize.col('tbl_Item.name'), 'item_name'],
        [sequelize.col('DailyConsumption.unit'), 'unit'],
        [sequelize.fn('SUM', sequelize.col('DailyConsumption.quantity_consumed')), 'total_consumed'],
        [sequelize.fn('SUM', sequelize.col('DailyConsumption.total_cost')), 'total_cost'],
      ],
      include: [
        { model: Item, as: 'tbl_Item', attributes: [] },
        { model: ConsumptionLog, as: 'ConsumptionLogs', attributes: [] },
      ],
      group: ['tbl_Item.id', 'tbl_Item.name', 'DailyConsumption.unit'],
      order: [[sequelize.col('tbl_Item.name'), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating summarized consumption report:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const markMenuAsServed = async (req, res) => {
  const { id } = req.params;
  const { hostel_id } = req.user;
  const transaction = await sequelize.transaction();
  try {
    console.log(`[markMenuAsServed] Fetching schedule ID ${id} for hostel ${hostel_id}`);
    const schedule = await MenuSchedule.findByPk(id, {
      include: [
        { 
          model: Menu, 
          include: [
            { 
              model: MenuItem, 
              as: 'tbl_Menu_Items',
              include: [
                {
                  model: Item,
                  as: 'tbl_Item',
                  include: [
                    {
                      model: UOM,
                      as: 'UOM'
                    }
                  ]
                }
              ]
            }
          ] 
        }
      ],
      transaction
    });

    if (!schedule || schedule.hostel_id !== hostel_id) {
      console.error(`[markMenuAsServed] Schedule not found or unauthorized for ID ${id}`);
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Menu schedule not found' });
    }

    if (schedule.status === 'served') {
      console.warn(`[markMenuAsServed] Schedule ID ${id} already served`);
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Menu already served' });
    }

    console.log(`[markMenuAsServed] Processing consumption for ${schedule.Menu.tbl_Menu_Items.length} items`);
    
    // Prepare consumption data, ensuring valid unit values
    // In the markMenuAsServed function
const consumptions = schedule.Menu.tbl_Menu_Items.map(menuItem => {
  // Get the unit_id from the MenuItem or fall back to the Item's unit_id
  let unitId = menuItem.unit_id;
  
  // If unit_id is not available in the MenuItem, use Item's unit_id
  if (!unitId && menuItem.tbl_Item && menuItem.tbl_Item.unit_id) {
    unitId = menuItem.tbl_Item.unit_id;
  }
  
  // Final fallback - if we still don't have a unit_id, use 1
  if (!unitId) {
    console.warn(`[markMenuAsServed] No unit_id found for item ${menuItem.item_id}, using default unit ID: 1`);
    unitId = 1;
  }
  
  // Use the actual quantity without multiplying by estimated_servings
  return {
    item_id: menuItem.item_id,
    quantity_consumed: parseFloat(menuItem.quantity), // Don't multiply by estimated_servings
    unit: unitId,
    consumption_date: schedule.scheduled_date,
    meal_type: schedule.meal_time,
    hostel_id,
    recorded_by: req.user.id
  };
});


    console.log('[markMenuAsServed] Consumptions prepared:', consumptions);
    const lowStockItems = await _recordBulkConsumptionLogic(consumptions, hostel_id, transaction);

    console.log('[markMenuAsServed] Updating schedule status to served');
    schedule.status = 'served';
    await schedule.save({ transaction });

    await transaction.commit();
    console.log('[markMenuAsServed] Transaction committed, returning response');
    res.status(200).json({
      success: true,
      message: 'Menu marked as served',
      data: { lowStockItems }
    });
  } catch (error) {
    console.error('[markMenuAsServed] Error:', error.message, error.stack);
    await transaction.rollback();
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
        { description: { [Op.iLike]: `%${search}%` } },
        // Ensure ExpenseType is included in query if searching by its name
        // This might require a join in raw SQL or specific Sequelize include setup
        // For eager loading to work with '$ExpenseType.name$', ExpenseType must be included.
        // As per your models, ExpenseType is associated.
        { '$ExpenseType.name$': { [Op.iLike]: `%${search}%` } }
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
      whereClause.name = { [Op.iLike]: `%${search}%` };
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
  fetchBatchPrices

};