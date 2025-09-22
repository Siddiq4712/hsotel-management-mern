import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Select, Form, Modal, message, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;

const ItemManagement = () => {
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [units, setUnits] = useState([]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchUnits();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mess/items');
      setItems(response.data.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      message.error('Failed to load items');
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
      message.error('Failed to load categories');
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get('/mess/uoms');
      setUnits(response.data.data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      category_id: item.category_id,
      unit_id: item.unit_id,
      unit_price: item.unit_price,
      description: item.description
    });
    setModalVisible(true);
  };

  const handleDeleteItem = (id) => {
    confirm({
      title: 'Are you sure you want to delete this item?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      onOk: async () => {
        try {
          await api.delete(`/mess/items/${id}`);
          message.success('Item deleted successfully');
          fetchItems();
        } catch (error) {
          console.error('Failed to delete item:', error);
          message.error('Failed to delete item');
        }
      }
    });
  };

  const handleSubmitItem = async (values) => {
    try {
      if (editingItem) {
        await api.put(`/mess/items/${editingItem.id}`, values);
        message.success('Item updated successfully');
      } else {
        await api.post('/mess/items', values);
        message.success('Item added successfully');
      }
      setModalVisible(false);
      fetchItems();
    } catch (error) {
      console.error('Failed to save item:', error);
      message.error('Failed to save item');
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({
      name: category.name,
      description: category.description
    });
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = (id) => {
    confirm({
      title: 'Are you sure you want to delete this category?',
      icon: <ExclamationCircleOutlined />,
      content: 'This will delete the category and might affect items assigned to it.',
      onOk: async () => {
        try {
          await api.delete(`/mess/item-categories/${id}`);
          message.success('Category deleted successfully');
          fetchCategories();
        } catch (error) {
          console.error('Failed to delete category:', error);
          message.error('Failed to delete category');
        }
      }
    });
  };

  const handleSubmitCategory = async (values) => {
    try {
      if (editingCategory) {
        await api.put(`/mess/item-categories/${editingCategory.id}`, values);
        message.success('Category updated successfully');
      } else {
        await api.post('/mess/item-categories', values);
        message.success('Category added successfully');
      }
      setCategoryModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      message.error('Failed to save category');
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
  };

  const handleCategoryFilterChange = (value) => {
    setCategoryFilter(value);
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category_id.toString() === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const itemColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: ['tbl_ItemCategory', 'name'],
      key: 'category',
      filters: categories.map(category => ({ text: category.name, value: category.name })),
      onFilter: (value, record) => record.tbl_ItemCategory?.name === value,
    },
    {
      title: 'Unit',
      dataIndex: ['UOM', 'abbreviation'],
      key: 'unit',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => price ? `₹${parseFloat(price).toFixed(2)}` : 'N/A',
      sorter: (a, b) => a.unit_price - b.unit_price,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEditItem(record)}
          />
          <Button 
            type="danger" 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => handleDeleteItem(record.id)}
          />
        </Space>
      ),
    },
  ];

  const categoryColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEditCategory(record)}
          />
          <Button 
            type="danger" 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => handleDeleteCategory(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card title="Item Management" bordered={false}>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Items" key="1">
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddItem}
              >
                Add Item
              </Button>
              <Input
                placeholder="Search items"
                prefix={<SearchOutlined />}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="Filter by category"
                onChange={handleCategoryFilterChange}
                style={{ width: 180 }}
                defaultValue="all"
              >
                <Option value="all">All Categories</Option>
                {categories.map(category => (
                  <Option key={category.id} value={category.id.toString()}>{category.name}</Option>
                ))}
              </Select>
              <Button onClick={fetchItems}>Refresh</Button>
            </Space>
          </div>

          <Table
            columns={itemColumns}
            dataSource={filteredItems}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
        <TabPane tab="Categories" key="2">
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddCategory}
            >
              Add Category
            </Button>
          </div>

          <Table
            columns={categoryColumns}
            dataSource={categories}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>

      {/* Item Form Modal */}
      <Modal
        title={editingItem ? "Edit Item" : "Add Item"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitItem}
        >
          <Form.Item
            name="name"
            label="Item Name"
            rules={[{ required: true, message: 'Please enter item name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="category_id"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select a category">
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="unit_id"
            label="Unit of Measurement"
          >
            <Select placeholder="Select a unit" allowClear>
              {units.map(unit => (
                <Option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="unit_price"
            label="Unit Price (₹)"
          >
            <Input type="number" min="0" step="0.01" prefix="₹" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              {editingItem ? "Update" : "Add"}
            </Button>
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Category Form Modal */}
      <Modal
        title={editingCategory ? "Edit Category" : "Add Category"}
        visible={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        footer={null}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleSubmitCategory}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              {editingCategory ? "Update" : "Add"}
            </Button>
            <Button onClick={() => setCategoryModalVisible(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ItemManagement;
