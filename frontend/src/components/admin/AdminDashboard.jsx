import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Building, Users, UserCheck, Bed } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
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
    totalFacilities: 0,
    pendingMaintenance: 0,
  });
  const [chartData, setChartData] = useState({
    userRoles: {},
    monthlyFinancials: { labels: [], income: [], expenses: [] },
    maintenanceStatus: {},
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

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Hostels',
      value: stats.totalHostels,
      icon: Building,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Wardens',
      value: stats.totalWardens,
      icon: UserCheck,
      color: 'bg-green-500'
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Rooms',
      value: stats.totalRooms,
      icon: Bed,
      color: 'bg-orange-500'
    },
    {
      title: 'Occupied Rooms',
      value: stats.occupiedRooms,
      icon: Bed,
      color: 'bg-red-500'
    },
    {
      title: 'Available Rooms',
      value: stats.availableRooms,
      icon: Bed,
      color: 'bg-teal-500'
    },
    {
      title: 'Total Suppliers',
      value: stats.totalSuppliers,
      icon: Building, // Or a more suitable supplier icon if available
      color: 'bg-indigo-500'
    },
    {
      title: 'Pending Maintenance',
      value: stats.pendingMaintenance,
      icon: Building, // Or a wrench/gear icon
      color: 'bg-yellow-500'
    }
  ];

  // Chart Data preparation
  const hostelOccupancyData = {
    labels: ['Occupied', 'Available'],
    datasets: [
      {
        data: [stats.occupiedRooms, stats.availableRooms],
        backgroundColor: ['#ef4444', '#22c55e'], // Red for occupied, Green for available
        hoverBackgroundColor: ['#dc2626', '#16a34a'],
      },
    ],
  };

  const userRolesData = {
    labels: chartData.userRoles.labels,
    datasets: [
      {
        data: chartData.userRoles.counts,
        backgroundColor: ['#8b5cf6', '#3b82f6', '#f59e0b'], // Purple, Blue, Orange
        hoverBackgroundColor: ['#7c3aed', '#2563eb', '#f59e0b'],
      },
    ],
  };

  const monthlyFinancialsData = {
    labels: chartData.monthlyFinancials.labels,
    datasets: [
      {
        label: 'Income',
        data: chartData.monthlyFinancials.income,
        backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Expenses',
        data: chartData.monthlyFinancials.expenses,
        backgroundColor: 'rgba(239, 68, 68, 0.6)', // Red
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  };

  const maintenanceStatusData = {
    labels: chartData.maintenanceStatus.labels,
    datasets: [
      {
        data: chartData.maintenanceStatus.counts,
        backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e'], // Yellow (Reported), Blue (In Progress), Green (Completed)
        hoverBackgroundColor: ['#d97706', '#2563eb', '#16a34a'],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows flexible sizing
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-100 rounded-lg">
        <p className="font-semibold">Error:</p>
        <p>{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your hostel management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 flex items-center">
              <div className={`${card.color} p-3 rounded-lg flex-shrink-0`}>
                <Icon className="text-white" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Hostel Occupancy Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 h-96">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Hostel Occupancy</h2>
          {stats.totalRooms > 0 ? (
            <Pie data={hostelOccupancyData} options={chartOptions} />
          ) : (
            <p className="text-gray-500">No room data available to display occupancy.</p>
          )}
        </div>

        {/* User Role Distribution Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 h-96">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Role Distribution</h2>
          {chartData.userRoles.labels?.length > 0 ? (
            <Doughnut data={userRolesData} options={chartOptions} />
          ) : (
            <p className="text-gray-500">No user role data available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Monthly Financial Overview Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 h-96">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Financial Overview (Last 6 Months)</h2>
          {chartData.monthlyFinancials.labels?.length > 0 ? (
            <Bar data={monthlyFinancialsData} options={{ ...chartOptions, scales: { y: { beginAtZero: true } } }} />
          ) : (
            <p className="text-gray-500">No financial data available for charts.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Maintenance Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 h-96">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Maintenance Request Status</h2>
          {chartData.maintenanceStatus.labels?.length > 0 ? (
            <Doughnut data={maintenanceStatusData} options={chartOptions} />
          ) : (
            <p className="text-gray-500">No maintenance data available.</p>
          )}
        </div>
      </div>


      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">System Status</p>
              <p className="text-sm text-gray-600">All systems are operational</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
