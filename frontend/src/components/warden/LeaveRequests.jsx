import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Select, Divider, ConfigProvider, theme, Skeleton, Badge, 
  Tooltip, Tag, Table, Modal, Input, Empty, message
} from 'antd';
import { 
  Calendar, User, Clock, CheckCircle2, XCircle, 
  RefreshCw, Filter, ShieldCheck, ClipboardList, 
  Info, MessageSquare, UserCheck, Inbox
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/* ---------- 1. Specialized Skeletons ---------- */

const StatCardsSkeleton = () => (
  <Row gutter={[24, 24]}>
    {[...Array(4)].map((_, i) => (
      <Col xs={24} sm={12} lg={6} key={i}>
        <Card className="border-none shadow-sm rounded-2xl">
          <Skeleton loading active avatar={{ size: 'small', shape: 'square' }} paragraph={{ rows: 1, width: '60%' }} title={false} />
        </Card>
      </Col>
    ))}
  </Row>
);

const LeaveRequestSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden mt-8">
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Skeleton.Input active style={{ width: 250 }} />
        <Skeleton.Button active />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6 last:border-0">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '20%' }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      ))}
    </div>
  </Card>
);

const LeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaveRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await wardenAPI.getLeaveRequests(params);
      setLeaveRequests(response.data.data || []);
    } catch (error) {
      message.error('Session timeout or network error. Try again.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLeaveRequests(); }, [fetchLeaveRequests]);

  const confirmAction = async () => {
    if (!selectedLeave || !actionType) return;
    setActionLoading(true);
    try {
      await wardenAPI.approveLeave(selectedLeave.id, {
        status: actionType,
        remarks: remarks
      });
      message.success(`Leave request ${actionType === 'approved' ? 'Approved' : 'Rejected'}`);
      setShowModal(false);
      fetchLeaveRequests();
    } catch (error) {
      message.error('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig = {
    approved: { color: 'success', icon: <CheckCircle2 size={12} />, label: 'Approved' },
    rejected: { color: 'error', icon: <XCircle size={12} />, label: 'Rejected' },
    pending: { color: 'warning', icon: <Clock size={12} />, label: 'Pending Review' }
  };

  const columns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, r) => (
        <Space gap={3}>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <User size={18} />
          </div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{r.Student?.userName}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Roll: {r.Student?.roll_number || 'N/A'}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Leave Details',
      key: 'details',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Tag bordered={false} color="blue" className="rounded-lg text-[10px] font-bold uppercase m-0">
            {r.leave_type}
          </Tag>
          <Text className="text-xs text-slate-500 mt-1">
            {moment(r.from_date).format('DD MMM')} - {moment(r.to_date).format('DD MMM')} 
            <span className="ml-1 text-slate-300">
              ({moment(r.to_date).diff(moment(r.from_date), 'days') + 1}D)
            </span>
          </Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s) => (
        <Tag 
          icon={statusConfig[s]?.icon} 
          color={statusConfig[s]?.color} 
          className="rounded-full border-none px-3 font-bold uppercase text-[9px]"
        >
          {statusConfig[s]?.label || s}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'action',
      align: 'right',
      render: (_, r) => (
        r.status === 'pending' ? (
          <Space>
            <Button 
              type="primary" 
              size="small" 
              className="rounded-lg font-bold text-[10px] bg-emerald-600 border-none shadow-sm h-8"
              onClick={() => { setSelectedLeave(r); setActionType('approved'); setShowModal(true); }}
            >
              APPROVE
            </Button>
            <Button 
              danger 
              size="small" 
              className="rounded-lg font-bold text-[10px] border-none bg-rose-50 h-8"
              onClick={() => { setSelectedLeave(r); setActionType('rejected'); setShowModal(true); }}
            >
              REJECT
            </Button>
          </Space>
        ) : (
          <Tooltip title={r.remarks || 'No remarks'}>
            <Button icon={<MessageSquare size={14}/>} type="text" className="text-slate-300" />
          </Tooltip>
        )
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Leave Requests</Title>
              <Text type="secondary">Manage and approve student leave permissions</Text>
            </div>
          </div>
          <Button 
            icon={<RefreshCw size={16}/>} 
            onClick={fetchLeaveRequests} 
            className="rounded-xl h-11 px-6 font-bold shadow-sm"
          >
            Refresh List
          </Button>
        </div>

        {/* Statistics Row */}
        {loading ? (
          <StatCardsSkeleton />
        ) : (
          <Row gutter={[24, 24]}>
            {[
              { label: 'Total Requests', val: leaveRequests.length, icon: ClipboardList, color: 'text-blue-500' },
              { label: 'Pending Review', val: leaveRequests.filter(l => l.status === 'pending').length, icon: Clock, color: 'text-amber-500' },
              { label: 'Approved', val: leaveRequests.filter(l => l.status === 'approved').length, icon: UserCheck, color: 'text-emerald-500' },
              { label: 'Rejected', val: leaveRequests.filter(l => l.status === 'rejected').length, icon: XCircle, color: 'text-rose-500' },
            ].map((stat, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <Card className="border-none shadow-sm rounded-2xl">
                  <Statistic 
                    title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</span>} 
                    value={stat.val} 
                    prefix={<stat.icon size={18} className={`${stat.color} mr-2`} />} 
                    valueStyle={{ fontWeight: 800 }} 
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Filter Hub */}
        <Card className="border-none shadow-sm rounded-2xl mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
              <Filter size={18} className="text-slate-300" />
              <Select 
                value={statusFilter} 
                onChange={setStatusFilter} 
                bordered={false} 
                className="w-full font-medium"
              >
                <Select.Option value="all">Display All Requests</Select.Option>
                <Select.Option value="pending">Pending Review</Select.Option>
                <Select.Option value="approved">Approved Requests</Select.Option>
                <Select.Option value="rejected">Rejected Requests</Select.Option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Ledger */}
        {loading ? (
          <LeaveRequestSkeleton />
        ) : leaveRequests.length > 0 ? (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table 
              dataSource={leaveRequests} 
              columns={columns} 
              rowKey="id" 
              pagination={{ pageSize: 10, position: ['bottomCenter'] }} 
            />
          </Card>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[32px] shadow-sm">
            <Empty 
              image={<div className="bg-slate-50 p-8 rounded-full mb-4"><Inbox size={64} className="text-slate-200" /></div>} 
              description={<Text className="text-slate-400 block">No leave requests found in the current audit.</Text>} 
            />
          </div>
        )}

        {/* Leave Approval Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ShieldCheck size={20}/> Leave Approval</div>}
          open={showModal}
          onCancel={() => setShowModal(false)}
          footer={[
            <Button key="back" onClick={() => setShowModal(false)} className="rounded-xl h-11 px-6">Cancel</Button>,
            <Button 
              key="submit" 
              type="primary" 
              danger={actionType === 'rejected'}
              loading={actionLoading} 
              onClick={confirmAction}
              className={`rounded-xl h-11 px-8 font-bold shadow-lg ${actionType === 'approved' ? 'shadow-emerald-100 bg-emerald-600' : 'shadow-rose-100 bg-rose-600'}`}
            >
              Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
            </Button>
          ]}
          className="rounded-[32px]"
          width={500}
        >
          {selectedLeave && (
            <div className="mt-6 space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-2">
                  Leave Details
                </Text>
                <div className="flex items-center justify-between mb-2">
                  <Text strong className="text-lg">{selectedLeave.Student?.userName}</Text>
                  <Tag color="blue" className="m-0 rounded-lg">{selectedLeave.leave_type}</Tag>
                </div>
                <Paragraph className="text-xs text-slate-500 m-0 italic bg-white p-3 rounded-xl border border-slate-100">
                  "{selectedLeave.reason}"
                </Paragraph>
              </div>

              <div className="space-y-3 px-1">
                <Text strong className="text-[11px] uppercase text-slate-400 block mb-2">
                  Warden Remarks
                </Text>
                <TextArea 
                  rows={4} 
                  className="rounded-2xl p-4 border-slate-200" 
                  placeholder={actionType === 'approved' 
                    ? "Add any notes (e.g. contact parents)..." 
                    : "Reason for rejection..."}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default LeaveRequests;
