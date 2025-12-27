import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { wardenAPI } from '../../services/api'; 
import { 
  Users, Bed, BedDouble, CheckCircle, TrendingUp, AlertTriangle, 
  Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Eye, FileText,
  Clock, CheckSquare
} from 'lucide-react';

// CHART.JS IMPORTS
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const WardenDashboard = ({ setCurrentView }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCapacity: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    pendingLeaves: 0,
    totalLeaves: 0,
    leaveStatus: { pending: 0, approved: 0, rejected: 0 },
    pendingComplaints: 0,
    totalComplaints: 0,
    complaintStatus: { submitted: 0, in_progress: 0, resolved: 0, closed: 0 },
    recentLeaves: [],
    recentComplaints: [],
    attendanceStatus: { P: 0, A: 0, OD: 0 },
    totalTodayAttendance: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState({
    monthlyAttendance: [
      { month: 'Aug', present: 95, absent: 5 },
      { month: 'Sep', present: 92, absent: 8 },
      { month: 'Oct', present: 98, absent: 2 }
    ],
    monthlyComplaints: [
      { month: 'Aug', total: 12 },
      { month: 'Sep', total: 8 },
      { month: 'Oct', total: 15 }
    ],
    monthlyLeaves: [
      { month: 'Aug', total: 20 },
      { month: 'Sep', total: 25 },
      { month: 'Oct', total: 18 }
    ]
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (viewName) => {
    if (setCurrentView) {
      setCurrentView(viewName);
    } else {
      console.warn('setCurrentView not available. Falling back to navigation.');
      navigate('/warden/' + viewName);
    }
  };

  // Enhanced stat cards with trend indicators
  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      trend: '+2.5%',
      description: 'Active students'
    },
    {
      title: 'Total Capacity',
      value: stats.totalCapacity,
      icon: Bed,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      trend: 'Beds available',
      description: 'Room capacity'
    },
    {
      title: 'Occupied Beds',
      value: stats.occupiedBeds,
      icon: BedDouble,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600',
      trend: `${stats.totalCapacity > 0 ? Math.round((stats.occupiedBeds / stats.totalCapacity) * 100) : 0}%`,
      description: 'Occupancy rate'
    },
    {
      title: 'Available Beds',
      value: stats.availableBeds,
      icon: CheckCircle,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      trend: 'Ready to allot',
      description: 'Vacant beds'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Welcome back, {user?.username} 👋</h1>
        <p className="text-gray-500 mt-2">Here's what's happening in your hostel today</p>
      </div>

      {/* Enhanced Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.bgLight} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className={`${card.textColor}`} size={24} />
                </div>
                <div className="flex items-center text-green-600 text-sm font-semibold">
                  <ArrowUpRight size={16} className="mr-1" />
                  {card.trend}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-2">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions - Enhanced */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="mr-2 text-blue-600" size={24} />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button 
              onClick={() => handleQuickAction('enroll-student')} 
              className="w-full text-left p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-100 rounded-lg transition-all duration-300 border border-blue-200 hover:border-blue-400 flex items-start group"
            >
              <div className="bg-blue-500 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <Users className="text-white" size={18} />
              </div>
              <div>
                <div className="font-semibold text-blue-900">Enroll New Student</div>
                <div className="text-xs text-blue-700 mt-1">Add a new student</div>
              </div>
            </button>

            <button 
              onClick={() => handleQuickAction('room-allotment')}
              className="w-full text-left p-4 bg-gradient-to-r from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-100 rounded-lg transition-all duration-300 border border-green-200 hover:border-green-400 flex items-start group"
            >
              <div className="bg-green-500 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <Bed className="text-white" size={18} />
              </div>
              <div>
                <div className="font-semibold text-green-900">Room Allotment</div>
                <div className="text-xs text-green-700 mt-1">Assign rooms to students</div>
              </div>
            </button>

            <button 
              onClick={() => handleQuickAction('attendance')}
              className="w-full text-left p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-100 rounded-lg transition-all duration-300 border border-purple-200 hover:border-purple-400 flex items-start group"
            >
              <div className="bg-purple-500 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <CheckSquare className="text-white" size={18} />
              </div>
              <div>
                <div className="font-semibold text-purple-900">Mark Attendance</div>
                <div className="text-xs text-purple-700 mt-1">Record daily attendance</div>
              </div>
            </button>

            <button 
              onClick={() => handleQuickAction('leave-requests')}
              className="w-full text-left p-4 bg-gradient-to-r from-yellow-50 to-yellow-100/50 hover:from-yellow-100 hover:to-yellow-100 rounded-lg transition-all duration-300 border border-yellow-200 hover:border-yellow-400 flex items-start group"
            >
              <div className="bg-yellow-500 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <Calendar className="text-white" size={18} />
              </div>
              <div>
                <div className="font-semibold text-yellow-900">Manage Leaves</div>
                <div className="text-xs text-yellow-700 mt-1">Review leave requests</div>
              </div>
            </button>
          </div>
        </div>

        {/* Room Occupancy & Overview - Enhanced */}
        <div className="lg:col-span-2 space-y-6">
          {/* Occupancy Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Room Occupancy</h2>
              <span className="text-2xl font-bold text-blue-600">
                {stats.totalCapacity > 0 
                  ? Math.round((stats.occupiedBeds / stats.totalCapacity) * 100) 
                  : 0}%
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{stats.occupiedBeds}</span> / {stats.totalCapacity} beds occupied
                </span>
              </div>
              
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ 
                    width: stats.totalCapacity > 0 
                      ? `${(stats.occupiedBeds / stats.totalCapacity) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Occupied</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.occupiedBeds}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-600 font-semibold uppercase">Available</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.availableBeds}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-600 mb-2">Pending Leaves</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingLeaves}</p>
                <Clock className="text-yellow-500" size={20} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-600 mb-2">Pending Complaints</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-red-600">{stats.pendingComplaints}</p>
                <AlertTriangle className="text-red-500" size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Room Occupancy Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Bed Occupancy</h2>
          {stats.totalCapacity > 0 ? (
            <div className="flex justify-center">
              <div className="w-48 h-48">
                <Doughnut
                  data={{
                    labels: ['Occupied', 'Available'],
                    datasets: [
                      {
                        data: [stats.occupiedBeds, stats.availableBeds],
                        backgroundColor: ['#3b82f6', '#e5e7eb'],
                        borderColor: ['#1e40af', '#d1d5db'],
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { padding: 20 } },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                              label += context.parsed + ' (' + (context.parsed / stats.totalCapacity * 100).toFixed(1) + '%)';
                            }
                            return label;
                          }
                        }
                      }
                    },
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Complaint Status Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Complaint Status</h2>
          {stats.totalComplaints > 0 ? (
            <div className="h-80">
              <Bar
                data={{
                  labels: ['Submitted', 'In Progress', 'Resolved', 'Closed'],
                  datasets: [
                    {
                      label: 'Complaints',
                      data: [
                        stats.complaintStatus.submitted,
                        stats.complaintStatus.in_progress,
                        stats.complaintStatus.resolved,
                        stats.complaintStatus.closed,
                      ],
                      backgroundColor: ['#60a5fa', '#facc15', '#22c55e', '#6b7280'],
                      borderRadius: 6,
                      borderSkipped: false,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true, border: { display: false } },
                    x: { border: { display: false } }
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>

        {/* Leave Status Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Leave Requests</h2>
          {stats.totalLeaves > 0 ? (
            <div className="h-80">
              <Bar
                data={{
                  labels: ['Pending', 'Approved', 'Rejected'],
                  datasets: [
                    {
                      label: 'Leaves',
                      data: [
                        stats.leaveStatus.pending,
                        stats.leaveStatus.approved,
                        stats.leaveStatus.rejected,
                      ],
                      backgroundColor: ['#f97316', '#22c55e', '#ef4444'],
                      borderRadius: 6,
                      borderSkipped: false,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true, border: { display: false } },
                    x: { border: { display: false } }
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>

        {/* Attendance Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Today's Attendance</h2>
          {stats.totalTodayAttendance > 0 ? (
            <div className="flex justify-center">
              <div className="w-48 h-48">
                <Doughnut
                  data={{
                    labels: ['Present', 'Absent', 'On Duty'],
                    datasets: [
                      {
                        data: [
                          stats.attendanceStatus.P,
                          stats.attendanceStatus.A,
                          stats.attendanceStatus.OD,
                        ],
                        backgroundColor: ['#22c55e', '#ef4444', '#facc15'],
                        borderColor: ['#16a34a', '#dc2626', '#eab308'],
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { padding: 20 } },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                              label += context.parsed + ' (' + (context.parsed / stats.totalTodayAttendance * 100).toFixed(1) + '%)';
                            }
                            return label;
                          }
                        }
                      }
                    },
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No attendance marked</p>
          )}
        </div>

        {/* Monthly Attendance Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Attendance Trend</h2>
          {monthlyData.monthlyAttendance.length > 0 ? (
            <div className="h-80">
              <Line
                data={{
                  labels: monthlyData.monthlyAttendance.map(item => item.month),
                  datasets: [
                    {
                      label: 'Present %',
                      data: monthlyData.monthlyAttendance.map(item => item.present),
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 3,
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: '#3b82f6',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                    },
                    {
                      label: 'Absent %',
                      data: monthlyData.monthlyAttendance.map(item => item.absent),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderWidth: 3,
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: '#ef4444',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top', labels: { padding: 20 } },
                  },
                  scales: {
                    y: { beginAtZero: true, max: 100, border: { display: false } },
                    x: { border: { display: false } }
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>

        {/* Monthly Complaints Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Complaint Trends</h2>
          {monthlyData.monthlyComplaints.length > 0 ? (
            <div className="h-80">
              <Bar
                data={{
                  labels: monthlyData.monthlyComplaints.map(item => item.month),
                  datasets: [
                    {
                      label: 'Complaints',
                      data: monthlyData.monthlyComplaints.map(item => item.total),
                      backgroundColor: '#f59e0b',
                      borderColor: '#d97706',
                      borderRadius: 6,
                      borderSkipped: false,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true, border: { display: false } },
                    x: { border: { display: false } }
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WardenDashboard;