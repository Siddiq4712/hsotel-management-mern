import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Tag, Button, Select, Input, Modal, Typography, 
  Card, Row, Col, Statistic, Space, Skeleton, Empty, ConfigProvider, theme, Divider
} from 'antd';
import { 
  CalendarDays, User, Home, Clock, CheckCircle2,ShieldCheck,
  XCircle, Info, RefreshCw, Filter, Search, ClipboardList, Inbox 
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// --- Specialized Skeletons for Precise UI Matching ---

const StatsSkeleton = () => (
  <Row gutter={[24, 24]} className="mb-8">
    {[...Array(3)].map((_, i) => (
      <Col xs={24} md={8} key={i}>
        <Card className="border-none shadow-sm rounded-2xl p-4">
          <Skeleton loading active avatar={{ size: 'small', shape: 'square' }} paragraph={{ rows: 1 }} />
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
  pending_admin: { color: 'orange', label: 'Pending Admin', icon: <Clock size={12} /> },
  approved_by_admin: { color: 'blue', label: 'Admin Approved', icon: <CheckCircle2 size={12} /> },
  rejected_by_admin: { color: 'red', label: 'Admin Rejected', icon: <XCircle size={12} /> },
  approved_by_warden: { color: 'green', label: 'Warden Final', icon: <CheckCircle2 size={12} /> },
  rejected_by_warden: { color: 'red', label: 'Warden Rejected', icon: <XCircle size={12} /> },
};

const DayReductionRequestsWarden = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'approved_by_admin' });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getDayReductionRequests(filters);
      setRequests(response.data.data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      // Subtle delay to allow the "Shimmer" to be meaningful
      setTimeout(() => setLoading(false), 600);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredData = requests.filter(req => 
    req.Student?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      title: 'Student Identity',
      key: 'student',
      render: (_, record) => (
        <Space gap={3}>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <User size={18} />
          </div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{record.Student?.username || 'Unknown'}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {record.Hostel?.name || 'N/A'}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Reduction Period',
      key: 'dates',
      render: (_, record) => (
        <div className="flex flex-col">
          <Text className="text-xs font-medium">
            {moment(record.from_date).format('DD MMM')} — {moment(record.to_date).format('DD MMM, YYYY')}
          </Text>
          <Text className="text-[10px] text-slate-400 uppercase font-bold">
            {moment(record.to_date).diff(moment(record.from_date), 'days') + 1} Total Days
          </Text>
        </div>
      ),
    },
    {
      title: 'Workflow Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          icon={statusConfig[status]?.icon} 
          color={statusConfig[status]?.color}
          className="rounded-full border-none px-3 font-bold uppercase text-[9px]"
        >
          {statusConfig[status]?.label || status.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Audit Control',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<ClipboardList size={16} className="text-slate-400" />} 
          onClick={() => { setSelectedRequest(record); setIsModalVisible(true); }}
          className="hover:bg-slate-100 rounded-lg"
        >
          Audit
        </Button>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Institutional Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <CalendarDays className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Day Reduction Audit</Title>
              <Text type="secondary">Review and monitor mess bill reduction requests processed by Administration</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchRequests} className="rounded-xl h-11 px-6 font-bold shadow-sm">Sync Ledger</Button>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            {/* Quick Metrics */}
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <Card className="border-none shadow-sm rounded-2xl">
                  <Statistic 
                    title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Admin Approved</span>} 
                    value={requests.filter(r => r.status === 'approved_by_admin').length} 
                    prefix={<CheckCircle2 size={18} className="text-blue-500 mr-2" />}
                    valueStyle={{ fontWeight: 800 }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="border-none shadow-sm rounded-2xl">
                  <Statistic 
                    title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Active Reductions</span>} 
                    value={requests.length} 
                    prefix={<ClipboardList size={18} className="text-slate-400 mr-2" />}
                    valueStyle={{ fontWeight: 800 }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="border-none shadow-sm rounded-2xl">
                  <Statistic 
                    title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Finalized (Warden)</span>} 
                    value={requests.filter(r => r.status.includes('warden')).length} 
                    prefix={<ShieldCheck size={18} className="text-emerald-500 mr-2" />}
                    valueStyle={{ fontWeight: 800 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Filter Toolbar */}
            <Card className="border-none shadow-sm rounded-2xl">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input 
                    placeholder="Search Student or Reason..." 
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
                    <Select.Option value="all">All Logs</Select.Option>
                    <Select.Option value="approved_by_admin">Approved by Admin</Select.Option>
                    <Select.Option value="pending_admin">Awaiting Admin</Select.Option>
                    <Select.Option value="approved_by_warden">Finalized (Approved)</Select.Option>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Data Table */}
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

        {/* Audit Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ClipboardList size={20}/> Request Audit Dossier</div>}
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={<Button type="primary" onClick={() => setIsModalVisible(false)} className="rounded-xl h-11 px-8 font-bold">Close Dossier</Button>}
          width={600}
          className="rounded-[32px]"
        >
          {selectedRequest && (
            <div className="mt-6 space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-1">Student</Text>
                    <Text strong className="text-lg">{selectedRequest.Student?.username}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-1">Status</Text>
                    <Tag color={statusConfig[selectedRequest.status]?.color} className="rounded-full border-none px-3 font-bold uppercase text-[9px] m-0">
                      {selectedRequest.status.replace(/_/g, ' ')}
                    </Tag>
                  </Col>
                  <Col span={24}>
                    <Divider className="my-2 border-slate-200" />
                    <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-2">Original Reason for Reduction</Text>
                    <Paragraph className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-100">
                      "{selectedRequest.reason}"
                    </Paragraph>
                  </Col>
                </Row>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <Text strong className="text-[11px] uppercase text-blue-400 block mb-2 tracking-widest">Admin Remarks</Text>
                  <Text className="text-sm">{selectedRequest.admin_remarks || 'No remarks recorded.'}</Text>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <Text strong className="text-[11px] uppercase text-slate-400 block mb-2 tracking-widest">Historical Warden Remarks</Text>
                  <Text className="text-sm italic text-slate-500">{selectedRequest.warden_remarks || 'System log: No prior warden intervention.'}</Text>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <Text className="text-[11px] text-amber-700 leading-tight">
                  Institutional Policy: Day reductions are processed by Administration. Warden access is limited to auditing and ledger verification.
                </Text>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default DayReductionRequestsWarden;

// Standard CSS snippet for smooth scrollbar inside the student list
const style = document.createElement('style');
style.innerHTML = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
`;
document.head.appendChild(style);