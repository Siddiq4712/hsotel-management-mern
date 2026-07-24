import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Tag, Button, Space, Input, Modal, message, 
  Typography, ConfigProvider, theme, Tabs, List, Avatar
} from 'antd';
import { 
  CheckCircle, XCircle, Clock, ExternalLink, MessageSquare, 
  AlertTriangle, RefreshCw, Eye, Search
} from 'lucide-react';
import { outpassAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

const OutpassApproval = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Modal actions
  const [selectedOutpass, setSelectedOutpass] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState('approve'); // approve or reject
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOutpasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await outpassAPI.getWardenOutpasses({ 
        status: activeTab,
        search: search.trim() || undefined
      });
      setLogs(res.data.data || []);
    } catch (error) {
      message.error('Failed to load outpass requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchOutpasses();
  }, [fetchOutpasses]);

  const openActionModal = (record, type) => {
    setSelectedOutpass(record);
    setActionType(type);
    setRemarks('');
    setModalVisible(true);
  };

  const handleAction = async () => {
    if (!selectedOutpass) return;
    setActionLoading(true);
    try {
      if (actionType === 'approve') {
        await outpassAPI.approveOutpass(selectedOutpass.id, remarks);
        message.success('Outpass request approved successfully');
      } else {
        await outpassAPI.rejectOutpass(selectedOutpass.id, remarks);
        message.error('Outpass request rejected');
      }
      setModalVisible(false);
      fetchOutpasses();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to complete action');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'gold', text: 'PENDING', icon: <Clock size={12} /> },
      approved: { color: 'blue', text: 'APPROVED', icon: <CheckCircle size={12} /> },
      rejected: { color: 'magenta', text: 'REJECTED', icon: <XCircle size={12} /> },
      cancelled: { color: 'default', text: 'CANCELLED', icon: <XCircle size={12} /> },
      outside: { color: 'purple', text: 'OUTSIDE', icon: <ExternalLink size={12} /> },
      completed: { color: 'green', text: 'COMPLETED', icon: <CheckCircle size={12} /> },
      expired: { color: 'red', text: 'EXPIRED', icon: <AlertTriangle size={12} /> },
      late_return: { color: 'red', text: 'LATE RETURN', icon: <AlertTriangle size={12} /> }
    };

    const details = statusMap[status] || { color: 'default', text: status.toUpperCase() };
    return (
      <Tag color={details.color} className="flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border-none">
        {details.icon}
        {details.text}
      </Tag>
    );
  };

  const pendingColumns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, record) => (
        <Space size="middle">
          <Avatar src={record.Student?.profile_picture} alt="profile" size={40} className="border border-slate-200" />
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-800">{record.Student?.userName}</Text>
            <Text type="secondary" className="text-xs">Roll: {record.Student?.roll_number}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Reason / Purpose',
      key: 'purpose',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="text-slate-700 font-medium">{record.purpose}</Text>
          <Text type="secondary" className="text-xs">To: {record.destination}</Text>
        </Space>
      )
    },
    {
      title: 'Exit Date/Time',
      dataIndex: 'from_date',
      key: 'from_date',
      render: (date) => moment(date).format('lll')
    },
    {
      title: 'Return Expectation',
      dataIndex: 'to_date',
      key: 'to_date',
      render: (date) => moment(date).format('lll')
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            className="bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1"
            onClick={() => openActionModal(record, 'approve')}
          >
            Approve
          </Button>
          <Button 
            danger 
            size="small" 
            className="rounded-lg flex items-center gap-1"
            onClick={() => openActionModal(record, 'reject')}
          >
            Reject
          </Button>
        </Space>
      )
    }
  ];

  const historyColumns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, record) => (
        <Space size="middle">
          <Avatar src={record.Student?.profile_picture} alt="profile" size={40} className="border border-slate-200" />
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-800">{record.Student?.userName}</Text>
            <Text type="secondary" className="text-xs">Roll: {record.Student?.roll_number}</Text>
          </Space>
        </Space>
      )
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
      title: 'Planned Duration',
      key: 'duration',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs text-slate-600">From: {moment(record.from_date).format('lll')}</Text>
          <Text className="text-xs text-slate-600">Until: {moment(record.to_date).format('lll')}</Text>
        </Space>
      )
    },
    {
      title: 'Gate Registry',
      key: 'gate',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.exit_time && <Text className="text-[11px] text-indigo-600">Exit: {moment(record.exit_time).format('lll')}</Text>}
          {record.return_time && <Text className="text-[11px] text-emerald-600">Return: {moment(record.return_time).format('lll')}</Text>}
          {!record.exit_time && <Text type="secondary" className="text-xs italic">Not left yet</Text>}
        </Space>
      )
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (txt) => txt ? <Text className="text-slate-600 italic text-xs">{txt}</Text> : <Text type="secondary" className="text-xs">-</Text>
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
              <Clock size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600 }}>Outpass Requests Board</Title>
              <Text type="secondary">Review, approve, and audit hostel student gate pass requests</Text>
            </div>
          </div>
          <Button 
            icon={<RefreshCw size={16} />} 
            onClick={fetchOutpasses} 
            loading={loading}
            className="h-11 rounded-xl flex items-center gap-2 border-slate-200"
          >
            Sync Board
          </Button>
        </div>

        {/* Content Tabs */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden p-6 bg-white">
          <Tabs 
            activeKey={activeTab} 
            onChange={(key) => setActiveTab(key)}
            tabBarExtraContent={
              <Input 
                placeholder="Search name or roll..." 
                prefix={<Search size={16} className="text-slate-400 mr-2" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 h-10 rounded-xl"
              />
            }
            items={[
              {
                key: 'pending',
                label: 'Pending Requests',
                children: (
                  <Table 
                    columns={pendingColumns} 
                    dataSource={logs} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                )
              },
              {
                key: 'approved',
                label: 'Approved Permits',
                children: (
                  <Table 
                    columns={historyColumns} 
                    dataSource={logs} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                )
              },
              {
                key: 'outside',
                label: 'Currently Outside',
                children: (
                  <Table 
                    columns={historyColumns} 
                    dataSource={logs} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                )
              },
              {
                key: 'all',
                label: 'All Outpasses',
                children: (
                  <Table 
                    columns={historyColumns} 
                    dataSource={logs} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                )
              }
            ]}
          />
        </Card>

        {/* Action Remarks Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 mb-3">
              {actionType === 'approve' ? (
                <CheckCircle className="text-blue-500" size={22} />
              ) : (
                <XCircle className="text-rose-500" size={22} />
              )}
              <Text strong className="text-lg">
                {actionType === 'approve' ? 'Approve Outpass Permit' : 'Reject Outpass Permit'}
              </Text>
            </div>
          }
          open={modalVisible}
          onOk={handleAction}
          onCancel={() => setModalVisible(false)}
          confirmLoading={actionLoading}
          okText={actionType === 'approve' ? 'Approve' : 'Reject'}
          okButtonProps={{ 
            danger: actionType === 'reject',
            className: actionType === 'approve' ? 'bg-blue-600 hover:bg-blue-700' : ''
          }}
          className="rounded-2xl overflow-hidden"
        >
          <div className="space-y-4 py-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <Space direction="vertical" size={2}>
                <Text strong className="text-slate-800">{selectedOutpass?.Student?.userName}</Text>
                <Text type="secondary" className="text-xs">Destination: {selectedOutpass?.destination}</Text>
                <Text type="secondary" className="text-xs">Purpose: {selectedOutpass?.purpose}</Text>
              </Space>
            </div>

            <Space direction="vertical" size={4} className="w-full">
              <Text strong className="text-slate-700 flex items-center gap-1.5">
                <MessageSquare size={16} />
                Remarks (Optional)
              </Text>
              <Input.TextArea 
                rows={3} 
                placeholder="Enter remarks, instructions or reasons here..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="rounded-xl"
              />
            </Space>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default OutpassApproval;
