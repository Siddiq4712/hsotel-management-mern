import React, { useState, useEffect } from 'react';
import { 
  Card, Calendar, Tooltip, Modal, Form, Select, Button, message, 
  Row, Col, List, Tag, Spin, InputNumber, Divider, Typography, DatePicker
} from 'antd';
import { CalendarOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { confirm } = Modal;
const { Title, Text } = Typography;

const MenuScheduleManagement = () => {
  const [form] = Form.useForm();
  const [schedules, setSchedules] = useState({});
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(moment());

  useEffect(() => {
    fetchSchedules(currentMonth);
    fetchMenus();
  }, [currentMonth]);

  const fetchSchedules = async (date) => {
    setLoading(true);
    try {
      const startDate = date.clone().startOf('month').format('YYYY-MM-DD');
      const endDate = date.clone().endOf('month').format('YYYY-MM-DD');
      
      const response = await api.get(`/mess/menu-schedule?start_date=${startDate}&end_date=${endDate}`);
      
      const groupedSchedules = {};
      response.data.data.forEach(schedule => {
        const dateKey = moment(schedule.scheduled_date).format('YYYY-MM-DD');
        if (!groupedSchedules[dateKey]) {
          groupedSchedules[dateKey] = [];
        }
        groupedSchedules[dateKey].push(schedule);
      });
      
      setSchedules(groupedSchedules);
    } catch (error) {
      message.error('Failed to load menu schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenus = async () => {
    try {
      const response = await api.get('/mess/menus');
      setMenus(response.data.data);
    } catch (error) {
      message.error('Failed to load menus');
    }
  };

  const handleDateSelect = (date) => {
    setSelectedSchedule(null);
    form.resetFields();
    form.setFieldsValue({
      scheduled_date: date,
      meal_time: 'breakfast'
    });
    setModalVisible(true);
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    form.setFieldsValue({
      menu_id: schedule.menu_id,
      meal_time: schedule.meal_time,
      scheduled_date: moment(schedule.scheduled_date),
      estimated_servings: schedule.estimated_servings,
      status: schedule.status
    });
    setModalVisible(true);
  };

  const handleDeleteSchedule = (id) => {
    confirm({
      title: 'Delete Menu Schedule',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this schedule?',
      onOk: async () => {
        try {
          await api.delete(`/mess/menu-schedule/${id}`);
          message.success('Schedule deleted successfully');
          fetchSchedules(currentMonth);
        } catch (error) {
          message.error('Failed to delete schedule');
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        scheduled_date: values.scheduled_date.format('YYYY-MM-DD')
      };

      if (selectedSchedule) {
        await api.put(`/mess/menu-schedule/${selectedSchedule.id}`, data);
        message.success('Schedule updated successfully');
      } else {
        await api.post('/mess/menu-schedule', data);
        message.success('Menu scheduled successfully');
      }
      
      setModalVisible(false);
      fetchSchedules(currentMonth);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to save schedule';
      message.error(errorMessage);
    }
  };

  const handlePanelChange = (date) => {
    setCurrentMonth(date);
  };

  const dateCellRender = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const dateSchedules = schedules[dateStr] || [];
    
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {dateSchedules.map(schedule => (
          <li key={schedule.id} style={{ marginBottom: 4 }}>
            <Tooltip title={
              <div>
                <p><strong>Menu:</strong> {schedule.Menu?.name || 'N/A'}</p>
                <p><strong>Status:</strong> {schedule.status}</p>
                <p><strong>Servings:</strong> {schedule.estimated_servings}</p>
                <p><strong>Cost/Person:</strong> ₹{parseFloat(schedule.cost_per_serving).toFixed(2)}</p>
              </div>
            }>
              <Tag 
                color={
                  schedule.meal_time === 'breakfast' ? 'blue' :
                  schedule.meal_time === 'lunch' ? 'green' :
                  schedule.meal_time === 'dinner' ? 'purple' : 'orange'
                }
                style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
                onClick={(e) => { e.stopPropagation(); handleEditSchedule(schedule); }}
              >
                {schedule.meal_time.charAt(0).toUpperCase()} - ₹{parseFloat(schedule.cost_per_serving).toFixed(2)}
              </Tag>
            </Tooltip>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card 
      title={<><CalendarOutlined style={{ marginRight: 8 }} />Menu Schedule Management</>}
      variant="outlined"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleDateSelect(moment())}>
          Schedule Menu
        </Button>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}><Spin size="large" /></div>
      ) : (
        <Calendar 
          cellRender={dateCellRender}
          onSelect={handleDateSelect}
          onPanelChange={handlePanelChange}
        />
      )}

      <Modal
        title={selectedSchedule ? "Edit Menu Schedule" : "Schedule New Menu"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scheduled_date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} disabled={!!selectedSchedule} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="meal_time" label="Meal Time" rules={[{ required: true }]}>
                <Select>
                  <Option value="breakfast">Breakfast</Option>
                  <Option value="lunch">Lunch</Option>
                  <Option value="dinner">Dinner</Option>
                  <Option value="snacks">Snacks</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="menu_id" label="Menu" rules={[{ required: true }]}>
            <Select placeholder="Select a menu" showSearch optionFilterProp="children">
              {menus.map(menu => (
                <Option key={menu.id} value={menu.id}>
                  {menu.name} ({menu.meal_type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="estimated_servings" 
            label="Estimated Servings" 
            rules={[{ required: true, message: 'Please enter number of servings!' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g., 150" />
          </Form.Item>
          
          {selectedSchedule && (
            <Form.Item name="status" label="Status">
              <Select>
                <Option value="scheduled">Scheduled</Option>
                <Option value="served">Served</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit">
              {selectedSchedule ? "Update Schedule" : "Schedule Menu"}
            </Button>
            <Button onClick={() => setModalVisible(false)} style={{ marginLeft: 8 }}>Cancel</Button>
            {selectedSchedule && (
              <Button danger onClick={() => { setModalVisible(false); handleDeleteSchedule(selectedSchedule.id); }} style={{ marginLeft: 8 }}>
                Delete
              </Button>
            )}
          </Form.Item>
        </Form>

        {selectedSchedule && selectedSchedule.Menu && (
          <>
            <Divider />
            <Title level={5}>Schedule Details</Title>
            <p><Text strong>Menu:</Text> {selectedSchedule.Menu.name}</p>
            <p><Text strong>Total Cost for {selectedSchedule.estimated_servings} servings:</Text> ₹{parseFloat(selectedSchedule.total_cost).toFixed(2)}</p>
            <p><Text strong>Cost per Serving:</Text> ₹{parseFloat(selectedSchedule.cost_per_serving).toFixed(2)}</p>
            <Title level={5}>Ingredients:</Title>
            {selectedSchedule.Menu.tbl_Menu_Items?.length > 0 ? (
              <List
                size="small"
                dataSource={selectedSchedule.Menu.tbl_Menu_Items}
                renderItem={item => (
                  <List.Item>
                    {item.tbl_Item?.name} ({item.quantity} {item.unit})
                  </List.Item>
                )}
              />
            ) : <Text>No ingredients listed for this menu.</Text>}
          </>
        )}
      </Modal>
    </Card>
  );
};

export default MenuScheduleManagement;
