import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BedDouble, Calendar, MessageSquare, 
  RefreshCw, UserPlus, Home, CheckSquare, 
  Activity, AlertCircle, Clock, ChevronRight, HelpCircle,
  Database, CheckCircle2, ArrowUpRight, Sparkles, RefreshCcw,
  Info, ArrowRight
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Card, Typography, Row, Col, Statistic, Button,
  ConfigProvider, Skeleton, Modal, Table, Tag, Badge,
  message, Tabs, Tooltip
} from 'antd';

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

const { Title, Text, Paragraph } = Typography;

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

  // ERP Sync Status States
  const [erpSync, setErpSync] = useState(null);
  const [erpChecking, setErpChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Dashboard Stats Error:', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  const checkErpSyncStatus = useCallback(async () => {
    setErpChecking(true);
    try {
      const response = await wardenAPI.getErpSyncStatus();
      if (response.data && response.data.success) {
        setErpSync(response.data.data);
      }
    } catch (error) {
      console.error('Check ERP Sync Status Error:', error);
    } finally {
      setErpChecking(false);
    }
  }, []);

  useEffect(() => { 
    fetchDashboardStats();
    checkErpSyncStatus();
  }, [fetchDashboardStats, checkErpSyncStatus]);

  // Handle Sync Now
  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const response = await wardenAPI.syncErpRecords();
      if (response.data && response.data.success) {
        message.success(response.data.message || 'Enrollment records synchronized successfully!');
        setSyncModalOpen(false);
        setDismissedBanner(false);
        // Refresh both stats and sync status
        await Promise.all([fetchDashboardStats(), checkErpSyncStatus()]);
      } else {
        message.warning(response.data?.message || 'Sync completed with warnings.');
      }
    } catch (error) {
      console.error('Sync ERP Error:', error);
      message.error(error.response?.data?.message || error.message || 'Failed to synchronize with ERP.');
    } finally {
      setSyncing(false);
    }
  };

  // Handle navigation
  const handleAction = (view) => setCurrentView?.(view);

  if (loading || !stats) {
    return <div className="p-10"><Skeleton active paragraph={{ rows: 15 }} /></div>;
  }

  const newStudentsColumns = [
    {
      title: 'Roll Number',
      dataIndex: 'roll_number',
      key: 'roll_number',
      render: (text) => <span className="font-mono font-bold text-blue-600">{text}</span>
    },
    {
      title: 'Student Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className="font-semibold text-slate-800">{text}</span>
    },
    {
      title: 'Department / Year',
      dataIndex: 'department',
      key: 'department',
      render: (text) => <Tag color="geekblue">{text || 'General'}</Tag>
    },
    {
      title: 'Batch / Session',
      dataIndex: 'batch',
      key: 'batch',
      render: (text) => <Tag color="purple">{text || 'Default'}</Tag>
    },
    {
      title: 'College',
      dataIndex: 'college',
      key: 'college',
      render: (text) => <Tag color="blue">{String(text).toUpperCase()}</Tag>
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      render: (text) => <Tag color={String(text).toLowerCase().startsWith('m') ? 'cyan' : 'magenta'}>{text || 'N/A'}</Tag>
    }
  ];

  const updatedStudentsColumns = [
    {
      title: 'Roll Number',
      dataIndex: 'roll_number',
      key: 'roll_number',
      render: (text) => <span className="font-mono font-bold text-amber-600">{text}</span>
    },
    {
      title: 'Current DB Name',
      dataIndex: 'oldName',
      key: 'oldName',
      render: (text) => <span className="text-slate-500 line-through">{text}</span>
    },
    {
      title: 'ERP Updated Name',
      dataIndex: 'newName',
      key: 'newName',
      render: (text) => <span className="font-semibold text-emerald-600">{text}</span>
    },
    {
      title: 'Changes Detected',
      dataIndex: 'diffSummary',
      key: 'diffSummary',
      render: (text) => <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md">{text}</span>
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 24, fontFamily: 'Inter, sans-serif' } }}>
      <div className="p-4 md:p-10 bg-[#f8fafc] min-h-screen">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <Title level={2} style={{ margin: 0 }}>Hostel Overview</Title>
            <Text type="secondary">Welcome back, Warden • Academic Year 2024-25</Text>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              icon={<Database size={16} className={erpChecking ? "animate-spin text-blue-500" : "text-blue-500"}/>} 
              onClick={checkErpSyncStatus} 
              loading={erpChecking}
              className="rounded-xl h-11 px-5 font-semibold flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              Check ERP Status
            </Button>
            <Button 
              icon={<RefreshCw size={16} className={loading ? "animate-spin" : ""}/>} 
              onClick={() => { fetchDashboardStats(); checkErpSyncStatus(); }} 
              className="rounded-xl h-11 px-6 font-bold flex items-center gap-2"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ERP DATA DIFFERENCE ALERT BANNER & MODAL TRIGGER */}
        {erpSync?.hasDifferences && !dismissedBanner && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-6 shadow-sm backdrop-blur transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-800 m-0">
                      ERP Hosteller Data Difference Detected
                    </h3>
                    <Tag color="gold" className="rounded-full px-3 font-semibold">
                      {erpSync.totalDifferences} Changes Found
                    </Tag>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 max-w-2xl m-0 leading-relaxed">
                    Live ERP API contains updated hosteller records that differ from your local enrollment database.
                    {erpSync.newCount > 0 && <span className="font-semibold text-slate-800"> {erpSync.newCount} new students</span>}
                    {erpSync.newCount > 0 && erpSync.updatedCount > 0 && <span> and </span>}
                    {erpSync.updatedCount > 0 && <span className="font-semibold text-slate-800">{erpSync.updatedCount} modified records</span>}
                    {' '}are ready to be synchronized.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button 
                  onClick={() => setSyncModalOpen(true)}
                  className="rounded-xl h-11 px-4 font-semibold border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  Review Differences
                </Button>
                <Button 
                  type="primary"
                  icon={<RefreshCcw size={16} className={syncing ? "animate-spin" : ""} />}
                  loading={syncing}
                  onClick={handleSyncNow}
                  className="rounded-xl h-11 px-6 font-bold bg-amber-600 hover:bg-amber-500 border-none shadow-md shadow-amber-600/20 flex items-center gap-2"
                >
                  Update Records in Table Now
                </Button>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setDismissedBanner(true)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

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

        {/* MAIN GRID */}
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

        {/* REVIEW DIFFERENCES & SYNC MODAL */}
        <Modal
          title={
            <div className="flex items-center gap-3 py-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Database size={20} />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-800">ERP Hosteller Records Synchronization</span>
                <p className="text-xs text-slate-500 font-normal m-0">Review differences between live ERP API and saved database enrollments</p>
              </div>
            </div>
          }
          open={syncModalOpen}
          onCancel={() => setSyncModalOpen(false)}
          width={860}
          footer={[
            <Button key="cancel" onClick={() => setSyncModalOpen(false)} className="rounded-xl font-semibold">
              Cancel
            </Button>,
            <Button
              key="sync"
              type="primary"
              loading={syncing}
              icon={<RefreshCcw size={16} className={syncing ? "animate-spin" : ""} />}
              onClick={handleSyncNow}
              className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 h-10 px-6"
            >
              Update & Sync All into Database Table
            </Button>
          ]}
        >
          {erpSync && (
            <div className="space-y-6 pt-2">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Total in ERP</div>
                  <div className="text-xl font-black text-slate-800 mt-1">{erpSync.totalErpCount}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Saved in Local DB</div>
                  <div className="text-xl font-black text-slate-800 mt-1">{erpSync.totalDbCount}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <div className="text-xs uppercase font-bold text-emerald-600">New Hostellers</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">+{erpSync.newCount}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="text-xs uppercase font-bold text-amber-600">Updated Info</div>
                  <div className="text-xl font-black text-amber-700 mt-1">{erpSync.updatedCount}</div>
                </div>
              </div>

              {/* Tabs for New vs Updated */}
              <Tabs
                defaultActiveKey="new"
                items={[
                  {
                    key: 'new',
                    label: `New Hostellers (${erpSync.newCount})`,
                    children: (
                      <Table
                        columns={newStudentsColumns}
                        dataSource={erpSync.newStudents || []}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        size="small"
                        locale={{ emptyText: 'No new hosteller students to add.' }}
                      />
                    )
                  },
                  {
                    key: 'updated',
                    label: `Modified Records (${erpSync.updatedCount})`,
                    children: (
                      <Table
                        columns={updatedStudentsColumns}
                        dataSource={erpSync.updatedStudents || []}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        size="small"
                        locale={{ emptyText: 'No records with modified details.' }}
                      />
                    )
                  }
                ]}
              />
            </div>
          )}
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default WardenDashboard;