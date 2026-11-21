import { cornerRadius } from '../../theme/cornerRadius';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card, Form, Input, Button, InputNumber,
  Typography, Row, Col, message,
  Space, Skeleton,
  Tag, Empty, Modal, Switch, Alert, Tabs
} from 'antd';
import {
  Building, MapPin, Phone, Mail, Users, RotateCcw, Plus
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import HostelDetailsModal from './HostelDetailsModal';
import AssignHostelBatches from './AssignHostelBatches';
import './AdminWorkspace.css';

const { Text } = Typography;
const { TextArea } = Input;
const roomCount = hostel => (hostel.HostelRooms || hostel.tbl_HostelRooms || []).length;

// ─── Skeletons ───────────────────────────────────────────────

const RegistrationSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse">
    <div className="space-y-4">
      <Skeleton.Input active size="small" style={{ width: 150 }} />
      <Skeleton.Input active block style={{ height: 48, borderRadius: cornerRadius.control }} />
    </div>
    <div className="space-y-4">
      <Skeleton.Input active size="small" style={{ width: 120 }} />
      <Skeleton.Input active block style={{ height: 100, borderRadius: cornerRadius.control }} />
    </div>
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Skeleton.Input active block style={{ height: 48, borderRadius: cornerRadius.control }} />
      </Col>
      <Col xs={24} sm={12}>
        <Skeleton.Input active block style={{ height: 48, borderRadius: cornerRadius.control }} />
      </Col>
    </Row>
    <div className="pt-4">
      <Skeleton.Button active style={{ width: 200, height: 56, borderRadius: cornerRadius.control }} />
    </div>
  </div>
);

// ─── Create Hostel Section ───────────────────────────────────

const CreateHostelSection = ({ onCreated }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const componentLoading = false;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await adminAPI.createHostel({
        ...values,
        capacity: Number(values.capacity)
      });
      message.success('Institutional unit registered successfully!');
      form.resetFields();
      onCreated?.();
    } catch (error) {
      console.error('Registration Error:', error);
      message.error(error.response?.data?.message || error.message?.replace(/^API Error:\s*/, '') || 'Failed to create hostel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Hostel details" className="max-w-4xl">
      {componentLoading ? <RegistrationSkeleton /> : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label={<Text strong>Hostel name</Text>}
            rules={[{ required: true, whitespace: true, message: 'Institutional name is required' }, { max: 255 }]}
          >
            <Input
              prefix={<Building size={18} className="text-slate-400 mr-2" />}
              placeholder="e.g. Platinum Boys Residency"
            />
          </Form.Item>

          <Form.Item
            name="address"
            label={<Text strong>Address</Text>}
          >
            <TextArea
              rows={3}
              placeholder="Provide complete geographical details of the unit..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="contact_number"
                label={<Text strong>Phone number</Text>}
              >
                <Input
                  prefix={<Phone size={18} className="text-slate-400 mr-2" />}
                  placeholder="+91 XXXXX XXXXX"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label={<Text strong>Email address</Text>}
                rules={[{ type: 'email', message: 'Enter a valid institutional email' }]}
              >
                <Input
                  prefix={<Mail size={18} className="text-slate-400 mr-2" />}
                  placeholder="admin@unit.institution.edu"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="capacity"
            label={<Text strong>Bed capacity</Text>}
            rules={[{ required: true, message: 'Capacity threshold must be defined' }, { type: 'integer', min: 1, max: 2147483647 }]}
          >
            <InputNumber
              min={1}
              max={2147483647}
              precision={0}
              prefix={<Users size={18} className="text-slate-400 mr-2" />}
              placeholder="e.g. 250"
              className="w-full"
            />
          </Form.Item>

          <Space wrap>
            <Button type="primary" htmlType="submit" loading={loading}>Create</Button>
            <Button icon={<RotateCcw size={16} />} onClick={() => form.resetFields()}>Reset</Button>
          </Space>
        </Form>
      )}
    </Card>
  );
};

// ─── Manage Hostels Section ──────────────────────────────────

