import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Divider, ConfigProvider, theme, Skeleton, Badge, Progress, Tooltip, Tag 
} from 'antd';
import { 
  Users, Bed, BedDouble, CheckCircle2, TrendingUp, AlertTriangle, 
  Calendar, BarChart3, ArrowUpRight, FileText, Clock, 
  CheckSquare, LayoutDashboard, RefreshCw, UserPlus, Home, MessageSquare
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Institutional Stats Error:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchDashboardStats(); }, [fetchDashboardStats]);

  if (loading || !stats) return <div className="p-8"><Skeleton active paragraph={{ rows: 20 }} /></div>;

  const handleAction = (view) => setCurrentView ? setCurrentView(view) : null;

  // --- CHART CONFIGURATIONS ---
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <Title level={2} style={{ margin: 0 }}>Warden Dashboard</Title>
            <Text type="secondary">Hostel Administration & Oversight • Academic Year 2024-25</Text>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchDashboardStats} className="rounded-xl h-11 px-6 font-bold">Sync Data</Button>
        </div>

        {/* 1. Primary Metrics Grid */}
        <Row gutter={[24, 24]}>
          {[
            { label: 'Total Enrolment', val: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Occupied Beds', val: stats.occupiedBeds, icon: BedDouble, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Pending Leaves', val: stats.pendingLeaves, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Open Complaints', val: stats.pendingComplaints, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((card, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card className="border-none shadow-sm rounded-[32px]">
                <Statistic 
                  title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{card.label}</span>} 
                  value={card.val} 
                  prefix={<div className={`p-2 rounded-xl ${card.bg} ${card.color} mr-3`}><card.icon size={20} /></div>}
                  valueStyle={{ fontWeight: 900 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[24, 24]}>
          {/* 2. Quick Actions & Trends */}
          <Col lg={16} xs={24} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Enrolment', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50', view: 'enroll-student' },
                { label: 'Allotment', icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50', view: 'room-allotment' },
                { label: 'Attendance', icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50', view: 'attendance' },
                { label: 'Leave Auth', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', view: 'leave-requests' },
              ].map((act, i) => (
                <button key={i} onClick={() => handleAction(act.view)} className="bg-white p-6 rounded-[32px] shadow-sm flex flex-col items-center gap-3 hover:scale-105 transition-transform border-none">
                   <div className={`p-4 rounded-2xl ${act.bg} ${act.color}`}><act.icon size={24} /></div>
                   <Text strong className="text-slate-600 text-[11px] uppercase">{act.label}</Text>
                </button>
              ))}
            </div>

            {/* Attendance Trend Line Chart */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Institutional Attendance Trend (%)</Text>}>
              <div className="h-72">
                <Line 
                  options={commonOptions}
                  data={{
                    labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                      label: 'Present %',
                      data: [95, 92, 98, 91, 94],
                      borderColor: '#2563eb',
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                />
              </div>
            </Card>

            <Row gutter={24}>
              {/* Complaint Status Bar Chart */}
              <Col span={12}>
                <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Complaint Resolution Status</Text>}>
                  <div className="h-64">
                    <Bar 
                      options={commonOptions}
                      data={{
                        labels: ['Submitted', 'Actioned', 'Resolved', 'Closed'],
                        datasets: [{
                          data: [stats.complaintStatus.submitted, stats.complaintStatus.in_progress, stats.complaintStatus.resolved, stats.complaintStatus.closed],
                          backgroundColor: ['#60a5fa', '#facc15', '#22c55e', '#94a3b8'],
                          borderRadius: 8
                        }]
                      }}
                    />
                  </div>
                </Card>
              </Col>
              {/* Leave Requests Bar Chart */}
              <Col span={12}>
                <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Leave Approval Lifecycle</Text>}>
                  <div className="h-64">
                    <Bar 
                      options={commonOptions}
                      data={{
                        labels: ['Pending', 'Approved', 'Rejected'],
                        datasets: [{
                          data: [stats.leaveStatus.pending, stats.leaveStatus.approved, stats.leaveStatus.rejected],
                          backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                          borderRadius: 8
                        }]
                      }}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* 3. Distribution & Pulse */}
          <Col lg={8} xs={24} className="space-y-6">
            {/* Bed Occupancy Doughnut */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Bed Inventory Distribution</Text>}>
              <div className="h-60">
                <Doughnut 
                  options={commonOptions}
                  data={{
                    labels: ['Occupied', 'Available'],
                    datasets: [{
                      data: [stats.occupiedBeds, stats.availableBeds],
                      backgroundColor: ['#2563eb', '#f1f5f9'],
                      borderWidth: 0
                    }]
                  }}
                />
              </div>
              <div className="text-center mt-4">
                <Text type="secondary" className="text-[11px] uppercase font-bold tracking-widest">Efficiency: {Math.round((stats.occupiedBeds / stats.totalCapacity) * 100)}%</Text>
              </div>
            </Card>

            {/* Today's Attendance Doughnut */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Today's Attendance Pulse</Text>}>
              <div className="h-60">
                <Doughnut 
                  options={commonOptions}
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
            </Card>

            {/* Complaint Trend Bar Chart */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Monthly Incident Volume</Text>}>
              <div className="h-48">
                <Bar 
                  options={commonOptions}
                  data={{
                    labels: ['Oct', 'Nov', 'Dec'],
                    datasets: [{
                      label: 'Total Incidents',
                      data: [12, 8, 15],
                      backgroundColor: '#f97316',
                      borderRadius: 4
                    }]
                  }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default WardenDashboard;