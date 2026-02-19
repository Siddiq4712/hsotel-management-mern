import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Space, message, Modal, Form, Input,
  Select, Popconfirm, Typography, Tag, ConfigProvider, theme, Skeleton, Divider
} from 'antd';
import {
  Ruler, Plus, Search, Edit2, Trash2, Info, 
  Scale, Filter, RefreshCw, Box, Layers, Weight, Droplets, Hash
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { Option } = Select;
const { Title, Text } = Typography;

/* ─── Design Tokens ─────────────────────────────────────────────── */
const T = {
  bg:        '#F7F8FA',
  surface:   '#FFFFFF',
  border:    '#E8EAED',
  borderHov: '#C8CDD5',
  ink:       '#141820',
  inkMid:    '#4B5263',
  inkSoft:   '#8B92A5',
  accent:    '#1A56DB',
  accentBg:  '#EBF2FF',
  danger:    '#DC2626',
  dangerBg:  '#FEF2F2',
  success:   '#16A34A',
  successBg: '#F0FDF4',
  radius:    '12px',
  shadow:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
};

const typeConfig = {
  weight: { label: 'Weight', color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
  volume: { label: 'Volume', color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
  length: { label: 'Length', color: '#5B21B6', bg: '#F5F3FF', dot: '#8B5CF6' },
  count:  { label: 'Count',  color: '#92400E', bg: '#FFFBEB', dot: '#F59E0B' },
  other:  { label: 'Other',  color: '#374151', bg: '#F3F4F6', dot: '#9CA3AF' },
};

/* ─── Sub-components ─────────────────────────────────────────────── */
const TypeBadge = ({ type }) => {
  const cfg = typeConfig[type] || typeConfig.other;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label.toUpperCase()}
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon, accent }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radius, padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: 16, boxShadow: T.shadow,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: accent ? T.accentBg : T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={20} color={accent ? T.accent : T.inkSoft} />
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, fontWeight: 600 }}>{label.toUpperCase()}</div>
    </div>
  </div>
);

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, marginBottom: 6, letterSpacing: '0.04em' }}>
    {children}
  </div>
);

