import WorkspaceContextHeader from '../common/WorkspaceContextHeader';
import { useWardenHostelName } from './WardenWorkspace';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionContext';
import { screenForView } from '../../../../shared/permissions.js';
import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, RefreshCw, UserPlus, DoorOpen, CheckSquare,
  Database, Sparkles, RefreshCcw
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Card, ConfigProvider, Empty, Skeleton, Modal, Table, Tag, message, Tabs, Alert } from 'antd';

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

const WardenDashboard = () => {
  const hostelName = useWardenHostelName();
  const { can } = usePermissions();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');

  // ERP Sync Status States
  const [erpSync, setErpSync] = useState(null);
  const [erpChecking, setErpChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setStatsError('');
    try {
      const response = await wardenAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      setStatsError(error.message || 'Could not load the dashboard.');
    } finally {
      setLoading(false);
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

  if (statsError) return <Alert type="error" showIcon title="Could not load the warden dashboard"
    description={statsError} action={<Button onClick={fetchDashboardStats}>Retry</Button>} />;

  if (loading || !stats) {
    return <div className="p-10"><Skeleton active paragraph={{ rows: 15 }} /></div>;
  }

  const newStudentsColumns = [
    { title: 'ERP Batch Year', dataIndex: 'erp_batch_year', key: 'erp_batch_year' },
    { title: 'Assigned Hostel', dataIndex: 'assigned_hostel', key: 'assigned_hostel' },
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
      title: 'Batch',
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
    { title: 'ERP Batch Year', dataIndex: 'erp_batch_year', key: 'erp_batch_year' },
    { title: 'Assigned Hostel', dataIndex: 'assigned_hostel', key: 'assigned_hostel' },
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
      render: (text) => <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-tag">{text}</span>
    }
  ];

  const dashboardLink = (view, status) => {
    const query = new URLSearchParams();
    if (user?.role === 'admin') query.set('workspace', 'warden');
    if (status) query.set('status', status);
    return { pathname: `/${view}`, search: query.toString() };
  };
  const queues = [
    { view: 'leave-requests', status: 'pending', label: 'Pending leave requests', count: stats.pendingLeaves },
    { view: 'outpass-approval', label: 'Pending outpasses', count: stats.outpasses?.pending },
    { view: 'complaints', status: 'open', label: 'Open complaints', count: stats.pendingComplaints },
    { view: 'warden-day-red', label: 'Mess reductions to review', count: stats.pendingReductions },
  ].filter(queue => can(screenForView(queue.view, 'warden')));
  const totalPending = queues.reduce((sum, queue) => sum + (Number(queue.count) || 0), 0);
  const attendanceTrend = stats.attendanceTrend || [];

  return (
    <ConfigProvider>
      <div className="module-page warden-page">
        <WorkspaceContextHeader title="Hostel Overview" headingAs="h1" scope={hostelName}
          description="A clear view of your hostel, students, and daily priorities." actions={<>
          <Button icon={<Database size={16} />} onClick={checkErpSyncStatus} loading={erpChecking}>Check ERP Status</Button>
          <Button icon={<RefreshCw size={16} />} onClick={() => { fetchDashboardStats(); checkErpSyncStatus(); }}>Refresh</Button>
        </>} />

        <div className="warden-page-stack">
        {queues.length > 0 && <section className="warden-panel warden-panel-padded" aria-labelledby="warden-attention-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="warden-attention-heading" className="warden-table-title">Needs attention</h2>
            <Tag color={totalPending ? 'warning' : 'default'}>{totalPending} {totalPending === 1 ? 'item' : 'items'} to review</Tag>
          </div>
          <ul className="warden-dashboard-attention m-0 list-none p-0">
            {queues.map(queue => <li key={queue.view}>
                <Link to={dashboardLink(queue.view, queue.status)} data-pending={Number(queue.count) > 0}>
                  <span>{queue.label}</span>
                  <strong>{queue.count ?? 0}</strong>
                </Link>
              </li>)}
          </ul>
        </section>}

        {erpSync?.hasDifferences && !dismissedBanner && (
          <div className="mb-8 overflow-hidden rounded-surface border border-amber-200 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-6 shadow-sm backdrop-blur transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-amber-500 text-white shadow-md shadow-amber-500/20">
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
                  className="rounded-control h-11 px-4 font-semibold border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  Review Differences
                </Button>
                <Button permissionScreen="students" permissionAction="edit" 
                  type="primary"
                  icon={<RefreshCcw size={16} className={syncing ? "animate-spin" : ""} />}
                  loading={syncing}
                  onClick={handleSyncNow}
                  className="rounded-control h-11 px-6 font-bold bg-amber-600 hover:bg-amber-500 border-none shadow-md shadow-amber-600/20 flex items-center gap-2"
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

        <div className="warden-stat-grid">
          {[
            ['Total students', stats.totalStudents, 'Students in the hostel'],
            ['Occupied beds', stats.occupiedBeds, 'Current occupied beds'],
          ].map(([label, value, caption]) => <div key={label} className="warden-panel warden-stat">
            <span>{label}</span><strong>{value ?? '—'}</strong><small>{caption}</small>
          </div>)}
        </div>

        <nav className="warden-dashboard-shortcuts" aria-label="Hostel shortcuts">
          {[
            { label: 'Admission', icon: UserPlus, view: 'enroll-student' },
            { label: 'Rooms', icon: DoorOpen, view: 'create-room' },
            { label: 'Attendance', icon: CheckSquare, view: 'attendance' },
            { label: 'Leaves', icon: Calendar, view: 'leave-requests' },
          ].filter(action => can(screenForView(action.view, 'warden'))).map(action => (
            <Link key={action.view} className="warden-panel" to={dashboardLink(action.view)}>
              <span><action.icon size={19} aria-hidden="true" /></span><strong>{action.label}</strong>
            </Link>
          ))}
        </nav>

        <div className="warden-dashboard-overview">
          <Card className="warden-dashboard-chart" title="Hostel Attendance Trend">
            {attendanceTrend.some(point => point.presentRate != null) ? <div className="warden-chart-height">
              <Line
                aria-label="Percent of recorded students marked present over the last seven days"
                options={{
                  ...SHARED_CHART_OPTIONS,
                  plugins: { ...SHARED_CHART_OPTIONS.plugins, legend: { display: false } },
                  scales: { ...SHARED_CHART_OPTIONS.scales, y: { ...SHARED_CHART_OPTIONS.scales.y, max: 100 } },
                }}
                data={{
                  labels: attendanceTrend.map(point => point.date),
                  datasets: [{
                    label: 'Present among recorded attendance (%)',
                    data: attendanceTrend.map(point => point.presentRate),
                    borderColor: '#2c59d4',
                    backgroundColor: 'rgba(44,89,212,0.08)',
                    fill: true,
                    tension: 0.35,
                  }],
                }}
              />
            </div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No daily attendance recorded in the last seven days." />}
          </Card>
          <Card className="warden-dashboard-chart" title="Bed Availability">
            <div className="warden-chart-height">
              <Doughnut aria-label="Occupied and available beds"
                options={{ ...SHARED_CHART_OPTIONS, scales: {}, cutout: '72%' }}
                data={{
                  labels: ['Occupied', 'Available'],
                  datasets: [{ data: [stats.occupiedBeds, stats.availableBeds], backgroundColor: ['#2c59d4', '#eef2f8'], borderWidth: 0 }],
                }}
              />
            </div>
          </Card>
        </div>

        <div className="warden-stat-grid">
          {[
            { title: 'Complaint Progress', labels: ['New', 'In progress', 'Resolved', 'Closed'], values: ['submitted', 'in_progress', 'resolved', 'closed'].map(status => stats.complaintStatus?.[status] ?? 0) },
            { title: 'Leave Requests Status', labels: ['Pending', 'Approved', 'Rejected'], values: ['pending', 'approved', 'rejected'].map(status => stats.leaveStatus?.[status] ?? 0) },
            { title: "Today's Attendance", labels: ['Present', 'Absent', 'On duty'], values: ['P', 'A', 'OD'].map(status => stats.attendanceStatus?.[status] ?? 0) },
          ].map(chart => <Card key={chart.title} className="warden-dashboard-chart" title={chart.title}>
            <div className="warden-chart-height">
              <Bar aria-label={chart.title} options={{ ...SHARED_CHART_OPTIONS, plugins: { ...SHARED_CHART_OPTIONS.plugins, legend: { display: false } } }}
                data={{ labels: chart.labels, datasets: [{ data: chart.values, backgroundColor: '#6591ef', borderRadius: 5 }] }} />
            </div>
          </Card>)}
        </div>
        </div>

        {/* REVIEW DIFFERENCES & SYNC MODAL */}
        <Modal
          title={
            <div className="flex items-center gap-3 py-2">
              <div className="p-2 rounded-control bg-blue-50 text-blue-600">
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
            <Button key="cancel" onClick={() => setSyncModalOpen(false)} className="rounded-control font-semibold">
              Cancel
            </Button>,
            <Button permissionScreen="students" permissionAction="edit"
              key="sync"
              type="primary"
              loading={syncing}
              disabled={Boolean(erpSync?.allocationConflicts?.length)}
              icon={<RefreshCcw size={16} className={syncing ? "animate-spin" : ""} />}
              onClick={handleSyncNow}
              className="rounded-control font-bold bg-blue-600 hover:bg-blue-500 h-10 px-6"
            >
              Update & Sync All into Database Table
            </Button>
          ]}
        >
          {erpSync && (
            <div className="space-y-6 pt-2">
              {Boolean(erpSync.allocationConflicts?.length) && <Alert type="warning" showIcon title="Batch allocation needs attention" description="Configure the missing or unconfigured ERP batch admission years and assigned hostels in Manage Batches, then check ERP status again before synchronizing." />}
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-surface border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Total in ERP</div>
                  <div className="text-xl font-black text-slate-800 mt-1">{erpSync.totalErpCount}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-surface border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Saved in Local DB</div>
                  <div className="text-xl font-black text-slate-800 mt-1">{erpSync.totalDbCount}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-surface border border-emerald-100">
                  <div className="text-xs uppercase font-bold text-emerald-600">New Hostellers</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">+{erpSync.newCount}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-surface border border-amber-100">
                  <div className="text-xs uppercase font-bold text-amber-600">Updated Info</div>
                  <div className="text-xl font-black text-amber-700 mt-1">{erpSync.updatedCount}</div>
                </div>
              </div>

              {/* Tabs for New vs Updated */}
              <Tabs
                defaultActiveKey="new"
                items={[
                  {
                    key: 'allocation-conflicts',
                    label: `Allocation Conflicts (${erpSync.allocationConflicts?.length || 0})`,
                    children: <Table dataSource={erpSync.allocationConflicts || []} rowKey="id" pagination={{ pageSize: 5 }} columns={[{ title: 'Roll Number', dataIndex: 'roll_number' }, { title: 'Student', dataIndex: 'name' }, { title: 'Needs Attention', dataIndex: 'reason' }]} />
                  },
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
