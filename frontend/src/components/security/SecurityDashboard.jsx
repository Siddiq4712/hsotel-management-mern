import WorkspacePageHeader from '../common/WorkspacePageHeader';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Alert, Card, Typography, Row, Col, List, Table, Tag,
  Button, Input, Form, message, ConfigProvider, theme, Space, Statistic, Avatar
} from 'antd';
import { 
  Shield, Key, Eye, CheckCircle, Clock, Search, LogOut, RefreshCw, Users, LogIn
} from 'lucide-react';
import { outpassAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import moment from 'moment';

const { Title, Text } = Typography;

const SecurityDashboard = () => {
  const { logout } = useAuth();
  const { can } = usePermissions();
  const canViewActivity = can('gate-activity');
  const canViewScanner = can('gate-scan');
  const canScan = can('gate-scan', 'create');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ exits: 0, returns: 0, outside: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [outsideStudents, setOutsideStudents] = useState([]);
  
  // Manual Verification State
  const [qrToken, setQrToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!canViewActivity) return;
    setLoading(true);
    setLoadError('');
    try {
      const [activityRes, outsideRes, scansRes] = await Promise.all([
        outpassAPI.getTodayGateActivity(),
        outpassAPI.getStudentsCurrentlyOutside(),
        outpassAPI.getRecentScans()
      ]);

      const activities = activityRes.data?.data || [];
      const outsideList = outsideRes.data?.data || [];
      const scansList = scansRes.data?.data || [];

      const today = moment();
      const exitsToday = activities.filter(a => a.exit_time && moment(a.exit_time).isSame(today, 'day')).length;
      const returnsToday = activities.filter(a => a.return_time && moment(a.return_time).isSame(today, 'day')).length;

      setStats({
        exits: exitsToday,
        returns: returnsToday,
        outside: outsideList.length
      });

      setOutsideStudents(outsideList);
      setRecentScans(scansList.slice(0, 10));
    } catch (error) {
      setLoadError(error.message || 'Could not load gate activity.');
    } finally {
      setLoading(false);
    }
  }, [canViewActivity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!canScan || verifyLoading) return;
    if (!qrToken.trim()) {
      message.warning('Please enter a valid QR Token / Outpass ID');
      return;
    }

    setVerifyLoading(true);
    setScanResult(null);
    try {
      const res = await outpassAPI.scanOutpassQR(qrToken.trim());
      if (res.data?.success) {
        message.success(res.data.message || 'Verification successful');
        setScanResult({
          success: true,
          message: res.data.message,
          outpass: res.data.data
        });
        setQrToken('');
        fetchData(); // Refresh list and stats
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'Could not verify the outpass.';
      message.error(errMsg);
      setScanResult({
        success: false,
        message: errMsg,
        outpass: error.response?.data?.data
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'gold', text: 'PENDING' },
      approved: { color: 'blue', text: 'APPROVED' },
      rejected: { color: 'magenta', text: 'REJECTED' },
      cancelled: { color: 'default', text: 'CANCELLED' },
      outside: { color: 'purple', text: 'OUTSIDE' },
      completed: { color: 'green', text: 'COMPLETED' },
      expired: { color: 'red', text: 'EXPIRED' },
      late_return: { color: 'red', text: 'LATE RETURN' }
    };
    const details = statusMap[status] || { color: 'default', text: String(status).toUpperCase() };
    return <Tag color={details.color} className="rounded-full px-3 py-0.5 border-none font-bold text-[10px] tracking-wider">{details.text}</Tag>;
  };

  const recentColumns = [
    { 
      title: 'Student Details', 
      key: 'student', 
      render: (_, r) => (
        <Space>
          <Avatar src={r.Student?.profile_picture} icon={<Users size={14} />} />
          <div>
            <Text strong className="block text-slate-700">{r.Student?.userName}</Text>
            <Text type="secondary" className="text-xs">Roll: {r.Student?.roll_number}</Text>
          </div>
        </Space>
      )
    },
    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose' },
    { 
      title: 'Exit Time', 
      dataIndex: 'exit_time', 
      key: 'exit', 
      render: (t) => t ? moment(t).format('LT') : <Text type="secondary" className="text-xs">Not recorded</Text> 
    },
    { 
      title: 'Return Time', 
      dataIndex: 'return_time', 
      key: 'return', 
      render: (t) => t ? moment(t).format('LT') : <Text type="secondary" className="text-xs">Not returned</Text> 
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => getStatusTag(s) }
  ];

  const outsideColumns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, r) => (
        <Space>
          <Avatar src={r.Student?.profile_picture} icon={<Users size={14} />} />
          <div>
            <Text strong className="block text-slate-700">{r.Student?.userName}</Text>
            <Text type="secondary" className="text-xs">Roll: {r.Student?.roll_number}</Text>
          </div>
        </Space>
      )
    },
    { title: 'Hostel', key: 'hostel', render: (_, r) => r.Student?.Hostel?.name || 'Gents Hostel 1' },
    { title: 'Exited At', dataIndex: 'exit_time', key: 'exit', render: (t) => moment(t).format('lll') },
    { title: 'Expected Return', dataIndex: 'to_date', key: 'expected', render: (t) => moment(t).format('lll') },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => getStatusTag(s) }
  ];

  return (
    <ConfigProvider>
      <div className="module-page">
        
        <WorkspacePageHeader title="Security Gate Console" icon={Shield}
          description={`Campus gate · ${moment().format('DD MMM YYYY')}`}>
          {canViewActivity && <Button icon={<RefreshCw size={16} />} onClick={fetchData} loading={loading}>Refresh</Button>}
          <Button icon={<LogOut size={16} />} onClick={logout}>Sign out</Button>
        </WorkspacePageHeader>

        {/* Stats Section */}
        {canViewActivity && loadError && <Alert className="mb-4" type="error" showIcon title="Gate activity unavailable" description={loadError} action={<Button onClick={fetchData} loading={loading}>Retry</Button>} />}
        {canViewActivity && <Row gutter={[24, 24]} className="mb-6">
          <Col lg={8} md={8} xs={24}>
            <Card className="border-none shadow-sm rounded-surface p-6 bg-white flex flex-col justify-between">
              <Statistic 
                title={<Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Students Currently Outside</Text>}
                value={loadError ? '—' : stats.outside}
                valueStyle={{ color: '#8b5cf6', fontWeight: 800, fontSize: '32px' }}
                prefix={<Users size={24} className="text-purple-500 mr-2 inline" />}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} xs={24}>
            <Card className="border-none shadow-sm rounded-surface p-6 bg-white flex flex-col justify-between">
              <Statistic 
                title={<Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Recorded Exits Today</Text>}
                value={loadError ? '—' : stats.exits}
                valueStyle={{ color: '#10b981', fontWeight: 800, fontSize: '32px' }}
                prefix={<LogOut size={24} className="text-emerald-500 mr-2 inline" />}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} xs={24}>
            <Card className="border-none shadow-sm rounded-surface p-6 bg-white flex flex-col justify-between">
              <Statistic 
                title={<Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Recorded Returns Today</Text>}
                value={loadError ? '—' : stats.returns}
                valueStyle={{ color: '#3b82f6', fontWeight: 800, fontSize: '32px' }}
                prefix={<LogIn size={24} className="text-blue-500 mr-2 inline" />}
              />
            </Card>
          </Col>
        </Row>}

        <Row gutter={[24, 24]}>
          {/* LEFT: Scan and Activity Logs */}
          <Col lg={canViewActivity ? 16 : 24} md={24} xs={24} className="space-y-6">
            
            {/* Manual Verification Form */}
            {canViewScanner && <Card>
              <Title level={4} className="mb-4 flex items-center gap-2">
                <Key size={20} className="text-indigo-600" />
                Verify and log gate activity
              </Title>
              <form onSubmit={handleVerify} className="workspace-toolbar">
                <Input 
                  aria-label="Outpass QR token"
                  placeholder="Enter the outpass QR token"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="workspace-search"
                  disabled={verifyLoading || !canScan}
                />
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={verifyLoading} 
                  disabled={!canScan}
                >
                  Verify & Log
                </Button>
              </form>

              {/* Scan result display panel */}
              {scanResult && (
                <div role={scanResult.success ? 'status' : 'alert'} className={`mt-6 p-5 rounded-surface border ${scanResult.success ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} transition-all duration-300`}>
                  <div className="flex gap-4 items-start">
                    <div className={`p-2.5 rounded-control ${scanResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <Title level={5} style={{ margin: 0, color: scanResult.success ? '#065f46' : '#991b1b' }}>
                        {scanResult.message}
                      </Title>
                      
                      {scanResult.outpass && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/70 p-4 rounded-surface border border-slate-100">
                          <div>
                            <Text type="secondary" className="text-xs">Student Name</Text>
                            <Text className="block font-bold text-slate-800">{scanResult.outpass.Student?.userName}</Text>
                          </div>
                          <div>
                            <Text type="secondary" className="text-xs">Roll Number</Text>
                            <Text className="block font-bold text-slate-800">{scanResult.outpass.Student?.roll_number}</Text>
                          </div>
                          <div>
                            <Text type="secondary" className="text-xs">Purpose / Destination</Text>
                            <Text className="block font-medium text-slate-700">{scanResult.outpass.purpose} (To: {scanResult.outpass.destination})</Text>
                          </div>
                          <div>
                            <Text type="secondary" className="text-xs">Expected Return</Text>
                            <Text className="block font-bold text-slate-800">{moment(scanResult.outpass.to_date).format('lll')}</Text>
                          </div>
                          <div>
                            <Text type="secondary" className="text-xs">Log Status</Text>
                            <div className="mt-0.5">{getStatusTag(scanResult.outpass.status)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>}

            {/* Recent activity log table */}
            {canViewActivity && <Card>
              <Title level={4} className="mb-4 flex items-center gap-2">
                <Clock size={20} className="text-indigo-600" />
                Recent Gate Activity
              </Title>
              <Table 
                dataSource={loadError ? [] : recentScans}
                columns={recentColumns} 
                rowKey="id" 
                pagination={{ pageSize: 5 }}
                loading={loading} scroll={{ x: 565 }}
                locale={{ emptyText: loadError ? 'Gate scans could not be loaded.' : 'No recent gate scans.' }}
              />
            </Card>}

          </Col>

          {/* RIGHT: Students Currently Outside */}
          {canViewActivity && <Col lg={8} md={24} xs={24}>
            <Card className="border-none shadow-sm rounded-surface p-6 bg-white h-full">
              <Title level={4} className="mb-4 flex items-center gap-2">
                <Users size={20} className="text-purple-600" />
                Who is Outside?
              </Title>
              <List
                dataSource={loadError ? [] : outsideStudents}
                renderItem={item => (
                  <List.Item className="flex justify-between items-center py-3.5 border-b border-slate-100 last:border-none">
                    <List.Item.Meta
                      avatar={<Avatar src={item.Student?.profile_picture} icon={<Users size={14} />} />}
                      title={<Text strong className="text-slate-800 text-sm block leading-tight">{item.Student?.userName}</Text>}
                      description={
                        <div className="space-y-0.5 mt-0.5">
                          <Text type="secondary" className="text-xs block">Roll: {item.Student?.roll_number}</Text>
                          <Text type="secondary" className="text-[10px] block text-purple-600 font-medium">Expected back: {moment(item.to_date).format('LT')}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
                loading={loading}
                locale={{ emptyText: loadError ? 'Outside status could not be loaded.' : 'All students are inside.' }}
              />
            </Card>
          </Col>}
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default SecurityDashboard;