const ManageHostelsSection = () => {
  const [batchHostel, setBatchHostel] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState('');
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const request = useRef(0);

  const fetchHostels = useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getHostels({ search, include_inactive: includeInactive ? 'true' : 'false' });
      if (sequence !== request.current) return;
      setHostels(response.data.data || []);
    } catch (error) {
      if (sequence !== request.current) return;
      setError(error.response?.data?.message || 'Unable to load hostels. Please refresh.');
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [search, includeInactive]);

  useEffect(() => { fetchHostels(); return () => { request.current += 1; }; }, [fetchHostels]);

  const stats = useMemo(() => ({
    total: hostels.length,
    capacity: hostels.reduce((acc, curr) => acc + Number(curr.capacity || 0), 0),
    rooms: hostels.reduce((acc, hostel) => acc + roomCount(hostel), 0)
  }), [hostels]);

  const remove = hostel => Modal.confirm({
    title: `Delete ${hostel.name}?`,
    content: 'Empty hostels are deleted. Hostels with linked records are deactivated so their users, inventory, and history are preserved.',
    okText: 'Delete / deactivate', okButtonProps: { danger: true },
    onOk: async () => {
      setDeletingId(hostel.id);
      try {
        const response = await adminAPI.deleteHostel(hostel.id);
        message.success(response.data.message);
        await fetchHostels();
      } catch (error) { message.error(error.response?.data?.message || 'Unable to delete hostel.'); throw error; }
      finally { setDeletingId(null); }
    },
  });

  return (
    <div className="hostel-directory" aria-busy={loading}>
      <dl className="admin-metrics hostel-metrics">
        {[
          ['Hostels', stats.total],
          ['Total beds', stats.capacity],
          ['Total rooms', stats.rooms],
        ].map(([label, value]) => (
          <div className="admin-surface admin-metric" key={label}>
            <dt>{label}</dt>
            <dd>{loading && !hostels.length ? <Skeleton.Input active size="small" /> : value}</dd>
          </div>
        ))}
      </dl>

      <div className="admin-surface hostel-directory-toolbar">
        <Input type="search" aria-label="Search hostels" placeholder="Search name or address" allowClear
          onPressEnter={event => setSearch(event.currentTarget.value)} onClear={() => setSearch('')} />
        <Space>
          <Switch id="show-inactive-hostels" size="small" aria-label="Show inactive hostels" checked={includeInactive} onChange={setIncludeInactive} />
          <label htmlFor="show-inactive-hostels">Show inactive</label>
        </Space>
        <Button loading={loading} onClick={fetchHostels}>Refresh</Button>
      </div>

      {error && <Alert type="error" showIcon title={error} />}
      <div className="hostel-directory-grid">
        {loading ? (
          Array.from({ length: 2 }, (_, index) => (
            <div className="admin-surface hostel-directory-card" key={index}><Skeleton active /></div>
          ))
        ) : hostels.length > 0 ? hostels.map(hostel => {
          const rooms = roomCount(hostel);
          return (
            <article className="admin-surface hostel-directory-card" key={hostel.id}>
              <div className="admin-panel-heading">
                <h3>{hostel.name}</h3>
                <Tag className="hostel-status" variant="filled" color={hostel.is_active ? 'blue' : 'default'}>
                  {hostel.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </div>
              <div className="hostel-card-capacity">
                <span>{rooms} {rooms === 1 ? 'room' : 'rooms'}</span>
                <span>{hostel.capacity} beds</span>
              </div>
              {(hostel.address || hostel.contact_number || hostel.email) && (
                <div className="hostel-card-contact">
                  {hostel.address && <span><MapPin size={14} aria-hidden="true" />{hostel.address}</span>}
                  {hostel.contact_number && <span><Phone size={14} aria-hidden="true" />{hostel.contact_number}</span>}
                  {hostel.email && <span><Mail size={14} aria-hidden="true" />{hostel.email}</span>}
                </div>
              )}
              <div className="hostel-card-batches">
                <p>Assigned batches</p>
                {hostel.batches?.length ? (
                  <ul>
                    {hostel.batches.map(batch => <li key={batch.id}>
                      {(batch.college ?? 'nec').toUpperCase()} — {batch.name} ({batch.gender || 'Gender needs setup'})
                    </li>)}
                  </ul>
                ) : <span aria-label="No assigned batches">—</span>}
              </div>
              <div className="hostel-card-actions">
                <Button onClick={() => setBatchHostel(hostel)} disabled={!hostel.is_active}>Assign batches</Button>
                <Button onClick={() => setSelectedHostelId(hostel.id)} disabled={Boolean(deletingId)} aria-label={`Edit ${hostel.name}`}>Edit details</Button>
                <Button danger loading={deletingId === hostel.id} disabled={Boolean(deletingId)} onClick={() => remove(hostel)}
                  aria-label={`Delete ${hostel.name}`}>Delete</Button>
              </div>
            </article>
          );
        }) : !error && (
          <div className="admin-surface hostel-directory-empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? 'No hostels match your search.' : 'No hostels yet.'} />
          </div>
        )}
      </div>
      <HostelDetailsModal hostelId={selectedHostelId} onClose={() => setSelectedHostelId(null)}
        onSaved={() => { setSelectedHostelId(null); fetchHostels(); }} />
      <AssignHostelBatches hostel={batchHostel} onClose={() => setBatchHostel(null)} onSaved={fetchHostels} />
    </div>
  );
};

// ─── Main Combined Page ──────────────────────────────────────

const HostelHub = ({ initialTab = 'manage' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  return (
    <section className="module-page admin-hostels" aria-labelledby="hostels-title">
      <WorkspacePageHeader id="hostels-title" title="Manage Hostels" description="Manage hostel capacity and batch assignments.">
        {activeTab === 'manage' && <Button type="primary" icon={<Plus size={15} />} onClick={() => setActiveTab('create')}>Create hostel</Button>}
      </WorkspacePageHeader>
      <Tabs activeKey={activeTab} onChange={setActiveTab} destroyOnHidden items={[
        { key: 'manage', label: 'Hostel directory', children: <ManageHostelsSection /> },
        { key: 'create', label: 'Create Hostel', children: <CreateHostelSection onCreated={() => setActiveTab('manage')} /> },
      ]} />
    </section>
  );
};

export default HostelHub;
