import express from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  // Menu Management
  createMenu,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  applyMenuDateRange,

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

  // Menu Scheduling
  scheduleMenu,
  getMenuSchedule,
  updateMenuSchedule,
  deleteMenuSchedule,

  // Stock Management
  updateItemStock,
  getItemStock,
  getDailyConsumption,
  recordBulkConsumption,
  recordInventoryPurchase,
  getInventoryTransactions,
  exportStockToExcel,

  // UOM Management
  createUOM,
  getUOMs,
  updateUOM,
  deleteUOM,

  // Menu Cost Calculation
  calculateMenuCost,

  // Dashboard
  getMessDashboardStats,

  // Store Management
  createStore,
  getStores,
  updateStore,
  deleteStore,

  // Item-Store Mapping
  mapItemToStore,
  getItemStores,
  removeItemStoreMapping,
  getItemsByStoreId,
  getStoresByItemId,

  // Special Food Items
  createSpecialFoodItem,
  getSpecialFoodItems,
  getSpecialFoodItemById,
  updateSpecialFoodItem,
  deleteSpecialFoodItem,

  // Food Orders
  createFoodOrder,
  getFoodOrders,
  getFoodOrderById,
  updateFoodOrderStatus,
  updatePaymentStatus,
  cancelFoodOrder,
  getMonthlyFoodOrderReport,

  // Reports
  getSummarizedConsumptionReport,
  markMenuAsServed,

  // Mess Daily Expenses
  createMessDailyExpense,
  getMessDailyExpenses,
  getMessDailyExpenseById,
  updateMessDailyExpense,
  deleteMessDailyExpense,
  createExpenseType,
  getExpenseTypes,
  updateExpenseType,
  deleteExpenseType,
  getItemFIFOPrice,
  getItemBatches,
  fetchBatchPrices,

  // Special Consumption
  createSpecialConsumption,
  getSpecialConsumptions,
  getSpecialConsumptionById,
  calculateAndApplyDailyMessCharges,
  getRoundingAdjustments,
  getLatestPurchaseReport,
  correctLastPurchase,
  getMessFeeSummary,
  getStudentFeeBreakdown,
  createStudentFee,
  generateMonthlyMessReport,
  getDailyConsumptionDetails,
  exportUnitRateCalculation,
  createBulkStudentFee,
  getStudentFees,
  createCreditToken,
  getCreditTokens,
  updateCreditToken,
  deleteCreditToken,
  createConcern,
  getConcerns,
  updateConcern,
  deleteConcern,
  saveDailyRate,
  getIncomeEntries,
  createIncomeEntry,
  getMonthlyExpensesChartData,
  getItemStockChartData, 
  getSessions,

  generateDailyRateReport,
  getStudents,
  recordStaffRecordedSpecialFoodConsumption,
  generateMessBills,
  createBedFee,
  getStudentBedFees,
  createBulkBedFees,
  getAllBedFees,
  deleteBedFee,

  getPurchaseOrders,
  clearPurchaseOrders,

  createRecipe,
  getRecipes,
  updateRecipe,
  deleteRecipe,

  deleteStudentFee,
  bulkDeleteStudentFees,

  getLatestDailyRate
} from '../controllers/messController.js'; // Added .js extension

import { auth, authorize } from '../middleware/auth.js'; // Added .js extension

const router = express.Router();

// Rate limiting for sensitive endpoints
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many food order requests, please try again later.'
});

// Input validation middleware
const validateMenu = [
  body('name').notEmpty().withMessage('Menu name is required'),
  body('meal_type').notEmpty().withMessage('Meal type is required')
];

const validateItem = [
  body('name').notEmpty().withMessage('Item name is required'),
  body('category_id').notEmpty().withMessage('Category ID is required'),
  body('maximum_quantity')
   .optional({ nullable: true })
   .isFloat({ min: 0 })
   .withMessage('Maximum quantity must be a non-negative number')
];

const validateItemCategory = [
  body('name').notEmpty().withMessage('Category name is required')
];

const validateUOM = [
  body('name').notEmpty().withMessage('UOM name is required'),
  body('abbreviation').notEmpty().withMessage('UOM abbreviation is required'),
  body('type').notEmpty().withMessage('UOM type is required')
];

const validateStore = [
  body('name').notEmpty().withMessage('Store name is required')
];

const validateSpecialFoodItem = [
  body('name').notEmpty().withMessage('Food item name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').notEmpty().withMessage('Category is required')
];

