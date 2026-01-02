import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Input, 
  Divider, ConfigProvider, theme, Skeleton, Space, 
  Switch, message, Tooltip, Badge 
} from 'antd';
import { 
  Building, Users, UserCheck, Bed, Receipt, 
  Save, LayoutDashboard, TrendingUp, Tag, 
  ArrowUpRight, IndianRupee, RefreshCw, Activity, ShieldCheck
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title as ChartTitle, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import { adminAPI } from '../../services/api';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle, PointElement, LineElement);

const { Title, Text, Paragraph } = Typography;

const GOOGLE_VIVID = {
  BLUE: '#1A73E8', 
  RED: '#D93025', 
  YELLOW: '#F9AB00', 
  GREEN: '#1E8E3E', 
  BORDER: '#FFFFFF'
};

const DashboardSkeleton = () => (
  <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
    <div className="flex justify-between items-center">
      <Skeleton active title={{ width: 250 }} paragraph={{ rows: 1 }} />
      <Skeleton.Button active style={{ width: 120, height: 40, borderRadius: 12 }} />
    </div>
    <Card className="border-none shadow-sm rounded-[32px] p-8 h-32">
       <Skeleton active avatar paragraph={{ rows: 1 }} />
    </Card>
    <Row gutter={[24, 24]}>
      {[...Array(4)].map((_, i) => (
        <Col span={6} key={i}><Skeleton.Button active block style={{ height: 110, borderRadius: 24 }} /></Col>
      ))}
    </Row>
    <Row gutter={[24, 24]}>
      <Col span={12}><Skeleton.Button active block style={{ height: 350, borderRadius: 32 }} /></Col>
      <Col span={12}><Skeleton.Button active block style={{ height: 350, borderRadius: 32 }} /></Col>
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
      message.error('System sync failed.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // --- CHART LOGIC (Kept exactly the same) ---
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

  const userRolesData = useMemo(() => ({
    labels: chartData?.userRoles?.labels || [],
    datasets: [{
      data: chartData?.userRoles?.counts || [],
      backgroundColor: [GOOGLE_VIVID.BLUE, GOOGLE_VIVID.GREEN, GOOGLE_VIVID.RED, GOOGLE_VIVID.YELLOW],
      borderColor: GOOGLE_VIVID.BORDER,
      borderWidth: 2,
    }],
  }), [chartData]);

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
      message.success('Fee protocols updated.');
    } catch (err) {
      message.error('Action failed.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !stats) return <DashboardSkeleton />;

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: GOOGLE_VIVID.BLUE, borderRadius: 20 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
              <LayoutDashboard className="text-blue-500" size={26} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Hostel Administration</Title>
              <Text type="secondary" className="font-medium">Live System Management Overview</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchDashboardData} className="rounded-xl h-11 px-6 font-bold flex items-center gap-2 bg-white border-slate-200">
            Refresh Data
          </Button>
        </div>

        {/* --- REFINED LIGHT & POSITIVE FEE PANEL --- */}
        <Card className="border-none shadow-sm rounded-[36px] overflow-hidden bg-white p-1">
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white rounded-[32px] p-8 flex flex-col xl:flex-row items-center justify-between gap-8 relative border border-blue-50/50">
            
            <div className="relative z-10 flex items-center gap-6">
              <div className="p-5 bg-blue-600 rounded-[24px] shadow-lg shadow-blue-200">
                <Receipt className="text-white" size={32} />
              </div>
              <div className="max-w-md">
                <div className="flex items-center gap-2 mb-1">
                   <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Fee Protocol</Title>
                   <Tag color="blue" bordered={false} className="rounded-full px-3 font-bold">Active</Tag>
                </div>
                <Paragraph className="text-slate-500 m-0 font-medium leading-relaxed">
                  Manage student billing cycles, annual fee amounts, and automated reminder broadcasts.
                </Paragraph>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-5 bg-white p-3 rounded-[28px] shadow-xl shadow-blue-900/5 border border-white">
               <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <IndianRupee size={18} className="text-blue-600" />
                  <Input 
                    type="number" 
                    variant="borderless"
                    className="w-32 text-lg font-black text-slate-800"
                    value={feeSettings.amount}
                    onChange={e => setFeeSettings({...feeSettings, amount: e.target.value})}
                  />
               </div>

               <Divider type="vertical" className="h-10 border-slate-200" />

               <div className="flex items-center gap-4 px-2">
                  <div className="flex flex-col">
                    <Text className="text-[10px] uppercase font-black text-slate-400 leading-none">Automated</Text>
                    <Text className="text-xs font-bold text-slate-700">Reminders</Text>
                  </div>
                  <Switch checked={feeSettings.isActive} onChange={val => setFeeSettings({...feeSettings, isActive: val})} />
               </div>

               <Button 
                type="primary" 
                size="large" 
                loading={updating}
                onClick={handleUpdateFeeSettings}
                className="h-14 px-8 rounded-2xl font-bold shadow-lg shadow-blue-100 border-none flex items-center gap-2"
                icon={<Save size={18}/>}
               >
                 Update Settings
               </Button>
            </div>

            {/* Subtle decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
          </div>
        </Card>

        {/* Statistics Grid */}
        <Row gutter={[24, 24]}>
          {[
            { title: 'Active Hostels', value: stats.totalHostels, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
            { title: 'Campus Wardens', value: stats.totalWardens, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: 'Students', value: stats.totalStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { title: 'Bed Capacity', value: stats.totalRooms, icon: Bed, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((card, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card className="border-none shadow-sm rounded-[32px] hover:shadow-md transition-all group bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                    <card.icon size={22} />
                  </div>
                  <Tag color="success" bordered={false} className="rounded-full font-bold m-0 flex items-center gap-1">
                    <TrendingUp size={12} /> Live
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

        {/* Charts Section (Kept Vivid Colors) */}
        
        <Row gutter={[24, 24]}>
          <Col lg={12} xs={24}>
            <Card className="border-none shadow-sm rounded-[36px] p-6 h-full bg-white" title={<div className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Bed Occupancy</div>}>
              <div className="h-80 flex items-center justify-center">
                <Pie 
                  data={hostelOccupancyData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { 
                      legend: { position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold' } } } 
                    } 
                  }} 
                />
              </div>
            </Card>
          </Col>
          <Col lg={12} xs={24}>
            <Card className="border-none shadow-sm rounded-[36px] p-6 h-full bg-white" title={<div className="font-bold text-slate-800">User Distribution</div>}>
              <div className="h-80 flex items-center justify-center">
                <Doughnut 
                  data={userRolesData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { 
                      legend: { position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold' } } } 
                    } 
                  }} 
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Card className="border-none shadow-sm rounded-[36px] p-8 bg-white" title={<div className="flex items-center justify-between font-bold text-slate-800">
          Monthly Financial Analysis
          <ArrowUpRight size={18} className="text-slate-300" />
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