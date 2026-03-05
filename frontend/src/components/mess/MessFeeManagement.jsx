import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, message, Button, Space, Typography, Row, Col, 
  Statistic, Modal, Form, Select, InputNumber, Input, Divider, 
  ConfigProvider, theme, Skeleton, Badge, Tooltip, DatePicker
} from 'antd';
import { 
  ChevronLeft, ChevronRight, Calculator, FileDown, 
  Plus, RefreshCw, User, Calendar, Users, 
  Receipt, Wallet, Info, CheckCircle2, Mail
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

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
  const [generatingBills, setGeneratingBills] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --- Navigation Controls ---
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleToday = () => setSelectedDate(moment());

  /**
   * Fetches the report data and synchronizes with the Ledger
   */
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const month = selectedDate.format('M');
      const year = selectedDate.format('YYYY');

      const [dailyRateRes, reportRes, studentsRes] = await Promise.all([
        messAPI.generateDailyRateReport({ month, year }),
        messAPI.generateMonthlyMessReport({ month, year, college: selectedCollege }),
        messAPI.getStudents()
      ]);

      const dailyRateValue = dailyRateRes?.data?.data?.dailyRate || 0;
      const ledgerNetExpenses = dailyRateRes?.data?.data?.totalExpenses || 0;
      const ledgerManDays = dailyRateRes?.data?.data?.totalManDays || 0;

      const data = reportRes?.data?.data || [];
      const summaryData = reportRes?.data?.summary || {};
      setStudents(studentsRes.data.data || []);

      summaryData.syncedDailyRate = dailyRateValue;
      summaryData.syncedNetExpenses = ledgerNetExpenses;
      summaryData.syncedManDays = ledgerManDays;

      // Update calculations based on synced Ledger Daily Rate
      const updatedData = data.map(row => {
        const messAmount = (row.messDays || 0) * dailyRateValue;
        
        // Ensure bedCharges and newspaper (hinduIndianExpress) are included in the math
        const bed = parseFloat(row.bedCharges || 0);
        const paper = parseFloat(row.hinduIndianExpress || 0);
        const extra = parseFloat(row.additionalAmount || 0);

        const total = messAmount + extra + bed + paper;

        return {
          ...row,
          dailyRate: dailyRateValue,
          messAmount: parseFloat(messAmount.toFixed(2)),
          bedCharges: bed, // ensure it's a number
          hinduIndianExpress: paper, // ensure it's a number
          total: parseFloat(total.toFixed(2)),
          finalAmount: row.finalAmount || Math.round(total),
        };
      });

      setReportData(updatedData);
      setSummary(summaryData);
    } catch (error) {
      console.error(error);
      message.error('Data synchronization failed');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedCollege]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  /**
   * Triggers the Finalize & Email process with a Confirmation Dialog
   */
  const handleFinalizeBills = () => {
    const monthName = selectedDate.format('MMMM YYYY');
    
    Modal.confirm({
      title: <span className="text-blue-600 flex items-center gap-2"><Mail size={20} /> Finalize & Dispatch Bills?</span>,
      icon: null,
      content: (
        <div className="mt-4">
          <p>You are about to finalize the mess bills for <strong>{monthName}</strong>.</p>
          <ul className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-700 text-sm list-disc pl-6 space-y-1">
            <li>Finalized bills will be saved to the database.</li>
            <li><strong>Automated emails</strong> will be sent to all {reportData.length} students.</li>
            <li>The email will include the detailed cost breakdown.</li>
          </ul>
          <p className="mt-4 text-slate-500 text-xs italic">This action will appear in the system audit logs.</p>
        </div>
      ),
      okText: 'Yes, Finalize & Email All',
      cancelText: 'Cancel',
      okButtonProps: { size: 'large', className: 'rounded-xl px-6 font-bold' },
      cancelButtonProps: { size: 'large', className: 'rounded-xl' },
      // src/pages/mess/MessFeeManagement.jsx

  onOk: async () => {
    setGeneratingBills(true);
    const hide = message.loading(`Dispatched emails for ${monthName}...`, 0);
    try {
      // Ensure the object is the FIRST argument (the 'data' argument for POST)
      const res = await messAPI.generateMessBills({ 
        month: selectedDate.format('M'), 
        year: selectedDate.format('YYYY'), 
        college: selectedCollege 
      });
      
      message.success(res.data.message || `Bills generated and emails sent successfully!`);
      fetchReportData();
    } catch (error) {
      // The error you saw comes from here
      message.error(error.message || 'Failed to generate bills'); 
    } finally {
      hide();
      setGeneratingBills(false);
    }
  }
    });
  };

  const handleManualFeeSubmit = async (values) => {
    try {
      const payload = { 
        ...values, 
        month: values.month_year.format('M'), 
        year: values.month_year.format('YYYY') 
      };
      await messAPI.createStudentFee(payload);
      message.success('Fee record successfully added');
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
    
    // --- ADDED COLUMNS START ---
    { 
      title: 'Bed Fee', 
      dataIndex: 'bedCharges', 
      align: 'right', 
      render: (v) => v > 0 ? <Text className="text-orange-600">₹{v}</Text> : <Text type="secondary" className="text-[10px]">NA</Text> 
    },
    { 
      title: 'Newspaper', 
      dataIndex: 'hinduIndianExpress', 
      align: 'right', 
      render: (v) => v > 0 ? <Text className="text-purple-600">₹{v}</Text> : <Text type="secondary" className="text-[10px]">NA</Text> 
    },
    // --- ADDED COLUMNS END ---

    { title: 'Extra Charges', dataIndex: 'additionalAmount', align: 'right', render: (v) => v > 0 ? <Text type="danger">+₹{v}</Text> : '—' },
    { title: 'Total', dataIndex: 'total', align: 'right', className: 'bg-slate-50/50', render: (v) => <Text strong>₹{v}</Text> },
    { 
      title: 'Payable Amount', 
      dataIndex: 'finalAmount', 
      align: 'right', 
      fixed: 'right', 
      width: 150, 
      render: (v) => (
        <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 text-right">
          <Text strong className="text-blue-600 text-base">₹{v}</Text>
        </div>
      )
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Calculator className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Mess Fee Management</Title>
              <Text type="secondary">Review ledger calculations and dispatch monthly student bills</Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
              <div className="px-6 text-center min-w-[140px]">
                <Text strong className="text-blue-600 uppercase tracking-widest">{selectedDate.format('MMMM YYYY')}</Text>
              </div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
            </div>
            <Button onClick={handleToday} className="rounded-2xl h-11 border-slate-200 text-slate-500 font-medium">Current Month</Button>
          </div>

          <Space>
            <Button icon={<Plus size={18}/>} onClick={() => setIsModalVisible(true)} className="rounded-xl h-12">Add Manual Fee</Button>
            <Button 
              type="primary" 
              icon={<CheckCircle2 size={18} />} 
              onClick={handleFinalizeBills}
              loading={generatingBills}
              className="rounded-xl h-12 shadow-lg shadow-blue-100 font-bold px-8 bg-emerald-600 hover:bg-emerald-700 border-none"
            >
              Finalize & Send Emails
            </Button>
          </Space>
        </div>

        {/* Statistic Cards */}
        <Row gutter={[24, 24]} className="mb-8">
          {[
            { label: 'Calculated Rate', value: summary.syncedDailyRate, color: '#059669', icon: <Receipt size={18}/>, suffix: '/ day' },
            { label: 'Net Mess Cost', value: summary.syncedNetExpenses, color: '#0f172a', icon: <Wallet size={18}/> },
            { label: 'Total Students', value: reportData.length, color: '#0f172a', icon: <Users size={18}/> },
            { label: 'Total Man-Days', value: summary.syncedManDays, color: '#0f172a', icon: <Calendar size={18}/> },
          ].map((stat, idx) => (
            <Col xs={24} sm={12} lg={6} key={idx}>
              <Card className="border-none shadow-sm rounded-2xl">
                <Statistic 
                  title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</span>}
                  value={stat.value || 0}
                  prefix={<div style={{ color: stat.color }} className="mr-2 opacity-70">{stat.icon}</div>}
                  suffix={stat.suffix && <Text className="text-xs text-slate-400 ml-1">{stat.suffix}</Text>}
                  precision={idx < 2 ? 2 : 0}
                  valueStyle={{ color: stat.color, fontWeight: 800 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Filter Toolbar */}
        <Card className="border-none shadow-sm rounded-2xl mb-6">
          <div className="flex justify-between items-center">
            <Space size="large">
              <Select value={selectedCollege} className="w-56 h-10" onChange={setSelectedCollege}>
                <Option value="all">All Institutions</Option>
                <Option value="nec">National Engineering College</Option>
                <Option value="lapc">Lakshmi Ammal Polytech</Option>
              </Select>
              <Button type="primary" ghost icon={<RefreshCw size={16}/>} onClick={fetchReportData} className="rounded-xl h-10">Refresh Data</Button>
            </Space>
            <div className="flex items-center gap-2 text-slate-400">
              <Info size={14} />
              <Text style={{ fontSize: '12px' }}>Amounts are rounded based on 0.20 threshold logic.</Text>
            </div>
          </div>
        </Card>

        {/* Table Section */}
        {loading ? <FeeSkeleton /> : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table 
              columns={columns} 
              dataSource={reportData} 
              rowKey="studentId" 
              scroll={{ x: 1400 }} 
              pagination={{ 
                current: currentPage, pageSize: pageSize,
                onChange: (p, s) => { setCurrentPage(p); setPageSize(s); },
                showSizeChanger: true,
                className: "p-6"
              }}
            />
          </Card>
        )}

        {/* Manual Fee Modal */}
        <Modal 
          title={<div className="flex items-center gap-2 text-blue-600"><Plus size={18}/> Manual Fee Recording</div>} 
          open={isModalVisible} 
          onCancel={() => setIsModalVisible(false)} 
          onOk={() => form.submit()}
          okText="Record Charge"
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleManualFeeSubmit} className="mt-4">
            <Form.Item name="student_id" label="Student Beneficiary" rules={[{ required: true }]}>
              <Select showSearch placeholder="Search student name or roll..." optionFilterProp="children">
                {students.map(s => <Option key={s.id} value={s.id}>{s.userName} ({s.roll_number})</Option>)}
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
                    <Option value="other_expense">Other Expenses</Option>
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
              <DatePicker picker="month" className="w-full rounded-xl h-11" />
            </Form.Item>
            <Form.Item name="description" label="Remarks / Description">
              <Input.TextArea rows={2} placeholder="Brief reason for this charge..." className="rounded-xl" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MessFeeManagement;