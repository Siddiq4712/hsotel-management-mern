import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, Select, DatePicker,
  InputNumber, message, Space, Typography, Divider,
  Table, Tag, Row, Col, Statistic, Empty, Tooltip, Modal
} from 'antd';
import {
  SaveOutlined, CloseOutlined, InfoCircleOutlined,
  CalculatorOutlined, PlusOutlined, EditOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snacks', label: 'Snacks' }
];

const CreateMenu = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [menus, setMenus] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);

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
    fetchMenus();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    calculateCosts();
    // eslint-disable-next-line
  }, [menuItems]);

  async function fetchMenus() {
    try {
      const response = await messAPI.getMenus();
      setMenus(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch menus');
    }
  }

  async function fetchItems() {
    setDataLoading(true);
    try {
      const response = await messAPI.getItems();
      setItems((response.data.data || []).map(item => ({
        ...item,
        quantity: 0,
        preparation_notes: '',
        fifo_price: null,
        multi_batch_price: null,
        multi_batch_breakdown: null,
        average_unit_price: null,
        is_multi_batch: false,
        key: item.id
      })));
    } catch (error) {
      message.error('Failed to fetch items');
    } finally {
      setDataLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const response = await messAPI.getItemCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  }

  // --- FIFO Multi-batch Calculation ---
  const calculateMultiBatchPrice = async (itemId, requestedQuantity) => {
    try {
      const response = await messAPI.getItemBatches(itemId);
      const batches = response.data.data || [];
      const activeBatches = batches
        .filter(batch => batch.status === 'active' && batch.quantity_remaining > 0)
        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));

      if (activeBatches.length === 0) {
        return {
          totalCost: 0,
          batchBreakdown: [],
          averageUnitPrice: 0
        };
      }

      let remainingToConsume = requestedQuantity;
      let totalCost = 0;
      const batchBreakdown = [];

      for (const batch of activeBatches) {
        if (remainingToConsume <= 0) break;
        const batchRemaining = parseFloat(batch.quantity_remaining);
        const batchPrice = parseFloat(batch.unit_price);
        const consumeFromBatch = Math.min(remainingToConsume, batchRemaining);
        const batchCost = consumeFromBatch * batchPrice;

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

      // Weighted avg. price for actual consumed
      const consumedQuantity = requestedQuantity - remainingToConsume;
      const averageUnitPrice = consumedQuantity > 0 ? totalCost / consumedQuantity : 0;

      return {
        totalCost,
        batchBreakdown,
        averageUnitPrice,
        consumedQuantity
      };
    } catch (error) {
      return {
        totalCost: 0,
        batchBreakdown: [],
        averageUnitPrice: 0,
        error: error.message
      };
    }
  };

  // --- Menu CRUD/Load code ---

  const handleMenuSelect = async (menuId) => {
    if (!menuId) {
      setSelectedMenuId(null);
      form.resetFields();
      resetQuantities();
      setMenuItems([]);
      return;
    }
    setLoading(true);
    try {
      setSelectedMenuId(menuId);
      const resp = await messAPI.getMenuWithItems(menuId);
      const { menu, menu_items } = resp?.data?.data || {};
      form.setFieldsValue({
        name: menu.name,
        meal_type: menu.meal_type,
        description: menu.description,
        estimated_servings: menu.estimated_servings,
        preparation_time: menu.preparation_time,
        date: menu.date ? moment(menu.date) : null,
      });
      // Merge into our items state, call updateMenuItems to trigger summary
      // (Adjust: Do not call updateMenuItems yet, as it will not trigger FIFO cost; redo via handleQuantityChange below)
      const updatedItems = await Promise.all(items.map(async item => {
        const found = (menu_items || []).find(mi => mi.item_id === item.id);
        if (found && found.quantity) {
          // Run FIFO so that cost summary fills up
          const batchCalculation = await calculateMultiBatchPrice(item.id, found.quantity);
          return {
            ...item,
            quantity: found.quantity,
            preparation_notes: found.preparation_notes || '',
            multi_batch_price: batchCalculation.totalCost,
            multi_batch_breakdown: batchCalculation.batchBreakdown,
            average_unit_price: batchCalculation.averageUnitPrice,
            fifo_price: batchCalculation.batchBreakdown.length > 0
              ? batchCalculation.batchBreakdown[0].unit_price : null,
            is_multi_batch: batchCalculation.batchBreakdown.length > 1
          };
        }
        return {
          ...item,
          quantity: 0,
          preparation_notes: '',
          multi_batch_price: null,
          multi_batch_breakdown: null,
          average_unit_price: null,
          fifo_price: null,
          is_multi_batch: false
        };
      }));
      setItems(updatedItems);
      updateMenuItems(updatedItems);
    } catch (error) {
      message.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  // --- Ingredient input update handlers ---
  const handleQuantityChange = async (itemId, value) => {
    let updatedItems;
    if (value > 0) {
      setDataLoading(true);
      try {
        const itemIndex = items.findIndex(item => item.id === itemId);
        const currentItem = items[itemIndex];
        const batchCalculation = await calculateMultiBatchPrice(itemId, value);

        updatedItems = [...items];
        updatedItems[itemIndex] = {
          ...currentItem,
          quantity: value,
          multi_batch_price: batchCalculation.totalCost,
          multi_batch_breakdown: batchCalculation.batchBreakdown,
          average_unit_price: batchCalculation.averageUnitPrice,
          fifo_price: batchCalculation.batchBreakdown.length > 0
            ? batchCalculation.batchBreakdown[0].unit_price : null,
          is_multi_batch: batchCalculation.batchBreakdown.length > 1
        };
      } catch (error) {
        updatedItems = items.map(item =>
          item.id === itemId ? { ...item, quantity: value } : item
        );
      } finally {
        setDataLoading(false);
      }
    } else {
      updatedItems = items.map(item =>
        item.id === itemId ? {
          ...item,
          quantity: 0,
          fifo_price: null,
          multi_batch_price: null,
          multi_batch_breakdown: null,
          average_unit_price: null,
          is_multi_batch: false
        } : item
      );
    }
    setItems(updatedItems);
    updateMenuItems(updatedItems);
  };

  const handleNotesChange = (itemId, value) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, preparation_notes: value } : item
    );
    setItems(updatedItems);
    updateMenuItems(updatedItems);
  };

  // --- Menu item summary generation ---
  const updateMenuItems = (updatedItems) => {
    const selectedItems = updatedItems.filter(item => item.quantity > 0)
      .map(item => {
        let totalCost, unitPrice;
        if (item.multi_batch_price !== null && item.multi_batch_price !== undefined) {
          totalCost = parseFloat(item.multi_batch_price);
          unitPrice = parseFloat(item.average_unit_price || 0);
        } else {
          unitPrice = item.fifo_price !== null ? parseFloat(item.fifo_price) : parseFloat(item.unit_price || 0);
          totalCost = unitPrice * parseFloat(item.quantity || 0);
        }
        let batchDetails = null;
        if (item.multi_batch_breakdown && item.multi_batch_breakdown.length > 0) {
          batchDetails = item.multi_batch_breakdown.map(b =>
            `${b.quantity} × ₹${parseFloat(b.unit_price).toFixed(2)} = ₹${parseFloat(b.cost).toFixed(2)}`
          ).join(', ');
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
          total_cost: totalCost,
        };
      });
    setMenuItems(selectedItems);
  };

  // --- Cost calculation for summary ---
  const calculateCosts = () => {
    const totalCost = menuItems.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);
    const estimatedServings = form.getFieldValue('estimated_servings') || 1;
    const costPerServing = totalCost / estimatedServings;
    setCostCalculation({
      totalCost,
      costPerServing
    });
  };

  // --- Actual menu create/update handler ---
  const handleSubmit = async () => {
    try {
      const menuValues = await form.validateFields();
      const selectedItems = items.filter(item => item.quantity > 0);
      if (selectedItems.length === 0) {
        return message.error('Please add at least one ingredient to the menu');
      }
      // Stock check...
      const insufficientStock = selectedItems.filter(item =>
        item.quantity > (item.stock_quantity || 0)
      );
      if (insufficientStock.length > 0) {
        const itemNames = insufficientStock.map(item => item.name).join(', ');
        return message.error(`Insufficient stock for: ${itemNames}`);
      }
      const formattedMenuData = {
        ...menuValues,
        date: menuValues.date ? menuValues.date.format('YYYY-MM-DD') : undefined,
        items: selectedItems.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          unit: item.UOM?.abbreviation || 'unit',
          preparation_notes: item.preparation_notes || '',
        }))
      };
      setLoading(true);

      if (selectedMenuId) {
        await messAPI.updateMenuWithItems(selectedMenuId, formattedMenuData);
        message.success('Menu updated successfully');
      } else {
        await messAPI.createMenu(formattedMenuData);
        message.success('Menu created successfully with ingredients!');
      }

      setSelectedMenuId(null);
      form.resetFields();
      resetQuantities();
      setMenuItems([]);
      setCostCalculation({ totalCost: 0, costPerServing: 0 });
      fetchMenus();

    } catch (error) {
      message.error(
        (selectedMenuId ? 'Failed to update menu: ' : 'Failed to create menu: ') +
        (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Reset all ---
  const resetQuantities = () => {
    const resetItems = items.map(item => ({
      ...item,
      quantity: 0,
      preparation_notes: '',
      fifo_price: null,
      multi_batch_price: null,
      multi_batch_breakdown: null,
      average_unit_price: null,
      is_multi_batch: false
    }));
    setItems(resetItems);
    setMenuItems([]);
  };

  // --- Delete menu for update mode ---
  const handleDeleteMenu = (menuId) => {
    Modal.confirm({
      title: 'Delete Menu',
      content: 'Are you sure you want to delete this menu? This action cannot be undone.',
      onOk: async () => {
        setLoading(true);
        try {
          await messAPI.deleteMenu(menuId);
          message.success('Menu deleted.');
          fetchMenus();
          setSelectedMenuId(null);
          form.resetFields();
          resetQuantities();
          setMenuItems([]);
        } catch (err) {
          message.error('Failed to delete menu.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // --- Table columns use FIFO/Multi-batch ---
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
      width: 80,
      render: (_, record) => record.UOM?.abbreviation || 'unit'
    },
    {
      title: 'Price/Unit',
      key: 'unit_price',
      width: 120,
      render: (_, record) => {
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
      width: 120,
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
      width: 100,
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
      width: 180,
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
        const priceToUse = record.fifo_price !== null ? record.fifo_price : record.unit_price || 0;
        const cost = priceToUse * (record.quantity || 0);
        return `₹${cost.toFixed(2)}`;
      }
    },
  ];

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

  const getFilteredItems = () => {
    if (selectedCategory === 'all') return items;
    return items.filter(item => item.category_id === selectedCategory);
  };

  // Menu select dropdown
  const menuDropdown =
    <Select
      style={{ width: 300 }}
      showSearch
      allowClear
      placeholder="Select existing menu to view/update"
      value={selectedMenuId || undefined}
      onChange={handleMenuSelect}
      optionFilterProp="children"
      filterOption={(input, option) =>
        (option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0)}
    >
      {menus.map(m => (
        <Option key={m.id} value={m.id}>
          {m.name} ({mealTypes.find(mt => mt.value === m.meal_type)?.label || m.meal_type})
        </Option>
      ))}
    </Select>;

  return (
    <Card
      title={
        <Space>
          <Title level={3}>Menu Management</Title>
          {menuDropdown}
          {selectedMenuId && (
            <Button
              size="small"
              danger
              style={{ marginLeft: 12 }}
              onClick={() => handleDeleteMenu(selectedMenuId)}
            >
              Delete Menu
            </Button>
          )}
          {selectedMenuId && (
            <Button
              size="small"
              icon={<CloseOutlined />}
              style={{ marginLeft: 8 }}
              onClick={() => handleMenuSelect(null)}
            >
              New Menu
            </Button>
          )}
        </Space>
      }
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title={selectedMenuId ? "Edit Menu Details" : "Menu Details"} bordered={false}>
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
                  onChange={calculateCosts}
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
      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <Space>
          <Button onClick={() => {
            form.resetFields();
            resetQuantities();
            setMenuItems([]);
            setCostCalculation({ totalCost: 0, costPerServing: 0 });
            setSelectedMenuId(null);
          }} icon={<CloseOutlined />}>Reset All</Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!menuItems.length}
            icon={selectedMenuId ? <EditOutlined /> : <SaveOutlined />}
          >
            {selectedMenuId ? "Update Menu" : "Create Menu"}
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default CreateMenu;