const validateFoodOrder = [
  body('items').isArray({ min: 1 }).withMessage('At least one food item is required'),
  body('requested_time').notEmpty().withMessage('Requested time is required')
];

const validateMenuSchedule = [
  body('menu_id').notEmpty().withMessage('Menu ID is required'),
  body('scheduled_date').notEmpty().withMessage('Scheduled date is required'),
  body('meal_time').notEmpty().withMessage('Meal time is required'),
  body('estimated_servings').isInt({ min: 1 }).withMessage('Estimated servings must be a positive integer')
];

// Apply authentication middleware to all routes
router.use(auth);

/* ---------- DASHBOARD & CHARTS ---------- */
router.get('/dashboard-stats', authorize(['mess', 'warden', 'admin']), getMessDashboardStats);
router.get('/daily-rate/latest', authorize(['mess', 'warden', 'admin']), getLatestDailyRate);
router.get('/chart-data/monthly-expenses', authorize(['mess', 'admin']), getMonthlyExpensesChartData);
router.get('/chart-data/item-stock', authorize(['mess', 'admin']), getItemStockChartData);

/* ---------- MENU MANAGEMENT ---------- */
router.post('/menus', authorize(['mess', 'admin']), validateMenu, createMenu);
router.get('/menus', authorize(['mess', 'warden', 'admin']), getMenus);
router.get('/menus/:id', authorize(['mess', 'warden', 'admin']), getMenuById);
router.put('/menus/:id', authorize(['mess', 'admin']), validateMenu, updateMenu);
router.delete('/menus/:id', authorize(['mess', 'admin', 'warden']), deleteMenu);
router.post('/menus/:id/apply-date-range', authorize(['mess', 'admin']), applyMenuDateRange);

/* ---------- ITEM MANAGEMENT ---------- */
router.post('/items', authorize(['mess', 'admin']), validateItem, createItem);
router.get('/items', authorize(['mess', 'warden', 'admin']), getItems);
router.get('/items/:id', authorize(['mess', 'warden', 'admin']), getItemById);
router.put('/items/:id', authorize(['mess', 'admin']), validateItem, updateItem);
router.delete('/items/:id', authorize(['admin', 'warden']), deleteItem);
router.get('/items/:id/batches', authorize(['mess', 'admin']), getItemBatches);

/* ---------- ITEM CATEGORY MANAGEMENT ---------- */
router.post('/item-categories', authorize(['mess', 'admin']), validateItemCategory, createItemCategory);
router.get('/item-categories', authorize(['mess', 'warden', 'admin']), getItemCategories);
router.put('/item-categories/:id', authorize(['mess', 'admin']), validateItemCategory, updateItemCategory);
router.delete('/item-categories/:id', authorize(['admin', 'warden']), deleteItemCategory);

/* ---------- MENU ITEM MANAGEMENT ---------- */
router.post('/menus/:menu_id/items', authorize(['mess', 'admin']), addItemsToMenu);
router.get('/menus/:menu_id/items', authorize(['mess', 'warden', 'admin']), getMenuWithItems);
router.put('/menus/:menu_id/items', authorize(['mess', 'admin']), updateMenuItems);
router.delete('/menus/:menu_id/items/:item_id', authorize(['mess', 'admin']), removeItemFromMenu);

/* ---------- MENU SCHEDULING ---------- */
router.post('/menu-schedule', authorize(['mess', 'admin']), validateMenuSchedule, scheduleMenu);
router.get('/menu-schedule', authorize(['mess', 'warden', 'admin']), getMenuSchedule);
router.put('/menu-schedule/:id', authorize(['mess', 'admin']), validateMenuSchedule, updateMenuSchedule);
router.delete('/menu-schedule/:id', authorize(['admin', 'warden']), deleteMenuSchedule);
router.put('/menu-schedule/:id/serve', authorize(['mess', 'admin']), markMenuAsServed);

/* ---------- UOM MANAGEMENT ---------- */
router.post('/uoms', authorize(['mess', 'admin']), validateUOM, createUOM);
router.get('/uoms', authorize(['mess', 'warden', 'admin']), getUOMs);
router.put('/uoms/:id', authorize(['mess', 'admin']), validateUOM, updateUOM);
router.delete('/uoms/:id', authorize(['admin', 'warden']), deleteUOM);

