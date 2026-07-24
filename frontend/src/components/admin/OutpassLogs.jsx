import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Tag, Input, Select, Button, Space, Typography, 
  Switch, message, ConfigProvider, theme, Row, Col, Statistic, Tooltip
} from 'antd';
import { 
  Search, Shield, CheckCircle, XCircle, Clock, AlertTriangle, 
  ExternalLink, Settings, ListFilter, Users, RefreshCw
} from 'lucide-react';
import { outpassAPI, adminAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const OutpassLogs = () => {
  const [logs, setLogs] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, outside: 0, late: 0 });
  const [filters, setFilters] = useState({ hostel_id: 'all', status: 'all', search: '' });

  // Settings
  const [parentApprovalSettings, setParentApprovalSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  const fetchHostels = async () => {
    try {
      const res = await adminAPI.getHostels();
      setHostels(res.data.data || []);
      
      // Initialize parent approval settings status
      const settings = {};
      (res.data.data || []).forEach(h => {
        settings[h.id] = h.parent_approval_required;
      });
      setParentApprovalSettings(settings);
    } catch (error) {
      console.error('Error fetching hostels:', error);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await outpassAPI.getAllOutpasses(filters);
      setLogs(res.data.data || []);

      // Calculate stats locally
      const data = res.data.data || [];
      setStats({
        total: data.length,
        pending: data.filter(x => x.status === 'pending').length,
        outside: data.filter(x => x.status === 'outside').length,
        late: data.filter(x => x.status === 'late_return').length,
      });
    } catch (error) {
      message.error('Failed to load outpass logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleToggleParentApproval = async (hostelId, checked) => {
    setSettingsLoading(true);
    try {
      await outpassAPI.toggleParentApproval({ hostelId, parentApprovalRequired: checked });
      setParentApprovalSettings(prev => ({ ...prev, [hostelId]: checked }));
      message.success('Parent outpass approval setting updated.');
    } catch (error) {
      message.error('Failed to update outpass configuration');
    } finally {
      setSettingsLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'gold', text: 'PENDING WARDEN', icon: <Clock size={12} /> },
      approved: { color: 'blue', text: 'APPROVED', icon: <CheckCircle size={12} /> },
      rejected: { color: 'magenta', text: 'REJECTED', icon: <XCircle size={12} /> },
      cancelled: { color: 'default', text: 'CANCELLED', icon: <XCircle size={12} /> },
      outside: { color: 'purple', text: 'OUTSIDE HOSTEL', icon: <ExternalLink size={12} /> },
      completed: { color: 'green', text: 'COMPLETED', icon: <CheckCircle size={12} /> },
      expired: { color: 'red', text: 'EXPIRED', icon: <AlertTriangle size={12} /> },
      late_return: { color: 'red', text: 'LATE RETURN', icon: <AlertTriangle size={12} /> }
    };

    const details = statusMap[status] || { color: 'default', text: status.toUpperCase() };
    return (
      <Tag color={details.color} className="flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide uppercase border-none">
        {details.icon}
        {details.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Student Detail',
      key: 'student',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-800">{record.Student?.userName}</Text>
          <Text type="secondary" className="text-xs">Roll No: {record.Student?.roll_number}</Text>
        </Space>
      )
    },
    {
      title: 'Hostel Unit',
      dataIndex: ['Hostel', 'name'],
      key: 'hostel'
    },
    {
      title: 'Outpass Scope',
      key: 'scope',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="text-slate-700 font-medium">{record.purpose}</Text>
          <Text type="secondary" className="text-xs">To: {record.destination}</Text>
        </Space>
      )
    },
    {
      title: 'Schedule (Planned)',
      key: 'schedule',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs text-slate-600">From: {moment(record.from_date).format('lll')}</Text>
          <Text className="text-xs text-slate-600">Until: {moment(record.to_date).format('lll')}</Text>
        </Space>
      )
    },
    {
      title: 'Gate Logs',
      key: 'gateLogs',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.exit_time && <Text className="text-[11px] text-indigo-600">Out: {moment(record.exit_time).format('lll')}</Text>}
          {record.return_time && <Text className="text-[11px] text-emerald-600">In: {moment(record.return_time).format('lll')}</Text>}
          {!record.exit_time && !record.return_time && <Text type="secondary" className="text-xs italic">No activity yet</Text>}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#3b82f6', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
              <Shield size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600 }}>Outpass Audit Ledger</Title>
              <Text type="secondary">Centralized authority oversight for student exit permits and gate tracking</Text>
            </div>
          </div>
          <Button 
            icon={<RefreshCw size={16} />} 
            onClick={fetchLogs} 
            loading={loading}
            className="h-11 rounded-xl flex items-center gap-2 border-slate-200"
          >
            Refresh Log
          </Button>
        </div>

        {/* Stats */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col lg={6} md={12} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-2 bg-white">
              <Statistic title={<Text className="text-slate-500 text-sm">Total Applications</Text>} value={stats.total} prefix={<Users size={20} className="text-slate-400 mr-2" />} />
            </Card>
          </Col>
          <Col lg={6} md={12} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-2 bg-white">
              <Statistic title={<Text className="text-slate-500 text-sm">Pending Review</Text>} value={stats.pending} valueStyle={{ color: '#d97706' }} prefix={<Clock size={20} className="text-amber-500 mr-2" />} />
            </Card>
          </Col>
          <Col lg={6} md={12} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-2 bg-white">
              <Statistic title={<Text className="text-slate-500 text-sm">Currently Outside</Text>} value={stats.outside} valueStyle={{ color: '#7c3aed' }} prefix={<ExternalLink size={20} className="text-violet-500 mr-2" />} />
            </Card>
          </Col>
          <Col lg={6} md={12} xs={24}>
            <Card className="border-none shadow-sm rounded-3xl p-2 bg-white">
              <Statistic title={<Text className="text-slate-500 text-sm">Late Returns</Text>} value={stats.late} valueStyle={{ color: '#dc2626' }} prefix={<AlertTriangle size={20} className="text-red-500 mr-2" />} />
            </Card>
          </Col>
        </Row>

        <Row gutter={24}>
          {/* Main Logs Table */}
          <Col lg={17} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden p-6 bg-white">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <ListFilter size={20} className="text-blue-600" />
                Filter Logs
              </Title>
              
              <Row gutter={16} className="mb-6">
                <Col span={8}>
                  <Input 
                    placeholder="Search by student name or roll..." 
                    prefix={<Search size={16} className="text-slate-400 mr-2" />}
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="h-11 rounded-xl"
                  />
                </Col>
                <Col span={8}>
                  <Select 
                    placeholder="Select Hostel"
                    className="h-11 w-full"
                    value={filters.hostel_id}
                    onChange={(val) => setFilters(prev => ({ ...prev, hostel_id: val }))}
                  >
                    <Option value="all">All Hostels</Option>
                    {hostels.map(h => (
                      <Option key={h.id} value={h.id}>{h.name}</Option>
                    ))}
                  </Select>
                </Col>
                <Col span={8}>
                  <Select 
                    placeholder="Filter Status" 
                    className="h-11 w-full"
                    value={filters.status}
                    onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                  >
                    <Option value="all">All Statuses</Option>
                    <Option value="pending">Pending</Option>
                    <Option value="approved">Approved</Option>
                    <Option value="outside">Outside</Option>
                    <Option value="completed">Completed</Option>
                    <Option value="late_return">Late Return</Option>
                    <Option value="rejected">Rejected</Option>
                    <Option value="cancelled">Cancelled</Option>
                    <Option value="expired">Expired</Option>
                  </Select>
                </Col>
              </Row>

              <Table 
                columns={columns}
                dataSource={logs}
                rowKey="id"
                loading={loading}
                className="custom-table"
                pagination={{ pageSize: 10, showSizeChanger: false }}
              />
            </Card>
          </Col>

          {/* Settings Sidebar */}
          <Col lg={7} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Workflow Protocol
              </Title>
              <Paragraph className="text-slate-500 text-xs mb-6">
                Configure additional authorization requirements for student outpass requests per hostel unit.
              </Paragraph>

              <div className="space-y-4">
                {hostels.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <Text strong className="text-sm text-slate-800">{h.name}</Text>
                      <Text type="secondary" className="text-[11px]">Require parent approval first</Text>
                    </div>
                    <Switch 
                      checked={parentApprovalSettings[h.id] || false}
                      loading={settingsLoading}
                      onChange={(checked) => handleToggleParentApproval(h.id, checked)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default OutpassLogs;
