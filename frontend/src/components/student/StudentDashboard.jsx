import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { User, Bed, Receipt, Calendar } from 'lucide-react';
// NEW: Chart.js Imports
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import moment from 'moment'; // Already in package.json, useful for month names

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StudentDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // NEW: State for chart data and loading
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceChartData, setAttendanceChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);

  // Function to process mess expense data for Chart.js
  const processMessExpenseData = (data) => {
    const labels = [];
    const expenses = [];

    // Ensure we have data for the last 12 months, even if zero
    const allMonths = [];
    for (let i = 11; i >= 0; i--) {
      const monthMoment = moment().subtract(i, 'months');
      allMonths.push({
        year: monthMoment.year(),
        month: monthMoment.month() + 1, // moment().month() is 0-indexed
      });
    }

    allMonths.forEach((m) => {
      const monthData = data.find(
        (item) => item.year === m.year && item.month === m.month
      );
      labels.push(moment().year(m.year).month(m.month - 1).format('MMM YYYY')); // Format as 'Jan 2023'
      expenses.push(monthData ? parseFloat(monthData.total_amount) : 0);
    });

    setMessExpenseChartData({
      labels: labels,
      datasets: [
        {
          label: 'Monthly Mess Expense (INR)',
          data: expenses,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  // Function to process attendance data for Chart.js
  const processAttendanceData = (data) => {
    const labels = [];
    const presentDays = [];
    const absentDays = [];
    const onDutyDays = [];

    // Ensure we have data for the last 12 months, even if zero
    const allMonths = [];
    for (let i = 11; i >= 0; i--) {
      const monthMoment = moment().subtract(i, 'months');
      allMonths.push({
        year: monthMoment.year(),
        month: monthMoment.month() + 1,
      });
    }

    allMonths.forEach((m) => {
      const monthData = data.find(
        (item) => item.year === m.year && item.month === m.month
      );
      labels.push(moment().year(m.year).month(m.month - 1).format('MMM YYYY'));
      presentDays.push(monthData ? parseInt(monthData.present_days) : 0);
      absentDays.push(monthData ? parseInt(monthData.absent_days) : 0);
      onDutyDays.push(monthData ? parseInt(monthData.on_duty_days) : 0);
    });

    setAttendanceChartData({
      labels: labels,
      datasets: [
        {
          label: 'Present',
          data: presentDays,
          backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Absent',
          data: absentDays,
          backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
        {
          label: 'On Duty',
          data: onDutyDays,
          backgroundColor: 'rgba(255, 206, 86, 0.6)', // Yellow
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setChartLoading(true);
      try {
        // Fetch Profile
        const profileResponse = await studentAPI.getProfile();
        setProfile(profileResponse.data.data || null);

        // Fetch Mess Expense Chart Data
        const messResponse = await studentAPI.getMonthlyMessExpensesChart();
        if (messResponse.data.success) {
          processMessExpenseData(messResponse.data.data);
        }

        // Fetch Attendance Chart Data
        const attendanceResponse = await studentAPI.getMonthlyAttendanceChart();
        if (attendanceResponse.data.success) {
          processAttendanceData(attendanceResponse.data.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
        setChartLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '',
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            if (Number.isInteger(value)) {
              return value;
            }
            return null;
          },
        },
      },
    },
  };

  const messExpenseChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: {
        ...chartOptions.plugins.title,
        text: 'Monthly Mess Expenses',
      },
    },
    scales: {
      ...chartOptions.scales,
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '₹' + value;
          },
        },
      },
    },
  };

  const attendanceChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      title: {
        ...chartOptions.plugins.title,
        text: 'Monthly Attendance Overview',
      },
    },
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
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {profile?.username}!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Profile Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <User className="text-blue-600 mr-3" size={20} />
                <div>
                  <div className="font-medium text-gray-900">Username</div>
                  <div className="text-gray-600">{profile?.username}</div>
                </div>
              </div>

              {profile?.tbl_RoomAllotments &&
                profile.tbl_RoomAllotments[0] && (
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <Bed className="text-green-600 mr-3" size={20} />
                    <div>
                      <div className="font-medium text-gray-900">
                        Room Allotment
                      </div>
                      <div className="text-gray-600">
                        Room{' '}
                        {
                          profile.tbl_RoomAllotments[0].tbl_HostelRoom
                            ?.room_number
                        }{' '}
                        -
                        {
                          profile.tbl_RoomAllotments[0].tbl_HostelRoom
                            ?.tbl_RoomType?.name
                        }
                      </div>
                      <div className="text-sm text-gray-500">
                        Allotted on:{' '}
                        {new Date(
                          profile.tbl_RoomAllotments[0].allotment_date
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
                <Receipt className="text-blue-600 mb-2" size={24} />
                <div className="font-medium text-blue-900">View Mess Bills</div>
                <div className="text-sm text-blue-700">
                  Check your pending bills
                </div>
              </button>

              <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
                <Calendar className="text-green-600 mb-2" size={24} />
                <div className="font-medium text-green-900">Apply for Leave</div>
                <div className="text-sm text-green-700">
                  Submit leave application
                </div>
              </button>
            </div>
          </div>

          {/* NEW: Mess Expense Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Mess Expenses Trend
            </h2>
            {chartLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : messExpenseChartData ? (
              <Bar data={messExpenseChartData} options={messExpenseChartOptions} />
            ) : (
              <p className="text-gray-600">
                No mess expense data available for charts.
              </p>
            )}
          </div>

          {/* NEW: Attendance Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Attendance Overview
            </h2>
            {chartLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : attendanceChartData ? (
              <Bar
                data={attendanceChartData}
                options={attendanceChartOptions}
              />
            ) : (
              <p className="text-gray-600">
                No attendance data available for charts.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Hostel Info
            </h2>
            {profile?.Hostel && (
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-gray-900">
                    {profile.Hostel.name}
                  </div>
                  {profile.Hostel.address && (
                    <div className="text-sm text-gray-600">
                      {profile.Hostel.address}
                    </div>
                  )}
                </div>
                {profile.Hostel.contact_number && (
                  <div className="text-sm text-gray-600">
                    Contact: {profile.Hostel.contact_number}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notices</h2>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="text-sm font-medium text-yellow-800">
                  Mess Bill Due
                </div>
                <div className="text-sm text-yellow-700">
                  Your monthly mess bill is due on 10th of this month.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
