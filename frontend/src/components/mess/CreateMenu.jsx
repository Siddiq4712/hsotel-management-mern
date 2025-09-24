import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Input, Button, Select, DatePicker, 
  InputNumber, message, Space, Typography, Divider, 
  Table, Tag, Row, Col, Statistic, Tabs, Empty
} from 'antd';
import {
  SaveOutlined, CloseOutlined, InfoCircleOutlined,
  CalculatorOutlined, FilterOutlined, PlusOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const CreateMenu = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuItems, setMenuItems] = useState([]);
  const [costCalculation, setCostCalculation] = useState({
    totalCost: 0,
    costPerServing: 0
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  useEffect(() => {
    calculateCosts();
  }, [menuItems, form.getFieldValue('estimated_servings')]);

  const fetchItems = async () => {
    setDataLoading(true);
    try {
      const response = await messAPI.getItems();
      
      // Transform items to include quantity field for the form
      const itemsWithQuantity = (response.data.data || []).map(item => ({
        ...item,
        quantity: 0,
        preparation_notes: '',
        key: item.id  // Add key for table
      }));
      
      setItems(itemsWithQuantity);
    } catch (error) {
      message.error('Failed to fetch items');
    } finally {
      setDataLoading(false);
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

  const handleSubmit = async () => {
    try {
      // Validate main form
      const menuValues = await form.validateFields();
      
      // Get all items with quantity > 0
      const selectedItems = items.filter(item => item.quantity > 0);
      
      if (selectedItems.length === 0) {
        return message.error('Please add at least one ingredient to the menu');
      }
      
      // Check stock availability
      const insufficientStock = selectedItems.filter(item => 
        item.quantity > (item.stock_quantity || 0)
      );
      
      if (insufficientStock.length > 0) {
        const itemNames = insufficientStock.map(item => item.name).join(', ');
        return message.error(`Insufficient stock for: ${itemNames}`);
      }

      // Prepare data for API
      const formattedMenuData = {
        ...menuValues,
        date: menuValues.date.format('YYYY-MM-DD'),
        items: selectedItems.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          unit: item.UOM?.abbreviation || 'unit',
          preparation_notes: item.preparation_notes || ''
        }))
      };
      
      setLoading(true);
      await messAPI.createMenu(formattedMenuData);
      message.success('Menu created successfully with ingredients!');
      
      // Reset forms and state
      form.resetFields();
      resetQuantities();
      setCostCalculation({ totalCost: 0, costPerServing: 0 });
      
    } catch (error) {
      message.error('Failed to create menu: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetQuantities = () => {
    const resetItems = items.map(item => ({
      ...item,
      quantity: 0,
      preparation_notes: ''
    }));
    setItems(resetItems);
  };

  const handleQuantityChange = (itemId, value) => {
    // Update the quantity in the items array
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, quantity: value || 0 } : item
    );
    setItems(updatedItems);
    
    // Update menuItems for cost calculation
    updateMenuItems(updatedItems);
  };

  const handleNotesChange = (itemId, value) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, preparation_notes: value } : item
    );
    setItems(updatedItems);
    
    // No need to update menuItems as notes don't affect cost
  };

  const updateMenuItems = (updatedItems) => {
    const selectedItems = updatedItems.filter(item => item.quantity > 0)
      .map(item => ({
        item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.UOM?.abbreviation || 'unit',
        unit_price: item.unit_price || 0,
        category: item.tbl_ItemCategory?.name || 'N/A',
        preparation_notes: item.preparation_notes || '',
        total_cost: (item.unit_price || 0) * item.quantity
      }));
    
    setMenuItems(selectedItems);
  };

  const calculateCosts = () => {
    const totalCost = menuItems.reduce((sum, item) => sum + item.total_cost, 0);
    const estimatedServings = form.getFieldValue('estimated_servings') || 1;
    const costPerServing = totalCost / estimatedServings;
    
    setCostCalculation({
      totalCost,
      costPerServing
    });
  };

  const handleServingsChange = () => {
    calculateCosts();
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'all') return items;
    return items.filter(item => item.category_id === selectedCategory);
  };

  // Table columns for the item selection
  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">{record.tbl_ItemCategory?.name}</Text>
        </Space>
      )
    },
    {
      title: 'Unit',
      key: 'unit',
      width: 100,
      render: (_, record) => record.UOM?.abbreviation || 'unit'
    },
    {
      title: 'Price/Unit',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (price) => `₹${parseFloat(price || 0).toFixed(2)}`
    },
    {
      title: 'Stock Level',
      key: 'stock_level',
      width: 150,
      render: (_, record) => {
        const stock = record.stock_quantity || 0;
        const minStock = record.minimum_stock || 0;
        return (
          <Space>
            <Text>{`${stock} ${record.UOM?.abbreviation || 'unit'}`}</Text>
            {stock <= minStock && stock > 0 && (
              <Tag color="warning">Low Stock</Tag>
            )}
            {stock === 0 && (
              <Tag color="error">Out of Stock</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.stock_quantity || Infinity}
          step={0.1}
          precision={2}
          value={record.quantity}
          onChange={(value) => handleQuantityChange(record.id, value)}
          style={{ width: '100%' }}
          placeholder="Enter quantity"
        />
      ),
    },
    {
      title: 'Notes',
      key: 'notes',
      width: 250,
      render: (_, record) => (
        <Input.TextArea
          rows={1}
          value={record.preparation_notes}
          onChange={(e) => handleNotesChange(record.id, e.target.value)}
          placeholder="Preparation notes (optional)"
        />
      )
    },
    {
      title: 'Cost',
      key: 'cost',
      width: 120,
      render: (_, record) => {
        const cost = (record.unit_price || 0) * (record.quantity || 0);
        return `₹${cost.toFixed(2)}`;
      }
    },
  ];

  // Selected ingredients columns
  const selectedColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          <Tag color="blue">{record.category}</Tag>
        </Space>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (text, record) => `${text} ${record.unit}`
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `₹${parseFloat(price).toFixed(2)}`
    },
    {
      title: 'Total Cost',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (cost) => `₹${parseFloat(cost).toFixed(2)}`
    },
    {
      title: 'Notes',
      dataIndex: 'preparation_notes',
      key: 'preparation_notes',
      ellipsis: true
    }
  ];

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snacks', label: 'Snacks' }
  ];

  return (
    <Card title={<Title level={3}>Create New Menu</Title>}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          {/* Menu Details Form */}
          <Card title="Menu Details" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                estimated_servings: 50
              }}
            >
              <Form.Item
                name="name"
                label="Menu Name"
                rules={[{ required: true, message: 'Please enter menu name' }]}
              >
                <Input placeholder="Enter menu name" />
              </Form.Item>

              <Form.Item
                name="meal_type"
                label="Meal Type"
                rules={[{ required: true, message: 'Please select meal type' }]}
              >
                <Select placeholder="Select meal type">
                  {mealTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="date"
                label="Menu Date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="estimated_servings"
                label="Estimated Servings"
                rules={[
                  { required: true, message: 'Please enter estimated servings' },
                  { type: 'number', min: 1, message: 'Must be at least 1' }
                ]}
                tooltip={{
                  title: 'Number of people expected to be served with this menu',
                  icon: <InfoCircleOutlined />
                }}
              >
                <InputNumber 
                  min={1} 
                  style={{ width: '100%' }} 
                  onChange={handleServingsChange}
                />
              </Form.Item>

              <Form.Item
                name="preparation_time"
                label="Preparation Time (minutes)"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea rows={4} placeholder="Enter menu description (optional)" />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {/* Cost Calculation Card */}
          <Card
            title={<Space><CalculatorOutlined /> Cost Calculation</Space>}
            bordered={false}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Ingredients Cost"
                  value={costCalculation.totalCost}
                  precision={2}
                  prefix="₹"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Cost Per Serving"
                  value={costCalculation.costPerServing}
                  precision={2}
                  prefix="₹"
                />
              </Col>
            </Row>
          </Card>

          {/* Selected Ingredients Summary */}
          <Card 
            title={<Space><PlusOutlined /> Selected Ingredients</Space>}
            style={{ marginTop: 16 }}
            bordered={false}
          >
            {menuItems.length > 0 ? (
              <Table
                size="small"
                dataSource={menuItems}
                columns={selectedColumns}
                rowKey="item_id"
                pagination={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}><strong>Total Cost</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={1}><strong>₹{costCalculation.totalCost.toFixed(2)}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}></Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="No ingredients selected yet" />
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Ingredients Selection Table */}
      <Card 
        title="Select Ingredients"
        bordered={false}
        extra={
          <Select
            placeholder="Filter by category"
            style={{ width: 180 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
          >
            <Option value="all">All Categories</Option>
            {categories.map(category => (
              <Option key={category.id} value={category.id}>
                {category.name}
              </Option>
            ))}
          </Select>
        }
      >
        <Table
          dataSource={getFilteredItems()}
          columns={columns}
          rowKey="id"
          loading={dataLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      <Divider />

      {/* Submit Button */}
      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          <Button 
            onClick={() => {
              form.resetFields();
              resetQuantities();
              setCostCalculation({ totalCost: 0, costPerServing: 0 });
            }} 
            icon={<CloseOutlined />}
          >
            Reset All
          </Button>
          <Button 
            type="primary" 
            onClick={handleSubmit}
            loading={loading}
            disabled={!menuItems.length}
            icon={<SaveOutlined />}
          >
            Create Menu
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default CreateMenu;