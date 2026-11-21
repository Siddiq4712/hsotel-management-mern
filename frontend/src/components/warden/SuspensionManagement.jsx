import { PermissionButton as Button } from '../common/PermissionControls';
import { DatePicker } from '../common/MomentPickers';
import WorkspaceContextHeader from '../common/WorkspaceContextHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';
import WorkspaceAlert from '../common/WorkspaceAlert';
import { useWardenHostelName, wardenListPagination } from './WardenWorkspace';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Tag, Input, Select, Typography, Row, Col, Space, Modal, Divider, Descriptions, ConfigProvider, Form, App as AntdApp } from 'antd';
import { 
  Plus, User, CheckCircle2, AlertCircle, XCircle, Search, RefreshCw, ShieldCheck
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- 1. Specialized Stat Cards Skeleton ---
const SuspensionManagement = () => {
  const hostelName = useWardenHostelName();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [suspensions, setSuspensions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [suspRes, stuRes] = await Promise.all([
        wardenAPI.getSuspensions(),
        wardenAPI.getStudents()
      ]);
      setSuspensions(suspRes.data.data || []);
      setStudents(stuRes.data.data || []);
    } catch (error) {
      setSuspensions([]);
      setStudents([]);
      setLoadError(error.message || 'Failed to load suspension records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSuspensions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return suspensions.filter(record => [record.Student?.userName, record.Student?.roll_number, record.reason]
      .some(value => String(value ?? '').toLowerCase().includes(query)));
  }, [suspensions, searchTerm]);

  const statusConfig = {
    active: { color: 'error', icon: <AlertCircle size={12} />, label: 'Active' },
    completed: { color: 'success', icon: <CheckCircle2 size={12} />, label: 'Concluded' },
    cancelled: { color: 'default', icon: <XCircle size={12} />, label: 'Voided' }
  };

  const columns = [
    {
      title: 'Student Name',
      key: 'identity',
      render: (_, r) => (
        <Space gap={3}>
          <div className="p-2 bg-rose-50 rounded-control text-rose-600"><User size={18} /></div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{r.Student?.userName}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Roll: {r.Student?.roll_number || 'UNSET'}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Current Status',
      dataIndex: 'status',
      render: (s) => (
        <Tag icon={statusConfig[s]?.icon} color={statusConfig[s]?.color} className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
          {s === 'completed' ? 'Finished' : statusConfig[s]?.label || s}
        </Tag>
      )
    },
    {
      title: 'Suspension period',
      key: 'period',
      render: (_, record) => `${moment(record.start_date).format('DD MMM YYYY')} – ${record.end_date ? moment(record.end_date).format('DD MMM YYYY') : 'Open-ended'}`
    },
    {
      title: 'Actions',
      key: 'action',
      align: 'right',
      width: 105,
      render: (_, record) => <Button onClick={() => setSelected(record)}>Review</Button>
    }
  ];

  const handleCreateSuspension = async (values) => {
    setCreateLoading(true);
    try {
      await wardenAPI.createSuspension(values);
      message.success('Suspension recorded successfully.');
      setShowCreateModal(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.message || 'Failed to issue suspension order.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <ConfigProvider>
      <div className="module-page warden-page">
        <WorkspaceContextHeader title="Suspensions" headingAs="h1"
          description={hostelName ? `Manage resident suspension records for ${hostelName}.` : 'Manage resident suspension records.'}
          actions={<>
            <Button icon={<RefreshCw size={16} />} onClick={fetchData} loading={loading}>Refresh</Button>
            <Button permissionAction="create" type="primary" icon={<Plus size={16} />}
              disabled={loading || Boolean(loadError)} onClick={() => setShowCreateModal(true)}>Add Suspension</Button>
          </>} />
        <div className="warden-page-stack">
        <div className="warden-stat-grid">
          {[
            { label: 'Total suspensions', value: suspensions.length, caption: 'All suspension records' },
            { label: 'Active', value: suspensions.filter(record => record.status === 'active').length, caption: 'Currently active suspensions' },
            { label: 'Completed', value: suspensions.filter(record => record.status === 'completed').length, caption: 'Completed suspension periods' },
          ].map(stat => <div key={stat.label} className="warden-panel warden-stat">
            <span>{stat.label}</span><strong>{loading || loadError ? '—' : stat.value}</strong><small>{stat.caption}</small>
          </div>)}
        </div>
        <section className="warden-panel warden-table-panel" aria-label="Suspension records">
          <WorkspaceToolbar className="warden-table-toolbar">
            <Input aria-label="Search suspensions" placeholder="Search by student, roll number, or reason" className="workspace-search"
              prefix={<Search size={16} aria-hidden="true" />} value={searchTerm} onChange={event => setSearchTerm(event.target.value)} allowClear />
          </WorkspaceToolbar>
          {loadError && <WorkspaceAlert type="error" showIcon title={loadError} className="mb-4" />}
          <Table rowKey="id" columns={columns} dataSource={loadError ? [] : filteredSuspensions} loading={loading} scroll={{ x: 660 }}
            pagination={wardenListPagination(8, 'suspensions')}
            locale={{ emptyText: loadError ? 'Suspensions could not be loaded' : searchTerm.trim() ? 'No suspensions match your search'
              : <div className="warden-empty"><ShieldCheck size={30} aria-hidden="true" /><strong>No suspensions recorded</strong><p>This hostel has no suspension records.</p></div> }} />
        </section>
        </div>

        <Modal title="Review suspension" open={Boolean(selected)} width={880} footer={null} onCancel={() => setSelected(null)}>
          {selected && <Descriptions column={1} items={[
            { key: 'student', label: 'Student', children: selected.Student?.userName || `Student #${selected.student_id}` },
            { key: 'roll', label: 'Roll number', children: selected.Student?.roll_number || '—' },
            { key: 'start', label: 'Start date', children: moment(selected.start_date).format('DD MMM YYYY') },
            { key: 'end', label: 'End date', children: selected.end_date ? moment(selected.end_date).format('DD MMM YYYY') : 'Open-ended' },
            { key: 'status', label: 'Status', children: statusConfig[selected.status]?.label || selected.status },
            { key: 'reason', label: 'Reason', children: selected.reason || '—' },
            { key: 'remarks', label: 'Remarks', children: selected.remarks || '—' },
          ]} />}
        </Modal>

        {/* Create Suspension Modal */}
        <Modal
          title={<Title level={5} className="mb-0">Add Student Suspension</Title>}
          open={showCreateModal}
          onCancel={() => {
            if (createLoading) return;
            setShowCreateModal(false);
            form.resetFields();
          }}
          footer={null}
          width={880}
          closable={!createLoading} keyboard={!createLoading} mask={{ closable: !createLoading }}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" onFinish={handleCreateSuspension}>
            <Form.Item
              name="student_id"
              label="Student"
              rules={[{ required: true, message: 'Please select a student' }]}
            >
              <Select placeholder="Select a student" showSearch optionFilterProp="children">
                {students.map((student) => (
                  <Select.Option key={student.userId} value={student.userId}>
                    {student.userName} - Roll: {student.roll_number || 'UNSET'}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="reason"
              label="Reason for Action"
              rules={[{ required: true, message: 'Please enter the reason' }]}
            >
              <TextArea rows={3} placeholder="Explain the behavior or incident..." />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="start_date"
                  label="Suspension From"
                  rules={[{ required: true, message: 'Please select start date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Select date" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="end_date"
                  label="Suspension To (Optional)"
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Select date" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="remarks" label="Warden's Notes">
              <TextArea rows={2} placeholder="Any other notes regarding this case..." />
            </Form.Item>

            <Divider />

            <div className="flex justify-end gap-3 pt-4">
              <Button disabled={createLoading} onClick={() => {
                setShowCreateModal(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button permissionAction="create" type="primary" htmlType="submit" loading={createLoading}>
                Save Suspension
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default SuspensionManagement;
