import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Input, 
  Divider, ConfigProvider, theme, Skeleton, Badge, Space, 
  Switch, message, Tooltip 
} from 'antd';
import { 
  Building, Users, UserCheck, Bed, Receipt, Bell, 
  Save, LayoutDashboard, TrendingUp, Tag, 
  ArrowUpRight, IndianRupee, Wrench, Package, RefreshCw
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title as ChartTitle } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import { adminAPI } from '../../services/api';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle);

const { Title, Text, Paragraph } = Typography;

// --- Vivid High-Contrast Google Palette ---
const GOOGLE_VIVID = {
  BLUE: '#1A73E8',    // Deeper, more visible blue
  RED: '#D93025',     // Bold crimson
  YELLOW: '#F9AB00',  // Deep amber
  GREEN: '#1E8E3E',   // Rich emerald
  LIGHT_GREY: '#F1F3F4',
  BORDER: '#FFFFFF'
};

const DashboardSkeleton = () => (
  <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
    <div className="flex justify-between items-center">
      <Skeleton active title={{ width: 300 }} paragraph={{ rows: 1 }} />
      <Skeleton.Button active style={{ width: 120, height: 45 }} />
    </div>
    <Skeleton.Button active block style={{ height: 120, borderRadius: 24 }} />
    <Row gutter={[24, 24]}>
      {[...Array(4)].map((_, i) => (
        <Col span={6} key={i}><Skeleton.Button active block style={{ height: 110, borderRadius: 24 }} /></Col>
      ))}
    </Row>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [feeSettings, setFeeSettings] = useState({ amount: 0, isActive: false, hostelId: 1 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, chartRes, hostelRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getAdminChartData(),
        adminAPI.getHostelById(1)
      ]);
      
      setStats(statsRes.data.data);
      setChartData(chartRes.data.data);
      if (hostelRes.data.success) {
        setFeeSettings({
          amount: hostelRes.data.data.annual_fee_amount || 0,
          isActive: hostelRes.data.data.show_fee_reminder || false,
          hostelId: 1
        });
      }
    } catch (err) {
      message.error('System sync failed. Check connection.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // --- REFINED PIE CHART FOR HOSTEL OCCUPANCY ---
  const hostelOccupancyData = useMemo(() => ({
    labels: ['Occupied Beds', 'Empty Beds'],
    datasets: [{
      data: [stats?.occupiedRooms || 0, stats?.availableRooms || 0],
      backgroundColor: [GOOGLE_VIVID.BLUE, GOOGLE_VIVID.YELLOW],
      borderColor: GOOGLE_VIVID.BORDER,
      borderWidth: 3,
      hoverOffset: 15,
    }],
  }), [stats]);

  // --- REFINED DOUGHNUT FOR ROLES ---
  const userRolesData = useMemo(() => ({
    labels: chartData?.userRoles?.labels || [],
    datasets: [{
      data: chartData?.userRoles?.counts || [],
      backgroundColor: [GOOGLE_VIVID.BLUE, GOOGLE_VIVID.GREEN, GOOGLE_VIVID.RED, GOOGLE_VIVID.YELLOW],
      borderColor: GOOGLE_VIVID.BORDER,
      borderWidth: 2,
    }],
  }), [chartData]);

  // --- REFINED BAR CHART FOR FINANCIALS ---
  const monthlyFinancialsData = useMemo(() => ({
    labels: chartData?.monthlyFinancials?.labels || [],
    datasets: [
      {
        label: 'Revenue (Fees)',
        data: chartData?.monthlyFinancials?.income || [],
        backgroundColor: GOOGLE_VIVID.BLUE,
        borderRadius: 5,
      },
      {
        label: 'Expenses (Maintenance)',
        data: chartData?.monthlyFinancials?.expenses || [],
        backgroundColor: GOOGLE_VIVID.RED,
        borderRadius: 5,
      },
    ],
  }), [chartData]);

  const handleUpdateFeeSettings = async () => {
    setUpdating(true);
    try {
      await adminAPI.updateHostel(feeSettings.hostelId, {
        annual_fee_amount: feeSettings.amount,
        show_fee_reminder: feeSettings.isActive
      });
      message.success('Hostel fee protocols updated successfully.');
    } catch (err) {
      message.error('Action failed: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !stats) return <DashboardSkeleton />;

  const statCards = [
    { title: 'Active Hostels', value: stats.totalHostels, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Campus Wardens', value: stats.totalWardens, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Registered Students', value: stats.totalStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Total Bed Capacity', value: stats.totalRooms, icon: Bed, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: GOOGLE_VIVID.BLUE, borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shadow-lg shadow-blue-100" style={{ backgroundColor: GOOGLE_VIVID.BLUE }}>
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Hostel Administration</Title>
              <Text type="secondary">Centralized Management System Overview</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchDashboardData} className="rounded-xl h-11 px-6 font-bold flex items-center gap-2 border-slate-200">
            Refresh Data
          </Button>
        </div>

        {/* Annual Fee Panel */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white p-2">
          <div className="bg-slate-900 rounded-[28px] p-8 text-white flex flex-col xl:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-6">
              <div className="p-5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <Receipt className="text-blue-400" size={32} />
              </div>
              <div>
                <Title level={3} style={{ color: 'white', margin: 0 }}>Student Fee Protocol</Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Manage annual billing cycles and automated reminders.</Paragraph>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-4 bg-white/5 p-2 rounded-3xl border border-white/10 backdrop-blur-sm">
               <div className="flex items-center gap-3 px-4">
                  <IndianRupee size={18} className="text-blue-400" />
                  <Input 
                    type="number" 
                    variant="borderless"
                    className="w-28 text-lg font-bold text-white placeholder:text-slate-500"
                    value={feeSettings.amount}
                    onChange={e => setFeeSettings({...feeSettings, amount: e.target.value})}
                  />
               </div>
               <Divider type="vertical" className="h-10 border-white/20" />
               <div className="flex items-center gap-3 px-4">
                  <Text style={{ color: 'white' }} className="text-xs font-bold uppercase tracking-widest">Portal Reminder</Text>
                  <Switch checked={feeSettings.isActive} onChange={val => setFeeSettings({...feeSettings, isActive: val})} />
               </div>
               <Button 
                type="primary" 
                size="large" 
                loading={updating}
                onClick={handleUpdateFeeSettings}
                style={{ backgroundColor: GOOGLE_VIVID.BLUE }}
                className="h-14 px-8 rounded-2xl font-bold border-none"
                icon={<Save size={18}/>}
               >
                 Update Settings
               </Button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          </div>
        </Card>

        {/* Stat Cards Grid */}
        <Row gutter={[24, 24]}>
          {statCards.map((card, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card className="border-none shadow-sm rounded-[32px] hover:shadow-md transition-all group overflow-hidden bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                    <card.icon size={22} />
                  </div>
                  <Tag color="success" bordered={false} className="rounded-full font-bold m-0 flex items-center gap-1">
                    <TrendingUp size={12} /> Active
                  </Tag>
                </div>
                <Statistic 
                  title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{card.title}</span>} 
                  value={card.value} 
                  valueStyle={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b' }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Charts Layout */}
        <Row gutter={[24, 24]}>
          <Col lg={12} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] p-4 h-full bg-white" title={<div className="flex items-center gap-2 font-bold text-slate-800">Hostel Bed Occupancy</div>}>
              <div className="h-80 flex items-center justify-center">
                <Pie 
                  data={hostelOccupancyData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 20, font: { weight: 'bold' } } 
                      } 
                    } 
                  }} 
                />
              </div>
            </Card>
          </Col>
          <Col lg={12} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] p-4 h-full bg-white" title={<div className="font-bold text-slate-800">Campus User Distribution</div>}>
              <div className="h-80 flex items-center justify-center">
                <Doughnut 
                  data={userRolesData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 20, font: { weight: 'bold' } } 
                      } 
                    } 
                  }} 
                />
              </div>
            </Card>
            </Col>
          </Row>

        {/* Full Width Chart */}
        <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white" title={<div className="flex items-center justify-between font-bold text-slate-800">
          Monthly Financial Analysis (Revenue vs Maintenance)
          <Tooltip title="Year-to-date financial tracking">
            <ArrowUpRight size={16} className="text-slate-400" />
          </Tooltip>
        </div>}>
          <div className="h-96">
            <Bar 
              data={monthlyFinancialsData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                    x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }, 
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { weight: 'bold' } } } 
                },
                plugins: {
                    legend: { position: 'top', align: 'end', labels: { font: { weight: 'bold' } } }
                }
              }} 
            />
          </div>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default AdminDashboard;