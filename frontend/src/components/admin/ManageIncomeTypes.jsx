import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, 
  Divider, ConfigProvider, theme, Skeleton, 
  Tag, Modal, Input, Empty, message, Form, 
  Table, Segmented, Tooltip
} from 'antd';
import { 
  DollarSign, Plus, AlertCircle, 
  Edit3, Trash2, RefreshCw, LayoutGrid, Inbox, 
  Settings2, List, AlignJustify, Maximize, 
  Square, Hash, Clock, FileText, TrendingUp
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

const ManageIncomeTypes = () => {
  const [form] = Form.useForm();
  const [incomeTypes, setIncomeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);
  const [viewMode, setViewMode] = useState('tiles');

  const fetchIncomeTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getIncomeTypes();
      setIncomeTypes(response.data.data || []);
    } catch (error) {
      message.error('Financial ledger synchronization failed.');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { fetchIncomeTypes(); }, [fetchIncomeTypes]);

  // --- Derived Statistics ---
  const stats = useMemo(() => {
    return [
      { label: 'Total Categories', val: incomeTypes.length, icon: Hash, bg: 'bg-emerald-50', color: 'text-emerald-500' },
      { label: 'Recent Additions', val: incomeTypes.filter(i => moment(i.createdAt).isAfter(moment().subtract(7, 'days'))).length, icon: TrendingUp, bg: 'bg-blue-50', color: 'text-blue-500' },
      { label: 'Active Protocols', val: 'Verified', icon: FileText, bg: 'bg-indigo-50', color: 'text-indigo-500' },
    ];
  }, [incomeTypes]);

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
        await adminAPI.updateIncomeType(editingId, values);
        message.success('Income category updated.');
      } else {
        await adminAPI.createIncomeType(values);
        message.success('New revenue stream registered.');
      }
      setIsModalOpen(false);
      fetchIncomeTypes();
    } catch (error) {
      message.error(error.response?.data?.message || 'Transaction failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Void Income Category?',
      icon: <AlertCircle className="text-rose-500 mr-2" strokeWidth={1.5} />,
      content: 'Archiving this type may affect financial reporting for linked transactions.',
      okText: 'Confirm Deletion',
      okType: 'danger',
      onOk: async () => {
        try {
          await adminAPI.deleteIncomeType(id);
          message.success('Registry purged.');
          fetchIncomeTypes();
        } catch (e) { message.error('Constraint error: Category in use.'); }
      }
    });
  };

  // --- VIEW RENDERERS ---

  const renderIconsView = () => (
    <Row gutter={[16, 16]}>
      {incomeTypes.map(item => (
        <Col xs={12} sm={8} md={6} lg={4} key={item.id}>
          <div className="group bg-white p-6 rounded-3xl border border-transparent hover:border-emerald-200 hover:shadow-xl transition-all flex flex-col items-center text-center cursor-pointer" onClick={() => handleOpenModal(item)}>
              <div className="p-4 rounded-2xl mb-3 bg-emerald-50 text-emerald-500">
                 <DollarSign size={40} strokeWidth={1.2} />
              </div>
              <Text strong className="block truncate w-full">{item.name}</Text>
              <Text type="secondary" className="text-[10px] uppercase tracking-wider">Revenue Type</Text>
          </div>
        </Col>
      ))}
    </Row>
  );

  const renderTilesView = () => (
    <Row gutter={[20, 20]}>
      {incomeTypes.map(item => (
        <Col xs={24} md={12} lg={8} key={item.id}>
          <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all overflow-hidden border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start">
              <Space size={12}>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20}/></div>
                <div>
                  <Text strong className="text-base block">{item.name}</Text>
                  <Text type="secondary" className="text-[11px] truncate max-w-[150px] block">{item.description || 'No description provided'}</Text>
                </div>
              </Space>
              <div className="flex gap-1">
                <Button type="text" size="small" icon={<Edit3 size={14}/>} onClick={() => handleOpenModal(item)} />
                <Button type="text" size="small" danger icon={<Trash2 size={14}/>} onClick={() => handleDelete(item.id)} />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <Tag color="green" className="rounded-full border-none px-3 m-0">Verified Type</Tag>
              <Text className="text-xs text-slate-400 font-light"><Clock size={12} className="inline mr-1"/> {moment(item.createdAt).format('DD MMM')}</Text>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {incomeTypes.map((item, idx) => (
        <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-emerald-50/50 transition-colors ${idx !== incomeTypes.length - 1 ? 'border-b border-slate-50' : ''}`}>
           <Space size={16} className="flex-1">
              <DollarSign size={18} className="text-slate-300" />
              <div className="w-48"><Text strong>{item.name}</Text></div>
              <Tag color="blue" className="rounded-full text-[10px] uppercase font-bold border-none px-3">Category</Tag>
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

  const renderDetailsView = () => (
    <Table 
      dataSource={incomeTypes} 
      rowKey="id"
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      pagination={{ pageSize: 8 }}
      columns={[
        { title: 'Category Name', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
        { title: 'Description', dataIndex: 'description', render: (d) => <Text type="secondary">{d || '-'}</Text> },
        { title: 'Created Date', dataIndex: 'createdAt', render: (d) => moment(d).format('DD MMM, YYYY') },
        { 
          title: 'Actions', 
          align: 'right',
          render: (_, record) => (
            <Space>
              <Button type="link" size="small" onClick={() => handleOpenModal(record)}>Edit</Button>
              <Button type="link" danger size="small" onClick={() => handleDelete(record.id)}>Void</Button>
            </Space>
          ) 
        }
      ]} 
    />
  );

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#059669', borderRadius: 14 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-200 rotate-3 transition-transform">
              <DollarSign className="text-white" size={28} strokeWidth={1.5} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>Revenue Ledger</Title>
              <Text type="secondary" className="font-light">Categorize and manage institutional income streams</Text>
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
            <Button icon={<RefreshCw size={16}/>} onClick={fetchIncomeTypes} type="text" className="rounded-xl">Sync</Button>
            <Button type="primary" icon={<Plus size={18}/>} onClick={() => handleOpenModal()} className="rounded-xl px-6 h-10 shadow-lg shadow-emerald-100 border-none">Create Category</Button>
          </div>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <Skeleton active avatar paragraph={{ rows: 4 }} className="bg-white p-8 rounded-3xl" />
          </>
        ) : (
          <div className="animate-in fade-in duration-700">
            <Row gutter={[20, 20]} className="mb-8">
              {stats.map((stat, i) => (
                <Col xs={24} md={8} key={i}>
                  <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white hover:bg-emerald-50/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                        <stat.icon size={20} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <Text className="text-[11px] uppercase text-slate-400 tracking-wider">{stat.label}</Text>
                        <Text className="text-2xl text-slate-700" style={{ fontWeight: 500, lineHeight: 1.2 }}>{stat.val}</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {incomeTypes.length === 0 ? (
               <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[32px] shadow-sm border border-slate-50">
                 <Empty image={<Inbox size={64} className="text-slate-200 mb-4" />} description="No income types defined yet." />
               </div>
            ) : (
              <>
                {viewMode === 'icons' && renderIconsView()}
                {viewMode === 'tiles' && renderTilesView()}
                {viewMode === 'list' && renderListView()}
                {viewMode === 'details' && renderDetailsView()}
              </>
            )}
          </div>
        )}

        {/* Action Modal */}
        <Modal
          title={
            <div className="flex items-center gap-3 py-2 border-b border-slate-50 w-full">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Settings2 size={20}/></div>
              <span className="font-semibold text-slate-700">{editingId ? 'Edit Category' : 'New Income Category'}</span>
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
            <Form.Item name="name" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Type Name</Text>} rules={[{ required: true, message: 'Label required' }]}>
              <Input placeholder="e.g., Semester Tuition Fees" className="h-12 bg-slate-50 border-none rounded-xl" />
            </Form.Item>
            
            <Form.Item name="description" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Context / Description</Text>}>
              <Input.TextArea placeholder="Specify purpose of this income type..." rows={4} className="bg-slate-50 border-none rounded-xl" />
            </Form.Item>

            <div className="flex gap-3 mt-8">
              <Button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-medium">Cancel</Button>
              <Button type="primary" block htmlType="submit" loading={btnLoading} className="flex-[2] h-12 rounded-xl font-semibold shadow-xl shadow-emerald-100 border-none">
                {editingId ? 'Update Registry' : 'Confirm Category'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ManageIncomeTypes;