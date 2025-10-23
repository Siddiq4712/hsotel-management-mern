import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Popconfirm, Tag, message, Modal, Form,
  Input, Select, InputNumber, Typography, Tooltip, Row, Col, Tabs
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  InfoCircleOutlined, FilterOutlined, TagsOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

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
  
  // States for category management
  const [activeTab, setActiveTab] = useState('items');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm] = Form.useForm();
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState('');

  // Pagination and sorting states for items
  const [itemPagination, setItemPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [itemSort, setItemSort] = useState({ field: null, order: null });

  // Pagination and sorting states for categories
  const [categoryPagination, setCategoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [categorySort, setCategorySort] = useState({ field: null, order: null });

  // Debounce hook for search
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  useEffect(() => {
    if (activeTab === 'items') {
      fetchItems({ resetPage: true });
    } else {
      fetchCategories({ resetPage: true });
    }
    fetchUOMs();
  }, [activeTab]);

  // Debounced fetch for items
  const debouncedFetchItems = useCallback(
    debounce((resetPage = false) => {
      fetchItems({ resetPage });
    }, 500),
    [selectedCategory, searchText, itemSort]
  );

  // Debounced fetch for categories
  const debouncedFetchCategories = useCallback(
    debounce((resetPage = false) => {
      fetchCategories({ resetPage });
    }, 500),
    [categorySearchText, categorySort]
  );

  useEffect(() => {
    debouncedFetchItems(true);
  }, [selectedCategory, searchText, itemSort, debouncedFetchItems]);

  useEffect(() => {
    debouncedFetchCategories(true);
  }, [categorySearchText, categorySort, debouncedFetchCategories]);

  const fetchItems = async ({ resetPage = false } = {}) => {
    if (resetPage) {
      setItemPagination(prev => ({ ...prev, current: 1 }));
    }
    setLoading(true);
    try {
      const params = {
        page: itemPagination.current,
        limit: itemPagination.pageSize,
      };
      if (selectedCategory !== 'all') params.category_id = selectedCategory;
      if (searchText) params.search = searchText;
      if (itemSort.field) {
        params.sort_by = itemSort.field;
        params.sort_order = itemSort.order; // 'asc' or 'desc'
      }
      
      const response = await messAPI.getItems(params);
      setItems(response.data.data || []);
      setItemPagination(prev => ({
        ...prev,
        total: response.data.total || 0,
        current: response.data.current_page || prev.current,
      }));
      console.log("[ItemManagement] Items fetched:", response.data.data?.length || 0);
    } catch (error) {
      message.error('Failed to fetch items');
      console.error("[ItemManagement] Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async ({ resetPage = false } = {}) => {
    if (resetPage) {
      setCategoryPagination(prev => ({ ...prev, current: 1 }));
    }
    setCategoryLoading(true);
    try {
      const params = {
        page: categoryPagination.current,
        limit: categoryPagination.pageSize,
      };
      if (categorySearchText) params.search = categorySearchText;
      if (categorySort.field) {
        params.sort_by = categorySort.field;
        params.sort_order = categorySort.order;
      }
      
      const response = await messAPI.getItemCategories(params);
      setCategories(response.data.data || []);
      setCategoryPagination(prev => ({
        ...prev,
        total: response.data.total || 0,
        current: response.data.current_page || prev.current,
      }));
    } catch (error) {
      message.error('Failed to fetch categories');
      console.error("[ItemManagement] Error fetching categories:", error);
    } finally {
      setCategoryLoading(false);
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

  // Handle pagination change for items
  const handleItemPaginationChange = (page, pageSize) => {
    setItemPagination({ ...itemPagination, current: page, pageSize });
  };

  // Handle sorting change for items
  const handleItemSortChange = (pagination, filters, sorter) => {
    setItemSort({
      field: sorter.field || null,
      order: sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : null,
    });
  };

  // Handle pagination change for categories
  const handleCategoryPaginationChange = (page, pageSize) => {
    setCategoryPagination({ ...categoryPagination, current: page, pageSize });
  };

  // Handle sorting change for categories
  const handleCategorySortChange = (pagination, filters, sorter) => {
    setCategorySort({
      field: sorter.field || null,
      order: sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : null,
    });
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
      fetchItems({ resetPage: false }); // Keep current page
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
      fetchItems({ resetPage: true }); // Reset to page 1 after create/update
    } catch (error) {
      message.error('Failed to save item: ' + (error.response?.data?.message || error.message));
    } finally {
      setConfirmLoading(false);
    }
  };

  // Function to verify inventory consistency
  const verifyInventory = async () => {
    try {
      setLoading(true);
      const response = await messAPI.verifyInventory();
      message.success(response.data.message);
      
      // Refresh the items list
      fetchItems({ resetPage: false });
    } catch (error) {
      message.error('Failed to verify inventory: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Function to display batch details in a modal
  const showItemBatches = async (itemId) => {
    try {
      setLoading(true);
      const response = await messAPI.getItemBatches(itemId);
      const batches = response.data.data || [];
      
      // Sort batches by purchase date (oldest first)
      const sortedBatches = [...batches].sort((a, b) => 
        new Date(a.purchase_date) - new Date(b.purchase_date)
      );
      
      // Add a visual indicator for the FIFO batch (the first active one)
      const activeIndex = sortedBatches.findIndex(b => b.status === 'active' && b.quantity_remaining > 0);
      
      // Show modal with batch details
      Modal.info({
        title: 'Inventory Batches (FIFO Order)',
        width: 800,
        content: (
          <div>
            <p>Showing all batches for this item, oldest first. The first active batch with remaining quantity will be consumed first (FIFO).</p>
            <Table 
              dataSource={sortedBatches}
              rowKey="id"
              columns={[
                {
                  title: 'Batch ID',
                  dataIndex: 'id',
                  width: 80,
                },
                {
                  title: 'FIFO Status',
                  key: 'fifo_status',
                  width: 120,
                  render: (_, record, index) => 
                    index === activeIndex && record.status === 'active' && record.quantity_remaining > 0 ? 
                    <Tag color="green">NEXT TO USE</Tag> : null
                },
                {
                  title: 'Purchase Date',
                  dataIndex: 'purchase_date',
                  render: date => date ? moment(date).format('YYYY-MM-DD') : 'Unknown',
                  sorter: (a, b) => new Date(a.purchase_date) - new Date(b.purchase_date)
                },
                {
                  title: 'Unit Price',
                  dataIndex: 'unit_price',
                  render: price => `₹${parseFloat(price).toFixed(2)}`
                },
                {
                  title: 'Original Qty',
                  dataIndex: 'quantity_purchased',
                },
                {
                  title: 'Remaining Qty',
                  dataIndex: 'quantity_remaining',
                  render: (qty, record) => 
                    <Text type={qty > 0 ? 'success' : 'danger'}>{qty}</Text>
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: status => (
                    <Tag color={status === 'active' ? 'green' : 'red'}>
                      {status.toUpperCase()}
                    </Tag>
                  )
                }
              ]}
              pagination={false}
              size="small"
            />
          </div>
        )
      });
    } catch (error) {
      message.error('Failed to fetch batch details');
      console.error('[ItemManagement] Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Category Management Functions
  const handleCreateCategory = () => {
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

  const handleDeleteCategory = async (id) => {
    try {
      await messAPI.deleteItemCategory(id);
      message.success('Category deleted successfully');
      fetchCategories({ resetPage: false });
    } catch (error) {
      if (error.response?.status === 400) {
        message.error('Cannot delete category that is being used by items');
      } else {
        message.error('Failed to delete category: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleCategorySubmit = async (values) => {
    setCategoryLoading(true);
    try {
      if (editingCategory) {
        await messAPI.updateItemCategory(editingCategory.id, values);
        message.success('Category updated successfully');
      } else {
        await messAPI.createItemCategory(values);
        message.success('Category created successfully');
      }
      setCategoryModalVisible(false);
      fetchCategories({ resetPage: true });
    } catch (error) {
      message.error('Failed to save category: ' + (error.response?.data?.message || error.message));
    } finally {
      setCategoryLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true, // Enables sorting
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
      sorter: true,
    },
    {
      title: 'Current Stock',
      key: 'stock',
      render: (_, record) => {
        const stockQuantity = record.stock_quantity || 0;
        return <Tag color={stockQuantity > 0 ? 'green' : 'red'}>{stockQuantity}</Tag>;
      },
    },
    // Add this new column for batch viewing
    {
      title: 'Batches',
      key: 'batches',
      render: (_, record) => (
        <Button 
          size="small" 
          onClick={() => showItemBatches(record.id)}
          icon={<InfoCircleOutlined />}
        >
          View
        </Button>
      ),
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
  
  // Category Table Columns
  const categoryColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: text => text || '-',
    },
    {
      title: 'Items Count',
      key: 'itemsCount',
      render: (_, record) => {
        // Count items for this category
        const count = items.filter(item => item.category_id === record.id).length;
        return <Tag color={count > 0 ? 'green' : 'gray'}>{count}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditCategory(record)}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this category?"
            description="This will permanently delete the category."
            onConfirm={() => handleDeleteCategory(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
              disabled={items.some(item => item.category_id === record.id)}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>Item Management</span>
        </Space>
      }
      extra={
        <Space>
          {activeTab === 'items' && (
            <>
              {/* <Button 
                onClick={verifyInventory} 
                icon={<CheckCircleOutlined />}
                type="default"
              >
                Verify Inventory
              </Button> */}
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Add Item
              </Button>
            </>
          )}
          {activeTab === 'categories' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCategory}>
              Add Category
            </Button>
          )}
        </Space>
      }
    >
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
      >
        <TabPane tab={<span><InfoCircleOutlined /> Items</span>} key="items">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Filter by category"
              style={{ width: 200 }}
              value={selectedCategory}
              onChange={setSelectedCategory}
              showSearch
              optionFilterProp="children"
            >
              <Option value="all">All Categories</Option>
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
            
            <Input
              placeholder="Search items..."
              allowClear
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
          </Space>

          <Table
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={loading}
            pagination={{
              ...itemPagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              onChange: handleItemPaginationChange,
              onShowSizeChange: handleItemPaginationChange,
            }}
            onChange={handleItemSortChange}
            scroll={{ x: 800 }} // Horizontal scroll for wide tables
          />
        </TabPane>
        
        <TabPane 
          tab={<span><TagsOutlined /> Categories</span>}
          key="categories"
        >
          <Space style={{ marginBottom: 16 }}>
            <Input
              placeholder="Search categories..."
              allowClear
              value={categorySearchText}
              onChange={e => setCategorySearchText(e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
          </Space>
          
          <Table
            columns={categoryColumns}
            dataSource={categories}
            rowKey="id"
            loading={categoryLoading}
            pagination={{
              ...categoryPagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} categories`,
              onChange: handleCategoryPaginationChange,
              onShowSizeChange: handleCategoryPaginationChange,
            }}
            onChange={handleCategorySortChange}
            scroll={{ x: 600 }}
          />
        </TabPane>
      </Tabs>

      {/* Item Modal */}
      <Modal
        title={editingItem ? 'Edit Item' : 'Add Item'}
        open={modalVisible}
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

          <Form.Item label="Category" required>
  <Space.Compact style={{ width: '100%' }}>
    {/* Inner Form.Item connects the Select to the form state */}
    <Form.Item
      name="category_id"
      noStyle
      rules={[{ required: true, message: 'Please select a category' }]}
    >
      <Select placeholder="Select category">
        {categories.map(category => (
          <Option key={category.id} value={category.id}>{category.name}</Option>
        ))}
      </Select>
    </Form.Item>
    
    {/* The button remains outside the controlling Form.Item */}
    <Button 
      type="default" 
      icon={<PlusOutlined />} 
      onClick={(e) => {
        e.stopPropagation();
        handleCreateCategory();
      }}
    />
  </Space.Compact>
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

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        footer={null}
        confirmLoading={categoryLoading}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategorySubmit}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Enter category description (optional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={categoryLoading}>
                {editingCategory ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setCategoryModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ItemManagement;