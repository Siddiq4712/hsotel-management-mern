import React, { useState } from 'react';
import { Card, DatePicker, Button, message, Spin, Alert, Typography, Statistic, Descriptions, Divider, Tag } from 'antd';
import moment from 'moment';
import { CalculatorOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
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
            <Statistic
                title="Total Daily Mess Cost (Gross)"
                value={result.data.totalChargeableAmount}
                precision={2}
                prefix="₹"
            />
            {/* NEW: Display raw cost per student */}
            <Statistic
                title="Daily Cost per Student (Actual)"
                value={result.data.rawDailyCostPerStudent}
                precision={2}
                prefix="₹"
            />
            {/* Display rounded cost per student */}
            <Statistic
                title="Daily Cost per Student (Rounded)"
                value={result.data.dailyCost}
                precision={2}
                prefix="₹"
            />
            <Statistic title="Students Charged" value={result.data.studentsCharged} />
            <Statistic title="Students Exempt (Leave/OD)" value={result.data.studentsExempt} />

            <Divider orientation="left">Calculation Breakdown</Divider>

            <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="1. Total Menu Cost (Gross)">
                    ₹{result.data.totalDailyMenuCost ? parseFloat(result.data.totalDailyMenuCost).toFixed(2) : '0.00'}
                </Descriptions.Item>

                {result.data.detailedExpenses && result.data.detailedExpenses.length > 0 ? (
                    result.data.detailedExpenses.map((expense, index) => (
                        <Descriptions.Item key={`expense-${index}`} label={`1. Daily Expense (${expense.expenseTypeName}) (Gross)`}>
                            ₹{expense.amount ? parseFloat(expense.amount).toFixed(2) : '0.00'}
                        </Descriptions.Item>
                    ))
                ) : (
                    <Descriptions.Item label="1. Other Relevant Daily Expenses (Gross)">
                        ₹0.00
                    </Descriptions.Item>
                )}

                <Descriptions.Item label={<span style={{ fontWeight: 'bold' }}>2. Total Chargeable Amount (Gross Sum of Menu + Expenses)</span>}>
                    <span style={{ fontWeight: 'bold' }}>
                        ₹{result.data.totalChargeableAmount ? parseFloat(result.data.totalChargeableAmount).toFixed(2) : '0.00'}
                    </span>
                </Descriptions.Item>

                <Descriptions.Item label="3. Number of Students to Charge">
                    {result.data.studentsCharged} (Excluding {result.data.studentsExempt} on OD/Leave)
                </Descriptions.Item>

                {/* NEW: Display both raw and rounded per-student cost in breakdown */}
                <Descriptions.Item label="4. Actual Daily Cost per Student (before rounding)">
                    ₹{result.data.rawDailyCostPerStudent ? parseFloat(result.data.rawDailyCostPerStudent).toFixed(2) : '0.00'}
                </Descriptions.Item>
                <Descriptions.Item label={<span style={{ fontWeight: 'bold' }}>5. Final Daily Cost per Student (Rounded)</span>}>
                    <span style={{ fontWeight: 'bold' }}>
                        ₹{result.data.dailyCost ? parseFloat(result.data.dailyCost).toFixed(2) : '0.00'}
                    </span>
                </Descriptions.Item>

                {/* Display total rounding adjustment */}
                {parseFloat(result.data.totalRoundingAdjustment) !== 0 && (
                  <Descriptions.Item label={<span style={{ fontWeight: 'bold' }}>6. Total Rounding Adjustment (Hostel Income/Expense)</span>}>
                      <span style={{ fontWeight: 'bold', color: parseFloat(result.data.totalRoundingAdjustment) >= 0 ? 'green' : 'red' }}>
                          {parseFloat(result.data.totalRoundingAdjustment) >= 0 ? '+' : ''}₹{parseFloat(result.data.totalRoundingAdjustment).toFixed(2)}
                      </span>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                          (This amount is recorded as Additional Income for the hostel)
                      </Paragraph>
                  </Descriptions.Item>
                )}
            </Descriptions>
        </Card>
      )}
    </Card>
  );
};

export default CalculateDailyCharges;
