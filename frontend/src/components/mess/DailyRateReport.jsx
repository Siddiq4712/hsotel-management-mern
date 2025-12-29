import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Button, Row, Col, Table, message, 
  Typography, Space, Divider, ConfigProvider, theme, Skeleton, Tooltip 
} from 'antd';
import { 
  Calculator, FileDown, RefreshCw, 
  ChevronLeft, ChevronRight, Users, Receipt, MinusCircle 
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import ExcelJS from 'exceljs';

const { Title, Text } = Typography;

const ReportSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Skeleton.Input active style={{ width: 300 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </div>
      <Row gutter={16}>
        <Col span={16}><Skeleton active paragraph={{ rows: 10 }} /></Col>
        <Col span={8}><Skeleton active paragraph={{ rows: 10 }} /></Col>
      </Row>
    </div>
  </Card>
);

const DailyRateReport = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(moment());

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const month = selectedDate.month() + 1;
      const year = selectedDate.year();
      const response = await messAPI.generateDailyRateReport({ month, year });
      setReportData(response.data.data);
    } catch (error) {
      message.error('Failed to generate report');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, [selectedDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // --- NAVIGATION HANDLERS ---
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleReset = () => setSelectedDate(moment());

  const handleExport = async () => {
    if (!reportData) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Rate');
      // ... (Excel logic remains consistent with previous backend requirements)
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DailyRate_${selectedDate.format('MMM_YYYY')}.xlsx`;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const expenseColumns = [
    { title: 'S.No', key: 's_no', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Particulars', dataIndex: 'name', key: 'name', render: (t) => <Text className="text-slate-700">{t}</Text> },
    { 
      title: 'Amount (Rs)', 
      dataIndex: 'amount', 
      key: 'amount', 
      align: 'right', 
      render: (val) => <Text strong className="text-slate-900">₹{parseFloat(val).toFixed(2)}</Text> 
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Calculator className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Daily Rate Ledger</Title>
              <Text type="secondary">Hostel Mess Financial Audit</Text>
            </div>
          </div>

          {/* --- SPLIT MONTH & YEAR CONTROLS --- */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" size="small" icon={<ChevronLeft size={16} />} onClick={() => changeYear(-1)} className="rounded-xl h-9 w-9 flex items-center justify-center text-slate-400 hover:text-blue-600" />
              <div className="px-4 text-center min-w-[80px]">
                <Text strong className="text-slate-700 text-sm">{selectedDate.format('YYYY')}</Text>
              </div>
              <Button type="text" size="small" icon={<ChevronRight size={16} />} onClick={() => changeYear(1)} className="rounded-xl h-9 w-9 flex items-center justify-center text-slate-400 hover:text-blue-600" />
            </div>

            {/* Month Selector */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" size="small" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} className="rounded-xl h-9 w-9 flex items-center justify-center text-slate-400 hover:text-blue-600" />
              <div className="px-6 text-center min-w-[120px]">
                <Text strong className="text-blue-600 text-sm uppercase tracking-wide">{selectedDate.format('MMMM')}</Text>
              </div>
              <Button type="text" size="small" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} className="rounded-xl h-9 w-9 flex items-center justify-center text-slate-400 hover:text-blue-600" />
            </div>

            <Tooltip title="Current Month">
              <Button onClick={handleReset} className="rounded-2xl h-11 border-slate-200 text-slate-500 font-medium hover:text-blue-600">Today</Button>
            </Tooltip>
          </div>

          <Button 
            type="primary" 
            icon={<FileDown size={18}/>} 
            onClick={handleExport} 
            loading={exporting} 
            className="rounded-xl h-12 shadow-lg shadow-blue-100 font-semibold px-8"
          >
            Export
          </Button>
        </div>

        {loading ? <ReportSkeleton /> : (
          <Row gutter={[24, 24]}>
            {/* Table Section */}
            <Col lg={16} xs={24}>
              <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                  <Title level={4} style={{ margin: 0 }}>Expenditure Breakdown</Title>
                  <Button icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} onClick={fetchReport} type="text" className="text-slate-300" />
                </div>
                <Table
                  columns={expenseColumns}
                  dataSource={reportData?.expenses}
                  rowKey="name"
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row className="bg-slate-50 font-bold">
                      <Table.Summary.Cell index={0} colSpan={2} align="right">GROSS SUB-TOTAL</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text className="text-blue-600">₹{parseFloat(reportData?.subTotal).toFixed(2)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>

            {/* Side Calculation Section */}
            <Col lg={8} xs={24}>
              <div className="space-y-6">
                <Card className="border-none shadow-sm rounded-3xl" title={<div className="flex items-center gap-2"><MinusCircle size={18} className="text-rose-500" /> Deductions</div>}>
                  <div className="space-y-4">
                    {[
                      { label: 'Cash Token', val: reportData?.deductions?.cashToken?.amount },
                      { label: 'Sister Concern Bill', val: reportData?.deductions?.creditToken?.amount },
                      { label: 'Special Orders', val: reportData?.deductions?.specialOrders?.amount },
                      { label: 'Guest Income', val: reportData?.deductions?.guestIncome?.amount },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <Text type="secondary" className="text-xs">{item.label}</Text>
                        <Text strong className="text-rose-600">- ₹{parseFloat(item.val || 0).toFixed(2)}</Text>
                      </div>
                    ))}
                    <Divider className="my-2" />
                    <div className="flex justify-between items-center">
                      <Text strong className="text-slate-800">Final Net Expense</Text>
                      <Text strong className="text-lg text-slate-900">₹{parseFloat(reportData?.totalExpenses).toFixed(2)}</Text>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-lg rounded-3xl bg-blue-600 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                      <Users size={16} />
                      <Text className="text-white text-[10px] uppercase font-bold tracking-widest">Total Man Days</Text>
                    </div>
                    <Title level={2} className="text-white mb-6" style={{ margin: 0 }}>{reportData?.totalManDays} Days</Title>
                    <Divider className="border-blue-400 my-4" />
                    <div className="flex items-center gap-2 mb-1 opacity-80">
                      <Receipt size={16} />
                      <Text className="text-white text-[10px] uppercase font-bold tracking-widest">Daily Mess Rate</Text>
                    </div>
                    <div className="flex items-baseline gap-1">
                       <span className="text-2xl font-light">₹</span>
                       <span className="text-5xl font-black">{parseFloat(reportData?.dailyRate).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-20" />
                </Card>
              </div>
            </Col>
          </Row>
        )}
      </div>
    </ConfigProvider>
  );
};

export default DailyRateReport;