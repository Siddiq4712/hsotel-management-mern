import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, DatePicker, Select,
  message, Popconfirm, Modal, List, Typography, Tooltip, Row, Col, Alert,
  ConfigProvider, theme, Skeleton, Divider, Empty
} from 'antd';
// Lucide icons for consistency
import { 
  Search, Eye, Trash2, CheckCircle2, Calendar, 
  Filter, Utensils, AlertTriangle, ChevronRight, Plus, X, ClipboardList, FileX
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

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

const MenuScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([
    moment().startOf('day'),
    moment().add(7, 'days').endOf('day')
  ]);
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [lowStockAlert, setLowStockAlert] = useState(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      if (selectedMealType !== 'all') params.meal_time = selectedMealType;
      
      const response = await messAPI.getMenuSchedule(params);
      setSchedules(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch schedules');
    } finally {
      // Artificial delay to ensure a smooth transition from Skeleton to Data/Empty state
      setTimeout(() => setLoading(false), 1200);
    }
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteMenuSchedule(id);
      message.success('Schedule deleted successfully');
      fetchSchedules();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const handleMarkAsServed = async (id) => {
    try {
      const response = await messAPI.serveMenu(id);
      message.success('Menu marked as served. FIFO Stock deduction completed.');
      
      if (response.data.data?.lowStockItems?.length > 0) {
        setLowStockAlert({
          items: response.data.data.lowStockItems,
          message: 'The following items have fallen below threshold after this deduction:'
        });
      }
      fetchSchedules();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to serve menu');
    }
  };

  const getMealColor = (mealType) => {
    const colors = { breakfast: '#3b82f6', lunch: '#10b981', dinner: '#8b5cf6', snacks: '#f59e0b' };
    return colors[mealType] || '#64748b';
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'scheduled_date',
      key: 'date',
      render: (date) => moment(date).format('DD MMM YYYY'),
    },
    {
      title: 'Meal Time',
      dataIndex: 'meal_time',
      key: 'meal_time',
      render: (text) => (
        <Tag bordered={false} style={{ background: `${getMealColor(text)}15`, color: getMealColor(text), fontWeight: 600 }} className="px-3 rounded-full">
          {text.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Menu Template',
      key: 'menu',
      render: (_, record) => (
        <Space>
          <Text strong className="text-slate-700">{record.Menu?.name || 'Unknown'}</Text>
          <Text type="secondary" className="text-xs">({record.Menu?.tbl_Menu_Items?.length || 0} items)</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { scheduled: 'processing', served: 'success', cancelled: 'error' };
        return <Tag color={colors[status]} className="rounded-full px-3">{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Costing (₹)',
      key: 'cost',
      align: 'right',
      render: (_, record) => (
        <div className="text-right">
          <Text strong className="block text-blue-600">₹{parseFloat(record.total_cost || 0).toFixed(2)}</Text>
          <Text className="text-[10px] text-slate-400 uppercase">₹{parseFloat(record.cost_per_serving || 0).toFixed(2)} / plate</Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button icon={<Eye size={14} />} onClick={() => { setSelectedSchedule(record); setDetailsModalVisible(true); }} className="rounded-lg" />
          {record.status === 'scheduled' && (
            <>
              <Popconfirm 
                title="Mark as Served?" 
                description="This will deduct raw materials from inventory using FIFO."
                onConfirm={() => handleMarkAsServed(record.id)}
              >
                <Button icon={<CheckCircle2 size={14} />} type="primary" className="bg-emerald-600 border-none rounded-lg" />
              </Popconfirm>
              <Popconfirm title="Delete schedule?" onConfirm={() => handleDelete(record.id)}>
                <Button icon={<Trash2 size={14} />} danger ghost className="rounded-lg" />
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <ClipboardList className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Schedule Logs</Title>
              <Text type="secondary">Track meal history and final inventory consumption</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<Plus size={18}/>} 
            onClick={() => window.location.href='/mess/menu-planner'} 
            className="flex items-center gap-2 shadow-lg shadow-blue-100 h-12 px-6"
          >
            Plan New Menu
          </Button>
        </div>

        {/* Low Stock Alert */}
        {lowStockAlert && (
          <Alert
            className="mb-6 rounded-2xl border-none shadow-sm animate-in fade-in slide-in-from-top-4"
            message={<Text strong className="text-amber-800">{lowStockAlert.message}</Text>}
            description={
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStockAlert.items.map(item => (
                  <Tag key={item.name} color="warning" className="rounded-lg border-amber-200">
                    {item.name}: <span className="font-bold">{parseFloat(item.current_stock).toFixed(2)}</span> / {parseFloat(item.minimum_stock).toFixed(2)}
                  </Tag>
                ))}
              </div>
            }
            type="warning"
            showIcon
            icon={<AlertTriangle className="text-amber-500" />}
            closable
            onClose={() => setLowStockAlert(null)}
          />
        )}

        {/* Filters Card */}
        <Card className="mb-6 border-none shadow-sm rounded-2xl">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-slate-400" />
              <RangePicker value={dateRange} onChange={setDateRange} className="rounded-lg" />
            </div>
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-slate-400" />
              <Select
                style={{ width: 160 }}
                value={selectedMealType}
                onChange={(v) => setSelectedMealType(v)}
                className="rounded-lg"
              >
                <Option value="all">All Meals</Option>
                <Option value="breakfast">Breakfast</Option>
                <Option value="lunch">Lunch</Option>
                <Option value="dinner">Dinner</Option>
                <Option value="snacks">Snacks</Option>
              </Select>
            </div>
            <Button type="primary" icon={<Search size={16}/>} onClick={fetchSchedules} className="rounded-lg px-8">
              Filter Records
            </Button>
          </div>
        </Card>

        {/* --- MAIN CONTENT LOGIC --- */}
        {loading ? (
          <Card className="border-none shadow-sm rounded-[32px] p-8 bg-white">
            <Skeleton active avatar paragraph={{ rows: 8 }} />
          </Card>
        ) : schedules.length === 0 ? (
          <EmptyState 
            icon={FileX}
            title="No Meal Records"
            subtitle="We couldn't find any meal schedules for this period. Try adjusting your filters or plan a meal template."
            actionText="Go to Menu Planner"
            onAction={() => window.location.href='/mess/menu-planner'}
          />
        ) : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table
              columns={columns}
              dataSource={schedules}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              className="custom-table"
            />
          </Card>
        )}

        {/* Details Modal */}
        <Modal
          title={<div className="flex items-center gap-2"><Utensils size={18} className="text-blue-600" /> Meal Finalization</div>}
          open={detailsModalVisible}
          onCancel={() => setDetailsModalVisible(false)}
          footer={<Button onClick={() => setDetailsModalVisible(false)} className="rounded-lg">Close</Button>}
          width={650}
          className="rounded-2xl"
        >
          {selectedSchedule && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Text className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Schedule Info</Text>
                  <Text strong className="block text-slate-700">{moment(selectedSchedule.scheduled_date).format('DD MMM YYYY')}</Text>
                  <Tag bordered={false} style={{ background: `${getMealColor(selectedSchedule.meal_time)}15`, color: getMealColor(selectedSchedule.meal_time) }} className="mt-2 uppercase font-bold text-[10px]">
                    {selectedSchedule.meal_time}
                  </Tag>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Text className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Financial Analysis</Text>
                  <Text strong className="block text-slate-700">Total: ₹{parseFloat(selectedSchedule.total_cost || 0).toFixed(2)}</Text>
                  <Text className="text-xs text-blue-600 font-medium">₹{parseFloat(selectedSchedule.cost_per_serving || 0).toFixed(2)} per plate</Text>
                </div>
              </div>

              <Divider orientation="left" className="text-slate-400 text-[10px] uppercase tracking-widest">Recipe Ingredients</Divider>
              <List
                dataSource={selectedSchedule.Menu?.tbl_Menu_Items || []}
                renderItem={item => (
                  <div className="flex justify-between items-center p-3 mb-2 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                    <div>
                      <Text strong className="block text-slate-700">{item.tbl_Item?.name}</Text>
                      <Text type="secondary" className="text-[11px]">Requirement per schedule</Text>
                    </div>
                    <Text strong className="text-blue-600 font-mono">{parseFloat(item.quantity || 0).toFixed(2)} {item.unit}</Text>
                  </div>
                )}
                locale={{ emptyText: <Empty description="No components mapped" /> }}
              />

              {selectedSchedule.status === 'scheduled' && (
                <div className="mt-8 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div className="max-w-[60%]">
                    <Text strong className="text-emerald-800 block">Deduct Stock & Close?</Text>
                    <Text className="text-emerald-600 text-xs">Finalizing will deduct items from your store using FIFO logic for {selectedSchedule.estimated_servings} servings.</Text>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<CheckCircle2 size={18} />} 
                    className="bg-emerald-600 hover:bg-emerald-700 border-none shadow-lg shadow-emerald-200 h-11 px-6"
                    onClick={() => { handleMarkAsServed(selectedSchedule.id); setDetailsModalVisible(false); }}
                  >
                    Confirm Service
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MenuScheduleManagement;