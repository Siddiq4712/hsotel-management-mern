import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Typography, message } from 'antd';
import { adminAPI } from '../../services/api';

const roleName = value => {
  const name = String(value || '').trim().toLowerCase();
  return ['mess', 'messstaff', 'mess staff'].includes(name) ? 'mess' : name;
};

export default function StaffAccessSettings() {
  const [staff, setStaff] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState();
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [users, units, accessRoles] = await Promise.all([
        adminAPI.getStaffAccess(), adminAPI.getHostels(), adminAPI.getRoles()
      ]);
      setStaff(users.data.data || []);
      setHostels(units.data.data || []);
      setRoles((accessRoles.data.data || []).filter(role => ['warden', 'mess'].includes(roleName(role.roleName))));
    } catch (err) {
      setError(err.message || 'Unable to load staff access settings.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await adminAPI.updateStaffAccess(editing.userId, values);
      message.success('Staff access updated. Role changes require the staff member to sign in again.');
      setEditing(null);
      await load();
    } catch (err) {
      if (!err.errorFields) message.error(err.message || 'Unable to update staff access.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = staff.filter(user =>
    (!hostelFilter || Number(user.hostel_id) === Number(hostelFilter)) &&
    `${user.userName} ${user.userMail}`.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="module-page p-8">
      <Typography.Title level={2}>Staff Access Settings</Typography.Title>
      <Typography.Paragraph>Assign each warden and mess user to one hostel. Reassign staff when their responsibilities change.</Typography.Paragraph>
      <Alert type="info" showIcon className="mb-6" message="Hostel assignments apply on the next request. Changing a role requires the staff member to sign in again. Historical hostel records stay with their original hostel." />
      {error && <Alert type="error" showIcon message={error} className="mb-4" />}
      <Card>
        <Space wrap className="mb-4">
          <Input aria-label="Search staff" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} allowClear />
          <Select aria-label="Filter by hostel" placeholder="All hostels" allowClear style={{ minWidth: 200 }} value={hostelFilter} onChange={setHostelFilter}
            options={hostels.map(hostel => ({ value: hostel.id, label: hostel.name }))} />
          <Button onClick={load} loading={loading}>Refresh</Button>
        </Space>
        <Table rowKey="userId" loading={loading} dataSource={filtered} scroll={{ x: 700 }} columns={[
          { title: 'Staff member', dataIndex: 'userName' },
          { title: 'Email', dataIndex: 'userMail' },
          { title: 'Permission / role', render: (_, user) => roleName(user.role?.roleName) === 'warden' ? 'Warden' : 'Mess user' },
          { title: 'Assigned hostel', render: (_, user) => user.Hostel?.name || hostels.find(hostel => Number(hostel.id) === Number(user.hostel_id))?.name || 'Unassigned' },
          { title: 'Action', render: (_, user) => <Button onClick={() => {
            setEditing(user);
            form.setFieldsValue({ roleId: user.roleId, hostel_id: user.hostel_id });
          }}>Edit access</Button> }
        ]} locale={{ emptyText: 'No warden or mess users found. Add staff through Create User.' }} />
      </Card>
      <Modal title={`Edit access: ${editing?.userName || ''}`} open={Boolean(editing)} onCancel={() => { if (!saving) setEditing(null); }} onOk={save} okText="Save access" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving}>
        <Form form={form} layout="vertical">
          <Form.Item label="Permission / role" name="roleId" rules={[{ required: true, message: 'Select a role.' }]}>
            <Select options={roles.map(role => ({ value: role.roleId, label: roleName(role.roleName) === 'warden' ? 'Warden' : 'Mess user' }))} />
          </Form.Item>
          <Form.Item label="Assigned hostel" name="hostel_id" rules={[{ required: true, message: 'Select a hostel.' }]}>
            <Select options={hostels.filter(hostel => hostel.is_active !== false && hostel.is_active !== 0).map(hostel => ({ value: hostel.id, label: hostel.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
