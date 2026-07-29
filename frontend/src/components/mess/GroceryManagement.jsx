import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, Input, message, Space, Typography, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Download } from 'lucide-react';
import { messAPI } from '../../services/api';
import { downloadItemBulkImportTemplate, getRequiredItemImportColumns } from '../../utils/bulkImportUtils';

const { Option } = Select;
const { Title, Text } = Typography;
const { Search } = Input;

const GroceryManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const requiredImportColumns = getRequiredItemImportColumns();

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await messAPI.getItems({ category_id: selectedCategory, search: searchText });
      const formattedItems = (response.data.data || []).map(item => ({
        ...item,
        key: item.id,
      }));
      setItems(formattedItems);
    } catch (error) {
      message.error('Failed to fetch items: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await messAPI.getItemCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    fetchItems();
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchItems();
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">{record.tbl_ItemCategory?.name || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Unit',
      key: 'unit',
      render: (_, record) => record.UOM?.abbreviation || 'unit',
    },
    {
      title: 'Price/Unit',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `₹${parseFloat(price || 0).toFixed(2)}`,
    },
    {
      title: 'Stock Level',
      key: 'stock_level',
      render: (_, record) => {
        const stock = record.stock_quantity || 0;
        const minStock = record.ItemStocks?.[0]?.minimum_stock || 0;
        return (
          <Space>
            <Text>{`${stock} ${record.UOM?.abbreviation || 'unit'}`}</Text>
            {stock <= minStock && stock > 0 && <Tag color="warning">Low Stock</Tag>}
            {stock === 0 && <Tag color="error">Out of Stock</Tag>}
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title={<Title level={3}>Grocery Management</Title>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchItems}>
            Refresh
          </Button>
          <Button icon={<Download size={16} />} onClick={() => downloadItemBulkImportTemplate()}>
            Excel Template
          </Button>
          <Button type="primary" icon={<PlusOutlined />}>
            Add Item
          </Button>
        </Space>
      }
    >
      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
        <Text className="text-xs text-blue-700">Excel reference for grocery item sheets: {requiredImportColumns.map((column) => column.label).join(', ')}</Text>
        <div className="flex flex-wrap gap-2 mt-2">
          {requiredImportColumns.map((column) => (
            <Tag key={column.key} color="blue">{column.label}</Tag>
          ))}
        </div>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by category"
          style={{ width: 200 }}
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <Option value="all">All Categories</Option>
          {categories.map(category => (
            <Option key={category.id} value={category.id}>
              {category.name}
            </Option>
          ))}
        </Select>
        <Search
          placeholder="Search items"
          onSearch={handleSearch}
          style={{ width: 200 }}
        />
      </Space>
      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default GroceryManagement;
