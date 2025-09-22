import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Form, Modal, message,
  Tag, List, Empty, Steps, Divider, Typography, InputNumber,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, MenuOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Step } = Steps;
const { TextArea } = Input;
const { Title, Text } = Typography;

const EnhancedMenuManagement = () => {
  const [menuDetailsForm] = Form.useForm();
  const [itemSelectionForm] = Form.useForm();

  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [menuDetails, setMenuDetails] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // NEW: State to hold the total calculated cost of the menu being created/edited
  const [totalMenuCost, setTotalMenuCost] = useState(0);

  const [viewMenu, setViewMenu] = useState(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('all');

  useEffect(() => {
    fetchMenus();
    fetchItems();
  }, []);

  // NEW: Effect to recalculate total cost whenever the ingredients list changes
  useEffect(() => {
    const total = selectedItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    setTotalMenuCost(total);
  }, [selectedItems]);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mess/menus');
      setMenus(response.data.data);
    } catch (error) {
      message.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/mess/items');
      setItems(response.data.data); // This fetch must include unit_price for each item
    } catch (error) {
      message.error('Failed to load items');
    }
  };

  const handleAddNewMenu = () => {
    setCurrentStep(0);
    setEditingMenu(null);
    setMenuDetails(null);
    setSelectedItems([]);
    menuDetailsForm.resetFields();
    setIsModalVisible(true);
  };

  const handleEditMenu = (menu) => {
    setCurrentStep(0);
    setEditingMenu(menu);
    // NEW: We add price and calculate total cost when pre-filling the items
    const itemsWithCost = (menu.tbl_Menu_Items || []).map(mi => {
        const itemData = items.find(i => i.id === mi.item_id);
        const unitPrice = parseFloat(itemData?.unit_price || 0);
        return {
            ...mi,
            key: mi.item_id,
            item_name: mi.tbl_Item?.name || 'Unknown',
            unit_price: unitPrice,
            total_cost: unitPrice * parseFloat(mi.quantity || 0)
        }
    });
    setSelectedItems(itemsWithCost);
    menuDetailsForm.setFieldsValue(menu);
    setIsModalVisible(true);
  };

  const handleNextStep = async () => {
    try {
      const values = await menuDetailsForm.validateFields();
      setMenuDetails(values);
      setCurrentStep(1);
    } catch (error) {
      console.log('Validation failed:', error);
    }
  };

  const handlePrevStep = () => setCurrentStep(0);
  const handleModalCancel = () => setIsModalVisible(false);

  const handleFinalSubmit = async () => {
    try {
      const payload = { ...menuDetails, items: selectedItems.map(({ key, item_name, unit_price, total_cost, ...rest }) => rest) };
      if (editingMenu) {
        await api.put(`/mess/menus/${editingMenu.id}`, menuDetails);
        await api.put(`/mess/menus/${editingMenu.id}/items`, { items: payload.items });
        message.success('Menu updated successfully');
      } else {
        await api.post('/mess/menus', payload);
        message.success('Menu created successfully');
      }
      setIsModalVisible(false);
      fetchMenus();
    } catch (error) {
      message.error('Failed to save menu');
    }
  };

  const handleAddItemToSelection = () => {
    const values = itemSelectionForm.getFieldsValue();
    if (!values.item_id) return message.error('Please select an item');
    
    const itemData = items.find(item => item.id === values.item_id);
    if (selectedItems.find(item => item.item_id === values.item_id)) return message.warning('Item already added');
    
    const quantity = values.quantity || 1;
    const unitPrice = parseFloat(itemData.unit_price || 0); // NEW: Get unit price
    const totalCost = unitPrice * quantity; // NEW: Calculate cost for this item

    setSelectedItems([...selectedItems, {
      key: itemData.id,
      item_id: itemData.id,
      item_name: itemData.name,
      quantity: quantity,
      unit: itemData.UOM?.abbreviation || 'unit',
      unit_price: unitPrice, // NEW: Store the price
      total_cost: totalCost, // NEW: Store the calculated cost
      preparation_notes: values.preparation_notes || ''
    }]);
    itemSelectionForm.resetFields({ quantity: 1 });
  };
  
  const handleRemoveItem = (key) => {
    setSelectedItems(selectedItems.filter(item => item.key !== key));
  };
  
  const handleViewMenu = (menu) => {
    setViewMenu(menu);
    setIsViewModalVisible(true);
  };

  const handleDeleteMenu = async (id) => {
    try {
      await api.delete(`/mess/menus/${id}`);
      message.success('Menu deleted successfully');
      fetchMenus();
    } catch (error) {
      message.error('Failed to delete menu');
    }
  };

  const filteredMenus = menus.filter(menu => 
    (mealTypeFilter === 'all' || menu.meal_type === mealTypeFilter) &&
    menu.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const menuColumns = [
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Meal Type', dataIndex: 'meal_type',
      render: type => <Tag color={type === 'breakfast' ? 'blue' : type === 'lunch' ? 'green' : 'purple'}>{type.toUpperCase()}</Tag>
    },
    { title: 'Items', dataIndex: 'tbl_Menu_Items', render: items => items?.length || 0 },
    {
      title: 'Actions', key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<SearchOutlined />} size="small" onClick={() => handleViewMenu(record)}>View</Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEditMenu(record)}>Edit</Button>
          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => Modal.confirm({
              title: 'Confirm Delete',
              content: `Are you sure you want to delete "${record.name}"?`,
              onOk: () => handleDeleteMenu(record.id)
          })}/>
        </Space>
      ),
    },
  ];

  const itemSelectionColumns = [
    { title: 'Item', dataIndex: 'item_name' },
    { title: 'Quantity', dataIndex: 'quantity' },
    { title: 'Unit', dataIndex: 'unit' },
    // NEW: Column to display the calculated amount for each ingredient
    { 
      title: 'Amount',
      dataIndex: 'total_cost',
      render: (cost) => `₹${(cost || 0).toFixed(2)}`
    },
    { title: 'Notes', dataIndex: 'preparation_notes', ellipsis: true },
    {
      title: 'Action', key: 'action',
      render: (_, record) => <Button danger size="small" onClick={() => handleRemoveItem(record.key)}>Remove</Button>
    },
  ];

  return (
    <Card title="Menu Management (Recipe Book)" bordered={false}>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNewMenu}>Create New Menu</Button>
        <Input placeholder="Search menus" prefix={<SearchOutlined />} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }}/>
        <Select defaultValue="all" onChange={setMealTypeFilter} style={{ width: 150 }}>
          <Option value="all">All Meal Types</Option>
          <Option value="breakfast">Breakfast</Option>
          <Option value="lunch">Lunch</Option>
          <Option value="dinner">Dinner</Option>
          <Option value="snacks">Snacks</Option>
        </Select>
      </Space>

      <Table columns={menuColumns} dataSource={filteredMenus} rowKey="id" loading={loading} />

      <Modal title={editingMenu ? "Edit Menu" : "Create New Menu"} visible={isModalVisible} onCancel={handleModalCancel} footer={null} width={900} destroyOnClose>
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="Menu Details" />
          <Step title="Add Ingredients" />
        </Steps>

        <div style={{ display: currentStep === 0 ? 'block' : 'none', minHeight: '300px' }}>
          <Form form={menuDetailsForm} layout="vertical" initialValues={{ meal_type: 'breakfast' }}>
            <Form.Item name="name" label="Menu Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="meal_type" label="Meal Type" rules={[{ required: true }]}>
              <Select>
                <Option value="breakfast">Breakfast</Option>
                <Option value="lunch">Lunch</Option>
                <Option value="dinner">Dinner</Option>
                <Option value="snacks">Snacks</Option>
              </Select>
            </Form.Item>
            <Form.Item name="description" label="Description"><TextArea rows={2} /></Form.Item>
            <Form.Item name="estimated_servings" label="Default Estimated Servings"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="preparation_time" label="Preparation Time (minutes)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </Form>
        </div>

        <div style={{ display: currentStep === 1 ? 'block' : 'none', minHeight: '300px' }}>
            <Form form={itemSelectionForm} layout="inline" style={{ marginBottom: 16 }} onFinish={handleAddItemToSelection}>
              <Form.Item name="item_id" rules={[{ required: true }]} style={{flex: 1}}>
                  <Select showSearch placeholder="Search and select an item" optionFilterProp="children">
                      {items.map(item => <Option key={item.id} value={item.id}>{`${item.name} (@ ₹${item.unit_price}/${item.UOM?.abbreviation || 'unit'})`}</Option>)}
                  </Select>
              </Form.Item>
              <Form.Item name="quantity" initialValue={1}><InputNumber min={0.1} step={0.1} /></Form.Item>
              <Form.Item><Button type="primary" htmlType="submit">Add Item</Button></Form.Item>
            </Form>
            <Table columns={itemSelectionColumns} dataSource={selectedItems} rowKey="key" pagination={false} size="small"/>
            {/* NEW: Display the total estimated cost */}
            <Title level={4} style={{ textAlign: 'right', marginTop: '16px' }}>
              Total Estimated Cost: <Text type="success">₹{totalMenuCost.toFixed(2)}</Text>
            </Title>
        </div>
        
        <Divider />
        <div style={{ textAlign: 'right' }}>
          {currentStep > 0 && <Button style={{ margin: '0 8px' }} onClick={handlePrevStep}>Previous</Button>}
          {currentStep < 1 && <Button type="primary" onClick={handleNextStep}>Next</Button>}
          {currentStep === 1 && <Button type="primary" onClick={handleFinalSubmit}>{editingMenu ? 'Update Menu' : 'Create Menu'}</Button>}
        </div>
      </Modal>

      <Modal title={viewMenu?.name || 'Menu Details'} visible={isViewModalVisible} onCancel={() => setIsViewModalVisible(false)} footer={<Button onClick={() => setIsViewModalVisible(false)}>Close</Button>}>
        {viewMenu && (
          <>
            <p><strong>Meal Type:</strong> {viewMenu.meal_type}</p>
            <p><strong>Description:</strong> {viewMenu.description || 'N/A'}</p>
            <Divider>Ingredients</Divider>
            {viewMenu.tbl_Menu_Items?.length > 0 ? (
              <List dataSource={viewMenu.tbl_Menu_Items} renderItem={item => (
                  <List.Item>
                    <List.Item.Meta title={item.tbl_Item?.name || 'Unknown'}/>
                    <div>{item.quantity} {item.unit}</div>
                  </List.Item>
                )}/>
            ) : <Empty description="No ingredients added to this menu." />}
          </>
        )}
      </Modal>
    </Card>
  );
};

export default EnhancedMenuManagement;
