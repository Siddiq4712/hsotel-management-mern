import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, message, Modal,
  Form, Input, Select, InputNumber, Typography, Tabs,
  Drawer, Divider, List, ConfigProvider, theme, DatePicker
} from 'antd';
import { Row, Col, Empty } from "antd";
import dayjs from 'dayjs';
import {
  Plus, Edit2, Trash2, Eye, Calendar, Search,
  ChefHat, Filter, Info, Clock, Utensils, X, Save,
  UtensilsCrossed, LayoutGrid
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

/* ─── Design Tokens ─────────────────────────────────────────────── */
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
  shadowMd:  '0 4px 12px rgba(0,0,0,0.08)',
};

const mealConfig = {
  breakfast: { label: 'Breakfast', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  lunch:     { label: 'Lunch',     color: '#166534', bg: '#F0FDF4', dot: '#22C55E' },
  dinner:    { label: 'Dinner',    color: '#4338CA', bg: '#EEF2FF', dot: '#818CF8' },
  snacks:    { label: 'Snacks',    color: '#9A3412', bg: '#FFF7ED', dot: '#F97316' },
};

/* ─── Sub-components ─────────────────────────────────────────────── */
const MealBadge = ({ type }) => {
  const cfg = mealConfig[type] || { label: type, color: T.inkMid, bg: T.bg, dot: T.borderHov };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label.toUpperCase()}
    </span>
  );
};

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
      <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.2, fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
    </div>
  </div>
);

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, marginBottom: 6, letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
    {children}
  </div>
);

