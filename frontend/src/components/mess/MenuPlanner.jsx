import React, { useState, useEffect } from 'react';
import {
  Card, Calendar, Badge, Button, Modal, Form, Select, DatePicker,
  message, InputNumber, Typography, Space, List, Tag, Popconfirm, Row, Col,
  Tooltip, Spin, Divider, ConfigProvider, theme, Skeleton
} from 'antd';
// Lucide icons for consistency
import {
  CalendarDays, Plus, Eye, Trash2, CheckCircle2, 
  ChevronRight, Clock, Utensils, Filter, RefreshCw
} from 'lucide-react';
import { messAPI } from '../../services/api';
import { useStockContext } from '../../context/StockContext';
import moment from 'moment';

const { Option } = Select;
const { Text, Title } = Typography;

const MenuPlanner = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [menuDetailsVisible, setMenuDetailsVisible] = useState(false);
  const [menuScheduleDetailsVisible, setMenuScheduleDetailsVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [dailySchedules, setDailySchedules] = useState({});
  const [allSchedulesModalVisible, setAllSchedulesModalVisible] = useState(false);
  const [schedulesForDate, setSchedulesForDate] = useState([]);

  const { triggerStockRefresh } = useStockContext();

  useEffect(() => {
    fetchInitialData();
  }, [currentMonth]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const startDate = moment(currentMonth).startOf('month').format('YYYY-MM-DD');
      const endDate = moment(currentMonth).endOf('month').format('YYYY-MM-DD');
      
      const [menuRes, scheduleRes] = await Promise.all([
        messAPI.getMenus(),
        messAPI.getMenuSchedule({ start_date: startDate, end_date: endDate })
      ]);

      setMenus(menuRes.data.data || []);
      const scheduleData = scheduleRes.data.data || [];
      
      const grouped = scheduleData.reduce((acc, schedule) => {
        const dateStr = moment(schedule.scheduled_date).format('YYYY-MM-DD');
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(schedule);
        return acc;
      }, {});
      
      setDailySchedules(grouped);
    } catch (error) {
      message.error('Failed to load planner data');
    } finally {
      setLoading(false);
    }
  };

  const getMealColor = (mealType) => {
    const colors = { breakfast: '#3b82f6', lunch: '#10b981', dinner: '#8b5cf6', snacks: '#f59e0b' };
    return colors[mealType] || '#3b82f6';
  };

  // --- Date Cell Rendering ---
  const dateCellRender = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const schedules = dailySchedules[dateStr] || [];
    
    return (
      <div className="flex flex-col h-full group">
        <div className="flex-1 overflow-hidden">
          {schedules.map(s => (
            <div key={s.id} className="mb-1">
              <Badge 
                color={getMealColor(s.meal_time)} 
                text={
                  <span className="text-[10px] font-medium text-slate-500 uppercase">
                    {s.meal_time.charAt(0)}: {s.Menu?.name}
                  </span>
                } 
              />
            </div>
          ))}
        </div>
        
        {/* ADDED: Action Button for every date */}
        <div className="mt-auto pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            size="small" 
            type="dashed" 
            block
            icon={<Plus size={12} />}
            className="text-[10px] h-6 flex items-center justify-center border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white"
            onClick={(e) => {
                e.stopPropagation();
                handleDateAction(date);
            }}
          >
            Manage
          </Button>
        </div>
      </div>
    );
  };

  const handleDateAction = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const existing = dailySchedules[dateStr] || [];
    
    if (existing.length > 0) {
      setSchedulesForDate(existing);
      setSelectedDate(date);
      setAllSchedulesModalVisible(true);
    } else {
      openScheduleModal(date);
    }
  };

  const openScheduleModal = (date) => {
    setSelectedDate(date);
    setModalVisible(true);
    form.setFieldsValue({
      scheduled_date: date,
      meal_time: null,
      menu_id: null,
    });
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      const formattedValues = {
        ...values,
        scheduled_date: values.scheduled_date.format('YYYY-MM-DD'),
      };
      await messAPI.scheduleMenu(formattedValues);
      message.success('Menu scheduled');
      setModalVisible(false);
      fetchInitialData();
    } catch (error) {
      message.error('Failed to schedule menu');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <CalendarDays className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Menu Planner</Title>
              <Text type="secondary">Organize and track scheduled meals for {currentMonth.format('MMMM YYYY')}</Text>
            </div>
          </div>
          <Space>
            <Button icon={<RefreshCw size={16}/>} onClick={fetchInitialData} className="flex items-center gap-2">Refresh</Button>
            <Button 
                type="primary" 
                size="large" 
                icon={<Plus size={18}/>} 
                className="flex items-center gap-2 shadow-lg shadow-blue-100"
                onClick={() => openScheduleModal(moment())}
            >
                Quick Schedule
            </Button>
          </Space>
        </div>

        {/* Calendar Card */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden" bodyStyle={{ padding: '24px' }}>
          {loading ? (
            <div className="p-20 text-center"><Skeleton active paragraph={{ rows: 10 }} /></div>
          ) : (
            <Calendar
              dateCellRender={dateCellRender}
              onPanelChange={(date) => setCurrentMonth(date)}
              onSelect={(date) => {
                  // Only trigger if clicking a date, but let the "Manage" button handle specific logic
                  if(date.month() === currentMonth.month()) handleDateAction(date);
              }}
              mode="month"
              className="custom-calendar"
            />
          )}
        </Card>

        {/* Modal: Add Menu */}
        <Modal
          title={<div className="flex items-center gap-2"><Plus size={18} className="text-blue-600"/> Schedule Meal</div>}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          confirmLoading={confirmLoading}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
            <Form.Item name="scheduled_date" label="Selected Date"><DatePicker className="w-full" disabled /></Form.Item>
            <Form.Item name="meal_time" label="Meal Category" rules={[{ required: true }]}>
              <Select placeholder="Select Time" onChange={(v) => setSelectedMeal(v)}>
                <Option value="breakfast">Breakfast</Option>
                <Option value="lunch">Lunch</Option>
                <Option value="dinner">Dinner</Option>
                <Option value="snacks">Snacks</Option>
              </Select>
            </Form.Item>
            <Form.Item name="menu_id" label="Menu Template" rules={[{ required: true }]}>
              <Select placeholder="Choose Menu" showSearch optionFilterProp="children">
                {menus.filter(m => !selectedMeal || m.meal_type === selectedMeal).map(m => (
                  <Option key={m.id} value={m.id}>{m.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal: View All for Date */}
        <Modal
          title={`Daily Schedule: ${selectedDate?.format('DD MMM YYYY')}`}
          open={allSchedulesModalVisible}
          onCancel={() => setAllSchedulesModalVisible(false)}
          footer={<Button onClick={() => openScheduleModal(selectedDate)} type="primary" icon={<Plus size={14}/>}>Add Another Meal</Button>}
          width={700}
        >
          <List
            className="mt-4"
            dataSource={schedulesForDate}
            renderItem={s => (
              <List.Item
                className="bg-slate-50 mb-3 p-4 rounded-xl border border-slate-100 flex flex-col items-start gap-3"
                actions={[
                  <Button icon={<Eye size={14}/>} onClick={() => { setSelectedSchedule(s); setMenuScheduleDetailsVisible(true); }}>Details</Button>,
                  <Popconfirm title="Remove schedule?" onConfirm={() => messAPI.deleteMenuSchedule(s.id).then(fetchInitialData)}>
                    <Button danger icon={<Trash2 size={14}/>} ghost />
                  </Popconfirm>
                ]}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-2 h-10 rounded-full" style={{ backgroundColor: getMealColor(s.meal_time) }} />
                  <div>
                    <Text strong className="text-lg block">{s.Menu?.name}</Text>
                    <Space split={<Divider type="vertical" />}>
                      <Text className="text-xs uppercase font-bold" style={{ color: getMealColor(s.meal_time) }}>{s.meal_time}</Text>
                      <Text type="secondary" size="small">Plates: {s.estimated_servings}</Text>
                    </Space>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Modal>

        {/* Modal: Schedule Detail (Precision Check) */}
        <Modal
          title="Scheduled Meal Analysis"
          open={menuScheduleDetailsVisible}
          onCancel={() => setMenuScheduleDetailsVisible(false)}
          footer={null}
          width={600}
        >
          {selectedSchedule && (
            <div className="space-y-6">
              <Row gutter={16}>
                <Col span={12}>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <Text className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Total Budget</Text>
                    <Text className="text-xl font-bold text-slate-800">₹{parseFloat(selectedSchedule.total_cost || 0).toFixed(2)}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <Text className="text-blue-400 text-[10px] uppercase font-bold block mb-1">Cost Per Plate</Text>
                    <Text className="text-xl font-bold text-blue-700">₹{parseFloat(selectedSchedule.cost_per_serving || 0).toFixed(2)}</Text>
                  </div>
                </Col>
              </Row>

              <div>
                <Title level={5} className="flex items-center gap-2 mb-4"><Utensils size={18} className="text-blue-500"/> Menu Components</Title>
                <List
                  dataSource={selectedSchedule.Menu?.tbl_Menu_Items}
                  renderItem={item => (
                    <div className="flex justify-between items-center p-3 mb-2 bg-white border border-slate-100 rounded-xl">
                      <Text strong>{item.tbl_Item?.name}</Text>
                      <Text className="text-slate-500">{item.quantity} {item.unit}</Text>
                    </div>
                  )}
                />
              </div>

              {selectedSchedule.status === 'scheduled' && (
                <Button 
                  type="primary" 
                  block 
                  size="large" 
                  icon={<CheckCircle2 size={18}/>}
                  className="bg-emerald-600 hover:bg-emerald-700 border-none h-12 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                  onClick={() => {
                    messAPI.serveMenu(selectedSchedule.id).then(() => {
                      message.success('Meal marked as served');
                      setMenuScheduleDetailsVisible(false);
                      fetchInitialData();
                      triggerStockRefresh();
                    });
                  }}
                >
                  Mark as Served & Record Consumption
                </Button>
              )}
            </div>
          )}
        </Modal>
      </div>

      <style>{`
        .custom-calendar .ant-picker-calendar-date { border-top: 2px solid #f1f5f9 !important; margin: 0 !important; padding: 4px !important; }
        .custom-calendar .ant-picker-calendar-date-today { background: #eff6ff !important; border-top-color: #3b82f6 !important; }
        .custom-calendar .ant-picker-cell-selected .ant-picker-calendar-date { background: #f8fafc !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default MenuPlanner;