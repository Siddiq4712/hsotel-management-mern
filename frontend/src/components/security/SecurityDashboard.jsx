import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Typography, Row, Col, List, Table, Tag, 
  Button, Input, Form, message, ConfigProvider, theme, Space, Statistic, Avatar
} from 'antd';
import { 
  Shield, Key, Eye, CheckCircle, Clock, Search, LogOut, RefreshCw, Users, LogIn
} from 'lucide-react';
import { outpassAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';

const { Title, Text } = Typography;

const SecurityDashboard = () => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ exits: 0, returns: 0, outside: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [outsideStudents, setOutsideStudents] = useState([]);
  
  // Manual Verification State
  const [qrToken, setQrToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activityRes, outsideRes, scansRes] = await Promise.all([
        outpassAPI.getTodayGateActivity(),
        outpassAPI.getStudentsCurrentlyOutside(),
        outpassAPI.getRecentScans()
      ]);

      const activities = activityRes.data?.data || [];
      const outsideList = outsideRes.data?.data || [];
      const scansList = scansRes.data?.data || [];

      const exitsToday = activities.filter(a => a.exit_time).length;
      const returnsToday = activities.filter(a => a.return_time).length;

      setStats({
        exits: exitsToday,
        returns: returnsToday,
        outside: outsideList.length
      });

      setOutsideStudents(outsideList);
      setRecentScans(scansList.slice(0, 10));
    } catch (error) {
      console.error('Error fetching security dashboard stats:', error);
      message.error('Failed to sync gate data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
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
      const errMsg = error.response?.data?.message || 'Invalid QR Token or verification error';
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
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#4f46e5', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Block */}
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 text-white">
                <Shield size={24} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>Security Gate Console</Title>
                <Text type="secondary" className="text-sm">Manage, verify, and record real-time hostel gate entry/exit activity</Text>
              </div>
            </div>
            <div className="flex gap-3">
              <Button icon={<RefreshCw size={16} />} onClick={fetchData} loading={loading} className="h-11 rounded-xl flex items-center justify-center font-semibold">
                Refresh Stats
              </Button>
              <Button icon={<LogOut size={16} />} onClick={logout} danger className="h-11 rounded-xl flex items-center justify-center gap-2 font-semibold">
                Sign Out
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Section */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col lg={8} md={8} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white flex flex-col justify-between">
              <Statistic 
                title={<Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Students Currently Outside</Text>}
                value={stats.outside} 
                valueStyle={{ color: '#8b5cf6', fontWeight: 800, fontSize: '32px' }}
                prefix={<Users size={24} className="text-purple-500 mr-2 inline" />}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white flex flex-col justify-between">
              <Statistic 
                title={<Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Recorded Exits Today</Text>}
                value={stats.exits} 
                valueStyle={{ color: '#10b981', fontWeight: 800, fontSize: '32px' }}
                prefix={<LogOut size={24} className="text-emerald-500 mr-2 inline" />}
              />
            </Card>
          </Col>
          <Col lg={8} md={8} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white flex flex-col justify-between">
              <Statistic 
                title={<Text className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Recorded Returns Today</Text>}
                value={stats.returns} 
                valueStyle={{ color: '#3b82f6', fontWeight: 800, fontSize: '32px' }}
                prefix={<LogIn size={24} className="text-blue-500 mr-2 inline" />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          {/* LEFT: Scan and Activity Logs */}
          <Col lg={16} md={24} xs={24} className="space-y-6">
            
            {/* Manual Verification Form */}
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
              <Title level={4} className="mb-4 flex items-center gap-2">
                <Key size={20} className="text-indigo-600" />
                Log Gate Activity / Scan QR
              </Title>
              <form onSubmit={handleVerify} className="flex gap-4">
                <Input 
                  placeholder="Enter Student Outpass Token or Roll Number" 
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  className="h-12 rounded-xl text-base flex-1"
                  disabled={verifyLoading}
                />
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={verifyLoading} 
                  className="h-12 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 border-none"
                >
                  Verify & Log
                </Button>
              </form>

              {/* Scan result display panel */}
              {scanResult && (
                <div className={`mt-6 p-5 rounded-2xl border ${scanResult.success ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} transition-all duration-300`}>
                  <div className="flex gap-4 items-start">
                    <div className={`p-2.5 rounded-xl ${scanResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <Title level={5} style={{ margin: 0, color: scanResult.success ? '#065f46' : '#991b1b' }}>
                        {scanResult.message}
                      </Title>
                      
                      {scanResult.outpass && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/70 p-4 rounded-xl border border-slate-100">
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
            </Card>

            {/* Recent activity log table */}
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
              <Title level={4} className="mb-4 flex items-center gap-2">
                <Clock size={20} className="text-indigo-600" />
                Recent Gate Activity
              </Title>
              <Table 
                dataSource={recentScans} 
                columns={recentColumns} 
                rowKey="id" 
                pagination={{ pageSize: 5 }}
                locale={{ emptyText: 'No gate scans recorded yet today.' }}
              />
            </Card>

          </Col>

          {/* RIGHT: Students Currently Outside */}
          <Col lg={8} md={24} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white h-full">
              <Title level={4} className="mb-4 flex items-center gap-2">
                <Users size={20} className="text-purple-600" />
                Who is Outside?
              </Title>
              <List
                dataSource={outsideStudents}
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
                locale={{ emptyText: 'All students are inside.' }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default SecurityDashboard;
