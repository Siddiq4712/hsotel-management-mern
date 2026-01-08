import React, { useState, useEffect } from 'react';
import { Card, Table, message, Spin, Typography, Tag, Select, DatePicker, Row, Col, Statistic } from 'antd';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { MonthPicker } = DatePicker;

const StudentMessHistory = () => {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

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
    fetchAttendance();
  }, [selectedMonth]);

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const date = moment().format('YYYY-MM-DD');
      const response = await studentAPI.getMyAttendance({ date });
      const records = response.data.data || [];
      setAttendance(records.length > 0 ? records[0] : null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      message.error('Failed to load attendance');
      setAttendance(null);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'P':
        return { icon: <CheckCircle className="text-green-600" size={48} />, text: 'Present', color: 'bg-green-50 border-green-200 text-green-800' };
      case 'A':
        return { icon: <XCircle className="text-red-600" size={48} />, text: 'Absent', color: 'bg-red-50 border-red-200 text-red-800' };
      case 'OD':
        return { icon: <Clock className="text-blue-600" size={48} />, text: 'On Duty', color: 'bg-blue-50 border-blue-200 text-blue-800' };
      default:
        return { icon: null, text: 'Not Marked', color: 'bg-gray-50 border-gray-200 text-gray-500' };
    }
  };

  const statusInfo = attendance ? getStatusDisplay(attendance.status) : getStatusDisplay(null);

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

      {/* Today's Attendance Status Card */}
      <Card 
        title={
          <div className="flex items-center">
            <Calendar className="mr-2" size={18} />
            <span>Today's Attendance Status ({moment().format('DD MMM YYYY')})</span>
          </div>
        }
        className="shadow-md mb-6"
      >
        {attendanceLoading ? (
          <div className="flex justify-center py-8">
            <Spin size="small" />
          </div>
        ) : (
          <div className={`flex flex-col items-center p-6 border rounded-lg ${statusInfo.color}`}>
            {statusInfo.icon}
            <Title level={4} className="mt-2 mb-1">{statusInfo.text}</Title>
            {attendance && (
              <p className="text-sm text-gray-600 mb-2">
                Reason: {attendance.reason || 'N/A'}
                {attendance.remarks && ` - ${attendance.remarks}`}
              </p>
            )}
            {attendance && attendance.status === 'OD' && (
              <p className="text-sm text-gray-600">
                From: {moment(attendance.from_date).format('DD MMM')} to {moment(attendance.to_date).format('DD MMM')}
              </p>
            )}
            {!attendance && <p className="text-sm text-gray-500">No attendance record for today</p>}
          </div>
        )}
      </Card>

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