const ActionBtn = ({ icon, children, onClick, variant }) => {
  const styles = {
    danger:  { bg: T.dangerBg, color: T.danger, border: 'transparent', hover: '#FEE2E2' },
    default: { bg: T.surface, color: T.inkMid, border: T.border, hover: T.bg },
  };
  const s = styles[variant] || styles.default;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: children ? '6px 12px' : '7px',
        borderRadius: 8, border: `1px solid ${s.border}`,
        background: s.bg, color: s.color,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = s.hover}
      onMouseLeave={e => e.currentTarget.style.background = s.bg}
    >
      {icon}{children}
    </button>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const UOMManagement = () => {
  const [uoms, setUOMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUOM, setEditingUOM] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const fetchUOMs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== 'all') params.type = selectedType;
      const response = await messAPI.getUOMs(params);
      setUOMs(response.data.data || []);
    } catch (error) {
      message.error('Failed to sync units');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchUOMs();
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, [fetchUOMs]);

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingUOM) {
        await messAPI.updateUOM(editingUOM.id, values);
        message.success('Unit updated');
      } else {
        await messAPI.createUOM(values);
        message.success('New unit registered');
      }
      setModalVisible(false);
      fetchUOMs();
    } catch (error) {
      message.error('Operation failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteUOM(id);
      message.success('Unit removed');
      fetchUOMs();
    } catch (error) {
      message.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const stats = useMemo(() => {
    return {
      total: uoms.length,
      weight: uoms.filter(u => u.type === 'weight').length,
      volume: uoms.filter(u => u.type === 'volume').length,
      others: uoms.filter(u => !['weight', 'volume'].includes(u.type)).length,
    };
  }, [uoms]);

  const columns = [
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>UNIT NAME</span>,
      dataIndex: 'name',
      render: (t) => <span style={{ fontWeight: 600, color: T.ink }}>{t}</span>
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>ABBREVIATION</span>,
      dataIndex: 'abbreviation',
      render: (text) => <span style={{ fontFamily: 'DM Mono', background: T.bg, padding: '2px 8px', borderRadius: 4, fontWeight: 600, color: T.accent }}>{text}</span>
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>MEASUREMENT TYPE</span>,
      dataIndex: 'type',
      render: (type) => <TypeBadge type={type} />,
    },
    {
      title: '',
      align: 'right',
      render: (_, record) => (
        <Space>
          <ActionBtn icon={<Edit2 size={13}/>} onClick={() => { setEditingUOM(record); form.setFieldsValue(record); setModalVisible(true); }}>Edit</ActionBtn>
          <Popconfirm title="Delete this unit?" onConfirm={() => handleDelete(record.id)}>
            <ActionBtn icon={<Trash2 size={13}/>} variant="danger" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.accent, borderRadius: 8, fontFamily: "'DM Sans', sans-serif" } }}>
      <style>{`
        .pm-table .ant-table-thead > tr > th { background: #F7F8FA !important; border-bottom: 1px solid ${T.border} !important; padding: 12px 16px !important; }
        .pm-table .ant-table-tbody > tr > td { padding: 14px 16px !important; border-bottom: 1px solid ${T.border} !important; }
        .pm-form-input .ant-input, .pm-form-input .ant-select-selector { border-radius: 8px !important; }
        .pm-modal .ant-modal-content { border-radius: 14px; overflow: hidden; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 40 }}>
        
        {/* Header */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ruler size={20} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>Measurement Master</div>
              <div style={{ fontSize: 12, color: T.inkSoft }}>Standardize units for raw materials and inventory</div>
            </div>
          </div>
          <button
            onClick={() => { setEditingUOM(null); form.resetFields(); setModalVisible(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff',
              border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', boxShadow: `0 2px 8px rgba(26,86,219,0.3)`
            }}
          >
            <Plus size={16} /> Add New Unit
          </button>
        </div>

        <div style={{ padding: '28px 32px' }}>
          
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total Units" value={stats.total} icon={Layers} accent />
            <StatCard label="Weight Metrics" value={stats.weight} icon={Weight} />
            <StatCard label="Volume Metrics" value={stats.volume} icon={Droplets} />
            <StatCard label="Other / Count" value={stats.others} icon={Hash} />
          </div>

          {/* Filters Bar */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
            padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, boxShadow: T.shadow
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', width: 300 }}>
                <Search size={14} color={T.inkSoft} />
                <input
                  placeholder="Search units..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: T.ink, width: '100%' }}
                />
              </div>
              <Divider type="vertical" style={{ height: 24 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', ...Object.keys(typeConfig)].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: '1px solid',
                      borderColor: selectedType === type ? T.accent : T.border,
                      background: selectedType === type ? T.accentBg : 'transparent',
                      color: selectedType === type ? T.accent : T.inkMid,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s'
                    }}
                  >
                    {type === 'all' ? 'All' : typeConfig[type].label}
                  </button>
                ))}
              </div>
            </div>
            
            <ActionBtn icon={<RefreshCw size={14}/>} onClick={fetchUOMs}>Sync</ActionBtn>
          </div>

          {/* Table Container */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', boxShadow: T.shadow }}>
            <Table
              className="pm-table"
              columns={columns}
              dataSource={uoms.filter(u => 
                u.name.toLowerCase().includes(searchText.toLowerCase()) || 
                u.abbreviation.toLowerCase().includes(searchText.toLowerCase())
              )}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, size: 'small' }}
            />
          </div>
        </div>

        {/* Create/Edit Modal */}
        <Modal
          className="pm-modal"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={15} color={T.accent} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{editingUOM ? 'Update Unit' : 'Configure New Unit'}</span>
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          confirmLoading={confirmLoading}
          width={450}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="pm-form-input" style={{ marginTop: 12 }}>
            <Form.Item name="name" label={<FieldLabel>Unit Full Name</FieldLabel>} rules={[{ required: true }]}>
              <Input placeholder="e.g., Kilogram" />
            </Form.Item>

            <Form.Item name="abbreviation" label={<FieldLabel>Symbol / Short Form</FieldLabel>} rules={[{ required: true }]}>
              <Input placeholder="e.g., kg" />
            </Form.Item>

            <Form.Item name="type" label={<FieldLabel>Measurement Category</FieldLabel>} rules={[{ required: true }]}>
              <Select placeholder="Select category">
                {Object.entries(typeConfig).map(([val, cfg]) => (
                  <Option key={val} value={val}>{cfg.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default UOMManagement;