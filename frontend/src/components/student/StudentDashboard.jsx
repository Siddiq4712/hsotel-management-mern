import { cornerRadius } from '../../theme/cornerRadius';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionContext';
import { screenForView } from '../../../../shared/permissions.js';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Alert, Card, Typography, Row, Col, Statistic, Button, Space,
  Select, Divider, ConfigProvider, theme, Skeleton, Badge, Tooltip 
} from 'antd';
import { 
  User, Bed, Receipt, Calendar, Home, CreditCard, 
  FileText, Clock, Utensils, AlertTriangle, Info, 
  ChevronLeft, ChevronRight, LayoutGrid, RefreshCw, 
  TrendingUp, CheckCircle2, XCircle, MinusCircle 
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, 
  BarElement, Title as ChartTitle, Tooltip as ChartTooltip, Legend
} from 'chart.js';
import moment from 'moment';
import { motion } from 'framer-motion';
import { outpassAPI, studentAPI } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, ChartTooltip, Legend);

const { Title, Text } = Typography;

// --- 1. Meaningful Skeleton for Dashboard ---
const DashboardSkeleton = () => (
  <div className="module-page p-8 space-y-6 bg-slate-50 min-h-screen">
    <div className="flex justify-between items-center">
      <Skeleton active title={{ width: 200 }} paragraph={{ rows: 1 }} />
      <Skeleton.Button active style={{ width: 150 }} />
    </div>
    <Row gutter={24}>
      {[...Array(4)].map((_, i) => (
        <Col span={6} key={i}><Skeleton.Button active block style={{ height: 100, borderRadius: cornerRadius.surface }} /></Col>
      ))}
    </Row>
    <Row gutter={24}>
      <Col span={16}><Skeleton active paragraph={{ rows: 12 }} /></Col>
      <Col span={8}><Skeleton active paragraph={{ rows: 12 }} /></Col>
    </Row>
  </div>
);

