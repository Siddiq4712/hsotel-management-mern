import React, { useState } from 'react';
import { Card, DatePicker, Button, message, Spin, Alert, Typography, Statistic } from 'antd';
import moment from 'moment';
import { CalculatorOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';

const { Title, Paragraph } = Typography;

const CalculateDailyCharges = () => {
  const [selectedDate, setSelectedDate] = useState(moment());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCalculate = async () => {
    if (!selectedDate) {
      message.error('Please select a date.');
      return;
    }

    setLoading(true);
    setResult(null);
    const date = selectedDate.format('YYYY-MM-DD');

    try {
      const response = await messAPI.calculateDailyCharges({ date });
      setResult({
        type: 'success',
        message: response.data.message,
        data: response.data.data
      });
      message.success(response.data.message);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      setResult({ type: 'error', message: errorMessage });
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title level={3}>Calculate & Apply Daily Mess Charges</Title>
      <Paragraph type="secondary">
        Select a date to calculate the total daily meal cost (sum of cost-per-serving of all served menus)
        and apply it as a charge to all active students who were not on leave or official duty.
      </Paragraph>

      <div style={{ marginBottom: 24 }}>
        <DatePicker 
          value={selectedDate} 
          onChange={date => setSelectedDate(date)} 
          disabledDate={(current) => current && current > moment().endOf('day')}
          style={{ marginRight: 16 }}
        />
        <Button 
          type="primary" 
          icon={<CalculatorOutlined />} 
          onClick={handleCalculate}
          loading={loading}
        >
          Calculate & Apply for {selectedDate ? selectedDate.format('MMM D, YYYY') : ''}
        </Button>
      </div>

      {loading && <div style={{ textAlign: 'center' }}><Spin /></div>}
      
      {result && (
        <Alert
          message={result.type === 'success' ? "Calculation Complete" : "Calculation Failed"}
          description={result.message}
          type={result.type}
          showIcon
          style={{ marginTop: 24 }}
        />
      )}
      
      {result && result.type === 'success' && result.data && (
        <Card style={{ marginTop: 24 }}>
            <Statistic title="Total Cost per Student for the Day" value={result.data.dailyCost} precision={2} prefix="₹" />
            <Statistic title="Students Charged" value={result.data.studentsCharged} />
            <Statistic title="Students Exempt (Leave/OD)" value={result.data.studentsExempt} />
        </Card>
      )}
    </Card>
  );
};

export default CalculateDailyCharges;
                                                                                            