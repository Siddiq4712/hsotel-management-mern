// routes/adminRoutes.js - Complete version
const express = require('express');
const {
  // Hostel Management
  createHostel, getHostels, getHostelById, updateHostel, deleteHostel,
  
  // User Management  
  createUser, getUsers, updateUser, deleteUser,
  
  // Room Type Management
  createRoomType, getRoomTypes, updateRoomType, deleteRoomType,
  
  // Room Management
  createRoom, getRooms, updateRoom, deleteRoom,
  
  // Session Management
  createSession, getSessions, updateSession, deleteSession,
  
  // Facility Type Management
  createFacilityType, getFacilityTypes, updateFacilityType, deleteFacilityType,
  
  // Facility Management
  createFacility, getFacilities, updateFacility, deleteFacility,
  
  // Maintenance Management
  createMaintenance, getMaintenance, updateMaintenance, deleteMaintenance,
  
  // Finance Management
  createIncomeType, getIncomeTypes, updateIncomeType, deleteIncomeType,
  createExpenseType, getExpenseTypes, updateExpenseType, deleteExpenseType,
  
  // Supplier Management
  createSupplier, getSuppliers, getSupplierById, updateSupplier, deleteSupplier,
  
  // UOM Management
  createUOM, getUOMs, updateUOM, deleteUOM,
  
  // Dashboard
  getDashboardStats
} = require('../controllers/adminController');

const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply auth and admin authorization to all routes
router.use(auth);
router.use(authorize(['admin']));

// Dashboard
router.get('/dashboard-stats', getDashboardStats);

// Hostel Management
router.post('/hostels', createHostel);
router.get('/hostels', getHostels);
router.get('/hostels/:id', getHostelById);
router.put('/hostels/:id', updateHostel);
router.delete('/hostels/:id', deleteHostel);

// User Management
router.post('/users', createUser);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Room Type Management
router.post('/room-types', createRoomType);
router.get('/room-types', getRoomTypes);
router.put('/room-types/:id', updateRoomType);
router.delete('/room-types/:id', deleteRoomType);

// Room Management
router.post('/rooms', createRoom);
router.get('/rooms', getRooms);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// Session Management
router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

// Facility Type Management
router.post('/facility-types', createFacilityType);
router.get('/facility-types', getFacilityTypes);
router.put('/facility-types/:id', updateFacilityType);
router.delete('/facility-types/:id', deleteFacilityType);

// Facility Management
router.post('/facilities', createFacility);
router.get('/facilities', getFacilities);
router.put('/facilities/:id', updateFacility);
router.delete('/facilities/:id', deleteFacility);

// Maintenance Management
router.post('/maintenance', createMaintenance);
router.get('/maintenance', getMaintenance);
router.put('/maintenance/:id', updateMaintenance);
router.delete('/maintenance/:id', deleteMaintenance);

// Finance Management
router.post('/income-types', createIncomeType);
router.get('/income-types', getIncomeTypes);
router.put('/income-types/:id', updateIncomeType);
router.delete('/income-types/:id', deleteIncomeType);

router.post('/expense-types', createExpenseType);
router.get('/expense-types', getExpenseTypes);
router.put('/expense-types/:id', updateExpenseType);
router.delete('/expense-types/:id', deleteExpenseType);

// Supplier Management
router.post('/suppliers', createSupplier);
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// UOM Management
router.post('/uoms', createUOM);
router.get('/uoms', getUOMs);
router.put('/uoms/:id', updateUOM);
router.delete('/uoms/:id', deleteUOM);

module.exports = router;
