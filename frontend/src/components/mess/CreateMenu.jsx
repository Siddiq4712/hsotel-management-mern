import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Input, Button, Select, DatePicker, 
  InputNumber, message, Space, Typography, Divider, 
  Table, Tag, Row, Col, Statistic, Tabs, Empty, Tooltip
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
    // This will recalculate costs whenever menuItems change or estimated_servings changes
    console.log("[CreateMenu] Detected change in menu items or servings - recalculating costs");
    calculateCosts();
  }, [menuItems]);

  const fetchItems = async () => {
    console.log("[CreateMenu] Fetching all items");
    setDataLoading(true);
    try {
      const response = await messAPI.getItems();
      
      // Transform items to include quantity field for the form
      const itemsWithQuantity = (response.data.data || []).map(item => ({
        ...item,
        quantity: 0,
        preparation_notes: '',
        fifo_price: null,
        multi_batch_price: null,
        multi_batch_breakdown: null,
        is_multi_batch: false,
        key: item.id  // Add key for table
      }));
      
      setItems(itemsWithQuantity);
      console.log("[CreateMenu] Items fetched:", itemsWithQuantity.length);
    } catch (error) {
      message.error('Failed to fetch items');
      console.error("[CreateMenu] Error fetching items:", error);
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

  // Function to calculate multi-batch price
  const calculateMultiBatchPrice = async (itemId, requestedQuantity) => {
    try {
      console.log(`[CreateMenu] Calculating multi-batch price for item ${itemId}, quantity ${requestedQuantity}`);
      
      // Get all active batches for this item
      const response = await messAPI.getItemBatches(itemId);
      const batches = response.data.data || [];
      
      // Filter active batches with remaining quantity and sort by purchase date (FIFO)
      const activeBatches = batches
        .filter(batch => batch.status === 'active' && batch.quantity_remaining > 0)
        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));
      
      console.log(`[CreateMenu] Found ${activeBatches.length} active batches for multi-batch calculation:`);
      activeBatches.forEach((batch, i) => {
        console.log(`[CreateMenu] Batch ${i+1}: ID=${batch.id}, Date=${batch.purchase_date}, Price=${batch.unit_price}, Remaining=${batch.quantity_remaining}`);
      });
      
      if (activeBatches.length === 0) {
        console.log(`[CreateMenu] No active batches found, returning 0`);
        return {
          totalCost: 0,
          batchBreakdown: [],
          averageUnitPrice: 0
        };
      }
      
      // Calculate how much to take from each batch
      let remainingToConsume = requestedQuantity;
      let totalCost = 0;
      const batchBreakdown = [];
      
      for (const batch of activeBatches) {
        if (remainingToConsume <= 0) break;
        
        const batchRemaining = parseFloat(batch.quantity_remaining);
        const batchPrice = parseFloat(batch.unit_price);
        
        // How much to take from this batch
        const consumeFromBatch = Math.min(remainingToConsume, batchRemaining);
        const batchCost = consumeFromBatch * batchPrice;
        
        console.log(`[CreateMenu] Using ${consumeFromBatch} from batch ${batch.id} at price ${batchPrice}, cost: ${batchCost}`);
        
        totalCost += batchCost;
        remainingToConsume -= consumeFromBatch;
        
        batchBreakdown.push({
          batch_id: batch.id,
          quantity: consumeFromBatch,
          unit_price: batchPrice,
          cost: batchCost,
          purchase_date: batch.purchase_date
        });
      }
      
      // If we still have remaining quantity that couldn't be fulfilled
      if (remainingToConsume > 0) {
        console.warn(`[CreateMenu] Not enough stock to fulfill requested quantity. Short by ${remainingToConsume}`);
      }
      
      // Calculate weighted average unit price
      const consumedQuantity = requestedQuantity - remainingToConsume;
      const averageUnitPrice = consumedQuantity > 0 ? totalCost / consumedQuantity : 0;
      
      console.log(`[CreateMenu] Multi-batch calculation complete. Total cost: ${totalCost}, Average unit price: ${averageUnitPrice}`);
      
      return {
        totalCost,
        batchBreakdown,
        averageUnitPrice,
        consumedQuantity
      };
    } catch (error) {
      console.error(`[CreateMenu] Error calculating multi-batch price:`, error);
      return {
        totalCost: 0,
        batchBreakdown: [],
        averageUnitPrice: 0,
        error: error.message
      };
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
      
      console.log("[CreateMenu] Submitting menu data:", formattedMenuData);
      
      setLoading(true);
      await messAPI.createMenu(formattedMenuData);
      message.success('Menu created successfully with ingredients!');
      
      // Reset forms and state
      form.resetFields();
      resetQuantities();
      setCostCalculation({ totalCost: 0, costPerServing: 0 });
      
    } catch (error) {
      message.error('Failed to create menu: ' + (error.response?.data?.message || error.message));
      console.error("[CreateMenu] Error creating menu:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetQuantities = () => {
    const resetItems = items.map(item => ({
      ...item,
      quantity: 0,
      preparation_notes: '',
      fifo_price: null,
      multi_batch_price: null,
      multi_batch_breakdown: null,
      is_multi_batch: false
    }));
    setItems(resetItems);
    setMenuItems([]); // Clear menu items when resetting
    console.log("[CreateMenu] Reset all quantities and FIFO prices");
  };

  // Update the handleQuantityChange function to use multi-batch pricing
  const handleQuantityChange = async (itemId, value) => {
    console.log(`[CreateMenu] Quantity changed for item ${itemId} to ${value}`);
    
    // Only calculate if quantity > 0
    let updatedItems;
    
    if (value > 0) {
      setDataLoading(true);
      try {
        const itemIndex = items.findIndex(item => item.id === itemId);
        const currentItem = items[itemIndex];
        
        // Calculate the multi-batch price
        const batchCalculation = await calculateMultiBatchPrice(itemId, value);
        
        // Update the item with batch breakdown
        updatedItems = [...items];
        updatedItems[itemIndex] = { 
          ...currentItem,
          quantity: value,
          multi_batch_price: batchCalculation.totalCost,
          multi_batch_breakdown: batchCalculation.batchBreakdown,
          average_unit_price: batchCalculation.averageUnitPrice,
          // Keep track of single batch price for comparison
          fifo_price: batchCalculation.batchBreakdown.length > 0 
            ? batchCalculation.batchBreakdown[0].unit_price 
            : null,
          fifo_batch_id: batchCalculation.batchBreakdown.length > 0
            ? batchCalculation.batchBreakdown[0].batch_id
            : null,
          is_multi_batch: batchCalculation.batchBreakdown.length > 1
        };
        
        console.log(`[CreateMenu] Updated item with multi-batch calculation:`, 
          updatedItems[itemIndex].multi_batch_breakdown);
          
      } catch (error) {
        console.error(`[CreateMenu] Error in quantity change:`, error);
        message.error('Failed to calculate batch prices');
        
        // Simple fallback - just update quantity
        updatedItems = items.map(item => 
          item.id === itemId ? { ...item, quantity: value } : item
        );
      } finally {
        setDataLoading(false);
      }
    } else {
      // Reset everything if quantity is 0
      updatedItems = items.map(item => 
        item.id === itemId ? { 
          ...item, 
          quantity: 0, 
          fifo_price: null,
          fifo_batch_id: null,
          multi_batch_price: null,
          multi_batch_breakdown: null,
          average_unit_price: null,
          is_multi_batch: false
        } : item
      );
    }
    
    setItems(updatedItems);
    
    // Update menuItems for cost calculation
    updateMenuItems(updatedItems);
  };

  const handleNotesChange = (itemId, value) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, preparation_notes: value } : item
    );
    setItems(updatedItems);
  };

  // Updated updateMenuItems to correctly handle multi-batch pricing
  const updateMenuItems = (updatedItems) => {
    console.log("[CreateMenu] Updating menu items for cost calculation");
    
    const selectedItems = updatedItems.filter(item => item.quantity > 0)
      .map(item => {
        // For items with multi-batch pricing, use that directly
        let totalCost, unitPrice;
        
        // If multi-batch calculation is available, use it
        if (item.multi_batch_price !== null && item.multi_batch_price !== undefined) {
          totalCost = parseFloat(item.multi_batch_price);
          unitPrice = parseFloat(item.average_unit_price || 0);
          
          console.log(`[CreateMenu] Using multi-batch price for item ${item.id}: ${totalCost}`);
        } else {
          // Fall back to single batch or base price
          unitPrice = item.fifo_price !== null ? parseFloat(item.fifo_price) : parseFloat(item.unit_price || 0);
          totalCost = unitPrice * parseFloat(item.quantity || 0);
          
          console.log(`[CreateMenu] Using single price for item ${item.id}: ${unitPrice} × ${item.quantity} = ${totalCost}`);
        }
        
        // Format batch breakdown for tooltip if available
        let batchDetails = null;
        if (item.multi_batch_breakdown && item.multi_batch_breakdown.length > 0) {
          batchDetails = item.multi_batch_breakdown.map(b => 
            `${b.quantity} × ₹${parseFloat(b.unit_price).toFixed(2)} = ₹${parseFloat(b.cost).toFixed(2)}`
          ).join(', ');
          
          console.log(`[CreateMenu] Batch details for item ${item.id}: ${batchDetails}`);
        }
        
        return {
          item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.UOM?.abbreviation || 'unit',
          unit_price: unitPrice,
          is_fifo_price: item.fifo_price !== null,
          is_multi_batch: item.is_multi_batch,
          batch_details: batchDetails,
          category: item.tbl_ItemCategory?.name || 'N/A',
          preparation_notes: item.preparation_notes || '',
          total_cost: totalCost  // This should be the multi-batch total if available
        };
      });
    
    setMenuItems(selectedItems);
    
    // Log the total cost
    const totalMenuCost = selectedItems.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
    console.log(`[CreateMenu] Total menu cost (all items): ${totalMenuCost}`);
  };

  // Updated calculateCosts function to ensure correct total cost calculation
  const calculateCosts = () => {
    // Sum all costs including multi-batch calculations
    const totalCost = menuItems.reduce((sum, item) => {
      // Ensure we use the total_cost from the menu item, which should already incorporate multi-batch pricing
      return sum + (parseFloat(item.total_cost) || 0);
    }, 0);

    console.log("[CreateMenu] Calculating total cost:", totalCost);
    
    // Get the current estimated servings
    const estimatedServings = form.getFieldValue('estimated_servings') || 1;
    
    // Calculate per-serving cost
    const costPerServing = totalCost / estimatedServings;
    
    console.log(`[CreateMenu] Cost calculation: Total=${totalCost}, Servings=${estimatedServings}, Per Serving=${costPerServing}`);
    
    // Update the state with the calculated values
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
      key: 'unit_price',
      width: 120,
      render: (_, record) => {
        // Show FIFO price if available
        if (record.loadingFIFOPrice) {
          return <span style={{ fontStyle: 'italic' }}>Loading...</span>;
        }
        
        if (record.fifo_price !== null) {
          return (
            <Tooltip title="Price from oldest batch (FIFO)">
              <Text type="success">₹{parseFloat(record.fifo_price).toFixed(2)}</Text>
            </Tooltip>
          );
        }
        
        return `₹${parseFloat(record.unit_price || 0).toFixed(2)}`;
      }
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
        if (record.multi_batch_price !== null && record.multi_batch_breakdown?.length > 1) {
          return (
            <Tooltip title={`Using multiple batches with different prices`}>
              <Text style={{ textDecoration: 'underline' }}>
                ₹{parseFloat(record.multi_batch_price).toFixed(2)}
              </Text>
            </Tooltip>
          );
        }
        
        // Calculate cost based on FIFO price if available
        const priceToUse = record.fifo_price !== null ? record.fifo_price : record.unit_price || 0;
        const cost = priceToUse * (record.quantity || 0);
        return `₹${cost.toFixed(2)}`;
      }
    },
  ];

  // Selected ingredients columns with multi-batch pricing
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
      render: (price, record) => {
        if (record.is_multi_batch && record.batch_details) {
          return (
            <Tooltip title={`Multi-batch breakdown: ${record.batch_details}`}>
              <Space>
                <Text style={{ textDecoration: 'underline' }}>₹{parseFloat(price).toFixed(2)}</Text>
                <Tag color="orange" style={{ marginLeft: 5 }}>AVG</Tag>
              </Space>
            </Tooltip>
          );
        }
        
        return (
          <span>
            ₹{parseFloat(price).toFixed(2)}
            {record.is_fifo_price && (
              <Tag color="green" style={{ marginLeft: 5 }}>FIFO</Tag>
            )}
          </span>
        );
      }
    },
    {
      title: 'Total Cost',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (cost, record) => {
        if (record.is_multi_batch && record.batch_details) {
          return (
            <Tooltip title={`Multi-batch breakdown: ${record.batch_details}`}>
              <Text style={{ textDecoration: 'underline' }}>₹{parseFloat(cost).toFixed(2)}</Text>
            </Tooltip>
          );
        }
        return `₹${parseFloat(cost).toFixed(2)}`;
      }
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
                  formatter={value => `₹${parseFloat(value || 0).toFixed(2)}`}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Cost Per Serving"
                  value={costCalculation.costPerServing}
                  precision={2}
                  prefix="₹"
                  formatter={value => `₹${parseFloat(value || 0).toFixed(2)}`}
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

          {/* Debug panel - only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <Card title="Debug Info" bordered={false} style={{ marginTop: 16 }}>
              <pre style={{ maxHeight: '200px', overflow: 'auto', fontSize: '12px' }}>
                {JSON.stringify({ 
                  totalCost: costCalculation.totalCost,
                  costPerServing: costCalculation.costPerServing,
                  menuItems: menuItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    isMultiBatch: item.is_multi_batch,
                    totalCost: item.total_cost,
                    batchDetails: item.batch_details
                  }))
                }, null, 2)}
              </pre>
            </Card>
          )}
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
