import React, { useState, useEffect, useMemo } from 'react';
import {
  Form, Input, Button, Table, InputNumber, message, Row, Col,
  DatePicker, Typography, Space, Select, ConfigProvider,
  theme, Tag, Tabs
} from 'antd';
import {
  Save, Search, Calendar, ClipboardList,
  Filter, PackageMinus, ChevronRight, Info, PackageOpen, Undo2
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Text } = Typography;

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

/* ─── Consumption Tab ─── */
const ConsumptionTab = ({ items, categories, onSuccess, refetch }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [consumptionQuantities, setConsumptionQuantities] = useState({});

  const filteredItems = useMemo(() => items.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category_id === parseInt(selectedCategory);
    const matchesSearch = !searchText ||
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.tbl_ItemCategory?.name || '').toLowerCase().includes(searchText.toLowerCase());
    return matchesCat && matchesSearch;
  }), [items, selectedCategory, searchText]);

  const handleQuantityChange = (itemId, value) => {
    setConsumptionQuantities(prev => ({ ...prev, [itemId]: value > 0 ? value : undefined }));
  };

  const onFinish = async (values) => {
    const itemsToConsume = Object.entries(consumptionQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        item_id: parseInt(id),
        quantity_consumed: qty,
        unit_id: items.find(i => i.id === parseInt(id))?.unit_id,
      }));

    if (itemsToConsume.length === 0) return message.warning('Enter quantity for at least one item.');

    setSubmitting(true);
    try {
      await messAPI.recordAdhocConsumption({
        ...values,
        consumption_date: values.consumption_date.format('YYYY-MM-DD'),
        items: itemsToConsume,
      });
      message.success('Consumption recorded. Inventory updated.');
      form.resetFields();
      setConsumptionQuantities({});
      refetch();
      onSuccess?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Material Details', key: 'item',
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
      title: 'Current Stock', align: 'right',
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
      title: 'Qty to Withdraw', width: 180,
      render: (_, r) => (
        <InputNumber
          min={0} max={r.stock_quantity} placeholder="0.00"
          className="adhoc-qty-input"
          value={consumptionQuantities[r.id]}
          onChange={(val) => handleQuantityChange(r.id, val)}
          disabled={r.stock_quantity <= 0}
        />
      )
    },
  ];

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ consumption_date: moment() }}>
      <Row gutter={[28, 28]}>
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
              <Input.TextArea rows={3} placeholder="Approval IDs or details..." className="adhoc-textarea" />
            </Form.Item>
            <div className="adhoc-info-card">
              <Info size={15} className="adhoc-info-icon" />
              <p>Stock levels update immediately. Admin receives a system alert.</p>
            </div>
            <Button type="primary" htmlType="submit" loading={submitting} icon={<Save size={16} />} className="adhoc-save-btn w-full mt-4">
              Post Consumption
            </Button>
          </div>
        </Col>
        <Col lg={15} xs={24}>
          <div className="adhoc-panel">
            <div className="adhoc-panel-header">
              <PackageMinus size={16} className="adhoc-panel-icon" />
              <span>Select Materials</span>
            </div>
            <div className="adhoc-toolbar">
              <div className="adhoc-search-box">
                <Search size={16} className="text-slate-400" />
                <Input placeholder="Search items..." bordered={false} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
              </div>
              <Select className="adhoc-filter-select" value={selectedCategory} onChange={setSelectedCategory} suffixIcon={<Filter size={14} />}>
                <Option value="all">All Categories</Option>
                {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </div>
            <Table dataSource={filteredItems} columns={columns} pagination={{ pageSize: 7, showTotal: (t) => `Total ${t} items` }} className="adhoc-table" rowClassName={(r) => r.stock_quantity <= 0 ? 'adhoc-row-disabled' : ''} />
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
  );
};

