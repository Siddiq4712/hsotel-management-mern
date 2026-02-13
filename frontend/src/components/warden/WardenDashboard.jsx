import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Row, Col, Statistic, Button,
  ConfigProvider, Skeleton
} from 'antd';

import {
  Users, BedDouble, Calendar, MessageSquare,
  RefreshCw, UserPlus, Home, CheckSquare,
  Clock, ChevronRight, HelpCircle
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
      console.error('Dashboard Stats Error:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading || !stats)
    return (
      <div className="p-10">
        <Skeleton active paragraph={{ rows: 15 }} />
      </div>
    );

  const handleAction = (view) => {
    if (setCurrentView) setCurrentView(view);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: { size: 12, weight: '600' },
          usePointStyle: true
        }
      },
      tooltip: {
        padding: 12,
        backgroundColor: '#1e293b'
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 24,
          fontFamily: 'Inter, sans-serif'
        }
      }}
    >
      <div className="p-6 lg:p-10 bg-[#f8fafc] min-h-screen">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Welcome {user?.name || 'Warden'}
            </Title>
            <Text type="secondary">
              Hostel Records & Management • Academic Year 2024-25
            </Text>
          </div>

          <Button
            icon={<RefreshCw size={16} />}
            onClick={fetchDashboardStats}
            className="rounded-xl h-11 px-6 font-bold"
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
              <Card className="border-none shadow-sm rounded-[32px]">
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

        {/* MAIN GRID */}
        <Row gutter={[24, 24]}>

          {/* LEFT */}
          <Col lg={16} xs={24}>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Admission', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50', view: 'enroll-student' },
                { label: 'Room Allotment', icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50', view: 'room-allotment' },
                { label: 'Attendance', icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50', view: 'attendance' },
                { label: 'Leave Approval', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', view: 'leave-requests' },
              ].map((act, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(act.view)}
                  className="bg-white p-6 rounded-[32px] shadow-sm flex flex-col items-center gap-3 hover:scale-105 transition-transform border-none"
                >
                  <div className={`p-4 rounded-2xl ${act.bg} ${act.color}`}>
                    <act.icon size={24} />
                  </div>
                  <Text strong className="text-slate-600 text-[11px] uppercase">
                    {act.label}
                  </Text>
                </button>
              ))}
            </div>

            {/* LINE CHART */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Hostel Attendance Trend</Text>}>
              <div className="h-72">
                <Line
                  options={chartOptions}
                  data={{
                    labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                      label: 'Presence Rate',
                      data: [95, 92, 98, 91, 94],
                      borderColor: '#2563eb',
                      backgroundColor: 'rgba(37,99,235,0.08)',
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                />
              </div>
            </Card>

          </Col>

          {/* RIGHT */}
          <Col lg={8} xs={24}>

            {/* MONTHLY COMPLAINT BAR */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Text strong>Monthly Complaints Total</Text>}>
              <div className="h-48">
                <Bar
                  options={chartOptions}
                  data={{
                    labels: ['Oct', 'Nov', 'Dec'],
                    datasets: [{
                      label: 'Total Complaints',
                      data: [12, 8, 15],
                      backgroundColor: '#f97316'
                    }]
                  }}
                />
              </div>
            </Card>

            {/* HELP CARD */}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative mt-6">
              <Title level={4} style={{ color: 'white', margin: 0 }}>
                Need Assistance?
              </Title>

              <Text className="text-indigo-100 block mt-2 mb-6">
                Access the administrative guide or contact IT support.
              </Text>

              <Button ghost className="rounded-xl border-indigo-300 text-white font-bold">
                Open Docs <ChevronRight size={16} className="inline ml-1" />
              </Button>

              <div className="absolute -right-4 -bottom-4 opacity-10">
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
