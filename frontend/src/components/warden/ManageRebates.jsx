import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Tag, Space, Typography, 
  Input, Select, Popconfirm, message, Divider, Modal, ConfigProvider, theme, List, Badge 
} from 'antd';
import { 
  Percent, Search, XCircle, User, RefreshCw, ArrowRight, Calculator, Calendar, Info 
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const ManageRebates = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [rebates, setRebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedRebate, setSelectedRebate] = useState(null);

  const fetchRebates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getRebates({ status: statusFilter });
      setRebates(response.data.data || []);
    } catch (error) {
      messageApi.error('Fetch Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, messageApi]);

  useEffect(() => { fetchRebates(); }, [fetchRebates]);

  const handleApprove = async () => {
    try {
      await wardenAPI.updateRebateStatus(selectedRebate.id, { 
        status: 'approved', 
        amount: selectedRebate.calculationDetail.total 
      });
      messageApi.success(`Approved ₹${selectedRebate.calculationDetail.total}`);
      setIsApproveModalOpen(false);
      fetchRebates();
    } catch (error) { messageApi.error(error.message); }
  };

  const columns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, r) => (
        <Space>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><User size={18} /></div>
          <div className="flex flex-col">
            <Text strong className="text-slate-700">{r.RebateStudent?.username}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase">Roll: {r.RebateStudent?.roll_number}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Monthly Calculation Details',
      key: 'split',
      render: (_, r) => (
        <div className="flex flex-col gap-1">
          {r.calculationDetail?.monthlySplit.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white border border-slate-100 p-1 px-2 rounded-lg shadow-sm">
              <Text className="text-[10px] font-bold text-blue-600 min-w-[80px] uppercase">{m.label}</Text>
              <ArrowRight size={10} className="text-slate-300" />
              <Text className="text-[10px] text-slate-500">{m.daysCount} days</Text>
              <Text className="text-[10px] text-slate-400">@</Text>
              <Text className="text-[10px] font-bold text-slate-600">₹{m.ratePerDay}/day</Text>
              <div className="ml-auto">
                <Text strong className="text-[10px] text-slate-700 font-black">₹{m.subTotal.toFixed(2)}</Text>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Total Rebate',
      key: 'total',
      align: 'center',
      render: (_, r) => (
        <div className="flex flex-col items-center justify-center bg-emerald-50 border border-emerald-100 p-2 rounded-2xl min-w-[100px]">
           <Text className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter">Calculated Total</Text>
           <Text className="text-lg font-black text-emerald-700 leading-none">₹{r.calculationDetail?.total}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status, r) => (
        <Tag color={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'gold'} 
             className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
          {status} {status === 'approved' && `(₹${r.amount})`}
        </Tag>
      )
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, r) => r.status === 'pending' && (
        <Space>
          <Button 
            type="primary" 
            onClick={() => { setSelectedRebate(r); setIsApproveModalOpen(true); }} 
            className="rounded-lg bg-blue-600 font-bold border-none shadow-md"
          >
            Review
          </Button>
          <Popconfirm 
            title="Reject?" 
            onConfirm={() => wardenAPI.updateRebateStatus(r.id, { status: 'rejected' }).then(fetchRebates)}
          >
            <Button type="text" danger icon={<XCircle size={18}/>} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      {contextHolder}
      <div className="p-8 bg-slate-50 min-h-screen space-y-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
              <Percent size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Mess Rebate Approval</Title>
              <Text type="secondary">Review and approve mess fee deductions based on student absence</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchRebates} className="h-11 rounded-xl shadow-sm bg-white" />
        </div>

        {/* Table Card */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
          {/* Table Card Header Section */}
          <div className="p-6 bg-white border-b border-slate-50 flex justify-between items-center">
            <Text strong className="text-slate-400 text-[10px] uppercase tracking-widest">
              Pending Rebate Requests
            </Text>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <Select 
                value={statusFilter} 
                onChange={setStatusFilter} 
                bordered={false} 
                className="w-32 font-bold text-slate-600"
              >
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="all">View All</Option>
              </Select>
            </div>
          </div>

          <Table 
            columns={columns} 
            dataSource={rebates} 
            loading={loading} 
            rowKey="id" 
          />
        </Card>

        {/* Verification Modal */}
        <Modal
          title={<div className="flex items-center gap-2"><Calculator size={20} className="text-blue-600"/> Rebate Verification</div>}
          open={isApproveModalOpen}
          onCancel={() => setIsApproveModalOpen(false)}
          onOk={handleApprove}
          okText="Confirm & Approve Rebate"
          centered
          className="rounded-[32px]"
          width={550}
        >
          {selectedRebate && (
            <div className="mt-4 space-y-6">
              {/* Main Total Card */}
              <div className="bg-slate-900 p-8 rounded-[32px] text-white relative overflow-hidden shadow-2xl">
                 <div className="relative z-10">
                   <Text className="text-slate-400 uppercase text-[10px] font-black tracking-widest mb-2 block">
                     Total Rebate Amount
                   </Text>
                   <div className="flex items-baseline gap-2">
                      <span className="text-2xl text-emerald-400 font-bold">₹</span>
                      <span className="text-6xl font-black">
                        {selectedRebate.calculationDetail?.total}
                      </span>
                   </div>
                   <Divider className="border-slate-700 my-4" />
                   <div className="flex gap-6">
                      <div>
                        <Text className="text-slate-500 text-[9px] font-bold block uppercase">Student Name</Text>
                        <Text className="text-white text-xs font-bold uppercase">
                          {selectedRebate.RebateStudent?.username}
                        </Text>
                      </div>
                      <div>
                        <Text className="text-slate-500 text-[9px] font-bold block uppercase">Total Days</Text>
                        <Text className="text-white text-xs font-bold uppercase">
                          {selectedRebate.calculationDetail?.totalDays} Days
                        </Text>
                      </div>
                   </div>
                 </div>
                 <div className="absolute -bottom-10 -right-10 opacity-10">
                   <Landmark size={180}/>
                 </div>
              </div>

              {/* Monthly Detail Section */}
              <div className="space-y-3">
                <Text strong className="text-slate-500 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Calendar size={14}/> Month-wise Details
                </Text>
                {selectedRebate.calculationDetail?.monthlySplit.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-blue-200 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Text className="block text-sm font-black text-slate-800 uppercase">
                          {item.label}
                        </Text>
                        {!item.isAudited && (
                          <Badge 
                            status="warning" 
                            text={<span className="text-[8px] font-bold text-amber-600 uppercase">Tentative Rate</span>} 
                          />
                        )}
                      </div>
                      <Text type="secondary" className="text-xs font-medium">
                        {item.daysCount} Days Absence × ₹{item.ratePerDay} 
                        <span className="text-[10px] opacity-50"> (Daily Rate)</span>
                      </Text>
                    </div>
                    <div className="text-right">
                      <Text strong className="block text-blue-600 text-lg">
                        ₹{item.subTotal.toFixed(2)}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>

              {/* Alert Note */}
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <Info className="text-blue-500 shrink-0" size={18} />
                <Text className="text-blue-700 text-[11px] leading-relaxed">
                  These rates are automatically calculated from the <strong>Mess Rate Records</strong>. 
                  Approving this will deduct this amount from the student's next mess bill.
                </Text>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

// Helper Icon for background
const Landmark = ({ size }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="3" y1="21" x2="21" y2="21"></line>
    <line x1="9" y1="8" x2="9" y2="17"></line>
    <line x1="15" y1="8" x2="15" y2="17"></line>
    <path d="M4 11V3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8"></path>
  </svg>
);

export default ManageRebates;
