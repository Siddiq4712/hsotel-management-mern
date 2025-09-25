import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Spin, Empty, Typography, Statistic, Row, Col, 
  DatePicker, Button, message, Tooltip 
} from 'antd';
import { 
  DollarSign, AlertTriangle, CheckCircle, Calendar, 
  FileText, Download, CreditCard, Clock
} from 'lucide-react';
import { studentAPI } from '../../services/api'; // Updated to use your api.js
import moment from 'moment';

const { Title, Text } = Typography;

const ViewBills = () => {
  const [loading, setLoading] = useState(true);
  const [messBills, setMessBills] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchMessBills();
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
      const total = bills.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const paid = bills.filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const pending = bills.filter(bill => bill.status === 'pending')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const overdue = bills.filter(bill => bill.status === 'overdue')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      
      setStats({ total, paid, pending, overdue });
    } catch (error) {
      console.error('Error fetching mess bills:', error);
      message.error(error.message || 'Failed to load mess bills');
    } finally {
      setLoading(false);
    }
  };

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
              title={<div className="flex items-center"><FileText size={16} className="mr-1" /> Total Bills</div>}
              value={stats.total}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="h-full">
            <Statistic
              title={<div className="flex items-center"><CheckCircle size={16} className="mr-1" /> Paid</div>}
              value={stats.paid}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="h-full">
            <Statistic
              title={<div className="flex items-center"><Clock size={16} className="mr-1" /> Pending</div>}
              value={stats.pending}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="h-full">
            <Statistic
              title={<div className="flex items-center"><AlertTriangle size={16} className="mr-1" /> Overdue</div>}
              value={stats.overdue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

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