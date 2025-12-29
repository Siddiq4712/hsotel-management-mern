import React, { useState, useEffect, useMemo } from "react";
import {
  Card, Form, Input, Button, Select, DatePicker, InputNumber, message,
  Space, Typography, Divider, Table, Tag, Row, Col, Statistic, ConfigProvider, theme,List
} from "antd";
// Lucide icons for consistency
import {
  Save, X, Plus, Trash2, Search, ChefHat, 
  Calendar, Settings, Calculator, AlertCircle, 
  CheckCircle2, ArrowRight, Utensils
} from 'lucide-react';
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
  const [searchText, setSearchText] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState([]); 
  const [aggregatedIngredients, setAggregatedIngredients] = useState([]); 
  const [costCalculation, setCostCalculation] = useState({ totalCost: 0, costPerServing: 0 });

  const servings = Form.useWatch('estimated_servings', form);

  useEffect(() => {
    fetchRecipes();
  }, []);

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
    } catch (error) { message.error("Failed to fetch recipes"); }
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

  const cardStyle = {
    backgroundColor: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  };

  const recipeColumns = [
    { 
      title: 'Dish Name', 
      dataIndex: 'name', 
      render: (t) => <Text strong className="text-slate-700">{t}</Text> 
    },
    { 
      title: 'Ingredients Preview', 
      render: (_, r) => (
        <Space wrap>
          {r.Ingredients?.map(i => (
            <Tag key={i.id} bordered={false} className="bg-slate-100 text-slate-500 rounded-md">
              {i.ItemDetail?.name}
            </Tag>
          ))}
        </Space>
      )
    },
    { 
      title: 'Action', 
      width: 120,
      align: 'right',
      render: (_, r) => {
        const isSelected = selectedRecipes.find(sr => sr.id === r.id);
        return (
          <Button 
            type={isSelected ? "primary" : "default"} 
            danger={isSelected}
            icon={isSelected ? <Trash2 size={14}/> : <Plus size={14}/>}
            onClick={() => toggleRecipe(r)}
            className="flex items-center gap-2 rounded-lg"
          >
            {isSelected ? "Remove" : "Add"}
          </Button>
        );
      }
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 12,
          colorBgContainer: '#ffffff',
        },
      }}
    >
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <ChefHat className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Create Menu</Title>
              <Text type="secondary">Plan and calculate costs for scheduled meals</Text>
            </div>
          </div>
          <Space>
            <Button 
              icon={<X size={16}/>} 
              className="flex items-center gap-2"
              onClick={() => setSelectedRecipes([])}
            >
              Reset
            </Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<Save size={18} />} 
              onClick={handleSubmit} 
              loading={loading} 
              disabled={selectedRecipes.length === 0}
              className="flex items-center gap-2 shadow-lg shadow-blue-100"
            >
              Confirm Menu
            </Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* Settings Section */}
          <Col xs={24} lg={selectedRecipes.length > 0 ? 9 : 24}>
            <Card 
              title={<span className="flex items-center gap-2"><Settings size={18} className="text-blue-600"/> 1. General Info</span>} 
              style={cardStyle}
            >
              <Form form={form} layout="vertical" initialValues={{ estimated_servings: 100 }}>
                <Form.Item name="name" label="Menu Name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Sunday Spl Lunch" className="rounded-lg py-2" />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="meal_type" label="Meal Type" rules={[{ required: true }]}>
                      <Select options={mealTypes} className="rounded-lg h-10" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                      <DatePicker className="w-full rounded-lg h-10" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="estimated_servings" label="Serving Count" rules={[{ required: true }]}>
                  <InputNumber min={1} className="w-full rounded-lg h-10 flex items-center" />
                </Form.Item>
              </Form>

              {selectedRecipes.length > 0 && (
                <>
                  <Divider className="my-4" />
                  <Text strong className="text-slate-400 text-xs uppercase tracking-widest block mb-4">Included Dishes</Text>
                  <List
                    dataSource={selectedRecipes}
                    renderItem={item => (
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl mb-2 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Utensils size={14} className="text-blue-500" />
                          <Text strong>{item.name}</Text>
                        </div>
                        <Button type="text" danger icon={<Trash2 size={14}/>} onClick={() => toggleRecipe(item)} />
                      </div>
                    )}
                  />
                </>
              )}
            </Card>
          </Col>

          {/* Analysis Section */}
          {selectedRecipes.length > 0 && (
            <Col xs={24} lg={15}>
              <Card 
                title={<span className="flex items-center gap-2"><Calculator size={18} className="text-emerald-600"/> 2. Cost & Inventory Analysis</span>} 
                style={cardStyle}
                className="h-full"
              >
                <Row gutter={24} className="mb-6">
                  <Col span={12}>
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                      <Statistic title="Total Budget" prefix="₹" value={costCalculation.totalCost} precision={2} />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                      <Statistic title="Cost per Plate" prefix="₹" value={costCalculation.costPerServing} precision={2} />
                    </div>
                  </Col>
                </Row>

                <Table 
                  size="small"
                  dataSource={aggregatedIngredients}
                  rowKey="item_id"
                  pagination={false}
                  className="border border-slate-100 rounded-xl overflow-hidden"
                  columns={[
                    { title: 'Item', dataIndex: 'name', render: (t) => <Text className="text-slate-600">{t}</Text> },
                    { 
                      title: 'Requirement', 
                      render: (_, r) => <Text strong>{r.quantity.toFixed(2)} <span className="text-slate-400 font-normal">{r.unit}</span></Text> 
                    },
                    { 
                      title: 'Status', 
                      align: 'right',
                      render: (_, r) => r.shortage > 0 ? (
                        <Tag icon={<AlertCircle size={12}/>} color="error" className="flex items-center gap-1 w-fit ml-auto rounded-full px-3">
                          Shortage: {r.shortage.toFixed(1)}
                        </Tag>
                      ) : (
                        <Tag icon={<CheckCircle2 size={12}/>} color="success" className="flex items-center gap-1 w-fit ml-auto rounded-full px-3">
                          Available
                        </Tag>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          )}
        </Row>

        {/* Recipe Selection Table */}
        <div className="mt-8">
          <Card 
            title={<span className="flex items-center gap-2">Browse Recipes</span>}
            style={cardStyle}
            extra={
              <Input 
                placeholder="Search by dish or ingredient..." 
                prefix={<Search size={16} className="text-slate-400" />} 
                className="w-80 rounded-full bg-slate-50 border-none"
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            }
          >
            <Table 
              dataSource={filteredRecipes}
              columns={recipeColumns}
              rowKey="id"
              pagination={{ pageSize: 6 }}
              className="mt-2"
            />
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default CreateMenu;