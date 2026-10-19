import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, ConfigProvider, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { messAPI } from '../../services/api';
import InventoryPageHeader, { inventoryTheme } from './InventoryPageHeader';
import PurchaseSuggestions from './PurchaseSuggestions';
import './InventoryHub.css';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errorText = error => error.response?.data?.message || 'Unable to load purchase orders. Please retry.';
const emptyLine = () => ({ item_id: undefined, quantity: null, unit_price: null });

export default function PurchaseOrder() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('received');
  const [form] = Form.useForm();
  const lines = Form.useWatch('items', form) || [];
  const total = lines.reduce((sum, line) => sum + Number(line?.quantity || 0) * Number(line?.unit_price || 0), 0);

  async function load() {
    setLoading(true); setError('');
    try {
      const [history, master, suppliers] = await Promise.all([
        messAPI.getReceivedPurchaseOrders(), messAPI.getItems(), messAPI.getStores({ is_active: true }),
      ]);
      setOrders(history.data.data || []); setItems(master.data.data || []); setStores(suppliers.data.data || []);
    } catch (failure) { setError(errorText(failure)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function start(suggestion) {
    form.resetFields();
    form.setFieldsValue({ items: [suggestion ? { item_id: suggestion.item_id, quantity: suggestion.recommended_quantity ?? suggestion.quantity_needed, unit_price: null } : emptyLine()] });
    setOpen(true);
  }
  async function save(values) {
    if (saving) return;
    const ids = values.items.map(line => line.item_id);
    if (new Set(ids).size !== ids.length) { message.error('Choose each item only once.'); return; }
    setSaving(true);
    try {
      await messAPI.receivePurchaseOrder({ order_reference: values.order_reference.trim(), store_id: values.store_id, items: values.items });
      message.success('Order received. Stock and unit rates updated; no daily expense was added.');
      setOpen(false); form.resetFields(); setTab('received'); await load();
    } catch (failure) { message.error(failure.response?.data?.message || 'Unable to receive this order. Please retry.'); }
    finally { setSaving(false); }
  }
  const filtered = useMemo(() => orders.filter(order => `${order.order_reference} ${order.store_name} ${order.items.map(line => line.item_name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())), [orders, search]);
  const lineColumns = [
    { title: 'Item', dataIndex: 'item_name' },
    { title: 'Received quantity', render: (_, line) => `${line.quantity} ${line.unit}` },
    { title: 'Purchase rate', dataIndex: 'unit_price', render: money },
    { title: 'Line total', dataIndex: 'total', render: money },
  ];
  return <ConfigProvider theme={inventoryTheme}><section className="inventory-hub">
    <InventoryPageHeader title="Purchase Orders" description="Record received orders to add stock. Ingredient costs enter daily mess calculations when consumed.">
      <Button icon={<RefreshCw size={16} />} onClick={load} loading={loading}>Refresh</Button>
      <Button type="primary" icon={<Plus size={16} />} disabled={loading || !!error} onClick={() => start()}>Record received order</Button>
    </InventoryPageHeader>
    {error && <Alert showIcon type="error" title={error} style={{ marginBottom: 20 }} />}
    <Tabs activeKey={tab} onChange={setTab} destroyOnHidden items={[
      { key: 'received', label: 'Received Orders', children: <Card>
        <Input.Search allowClear aria-label="Search received orders" placeholder="Search order, supplier or item" value={search} onChange={event => setSearch(event.target.value)} style={{ maxWidth: 420, marginBottom: 20 }} />
        <Table rowKey="key" loading={loading} dataSource={filtered} scroll={{ x: 720 }} pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          columns={[
            { title: 'Order reference', dataIndex: 'order_reference' }, { title: 'Supplier store', dataIndex: 'store_name' },
            { title: 'Received on', dataIndex: 'received_date' }, { title: 'Total purchase value', dataIndex: 'total_amount', render: money },
            { title: 'Status', render: () => <Tag color="green">Received</Tag> },
          ]} expandable={{ expandedRowRender: order => <Table columns={lineColumns} rowKey="id" dataSource={order.items} pagination={false} /> }}
          locale={{ emptyText: 'No received orders recorded yet. Existing direct purchases remain in Purchase History.' }} />
      </Card> },
      { key: 'suggestions', label: 'Purchase Suggestions', children: <PurchaseSuggestions onReceiveItem={start} /> },
    ]} />
    <Modal title="Record received purchase order" open={open} width={920} onCancel={() => !saving && setOpen(false)}
      onOk={() => form.submit()} okText="Confirm receipt & add stock" confirmLoading={saving} closable={!saving} maskClosable={!saving} cancelButtonProps={{ disabled: saving }}>
      <Alert type="info" showIcon title="Save only after the items have arrived."
        description="This adds the received quantities to the selected inventory and records their purchase rates. It does not create a Daily Expenses entry. Ingredient consumption is costed separately." style={{ marginBottom: 20 }} />
      <Form form={form} layout="vertical" name="received-purchase-order" onFinish={save} disabled={saving}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <Form.Item name="order_reference" label="Order reference" rules={[{ required: true, whitespace: true, message: 'Enter the order reference.' }, { pattern: /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,79}$/, message: 'Use up to 80 letters, numbers, spaces, dots, slashes, underscores or hyphens.' }]}>
            <Input placeholder="e.g. PO-2026-001" maxLength={80} />
          </Form.Item>
          <Form.Item name="store_id" label="Supplier store" rules={[{ required: true, message: 'Choose a supplier store.' }]}>
            <Select showSearch optionFilterProp="label" options={stores.map(store => ({ value: store.id, label: store.name }))} placeholder="Select store" />
          </Form.Item>
        </div>
        <Form.List name="items" rules={[{ validator: (_, value) => value?.length ? Promise.resolve() : Promise.reject(new Error('Add at least one item.')) }]}>
          {(fields, { add, remove }, { errors }) => <>
            {fields.map(field => <div key={field.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
              <Form.Item name={[field.name, 'item_id']} label="Item" style={{ flex: '2 1 220px' }} rules={[{ required: true, message: 'Choose an item.' }]}>
                <Select showSearch optionFilterProp="label" options={items.map(item => ({ value: item.id, label: `${item.name} (${item.UOM?.abbreviation || 'unit'})` }))} placeholder="Select item" />
              </Form.Item>
              <Form.Item name={[field.name, 'quantity']} label="Received quantity" style={{ flex: '1 1 140px' }} rules={[{ required: true, type: 'number', min: 0.01, max: 99999999.99, message: 'Enter a positive quantity.' }]}>
                <InputNumber min={0.01} max={99999999.99} precision={2} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name={[field.name, 'unit_price']} label="Purchase rate (₹ / unit)" style={{ flex: '1 1 140px' }} rules={[{ required: true, type: 'number', min: 0, max: 99999999.99, message: 'Enter the purchase rate.' }]}>
                <InputNumber min={0} max={99999999.99} precision={2} style={{ width: '100%' }} />
              </Form.Item>
              <Button danger type="text" aria-label={`Remove item ${field.name + 1}`} icon={<Trash2 size={16} />} onClick={() => remove(field.name)} style={{ marginTop: 30 }} />
            </div>)}
            <Form.ErrorList errors={errors} />
            <Button icon={<Plus size={16} />} onClick={() => add(emptyLine())} disabled={saving || fields.length >= 200}>Add item</Button>
          </>}
        </Form.List>
        <Typography.Paragraph style={{ marginTop: 20 }}><Typography.Text strong>Total purchase value: {money(total)}</Typography.Text></Typography.Paragraph>
      </Form>
    </Modal>
  </section></ConfigProvider>;
}
