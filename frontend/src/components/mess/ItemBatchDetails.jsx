import React, { useState, useEffect } from 'react';
import { Table, message, Tag, Typography } from 'antd';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Text } = Typography;

const ItemBatchDetails = ({ itemId }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBatches = async () => {
      if (!itemId) return;
      setLoading(true);
      try {
        const response = await messAPI.getItemBatches(itemId);
        setBatches(response.data.data || []);
      } catch (error) {
        message.error(`Failed to fetch batches for item ${itemId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, [itemId]);

  const columns = [
    {
      title: 'Purchase Date',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date) => moment(date).format('DD MMM YYYY'),
      sorter: (a, b) => new Date(a.purchase_date) - new Date(b.purchase_date),
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
    },
    {
      title: 'Qty Remaining',
      dataIndex: 'quantity_remaining',
      key: 'quantity_remaining',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'geekblue';
        if (status === 'depleted') color = 'volcano';
        if (status === 'expired') color = 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Text strong>Active & Depleted Batches (FIFO Order)</Text>
      <Table
        columns={columns}
        dataSource={batches}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />
    </div>
  );
};

export default ItemBatchDetails;
