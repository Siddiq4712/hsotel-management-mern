import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, 
  Select, Divider, ConfigProvider, theme, Skeleton, Badge, 
  Tag, Modal, Input, Empty, message, Tooltip 
} from 'antd';
import { 
  MessageCircle, User, Calendar, AlertTriangle, CheckCircle2, 
  Clock, XCircle, Filter, Search, RefreshCw, ClipboardList, 
  ShieldAlert, Info, Inbox, Activity, Zap, ShieldCheck
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- 1. PREMIUM SKELETONS (Matched to final UI dimensions) ---

const StatsSkeleton = () => (
  <Row gutter={[20, 20]} className="mb-8">
    {[...Array(5)].map((_, i) => (
      <Col xs={24} sm={12} lg={4.8} key={i} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
        <Card className="border-none shadow-sm rounded-[32px] p-5 bg-white">
          <div className="flex items-center gap-4">
            <Skeleton.Button active style={{ width: 48, height: 48, borderRadius: 16 }} />
            <div className="space-y-2 flex-1">
              <Skeleton.Input active size="small" style={{ width: '60%', height: 12 }} />
              <Skeleton.Input active size="small" style={{ width: '40%', height: 24 }} />
            </div>
          </div>
        </Card>
      </Col>
    ))}
  </Row>
);

const FilterSkeleton = () => (
  <Card className="border-none shadow-sm rounded-2xl mb-6 bg-white">
    <div className="flex gap-4 items-center p-1">
      <Skeleton.Input active style={{ width: 180, height: 40, borderRadius: 12 }} />
      <Skeleton.Input active style={{ width: 180, height: 40, borderRadius: 12 }} />
      <Skeleton.Input active style={{ width: 140, height: 40, borderRadius: 12 }} />
    </div>
  </Card>
);

const ComplaintCardSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="border-none shadow-sm rounded-[32px] p-6 bg-white">
        <Skeleton active avatar={{ size: 'large', shape: 'circle' }} title={{ width: '40%' }} paragraph={{ rows: 3 }} />
      </Card>
    ))}
  </div>
);

const ComplaintManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      
      const response = await wardenAPI.getComplaints(params);
      setComplaints(response.data.data || []);
    } catch (error) {
      message.error('Grievance database sync failed.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [filter, categoryFilter, priorityFilter]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const confirmStatusUpdate = async () => {
    if (!selectedComplaint || !newStatus) return;
    setActionLoading(true);
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'resolved' && resolution.trim()) {
        updateData.resolution = resolution.trim();
      }
      await wardenAPI.updateComplaint(selectedComplaint.id, updateData);
      message.success(`Status updated to: ${newStatus.replace('_', ' ')}`);
      setShowModal(false);
      fetchComplaints();
    } catch (error) {
      message.error('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig = {
    submitted: { color: 'warning', label: 'New', icon: <AlertTriangle size={12} /> },
    in_progress: { color: 'blue', label: 'Processing', icon: <Clock size={12} /> },
    resolved: { color: 'success', label: 'Solved', icon: <CheckCircle2 size={12} /> },
    closed: { color: 'default', label: 'Closed', icon: <XCircle size={12} /> }
  };

  const priorityMeta = {
    urgent: { color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600' },
    high: { color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600' },
    medium: { color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
    low: { color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Institutional Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <MessageCircle className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Student Complaints</Title>
              <Text type="secondary">Manage and resolve hostel issues and maintenance requests</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchComplaints} className="rounded-xl h-11 px-6 font-bold shadow-sm">Refresh List</Button>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <FilterSkeleton />
            <ComplaintCardSkeleton />
          </>
        ) : (
          <>
            {/* --- Glass-Glow Stat Cards --- */}
            <Row gutter={[20, 20]} className="mb-8">
              {[
                { label: 'Total Received', val: complaints.length, icon: Activity, bg: 'bg-indigo-50', color: 'text-indigo-600' },
                { label: 'Pending', val: complaints.filter(c => c.status === 'submitted').length, icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600' },
                { label: 'In Progress', val: complaints.filter(c => c.status === 'in_progress').length, icon: Clock, bg: 'bg-blue-50', color: 'text-blue-600' },
                { label: 'Solved', val: complaints.filter(c => c.status === 'resolved').length, icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
                { label: 'Urgent', val: complaints.filter(c => c.priority === 'urgent').length, icon: Zap, bg: 'bg-rose-50', color: 'text-rose-600' },
              ].map((stat, i) => (
                <Col xs={24} sm={12} lg={4.8} key={i} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
                  <Card className="border-none shadow-sm rounded-[32px] p-5 bg-white group hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                        <stat.icon size={22} />
                      </div>
                      <div className="flex flex-col">
                        <Text className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-tight">{stat.label}</Text>
                        <Text className="text-2xl font-black text-slate-800 leading-none mt-1">{stat.val}</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Filter Hub */}
            <Card className="border-none shadow-sm rounded-2xl mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-1 px-3 rounded-xl border border-slate-100">
                  <Filter size={16} className="text-slate-400" />
                  <Select value={filter} onChange={setFilter} bordered={false} className="w-36 font-bold text-slate-600">
                    <Option value="all">All Complaints</Option>
                    <Option value="submitted">New</Option>
                    <Option value="in_progress">In Progress</Option>
                    <Option value="resolved">Solved</Option>
                  </Select>
                </div>
                <Select value={categoryFilter} onChange={setCategoryFilter} className="w-44 h-11" placeholder="Category">
                  <Option value="all">All Categories</Option>
                  <Option value="room">Room / Allotment</Option>
                  <Option value="mess">Mess & Dining</Option>
                  <Option value="maintenance">Maintenance</Option>
                </Select>
                <Select value={priorityFilter} onChange={setPriorityFilter} className="w-36 h-11" placeholder="Priority">
                  <Option value="all">All Priority</Option>
                  <Option value="urgent">Urgent Only</Option>
                  <Option value="high">High Priority</Option>
                </Select>
              </div>
            </Card>

            {/* Complaints List */}
            <div className="space-y-4">
              {complaints.length > 0 ? complaints.map((c) => (
                <Card key={c.id} className="border-none shadow-sm rounded-[32px] hover:shadow-md transition-all p-2 overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-5">
                        <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-600"><User size={20} /></div>
                        <Space direction="vertical" size={0}>
                           <Text strong className="text-slate-700 text-base">{c.Student?.username}</Text>
                           <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ref ID: #CMP-{c.id} • {moment(c.createdAt).format('DD MMM, hh:mm A')}</Text>
                        </Space>
                        <Divider type="vertical" className="h-8 border-slate-200 mx-2" />
                        <Tag bordered={false} color={statusConfig[c.status].color} icon={statusConfig[c.status].icon} className="rounded-full font-bold uppercase text-[9px] px-3 py-0.5">{statusConfig[c.status].label}</Tag>
                        <Tag bordered={false} color={priorityMeta[c.priority].color} className="rounded-full font-bold uppercase text-[9px] px-3 py-0.5">Priority: {c.priority}</Tag>
                      </div>

                      <Title level={4} className="m-0 mb-3 text-slate-800">{c.subject}</Title>
                      <Paragraph className="text-slate-500 bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 italic text-sm leading-relaxed">
                        "{c.description}"
                      </Paragraph>

                      {c.resolution && (
                         <div className="mt-5 p-5 rounded-[24px] bg-emerald-50/50 border border-emerald-100 flex gap-4">
                           <div className="p-2 bg-white rounded-xl shadow-sm h-fit"><ShieldCheck className="text-emerald-500" size={18}/></div>
                           <div>
                             <Text strong className="text-[10px] uppercase text-emerald-600 block mb-1 tracking-widest">Resolution Summary</Text>
                             <Text className="text-emerald-900 font-medium">{c.resolution}</Text>
                           </div>
                         </div>
                      )}
                    </div>

                    <div className="md:w-52 flex flex-col gap-2 justify-center border-l border-slate-50 pl-6">
                       {c.status === 'submitted' && (
                         <Button type="primary" block className="h-12 rounded-xl font-bold shadow-lg shadow-blue-100" onClick={() => { setSelectedComplaint(c); setNewStatus('in_progress'); setShowModal(true); }}>START WORK</Button>
                       )}
                       {['submitted', 'in_progress'].includes(c.status) && (
                         <Button className="h-12 rounded-xl font-bold border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors" onClick={() => { setSelectedComplaint(c); setNewStatus('resolved'); setShowModal(true); }}>MARK AS SOLVED</Button>
                       )}
                       {!['resolved', 'closed'].includes(c.status) && (
                         <Button type="text" danger className="h-10 rounded-xl font-bold mt-2" onClick={() => { setSelectedComplaint(c); setNewStatus('closed'); setShowModal(true); }}>CLOSE COMPLAINT</Button>
                       )}
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[40px] shadow-sm border border-slate-50">
                  <Empty image={<div className="bg-slate-50 p-10 rounded-full mb-4"><Inbox size={80} className="text-slate-200" /></div>} description={<Text className="text-slate-400 font-medium block">No complaints found.</Text>} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Protocol Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ClipboardList size={20}/> Update Status</div>}
          open={showModal}
          onCancel={() => setShowModal(false)}
          footer={[
            <Button key="back" onClick={() => setShowModal(false)} className="rounded-xl h-11 px-8">Cancel</Button>,
            <Button key="submit" type="primary" loading={actionLoading} onClick={confirmStatusUpdate} className="rounded-xl h-11 px-10 font-bold shadow-lg shadow-blue-100">Save Changes</Button>
          ]}
          className="rounded-[32px]"
          width={550}
        >
          {selectedComplaint && (
            <div className="mt-6 space-y-6">
              <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100">
                <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest block mb-1">Complaint Topic</Text>
                <Text strong className="text-lg block mb-2 leading-tight">{selectedComplaint.subject}</Text>
                <Tag bordered={false} color="blue" className="rounded-full font-bold uppercase text-[9px] px-3">Action: {newStatus.replace('_', ' ')}</Tag>
              </div>

              {newStatus === 'resolved' && (
                <div className="space-y-2 px-1">
                  <Text strong className="text-[11px] uppercase text-slate-400 block mb-2 tracking-widest">Resolution Summary</Text>
                  <TextArea rows={4} className="rounded-[20px] p-4 border-slate-200" placeholder="Explain how this issue was fixed..." value={resolution} onChange={(e) => setResolution(e.target.value)} />
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <Text className="text-[11px] text-blue-700 leading-tight font-medium">
                  This update will be logged in the student's profile and notify them immediately.
                </Text>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ComplaintManagement;
