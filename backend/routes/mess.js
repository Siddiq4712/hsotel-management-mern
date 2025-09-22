// routes/messRoutes.js - COMPLETE VERSION
const express = require('express');
const {
  // Menu Management - Complete CRUD
  createMenu, getMenus, getMenuById, updateMenu, deleteMenu,
  
  // Item Management - Complete CRUD
  createItem, getItems, getItemById, updateItem, deleteItem,
  
  // Item Category Management - Complete CRUD
  createItemCategory, getItemCategories, updateItemCategory, deleteItemCategory,
  
  // Menu Item Management - Complete CRUD
  addItemsToMenu, getMenuWithItems, updateMenuItems, removeItemFromMenu,
  
  // Cost and Analytics
  calculateMenuCost,
  
  // Dashboard
  getMessDashboardStats,
  
  // Supplier Management - Complete CRUD
  createSupplier, getSuppliers, updateSupplier, deleteSupplier,
  
  // UOM Management - Complete CRUD
  createUOM, getUOMs, updateUOM, deleteUOM,

  recordBulkConsumption,
  
  // Grocery Management - Complete CRUD
  createGroceryType,getGroceryTypes, updateGroceryType, deleteGroceryType,
  createGrocery, getGroceries, updateGrocery, deleteGrocery,
  
  // Expense Type Management
  createExpenseType, getExpenseTypes,
  
  // Existing functions
  generateMessBills, getMessBills, scheduleMenu, getMenuSchedule,
  generateTokens, updateItemStock, getItemStock, recordConsumption, 
  getDailyConsumption, createPurchaseOrder, getPurchaseOrders, 
  createSupplierBill, getSupplierBills, createOtherExpense, getOtherExpenses, 
  allocateMessFees, getMessFeesAllocation, getAttendanceStatsForDate,
  calculateAndApplyDailyCharges, getMyMessCharges,  getInventoryReport,getConsumptionReport,
  getExpenseReport,getMenuPlanningReport,getMonthlyReport,
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
  getStoresByItemId,
  getItemsByStoreId,
  getSummarizedConsumptionReport,

} = require('../controllers/messController');

const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(authorize(['mess', 'warden', 'admin'])); // Allow multiple roles

// Dashboard
router.get('/dashboard-stats', getMessDashboardStats);

// Menu Management - Complete CRUD
router.post('/menus', createMenu);
router.get('/menus', getMenus);
router.get('/menus/:id', getMenuById);
router.put('/menus/:id', updateMenu);
router.delete('/menus/:id', deleteMenu);

// Item Management - Complete CRUD
router.post('/items', createItem);
router.get('/items', getItems);
router.get('/items/:id', getItemById);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);

// Item Category Management - Complete CRUD
router.post('/item-categories', createItemCategory);
router.get('/item-categories', getItemCategories);
router.put('/item-categories/:id', updateItemCategory);
router.delete('/item-categories/:id', deleteItemCategory);

// Menu Item Management - Complete CRUD
router.post('/menus/:menu_id/items', addItemsToMenu);
router.get('/menus/:menu_id/items', getMenuWithItems);
router.put('/menus/:menu_id/items', updateMenuItems);
router.delete('/menus/:menu_id/items/:item_id', removeItemFromMenu);

// Cost and Analytics
router.get('/menus/:menu_id/cost', calculateMenuCost);

// Supplier Management - Complete CRUD
router.post('/suppliers', createSupplier);
router.get('/suppliers', getSuppliers);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// UOM Management - Complete CRUD
router.post('/uoms', createUOM);
router.get('/uoms', getUOMs);
router.put('/uoms/:id', updateUOM);
router.delete('/uoms/:id', deleteUOM);

// Grocery Type Management - Complete CRUD
router.post('/grocery-types', createGroceryType);
router.get('/grocery-types', getGroceryTypes); // Add this function to controller
router.put('/grocery-types/:id', updateGroceryType);
router.delete('/grocery-types/:id', deleteGroceryType);

// Grocery Management - Complete CRUD
router.post('/groceries', createGrocery);
router.get('/groceries', getGroceries);
router.put('/groceries/:id', updateGrocery);
router.delete('/groceries/:id', deleteGrocery);

