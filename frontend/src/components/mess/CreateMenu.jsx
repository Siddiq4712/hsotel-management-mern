import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, message, Modal,
  Form, Input, Select, InputNumber, Typography,
  Divider, List, ConfigProvider, theme, DatePicker, Row, Col
} from 'antd';
import dayjs from 'dayjs';
import {
  Plus, Trash2, Search, ChefHat, Save, 
  Settings, Calculator, AlertCircle, CheckCircle2, 
  Utensils, X, LayoutGrid, DollarSign, Info
} from 'lucide-react';
import { messAPI } from "../../services/api";

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

/* ─── Design Tokens ─── */
const T = {
  bg:        '#F7F8FA',
  surface:   '#FFFFFF',
  border:    '#E8EAED',
  borderHov: '#C8CDD5',
  ink:       '#141820',
  inkMid:    '#4B5263',
  inkSoft:   '#8B92A5',
  accent:    '#1A56DB',
  accentBg:  '#EBF2FF',
  danger:    '#DC2626',
  dangerBg:  '#FEF2F2',
  success:   '#16A34A',
  successBg: '#F0FDF4',
  radius:    '10px',
  shadow:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
};

const mealConfig = {
  breakfast: { label: 'Breakfast', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  lunch:     { label: 'Lunch',     color: '#166534', bg: '#F0FDF4', dot: '#22C55E' },
  dinner:    { label: 'Dinner',    color: '#4338CA', bg: '#EEF2FF', dot: '#818CF8' },
  snacks:    { label: 'Snacks',    color: '#9A3412', bg: '#FFF7ED', dot: '#F97316' },
};

/* ─── Sub-components ─── */
const StatCard = ({ label, value, icon: Icon, accent, variant = "default" }) => {
  const isDanger = variant === "danger";
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14, boxShadow: T.shadow,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: isDanger ? T.dangerBg : (accent ? T.accentBg : T.bg),
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={isDanger ? T.danger : (accent ? T.accent : T.inkSoft)} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.inkSoft, marginTop: 2, letterSpacing: '0.02em' }}>{label.toUpperCase()}</div>
      </div>
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, marginBottom: 6, letterSpacing: '0.04em' }}>
    {children}
  </div>
);

