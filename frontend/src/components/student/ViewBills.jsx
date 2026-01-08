import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Spin, Empty, Typography, Statistic, Row, Col, 
  DatePicker, Button, message, Tooltip 
} from 'antd';
import { 
  DollarSign, AlertTriangle, CheckCircle, Calendar, 
  FileText, Download, CreditCard, Clock, XCircle
} from 'lucide-react';
import { studentAPI } from '../../services/api'; // Updated to use your api.js
import moment from 'moment';

const { Title, Text } = Typography;

const ViewBills = () => {
  const [loading, setLoading] = useState(true);
  const [messBills, setMessBills] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [stats, setStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    totalBills: 0,
    paidBills: 0,
    pendingBills: 0,
    overdueBills: 0
  });
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  useEffect(() => {
    fetchMessBills();
    fetchAttendance();
  }, [selectedMonth]);

  const fetchMessBills = async () => {
    setLoading(true);
    try {
      const month = selectedMonth.month() + 1; // 1-based month
      const year = selectedMonth.year();
      const response = await studentAPI.getMessBills({ month, year });
      
      const bills = response.data.data || [];
      setMessBills(bills);
      
      // Calculate stats
      const totalAmount = bills.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const paidAmount = bills.filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const pendingAmount = bills.filter(bill => bill.status === 'pending')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const overdueAmount = bills.filter(bill => bill.status === 'overdue')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      
      const totalBills = bills.length;
      const paidBills = bills.filter(bill => bill.status === 'paid').length;
      const pendingBills = bills.filter(bill => bill.status === 'pending').length;
      const overdueBills = bills.filter(bill => bill.status === 'overdue').length;
      
      setStats({ 
        totalAmount, 
        paidAmount, 
        pendingAmount, 
        overdueAmount,
        totalBills,
        paidBills,
        pendingBills,
        overdueBills 
      });
    } catch (error) {
      console.error('Error fetching mess bills:', error);
      message.error(error.message || 'Failed to load mess bills');
    } finally {
      setLoading(false);
    }
  };

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
    setSelectedMonth(date || moment());
  };

  const handlePayNow = (bill) => {
    message.info('Payment gateway integration would go here');
    // This would typically open a payment gateway
  };

  const handleDownloadReceipt = (bill) => {
    message.info('Receipt download functionality would go here');
    // This would generate a PDF receipt
  };

  const columns = [
    {
      title: 'Bill Date',
      key: 'billDate',
      render: (_, record) => {
        const monthYear = `${moment().month(record.month - 1).format('MMMM')} ${record.year}`;
        return (
          <div>
            <div className="font-medium">{monthYear}</div>
            <div className="text-xs text-gray-500">Mess charges</div>
          </div>
        );
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span className="font-medium">₹{parseFloat(amount).toFixed(2)}</span>
      )
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => (
        <div className="flex items-center">
          <Clock size={14} className="mr-1 text-gray-500" />
          <span>{moment(date).format('DD MMM YYYY')}</span>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color, icon;
        if (status === 'pending') {
          color = 'bg-yellow-100 text-yellow-800';
          icon = <AlertTriangle size={16} className="mr-1 text-yellow-500" />;
        } else if (status === 'paid') {
          color = 'bg-green-100 text-green-800';
          icon = <CheckCircle size={16} className="mr-1 text-green-500" />;
        } else if (status === 'overdue') {
          color = 'bg-red-100 text-red-800';
          icon = <AlertTriangle size={16} className="mr-1 text-red-500" />;
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${color}`}>
            {icon}
            {status.toUpperCase()}
          </span>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex space-x-2">
          {record.status !== 'paid' && (
            <Tooltip title="Pay Now">
              <Button
                type="primary"
                size="small"
                icon={<CreditCard size={14} />}
                onClick={() => handlePayNow(record)}
                className="flex items-center"
              >
                Pay Now
              </Button>
            </Tooltip>
          )}
          {record.status === 'paid' && (
            <Tooltip title="Download Receipt">
              <Button
                type="default"
                size="small"
                icon={<Download size={14} />}
                onClick={() => handleDownloadReceipt(record)}
                className="flex items-center"
              >
                Receipt
              </Button>
            </Tooltip>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>My Mess Bills</Title>
        <DatePicker 
          picker="month" 
          value={selectedMonth}
          onChange={handleMonthChange}
          allowClear={false}
        />
      </div>

      <Row gutter={16}>
        <Col xs={24} md={6}>
          <Card className="h-full">
            <Statistic
              title={<div className="flex items-center"><FileText size={16} className="mr-1" /> Total Amount</div>}
              value={stats.totalAmount}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="h-full">
            <Statistic
              title={<div className="flex items-center"><CheckCircle size={16} className="mr-1" /> Paid Amount</div>}
              value={stats.paidAmount}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="h-full">
            <Statistic
              title={<div className="flex items-center"><Clock size={16} className="mr-1" /> Pending Amount</div>}
              value={stats.pendingAmount}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="h-full">
            <Statistic
              title={<div className="flex items-center"><AlertTriangle size={16} className="mr-1" /> Overdue Amount</div>}
              value={stats.overdueAmount}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
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
        className="shadow-md"
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

      <Card 
        title={<div className="flex items-center"><DollarSign className="mr-2" size={18} /> Mess Bills for {selectedMonth.format('MMMM YYYY')}</div>}
        className="shadow-md"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : messBills.length > 0 ? (
          <Table 
            columns={columns} 
            dataSource={messBills}
            rowKey="id" 
            pagination={false}
          />
        ) : (
          <Empty 
            description={
              <span>
                No mess bills found for {selectedMonth.format('MMMM YYYY')}
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className="py-12"
          />
        )}
      </Card>

      <Card title="Payment Instructions" className="bg-gray-50">
        <ul className="list-disc pl-6 space-y-2">
          <li>Bills are generated at the end of each month based on the mess services provided</li>
          <li>Payment is due by the 10th of the following month</li>
          <li>Late payments may incur additional charges</li>
          <li>For any billing queries, please contact the mess office</li>
        </ul>
      </Card>
    </div>
  );
};

export default ViewBills;