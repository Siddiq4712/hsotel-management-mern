import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Tag, Space, message, Modal, 
  Form, Input, Select, InputNumber, Typography, Tabs,
  Drawer, DatePicker, Divider, List, Avatar
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  EyeOutlined, CalendarOutlined, SearchOutlined 
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const EnhancedMenuManagement = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [currentMenu, setCurrentMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Get meal types
  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', color: 'blue' },
    { value: 'lunch', label: 'Lunch', color: 'green' },
    { value: 'dinner', label: 'Dinner', color: 'purple' },
    { value: 'snacks', label: 'Snacks', color: 'orange' }
  ];

  useEffect(() => {
    fetchMenus();
    fetchItems();
    fetchCategories();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category_id = selectedCategory;
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
    } catch (error) {
      message.error('Failed to fetch items');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await messAPI.getItemCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  const handleCreate = () => {
    setEditingMenu(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    form.setFieldsValue({
      name: menu.name,
      meal_type: menu.meal_type,
      description: menu.description,
      estimated_servings: menu.estimated_servings,
      preparation_time: menu.preparation_time,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this menu?',
      content: 'This action cannot be undone.',
      onOk: async () => {
        try {
          await messAPI.deleteMenu(id);
          message.success('Menu deleted successfully');
          fetchMenus();
        } catch (error) {
          message.error('Failed to delete menu');
        }
      },
    });
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

  const handleAddItem = async (values) => {
    try {
      await messAPI.addItemsToMenu(currentMenu.menu.id, { 
        items: [values]
      });
      message.success('Item added to menu');
      // Refresh menu details
      const response = await messAPI.getMenuWithItems(currentMenu.menu.id);
      setCurrentMenu(response.data.data);
      itemForm.resetFields();
    } catch (error) {
      message.error('Failed to add item');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await messAPI.removeItemFromMenu(currentMenu.menu.id, itemId);
      message.success('Item removed from menu');
      // Refresh menu details
      const response = await messAPI.getMenuWithItems(currentMenu.menu.id);
      setCurrentMenu(response.data.data);
    } catch (error) {
      message.error('Failed to remove item');
    }
  };

  const handleScheduleMenu = async (menu) => {
    // Navigate to menu scheduler with this menu pre-selected
    // This would typically be handled by react-router or similar
    message.info('Redirecting to scheduler...');
  };

  const handleFilterChange = () => {
    fetchMenus();
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Meal Type',
      dataIndex: 'meal_type',
      key: 'meal_type',
      render: (text) => {
        const mealType = mealTypes.find(type => type.value === text) || {};
        return <Tag color={mealType.color}>{text.toUpperCase()}</Tag>;
      },
      filters: mealTypes.map(type => ({ text: type.label, value: type.value })),
      onFilter: (value, record) => record.meal_type === value,
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => {
        const itemCount = record.tbl_Menu_Items?.length || 0;
        return itemCount > 0 ? itemCount : <Text type="secondary">No items</Text>;
      },
    },
    {
      title: 'Est. Servings',
      dataIndex: 'estimated_servings',
      key: 'estimated_servings',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => handleViewMenu(record)} 
            size="small"
            type="primary"
            ghost
          />
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)} 
            size="small"
          />
          <Button 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)} 
            size="small"
            danger
          />
          <Button 
            icon={<CalendarOutlined />} 
            onClick={() => handleScheduleMenu(record)} 
            size="small"
            type="primary"
          >
            Schedule
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Menu Management">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by meal type"
          style={{ width: 160 }}
          value={selectedMealType}
          onChange={(value) => {
            setSelectedMealType(value);
            setTimeout(handleFilterChange, 0);
          }}
        >
          <Option value="all">All Meal Types</Option>
          {mealTypes.map(type => (
            <Option key={type.value} value={type.value}>
              {type.label}
            </Option>
          ))}
        </Select>

        <Input 
          placeholder="Search menu name" 
          allowClear 
          value={searchText} 
          onChange={e => setSearchText(e.target.value)} 
          onPressEnter={handleFilterChange}
          style={{ width: 200 }}
          prefix={<SearchOutlined />}
        />

        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Create Menu
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={menus}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Create/Edit Menu Modal */}
      <Modal
        title={editingMenu ? 'Edit Menu' : 'Create Menu'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        confirmLoading={confirmLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Menu Name"
            rules={[{ required: true, message: 'Please enter menu name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="meal_type"
            label="Meal Type"
            rules={[{ required: true, message: 'Please select meal type' }]}
          >
            <Select>
              {mealTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="estimated_servings"
            label="Estimated Servings"
            rules={[{ required: true, message: 'Please enter estimated servings' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="preparation_time"
            label="Preparation Time (minutes)"
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                Save
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Menu Details Drawer */}
      <Drawer
        title={currentMenu?.menu?.name || 'Menu Details'}
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
      >
        {currentMenu && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div><Text strong>Meal Type:</Text> {currentMenu.menu.meal_type}</div>
              {currentMenu.menu.description && (
                <div><Text strong>Description:</Text> {currentMenu.menu.description}</div>
              )}
              <div>
                <Text strong>Estimated Servings:</Text> {currentMenu.menu.estimated_servings || 'N/A'}
              </div>
              <div>
                <Text strong>Preparation Time:</Text> {currentMenu.menu.preparation_time ? `${currentMenu.menu.preparation_time} minutes` : 'N/A'}
              </div>
            </div>

            <Tabs defaultActiveKey="1">
              <TabPane tab="Menu Items" key="1">
                {currentMenu.menu_items?.length > 0 ? (
                  <List
                    itemLayout="horizontal"
                    dataSource={currentMenu.menu_items}
                    renderItem={item => (
                      <List.Item
                        actions={[
                          <Button 
                            type="link" 
                            danger
                            onClick={() => handleRemoveItem(item.item_id)}
                          >
                            Remove
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          title={item.tbl_Item?.name}
                          description={`Quantity: ${item.quantity} ${item.unit}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <Text type="secondary">No items in this menu</Text>
                  </div>
                )}
                
                <Divider orientation="left">Add Item</Divider>
                
                <Form
                  form={itemForm}
                  layout="vertical"
                  onFinish={handleAddItem}
                >
                  <Form.Item
                    name="item_id"
                    label="Item"
                    rules={[{ required: true, message: 'Please select an item' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Select an item"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {items.map(item => (
                        <Option key={item.id} value={item.id}>
                          {item.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="quantity"
                    label="Quantity"
                    rules={[{ required: true, message: 'Please enter quantity' }]}
                  >
                    <InputNumber min={0.01} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item
                    name="unit"
                    label="Unit"
                    rules={[{ required: true, message: 'Please specify unit' }]}
                  >
                    <Input />
                  </Form.Item>

                  <Form.Item
                    name="preparation_notes"
                    label="Preparation Notes"
                  >
                    <TextArea rows={2} />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      Add Item
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>
            </Tabs>
          </>
        )}
      </Drawer>
    </Card>
  );
};

export default EnhancedMenuManagement;
