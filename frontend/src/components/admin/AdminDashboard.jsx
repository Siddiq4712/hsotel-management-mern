import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Typography, Button, Skeleton, Modal, notification, Tag } from 'antd';
import { Monitor } from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { adminAPI } from '../../services/api';
import DailyRateReport from '../mess/DailyRateReport';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import './AdminWorkspace.css';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement);

const { Text } = Typography;
const BLUE = '#2454ed';
const GOLD = '#f4b544';
const roleColors = { Student: BLUE, Warden: '#7652c6', Mess: '#147d71', Admin: '#c88013', Parent: '#7587a3' };
const occupancyOptions = {
  cutout: '76%',
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

const AdminDashboard = () => {
  // --- STATE ---
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  // New States for Screen Sharing
  const [activeShare, setActiveShare] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // --- DATA FETCHING ---
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats (Critical)
      const statsRes = await adminAPI.getDashboardStats().catch(() => ({ data: { data: {} } }));
      setStats(statsRes.data.data);

      // Fetch charts (Optional - fails silently if no data)
      const chartRes = await adminAPI.getAdminChartData().catch(() => ({ data: { data: {} } }));
      setChartData(chartRes.data.data);

    } catch (err) {
      console.error('Dashboard partially failed to load', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- NOTIFICATION POLLING (Check for Shared Screens) ---
  const checkLiveNotifications = useCallback(async () => {
    try {
      const res = await adminAPI.getNotifications();
      // Filter for unread "share" type notifications
      const shares = res.data.data.filter(n => n.type === 'share' && n.status === 'unread');
      
      shares.forEach(share => {
        notification.info({
          message: <Text strong>Live Screen Share</Text>,
          description: `Mess Manager from "${share.hostelName}" is sharing the Daily Rate Ledger.`,
          icon: <Monitor size={20} className="text-blue-500" />,
          btn: (
            <Button type="primary" size="small" onClick={() => handleOpenShare(share)}>
              View Live Screen
            </Button>
          ),
          key: share.id, // Prevents duplicate notifications
          duration: 0, // Stay until Admin clicks or closes
        });
      });
    } catch (e) {
      // Silently log the error only once or if it's not a 404
      if (!e.message.includes('404')) {
        console.error("Notification sync issue:", e.message);
      }
    }
  }, []);

  useEffect(() => { 
    fetchDashboardData(); 
    // Start polling for notifications every 20 seconds
    const interval = setInterval(checkLiveNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, checkLiveNotifications]);

  const handleOpenShare = (share) => {
    setActiveShare(share);
    setIsShareModalOpen(true);
    // Mark as read in backend
    adminAPI.markNotificationRead(share.id);
    // Remove notification bubble
    notification.destroy(share.id);
  };

  const hasBedCounts = stats?.totalBeds != null;
  const capacity = hasBedCounts ? stats.totalBeds : stats?.totalRooms;
  const unit = hasBedCounts ? 'beds' : 'rooms';
  const occupancy = [
    { label: `Occupied ${unit}`, count: hasBedCounts ? stats.occupiedBeds : stats?.occupiedRooms, color: BLUE },
    { label: `Empty ${unit}`, count: hasBedCounts ? stats.availableBeds : stats?.availableRooms, color: GOLD },
  ];
  const occupancyData = {
    labels: occupancy.map(item => item.label),
    datasets: [{
      data: occupancy.map(item => item.count ?? 0),
      backgroundColor: occupancy.map(item => item.color),
      borderWidth: 0,
    }],
  };
  const roles = (chartData?.userRoles?.labels ?? []).map((label, index) => ({
    label,
    count: chartData.userRoles.counts[index],
  })).sort((first, second) => second.count - first.count);

  const monthlyFinancialsData = useMemo(() => ({
    labels: chartData?.monthlyFinancials?.labels || [],
    datasets: [
      {
        label: 'Revenue',
        data: chartData?.monthlyFinancials?.income || [],
        backgroundColor: BLUE,
        borderRadius: 5,
      },
      {
        label: 'Expenses',
        data: chartData?.monthlyFinancials?.expenses || [],
        backgroundColor: '#D93025',
        borderRadius: 5,
      },
    ],
  }), [chartData]);

  if (loading || !stats) return <Skeleton active className="p-8" />;

  return (
    <section className="module-page admin-overview" aria-labelledby="admin-overview-title">
      <WorkspacePageHeader id="admin-overview-title" title="Hostel Administration" description="A clear view of your hostel operations.">
        <Button onClick={fetchDashboardData}>Refresh</Button>
      </WorkspacePageHeader>

      <dl className="admin-metrics admin-overview-metrics">
        {[
          ['Active hostels', stats.totalHostels],
          ['Campus wardens', stats.totalWardens],
          ['Students', stats.totalStudents],
          [hasBedCounts ? 'Bed capacity' : 'Rooms', capacity],
        ].map(([label, value]) => (
          <div className="admin-surface admin-metric" key={label}>
            <dt>{label}</dt>
            <dd>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="admin-overview-panels">
        <section className="admin-surface admin-overview-panel" aria-labelledby="bed-occupancy-title">
          <div className="admin-panel-heading">
            <h3 id="bed-occupancy-title">{hasBedCounts ? 'Bed occupancy' : 'Room occupancy'}</h3>
            <span className="admin-current-label">Current</span>
          </div>
          <p>Occupied and empty {unit} across your hostels</p>
          <div className="admin-occupancy">
            <div className="admin-occupancy-chart">
              {capacity > 0 && <Doughnut data={occupancyData} options={occupancyOptions}
                aria-label={occupancy.map(({ label, count }) => `${label}: ${count ?? 'unavailable'}`).join(', ')} role="img" />}
              <div className="admin-occupancy-total">
                <strong>{capacity ?? '—'}</strong>
                <span>{hasBedCounts ? 'bed capacity' : 'total rooms'}</span>
              </div>
            </div>
            <ul className="admin-legend">
              {occupancy.map(({ label, color, count }) => (
                <li key={label} title={`${label}: ${count ?? 'unavailable'}`}>
                  <span className="admin-legend-dot" style={{ backgroundColor: color }} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <p className="admin-occupancy-note">Monitor available capacity before assigning rooms.</p>
        </section>

        <section className="admin-surface admin-overview-panel" aria-labelledby="user-distribution-title">
          <h3 id="user-distribution-title">User distribution</h3>
          <p>Accounts by role</p>
          {roles.length ? (
            <ul className="admin-legend admin-role-list">
              {roles.map(({ label, count }) => (
                <li key={label}>
                  <span className="admin-legend-dot" style={{ backgroundColor: roleColors[label] ?? '#7587a3' }} />
                  <span>{label}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          ) : <p>No account counts available.</p>}
        </section>
      </div>

      <Card className="admin-surface admin-financial-panel" title="Monthly Financial Analysis">
        <div className="h-96">
          <Bar data={monthlyFinancialsData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </Card>

        {/* --- LIVE SHARE MODAL --- */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <Monitor size={20} className="text-blue-600" />
              <span>Live Shared Review: {activeShare?.hostelName}</span>
              <Tag color="blue" className="ml-2">Live View</Tag>
            </div>
          }
          open={isShareModalOpen}
          onCancel={() => setIsShareModalOpen(false)}
          width={1300}
          footer={null}
          centered
          styles={{ body: { padding: '32px', background: '#f8fafc', maxHeight: '85vh', overflowY: 'auto' } }}
        >
          {activeShare && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Rendering the report in read-only mode using the shared data */}
               <DailyRateReport 
                sharedData={activeShare.reportData} 
                isReadOnly={true} 
               />
            </div>
          )}
        </Modal>

    </section>
  );
};

export default AdminDashboard;