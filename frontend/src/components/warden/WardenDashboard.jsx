import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Users, Bed, BedDouble, CheckCircle } from 'lucide-react';

// CHART.JS IMPORTS
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement // For Doughnut/Pie charts
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const WardenDashboard = () => {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="font-medium text-blue-900">Enroll New Student</div>
              <div className="text-sm text-blue-700">Add a new student to the hostel</div>
            </button>
            <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="font-medium text-green-900">Room Allotment</div>
              <div className="text-sm text-green-700">Assign rooms to students</div>
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

      {/* New Section for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {/* Room Occupancy Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Room/Bed Occupancy Overview</h2>
          {stats.totalCapacity > 0 ? (
            <div className="w-full max-w-sm">
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
            <p className="text-gray-500">No room capacity data available.</p>
          )}
        </div>

        {/* Complaint Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Complaint Status Breakdown</h2>
          {stats.totalComplaints > 0 ? (
            <div className="w-full max-w-md">
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
            <p className="text-gray-500">No complaint data available.</p>
          )}
        </div>

        {/* Leave Request Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Request Status</h2>
          {stats.totalLeaves > 0 ? (
            <div className="w-full max-w-md">
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
            <p className="text-gray-500">No leave request data available.</p>
          )}
        </div>

        {/* New: Today's Attendance Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Attendance Overview</h2>
          {stats.totalTodayAttendance > 0 ? (
            <div className="w-full max-w-sm">
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
            <p className="text-gray-500">No attendance marked for today.</p>
          )}
        </div>
        {/* End New Block */}
      </div>
    </div>
  );
};

export default WardenDashboard;
