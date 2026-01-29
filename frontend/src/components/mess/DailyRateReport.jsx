import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Button, Row, Col, Table, message, Typography, 
  Space, Divider, ConfigProvider, theme, Skeleton, Tooltip, Modal, Radio, Statistic 
} from 'antd';
import { 
  Calculator, FileDown, ChevronLeft, ChevronRight, 
  Send, Monitor, Save, ArrowRight, MinusCircle, UserCheck, Receipt, Info
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

const DailyRateReport = ({ sharedData = null, isReadOnly = false }) => {
  const [loading, setLoading] = useState(!isReadOnly);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState(sharedData);
  const [selectedDate, setSelectedDate] = useState(moment());
  
  // Notification Modal States
  const [isNotifyModalVisible, setIsNotifyModalVisible] = useState(false);
  const [notifyMethod, setNotifyMethod] = useState('share');
  const [notifying, setNotifying] = useState(false);

  const fetchReport = useCallback(async () => {
    if (isReadOnly) return;
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
  }, [selectedDate, isReadOnly]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleSaveToLedger = async () => {
    setSaving(true);
    try {
      await messAPI.saveDailyRate({
        month: selectedDate.month() + 1,
        year: selectedDate.year()
      });
      message.success(`Financial record for ${selectedDate.format('MMMM YYYY')} has been locked/updated in the ledger.`);
    } catch (error) {
      message.error(error.message || 'Failed to save daily rate');
    } finally {
      setSaving(false);
    }
  };

  const handleNotifyAdmin = async () => {
    setNotifying(true);
    try {
      await messAPI.notifyAdmin({
        method: notifyMethod,
        reportData: reportData,
        month: selectedDate.format('MMMM'),
        year: selectedDate.format('YYYY')
      });
      message.success('Admin notified successfully.');
      setIsNotifyModalVisible(false);
    } catch (error) {
      message.error('Failed to notify admin');
    } finally {
      setNotifying(false);
    }
  };

  const handleExport = async () => {
    try {
      const month = selectedDate.month() + 1;
      const year = selectedDate.year();
      const response = await messAPI.exportDailyRateReport({ month, year });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DailyRate_${month}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      message.error('Export failed');
    }
  };

  const expenseColumns = [
    { title: 'S.No', key: 's_no', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Particulars', dataIndex: 'name', key: 'name', render: (t) => <Text className="font-medium">{t}</Text> },
    { title: 'Amount (Rs)', dataIndex: 'amount', key: 'amount', align: 'right', 
      render: (val) => <Text strong>₹{parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text> },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className={`${isReadOnly ? 'p-0' : 'p-4 lg:p-8 bg-slate-50 min-h-screen'}`}>
        
        {/* HEADER SECTION */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
              <Calculator size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Daily Rate Ledger</Title>
              <Text type="secondary">Financial Auditing & Mess Bill Generation</Text>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white p-1 rounded-2xl shadow-sm border flex items-center">
                <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => setSelectedDate(prev => prev.clone().subtract(1, 'month'))} />
                <Text strong className="px-4 min-w-[140px] text-center">{selectedDate.format('MMMM YYYY')}</Text>
                <Button type="text" icon={<ChevronRight size={16} />} onClick={() => setSelectedDate(prev => prev.clone().add(1, 'month'))} />
              </div>

              <Space>
                <Button 
                  icon={<Save size={18} className="text-blue-600" />} 
                  onClick={handleSaveToLedger}
                  loading={saving}
                  className="rounded-xl h-12 font-semibold bg-white border-blue-200 hover:bg-blue-50"
                >
                  Save to Ledger
                </Button>
                <Button 
                  icon={<Send size={18} className="text-emerald-500" />} 
                  onClick={() => setIsNotifyModalVisible(true)}
                  className="rounded-xl h-12 font-semibold"
                >
                  Notify Admin
                </Button>
                <Button 
                  type="primary" 
                  icon={<FileDown size={18}/>} 
                  onClick={handleExport} 
                  className="rounded-xl h-12 px-6"
                >
                  Export
                </Button>
              </Space>
            </div>
          )}
        </div>

        {loading ? <Skeleton active /> : (
          <>
            {/* NEW: FORMULA BREAKDOWN BAR */}
            <Card className="mb-8 border-none shadow-md rounded-[32px] overflow-hidden bg-white">
              <div className="flex flex-col lg:flex-row items-center justify-around p-2 gap-4 lg:gap-0 text-center">
                <div className="px-6">
                  <Text type="secondary" className="uppercase text-[10px] tracking-wider font-bold">Gross Expenses (+)</Text>
                  <Title level={3} className="m-0 text-slate-800">₹{reportData?.subTotal?.toLocaleString()}</Title>
                </div>
                <MinusCircle className="text-slate-300 hidden lg:block" size={24} />
                <div className="px-6">
                  <Text type="secondary" className="uppercase text-[10px] tracking-wider font-bold">Deductions (-)</Text>
                  <Title level={3} className="m-0 text-red-500">₹{reportData?.totalDeductions?.toLocaleString()}</Title>
                </div>
                <div className="bg-slate-100 h-10 w-[2px] hidden lg:block" />
                <div className="px-6">
                  <Text type="secondary" className="uppercase text-[10px] tracking-wider font-bold">Total Man-Days (÷)</Text>
                  <Title level={3} className="m-0 text-blue-600">{reportData?.totalManDays}</Title>
                </div>
                <ArrowRight className="text-slate-300 hidden lg:block" size={24} />
                <div className="px-8 py-3 bg-blue-600 rounded-[24px] text-white shadow-xl shadow-blue-200">
                  <Text className="text-white opacity-80 uppercase text-[10px] tracking-wider font-bold block">Final Daily Rate</Text>
                  <Title level={2} className="m-0 text-white">₹{reportData?.dailyRate?.toFixed(2)}</Title>
                </div>
              </div>
            </Card>

            <Row gutter={[24, 24]}>
              {/* EXPENSE TABLE */}
              <Col lg={16} xs={24}>
                <Card 
                  title={<div className="flex items-center gap-2"><Receipt size={18}/><span>Expense Particulars</span></div>}
                  className="shadow-sm rounded-3xl overflow-hidden" 
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    columns={expenseColumns}
                    dataSource={reportData?.expenses}
                    rowKey="name"
                    pagination={false}
                    className="custom-table"
                    summary={() => (
                      <Table.Summary.Row className="bg-slate-50 font-bold">
                        <Table.Summary.Cell index={0} colSpan={2} align="right">GROSS SUB-TOTAL</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text className="text-blue-600">₹{parseFloat(reportData?.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                </Card>
              </Col>

              {/* DEDUCTIONS & SUMMARY SIDEBAR */}
              <Col lg={8} xs={24}>
                <div className="flex flex-col gap-6">
                  <Card className="shadow-sm rounded-3xl border-none" title="Deductions Breakdown">
                    <Space direction="vertical" className="w-full" size="middle">
                      <div className="flex justify-between items-center">
                        <Space><Text type="secondary">Cash Tokens</Text></Space>
                        <Text strong>₹{reportData?.deductions?.cashToken?.amount?.toLocaleString()}</Text>
                      </div>
                      <div className="flex justify-between items-center">
                        <Space><Text type="secondary">Sister Concern Bills</Text></Space>
                        <Text strong>₹{reportData?.deductions?.creditToken?.amount?.toLocaleString()}</Text>
                      </div>
                      <div className="flex justify-between items-center">
                        <Space><Text type="secondary">Special Orders</Text></Space>
                        <Text strong>₹{reportData?.deductions?.specialOrders?.amount?.toLocaleString()}</Text>
                      </div>
                      <div className="flex justify-between items-center">
                        <Space><Text type="secondary">Guest Income</Text></Space>
                        <Text strong>₹{reportData?.deductions?.guestIncome?.amount?.toLocaleString()}</Text>
                      </div>
                      <Divider className="my-2" />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <Text>Total Deductions</Text>
                        <Text className="text-red-500">₹{reportData?.totalDeductions?.toLocaleString()}</Text>
                      </div>
                    </Space>
                  </Card>

                  <Card className="shadow-sm rounded-3xl border-l-4 border-l-blue-600">
                    <Statistic 
                      title="Total Operations Cost (Net)" 
                      value={reportData?.totalExpenses} 
                      precision={2} 
                      prefix="₹" 
                    />
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-start gap-3">
                      <Info size={16} className="text-blue-600 mt-1 shrink-0" />
                      <Text className="text-blue-800 text-xs">
                        This net amount is used to calculate the daily rate against {reportData?.totalManDays} man-days.
                      </Text>
                    </div>
                  </Card>
                </div>
              </Col>
            </Row>
          </>
        )}

        {/* NOTIFY MODAL (Unchanged) */}
        <Modal
          title="Share Report with Administrator"
          open={isNotifyModalVisible}
          onOk={handleNotifyAdmin}
          confirmLoading={notifying}
          onCancel={() => setIsNotifyModalVisible(false)}
          okText="Send Notification"
          centered
        >
          <div className="py-4">
            <Radio.Group onChange={(e) => setNotifyMethod(e.target.value)} value={notifyMethod} className="w-full flex flex-col gap-3">
              <Radio.Button value="share" className="h-20 flex items-center rounded-xl px-4">
                <Monitor className="mr-4 text-blue-500" />
                <div className="text-left">
                  <div className="font-bold text-slate-700">Share Screen (Live)</div>
                  <div className="text-xs text-slate-400">Admin gets a popup to view this live screen instantly.</div>
                </div>
              </Radio.Button>
              <Radio.Button value="email" className="h-20 flex items-center rounded-xl px-4">
                <Send className="mr-4 text-emerald-500" />
                <div className="text-left">
                  <div className="font-bold text-slate-700">Send Email</div>
                  <div className="text-xs text-slate-400">Sends a detailed summary report to Admin's inbox.</div>
                </div>
              </Radio.Button>
            </Radio.Group>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default DailyRateReport;