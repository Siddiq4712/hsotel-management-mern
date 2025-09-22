import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import CreateHostel from './components/admin/CreateHostel';
import CreateUser from './components/admin/CreateUser';
import ManageHostels from './components/admin/ManageHostels';
import ManageRoomTypes from './components/admin/ManageRoomTypes';
import ManageRooms from './components/admin/ManageRooms';
import ManageSessions from './components/admin/ManageSessions';
import ManageFacilityTypes from './components/admin/ManageFacilityTypes';
import ManageFacilities from './components/admin/ManageFacilities';
import ManageMaintenance from './components/admin/ManageMaintenance';
import ManageIncomeTypes from './components/admin/ManageIncomeTypes';
import ManageExpenseTypes from './components/admin/ManageExpenseTypes';

// Warden Components
import WardenDashboard from './components/warden/WardenDashboard';
import EnrollStudent from './components/warden/EnrollStudent';
import ManageStudents from './components/warden/ManageStudents';
import RoomAllotment from './components/warden/RoomAllotment';
import AttendanceManagement from './components/warden/AttendanceManagement';
import LeaveRequests from './components/warden/LeaveRequests';
import ComplaintManagement from './components/warden/ComplaintManagement';
import SuspensionManagement from './components/warden/SuspensionManagement';
import HolidayManagement from './components/warden/HolidayManagement';

// Student Components
import StudentDashboard from './components/student/StudentDashboard';
import ApplyLeave from './components/student/ApplyLeave';
import MyLeaves from './components/student/MyLeaves';
import SubmitComplaint from './components/student/SubmitComplaint';
import MyComplaints from './components/student/MyComplaints';
import ViewBills from './components/student/ViewBills';
import MyMessCharges from './components/student/MyMessCharges';
import FacilityUsage from './components/student/FacilityUsage';
import TransactionHistory from './components/student/TransactionHistory';

// Mess Components
import MessDashboard from './components/mess/MessDashboard';
import EnhancedMenuManagement from './components/mess/EnhancedMenuManagement';
import ItemManagement from './components/mess/ItemManagement';
import MenuScheduleManagement from './components/mess/MenuScheduleManagement';
import StockManagement from './components/mess/StockManagement';
import DailyConsumption from './components/mess/DailyConsumption';
import DailyOperations from './components/mess/DailyOperations';
import ManageBills from './components/mess/ManageBills';
import SupplierManagement from './components/mess/SupplierManagement';
import GroceryManagement from './components/mess/GroceryManagement';
import UOMManagement from './components/mess/UOMManagement';
import PurchaseOrderForm from './components/mess/PurchaseOrderForm';
import MessReportsPage from './pages/MessReportsPage';

import InventoryManagement from './components/mess/InventoryManagement';
import InventoryTransactions from './components/mess/InventoryTransactions';
import StoreManagement from './components/mess/StoreManagement';

import SpecialFoodItemsManagement from './components/mess/SpecialFoodItemsManagement';
import FoodOrdersManagement from './components/mess/FoodOrdersManagement';
import FoodOrderForm from './components/student/FoodOrderForm';
import MyFoodOrders from './components/student/MyFoodOrders';
import PurchaseByStore from './components/mess/PurchaseByStore';
import ItemStoreMapping from './components/mess/ItemStoreMapping';
import ConsumptionReport from './components/mess/ConsumptionReport';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  const renderComponent = () => {
    switch (user?.role) {
      case 'admin':
        switch (currentView) {
          case 'dashboard':
            return <AdminDashboard />;
          case 'hostels':
            return <ManageHostels />;
          case 'create-hostel':
            return <CreateHostel />;
          case 'room-types':
            return <ManageRoomTypes />;
          case 'rooms':
            return <ManageRooms />;
          case 'create-user':
            return <CreateUser />;
          case 'sessions':
            return <ManageSessions />;
          case 'facility-types':
            return <ManageFacilityTypes />;
          case 'facilities':
            return <ManageFacilities />;
          case 'maintenance':
            return <ManageMaintenance />;
          case 'income-types':
            return <ManageIncomeTypes />;
          case 'expense-types':
            return <ManageExpenseTypes />;
          case 'uoms':
            return <UOMManagement />;
          case 'suppliers':
            return <SupplierManagement />;
          default:
            return <AdminDashboard />;
        }
 
      case 'warden':
        switch (currentView) {
          case 'dashboard':
            return <WardenDashboard />;
          case 'students':
            return <ManageStudents />;
          case 'enroll-student':
            return <EnrollStudent />;
          case 'room-allotment':
            return <RoomAllotment />;
          case 'attendance':
            return <AttendanceManagement />;
          case 'leave-requests':
            return <LeaveRequests />;
          case 'complaints':
            return <ComplaintManagement />;
          case 'suspensions':
            return <SuspensionManagement />;
          case 'holidays':
            return <HolidayManagement />;
          default:
            return <WardenDashboard />;
        }
      
      case 'student':
        switch (currentView) {
          case 'dashboard':
            return <StudentDashboard />;
          case 'apply-leave':
            return <ApplyLeave />;
          case 'my-leaves':
            return <MyLeaves />;
          case 'submit-complaint':
            return <SubmitComplaint />;
          case 'my-complaints':
            return <MyComplaints />;
          case 'view-bills':
            return <ViewBills />;
          case 'facilities':
            return <FacilityUsage />;
          case 'transactions':
            return <TransactionHistory />;
          case 'mess-charges':
            return <MyMessCharges />;
          case 'food-order':
            return <FoodOrderForm />;
          case 'my-food-orders':
            return <MyFoodOrders />;
          default:
            return <StudentDashboard />;
        }
      
         case 'mess':
          switch (currentView) {
            case 'dashboard':
              return <MessDashboard />;
            case 'menus':
              return <EnhancedMenuManagement />;
            case 'items':
              return <ItemManagement />;
            case 'menu-schedule':
              return <MenuScheduleManagement />;
            case 'stock':
              return <StockManagement />;
            case 'consumption':
              return <DailyConsumption />;
            case 'bills':
              return <ManageBills />;
            case 'daily-operations':
              return <DailyOperations />;
            case 'consumption-report':
              return <ConsumptionReport />;
            case 'groceries':
              return <GroceryManagement />;
            case 'suppliers':
              return <SupplierManagement />;
            case 'purchase-orders':
              return <PurchaseOrderForm />;
            case 'uoms':
              return <UOMManagement />;
            case 'reports':
              return <MessReportsPage />;
            
            // NEW: Add the case for our new component
            case 'purchase-by-store':
              return <PurchaseByStore />;

            // Old 'inventory-management' case can be removed if not used elsewhere
            case 'inventory-management':
              return <InventoryManagement />;
            case 'inventory-transactions':
              return <InventoryTransactions />;
            case 'item-store-mapping':
              return <ItemStoreMapping />;
            case 'stores':
              return <StoreManagement />;
            case 'special-food-items':
              return <SpecialFoodItemsManagement />;
            case 'food-orders':
              return <FoodOrdersManagement />;
            default:
              return <MessDashboard />;
          }
      
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderComponent()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
