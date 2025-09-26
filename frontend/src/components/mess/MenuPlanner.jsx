import React, { useState, useEffect } from 'react';
import {
  Card, Calendar, Badge, Button, Modal, Form, Select, DatePicker,
  message, InputNumber, Typography, Space, List, Tag, Popconfirm, Row, Col,
  Collapse, Tooltip, Spin, Alert, Divider
} from 'antd';
import {
  ScheduleOutlined, PlusOutlined, CalendarOutlined, UnorderedListOutlined,
  CheckCircleOutlined, EyeOutlined, DeleteOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import { useStockContext } from '../../context/StockContext'; // Import StockContext
import moment from 'moment';

const { Option } = Select;
const { Text, Title } = Typography;
const { Panel } = Collapse;

const MenuPlanner = () => {
  const [menus, setMenus] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [allSchedulesForDateModalVisible, setAllSchedulesForDateModalVisible] = useState(false);
  const [schedulesForDate, setSchedulesForDate] = useState([]);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);

  const { triggerStockRefresh } = useStockContext(); // Use StockContext

  // Only show current month dates
  const validRange = [
    moment(currentMonth).startOf('month'),
    moment(currentMonth).endOf('month')
  ];

  useEffect(() => {
    fetchMenus();
    fetchSchedules();
  }, [currentMonth]);

  const fetchMenus = async () => {
    try {
      const response = await messAPI.getMenus();
      setMenus(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch menus');
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const startDate = moment(currentMonth).startOf('month').format('YYYY-MM-DD');
      const endDate = moment(currentMonth).endOf('month').format('YYYY-MM-DD');
      
      const params = { start_date: startDate, end_date: endDate };
      const response = await messAPI.getMenuSchedule(params);
      const scheduleData = response.data.data || [];
      setSchedules(scheduleData);
      
      // Group schedules by date for easy lookup
      const grouped = scheduleData.reduce((acc, schedule) => {
        const dateStr = moment(schedule.scheduled_date).format('YYYY-MM-DD');
        if (!acc[dateStr]) {
          acc[dateStr] = [];
        }
        acc[dateStr].push(schedule);
        return acc;
      }, {});
      
      setDailySchedules(grouped);
    } catch (error) {
      message.error('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    const formattedDate = date.format('YYYY-MM-DD');
    const schedulesForSelectedDate = dailySchedules[formattedDate] || [];
    
    if (schedulesForSelectedDate.length > 0) {
      // Show all schedules for this date in a modal
      setSchedulesForDate(schedulesForSelectedDate);
      setSelectedDateForModal(date);
      setAllSchedulesForDateModalVisible(true);
    } else {
      // No schedules yet, show the menu scheduling form
      setSelectedDate(date);
      setModalVisible(true);
      form.setFieldsValue({
        scheduled_date: date,
        meal_time: null,
        menu_id: null,
        // REMOVED: estimated_servings: 100
      });
    }
  };

  const handleDateCellRender = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const schedulesForDate = dailySchedules[dateStr] || [];
    
    if (schedulesForDate.length === 0) {
      return null;
    }
    
    // If there are more than 3 items, show a count
    const displayItems = schedulesForDate.slice(0, 2);
    const hasMore = schedulesForDate.length > 2;
    
    return (
      <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {displayItems.map(schedule => (
          <li key={schedule.id} onClick={(e) => e.stopPropagation()}>
            <Badge
              color={getMealColor(schedule.meal_time)}
              text={
                <Tooltip title={schedule.Menu?.name || 'Unknown Menu'}>
                  <Text ellipsis style={{ maxWidth: '100%', display: 'inline-block', fontSize: '12px' }}>
                    {schedule.meal_time.charAt(0).toUpperCase() + schedule.meal_time.slice(1)}
                  </Text>
                </Tooltip>
              }
            />
          </li>
        ))}
        {hasMore && (
          <li onClick={(e) => e.stopPropagation()}>
            <Badge
              color="blue"
              text={
                <Text style={{ fontSize: '12px' }}>
                  +{schedulesForDate.length - 2} more...
                </Text>
              }
            />
          </li>
        )}
      </ul>
    );
  };

  const handleViewMenu = (menu) => {
    setSelectedMenu(menu);
    setMenuDetailsVisible(true);
  };

  const handleViewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setMenuScheduleDetailsVisible(true);
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      // Format values for API
      const formattedValues = {
        ...values,
        scheduled_date: values.scheduled_date.format('YYYY-MM-DD'),
        // REMOVED: estimated_servings: values.estimated_servings // No longer sent from frontend
      };
      
      await messAPI.scheduleMenu(formattedValues);
      message.success('Menu scheduled successfully');
      setModalVisible(false);
      fetchSchedules(); // Refresh the schedules
    } catch (error) {
      message.error('Failed to schedule menu: ' + (error.response?.data?.message || error.message));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await messAPI.deleteMenuSchedule(id);
      message.success('Schedule deleted successfully');
      setMenuScheduleDetailsVisible(false);
      setAllSchedulesForDateModalVisible(false);
      fetchSchedules(); // Refresh the schedules
    } catch (error) {
      message.error('Failed to delete schedule');
    }
  };

  const handleMonthChange = (date) => {
    setCurrentMonth(date);
  };

  const getMealColor = (mealType) => {
    const colors = {
      breakfast: 'blue',
      lunch: 'green',
      dinner: 'purple',
      snacks: 'orange'
    };
    return colors[mealType] || 'blue';
  };

  const getMealTimeLabel = (mealType) => {
    const times = {
      breakfast: '07:00 - 09:00',
      lunch: '12:00 - 14:00',
      snacks: '16:00 - 17:00',
      dinner: '19:00 - 21:00'
    };
    return times[mealType] || mealType;
  };

  return (
    <Card 
      title={
        <Space>
          <CalendarOutlined />
          <span>Menu Planner - {currentMonth.format('MMMM YYYY')}</span>
        </Space>
      }
      extra={
        <Space>
          <Button onClick={() => fetchSchedules()} loading={loading}>
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              setSelectedDate(moment());
              setModalVisible(true);
              form.setFieldsValue({
                scheduled_date: moment(),
                meal_time: null,
                menu_id: null,
                // REMOVED: estimated_servings: 100
              });
            }}
          >
            Schedule Menu
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Calendar
          dateCellRender={handleDateCellRender}
          onSelect={handleDateSelect}
          validRange={validRange}
          onPanelChange={handleMonthChange}
          mode="month"
        />
      )}

      {/* Schedule Menu Modal */}
      <Modal
        title={`Schedule Menu for ${selectedDate ? selectedDate.format('MMMM D, YYYY') : ''}`}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        confirmLoading={confirmLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="scheduled_date"
            label="Date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker style={{ width: '100%' }} disabled />
          </Form.Item>

          <Form.Item
            name="meal_time"
            label="Meal Time"
            rules={[{ required: true, message: 'Please select meal time' }]}
          >
            <Select 
              placeholder="Select meal time"
              onChange={(value) => setSelectedMeal(value)}
            >
              <Option value="breakfast">Breakfast</Option>
              <Option value="lunch">Lunch</Option>
              <Option value="dinner">Dinner</Option>
              <Option value="snacks">Snacks</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="menu_id"
            label="Menu"
            rules={[{ required: true, message: 'Please select a menu' }]}
          >
            <Select
              placeholder="Select menu"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              dropdownRender={menu => (
                <>
                  {menu}
                  <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
                    <a 
                      style={{ display: 'block', textAlign: 'center' }}
                      onClick={() => window.open('/mess/create-menu', '_blank')}
                    >
                      + Create New Menu
                    </a>
                  </div>
                </>
              )}
            >
              {menus
                .filter(menu => !selectedMeal || menu.meal_type === selectedMeal)
                .map(menu => (
                  <Option key={menu.id} value={menu.id}>
                    {menu.name}
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMenu(menu);
                      }}
                      style={{ marginLeft: 8 }}
                    >
                      View
                    </Button>
                  </Option>
                ))
              }
            </Select>
          </Form.Item>

          {/* REMOVED: Estimated Servings Form Item */}
          {/*
          <Form.Item
            name="estimated_servings"
            label="Estimated Servings"
            rules={[
              { required: true, message: 'Please enter estimated servings' },
              { type: 'number', min: 1, message: 'Servings must be at least 1' }
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          */}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                Schedule Menu
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* All Schedules For Date Modal */}
      <Modal
        title={`Menus for ${selectedDateForModal ? selectedDateForModal.format('MMMM D, YYYY') : ''}`}
        visible={allSchedulesForDateModalVisible}
        onCancel={() => setAllSchedulesForDateModalVisible(false)}
        footer={[
          <Button 
            key="add" 
            type="primary"
            onClick={() => {
              setAllSchedulesForDateModalVisible(false);
              setSelectedDate(selectedDateForModal);
              setModalVisible(true);
              form.setFieldsValue({
                scheduled_date: selectedDateForModal,
                meal_time: null,
                menu_id: null,
                // REMOVED: estimated_servings: 100
              });
            }}
          >
            Add Another Menu
          </Button>,
          <Button key="close" onClick={() => setAllSchedulesForDateModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        <List
          dataSource={schedulesForDate}
          renderItem={schedule => (
            <List.Item
              actions={[
                <Button 
                  icon={<EyeOutlined />} 
                  onClick={() => {
                    setSelectedSchedule(schedule);
                    setAllSchedulesForDateModalVisible(false);
                    setMenuScheduleDetailsVisible(true);
                  }}
                >
                  Details
                </Button>,
                schedule.status === 'scheduled' ? (
                  <Popconfirm
                    title="Are you sure you want to delete this schedule?"
                    onConfirm={() => handleDeleteSchedule(schedule.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger icon={<DeleteOutlined />}>Delete</Button>
                  </Popconfirm>
                ) : null
              ]}
            >
              <List.Item.Meta
                avatar={<Badge color={getMealColor(schedule.meal_time)} />}
                title={
                  <Space>
                    <Tag color={getMealColor(schedule.meal_time)}>
                      {schedule.meal_time.toUpperCase()}
                    </Tag>
                    <Text strong>{schedule.Menu?.name || 'Unknown Menu'}</Text>
                    <Tag color={schedule.status === 'scheduled' ? 'blue' : 'green'}>
                      {schedule.status.toUpperCase()}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text>Servings: {schedule.estimated_servings}</Text>
                    <Text>Time: {getMealTimeLabel(schedule.meal_time)}</Text>
                    <Text>Cost: ₹{parseFloat(schedule.total_cost || 0).toFixed(2)} (₹{parseFloat(schedule.cost_per_serving || 0).toFixed(2)}/serving)</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Menu Details Modal */}
      <Modal
        title={`Menu Details: ${selectedMenu?.name || ''}`}
        visible={menuDetailsVisible}
        onCancel={() => setMenuDetailsVisible(false)}
        footer={null}
        width={600}
      >
        {selectedMenu && (
          <>
            <p><strong>Meal Type:</strong> {selectedMenu.meal_type}</p>
            {selectedMenu.description && (
              <p><strong>Description:</strong> {selectedMenu.description}</p>
            )}
            <p><strong>Estimated Servings:</strong> {selectedMenu.estimated_servings || 'N/A'}</p>
            <p><strong>Preparation Time:</strong> {selectedMenu.preparation_time ? `${selectedMenu.preparation_time} minutes` : 'N/A'}</p>
            
            <Title level={5} style={{ marginTop: 16 }}>Menu Items</Title>
            {selectedMenu.tbl_Menu_Items?.length > 0 ? (
              <List
                dataSource={selectedMenu.tbl_Menu_Items}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.tbl_Item?.name}
                      description={`${item.quantity} ${item.unit}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">No items in this menu</Text>
            )}
          </>
        )}
      </Modal>

      {/* Menu Schedule Details Modal */}
      <Modal
        title="Scheduled Menu Details"
        visible={menuScheduleDetailsVisible}
        onCancel={() => setMenuScheduleDetailsVisible(false)}
        footer={null}
        width={600}
      >
        {selectedSchedule && (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>Date:</Text>
                  </Col>
                  <Col span={12}>
                    {moment(selectedSchedule.scheduled_date).format('MMMM D, YYYY')}
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>Meal Time:</Text>
                  </Col>
                  <Col span={12}>
                    <Tag color={getMealColor(selectedSchedule.meal_time)}>
                      {selectedSchedule.meal_time.toUpperCase()}
                    </Tag>
                    <Text>{getMealTimeLabel(selectedSchedule.meal_time)}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>Menu:</Text>
                  </Col>
                  <Col span={12}>
                    {selectedSchedule.Menu?.name || 'Unknown Menu'}
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => {
                        setMenuDetailsVisible(true);
                        setSelectedMenu(selectedSchedule.Menu);
                      }}
                    >
                      View Menu
                    </Button>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>Status:</Text>
                  </Col>
                  <Col span={12}>
                    <Tag color={selectedSchedule.status === 'scheduled' ? 'blue' : 'green'}>
                      {selectedSchedule.status.toUpperCase()}
                    </Tag>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>Estimated Servings:</Text>
                  </Col>
                  <Col span={12}>
                    {selectedSchedule.estimated_servings}
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>Cost Per Serving:</Text>
                  </Col>
                  <Col span={12}>
                    ₹{parseFloat(selectedSchedule.cost_per_serving || 0).toFixed(2)}
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>Total Cost:</Text>
                  </Col>
                  <Col span={12}>
                    ₹{parseFloat(selectedSchedule.total_cost || 0).toFixed(2)}
                  </Col>
                </Row>

                <Divider />
                
                <Title level={5}>Menu Items</Title>
                {selectedSchedule.Menu?.tbl_Menu_Items?.length > 0 ? (
                  <List
                    size="small"
                    dataSource={selectedSchedule.Menu.tbl_Menu_Items}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              {item.tbl_Item?.name}
                              <Text type="secondary">({item.tbl_Item?.tbl_ItemCategory?.name})</Text>
                            </Space>
                          }
                          description={`${item.quantity} ${item.unit}`}
                        />
                        {item.preparation_notes && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Note: {item.preparation_notes}
                          </Text>
                        )}
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">No items in this menu</Text>
                )}

                <div style={{ marginTop: 16 }}>
                  <Space>
                    {selectedSchedule.status === 'scheduled' && (
                      <>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => {
                            messAPI.serveMenu(selectedSchedule.id)
                              .then((response) => {
                                message.success('Menu marked as served and consumption recorded');
                                // Display low stock warnings if any
                                if (response.data.data.lowStockItems?.length > 0) {
                                  const lowStockMessage = response.data.data.lowStockItems
                                    .map(item => `${item.item_name}: ${item.current_stock}/${item.minimum_stock}`)
                                    .join(', ');
                                  message.warning(`Low stock alert: ${lowStockMessage}`);
                                }
                                setMenuScheduleDetailsVisible(false);
                                fetchSchedules();
                                triggerStockRefresh(); // Trigger stock refresh
                              })
                              .catch(error => message.error('Failed to update status: ' + (error.response?.data?.message || error.message)));
                          }}
                        >
                          Mark as Served
                        </Button>
                        <Popconfirm
                          title="Are you sure you want to delete this schedule?"
                          onConfirm={() => handleDeleteSchedule(selectedSchedule.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button danger>Delete</Button>
                        </Popconfirm>
                      </>
                    )}
                    <Button onClick={() => setMenuScheduleDetailsVisible(false)}>
                      Close
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Modal>
    </Card>
  );
};

export default MenuPlanner;