/* ─── Return Tab ─── */
const ReturnTab = ({ items, categories, refetch }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [returnQuantities, setReturnQuantities] = useState({});

  const filteredItems = useMemo(() => items.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category_id === parseInt(selectedCategory);
    const matchesSearch = !searchText ||
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.tbl_ItemCategory?.name || '').toLowerCase().includes(searchText.toLowerCase());
    return matchesCat && matchesSearch;
  }), [items, selectedCategory, searchText]);

  const handleQuantityChange = (itemId, value) => {
    setReturnQuantities(prev => ({ ...prev, [itemId]: value > 0 ? value : undefined }));
  };

  const onFinish = async (values) => {
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        item_id: parseInt(id),
        quantity_returned: qty,
        unit_id: items.find(i => i.id === parseInt(id))?.unit_id,
      }));

    if (itemsToReturn.length === 0) return message.warning('Enter return quantity for at least one item.');

    setSubmitting(true);
    try {
      await messAPI.recordItemReturn({
        items: itemsToReturn,
        return_date: values.return_date.format('YYYY-MM-DD'),
        reason: values.reason,
      });
      message.success('Items returned to stock successfully.');
      form.resetFields();
      setReturnQuantities({});
      refetch();
    } catch (err) {
      message.error(err.response?.data?.message || 'Return failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Material Details', key: 'item',
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
      title: 'Current Stock', align: 'right',
      render: (_, r) => (
        <div className="flex flex-col items-end">
          <Text strong className="text-slate-600 font-mono">{parseFloat(r.stock_quantity).toFixed(2)}</Text>
          <Text className="text-[10px] text-slate-400 font-medium uppercase">{r.UOM?.abbreviation}</Text>
        </div>
      )
    },
    {
      title: 'Qty to Return', width: 180,
      render: (_, r) => (
        <InputNumber
          min={0} placeholder="0.00"
          className="adhoc-qty-input adhoc-qty-return"
          value={returnQuantities[r.id]}
          onChange={(val) => handleQuantityChange(r.id, val)}
        />
      )
    },
  ];

  const selectedCount = Object.values(returnQuantities).filter(Boolean).length;

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ return_date: moment() }}>
      <Row gutter={[28, 28]}>
        <Col lg={9} xs={24}>
          <div className="adhoc-panel adhoc-sticky">
            <div className="adhoc-panel-header">
              <Undo2 size={16} className="adhoc-panel-icon-return" />
              <span>Return Details</span>
            </div>
            <Form.Item name="return_date" label="Return Date" rules={[{ required: true }]}>
              <DatePicker className="w-full adhoc-datepicker" suffixIcon={<Calendar size={14} />} />
            </Form.Item>
            <Form.Item name="reason" label="Reason for Return" rules={[{ required: true, message: 'Please provide a reason' }]}>
              <Input.TextArea rows={3} placeholder="e.g., Prepared 18kg but 20kg was issued. Returning 2kg unused rice." className="adhoc-textarea" />
            </Form.Item>
            <div className="adhoc-info-card adhoc-info-return">
              <Info size={15} className="adhoc-info-icon-return" />
              <p>Returned quantities will be credited back to the most recent batch for that item. Stock levels update immediately.</p>
            </div>
            <Button
              type="primary" htmlType="submit" loading={submitting}
              icon={<Undo2 size={16} />}
              className="adhoc-return-btn w-full mt-4"
              disabled={selectedCount === 0}
            >
              Post Return ({selectedCount} item{selectedCount !== 1 ? 's' : ''})
            </Button>
          </div>
        </Col>
        <Col lg={15} xs={24}>
          <div className="adhoc-panel">
            <div className="adhoc-panel-header">
              <Undo2 size={16} className="adhoc-panel-icon-return" />
              <span>Select Items to Return</span>
            </div>
            <div className="adhoc-toolbar">
              <div className="adhoc-search-box">
                <Search size={16} className="text-slate-400" />
                <Input placeholder="Search items..." bordered={false} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
              </div>
              <Select className="adhoc-filter-select" value={selectedCategory} onChange={setSelectedCategory} suffixIcon={<Filter size={14} />}>
                <Option value="all">All Categories</Option>
                {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </div>
            <Table dataSource={filteredItems} columns={columns} pagination={{ pageSize: 7, showTotal: (t) => `Total ${t} items` }} className="adhoc-table" />
            <div className="adhoc-summary-footer adhoc-summary-return">
              <div>
                <span className="label text-slate-400 text-[10px] uppercase font-bold tracking-widest block">Returning</span>
                <span className="value text-xl font-bold text-emerald-700">{selectedCount} Materials</span>
              </div>
              <Tag color="green" className="rounded-full px-4 border-none font-bold">RETURN TO STOCK</Tag>
            </div>
          </div>
        </Col>
      </Row>
    </Form>
  );
};

/* ─── Main Component ─── */
const RecordAdhocConsumption = ({ onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('consume');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catsRes] = await Promise.all([
        messAPI.getItems(),
        messAPI.getItemCategories(),
      ]);
      setItems((itemsRes.data.data || []).map(i => ({ ...i, key: i.id })));
      setCategories(catsRes.data.data || []);
    } catch {
      message.error('Failed to fetch inventory data.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  if (loading) return <><style>{CSS}</style><AdhocSkeleton /></>;

  const tabItems = [
    {
      key: 'consume',
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <PackageMinus size={15} /> Record Consumption
        </span>
      ),
      children: <ConsumptionTab items={items} categories={categories} onSuccess={onSuccess} refetch={fetchData} />,
    },
    {
      key: 'return',
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <Undo2 size={15} /> Item Return
        </span>
      ),
      children: <ReturnTab items={items} categories={categories} refetch={fetchData} />,
    },
  ];

  return (
    <>
      <style>{CSS}</style>
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1a56db', borderRadius: 12, fontFamily: 'DM Sans, sans-serif' } }}>
        <div className="adhoc-shell">
          {/* Header */}
          <div className="adhoc-topbar">
            <div className="adhoc-topbar-left">
              <div className={`adhoc-icon-badge ${activeTab === 'return' ? 'adhoc-icon-badge-return' : ''}`}>
                {activeTab === 'return' ? <Undo2 size={20} /> : <PackageOpen size={20} />}
              </div>
              <div>
                <h1 className="adhoc-heading">
                  {activeTab === 'return' ? 'Item Return Entry' : 'Ad-hoc Consumption'}
                </h1>
                <p className="adhoc-subheading">
                  {activeTab === 'return'
                    ? 'Return unused materials back to stock'
                    : 'Record one-off warehouse withdrawals for events'}
                </p>
              </div>
            </div>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="adhoc-tabs"
          />
        </div>
      </ConfigProvider>
    </>
  );
};

