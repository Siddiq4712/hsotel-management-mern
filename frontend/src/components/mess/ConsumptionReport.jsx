import React, { useState, useEffect } from 'react';
import { Card, Button, message, Table, DatePicker, Space, Typography } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

const ConsumptionReport = () => {
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingDetails, setExportingDetails] = useState(false);
  const [exportingParticulars, setExportingParticulars] = useState(false); // New loading state
  const [selectedDate, setSelectedDate] = useState(moment());

  const handleGenerateOnScreenReport = async () => {
    setLoading(true);
    try {
      const startDate = selectedDate.clone().startOf('month').format('YYYY-MM-DD');
      const endDate = selectedDate.clone().endOf('month').format('YYYY-MM-DD');
      
      const response = await messAPI.getSummarizedConsumptionReport({ start_date: startDate, end_date: endDate });
      setCategoryData(response.data.data);
      if (response.data.data.length === 0) message.info('No consumption data found for this period.');
    } catch (error) {
      message.error('Failed to generate on-screen report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateOnScreenReport();
  }, [selectedDate]);

  // Main export for the two-sheet detailed report
  const handleExportConsumptionReport = async () => {
    setExportingDetails(true);
    message.loading({ content: 'Generating detailed consumption report...', key: 'export', duration: 0 });
    
    try {
      const month = selectedDate.format('M');
      const year = selectedDate.format('YYYY');

      const response = await messAPI.getDailyConsumptionDetails({ month, year });
      const consumptionDetailsData = response.data.data || [];
      
      if (consumptionDetailsData.length === 0) {
        message.warn({ content: 'No consumption data to export for this month.', key: 'export' });
        setExportingDetails(false);
        return;
      }
      
      const workbook = XLSX.utils.book_new();

      const pivotData = {};
      const categoryTotals = {};
      const allCategories = new Set();
      const daysInMonth = selectedDate.daysInMonth();

      consumptionDetailsData.forEach(item => {
        const category = item.category_name;
        const day = moment(item.consumption_date).date();
        const cost = parseFloat(item.daily_total_cost);

        allCategories.add(category);
        if (!categoryTotals[category]) categoryTotals[category] = 0;
        categoryTotals[category] += cost;
        if (!pivotData[day]) pivotData[day] = {};
        pivotData[day][category] = cost;
      });

      const sortedCategories = Array.from(allCategories).sort();

      // --- SHEET 1: Consumption Details (Pivoted Vertically) ---
      const ws2_data = [];
      const headers = ['Date', ...sortedCategories, 'Total'];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const row = { 'Date': selectedDate.clone().date(day).format('DD/MM/YYYY') };
        let dailyTotal = 0;
        sortedCategories.forEach(category => {
          const cost = pivotData[day]?.[category] || 0;
          row[category] = cost;
          dailyTotal += cost;
        });
        row['Total'] = dailyTotal;
        if (dailyTotal > 0) {
          ws2_data.push(row);
        }
      }
      
      const columnTotals = { 'Date': 'Total' };
      sortedCategories.forEach(cat => columnTotals[cat] = 0);
      columnTotals['Total'] = 0;
      ws2_data.forEach(row => {
        sortedCategories.forEach(cat => columnTotals[cat] += row[cat] || 0);
        columnTotals['Total'] += row['Total'] || 0;
      });
      ws2_data.push(columnTotals);

      const ws2 = XLSX.utils.json_to_sheet(ws2_data, { header: headers });

      // --- NEW: Apply Bold Styling ---
      const boldStyle = { font: { bold: true } };
      const range = XLSX.utils.decode_range(ws2['!ref']);
      // Bold Header Row (Categories)
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws2[cellRef]) ws2[cellRef].s = boldStyle;
      }
      // Bold Total Row
      const lastRow = range.e.r;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: lastRow, c: C });
        if (ws2[cellRef]) ws2[cellRef].s = boldStyle;
      }

      ws2['!cols'] = [{wch: 12}, ...Array(sortedCategories.length).fill({wch: 15}), {wch: 18}];
      XLSX.utils.book_append_sheet(workbook, ws2, "Consumption Details");

      // --- SHEET 2: Particulars ---
      let grandTotal = 0;
      const particularsData = sortedCategories.map((category, index) => {
        const totalAmount = categoryTotals[category] || 0;
        grandTotal += totalAmount;
        return { 'S.no': index + 1, 'Particulars': category, 'Amount (Rs)': totalAmount };
      });
      const ws3 = XLSX.utils.json_to_sheet(particularsData, { header: ['S.no', 'Particulars', 'Amount (Rs)'] });
      XLSX.utils.sheet_add_aoa(ws3, [['', 'Sub total', grandTotal]], { origin: -1 });
      ws3['!cols'] = [{wch: 5}, {wch: 25}, {wch: 15}];
      XLSX.utils.book_append_sheet(workbook, ws3, "Particulars");
      
      const fileName = `Consumption_Report_${selectedDate.format('MMM_YYYY')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      message.success({ content: 'Detailed report downloaded!', key: 'export' });
    } catch (error) {
      console.error('Export Error:', error);
      message.error({ content: 'Failed to generate detailed report.', key: 'export' });
    } finally {
      setExportingDetails(false);
    }
  };

  // NEW: Simplified export for just the "Particulars" sheet
  const handleExportParticulars = async () => {
    setExportingParticulars(true);
    message.loading({ content: 'Generating particulars report...', key: 'export-p', duration: 0 });
    
    try {
      if (categoryData.length === 0) {
        message.warn({ content: 'No data to export. Please generate the on-screen report first.', key: 'export-p' });
        setExportingParticulars(false);
        return;
      }

      const workbook = XLSX.utils.book_new();
      
      let grandTotal = 0;
      const particularsData = categoryData
        .sort((a, b) => a.category_name.localeCompare(b.category_name)) // Ensure consistent order
        .map((item, index) => {
          const totalAmount = parseFloat(item.total_cost || 0);
          grandTotal += totalAmount;
          return {
            'S.no': index + 1,
            'Particulars': item.category_name,
            'Amount (Rs)': totalAmount,
          };
      });

      const ws = XLSX.utils.json_to_sheet(particularsData, { header: ['S.no', 'Particulars', 'Amount (Rs)'] });
      XLSX.utils.sheet_add_aoa(ws, [['', 'Sub total', grandTotal]], { origin: -1 });
      ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, ws, "Particulars");
      
      const fileName = `Consumption_Particulars_${selectedDate.format('MMM_YYYY')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      message.success({ content: 'Particulars report downloaded!', key: 'export-p' });
    } catch (error) {
      console.error('Export Error:', error);
      message.error({ content: 'Failed to generate particulars report.', key: 'export-p' });
    } finally {
      setExportingParticulars(false);
    }
  };

  const onScreenColumns = [
    { title: 'Category Name', dataIndex: 'category_name', sorter: (a, b) => a.category_name.localeCompare(b.category_name) },
    { title: 'Total Cost', dataIndex: 'total_cost', align: 'right', render: (text) => `₹${parseFloat(text || 0).toFixed(2)}`, sorter: (a, b) => (a.total_cost || 0) - (b.total_cost || 0) },
  ];

  const totalOnScreenCost = categoryData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);

  return (
    <Card title="Consumption Reports">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <DatePicker picker="month" value={selectedDate} onChange={setSelectedDate} />
          <Button type="primary" icon={<FileTextOutlined />} onClick={handleGenerateOnScreenReport} loading={loading}>
            Generate On-Screen Summary
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportParticulars} loading={exportingParticulars}>
            Export Particulars
          </Button>
          <Button type="primary" danger icon={<DownloadOutlined />} onClick={handleExportConsumptionReport} loading={exportingDetails}>
            Export Full Details
          </Button>
        </Space>

        <Title level={4} style={{ marginTop: 24 }}>Category-wise Consumption Summary</Title>
        <Table
          columns={onScreenColumns}
          dataSource={categoryData}
          loading={loading}
          rowKey="category_name"
          pagination={{ pageSize: 15 }}
          summary={() => (
            <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0}>Total Cost of Consumption</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text type="success" style={{ fontSize: '1.1em' }}>₹{totalOnScreenCost.toFixed(2)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Space>
    </Card>
  );
};

export default ConsumptionReport;
