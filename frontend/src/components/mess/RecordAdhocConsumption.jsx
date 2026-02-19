import React, { useState, useEffect, useMemo } from 'react';
import { 
  Form, Input, Button, Table, InputNumber, message, Row, Col, 
  DatePicker, Typography, Space, Select, ConfigProvider, 
  theme, Tag, Divider 
} from 'antd';
import { 
  Save, Search, Utensils, Calendar, ClipboardList, 
  Filter, PackageMinus, ChevronRight, Info, PackageOpen
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Text, Title } = Typography;

/* ─── Skeleton ─── */
const AdhocSkeleton = () => (
  <div className="adhoc-shell">
    <div className="adhoc-skeleton-pulse" style={{ height: 60, borderRadius: 16, marginBottom: 32 }} />
    <Row gutter={28}>
      <Col span={9}><div className="adhoc-skeleton-pulse" style={{ height: 450, borderRadius: 20 }} /></Col>
      <Col span={15}><div className="adhoc-skeleton-pulse" style={{ height: 550, borderRadius: 20 }} /></Col>
    </Row>
  </div>
);

/* ─── Main Component ─── */
const RecordAdhocConsumption = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [consumptionQuantities, setConsumptionQuantities] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, categoriesResponse] = await Promise.all([
        messAPI.getItems(),
        messAPI.getItemCategories()
      ]);
      setItems((itemsResponse.data.data || []).map(item => ({ ...item, key: item.id })));
      setCategories(categoriesResponse.data.data || []);
    } catch {
      message.error('Failed to fetch inventory data.');
    } finally {
      setTimeout(() => setLoading(false), 800);
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

    if (itemsToConsume.length === 0) return message.warning('Enter quantity for at least one item.');

    setSubmitting(true);
    try {
      await messAPI.recordAdhocConsumption({
        ...values,
        consumption_date: values.consumption_date.format('YYYY-MM-DD'),
        items: itemsToConsume,
      });
      message.success('Consumption recorded successfully! Inventory updated.');
      form.resetFields();
      setConsumptionQuantities({});
      fetchData();
      onSuccess?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Material Details',
      key: 'item',
      render: (_, r) => (
        <div className="flex flex-col">
          <Text strong className="text-slate-700">{r.name}</Text>
          <Text className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            {r.tbl_ItemCategory?.name || 'General'}
          </Text>
        </div>
      )
    },
    {
      title: 'Current Stock',
      align: 'right',
      render: (_, r) => {
        const isLow = r.stock_quantity <= (r.minimum_stock || 0);
        return (
          <div className="flex flex-col items-end">
            <Text strong className={isLow ? 'text-rose-500 font-mono' : 'text-slate-600 font-mono'}>
              {parseFloat(r.stock_quantity).toFixed(2)}
            </Text>
            <Text className="text-[10px] text-slate-400 font-medium uppercase">{r.UOM?.abbreviation}</Text>
          </div>
        );
      }
    },
    {
      title: 'Quantity to Withdraw',
      width: 180,
      render: (_, r) => (
        <InputNumber
          min={0}
          max={r.stock_quantity}
          placeholder="0.00"
          className="adhoc-qty-input"
          value={consumptionQuantities[r.id]}
          onChange={(val) => handleQuantityChange(r.id, val)}
          disabled={r.stock_quantity <= 0}
        />
      )
    }
  ];

  if (loading) return <><style>{CSS}</style><AdhocSkeleton /></>;

  return (
    <>
      <style>{CSS}</style>
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1a56db', borderRadius: 12, fontFamily: 'DM Sans, sans-serif' } }}>
        <div className="adhoc-shell">
          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ consumption_date: moment() }}>
            
            {/* ── Header ── */}
            <div className="adhoc-topbar">
              <div className="adhoc-topbar-left">
                <div className="adhoc-icon-badge">
                  <PackageOpen size={20} />
                </div>
                <div>
                  <h1 className="adhoc-heading">Ad-hoc Consumption</h1>
                  <p className="adhoc-subheading">Record one-off warehouse withdrawals for events</p>
                </div>
              </div>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting} 
                icon={<Save size={16} />}
                className="adhoc-save-btn"
              >
                Post Consumption
              </Button>
            </div>

            <Row gutter={[28, 28]}>
              {/* ── Left: Context ── */}
              <Col lg={9} xs={24}>
                <div className="adhoc-panel adhoc-sticky">
                  <div className="adhoc-panel-header">
                    <ClipboardList size={16} className="adhoc-panel-icon" />
                    <span>Transaction Details</span>
                  </div>

                  <Form.Item name="name" label="Event / Purpose" rules={[{ required: true }]}>
                    <Input prefix={<ChevronRight size={14} className="text-slate-300" />} placeholder="e.g., Staff Gathering" className="adhoc-input" />
                  </Form.Item>

                  <Form.Item name="consumption_date" label="Withdrawal Date" rules={[{ required: true }]}>
                    <DatePicker className="w-full adhoc-datepicker" suffixIcon={<Calendar size={14} />} />
                  </Form.Item>

                  <Form.Item name="description" label="Internal Notes">
                    <Input.TextArea rows={3} placeholder="Add specific details or approval IDs..." className="adhoc-textarea" />
                  </Form.Item>

                  <div className="adhoc-info-card">
                    <Info size={15} className="adhoc-info-icon" />
                    <p>Stock levels will be updated immediately upon submission. Admin will receive a system alert.</p>
                  </div>
                </div>
              </Col>

              {/* ── Right: Inventory ── */}
              <Col lg={15} xs={24}>
                <div className="adhoc-panel">
                  <div className="adhoc-panel-header flex justify-between">
                    <div className="flex items-center gap-2">
                      <PackageMinus size={16} className="adhoc-panel-icon" />
                      <span>Select Materials</span>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="adhoc-toolbar">
                    <div className="adhoc-search-box">
                      <Search size={16} className="text-slate-400" />
                      <Input 
                        placeholder="Search items..." 
                        bordered={false} 
                        value={searchText} 
                        onChange={e => setSearchText(e.target.value)} 
                        allowClear 
                      />
                    </div>
                    <Select 
                      className="adhoc-filter-select" 
                      value={selectedCategory} 
                      onChange={setSelectedCategory}
                      suffixIcon={<Filter size={14} />}
                    >
                      <Option value="all">All Categories</Option>
                      {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                  </div>

                  <Table 
                    dataSource={filteredItems} 
                    columns={columns} 
                    pagination={{ pageSize: 7, showTotal: (total) => `Total ${total} items` }}
                    className="adhoc-table"
                    rowClassName={(record) => record.stock_quantity <= 0 ? 'adhoc-row-disabled' : ''}
                  />

                  {/* Selection Summary */}
                  <div className="adhoc-summary-footer">
                    <div>
                      <span className="label text-slate-400 text-[10px] uppercase font-bold tracking-widest block">Selected Items</span>
                      <span className="value text-xl font-bold text-slate-700">
                        {Object.values(consumptionQuantities).filter(Boolean).length} Materials
                      </span>
                    </div>
                    <Tag color="blue" className="rounded-full px-4 border-none font-bold">READY TO POST</Tag>
                  </div>
                </div>
              </Col>
            </Row>
          </Form>
        </div>
      </ConfigProvider>
    </>
  );
};

