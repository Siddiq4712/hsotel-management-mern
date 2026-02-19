import React, { useState, useEffect, useMemo } from 'react';
import { message } from 'antd';
import { 
  ConfigProvider as AntConfig, 
  Table as AntTable, 
  Button as AntButton, 
  Modal as AntModal, 
  Form as AntForm, 
  Input as AntInput, 
  Switch as AntSwitch,
  Typography as AntTypography,
  Tag as AntTag,
  Popconfirm as AntPopconfirm,
  Tooltip as AntTooltip,
  Space as AntSpace,
  Divider as AntDivider
} from 'antd';
import {
  Store, Plus, MapPin, Phone, Edit3, Trash2, 
  RefreshCw, Search, Link, ChevronRight, Info, Building2
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { Text } = AntTypography;

/* ─── Skeleton ─── */
const StoreSkeleton = () => (
  <div className="store-shell">
    <div className="store-skeleton-pulse" style={{ height: 60, borderRadius: 16, marginBottom: 32 }} />
    <div className="store-skeleton-pulse" style={{ height: 500, borderRadius: 24 }} />
  </div>
);

const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [form] = AntForm.useForm();
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
      message.error('Failed to sync procurement network');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const filteredStores = useMemo(() => {
    return stores.filter(s => 
      (s.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (s.address || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [stores, searchText]);

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

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingStore) {
        await messAPI.updateStore(editingStore.id, values);
        message.success('Provider profile updated');
      } else {
        await messAPI.createStore(values);
        message.success('New provider added to network');
      }
      setModalVisible(false);
      fetchStores();
    } catch {
      message.error('Operation failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: 'Provider Name',
      key: 'name',
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
            <Building2 size={18} />
          </div>
          <div className="flex flex-col">
            <Text strong className="text-slate-700 leading-tight">{r.name}</Text>
            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
              <MapPin size={10} /> <span>{r.address || 'Location Unspecified'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Contact Information',
      dataIndex: 'contact_number',
      key: 'contact',
      render: (text) => (
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><Phone size={12}/></div>
          <Text className="text-sm font-mono">{text || '—'}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      align: 'center',
      render: (active) => (
        <AntTag bordered={false} className={`rounded-full px-4 font-bold uppercase text-[9px] ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          {active ? 'Active' : 'Inactive'}
        </AntTag>
      )
    },
    {
      title: 'Management',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <AntSpace size="middle">
          <AntTooltip title="Map Inventory Items">
            <AntButton 
              type="text"
              className="hover:bg-indigo-50 text-indigo-500 rounded-lg"
              icon={<Link size={16} />}
              onClick={() => window.location.href = `/mess/item-store-mapping?store=${record.id}`}
            />
          </AntTooltip>
          <AntButton 
            type="text"
            className="hover:bg-slate-100 text-slate-500 rounded-lg"
            icon={<Edit3 size={16}/>}
            onClick={() => handleEdit(record)}
          />
          <AntPopconfirm 
            title="Remove provider?" 
            description="Linked inventory data may be affected."
            onConfirm={() => messAPI.deleteStore(record.id).then(fetchStores)}
          >
            <AntButton type="text" className="hover:bg-rose-50 text-rose-400 rounded-lg" icon={<Trash2 size={16}/>} />
          </AntPopconfirm>
        </AntSpace>
      )
    }
  ];

  if (loading) return <><style>{CSS}</style><StoreSkeleton /></>;

  return (
    <>
      <style>{CSS}</style>
      <AntConfig theme={{ token: { colorPrimary: '#1a56db', borderRadius: 12 } }}>
        <div className="store-shell">
          
          <div className="store-topbar">
            <div className="store-topbar-left">
              <div className="store-icon-badge"><Store size={22} /></div>
              <div>
                <h1 className="store-heading">Provider Management</h1>
                <p className="store-subheading">Manage your supplier network and procurement locations</p>
              </div>
            </div>
            <AntButton 
              type="primary" 
              icon={<Plus size={18}/>} 
              onClick={() => { setEditingStore(null); form.resetFields(); setModalVisible(true); }}
              className="store-save-btn"
            >
              Register Store
            </AntButton>
          </div>

          <div className="store-panel mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="store-search-box max-w-lg flex-1">
                <Search size={18} className="text-slate-300" />
                <AntInput 
                  placeholder="Search by provider name or location..." 
                  variant="borderless"
                  value={searchText} 
                  onChange={e => setSearchText(e.target.value)} 
                  allowClear 
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Text className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Show Inactive</Text>
                  <AntSwitch size="small" checked={showInactive} onChange={setShowInactive} />
                </div>
                <AntDivider type="vertical" className="h-8 bg-slate-200" />
                <AntButton icon={<RefreshCw size={14}/>} onClick={fetchStores} type="text" className="text-slate-500 font-bold text-xs">REFRESH</AntButton>
              </div>
            </div>
          </div>

          <div className="store-panel p-0 overflow-hidden">
            <AntTable
              columns={columns}
              dataSource={filteredStores}
              rowKey="id"
              pagination={{ pageSize: 10, className: "p-6" }}
              className="store-table"
            />
          </div>
        </div>

        <AntModal
          title={
            <div className="flex items-center gap-3 p-2">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Store size={20}/></div>
              <span className="text-lg font-bold">{editingStore ? 'Update Provider' : 'New Provider Registration'}</span>
            </div>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          centered
          width={500}
        >
          <AntForm form={form} layout="vertical" onFinish={handleSubmit} className="mt-6" initialValues={{ is_active: true }}>
            <AntForm.Item name="name" label="Legal Store Name" rules={[{ required: true }]}>
              <AntInput prefix={<ChevronRight size={14} className="text-slate-300"/>} placeholder="Enter full name..." className="store-input" />
            </AntForm.Item>
            <AntForm.Item name="address" label="Primary Location / Address">
              <AntInput.TextArea rows={3} placeholder="Full address details..." className="store-textarea" />
            </AntForm.Item>
            <AntForm.Item name="contact_number" label="Direct Contact Number">
              <AntInput prefix={<Phone size={14} className="text-slate-300 mr-2"/>} placeholder="+91 ..." className="store-input" />
            </AntForm.Item>
            
            <div className="store-info-card mb-8">
              <div className="flex items-center justify-between w-full">
                <div className="flex gap-3 items-center">
                  <Info size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Enabled for Procurement</span>
                </div>
                <AntForm.Item name="is_active" valuePropName="checked" noStyle><AntSwitch /></AntForm.Item>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <AntButton onClick={() => setModalVisible(false)} className="h-12 px-6 rounded-xl font-bold">Discard</AntButton>
              <AntButton type="primary" htmlType="submit" loading={confirmLoading} className="store-save-btn">
                {editingStore ? 'Save Changes' : 'Register Provider'}
              </AntButton>
            </div>
          </AntForm>
        </AntModal>
      </AntConfig>
    </>
  );
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
.store-shell { font-family: 'DM Sans', sans-serif; max-width: 1200px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; min-height: 100vh; }
.store-skeleton-pulse { background: #e2e8f0; animation: store-pulse 1.8s ease-in-out infinite; }
@keyframes store-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
.store-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.store-topbar-left { display: flex; align-items: center; gap: 16px; }
.store-icon-badge { width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 10px 20px rgba(30,64,175,.2); }
.store-heading { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
.store-subheading { font-size: 14px; color: #64748b; margin: 2px 0 0; }
.store-save-btn.ant-btn { height: 48px !important; padding: 0 28px !important; border-radius: 14px !important; font-weight: 700 !important; background: #1a56db !important; border: none !important; box-shadow: 0 8px 20px rgba(26,86,219,.25) !important; }
.store-panel { background: #ffffff; border-radius: 24px; padding: 20px 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,.02); }
.store-search-box { display: flex; align-items: center; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 0 16px; height: 48px; }
.store-table .ant-table-thead > tr > th { background: #f8fafc !important; color: #64748b !important; font-size: 10px !important; text-transform: uppercase !important; font-weight: 700 !important; letter-spacing: .1em; padding: 20px 24px !important; }
.store-table .ant-table-tbody > tr > td { padding: 20px 24px !important; border-bottom: 1px solid #f1f5f9 !important; }
.store-input, .store-textarea { border-radius: 12px !important; border-color: #e2e8f0 !important; font-size: 14px !important; }
.store-input { height: 44px !important; }
.store-textarea { padding: 12px !important; }
.store-info-card { display: flex; gap: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 16px; }
.ant-form-item-label > label { font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase; color: #64748b !important; letter-spacing: .05em; }
`;

export default StoreManagement;