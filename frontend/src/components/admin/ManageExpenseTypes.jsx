import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, 
  Divider, ConfigProvider, theme, Skeleton, 
  Tag, Modal, Input, Empty, message, Form, 
  Table, Segmented, Tooltip
} from 'antd';
import { 
  CreditCard, Plus, AlertCircle, 
  Edit3, Trash2, RefreshCw, LayoutGrid, Inbox, 
  Settings2, List, AlignJustify, Maximize, 
  Square, Hash, Clock, Receipt, BarChart3
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

// --- Specialized Skeletons for Statistics ---
const StatsSkeleton = () => (
  <Row gutter={[20, 20]} className="mb-8">
    {[...Array(3)].map((_, i) => (
      <Col xs={24} md={8} key={i}>
        <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white">
          <div className="flex items-center gap-4">
            <Skeleton.Button active style={{ width: 44, height: 44, borderRadius: 12 }} />
            <div className="space-y-2 flex-1">
              <Skeleton.Input active size="small" style={{ width: '50%', height: 10 }} />
              <Skeleton.Input active size="small" style={{ width: '30%', height: 20 }} />
            </div>
          </div>
        </Card>
      </Col>
    ))}
  </Row>
);

const ManageExpenseTypes = () => {
  const [form] = Form.useForm();
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);
  const [viewMode, setViewMode] = useState('tiles');

  const fetchExpenseTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getExpenseTypes();
      setExpenseTypes(response.data.data || []);
    } catch (error) {
      message.error('Expense ledger synchronization failed.');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { fetchExpenseTypes(); }, [fetchExpenseTypes]);

  // --- Derived Statistics ---
  const stats = useMemo(() => {
    return [
      { label: 'Expense Categories', val: expenseTypes.length, icon: Receipt, bg: 'bg-rose-50', color: 'text-rose-500' },
      { label: 'New This Month', val: expenseTypes.filter(e => moment(e.createdAt).isSame(moment(), 'month')).length, icon: BarChart3, bg: 'bg-orange-50', color: 'text-orange-500' },
      { label: 'System Status', val: 'Operational', icon: Hash, bg: 'bg-slate-50', color: 'text-slate-500' },
    ];
  }, [expenseTypes]);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleFinish = async (values) => {
    setBtnLoading(true);
    try {
      if (editingId) {
        await adminAPI.updateExpenseType(editingId, values);
        message.success('Expense protocol updated.');
      } else {
        await adminAPI.createExpenseType(values);
        message.success('New expense stream registered.');
      }
      setIsModalOpen(false);
      fetchExpenseTypes();
    } catch (error) {
      message.error(error.response?.data?.message || 'Update failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Void Expense Category?',
      icon: <AlertCircle className="text-rose-500 mr-2" strokeWidth={1.5} />,
      content: 'This will archive the category. Existing logs using this type will remain in historical records.',
      okText: 'Confirm Deletion',
      okType: 'danger',
      onOk: async () => {
        try {
          await adminAPI.deleteExpenseType(id);
          message.success('Registry purged.');
          fetchExpenseTypes();
        } catch (e) { message.error('Dependency error: Category is currently active.'); }
      }
    });
  };

  // --- VIEW RENDERERS ---

  const renderIconsView = () => (
    <Row gutter={[16, 16]}>
      {expenseTypes.map(item => (
        <Col xs={12} sm={8} md={6} lg={4} key={item.id}>
          <div className="group bg-white p-6 rounded-3xl border border-transparent hover:border-rose-200 hover:shadow-xl transition-all flex flex-col items-center text-center cursor-pointer" onClick={() => handleOpenModal(item)}>
              <div className="p-4 rounded-2xl mb-3 bg-rose-50 text-rose-500">
                 <CreditCard size={40} strokeWidth={1.2} />
              </div>
              <Text strong className="block truncate w-full">{item.name}</Text>
              <Text type="secondary" className="text-[10px] uppercase tracking-wider">Expense Type</Text>
          </div>
        </Col>
      ))}
    </Row>
  );

  const renderTilesView = () => (
    <Row gutter={[20, 20]}>
      {expenseTypes.map(item => (
        <Col xs={24} md={12} lg={8} key={item.id}>
          <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all overflow-hidden border-l-4 border-l-rose-500">
            <div className="flex justify-between items-start">
              <Space size={12}>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><CreditCard size={20}/></div>
                <div>
                  <Text strong className="text-base block">{item.name}</Text>
                  <Text type="secondary" className="text-[11px] truncate max-w-[150px] block">{item.description || 'No description'}</Text>
                </div>
              </Space>
              <div className="flex gap-1">
                <Button type="text" size="small" icon={<Edit3 size={14}/>} onClick={() => handleOpenModal(item)} />
                <Button type="text" size="small" danger icon={<Trash2 size={14}/>} onClick={() => handleDelete(item.id)} />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <Tag color="volcano" className="rounded-full border-none px-3 m-0 text-[10px]">Managed</Tag>
              <Text className="text-xs text-slate-400 font-light"><Clock size={12} className="inline mr-1"/> {moment(item.createdAt).format('MMM YYYY')}</Text>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {expenseTypes.map((item, idx) => (
        <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-rose-50/50 transition-colors ${idx !== expenseTypes.length - 1 ? 'border-b border-slate-50' : ''}`}>
           <Space size={16} className="flex-1">
              <CreditCard size={18} className="text-slate-300" />
              <div className="w-48"><Text strong>{item.name}</Text></div>
              <Tag color="default" className="rounded-full text-[10px] uppercase font-bold border-none px-3">Category</Tag>
              <Text type="secondary" className="text-xs italic truncate max-w-xs">{item.description}</Text>
           </Space>
           <Space size={24}>
             <Text className="text-xs text-slate-400">ID: {item.id}</Text>
             <Space>
               <Button type="text" size="small" icon={<Edit3 size={16}/>} onClick={() => handleOpenModal(item)} />
               <Button type="text" size="small" danger icon={<Trash2 size={16}/>} onClick={() => handleDelete(item.id)} />
             </Space>
           </Space>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <Table 
      dataSource={expenseTypes} 
      rowKey="id"
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      pagination={{ pageSize: 10 }}
      columns={[
        { title: 'Expense Name', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
        { title: 'Description', dataIndex: 'description', render: (d) => <Text type="secondary" className="text-xs">{d || '-'}</Text> },
        { title: 'Date Created', dataIndex: 'createdAt', render: (d) => moment(d).format('LL') },
        { 
          title: 'Actions', 
          align: 'right',
          render: (_, record) => (
            <Space>
              <Button type="link" size="small" className="text-rose-500" onClick={() => handleOpenModal(record)}>Edit</Button>
              <Button type="link" danger size="small" onClick={() => handleDelete(record.id)}>Void</Button>
            </Space>
          ) 
        }
      ]} 
    />
  );

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#e11d48', borderRadius: 14 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-rose-600 rounded-2xl shadow-xl shadow-rose-200 -rotate-2 transition-transform">
              <CreditCard className="text-white" size={28} strokeWidth={1.5} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>Expense Categories</Title>
              <Text type="secondary" className="font-light">Manage outflows and institutional spending types</Text>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: <Tooltip title="Icons"><Square size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'icons' },
                { label: <Tooltip title="Tiles"><LayoutGrid size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'tiles' },
                { label: <Tooltip title="List"><AlignJustify size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'list' },
                { label: <Tooltip title="Table"><List size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'details' },
              ]}
              className="p-1 bg-slate-100 rounded-xl"
            />
            <Divider type="vertical" className="h-8" />
            <Button icon={<RefreshCw size={16}/>} onClick={fetchExpenseTypes} type="text" className="rounded-xl">Sync</Button>
            <Button type="primary" icon={<Plus size={18}/>} onClick={() => handleOpenModal()} className="rounded-xl px-6 h-10 shadow-lg shadow-rose-100 border-none">Create Type</Button>
          </div>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <Skeleton active avatar paragraph={{ rows: 4 }} className="bg-white p-8 rounded-3xl" />
          </>
        ) : (
          <div className="animate-in fade-in duration-700">
            {/* Stats Cards */}
            <Row gutter={[20, 20]} className="mb-8">
              {stats.map((stat, i) => (
                <Col xs={24} md={8} key={i}>
                  <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white hover:bg-rose-50/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                        <stat.icon size={20} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <Text className="text-[11px] uppercase text-slate-400 tracking-wider font-medium">{stat.label}</Text>
                        <Text className="text-2xl text-slate-700 font-semibold leading-tight">{stat.val}</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {expenseTypes.length === 0 ? (
               <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[32px] shadow-sm border border-slate-50">
                 <Empty image={<Inbox size={64} className="text-slate-200 mb-4" />} description="No expense types categorized." />
               </div>
            ) : (
              <>
                {viewMode === 'icons' && renderIconsView()}
                {viewMode === 'tiles' && renderTilesView()}
                {viewMode === 'list' && renderListView()}
                {viewMode === 'details' && renderTableView()}
              </>
            )}
          </div>
        )}

        {/* Action Modal */}
        <Modal
          title={
            <div className="flex items-center gap-3 py-2 border-b border-slate-50 w-full">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Settings2 size={20}/></div>
              <span className="font-semibold text-slate-700">{editingId ? 'Modify Expense Protocol' : 'Register Expense Type'}</span>
            </div>
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={450}
          centered
          className="rounded-3xl overflow-hidden"
        >
          <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-6 px-2">
            <Form.Item name="name" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Type Label</Text>} rules={[{ required: true, message: 'Please enter a name' }]}>
              <Input placeholder="e.g., Campus Maintenance" className="h-12 bg-slate-50 border-none rounded-xl" />
            </Form.Item>
            
            <Form.Item name="description" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Purpose Description</Text>}>
              <Input.TextArea placeholder="Describe the scope of this expense..." rows={4} className="bg-slate-50 border-none rounded-xl" />
            </Form.Item>

            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex gap-3 mb-6">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <Text className="text-[11px] text-amber-700 leading-relaxed font-light">
                New expense types will immediately become available for book-keeping entries.
              </Text>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-medium">Cancel</Button>
              <Button type="primary" block htmlType="submit" loading={btnLoading} className="flex-[2] h-12 rounded-xl font-semibold shadow-xl shadow-rose-100 border-none">
                {editingId ? 'Save Changes' : 'Confirm Registry'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ManageExpenseTypes;