const SectionHeading = ({ icon: Icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
    <Icon size={16} color={T.accent} />
    <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}>
      {children}
    </span>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────── */
const EnhancedMenuManagement = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [currentMenu, setCurrentMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [applyForm] = Form.useForm();
  const [selectingMenu, setSelectingMenu] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);

  // Define fetchMenus with useCallback so it can be used in useEffect safely
  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedMealType !== 'all') params.meal_type = selectedMealType;
      if (searchText) params.search = searchText;
      const response = await messAPI.getMenus(params);
      setMenus(response.data.data || []);
    } catch {
      message.error('Failed to fetch menus');
    } finally {
      setLoading(false);
    }
  }, [selectedMealType, searchText]);

  // Initial setup
  useEffect(() => {
    fetchItems();
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Trigger fetch whenever meal type changes (Fixes the "one step behind" issue)
  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      setItems(response.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingMenu) {
        await messAPI.updateMenu(editingMenu.id, values);
        message.success('Menu updated successfully');
      } else {
        await messAPI.createMenu(values);
        message.success('Menu created successfully');
      }
      setModalVisible(false);
      fetchMenus();
    } catch {
      message.error('Failed to save menu');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleViewMenu = async (menu) => {
    setLoading(true);
    try {
      const response = await messAPI.getMenuWithItems(menu.id);
      setCurrentMenu(response.data.data);
      setDrawerVisible(true);
    } catch {
      message.error('Failed to load menu details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete this menu?',
      content: 'This will permanently remove the menu and all associated items.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        await messAPI.deleteMenu(id);
        message.success('Menu removed');
        fetchMenus();
      },
    });
  };

  const handleApplyClick = (menu) => {
    setSelectingMenu(menu);
    applyForm.resetFields();
    setApplyModalVisible(true);
  };

  const handleApplySubmit = async (values) => {
    setApplyLoading(true);
    try {
      await messAPI.applyMenuDateRange(selectingMenu.id, {
        start_date: values.startDate.format('YYYY-MM-DD'),
        end_date: values.endDate.format('YYYY-MM-DD'),
        days: values.days || [],
      });
      message.success('Menu applied to selected days successfully');
      setApplyModalVisible(false);
      fetchMenus();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to apply menu');
    } finally {
      setApplyLoading(false);
    }
  };

  /* ── Table Columns ── */
  const columns = [
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>MENU NAME</span>,
      dataIndex: 'name',
      key: 'name',
      render: (t) => (
        <span style={{ fontWeight: 600, color: T.ink, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>{t}</span>
      ),
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>TYPE</span>,
      dataIndex: 'meal_type',
      key: 'meal_type',
      render: (text) => <MealBadge type={text} />,
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>COMPONENTS</span>,
      key: 'items',
      render: (_, record) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.inkMid, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <Utensils size={13} color={T.inkSoft} />
          {record.tbl_Menu_Items?.length || 0} items
        </span>
      ),
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>SERVINGS</span>,
      dataIndex: 'estimated_servings',
      key: 'estimated_servings',
      render: (t) => (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: t ? T.ink : T.inkSoft, fontWeight: 500 }}>
          {t || '—'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <ActionBtn icon={<Eye size={13}/>} onClick={() => handleViewMenu(record)}>View</ActionBtn>
          <ActionBtn icon={<Edit2 size={13}/>} onClick={() => { setEditingMenu(record); form.setFieldsValue(record); setModalVisible(true); }}>Edit</ActionBtn>
          <ActionBtn
            icon={<Calendar size={13}/>}
            onClick={() => handleApplyClick(record)}
            variant="primary"
          >Apply</ActionBtn>
          <ActionBtn icon={<Trash2 size={13}/>} onClick={() => handleDelete(record.id)} variant="danger" />
        </div>
      ),
    },
  ];

  /* ── Stats ── */
  const totalItems = menus.reduce((s, m) => s + (m.tbl_Menu_Items?.length || 0), 0);
  const mealCounts = Object.fromEntries(
    Object.keys(mealConfig).map(k => [k, menus.filter(m => m.meal_type === k).length])
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: T.accent,
          borderRadius: 8,
          fontFamily: "'DM Sans', sans-serif",
          colorBgContainer: T.surface,
          colorBorder: T.border,
          colorText: T.ink,
          colorTextSecondary: T.inkMid,
        },
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .pm-table .ant-table { background: transparent; font-family: 'DM Sans', sans-serif; }
        .pm-table .ant-table-thead > tr > th {
          background: #F7F8FA !important;
          border-bottom: 1px solid ${T.border} !important;
          padding: 11px 16px !important;
        }
        .pm-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid ${T.border} !important;
          padding: 14px 16px !important;
        }
        .pm-table .ant-table-tbody > tr:hover > td { background: #FAFBFC !important; }
        .pm-table .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
        .pm-table .ant-pagination { padding: 12px 16px; }
        .pm-action-btn { transition: all 0.15s ease; }
        .pm-action-btn:hover { transform: translateY(-1px); }
        .pm-form-input .ant-input,
        .pm-form-input .ant-input-number-input,
        .pm-form-input .ant-select-selector,
        .pm-form-input .ant-picker {
          font-family: 'DM Sans', sans-serif !important;
        }
        .pm-search-input .ant-input-prefix { color: ${T.inkSoft}; }
        .pm-modal .ant-modal-content { border-radius: 14px; overflow: hidden; }
        .pm-modal .ant-modal-header { border-bottom: 1px solid ${T.border}; padding: 18px 24px; }
        .pm-modal .ant-modal-body { padding: 24px; }
        .pm-drawer .ant-drawer-header { border-bottom: 1px solid ${T.border}; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Page Header ── */}
        <div style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: T.accentBg, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <ChefHat size={20} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>
                Menu Management
              </div>
              <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 1 }}>
                Create and manage standardized meal templates
              </div>
            </div>
          </div>

          <button
            onClick={() => { setEditingMenu(null); form.resetFields(); setModalVisible(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.accent, color: '#fff',
              border: 'none', borderRadius: 8, padding: '9px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: `0 2px 8px rgba(26,86,219,0.3)`,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1447BD'}
            onMouseLeave={e => e.currentTarget.style.background = T.accent}
          >
            <Plus size={16} />
            New Menu
          </button>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* ── Stats Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total Menus" value={menus.length} icon={LayoutGrid} accent />
            <StatCard label="Total Components" value={totalItems} icon={Utensils} />
            <StatCard label="Breakfast / Lunch" value={`${mealCounts.breakfast || 0} / ${mealCounts.lunch || 0}`} icon={ChefHat} />
            <StatCard label="Dinner / Snacks" value={`${mealCounts.dinner || 0} / ${mealCounts.snacks || 0}`} icon={UtensilsCrossed} />
          </div>

          {/* ── Filters ── */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.radius, padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, boxShadow: T.shadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={14} color={T.inkSoft} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft, marginRight: 4, letterSpacing: '0.04em' }}>
                FILTER
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', ...Object.keys(mealConfig)].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedMealType(type)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: `1px solid`,
                      borderColor: selectedMealType === type ? T.accent : T.border,
                      background: selectedMealType === type ? T.accentBg : 'transparent',
                      color: selectedMealType === type ? T.accent : T.inkMid,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'all 0.15s',
                    }}
                  >
                    {type === 'all' ? 'All' : mealConfig[type].label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.bg, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '7px 12px', width: 260,
            }}>
              <Search size={14} color={T.inkSoft} />
              <input
                placeholder="Search menus…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchMenus()}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, color: T.ink, fontFamily: "'DM Sans', sans-serif",
                  flex: 1,
                }}
              />
            </div>
          </div>

          {/* ── Table ── */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.radius, boxShadow: T.shadow, overflow: 'hidden',
          }}>
            <Table
              className="pm-table"
              columns={columns}
              dataSource={menus}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 8,
                style: { padding: '12px 16px' },
                size: 'small',
              }}
            />
          </div>
        </div>

        {/* ── Create / Edit Modal ── */}
        <Modal
          className="pm-modal"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {editingMenu ? <Edit2 size={15} color={T.accent} /> : <Plus size={15} color={T.accent} />}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>
                {editingMenu ? 'Edit Menu' : 'Create New Menu'}
              </span>
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={480}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="pm-form-input" style={{ marginTop: 4 }}>
            <Form.Item name="name" label={<FieldLabel>Menu Name</FieldLabel>} rules={[{ required: true }]}>
              <Input placeholder="e.g., Deluxe Veg Thali" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="meal_type" label={<FieldLabel>Meal Type</FieldLabel>} rules={[{ required: true }]}>
                  <Select style={{ borderRadius: 8 }}>
                    {Object.entries(mealConfig).map(([v, c]) => (
                      <Option key={v} value={v}>{c.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="estimated_servings" label={<FieldLabel>Est. Servings</FieldLabel>} rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={1} style={{ width: '100%', borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="preparation_time" label={<FieldLabel>Prep Time (minutes)</FieldLabel>}>
              <InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="description" label={<FieldLabel>Internal Notes</FieldLabel>}>
              <TextArea rows={3} placeholder="Optional instructions…" style={{ borderRadius: 8 }} />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.inkMid, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >Cancel</button>
              <button
                type="submit"
                disabled={confirmLoading}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: T.accent, color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 7,
                  opacity: confirmLoading ? 0.7 : 1,
                }}
              >
                <Save size={14} />
                {editingMenu ? 'Save Changes' : 'Create Menu'}
              </button>
            </div>
          </Form>
        </Modal>

        {/* ── Detail Drawer ── */}
        <Drawer
          className="pm-drawer"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Utensils size={16} color={T.accent} />
              <span style={{ fontWeight: 700, color: T.ink, fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>
                {currentMenu?.menu?.name}
              </span>
              {currentMenu?.menu?.meal_type && <MealBadge type={currentMenu.menu.meal_type} />}
            </div>
          }
          width={520}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          closeIcon={<X size={18} />}
        >
          {currentMenu && (
            <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                {[
                  { label: 'Meal Type', value: mealConfig[currentMenu.menu.meal_type]?.label || currentMenu.menu.meal_type, icon: Utensils },
                  { label: 'Prep Time', value: `${currentMenu.menu.preparation_time || 0} min`, icon: Clock },
                  { label: 'Servings', value: currentMenu.menu.estimated_servings || '—', icon: UtensilsCrossed },
                  { label: 'Components', value: `${currentMenu.menu_items?.length || 0} items`, icon: LayoutGrid },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} style={{
                    background: T.bg, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Icon size={12} color={T.inkSoft} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.inkSoft, letterSpacing: '0.05em' }}>{label.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{value}</div>
                  </div>
                ))}
              </div>

              <Divider style={{ margin: '0 0 20px' }} />
              <SectionHeading icon={Utensils}>Menu Components</SectionHeading>

              {currentMenu.menu_items?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                  {currentMenu.menu_items.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px', background: T.surface,
                      border: `1px solid ${T.border}`, borderRadius: 8,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: T.ink, fontSize: 13 }}>{item.tbl_Item?.name}</div>
                        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                           await messAPI.removeItemFromMenu(item.id);
                           handleViewMenu(currentMenu.menu);
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: T.inkSoft, padding: 4, borderRadius: 6,
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = T.danger}
                        onMouseLeave={e => e.currentTarget.style.color = T.inkSoft}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px 0 28px', textAlign: 'center', color: T.inkSoft, fontSize: 13 }}>
                  No components added yet
                </div>
              )}

              <Divider style={{ margin: '0 0 20px' }} />
              <SectionHeading icon={Plus}>Add Component</SectionHeading>

              <Form
                form={itemForm}
                layout="vertical"
                onFinish={async (v) => {
                  await messAPI.addItemsToMenu(currentMenu.menu.id, { items: [v] });
                  handleViewMenu(currentMenu.menu);
                  itemForm.resetFields();
                }}
                className="pm-form-input"
              >
                <Form.Item name="item_id" label={<FieldLabel>Raw Material</FieldLabel>} rules={[{ required: true }]}>
                  <Select showSearch placeholder="Search items…" optionFilterProp="children" style={{ borderRadius: 8 }}>
                    {items.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
                  </Select>
                </Form.Item>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="quantity" label={<FieldLabel>Quantity</FieldLabel>} rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%', borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="unit" label={<FieldLabel>Unit</FieldLabel>} rules={[{ required: true }]}>
                      <Input placeholder="kg, ltr, pcs…" style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                    background: T.accentBg, color: T.accent, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#D4E6FF'}
                  onMouseLeave={e => e.currentTarget.style.background = T.accentBg}
                >
                  <Plus size={15} /> Add to Menu
                </button>
              </Form>
            </div>
          )}
        </Drawer>

        {/* ── Apply Menu Modal ── */}
        <Modal
          className="pm-modal"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={15} color={T.success} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}>Apply Menu to Schedule</div>
                {selectingMenu && (
                  <div style={{ fontSize: 12, color: T.inkSoft, fontFamily: "'DM Sans', sans-serif" }}>{selectingMenu.name}</div>
                )}
              </div>
            </div>
          }
          open={applyModalVisible}
          onCancel={() => setApplyModalVisible(false)}
          footer={null}
          width={500}
        >
          <Form form={applyForm} layout="vertical" onFinish={handleApplySubmit} className="pm-form-input" style={{ marginTop: 8 }}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="startDate" label={<FieldLabel>Start Date</FieldLabel>} rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%', borderRadius: 8 }} placeholder="YYYY-MM-DD" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="endDate" label={<FieldLabel>End Date</FieldLabel>} rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%', borderRadius: 8 }} placeholder="YYYY-MM-DD" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="days" label={<FieldLabel>Days of the Week</FieldLabel>} rules={[{ required: true, message: 'Select at least one day' }]}>
              <Select
                mode="multiple"
                placeholder="Select days to apply…"
                style={{ borderRadius: 8 }}
                options={['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => ({ label: d, value: d }))}
              />
            </Form.Item>

            <div style={{
              background: '#EFF6FF', borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: '#3B5FB0', marginBottom: 20, lineHeight: 1.5,
            }}>
              <strong>How it works:</strong> The menu will be applied to every matching weekday within the date range.
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setApplyModalVisible(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.inkMid, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >Cancel</button>
              <button
                type="submit"
                disabled={applyLoading}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: T.success, color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 7,
                  opacity: applyLoading ? 0.7 : 1,
                }}
              >
                <Calendar size={14} />
                Apply Menu
              </button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

/* ── Shared Action Button ── */
const ActionBtn = ({ icon, children, onClick, variant }) => {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent', hover: '#1447BD' },
    danger:  { bg: T.dangerBg, color: T.danger, border: 'transparent', hover: '#FEE2E2' },
    default: { bg: T.surface, color: T.inkMid, border: T.border, hover: T.bg },
  };
  const s = styles[variant] || styles.default;

  return (
    <button
      className="pm-action-btn"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: children ? '5px 11px' : '5px 8px',
        borderRadius: 7, border: `1px solid ${s.border}`,
        background: s.bg, color: s.color,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 0.12s, transform 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = s.hover}
      onMouseLeave={e => e.currentTarget.style.background = s.bg}
    >
      {icon}{children}
    </button>
  );
};

export default EnhancedMenuManagement;