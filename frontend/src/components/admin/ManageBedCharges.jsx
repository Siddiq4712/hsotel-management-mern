import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tooltip,
  Tag
} from 'antd';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const ManageBedCharges = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [bedCharges, setBedCharges] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [form] = Form.useForm();

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch all required data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get students
      const studentsResponse = await axios.get('/api/admin/users', {
        params: { role: 'student' }
      });
      setStudents(studentsResponse.data.data || []);

      // Get hostels
      const hostelsResponse = await axios.get('/api/admin/hostels');
      setHostels(hostelsResponse.data.data || []);

      // Get bed charges (if you have an endpoint for this)
      try {
        const bedChargesResponse = await axios.get('/api/bed-charges');
        setBedCharges(bedChargesResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching bed charges:', error);
        setBedCharges([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Initialize bed charges for a student
  const initializeBedCharges = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/bed-charges/initialize', {
        studentId: values.studentId,
        hostelId: values.hostelId,
        bedChargeAmount: values.bedChargeAmount
      });
      
      message.success('Bed charges initialized successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error initializing bed charges:', error);
      message.error(error.response?.data?.message || 'Failed to initialize bed charges');
    } finally {
      setLoading(false);
    }
  };

  // Generate monthly bed charges
  const generateMonthlyCharges = async () => {
    setGenerateLoading(true);
    try {
      const response = await axios.post('/api/bed-charges/generate-monthly');
      message.success(response.data.message || 'Monthly bed charges generated successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error generating monthly charges:', error);
      message.error(error.response?.data?.message || 'Failed to generate monthly charges');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Check student bed charge status
  const checkStudentStatus = async (studentId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/bed-charges/status/${studentId}`);
      const status = response.data.data;
      
      Modal.info({
        title: 'Bed Charge Status',
        content: (
          <div>
            <p><strong>Student ID:</strong> {status.studentId}</p>
            <p><strong>Status:</strong> {status.status}</p>
            <p><strong>Is Chargeable:</strong> {status.isChargeable ? 'Yes' : 'No'}</p>
          </div>
        )
      });
    } catch (error) {
      console.error('Error checking status:', error);
      message.error('Failed to check student status');
    } finally {
      setLoading(false);
    }
  };

  // Table columns definition
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Student',
      dataIndex: 'student',
      key: 'student',
      render: (_, record) => {
        const student = students.find(s => s.id === record.student_id) || {};
        return <span>{student.userName || record.student_id}</span>;
      }
    },
    {
      title: 'Hostel',
      dataIndex: 'hostel',
      key: 'hostel',
      render: (_, record) => {
        const hostel = hostels.find(h => h.id === record.hostel_id) || {};
        return <span>{hostel.name || record.hostel_id}</span>;
      }
    },
    {
      title: 'Monthly Charge',
      dataIndex: 'bed_charge_amount',
      key: 'bed_charge_amount',
      render: (amount) => `₹${amount}`
    },
    {
      title: 'Enrollment Date',
      dataIndex: 'enrollment_date',
      key: 'enrollment_date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Charges End Date',
      dataIndex: 'charges_end_date',
      key: 'charges_end_date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'active') color = 'blue';
        else if (status === 'completed') color = 'green';
        else if (status === 'inactive') color = 'red';
        
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Check Status">
            <Button 
              type="primary" 
              size="small"
              onClick={() => checkStudentStatus(record.student_id)}
            >
              Check Status
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="bed-charges-management">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={2}>Manage Bed Charges</Title>
          <Space>
            <Button 
              type="primary" 
              onClick={() => setIsModalVisible(true)}
            >
              Initialize Bed Charges
            </Button>
            <Button 
              onClick={generateMonthlyCharges} 
              loading={generateLoading}
            >
              Generate Monthly Charges
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={bedCharges}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />

        {/* Initialize Bed Charges Modal */}
        <Modal
          title="Initialize Bed Charges"
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={initializeBedCharges}
          >
            <Form.Item
              name="studentId"
              label="Student"
              rules={[{ required: true, message: 'Please select a student' }]}
            >
              <Select placeholder="Select a student">
                {students.map(student => (
                  <Option key={student.userId} value={student.userId}>
                    {student.userName} ({student.email})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="hostelId"
              label="Hostel"
              rules={[{ required: true, message: 'Please select a hostel' }]}
            >
              <Select placeholder="Select a hostel">
                {hostels.map(hostel => (
                  <Option key={hostel.id} value={hostel.id}>
                    {hostel.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="bedChargeAmount"
              label="Bed Charge Amount (₹)"
              rules={[{ required: true, message: 'Please enter bed charge amount' }]}
            >
              <Input type="number" min="0" step="0.01" />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  style={{ marginRight: 8 }} 
                  onClick={() => setIsModalVisible(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                >
                  Initialize
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default ManageBedCharges;