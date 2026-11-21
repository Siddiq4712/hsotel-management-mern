import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Table, message } from 'antd';
import { Lock, Mail, Pencil, Plus, RefreshCw, Search, Trash2, User, Users } from 'lucide-react';
import { normalizeRole } from '../../../../shared/roles.js';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import WorkspaceAlert from '../common/WorkspaceAlert';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';

const CREATE_ROLE = 'create-role';
const requiresHostel = (role) => ['warden', 'mess'].includes(normalizeRole(role));
const errorMessage = (error, fallback) => error.response?.data?.message || error.message?.replace(/^API Error:\s*/, '') || fallback;

function RoleSelect({ value, onChange, options, onCreateRole, ...props }) {
  return (
    <Select
      {...props}
      value={value ?? null}
      placeholder="Choose a role"
      options={onCreateRole ? [...options, { value: CREATE_ROLE, label: 'Create Role' }] : options}
      onChange={(roleId) => {
        if (roleId === CREATE_ROLE) onCreateRole();
        else onChange(roleId);
      }}
    />
  );
}

function AccountFields({ roles, hostels, account, lockRole, onCreateRole }) {
  const roleId = Form.useWatch('roleId');
  const role = roles.find((item) => item.roleId === roleId) || (account?.roleId === roleId ? account?.role : null);
  const isStudent = normalizeRole(account?.role) === 'student';
  const roleOptions = roles
    .filter((item) => normalizeRole(item) !== 'student')
    .map((item) => ({ value: item.roleId, label: item.roleName }));
  if (account && !roleOptions.some((option) => option.value === account.roleId)) {
    roleOptions.push({ value: account.roleId, label: account.role?.roleName || 'Current role' });
  }

  return (
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="userName" label="Username" rules={[{ required: true, whitespace: true, message: 'Enter a username' }]}>
          <Input prefix={<User size={16} aria-hidden="true" />} autoComplete="off" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="email" label="Email address" rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]}>
          <Input prefix={<Mail size={16} aria-hidden="true" />} />
        </Form.Item>
      </Col>
      {!account && (
        <Col xs={24} sm={12}>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: 'Enter at least 6 characters' }]}>
            <Input.Password prefix={<Lock size={16} aria-hidden="true" />} autoComplete="new-password" />
          </Form.Item>
        </Col>
      )}
      <Col xs={24} sm={12}>
        <Form.Item name="roleId" label="Role" rules={[{ required: true, message: 'Choose a role' }]}>
          <RoleSelect options={roleOptions} onCreateRole={onCreateRole} disabled={lockRole || isStudent} />
        </Form.Item>
      </Col>
      {requiresHostel(role) && (
        <Col xs={24} sm={12}>
          <Form.Item name="hostel_id" label="Assigned hostel" rules={[{ required: true, message: 'Choose a hostel' }]}
            extra={account && 'Hostel changes apply on the next request. Changing roles requires signing in again.'}>
            <Select placeholder="Choose a hostel" options={hostels.map((hostel) => ({ value: hostel.id, label: hostel.name }))} />
          </Form.Item>
        </Col>
      )}
      {normalizeRole(role) === 'parent' && (
        <Col xs={24} sm={12}>
          <Form.Item name="studentRollNumbers" label="Linked student roll numbers" rules={account ? [] : [{ required: true, whitespace: true, message: 'Enter student roll numbers' }]}>
            <Input placeholder="Separate roll numbers with commas" />
          </Form.Item>
        </Col>
      )}
    </Row>
  );
}

function accountPayload({ userName, email, roleId, hostel_id, ...details }) {
  return { username: userName.trim(), email, roleId, hostel_id: hostel_id ?? null, ...details };
}

