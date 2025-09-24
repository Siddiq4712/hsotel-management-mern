// routes/messRoutes.js
const express = require('express');
const {
  // Menu Management
  createMenu, getMenus, getMenuById, updateMenu, deleteMenu,
  
  // Item Management
  createItem, getItems, getItemById, updateItem, deleteItem,
  
  // Item Category Management
  createItemCategory, getItemCategories, updateItemCategory, deleteItemCategory,
  
  // Menu Item Management
  addItemsToMenu, getMenuWithItems, updateMenuItems, removeItemFromMenu,
  
  // Menu Scheduling
  scheduleMenu, getMenuSchedule, updateMenuSchedule, deleteMenuSchedule,
  
  // Stock Management
  updateItemStock, getItemStock, getDailyConsumption, recordBulkConsumption,
  
  // UOM Management
  createUOM, getUOMs, updateUOM, deleteUOM,
  
  // Menu Cost Calculation
  calculateMenuCost,
  
  // Dashboard
  getMessDashboardStats,
  
  // Store Management
  createStore, getStores, updateStore, deleteStore,
  
  // Item-Store Mapping
  mapItemToStore, getItemStores, removeItemStoreMapping,
  getItemsByStoreId, getStoresByItemId,
  
  // Special Food Items
  createSpecialFoodItem, getSpecialFoodItems, getSpecialFoodItemById,
  updateSpecialFoodItem, deleteSpecialFoodItem,
  
  // Food Orders
  createFoodOrder, getFoodOrders, getFoodOrderById,
  updateFoodOrderStatus, updatePaymentStatus, cancelFoodOrder,
  getMonthlyFoodOrderReport,
  
  // Reports
  getSummarizedConsumptionReport,
  markMenuAsServed
} = require('../controllers/messController');

const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and authorization middleware
router.use(auth);
router.use(authorize(['mess', 'warden', 'admin']));

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

// UOM Management - Complete CRUD
router.post('/uoms', createUOM);
router.get('/uoms', getUOMs);
router.put('/uoms/:id', updateUOM);
router.delete('/uoms/:id', deleteUOM);

// Stock Management
router.post('/stock', updateItemStock);
router.get('/stock', getItemStock);

// Consumption Management
router.post('/consumption/bulk', recordBulkConsumption);
router.get('/consumption', getDailyConsumption);

// Menu Scheduling - Complete CRUD
router.post('/menu-schedule', scheduleMenu);
router.get('/menu-schedule', getMenuSchedule);
router.put('/menu-schedule/:id', updateMenuSchedule);
router.delete('/menu-schedule/:id', deleteMenuSchedule);

// Store Management - Complete CRUD
router.post('/stores', createStore);
router.get('/stores', getStores);
router.put('/stores/:id', updateStore);
router.delete('/stores/:id', deleteStore);

// Item-Store Mapping - Complete CRUD
router.post('/item-stores', mapItemToStore);
router.get('/item-stores', getItemStores);
router.delete('/item-stores/:id', removeItemStoreMapping);
router.get('/items/:item_id/stores', getStoresByItemId);
router.get('/stores/:store_id/items', getItemsByStoreId);

// Special Food Items - Complete CRUD
router.post('/special-food-items', createSpecialFoodItem);
router.get('/special-food-items', getSpecialFoodItems);
router.get('/special-food-items/:id', getSpecialFoodItemById);
router.put('/special-food-items/:id', updateSpecialFoodItem);
router.delete('/special-food-items/:id', deleteSpecialFoodItem);

// Food Orders - Complete CRUD
router.post('/food-orders', createFoodOrder);
router.get('/food-orders', getFoodOrders);
router.get('/food-orders/:id', getFoodOrderById);
router.put('/food-orders/:id/status', updateFoodOrderStatus);
router.put('/food-orders/:id/payment', updatePaymentStatus);
router.put('/food-orders/:id/cancel', cancelFoodOrder);

// Reports
router.get('/reports/monthly-food-orders', getMonthlyFoodOrderReport);
router.get('/reports/consumption-summary', getSummarizedConsumptionReport);

router.put('/menu-schedule/:id/serve', markMenuAsServed);


module.exports = router;
