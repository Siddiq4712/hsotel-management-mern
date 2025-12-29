import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Building, Users, UserCheck, Bed, Receipt, Bell, BellOff, Save } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalHostels: 0,
    totalWardens: 0,
    totalStudents: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    totalSuppliers: 0,
    pendingMaintenance: 0,
  });
  
  const [chartData, setChartData] = useState({
    userRoles: {},
    monthlyFinancials: { labels: [], income: [], expenses: [] },
    maintenanceStatus: {},
  });

  // --- NEW STATE FOR FEE REMINDER ---
  const [feeSettings, setFeeSettings] = useState({
    amount: 0,
    isActive: false,
    hostelId: 1 // Defaulting to 1, in a multi-hostel system you'd select this
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsResponse = await adminAPI.getDashboardStats();
      setStats(statsResponse.data.data);

      const chartResponse = await adminAPI.getAdminChartData();
      setChartData(chartResponse.data.data);

      // Fetch current hostel settings (assuming hostel ID 1 for this admin)
      const hostelRes = await adminAPI.getHostelById(1);
      if (hostelRes.data.success) {
        setFeeSettings({
          amount: hostelRes.data.data.annual_fee_amount || 0,
          isActive: hostelRes.data.data.show_fee_reminder || false,
          hostelId: 1
        });
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER FOR FEE SETTINGS ---
  const handleUpdateFeeSettings = async () => {
    try {
      await adminAPI.updateHostel(feeSettings.hostelId, {
        annual_fee_amount: feeSettings.amount,
        show_fee_reminder: feeSettings.isActive
      });
      alert('Fee settings updated successfully!');
    } catch (err) {
      alert('Error updating fee settings: ' + err.message);
    }
  };

  const statCards = [
    { title: 'Total Hostels', value: stats.totalHostels, icon: Building, color: 'bg-blue-500' },
    { title: 'Total Wardens', value: stats.totalWardens, icon: UserCheck, color: 'bg-green-500' },
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-purple-500' },
    { title: 'Total Rooms', value: stats.totalRooms, icon: Bed, color: 'bg-orange-500' },
    { title: 'Occupied Rooms', value: stats.occupiedRooms, icon: Bed, color: 'bg-red-500' },
    { title: 'Available Rooms', value: stats.availableRooms, icon: Bed, color: 'bg-teal-500' },
    { title: 'Total Suppliers', value: stats.totalSuppliers, icon: Building, color: 'bg-indigo-500' },
    { title: 'Pending Maintenance', value: stats.pendingMaintenance, icon: Building, color: 'bg-yellow-500' }
  ];

  const hostelOccupancyData = {
    labels: ['Occupied', 'Available'],
    datasets: [{
      data: [stats.occupiedRooms, stats.availableRooms],
      backgroundColor: ['#ef4444', '#22c55e'],
      hoverBackgroundColor: ['#dc2626', '#16a34a'],
    }],
  };

  const userRolesData = {
    labels: chartData.userRoles.labels,
    datasets: [{
      data: chartData.userRoles.counts,
      backgroundColor: ['#8b5cf6', '#3b82f6', '#f59e0b'],
      hoverBackgroundColor: ['#7c3aed', '#2563eb', '#f59e0b'],
    }],
  };

  const monthlyFinancialsData = {
    labels: chartData.monthlyFinancials.labels,
    datasets: [
      {
        label: 'Income',
        data: chartData.monthlyFinancials.income,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Expenses',
        data: chartData.monthlyFinancials.expenses,
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  };

  const maintenanceStatusData = {
    labels: chartData.maintenanceStatus.labels,
    datasets: [{
      data: chartData.maintenanceStatus.counts,
      backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e'],
      hoverBackgroundColor: ['#d97706', '#2563eb', '#16a34a'],
    }],
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your hostel management system</p>
        </div>
      </div>

      {/* --- ANNUAL FEE REMINDER PANEL --- */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border-l-4 border-blue-600">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Receipt className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Annual Fee Notification</h2>
              <p className="text-sm text-gray-500">Set the amount and notify all students to pay their annual fees.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 font-medium">₹</span>
              <input 
                type="number"
                value={feeSettings.amount}
                onChange={(e) => setFeeSettings({...feeSettings, amount: e.target.value})}
                className="pl-7 pr-4 py-2 border border-gray-300 rounded-lg w-40 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Fee Amount"
              />
            </div>
            
            <button
              onClick={() => setFeeSettings({...feeSettings, isActive: !feeSettings.isActive})}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                feeSettings.isActive 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {feeSettings.isActive ? <Bell size={18} /> : <BellOff size={18} />}
              {feeSettings.isActive ? 'Reminder On' : 'Reminder Off'}
            </button>

            <button
              onClick={handleUpdateFeeSettings}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-sm transition-colors"
            >
              <Save size={18} />
              Save & Update
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 flex items-center">
              <div className={`${card.color} p-3 rounded-lg flex-shrink-0`}><Icon className="text-white" size={24} /></div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 h-96">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Hostel Occupancy</h2>
          {stats.totalRooms > 0 ? <Pie data={hostelOccupancyData} options={chartOptions} /> : <p className="text-gray-500 text-center mt-20">No data available.</p>}
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 h-96">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Role Distribution</h2>
          {chartData.userRoles.labels?.length > 0 ? <Doughnut data={userRolesData} options={chartOptions} /> : <p className="text-gray-500 text-center mt-20">No data available.</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 h-96 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Financial Overview</h2>
        {chartData.monthlyFinancials.labels?.length > 0 ? <Bar data={monthlyFinancialsData} options={{ ...chartOptions, scales: { y: { beginAtZero: true } } }} /> : <p className="text-gray-500 text-center mt-20">No data available.</p>}
      </div>
    </div>
  );
};

export default AdminDashboard;