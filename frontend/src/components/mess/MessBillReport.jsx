import React, { useState } from 'react';
import { Card, Button, DatePicker, Row, Col, Table, message, Spin, Descriptions, Tag, Typography } from 'antd';
import { DownloadOutlined, CalculatorOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { MonthPicker } = DatePicker;

const MessBillReport = () => {
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  const handleGenerateReport = async () => {
    if (!selectedMonth) {
      message.error('Please select a month.');
      return;
    }
    setLoading(true);
    setReportData([]);
    setSummaryData(null);
    try {
      const params = {
        month: selectedMonth.month() + 1,
        year: selectedMonth.year(),
      };
      const response = await messAPI.generateMonthlyMessReport(params);
      
      // LOGS TO CHECK RECEIVED DATA
      console.log('[MessBillReport] Raw response from API:', response.data);
      if (response.data.data && response.data.data.length > 0) {
        console.log('[MessBillReport] First student record received:', response.data.data[0]);
        console.log('[MessBillReport] Summary data received:', response.data.summary);
      }

      setReportData(response.data.data || []);
      setSummaryData(response.data.summary || {});
      message.success(`Report generated for ${selectedMonth.format('MMMM YYYY')}`);
    } catch (error) {
      console.error('[MessBillReport] Error generating report:', error); // Log the full error
      message.error(`Failed to generate report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = () => {
     if (!summaryData || reportData.length === 0) {
      message.warn('No data to export. Please generate a report first.');
      return;
    }
    const summarySheetData = [
      ['NATIONAL ENGINEERING COLLEGE GENTS HOSTEL'],
      [`DAILY RATE CALCULATION - ${selectedMonth.format('MMMM YYYY').toUpperCase()}`],
      [],
      ['S.no', 'Particulars', 'Amount (Rs)'],
      [1, 'Food Ingredient Cost', summaryData.totalFoodIngredientCost],
      [2, 'Other Operational Expenses', summaryData.totalOtherMessExpenses],
      ['', { t: 's', v: 'Sub total', s: { font: { bold: true } } }, { t: 'n', v: summaryData.subTotal, s: { font: { bold: true } } }],
      [],
      ['', 'Cash Token (Less)', { t: 'n', v: -(summaryData.cashToken || 0) }],
      ['', 'Credit Token (Sister Concern)', { t: 'n', v: -(summaryData.creditToken || 0) }],
      ['', 'Student Special Orders', { t: 'n', v: -(summaryData.studentAdditionalCreditToken || 0) }],
      ['', 'Student Guest Income', { t: 'n', v: -(summaryData.studentGuestIncome || 0) }],
      [],
      ['', { t: 's', v: 'Total Expenses =', s: { font: { bold: true } } }, { t: 'n', v: summaryData.totalExpenses, s: { font: { bold: true } } }],
      ['', { t: 's', v: `Mess Days = ${summaryData.messDays}`, s: { font: { bold: true } } }, ''],
      ['', { t: 's', v: 'Daily Rate = Total Expenses / Mess Days', s: { font: { bold: true } } }, { t: 'n', v: summaryData.dailyRate, s: { font: { bold: true } } }],
    ];
    
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summarySheetData);

    const studentSheetData = reportData.map((item, index) => ({
        'S.no': index + 1,
        'Name': item.name,
        'REG NO': item.regNo,
        'M.Days': item.messDays,
        'Daily rate': (item.dailyRate || 0).toFixed(2),
        'Mess amount': (item.messAmount || 0).toFixed(2),
        'Additional amount': (item.additionalAmount || 0).toFixed(2),
        'Bed charges': (item.bedCharges || 0).toFixed(2),
        'Paper Bill': (item.paperBill || 0).toFixed(2),
        'Newspaper': (item.hinduIndianExpress || 0).toFixed(2),
        'Total': (item.total || 0).toFixed(2),
        'Net Amount': (item.netAmount || 0).toFixed(2),
        'Roundingup': (item.roundingUp || 0).toFixed(2),
        'Final Amount': item.finalAmount,
    }));

    const studentWorksheet = XLSX.utils.json_to_sheet(studentSheetData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Daily Rate Calculation');
    XLSX.utils.book_append_sheet(workbook, studentWorksheet, 'Student Bills');
    
    XLSX.writeFile(workbook, `Mess_Bill_Report_${selectedMonth.format('YYYY_MM')}.xlsx`);
    message.success('Report exported successfully!');
  };

  const studentColumns = [
    { title: 'S.No', key: 's_no', render: (_, __, index) => index + 1 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Reg No', dataIndex: 'regNo', key: 'regNo' },
    { title: 'M.Days', dataIndex: 'messDays', key: 'messDays', align: 'right' },
    { title: 'Daily Rate', dataIndex: 'dailyRate', key: 'dailyRate', align: 'right', render: (val = 0) => val.toFixed(4) },
    { title: 'Mess Amount', dataIndex: 'messAmount', key: 'messAmount', align: 'right', render: (val = 0) => val.toFixed(2) },
    { title: 'Additional Amt', dataIndex: 'additionalAmount', key: 'additionalAmount', align: 'right', render: (val = 0) => val.toFixed(2) },
    { title: 'Bed Charges', dataIndex: 'bedCharges', key: 'bedCharges', align: 'right', render: (val = 0) => val.toFixed(2) },
    { title: 'Paper Bill', dataIndex: 'paperBill', key: 'paperBill', align: 'right', render: (val = 0) => val > 0 ? val.toFixed(2) : '-' },
    { title: 'Newspaper', dataIndex: 'hinduIndianExpress', key: 'hinduIndianExpress', align: 'right', render: (val = 0) => val > 0 ? val.toFixed(2) : '-' },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: (val = 0) => <Text strong>{val.toFixed(2)}</Text> },
    { title: 'Net Amt', dataIndex: 'netAmount', key: 'netAmount', align: 'right', render: (val = 0) => val.toFixed(2) },
    { title: 'Rounding', dataIndex: 'roundingUp', key: 'roundingUp', align: 'right', render: (val = 0) => val.toFixed(2) },
    { title: 'Final Amt', dataIndex: 'finalAmount', key: 'finalAmount', align: 'right', render: (val = 0) => <Tag color="blue" style={{ fontSize: 14 }}>{val.toFixed(2)}</Tag> },
  ];

  return (
    <Card title="Monthly Mess Bill Report">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} format="MMMM YYYY" style={{ width: 200 }}/>
        </Col>
        <Col>
          <Button type="primary" icon={<CalculatorOutlined />} onClick={handleGenerateReport} loading={loading}>
            Generate Report
          </Button>
        </Col>
        <Col>
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!summaryData}>
            Export to Excel
          </Button>
        </Col>
      </Row>
      <Spin spinning={loading}>
        {summaryData && (
          <div style={{ marginBottom: 24 }}>
            <Title level={4}>Calculation Summary for {selectedMonth.format('MMMM YYYY')}</Title>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Total Food & Other Expenses" span={2}>
                {(summaryData.subTotal || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Less: Credit Token">
                {(summaryData.creditToken || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Less: Cash Token">
                {(summaryData.cashToken || 0).toFixed(2)}
              </Descriptions.Item>
               <Descriptions.Item label="Less: Student Special Orders">
                {(summaryData.studentAdditionalCreditToken || 0).toFixed(2)}
              </Descriptions.Item>
               <Descriptions.Item label="Less: Student Guest Income">
                {(summaryData.studentGuestIncome || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Net Chargeable Expenses" span={2}>
                <Text strong style={{ color: '#1890ff' }}>{(summaryData.totalExpenses || 0).toFixed(2)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Total Man-Days">
                {summaryData.messDays}
              </Descriptions.Item>
              <Descriptions.Item label="Calculated Daily Rate">
                 <Tag color="green" style={{ fontSize: 16 }}>₹ {(summaryData.dailyRate || 0).toFixed(4)}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
        {reportData.length > 0 && (
          <Table
            columns={studentColumns}
            dataSource={reportData}
            rowKey="studentId"
            bordered
            size="small"
            pagination={{ pageSize: 50 }}
            scroll={{ x: 1600 }}
          />
        )}
      </Spin>
    </Card>
  );
};

export default MessBillReport;
