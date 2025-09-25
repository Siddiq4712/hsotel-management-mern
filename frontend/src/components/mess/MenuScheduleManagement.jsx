import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, DatePicker, Select,
  message, Popconfirm, Modal, List, Typography, Tooltip, Row, Col, Alert
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, EyeOutlined, 
  CheckCircleOutlined, SearchOutlined 
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

const MenuScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    moment().startOf('day'),
    moment().add(7, 'days').endOf('day')
  ]);
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [lowStockAlert, setLowStockAlert] = useState(null); // For displaying low stock items

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    console.log('🔍 Fetching schedules with params:', {
      start_date: dateRange[0]?.format('YYYY-MM-DD'),
      end_date: dateRange[1]?.format('YYYY-MM-DD'),
      meal_time: selectedMealType !== 'all' ? selectedMealType : undefined
    });
    
    setLoading(true);
    try {
      const params = {};
      
      if (dateRange && dateRange.length === 2) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      
      if (selectedMealType !== 'all') {
        params.meal_time = selectedMealType;
      }
      
      console.log('📡 API Call: GET /mess/menu-schedule with params:', params);
      const response = await messAPI.getMenuSchedule(params);
      console.log('✅ Fetched schedules:', response.data.data?.length || 0, 'records');
      setSchedules(response.data.data || []);
    } catch (error) {
      console.error('❌ Error fetching schedules:', error);
      message.error('Failed to fetch schedules: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    console.log('🗑️ Deleting schedule ID:', id);
    try {
      await messAPI.deleteMenuSchedule(id);
      console.log('✅ Schedule deleted successfully');
      message.success('Schedule deleted successfully');
      fetchSchedules();
    } catch (error) {
      console.error('❌ Error deleting schedule:', error);
      message.error('Failed to delete schedule: ' + (error.message || 'Unknown error'));
    }
  };

  // Modified to use serveMenu for FIFO stock deduction
  const handleMarkAsServed = async (id) => {
    console.log('🍽️ Marking menu schedule ID', id, 'as served - This will deduct stock via FIFO');
    
    try {
      console.log('📡 Calling API: PUT /mess/menu-schedule/' + id + '/serve');
      const response = await messAPI.serveMenu(id); // Use serveMenu instead of updateMenuSchedule
      
      console.log('✅ Serve response:', response.data);
      message.success('Menu marked as served successfully');
      
      // Handle low stock items from response
      if (response.data.data?.lowStockItems && response.data.data.lowStockItems.length > 0) {
        console.log('⚠️ Low stock items detected:', response.data.data.lowStockItems);
        setLowStockAlert({
          items: response.data.data.lowStockItems,
          message: 'The following items are now below minimum stock levels:'
        });
      }
      
      // Refresh schedules
      fetchSchedules();
    } catch (error) {
      console.error('❌ Error marking menu as served:', error.response?.data || error.message);
      
      // Check for specific stock-related errors
      if (error.response?.data?.message?.includes('Insufficient stock')) {
        message.error('Cannot mark as served: ' + error.response.data.message);
      } else if (error.response?.status === 400) {
        message.error('Invalid schedule: ' + (error.response.data.message || 'Status already served'));
      } else {
        message.error('Failed to mark menu as served: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleViewDetails = (schedule) => {
    console.log('👁️ Viewing details for schedule:', schedule.id);
    setSelectedSchedule(schedule);
    setDetailsModalVisible(true);
  };

  const handleFilterChange = () => {
    console.log('🔄 Filter changed - refetching schedules');
    fetchSchedules();
  };

  const getMealColor = (mealType) => {
    const colors = {
      breakfast: 'blue',
      lunch: 'green',
      dinner: 'purple',
      snacks: 'orange'
    };
    return colors[mealType] || 'default';
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'scheduled_date',
      key: 'date',
      render: date => moment(date).format('DD MMM YYYY'),
      sorter: (a, b) => moment(a.scheduled_date).unix() - moment(b.scheduled_date).unix()
    },
    {
      title: 'Meal',
      dataIndex: 'meal_time',
      key: 'meal_time',
      render: (text) => (
        <Tag color={getMealColor(text)}>
          {text.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Breakfast', value: 'breakfast' },
        { text: 'Lunch', value: 'lunch' },
        { text: 'Dinner', value: 'dinner' },
        { text: 'Snacks', value: 'snacks' }
      ],
      onFilter: (value, record) => record.meal_time === value
    },
    {
      title: 'Menu',
      dataIndex: ['Menu', 'name'],
      key: 'menu',
      render: (text, record) => (
        <Space>
          {record.Menu?.name || 'Unknown Menu'}
          {record.Menu?.tbl_Menu_Items?.length > 0 && (
            <Tooltip title={`${record.Menu.tbl_Menu_Items.length} items`}>
              <span style={{ opacity: 0.6, fontSize: 12 }}>
                ({record.Menu.tbl_Menu_Items.length})
              </span>
            </Tooltip>
          )}
        </Space>
      ),
      sorter: (a, b) => (a.Menu?.name || '').localeCompare(b.Menu?.name || '')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          scheduled: 'blue',
          served: 'green',
          cancelled: 'red'
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
      filters: [
        { text: 'Scheduled', value: 'scheduled' },
        { text: 'Served', value: 'served' },
        { text: 'Cancelled', value: 'cancelled' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Est. Servings',
      dataIndex: 'estimated_servings',
      key: 'servings',
    },
    {
      title: 'Cost / Serving',
      dataIndex: 'cost_per_serving',
      key: 'cost_per_serving',
      render: (cost) => `₹${parseFloat(cost || 0).toFixed(2)}`,
      sorter: (a, b) => (a.cost_per_serving || 0) - (b.cost_per_serving || 0)
    },
    {
      title: 'Total Cost',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (cost) => `₹${parseFloat(cost || 0).toFixed(2)}`,
      sorter: (a, b) => (a.total_cost || 0) - (b.total_cost || 0)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewDetails(record)}
          />
          
          {record.status === 'scheduled' && (
            <>
              {/* Use Popconfirm for confirmation */}
              <Popconfirm
                title="Mark this menu as served? This will deduct stock from inventory using FIFO."
                description="Stock will be deducted based on oldest purchase date first."
                onConfirm={() => handleMarkAsServed(record.id)}
                okText="Yes, Serve Menu"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  icon={<CheckCircleOutlined />}
                  size="small"
                  type="primary"
                >
                  Mark Served
                </Button>
              </Popconfirm>
              
              <Popconfirm
                title="Are you sure you want to delete this schedule?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                />
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <Card 
      title="Menu Schedule Management"
      extra={
        <Button type="primary" href="/mess/menu-planner">
          Plan Menu
        </Button>
      }
    >
      {/* Low Stock Alert */}
      {lowStockAlert && (
        <Alert
          message={lowStockAlert.message}
          description={
            <List
              size="small"
              dataSource={lowStockAlert.items}
              renderItem={item => (
                <List.Item>
                  <Text strong>{item.name}</Text>: {item.current_stock} {item.unit} 
                  (Threshold: {item.minimum_stock} {item.unit})
                </List.Item>
              )}
            />
          }
          type="warning"
          showIcon
          closable
          afterClose={() => setLowStockAlert(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
        />
        
        <Select
          style={{ width: 150 }}
          value={selectedMealType}
          onChange={(value) => {
            setSelectedMealType(value);
            setTimeout(handleFilterChange, 0);
          }}
        >
          <Option value="all">All Meals</Option>
          <Option value="breakfast">Breakfast</Option>
          <Option value="lunch">Lunch</Option>
          <Option value="dinner">Dinner</Option>
          <Option value="snacks">Snacks</Option>
        </Select>
        
        <Button 
          type="primary" 
          icon={<SearchOutlined />} 
          onClick={handleFilterChange}
        >
          Search
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={schedules}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Menu Schedule Details Modal */}
      <Modal
        title="Menu Schedule Details"
        visible={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedSchedule && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Date:</Text> {moment(selectedSchedule.scheduled_date).format('DD MMM YYYY')}
              </Col>
              <Col span={12}>
                <Text strong>Meal:</Text>{' '}
                <Tag color={getMealColor(selectedSchedule.meal_time)}>
                  {selectedSchedule.meal_time.toUpperCase()}
                </Tag>
              </Col>
            </Row>
            
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Text strong>Menu:</Text> {selectedSchedule.Menu?.name || 'Unknown Menu'}
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>{' '}
                <Tag color={selectedSchedule.status === 'scheduled' ? 'blue' : selectedSchedule.status === 'served' ? 'green' : 'red'}>
                  {selectedSchedule.status.toUpperCase()}
                </Tag>
              </Col>
            </Row>
            
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Text strong>Estimated Servings:</Text> {selectedSchedule.estimated_servings}
              </Col>
              <Col span={12}>
                <Text strong>Cost Per Serving:</Text> ₹{parseFloat(selectedSchedule.cost_per_serving || 0).toFixed(2)}
              </Col>
            </Row>
            
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={24}>
                <Text strong>Total Cost:</Text> ₹{parseFloat(selectedSchedule.total_cost || 0).toFixed(2)}
              </Col>
            </Row>
            
            <Title level={5} style={{ marginTop: 24 }}>Menu Items</Title>
            {selectedSchedule.Menu?.tbl_Menu_Items?.length > 0 ? (
              <List
                dataSource={selectedSchedule.Menu.tbl_Menu_Items}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.tbl_Item?.name}
                      description={`${item.quantity} ${item.unit}`}
                    />
                    {item.preparation_notes && (
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Note: {item.preparation_notes}
                      </div>
                    )}
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">No items in this menu</Text>
            )}
            
            {selectedSchedule.status === 'scheduled' && (
              <div style={{ marginTop: 24 }}>
                <Space>
                  <Popconfirm
                    title="Mark this menu as served? This will deduct stock from inventory."
                    description="Stock will be deducted based on oldest purchase date first (FIFO)."
                    onConfirm={() => {
                      handleMarkAsServed(selectedSchedule.id);
                      setDetailsModalVisible(false);
                    }}
                    okText="Yes, Serve Menu"
                    cancelText="Cancel"
                    okButtonProps={{ type: 'primary' }}
                  >
                    <Button type="primary">
                      Mark as Served (Deduct Stock)
                    </Button>
                  </Popconfirm>
                  
                  <Popconfirm
                    title="Are you sure you want to delete this schedule?"
                    onConfirm={() => {
                      handleDelete(selectedSchedule.id);
                      setDetailsModalVisible(false);
                    }}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger>
                      Delete Schedule
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default MenuScheduleManagement;