// Expense Type Management
router.post('/expense-types', createExpenseType);
router.get('/expense-types', getExpenseTypes);

// Bills and Finances
router.post('/bills/generate', generateMessBills);
router.get('/bills', getMessBills);

// Menu Scheduling
// router.post('/menu-schedule', scheduleMenu);
// router.get('/menu-schedule', getMenuSchedule);

// Token Management
router.post('/tokens/generate', generateTokens);

// Stock Management
router.post('/stock', updateItemStock);
router.get('/stock', getItemStock);

// Daily Operations
//router.post('/consumption', recordConsumption);
router.get('/consumption', getDailyConsumption);

// Purchase Orders
router.post('/purchase-orders', createPurchaseOrder);
router.get('/purchase-orders', getPurchaseOrders);

// Supplier Bills
router.post('/supplier-bills', createSupplierBill);
router.get('/supplier-bills', getSupplierBills);

// Other Expenses
router.post('/expenses', createOtherExpense);
router.get('/expenses', getOtherExpenses);

// Mess Fees
router.post('/fees/allocate', allocateMessFees);
router.get('/fees/allocation', getMessFeesAllocation);

// Attendance and Charges
router.get('/attendance-stats', getAttendanceStatsForDate);
router.post('/charges/calculate-daily', calculateAndApplyDailyCharges);
router.get('/mess-charges', getMyMessCharges);

router.get('/reports/inventory', getInventoryReport);
router.get('/reports/consumption', getConsumptionReport);
router.get('/reports/expenses', getExpenseReport);
router.get('/reports/menu-planning', getMenuPlanningReport);
router.get('/reports/monthly', getMonthlyReport);
// In your routes file (e.g., messRoutes.js)
router.post('/consumption/bulk', auth, recordBulkConsumption);

// Store Management
router.post('/stores', auth, createStore);
router.get('/stores', auth, getStores);
router.put('/stores/:id', auth, updateStore);
router.delete('/stores/:id', auth, deleteStore);

// Item-Store Mapping
router.post('/item-stores', auth, mapItemToStore);
router.get('/item-stores', auth, getItemStores);
router.delete('/item-stores/:id', auth, removeItemStoreMapping);

// Inventory Transactions
router.post('/inventory/purchases', auth, recordInventoryPurchase);
router.get('/inventory/transactions', auth, getInventoryTransactions);

// Special Food Items Management
router.post('/special-food-items', auth, createSpecialFoodItem);
router.get('/special-food-items', auth, getSpecialFoodItems);
router.get('/special-food-items/:id', auth, getSpecialFoodItemById);
router.put('/special-food-items/:id', auth, updateSpecialFoodItem);
router.delete('/special-food-items/:id', auth, deleteSpecialFoodItem);

// Food Orders Management
router.post('/food-orders', auth, createFoodOrder);
router.get('/food-orders', auth, getFoodOrders);
router.get('/food-orders/:id', auth, getFoodOrderById);
router.put('/food-orders/:id/status', auth, updateFoodOrderStatus);
router.put('/food-orders/:id/payment', auth, updatePaymentStatus);
router.put('/food-orders/:id/cancel', auth, cancelFoodOrder);

// Reports
router.get('/reports/monthly-food-orders', auth, getMonthlyFoodOrderReport);

router.post('/bills/generate', generateMessBills);
router.get('/bills', getMessBills);

router.post('/menu-schedule', scheduleMenu);
router.get('/menu-schedule', getMenuSchedule);
router.put('/menu-schedule/:id', updateMenuSchedule); // Add this for editing
router.delete('/menu-schedule/:id', deleteMenuSchedule); 

router.post('/tokens/generate', generateTokens);

router.get('/items/:item_id/stores', auth, getStoresByItemId);
router.get('/stores/:store_id/items', auth, getItemsByStoreId);

// Add this new route for the summarized report
router.get('/reports/consumption-summary', auth, getSummarizedConsumptionReport);
// Add this to your routes/mess.js file

// router.post('/inventory/purchases', auth, recordInventoryPurchase);
// router.get('/inventory/transactions', auth, getInventoryTransactions);
module.exports = router;
