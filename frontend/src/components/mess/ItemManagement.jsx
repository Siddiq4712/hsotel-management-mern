  import React, { useState, useEffect } from 'react';
  import {
    Card, Table, Button, Space, Popconfirm, Tag, message, Modal, Form,
    Input, Select, InputNumber, Typography, Tooltip, Row, Col, Tabs
  } from 'antd';
  import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
    InfoCircleOutlined, FilterOutlined
  } from '@ant-design/icons';
  import { messAPI } from '../../services/api';

  const { Option } = Select;
  const { Title, Text } = Typography;
  const { TabPane } = Tabs;

  const ItemManagement = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [uoms, setUOMs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form] = Form.useForm();
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
      fetchItems();
      fetchCategories();
      fetchUOMs();
    }, []);

    const fetchItems = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedCategory !== 'all') params.category_id = selectedCategory;
        if (searchText) params.search = searchText;
        
        const response = await messAPI.getItems(params);
        setItems(response.data.data || []);
      } catch (error) {
        message.error('Failed to fetch items');
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

    const fetchUOMs = async () => {
      try {
        const response = await messAPI.getUOMs();
        setUOMs(response.data.data || []);
      } catch (error) {
        message.error('Failed to fetch UOMs');
      }
    };

    const handleCreate = () => {
      setEditingItem(null);
      form.resetFields();
      setModalVisible(true);
    };

    const handleEdit = (item) => {
      setEditingItem(item);
      form.setFieldsValue({
        name: item.name,
        category_id: item.category_id,
        unit_id: item.unit_id,
        unit_price: item.unit_price,
        description: item.description,
      });
      setModalVisible(true);
    };

    const handleDelete = async (id) => {
      try {
        await messAPI.deleteItem(id);
        message.success('Item deleted successfully');
        fetchItems();
      } catch (error) {
        message.error('Failed to delete item: ' + (error.response?.data?.message || error.message));
      }
    };

    const handleSubmit = async (values) => {
      setConfirmLoading(true);
      try {
        if (editingItem) {
          await messAPI.updateItem(editingItem.id, values);
          message.success('Item updated successfully');
        } else {
          await messAPI.createItem(values);
          message.success('Item created successfully');
        }
        setModalVisible(false);
        fetchItems();
      } catch (error) {
        message.error('Failed to save item: ' + (error.response?.data?.message || error.message));
      } finally {
        setConfirmLoading(false);
      }
    };

    const handleSearch = () => {
      fetchItems();
    };

    const columns = [
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
        render: text => text || 'N/A',
        filters: categories.map(cat => ({ text: cat.name, value: cat.id })),
        onFilter: (value, record) => record.category_id === value,
      },
      {
        title: 'Unit',
        dataIndex: ['UOM', 'abbreviation'],
        key: 'unit',
        render: text => text || 'N/A',
      },
      {
        title: 'Unit Price (₹)',
        dataIndex: 'unit_price',
        key: 'unit_price',
        render: price => parseFloat(price || 0).toFixed(2),
        sorter: (a, b) => a.unit_price - b.unit_price,
      },
      {
        title: 'Current Stock',
        key: 'stock',
        render: (_, record) => {
          const stockQuantity = record.stock_quantity || 0;
          return <Tag color={stockQuantity > 0 ? 'green' : 'red'}>{stockQuantity}</Tag>;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
            <Popconfirm
              title="Are you sure you want to delete this item?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title="Item Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Item
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by category"
            style={{ width: 200 }}
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              setTimeout(handleSearch, 0);
            }}
          >
            <Option value="all">All Categories</Option>
            {categories.map(category => (
              <Option key={category.id} value={category.id}>{category.name}</Option>
            ))}
          </Select>
          
          <Input
            placeholder="Search items"
            allowClear
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          
          <Button type="default" icon={<SearchOutlined />} onClick={handleSearch}>
            Search
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title={editingItem ? 'Edit Item' : 'Add Item'}
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
              name="name"
              label="Item Name"
              rules={[{ required: true, message: 'Please enter item name' }]}
            >
              <Input placeholder="Enter item name" />
            </Form.Item>

            <Form.Item
              name="category_id"
              label="Category"
              rules={[{ required: true, message: 'Please select a category' }]}
            >
              <Select placeholder="Select category">
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>{category.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="unit_id"
              label="Unit of Measurement"
              rules={[{ required: true, message: 'Please select a unit' }]}
            >
              <Select placeholder="Select unit">
                {uoms.map(uom => (
                  <Option key={uom.id} value={uom.id}>
                    {uom.name} ({uom.abbreviation})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="unit_price"
              label="Unit Price (₹)"
              rules={[{ required: true, message: 'Please enter unit price' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="Enter unit price"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <Input.TextArea rows={4} placeholder="Enter item description (optional)" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={confirmLoading}>
                  {editingItem ? 'Update' : 'Create'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    );
  };

  export default ItemManagement;
