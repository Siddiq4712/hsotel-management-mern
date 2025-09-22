// src/components/mess/InventoryTransactions.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Select, DatePicker, Button, Space, Tag, Spin, Alert, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;

const InventoryTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    transaction_type: 'purchase',
    item_id: null,
    store_id: null,
    dateRange: null
  });

  useEffect(() => {
    fetchItems();
    fetchStores();
    fetchTransactions();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      if (response.data.success) {
        setItems(response.data.data);
      } else {
        message.error('Failed to load items: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setError('Failed to load items. Please try again later.');
    }
  };

  const fetchStores = async () => {
    try {
      const response = await messAPI.getStores();
      if (response.data.success) {
        setStores(response.data.data);
      } else {
        message.error('Failed to load stores: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      setError('Failed to load stores. Please try again later.');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        transaction_type: filters.transaction_type,
        ...(filters.item_id && { item_id: filters.item_id }),
        ...(filters.store_id && { store_id: filters.store_id }),
        ...(filters.dateRange && { 
          from_date: filters.dateRange[0].format('YYYY-MM-DD'),
          to_date: filters.dateRange[1].format('YYYY-MM-DD')
        })
      };
      
      const response = await messAPI.getInventoryTransactions(params);
      if (response.data.success) {
        setTransactions(response.data.data);
      } else {
        setError('Failed to load transactions: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setError('Failed to load transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchTransactions();
  };

  const handleReset = () => {
    setFilters({
      transaction_type: 'purchase',
      item_id: null,
      store_id: null,
      dateRange: null
    });
    fetchTransactions();
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      render: text => moment(text).format('YYYY-MM-DD')
    },
    {
      title: 'Item',
      dataIndex: ['Item', 'name'],
      key: 'item_name',
      render: (text, record) => (
        <span>
          {text} 
          <br />
          <small>{record.Item?.tbl_ItemCategory?.name}</small>
        </span>
      )
    },
    {
      title: 'Store',
      dataIndex: ['Store', 'name'],
      key: 'store_name',
      render: text => text || '-'
    },
    {
      title: 'Quantity',
      key: 'quantity',
      render: (_, record) => `${record.quantity} ${record.unit}`
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: text => text ? `₹ ${parseFloat(text).toFixed(2)}` : '-'
    },
    {
      title: 'Total Value',
      key: 'total_value',
      render: (_, record) => {
        const total = record.quantity * (record.unit_price || 0);
        return `₹ ${total.toFixed(2)}`;
      }
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      render: text => (
        <Tag color={text === 'purchase' ? 'green' : 'red'}>
          {text === 'purchase' ? 'Purchase' : 'Consumption'}
        </Tag>
      )
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true
    }
  ];

  return (
    <Card title="Inventory Transactions" bordered={false}>
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setError(null)}
        />
      )}
      
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 120 }}
            value={filters.transaction_type}
            onChange={value => handleFilterChange('transaction_type', value)}
          >
            <Option value="purchase">Purchases</Option>
            <Option value="consumption">Consumption</Option>
          </Select>
          
          <Select
            style={{ width: 200 }}
            placeholder="Select Item"
            value={filters.item_id}
            onChange={value => handleFilterChange('item_id', value)}
            allowClear
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {items.map(item => (
              <Option key={item.id} value={item.id}>{item.name}</Option>
            ))}
          </Select>
          
          <Select
            style={{ width: 200 }}
            placeholder="Select Store"
            value={filters.store_id}
            onChange={value => handleFilterChange('store_id', value)}
            allowClear
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {stores.map(store => (
              <Option key={store.id} value={store.id}>{store.name}</Option>
            ))}
          </Select>
          
          <RangePicker
            value={filters.dateRange}
            onChange={value => handleFilterChange('dateRange', value)}
            format="YYYY-MM-DD"
          />
          
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            Search
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Space>
      </div>
      
      <Spin spinning={loading}>
        <Table
          dataSource={transactions}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
          summary={pageData => {
            const totalValue = pageData.reduce(
              (sum, record) => sum + (record.quantity * (record.unit_price || 0)),
              0
            );
            
            return (
              <>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    <strong>Total Value</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <strong>₹ {totalValue.toFixed(2)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} colSpan={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              </>
            );
          }}
        />
      </Spin>
    </Card>
  );
};

export default InventoryTransactions;
