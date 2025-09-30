import React, { useState, useEffect } from 'react';
import {
  Card, Button, Row, Col, List, message, Badge, Avatar, Spin, Empty, Modal, Input, Typography
} from 'antd';
import { ShoppingCartOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { studentAPI } from '../../services/api'; // Make sure this path is correct

const { Title, Text } = Typography;
const { Meta } = Card;

const StudentFoodMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({}); // Using an object for efficient updates: { itemId: { item, quantity } }
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  // 1. Fetch available food items when the component loads
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        // We only get items that the mess staff has marked as available
        const response = await studentAPI.getSpecialFoodItems({ is_available: true });
        setMenuItems(response.data.data);
      } catch (error) {
        message.error('Failed to load menu items.');
        console.error("Fetch Menu Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // 2. Logic to add an item to the cart
  const handleAddToCart = (item) => {
    const newCart = { ...cart };
    if (newCart[item.id]) {
      newCart[item.id].quantity += 1; // Increment quantity if item is already in cart
    } else {
      newCart[item.id] = { item: item, quantity: 1 }; // Add new item to cart
    }
    setCart(newCart);
    message.success(`${item.name} added to cart!`);
  };

  // 3. Logic to remove an item from the cart
  const handleRemoveFromCart = (itemId) => {
    const newCart = { ...cart };
    if (newCart[itemId] && newCart[itemId].quantity > 1) {
      newCart[itemId].quantity -= 1; // Decrement quantity
    } else {
      delete newCart[itemId]; // Remove item completely if quantity is 1
    }
    setCart(newCart);
  };
  
  // 4. Logic to place the final order
  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) {
      message.warning('Your cart is empty.');
      return;
    }

    setIsPlacingOrder(true);
    // Format the cart data into the array structure the API expects
    const orderData = {
      items: Object.values(cart).map(cartItem => ({
        food_item_id: cartItem.item.id,
        quantity: cartItem.quantity,
      })),
      notes: orderNotes,
      requested_time: new Date() // The backend expects a time
    };

    try {
      await studentAPI.createFoodOrder(orderData);
      message.success('Order placed successfully! The mess has been notified.');
      setCart({}); // Clear the cart
      setOrderNotes("");
    } catch (error) {
      message.error('There was an error placing your order. Please try again.');
      console.error("Place Order Error:", error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const cartItemsArray = Object.values(cart);
  const cartTotal = cartItemsArray.reduce((sum, cartItem) => sum + cartItem.item.price * cartItem.quantity, 0);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <Row gutter={24}>
      {/* Column for Menu Items */}
      <Col xs={24} md={16}>
        <Title level={3}>Special Food Menu</Title>
        {menuItems.length > 0 ? (
          <Row gutter={[16, 16]}>
            {menuItems.map(item => (
              <Col xs={24} sm={12} lg={8} key={item.id}>
                <Card
                  hoverable
                  cover={<img alt={item.name} src={item.image_url || 'https://via.placeholder.com/300x200?text=No+Image'} style={{ height: 200, objectFit: 'cover' }} />}
                  actions={[
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddToCart(item)}>
                      Add to Cart
                    </Button>
                  ]}
                >
                  <Meta title={item.name} description={<Text strong>₹{item.price}</Text>} />
                  <Text type="secondary">{item.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No special food items are available right now." />
        )}
      </Col>

      {/* Column for Cart Summary */}
      <Col xs={24} md={8}>
        <Card style={{ position: 'sticky', top: '20px' }}>
          <Title level={4}>
            <ShoppingCartOutlined /> My Order ({cartItemsArray.length})
          </Title>
          {cartItemsArray.length > 0 ? (
            <>
              <List
                itemLayout="horizontal"
                dataSource={cartItemsArray}
                renderItem={({ item, quantity }) => (
                  <List.Item
                    actions={[
                      <Button size="small" icon={<MinusOutlined />} onClick={() => handleRemoveFromCart(item.id)} />,
                      <Text strong>{quantity}</Text>,
                      <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddToCart(item)} />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={item.image_url} />}
                      title={item.name}
                      description={`₹${item.price} x ${quantity} = ₹${(item.price * quantity).toFixed(2)}`}
                    />
                  </List.Item>
                )}
              />
              <hr />
              <Title level={4} style={{ textAlign: 'right' }}>Total: ₹{cartTotal.toFixed(2)}</Title>
              <Input.TextArea 
                rows={2} 
                placeholder="Add any special instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                style={{ marginBottom: 16 }}
              />
              <Button type="primary" block size="large" onClick={handlePlaceOrder} loading={isPlacingOrder}>
                Place Order
              </Button>
            </>
          ) : (
            <Text type="secondary">Your cart is empty. Add items from the menu.</Text>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default StudentFoodMenu;
