import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form,
  Input, Select, InputNumber, Typography, Row, Col, 
  ConfigProvider, theme, Skeleton, Divider, message
} from 'antd';
import {
  Package, Tags, Plus, Search, Edit2, 
  Database, Boxes, Info, CheckCircle2, X, RefreshCw, 
  Layers, AlertTriangle, Calculator, DollarSign
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

/* ─── Design Tokens (Synced with Enhanced Styles) ────────────────── */
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
  radius:    '12px',
  shadow:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
};

/* ─── Sub-components ─────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, accent, variant }) => {
  const isDanger = variant === "danger";
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16, boxShadow: T.shadow,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: isDanger ? T.dangerBg : (accent ? T.accentBg : T.bg),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={isDanger ? T.danger : (accent ? T.accent : T.inkSoft)} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, fontWeight: 600 }}>{label.toUpperCase()}</div>
      </div>
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, marginBottom: 6, letterSpacing: '0.04em' }}>
    {children}
  </div>
);

const ActionBtn = ({ icon, children, onClick, variant }) => {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent', hover: '#1447BD' },
    danger:  { bg: T.dangerBg, color: T.danger, border: 'transparent', hover: '#FEE2E2' },
    default: { bg: T.surface, color: T.inkMid, border: T.border, hover: T.bg },
  };
  const s = styles[variant] || styles.default;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: children ? '6px 12px' : '7px',
        borderRadius: 8, border: `1px solid ${s.border}`,
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
const ItemManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUOMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'categories'
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, cRes, uRes] = await Promise.all([
        messAPI.getItems(),
        messAPI.getItemCategories(),
        messAPI.getUOMs()
      ]);
      setItems(iRes.data.data || []);
      setCategories(cRes.data.data || []);
      setUOMs(uRes.data.data || []);
    } catch (error) {
      message.error('Inventory fetch failed');
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

  const stats = useMemo(() => {
    const lowStock = items.filter(i => parseFloat(i.stock_quantity || 0) < 10).length;
    const inventoryValue = items.reduce((acc, curr) => acc + (parseFloat(curr.stock_quantity || 0) * parseFloat(curr.unit_price || 0)), 0);
    return { lowStock, inventoryValue };
  }, [items]);

  const handleSaveItem = async (values) => {
    try {
      if (editingItem) {
        await messAPI.updateItem(editingItem.id, values);
        message.success('Item updated');
      } else {
        await messAPI.createItem(values);
        message.success('New item added');
      }
      setModalVisible(false);
      fetchData();
    } catch (e) { message.error("Save failed"); }
  };

  const itemColumns = [
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>MATERIAL NAME</span>,
      dataIndex: 'name',
      render: (t) => <span style={{ fontWeight: 600, color: T.ink }}>{t}</span>
    },
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>CATEGORY</span>,
      dataIndex: ['tbl_ItemCategory', 'name'], 
      render: t => <Tag bordered={false} style={{ background: T.accentBg, color: T.accent, fontWeight: 600, borderRadius: 6 }}>{t || 'General'}</Tag> 
    },
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>STOCK LEVEL</span>,
      key: 'stock', 
      render: (_, r) => {
        const qty = parseFloat(r.stock_quantity || 0);
        const isLow = qty < 10;
        return (
          <div>
            <div style={{ fontWeight: 700, color: isLow ? T.danger : T.success, fontSize: 15 }}>
              {qty.toFixed(2)}
              <span style={{ fontSize: 11, color: T.inkSoft, marginLeft: 4, fontWeight: 500 }}>{r.UOM?.abbreviation}</span>
            </div>
            {isLow && <div style={{ fontSize: 10, color: T.danger, fontWeight: 600 }}>LOW STOCK</div>}
          </div>
        );
      }
    },
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>UNIT PRICE</span>,
      dataIndex: 'unit_price', 
      render: p => <span style={{ fontFamily: 'DM Mono', fontWeight: 600 }}>₹{parseFloat(p || 0).toFixed(2)}</span> 
    },
    {
      title: '',
      align: 'right',
      render: (_, record) => (
        <Space>
          <ActionBtn icon={<Edit2 size={13}/>} onClick={() => { setEditingItem(record); form.setFieldsValue(record); setModalVisible(true); }}>Edit</ActionBtn>
        </Space>
      ),
    },
  ];

  const categoryColumns = [
    { title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>CATEGORY NAME</span>, dataIndex: 'name', render: t => <span style={{ fontWeight: 600 }}>{t}</span> },
    { title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>DESCRIPTION</span>, dataIndex: 'description', render: d => <span style={{ color: T.inkSoft }}>{d || '-'}</span> },
    {
        title: '',
        align: 'right',
        render: (_, record) => (
          <Space>
            <ActionBtn icon={<Edit2 size={13}/>} onClick={() => { setEditingCategory(record); categoryForm.setFieldsValue(record); setCategoryModalVisible(true); }}>Edit</ActionBtn>
          </Space>
        ),
      },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.accent, borderRadius: 8, fontFamily: "'DM Sans', sans-serif" } }}>
      <style>{`
        .pm-table .ant-table-thead > tr > th { background: #F7F8FA !important; border-bottom: 1px solid ${T.border} !important; padding: 12px 16px !important; }
        .pm-table .ant-table-tbody > tr > td { padding: 14px 16px !important; border-bottom: 1px solid ${T.border} !important; }
        .pm-form-input .ant-input, .pm-form-input .ant-select-selector, .pm-form-input .ant-input-number { border-radius: 8px !important; }
        .pm-modal .ant-modal-content { border-radius: 14px; overflow: hidden; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 40 }}>
        
        {/* Page Header */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>Inventory Master</div>
              <div style={{ fontSize: 12, color: T.inkSoft }}>Real-time stock tracking and raw material control</div>
            </div>
          </div>
          <Space>
            <ActionBtn icon={<RefreshCw size={14}/>} onClick={fetchData}>Sync Stock</ActionBtn>
            <button
              onClick={() => activeTab === 'items' ? (() => { setEditingItem(null); form.resetFields(); setModalVisible(true); })() : (() => { setEditingCategory(null); categoryForm.resetFields(); setCategoryModalVisible(true); })()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none',
                borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: `0 2px 8px rgba(26,86,219,0.3)`,
              }}
            >
              <Plus size={16} /> {activeTab === 'items' ? 'Add Material' : 'New Category'}
            </button>
          </Space>
        </div>

        <div style={{ padding: '28px 32px' }}>
          
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total Materials" value={items.length} icon={Package} accent />
            <StatCard label="Low Stock Items" value={stats.lowStock} icon={AlertTriangle} variant={stats.lowStock > 0 ? "danger" : "default"} />
            <StatCard label="Categories" value={categories.length} icon={Tags} />
            <StatCard label="Est. Stock Value" value={`₹${stats.inventoryValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} icon={DollarSign} />
          </div>

          {/* Tab Switcher & Filter */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
            padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, boxShadow: T.shadow
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['items', 'categories'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, border: 'none',
                    background: activeTab === tab ? T.accentBg : 'transparent',
                    color: activeTab === tab ? T.accent : T.inkMid,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s'
                  }}
                >
                  {tab === 'items' ? 'Items Master' : 'Material Categories'}
                </button>
              ))}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 12px', width: 280 }}>
              <Search size={14} color={T.inkSoft} />
              <input
                placeholder="Search inventory..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: T.ink, width: '100%' }}
              />
            </div>
          </div>

          {/* Table Container */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', boxShadow: T.shadow }}>
            <Table
              className="pm-table"
              columns={activeTab === 'items' ? itemColumns : categoryColumns}
              dataSource={(activeTab === 'items' ? items : categories).filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()))}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, size: 'small' }}
            />
          </div>
        </div>

        {/* Item Modal */}
        <Modal
          className="pm-modal"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={15} color={T.accent} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{editingItem ? 'Update Material' : 'Add New Material'}</span>
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={500}
        >
          <Form form={form} layout="vertical" onFinish={handleSaveItem} className="pm-form-input" style={{ marginTop: 12 }}>
            <Form.Item name="name" label={<FieldLabel>Material Name</FieldLabel>} rules={[{ required: true }]}>
              <Input placeholder="e.g., Basmati Rice" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="category_id" label={<FieldLabel>Category</FieldLabel>} rules={[{ required: true }]}>
                  <Select placeholder="Select category" options={categories.map(c => ({label: c.name, value: c.id}))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="unit_id" label={<FieldLabel>Base UOM</FieldLabel>} rules={[{ required: true }]}>
                  <Select placeholder="Select unit" options={uoms.map(u => ({label: `${u.name} (${u.abbreviation})`, value: u.id}))} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="unit_price" label={<FieldLabel>Avg. Purchase Price (₹)</FieldLabel>} rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} precision={2} />
            </Form.Item>
            <Form.Item name="description" label={<FieldLabel>Internal Notes</FieldLabel>}>
              <Input.TextArea rows={3} placeholder="Storage requirements or instructions..." />
            </Form.Item>
          </Form>
        </Modal>

        {/* Category Modal */}
        <Modal 
          className="pm-modal"
          title="Configure Category" 
          open={categoryModalVisible} 
          onCancel={() => setCategoryModalVisible(false)} 
          onOk={() => categoryForm.submit()}
        >
          <Form form={categoryForm} layout="vertical" onFinish={(v) => messAPI.createItemCategory(v).then(fetchData).then(() => setCategoryModalVisible(false))} className="pm-form-input">
            <Form.Item name="name" label={<FieldLabel>Category Name</FieldLabel>} rules={[{required: true}]}><Input placeholder="e.g., Dairy" /></Form.Item>
            <Form.Item name="description" label={<FieldLabel>Description</FieldLabel>}><Input.TextArea rows={3} /></Form.Item>
          </Form>
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default ItemManagement;