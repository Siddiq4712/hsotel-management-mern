  import React, { useState } from 'react';
  import { Card, Button, DatePicker, Row, Col, Table, message, Spin, Typography,Space, Alert } from 'antd';
  import { DownloadOutlined, CalculatorOutlined } from '@ant-design/icons';
  import { messAPI } from '../../services/api';
  import moment from 'moment';
  import ExcelJS from 'exceljs';
  import * as XLSX from 'xlsx';

  const { Title, Text } = Typography;
  const { MonthPicker } = DatePicker;

  const DailyRateReport = () => {
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(moment());

    const handleGenerateReport = async () => {
      if (!selectedDate) {
        message.warn('Please select a month and year.');
        return;
      }
      setLoading(true);
      setReportData(null);
      try {
        const month = selectedDate.month() + 1;
        const year = selectedDate.year();
        const response = await messAPI.generateDailyRateReport({ month, year });
        console.log("[DailyRateReport] Received report data from API:", response.data.data); // LOG
        setReportData(response.data.data);
        message.success(`Report for ${selectedDate.format('MMMM YYYY')} generated successfully.`);
      } catch (error) {
        console.error("[DailyRateReport] Error fetching report:", error); // LOG
        message.error('Failed to generate report: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    const handleExport = async () => {
      if (!reportData) {
        message.warn('Please generate a report first to export.');
        return;
      }
      setExporting(true);
      try {
        const month = selectedDate.month() + 1;
        const year = selectedDate.year();
        
        // Since the backend excel logic is not updated, we build it here.
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Rate Calculation');
        
        // Headers
        worksheet.addRow([`NATIONAL ENGINEERING COLLEGE GENTS HOSTEL`]);
        worksheet.mergeCells('A1:C1');
        // ... more styling
        worksheet.addRow([`DAILY RATE CALCULATION - ${selectedDate.format('MMMM YYYY').toUpperCase()}`]);
        worksheet.mergeCells('A2:C2');
        worksheet.addRow([]);

        const headerRow = worksheet.addRow(['S.No', 'Particulars', 'Amount (Rs)']);
        headerRow.font = { bold: true };
        
        reportData.expenses.forEach((item, index) => {
          worksheet.addRow([index + 1, item.name, parseFloat(item.amount)]);
        });

        worksheet.addRow(['', 'Sub total', parseFloat(reportData.subTotal)]).font = { bold: true };
        worksheet.addRow([]);
        worksheet.addRow(['', 'Cash Token : (Less)', -parseFloat(reportData.deductions.cashToken.amount)]);
        worksheet.addRow(['', `Credit Token : (Sister Concern Bill)`, -parseFloat(reportData.deductions.creditToken.amount)]);
        worksheet.addRow(['', 'Student Additional Credit Token (V & NV meals)', -parseFloat(reportData.deductions.specialOrders.amount)]);
        worksheet.addRow(['', 'Student Guest Income', -parseFloat(reportData.deductions.guestIncome.amount)]);
        worksheet.addRow([]);
        worksheet.addRow(['', 'Total Expenses =', parseFloat(reportData.totalExpenses)]).font = { bold: true };
        worksheet.addRow(['', `Mess Days = ${reportData.totalManDays}`, '']).font = { bold: true };
        worksheet.addRow(['', 'Daily Rate = Total Expenses / Mess Days', parseFloat(reportData.dailyRate)]).font = { bold: true };
        
        // Formatting columns
        worksheet.getColumn('B').width = 50;
        worksheet.getColumn('C').width = 20;
        worksheet.getColumn('C').numFmt = '#,##0.00';

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `DailyRateCalculation_${year}_${month}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
      } catch (error) {
        message.error('Failed to export report: ' + error.message);
      } finally {
        setExporting(false);
      }
    };
    
    const expenseColumns = [
      { title: 'S.No', key: 's_no', render: (text, record, index) => index + 1 },
      { title: 'Particulars', dataIndex: 'name', key: 'name' },
      { title: 'Amount (Rs)', dataIndex: 'amount', key: 'amount', align: 'right', render: (val) => parseFloat(val).toFixed(2) },
    ];

    // Calculate total menu cost (assuming first expense is 'Rice & Grocery' or consumption-based)
    const totalMenuCost = reportData?.expenses?.[0]?.amount || 0;

    // Calculate net expenses after deducting menu cost
    const netExpensesAfterMenuDeduction = parseFloat(reportData?.totalExpenses || 0) - parseFloat(totalMenuCost);

    return (
      <Card
        title={<Title level={3}>Daily Rate Calculation Report</Title>}
        extra={
          <Space>
            <DatePicker picker="month" value={selectedDate} onChange={setSelectedDate} />
            <Button type="primary" icon={<CalculatorOutlined />} onClick={handleGenerateReport} loading={loading}>
              Generate Report
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting} disabled={!reportData}>
              Export to Excel
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading} tip="Calculating monthly figures...">
          {!reportData && (
            <Alert message="Please select a month and click 'Generate Report' to view data." type="info" showIcon />
          )}
          {reportData && (
            <Row gutter={[16, 24]}>
              <Col span={24}>
                <Title level={4}>Summary for {selectedDate.format('MMMM YYYY')}</Title>
                <Table
                  columns={expenseColumns}
                  dataSource={reportData.expenses}
                  rowKey="name"
                  pagination={false}
                  bordered
                  size="small"
                  summary={() => (
                    <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontSize: '1.1em' }}>
                      <Table.Summary.Cell index={0} colSpan={2} align="right"><Text strong>Sub total</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><Text strong>{parseFloat(reportData.subTotal).toFixed(2)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Col>
              
              <Col span={24}>
                <Card size="small" title="Deductions (Less)">
                  <Row justify="space-between" style={{ padding: '8px 0' }}>
                    <Text>Cash Token</Text>
                    <Text type="danger" strong>- {parseFloat(reportData.deductions.cashToken.amount).toFixed(2)}</Text>
                  </Row>
                  <Row justify="space-between" style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                    <Text>Credit Token (Sister Concern Bill)</Text>
                    <Text type="danger" strong>- {parseFloat(reportData.deductions.creditToken.amount).toFixed(2)}</Text>
                  </Row>
                  <Row justify="space-between" style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                    <Text>Student Special Orders (V & NV meals)</Text>
                    <Text type="danger" strong>- {parseFloat(reportData.deductions.specialOrders.amount).toFixed(2)}</Text>
                  </Row>
                  <Row justify="space-between" style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                    <Text>Student Guest Income</Text>
                    <Text type="danger" strong>- {parseFloat(reportData.deductions.guestIncome.amount).toFixed(2)}</Text>
                  </Row>
                  <Row justify="space-between" style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                    <Text>Total Menu Cost</Text>
                          {/* <Title level={5}>{parseFloat(totalMenuCost).toFixed(2)}</Title> */}
                          <Text type="danger" strong>- {parseFloat(totalMenuCost).toFixed(2)}</Text>
                    </Row>
                </Card>
              </Col>
              
              <Col span={24}>
                  <Card size="small" style={{marginTop: 16}}>
                      {/* <Row justify="space-between" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                          <Title level={5}>Total Net Expenses =</Title>
                          <Title level={5}>{parseFloat(reportData.totalExpenses).toFixed(2)}</Title>
                      </Row> */}
                      <Row justify="space-between" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                          <Title level={5}>Total Net Expenses =</Title>
                          <Title level={5}>{netExpensesAfterMenuDeduction.toFixed(2)}</Title>
                      </Row>
                      <Row justify="space-between" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                          <Title level={5}>Total Mess Days =</Title>
                          <Title level={5}>{reportData.totalManDays}</Title>
                      </Row>
                      <Row justify="space-between" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                          <Title level={4}>Daily Rate =</Title>
                          <Title level={4} type="success">₹ {parseFloat(netExpensesAfterMenuDeduction/reportData.totalManDays).toFixed(2)}</Title>
                          {/* <Title level={4} type="success">₹ {parseFloat(reportData.dailyRate).toFixed(2)}</Title>  */}
                      </Row>
                  </Card>
              </Col>

            </Row>
          )}
        </Spin>
      </Card>
    );
  };

  export default DailyRateReport;