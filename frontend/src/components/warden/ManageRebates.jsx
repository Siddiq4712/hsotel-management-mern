import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Tag, Space, Typography, 
  Input, Select, Popconfirm, Tooltip, message, Divider, Modal, ConfigProvider, theme 
} from 'antd';
import { 
  Percent, Search, CheckCircle2, XCircle, 
  User, RefreshCw, Clock, ArrowRight, Wallet
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

  // Manual Approval Modal States
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedRebate, setSelectedRebate] = useState(null);
  const [manualAmount, setManualAmount] = useState('');

  const fetchRebates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getRebates({ status: statusFilter });
      setRebates(response.data.data || []);
    } catch (error) {
      messageApi.error('Sync Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, messageApi]);

  useEffect(() => { fetchRebates(); }, [fetchRebates]);

  const openApproveModal = (record) => {
    setSelectedRebate(record);
    // Pre-fill with the estimate (even if it is 0, Warden can overwrite)
    setManualAmount(record.calculationDetail?.estimatedTotal || '0');
    setIsApproveModalOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!manualAmount || parseFloat(manualAmount) < 0) {
      return messageApi.error("Please enter a valid amount");
    }

    try {
      await wardenAPI.updateRebateStatus(selectedRebate.id, { 
        status: 'approved', 
        amount: manualAmount 
      });
      messageApi.success(`Rebate approved for ₹${manualAmount}`);
      setIsApproveModalOpen(false);
      fetchRebates();
    } catch (error) {
      messageApi.error(error.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await wardenAPI.updateRebateStatus(id, { status: 'rejected' });
      messageApi.success(`Application rejected`);
      fetchRebates();
    } catch (error) {
      messageApi.error(error.message);
    }
  };

  const filteredData = rebates.filter(item => 
    item.RebateStudent?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.RebateStudent?.roll_number && item.RebateStudent.roll_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    {
      title: 'Student Identity',
      key: 'student',
      render: (_, r) => (
        <Space>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <User size={18} />
          </div>
          <div className="flex flex-col">
            <Text strong className="text-slate-700">{r.RebateStudent?.username}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              ID: {r.RebateStudent?.roll_number || 'N/A'}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Suggested Rate',
      key: 'rate',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <div className="flex items-center gap-1">
            <Text className="text-slate-500 font-medium">₹{r.calculationDetail?.rate || '0.00'}</Text>
            {r.calculationDetail?.isFinalized ? (
              <CheckCircle2 size={12} className="text-green-500" />
            ) : (
              <Clock size={12} className="text-amber-500" />
            )}
          </div>
          <Text className="text-[9px] text-slate-400 uppercase font-bold">Suggested</Text>
        </Space>
      )
    },
    {
      title: 'System Estimate',
      key: 'calc',
      render: (_, r) => (
        <div className="bg-slate-50 p-2 px-3 rounded-xl border border-slate-100 inline-block">
          <div className="flex items-center gap-2">
            <Text className="text-[10px] text-slate-400 font-bold">{r.calculationDetail?.days} DAYS</Text>
            <ArrowRight size={10} className="text-slate-300" />
            <Text strong className="text-slate-500">₹{r.calculationDetail?.estimatedTotal || '0.00'}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Status / Amount',
      dataIndex: 'status',
      render: (status, r) => (
        <Space direction="vertical" size={0}>
          <Tag color={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'gold'} 
               className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
            {status}
          </Tag>
          {status === 'approved' && <Text strong className="text-[11px] text-blue-600">₹{r.amount}</Text>}
        </Space>
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
            onClick={() => openApproveModal(r)}
            className="rounded-lg bg-blue-600 border-none shadow-md shadow-blue-100 font-bold"
          >
            Approve
          </Button>
          <Popconfirm title="Reject Application?" onConfirm={() => handleReject(r.id)} okType="danger">
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Percent className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Rebate Review Board</Title>
              <Text type="secondary">Review applications and specify manual credit amounts</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchRebates} className="rounded-xl h-11" />
        </div>

        <Card className="border-none shadow-sm rounded-2xl">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md">
              <Search size={18} className="text-slate-300" />
              <Input 
                placeholder="Search by student..." 
                bordered={false} 
                className="font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onChange={setStatusFilter} className="w-44" variant="filled">
              <Option value="all">All Records</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
            </Select>
          </div>
        </Card>

        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
          <Table 
            columns={columns} 
            dataSource={filteredData} 
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 8 }}
            expandable={{
              expandedRowRender: record => (
                <div className="p-6 bg-slate-50 rounded-2xl m-2 border border-slate-100">
                  <Text strong className="text-[10px] uppercase text-blue-500 block mb-2 tracking-widest">Reason / Notes</Text>
                  <Text className="text-slate-600 italic">"{record.reason}"</Text>
                  <Divider className="my-4" />
                  <div className="flex gap-12">
                     <div>
                       <Text className="text-[10px] uppercase font-bold text-slate-400 block">Absence Start</Text>
                       <Text strong>{moment(record.from_date).format('DD MMM, YYYY')}</Text>
                     </div>
                     <div>
                       <Text className="text-[10px] uppercase font-bold text-slate-400 block">Absence End</Text>
                       <Text strong>{moment(record.to_date).format('DD MMM, YYYY')}</Text>
                     </div>
                  </div>
                </div>
              )
            }}
          />
        </Card>

        {/* Manual Approval Modal */}
        <Modal
          title={<div className="flex items-center gap-2"><Wallet size={20} className="text-blue-600"/> Specify Approval Amount</div>}
          open={isApproveModalOpen}
          onCancel={() => setIsApproveModalOpen(false)}
          onOk={handleApproveSubmit}
          okText="Confirm Approval"
          centered
          className="rounded-[32px]"
          okButtonProps={{ className: 'h-11 rounded-xl bg-blue-600 font-bold' }}
          cancelButtonProps={{ className: 'h-11 rounded-xl' }}
        >
          {selectedRebate && (
            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between mb-2">
                  <Text type="secondary">Student:</Text>
                  <Text strong>{selectedRebate.RebateStudent?.username}</Text>
                </div>
                <div className="flex justify-between mb-2">
                  <Text type="secondary">Days of Absence:</Text>
                  <Text strong>{selectedRebate.calculationDetail?.days} Days</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">System Suggested:</Text>
                  <Text strong className="text-slate-400">₹{selectedRebate.calculationDetail?.estimatedTotal}</Text>
                </div>
              </div>

              <div className="space-y-2">
                <Text strong className="text-slate-600">Enter Final Approved Amount (₹)</Text>
                <Input 
                  size="large"
                  type="number"
                  prefix={<span className="text-slate-400">₹</span>}
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="rounded-xl h-12 font-bold text-lg text-blue-600"
                  placeholder="0.00"
                  autoFocus
                />
                <Text className="text-[11px] text-amber-500 block">
                  * This amount will be credited to the student's next mess bill.
                </Text>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ManageRebates;