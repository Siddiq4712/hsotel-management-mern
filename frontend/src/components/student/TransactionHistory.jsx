import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Select, Divider, ConfigProvider, theme, Skeleton, 
  Tooltip, Tag, Table, Empty 
} from 'antd';
import { 
  CheckCircle2, XCircle, Clock, 
  ChevronLeft, ChevronRight, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, Receipt, 
  History, Search, IndianRupee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

// --- Specialized Skeleton ---
const TransactionSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6 last:border-0">
          <Skeleton.Avatar active shape="square" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '20%' }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      ))}
    </div>
  </Card>
);

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(moment());

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getTransactions({
        month: selectedDate.month() + 1,
        year: selectedDate.year()
      });
      setTransactions(response.data.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [selectedDate]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const statusConfig = {
    completed: { color: 'success', icon: <CheckCircle2 size={12} />, label: 'Completed' },
    pending: { color: 'warning', icon: <Clock size={12} />, label: 'Pending' },
    failed: { color: 'error', icon: <XCircle size={12} />, label: 'Failed' },
    cancelled: { color: 'default', icon: <XCircle size={12} />, label: 'Cancelled' }
  };

  const filteredTransactions = useMemo(() => {
    if (statusFilter === 'all') return transactions;
    return transactions.filter(t => t.status === statusFilter);
  }, [transactions, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return { total, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const columns = [
    {
      title: 'Transaction Details',
      key: 'info',
      render: (_, r) => (
        <Space size={12}>
          <div className={`p-3 rounded-2xl ${r.transaction_type === 'refund' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {r.transaction_type === 'refund' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
          </div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700 capitalize">{r.transaction_type}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.reference_id || 'NO-REF'}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Method',
      dataIndex: 'payment_method',
      render: (m) => <Tag bordered={false} className="rounded-full px-3 text-[10px] font-bold uppercase bg-slate-100">{m?.replace('_', ' ')}</Tag>
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (d) => <Text className="text-slate-500 text-xs">{moment(d).format('DD MMM YYYY')}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
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
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (amt, r) => (
        <Text strong className={`text-lg ${r.transaction_type === 'refund' ? 'text-emerald-600' : 'text-slate-900'}`}>
          {r.transaction_type === 'refund' ? '+' : '-'} ₹{parseFloat(amt).toFixed(2)}
        </Text>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
              <History size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Ledger History</Title>
              <Text type="secondary" className="text-slate-400">Review all your processed and pending hostel payments</Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-[24px] shadow-sm border border-slate-100">
            <Button type="text" icon={<ChevronLeft size={18}/>} onClick={() => setSelectedDate(prev => prev.clone().subtract(1, 'month'))} />
            <div className="px-4 text-center min-w-[140px]">
              <Text strong className="text-blue-600 uppercase tracking-widest">{selectedDate.format('MMMM YYYY')}</Text>
            </div>
            <Button type="text" icon={<ChevronRight size={18}/>} onClick={() => setSelectedDate(prev => prev.clone().add(1, 'month'))} />
            <Divider type="vertical" className="h-6" />
            <Button onClick={() => setSelectedDate(moment())} className="rounded-xl font-bold">Today</Button>
          </div>
        </motion.div>

        {/* Global Statistics */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <Card className="border-none shadow-sm rounded-[32px] bg-blue-600 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <IndianRupee size={120} className="text-white" />
                </div>
                <Statistic 
                  title={<span className="text-blue-100 text-xs uppercase font-bold tracking-widest">Monthly Volume</span>}
                  value={stats.total}
                  prefix={<span className="text-white mr-2">₹</span>}
                  precision={2}
                  valueStyle={{ color: 'white', fontWeight: 900, fontSize: '32px' }}
                />
                <div className="mt-4">
                  <Tag className="bg-blue-500/50 border-none text-white rounded-full px-4">{stats.count} Transactions</Tag>
                </div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} lg={12}>
             <div className="grid grid-cols-2 gap-4 h-full">
                <Card className="border-none shadow-sm rounded-[24px]">
                  <Text className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Success Rate</Text>
                  <Title level={3} className="m-0">
                    {transactions.length ? Math.round((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100) : 0}%
                  </Title>
                </Card>
                <Card className="border-none shadow-sm rounded-[24px]">
                  <Text className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Active Filters</Text>
                  <Tag color="blue" className="rounded-full capitalize m-0">{statusFilter}</Tag>
                </Card>
             </div>
          </Col>
        </Row>

        {/* Filter Bar */}
        <Card className="border-none shadow-sm rounded-[24px]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 p-1 px-4 rounded-xl border border-slate-100 w-full max-w-md">
              <Search size={18} className="text-slate-300" />
              <Select 
                value={statusFilter} 
                onChange={setStatusFilter} 
                bordered={false} 
                className="w-full font-bold"
                options={[
                  { label: 'All Transactions', value: 'all' },
                  { label: 'Completed Only', value: 'completed' },
                  { label: 'Pending Items', value: 'pending' },
                  { label: 'Failed Entries', value: 'failed' },
                ]}
              />
            </div>
            <Button 
              icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>} 
              onClick={fetchTransactions}
              className="rounded-xl h-11 px-6 font-bold flex items-center gap-2"
            >
              Sync Ledger
            </Button>
          </div>
        </Card>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TransactionSkeleton />
            </motion.div>
          ) : filteredTransactions.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-24 flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-slate-200"
            >
              <div className="relative mb-8">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 -m-8 rounded-full bg-blue-50/50" 
                />
                <div className="relative bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100">
                  <Receipt size={64} className="text-slate-200" strokeWidth={1.5} />
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-2 -right-2 p-3 bg-blue-600 rounded-2xl shadow-lg text-white"
                  >
                    <Search size={20} />
                  </motion.div>
                </div>
              </div>
              <div className="text-center max-w-sm px-6">
                <Title level={4} className="mb-2">No Transactions Found</Title>
                <Paragraph className="text-slate-400">
                  We couldn't find any {statusFilter !== 'all' ? statusFilter : ''} payment records for 
                  <Text strong className="text-slate-600 ml-1">{selectedDate.format('MMMM YYYY')}</Text>.
                </Paragraph>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden"
            >
              <Table 
                columns={columns} 
                dataSource={filteredTransactions} 
                rowKey="id" 
                pagination={{ 
                  pageSize: 8, 
                  position: ['bottomCenter'],
                  className: "py-6"
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ConfigProvider>
  );
};

export default TransactionHistory;