import React, { useState, useEffect } from 'react';
import { Card, Form, Button, DatePicker, Select, Table, InputNumber, Input, message, Spin, Alert, List, Typography, Divider, Row, Col, Image, Space, Modal } from 'antd';
import { PlusOutlined, MinusOutlined, ShoppingCartOutlined, ClockCircleOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { studentAPI } from '../../services/api.js'; // Corrected import
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const FoodOrderForm = () => {
  const [form] = Form.useForm();
  const [foodItems, setFoodItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetchFoodItems(selectedCategory); // Pass selectedCategory to fetch
    fetchCategories();
  }, [selectedCategory]); // Refetch when category changes

  const fetchFoodItems = async (category) => { // Accept category as argument
    try {
      setLoading(true);
      const params = category && category !== 'all' ? { is_available: true, category: category } : { is_available: true };
      const response = await studentAPI.getSpecialFoodItems(params); // USE studentAPI
      if (response.data.success) {
        setFoodItems(response.data.data);
      } else {
        message.error('Failed to fetch food items: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      message.error('Failed to fetch food items: ' + error.message);
      console.error('Failed to fetch food items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await studentAPI.getSpecialFoodItemCategories(); // USE studentAPI
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        message.error('Failed to fetch categories: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      message.error('Failed to fetch categories: ' + error.message);
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    // fetchFoodItems will be called by useEffect due to selectedCategory change
  };

  const addToCart = (item) => {
    setCartItems(prev => {
      const existingItem = prev.find(i => i.id === item.id);
      if (existingItem) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantity: 1, special_instructions: '' }];
      }
    });
    message.success(`${item.name} added to cart`);
  };

  const updateCartItemQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };

  const updateCartItemInstructions = (id, instructions) => {
    setCartItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, special_instructions: instructions } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (values) => { // This is the main submit function
    if (cartItems.length === 0) {
      message.warning('Please add at least one item to your cart');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        items: cartItems.map(item => ({
          food_item_id: item.id,
          quantity: item.quantity,
          special_instructions: item.special_instructions
        })),
        requested_time: values.requested_time.toISOString(),
        notes: values.notes
      };

      const response = await studentAPI.createFoodOrder(orderData); // USE studentAPI
      
      if (response.data.success) {
        message.success('Food order placed successfully');
        setCartItems([]);
        form.resetFields();
        setShowCart(false);
      } else {
        setError('Failed to place order: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      setError('Failed to place order. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Removed the duplicate `handleOrderSubmit` function from your provided code

  const renderFoodItemCard = (item) => {
    return (
      <Card
        hoverable
        style={{ marginBottom: 16 }}
        cover={
          item.image_url ? 
          <Image
            alt={item.name}
            src={item.image_url}
            fallback="data:image/png;base64,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"
            style={{ height: 200, objectFit: 'cover' }}
          /> : 
          <div style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f0f0' }}>
            No Image
          </div>
        }
        actions={[
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => addToCart(item)}
          >
            Add to Order
          </Button>
        ]}
      >
        <Card.Meta
          title={<span>{item.name} - ₹{parseFloat(item.price).toFixed(2)}</span>}
          description={
            <>
              <p>{item.description || 'No description available'}</p>
              {item.preparation_time_minutes && (
                <p><ClockCircleOutlined /> Prep Time: {item.preparation_time_minutes} minutes</p>
              )}
            </>
          }
        />
      </Card>
    );
  };

  const renderCartModal = () => {
    return (
      <Modal
        title={<div><ShoppingCartOutlined /> Your Order</div>}
        open={showCart} // Changed from `visible` to `open`
        onCancel={() => setShowCart(false)}
        footer={null}
        width={700}
      >
        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Text>Your cart is empty</Text>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ requested_time: moment().add(1, 'hour') }}
          >
            <List
              itemLayout="horizontal"
              dataSource={cartItems}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={() => removeFromCart(item.id)}
                    />
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={
                      <div>
                        <p>₹{parseFloat(item.price).toFixed(2)} x {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}</p>
                        <Input.TextArea 
                          placeholder="Special instructions"
                          value={item.special_instructions}
                          onChange={(e) => updateCartItemInstructions(item.id, e.target.value)}
                          rows={2}
                          style={{ marginTop: 8 }}
                        />
                      </div>
                    }
                  />
                  <div>
                    <Space>
                      <Button 
                        icon={<MinusOutlined />} 
                        onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                      />
                      <InputNumber 
                        min={1} 
                        value={item.quantity} 
                        onChange={(value) => updateCartItemQuantity(item.id, value)}
                        style={{ width: 60 }}
                      />
                      <Button 
                        icon={<PlusOutlined />} 
                        onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      />
                    </Space>
                  </div>
                </List.Item>
              )}
              footer={
                <div style={{ textAlign: 'right' }}>
                  <Title level={4}>Total: ₹{calculateTotal().toFixed(2)}</Title>
                </div>
              }
            />
            
            <Divider />
            
            <Form.Item
              name="requested_time"
              label="When would you like your order ready?"
              rules={[{ required: true, message: 'Please select a time' }]}
            >
              <DatePicker 
                showTime 
                format="YYYY-MM-DD HH:mm" 
                // Ensure the date is not in the past and time is at least 30 minutes from now
                disabledDate={(current) => current && current < moment().startOf('day')}
                disabledTime={(current) => {
                  const now = moment();
                  const selectedDate = current || now;
                  const disabledHours = [];
                  const disabledMinutes = [];
                  
                  if (selectedDate.isSame(now, 'day')) {
                    const currentHour = now.hour();
                    const currentMinute = now.minute();
                    
                    // Disable hours before the current hour
                    for (let i = 0; i < currentHour; i++) {
                      disabledHours.push(i);
                    }
                    
                    // If it's the current hour, disable minutes up to (currentMinute + 30)
                    if (selectedDate.hour() === currentHour) {
                      for (let i = 0; i < currentMinute + 30; i++) {
                        disabledMinutes.push(i);
                      }
                    }
                  }
                  
                  return {
                    disabledHours: () => disabledHours,
                    disabledMinutes: () => disabledMinutes,
                  };
                }}
                style={{ width: '100%' }}
              />
            </Form.Item>
            
            <Form.Item
              name="notes"
              label="Additional Notes"
            >
              <TextArea rows={3} placeholder="Any additional notes for your order" />
            </Form.Item>
            
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => clearCart()}>Clear Cart</Button>
                <Button onClick={() => setShowCart(false)}>Continue Shopping</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  icon={<SaveOutlined />}
                >
                  Place Order
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    );
  };

  return (
    <Card 
      title="Special Food Order" 
      variant="borderless" // Changed from `bordered={false}` to `variant="borderless"` for Ant Design v5
    >
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setError(null)}
        />
      )}
      
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Select
          style={{ width: 200 }}
          placeholder="Filter by category"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <Option value="all">All Categories</Option>
          {categories.map(category => (
            <Option key={category} value={category}>{category}</Option>
          ))}
        </Select>
        
        <Button 
          type="primary" 
          icon={<ShoppingCartOutlined />} 
          onClick={() => setShowCart(true)}
          badge={{ count: cartItems.length }}
        >
          View Cart ({cartItems.length})
        </Button>
      </div>
      
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {foodItems.map(item => (
            <Col xs={24} sm={12} md={8} lg={8} xl={6} key={item.id}>
              {renderFoodItemCard(item)}
            </Col>
          ))}
        </Row>
        
        {foodItems.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text>No food items available in this category</Text>
          </div>
        )}
      </Spin>
      
      {renderCartModal()}
    </Card>
  );
};

export default FoodOrderForm;
