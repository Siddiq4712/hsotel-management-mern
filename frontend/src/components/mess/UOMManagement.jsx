import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, message, Modal, Form, Input,
  Select, Popconfirm, Typography, Tag, ConfigProvider, theme, Skeleton, Divider
} from 'antd';
// Lucide icons for consistency
import {
  Ruler, Plus, Search, Edit2, Trash2, Info, 
  Scale, Filter, RefreshCw, Box, Layers
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { Option } = Select;
const { Title, Text } = Typography;

// --- Internal Reusable EmptyState Component ---
const EmptyState = ({ icon: Icon, title, subtitle, actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100 my-4 animate-in fade-in zoom-in duration-500">
    <div className="p-6 bg-slate-50 rounded-full mb-6">
      <Icon size={48} className="text-slate-300" strokeWidth={1.5} />
    </div>
    <Title level={4} className="text-slate-800 mb-2">{title}</Title>
    <Text className="text-slate-500 block mb-8 max-w-xs mx-auto">{subtitle}</Text>
    {onAction && (
      <Button 
        type="primary" 
        size="large" 
        onClick={onAction} 
        className="flex items-center gap-2 rounded-xl h-12 px-8 shadow-lg shadow-blue-100 font-semibold"
      >
        <Plus size={18} /> {actionText}
      </Button>
    )}
  </div>
);

const UOMManagement = () => {
  const [uoms, setUOMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUOM, setEditingUOM] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const uomTypes = ['weight', 'volume', 'length', 'count', 'other'];

  useEffect(() => {
    fetchUOMs();
  }, []);

  const fetchUOMs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== 'all') params.type = selectedType;
      
      const response = await messAPI.getUOMs(params);
      setUOMs(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch units of measurement');
    } finally {
      // Smooth skeleton-to-content transition delay
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const handleCreate = () => {
    setEditingUOM(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingUOM) {
        await messAPI.updateUOM(editingUOM.id, values);
        message.success('Unit updated successfully');
      } else {
        await messAPI.createUOM(values);
        message.success('New unit added');
      }
      setModalVisible(false);
      fetchUOMs();
    } catch (error) {
      message.error('Failed to save unit');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteUOM(id);
      message.success('Unit deleted');
      fetchUOMs();
    } catch (error) {
      message.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      weight: '#3b82f6', // blue
      volume: '#10b981', // green
      length: '#8b5cf6', // purple
      count: '#f59e0b',  // orange
      other: '#64748b'   // slate
    };
    return colors[type] || '#64748b';
  };

  const filteredUOMs = uoms.filter(uom => 
    uom.name.toLowerCase().includes(searchText.toLowerCase()) || 
    uom.abbreviation.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Full Name',
      dataIndex: 'name',
      key: 'name',
      render: (t) => <Text strong className="text-slate-700">{t}</Text>
    },
    {
      title: 'Symbol',
      dataIndex: 'abbreviation',
      key: 'abbreviation',
      render: (text) => <Tag bordered={false} className="bg-blue-50 text-blue-600 font-mono px-3">{text}</Tag>
    },
    {
      title: 'Category Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag bordered={false} style={{ background: `${getTypeColor(type)}15`, color: getTypeColor(type) }} className="px-3 rounded-full font-bold text-[10px]">
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            icon={<Edit2 size={14} />}
            onClick={() => { setEditingUOM(record); form.setFieldsValue(record); setModalVisible(true); }}
            className="rounded-lg"
          />
          <Popconfirm
            title="Delete this unit?"
            description="This may affect items using this measurement."
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<Trash2 size={14} />} danger ghost className="rounded-lg" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Ruler className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Measurement Master</Title>
              <Text type="secondary">Standardize units for raw materials and inventory</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<Plus size={18}/>} 
            onClick={handleCreate}
            className="flex items-center gap-2 shadow-lg shadow-blue-100 h-12 px-6"
          >
            Add New Unit
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="mb-6 border-none shadow-sm rounded-2xl">
          <div className="flex flex-wrap gap-4 items-center">
            <Search size={18} className="text-slate-400" />
            <Input 
              placeholder="Search by name or symbol (e.g. Kilogram, kg)" 
              className="w-full max-w-md rounded-full bg-slate-50 border-slate-200"
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Divider type="vertical" />
            <Filter size={18} className="text-slate-400" />
            <Select
              style={{ width: 180 }}
              value={selectedType}
              onChange={(v) => { setSelectedType(v); setTimeout(fetchUOMs, 0); }}
              className="rounded-lg"
              bordered={false}
              dropdownStyle={{ borderRadius: '12px' }}
            >
              <Option value="all">All Categories</Option>
              {uomTypes.map(type => (
                <Option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</Option>
              ))}
            </Select>
            <Button icon={<RefreshCw size={16} />} onClick={fetchUOMs} className="border-none bg-slate-100 text-slate-500 rounded-lg hover:text-blue-600" />
          </div>
        </Card>

        {/* Main Content Area */}
        {loading ? (
          <Card className="border-none shadow-sm rounded-[32px] p-8 bg-white">
            <Skeleton active avatar paragraph={{ rows: 8 }} />
          </Card>
        ) : filteredUOMs.length === 0 ? (
          <EmptyState 
            icon={Scale}
            title="No Measurement Units"
            subtitle="You haven't defined any units yet. Create units like Kilogram, Liter, or Count to start managing your inventory items."
            actionText="Create First Unit"
            onAction={handleCreate}
          />
        ) : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700" bodyStyle={{ padding: 0 }}>
            <Table
              columns={columns}
              dataSource={filteredUOMs}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              className="custom-table"
            />
          </Card>
        )}

        {/* Create/Edit Modal */}
        <Modal
          title={<div className="flex items-center gap-2"><Layers size={18} className="text-blue-600" /> {editingUOM ? 'Update Unit' : 'New Measurement Unit'}</div>}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          confirmLoading={confirmLoading}
          width={500}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: 'Enter name' }]}
              tooltip="Full name (e.g., Kilogram, Liter)"
            >
              <Input placeholder="e.g., Kilogram" className="py-2" />
            </Form.Item>

            <Form.Item
              name="abbreviation"
              label="Abbreviation / Symbol"
              rules={[{ required: true, message: 'Enter symbol' }]}
              tooltip="Short form (e.g., kg, L, pcs)"
            >
              <Input placeholder="e.g., kg" className="py-2" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Unit Category"
              rules={[{ required: true, message: 'Select type' }]}
            >
              <Select placeholder="Select category" className="h-10">
                {uomTypes.map(type => (
                  <Option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>

      <style>{`
        .custom-table .ant-table-thead > tr > th { background: transparent !important; border-bottom: 2px solid #f1f5f9 !important; padding: 16px 24px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
        .custom-table .ant-table-tbody > tr > td { padding: 16px 24px; border-bottom: 1px solid #f8fafc !important; }
        .custom-table .ant-table-tbody > tr:hover > td { background: #f8fafc !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default UOMManagement;