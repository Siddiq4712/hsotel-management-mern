import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Tag, Space, message, Modal, 
  Form, Input, Select, InputNumber, Typography, Tabs,
  Drawer, Divider, List, ConfigProvider, theme
} from 'antd';
import { Row, Col, Empty } from "antd";

// Lucide icons for consistency
import { 
  Plus, Edit2, Trash2, Eye, Calendar, Search, 
  ChefHat, Filter, Info, Clock, Utensils, X, Save
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const EnhancedMenuManagement = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [currentMenu, setCurrentMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [searchText, setSearchText] = useState('');

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', color: 'blue', bg: '#eff6ff', text: '#2563eb' },
    { value: 'lunch', label: 'Lunch', color: 'green', bg: '#ecfdf5', text: '#059669' },
    { value: 'dinner', label: 'Dinner', color: 'purple', bg: '#faf5ff', text: '#7c3aed' },
    { value: 'snacks', label: 'Snacks', color: 'orange', bg: '#fff7ed', text: '#ea580c' }
  ];

  useEffect(() => {
    fetchMenus();
    fetchItems();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedMealType !== 'all') params.meal_type = selectedMealType;
      if (searchText) params.search = searchText;
      const response = await messAPI.getMenus(params);
      setMenus(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch menus');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      setItems(response.data.data || []);
    } catch (error) { console.error(error); }
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingMenu) {
        await messAPI.updateMenu(editingMenu.id, values);
        message.success('Menu updated successfully');
      } else {
        await messAPI.createMenu(values);
        message.success('Menu created successfully');
      }
      setModalVisible(false);
      fetchMenus();
    } catch (error) {
      message.error('Failed to save menu');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleViewMenu = async (menu) => {
    setLoading(true);
    try {
      const response = await messAPI.getMenuWithItems(menu.id);
      setCurrentMenu(response.data.data);
      setDrawerVisible(true);
    } catch (error) {
      message.error('Failed to load menu details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Delete Menu?',
      icon: <Trash2 size={20} className="text-rose-500" />,
      content: 'This will remove the menu and all associated items. This action is permanent.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        await messAPI.deleteMenu(id);
        message.success('Menu removed');
        fetchMenus();
      },
    });
  };

  const columns = [
    {
      title: 'Menu Name',
      dataIndex: 'name',
      key: 'name',
      render: (t) => <Text strong className="text-slate-700">{t}</Text>
    },
    {
      title: 'Type',
      dataIndex: 'meal_type',
      key: 'meal_type',
      render: (text) => {
        const type = mealTypes.find(t => t.value === text);
        return (
          <Tag bordered={false} style={{ backgroundColor: type?.bg, color: type?.text, fontWeight: 600 }} className="px-3 rounded-full">
            {text.toUpperCase()}
          </Tag>
        );
      }
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => (
        <Space>
          <Utensils size={14} className="text-slate-400" />
          <Text className="text-slate-500">{record.tbl_Menu_Items?.length || 0} Items</Text>
        </Space>
      ),
    },
    {
      title: 'Servings',
      dataIndex: 'estimated_servings',
      key: 'estimated_servings',
      render: (t) => <Tag bordered={false} className="bg-slate-100 text-slate-600">{t || 'N/A'}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button icon={<Eye size={14}/>} onClick={() => handleViewMenu(record)} className="flex items-center gap-2">View</Button>
          <Button icon={<Edit2 size={14}/>} onClick={() => { setEditingMenu(record); form.setFieldsValue(record); setModalVisible(true); }} className="flex items-center gap-2">Edit</Button>
          <Button danger icon={<Trash2 size={14}/>} onClick={() => handleDelete(record.id)} className="flex items-center gap-2" />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: '#2563eb', borderRadius: 12 },
      }}
    >
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
              <ChefHat className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Menu Management</Title>
              <Text type="secondary">Create and manage standardized meal templates</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<Plus size={18}/>} 
            onClick={() => { setEditingMenu(null); form.resetFields(); setModalVisible(true); }}
            className="flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            Create New Menu
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-none shadow-sm rounded-2xl">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-slate-400" />
              <Select
                value={selectedMealType}
                onChange={(v) => { setSelectedMealType(v); setTimeout(fetchMenus, 0); }}
                className="w-48"
                bordered={false}
                style={{ background: '#f8fafc', borderRadius: '8px' }}
              >
                <Option value="all">All Meal Types</Option>
                {mealTypes.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
              </Select>
            </div>
            <Input 
              placeholder="Search menus..." 
              prefix={<Search size={16} className="text-slate-400" />} 
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onPressEnter={fetchMenus}
              className="w-72 rounded-full bg-slate-50 border-slate-200"
            />
          </div>
        </Card>

        {/* Table */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden" bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={menus}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 8 }}
            className="custom-table"
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          title={<span className="flex items-center gap-2"><Plus size={18}/> {editingMenu ? 'Update Menu' : 'Create New Menu'}</span>}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={500}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
            <Form.Item name="name" label="Menu Name" rules={[{ required: true }]}><Input placeholder="e.g., Deluxe Veg Thali" /></Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="meal_type" label="Meal Type" rules={[{ required: true }]}><Select options={mealTypes} /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="estimated_servings" label="Est. Servings" rules={[{ required: true }]}><InputNumber className="w-full" min={1} /></Form.Item>
              </Col>
            </Row>
            <Form.Item name="preparation_time" label="Prep Time (Minutes)"><InputNumber className="w-full" min={1} /></Form.Item>
            <Form.Item name="description" label="Internal Notes"><TextArea rows={3} placeholder="Optional instructions..." /></Form.Item>
            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={confirmLoading} icon={<Save size={16}/>} className="flex items-center gap-2">
                {editingMenu ? 'Update' : 'Create'} Menu
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Detail Drawer */}
        <Drawer
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Info size={18}/></div>
              <span className="text-slate-800 font-bold">{currentMenu?.menu?.name}</span>
            </div>
          }
          width={550}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          closeIcon={<X size={20} />}
        >
          {currentMenu && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Text className="text-slate-400 text-xs uppercase block mb-1">Meal Type</Text>
                  <Text strong className="text-slate-700 capitalize">{currentMenu.menu.meal_type}</Text>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Text className="text-slate-400 text-xs uppercase block mb-1">Prep Time</Text>
                  <Text strong className="text-slate-700 flex items-center gap-1"><Clock size={14}/> {currentMenu.menu.preparation_time || 0} mins</Text>
                </div>
              </div>

              <div>
                <Title level={5} className="flex items-center gap-2 mb-4"><Utensils size={18} className="text-blue-500"/> Menu Components</Title>
                <List
                  dataSource={currentMenu.menu_items}
                  renderItem={item => (
                    <div className="flex justify-between items-center p-3 mb-2 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                      <div>
                        <Text strong className="block">{item.tbl_Item?.name}</Text>
                        <Text type="secondary" size="small">{item.quantity} {item.unit}</Text>
                      </div>
                      <Button type="text" danger icon={<Trash2 size={14}/>} />
                    </div>
                  )}
                  locale={{ emptyText: <Empty description="No components added yet" /> }}
                />
              </div>

              <Divider />
              <Title level={5}>Add New Component</Title>
              <Form form={itemForm} layout="vertical" onFinish={async (v) => { 
                await messAPI.addItemsToMenu(currentMenu.menu.id, { items: [v] }); 
                handleViewMenu(currentMenu.menu); 
                itemForm.resetFields(); 
              }}>
                <Form.Item name="item_id" label="Raw Material" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Search items..." optionFilterProp="children">
                    {items.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
                  </Select>
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="quantity" label="Qty" rules={[{ required: true }]}><InputNumber className="w-full" /></Form.Item>
                  <Form.Item name="unit" label="Unit" rules={[{ required: true }]}><Input placeholder="kg, ltr, etc." /></Form.Item>
                </div>
                <Button type="primary" block htmlType="submit" icon={<Plus size={16}/>} className="flex items-center justify-center gap-2">Add to Menu</Button>
              </Form>
            </div>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default EnhancedMenuManagement;