/* ---------- STOCK & CONSUMPTION ---------- */
router.post('/stock', authorize(['mess', 'admin']), updateItemStock);
router.get('/stock', authorize(['mess', 'warden', 'admin']), getItemStock);
router.get('/stock/export-excel', authorize(['mess', 'admin']), exportStockToExcel);
router.post('/consumption/bulk', authorize(['mess', 'admin']), recordBulkConsumption);
router.get('/consumption', authorize(['mess', 'warden', 'admin']), getDailyConsumption);
router.post('/inventory-purchase', authorize(['mess', 'admin']), recordInventoryPurchase);
router.get('/inventory-transactions', authorize(['mess', 'warden', 'admin']), getInventoryTransactions);
router.get('/items/:id/fifo-price', authorize(['mess', 'admin']), getItemFIFOPrice);
router.post('/inventory/correct-last-purchase', authorize(['mess', 'admin']), correctLastPurchase);

/* ---------- DAILY RATE & BILLING ---------- */
router.post('/daily-rate/save', authorize(['mess', 'admin']), saveDailyRate);
router.get('/daily-charges/calculate', authorize(['mess', 'admin']), calculateAndApplyDailyMessCharges);
router.post('/daily-charges/calculate', authorize(['mess', 'admin']), calculateAndApplyDailyMessCharges);
router.post('/generate-mess-bills', authorize(['mess', 'admin']), generateMessBills);

/* ---------- STORE MANAGEMENT ---------- */
router.post('/stores', authorize(['mess', 'admin']), validateStore, createStore);
router.get('/stores', authorize(['mess', 'warden', 'admin']), getStores);
router.put('/stores/:id', authorize(['mess', 'admin']), validateStore, updateStore);
router.delete('/stores/:id', authorize(['admin', 'warden']), deleteStore);

/* ---------- ITEM-STORE MAPPING ---------- */
router.post('/item-stores', authorize(['mess', 'admin']), mapItemToStore);
router.get('/item-stores', authorize(['mess', 'warden', 'admin']), getItemStores);
router.delete('/item-stores/:id', authorize(['mess', 'admin']), removeItemStoreMapping);
router.get('/items/:item_id/stores', authorize(['mess', 'warden', 'admin']), getStoresByItemId);
router.get('/stores/:store_id/items', authorize(['mess', 'warden', 'admin']), getItemsByStoreId);

/* ---------- SPECIAL FOOD & ORDERS ---------- */
router.post('/special-food-items', authorize(['mess', 'admin']), validateSpecialFoodItem, createSpecialFoodItem);
router.get('/special-food-items', authorize(['mess', 'warden', 'admin', 'student']), getSpecialFoodItems);
router.get('/special-food-items/:id', authorize(['mess', 'warden', 'admin', 'student']), getSpecialFoodItemById);
router.put('/special-food-items/:id', authorize(['mess', 'admin']), validateSpecialFoodItem, updateSpecialFoodItem);
router.delete('/special-food-items/:id', authorize(['admin', 'warden']), deleteSpecialFoodItem);

router.post('/food-orders', authorize(['student', 'mess', 'admin']), createOrderLimiter, validateFoodOrder, createFoodOrder);
router.get('/food-orders', authorize(['mess', 'warden', 'admin', 'student']), getFoodOrders);
router.get('/food-orders/:id', authorize(['mess', 'warden', 'admin', 'student']), getFoodOrderById);
router.put('/food-orders/:id/status', authorize(['mess', 'admin']), updateFoodOrderStatus);
router.put('/food-orders/:id/payment', authorize(['mess', 'admin']), updatePaymentStatus);
router.put('/food-orders/:id/cancel', authorize(['mess', 'admin', 'student']), cancelFoodOrder);

/* ---------- REPORTS ---------- */
router.get('/reports/monthly-food-orders', authorize(['mess', 'warden', 'admin']), getMonthlyFoodOrderReport);
router.get('/reports/consumption-summary', authorize(['mess', 'warden', 'admin']), getSummarizedConsumptionReport);
router.get('/reports/latest-purchase', authorize(['mess', 'admin']), getLatestPurchaseReport);
router.get('/reports/mess-fee-summary', authorize(['mess', 'admin']), getMessFeeSummary);
router.get('/reports/student-fee-breakdown', authorize(['mess', 'admin']), getStudentFeeBreakdown);
router.get('/reports/monthly-mess-bill', authorize(['mess', 'admin']), generateMonthlyMessReport);
router.get('/reports/daily-consumption-details', authorize(['mess', 'admin']), getDailyConsumptionDetails);
router.get('/reports/daily-rate-calculation', authorize(['mess', 'admin']), generateDailyRateReport);
router.get('/stock/export-unit-rate', authorize(['mess', 'admin']), exportUnitRateCalculation);

