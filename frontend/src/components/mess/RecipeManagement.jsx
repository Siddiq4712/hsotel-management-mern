import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Tag, Space, message, Modal,
  Form, Input, Select, InputNumber, Typography,
  Divider, ConfigProvider, theme, Row, Col, Popconfirm
} from 'antd';
import {
  Plus, Edit2, Trash2, Search, ChefHat, 
  BookOpen, Beaker, Save, X, Info, LayoutGrid, Utensils
} from 'lucide-react';
import { messAPI } from '../../services/api';

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

/* ─── Shared UI Components ─── */
const StatCard = ({ label, value, icon: Icon, accent }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radius, padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: 16,
    boxShadow: T.shadow,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: accent ? T.accentBg : T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={20} color={accent ? T.accent : T.inkSoft} />
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, fontWeight: 600, letterSpacing: '0.02em' }}>{label.toUpperCase()}</div>
    </div>
  </div>
);

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, marginBottom: 6, letterSpacing: '0.04em' }}>
    {children}
  </div>
);

const ActionBtn = ({ icon, children, onClick, variant }) => {
  const styles = {
    danger:  { bg: T.dangerBg, color: T.danger, hover: '#FEE2E2' },
    default: { bg: T.surface, color: T.inkMid, border: T.border, hover: T.bg },
  };
  const s = styles[variant] || styles.default;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: children ? '5px 12px' : '6px',
        borderRadius: 7, border: s.border ? `1px solid ${s.border}` : 'none',
        background: s.bg, color: s.color,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = s.hover}
      onMouseLeave={e => e.currentTarget.style.background = s.bg}
    >
      {icon}{children}
    </button>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const RecipeManagement = () => {
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipeRes, itemRes, uomRes] = await Promise.all([
        messAPI.getRecipes(),
        messAPI.getItems(),
        messAPI.getUOMs()
      ]);
      setRecipes(recipeRes.data.data || []);
      setItems(itemRes.data.data || []);
      setUoms(uomRes.data.data || []);
    } catch (error) {
      message.error("Failed to sync recipe data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, [fetchData]);

  // FIX: Populate ingredients correctly for Form.List
  const handleEdit = (record) => {
    setEditingRecipe(record);
    
    // 1. Get raw ingredients (Sequelize sends them as 'Ingredients')
    const rawList = record.Ingredients || record.ingredients || [];
    
    // 2. Map them to match the structure expected by Form.List name="items"
    const mappedItems = rawList.map(ing => ({
      item_id: ing.item_id,
      quantity_per_serving: ing.quantity_per_serving,
      unit_id: ing.unit_id
    }));

    // 3. Set form fields
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      items: mappedItems 
    });
    
    setModalVisible(true);
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // Construct payload using 'items' key to match your Backend Controller
      const payload = {
        name: values.name,
        description: values.description,
        items: values.items 
      };

      if (editingRecipe) {
        await messAPI.updateRecipe(editingRecipe.id, payload);
        message.success('Recipe updated successfully');
      } else {
        await messAPI.createRecipe(payload);
        message.success('New recipe created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteRecipe(id);
      message.success("Recipe removed");
      fetchData();
    } catch (error) {
      message.error("Delete failed");
    }
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const totalRecipes = recipes.length;
    const avgComponents = totalRecipes > 0 
      ? (recipes.reduce((acc, curr) => acc + (curr.Ingredients?.length || 0), 0) / totalRecipes).toFixed(1)
      : 0;
    const mostComplex = recipes.reduce((prev, current) => 
        ((prev.Ingredients?.length || 0) > (current.Ingredients?.length || 0)) ? prev : current, 
    { name: 'None', Ingredients: [] });

    return { totalRecipes, avgComponents, mostComplexName: mostComplex.name };
  }, [recipes]);

  /* ── Table Columns ── */
  const columns = [
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>DISH NAME</span>,
      dataIndex: 'name',
      key: 'name',
      render: (t) => <span style={{ fontWeight: 600, color: T.ink, fontSize: 14 }}>{t}</span>
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>COMPOSITION (PER SERVING)</span>,
      key: 'ingredients',
      render: (_, record) => {
        const list = record.Ingredients || record.ingredients || [];
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {list.map((ing, idx) => (
              <span key={idx} style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20,
                backgroundColor: T.accentBg, color: T.accent, fontSize: 12, fontWeight: 600, border: `1px solid #D4E6FF`
              }}>
                {ing.ItemDetail?.name || 'Item'}: {parseFloat(ing.quantity_per_serving).toFixed(3)} {ing.UOMDetail?.abbreviation}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <ActionBtn icon={<Edit2 size={13}/>} onClick={() => handleEdit(record)}>Edit</ActionBtn>
          <Popconfirm title="Delete recipe?" onConfirm={() => handleDelete(record.id)}>
            <ActionBtn icon={<Trash2 size={13}/>} variant="danger" />
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.accent, borderRadius: 8, fontFamily: "'DM Sans', sans-serif" } }}>
      <style>{`
        .pm-table .ant-table-thead > tr > th { background: #F7F8FA !important; border-bottom: 1px solid ${T.border} !important; padding: 11px 16px !important; }
        .pm-table .ant-table-tbody > tr > td { border-bottom: 1px solid ${T.border} !important; padding: 14px 16px !important; }
        .pm-form-input .ant-input, .pm-form-input .ant-select-selector, .pm-form-input .ant-input-number { border-radius: 8px !important; }
        .pm-modal .ant-modal-content { border-radius: 14px; overflow: hidden; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 40 }}>
        {/* Page Header */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>Recipe Master</div>
              <div style={{ fontSize: 12, color: T.inkSoft }}>Standardize ingredient ratios for mass cooking</div>
            </div>
          </div>
          <button onClick={() => { setEditingRecipe(null); form.resetFields(); setModalVisible(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 2px 8px rgba(26,86,219,0.3)` }}>
            <Plus size={16} /> New Recipe
          </button>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Recipes" value={stats.totalRecipes} icon={LayoutGrid} accent />
            <StatCard label="Avg. Ingredients" value={stats.avgComponents} icon={Beaker} />
            <StatCard label="Most Complex Dish" value={stats.mostComplexName} icon={ChefHat} />
          </div>

          {/* Search */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, boxShadow: T.shadow }}>
            <Search size={16} color={T.inkSoft} />
            <input placeholder="Search recipes (e.g. Sambar, Biryani)..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: T.ink, flex: 1, fontFamily: "'DM Sans', sans-serif" }} />
          </div>

          {/* Table */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: 'hidden' }}>
            <Table className="pm-table" columns={columns} dataSource={recipes.filter(r => r.name?.toLowerCase().includes(searchText.toLowerCase()))} rowKey="id" loading={loading} pagination={{ pageSize: 8, size: 'small' }} />
          </div>
        </div>

        {/* Create/Edit Modal */}
        <Modal
          className="pm-modal"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChefHat size={15} color={T.accent} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
                {editingRecipe ? 'Update Recipe' : 'Configure New Recipe'}
              </span>
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={720}
          destroyOnClose // Ensures Form.List re-registers correctly
        >
          <Form form={form} layout="vertical" onFinish={onFinish} className="pm-form-input" style={{ marginTop: 8 }}>
            <Form.Item name="name" label={<FieldLabel>Dish Name</FieldLabel>} rules={[{ required: true }]}>
              <Input placeholder="e.g. Vegetable Biryani" />
            </Form.Item>
            <Form.Item name="description" label={<FieldLabel>Preparation Notes</FieldLabel>}>
              <TextArea rows={2} placeholder="Brief instructions..." />
            </Form.Item>

            <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400E', fontWeight: 700, fontSize: 12 }}>
                    <Info size={14} /> INGREDIENT RATIO (PER PERSON)
                </div>
                <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>
                    Enter quantities for exactly 1 plate. The system auto-calculates bulk orders.
                </div>
            </div>

            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} style={{ 
                        background: T.bg, border: `1px solid ${T.border}`, 
                        padding: '16px', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'start'
                    }}>
                      <Form.Item {...restField} name={[name, 'item_id']} label={<FieldLabel>Material</FieldLabel>} style={{ flex: 1, marginBottom: 0 }} rules={[{required: true}]}>
                        <Select showSearch placeholder="Select item" optionFilterProp="children">
                          {items.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'quantity_per_serving']} label={<FieldLabel>Qty/Person</FieldLabel>} style={{ width: 120, marginBottom: 0 }} rules={[{required: true}]}>
                        <InputNumber precision={3} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'unit_id']} label={<FieldLabel>Unit</FieldLabel>} style={{ width: 100, marginBottom: 0 }} rules={[{required: true}]}>
                        <Select placeholder="Unit">
                          {uoms.map(u => <Option key={u.id} value={u.id}>{u.abbreviation}</Option>)}
                        </Select>
                      </Form.Item>
                      <button type="button" onClick={() => remove(name)} style={{ marginTop: 30, background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => add()} style={{ width: '100%', padding: '12px', borderRadius: 10, border: `2px dashed ${T.border}`, background: 'none', color: T.inkMid, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Plus size={16} /> Add Ingredient Component
                  </button>
                </div>
              )}
            </Form.List>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button type="button" onClick={() => setModalVisible(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.inkMid, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Save size={16} /> {editingRecipe ? 'Update Recipe' : 'Save Recipe'}
              </button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default RecipeManagement;