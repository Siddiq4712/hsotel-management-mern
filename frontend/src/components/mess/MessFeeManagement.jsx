import React, { useState, useEffect } from 'react';
import { Card, Table, message, DatePicker, Button, Space, Typography, Row, Col, Statistic, Modal, Form, Select, InputNumber, Input } from 'antd';
import { SyncOutlined, PlusOutlined, UserOutlined, DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
  const [generatingBills, setGeneratingBills] = useState(false);
  const [billsGenerated, setBillsGenerated] = useState(false); // Track if bills are generated for current month
  const [selectedDate, setSelectedDate] = useState(moment());
  const [selectedCollege, setSelectedCollege] = useState('all'); // Add college state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [form] = Form.useForm();

  // --- NEW STATE FOR CONTROLLED PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // --- END NEW STATE ---
  
  const fetchReportData = async (date, college) => { // Add college param
    setLoading(true);
    try {
      const month = date.format('M');
      const year = date.format('YYYY');
      const response = await messAPI.generateMonthlyMessReport({ month, year, college }); // Pass college to API
      const data = response.data.data || [];
      setReportData(data);
      setSummary(response.data.summary || {});
      // Reset bills generated flag on refetch
      setBillsGenerated(false);
      // Reset page to 1 and pageSize to default when new data is loaded
      setCurrentPage(1);
      setPageSize(10); 
    } catch (error) {
      console.error("Failed to fetch monthly report:", error);
      message.error('Failed to fetch monthly report data.');
    } finally {
      setLoading(false);
    }
  };
  
  const generateBills = async () => {
    setGeneratingBills(true);
    try {
      const month = selectedDate.format('M');
      const year = selectedDate.format('YYYY');
      const response = await messAPI.generateMessBills(null, { 
        params: { month, year, college: selectedCollege }
      });

      if (response.data.success) {
        message.success(`Bills generated/updated successfully for ${selectedDate.format('MMMM YYYY')}! Total: ₹${response.data.summary.totalAmount}`);
        setBillsGenerated(true);
        // Optionally refetch report to reflect any changes
        fetchReportData(selectedDate, selectedCollege);
      }
    } catch (error) {
      console.error("Failed to generate bills:", error);
      message.error('Failed to generate bills. Check if bills already exist or try again.');
    } finally {
      setGeneratingBills(false);
    }
  };
  
  const fetchStudents = async () => {
    try {
      // Assuming messAPI.getStudents returns all students without specific bed requirement filter for this modal
      const response = await messAPI.getStudents(); 
      setStudents(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch students list.');
    }
  };

  useEffect(() => {
    fetchReportData(selectedDate, selectedCollege); // Initial fetch with college
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
      // Ensure the correct fee_type for newspaper is used if the frontend sends a different one
      if (values.fee_type === 'newspaper_bill') { // Example: if frontend sends 'newspaper_bill'
        values.fee_type = 'newspaper'; // Change to 'newspaper' to match backend's expected type
      }
      
      const payload = { 
        ...values, 
        month: values.month_year.format('M'), 
        year: values.month_year.format('YYYY') 
      };
      delete payload.month_year; // Remove the moment object before sending
      
      await messAPI.createStudentFee(payload);
      message.success('Fee added successfully!');
      setIsModalVisible(false);
      form.resetFields();
      fetchReportData(selectedDate, selectedCollege); // Refresh data after adding fee
    } catch (error) {
        console.error("Failed to add fee:", error);
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
        'Mess amount': parseFloat(row.messAmount).toFixed(2), // Ensure consistent format
        'Additional amount': parseFloat(row.additionalAmount).toFixed(2),
        'Bed charges': parseFloat(row.bedCharges).toFixed(2),
        'Hindu & Indian Express': parseFloat(row.hinduIndianExpress).toFixed(2), // Newspaper
        'Total': parseFloat(row.total).toFixed(2),
        'Net Amount': parseFloat(row.netAmount).toFixed(2),
        'Roundingup': parseFloat(row.roundingUp).toFixed(2),
        'Final Amount': parseFloat(row.finalAmount).toFixed(0), // Final amount typically rounded to whole number
      }));
      
      const ws = XLSX.utils.json_to_sheet([], {
          header: ['S.No.', 'Name', 'REG NO', 'M.Days', 'Daily rate', 'Mess amount', 'Additional amount', 'Bed charges', 'Hindu & Indian Express', 'Total', 'Net Amount', 'Roundingup', 'Final Amount']
      });
      XLSX.utils.sheet_add_aoa(ws, [['NATIONAL ENGINEERING COLLEGE GENTS HOSTEL, K.R. NAGAR 628 503']], { origin: 'A1' });
      XLSX.utils.sheet_add_aoa(ws, [[`MESS BILL FOR THE MONTH OF ${selectedDate.format('MMMM YYYY').toUpperCase()}`]], { origin: 'A2' });
      XLSX.utils.sheet_add_json(ws, ws_data, { origin: 'A4', skipHeader: false }); // skipHeader: false to include headers

      // Set column widths dynamically (after json_to_sheet if headers are included in ws_data)
      ws['!cols'] = [ 
          {wch:5},  // S.No.
          {wch:30}, // Name
          {wch:15}, // REG NO
          {wch:8},  // M.Days
          {wch:15}, // Daily rate
          {wch:18}, // Mess amount
          {wch:20}, // Additional amount (increased width due to combined data)
          {wch:15}, // Bed charges
          {wch:22}, // Hindu & Indian Express
          {wch:15}, // Total
          {wch:15}, // Net Amount
          {wch:15}, // Roundingup
          {wch:15}  // Final Amount
      ];
      
      XLSX.utils.book_append_sheet(workbook, ws, "Mess Bill");
      
      const collegeName = selectedCollege === 'all' ? 'All_Colleges' : selectedCollege.toUpperCase();
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
    { title: 'S.No.', key: 'sno', render: (text, record, index) => (currentPage - 1) * pageSize + index + 1, width: 60, fixed: 'left' },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, fixed: 'left', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'REG NO', dataIndex: 'regNo', key: 'regNo', width: 120 },
    { title: 'M.Days', dataIndex: 'messDays', key: 'messDays', align: 'center', width: 80 },
    { title: 'Daily Rate', dataIndex: 'dailyRate', key: 'dailyRate', align: 'right', render: (val) => `₹${parseFloat(val).toFixed(2)}` },
    { title: 'Mess Amount', dataIndex: 'messAmount', key: 'messAmount', align: 'right', render: (val) => parseFloat(val).toFixed(2) },
    { title: 'Additional Amount', dataIndex: 'additionalAmount', key: 'additionalAmount', align: 'right', render: (val) => parseFloat(val).toFixed(2) },
    { title: 'Bed Charges', dataIndex: 'bedCharges', key: 'bedCharges', align: 'right', render: (val) => parseFloat(val).toFixed(2) },
    { title: 'Newspaper', dataIndex: 'hinduIndianExpress', key: 'hinduIndianExpress', align: 'right', render: (val) => parseFloat(val).toFixed(2) },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: (val) => parseFloat(val).toFixed(2), sorter: (a, b) => a.total - b.total },
    { title: 'Net Amount', dataIndex: 'netAmount', key: 'netAmount', align: 'right', render: (val) => parseFloat(val).toFixed(2) },
    { title: 'Rounding', dataIndex: 'roundingUp', key: 'roundingUp', align: 'right', render: (val) => parseFloat(val).toFixed(2) },
    { title: 'Final Amount', dataIndex: 'finalAmount', key: 'finalAmount', align: 'right', fixed: 'right', width: 120, render: (val) => <Title level={5} style={{ margin: 0 }}>₹{parseFloat(val).toFixed(0)}</Title> },
    
  ];

  // --- NEW: Pagination onChange handler ---
  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

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
        {/* NEW BUTTON: Generate Bills */}
        <Button 
          type="primary" 
          icon={<CheckCircleOutlined />} 
          onClick={generateBills} 
          loading={generatingBills}
          disabled={reportData.length === 0 || billsGenerated}
        >
          {billsGenerated ? 'Bills Generated' : 'Generate Bills'}
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAddFee}>Add Fee / Expense</Button>
        <Button type="primary" danger icon={<DownloadOutlined />} onClick={handleExportStudentBills} loading={exporting} disabled={reportData.length === 0}>
          Export Student Bills
        </Button>
      </Space>

      <Row gutter={[16, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4}><Statistic title="Total Students" value={reportData.length} prefix={<UserOutlined />} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Man Days" value={summary.messDays || 0} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Daily Rate" value={summary.dailyRate || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Rice & Grocery" value={summary.totalFoodIngredientCost || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Mess Amount" value={summary.totalMessAmount || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Additional" value={summary.totalAdditionalAmount || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Bed Charges" value={summary.totalBedCharges || 0} prefix="₹" precision={2} /></Col>
        {/* NEW STATISTIC FOR NEWSPAPER */}
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Total Newspaper" value={summary.totalHinduIndianExpress || 0} prefix="₹" precision={2} /></Col>
        <Col xs={24} sm={12} md={8} lg={5}><Statistic title="Grand Total (Final)" value={summary.grandTotal || 0} prefix="₹" precision={0} valueStyle={{ color: '#cf1322' }} /></Col>
      </Row>

      <Table 
        columns={columns} 
        dataSource={reportData} 
        rowKey="studentId" 
        loading={loading} 
        scroll={{ x: 1500 }} 
        pagination={{ 
          current: currentPage, // <-- Pass current page from state
          pageSize: pageSize,   // <-- Pass page size from state
          showSizeChanger: true, 
          pageSizeOptions: ['10', '20', '50', '100'], 
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          onChange: handleTableChange // <-- Add onChange handler
        }}
      />
      
      <Modal title="Add New Fee or Expense" visible={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
          <Form.Item name="student_id" label="Student" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select a student" optionFilterProp="children" filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
              {students.map(s => <Option key={s.id} value={s.id}>{s.username} ({s.roll_number})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="fee_type" label="Fee Type" rules={[{ required: true }]}>
            <Select placeholder="Select fee type">
              <Option value="bed_charge">Bed Charge</Option>
              <Option value="water_bill">Water Bill</Option>
              <Option value="fine">Fine</Option>
              <Option value="other_expense">Other Expense</Option>
              <Option value="special_food_charge">Special Food Charge (Manual)</Option> {/* New option to manually add special food if needed */}
              <Option value="newspaper">Newspaper Bill</Option>
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Please enter the amount' }]}>
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
