import React, { useState, useEffect } from 'react';
import { Card, Table, message, Spin, Typography, Tag, Select, DatePicker, Row, Col, Statistic } from 'antd';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { MonthPicker } = DatePicker;

const StudentMessHistory = () => {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(moment());

  useEffect(() => {
    const fetchCharges = async () => {
      setLoading(true);
      try {
        const month = selectedMonth.month() + 1; // moment months are 0-indexed
        const year = selectedMonth.year();
        
        const response = await studentAPI.getMyDailyMessCharges({ month, year });
        setCharges(response.data.data);
      } catch (error) {
        message.error('Failed to fetch mess charge history.');
        console.error("Fetch Charges Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCharges();
  }, [selectedMonth]);

  const handleMonthChange = (date) => {
    if (date) {
      setSelectedMonth(date);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('MMMM D, YYYY'),
    },
    {
      title: 'Charge Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`,
    },
    {
      title: 'Your Status',
      dataIndex: 'attendance_status',
      key: 'attendance_status',
      render: (status) => {
        let color = 'blue';
        let text = status.toUpperCase();
        if (status === 'leave' || status === 'on_duty') {
          color = 'orange';
          text = status === 'leave' ? 'ON LEAVE' : 'ON DUTY (Exempt)';
        } else if (status === 'present') {
          color = 'green';
          text = 'PRESENT (Charged)';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Charged',
      dataIndex: 'is_charged',
      key: 'is_charged',
      render: (is_charged) => (is_charged ? 'Yes' : 'No (Exempt)'),
    },
  ];

  const totalChargedAmount = charges
    .filter(charge => charge.is_charged)
    .reduce((sum, charge) => sum + parseFloat(charge.amount), 0);

  return (
    <Card>
      <Title level={3}>My Daily Mess Charge History</Title>
      
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Text>Select Month: </Text>
          <MonthPicker 
            onChange={handleMonthChange} 
            defaultValue={selectedMonth}
            picker="month"
            allowClear={false}
          />
        </Col>
        <Col>
          <Statistic
            title={`Total Mess Charges for ${selectedMonth.format('MMMM YYYY')}`}
            value={totalChargedAmount}
            precision={2}
            prefix="₹"
          />
        </Col>
      </Row>

      <Table
        dataSource={charges}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 31 }} // Show up to a full month
        bordered
      />
    </Card>
  );
};

export default StudentMessHistory;
