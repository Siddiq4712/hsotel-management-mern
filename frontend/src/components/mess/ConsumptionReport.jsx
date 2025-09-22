import React, { useState } from 'react';
import { Card, Button, message, Table, DatePicker, Space, Typography, Modal, Radio } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { RangePicker, MonthPicker } = DatePicker;
const { Title, Text } = Typography;

const ConsumptionReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState([moment().startOf('month'), moment().endOf('month')]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [reportScope, setReportScope] = useState('hostel');
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Fetch report data
  const handleGenerateReport = async () => {
    if (!dates || dates.length !== 2) return message.error('Please select a date range.');
    setLoading(true);
    try {
      const [startDate, endDate] = dates;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const params = {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      };
      if (user.hostel_id && reportScope === 'hostel') {
        params.hostel_id = user.hostel_id;
      }
      const response = await api.get('/mess/reports/consumption-summary', { params });
      setReportData(response.data.data);
      if (response.data.data.length === 0) message.info('No data for this period.');
    } catch (error) {
      message.error('Failed to generate report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Show export modal
  const handleExportClick = () => {
    if (reportData.length === 0) return message.warning('No data to export.');
    setIsModalVisible(true);
  };

  // Handle modal OK (export to Excel)
  const handleExportToExcel = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      let startDate, endDate;
      
      // Use selected month if provided, otherwise fall back to date range
      if (selectedMonth) {
        startDate = selectedMonth.clone().startOf('month');
        endDate = selectedMonth.clone().endOf('month');
      } else if (dates && dates.length === 2) {
        [startDate, endDate] = dates;
      } else {
        return message.error('Please select a date range or month.');
      }

      // Fetch data for export (if different from displayed data)
      let dataToExport = reportData;
      if (selectedMonth || reportScope !== 'hostel') {
        setLoading(true);
        const params = {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
        };
        if (reportScope === 'hostel' && user.hostel_id) {
          params.hostel_id = user.hostel_id;
        }
        const response = await api.get('/mess/reports/consumption-summary', { params });
        dataToExport = response.data.data;
        setLoading(false);
      }

      // Format data for Excel
      const formattedData = dataToExport.map((item, index) => ({
        'S.No': index + 1,
        'Hostel': item.hostel_name || 'N/A', // Include hostel name
        'Item Name': item.item_name,
        'Total Consumed': parseFloat(item.total_consumed),
        'Unit': item.unit,
        'Total Cost (₹)': parseFloat(item.total_cost || 0),
      }));

      // Create Excel file
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Consumption Summary');

      // Set column widths
      const cols = Object.keys(formattedData[0]);
      worksheet['!cols'] = cols.map(col => ({
        wch: Math.max(...formattedData.map(row => (row[col] ? row[col].toString().length : 0)), col.length),
      }));

      // Generate file name
      const fileName = reportScope === 'hostel'
        ? `Hostel_${user.hostel_id}_Consumption_Report_${startDate.format('YYYY-MM-DD')}_to_${endDate.format('YYYY-MM-DD')}.xlsx`
        : `College_Consumption_Report_${startDate.format('YYYY-MM-DD')}_to_${endDate.format('YYYY-MM-DD')}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, fileName);
      message.success('Report downloaded successfully');
      setIsModalVisible(false);
      setSelectedMonth(null);
    } catch (error) {
      message.error('Failed to export report: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  // Handle modal cancel
  const handleModalCancel = () => {
    setIsModalVisible(false);
    setReportScope('hostel');
    setSelectedMonth(null);
  };

  // Table columns
  const columns = [
    { title: 'Item Name', dataIndex: 'item_name', sorter: (a, b) => a.item_name.localeCompare(b.item_name) },
    { 
      title: 'Total Consumed', 
      dataIndex: 'total_consumed', 
      render: (text) => `${parseFloat(text).toFixed(2)}`, 
      sorter: (a, b) => a.total_consumed - b.total_consumed,
    },
    { title: 'Unit', dataIndex: 'unit' },
    { 
      title: 'Total Cost (FIFO)', 
      dataIndex: 'total_cost', 
      render: (text) => `₹${parseFloat(text || 0).toFixed(2)}`, 
      sorter: (a, b) => (a.total_cost || 0) - (b.total_cost || 0),
    },
  ];

  const totalCostOfAllItems = reportData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);

  return (
    <Card title="FIFO Consumption & Cost Report">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <RangePicker value={dates} onChange={setDates} />
          <Button type="primary" icon={<FileTextOutlined />} onClick={handleGenerateReport} loading={loading}>
            Generate Report
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportClick} disabled={reportData.length === 0}>
            Export to Excel
          </Button>
        </Space>

        <Table
          style={{ marginTop: 24 }}
          columns={columns}
          dataSource={reportData}
          loading={loading}
          rowKey="item_name"
          summary={() => (
            <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0} colSpan={3}>Total Cost of Consumption</Table.Summary.Cell>
              <Table.Summary.Cell index={1}><Text type="success">₹{totalCostOfAllItems.toFixed(2)}</Text></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />

        <Modal
          title="Download Consumption Report"
          open={isModalVisible}
          onOk={handleExportToExcel}
          onCancel={handleModalCancel}
          okText="Download"
          cancelText="Cancel"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <p>Select report scope:</p>
              <Radio.Group value={reportScope} onChange={(e) => setReportScope(e.target.value)}>
                <Radio value="hostel">Download for this hostel</Radio>
                <Radio value="college">Download for the college</Radio>
              </Radio.Group>
            </div>
            <div>
              <p>Select month (optional):</p>
              <DatePicker 
                picker="month" 
                value={selectedMonth} 
                onChange={(date) => setSelectedMonth(date)} 
                style={{ width: '100%' }}
              />
            </div>
          </Space>
        </Modal>
      </Space>
    </Card>
  );
};

export default ConsumptionReport;