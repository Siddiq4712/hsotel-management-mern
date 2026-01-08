// src/pages/Mess/HostelAdditionalIncome.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Button, Space, Tag, Spin, Alert, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api'; // Adjust path to your API service file
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const HostelAdditionalIncome = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // --- FIX IS HERE: Default date range to the start of the current year until the end of the current month ---
  const [dateRange, setDateRange] = useState([moment().startOf('year'), moment().endOf('month')]);

  // Fetch data whenever the date range changes
  useEffect(() => {
    fetchAdjustments();
  }, [dateRange]); // This dependency is correct

  const fetchAdjustments = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      let params = {};
      // Format dates for API request if a range is selected
      if (dateRange && dateRange[0] && dateRange[1]) {
        params = {
          from_date: dateRange[0].format('YYYY-MM-DD'),
          to_date: dateRange[1].format('YYYY-MM-DD')
        };
      }
      
      const response = await messAPI.getRoundingAdjustments(params);
      if (response.data.success) {
        setAdjustments(response.data.data);
      } else {
        setError('Failed to load adjustments: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching rounding adjustments:', err);
      setError('Failed to load rounding adjustments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAdjustments(); // Trigger data fetch on manual search
  };

  const handleReset = () => {
    // Reset date range to the start of the current year until the end of the current month
    setDateRange([moment().startOf('year'), moment().endOf('month')]); 
    // useEffect will trigger fetchAdjustments due to dateRange change
  };

  // Define table columns
  const columns = [
    {
      title: 'Date',
      dataIndex: 'received_date',
      key: 'received_date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.received_date).unix() - moment(b.received_date).unix(),
    },
    {
      title: 'Type',
      dataIndex: ['IncomeType', 'name'], // Accessing nested IncomeType name through association
      key: 'income_type_name',
      render: (text) => text || 'N/A' // Display 'N/A' if IncomeType is not loaded
    },
    {
      title: 'Adjustment Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => {
        const value = parseFloat(amount);
        const isPositive = value >= 0;
        const color = isPositive ? 'green' : 'red'; // Green for positive, red for negative
        const icon = isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />; // Up arrow for positive, down for negative
        return (
          <Tag color={color} icon={icon}>
            ₹{value.toFixed(2)} {/* Display with 2 decimal places */}
          </Tag>
        );
      },
      sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
      align: 'right', // Align amount to the right for readability
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true, // Truncate long descriptions
    },
    {
      title: 'Recorded By',
      dataIndex: ['IncomeReceivedBy', 'username'], // Accessing nested User username
      key: 'recorded_by',
      render: (text) => text || 'N/A'
    },
  ];

  // Calculate the total adjustment for the currently displayed data
  const totalCurrentViewAdjustment = adjustments.reduce((sum, adj) => sum + parseFloat(adj.amount || 0), 0);

  return (
    <Card
      title={<Title level={3}>Daily Rounding Adjustments History</Title>}
      extra={ // Extra content for the card header (search and reset buttons)
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="YYYY-MM-DD"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            Search
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {error && ( // Display error alert if there's an error
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setError(null)}
        />
      )}

      {/* Summary of total adjustment for the current view */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Text strong>Total Adjustment for Current View:</Text>{' '}
        <Text
          strong
          style={{ color: totalCurrentViewAdjustment >= 0 ? 'green' : 'red', marginLeft: 8 }}
        >
          {totalCurrentViewAdjustment >= 0 ? '+' : ''}₹{totalCurrentViewAdjustment.toFixed(2)}
        </Text>
      </div>

      <Spin spinning={loading}> {/* Show loading spinner while data is being fetched */}
        <Table
          dataSource={adjustments}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
          locale={{ emptyText: 'No rounding adjustments found for the selected period.' }} // Message for empty table
        />
      </Spin>
    </Card>
  );
};

export default HostelAdditionalIncome;
