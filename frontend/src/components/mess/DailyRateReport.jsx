import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Button, Row, Col, Table, message, Typography, 
  Space, Divider, ConfigProvider, theme, Skeleton, Tooltip, Modal, Radio 
} from 'antd';
import { 
  Calculator, FileDown, RefreshCw, ChevronLeft, ChevronRight, 
  Users, Receipt, MinusCircle, Send, Monitor , Tag
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import ExcelJS from 'exceljs';

const { Title, Text } = Typography;

const DailyRateReport = ({ sharedData = null, isReadOnly = false }) => {
  const [loading, setLoading] = useState(!isReadOnly);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(sharedData);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [isNotifyModalVisible, setIsNotifyModalVisible] = useState(false);
  const [notifyMethod, setNotifyMethod] = useState('share');
  const [notifying, setNotifying] = useState(false);

  const fetchReport = useCallback(async () => {
    if (isReadOnly) return; // Don't fetch if we are viewing shared data
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

  const handleNotifyAdmin = async () => {
    setNotifying(true);
    try {
      await messAPI.notifyAdmin({
        method: notifyMethod,
        reportData: reportData, // Sends the current screen state
        month: selectedDate.format('MMMM'),
        year: selectedDate.format('YYYY'),
        hostelName: "Main Campus Hostel" // This should come from auth context
      });
      
      message.success(notifyMethod === 'share' 
        ? 'Admin notified! Screen shared successfully.' 
        : 'Report sent to Admin via email.');
      setIsNotifyModalVisible(false);
    } catch (error) {
      message.error('Failed to notify admin');
    } finally {
      setNotifying(false);
    }
  };

  // ... Navigation Handlers (Keep your existing changeMonth, changeYear, handleExport) ...
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleReset = () => setSelectedDate(moment());
  
  const handleExport = async () => { /* Your existing Excel logic */ };

  const expenseColumns = [
    { title: 'S.No', key: 's_no', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Particulars', dataIndex: 'name', key: 'name', render: (t) => <Text>{t}</Text> },
    { title: 'Amount (Rs)', dataIndex: 'amount', key: 'amount', align: 'right', 
      render: (val) => <Text strong>₹{parseFloat(val).toFixed(2)}</Text> },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className={`${isReadOnly ? 'p-0' : 'p-8 bg-slate-50 min-h-screen'}`}>
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Calculator className="text-white" size={24} />
            </div>
            <div>
              <Title level={isReadOnly ? 4 : 2} style={{ margin: 0 }}>Daily Rate Ledger</Title>
              <Text type="secondary">{isReadOnly ? 'Viewing Shared Screen' : 'Hostel Mess Financial Audit'}</Text>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Year & Month Selectors (Your existing UI) */}
              <div className="bg-white p-1 rounded-2xl shadow-sm border flex items-center">
                <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
                <Text strong className="px-4">{selectedDate.format('MMMM YYYY')}</Text>
                <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
              </div>

              <Space>
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
                  className="rounded-xl h-12 px-8"
                >
                  Export
                </Button>
              </Space>
            </div>
          )}
        </div>

        {loading ? <Skeleton active /> : (
          <Row gutter={[24, 24]}>
            <Col lg={16} xs={24}>
              <Card className="shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <Table
                  columns={expenseColumns}
                  dataSource={reportData?.expenses}
                  rowKey="name"
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row className="bg-slate-50 font-bold">
                      <Table.Summary.Cell index={0} colSpan={2} align="right">GROSS SUB-TOTAL</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text className="text-blue-600">₹{parseFloat(reportData?.subTotal || 0).toFixed(2)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>

            <Col lg={8} xs={24}>
              <div className="space-y-6">
                <Card className="shadow-sm rounded-3xl" title="Deductions">
                  {/* ... Deduction items logic ... */}
                  <div className="flex justify-between items-center text-lg font-bold">
                    <Text>Final Net Expense</Text>
                    <Text>₹{parseFloat(reportData?.totalExpenses || 0).toFixed(2)}</Text>
                  </div>
                </Card>

                <Card className="shadow-lg rounded-3xl bg-blue-600 text-white">
                  <Text className="text-white opacity-80 uppercase text-[10px] font-bold">Daily Mess Rate</Text>
                  <div className="flex items-baseline gap-1">
                     <span className="text-2xl">₹</span>
                     <span className="text-5xl font-black">{parseFloat(reportData?.dailyRate || 0).toFixed(2)}</span>
                  </div>
                </Card>
              </div>
            </Col>
          </Row>
        )}

        {/* Share Choice Modal */}
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
            <Radio.Group 
              onChange={(e) => setNotifyMethod(e.target.value)} 
              value={notifyMethod}
              className="w-full flex flex-col gap-3"
            >
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