/* ─── Main Component ─── */
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
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

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
      // Ensure we handle both casing 'Ingredients' and 'ingredients'
      setRecipes(response.data.data || []);
    } catch (error) { message.error("Failed to fetch recipes"); }
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
      return { 
        totalCost: Math.min(requestedQuantity, totalAvailable) * avg, 
        shortage: Math.max(0, requestedQuantity - totalAvailable) 
      };
    } catch (e) { return { totalCost: 0, shortage: requestedQuantity }; }
  };

  const calculateAllIngredients = async () => {
    try {
      const ingredientMap = {}; 
      
      selectedRecipes.forEach(recipe => {
        // Checking both casing because Sequelize 'as' might vary in JSON response
        const items = recipe.Ingredients || recipe.ingredients || [];
        
        items.forEach(ing => {
          const itemId = ing.item_id;
          // Use quantity_per_serving as defined in your RecipeItem model
          const qtyPerPerson = parseFloat(ing.quantity_per_serving) || 0;
          const totalQtyNeeded = qtyPerPerson * (servings || 0);
          
          if (ingredientMap[itemId]) {
            ingredientMap[itemId].quantity += totalQtyNeeded;
          } else {
            ingredientMap[itemId] = {
              item_id: itemId,
              // Use ItemDetail.name as defined in your associations
              name: ing.ItemDetail?.name || 'Unknown Item',
              quantity: totalQtyNeeded,
              // Use UOMDetail.abbreviation
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
      setCostCalculation({ totalCost, costPerServing: totalCost / (servings || 1) });
    } catch (err) { 
      console.error("Aggregation Error:", err); 
    }
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
        items: aggregatedIngredients.map(i => ({ 
          item_id: i.item_id, 
          quantity: i.quantity, 
          unit_id: i.unit_id 
        }))
      });
      message.success("Menu created successfully");
      setSelectedRecipes([]);
      form.resetFields();
    } catch (error) { message.error("Failed to create menu"); }
    finally { setLoading(false); }
  };

  const filteredRecipes = useMemo(() => {
    if (!searchText) return recipes;
    const lowerSearch = searchText.toLowerCase();
    return recipes.filter(r => 
      r.name.toLowerCase().includes(lowerSearch) || 
      (r.Ingredients || r.ingredients)?.some(ing => ing.ItemDetail?.name.toLowerCase().includes(lowerSearch))
    );
  }, [searchText, recipes]);

  const recipeColumns = [
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>DISH NAME</span>,
      dataIndex: 'name',
      render: (t) => <span style={{ fontWeight: 600, color: T.ink }}>{t}</span>
    },
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>INGREDIENTS</span>,
      render: (_, r) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(r.Ingredients || r.ingredients)?.map(i => (
            <span key={i.id} style={{ 
              fontSize: 11, background: T.bg, padding: '2px 8px', 
              borderRadius: 4, color: T.inkMid, border: `1px solid ${T.border}` 
            }}>
              {i.ItemDetail?.name}
            </span>
          ))}
        </div>
      )
    },
    { 
      title: '', 
      align: 'right',
      render: (_, r) => {
        const isSelected = selectedRecipes.find(sr => sr.id === r.id);
        return (
          <button
            onClick={() => toggleRecipe(r)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, border: 'none',
              background: isSelected ? T.dangerBg : T.accentBg,
              color: isSelected ? T.danger : T.accent,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.1s'
            }}
          >
            {isSelected ? <X size={14}/> : <Plus size={14}/>}
            {isSelected ? "Remove" : "Add"}
          </button>
        );
      }
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.accent, borderRadius: 8, fontFamily: "'DM Sans', sans-serif" } }}>
      <style>{`
        .pm-table .ant-table-thead > tr > th { background: #F7F8FA !important; border-bottom: 1px solid ${T.border} !important; padding: 12px 16px !important; }
        .pm-table .ant-table-tbody > tr > td { padding: 14px 16px !important; border-bottom: 1px solid ${T.border} !important; }
        .pm-form-input .ant-input, .pm-form-input .ant-select-selector, .pm-form-input .ant-input-number { border-radius: 8px !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
        
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat size={20} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>Create New Menu</div>
              <div style={{ fontSize: 12, color: T.inkSoft }}>Plan dishes and analyze inventory requirements</div>
            </div>
          </div>
          <Space>
            <button onClick={() => { setSelectedRecipes([]); form.resetFields(); }} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.inkMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reset</button>
            <button disabled={loading || selectedRecipes.length === 0} onClick={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (loading || selectedRecipes.length === 0) ? 0.6 : 1, boxShadow: `0 2px 8px rgba(26,86,219,0.3)` }}>
              <Save size={16} /> Confirm Menu
            </button>
          </Space>
        </div>

        <div style={{ padding: '28px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Selected Dishes" value={selectedRecipes.length} icon={Utensils} accent />
            <StatCard label="Total Est. Cost" value={`₹${costCalculation.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={DollarSign} />
            <StatCard label="Cost per Plate" value={`₹${costCalculation.costPerServing.toFixed(2)}`} icon={Calculator} />
            <StatCard label="Shortages" value={aggregatedIngredients.filter(i => i.shortage > 0).length} icon={AlertCircle} variant={aggregatedIngredients.some(i => i.shortage > 0) ? "danger" : "default"} />
          </div>

          <Row gutter={20}>
            <Col span={9}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, boxShadow: T.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Settings size={16} color={T.accent} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>1. Menu Setup</span>
                </div>
                <Form form={form} layout="vertical" className="pm-form-input" initialValues={{ estimated_servings: 100 }}>
                  <Form.Item name="name" label={<FieldLabel>Menu Name</FieldLabel>} rules={[{ required: true }]}>
                    <Input placeholder="e.g., Veg Thali Deluxe" />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="meal_type" label={<FieldLabel>Meal Type</FieldLabel>} rules={[{ required: true }]}>
                        <Select placeholder="Select type">
                          {Object.entries(mealConfig).map(([v, c]) => (
                            <Option key={v} value={v}>{c.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="date" label={<FieldLabel>Scheduled Date</FieldLabel>} rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="estimated_servings" label={<FieldLabel>Planned Serving Count</FieldLabel>} rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Form>
              </div>
            </Col>

            <Col span={15}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {selectedRecipes.length > 0 && (
                  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, boxShadow: T.shadow }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Calculator size={16} color={T.success} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>2. Requirement Analysis</span>
                    </div>
                    <Table 
                      className="pm-table"
                      dataSource={aggregatedIngredients}
                      rowKey="item_id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'MATERIAL', dataIndex: 'name', render: t => <span style={{ fontWeight: 600 }}>{t}</span> },
                        { title: 'TOTAL REQ.', render: (_, r) => <span style={{ fontFamily: 'DM Mono' }}>{r.quantity.toFixed(1)} {r.unit}</span> },
                        { title: 'EST. COST', render: (_, r) => <span>₹{r.total_cost.toFixed(0)}</span> },
                        { title: 'STATUS', align: 'right', render: (_, r) => (
                          r.shortage > 0 ? 
                          <Tag color="error" style={{ borderRadius: 20 }}>Shortage: {r.shortage.toFixed(1)}</Tag> :
                          <Tag color="success" style={{ borderRadius: 20 }}>Ready</Tag>
                        )}
                      ]}
                    />
                  </div>
                )}

                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', boxShadow: T.shadow }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <LayoutGrid size={16} color={T.inkSoft} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Browse Recipes</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', width: 240 }}>
                      <Search size={14} color={T.inkSoft} />
                      <input placeholder="Search recipes..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%' }} onChange={e => setSearchText(e.target.value)} />
                    </div>
                  </div>
                  <Table className="pm-table" dataSource={filteredRecipes} columns={recipeColumns} rowKey="id" pagination={{ pageSize: 5, size: 'small' }} />
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default CreateMenu;