import React, { useState } from 'react';
import { Card, Button, message, Table, DatePicker, Space, Typography } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const ConsumptionReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState([moment().startOf('month'), moment().endOf('month')]);

  // Fetch report data
  const handleGenerateReport = async () => {
    if (!dates || dates.length !== 2) return message.error('Please select a date range.');
    setLoading(true);
    try {
      const [startDate, endDate] = dates;
      const params = {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      };
      
      const response = await messAPI.getSummarizedConsumptionReport(params);
      setReportData(response.data.data);
      if (response.data.data.length === 0) message.info('No data for this period.');
    } catch (error) {
      message.error('Failed to generate report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    if (reportData.length === 0) return message.warning('No data to export.');
    
    try {
      // Format data for Excel
      const formattedData = reportData.map((item, index) => ({
        'S.No': index + 1,
        'Item Name': item.item_name,
        'Total Consumed': parseFloat(item.total_consumed).toFixed(2),
        'Unit': item.unit,
        'Total Cost (₹)': parseFloat(item.total_cost || 0).toFixed(2),
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
      const [startDate, endDate] = dates;
      const fileName = `Consumption_Report_${startDate.format('YYYY-MM-DD')}_to_${endDate.format('YYYY-MM-DD')}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, fileName);
      message.success('Report downloaded successfully');
    } catch (error) {
      message.error('Failed to export report: ' + (error.message));
    }
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
      title: 'Total Cost', 
      dataIndex: 'total_cost', 
      render: (text) => `₹${parseFloat(text || 0).toFixed(2)}`, 
      sorter: (a, b) => (a.total_cost || 0) - (b.total_cost || 0),
    },
  ];

  const totalCostOfAllItems = reportData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);

  return (
    <Card title="Consumption & Cost Report">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <RangePicker value={dates} onChange={setDates} />
          <Button type="primary" icon={<FileTextOutlined />} onClick={handleGenerateReport} loading={loading}>
            Generate Report
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportToExcel} disabled={reportData.length === 0}>
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
      </Space>
    </Card>
  );
};

export default ConsumptionReport;
