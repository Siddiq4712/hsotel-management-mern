import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, DatePicker, Space, Tag, Modal, Form, message, Tabs } from 'antd';
import { ExportOutlined, DollarOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const ManageBills = () => {
  const [form] = Form.useForm();
  const [messBills, setMessBills] = useState([]);
  const [feesAllocation, setFeesAllocation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allocateModalVisible, setAllocateModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [month, setMonth] = useState(moment().month() + 1);
  const [year, setYear] = useState(moment().year());
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchMessBills();
    fetchFeesAllocation();
  }, [month, year, statusFilter]);

  const fetchMessBills = async () => {
    setLoading(true);
    try {
      let url = `/mess/bills?month=${month}&year=${year}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get(url);
      setMessBills(response.data.data);
    } catch (error) {
      console.error('Failed to fetch mess bills:', error);
      message.error('Failed to load mess bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeesAllocation = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/mess/fees/allocation?month=${month}&year=${year}`);
      setFeesAllocation(response.data.data);
    } catch (error) {
      console.error('Failed to fetch fees allocation:', error);
      message.error('Failed to load fees allocation');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    if (date) {
      setMonth(date.month() + 1);
      setYear(date.year());
    }
  };

  const handleGenerateBills = async () => {
    Modal.confirm({
      title: 'Generate Mess Bills',
      content: `Are you sure you want to generate mess bills for ${getMonthName(month)} ${year}?`,
      onOk: async () => {
        setSubmitting(true);
        try {
          await api.post('/mess/bills/generate', { month, year });
          message.success('Mess bills generated successfully');
          fetchMessBills();
        } catch (error) {
          console.error('Failed to generate bills:', error);
          message.error('Failed to generate mess bills');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const handleAllocateFees = () => {
    form.resetFields();
    setAllocateModalVisible(true);
  };

  const handleAllocateSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/mess/fees/allocate', {
        month,
        year
      });
      message.success('Mess fees allocated successfully');
      setAllocateModalVisible(false);
      fetchFeesAllocation();
    } catch (error) {
      console.error('Failed to allocate fees:', error);
      message.error('Failed to allocate mess fees');
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthName = (monthNum) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[monthNum - 1];
  };

  const handleUpdateBillStatus = async (id, status) => {
    try {
      await api.put(`/mess/bills/${id}`, { status });
      message.success('Bill status updated successfully');
      fetchMessBills();
    } catch (error) {
      console.error('Failed to update bill status:', error);
      message.error('Failed to update bill status');
    }
  };

  const handleExportBills = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Student,Month,Year,Amount,Status,Due Date\n';
    
    messBills.forEach(bill => {
      csvContent += `"${bill.MessBillStudent?.userName || 'Unknown'}",${getMonthName(bill.month)},${bill.year},${bill.amount},${bill.status},"${moment(bill.due_date).format('YYYY-MM-DD')}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mess-bills-${month}-${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const billColumns = [
    {
      title: 'Student',
      dataIndex: ['MessBillStudent', 'userName'],
      key: 'student',
      sorter: (a, b) => a.MessBillStudent?.userName.localeCompare(b.MessBillStudent?.userName),
    },
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      render: month => getMonthName(month),
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: amount => `₹${parseFloat(amount).toFixed(2)}`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={
          status === 'paid' ? 'green' : 
          status === 'pending' ? 'orange' : 'red'
        }>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: date => moment(date).format('YYYY-MM-DD'),
      sorter: (a, b) => moment(a.due_date).unix() - moment(b.due_date).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Select 
          defaultValue={record.status} 
          style={{ width: 120 }}
          onChange={(value) => handleUpdateBillStatus(record.id, value)}
        >
          <Option value="pending">Pending</Option>
          <Option value="paid">Paid</Option>
          <Option value="overdue">Overdue</Option>
        </Select>
      )
    }
  ];

  const allocationColumns = [
    {
      title: 'Student',
      dataIndex: ['Student', 'userName'],
      key: 'student',
    },
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      render: month => getMonthName(month),
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: 'Allocated Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: amount => `₹${parseFloat(amount).toFixed(2)}`,
    }
  ];

  return (
    <Card>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Mess Bills" key="1">
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <DatePicker
                picker="month"
                value={moment(`${year}-${month}`, 'YYYY-M')}
                onChange={handleDateChange}
                format="MMMM YYYY"
                style={{ marginRight: 16 }}
              />
              <Select
                placeholder="Filter by status"
                style={{ width: 150, marginRight: 16 }}
                onChange={value => setStatusFilter(value)}
                value={statusFilter}
              >
                <Option value="all">All Status</Option>
                <Option value="pending">Pending</Option>
                <Option value="paid">Paid</Option>
                <Option value="overdue">Overdue</Option>
              </Select>
              <Button 
                type="primary" 
                onClick={handleGenerateBills}
                loading={submitting}
                icon={<DollarOutlined />}
                style={{ marginRight: 16 }}
              >
                Generate Bills
              </Button>
              <Button 
                icon={<ExportOutlined />}
                onClick={handleExportBills}
                style={{ marginRight: 16 }}
                disabled={messBills.length === 0}
              >
                Export Bills
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchMessBills}
                disabled={loading}
              >
                Refresh
              </Button>
            </Space>
          </div>

          <Table
            columns={billColumns}
            dataSource={messBills}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </TabPane>

        <TabPane tab="Fees Allocation" key="2">
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <DatePicker
                picker="month"
                value={moment(`${year}-${month}`, 'YYYY-M')}
                onChange={handleDateChange}
                format="MMMM YYYY"
                style={{ marginRight: 16 }}
              />
              <Button 
                type="primary" 
                onClick={handleAllocateFees}
                loading={submitting}
                icon={<DollarOutlined />}
                style={{ marginRight: 16 }}
              >
                Allocate Fees
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchFeesAllocation}
                disabled={loading}
              >
                Refresh
              </Button>
            </Space>
          </div>

          <Table
            columns={allocationColumns}
            dataSource={feesAllocation}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </TabPane>
      </Tabs>

      {/* Fee Allocation Modal */}
      <Modal
        title="Allocate Mess Fees"
        visible={allocateModalVisible}
        onCancel={() => setAllocateModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAllocateSubmit}
          initialValues={{ month: month, year: year }}
        >
          <p>
            You are about to allocate mess fees for <strong>{getMonthName(month)} {year}</strong>.
          </p>
          <p>
            This will calculate each student's share of the total mess expenses for the month,
            taking into account attendance and approved leaves.
          </p>
          <p>
            Are you sure you want to proceed?
          </p>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={submitting}
              >
                Proceed with Allocation
              </Button>
              <Button onClick={() => setAllocateModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ManageBills;
