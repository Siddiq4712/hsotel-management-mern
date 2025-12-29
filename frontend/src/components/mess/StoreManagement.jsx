import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Table, Button, Space, Tag, message, Modal, Form, Input,
  Popconfirm, Typography, Switch, ConfigProvider, theme, Skeleton, Divider, Tooltip
} from 'antd';
import {
  Store, Plus, MapPin, Phone, Edit3, Trash2, 
  RefreshCw, Search, CheckCircle2, XCircle, Link
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { Text, Title } = Typography;

const StoreSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton.Input active style={{ width: 200 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="square" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '30%' }} paragraph={{ rows: 1, width: '60%' }} />
          </div>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
      ))}
    </div>
  </Card>
);

const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchStores();
  }, [showInactive]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = !showInactive ? { is_active: 'true' } : {};
      const response = await messAPI.getStores(params);
      setStores(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch stores');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  // --- Search Logic ---
  const filteredStores = useMemo(() => {
    return stores.filter(s => 
      (s.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (s.address || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (s.contact_number || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [stores, searchText]);

  const handleCreate = () => {
    setEditingStore(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (store) => {
    setEditingStore(store);
    form.setFieldsValue({
      name: store.name,
      address: store.address,
      contact_number: store.contact_number,
      is_active: store.is_active
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteStore(id);
      message.success('Store deleted successfully');
      fetchStores();
    } catch (error) {
      message.error(error.response?.status === 400 ? 'Store is linked to inventory' : 'Delete failed');
    }
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingStore) {
        await messAPI.updateStore(editingStore.id, values);
        message.success('Store updated');
      } else {
        await messAPI.createStore(values);
        message.success('Store created');
      }
      setModalVisible(false);
      fetchStores();
    } catch (error) {
      message.error('Failed to save store');
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: 'Store Details',
      key: 'name',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.name}</Text>
          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <MapPin size={12} /> <span>{r.address || 'No address'}</span>
          </div>
        </Space>
      )
    },
    {
      title: 'Contact',
      dataIndex: 'contact_number',
      key: 'contact',
      render: (text) => (
        <Space className="text-slate-600">
          <Phone size={14} className="text-blue-500" />
          <Text className="text-sm">{text || '—'}</Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      align: 'center',
      render: (active) => (
        <Tag 
          color={active ? 'success' : 'error'}
          className="rounded-full px-3 font-bold border-none uppercase text-[10px]"
        >
          {active ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Map Items to Store">
            <Button 
              className="rounded-lg flex items-center justify-center"
              icon={<Link size={14} className="text-blue-600" />}
              onClick={() => window.location.href = `/mess/item-store-mapping?store=${record.id}`}
            />
          </Tooltip>
          <Tooltip title="Update Store Details">
            <Button
              className="rounded-lg"
              icon={<Edit3 size={14}/>}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Remove Store">
            <Popconfirm
              title="Delete store?"
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true, className: 'rounded-lg' }}
            >
              <Button className="rounded-lg" icon={<Trash2 size={14}/>} danger />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Store className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Store Management</Title>
              <Text type="secondary">Manage your procurement network</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<Plus size={18}/>} 
            onClick={handleCreate}
            className="rounded-xl h-12 shadow-lg shadow-blue-100 flex items-center gap-2 font-semibold"
          >
            Add Store
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <Card className="border-none shadow-sm rounded-2xl mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 max-w-md">
              <Search size={18} className="text-slate-300" />
              <Input 
                placeholder="Search by name, address or contact..." 
                bordered={false} 
                value={searchText} 
                onChange={e => setSearchText(e.target.value)} 
                allowClear 
              />
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Show Inactive</Text>
              <Switch size="small" checked={showInactive} onChange={setShowInactive} />
            </div>
            <Button icon={<RefreshCw size={16}/>} onClick={fetchStores} loading={loading} className="rounded-xl">Sync</Button>
          </div>
        </Card>

        {/* Content */}
        {loading ? <StoreSkeleton /> : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table
              columns={columns}
              dataSource={filteredStores}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        )}

        {/* Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600">{editingStore ? <Edit3 size={18}/> : <Plus size={18}/>} {editingStore ? 'Edit Store' : 'New Store'}</div>}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4" initialValues={{ is_active: true }}>
            <Form.Item name="name" label="Store Name" rules={[{ required: true }]}>
              <Input placeholder="Store Name" className="h-11 rounded-xl" />
            </Form.Item>
            <Form.Item name="address" label="Address">
              <Input.TextArea rows={3} placeholder="Store Address" className="rounded-xl" />
            </Form.Item>
            <Form.Item name="contact_number" label="Contact">
              <Input prefix={<Phone size={14} className="text-slate-400 mr-2"/>} className="h-11 rounded-xl" />
            </Form.Item>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 flex justify-between items-center">
              <Text strong>Active for Procurement</Text>
              <Form.Item name="is_active" valuePropName="checked" noStyle><Switch /></Form.Item>
            </div>
            <div className="flex justify-end gap-3">
              <Button onClick={() => setModalVisible(false)} className="rounded-xl h-11 px-6">Cancel</Button>
              <Button type="primary" htmlType="submit" loading={confirmLoading} className="rounded-xl h-11 px-8 font-bold">
                {editingStore ? 'Update' : 'Create'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default StoreManagement;