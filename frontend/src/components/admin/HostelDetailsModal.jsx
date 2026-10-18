import React, { useEffect, useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Spin, Switch, message } from 'antd';
import { adminAPI } from '../../services/api';

export default function HostelDetailsModal({ hostelId, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!hostelId) return;
    let cancelled = false;
    setLoading(true); setError(''); form.resetFields();
    adminAPI.getHostelById(hostelId).then(response => {
      if (cancelled) return;
      const hostel = response.data.data;
      form.setFieldsValue({ name: hostel.name, address: hostel.address || '', contact_number: hostel.contact_number || '',
        email: hostel.email || '', capacity: Number(hostel.capacity), is_active: Boolean(hostel.is_active) });
    }).catch(error => {
      if (!cancelled) setError(error.response?.data?.message || 'Unable to load hostel details. Close and try again.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hostelId, form]);
  const save = async values => {
    if (loading || saving || error) return;
    setSaving(true);
    try {
      await adminAPI.updateHostel(hostelId, values);
      message.success('Hostel details updated.');
      onSaved();
    } catch (error) { message.error(error.response?.data?.message || 'Unable to update hostel details.'); }
    finally { setSaving(false); }
  };
  return <Modal title="Edit hostel details" open={Boolean(hostelId)} onCancel={() => !saving && onClose()}
    onOk={() => form.submit()} okText="Save changes" confirmLoading={saving}
    okButtonProps={{ disabled: loading || Boolean(error) }} cancelButtonProps={{ disabled: saving }}
    closable={!saving} mask={{ closable: !saving }} keyboard={!saving}>
    {loading && <Spin />}
    {error && <Alert type="error" showIcon title={error} />}
    <Form form={form} layout="vertical" onFinish={save} disabled={loading || saving || Boolean(error)}>
      <Form.Item name="name" label="Hostel name" rules={[{ required: true, whitespace: true }, { max: 255 }]}><Input /></Form.Item>
      <Form.Item name="address" label="Address"><Input.TextArea rows={3} /></Form.Item>
      <Form.Item name="contact_number" label="Contact number"><Input maxLength={255} /></Form.Item>
      <Form.Item name="email" label="Email" rules={[{ type: 'email' }, { max: 255 }]}><Input /></Form.Item>
      <Form.Item name="capacity" label="Bed capacity" rules={[{ required: true }, { type: 'integer', min: 1, max: 2147483647 }]}>
        <InputNumber min={1} max={2147483647} precision={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="is_active" label="Active hostel" valuePropName="checked"><Switch /></Form.Item>
    </Form>
  </Modal>;
}
