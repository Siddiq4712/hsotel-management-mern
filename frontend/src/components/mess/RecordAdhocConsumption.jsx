import React, { useState, useEffect, useMemo } from 'react';
import { 
  Form, Input, Button, Card, Table, InputNumber, message, Row, Col, 
  DatePicker, Typography, Tooltip, Space, Select, ConfigProvider, 
  theme, Skeleton, Tag, Divider 
} from 'antd';
import { 
  Save, Search, Utensils, Calendar, ClipboardList, 
  AlertTriangle, Filter, PackageMinus, ChevronRight 
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Text, Title } = Typography;

// --- Specialized Skeleton for Consumption Table ---
const ConsumptionSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton.Input active style={{ width: 300 }} />
        <div className="flex gap-2">
          <Skeleton.Button active style={{ width: 100 }} />
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <div className="flex-1"><Skeleton active paragraph={{ rows: 1 }} /></div>
          <Skeleton.Input active style={{ width: 120 }} />
        </div>
      ))}
    </div>
  </Card>
);

const RecordAdhocConsumption = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [consumptionQuantities, setConsumptionQuantities] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, categoriesResponse] = await Promise.all([
        messAPI.getItems(),
        messAPI.getItemCategories()
      ]);
      const availableItems = (itemsResponse.data.data || []).map(item => ({
        ...item,
        key: item.id,
      }));
      setItems(availableItems);
      setCategories(categoriesResponse.data.data || []);
    } catch (error) {
      message.error('Failed to fetch inventory data.');
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category_id === parseInt(selectedCategory);
      const matchesSearch = !searchText || 
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.tbl_ItemCategory?.name || '').toLowerCase().includes(searchText.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchText]);

  const handleQuantityChange = (itemId, value) => {
    setConsumptionQuantities(prev => ({
      ...prev,
      [itemId]: value > 0 ? value : undefined,
    }));
  };

  const onFinish = async (values) => {
    const itemsToConsume = Object.entries(consumptionQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        item_id: parseInt(id),
        quantity_consumed: qty,
        unit_id: items.find(i => i.id === parseInt(id))?.unit_id
      }));

    if (itemsToConsume.length === 0) {
      return message.warning('Please enter a quantity for at least one item.');
    }

    setSubmitting(true);
    try {
      await messAPI.recordAdhocConsumption({
        ...values,
        consumption_date: values.consumption_date.format('YYYY-MM-DD'),
        items: itemsToConsume,
      });
      message.success('Consumption recorded successfully');
      form.resetFields();
      setConsumptionQuantities({});
      fetchData(); // Refresh stock levels
    } catch (error) {
      message.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Item Description',
      key: 'item',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.name}</Text>
          <Text className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            {r.tbl_ItemCategory?.name}
          </Text>
        </Space>
      )
    },
    {
      title: 'Available Stock',
      align: 'right',
      render: (_, r) => {
        const isLow = r.stock_quantity <= (r.minimum_stock || 0);
        return (
          <div className="flex flex-col items-end">
            <Text strong className={isLow ? 'text-rose-500' : 'text-slate-600'}>
              {r.stock_quantity} {r.UOM?.abbreviation}
            </Text>
            {isLow && <Tag color="error" className="m-0 text-[9px] border-none rounded-full px-2 font-bold">LOW</Tag>}
          </div>
        );
      }
    },
    {
      title: 'Quantity to Consume',
      width: 220,
      render: (_, r) => (
        <InputNumber
          min={0}
          max={r.stock_quantity}
          placeholder="0.00"
          className="w-full rounded-xl"
          value={consumptionQuantities[r.id]}
          onChange={(val) => handleQuantityChange(r.id, val)}
          disabled={r.stock_quantity <= 0}
        />
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-100">
              <Utensils className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Ad-hoc Consumption</Title>
              <Text type="secondary">Record non-menu inventory usage for special events</Text>
            </div>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ consumption_date: moment() }}>
          <Row gutter={24}>
            {/* Left Column: Form Details */}
            <Col lg={8} xs={24}>
              <Card className="border-none shadow-sm rounded-[32px] sticky top-8">
                <Title level={4} className="mb-6 flex items-center gap-2">
                  <ClipboardList size={20} className="text-blue-600" /> Event Details
                </Title>
                
                <Form.Item name="name" label="Event Name" rules={[{ required: true }]}>
                  <Input prefix={<ChevronRight size={14} className="text-slate-400"/>} placeholder="e.g., Staff Party" className="h-11 rounded-xl" />
                </Form.Item>

                <Form.Item name="consumption_date" label="Date" rules={[{ required: true }]}>
                  <DatePicker className="w-full h-11 rounded-xl" format="YYYY-MM-DD" />
                </Form.Item>

                <Form.Item name="description" label="Notes (Optional)">
                  <Input.TextArea rows={3} placeholder="Provide reason for consumption..." className="rounded-xl" />
                </Form.Item>

                <Divider className="my-6" />

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large" 
                  loading={submitting}
                  icon={<Save size={18} />}
                  className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold"
                >
                  Record Consumption
                </Button>
              </Card>
            </Col>

            {/* Right Column: Item Selection */}
            <Col lg={16} xs={24}>
              <div className="space-y-6">
                <Card className="border-none shadow-sm rounded-2xl">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
                      <Search size={18} className="text-slate-300" />
                      <Input 
                        placeholder="Search items..." 
                        bordered={false} 
                        value={searchText} 
                        onChange={e => setSearchText(e.target.value)} 
                        allowClear 
                      />
                    </div>
                    <Select 
                      className="w-48 h-11" 
                      value={selectedCategory} 
                      onChange={setSelectedCategory}
                      suffixIcon={<Filter size={14} />}
                    >
                      <Option value="all">All Categories</Option>
                      {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                  </div>
                </Card>

                {loading ? <ConsumptionSkeleton /> : (
                  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                    <Table 
                      dataSource={filteredItems} 
                      columns={columns} 
                      pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} items` }}
                      rowClassName={(record) => record.stock_quantity <= 0 ? 'bg-slate-50/50 opacity-60' : ''}
                    />
                  </Card>
                )}
              </div>
            </Col>
          </Row>
        </Form>
      </div>
    </ConfigProvider>
  );
};

export default RecordAdhocConsumption;