/* ─────────────────────── CSS ─────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');

.adhoc-shell {
  font-family: 'DM Sans', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  background: #f8fafc;
  min-height: 100vh;
}

/* Skeleton */
@keyframes adhoc-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}
.adhoc-skeleton-pulse {
  background: #e2e8f0;
  animation: adhoc-pulse 1.8s ease-in-out infinite;
}

/* Topbar */
.adhoc-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.adhoc-topbar-left { display: flex; align-items: center; gap: 16px; }
.adhoc-icon-badge {
  width: 52px; height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  display: flex; align-items: center; justify-content: center;
  color: #fff; box-shadow: 0 10px 20px rgba(30,64,175,.2);
}
.adhoc-heading { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
.adhoc-subheading { font-size: 14px; color: #64748b; margin: 2px 0 0; }

.adhoc-save-btn.ant-btn {
  height: 48px !important; padding: 0 28px !important;
  border-radius: 14px !important; font-weight: 700 !important;
  background: #1a56db !important; border: none !important;
  box-shadow: 0 8px 20px rgba(26,86,219,.25) !important;
}

/* Panels */
.adhoc-panel {
  background: #ffffff; border-radius: 24px; padding: 28px;
  border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,.02);
}
.adhoc-sticky { position: sticky; top: 24px; }
.adhoc-panel-header {
  display: flex; align-items: center; gap: 10px;
  font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .1em; color: #475569;
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.adhoc-panel-icon { color: #1a56db; }

/* Inputs */
.adhoc-input, .adhoc-datepicker, .adhoc-textarea {
  border-radius: 12px !important; border-color: #e2e8f0 !important;
  height: 44px !important;
}
.adhoc-textarea { height: auto !important; padding: 12px !important; }

/* Toolbar */
.adhoc-toolbar {
  display: flex; gap: 12px; margin-bottom: 20px;
}
.adhoc-search-box {
  flex: 1; display: flex; align-items: center; gap: 10px;
  background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 12px; padding: 0 16px;
}
.adhoc-filter-select .ant-select-selector {
  border-radius: 12px !important; background: #f8fafc !important;
  height: 44px !important; align-items: center !important; width: 180px;
}

/* Table */
.adhoc-table .ant-table-thead > tr > th {
  background: #f8fafc !important; color: #64748b !important;
  font-size: 10px !important; text-transform: uppercase !important;
  font-weight: 700 !important; letter-spacing: .05em; padding: 16px !important;
}
.adhoc-table .ant-table-tbody > tr > td { padding: 16px !important; }
.adhoc-qty-input {
  width: 100% !important; border-radius: 10px !important;
  border-color: #cbd5e1 !important;
}
.adhoc-row-disabled { opacity: .5; background: #fcfcfc; }

/* Summary Footer */
.adhoc-summary-footer {
  margin-top: 24px; padding: 20px;
  background: #f1f5f9; border-radius: 16px;
  display: flex; align-items: center; justify-content: space-between;
}

.adhoc-info-card {
  display: flex; gap: 12px; background: #eff6ff;
  border: 1px solid #bfdbfe; border-radius: 16px;
  padding: 16px; margin-top: 20px;
}
.adhoc-info-icon { color: #1a56db; flex-shrink: 0; }
.adhoc-info-card p { font-size: 12px; color: #1e40af; margin: 0; line-height: 1.6; }

.adhoc-shell .ant-form-item-label > label {
  font-size: 11px !important; font-weight: 700 !important;
  text-transform: uppercase; color: #64748b !important;
}
`;

export default RecordAdhocConsumption;