/* ---------- DAILY EXPENSES ---------- */
router.post('/daily-expenses', authorize(['mess', 'admin']), createMessDailyExpense);
router.get('/daily-expenses', authorize(['mess', 'admin']), getMessDailyExpenses);
router.get('/daily-expenses/:id', authorize(['mess', 'admin']), getMessDailyExpenseById);
router.put('/daily-expenses/:id', authorize(['mess', 'admin']), updateMessDailyExpense);
router.delete('/daily-expenses/:id', authorize(['mess', 'admin']), deleteMessDailyExpense);

router.post('/expenses-types', authorize(['mess', 'admin']), createExpenseType);
router.get('/expenses-types', authorize(['mess', 'admin']), getExpenseTypes);
router.put('/expenses-types/:id', authorize(['mess', 'admin']), updateExpenseType);
router.delete('/expenses-types/:id', authorize(['mess', 'admin']), deleteExpenseType);

/* ---------- STUDENT FEES & BED FEES ---------- */
router.post('/student-fees', authorize(['mess', 'admin']), createStudentFee);
router.post('/student-fees/bulk', authorize(['mess', 'admin']), createBulkStudentFee);
router.get('/student-fees', authorize(['mess', 'admin']), getStudentFees);
router.delete('/student-fees/bulk', authorize(['mess', 'admin']), bulkDeleteStudentFees);
router.delete('/student-fees/:id', authorize(['mess', 'admin']), deleteStudentFee);

router.post('/bed-fees', authorize(['mess', 'warden', 'admin']), createBedFee);
router.get('/bed-fees', authorize(['mess', 'warden', 'admin']), getAllBedFees);
router.get('/students/:student_id/bed-fees', authorize(['mess', 'warden', 'admin']), getStudentBedFees);
router.delete('/bed-fees/:id', authorize(['mess', 'warden', 'admin']), deleteBedFee);
router.post('/bed-fees/bulk', authorize(['mess', 'warden', 'admin']), createBulkBedFees);

/* ---------- CREDIT TOKENS & CONCERNS ---------- */
router.post('/credit-token', authorize(['mess', 'admin']), createCreditToken);
router.get('/credit-token', authorize(['mess', 'admin']), getCreditTokens);
router.put('/credit-token/:id', authorize(['mess', 'admin']), updateCreditToken);
router.delete('/credit-token/:id', authorize(['mess', 'admin']), deleteCreditToken);

router.post('/concerns', authorize(['mess', 'admin']), createConcern);
router.get('/concerns', authorize(['mess', 'admin', 'warden']), getConcerns);
router.put('/concerns/:id', authorize(['mess', 'admin']), updateConcern);
router.delete('/concerns/:id', authorize(['mess', 'admin']), deleteConcern);

/* ---------- INCOME & OTHERS ---------- */
router.get('/income-entries', authorize(['mess', 'admin']), getIncomeEntries);
router.post('/income-entries', authorize(['mess', 'admin']), createIncomeEntry);
router.get('/additional-income/rounding', authorize(['mess', 'admin']), getRoundingAdjustments);
router.get('/sessions', authorize(['mess', 'warden', 'admin']), getSessions);
router.get('/students', authorize(['mess', 'admin']), getStudents);
router.post('/student-special-consumption-staff', authorize(['mess', 'admin']), recordStaffRecordedSpecialFoodConsumption);
router.get('/purchase-orders', authorize(['mess', 'admin']), getPurchaseOrders);
router.put('/purchase-orders/clear', authorize(['mess', 'admin']), clearPurchaseOrders);

/* ---------- RECIPES ---------- */
router.post('/recipes', authorize(['mess', 'admin']), createRecipe);
router.get('/recipes', authorize(['mess', 'warden', 'admin']), getRecipes);
router.put('/recipes/:id', authorize(['mess', 'admin']), updateRecipe);
router.delete('/recipes/:id', authorize(['admin', 'mess']), deleteRecipe);

/* ---------- COST CALCULATION ---------- */
router.get('/menus/:menu_id/cost', authorize(['mess', 'warden', 'admin']), calculateMenuCost);

router.post('/special-consumption', authorize(['mess', 'admin']), createSpecialConsumption);
router.get('/special-consumption', authorize(['mess', 'warden', 'admin']), getSpecialConsumptions);
router.get('/special-consumption/:id', authorize(['mess', 'warden', 'admin']), getSpecialConsumptionById);

export default router;