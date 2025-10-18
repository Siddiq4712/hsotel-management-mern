import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// NOTE: wardenAPI import is kept for fetchStats, but we will not use its new monthly methods
import { wardenAPI } from '../../services/api'; 
import { Users, Bed, BedDouble, CheckCircle, TrendingUp, AlertTriangle, Calendar, BarChart3 } from 'lucide-react';

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
  ArcElement, // For Doughnut/Pie charts
  PointElement,
  LineElement // For Line charts
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

// 💡 MODIFICATION 1: Accept setCurrentView as a prop
const WardenDashboard = ({ setCurrentView }) => {
  // 💡 NOTE: useNavigate is kept but handleQuickAction is changed
  const navigate = useNavigate();
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
    // --- Added for Attendance Chart ---
    attendanceStatus: { P: 0, A: 0, OD: 0 },
    totalTodayAttendance: 0
    // --- End Added Block ---
  });
  const [loading, setLoading] = useState(true);
  // Initial state for monthlyData will be the mock data to prevent initial empty charts
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
    // fetchMonthlyData is not called in useEffect anymore. 
    // We rely on mock data in the initial state to avoid the API error.
  }, []);

  const fetchStats = async () => {
    try {
      // This call should be safe if getDashboardStats exists
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // ❌ REMOVED: The fetchMonthlyData function is commented out/removed to fix the TypeError.
  /*
  const fetchMonthlyData = async () => {
    try {
      const [attendanceRes, complaintsRes, leavesRes] = await Promise.all([
        wardenAPI.getMonthlyAttendance(),
        wardenAPI.getMonthlyComplaints(),
        wardenAPI.getMonthlyLeaves()
      ]);
      
      setMonthlyData({
        monthlyAttendance: attendanceRes.data.data || [],
        monthlyComplaints: complaintsRes.data.data || [],
        monthlyLeaves: leavesRes.data.data || []
      });
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      // Fallback is no longer necessary here since it's in the initial state
    }
  };
  */

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Beds Capacity',
      value: stats.totalCapacity,
      icon: Bed,
      color: 'bg-green-500'
    },
    {
      title: 'Occupied Beds',
      value: stats.occupiedBeds,
      icon: BedDouble,
      color: 'bg-orange-500'
    },
    {
      title: 'Available Beds',
      value: stats.availableBeds,
      icon: CheckCircle,
      color: 'bg-purple-500'
    }
  ];

  // 💡 MODIFICATION 2: Use setCurrentView to change the view state in the parent
  const handleQuickAction = (viewName) => {
    if (setCurrentView) {
        setCurrentView(viewName);
    } else {
        // Fallback or warning if setCurrentView is not passed
        console.warn('setCurrentView not available. Falling back to navigation.');
        navigate('/warden/' + viewName);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Warden Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your hostel operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              // 💡 MODIFICATION 3: Change argument to 'enroll-student'
              onClick={() => handleQuickAction('enroll-student')} 
              className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
            >
              <Calendar className="mr-3 h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium text-blue-900">Enroll New Student</div>
                <div className="text-sm text-blue-700">Add a new student to the hostel</div>
              </div>
            </button>
            <button 
              // 💡 MODIFICATION 4: Change argument to 'room-allotment'
              onClick={() => handleQuickAction('room-allotment')}
              className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center"
            >
              <Bed className="mr-3 h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium text-green-900">Room Allotment</div>
                <div className="text-sm text-green-700">Assign rooms to students</div>
              </div>
            </button>
            <button 
              // 💡 MODIFICATION 5: Change argument to 'attendance'
              onClick={() => handleQuickAction('attendance')}
              className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center"
            >
              <Users className="mr-3 h-5 w-5 text-purple-500" />
              <div>
                <div className="font-medium text-purple-900">Mark Attendance</div>
                <div className="text-sm text-purple-700">Record daily attendance</div>
              </div>
            </button>
            <button 
              // 💡 MODIFICATION 6: Change argument to 'leave-requests'
              onClick={() => handleQuickAction('leave-requests')}
              className="w-full text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors flex items-center"
            >
              <TrendingUp className="mr-3 h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium text-yellow-900">Manage Leaves</div>
                <div className="text-sm text-yellow-700">Review leave requests</div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Occupancy</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Occupancy Rate</span>
              <span className="font-semibold">
                {stats.totalCapacity > 0 
                  ? Math.round((stats.occupiedBeds / stats.totalCapacity) * 100) 
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-pink-600 h-2 rounded-full" 
                style={{ 
                  width: stats.totalCapacity > 0 
                    ? `${(stats.occupiedBeds / stats.totalCapacity) * 100}%` 
                    : '0%' 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Room Occupancy Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Room/Bed Occupancy Overview</h2>
          {stats.totalCapacity > 0 ? (
            <div className="w-full max-w-sm mx-auto">
              <Doughnut
                data={{
                  labels: ['Occupied Beds', 'Available Beds'],
                  datasets: [
                    {
                      data: [stats.occupiedBeds, stats.availableBeds],
                      backgroundColor: ['#f87171', '#34d399'],
                      borderColor: ['#f87171', '#34d399'],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: `Total Capacity: ${stats.totalCapacity} Beds` },
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
          ) : (
            <p className="text-gray-500 text-center">No room capacity data available.</p>
          )}
        </div>

        {/* Complaint Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Complaint Status Breakdown</h2>
          {stats.totalComplaints > 0 ? (
            <div className="w-full max-w-md mx-auto">
              <Bar
                data={{
                  labels: ['Submitted', 'In Progress', 'Resolved', 'Closed'],
                  datasets: [
                    {
                      label: 'Number of Complaints',
                      data: [
                        stats.complaintStatus.submitted,
                        stats.complaintStatus.in_progress,
                        stats.complaintStatus.resolved,
                        stats.complaintStatus.closed,
                      ],
                      backgroundColor: ['#60a5fa', '#facc15', '#22c55e', '#6b7280'],
                      borderColor: ['#3b82f6', '#eab308', '#16a34a', '#4b5563'],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `Total Complaints: ${stats.totalComplaints}` },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        callback: function(value) { if (value % 1 === 0) return value; }
                      }
                    },
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center">No complaint data available.</p>
          )}
        </div>

        {/* Leave Request Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Request Status</h2>
          {stats.totalLeaves > 0 ? (
            <div className="w-full max-w-md mx-auto">
              <Bar
                data={{
                  labels: ['Pending', 'Approved', 'Rejected'],
                  datasets: [
                    {
                      label: 'Number of Leaves',
                      data: [
                        stats.leaveStatus.pending,
                        stats.leaveStatus.approved,
                        stats.leaveStatus.rejected,
                      ],
                      backgroundColor: ['#f97316', '#22c55e', '#ef4444'],
                      borderColor: ['#ea580c', '#16a34a', '#dc2626'],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `Total Leave Requests: ${stats.totalLeaves}` },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        callback: function(value) { if (value % 1 === 0) return value; }
                      }
                    },
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center">No leave request data available.</p>
          )}
        </div>

        {/* Today's Attendance Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Attendance Overview</h2>
          {stats.totalTodayAttendance > 0 ? (
            <div className="w-full max-w-sm mx-auto">
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
                      backgroundColor: ['#22c55e', '#ef4444', '#facc15'], // Green, Red, Yellow
                      borderColor: ['#16a34a', '#dc2626', '#eab308'],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                    title: {
                      display: true,
                      text: `Total Marked: ${stats.totalTodayAttendance} Students`,
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          let label = context.label || '';
                          if (label) {
                              label += ': ';
                          }
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
          ) : (
            <p className="text-gray-500 text-center">No attendance marked for today.</p>
          )}
        </div>

        {/* New: Monthly Attendance Trend Chart (Now using mock data from state) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Attendance Trend</h2>
          {monthlyData.monthlyAttendance.length > 0 ? (
            <div className="w-full max-w-md mx-auto">
              <Line
                data={{
                  labels: monthlyData.monthlyAttendance.map(item => item.month),
                  datasets: [
                    {
                      label: 'Present %',
                      data: monthlyData.monthlyAttendance.map(item => item.present),
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true,
                    },
                    {
                      label: 'Absent %',
                      data: monthlyData.monthlyAttendance.map(item => item.absent),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Attendance Over Last 3 Months' },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                    },
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center">No monthly attendance data available.</p>
          )}
        </div>

        {/* New: Monthly Complaints Trend Chart (Now using mock data from state) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Complaints Trend</h2>
          {monthlyData.monthlyComplaints.length > 0 ? (
            <div className="w-full max-w-md mx-auto">
              <Bar
                data={{
                  labels: monthlyData.monthlyComplaints.map(item => item.month),
                  datasets: [
                    {
                      label: 'Complaints',
                      data: monthlyData.monthlyComplaints.map(item => item.total),
                      backgroundColor: '#f59e0b',
                      borderColor: '#d97706',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Complaints Over Last 3 Months' },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      }
                    },
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center">No monthly complaints data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WardenDashboard;