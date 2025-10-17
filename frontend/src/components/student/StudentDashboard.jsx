import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { User, Bed, Receipt, Calendar, Users, Home, CreditCard, FileText, Clock, Utensils } from 'lucide-react';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
import moment from 'moment';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const StudentDashboard = ({ setCurrentView }) => {  // Accept setCurrentView from props
  const [profile, setProfile] = useState(null);
  const [roomMates, setRoomMates] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceChartData, setAttendanceChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  const token = localStorage.getItem('token');

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

  // Function to process attendance data for Chart.js with improved calculation
  const processAttendanceData = (data) => {
    const labels = [];
    const attendanceDays = []; // Will hold the MAX of totalManDays and present count
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
      
      if (monthData) {
        // Get the count of present days
        const presentCount = parseInt(monthData.present_days || 0);
        
        // Get the totalManDays
        const totalManDays = parseInt(monthData.totalManDays || 0);
        
        // Use the maximum value between present count and totalManDays
        const maxAttendanceValue = Math.max(presentCount, totalManDays);
        
        // Store the maximum value in the attendanceDays array
        attendanceDays.push(maxAttendanceValue);
        
        // Store other attendance data
        absentDays.push(parseInt(monthData.absent_days || 0));
        onDutyDays.push(parseInt(monthData.on_duty_days || 0));
      } else {
        // No data for this month, push zeros
        attendanceDays.push(0);
        absentDays.push(0);
        onDutyDays.push(0);
      }
    });

    // Format the data for the chart
    setAttendanceChartData({
      labels: labels,
      datasets: [
        {
          label: 'Attendance Days',  // This is the maximum of totalManDays and present count
          data: attendanceDays,
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
    
    // Log the attendance data for debugging
    console.log("Processed attendance data:", {
      labels,
      attendanceDays,
      absentDays,
      onDutyDays
    });
  };

  const fetchRoomMates = async (roomId) => {
    try {
      // Try common API patterns to find roommates
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const possibleEndpoints = [
        `${baseUrl}/api/hostels/rooms/${roomId}/students`,
        `${baseUrl}/api/rooms/${roomId}/occupants`,
        `${baseUrl}/api/rooms/${roomId}/students`
      ];
      
      let roomMatesData = [];
      
      // Try each endpoint until we get data
      for (const endpoint of possibleEndpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data?.data) {
              roomMatesData = data.data;
              break; // Exit loop if we got data
            }
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} not available, trying next`);
        }
      }
      
      // If we couldn't get roommates through API, make a fallback request to student API
      if (roomMatesData.length === 0) {
        try {
          const response = await studentAPI.getProfile();
          const profileData = response.data.data;
          
          if (profileData?.tbl_RoomAllotments?.[0]?.HostelRoom?.id) {
            const roomId = profileData.tbl_RoomAllotments[0].HostelRoom.id;
            const roomResponse = await studentAPI.getRoomOccupants(roomId);
            if (roomResponse?.data?.data) {
              roomMatesData = roomResponse.data.data;
            }
          }
        } catch (error) {
          console.error("Error in fallback roommates fetch:", error);
        }
      }
      
      // Filter out the current user if needed
      if (profile) {
        roomMatesData = roomMatesData.filter(mate => mate.id !== profile.id);
      }
      
      setRoomMates(roomMatesData);
    } catch (error) {
      console.error('Error fetching roommates:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setChartLoading(true);
      try {
        // Fetch Profile
        const profileResponse = await studentAPI.getProfile();
        const profileData = profileResponse.data.data || null;
        setProfile(profileData);
        
        // Fetch roommates if room info is available
        if (profileData?.tbl_RoomAllotments?.[0]?.HostelRoom?.id) {
          fetchRoomMates(profileData.tbl_RoomAllotments[0].HostelRoom.id);
        }

        // Fetch attendance for today
        fetchAttendance();

        // Fetch Mess Expense Chart Data
        const messResponse = await studentAPI.getMonthlyMessExpensesChart();
        if (messResponse.data.success) {
          processMessExpenseData(messResponse.data.data);
        }

        // Fetch Attendance Chart Data
        const attendanceResponse = await studentAPI.getMonthlyAttendanceChart();
        if (attendanceResponse.data.success) {
          console.log("Raw attendance data from API:", attendanceResponse.data.data);
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
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '',
      },
      tooltip: {
        callbacks: {
          // Customize tooltip to show more details
          title: function(tooltipItems) {
            return tooltipItems[0].label;
          },
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + ' days';
            }
            return label;
          }
        }
      }
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
          // Ensure we show integer values for days
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
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '₹' + context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
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

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const date = moment().format('YYYY-MM-DD');
      const response = await studentAPI.getMyAttendance({ date });
      const records = response.data.data || [];
      setAttendance(records.length > 0 ? records[0] : null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'P':
        return { icon: <CheckCircleOutlined className="text-green-600 text-3xl" />, text: 'Present', color: 'bg-green-50 border-green-200 text-green-800' };
      case 'A':
        return { icon: <CloseCircleOutlined className="text-red-600 text-3xl" />, text: 'Absent', color: 'bg-red-50 border-red-200 text-red-800' };
      case 'OD':
        return { icon: <ClockCircleOutlined className="text-blue-600 text-3xl" />, text: 'On Duty', color: 'bg-blue-50 border-blue-200 text-blue-800' };
      default:
        return { icon: <Clock className="text-gray-400 w-8 h-8" />, text: 'Not Marked', color: 'bg-gray-50 border-gray-200 text-gray-500' };
    }
  };

  // Quick action handlers
  const handleViewMessBills = () => setCurrentView('mess-charges');
  const handleOrderSpecialFood = () => setCurrentView('food-order');
  const handleViewAttendance = () => setCurrentView('my-leaves');
  const handleViewComplaints = () => setCurrentView('my-complaints');

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusInfo = attendance ? getStatusDisplay(attendance.status) : getStatusDisplay(null);
  const roomInfo = profile?.tbl_RoomAllotments?.[0]?.HostelRoom;
  const roomType = roomInfo?.RoomType || roomInfo?.tbl_RoomType;

  return (
    <div className="pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your student dashboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Attendance Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="mr-2 text-blue-600" size={20} />
              Today's Attendance
            </h2>
            
            <div className={`rounded-lg border p-4 flex items-center ${statusInfo.color}`}>
              <div className="flex-shrink-0 mr-4">
                {statusInfo.icon}
              </div>
              <div>
                <div className="font-medium">{statusInfo.text}</div>
                <div className="text-sm">
                  {attendance ? 
                    `Marked on ${new Date(attendance.date).toLocaleDateString()}` : 
                    'Attendance has not been marked yet'
                  }
                </div>
              </div>
            </div>
          </div>
          
          {/* Room Information with Roommates */}
          {roomInfo && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Home className="mr-2 text-green-600" size={20} />
                Room Information
              </h2>
              
              <div className="flex flex-wrap items-center p-4 bg-gray-50 rounded-lg mb-4">
                <Bed className="text-green-600 mr-3" size={20} />
                <div>
                  <div className="font-medium text-gray-900">Room {roomInfo.room_number}</div>
                  <div className="text-gray-600">
                    {roomType?.name || 'Standard Room'} 
                    {roomType?.capacity ? ` (${roomType.capacity} capacity)` : ''}
                  </div>
                  {profile?.tbl_RoomAllotments?.[0]?.allotment_date && (
                    <div className="text-sm text-gray-500">
                      Allotted on: {new Date(profile.tbl_RoomAllotments[0].allotment_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Roommates Section */}
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 flex items-center mb-3">
                  <Users className="mr-2 text-blue-600" size={16} />
                  Roommates
                </h3>
                
                {roomMates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roomMates.map((mate) => (
                      <div key={mate.id} className="flex items-center p-3 bg-blue-50 rounded-lg">
                        {mate.profile_picture ? (
                          <img 
                            src={mate.profile_picture} 
                            alt={mate.username}
                            className="w-8 h-8 rounded-full mr-3 object-cover border border-blue-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                              const parent = e.target.parentNode;
                              const initials = document.createElement("div");
                              initials.className = "w-8 h-8 rounded-full mr-3 bg-blue-500 text-white font-bold flex items-center justify-center";
                              initials.textContent = getInitials(mate.username);
                              parent.prepend(initials);
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full mr-3 bg-blue-500 text-white font-bold flex items-center justify-center">
                            {getInitials(mate.username)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{mate.username}</div>
                          <div className="text-xs text-gray-500">{mate.email || 'No email'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm bg-gray-50 p-3 rounded-md">No roommates found or you have a single occupancy room.</p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions - Order Special Food and others */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="mr-2 text-indigo-600" size={20} />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleViewMessBills} 
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left flex flex-col h-full"
              >
                <Receipt className="text-blue-600 mb-2" size={24} />
                <div className="font-medium text-blue-900">Mess Bills</div>
                <div className="text-sm text-blue-700 mt-1">Check your mess expenses</div>
              </button>

              <button 
                onClick={handleOrderSpecialFood} 
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-left flex flex-col h-full"
              >
                <Utensils className="text-orange-600 mb-2" size={24} />
                <div className="font-medium text-orange-900">Order Special Food</div>
                <div className="text-sm text-orange-700 mt-1">Request special meal options</div>
              </button>

              <button 
                onClick={handleViewAttendance} 
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left flex flex-col h-full"
              >
                <User className="text-purple-600 mb-2" size={24} />
                <div className="font-medium text-purple-900">My Leaves</div>
                <div className="text-sm text-purple-700 mt-1">View your leave history</div>
              </button>

              <button 
                onClick={handleViewComplaints} 
                className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-left flex flex-col h-full"
              >
                <FileText className="text-amber-600 mb-2" size={24} />
                <div className="font-medium text-amber-900">Complaints</div>
                <div className="text-sm text-amber-700 mt-1">Manage your complaints</div>
              </button>
            </div>
          </div>

          {/* Mess Expense Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="mr-2 text-red-600" size={20} />
              Mess Expenses Trend
            </h2>
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : messExpenseChartData ? (
              <div className="h-64">
                <Bar data={messExpenseChartData} options={messExpenseChartOptions} />
              </div>
            ) : (
              <p className="text-gray-600 p-4 bg-gray-50 rounded-lg">
                No mess expense data available yet.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Hostel Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="mr-2 text-blue-600" size={20} />
              Hostel Info
            </h2>
            {profile?.Hostel ? (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="font-medium text-gray-900 text-lg">
                    {profile.Hostel.name}
                  </div>
                  {profile.Hostel.address && (
                    <div className="text-sm text-gray-600 mt-1">
                      {profile.Hostel.address}
                    </div>
                  )}
                  {profile.Hostel.contact_number && (
                    <div className="text-sm text-gray-600 mt-2 font-medium">
                      Contact: {profile.Hostel.contact_number}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 p-3 bg-gray-50 rounded-lg">
                No hostel information available.
              </p>
            )}
          </div>

          {/* Attendance Chart - using MAX(totalManDays, presentDays) */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="mr-2 text-green-600" size={20} />
              Attendance Overview
            </h2>
            {chartLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : attendanceChartData ? (
              <div className="h-64">
                <Bar
                  data={attendanceChartData}
                  options={attendanceChartOptions}
                />
              </div>
            ) : (
              <p className="text-gray-600 p-4 bg-gray-50 rounded-lg">
                No attendance data available yet.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2 text-center">
              *Attendance days shows the maximum of total man-days and present days
            </p>
          </div>
          
          {/* Important Notices */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="mr-2 text-yellow-600" size={20} />
              Important Notices
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="text-sm font-medium text-yellow-800">
                  Mess Bill Due
                </div>
                <div className="text-sm text-yellow-700">
                  Your monthly mess bill is due on 10th of this month.
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <div className="text-sm font-medium text-blue-800">
                  Upcoming Event
                </div>
                <div className="text-sm text-blue-700">
                  Hostel cultural event on {moment().add(2, 'weeks').format('MMMM Do')}.
                </div>
              </div>
              
              <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                <div className="text-sm font-medium text-orange-800">
                  Special Menu
                </div>
                <div className="text-sm text-orange-700">
                  Special food menu available this weekend. Check mess for details.
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
