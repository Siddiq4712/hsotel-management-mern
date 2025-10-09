import React, { useState, useEffect } from 'react';
import { Card, Table, message, DatePicker, Button, Space, Typography, Row, Col, Statistic, Modal, Form, Select, InputNumber, Input } from 'antd';
import { SyncOutlined, PlusOutlined, UserOutlined, DownloadOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Title } = Typography;
const { Option } = Select;

const MessFeeManagement = () => {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [form] = Form.useForm();
  
  const fetchReportData = async (date, college) => {
    setLoading(true);
    try {
      const month = date.format('M');
      const year = date.format('YYYY');
      const response = await messAPI.generateMonthlyMessReport({ month, year, college });
      const data = response.data.data || [];
      setReportData(data);
      setSummary(response.data.summary || {});
    } catch (error) {
      message.error('Failed to fetch monthly report data.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStudents = async () => {
    try {
      const response = await messAPI.getStudents();
      setStudents(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch students list.');
    }
  };
  
  const calculateSummary = (data) => {
    const summaryData = data.reduce((acc, item) => {
        acc.totalMessAmount += parseFloat(item.messAmount);
        acc.totalAdditionalAmount += parseFloat(item.additionalAmount);
        acc.totalBedCharges += parseFloat(item.bedCharges);
        acc.grandTotal += parseFloat(item.finalAmount);
        return acc;
    }, { totalMessAmount: 0, totalAdditionalAmount: 0, totalBedCharges: 0, grandTotal: 0 });
    setSummary(summaryData);
  }

  useEffect(() => {
    fetchReportData(selectedDate, selectedCollege);
    fetchStudents();
  }, []);

  const handleFilter = () => {
    fetchReportData(selectedDate, selectedCollege);
  };
  
  const handleAddFee = () => {
    form.setFieldsValue({ month_year: selectedDate });
    setIsModalVisible(true);
  };
  
  const handleModalSubmit = async (values) => {
    try {
      const payload = { ...values, month: values.month_year.format('M'), year: values.month_year.format('YYYY') };
      delete payload.month_year;
      await messAPI.createStudentFee(payload);
      message.success('Fee added successfully!');
      setIsModalVisible(false);
      form.resetFields();
      fetchReportData(selectedDate, selectedCollege);
    } catch (error) {
        message.error('Failed to add fee.');
    }
  };

  const handleExportStudentBills = async () => {
    setExporting(true);
    message.loading({ content: 'Generating student bill report...', key: 'export', duration: 0 });
    
    try {
      if (reportData.length === 0) {
        message.warn({ content: 'No data to export. Please load data first.', key: 'export' });
        setExporting(false);
        return;
      }
      
      const workbook = XLSX.utils.book_new();

      const ws_data = reportData.map((row, index) => ({
        'S.No.': index + 1, 'Name': row.name, 'REG NO': row.regNo, 'M.Days': row.messDays, 'Daily rate': row.dailyRate,
        'Mess amount': row.messAmount, 'Additional amount': row.additionalAmount,
        'Bed charges': row.bedCharges, 'Hindu & Indian Express': row.hinduIndianExpress,
        'Total': row.total, 'Net Amount': row.netAmount, 'Roundingup': row.roundingUp,
        'Final Amount': row.finalAmount,
      }));
      
      const ws = XLSX.utils.json_to_sheet([], {
          header: ['S.No.', 'Name', 'REG NO', 'M.Days', 'Daily rate', 'Mess amount', 'Additional amount', 'Bed charges', 'Hindu & Indian Express', 'Total', 'Net Amount', 'Roundingup', 'Final Amount']
      });
      XLSX.utils.sheet_add_aoa(ws, [['NATIONAL ENGINEERING COLLEGE GENTS HOSTEL, K.R. NAGAR 628 503']], { origin: 'A1' });
      XLSX.utils.sheet_add_aoa(ws, [[`MESS BILL FOR THE MONTH OF ${selectedDate.format('MMMM YYYY').toUpperCase()}`]], { origin: 'A2' });
      XLSX.utils.sheet_add_json(ws, ws_data, { origin: 'A4', skipHeader: true });
      ws['!cols'] = [ {wch:5}, {wch:30}, {wch:15}, {wch:8}, {wch:15}, {wch:18}, {wch:15}, {wch:22}, {wch:15}, {wch:15}, {wch:15}, {wch:15}, {wch:15} ];
      XLSX.utils.book_append_sheet(workbook, ws, "Mess Bill");
      
      const collegeName = selectedCollege === 'all' ? 'All_Colleges' : selectedCollege;
      const fileName = `Student_Mess_Bills_${collegeName}_${selectedDate.format('MMM_YYYY')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      message.success({ content: 'Student bill report downloaded!', key: 'export' });
    } catch (error) {
      console.error('Export Error:', error);
      message.error({ content: 'Failed to generate report.', key: 'export' });
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { title: 'S.No.', key: 'sno', render: (text, record, index) => index + 1, width: 60, fixed: 'left' },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, fixed: 'left', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'REG NO', dataIndex: 'regNo', key: 'regNo', width: 120 },
    { title: 'M.Days', dataIndex: 'messDays', key: 'messDays', align: 'center', width: 80 },
    { title: 'Daily Rate', dataIndex: 'dailyRate', key: 'dailyRate', align: 'right', render: (val) => `₹${val.toFixed(2)}` },
    { title: 'Mess Amount', dataIndex: 'messAmount', key: 'messAmount', align: 'right', render: (val) => val.toFixed(2) },
    { title: 'Additional Amount', dataIndex: 'additionalAmount', key: 'additionalAmount', align: 'right', render: (val) => val.toFixed(2) },
    { title: 'Bed Charges', dataIndex: 'bedCharges', key: 'bedCharges', align: 'right', render: (val) => val.toFixed(2) },
    { title: 'Newspaper', dataIndex: 'hinduIndianExpress', key: 'hinduIndianExpress', align: 'right', render: (val) => val.toFixed(2) },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: (val) => val.toFixed(2), sorter: (a, b) => a.total - b.total },
    { title: 'Net Amount', dataIndex: 'netAmount', key: 'netAmount', align: 'right', render: (val) => val.toFixed(2) },
    { title: 'Rounding', dataIndex: 'roundingUp', key: 'roundingUp', align: 'right', render: (val) => val.toFixed(2) },
    { title: 'Final Amount', dataIndex: 'finalAmount', key: 'finalAmount', align: 'right', fixed: 'right', width: 120, render: (val) => <Title level={5} style={{ margin: 0 }}>₹{val}</Title> },
    
  ];

  return (
    <Card>
      <Title level={4}>Monthly Mess Bill Report</Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select value={selectedCollege} style={{ width: 150 }} onChange={setSelectedCollege}>
          <Option value="all">All Colleges</Option>
          <Option value="nec">NEC</Option>
          <Option value="lapc">LAPC</Option>
        </Select>
        <DatePicker picker="month" value={selectedDate} onChange={setSelectedDate} />
        <Button type="primary" icon={<SyncOutlined />} onClick={handleFilter} loading={loading}>Load Data</Button>
        <Button icon={<PlusOutlined />} onClick={handleAddFee}>Add Fee / Expense</Button>
        <Button type="primary" danger icon={<DownloadOutlined />} onClick={handleExportStudentBills} loading={exporting} disabled={reportData.length === 0}>
          Export Student Bills
        </Button>
      </Space>

      <Row gutter={[16, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4}><Statistic title="Total Students" value={reportData.length} prefix={<UserOutlined />} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Man Days" value={summary.messDays} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Daily Rate" value={summary.dailyRate} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Mess Bill" value={summary.totalMessAmount || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Additional" value={summary.totalAdditionalAmount || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Bed Charges" value={summary.totalBedCharges || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Grand Total (Final)" value={summary.grandTotal || 0} prefix="₹" precision={0} valueStyle={{ color: '#cf1322' }} /></Col>
      </Row>

      <Table columns={columns} dataSource={reportData} rowKey="studentId" loading={loading} scroll={{ x: 1500 }} pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '50', '100'], showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items` }}/>
      
      <Modal title="Add New Fee or Expense" visible={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
          <Form.Item name="student_id" label="Student" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select a student" optionFilterProp="children" filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
              {students.map(s => <Option key={s.id} value={s.id}>{s.username}</Option>)}
            </Select>
          </Form.Item>
                    <Form.Item name="fee_type" label="Fee Type" rules={[{ required: true }]}>
            <Select placeholder="Select fee type">
              <Option value="bed_charge">Bed Charge</Option>
              <Option value="water_bill">Water Bill</Option>
              <Option value="fine">Fine</Option>
              <Option value="other_expense">Other Expense</Option>
              {/* Add this new option */}
              <Option value="newspaper">Newspaper Bill</Option>
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} precision={2} />
          </Form.Item>
          <Form.Item name="month_year" label="For Month" rules={[{ required: true }]}>
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default MessFeeManagement;