import { PermissionButton as Button } from '../common/PermissionControls';
import { DatePicker } from '../common/MomentPickers';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';
import WorkspaceAlert from '../common/WorkspaceAlert';
import { useWardenHostelName } from './WardenWorkspace';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Input, Select, Typography, Row, Col, Statistic, Space, Modal, message, ConfigProvider, Form } from 'antd';
import { 
  CalendarDays, Plus, Calendar, Edit3, Trash2, Search, RefreshCw,
  Info, PartyPopper, ShieldCheck
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';
import { useScopeForm, useWorkspaceScope } from '../common/WorkspaceScope';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/* ---------- 1. Specialized Skeletons ---------- */

const HolidayManagement = () => {
  const hostelName = useWardenHostelName();
  const [form] = Form.useForm();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const scope = useWorkspaceScope();
  useScopeForm(form, showModal, modalLoading);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await wardenAPI.getHolidays();
      setHolidays(response.data.data || []);
    } catch (error) {
      setHolidays([]);
      setLoadError(error.message || 'Failed to load the holiday list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  /* ---------- Logic Helpers ---------- */

  const filteredHolidays = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return holidays
      .filter(holiday => [holiday.name, holiday.type].some(value => String(value ?? '').toLowerCase().includes(query)))
      .sort((a, b) => moment(a.date).unix() - moment(b.date).unix());
  }, [holidays, searchTerm]);

  const holidayTypeMeta = {
    national: { color: 'volcano', label: 'National', icon: <ShieldCheck size={12} /> },
    religious: { color: 'purple', label: 'Religious', icon: <PartyPopper size={12} /> },
    institutional: { color: 'blue', label: 'Institutional', icon: <Calendar size={12} /> },
    other: { color: 'cyan', label: 'Other', icon: <Info size={12} /> }
  };

  const getStatusTag = (date) => {
    const today = moment().startOf('day');
    const hDate = moment(date).startOf('day');
    if (hDate.isSame(today)) return <Tag color="blue" className="rounded-full border-none px-3 font-bold text-[9px]">TODAY</Tag>;
    if (hDate.isAfter(today)) return <Tag color="green" className="rounded-full border-none px-3 font-bold text-[9px]">UPCOMING</Tag>;
    return <Tag color="default" className="rounded-full border-none px-3 font-bold text-[9px]">PAST</Tag>;
  };

  /* ---------- Handlers ---------- */

  const handleOpenModal = (holiday = null) => {
    if (!holiday && scope?.allHostels) { message.info('Choose a hostel above before adding a holiday.'); return; }
    if (holiday) {
      setEditingId(holiday.id);
      form.setFieldsValue({ ...holiday, date: moment(holiday.date) });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setShowModal(true);
  };

  const handleSubmit = async (values) => {
    setModalLoading(true);
    const payload = { ...values, date: values.date.format('YYYY-MM-DD') };
    try {
      if (editingId) await wardenAPI.updateHoliday(editingId, payload);
      else await wardenAPI.createHoliday(payload);
      
      message.success(`Holiday registry updated successfully.`);
      setShowModal(false);
      fetchHolidays();
    } catch (e) {
      message.error(e.response?.data?.message || 'Update protocol failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      icon: <Trash2 className="text-rose-500 mr-2" size={22} />,
      content: 'This will remove the holiday from the institutional calendar. Proceed?',
      okText: 'Yes, Delete',
      okType: 'danger',
      className: 'rounded-surface',
      onOk: async () => {
        try {
          await wardenAPI.deleteHoliday(id);
          message.success('Holiday removed from the list.');
          fetchHolidays();
        } catch (e) { 
          message.error('Deletion failed.'); 
        }
      }
    });
  };

  /* ---------- Updated Columns ---------- */

  const columns = [
    {
      title: 'Holiday Name',
      key: 'name',
      render: (_, r) => (
        <Space gap={3}>
          <div className="p-2 bg-emerald-50 rounded-control text-emerald-600">
            <PartyPopper size={18} />
          </div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{r.name}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {moment(r.date).format('dddd')}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Holiday Date',
      dataIndex: 'date',
      render: (date) => (
        <div className="flex flex-col">
          <Text className="text-xs font-medium">{moment(date).format('DD MMM, YYYY')}</Text>
          <Text className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">
            {moment(date).fromNow()}
          </Text>
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'type',
      render: (t) => (
        <Tag 
          color={holidayTypeMeta[t]?.color} 
          className="rounded-full border-none px-3 font-bold uppercase text-[9px]"
        >
          {holidayTypeMeta[t]?.label || t}
        </Tag>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => getStatusTag(r.date)
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      width: 175,
      render: (_, r) => (
        <Space>
          <Button permissionAction="edit"
            icon={<Edit3 size={14}/>} 
            onClick={() => handleOpenModal(r)} 
          >Edit</Button>
          <Button permissionAction="delete" 
            icon={<Trash2 size={14}/>} 
            danger 
            onClick={() => handleDelete(r.id)} 
          >Delete</Button>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider>
      <div className="module-page">
        
        {/* Header */}
        <WorkspacePageHeader title="Holidays" icon={CalendarDays}
          description={hostelName || 'Manage hostel holidays and events.'} />
        <Row gutter={[16, 16]} className="mb-4">
          {[
            { label: 'Total holidays', value: holidays.length },
            { label: 'Upcoming', value: holidays.filter(holiday => moment(holiday.date).isAfter(moment(), 'day')).length },
            { label: 'Today', value: holidays.filter(holiday => moment(holiday.date).isSame(moment(), 'day')).length },
            { label: 'Past', value: holidays.filter(holiday => moment(holiday.date).isBefore(moment(), 'day')).length },
          ].map(stat => <Col xs={12} lg={6} key={stat.label}>
            <Card size="small"><Statistic title={stat.label} value={stat.value} loading={loading} /></Card>
          </Col>)}
        </Row>
        <Card>
          <WorkspaceToolbar className="mb-4">
            <Input aria-label="Search holidays" placeholder="Search by holiday or category" className="workspace-search"
              prefix={<Search size={16} aria-hidden="true" />} value={searchTerm} onChange={event => setSearchTerm(event.target.value)} allowClear />
            <div className="workspace-toolbar-actions">
              <Button icon={<RefreshCw size={16} />} onClick={fetchHolidays} loading={loading}>Refresh</Button>
              <Button permissionAction="create" type="primary" icon={<Plus size={16} />}
                disabled={scope?.allHostels || loading || Boolean(loadError)} onClick={() => handleOpenModal()}>Add New Holiday</Button>
            </div>
          </WorkspaceToolbar>
          {loadError && <WorkspaceAlert type="error" showIcon title={loadError} className="mb-4" />}
          <Table rowKey="id" columns={columns} dataSource={loadError ? [] : filteredHolidays} loading={loading} scroll={{ x: 690 }}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            locale={{ emptyText: loadError ? 'Holidays could not be loaded' : searchTerm.trim() ? 'No holidays match your search' : 'No holidays yet' }} />
        </Card>

        {/* Action Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-emerald-600">
              <CalendarDays size={20}/> {editingId ? 'Edit Holiday' : 'Add New Holiday'}
            </div>
          }
          open={showModal}
          onCancel={() => !modalLoading && setShowModal(false)}
          closable={!modalLoading} keyboard={!modalLoading} mask={{ closable: !modalLoading }}
          footer={[
            <Button key="back" disabled={modalLoading} onClick={() => setShowModal(false)}>Cancel</Button>,
            <Button permissionAction={editingId ? 'edit' : 'create'} 
              key="submit" 
              type="primary" 
              loading={modalLoading} 
              onClick={() => form.submit()} 
            >
              Save
            </Button>
          ]}
          className="rounded-surface"
          width={880}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-6">
            <Form.Item name="name" label={<Text strong>Holiday / Event Name</Text>} rules={[{ required: true }]}>
              <Input placeholder="e.g. Diwali" className="h-12 rounded-control" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="date" label={<Text strong>Date</Text>} rules={[{ required: true }]}>
                  <DatePicker className="w-full h-12 rounded-control" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="type" label={<Text strong>Category</Text>} rules={[{ required: true }]}>
                  <Select className="h-12 rounded-control">
                    <Option value="national">National Holiday</Option>
                    <Option value="religious">Festival / Religious</Option>
                    <Option value="institutional">Hostel Event</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label={<Text strong>Notes / Description</Text>}>
              <TextArea 
                rows={3} 
                placeholder="Add any details about mess closure or timings..." 
                className="rounded-control p-4 border-slate-200"
              />
            </Form.Item>
            
            <div className="p-4 bg-emerald-50 rounded-surface border border-emerald-100 flex gap-3">
              <Info size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <Text className="text-[11px] text-emerald-700 leading-tight">
                This will be shown on the student's mobile app and used for automatic attendance.
              </Text>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default HolidayManagement;
