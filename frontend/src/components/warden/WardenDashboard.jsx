import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, 
  ConfigProvider, Skeleton, Space, Tag,
} from 'antd';
import { 
  Users, BedDouble, Calendar, MessageSquare, 
  RefreshCw, UserPlus, Home, CheckSquare, 
  Activity, AlertCircle, Clock, ChevronRight, HelpCircle
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

// Move static options outside to prevent re-renders
const SHARED_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      position: 'bottom', 
      labels: { padding: 20, font: { size: 12, weight: '600' }, usePointStyle: true } 
    },
    tooltip: { padding: 12, backgroundColor: '#1e293b' }
  },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } }
  }
};

const WardenDashboard = ({ setCurrentView }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Dashboard Stats Error:', error);
    } finally {
      // Small delay for smooth transition from skeleton
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { 
    fetchDashboardStats(); 
  }, [fetchDashboardStats]);

  // Handle navigation
  const handleAction = (view) => setCurrentView?.(view);

  if (loading || !stats) {
    return <div className="p-10"><Skeleton active paragraph={{ rows: 15 }} /></div>;
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 24, fontFamily: 'Inter, sans-serif' } }}>
      <div className="p-4 md:p-10 bg-[#f8fafc] min-h-screen">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <Title level={2} style={{ margin: 0 }}>Hostel Overview</Title>
            <Text type="secondary">Welcome back, Warden • Academic Year 2024-25</Text>
          </div>

          <Button 
            icon={<RefreshCw size={16} className={loading ? "animate-spin" : ""}/>} 
            onClick={fetchDashboardStats} 
            className="rounded-xl h-11 px-6 font-bold flex items-center gap-2"
          >
            Refresh Records
          </Button>
        </div>

        {/* PRIMARY METRICS */}
        <Row gutter={[24, 24]} className="mb-10">
          {[
            { label: 'Total Students', val: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Occupied Beds', val: stats.occupiedBeds, icon: BedDouble, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Pending Leaves', val: stats.pendingLeaves, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'New Complaints', val: stats.pendingComplaints, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((card, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card className="border-none shadow-sm rounded-[32px] hover:shadow-md transition-shadow">
                <Statistic 
                  title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{card.label}</span>} 
                  value={card.val} 
                  prefix={
                    <div className={`p-2 rounded-xl ${card.bg} ${card.color} mr-3`}>
                      <card.icon size={20} />
                    </div>
                  }
                  valueStyle={{ fontWeight: 900 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[24, 24]}>
          {/* MAIN CONTENT COLUMN */}
          <Col lg={16} xs={24} className="space-y-6">

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Admission', icon: UserPlus, bg: 'bg-blue-50', color: 'text-blue-600', view: 'enroll-student' },
                { label: 'Rooms', icon: Home, bg: 'bg-emerald-50', color: 'text-emerald-600', view: 'warden-room-mgmt' },
                { label: 'Attendance', icon: CheckSquare, bg: 'bg-purple-50', color: 'text-purple-600', view: 'attendance' },
                { label: 'Leaves', icon: Calendar, bg: 'bg-orange-50', color: 'text-orange-600', view: 'leave-requests' },
              ].map((act, i) => (
                <button key={i}
                  onClick={() => handleAction(act.view)}
                  className="bg-white p-6 rounded-[32px] shadow-sm flex flex-col items-center gap-3 hover:scale-105 transition-transform border-none cursor-pointer"
                >
                  <div className={`p-4 rounded-2xl ${act.bg} ${act.color}`}>
                    <act.icon size={24} />
                  </div>
                  <Text strong className="text-slate-600 text-[11px] uppercase">{act.label}</Text>
                </button>
              ))}
            </div>

            {/* ATTENDANCE TREND */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Hostel Attendance Trend</Text>}>
              <div className="h-72">
                <Line 
                  options={SHARED_CHART_OPTIONS}
                  data={{
                    labels: ['Aug','Sep','Oct','Nov','Dec'],
                    datasets: [{
                      label:'Presence Rate %',
                      data:[95,92,98,91,94],
                      borderColor:'#2563eb',
                      backgroundColor:'rgba(37,99,235,0.08)',
                      fill:true,
                      tension:0.4,
                    }]
                  }}
                />
              </div>
            </Card>

            {/* STATUS GRIDS */}
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card className="border-none shadow-sm rounded-[32px] h-full" title={<Text strong>Complaint Progress</Text>}>
                  <div className="h-64">
                    <Bar 
                      options={SHARED_CHART_OPTIONS}
                      data={{
                        labels:['New','Actioned','Solved','Closed'],
                        datasets:[{
                          data:[
                            stats.complaintStatus?.submitted || 0,
                            stats.complaintStatus?.in_progress || 0,
                            stats.complaintStatus?.resolved || 0,
                            stats.complaintStatus?.closed || 0
                          ],
                          backgroundColor:['#60a5fa','#facc15','#22c55e','#94a3b8'],
                          borderRadius:8
                        }]
                      }}
                    />
                  </div>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card className="border-none shadow-sm rounded-[32px] h-full" title={<Text strong>Leave Requests Status</Text>}>
                  <div className="h-64">
                    <Bar 
                      options={SHARED_CHART_OPTIONS}
                      data={{
                        labels:['Pending','Approved','Rejected'],
                        datasets:[{
                          data:[
                            stats.leaveStatus?.pending || 0,
                            stats.leaveStatus?.approved || 0,
                            stats.leaveStatus?.rejected || 0
                          ],
                          backgroundColor:['#f59e0b','#10b981','#ef4444'],
                          borderRadius:12
                        }]
                      }}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* SIDEBAR COLUMN */}
          <Col lg={8} xs={24} className="space-y-6">

            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Bed Availability</Text>}>
              <div className="h-60">
                <Doughnut
                  options={{ ...SHARED_CHART_OPTIONS, cutout:'75%' }}
                  data={{
                    labels:['Occupied','Available'],
                    datasets:[{
                      data:[stats.occupiedBeds, stats.availableBeds],
                      backgroundColor:['#2563eb','#f1f5f9'],
                      borderWidth:0
                    }]
                  }}
                />
              </div>
            </Card>

            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Today's Attendance</Text>}>
              <div className="h-60">
                <Doughnut
                  options={{ ...SHARED_CHART_OPTIONS, cutout:'75%' }}
                  data={{
                    labels:['Present','Absent','On-Duty'],
                    datasets:[{
                      data:[
                        stats.attendanceStatus?.P || 0,
                        stats.attendanceStatus?.A || 0,
                        stats.attendanceStatus?.OD || 0
                      ],
                      backgroundColor:['#10b981','#f43f5e','#facc15'],
                      borderWidth:0
                    }]
                  }}
                />
              </div>
            </Card>

            {/* HELP CARD */}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group transition-all hover:bg-indigo-700">
              <div className="relative z-10">
                <Title level={4} style={{ color:'white', margin:0 }}>Need Assistance?</Title>
                <Text className="text-indigo-100 block mt-2 mb-6">
                  Access the administrative guide or contact IT support.
                </Text>
                <Button ghost className="rounded-xl border-indigo-300 text-white font-bold h-11 px-6 hover:bg-white hover:text-indigo-600">
                  Open Docs <ChevronRight size={16} className="inline ml-1"/>
                </Button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <HelpCircle size={120} color="white"/>
              </div>
            </div>

          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default WardenDashboard;