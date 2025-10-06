import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Select, message, Space, Typography, Tag,
  Switch, Modal, Form, InputNumber, DatePicker, Select as AntSelect, Spin
} from 'antd';
import { ReloadOutlined, PlusOutlined, DownloadOutlined, EuroCircleOutlined, CalendarOutlined } from '@ant-design/icons'; // Import CalendarOutlined
import { messAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = AntSelect;

// --- NEW COMPONENT: BatchDetailsTable --- (as defined in previous fix)
const BatchDetailsTable = ({ itemId, itemName, unit }) => {
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  useEffect(() => {
    const fetchBatches = async () => {
      setBatchesLoading(true);
      try {
        const response = await messAPI.getItemBatches(itemId);
        setBatches(response.data.data || []);
      } catch (error) {
        message.error('Failed to fetch batch details for ' + itemName);
        console.error('Error fetching batches:', error);
      } finally {
        setBatchesLoading(false);
      }
    };
    fetchBatches();
  }, [itemId, itemName]);

  const batchColumns = [
    {
      title: 'Batch ID',
      dataIndex: 'id',
      key: 'batch_id',
    },
    {
      title: 'Purchase Date',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date) => moment(date).format('DD MMM YYYY'),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `₹${parseFloat(price).toFixed(2)}`,
    },
    {
      title: 'Qty Purchased',
      dataIndex: 'quantity_purchased',
      key: 'quantity_purchased',
      render: (qty) => `${parseFloat(qty).toFixed(2)} ${unit}`,
    },
    {
      title: 'Qty Remaining',
      dataIndex: 'quantity_remaining',
      key: 'quantity_remaining',
      render: (qty) => (
        <Text strong={qty > 0} type={qty <= 0.01 ? 'danger' : 'default'}>
          {parseFloat(qty).toFixed(2)} {unit}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : status === 'depleted' ? 'red' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (date) => date ? moment(date).format('DD MMM YYYY') : 'N/A',
    },
  ];

  if (batchesLoading) {
    return <Spin tip="Loading batches..." style={{ margin: '20px auto', display: 'block' }} />;
  }

  if (batches.length === 0) {
    return <Text type="secondary">No batches found for this item.</Text>;
  }

  return (
    <Card size="small" style={{ margin: '10px 0', backgroundColor: '#f9f9f9' }}>
      <Title level={5}>Inventory Batches for {itemName}</Title>
      <Table
        columns={batchColumns}
        dataSource={batches}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </Card>
  );
};
// --- END NEW COMPONENT ---


const StockManagement = () => {
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [isAddStockModalVisible, setIsAddStockModalVisible] = useState(false); // Renamed for clarity
  const [isUnitRateModalVisible, setIsUnitRateModalVisible] = useState(false); // NEW: State for Unit Rate Modal
  const [unitRateForm] = Form.useForm(); // NEW: Form for Unit Rate Modal
  const [addStockForm] = Form.useForm(); // Renamed form for clarity
  const { user } = useAuth();

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await messAPI.getItemStock({ low_stock: showLowStock });
      const formattedStocks = (response.data.data || []).map(stock => ({
        ...stock,
        key: `${stock.item_id}-${stock.hostel_id}`,
        item_name: stock.Item?.name,
        category_name: stock.Item?.tbl_ItemCategory?.name || 'N/A',
        unit: stock.Item?.UOM?.abbreviation || 'unit',
        display_unit_price: stock.effective_unit_price,
      }));
      setStocks(formattedStocks);
    } catch (error) {
      message.error('Failed to fetch stock: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [showLowStock]);

  useEffect(() => {
    fetchStocks();
    fetchItems();
  }, [fetchStocks]);

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      setItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch items: ' + (error.response?.data?.message || error.message));
    }
  };

  const showAddStockModal = () => {
    setIsAddStockModalVisible(true);
  };

  const handleAddStock = async (values) => {
    try {
      const payload = {
        item_id: values.item_id,
        quantity: values.quantity,
        unit_price: values.unit_price,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : undefined,
      };

      await messAPI.updateItemStock(payload);
      message.success('Stock added successfully');
      setIsAddStockModalVisible(false);
      addStockForm.resetFields();
      fetchStocks();
    } catch (error) {
      message.error('Failed to add stock: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelAddStock = () => {
    setIsAddStockModalVisible(false);
    addStockForm.resetFields();
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const response = await messAPI.exportStockToExcel();
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'StockReport.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Stock report downloaded successfully!');
    } catch (error) {
      message.error('Failed to download stock report: ' + (error.message || 'Unknown error'));
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // NEW: Function to handle Unit Rate Calculation Export
  const handleExportUnitRateCalculation = async (values) => {
    setExportLoading(true); // Reuse exportLoading state
    try {
      const month = values.monthYear.month() + 1; // moment month is 0-indexed
      const year = values.monthYear.year();

      const response = await messAPI.exportUnitRateCalculation({ month, year });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `UnitRateCalculation_${moment({ month: month - 1, year }).format('MMM_YYYY')}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Unit Rate Calculation Report downloaded successfully!');
      setIsUnitRateModalVisible(false); // Close modal on success
      unitRateForm.resetFields();
    } catch (error) {
      message.error('Failed to download report: ' + (error.response?.data?.message || error.message));
      console.error('Unit Rate Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const expandedRowRender = (record) => {
    return (
      <BatchDetailsTable 
        itemId={record.item_id} 
        itemName={record.item_name} 
        unit={record.unit} 
      />
    );
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">{record.category_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (stock, record) => (
        <Space>
          <Text>{`${parseFloat(stock).toFixed(2)} ${record.unit}`}</Text>
          {stock <= record.minimum_stock && stock > 0.01 && <Tag color="warning">Low Stock</Tag>}
          {stock <= 0.01 && <Tag color="error">Out of Stock</Tag>}
        </Space>
      ),
    },
    {
      title: 'Unit Price (FIFO)',
      dataIndex: 'display_unit_price',
      key: 'display_unit_price',
      render: (price) => `₹${parseFloat(price).toFixed(2)}`,
    },
    {
      title: 'Minimum Stock',
      dataIndex: 'minimum_stock',
      key: 'minimum_stock',
      render: (stock, record) => `${parseFloat(stock).toFixed(2)} ${record.unit}`,
    },
  ];

  return (
    <Card
      title={<Title level={3}>Stock Management</Title>}
      extra={
        <Space>
          <Switch
            checkedChildren="Low Stock Only"
            unCheckedChildren="All Stock"
            checked={showLowStock}
            onChange={setShowLowStock}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchStocks}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddStockModal}>
            Add Stock
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            loading={exportLoading}
            type="default"
          >
            Export Current Stock
          </Button>
          {/* NEW BUTTON: Export Unit Rate Calculation */}
          <Button
            icon={<CalendarOutlined />}
            onClick={() => setIsUnitRateModalVisible(true)}
            type="default"
          >
            Export Monthly Report
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={stocks}
        columns={columns}
        rowKey="key"
        loading={loading}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: expandedRowRender,
        }}
      />
      <Modal
        title="Add Stock"
        visible={isAddStockModalVisible}
        onOk={addStockForm.submit}
        onCancel={handleCancelAddStock}
        okText="Add Stock"
        cancelText="Cancel"
      >
        <Form
          form={addStockForm}
          layout="vertical"
          onFinish={handleAddStock}
          initialValues={{
            quantity: 0,
            unit_price: 0,
            purchase_date: moment(),
          }}
        >
          <Form.Item
            name="item_id"
            label="Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select placeholder="Select an item" showSearch optionFilterProp="children">
              {items.map(item => (
                <Option key={item.id} value={item.id}>
                  {item.name} ({item.UOM?.abbreviation || 'unit'})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: 'Please enter quantity' },
              { type: 'number', min: 0.01, message: 'Quantity must be greater than 0' },
            ]}
          >
            <InputNumber min={0.01} step={0.1} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="unit_price"
            label="Unit Price"
            rules={[
              { required: true, message: 'Please enter unit price' },
              { type: 'number', min: 0, message: 'Unit price cannot be negative' },
            ]}
          >
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="purchase_date"
            label="Purchase Date"
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>

      {/* NEW: Modal for Unit Rate Calculation Report */}
      <Modal
        title="Export Monthly Unit Rate Report"
        visible={isUnitRateModalVisible}
        onOk={unitRateForm.submit}
        onCancel={() => setIsUnitRateModalVisible(false)}
        okText="Generate Report"
        cancelText="Cancel"
        confirmLoading={exportLoading}
      >
        <Form
          form={unitRateForm}
          layout="vertical"
          onFinish={handleExportUnitRateCalculation}
          initialValues={{
            monthYear: moment(), // Default to current month/year
          }}
        >
          <Form.Item
            name="monthYear"
            label="Select Month and Year"
            rules={[{ required: true, message: 'Please select a month and year' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} format="MMMM YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default StockManagement;