export default function CreateUser() {
  const { user: signedInUser } = useAuth();
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [hostels, setHostels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState();
  const [hostelFilter, setHostelFilter] = useState();
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const listRequest = useRef(0);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);

  const loadFields = async () => {
    setFieldsLoading(true);
    setFieldsError('');
    try {
      const [hostelResponse, roleResponse] = await Promise.all([adminAPI.getHostels(), adminAPI.getRoles()]);
      setHostels(hostelResponse.data.data.filter(hostel => hostel.is_active !== false && hostel.is_active !== 0));
      setRoles(roleResponse.data.data);
    } catch (error) {
      setFieldsError(errorMessage(error, 'Unable to load roles and hostels.'));
    } finally {
      setFieldsLoading(false);
    }
  };

  const loadUsers = async () => {
    const request = ++listRequest.current;
    setListLoading(true);
    setListError('');
    try {
      const response = await adminAPI.getUsers();
      if (request === listRequest.current) setUsers(response.data.data);
    } catch (error) {
      if (request === listRequest.current) setListError(errorMessage(error, 'Unable to load users.'));
    } finally {
      if (request === listRequest.current) setListLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
    loadUsers();
  }, []);

  const saveUser = async (values, account) => {
    setSaving(true);
    try {
      const payload = accountPayload(values);
      const targetRole = roles.find(role => role.roleId === values.roleId);
      if (account) {
        if (normalizeRole(account.role) === 'student') payload.hostel_id = account.hostel_id;
        if ((payload.studentRollNumbers || '') === account.studentRollNumbers) delete payload.studentRollNumbers;
        await adminAPI.updateUser(account.userId, payload);
        setEditing(null);
        message.success('User updated');
      } else {
        await adminAPI.createUser(payload);
        form.resetFields();
        setCreateOpen(false);
        message.success('User created');
      }
      if (requiresHostel(account?.role) || requiresHostel(targetRole)) {
        window.dispatchEvent(new Event('staff-workspaces-changed'));
      }
      await loadUsers();
    } catch (error) {
      message.error(errorMessage(error, account ? 'Unable to update user.' : 'Unable to create user.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    setDeletePending(true);
    try {
      await adminAPI.deleteUser(deleting.userId);
      if (requiresHostel(deleting.role)) window.dispatchEvent(new Event('staff-workspaces-changed'));
      setUsers((current) => current.filter((account) => account.userId !== deleting.userId));
      message.success('User deactivated');
      setDeleting(null);
      await loadUsers();
    } catch (error) {
      message.error(errorMessage(error, 'Unable to delete user.'));
    } finally {
      setDeletePending(false);
    }
  };

  const createRole = async ({ roleName }) => {
    setRoleSaving(true);
    try {
      const response = await adminAPI.createRole({ roleName: roleName.trim() });
      const role = response.data.data;
      setRoles((current) => [...current.filter((item) => item.roleId !== role.roleId), role]
        .sort((a, b) => a.roleName.localeCompare(b.roleName)));
      message.success(response.data.message || 'Role created');
      setRoleModalOpen(false);
      roleForm.resetFields();
    } catch (error) {
      message.error(errorMessage(error, 'Unable to create role.'));
    } finally {
      setRoleSaving(false);
    }
  };

  const isSelf = (account) => Number(account.userId) === Number(signedInUser?.id ?? signedInUser?.userId);
  const searchText = search.trim().toLowerCase();
  const filterRoles = new Map();
  for (const role of [...roles, ...users.map((account) => account.role)]) {
    const key = normalizeRole(role);
    if (key && !filterRoles.has(key)) filterRoles.set(key, role.roleName);
  }
  const visibleUsers = users.filter((account) =>
    (!roleFilter || normalizeRole(account.role) === roleFilter) &&
    (!hostelFilter || Number(account.hostel_id) === Number(hostelFilter)) &&
    [account.userName, account.roll_number, account.room_number]
      .some((value) => String(value ?? '').toLowerCase().includes(searchText))
  );
  const columns = [
    { title: 'Username', dataIndex: 'userName' },
    { title: 'Roll no.', dataIndex: 'roll_number', render: (value) => value || '—' },
    { title: 'Room no.', dataIndex: 'room_number', render: (value) => value || '—' },
    { title: 'Email address', dataIndex: 'userMail' },
    { title: 'Role', key: 'role', render: (_, account) => account.role?.roleName || '—' },
    { title: 'Assigned hostel', key: 'hostel', render: (_, account) => account.Hostel?.name || '—' },
    { title: 'Actions', key: 'actions', align: 'center', width: 170, className: 'manage-user-actions', render: (_, account) => (
      <Space>
        <Button icon={<Pencil size={14} />} aria-label={`Edit ${account.userName}`} disabled={saving || fieldsLoading || Boolean(fieldsError)} onClick={() => setEditing({
          ...account,
          studentRollNumbers: (account.ParentLinks || []).map((link) => link.Student?.roll_number).filter(Boolean).join(', ')
        })}>Edit</Button>
        <Button danger icon={<Trash2 size={14} />} aria-label={`Delete ${account.userName}`} disabled={isSelf(account)}
          title={isSelf(account) ? 'You cannot delete the account you are signed in with' : undefined}
          onClick={() => setDeleting(account)}>Delete</Button>
      </Space>
    ) }
  ];

  return (
    <section className="module-page manage-user-page" aria-labelledby="manage-user-title">
      <WorkspacePageHeader id="manage-user-title" title="Manage User" description="Create accounts and manage existing users." icon={Users} />
      <Card>
        <WorkspaceToolbar className="mb-4">
          <Input aria-label="Search users" className="workspace-search" prefix={<Search size={16} aria-hidden="true" />}
            placeholder="Search by name, roll no., or room no." value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
          <Select aria-label="Filter by role" className="workspace-toolbar-filter" placeholder="All roles" value={roleFilter}
            onChange={setRoleFilter} allowClear options={Array.from(filterRoles, ([value, label]) => ({ value, label }))} />
          <Select aria-label="Filter users by hostel" className="workspace-toolbar-filter" placeholder="All hostels" value={hostelFilter}
            onChange={setHostelFilter} allowClear options={hostels.map(hostel => ({ value: hostel.id, label: hostel.name }))} />
          <div className="workspace-toolbar-actions">
            <Button onClick={loadUsers} loading={listLoading} icon={<RefreshCw size={16} />}>Refresh</Button>
            <Button type="primary" icon={<Plus size={16} />}
              loading={fieldsLoading} disabled={Boolean(fieldsError)} onClick={() => setCreateOpen(true)}>Create User</Button>
          </div>
        </WorkspaceToolbar>
        {fieldsError && <WorkspaceAlert type="error" showIcon message={fieldsError} action={<Button onClick={loadFields}>Retry</Button>} className="mb-4" />}
        {listError && <WorkspaceAlert type="error" showIcon message={listError} action={<Button onClick={loadUsers}>Retry</Button>} className="mb-4" />}
        <Table rowKey="userId" columns={columns} dataSource={visibleUsers} loading={listLoading} scroll={{ x: 900 }}
          pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} ${total === 1 ? 'user' : 'users'}` }}
          locale={{ emptyText: listError ? 'Users could not be loaded' : (searchText || roleFilter || hostelFilter ? 'No users match your filters' : 'No active users') }} />
      </Card>
      <Modal title="Create User" open={createOpen} width={832} destroyOnHidden
        onCancel={() => { setCreateOpen(false); form.resetFields(); }} okText="Create User"
        okButtonProps={{ htmlType: 'submit', form: 'create-user' }} confirmLoading={saving}
        cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} keyboard={!saving}>
        <Form form={form} name="create-user" className="manage-user-form" layout="vertical" onFinish={saveUser} preserve={false}>
          <AccountFields roles={roles} hostels={hostels} onCreateRole={() => setRoleModalOpen(true)} />
        </Form>
      </Modal>
      {editing && (
        <Modal title={`Edit ${editing.userName}`} open onCancel={() => setEditing(null)} okText="Save changes"
          okButtonProps={{ htmlType: 'submit', form: 'edit-user' }} confirmLoading={saving}
          cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} keyboard={!saving}>
          <Form name="edit-user" className="manage-user-form" layout="vertical" onFinish={(values) => saveUser(values, editing)} preserve={false} initialValues={{
            userName: editing.userName, email: editing.userMail, roleId: editing.roleId,
            hostel_id: editing.hostel_id ?? undefined, studentRollNumbers: editing.studentRollNumbers
          }}>
            <AccountFields roles={roles} hostels={hostels} account={editing} lockRole={isSelf(editing)} />
          </Form>
        </Modal>
      )}
      <Modal title={deleting ? `Delete ${deleting.userName}?` : 'Delete user'} open={Boolean(deleting)}
        onCancel={() => setDeleting(null)} onOk={deleteUser} okText="Delete user" confirmLoading={deletePending}
        okButtonProps={{ danger: true }} cancelButtonProps={{ disabled: deletePending }}
        closable={!deletePending} mask={{ closable: !deletePending }} keyboard={!deletePending}>
        This will deactivate the account and remove its access. Existing records will be kept.
      </Modal>
      <Modal title="Create Role" open={roleModalOpen} onCancel={() => { setRoleModalOpen(false); roleForm.resetFields(); }}
        onOk={() => roleForm.submit()} confirmLoading={roleSaving} okText="Create Role"
        cancelButtonProps={{ disabled: roleSaving }} closable={!roleSaving} mask={{ closable: !roleSaving }} keyboard={!roleSaving}>
        <Form form={roleForm} name="create-role" layout="vertical" onFinish={createRole}>
          <Form.Item name="roleName" label="Role name" rules={[{ required: true, whitespace: true, min: 2, message: 'Enter a role name with at least two characters' }]}>
            <Input placeholder="Enter a role name" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
