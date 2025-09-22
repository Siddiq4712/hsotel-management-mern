import React, { useState, useEffect } from 'react';
import { Card, Calendar, Badge, Modal, Form, Select, Button, message, Space, Tooltip, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';

const { Option } = Select;

const MenuPlanner = () => {
  const [form] = Form.useForm();
  const [schedules, setSchedules] = useState({});
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add', 'edit', 'view'
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSchedules();
    fetchMenus();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const currentMonth = moment().format('YYYY-MM');
      const startDate = moment(currentMonth).startOf('month').format('YYYY-MM-DD');
      const endDate = moment(currentMonth).endOf('month').format('YYYY-MM-DD');
      
      const response = await api.get(`/mess/menu-schedule?start_date=${startDate}&end_date=${endDate}`);
      
      // Group schedules by date
      const groupedSchedules = {};
      response.data.data.forEach(schedule => {
        const date = schedule.scheduled_date;
        if (!groupedSchedules[date]) {
          groupedSchedules[date] = [];
        }
        groupedSchedules[date].push(schedule);
      });
      
      setSchedules(groupedSchedules);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
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
      console.error('Failed to fetch menus:', error);
      message.error('Failed to load menus');
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setModalType('add');
    form.resetFields();
    setModalVisible(true);
  };

  const handleViewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setModalType('view');
    setModalVisible(true);
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setModalType('edit');
    form.setFieldsValue({
      menu_id: schedule.menu_id,
      meal_time: schedule.meal_time
    });
    setModalVisible(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    Modal.confirm({
      title: 'Delete Menu Schedule',
      content: 'Are you sure you want to delete this menu schedule?',
      onOk: async () => {
        try {
          await api.delete(`/mess/menu-schedule/${scheduleId}`);
          message.success('Menu schedule deleted successfully');
          fetchSchedules();
        } catch (error) {
          console.error('Failed to delete schedule:', error);
          message.error('Failed to delete menu schedule');
        }
      }
    });
  };

  const handleMenuChange = (menuId) => {
    const menu = menus.find(m => m.id === menuId);
    setSelectedMenu(menu);
  };

  const handleSubmit = async (values) => {
    if (modalType === 'view') {
      setModalVisible(false);
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        menu_id: values.menu_id,
        meal_time: values.meal_time,
        scheduled_date: modalType === 'add' ? 
          selectedDate.format('YYYY-MM-DD') : 
          selectedSchedule.scheduled_date
      };

      if (modalType === 'add') {
        await api.post('/mess/menu-schedule', data);
        message.success('Menu scheduled successfully');
      } else {
        await api.put(`/mess/menu-schedule/${selectedSchedule.id}`, data);
        message.success('Menu schedule updated successfully');
      }

      setModalVisible(false);
      fetchSchedules();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      message.error('Failed to save menu schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMonthChange = (date) => {
    const startDate = date.startOf('month').format('YYYY-MM-DD');
    const endDate = date.endOf('month').format('YYYY-MM-DD');
    
    setLoading(true);
    api.get(`/mess/menu-schedule?start_date=${startDate}&end_date=${endDate}`)
      .then(response => {
        // Group schedules by date
        const groupedSchedules = {};
        response.data.data.forEach(schedule => {
          const date = schedule.scheduled_date;
          if (!groupedSchedules[date]) {
            groupedSchedules[date] = [];
          }
          groupedSchedules[date].push(schedule);
        });
        
        setSchedules(groupedSchedules);
      })
      .catch(error => {
        console.error('Failed to fetch schedules:', error);
        message.error('Failed to load menu schedules');
      })
      .finally(() => setLoading(false));
  };

  const dateCellRender = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const dateSchedules = schedules[dateStr] || [];
    
    return (
      <ul className="menu-schedule-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dateSchedules.map(schedule => (
          <li key={schedule.id} style={{ marginBottom: 3 }}>
            <Badge 
              color={
                schedule.meal_time === 'breakfast' ? 'blue' :
                schedule.meal_time === 'lunch' ? 'green' :
                schedule.meal_time === 'dinner' ? 'purple' : 'orange'
              } 
              text={
                <Tooltip title={schedule.Menu?.name || 'Unknown Menu'}>
                  <a onClick={(e) => {
                    e.preventDefault();
                    handleViewSchedule(schedule);
                  }}>
                    {schedule.meal_time.charAt(0).toUpperCase() + schedule.meal_time.slice(1)}
                  </a>
                </Tooltip>
              }
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <Card title="Menu Planning Calendar" bordered={false}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Calendar 
            dateCellRender={dateCellRender}
            onSelect={handleDateSelect}
            onPanelChange={handleMonthChange}
          />
        )}
      </Card>

      <Modal
        title={
          modalType === 'add' ? 'Schedule Menu' :
          modalType === 'edit' ? 'Edit Schedule' : 'View Menu Schedule'
        }
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={modalType === 'view' ? [
          <Button key="back" onClick={() => setModalVisible(false)}>
            Close
          </Button>
        ] : null}
      >
        {modalType === 'view' ? (
          <div>
            {selectedSchedule?.Menu ? (
              <>
                <h3>{selectedSchedule.Menu.name}</h3>
                <p><strong>Meal:</strong> {selectedSchedule.meal_time.charAt(0).toUpperCase() + selectedSchedule.meal_time.slice(1)}</p>
                <p><strong>Date:</strong> {moment(selectedSchedule.scheduled_date).format('dddd, MMMM D, YYYY')}</p>
                <p><strong>Status:</strong> {selectedSchedule.status.charAt(0).toUpperCase() + selectedSchedule.status.slice(1)}</p>
                
                <h4 style={{ marginTop: 16 }}>Menu Items:</h4>
                {selectedSchedule.Menu.tbl_Menu_Items && selectedSchedule.Menu.tbl_Menu_Items.length > 0 ? (
                  <ul>
                    {selectedSchedule.Menu.tbl_Menu_Items.map(menuItem => (
                      <li key={menuItem.id}>
                        {menuItem.tbl_Item?.name} - {menuItem.quantity} {menuItem.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No items in this menu</p>
                )}
                
                <Space style={{ marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={() => {
                      setModalType('edit');
                      form.setFieldsValue({
                        menu_id: selectedSchedule.menu_id,
                        meal_time: selectedSchedule.meal_time
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setModalVisible(false);
                      handleDeleteSchedule(selectedSchedule.id);
                    }}
                  >
                    Delete
                  </Button>
                </Space>
              </>
            ) : (
              <p>Menu details not available</p>
            )}
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={modalType === 'edit' ? {
              menu_id: selectedSchedule?.menu_id,
              meal_time: selectedSchedule?.meal_time
            } : { meal_time: 'breakfast' }}
          >
            <Form.Item
              name="menu_id"
              label="Menu"
              rules={[{ required: true, message: 'Please select a menu' }]}
            >
              <Select 
                placeholder="Select menu"
                onChange={handleMenuChange}
                showSearch
                optionFilterProp="children"
              >
                {menus.map(menu => (
                  <Option key={menu.id} value={menu.id}>
                    {menu.name} ({menu.meal_type})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="meal_time"
              label="Meal Time"
              rules={[{ required: true, message: 'Please select meal time' }]}
            >
              <Select placeholder="Select meal time">
                <Option value="breakfast">Breakfast</Option>
                <Option value="lunch">Lunch</Option>
                <Option value="dinner">Dinner</Option>
                <Option value="snacks">Snacks</Option>
              </Select>
            </Form.Item>

            {selectedMenu && (
              <div style={{ marginBottom: 16 }}>
                <h4>Menu Items:</h4>
                {selectedMenu.tbl_Menu_Items && selectedMenu.tbl_Menu_Items.length > 0 ? (
                  <ul>
                    {selectedMenu.tbl_Menu_Items.map(menuItem => (
                      <li key={menuItem.id}>
                        {menuItem.tbl_Item?.name} - {menuItem.quantity} {menuItem.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No items in this menu</p>
                )}
              </div>
            )}

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={submitting}
                >
                  {modalType === 'add' ? 'Schedule' : 'Update'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default MenuPlanner;
