import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Table, message } from 'antd';
import { wardenAPI } from '../../services/api';
import { Layers, Pencil, Trash2 } from 'lucide-react';
import { useScopeForm } from '../common/WorkspaceScope';

export default function WardenRoomTemplates() {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const working = saving || deleting !== null;
  useScopeForm(form, open, working);
  const errorText = err => err.response?.data?.message || err.message || 'Unable to load room templates.';

  const start = async () => {
    form.resetFields();
    setEditing(null);
    setError('');
    setOpen(true);
    setLoading(true);
    try {
      const response = await wardenAPI.getRoomTypes();
      setTemplates(response.data.data || []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const save = async values => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(), capacity: values.capacity, description: values.description?.trim() || ''
      };
      const response = editing
        ? await wardenAPI.updateRoomType(editing.id, payload)
        : await wardenAPI.createRoomType(payload);
      const template = response.data.data;
      setTemplates(previous => previous.some(item => item.id === template.id)
        ? previous.map(item => item.id === template.id ? template : item)
        : [...previous, template]);
      form.resetFields();
      setEditing(null);
      message.success(editing ? 'Room template updated.' : response.status === 200 ? 'A template with this name already exists. Its settings are shown below.' : 'Room template created. You can now select it when creating rooms.');
    } catch (err) {
      message.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = template => {
    Modal.confirm({
      title: `Delete ${template.name}?`,
      okText: 'Delete Template', okButtonProps: { danger: true },
      onOk: async () => {
        setDeleting(template.id);
        try {
          await wardenAPI.deleteRoomType(template.id);
          setTemplates(previous => previous.filter(item => item.id !== template.id));
          if (editing?.id === template.id) { setEditing(null); form.resetFields(); }
          message.success('Room template deleted.');
        } catch (err) {
          message.error(errorText(err));
          throw err;
        } finally { setDeleting(null); }
      }
    });
  };

  return <>
    <Button size="large" icon={<Layers size={17} />} className="!rounded-xl !text-sm !font-semibold !text-slate-600" onClick={start}>Manage Room Templates</Button>
    <Modal title="Manage Room Templates" open={open} width={780} footer={null} closable={!working}
      mask={{ closable: !working }} onCancel={() => { if (!working) setOpen(false); }}>
      {error && <Alert className="mb-4" type="error" showIcon title={error} />}
      <h3 className="font-semibold mb-3">{editing ? 'Edit Template' : 'Add Template'}</h3>
      <Form form={form} layout="vertical" onFinish={save} disabled={working || loading}>
        <Form.Item name="name" label="Template Name" rules={[{ required: true, whitespace: true, max: 100, message: 'Enter a template name (up to 100 characters)' }]}>
          <Input maxLength={100} placeholder="e.g. Double Room" />
        </Form.Item>
        <Form.Item name="capacity" label="Student Capacity" rules={[{ required: true }, { type: 'integer', min: 1, max: 1000, message: 'Enter a whole number from 1 to 1000' }]}>
          <InputNumber min={1} max={1000} precision={0} className="w-full" placeholder="e.g. 2" />
        </Form.Item>
        <Form.Item name="description" label="Description (optional)"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
        <div className="flex gap-2">
          <Button permissionAction={editing ? 'edit' : 'create'} type="primary" htmlType="submit" loading={saving} disabled={loading || deleting !== null}>{editing ? 'Update Template' : 'Save Template'}</Button>
          {editing && <Button disabled={working} onClick={() => { setEditing(null); form.resetFields(); }}>Cancel Edit</Button>}
        </div>
      </Form>
      <h3 className="font-semibold mt-5 mb-3">Existing Templates</h3>
      <Table size="small" rowKey="id" dataSource={templates} loading={loading} scroll={{ x: 620 }} pagination={{ pageSize: 5 }} columns={[
        { title: 'Template Name', dataIndex: 'name' },
        { title: 'Capacity', dataIndex: 'capacity' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Actions', key: 'actions', width: 180, render: (_, template) => <div className="flex items-center gap-1">
          <Button type="text" icon={<Pencil size={15} />} disabled={working || loading}
            onClick={() => { setEditing(template); form.setFieldsValue({ name: template.name, capacity: template.capacity, description: template.description || '' }); }}>Edit</Button>
          <Button permissionAction="delete" danger type="text" icon={<Trash2 size={15} />} loading={deleting === template.id} disabled={working || loading} onClick={() => deleteTemplate(template)}>Delete</Button>
        </div> }
      ]} />
    </Modal>
  </>;
}
