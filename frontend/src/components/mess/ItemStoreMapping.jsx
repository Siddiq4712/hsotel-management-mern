import React, { useState, useEffect } from 'react';
import { Card, Select, Table, Button, Modal, Form, InputNumber, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

const ItemStoreMapping = () => {
    const [form] = Form.useForm();
    const [items, setItems] = useState([]);
    const [stores, setStores] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [itemsRes, storesRes, mappingsRes] = await Promise.all([
                api.get('/mess/items'),
                api.get('/mess/stores'),
                api.get('/mess/item-stores')
            ]);
            setItems(itemsRes.data.data);
            setStores(storesRes.data.data);
            setMappings(mappingsRes.data.data);
        } catch (error) {
            message.error("Failed to load initial data. Please refresh.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMapping = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleSubmit = async (values) => {
        try {
            await api.post('/mess/item-stores', values);
            message.success('Mapping created successfully!');
            setIsModalVisible(false);
            fetchInitialData(); // Refresh the mappings list
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to create mapping.";
            message.error(errorMsg);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/mess/item-stores/${id}`);
            message.success('Mapping removed successfully!');
            fetchInitialData(); // Refresh the mappings list
        } catch (error) {
            message.error("Failed to remove mapping.");
        }
    };

    const columns = [
        {
            title: 'Item',
            dataIndex: 'Item',
            key: 'item',
            render: (item) => item?.name || 'N/A',
            sorter: (a, b) => a.Item.name.localeCompare(b.Item.name),
        },
        {
            title: 'Store',
            dataIndex: 'Store',
            key: 'store',
            render: (store) => store?.name || 'N/A',
            sorter: (a, b) => a.Store.name.localeCompare(b.Store.name),
        },
        {
            title: 'Last Known Price (₹)',
            dataIndex: 'price',
            key: 'price',
            render: (price) => price ? parseFloat(price).toFixed(2) : 'Not set',
            sorter: (a, b) => a.price - b.price,
        },
        {
            title: 'Preferred',
            dataIndex: 'is_preferred',
            key: 'is_preferred',
            render: (isPreferred) => isPreferred ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="Delete this mapping?"
                    description="Are you sure you want to remove this item-store link?"
                    onConfirm={() => handleDelete(record.id)}
                >
                    <Button danger icon={<DeleteOutlined />} size="small">Remove</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Card
            title="Item-Store Mapping"
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMapping}>
                    Add New Mapping
                </Button>
            }
        >
            <Table
                loading={loading}
                columns={columns}
                dataSource={mappings}
                rowKey="id"
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title="Add New Item-Store Mapping"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="item_id" label="Select Item" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Search and select an item" optionFilterProp="children">
                            {items.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="store_id" label="Select Store" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Search and select a store" optionFilterProp="children">
                            {stores.map(store => <Option key={store.id} value={store.id}>{store.name}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="price" label="Last Known Price (₹)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} step={0.5} placeholder="e.g., 150.50" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Save Mapping
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ItemStoreMapping;
