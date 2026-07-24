import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Avatar, Typography, Row, Col, Select, List, Table,
  Tag, Progress, Badge, Tabs, Button, Input, Form, message,
  ConfigProvider, theme, Space, Statistic, Divider
} from 'antd';
import {
  User, Building, Calendar, IndianRupee, Mail,
  Bell, FileText, Lock, Clock, LogOut, CheckCircle
} from 'lucide-react';
import { parentAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ParentDashboard = () => {
  const { logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Self Profile & Password State
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await parentAPI.getStudents();
      setStudents(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedStudentId(res.data.data[0].userId);
      }
    } catch (err) {
      message.error('Failed to load linked students');
    }
  };

  const fetchDashboard = useCallback(async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      const res = await parentAPI.getStudentDashboard(selectedStudentId);
      setDashboardData(res.data.data);
    } catch (err) {
      message.error('Failed to sync student data');
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  const fetchNotifications = async () => {
    try {
      const res = await parentAPI.getNotifications();
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchNotifications();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleUpdateProfile = async (values) => {
    setProfileLoading(true);
    try {
      await parentAPI.updateProfile(values);
      message.success('Profile details updated successfully.');
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...localUser, userName: values.username }));
    } catch (err) {
      message.error(err.response?.data?.message || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      });
      message.success('Password changed successfully.');
      passwordForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await parentAPI.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error(err);
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

  const billColumns = [
    { title: 'Billing Period', key: 'period', render: (_, r) => <Text className="font-semibold">{r.month} {r.year}</Text> },
    { title: 'Total Amount', dataIndex: 'total_amount', key: 'amount', render: (val) => <Text className="text-slate-700 font-bold">₹{val}</Text> },
    { title: 'Payment Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'paid' ? 'green' : 'red'} className="border-none font-semibold px-2 py-0.5 rounded-full">{s.toUpperCase()}</Tag> }
  ];

  const feeColumns = [
    { title: 'Fee Title', dataIndex: 'title', key: 'title', render: (val) => <Text className="font-semibold text-slate-700">{val}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val) => <Text className="text-slate-700 font-bold">₹{val}</Text> },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (d) => <Text className="text-slate-500">{moment(d).format('LL')}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'paid' ? 'green' : 'red'} className="border-none font-semibold px-2 py-0.5 rounded-full">{s.toUpperCase()}</Tag> }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#3b82f6', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">

        {/* Top Header Card */}
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
                <User size={24} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>Parent Dashboard</Title>
                <Text type="secondary" className="text-sm">Real-time status updates and monitor hostel records</Text>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center min-w-[320px]">
              <Select
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                className="flex-1 h-11"
                placeholder="Select Student"
              >
                {students.map(s => (
                  <Option key={s.userId} value={s.userId}>{s.userName} ({s.roll_number})</Option>
                ))}
              </Select>
              <Button icon={<LogOut size={16} />} onClick={logout} danger className="h-11 rounded-xl flex items-center justify-center gap-2 font-semibold">
                Sign Out
              </Button>
            </div>
          </div>
        </Card>

        <Row gutter={[24, 24]}>
          {/* LEFT SIDE COLUMN */}
          <Col lg={17} md={24} xs={24} className="space-y-6">

            {/* Student profile Summary Card */}
            {dashboardData && (
              <Card className="border-none shadow-sm rounded-3xl p-6 bg-white overflow-hidden relative">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <Avatar
                    src={dashboardData.student?.profile_picture}
                    size={80}
                    icon={<User />}
                    className="border-2 border-slate-100 shadow-sm shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <Title level={4} style={{ margin: 0, fontWeight: 700 }}>{dashboardData.student?.userName}</Title>
                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-slate-500">
                      <Text type="secondary">Roll No: <Text className="font-semibold text-slate-700">{dashboardData.student?.roll_number}</Text></Text>
                      <Text type="secondary">•</Text>
                      <Text type="secondary">Email: <Text className="font-semibold text-slate-700">{dashboardData.student?.userMail}</Text></Text>
                    </div>
                  </div>
                  <div className="sm:border-l border-slate-100 sm:pl-6 shrink-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-blue-500" />
                      <Text strong className="text-slate-800">{dashboardData.student?.Hostel?.name || 'Assigned Hostel'}</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-500" />
                      <Text className="text-slate-700">Room: {dashboardData.room ? `${dashboardData.room.room_number} (Floor ${dashboardData.room.floor})` : 'Not Assigned'}</Text>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Attendance & Finance Stats Grid */}
            {dashboardData && (
              <Row gutter={[24, 24]}>
                <Col md={12} xs={24}>
                  <Card className="border-none shadow-sm rounded-3xl p-6 bg-white h-full flex flex-col justify-between">
                    <Title level={5} className="mb-4 flex items-center gap-2">
                      <Calendar size={18} className="text-blue-600" />
                      Attendance Summary
                    </Title>
                    <div className="flex items-center justify-between gap-6 mt-2">
                      <Progress
                        type="circle"
                        percent={dashboardData.attendanceSummary.total ? Math.round((dashboardData.attendanceSummary.present / dashboardData.attendanceSummary.total) * 100) : 0}
                        width={84}
                        strokeColor="#3b82f6"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-sm">
                          <Text type="secondary">Total Days:</Text>
                          <Text strong className="text-slate-700">{dashboardData.attendanceSummary.total}</Text>
                        </div>
                        <div className="flex justify-between text-sm">
                          <Text type="secondary">Present:</Text>
                          <Text strong className="text-emerald-600">{dashboardData.attendanceSummary.present}</Text>
                        </div>
                        <div className="flex justify-between text-sm">
                          <Text type="secondary">Absent:</Text>
                          <Text strong className="text-rose-600">{dashboardData.attendanceSummary.absent}</Text>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>

                <Col md={12} xs={24}>
                  <Card className="border-none shadow-sm rounded-3xl p-6 bg-white h-full flex flex-col justify-between">
                    <Title level={5} className="mb-4 flex items-center gap-2">
                      <IndianRupee size={18} className="text-blue-600" />
                      Financial Standing
                    </Title>
                    <div className="space-y-3 mt-2">
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <Text className="text-slate-500 font-medium">Pending Hostel Fees:</Text>
                        <Text className="text-rose-600 font-bold text-lg">
                          ₹{dashboardData.fees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + parseFloat(f.amount), 0).toFixed(2)}
                        </Text>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <Text className="text-slate-500 font-medium">Pending Mess Bills:</Text>
                        <Text className="text-rose-600 font-bold text-lg">
                          ₹{dashboardData.messBills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + parseFloat(b.total_amount), 0).toFixed(2)}
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Main Tabs Data Section */}
            {dashboardData && (
              <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
                <Tabs defaultActiveKey="outpass" items={[
                  {
                    key: 'outpass',
                    label: 'Outpass Log',
                    children: (
                      <Table
                        dataSource={dashboardData.outpasses}
                        columns={[
                          { title: 'Outpass Scope', key: 'dest', render: (_, r) => <Space direction="vertical" size={0}><Text strong className="text-slate-700">{r.purpose}</Text><Text type="secondary" className="text-xs">To: {r.destination}</Text></Space> },
                          { title: 'Expect Return', dataIndex: 'to_date', key: 'to', render: (d) => moment(d).format('lll') },
                          { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => getStatusTag(s) }
                        ]}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                      />
                    )
                  },
                  {
                    key: 'leave',
                    label: 'Leave Requests',
                    children: (
                      <Table
                        dataSource={dashboardData.leaves}
                        columns={[
                          { title: 'Leave Reason', key: 'scope', render: (_, r) => <Space direction="vertical" size={0}><Text strong className="text-slate-700 capitalize">{r.leave_type}</Text><Text type="secondary" className="text-xs">{r.reason}</Text></Space> },
                          { title: 'Period', key: 'period', render: (_, r) => `${moment(r.from_date).format('ll')} - ${moment(r.to_date).format('ll')}` },
                          { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'approved' ? 'green' : s === 'pending' ? 'gold' : 'red'} className="border-none font-semibold px-2 py-0.5 rounded-full">{s.toUpperCase()}</Tag> }
                        ]}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                      />
                    )
                  },
                  {
                    key: 'fees',
                    label: 'Hostel Fees',
                    children: <Table dataSource={dashboardData.fees} columns={feeColumns} rowKey="id" pagination={{ pageSize: 5 }} />
                  },
                  {
                    key: 'mess',
                    label: 'Mess Bills',
                    children: <Table dataSource={dashboardData.messBills} columns={billColumns} rowKey="id" pagination={{ pageSize: 5 }} />
                  }
                ]} />
              </Card>
            )}

          </Col>

          {/* RIGHT SIDE COLUMN */}
          <Col lg={7} md={24} xs={24} className="space-y-6">

            {/* Notices Panel */}
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
              <Title level={5} className="mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Hostel Announcements
              </Title>
              <List
                dataSource={dashboardData?.notices || []}
                renderItem={item => (
                  <List.Item className="flex flex-col items-start pb-4 border-b border-slate-50 last:border-none">
                    <Text strong className="text-slate-800 text-sm">{item.title}</Text>
                    <Text type="secondary" className="text-xs mt-1 leading-relaxed">{item.content}</Text>
                    <Text type="secondary" className="text-[10px] mt-2 block w-full text-right">{moment(item.createdAt).format('ll')}</Text>
                  </List.Item>
                )}
                locale={{ emptyText: 'No announcements posted.' }}
              />
            </Card>

            {/* In-app Notifications Panel */}
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
              <Title level={5} className="mb-4 flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                Live Notification Feed
              </Title>
              <List
                dataSource={notifications}
                renderItem={item => (
                  <List.Item
                    className="flex justify-between items-center py-3 border-b border-slate-50 last:border-none"
                    actions={[
                      item.status === 'unread' && (
                        <Button type="link" size="small" onClick={() => handleMarkAsRead(item.id)} className="px-0">
                          Mark read
                        </Button>
                      )
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={6}>
                          {item.status === 'unread' && <Badge status="processing" />}
                          <Text strong className={item.status === 'unread' ? 'text-blue-700' : 'text-slate-500'}>{item.title}</Text>
                        </Space>
                      }
                      description={<Text type="secondary" className="text-xs block mt-0.5">{item.message}</Text>}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No alerts received.' }}
              />
            </Card>

            {/* Profile & Settings Self-Service */}
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
              <Tabs defaultActiveKey="profile" size="small" items={[
                {
                  key: 'profile',
                  label: 'Edit Profile',
                  children: (
                    <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile} initialValues={{ username: JSON.parse(localStorage.getItem('user') || '{}').username, email: JSON.parse(localStorage.getItem('user') || '{}').email }}>
                      <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                        <Input className="h-10 rounded-xl" />
                      </Form.Item>
                      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input className="h-10 rounded-xl" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={profileLoading} className="w-full h-10 rounded-xl font-semibold">
                        Update Details
                      </Button>
                    </Form>
                  )
                },
                {
                  key: 'password',
                  label: 'Security',
                  children: (
                    <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                      <Form.Item name="oldPassword" label="Current Password" rules={[{ required: true }]}>
                        <Input.Password className="h-10 rounded-xl" />
                      </Form.Item>
                      <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6 }]}>
                        <Input.Password className="h-10 rounded-xl" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={passwordLoading} className="w-full h-10 rounded-xl font-semibold">
                        Change Password
                      </Button>
                    </Form>
                  )
                }
              ]} />
            </Card>

          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default ParentDashboard;
