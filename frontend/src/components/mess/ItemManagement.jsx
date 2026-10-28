import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Space, Tag, Modal, Form, Input, Select, Row, Col, ConfigProvider, message, Segmented } from 'antd';
import { Package, Tags, Plus, Search, Edit2, RefreshCw, UploadCloud, Download } from 'lucide-react';
import { messAPI } from '../../services/api';
import InventoryPageHeader, { inventoryTheme } from './InventoryPageHeader';
import * as XLSX from 'xlsx';
import { downloadItemBulkImportTemplate, validateItemExcelImportHeaders, mapExcelRowToItem } from '../../utils/bulkImportUtils';

/* ─── Design Tokens (Synced with Enhanced Styles) ────────────────── */
const T = {
  bg:        '#F7F8FA',
  surface:   '#FFFFFF',
  border:    '#E8EAED',
  borderHov: '#C8CDD5',
  ink:       '#141820',
  inkMid:    '#4B5263',
  inkSoft:   '#8B92A5',
  accent:    '#2563eb',
  accentBg:  '#EBF2FF',
  danger:    '#DC2626',
  dangerBg:  '#FEF2F2',
  success:   '#16A34A',
  successBg: '#F0FDF4',
  radius:    '24px',
  shadow:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
};

/* ─── Sub-components ─────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, accent, variant }) => {
  const isDanger = variant === "danger";
  return (
    <div className="inventory-stat">
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: isDanger ? T.dangerBg : (accent ? T.accentBg : T.bg),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={isDanger ? T.danger : (accent ? T.accent : T.inkSoft)} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{value}</div>
        <div className="inventory-stat-label">{label}</div>
      </div>
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, marginBottom: 6, letterSpacing: '0.04em' }}>
    {children}
  </div>
);

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
  const [importingItems, setImportingItems] = useState(false);
  const fileInputRef = useRef(null);
  
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

  const triggerItemImport = () => fileInputRef.current?.click();

  const handleItemImportFile = async (file) => {
    setImportingItems(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        message.error('The Excel file does not contain any sheets.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      if (!rows.length) {
        message.error('The Excel file does not contain any rows.');
        return;
      }

      const headers = Object.keys(rows[0]);
      const validation = validateItemExcelImportHeaders(headers);
      if (!validation.isValid) {
        message.error(`Missing required columns: ${validation.missingColumns.join(', ')}`);
        return;
      }

      const parsedRows = rows.map((row, index) => ({
        rowNumber: index + 2,
        payload: mapExcelRowToItem(row, headers)
      }));

      const invalidRows = parsedRows.filter((row) => !row.payload);
      if (invalidRows.length) {
        message.error(`Invalid or incomplete rows: ${invalidRows.map((row) => row.rowNumber).join(', ')}`);
        return;
      }

      const payload = parsedRows.map((row) => row.payload);
      const response = await messAPI.createBulkItems({ items: payload });
      const result = response.data.data || {};

      if (result.created > 0) {
        message.success(`${result.created} material(s) imported successfully.`);
      }

      if (result.errors && result.errors.length > 0) {
        Modal.info({
          title: 'Import completed with warnings',
          content: (
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {result.errors.map((error) => (
                <div key={error.row} style={{ marginBottom: 8 }}>
                  Row {error.row}: {error.message}
                </div>
              ))}
            </div>
          ),
          width: 560
        });
      }

      if (!result.created && (!result.errors || result.errors.length === 0)) {
        message.info('No materials were imported from the file.');
      }

      fetchData();
    } catch (error) {
      console.error('Item import failed', error);
      message.error('Failed to import Excel file. Check the file format and try again.');
    } finally {
      setImportingItems(false);
    }
  };

  const handleItemImportChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    await handleItemImportFile(file);
  };

  const handleSaveItem = async (values) => {
    try {
      if (editingItem) {
        await messAPI.updateItem(editingItem.id, {
          ...values,
          unit_price: editingItem.unit_price ?? 0,
          maximum_quantity: editingItem.maximum_quantity ?? null,
        });
        message.success('Item updated');
      } else {
        await messAPI.createItem({ ...values, unit_price: 0 });
        message.success('New item added');
      }
      setModalVisible(false);
      fetchData();
    } catch (e) { message.error("Save failed"); }
  };

  const itemColumns = [
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>Item</span>,
      dataIndex: 'name',
      render: (t) => <span style={{ fontWeight: 600, color: T.ink }}>{t}</span>
    },
    { 
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>Category</span>,
      dataIndex: ['tbl_ItemCategory', 'name'], 
      render: t => <Tag bordered={false} style={{ background: T.accentBg, color: T.accent, fontWeight: 600, borderRadius: 6 }}>{t || 'General'}</Tag> 
    },
    {
      title: 'Unit',
      dataIndex: ['UOM', 'abbreviation'],
      render: (unit, item) => unit || item.UOM?.name || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: description => description || '-',
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button permissionAction="edit" icon={<Edit2 size={13}/>} onClick={() => { setEditingItem(record); form.setFieldsValue(record); setModalVisible(true); }}>Edit</Button>
        </Space>
      ),
    },
  ];

  const categoryColumns = [
    { title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>Category</span>, dataIndex: 'name', render: t => <span style={{ fontWeight: 600 }}>{t}</span> },
    { title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>Description</span>, dataIndex: 'description', render: d => <span style={{ color: T.inkSoft }}>{d || '-'}</span> },
    {
        title: '',
        align: 'right',
        render: (_, record) => (
          <Space>
            <Button permissionAction="edit" icon={<Edit2 size={13}/>} onClick={() => { setEditingCategory(record); categoryForm.setFieldsValue(record); setCategoryModalVisible(true); }}>Edit</Button>
          </Space>
        ),
      },
  ];

  return (
    <ConfigProvider theme={inventoryTheme}>
      <div className="module-page">
        
        {/* Page Header */}
        <InventoryPageHeader title="Items" description="Manage shared item names, categories, and units.">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleItemImportChange} />
            <Button permissionAction="create" icon={<UploadCloud size={16}/>} onClick={triggerItemImport} loading={importingItems}>
              {importingItems ? 'Importing...' : 'Import Excel'}
            </Button>
            <Button icon={<Download size={16}/>} onClick={() => downloadItemBulkImportTemplate()}>
              Download Template
            </Button>
            <Button icon={<RefreshCw size={16}/>} onClick={fetchData}>Refresh</Button>
            <Button permissionAction="create" type="primary" icon={<Plus size={16} />}
              onClick={() => activeTab === 'items' ? (() => { setEditingItem(null); form.resetFields(); setModalVisible(true); })() : (() => { setEditingCategory(null); categoryForm.resetFields(); setCategoryModalVisible(true); })()}
            >
              {activeTab === 'items' ? 'Add Item' : 'New Category'}
            </Button>
        </InventoryPageHeader>

        <div className="space-y-6">
          
          {/* Stats Row */}
          <div className="module-stat-grid inventory-master-stats">
            <StatCard label="Total Items" value={items.length} icon={Package} accent />
            <StatCard label="Categories" value={categories.length} icon={Tags} />
          </div>

          {/* Tab Switcher & Filter */}
          <div className="inventory-panel inventory-toolbar">
            <Segmented value={activeTab} onChange={setActiveTab} options={[
              { label: 'Items', value: 'items' }, { label: 'Categories', value: 'categories' },
            ]} />
            <Input className="inventory-search" prefix={<Search size={16} />} placeholder="Search items or categories..."
              value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
          </div>

          {/* Table Container */}
          <div className="inventory-panel inventory-table">
            <Table
              columns={activeTab === 'items' ? itemColumns : categoryColumns}
              dataSource={(activeTab === 'items' ? items : categories).filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()))}
              rowKey="id"
              loading={loading}
              pagination={{ defaultPageSize: 10, showSizeChanger: true }}
              scroll={{ x: 760 }}
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
              <span style={{ fontSize: 15, fontWeight: 700 }}>{editingItem ? 'Edit Item' : 'Add Item'}</span>
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={500}
        >
          <Form form={form} layout="vertical" onFinish={handleSaveItem} className="pm-form-input" style={{ marginTop: 12 }}>
            <Form.Item name="name" label={<FieldLabel>Item Name</FieldLabel>} rules={[{ required: true }]}>
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
            <Form.Item name="description" label={<FieldLabel>Description</FieldLabel>}>
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