const StudentDashboard = ({ setCurrentView }) => {
  const { can } = usePermissions();
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [pass, setPass] = useState({ pending: true });
  const canViewPass = can(screenForView('outpass', 'student'));
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceChartData, setAttendanceChartData] = useState(null);
  const [attendanceHeatmapData, setAttendanceHeatmapData] = useState([]);

  // Independent Navigators
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);

  /* -------- NAVIGATION HANDLERS -------- */
  const changeYear = (offset) => setSelectedYear(prev => prev + offset);
  const changeMonth = (offset) => {
    let next = selectedMonth + offset;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setSelectedMonth(next);
  };

  /* -------- DATA FETCHING -------- */
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setProfileError('');
    try {
      const p = await studentAPI.getProfile();
      setProfile(p.data.data);
    } catch (e) {
      setProfileError(e.message || 'Could not load your hostel details.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const [messRes, attRes] = await Promise.all([
        studentAPI.getMonthlyMessExpensesChart(),
        studentAPI.getMonthlyAttendanceChart()
      ]);
      
      const expenses = Array(12).fill(0).map((_, i) => {
        const hit = messRes.data.data?.find(d => d.year === selectedYear && d.month === i + 1);
        return hit ? Number(hit.total_amount) : 0;
      });

      setMessExpenseChartData({
        labels: moment.monthsShort(),
        datasets: [{
          label: 'Mess Bill (₹)',
          data: expenses,
          backgroundColor: '#2563eb',
          borderRadius: 8,
        }]
      });

      const present = Array(12).fill(0);
      const absent = Array(12).fill(0);
      attRes.data.data?.forEach(d => {
        if(d.year === selectedYear) {
          present[d.month - 1] = d.present_days;
          absent[d.month - 1] = d.absent_days;
        }
      });

      setAttendanceChartData({
        labels: moment.monthsShort(),
        datasets: [
          { label: 'Present', data: present, backgroundColor: '#10b981' },
          { label: 'Absent', data: absent, backgroundColor: '#f43f5e' }
        ]
      });
    } finally {
      setChartLoading(false);
    }
  }, [selectedYear]);

  const fetchHeatmap = useCallback(async () => {
    setHeatmapLoading(true);
    try {
      const start = moment().year(selectedYear).month(selectedMonth - 1).startOf('month').format('YYYY-MM-DD');
      const end = moment(start).endOf('month').format('YYYY-MM-DD');
      const res = await studentAPI.getMyAttendance({ from_date: start, to_date: end });
      setAttendanceHeatmapData(res.data.data || []);
    } finally {
      setHeatmapLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => {
    if (!canViewPass) return;
    let active = true;
    outpassAPI.getCurrentOutpass().then(response => {
      if (active) setPass({ data: response.data.data });
    }).catch(() => {
      if (active) setPass({ error: true });
    });
    return () => { active = false; };
  }, [canViewPass]);
  useEffect(() => { fetchChartData(); }, [fetchChartData]);
  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

  const heatmapDays = useMemo(() => {
    const firstDay = moment().year(selectedYear).month(selectedMonth - 1).startOf('month');
    const start = firstDay.clone().startOf('week');
    const end = firstDay.clone().endOf('month').endOf('week');
    const days = [];
    let curr = start.clone();
    
    const attMap = new Map(attendanceHeatmapData.map(d => [moment(d.date).format('YYYY-MM-DD'), d.status]));

    while (curr.isBefore(end) || curr.isSame(end)) {
      days.push({
        date: curr.clone(),
        isCurrentMonth: curr.month() === firstDay.month(),
        status: attMap.get(curr.format('YYYY-MM-DD'))
      });
      curr.add(1, 'day');
    }
    return days;
  }, [selectedYear, selectedMonth, attendanceHeatmapData]);

  if (loading) return <DashboardSkeleton />;
  if (profileError) return <Alert showIcon type="error" title="Could not load the resident dashboard"
    description={profileError} action={<Button onClick={fetchDashboardData}>Retry</Button>} />;

  return (
    <ConfigProvider>
      <div className="module-page p-8 bg-slate-50 min-h-screen space-y-6">
        
        {/* Header Section */}
        <WorkspacePageHeader title="Dashboard" description={profile?.userName} icon={Home}>
          <Button icon={<RefreshCw size={16} />} onClick={fetchDashboardData}>Refresh</Button>
        </WorkspacePageHeader>

        <Card title="Hostel services">
          <Space wrap size="large">
            {can(screenForView('hfee', 'student')) && <Link to="/hfee">Fees and payments</Link>}
            {can(screenForView('my-leaves', 'student')) && <Link to="/my-leaves">Track leave requests</Link>}
            {canViewPass && <span>
              <Link to="/outpass">Gate pass</Link>
              {' · '}{pass.pending ? 'Loading' : pass.error ? 'Status unavailable' :
                ({ pending: 'Awaiting approval', approved: 'Approved', outside: 'Checked out' }[pass.data?.status] || 'No active pass')}
            </span>}
          </Space>
        </Card>

        {/* Top Stats Grid */}
        <Row gutter={[24, 24]}>
          {[
            { label: 'Hostel Unit', val: profile?.Hostel?.name || '-', icon: Home, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Allotted Room', val: profile?.tbl_RoomAllotments?.[0]?.HostelRoom?.room_number || '-', icon: Bed, color: 'text-purple-500', bg: 'bg-purple-50' },
            { label: 'Annual fee reminder', val: profile?.Hostel?.show_fee_reminder == 1 ? 'Active' : 'Off', icon: Receipt, color: profile?.Hostel?.show_fee_reminder == 1 ? 'text-orange-500' : 'text-emerald-500', bg: profile?.Hostel?.show_fee_reminder == 1 ? 'bg-orange-50' : 'bg-emerald-50' },
          ].map((stat, i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card className="border-none shadow-sm rounded-surface h-full">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-control ${stat.bg} ${stat.color}`}><stat.icon size={24} /></div>
                  <Statistic title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</span>} value={stat.val} valueStyle={{ fontSize: '1.1rem', fontWeight: 700 }} />
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Main Grid: Using flex to ensure height matching */}
        <Row gutter={[24, 24]} align="stretch">
          {/* Charts Column */}
          <Col lg={16} xs={24} className="flex flex-col gap-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              {[
                { label: 'Leave', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50', view: 'apply-leave' },
                { label: 'Complaints', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', view: 'submit-complaint' },
                { label: 'Reduction', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', view: 'day-reduction' },
                { label: 'Food Order', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50', view: 'food-order' },
              ].filter(action => can(screenForView(action.view, 'student'))).map((act, i) => (
                <button key={i} onClick={() => setCurrentView(act.view)} className={`p-6 rounded-surface border-none shadow-sm bg-white flex flex-col items-center gap-3 hover:scale-105 transition-transform group`}>
                   <div className={`p-3 rounded-control ${act.bg} ${act.color} group-hover:scale-110 transition-transform`}><act.icon size={24} /></div>
                   <Text strong className="text-slate-600">{act.label}</Text>
                </button>
              ))}
            </div>

            {/* Mess Expense Trend - Extended Height */}
            <Card
              className="border-none shadow-sm rounded-surface flex-1 flex flex-col"
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              title={
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <CreditCard size={20} className="text-blue-600" />
                    <Text strong>Mess Expense Trend</Text>
                  </div>
                  <div className="bg-slate-100 p-1 rounded-control flex items-center">
                    <Button type="text" size="small" icon={<ChevronLeft size={14} />} onClick={() => changeYear(-1)} />
                    <Text className="px-3 text-xs font-bold">{selectedYear}</Text>
                    <Button type="text" size="small" icon={<ChevronRight size={14} />} onClick={() => changeYear(1)} />
                  </div>
                </div>
              }
            >
              <div className="flex-1 w-full">
                {chartLoading ? (
                  <Skeleton active paragraph={{ rows: 8 }} />
                ) : (
                  <Bar
                    data={messExpenseChartData}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: { legend: { display: false } }
                    }}
                  />
                )}
              </div>
            </Card>

          </Col>

          {/* Heatmap Column */}
          <Col lg={8} xs={24} className="flex flex-col gap-6">
            <Card className="border-none shadow-sm rounded-surface p-2 flex-1" title={
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2"><LayoutGrid size={20} className="text-blue-600"/> <Text strong>Attendance Heatmap</Text></div>
                <div className="flex gap-2">
                  <div className="bg-slate-100 p-1 rounded-control flex items-center flex-1 justify-between">
                    <Button type="text" size="small" icon={<ChevronLeft size={14}/>} onClick={() => changeMonth(-1)} />
                    <Text className="text-[10px] font-bold uppercase">{moment().month(selectedMonth - 1).format('MMMM')}</Text>
                    <Button type="text" size="small" icon={<ChevronRight size={14}/>} onClick={() => changeMonth(1)} />
                  </div>
                </div>
              </div>
            }>
              {heatmapLoading ? <Skeleton active /> : (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['S','M','T','W','T','F','S'].map(d => <Text key={d} className="text-[10px] font-bold text-slate-300">{d}</Text>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {heatmapDays.map((day, i) => (
                      <div key={i} className={`aspect-square rounded-control flex items-center justify-center text-[10px] font-bold transition-all ${
                        !day.isCurrentMonth ? 'opacity-10' : 
                        day.status === 'P' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' :
                        day.status === 'A' ? 'bg-rose-500 text-white shadow-md shadow-rose-100' :
                        day.status === 'OD' ? 'bg-blue-500 text-white shadow-md shadow-blue-100' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {day.date.date()}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><Text className="text-[10px] text-slate-400">Present</Text></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /><Text className="text-[10px] text-slate-400">Absent</Text></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><Text className="text-[10px] text-slate-400">OD</Text></div>
                  </div>
                </div>
              )}
            </Card>

            {/* Attendance Chart */}
            <Card className="border-none shadow-sm rounded-surface p-2" title={<Text strong>Yearly Overview</Text>}>
              <div className="h-48 mt-2">
                {chartLoading ? <Skeleton active /> : <Bar data={attendanceChartData} options={{ maintainAspectRatio: false, scales: { x: { display: false } } }} />}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default StudentDashboard;