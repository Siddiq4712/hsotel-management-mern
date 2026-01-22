import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, message, Modal, Form,
  Input, InputNumber, Select, Typography, Popconfirm, Switch,
  ConfigProvider, Row, Col, DatePicker, Tooltip
} from 'antd';
import {
  Plus, Edit3, Trash2,
  UtensilsCrossed, Timer, AlertCircle, Infinity
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const SpecialFoodItemsManagement = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const categories = [
    'Snacks', 'Beverages', 'Desserts',
    'Main Course', 'Breakfast', 'Sides', 'Other'
  ];

  useEffect(() => {
    fetchFoodItems();
  }, []);

  const fetchFoodItems = async () => {
    setLoading(true);
    try {
      const response = await messAPI.getSpecialFoodItems();
      setFoodItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch items');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);

    const payload = {
      ...values,
      expiry_time: values.expiry_time
        ? values.expiry_time.toISOString()
        : null,
      is_available: values.is_available ?? true
    };

    try {
      if (editingItem) {
        await messAPI.updateSpecialFoodItem(editingItem.id, payload);
        message.success('Dish updated successfully');
      } else {
        await messAPI.createSpecialFoodItem(payload);
        message.success('Special dish published');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingItem(null);
      fetchFoodItems();
    } catch (error) {
      message.error('Operation failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteSpecialFoodItem(id);
      message.success('Dish deleted successfully');
      fetchFoodItems();
    } catch (error) {
      message.error('Failed to delete dish');
    }
  };

  const columns = [
    {
      title: 'Dish',
      key: 'dish',
      width: '30%',
      render: (_, r) => (
        <Space>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
            {r.image_url ? (
              <img src={r.image_url} alt="" className="object-cover w-full h-full" />
            ) : (
              <UtensilsCrossed size={16} className="text-slate-400" />
            )}
          </div>
          <div>
            <Text strong className="block">{r.name}</Text>
            <Tag className="text-[10px] m-0 border-none bg-slate-100">
              {r.category}
            </Tag>
          </div>
        </Space>
      )
    },
    {
      title: 'Ordering Deadline',
      dataIndex: 'expiry_time',
      key: 'expiry_time',
      width: '25%',
      render: (time) => {
        // Check if time is null, undefined, or invalid
        if (!time) {
          return (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Infinity size={16} className="text-blue-600" />
              </div>
              <div>
                <Text className="block font-medium text-blue-600">No Time Limit</Text>
                <Text type="secondary" className="text-[10px]">
                  Always available
                </Text>
              </div>
            </div>
          );
        }

        const expiry = moment(time);
        
        // Check if the moment object is valid
        if (!expiry.isValid()) {
          return (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Infinity size={16} className="text-blue-600" />
              </div>
              <div>
                <Text className="block font-medium text-blue-600">No Time Limit</Text>
                <Text type="secondary" className="text-[10px]">
                  Always available
                </Text>
              </div>
            </div>
          );
        }

        const isPast = expiry.isBefore(moment());

        return (
          <Space direction="vertical" size={0}>
            <div
              className={`flex items-center gap-2 ${
                isPast ? 'text-red-500' : 'text-amber-600'
              } font-medium`}
            >
              <Timer size={14} />
              {expiry.format('hh:mm A')}
            </div>
            <Text type="secondary" className="text-[10px]">
              {expiry.format('DD MMM YYYY')}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: '15%',
      render: (p) => <Text strong className="text-blue-600 text-base">₹{p}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'is_available',
      key: 'status',
      width: '15%',
      render: (available, record) => {
        // Check if expiry_time exists and is valid before checking if expired
        const isExpired =
          record.expiry_time &&
          moment(record.expiry_time).isValid() &&
          moment(record.expiry_time).isBefore(moment());

        if (isExpired) return <Tag color="default">Expired</Tag>;

        return (
          <Tag color={available ? 'green' : 'red'}>
            {available ? 'Live' : 'Hidden'}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      width: '15%',
      render: (_, record) => (
        <Space>
          <Button
            icon={<Edit3 size={14} />}
            onClick={() => {
              setEditingItem(record);
              form.setFieldsValue({
                ...record,
                expiry_time:
                  record.expiry_time && moment(record.expiry_time).isValid()
                    ? moment(record.expiry_time)
                    : null
              });
              setModalVisible(true);
            }}
          />
          <Popconfirm
            title="Delete this dish?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
          >
            <Button icon={<Trash2 size={14} />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Title level={2} className="m-0">Special Menu Hub</Title>
            <Text type="secondary">
              Manage timed delicacies and student orders
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingItem(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Create Timed Special
          </Button>
        </div>

        <Card className="shadow-sm border-none rounded-2xl overflow-hidden">
          <Table
            loading={loading}
            dataSource={foodItems}
            columns={columns}
            rowKey={(r) => r.id}
            pagination={{ 
              pageSize: 7,
              showTotal: (total) => `Total ${total} items`
            }}
          />
        </Card>

        <Modal
          title={
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-blue-600" />
              <span>{editingItem ? 'Update Special Dish' : 'Create New Special Dish'}</span>
            </div>
          }
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
            setEditingItem(null);
          }}
          footer={null}
          centered
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ is_available: true }}
          >
            <Form.Item
              name="name"
              label="Dish Name"
              rules={[{ required: true, message: 'Please enter dish name' }]}
            >
              <Input placeholder="e.g. Midnight Paneer Tikka" size="large" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="Category"
                  rules={[{ required: true, message: 'Please select category' }]}
                >
                  <Select placeholder="Select type" size="large">
                    {categories.map(c => (
                      <Option key={c} value={c}>{c}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Price (₹)"
                  rules={[{ required: true, message: 'Please enter price' }]}
                >
                  <InputNumber 
                    className="w-full" 
                    prefix="₹" 
                    precision={2} 
                    min={0}
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Description (Optional)"
            >
              <TextArea 
                rows={3} 
                placeholder="Describe the dish..." 
                showCount
                maxLength={200}
              />
            </Form.Item>

            <Form.Item
              name="expiry_time"
              label={
                <Space>
                  <span>Order Deadline</span>
                  <Tooltip title="Leave empty for no time limit. If set, the dish will automatically disappear from the student menu after this time.">
                    <AlertCircle size={14} className="text-slate-400" />
                  </Tooltip>
                </Space>
              }
              extra="Optional: Set a deadline for students to place orders"
            >
              <DatePicker
                showTime
                className="w-full"
                format="DD MMM YYYY, hh:mm A"
                placeholder="Select deadline (optional)"
                size="large"
                disabledDate={(current) =>
                  current && current < moment().startOf('day')
                }
                showNow={false}
              />
            </Form.Item>

            <Form.Item
              name="is_available"
              label="Visibility"
              valuePropName="checked"
              extra="Turn off to hide from student menu without deleting"
            >
              <Switch 
                checkedChildren="Visible" 
                unCheckedChildren="Hidden"
              />
            </Form.Item>

            <div className="flex justify-end gap-2 mt-8">
              <Button 
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingItem(null);
                }}
                size="large"
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={confirmLoading}
                size="large"
                icon={editingItem ? <Edit3 size={16} /> : <Plus size={16} />}
              >
                {editingItem ? 'Save Changes' : 'Create Item'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default SpecialFoodItemsManagement;