/* ─── CSS ─── */
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

@keyframes adhoc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
.adhoc-skeleton-pulse { background: #e2e8f0; animation: adhoc-pulse 1.8s ease-in-out infinite; }

.adhoc-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.adhoc-topbar-left { display: flex; align-items: center; gap: 16px; }
.adhoc-icon-badge {
  width: 52px; height: 52px; border-radius: 16px;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  display: flex; align-items: center; justify-content: center;
  color: #fff; box-shadow: 0 10px 20px rgba(30,64,175,.2);
  transition: background .3s;
}
.adhoc-icon-badge-return {
  background: linear-gradient(135deg, #065f46 0%, #10b981 100%) !important;
  box-shadow: 0 10px 20px rgba(6,95,70,.2) !important;
}
.adhoc-heading { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
.adhoc-subheading { font-size: 14px; color: #64748b; margin: 2px 0 0; }

.adhoc-tabs .ant-tabs-tab { font-size: 14px !important; padding: 12px 20px !important; }
.adhoc-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #1a56db !important; }
.adhoc-tabs .ant-tabs-ink-bar { background: #1a56db !important; }

.adhoc-save-btn.ant-btn, .adhoc-return-btn.ant-btn {
  height: 48px !important; padding: 0 28px !important;
  border-radius: 14px !important; font-weight: 700 !important;
  border: none !important;
}
.adhoc-save-btn.ant-btn { background: #1a56db !important; box-shadow: 0 8px 20px rgba(26,86,219,.25) !important; }
.adhoc-return-btn.ant-btn { background: #059669 !important; box-shadow: 0 8px 20px rgba(5,150,105,.25) !important; }

.adhoc-panel {
  background: #fff; border-radius: 24px; padding: 28px;
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
.adhoc-panel-icon-return { color: #059669; }

.adhoc-input, .adhoc-datepicker, .adhoc-textarea {
  border-radius: 12px !important; border-color: #e2e8f0 !important; height: 44px !important;
}
.adhoc-textarea { height: auto !important; padding: 12px !important; }

.adhoc-toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
.adhoc-search-box {
  flex: 1; display: flex; align-items: center; gap: 10px;
  background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 12px; padding: 0 16px;
}
.adhoc-filter-select .ant-select-selector {
  border-radius: 12px !important; background: #f8fafc !important;
  height: 44px !important; align-items: center !important; width: 180px;
}
.adhoc-table .ant-table-thead > tr > th {
  background: #f8fafc !important; color: #64748b !important;
  font-size: 10px !important; text-transform: uppercase !important;
  font-weight: 700 !important; letter-spacing: .05em; padding: 16px !important;
}
.adhoc-table .ant-table-tbody > tr > td { padding: 16px !important; }
.adhoc-qty-input { width: 100% !important; border-radius: 10px !important; border-color: #cbd5e1 !important; }
.adhoc-qty-return { border-color: #6ee7b7 !important; }
.adhoc-row-disabled { opacity: .5; background: #fcfcfc; }

.adhoc-summary-footer {
  margin-top: 24px; padding: 20px; background: #f1f5f9;
  border-radius: 16px; display: flex; align-items: center; justify-content: space-between;
}
.adhoc-summary-return { background: #ecfdf5; }

.adhoc-info-card {
  display: flex; gap: 12px; background: #eff6ff;
  border: 1px solid #bfdbfe; border-radius: 16px; padding: 16px; margin-top: 20px;
}
.adhoc-info-return { background: #ecfdf5 !important; border-color: #6ee7b7 !important; }
.adhoc-info-icon { color: #1a56db; flex-shrink: 0; }
.adhoc-info-icon-return { color: #059669; flex-shrink: 0; }
.adhoc-info-card p { font-size: 12px; color: #1e40af; margin: 0; line-height: 1.6; }
.adhoc-info-return p { color: #065f46 !important; }

.adhoc-shell .ant-form-item-label > label {
  font-size: 11px !important; font-weight: 700 !important;
  text-transform: uppercase; color: #64748b !important;
}
`;

export default RecordAdhocConsumption;