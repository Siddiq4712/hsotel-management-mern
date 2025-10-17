import React, { useState, useEffect } from 'react';
import {
  Card, Button, Row, Col, List, message, Badge, Spin, Empty, Input, Typography, Tag, Divider
} from 'antd';
import {
  ShoppingCartOutlined, PlusOutlined, MinusOutlined, 
  CoffeeOutlined, DollarOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { studentAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

const StudentFoodMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  // Fetch available food items
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        // Get food items
        const response = await studentAPI.getSpecialFoodItems({ is_available: true });
        setMenuItems(response.data.data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(response.data.data.map(item => item.category))];
        setCategories(uniqueCategories);
      } catch (error) {
        message.error('Failed to load menu items.');
        console.error("Fetch Menu Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // Helper function to safely format price
  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    return !isNaN(numPrice) ? numPrice.toFixed(2) : price;
  };

  // Filter items by category
  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  // Handle adding item to cart
  const handleAddToCart = (item) => {
    const newCart = { ...cart };
    if (newCart[item.id]) {
      newCart[item.id].quantity += 1;
    } else {
      newCart[item.id] = { item: item, quantity: 1 };
    }
    setCart(newCart);
    message.success(`${item.name} added to cart!`);
  };

  // Handle removing item from cart
  const handleRemoveFromCart = (itemId) => {
    const newCart = { ...cart };
    if (newCart[itemId] && newCart[itemId].quantity > 1) {
      newCart[itemId].quantity -= 1;
    } else {
      delete newCart[itemId];
    }
    setCart(newCart);
  };
  
  // Place the order
  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) {
      message.warning('Your cart is empty.');
      return;
    }

    setIsPlacingOrder(true);
    const orderData = {
      items: Object.values(cart).map(cartItem => ({
        food_item_id: cartItem.item.id,
        quantity: cartItem.quantity,
      })),
      notes: orderNotes,
      requested_time: new Date()
    };

    try {
      await studentAPI.createFoodOrder(orderData);
      message.success('Order placed successfully! The mess has been notified.');
      setCart({});
      setOrderNotes("");
    } catch (error) {
      message.error('There was an error placing your order. Please try again.');
      console.error("Place Order Error:", error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const cartItemsArray = Object.values(cart);
  const cartTotal = cartItemsArray.reduce((sum, cartItem) => {
    const itemPrice = parseFloat(cartItem.item.price) || 0;
    return sum + (itemPrice * cartItem.quantity);
  }, 0);
  const itemCount = cartItemsArray.reduce((sum, cartItem) => sum + cartItem.quantity, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spin size="large" tip="Loading menu..." />
      </div>
    );
  }

  // Generate color for category tags
  const getCategoryColor = (category) => {
    const colors = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
    const index = categories.indexOf(category) % colors.length;
    return colors[index];
  };

  return (
    <div className="food-menu-container" style={{ padding: '20px 0' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Title level={2}>Special Food Menu</Title>
          <Paragraph type="secondary">
            Order special items that aren't part of the regular mess menu. 
            These will be added to your monthly mess bill.
          </Paragraph>
        </Col>

        {/* Category Selector */}
        <Col span={24}>
          <div style={{ marginBottom: 20 }}>
            <Button 
              type={activeCategory === 'all' ? 'primary' : 'default'}
              onClick={() => setActiveCategory('all')}
              style={{ marginRight: 8, marginBottom: 8 }}
            >
              All Items
            </Button>
            {categories.map(category => (
              <Tag
                key={category}
                color={activeCategory === category ? getCategoryColor(category) : 'default'}
                style={{ 
                  padding: '5px 10px', 
                  cursor: 'pointer', 
                  marginBottom: 8,
                  fontSize: '14px'
                }}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Tag>
            ))}
          </div>
        </Col>

        {/* Menu Items Section */}
        <Col xs={24} md={16}>
          {filteredItems.length > 0 ? (
            <Row gutter={[16, 16]}>
              {filteredItems.map(item => (
                <Col xs={24} sm={12} key={item.id}>
                  <Card 
                    hoverable
                    className="food-item-card"
                    style={{ height: '100%' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ flexGrow: 1 }}>
                        <Title level={4}>{item.name}</Title>
                        <Tag color={getCategoryColor(item.category)}>{item.category}</Tag>
                        
                        <div style={{ margin: '12px 0' }}>
                          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                            <DollarOutlined /> ₹{formatPrice(item.price)}
                          </Text>
                        </div>
                        
                        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 16 }}>
                          {item.description || 'No description available.'}
                        </Paragraph>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: 16 }}>
                        <CoffeeOutlined style={{ fontSize: 24, color: '#faad14', marginBottom: 8 }} />
                      </div>
                    </div>
                    
                    <Button 
                      type="primary" 
                      block 
                      icon={<PlusOutlined />} 
                      onClick={() => handleAddToCart(item)}
                    >
                      Add to Cart
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty 
              description={
                <span>
                  {activeCategory === 'all' 
                    ? 'No special food items are available right now.' 
                    : `No items available in category "${activeCategory}".`}
                </span>
              } 
            />
          )}
        </Col>

        {/* Cart Section */}
        <Col xs={24} md={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingCartOutlined style={{ fontSize: 24, marginRight: 8 }} />
                <span>Your Order</span>
                <Badge 
                  count={itemCount} 
                  style={{ marginLeft: 8, backgroundColor: itemCount ? '#1890ff' : '#d9d9d9' }} 
                />
              </div>
            }
            style={{ position: 'sticky', top: '20px' }}
            className="cart-card"
          >
            {cartItemsArray.length > 0 ? (
              <>
                <List
                  dataSource={cartItemsArray}
                  renderItem={({ item, quantity }) => (
                    <List.Item
                      actions={[
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Button 
                            size="small" 
                            icon={<MinusOutlined />} 
                            onClick={() => handleRemoveFromCart(item.id)}
                          />
                          <Text strong style={{ margin: '0 8px' }}>{quantity}</Text>
                          <Button 
                            size="small" 
                            icon={<PlusOutlined />} 
                            onClick={() => handleAddToCart(item)}
                          />
                        </div>
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text strong>{item.name}</Text>}
                        description={
                          <div>
                            <Text type="secondary">{item.category}</Text>
                            <br />
                            <Text>₹{formatPrice(item.price)} × {quantity}</Text>
                          </div>
                        }
                      />
                      <div>
                        <Text strong>₹{formatPrice(parseFloat(item.price) * quantity)}</Text>
                      </div>
                    </List.Item>
                  )}
                />
                
                <Divider />
                
                <div style={{ padding: '0 8px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text>Subtotal:</Text>
                    <Text strong>₹{cartTotal.toFixed(2)}</Text>
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                      <InfoCircleOutlined /> Special instructions:
                    </Text>
                    <Input.TextArea 
                      rows={2} 
                      placeholder="Add any dietary preferences or notes..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    type="primary" 
                    block 
                    size="large" 
                    onClick={handlePlaceOrder} 
                    loading={isPlacingOrder}
                  >
                    Place Order (₹{cartTotal.toFixed(2)})
                  </Button>
                  
                  <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12, textAlign: 'center' }}>
                    This order will be added to your monthly mess bill
                  </Text>
                </div>
              </>
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="Your cart is empty. Add items from the menu."
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentFoodMenu;
