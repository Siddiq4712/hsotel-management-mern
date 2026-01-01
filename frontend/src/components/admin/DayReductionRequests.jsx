import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, Tag, Button, Select, Input, Modal, Typography, 
  Card, Row, Col, Statistic, Space, Skeleton, Empty, message, ConfigProvider, theme,Divider 
} from 'antd';
import { 
  CalendarDays, User, Home, Clock, CheckCircle2, 
  XCircle, Info, RefreshCw, Filter, Search, ClipboardList, Inbox, Gavel, Check, X, ShieldCheck
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- Specialized Skeletons for Precise UI Matching ---
const StatsSkeleton = () => (
  <Row gutter={[24, 24]} className="mb-8">
    {[...Array(4)].map((_, i) => (
      <Col xs={24} sm={12} lg={6} key={i}>
        <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white">
          <div className="flex items-center gap-4">
            <Skeleton.Button active style={{ width: 44, height: 44, borderRadius: 12 }} />
            <div className="space-y-2 flex-1">
              <Skeleton.Input active size="small" style={{ width: '50%', height: 10 }} />
              <Skeleton.Input active size="small" style={{ width: '30%', height: 20 }} />
            </div>
          </div>
        </Card>
      </Col>
    ))}
  </Row>
);

const TableSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-6 p-6 border-b border-slate-50 last:border-0">
        <Skeleton.Avatar active shape="circle" size="large" />
        <div className="flex-1"><Skeleton active title={false} paragraph={{ rows: 1, width: '100%' }} /></div>
        <Skeleton.Input active style={{ width: 100 }} />
        <Skeleton.Button active style={{ width: 80 }} />
      </div>
    ))}
  </Card>
);

const statusConfig = {
  pending_admin: { color: 'orange', label: 'Pending Review', icon: <Clock size={12} /> },
  approved_by_admin: { color: 'blue', label: 'Admin Authorized', icon: <ShieldCheck size={12} /> },
  rejected_by_admin: { color: 'red', label: 'Admin Declined', icon: <XCircle size={12} /> },
  approved_by_warden: { color: 'green', label: 'Final Approval', icon: <CheckCircle2 size={12} /> },
  rejected_by_warden: { color: 'red', label: 'Warden Declined', icon: <XCircle size={12} /> },
};

const DayReductionRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'pending_admin' });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getDayReductionRequests(filters);
      setRequests(response.data.data || []);
    } catch (error) {
      message.error('Registry sync failed.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusUpdate = async (action) => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await adminAPI.updateDayReductionRequestStatus(selectedRequest.id, {
        action,
        admin_remarks: adminRemarks
      });
      message.success(`Protocol updated: Request ${action === 'approve' ? 'authorized' : 'declined'}`);
      fetchRequests();
      setIsModalVisible(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Update failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredData = useMemo(() => {
    return requests.filter(req => 
      req.Student?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.Hostel?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  const columns = [
    {
      title: 'Student Identity',
      key: 'student',
      render: (_, record) => (
        <Space gap={3}>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><User size={18} /></div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700" style={{ fontWeight: 500 }}>{record.Student?.username || 'Unknown'}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {record.Hostel?.name || 'N/A'}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Requested Period',
      key: 'dates',
      render: (_, record) => (
        <div className="flex flex-col">
          <Text className="text-xs font-medium" style={{ fontWeight: 400 }}>
            {moment(record.from_date).format('DD MMM')} — {moment(record.to_date).format('DD MMM, YYYY')}
          </Text>
          <Text className="text-[10px] text-slate-400 uppercase font-bold">
            {moment(record.to_date).diff(moment(record.from_date), 'days') + 1} Total Days
          </Text>
        </div>
      ),
    },
    {
      title: 'Status Protocol',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          icon={statusConfig[status]?.icon} 
          color={statusConfig[status]?.color}
          className="rounded-full border-none px-3 font-bold uppercase text-[9px]"
        >
          {statusConfig[status]?.label || status}
        </Tag>
      ),
    },
    {
      title: 'Control',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        record.status === 'pending_admin' ? (
          <Button 
            type="primary" 
            ghost
            size="small" 
            className="rounded-lg font-medium text-[10px] border-blue-200"
            onClick={() => { setSelectedRequest(record); setIsModalVisible(true); }}
          >
            REVIEW
          </Button>
        ) : (
          <Button type="text" icon={<ClipboardList size={14}/>} className="text-slate-300" onClick={() => { setSelectedRequest(record); setIsModalVisible(true); }} />
        )
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <CalendarDays className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 400 }}>Day Reduction Audit</Title>
              <Text type="secondary" style={{ fontWeight: 300 }}>Administrative review of mess bill reduction protocols</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchRequests} className="rounded-xl h-11 px-6 font-bold shadow-sm">Sync Portal</Button>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            {/* Quick Metrics (Non-Bold) */}
            <Row gutter={[20, 20]} className="mb-8">
              {[
                { label: 'Total Volume', val: requests.length, icon: ClipboardList, bg: 'bg-indigo-50', color: 'text-indigo-500' },
                { label: 'Pending Review', val: requests.filter(r => r.status === 'pending_admin').length, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-500' },
                { label: 'Admin Approved', val: requests.filter(r => r.status === 'approved_by_admin').length, icon: ShieldCheck, bg: 'bg-blue-50', color: 'text-blue-500' },
                { label: 'System Finalized', val: requests.filter(r => r.status === 'approved_by_warden').length, icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-500' },
              ].map((stat, i) => (
                <Col xs={24} sm={12} lg={6} key={i}>
                  <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white transition-all hover:bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                        <stat.icon size={20} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <Text className="text-[11px] uppercase text-slate-400 tracking-wider" style={{ fontWeight: 400 }}>{stat.label}</Text>
                        <Text className="text-2xl text-slate-700" style={{ fontWeight: 500, lineHeight: 1.2 }}>{stat.val}</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Filter Hub */}
            <Card className="border-none shadow-sm rounded-2xl mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input 
                    placeholder="Search Student or Hostel..." 
                    bordered={false} 
                    className="w-full font-medium"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1 px-3 rounded-xl border border-slate-100">
                  <Filter size={16} className="text-slate-400" />
                  <Select
                    value={filters.status}
                    onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                    bordered={false}
                    className="w-48 font-medium"
                  >
                    <Option value="all">All Records</Option>
                    <Option value="pending_admin">Awaiting Admin</Option>
                    <Option value="approved_by_admin">Admin Approved</Option>
                    <Option value="approved_by_warden">Finalized (Warden)</Option>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Data Ledger */}
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              {filteredData.length > 0 ? (
                <Table 
                  dataSource={filteredData} 
                  columns={columns} 
                  rowKey="id" 
                  pagination={{ pageSize: 8, position: ['bottomCenter'], showSizeChanger: false }} 
                />
              ) : (
                <div className="py-24">
                  <Empty 
                    image={<div className="bg-slate-50 p-8 rounded-full inline-block mb-4"><Inbox size={64} className="text-slate-200" /></div>}
                    description={<Text className="text-slate-400 block">No reduction requests found in this ledger.</Text>}
                  />
                </div>
              )}
            </Card>
          </>
        )}

        {/* Review Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600" style={{ fontWeight: 400 }}><Gavel size={18}/> Protocol Review</div>}
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={selectedRequest?.status === 'pending_admin' ? [
            <Button key="back" onClick={() => setIsModalVisible(false)} className="rounded-lg h-10 px-6">Abort</Button>,
            <Button key="reject" danger loading={isProcessing} onClick={() => handleStatusUpdate('reject')} className="rounded-lg h-10 px-6">Declined</Button>,
            <Button key="submit" type="primary" loading={isProcessing} onClick={() => handleStatusUpdate('approve')} className="rounded-lg h-10 px-8 shadow-sm">Authorize</Button>
          ] : [<Button key="close" onClick={() => setIsModalVisible(false)} className="rounded-lg h-10 px-8">Close</Button>]}
          width={550}
          className="rounded-2xl"
        >
          {selectedRequest && (
            <div className="mt-6 space-y-6">
              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-1">Applicant</Text>
                    <Text strong className="text-lg" style={{ fontWeight: 500 }}>{selectedRequest.Student?.username}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-1">Status</Text>
                    <Tag color={statusConfig[selectedRequest.status]?.color} className="rounded-full border-none px-3 font-bold uppercase text-[9px] m-0">
                      {selectedRequest.status.replace(/_/g, ' ')}
                    </Tag>
                  </Col>
                  <Col span={24}>
                    <Divider className="my-2 border-slate-200" />
                    <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-2">Student's Stated Reason</Text>
                    <Paragraph className="text-xs text-slate-600 italic bg-white p-4 rounded-xl border border-slate-100 m-0">
                      "{selectedRequest.reason}"
                    </Paragraph>
                  </Col>
                </Row>
              </div>

              {selectedRequest.status === 'pending_admin' && (
                <div className="space-y-3 px-1">
                  <Text strong className="text-[11px] uppercase text-slate-400 block mb-1 tracking-widest">Administrative Remarks</Text>
                  <TextArea 
                    rows={4} 
                    className="rounded-xl p-4 border-slate-200 focus:border-blue-400 transition-all" 
                    placeholder="Enter justification for approval or rejection..." 
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                  />
                </div>
              )}

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                <Text className="text-[11px] text-blue-700 leading-tight">
                  Authorization triggers a second-stage verification by the Warden before mess bill adjustments are committed.
                </Text>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default DayReductionRequestsAdmin;