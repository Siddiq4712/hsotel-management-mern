import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, message, Button, Space, Typography, Row, Col, 
  Statistic, Modal, Form, Select, InputNumber, Input, Divider, 
  ConfigProvider, theme, Skeleton, Badge, Tooltip,DatePicker
} from 'antd';
import { 
  ChevronLeft, ChevronRight, Calculator, FileDown, 
  Plus, RefreshCw, User, Calendar, Users, 
  Receipt, Wallet, Info, CheckCircle2
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

const FeeSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <Skeleton.Input active style={{ width: 300 }} />
        <div className="flex gap-2">
          <Skeleton.Button active style={{ width: 120 }} />
          <Skeleton.Button active style={{ width: 120 }} />
        </div>
      </div>
      <Row gutter={24} className="mb-8">
        {[...Array(4)].map((_, i) => (
          <Col span={6} key={i}><Skeleton active title={true} paragraph={{ rows: 1 }} /></Col>
        ))}
      </Row>
      <Skeleton active paragraph={{ rows: 10 }} />
    </div>
  </Card>
);

const MessFeeManagement = () => {
  const [form] = Form.useForm();
  
  // --- States ---
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [generatingBills, setGeneratingBills] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --- NAVIGATION CONTROLS ---
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleToday = () => setSelectedDate(moment());

  /**
   * CORE FETCH LOGIC: Fetches Daily Rate from the Ledger API 
   * and maps it to the Monthly Report data.
   */
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const month = selectedDate.format('M');
      const year = selectedDate.format('YYYY');

      // Concurrent fetch to ensure Daily Rate matches exactly with the ledger
      const [dailyRateRes, reportRes, studentsRes] = await Promise.all([
        messAPI.generateDailyRateReport({ month, year }),
        messAPI.generateMonthlyMessReport({ month, year, college: selectedCollege }),
        messAPI.getStudents()
      ]);

      // EXTRACTING CALCULATED DAILY RATE (Synchronized with DailyRateReport.jsx)
      const dailyRateValue = dailyRateRes?.data?.data?.dailyRate || 0;
      const ledgerNetExpenses = dailyRateRes?.data?.data?.totalExpenses || 0;
      const ledgerManDays = dailyRateRes?.data?.data?.totalManDays || 0;

      const data = reportRes?.data?.data || [];
      const summaryData = reportRes?.data?.summary || {};
      setStudents(studentsRes.data.data || []);

      // MAP LEDGER VALUES TO SUMMARY CARDS
      summaryData.syncedDailyRate = dailyRateValue;
      summaryData.syncedNetExpenses = ledgerNetExpenses;
      summaryData.syncedManDays = ledgerManDays;

      // UPDATE ROW CALCULATIONS BASED ON THE FETCHED DAILY RATE
      const updatedData = data.map(row => {
        const messAmount = (row.messDays || 0) * dailyRateValue;
        const total = messAmount + row.additionalAmount + row.bedCharges + row.hinduIndianExpress;
        return {
          ...row,
          dailyRate: dailyRateValue,
          messAmount: parseFloat(messAmount.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          finalAmount: Math.round(total),
        };
      });

      setReportData(updatedData);
      setSummary(summaryData);
    } catch (error) {
      message.error('Data synchronization failed');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [selectedDate, selectedCollege]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  const generateBills = async () => {
    setGeneratingBills(true);
    try {
      await messAPI.generateMessBills(null, { 
        params: { month: selectedDate.format('M'), year: selectedDate.format('YYYY'), college: selectedCollege }
      });
      message.success(`Bills processed for ${selectedDate.format('MMMM YYYY')}`);
      fetchReportData();
    } finally {
      setGeneratingBills(false);
    }
  };

  const handleModalSubmit = async (values) => {
    try {
      const payload = { 
        ...values, 
        month: values.month_year.format('M'), 
        year: values.month_year.format('YYYY') 
      };
      await messAPI.createStudentFee(payload);
      message.success('Fee record added');
      setIsModalVisible(false);
      form.resetFields();
      fetchReportData();
    } catch (error) {
      message.error('Submission failed');
    }
  };

  const columns = [
    { title: 'S.No.', key: 'sno', render: (_, __, i) => (currentPage - 1) * pageSize + i + 1, width: 70, fixed: 'left' },
    { title: 'Student Name', dataIndex: 'name', key: 'name', width: 220, fixed: 'left', render: (t) => <Text strong className="text-slate-700">{t}</Text> },
    { title: 'Reg No', dataIndex: 'regNo', width: 120 },
    { title: 'Days', dataIndex: 'messDays', align: 'center', width: 80, render: (d) => <Badge count={d} color="#2563eb" overflowCount={31} /> },
    { title: 'Daily Rate', dataIndex: 'dailyRate', align: 'right', render: (v) => <Text type="secondary">₹{parseFloat(v).toFixed(2)}</Text> },
    { title: 'Extra Charges', dataIndex: 'additionalAmount', align: 'right', render: (v) => v > 0 ? <Text type="danger">+₹{v}</Text> : '—' },
    { title: 'Total', dataIndex: 'total', align: 'right', className: 'bg-slate-50/50', render: (v) => <Text strong>₹{v}</Text> },
    { title: 'Payable Amount', dataIndex: 'finalAmount', align: 'right', fixed: 'right', width: 140, render: (v) => (
      <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 text-right">
        <Text strong className="text-blue-600 text-base">₹{v}</Text>
      </div>
    )},
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header with Navigation Controllers */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Calculator className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Fee Management</Title>
              <Text type="secondary">Generate and audit student-wise mess invoices</Text>
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

            <Button onClick={handleToday} className="rounded-2xl h-11 border-slate-200 text-slate-500 font-medium hover:text-blue-600">Today</Button>
          </div>

          <Space>
            <Button icon={<Plus size={18}/>} onClick={() => setIsModalVisible(true)} className="rounded-xl h-12">Manual Charge</Button>
            <Button type="primary" icon={<FileDown size={18}/>} className="rounded-xl h-12 shadow-lg shadow-blue-100 font-semibold px-8">Export Bills</Button>
          </Space>
        </div>

        {/* --- SYNCED STATISTIC CARDS --- */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic 
                title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Calculated Daily Rate</span>}
                value={summary.syncedDailyRate || 0}
                prefix={<Receipt size={18} className="text-emerald-500 mr-2" />}
                suffix={<Text className="text-xs text-slate-400 ml-1">/ day</Text>}
                precision={2}
                valueStyle={{ color: '#059669', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic 
                title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Net Expense</span>}
                value={summary.syncedNetExpenses || 0}
                prefix={<Wallet size={18} className="text-rose-500 mr-2" />}
                precision={2}
                valueStyle={{ color: '#0f172a', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic 
                title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Beneficiaries</span>}
                value={reportData.length}
                prefix={<Users size={18} className="text-blue-500 mr-2" />}
                valueStyle={{ color: '#0f172a', fontWeight: 800 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic 
                title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Man Days</span>}
                value={summary.syncedManDays || 0}
                prefix={<Calendar size={18} className="text-orange-500 mr-2" />}
                valueStyle={{ color: '#0f172a', fontWeight: 800 }}
              />
            </Card>
          </Col>
        </Row>

        <Card className="border-none shadow-sm rounded-2xl mb-6">
          <div className="flex justify-between items-center">
            <Space size="large">
              <Select value={selectedCollege} className="w-48 h-10" onChange={setSelectedCollege}>
                <Option value="all">All Institutions</Option>
                <Option value="nec">NEC</Option>
                <Option value="lapc">LAPC</Option>
              </Select>
              <Button type="primary" ghost icon={<RefreshCw size={16}/>} onClick={fetchReportData} className="rounded-xl h-10">Sync Ledger</Button>
            </Space>
            <Button 
              type="primary" 
              icon={<CheckCircle2 size={18} />} 
              onClick={generateBills} 
              loading={generatingBills}
              className="rounded-xl h-10 px-8 font-bold"
            >
              Finalize & Generate Invoices
            </Button>
          </div>
        </Card>

        {loading ? <FeeSkeleton /> : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table 
              columns={columns} 
              dataSource={reportData} 
              rowKey="studentId" 
              scroll={{ x: 1200 }} 
              pagination={{ 
                current: currentPage, pageSize: pageSize,
                onChange: (p, s) => { setCurrentPage(p); setPageSize(s); },
                showSizeChanger: true
              }}
            />
          </Card>
        )}

        {/* Charge Modal */}
        <Modal 
          title={<div className="flex items-center gap-2 text-blue-600"><Plus size={18}/> Manual Fee Recording</div>} 
          open={isModalVisible} 
          onCancel={() => setIsModalVisible(false)} 
          onOk={() => form.submit()}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleModalSubmit} className="mt-4">
            <Form.Item name="student_id" label="Student Beneficiary" rules={[{ required: true }]}>
              <Select showSearch placeholder="Search Student..." optionFilterProp="children">
                {students.map(s => <Option key={s.id} value={s.id}>{s.username} ({s.roll_number})</Option>)}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fee_type" label="Charge Type" rules={[{ required: true }]}>
                  <Select placeholder="Select Type">
                    <Option value="bed_charge">Bed Charge</Option>
                    <Option value="water_bill">Water Bill</Option>
                    <Option value="fine">Disciplinary Fine</Option>
                    <Option value="newspaper">Newspaper Bill</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                  <InputNumber className="w-full h-11 flex items-center rounded-xl" prefix="₹" precision={2} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="month_year" label="Target Month" rules={[{ required: true }]} initialValue={selectedDate}>
              <DatePicker picker="month" className="w-full rounded-xl" />
            </Form.Item>
            <Form.Item name="description" label="Remarks">
              <Input.TextArea rows={2} placeholder="Optional reference details..." className="rounded-xl" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MessFeeManagement;