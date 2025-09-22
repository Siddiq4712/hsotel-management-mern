// controllers/messController.js - COMPLETE VERSION

const { 
  Menu, Item, ItemCategory, MessBill, User, MenuItem,
  MenuSchedule, Token, Groceries, GroceriesType, ItemStock,
  DailyConsumption, DailyConsumptionReturn, NonConsumables,
  OtherItems, Supplier, PurchaseOrder, PurchaseOrderItem,
  SupplierBill, SupplierBillItem, MessFeesAllot, OtherExpense,
  UOM, ExpenseType, Attendance, Leave, DailyMessCharge,
  Hostel, IncomeType,Store, ItemStore, InventoryTransaction,ConsumptionLog,InventoryBatch
} = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { get } = require('../routes/mess');

// MENU MANAGEMENT - Complete CRUD
const createMenu = async (req, res) => {
  // Use a transaction to ensure both menu and items are created or neither are.
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
      date: new Date() // date field seems required by your model
    }, { transaction });

    // Step 2: If ingredients (items) are provided, create them
    if (items && Array.isArray(items) && items.length > 0) {
      const menuItems = items.map(item => ({
        menu_id: menu.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit,
        preparation_notes: item.preparation_notes
      }));
      await MenuItem.bulkCreate(menuItems, { transaction });
    }

    // If everything is successful, commit the transaction
    await transaction.commit();

    res.status(201).json({ 
      success: true, 
      data: menu,
      message: 'Menu and its items created successfully' 
    });
  } catch (error) {
    // If any step fails, roll back the entire transaction
    await transaction.rollback();
    console.error('Menu creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// getMenus
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
          as: 'tbl_Menu_Items', // ✅ matches your associations
          required: false,
          include: [
            {
              model: Item,
              as: 'tbl_Item', // ✅ matches your associations
              required: false,
              include: [
                { 
                  model: ItemCategory,
                  as: 'tbl_ItemCategory', // ✅ matches your associations
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
          // as: 'tbl_Menu_Items',
          include: [
            {
              model: Item,
              // as: 'tbl_Item',
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
        },
        {
          model: ItemStock,
          required: false,
          where: { hostel_id },
          attributes: ['current_stock', 'minimum_stock']
        }
      ],
      order: [['name', 'ASC']]
    });

    // Format the response to include stock_quantity directly on the item
    const formattedItems = items.map(item => {
      const itemJSON = item.toJSON();
      return {
        ...itemJSON,
        stock_quantity: item.ItemStocks && item.ItemStocks.length > 0 ? 
                       item.ItemStocks[0].current_stock : 0
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
          // as: 'tbl_Menu_Items',
          include: [
            {
              model: Item,
              // as: 'tbl_Item',
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

const updateMenuItems = async (req, res) => {
  try {
    const { menu_id } = req.params;
    const { items } = req.body;

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

    // Delete existing menu items
    await MenuItem.destroy({ where: { menu_id: menu_id } });

    // Add new items
    if (items && Array.isArray(items) && items.length > 0) {
      const menuItems = await MenuItem.bulkCreate(
        items.map(item => ({
          menu_id: parseInt(menu_id),
          item_id: item.item_id,
          quantity: item.quantity,
          unit: item.unit,
          preparation_notes: item.preparation_notes
        }))
      );

      res.json({ 
        success: true, 
        data: menuItems,
        message: 'Menu items updated successfully' 
      });
    } else {
      res.json({ 
        success: true, 
        data: [],
        message: 'Menu items cleared successfully' 
      });
    }
  } catch (error) {
    console.error('Menu items update error:', error);
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

// MESS BILLS MANAGEMENT
const generateMessBills = async (req, res) => {
  try {
    const { month, year } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Get all students in the hostel
    const students = await User.findAll({
      where: { 
        hostel_id,
        role: 'student'
      }
    });

    // Calculate total mess expenses for the month
    const totalExpenses = await OtherExpense.sum('amount', {
      where: {
        hostel_id,
        [Op.and]: [
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM expense_date')), month),
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM expense_date')), year)
        ]
      }
    });

    const totalStudents = students.length;
    const amountPerStudent = totalExpenses / totalStudents || 0;

    // Generate bills for each student
    const bills = await Promise.all(
      students.map(async (student) => {
        // Check if bill already exists
        const existingBill = await MessBill.findOne({
          where: {
            student_id: student.id,
            month,
            year
          }
        });

        if (existingBill) {
          return existingBill;
        }

        // Create new bill
        return await MessBill.create({
          student_id: student.id,
          hostel_id,
          month,
          year,
          amount: amountPerStudent,
          due_date: new Date(year, month, 15), // 15th of next month
          status: 'pending'
        });
      })
    );

    res.json({
      success: true,
      data: bills,
      message: 'Mess bills generated successfully'
    });
  } catch (error) {
    console.error('Generate mess bills error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMessBills = async (req, res) => {
  try {
    const { month, year, status, student_id } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (month) whereClause.month = month;
    if (year) whereClause.year = year;
    if (status) whereClause.status = status;
    if (student_id) whereClause.student_id = student_id;

    const bills = await MessBill.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          // as: 'MessBillStudent',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: bills
    });
  } catch (error) {
    console.error('Get mess bills error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MENU SCHEDULING
const scheduleMenu = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { menu_id, scheduled_date, meal_time, estimated_servings } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!menu_id || !scheduled_date || !meal_time || !estimated_servings) {
      return res.status(400).json({
        success: false,
        message: 'Menu ID, date, meal time, and estimated servings are required',
      });
    }

    if (estimated_servings <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Estimated servings must be greater than zero',
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
        },
      ],
      transaction
    });

    if (!menu) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    // --- COST CALCULATION LOGIC ---
    let total_cost = 0;
    if (menu.tbl_Menu_Items && menu.tbl_Menu_Items.length > 0) {
      total_cost = menu.tbl_Menu_Items.reduce((sum, menuItem) => {
        const itemPrice = parseFloat(menuItem.tbl_Item.unit_price) || 0;
        const itemQuantity = parseFloat(menuItem.quantity) || 0;
        return sum + (itemPrice * itemQuantity);
      }, 0);
    }
    
    const cost_per_serving = total_cost / estimated_servings;

    // Create the schedule with calculated costs
    const schedule = await MenuSchedule.create({
      hostel_id,
      menu_id,
      scheduled_date,
      meal_time,
      status: 'scheduled',
      estimated_servings, // This field needs to be in your MenuSchedule model
      total_cost,         // This field needs to be in your MenuSchedule model
      cost_per_serving,   // This field needs to be in your MenuSchedule model
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
    res.status(500).json({ success: false, message: 'Server error' });
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
          // no alias was defined for MenuSchedule → Menu
          required: false,
          include: [
            {
              model: MenuItem,
              as: 'tbl_Menu_Items', // ✅ alias from associations
              required: false,
              include: [
                {
                  model: Item,
                  as: 'tbl_Item', // ✅ alias
                  required: false,
                  include: [
                    {
                      model: ItemCategory,
                      as: 'tbl_ItemCategory', // ✅ alias
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
    // This function is needed for the frontend's edit functionality
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
    // This function is needed for the frontend's delete functionality
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

// TOKEN MANAGEMENT
const generateTokens = async (req, res) => {
  try {
    const { date, meal_type } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!date || !meal_type) {
      return res.status(400).json({
        success: false,
        message: 'Date and meal type are required'
      });
    }

    // Get all students in the hostel
    const students = await User.findAll({
      where: {
        hostel_id,
        role: 'student'
      }
    });

    // Generate tokens for each student
    const tokens = await Promise.all(
      students.map(async (student) => {
        // Check if token already exists
        const existingToken = await Token.findOne({
          where: {
            student_id: student.id,
            token_date: date,
            meal_type
          }
        });

        if (existingToken) {
          return existingToken;
        }

        // Create new token
        return await Token.create({
          student_id: student.id,
          token_date: date,
          meal_type,
          status: 'active'
        });
      })
    );

    res.json({
      success: true,
      data: tokens,
      message: 'Tokens generated successfully'
    });
  } catch (error) {
    console.error('Generate tokens error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GROCERY MANAGEMENT
const createGroceryType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const groceryType = await GroceriesType.create({
      name,
      description
    });

    res.status(201).json({
      success: true,
      data: groceryType,
      message: 'Grocery type created successfully'
    });
  } catch (error) {
    console.error('Grocery type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const getGroceryTypes = async (req, res) => {
  try {
    const { search } = req.query;
    
    let whereClause = {};
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const groceryTypes = await GroceriesType.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: groceryTypes
    });
  } catch (error) {
    console.error('Grocery types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const updateGroceryType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const groceryType = await GroceriesType.findByPk(id);
    if (!groceryType) {
      return res.status(404).json({
        success: false,
        message: 'Grocery type not found'
      });
    }

    await groceryType.update({ name, description });

    res.json({
      success: true,
      data: groceryType,
      message: 'Grocery type updated successfully'
    });
  } catch (error) {
    console.error('Grocery type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteGroceryType = async (req, res) => {
  try {
    const { id } = req.params;

    const groceryType = await GroceriesType.findByPk(id);
    if (!groceryType) {
      return res.status(404).json({
        success: false,
        message: 'Grocery type not found'
      });
    }

    // Check if grocery type is being used
    const groceryCount = await Groceries.count({ where: { grocery_type_id: id } });
    if (groceryCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete grocery type that is being used'
      });
    }

    await groceryType.destroy();
    res.json({
      success: true,
      message: 'Grocery type deleted successfully'
    });
  } catch (error) {
    console.error('Grocery type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createGrocery = async (req, res) => {
  try {
    const { name, grocery_type_id, unit, current_stock, minimum_stock, unit_price } = req.body;

    if (!name || !grocery_type_id || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Name, grocery type, and unit are required'
      });
    }

    const grocery = await Groceries.create({
      name,
      grocery_type_id,
      unit,
      current_stock: current_stock || 0,
      minimum_stock: minimum_stock || 0,
      unit_price: unit_price || 0
    });

    const groceryWithType = await Groceries.findByPk(grocery.id, {
      include: [{
        model: GroceriesType,
        as:'type',
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json({
      success: true,
      data: groceryWithType,
      message: 'Grocery created successfully'
    });
  } catch (error) {
    console.error('Grocery creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getGroceries = async (req, res) => {
  try {
    const { grocery_type_id, search } = req.query;
    
    let whereClause = {};
    
    if (grocery_type_id && grocery_type_id !== 'all') {
      whereClause.grocery_type_id = grocery_type_id;
    }
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const groceries = await Groceries.findAll({
      where: whereClause,
      include: [{
        model: GroceriesType,
        as:'type',
        attributes: ['id', 'name']
      }],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: groceries
    });
  } catch (error) {
    console.error('Groceries fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateGrocery = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grocery_type_id, unit, current_stock, minimum_stock, unit_price } = req.body;

    const grocery = await Groceries.findByPk(id);
    if (!grocery) {
      return res.status(404).json({
        success: false,
        message: 'Grocery not found'
      });
    }

    await grocery.update({
      name,
      grocery_type_id,
      unit,
      current_stock,
      minimum_stock,
      unit_price
    });

    const updatedGrocery = await Groceries.findByPk(id, {
      include: [{
        model: GroceriesType,
        as:'type',
        attributes: ['id', 'name']
      }]
    });

    res.json({
      success: true,
      data: updatedGrocery,
      message: 'Grocery updated successfully'
    });
  } catch (error) {
    console.error('Grocery update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteGrocery = async (req, res) => {
  try {
    const { id } = req.params;

    const grocery = await Groceries.findByPk(id);
    if (!grocery) {
      return res.status(404).json({
        success: false,
        message: 'Grocery not found'
      });
    }

    await grocery.destroy();
    res.json({
      success: true,
      message: 'Grocery deleted successfully'
    });
  } catch (error) {
    console.error('Grocery deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ITEM STOCK MANAGEMENT
const updateItemStock = async (req, res) => {
  try {
    const { item_id, current_stock, minimum_stock } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!item_id || current_stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and current stock are required'
      });
    }

    let itemStock = await ItemStock.findOne({
      where: { item_id, hostel_id }
    });

    if (itemStock) {
      await itemStock.update({
        current_stock,
        minimum_stock: minimum_stock || itemStock.minimum_stock,
        last_updated: new Date()
      });
    } else {
      itemStock = await ItemStock.create({
        item_id,
        hostel_id,
        current_stock,
        minimum_stock: minimum_stock || 0,
        last_updated: new Date()
      });
    }

    const stockWithItem = await ItemStock.findByPk(itemStock.id, {
      include: [{
        model: Item,
        include: [{
          model: ItemCategory,
          as: 'tbl_ItemCategory'
        }]
      }]
    });

    res.json({
      success: true,
      data: stockWithItem,
      message: 'Item stock updated successfully'
    });
  } catch (error) {
    console.error('Item stock update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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


// SUPPLIER MANAGEMENT
const createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, supplier_type } = req.body;

    if (!name || !supplier_type) {
      return res.status(400).json({
        success: false,
        message: 'Name and supplier type are required'
      });
    }

    const supplier = await Supplier.create({
      name,
      contact_person,
      phone,
      email,
      address,
      supplier_type,
      is_active: true
    });

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully'
    });
  } catch (error) {
    console.error('Supplier creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const { supplier_type, search, is_active } = req.query;
    
    let whereClause = {};
    
    if (supplier_type && supplier_type !== 'all') {
      whereClause.supplier_type = supplier_type;
    }
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const suppliers = await Supplier.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('Suppliers fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address, supplier_type, is_active } = req.body;

    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    await supplier.update({
      name,
      contact_person,
      phone,
      email,
      address,
      supplier_type,
      is_active
    });

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully'
    });
  } catch (error) {
    console.error('Supplier update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if supplier has orders or bills
    const orderCount = await PurchaseOrder.count({ where: { supplier_id: id } });
    const billCount = await SupplierBill.count({ where: { supplier_id: id } });

    if (orderCount > 0 || billCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with existing orders or bills'
      });
    }

    await supplier.destroy();
    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Supplier deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PURCHASE ORDER MANAGEMENT
const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_id, expected_delivery, items } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier ID and items are required'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Calculate total amount
      const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      // Create purchase order
      const purchaseOrder = await PurchaseOrder.create({
        hostel_id,
        supplier_id,
        expected_delivery,
        total_amount,
        status: 'draft',
        created_by: req.user.id,
        order_date: new Date()
      }, { transaction });

      // Create purchase order items
      const orderItems = await PurchaseOrderItem.bulkCreate(
        items.map(item => ({
          purchase_order_id: purchaseOrder.id,
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        })),
        { transaction }
      );

      await transaction.commit();

      const orderWithDetails = await PurchaseOrder.findByPk(purchaseOrder.id, {
        include: [
          {
            model: Supplier,
            attributes: ['id', 'name', 'contact_person', 'phone']
          },
          {
            model: PurchaseOrderItem,
            include: [{
              model: Item,
              include: [{
                model: ItemCategory,
                as: 'tbl_ItemCategory'
              }]
            }]
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: orderWithDetails,
        message: 'Purchase order created successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Purchase order creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPurchaseOrders = async (req, res) => {
  try {
    const { status, supplier_id, from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (status) whereClause.status = status;
    if (supplier_id) whereClause.supplier_id = supplier_id;
    
    if (from_date && to_date) {
      whereClause.order_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const orders = await PurchaseOrder.findAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          attributes: ['id', 'name', 'contact_person', 'phone']
        },
        {
          model: User,
          // as: 'PurchaseOrderCreatedBy',
          attributes: ['id', 'username']
        }
      ],
      order: [['order_date', 'DESC']]
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Purchase orders fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// SUPPLIER BILL MANAGEMENT
const createSupplierBill = async (req, res) => {
  try {
    const { supplier_id, purchase_order_id, bill_number, bill_date, due_date, items } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!supplier_id || !bill_number || !bill_date || !due_date || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Calculate total amount
      const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      // Create supplier bill
      const supplierBill = await SupplierBill.create({
        supplier_id,
        hostel_id,
        purchase_order_id,
        bill_number,
        bill_date,
        total_amount,
        due_date,
        status: 'pending'
      }, { transaction });

      // Create supplier bill items
      await SupplierBillItem.bulkCreate(
        items.map(item => ({
          supplier_bill_id: supplierBill.id,
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        })),
        { transaction }
      );

      await transaction.commit();

      const billWithDetails = await SupplierBill.findByPk(supplierBill.id, {
        include: [
          {
            model: Supplier,
            attributes: ['id', 'name', 'contact_person']
          },
          {
            model: SupplierBillItem,
            include: [{
              model: Item,
              include: [{
                model: ItemCategory,
                as: 'tbl_ItemCategory'
              }]
            }]
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: billWithDetails,
        message: 'Supplier bill created successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Supplier bill creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSupplierBills = async (req, res) => {
  try {
    const { status, supplier_id, from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (status) whereClause.status = status;
    if (supplier_id) whereClause.supplier_id = supplier_id;
    
    if (from_date && to_date) {
      whereClause.bill_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const bills = await SupplierBill.findAll({
      where: whereClause,
      include: [{
        model: Supplier,
        attributes: ['id', 'name', 'contact_person']
      }],
      order: [['bill_date', 'DESC']]
    });

    res.json({
      success: true,
      data: bills
    });
  } catch (error) {
    console.error('Supplier bills fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// EXPENSE TYPE MANAGEMENT
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
      description,
      is_active: true
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
    const { is_active } = req.query;
    
    let whereClause = {};
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const expenseTypes = await ExpenseType.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: expenseTypes
    });
  } catch (error) {
    console.error('Expense types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// OTHER EXPENSE MANAGEMENT
const createOtherExpense = async (req, res) => {
  try {
    const { expense_type_id, amount, description, expense_date } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!expense_type_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Expense type and amount are required'
      });
    }

    const expense = await OtherExpense.create({
      hostel_id,
      expense_type_id,
      amount,
      description,
      expense_date: expense_date || new Date(),
      approved_by: req.user.id
    });

    const expenseWithType = await OtherExpense.findByPk(expense.id, {
      include: [{
        model: ExpenseType,
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json({
      success: true,
      data: expenseWithType,
      message: 'Expense recorded successfully'
    });
  } catch (error) {
    console.error('Other expense creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getOtherExpenses = async (req, res) => {
  try {
    const { expense_type_id, from_date, to_date, month, year } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (expense_type_id) whereClause.expense_type_id = expense_type_id;
    
    if (from_date && to_date) {
      whereClause.expense_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    if (month && year) {
      whereClause[Op.and] = [
        sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM expense_date')), month),
        sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM expense_date')), year)
      ];
    }

    const expenses = await OtherExpense.findAll({
      where: whereClause,
      include: [
        {
          model: ExpenseType,
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'ExpenseApprovedBy',
          attributes: ['id', 'username']
        }
      ],
      order: [['expense_date', 'DESC']]
    });

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Other expenses fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MESS FEES ALLOCATION
const allocateMessFees = async (req, res) => {
  try {
    const { month, year } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Get all students in the hostel
    const students = await User.findAll({
      where: { hostel_id, role: 'student' }
    });

    // Calculate total mess costs for the month
    const totalMessCost = await OtherExpense.sum('amount', {
      where: {
        hostel_id,
        [Op.and]: [
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM expense_date')), month),
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM expense_date')), year)
        ]
      }
    });

    const totalStudents = students.length;
    const individualShare = totalMessCost / totalStudents || 0;

    // Create allocations for each student
    const allocations = await Promise.all(
      students.map(async (student) => {
        // Check if allocation already exists
        const existingAllocation = await MessFeesAllot.findOne({
          where: {
            student_id: student.id,
            month,
            year
          }
        });

        if (existingAllocation) {
          return existingAllocation;
        }

        return await MessFeesAllot.create({
          student_id: student.id,
          month,
          year,
          total_mess_cost: totalMessCost,
          total_students: totalStudents,
          individual_share: individualShare,
          adjustments: 0,
          final_amount: individualShare
        });
      })
    );

    res.json({
      success: true,
      data: allocations,
      message: 'Mess fees allocated successfully'
    });
  } catch (error) {
    console.error('Mess fees allocation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMessFeesAllocation = async (req, res) => {
  try {
    const { month, year, student_id } = req.query;

    let whereClause = {};

    if (month) whereClause.month = month;
    if (year) whereClause.year = year;
    if (student_id) whereClause.student_id = student_id;

    const allocations = await MessFeesAllot.findAll({
      where: whereClause,
      include: [{
        model: User,
        // as: 'MessFeesAllotStudent',
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: allocations
    });
  } catch (error) {
    console.error('Mess fees allocation fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ATTENDANCE AND CHARGES
const getAttendanceStatsForDate = async (req, res) => {
  try {
    const { date } = req.query;
    const hostel_id = req.user.hostel_id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Get attendance stats
    const attendanceStats = await Attendance.findAll({
      where: {
        date,
        '$AttendanceStudent.hostel_id$': hostel_id
      },
      include: [{
        model: User,
        // as: 'AttendanceStudent',
        attributes: ['id', 'username', 'hostel_id']
      }],
      attributes: ['status', [sequelize.fn('count', sequelize.col('status')), 'count']],
      group: ['status'],
      raw: true
    });

    // Get leave stats
    const leaveStats = await Leave.findAll({
      where: {
        from_date: { [Op.lte]: date },
        to_date: { [Op.gte]: date },
        status: 'approved',
        '$LeaveStudent.hostel_id$': hostel_id
      },
      include: [{
        model: User,
        // as: 'LeaveStudent',
        attributes: ['id', 'username', 'hostel_id']
      }],
      attributes: [[sequelize.fn('count', sequelize.col('Leave.id')), 'count']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        attendance: attendanceStats,
        onLeave: leaveStats[0]?.count || 0,
        date
      }
    });
  } catch (error) {
    console.error('Attendance stats fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const calculateAndApplyDailyCharges = async (req, res) => {
  try {
    const { date, daily_rate } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!date || !daily_rate) {
      return res.status(400).json({
        success: false,
        message: 'Date and daily rate are required'
      });
    }

    // Get all students in the hostel
    const students = await User.findAll({
      where: { hostel_id, role: 'student' }
    });

    const charges = await Promise.all(
      students.map(async (student) => {
        // Check attendance status
        const attendance = await Attendance.findOne({
          where: {
            student_id: student.id,
            date
          }
        });

        // Check if on leave
        const onLeave = await Leave.findOne({
          where: {
            student_id: student.id,
            from_date: { [Op.lte]: date },
            to_date: { [Op.gte]: date },
            status: 'approved'
          }
        });

        let attendanceStatus = 'not_marked';
        let isCharged = true;

        if (onLeave) {
          attendanceStatus = 'leave';
          isCharged = false;
        } else if (attendance) {
          attendanceStatus = attendance.status;
          isCharged = attendance.status === 'present';
        }

        // Create or update daily mess charge
        const [charge, created] = await DailyMessCharge.findOrCreate({
          where: {
            student_id: student.id,
            date
          },
          defaults: {
            hostel_id,
            amount: isCharged ? daily_rate : 0,
            attendance_status: attendanceStatus,
            is_charged: isCharged
          }
        });

        if (!created) {
          await charge.update({
            amount: isCharged ? daily_rate : 0,
            attendance_status: attendanceStatus,
            is_charged: isCharged
          });
        }

        return charge;
      })
    );

    res.json({
      success: true,
      data: charges,
      message: 'Daily charges calculated and applied successfully'
    });
  } catch (error) {
    console.error('Daily charges calculation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMyMessCharges = async (req, res) => {
  try {
    const { month, year, from_date, to_date } = req.query;
    const student_id = req.user.id;

    let whereClause = { student_id };

    if (month && year) {
      whereClause[Op.and] = [
        sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date')), month),
        sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM date')), year)
      ];
    } else if (from_date && to_date) {
      whereClause.date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const charges = await DailyMessCharge.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });

    // Calculate summary
    const totalAmount = charges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
    const chargedDays = charges.filter(charge => charge.is_charged).length;
    const totalDays = charges.length;

    res.json({
      success: true,
      data: {
        charges,
        summary: {
          totalAmount,
          chargedDays,
          totalDays,
          averageDailyCharge: totalDays > 0 ? totalAmount / totalDays : 0
        }
      }
    });
  } catch (error) {
    console.error('My mess charges fetch error:', error);
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
    const groceryCount = await Groceries.count({ where: { unit_id: id } });
    
    if (itemCount > 0 || groceryCount > 0) {
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
          // as: 'tbl_Menu_Items',
          include: [
            {
              model: Item,
              // as: 'tbl_Item',
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
    const totalSuppliers = await Supplier.count({ where: { is_active: true } });
    const pendingOrders = await PurchaseOrder.count({ 
      where: { 
        hostel_id, 
        status: ['draft', 'sent', 'confirmed'] 
      } 
    });

    // Monthly expenses
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = await OtherExpense.sum('amount', {
      where: {
        hostel_id,
        [Op.and]: [
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM expense_date')), currentMonth),
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM expense_date')), currentYear)
        ]
      }
    });

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

    // Pending bills
    const pendingBills = await SupplierBill.count({
      where: {
        hostel_id,
        status: 'pending'
      }
    });

    res.json({
      success: true,
      data: {
        totalMenus,
        totalItems,
        totalSuppliers,
        pendingOrders,
        monthlyExpenses: monthlyExpenses || 0,
        lowStockCount,
        pendingBills
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Add these functions in messController.js

const getInventoryReport = async (req, res) => {
  try {
    const { category_id, low_stock, date_range } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (category_id) {
      whereClause["$Item.category_id$"] = category_id;
    }

    if (low_stock === "true") {
      whereClause = {
        ...whereClause,
        [Op.and]: [
          where(col("current_stock"), { [Op.lte]: col("minimum_stock") })
        ]
      };
    }

    if (date_range) {
      const [startDate, endDate] = date_range.split(",");
      whereClause.updatedAt = {
        [Op.between]: [
          new Date(startDate + " 00:00:00"),
          new Date(endDate + " 23:59:59"),
        ],
      };
    }

    const stocks = await ItemStock.findAll({
      where: whereClause,
      include: [
        {
          model: Item,
          include: [
            { model: ItemCategory, as: "tbl_ItemCategory" },
            { model: UOM, as: "UOM" }
          ]
        }
      ],
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error("Inventory Report Error:", error);
    res.status(500).json({ success: false, message: "Error fetching inventory report" });
  }
};

// ---------------- Consumption Report ----------------
const getConsumptionReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const hostel_id = req.user.hostel_id;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    let whereClause = { hostel_id };
    whereClause.consumption_date = {
      [Op.between]: [start_date, end_date]
    };

    const consumptions = await DailyConsumption.findAll({
      where: whereClause,
      include: [
        { 
          model: Item, 
          include: [{ model: ItemCategory, as: "tbl_ItemCategory" }] 
        },
        // Remove the UOM relationship if it doesn't exist
        { model: User, as: "ConsumptionRecordedBy" }
      ],
    });

    res.json({ success: true, data: consumptions });
  } catch (error) {
    console.error("Consumption Report Error:", error);
    res.status(500).json({ success: false, message: "Error fetching consumption report" });
  }
};

// ---------------- Expense Report ----------------
const getExpenseReport = async (req, res) => {
  try {
    const { date_range } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (date_range) {
      const [startDate, endDate] = date_range.split(",");
      whereClause.expense_date = {
        [Op.between]: [
          new Date(startDate + " 00:00:00"),
          new Date(endDate + " 23:59:59"),
        ],
      };
    }

    const expenses = await Expense.findAll({
      where: whereClause,
      include: [{ model: ExpenseType, as: "ExpenseType" }],
      attributes: [
        "expense_type_id",
        [fn("SUM", col("amount")), "total_amount"]
      ],
      group: ["ExpenseType.id", "ExpenseType.name"],
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    console.error("Expense Report Error:", error);
    res.status(500).json({ success: false, message: "Error fetching expense report" });
  }
};

// ---------------- Menu Planning Report ----------------
const getMenuPlanningReport = async (req, res) => {
  try {
    const { date_range } = req.query;
    const hostel_id = req.user.hostel_id;

    let whereClause = { hostel_id };

    if (date_range) {
      const [startDate, endDate] = date_range.split(",");
      whereClause.schedule_date = {
        [Op.between]: [
          new Date(startDate + " 00:00:00"),
          new Date(endDate + " 23:59:59"),
        ],
      };
    }

    const menus = await MenuSchedule.findAll({
      where: whereClause,
      include: [
        {
          model: Menu,
          include: [
            {
              model: MenuItem,
              as: "MenuItems",
              include: [
                { model: Item, include: [{ model: ItemCategory, as: "tbl_ItemCategory" }] }
              ]
            }
          ]
        }
      ],
    });

    res.json({ success: true, data: menus });
  } catch (error) {
    console.error("Menu Planning Report Error:", error);
    res.status(500).json({ success: false, message: "Error fetching menu planning report" });
  }
};

// ---------------- Monthly Report ----------------
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const hostel_id = req.user.hostel_id;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Expenses
    const expenses = await Expense.findAll({
      where: {
        hostel_id,
        expense_date: { [Op.between]: [startDate, endDate] },
      },
      attributes: [[fn("SUM", col("amount")), "total_expenses"]],
    });

    // Consumptions
    const consumptions = await Consumption.findAll({
      where: {
        hostel_id,
        consumption_date: { [Op.between]: [startDate, endDate] },
      },
      attributes: [[fn("SUM", col("quantity")), "total_consumed"]],
    });

    // Purchase Orders
    const purchaseOrders = await PurchaseOrder.findAll({
      where: {
        hostel_id,
        createdAt: { [Op.between]: [startDate, endDate] },
        status: { [Op.in]: ["draft", "sent", "confirmed"] },
      },
      include: [{ model: Supplier, as: "Supplier" }],
    });

    res.json({
      success: true,
      data: {
        expenses: expenses[0],
        consumptions: consumptions[0],
        purchaseOrders,
      },
    });
  } catch (error) {
    console.error("Monthly Report Error:", error);
    res.status(500).json({ success: false, message: "Error fetching monthly report" });
  }
};
const recordBulkConsumption = async (req, res) => {
  const { consumptions } = req.body;
  const hostel_id = req.user.hostel_id;
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting bulk consumption record with data:', JSON.stringify(consumptions));
    console.log('Hostel ID:', hostel_id, 'User ID:', req.user.id);
    
    if (!consumptions || !Array.isArray(consumptions) || consumptions.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Consumptions array is required' });
    }

    const createdConsumptions = [];
    const createdLogs = [];
    const errors = [];

    for (const consumption of consumptions) {
      try {
        console.log('Processing consumption:', JSON.stringify(consumption));
        const { item_id, quantity_consumed, unit, consumption_date } = consumption;
        
        if (!item_id || !quantity_consumed) {
          errors.push(`Missing required fields for consumption: ${JSON.stringify(consumption)}`);
          continue;
        }
        
        let remaining_to_consume = parseFloat(quantity_consumed);
        console.log(`Need to consume ${remaining_to_consume} ${unit} of item ${item_id}`);

        // 1. Create a record in the DailyConsumption table
        const dailyConsumptionRecord = await DailyConsumption.create({
          hostel_id,
          item_id,
          consumption_date: consumption_date || new Date(),
          quantity_consumed,
          unit,
          meal_type: consumption.meal_type || 'dinner',
          recorded_by: req.user.id
        }, { transaction });
        
        console.log('Created DailyConsumption record:', JSON.stringify(dailyConsumptionRecord.toJSON()));
        createdConsumptions.push(dailyConsumptionRecord);

        // 2. Consume from inventory batches using FIFO
        const batches = await InventoryBatch.findAll({
          where: {
            item_id,
            hostel_id,
            quantity_remaining: { [Op.gt]: 0 } // Only get batches with stock
          },
          order: [['purchase_date', 'ASC']], // Oldest batches first
          transaction
        });
        
        console.log(`Found ${batches.length} batches with remaining stock`);
        
        if (batches.length === 0) {
          console.warn(`No inventory batches found for item ${item_id}. Creating consumption log with zero cost.`);
          // Create a dummy consumption log with zero cost
          const dummyLog = await ConsumptionLog.create({
            daily_consumption_id: dailyConsumptionRecord.id,
            batch_id: null, // This will likely fail if batch_id has NOT NULL constraint
            quantity_consumed: quantity_consumed,
            cost: 0,
          }, { transaction });
          createdLogs.push(dummyLog);
          
          // Update ItemStock directly if no batches found
          const itemStock = await ItemStock.findOne({ where: { item_id, hostel_id }, transaction });
          if (itemStock) {
            const newStock = Math.max(0, parseFloat(itemStock.current_stock) - parseFloat(quantity_consumed));
            await itemStock.update({ current_stock: newStock }, { transaction });
            console.log(`Updated ItemStock: ${itemStock.current_stock} -> ${newStock}`);
          }
          
          continue; // Skip to next consumption
        }

        for (const batch of batches) {
          if (remaining_to_consume <= 0) break;
          
          console.log(`Processing batch ${batch.id}: ${batch.quantity_remaining} remaining at price ${batch.unit_price}`);

          const consumed_from_batch = Math.min(remaining_to_consume, parseFloat(batch.quantity_remaining));
          const cost_from_batch = consumed_from_batch * parseFloat(batch.unit_price);
          
          remaining_to_consume -= consumed_from_batch;
          
          console.log(`Consuming ${consumed_from_batch} from batch ${batch.id}, cost: ${cost_from_batch}`);
          console.log(`Remaining to consume: ${remaining_to_consume}`);

          // Update the batch's remaining quantity
          const newRemainingQuantity = parseFloat(batch.quantity_remaining) - consumed_from_batch;
          await batch.update({
            quantity_remaining: newRemainingQuantity
          }, { transaction });
          
          console.log(`Updated batch ${batch.id} remaining quantity: ${batch.quantity_remaining} -> ${newRemainingQuantity}`);

          // 3. Create a record in the ConsumptionLog table for each batch consumed
          try {
            const consumptionLog = await ConsumptionLog.create({
              daily_consumption_id: dailyConsumptionRecord.id,
              batch_id: batch.id,
              quantity_consumed: consumed_from_batch,
              cost: cost_from_batch,
            }, { transaction });
            
            console.log('Created ConsumptionLog:', JSON.stringify(consumptionLog.toJSON()));
            createdLogs.push(consumptionLog);
          } catch (logError) {
            console.error(`Error creating consumption log for batch ${batch.id}:`, logError);
            errors.push(`Failed to create consumption log: ${logError.message}`);
            throw logError; // Rethrow to trigger transaction rollback
          }
        }

        // Check if there's still quantity to consume but no more batches
        if (remaining_to_consume > 0) {
          console.warn(`Insufficient inventory. Still need to consume ${remaining_to_consume} but no more batches available.`);
        }

        // 4. Update the total stock in ItemStock
        const itemStock = await ItemStock.findOne({ where: { item_id, hostel_id }, transaction });
        if (itemStock) {
          const newStock = Math.max(0, parseFloat(itemStock.current_stock) - parseFloat(quantity_consumed));
          await itemStock.update({ current_stock: newStock }, { transaction });
          console.log(`Updated ItemStock: ${itemStock.current_stock} -> ${newStock}`);
        } else {
          console.warn(`No ItemStock record found for item ${item_id}`);
        }
      } catch (consumptionError) {
        console.error('Error processing consumption:', consumptionError);
        errors.push(`Error processing consumption: ${consumptionError.message}`);
        throw consumptionError; // Rethrow to trigger transaction rollback
      }
    }

    await transaction.commit();
    console.log(`Successfully recorded ${createdConsumptions.length} consumptions with ${createdLogs.length} consumption logs`);
    
    res.status(201).json({ 
      success: true, 
      message: 'Consumptions recorded successfully', 
      data: {
        consumptions: createdConsumptions,
        logs: createdLogs,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Bulk consumption record error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + (error.sqlMessage || error.message),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
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

// Inventory Transactions
const recordInventoryPurchase = async (req, res) => {
  const { items } = req.body;
  const hostel_id = req.user.hostel_id;
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting inventory purchase with items:', JSON.stringify(items));
    console.log('Hostel ID:', hostel_id);
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items array is required');
    }

    const createdBatches = [];

    for (const item of items) {
      console.log('Processing item:', JSON.stringify(item));
      
      // Validate the required fields
      if (!item.item_id) {
        console.error('Missing item_id for inventory item');
        continue;
      }

      try {
        // 1. Create a new inventory batch for this purchase
        const newBatch = await InventoryBatch.create({
          item_id: item.item_id,
          hostel_id,
          quantity_remaining: item.quantity,
          unit_price: item.unit_price,
          purchase_date: item.transaction_date || new Date(),
        }, { transaction });
        
        console.log('Created inventory batch:', JSON.stringify(newBatch.toJSON()));
        createdBatches.push(newBatch);

        // 2. Update or create the ItemStock record
        let itemStock = await ItemStock.findOne({ 
          where: { item_id: item.item_id, hostel_id },
          transaction
        });
        
        if (itemStock) {
          console.log('Found existing ItemStock:', JSON.stringify(itemStock.toJSON()));
          // Calculate the new weighted average unit price
          const existingStock = parseFloat(itemStock.current_stock);
          const existingPrice = parseFloat(itemStock.unit_price || 0);
          const newQuantity = parseFloat(item.quantity);
          const newPrice = parseFloat(item.unit_price);
          
          const newAveragePrice = ((existingStock * existingPrice) + (newQuantity * newPrice)) / (existingStock + newQuantity);
          
          // Update both current_stock and unit_price
          await itemStock.update({
            current_stock: existingStock + newQuantity,
            unit_price: newAveragePrice,
          }, { transaction });
          
          console.log('Updated ItemStock:', {
            id: itemStock.id,
            new_stock: existingStock + newQuantity,
            new_price: newAveragePrice
          });
        } else {
          // If no ItemStock record exists, create one
          itemStock = await ItemStock.create({
            item_id: item.item_id,
            hostel_id,
            current_stock: item.quantity,
            unit_price: item.unit_price, // The initial unit price is the purchased price
            minimum_stock: 0,
          }, { transaction });
          
          console.log('Created new ItemStock:', JSON.stringify(itemStock.toJSON()));
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.item_id}:`, itemError);
        throw itemError; // Rethrow to trigger transaction rollback
      }
    }

    await transaction.commit();
    console.log(`Successfully created ${createdBatches.length} inventory batches`);
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
      message: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: foodItems
    });
  } catch (error) {
    console.error('Special food items fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
          include: [{ model: UOM, as: 'UOM', required: false }] // Include UOM for display
        }
      ],
      order: [[Item, 'name', 'ASC']] // Order by item name
    });

    if (!itemStores) {
      return res.status(404).json({ success: false, message: 'No items mapped to this store yet.' });
    }

    // Format the response to be easy for the frontend to use
    const items = itemStores.map(is => ({
      item_id: is.item_id,
      name: is.Item.name,
      unit_price: is.price, // Last known price from this store
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
      order: [['is_preferred', 'DESC'], ['updatedAt', 'DESC']] // Show preferred/most recent first
    });

    if (!itemStores) {
      return res.status(404).json({ success: false, message: 'No stores mapped to this item yet.' });
    }

    // Format the response to be easy for the frontend to use
    const stores = itemStores.map(is => ({
      store_id: is.store_id,
      name: is.Store.name,
      price: is.price, // Send the last known price
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

    if (!start_date || !end_date) throw new Error('Start and end date are required.');

    const result = await DailyConsumption.findAll({
      where: {
        hostel_id,
        consumption_date: { [Op.between]: [start_date, end_date] },
      },
      attributes: [
        [sequelize.col('tbl_Item.name'), 'item_name'], // Use the correct alias
        [sequelize.col('DailyConsumption.unit'), 'unit'],
        [sequelize.fn('SUM', sequelize.col('DailyConsumption.quantity_consumed')), 'total_consumed'],
        [sequelize.fn('SUM', sequelize.col('ConsumptionLogs.cost')), 'total_cost'],
      ],
      include: [
        // Use the alias defined in the model association
        { model: Item, as: 'tbl_Item', attributes: []}, 
        { model: ConsumptionLog, as: 'ConsumptionLogs', attributes: []},
      ],
      group: ['tbl_Item.id', 'tbl_Item.name', 'DailyConsumption.unit'], // Use the correct alias
      order: [[sequelize.col('tbl_Item.name'), 'ASC']], // Use the correct alias
      raw: true,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating summarized consumption report:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
// Export all functions
module.exports = {
  // Menu Management
  createMenu,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  
  // Item Management
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  
  // Item Category Management
  createItemCategory,
  getItemCategories,
  updateItemCategory,
  deleteItemCategory,
  
  // Menu Item Management
  addItemsToMenu,
  getMenuWithItems,
  updateMenuItems,
  removeItemFromMenu,
  
  // Mess Bills
  generateMessBills,
  getMessBills,
  
  // Menu Scheduling
  scheduleMenu,
  getMenuSchedule,
  
  // Token Management
  generateTokens,
  
  // Grocery Management
  createGroceryType,
  getGroceryTypes,
  updateGroceryType,
  deleteGroceryType,
  createGrocery,
  getGroceries,
  updateGrocery,
  deleteGrocery,
  
  // Stock Management
  updateItemStock,
  getItemStock,
  
  // Consumption Management
  getDailyConsumption,
  
  // Supplier Management
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  
  // Purchase Order Management
  createPurchaseOrder,
  getPurchaseOrders,
  
  // Supplier Bill Management
  createSupplierBill,
  getSupplierBills,
  
  // Expense Management
  createExpenseType,
  getExpenseTypes,
  createOtherExpense,
  getOtherExpenses,
  
  // Mess Fees Management
  allocateMessFees,
  getMessFeesAllocation,
  
  // Attendance and Charges
  getAttendanceStatsForDate,
  calculateAndApplyDailyCharges,
  getMyMessCharges,
  
  // UOM Management
  createUOM,
  getUOMs,
  updateUOM,
  deleteUOM,
  
  // Menu Cost Calculation
  calculateMenuCost,
  
  // Dashboard
  getMessDashboardStats,
  // Add these to your existing exports in messController.js
  getInventoryReport,
  getConsumptionReport,
  getExpenseReport,
  getMenuPlanningReport,
  getMonthlyReport,
  recordBulkConsumption,
  createStore,
  getStores,
  updateStore,
  deleteStore,
  mapItemToStore,
  getItemStores,
  removeItemStoreMapping,
  recordInventoryPurchase,
  getInventoryTransactions,

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
  updateMenuSchedule,
  deleteMenuSchedule, 
  getItemsByStoreId,
  getStoresByItemId,
  getSummarizedConsumptionReport
};
