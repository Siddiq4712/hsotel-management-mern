import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Divider, ConfigProvider, theme, Skeleton, Badge, 
  Tooltip, Table, Tag, Empty 
} from 'antd';
import { 
  Receipt, Calendar, CheckCircle2, XCircle, ChevronDown, 
  ChevronUp, Clock, IndianRupee, BookOpen, Droplet, 
  Coffee, ChevronLeft, ChevronRight, RefreshCw, Info, CreditCard,
  UserCheck, History, Wallet, Inbox
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

const ChargeSkeleton = () => (
  <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
    <div className="flex justify-between items-center">
      <Skeleton.Input active style={{ width: 300 }} />
      <Skeleton.Button active style={{ width: 120 }} />
    </div>
    <Row gutter={24}>
      {[...Array(3)].map((_, i) => (
        <Col span={8} key={i}><Skeleton.Button active block style={{ height: 120, borderRadius: 24 }} /></Col>
      ))}
    </Row>
    <Skeleton active paragraph={{ rows: 10 }} />
  </div>
);

const MyMessCharges = () => {
  const [dailyCharges, setDailyCharges] = useState([]);
  const [monthlyFlatFees, setMonthlyFlatFees] = useState([]);
  const [summaryData, setSummaryData] = useState({ dailyRate: 0, manDays: 0, specialFood: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment());
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const changeMonth = (offset) => {
    setSelectedDate(prev => prev.clone().add(offset, 'month'));
    setCurrentPage(1); // Reset to first page on date change
  };

  const changeYear = (offset) => {
    setSelectedDate(prev => prev.clone().add(offset, 'year'));
    setCurrentPage(1);
  };

  const handleToday = () => {
    setSelectedDate(moment());
    setCurrentPage(1);
  };

  const fetchCharges = useCallback(async () => {
    setLoading(true);
    try {
      const month = selectedDate.month() + 1;
      const year = selectedDate.year();
      const response = await studentAPI.getMyDailyMessCharges({ month, year });
      const data = response.data.data;

      setDailyCharges(data.dailyCharges || []);
      setMonthlyFlatFees(data.monthlySummary.flatFees || []);
      setSummaryData({
        dailyRate: data.monthlySummary.monthlyCalculatedDailyRate || 0,
        manDays: data.monthlySummary.studentTotalManDaysForMonth || 0,
        specialFood: data.monthlySummary.totalMonthlySpecialFoodCost || 0
      });
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [selectedDate]);

  useEffect(() => { fetchCharges(); }, [fetchCharges]);

  const totalFlatFees = useMemo(() => 
    monthlyFlatFees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0)
  , [monthlyFlatFees]);

  const totalBill = useMemo(() => 
    (summaryData.dailyRate * summaryData.manDays) + summaryData.specialFood + totalFlatFees
  , [summaryData, totalFlatFees]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => <Text strong className="text-slate-700">{moment(d).format('DD MMM, ddd')}</Text>
    },
    {
      title: 'Attendance Status',
      dataIndex: 'attendance_status',
      key: 'status',
      render: (status) => {
        const config = {
          P: { color: 'success', text: 'Present', icon: <CheckCircle2 size={12}/> },
          A: { color: 'error', text: 'Absent', icon: <XCircle size={12}/> },
          OD: { color: 'processing', text: 'Institutional OD', icon: <Clock size={12}/> },
          default: { color: 'default', text: 'Unmarked', icon: <Info size={12}/> }
        };
        const s = config[status] || config.default;
        return <Tag icon={s.icon} color={s.color} className="rounded-full border-none px-3 font-bold uppercase text-[9px]">{s.text}</Tag>;
      }
    },
    {
      title: 'Base Charge',
      dataIndex: 'baseMessCharge',
      align: 'right',
      render: (v) => <Text className="text-slate-500">₹{parseFloat(v).toFixed(2)}</Text>
    },
    {
      title: 'Token Add-ons',
      dataIndex: 'specialFoodCost',
      align: 'right',
      render: (v) => parseFloat(v) > 0 ? <Text className="text-orange-500 font-medium">+ ₹{parseFloat(v).toFixed(2)}</Text> : <Text className="text-slate-300">—</Text>
    },
    {
      title: 'Daily Total',
      dataIndex: 'dailyTotalCharge',
      align: 'right',
      fixed: 'right',
      width: 120,
      render: (v) => (
        <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
          <Text strong className="text-blue-600">₹{parseFloat(v).toFixed(2)}</Text>
        </div>
      )
    }
  ];

  if (loading) return <ChargeSkeleton />;

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header & Navigation */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Receipt className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Official Expenditure Statement</Title>
              <Text type="secondary">Session: {selectedDate.format('MMMM YYYY')}</Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeYear(-1)} />
              <div className="px-4 text-center min-w-[70px]"><Text strong className="text-slate-700">{selectedDate.format('YYYY')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeYear(1)} />
            </div>

            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
              <div className="px-6 text-center min-w-[120px]"><Text strong className="text-blue-600 uppercase tracking-wide">{selectedDate.format('MMMM')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
            </div>
            <Button onClick={handleToday} className="rounded-2xl h-11 border-slate-200 text-slate-500 font-medium">Today</Button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
             <Card className="border-none shadow-sm rounded-[32px] bg-white h-full" title={<div className="flex items-center gap-2"><Wallet size={18} className="text-blue-600"/><Text strong>Reconciliation Summary</Text></div>}>
               <Row gutter={16}>
                 <Col span={12}>
                   <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                     <Text className="text-[10px] uppercase font-bold text-slate-400 block">Daily Man-Day Rate</Text>
                     <Title level={3} style={{ margin: 0 }}>₹{summaryData.dailyRate.toFixed(2)}</Title>
                   </div>
                 </Col>
                 <Col span={12}>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <Text className="text-[10px] uppercase font-bold text-slate-400 block">Net Man-Days</Text>
                      <Title level={3} style={{ margin: 0 }}>{summaryData.manDays} Days</Title>
                    </div>
                 </Col>
               </Row>
               <div className="mt-6 space-y-2">
                  {monthlyFlatFees.length > 0 ? monthlyFlatFees.map((f, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-slate-50">
                      <Text className="text-slate-500 capitalize">{f.fee_type.replace(/_/g, ' ')}</Text>
                      <Text strong>₹{parseFloat(f.amount).toFixed(2)}</Text>
                    </div>
                  )) : <Text className="text-slate-400 italic text-xs">No additional flat fees for this session.</Text>}
               </div>
             </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card className="border-none shadow-lg rounded-[32px] bg-blue-600 text-white h-full relative overflow-hidden">
               <div className="relative z-10">
                 <Text className="text-blue-100 text-[10px] uppercase font-bold tracking-widest block mb-1">Total Payable Amount</Text>
                 <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-2xl font-light">₹</span>
                    <span className="text-5xl font-black">{totalBill.toFixed(2)}</span>
                 </div>
                 <Button block size="large" className="h-14 rounded-2xl border-none shadow-xl font-bold bg-white text-blue-600" onClick={() => window.open("https://www.iobnet.co.in/iobpay/commonpage.do?type=MESS%20FEES", "_blank")}>Pay Mess Fees (IOB)</Button>
               </div>
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500 rounded-full opacity-20" />
            </Card>
          </Col>
        </Row>

        {/* Daily Audit Ledger with Pagination */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }} title={
          <div className="flex justify-between items-center px-2 py-4">
            <div className="flex items-center gap-2"><History size={18} className="text-blue-600"/><Text strong className="text-lg">Daily Audit Ledger</Text></div>
            <Button icon={<RefreshCw size={14}/>} onClick={fetchCharges} type="text" />
          </div>
        }>
          {dailyCharges.length > 0 ? (
            <Table 
              columns={columns} 
              dataSource={dailyCharges} 
              rowKey="id"
              scroll={{ x: 1000 }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                onChange: (page) => setCurrentPage(page),
                showSizeChanger: false,
                position: ['bottomCenter'],
                itemRender: (page, type, originalElement) => {
                  if (type === 'prev') return <Button type="text" icon={<ChevronLeft size={14}/>} />;
                  if (type === 'next') return <Button type="text" icon={<ChevronRight size={14}/>} />;
                  return originalElement;
                }
              }}
            />
          ) : (
            <div className="py-24 flex flex-col items-center justify-center bg-white">
              <Empty 
                image={<Inbox size={64} className="text-slate-200" />}
                description={
                  <div className="space-y-1">
                    <Text strong className="text-slate-600 text-lg block">Ledger Not Finalized</Text>
                    <Text className="text-slate-400 block">The accounts office hasn't released data for {selectedDate.format('MMMM YYYY')} yet.</Text>
                  </div>
                }
              />
            </div>
          )}
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default MyMessCharges;