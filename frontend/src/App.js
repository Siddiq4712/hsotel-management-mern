import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StockProvider } from './context/StockContext'; // Import StockProvider
import Layout from './components/common/Layout';
import Login from './components/auth/Login';
import OAuthCallback from './components/auth/OAuthCallback';

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
import RecordStudentSpecialMeal from './components/mess/RecordStudentSpecialMeal';

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
import MessBillManagement from './components/warden/MessBillManagement';

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
import FoodOrderForm from './components/student/StudentFoodMenu';
import MyFoodOrders from './components/student/MyFoodOrders';
import StudentProfile from './components/student/StudentProfile';

// Mess Components
import MessDashboard from './components/mess/MessDashboard';
import EnhancedMenuManagement from './components/mess/EnhancedMenuManagement';
import ItemManagement from './components/mess/ItemManagement';
import MenuScheduleManagement from './components/mess/MenuScheduleManagement';
import StockManagement from './components/mess/StockManagement';
import DailyConsumption from './components/mess/DailyConsumption';
import DailyOperations from './components/mess/DailyOperations';
import UOMManagement from './components/mess/UOMManagement';
import PurchaseByStore from './components/mess/PurchaseByStore';
import InventoryManagement from './components/mess/InventoryManagement';
import InventoryTransactions from './components/mess/InventoryTransactions';
import StoreManagement from './components/mess/StoreManagement';
import MessOrderDashboard from './components/mess/MessOrderDashboard';
import SpecialFoodItemsManagement from './components/mess/SpecialFoodItemsManagement';
import FoodOrdersManagement from './components/mess/FoodOrdersManagement';
import ItemStoreMapping from './components/mess/ItemStoreMapping';
import ConsumptionReport from './components/mess/ConsumptionReport';
import MenuPlanner from './components/mess/MenuPlanner';
import CreateMenu from './components/mess/CreateMenu';
import MessExpenses from './components/mess/MessExpenses';
import RecordAdhocConsumption from './components/mess/RecordAdhocConsumption';
import CalculateDailyCharges from './components/mess/CalculateDailyCharges'; // Import the new component
import StudentMessHistory from './components/student/StudentMessHistory';
import HostelAdditionalIncome from './components/mess/HostelAdditionalIncome'; // Import the new component
import MessFee from './components/mess/MessFeeManagement'; // Import the new component
import PaperBillGenerator from './components/mess/PaperBillGenerator'; // Import the new component
import SisterBillConcern from './components/mess/CreditTokenManager'; // Import the new component
import IncomeEntryManager from './components/mess/IncomeEntryManager';
import DailyRateReport from './components/mess/DailyRateReport'; // Import the new component

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
          case 'mess-bills':
            return <MessBillManagement />;
          default:
            return <WardenDashboard />;
        }
      
      case 'student':
      case 'lapc':
        switch (currentView) {
          case 'dashboard':
            return <StudentDashboard setCurrentView={setCurrentView} />;
          case 'apply-leave':
            return <ApplyLeave />;
          case 'my-leaves':
            return <MyLeaves />;
          case 'submit-complaint':
            return <SubmitComplaint />;
          case 'my-complaints':
            return <MyComplaints />;
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
          case 'mess-history':
            return <StudentMessHistory />;
          case 'profile':
            return <StudentProfile />;
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
          case 'menu-planner':
            return <MenuPlanner />;
          case 'stock':
            return <StockManagement />;
          case 'consumption':
            return <RecordStudentSpecialMeal />;
          case 'daily-operations':
            return <DailyOperations />;
          case 'consumption-report':
            return <ConsumptionReport />;
          case 'create-menu':
            return <CreateMenu />;
          case 'uoms':
            return <UOMManagement />;
          case 'purchase-by-store':
            return <PurchaseByStore />;
          case 'food-orders-dashboard':
            return <MessOrderDashboard />;
          case 'record-consumption':
            return <RecordAdhocConsumption />;
          case 'inventory':
            return <InventoryManagement />;
          case 'inventory-transactions':
            return <InventoryTransactions />;
          case 'item-store-mapping':
            return <ItemStoreMapping />;
          case 'stores':
            return <StoreManagement />;
          case 'calculate-daily-charges':
            return <CalculateDailyCharges />;
          case 'special-food-items':
            return <SpecialFoodItemsManagement />;
          case 'food-orders':
            return <FoodOrdersManagement />;
          case 'sister-bill-concern':
            return <SisterBillConcern />;
          case 'Daily-expenses':
            return <MessExpenses />;
          case 'hostel-additional-income':
            return <HostelAdditionalIncome />;
          case 'mess-fee':
            return <MessFee/>;
          case 'paper-bill-generator':
            return <PaperBillGenerator />;
          case 'income-deduction-entry':
            return <IncomeEntryManager />;
          case 'daily-rate-report':
            return <DailyRateReport />;
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
      <StockProvider> {/* Wrap the app with StockProvider */}
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
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
      </StockProvider>
    </AuthProvider>
  );
}

export default App;