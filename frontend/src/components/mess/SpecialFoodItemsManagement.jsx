import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Table, Button, Space, Tag, Image, message, Modal, Form,
  Input, InputNumber, Select, Upload, Typography, Popconfirm, Switch,
  ConfigProvider, theme, Skeleton, Divider, Tooltip,Row,Col
} from 'antd';
import {
  Plus, Search, Edit3, Trash2, Camera, Clock, 
  UtensilsCrossed, Filter, LayoutGrid, CheckCircle2, XCircle
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

// --- Specialized Skeleton for Food Items ---
const FoodItemSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton.Input active style={{ width: 300 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="square" size={60} />
          <div className="flex-1">
            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '20%' }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      ))}
    </div>
  </Card>
);

const SpecialFoodItemsManagement = () => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUnavailable, setShowUnavailable] = useState(false);

  const categories = ['Snacks', 'Beverages', 'Desserts', 'Main Course', 'Breakfast', 'Sides', 'Other'];

  useEffect(() => {
    fetchFoodItems();
  }, []);

  const fetchFoodItems = async () => {
    setLoading(true);
    try {
      const params = {
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(!showUnavailable && { is_available: true }),
        ...(searchText && { search: searchText })
      };
      const response = await messAPI.getSpecialFoodItems(params);
      setFoodItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch food items');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  // --- Live Search Memoization ---
  const filteredData = useMemo(() => {
    if (!searchText) return foodItems;
    return foodItems.filter(item => 
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.category.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [foodItems, searchText]);

  const handleCreate = () => {
    setEditingItem(null);
    setImageUrl('');
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setImageUrl(item.image_url || '');
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingItem) {
        await messAPI.updateSpecialFoodItem(editingItem.id, values);
        message.success('Food item updated');
      } else {
        await messAPI.createSpecialFoodItem(values);
        message.success('Food item created');
      }
      setModalVisible(false);
      fetchFoodItems();
    } catch (error) {
      message.error('Action failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: 'Item Preview',
      dataIndex: 'image_url',
      key: 'image',
      width: 100,
      render: (url) => (
        <div className="relative group overflow-hidden rounded-2xl w-14 h-14 bg-slate-100 border border-slate-200">
           {url ? (
             <Image 
                src={url} 
                className="object-cover w-full h-full transition-transform group-hover:scale-110" 
                preview={{ mask: <div className="text-[10px]">Preview</div> }}
             />
           ) : (
             <div className="flex items-center justify-center h-full text-slate-300">
               <Camera size={20} />
             </div>
           )}
        </div>
      ),
    },
    {
      title: 'Food Info',
      key: 'info',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700 text-base">{r.name}</Text>
          <div className="flex items-center gap-2">
            <Tag color="blue" className="m-0 text-[10px] uppercase font-bold border-none rounded-full px-2">{r.category}</Tag>
            {r.preparation_time_minutes && (
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Clock size={12} /> {r.preparation_time_minutes}m
              </span>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'Pricing',
      dataIndex: 'price',
      align: 'right',
      render: (p) => <Text className="text-blue-600 font-bold text-base">₹{parseFloat(p).toFixed(2)}</Text>,
      sorter: (a, b) => a.price - b.price,
    },
    {
      title: 'Availability',
      dataIndex: 'is_available',
      align: 'center',
      render: (active) => (
        <Tag 
          icon={active ? <CheckCircle2 size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
          color={active ? 'success' : 'error'}
          className="rounded-full border-none px-3 font-bold text-[10px] uppercase"
        >
          {active ? 'Ready' : 'Off-menu'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Item">
            <Button className="rounded-lg" icon={<Edit3 size={14}/>} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="Delete item?" onConfirm={() => messAPI.deleteSpecialFoodItem(record.id).then(fetchFoodItems)}>
            <Button className="rounded-lg" icon={<Trash2 size={14}/>} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <UtensilsCrossed className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Special Menu Hub</Title>
              <Text type="secondary">Manage exclusive food items and premium delicacies</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<Plus size={18}/>} 
            onClick={handleCreate}
            className="rounded-xl h-12 shadow-lg shadow-blue-100 font-semibold"
          >
            Add New Item
          </Button>
        </div>

        {/* Toolbar Card */}
        <Card className="border-none shadow-sm rounded-2xl mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 max-w-md focus-within:border-blue-300 transition-all">
              <Search size={18} className="text-slate-300" />
              <Input 
                placeholder="Search by name or category..." 
                bordered={false} 
                value={searchText} 
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            
            <Select
              className="w-48 h-11"
              value={selectedCategory}
              onChange={(val) => { setSelectedCategory(val); setTimeout(fetchFoodItems, 0); }}
              suffixIcon={<Filter size={14} />}
            >
              <Option value="all">All Categories</Option>
              {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>

            <div className="flex items-center gap-3 bg-slate-100 p-2 px-4 rounded-xl border border-slate-200">
                <Text className="text-slate-500 text-xs font-bold uppercase">Show All</Text>
                <Switch size="small" checked={showUnavailable} onChange={(checked) => { setShowUnavailable(checked); setTimeout(fetchFoodItems, 0); }} />
            </div>
          </div>
        </Card>

        {loading ? <FoodItemSkeleton /> : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table dataSource={filteredData} columns={columns} pagination={{ pageSize: 8 }} rowKey="id" />
          </Card>
        )}

        {/* Create/Edit Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-blue-600">
              {editingItem ? <Edit3 size={18}/> : <Plus size={18}/>}
              {editingItem ? 'Refine Dish Details' : 'Register New Delicacy'}
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4" initialValues={{ is_available: true }}>
            <div className="flex justify-center mb-6">
               <Upload
                  listType="picture-card"
                  showUploadList={false}
                  className="food-uploader"
                  beforeUpload={(file) => {
                    const isLt2M = file.size / 1024 / 1024 < 2;
                    if (!isLt2M) message.error('Image must be < 2MB');
                    return isLt2M;
                  }}
                  customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 0)}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      const url = URL.createObjectURL(info.file.originFileObj);
                      setImageUrl(url);
                      form.setFieldsValue({ image_url: url });
                    }
                  }}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="food" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera size={24} className="text-slate-300 mb-2" />
                      <div className="text-[10px] uppercase font-bold text-slate-400">Add Photo</div>
                    </div>
                  )}
                </Upload>
            </div>

            <Row gutter={16}>
              <Col span={14}>
                <Form.Item name="name" label="Dish Name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Masala Dosa" className="h-11 rounded-xl" />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                  <Select placeholder="Select" className="h-11">
                    {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="price" label="Price (₹)" rules={[{ required: true }]}>
                  <InputNumber className="w-full h-11 flex items-center rounded-xl" precision={2} prefix="₹" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="preparation_time_minutes" label="Prep Time (Mins)">
                  <InputNumber className="w-full h-11 flex items-center rounded-xl" prefix={<Clock size={14}/>} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Item Description">
              <TextArea rows={3} placeholder="Ingredients, spice level, or special notes..." className="rounded-xl" />
            </Form.Item>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 flex justify-between items-center">
              <div>
                <Text strong className="block text-slate-700">Available to Order</Text>
                <Text className="text-[11px] text-slate-500 text-xs">Toggle to hide/show from digital menus</Text>
              </div>
              <Form.Item name="is_available" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>

            <Divider />

            <div className="flex justify-end gap-3">
              <Button onClick={() => setModalVisible(false)} className="rounded-xl h-11 px-6">Cancel</Button>
              <Button type="primary" htmlType="submit" loading={confirmLoading} className="rounded-xl h-11 px-8 font-bold">
                {editingItem ? 'Update Dish' : 'Publish Dish'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default SpecialFoodItemsManagement;