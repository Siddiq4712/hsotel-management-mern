import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { adminAPI, inventoryAPI } from '../../services/api';

export default function ManageInventories() {
  const [inventories, setInventories] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [inventoryResponse, hostelResponse] = await Promise.all([inventoryAPI.list(), adminAPI.getHostels()]);
      setInventories(inventoryResponse.data.data || []);
      setHostels(hostelResponse.data.data || []);
    } catch (error) { setError(error.response?.data?.message || 'Unable to load inventories.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const open = inventory => {
    setEditing(inventory || {});
    form.setFieldsValue({ name: inventory?.name || '', description: inventory?.description || '', hostel_ids: inventory?.hostels.map(hostel => hostel.id) || [],
      billing_mode: inventory?.billing_policy?.mode || (inventory?.id ? 'hostel' : 'shared'), effective_month: dayjs() });
  };
  const remove = inventory => {
    Modal.confirm({ title: `Delete ${inventory.name}?`,
      content: 'This permanently deletes the inventory. Assigned hostels, stock, or history will prevent deletion.',
      okText: 'Delete inventory', okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingId(inventory.id);
        try {
          await inventoryAPI.delete(inventory.id);
          if (sessionStorage.getItem('selectedInventoryId') === String(inventory.id)) sessionStorage.removeItem('selectedInventoryId');
          message.success('Inventory deleted.');
          await load();
        } catch (error) { message.error(error.response?.data?.message || 'Unable to delete inventory.'); throw error; }
        finally { setDeletingId(null); }
      },
    });
  };
  const save = values => {
    const affected = inventories.filter(pool => pool.id !== editing.id && pool.hostels.length && pool.hostels.every(hostel => values.hostel_ids.includes(hostel.id)));
    Modal.confirm({ title: 'Save inventory and hostel assignments?',
      content: affected.length
        ? `Stock and purchase batches from ${affected.map(pool => pool.name).join(', ')} will be combined into ${values.name}. Existing consumption and finalized bills are preserved.`
        : 'Selected hostels will draw from this inventory. When moving only part of an existing hostel group, stock stays in the original inventory.',
      okText: affected.length ? 'Combine stock & save' : 'Save assignments',
      onOk: async () => {
        setSaving(true);
        try {
          const payload = { ...values, effective_month: values.effective_month.format('YYYY-MM'), combine_stock: affected.length > 0 };
          if (editing.id) await inventoryAPI.update(editing.id, payload);
          else await inventoryAPI.create(payload);
          message.success('Inventory and hostel assignments saved.');
          setEditing(null); await load();
          sessionStorage.removeItem('selectedInventoryId');
        } catch (error) { message.error(error.response?.data?.message || error.message || 'Unable to save inventory.'); throw error; }
        finally { setSaving(false); }
      },
    });
  };
  return <div className="module-page">
    <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 20 }}>
      <div><Typography.Title level={3}>Manage Inventories</Typography.Title>
        <Typography.Text>Shared item names, separate stock balances per inventory. Assign one or more hostels to each inventory.</Typography.Text></div>
      <Space><Button onClick={load} loading={loading}>Refresh</Button><Button type="primary" onClick={() => open()}>Create inventory</Button></Space>
    </Space>
    {error && <Alert type="error" showIcon title={error} />}
    <Table rowKey="id" loading={loading} dataSource={inventories} columns={[
      { title: 'Inventory', dataIndex: 'name' },
      { title: 'Consumption & billing', render: (_, pool) => <Space orientation="vertical">
        <Tag color={pool.billing_policy?.mode === 'shared' ? 'blue' : 'default'}>{pool.billing_policy?.mode === 'shared' ? 'Shared inventory rate' : 'Hostel-wise attribution'}</Tag>
        {(pool.billing_policies || []).filter(policy => policy.effective_from > dayjs().startOf('month').format('YYYY-MM-DD')).map(policy => <Typography.Text key={policy.id} type="secondary">{policy.effective_from.slice(0, 7)}: {policy.mode === 'shared' ? 'Shared inventory' : 'Hostel-wise'}</Typography.Text>)}
      </Space> },
      { title: 'Assigned hostels', render: (_, pool) => pool.hostels.length ? pool.hostels.map(hostel => <Tag key={hostel.id}>{hostel.name}</Tag>) : 'No hostels assigned' },
      { title: 'Description', dataIndex: 'description' },
      { title: 'Action', render: (_, pool) => <Space>
        <Button disabled={Boolean(deletingId)} onClick={() => open(pool)}>Edit / assign hostels</Button>
        <Button danger loading={deletingId === pool.id} disabled={Boolean(deletingId) || pool.hostels.length > 0}
          title={pool.hostels.length ? 'Reassign all hostels before deleting this inventory.' : 'Delete inventory'}
          onClick={() => remove(pool)}>Delete</Button>
      </Space> },
    ]} />
    <Modal title={editing?.id ? 'Edit inventory and assignments' : 'Create inventory'} open={Boolean(editing)}
      onCancel={() => !saving && setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} okText="Review & save">
      <Alert type="info" showIcon title="One inventory can supply multiple hostels"
        description="Each hostel uses one inventory. Moving an entire hostel group combines its stock with the destination inventory after confirmation. To remove a hostel, assign it to another inventory." style={{ marginBottom: 16 }} />
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="name" label="Inventory name" rules={[{ required: true, whitespace: true }, { max: 150 }]}><Input /></Form.Item>
        <Form.Item name="hostel_ids" label="Assigned hostels" rules={[{ required: true, type: 'array', min: 1 }]}>
          <Select mode="multiple" placeholder="Select hostels" optionFilterProp="label" options={hostels.map(hostel => ({ value: hostel.id,
            label: `${hostel.name}${inventories.find(pool => pool.hostels.some(row => row.id === hostel.id)) ? ` — ${inventories.find(pool => pool.hostels.some(row => row.id === hostel.id)).name}` : ''}` }))} />
        </Form.Item>
        <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="billing_mode" label="Consumption and billing mode" rules={[{ required: true }]}>
          <Select options={[{ value: 'shared', label: 'Shared inventory — combined reports and one daily rate' }, { value: 'hostel', label: 'Hostel-wise attribution — separate reports and rates' }]} />
        </Form.Item>
        <Form.Item name="effective_month" label="Effective billing month" rules={[{ required: true }]} extra="Earlier months are allowed when every affected month has no consumption, expenses, meal entries, or finalized bills. Hostel assignments must stay unchanged.">
          <DatePicker picker="month" allowClear={false} minDate={dayjs('1900-01-01')} maxDate={dayjs('2100-12-31')} />
        </Form.Item>
      </Form>
    </Modal>
  </div>;
}
