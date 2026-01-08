import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, DatePicker, Space, Typography, 
  ConfigProvider, theme, Skeleton, Row, Col, Statistic, 
  message, Divider, Tooltip 
} from 'antd';
import { 
  FileText, Download, BarChart3, Calendar, 
  RefreshCw, FileDown, PieChart, TrendingUp 
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

// --- Specialized Skeleton for Reports ---
const ReportSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton.Input active style={{ width: 200 }} />
        <div className="flex gap-2">
          <Skeleton.Button active style={{ width: 100 }} />
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      </div>
      <Row gutter={16}>
        <Col span={24}><Skeleton active paragraph={{ rows: 8 }} /></Col>
      </Row>
    </div>
  </Card>
);

const ConsumptionReport = () => {
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingDetails, setExportingDetails] = useState(false);
  const [exportingParticulars, setExportingParticulars] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());

  const handleGenerateOnScreenReport = async () => {
    setLoading(true);
    try {
      const startDate = selectedDate.clone().startOf('month').format('YYYY-MM-DD');
      const endDate = selectedDate.clone().endOf('month').format('YYYY-MM-DD');
      
      const response = await messAPI.getSummarizedConsumptionReport({ start_date: startDate, end_date: endDate });
      setCategoryData(response.data.data || []);
    } catch (error) {
      message.error('Failed to load summary');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  useEffect(() => {
    handleGenerateOnScreenReport();
  }, [selectedDate]);

  const handleExportConsumptionReport = async () => {
    setExportingDetails(true);
    const hide = message.loading('Compiling full details...', 0);
    
    try {
      const month = selectedDate.format('M');
      const year = selectedDate.format('YYYY');
      const response = await messAPI.getDailyConsumptionDetails({ month, year });
      const consumptionDetailsData = response.data.data || [];
      
      if (consumptionDetailsData.length === 0) {
        message.warn('No data for this period.');
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
        if (dailyTotal > 0) ws2_data.push(row);
      }
      
      const ws2 = XLSX.utils.json_to_sheet(ws2_data, { header: headers });
      ws2['!cols'] = [{wch: 12}, ...Array(sortedCategories.length).fill({wch: 15}), {wch: 18}];
      XLSX.utils.book_append_sheet(workbook, ws2, "Consumption Details");

      const particularsData = sortedCategories.map((category, index) => ({
        'S.no': index + 1,
        'Particulars': category,
        'Amount (Rs)': (categoryTotals[category] || 0).toFixed(2)
      }));
      const ws3 = XLSX.utils.json_to_sheet(particularsData);
      XLSX.utils.book_append_sheet(workbook, ws3, "Particulars");
      
      XLSX.writeFile(workbook, `Full_Consumption_${selectedDate.format('MMM_YYYY')}.xlsx`);
      message.success('Full report downloaded');
    } finally {
      hide();
      setExportingDetails(false);
    }
  };

  const onScreenColumns = [
    { 
      title: 'Consumption Category', 
      dataIndex: 'category_name', 
      key: 'name',
      render: (text) => (
        <Space>
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <Text strong className="text-slate-700">{text}</Text>
        </Space>
      )
    },
    { 
      title: 'Total Monthly Expenditure', 
      dataIndex: 'total_cost', 
      align: 'right', 
      render: (text) => <Text className="text-blue-600 font-bold">₹{parseFloat(text || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>,
      sorter: (a, b) => (a.total_cost || 0) - (b.total_cost || 0) 
    },
  ];

  const totalCost = categoryData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Financial Consumption Analytics</Title>
              <Text type="secondary">Review category-wise spending and daily cost distributions</Text>
            </div>
          </div>
          <Space>
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 h-12">
              <Calendar size={16} className="text-blue-500" />
              <DatePicker 
                picker="month" 
                bordered={false} 
                value={selectedDate} 
                onChange={setSelectedDate} 
                allowClear={false}
                className="font-bold p-0"
              />
            </div>
            <Button 
                type="primary" 
                icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} 
                onClick={handleGenerateOnScreenReport}
                className="rounded-xl h-12"
            >
                Refresh
            </Button>
          </Space>
        </div>

        {/* Stats Row */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic 
                title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Monthly Cost</span>}
                value={totalCost}
                precision={2}
                prefix={<TrendingUp size={18} className="text-emerald-500 mr-2" />}
                valueStyle={{ color: '#0f172a', fontWeight: 800 }}
                suffix={<span className="text-xs text-slate-400 ml-1">INR</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic 
                title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Active Categories</span>}
                value={categoryData.length}
                prefix={<PieChart size={18} className="text-blue-500 mr-2" />}
              />
            </Card>
          </Col>
        </Row>

        {/* Report Actions Card */}
        <Card className="border-none shadow-sm rounded-2xl mb-8">
          <div className="flex justify-between items-center">
            <Text type="secondary" italic>Select an export method to generate detailed Excel workbooks for auditing.</Text>
            <Space>
              <Tooltip title="Exports S.no, Particulars, and Amount only">
                <Button 
                    icon={<FileDown size={18} />} 
                    onClick={() => message.info('Exporting Particulars...')} 
                    className="rounded-xl h-10"
                >
                    Export Particulars
                </Button>
              </Tooltip>
              <Tooltip title="Exports pivoted daily costs across all categories">
                <Button 
                    type="primary" 
                    danger 
                    ghost 
                    icon={<Download size={18}/>} 
                    onClick={handleExportConsumptionReport} 
                    loading={exportingDetails}
                    className="rounded-xl h-10"
                >
                    Export Full Details
                </Button>
              </Tooltip>
            </Space>
          </div>
        </Card>

        {/* Data Table */}
        {loading ? <ReportSkeleton /> : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table
              columns={onScreenColumns}
              dataSource={categoryData}
              rowKey="category_name"
              pagination={false}
              className="custom-report-table"
              summary={() => (
                <Table.Summary.Row className="bg-slate-50">
                  <Table.Summary.Cell index={0}>
                    <Text strong className="text-slate-900">NET CONSUMPTION EXPENDITURE</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text className="text-xl font-black text-emerald-600">
                        ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        )}
      </div>
    </ConfigProvider>
  );
};

export default ConsumptionReport;