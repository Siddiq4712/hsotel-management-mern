import React, { useState, useEffect, useMemo } from "react";
import {
  Card, Form, Input, Button, Select, DatePicker, InputNumber, message,
  Space, Typography, Divider, Table, Tag, Row, Col, Statistic, Empty
} from "antd";
import {
  SaveOutlined, CloseOutlined, PlusOutlined, DeleteOutlined, SearchOutlined
} from "@ant-design/icons";
import { messAPI } from "../../services/api";

const { Title, Text } = Typography;

const mealTypes = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
];

const CreateMenu = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [searchText, setSearchText] = useState(""); // Real-time search state
  const [selectedRecipes, setSelectedRecipes] = useState([]); 
  const [aggregatedIngredients, setAggregatedIngredients] = useState([]); 
  const [costCalculation, setCostCalculation] = useState({ totalCost: 0, costPerServing: 0 });

  const servings = Form.useWatch('estimated_servings', form);

  useEffect(() => {
    fetchRecipes();
  }, []);

  // REAL-TIME SEARCH LOGIC
  const filteredRecipes = useMemo(() => {
    if (!searchText) return recipes;
    const lowerSearch = searchText.toLowerCase();
    return recipes.filter(r => 
      r.name.toLowerCase().includes(lowerSearch) || 
      r.Ingredients?.some(ing => ing.ItemDetail?.name.toLowerCase().includes(lowerSearch))
    );
  }, [searchText, recipes]);

  useEffect(() => {
    if (selectedRecipes.length > 0 && servings > 0) {
      calculateAllIngredients();
    } else {
      setAggregatedIngredients([]);
      setCostCalculation({ totalCost: 0, costPerServing: 0 });
    }
  }, [selectedRecipes, servings]);

  const fetchRecipes = async () => {
    try {
      const response = await messAPI.getRecipes();
      setRecipes(response.data.data || []);
    } catch (error) {
      message.error("Failed to fetch recipes");
    }
  };

  const calculateAllIngredients = async () => {
    try {
      const ingredientMap = {}; 
      selectedRecipes.forEach(recipe => {
        recipe.Ingredients.forEach(ing => {
          const itemId = ing.item_id;
          const totalQtyNeeded = parseFloat(ing.quantity_per_serving) * servings;

          if (ingredientMap[itemId]) {
            ingredientMap[itemId].quantity += totalQtyNeeded;
          } else {
            ingredientMap[itemId] = {
              item_id: itemId,
              name: ing.ItemDetail?.name || 'Unknown Item',
              quantity: totalQtyNeeded,
              unit: ing.UOMDetail?.abbreviation || 'unit',
              unit_id: ing.unit_id
            };
          }
        });
      });

      const processedItems = await Promise.all(
        Object.values(ingredientMap).map(async (item) => {
          const calc = await calculateMultiBatchPrice(item.item_id, item.quantity);
          return { ...item, total_cost: calc.totalCost, shortage: calc.shortage };
        })
      );

      setAggregatedIngredients(processedItems);
      const totalCost = processedItems.reduce((sum, i) => sum + i.total_cost, 0);
      setCostCalculation({ totalCost, costPerServing: totalCost / servings });
    } catch (err) { console.error(err); }
  };

  const calculateMultiBatchPrice = async (itemId, requestedQuantity) => {
    try {
      const response = await messAPI.getItemBatches(itemId);
      const batches = (response.data?.data || [])
        .filter(b => b.status === "active" && parseFloat(b.quantity_remaining) > 0)
        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));

      if (!batches.length) return { totalCost: 0, shortage: requestedQuantity };
      
      const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.quantity_remaining), 0);
      const totalValue = batches.reduce((sum, b) => sum + (parseFloat(b.quantity_remaining) * parseFloat(b.unit_price)), 0);
      const avg = totalValue / totalAvailable;

      return { totalCost: Math.min(requestedQuantity, totalAvailable) * avg, shortage: Math.max(0, requestedQuantity - totalAvailable) };
    } catch (e) { return { totalCost: 0, shortage: requestedQuantity }; }
  };

  const toggleRecipe = (recipe) => {
    const isSelected = selectedRecipes.find(r => r.id === recipe.id);
    if (isSelected) {
      setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipe.id));
    } else {
      setSelectedRecipes([...selectedRecipes, recipe]);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (aggregatedIngredients.some(i => i.shortage > 0)) {
        return message.error("Check inventory shortages before creating menu");
    }
    setLoading(true);
    try {
      await messAPI.createMenu({
        ...values,
        date: values.date.format("YYYY-MM-DD"),
        items: aggregatedIngredients.map(i => ({ item_id: i.item_id, quantity: i.quantity, unit_id: i.unit_id }))
      });
      message.success("Menu created successfully");
      setSelectedRecipes([]);
      form.resetFields();
    } catch (error) { message.error("Failed to create menu"); }
    finally { setLoading(false); }
  };

  const recipeColumns = [
    { title: 'Dish Name', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
    { title: 'Ingredients Preview', render: (_, r) => <Space wrap>{r.Ingredients?.map(i => <Tag key={i.id}>{i.ItemDetail?.name}</Tag>)}</Space> },
    { 
      title: 'Action', 
      width: 100,
      render: (_, r) => {
        const isSelected = selectedRecipes.find(sr => sr.id === r.id);
        return (
          <Button 
            type={isSelected ? "primary" : "default"} 
            danger={isSelected}
            icon={isSelected ? <DeleteOutlined /> : <PlusOutlined />}
            onClick={() => toggleRecipe(r)}
          >
            {isSelected ? "Remove" : "Add"}
          </Button>
        );
      }
    }
  ];

  return (
    <Card title={<Title level={3}>Create Menu</Title>}>
      <Row gutter={[24, 24]}>
        {/* Left: Basic Settings */}
        <Col xs={24} lg={selectedRecipes.length > 0 ? 10 : 24}>
          <Card title="1. Menu Settings" bordered={false}>
            <Form form={form} layout="vertical" initialValues={{ estimated_servings: 100 }}>
              <Form.Item name="name" label="Menu Name" rules={[{ required: true }]}><Input placeholder="e.g. Sunday Spl Lunch" /></Form.Item>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="meal_type" label="Meal Type" rules={[{ required: true }]}><Select options={mealTypes} /></Form.Item></Col>
                <Col span={12}><Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="estimated_servings" label="Serving Count" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            </Form>
          </Card>

          {/* CONDITIONAL RENDERING: Hide if no dishes selected */}
          {selectedRecipes.length > 0 && (
            <Card title="Selected Dishes" style={{ marginTop: 16 }} bodyStyle={{ padding: 0 }}>
              <Table 
                size="small"
                dataSource={selectedRecipes}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: 'Dish Name', dataIndex: 'name' },
                  { title: '', render: (_, r) => <Button type="link" danger icon={<DeleteOutlined />} onClick={() => toggleRecipe(r)} /> }
                ]}
              />
            </Card>
          )}
        </Col>

        {/* Right: Summary - Only shows if dishes are selected */}
        {selectedRecipes.length > 0 && (
          <Col xs={24} lg={14}>
            <Card title="2. Calculation Summary" bordered={false}>
              <Row gutter={16}>
                <Col span={12}><Statistic title="Budget" prefix="₹" value={costCalculation.totalCost} precision={2} /></Col>
                <Col span={12}><Statistic title="Cost/Plate" prefix="₹" value={costCalculation.costPerServing} precision={2} /></Col>
              </Row>
              <Divider />
              <Table 
                size="small"
                dataSource={aggregatedIngredients}
                rowKey="item_id"
                pagination={false}
                columns={[
                  { title: 'Item', dataIndex: 'name' },
                  { title: 'Qty', render: (_, r) => `${r.quantity.toFixed(3)} ${r.unit}` },
                  { title: 'Status', render: (_, r) => r.shortage > 0 ? <Tag color="error">Shortage</Tag> : <Tag color="success">OK</Tag> }
                ]}
              />
            </Card>
          </Col>
        )}
      </Row>

      <Divider orientation="left">Recipe Selection</Divider>
      
      {/* REAL-TIME SEARCH INPUT */}
      <Input 
        placeholder="Search dishes (e.g. typing 'amb' will find 'Sambar')..." 
        prefix={<SearchOutlined />} 
        style={{ marginBottom: 16, width: '100%', maxWidth: 400 }}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
      />

      <Table 
        dataSource={filteredRecipes} // Use the filtered list here
        columns={recipeColumns}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />

      <div style={{ textAlign: "right", marginTop: 24 }}>
        <Space>
          <Button onClick={() => setSelectedRecipes([])}>Reset</Button>
          <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading} disabled={selectedRecipes.length === 0}>
            Confirm Menu
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default CreateMenu;