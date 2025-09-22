import React, { useState, useEffect } from 'react';
import { Card, Table, Tabs, Spin, message, Button, DatePicker, Select, Empty, Row, Col } from 'antd';
import { ReloadOutlined, CalendarOutlined, FilterOutlined } from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';
import DailyConsumptionForm from './DailyConsumptionForm';

const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DailyConsumption = () => {
  const [consumptionData, setConsumptionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [mealTypes, setMealTypes] = useState(['breakfast', 'lunch', 'dinner', 'snacks']);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState([moment().subtract(7, 'days'), moment()]);

  useEffect(() => {
    fetchConsumptionData();
    fetchCategories();
  }, []);

  const fetchConsumptionData = async (filters = {}) => {
    setLoading(true);
    try {
      let url = '/mess/consumption?';
      
      if (filters.category_id && filters.category_id !== 'all') {
        url += `category_id=${filters.category_id}&`;
      }
      
      if (filters.meal_type && filters.meal_type !== 'all') {
        url += `meal_type=${filters.meal_type}&`;
      }
      
      if (filters.start_date && filters.end_date) {
        url += `start_date=${filters.start_date}&end_date=${filters.end_date}`;
      } else if (selectedDateRange && selectedDateRange.length === 2) {
        url += `start_date=${selectedDateRange[0].format('YYYY-MM-DD')}&end_date=${selectedDateRange[1].format('YYYY-MM-DD')}`;
      }
      
      const response = await api.get(url);
      setConsumptionData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch consumption data:', error);
      message.error('Failed to load consumption data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/mess/item-categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleRefresh = () => {
    fetchConsumptionData({
      category_id: selectedCategory,
      meal_type: selectedMealType,
      start_date: selectedDateRange[0].format('YYYY-MM-DD'),
      end_date: selectedDateRange[1].format('YYYY-MM-DD')
    });
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setSelectedDateRange(dates);
      fetchConsumptionData({
        category_id: selectedCategory,
        meal_type: selectedMealType,
        start_date: dates[0].format('YYYY-MM-DD'),
        end_date: dates[1].format('YYYY-MM-DD')
      });
    }
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    fetchConsumptionData({
      category_id: value,
      meal_type: selectedMealType,
      start_date: selectedDateRange[0].format('YYYY-MM-DD'),
      end_date: selectedDateRange[1].format('YYYY-MM-DD')
    });
  };

  const handleMealTypeChange = (value) => {
    setSelectedMealType(value);
    fetchConsumptionData({
      category_id: selectedCategory,
      meal_type: value,
      start_date: selectedDateRange[0].format('YYYY-MM-DD'),
      end_date: selectedDateRange[1].format('YYYY-MM-DD')
    });
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'consumption_date',
      key: 'consumption_date',
      render: date => moment(date).format('DD MMM YYYY'),
      sorter: (a, b) => moment(a.consumption_date).unix() - moment(b.consumption_date).unix()
    },
    {
      title: 'Item',
      dataIndex: ['Item', 'name'],
      key: 'item_name',
      sorter: (a, b) => a.Item.name.localeCompare(b.Item.name)
    },
    {
      title: 'Category',
      dataIndex: ['Item', 'tbl_ItemCategory', 'name'],
      key: 'category',
      render: text => text || 'N/A',
            filters: categories.map(cat => ({ text: cat.name, value: cat.name })),
      onFilter: (value, record) => record.Item.tbl_ItemCategory?.name === value,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity_consumed',
      key: 'quantity_consumed',
      render: (qty, record) => `${qty} ${record.unit}`,
      sorter: (a, b) => a.quantity_consumed - b.quantity_consumed
    },
    {
      title: 'Meal Type',
      dataIndex: 'meal_type',
      key: 'meal_type',
      render: text => text.charAt(0).toUpperCase() + text.slice(1),
      filters: mealTypes.map(type => ({ text: type.charAt(0).toUpperCase() + type.slice(1), value: type })),
      onFilter: (value, record) => record.meal_type === value,
    },
    {
      title: 'Recorded By',
      dataIndex: ['ConsumptionRecordedBy', 'username'],
      key: 'recorded_by',
      render: text => text || 'System'
    }
  ];

  return (
    <Card title="Daily Consumption Management" bordered={false}>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Record Consumption" key="1">
          <DailyConsumptionForm onSuccess={handleRefresh} />
        </TabPane>
        <TabPane tab="View Consumption History" key="2">
          <div style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col xs={24} sm={8} md={6}>
                <RangePicker 
                  value={selectedDateRange} 
                  onChange={handleDateRangeChange} 
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="Filter by category"
                  style={{ width: '100%' }}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                >
                  <Option value="all">All Categories</Option>
                  {categories.map(category => (
                    <Option key={category.id} value={category.id}>{category.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="Filter by meal type"
                  style={{ width: '100%' }}
                  value={selectedMealType}
                  onChange={handleMealTypeChange}
                >
                  <Option value="all">All Meal Types</Option>
                  {mealTypes.map(type => (
                    <Option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={4} md={2}>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleRefresh}
                  type="default"
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Spin size="large" />
            </div>
          ) : consumptionData.length === 0 ? (
            <Empty description="No consumption data found" />
          ) : (
            <Table
              columns={columns}
              dataSource={consumptionData}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
            />
          )}
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default DailyConsumption;
