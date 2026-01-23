import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, 
  ConfigProvider, theme, Skeleton, Space, Tag 
} from 'antd';
import { 
  Users, BedDouble, Calendar, MessageSquare, 
  RefreshCw, UserPlus, Home, CheckSquare, 
  Activity, AlertCircle, Clock, ChevronRight,HelpCircle
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  Title as ChartTitle, Tooltip as ChartTooltip, Legend, ArcElement, 
  PointElement, LineElement, Filler
} from 'chart.js';
import { wardenAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ChartTitle, 
  ChartTooltip, Legend, ArcElement, PointElement, LineElement, Filler
);

const { Title, Text } = Typography;

const WardenDashboard = ({ setCurrentView }) => {
  const { user } = useAuth(); // Access user data for the greeting
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Stats Error:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchDashboardStats(); }, [fetchDashboardStats]);

  if (loading || !stats) return <div className="p-10"><Skeleton active paragraph={{ rows: 15 }} /></div>;

  const handleAction = (view) => setCurrentView ? setCurrentView(view) : null;

  // Optimized Chart Options for larger display
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20, font: { size: 12, weight: '600' }, usePointStyle: true } },
      tooltip: { padding: 12, backgroundColor: '#1e293b' }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <ConfigProvider theme={{ 
      token: { colorPrimary: '#2563eb', borderRadius: 24, fontFamily: 'Inter, sans-serif' } 
    }}>
      <div className="p-6 lg:p-10 bg-[#f8fafc] min-h-screen">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Text className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">System Live</Text>
            </div>
            <Title level={1} style={{ margin: 0, fontWeight: 800, fontSize: '2.25rem' }}>
              Welcome back, <span className="text-blue-600">{user?.username || 'Warden'}</span>
            </Title>
            <Text className="text-slate-500 text-lg">Academic Year 2024-25 • Management Overview</Text>
          </div>
          <Button 
            size="large" 
            icon={<RefreshCw size={18} />} 
            onClick={fetchDashboardStats} 
            className="flex items-center gap-2 h-12 px-6 shadow-sm border-slate-200 font-semibold rounded-xl hover:text-blue-600"
          >
            Sync Data
          </Button>
        </div>

        {/* --- 1. PRIMARY METRICS GRID --- */}
        <Row gutter={[24, 24]} className="mb-10">
          {[
            { label: 'Total Enrolment', val: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Active Students' },
            { label: 'Occupied Beds', val: stats.occupiedBeds, icon: BedDouble, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: `${stats.availableBeds} remaining` },
            { label: 'Pending Leaves', val: stats.pendingLeaves, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Requires Review' },
            { label: 'Open Complaints', val: stats.pendingComplaints, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', sub: 'Awaiting Action' },
          ].map((card, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl ${card.bg} ${card.color}`}>
                    <card.icon size={28} />
                  </div>
                  <div className="text-right">
                    <Text className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">{card.label}</Text>
                    <Title level={2} style={{ margin: 0, fontWeight: 800 }}>{card.val}</Title>
                    <Text className="text-[12px] font-medium text-slate-500">{card.sub}</Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[32, 32]}>
          {/* --- LEFT COLUMN: Actions & Major Trends --- */}
          <Col lg={16} xs={24} className="space-y-8">
            
            {/* QUICK ACTIONS TOOLBELT */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <Title level={4} style={{ margin: 0 }} className="flex items-center gap-2">
                  <Activity size={22} className="text-blue-600" /> Management Toolkit
                </Title>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Student Enrolment', icon: UserPlus, color: 'bg-blue-600', view: 'enroll-student' },
                  { label: 'Room Allotment', icon: Home, color: 'bg-emerald-600', view: 'room-allotment' },
                  { label: 'Attendance Log', icon: CheckSquare, color: 'bg-purple-600', view: 'attendance' },
                  { label: 'Leave Gateway', icon: Calendar, color: 'bg-orange-600', view: 'leave-requests' },
                ].map((act, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleAction(act.view)} 
                    className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                  >
                    <div className={`${act.color} text-white p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-100`}>
                      <act.icon size={26} />
                    </div>
                    <Text strong className="text-slate-700 text-xs">{act.label}</Text>
                  </button>
                ))}
              </div>
            </div>

            {/* ATTENDANCE TREND LINE CHART */}
            <Card className="border-none shadow-sm rounded-[2.5rem]" title={<span className="font-bold text-lg">Institutional Attendance Pulse (%)</span>}>
              <div className="h-80 px-2">
                <Line 
                  options={chartOptions}
                  data={{
                    labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                      label: 'Presence Rate',
                      data: [95, 92, 98, 91, 94],
                      borderColor: '#2563eb',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 6,
                      pointBackgroundColor: '#fff',
                      pointBorderWidth: 3
                    }]
                  }}
                />
              </div>
            </Card>

            {/* TWO-COLUMN STATUS BARS */}
            <Row gutter={24}>
              <Col span={12}>
                <Card className="border-none shadow-sm rounded-[2rem]" title={<span className="font-bold">Incident Resolutions</span>}>
                  <div className="h-64">
                    <Bar 
                      options={chartOptions}
                      data={{
                        labels: ['New', 'Actioned', 'Solved', 'Closed'],
                        datasets: [{
                          data: [stats.complaintStatus.submitted, stats.complaintStatus.in_progress, stats.complaintStatus.resolved, stats.complaintStatus.closed],
                          backgroundColor: ['#60a5fa', '#fbbf24', '#22c55e', '#94a3b8'],
                          borderRadius: 12
                        }]
                      }}
                    />
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card className="border-none shadow-sm rounded-[2rem]" title={<span className="font-bold">Leave Lifecycle</span>}>
                  <div className="h-64">
                    <Bar 
                      options={chartOptions}
                      data={{
                        labels: ['Pending', 'Approved', 'Rejected'],
                        datasets: [{
                          data: [stats.leaveStatus.pending, stats.leaveStatus.approved, stats.leaveStatus.rejected],
                          backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                          borderRadius: 12
                        }]
                      }}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* --- RIGHT COLUMN: Distribution & Real-time Stats --- */}
          <Col lg={8} xs={24} className="space-y-8">
            
            {/* BED INVENTORY DOUGHNUT */}
            <Card className="border-none shadow-sm rounded-[2.5rem] text-center" title={<span className="font-bold">Bed Inventory Distribution</span>}>
              <div className="h-64 relative">
                <Doughnut 
                  options={{ ...chartOptions, cutout: '78%' }}
                  data={{
                    labels: ['Occupied', 'Available'],
                    datasets: [{
                      data: [stats.occupiedBeds, stats.availableBeds],
                      backgroundColor: ['#2563eb', '#f1f5f9'],
                      borderWidth: 0,
                    }]
                  }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Title level={2} style={{ margin: 0, fontWeight: 800 }}>
                        {Math.round((stats.occupiedBeds / (stats.occupiedBeds + stats.availableBeds)) * 100)}%
                    </Title>
                    <Text type="secondary" className="font-bold text-[10px] uppercase tracking-tighter">Utilization</Text>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-around">
                <div>
                    <Text className="block text-blue-600 font-bold text-lg">{stats.occupiedBeds}</Text>
                    <Text className="text-slate-400 text-xs font-medium uppercase">Filled</Text>
                </div>
                <div>
                    <Text className="block text-slate-600 font-bold text-lg">{stats.availableBeds}</Text>
                    <Text className="text-slate-400 text-xs font-medium uppercase">Empty</Text>
                </div>
              </div>
            </Card>

            {/* DAILY ATTENDANCE PULSE */}
            <Card className="border-none shadow-sm rounded-[2.5rem]" title={<span className="font-bold">Today's Attendance</span>}>
              <div className="h-60 px-4">
                <Doughnut 
                  options={chartOptions}
                  data={{
                    labels: ['Present', 'Absent', 'On-Duty'],
                    datasets: [{
                      data: [stats.attendanceStatus.P, stats.attendanceStatus.A, stats.attendanceStatus.OD],
                      backgroundColor: ['#10b981', '#f43f5e', '#facc15'],
                      borderWidth: 0
                    }]
                  }}
                />
              </div>
              <div className="mt-8 space-y-3">
                 <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors cursor-default">
                    <Space>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <Text strong className="text-slate-600">Present Students</Text>
                    </Space>
                    <Tag color="green" className="border-none font-bold rounded-lg px-3">{stats.attendanceStatus.P}</Tag>
                 </div>
                 <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors cursor-default">
                    <Space>
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <Text strong className="text-slate-600">Unaccounted For</Text>
                    </Space>
                    <Tag color="red" className="border-none font-bold rounded-lg px-3">{stats.attendanceStatus.A}</Tag>
                 </div>
              </div>
            </Card>

            {/* ANNOUNCEMENT / HELP CARD */}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
               <div className="relative z-10">
                 <Title level={4} style={{ color: 'white', margin: 0 }}>Need Assistance?</Title>
                 <Text className="text-indigo-100 block mt-2 mb-6">Access the administrative guide or contact IT support for portal help.</Text>
                 <Button ghost className="rounded-xl border-indigo-300 text-white font-bold h-11 px-6 group-hover:bg-white group-hover:text-indigo-600 transition-all">
                    Open Docs <ChevronRight size={16} className="inline ml-1" />
                 </Button>
               </div>
               <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                  <HelpCircle size={120} color="white" />
               </div>
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default WardenDashboard;