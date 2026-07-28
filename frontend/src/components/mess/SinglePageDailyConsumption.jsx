import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, message, Modal,
  Form, Input, Select, InputNumber, DatePicker, Typography,
  Divider, ConfigProvider, Row, Col, Alert, Badge, Spin, Tooltip, Progress
} from 'antd';
import {
  Zap, Calendar, Plus, Trash2, CheckCircle2, AlertTriangle,
  Coffee, Sun, Sunset, Moon, Package, ArrowRight, RefreshCw,
  Sparkles, ShieldAlert, Layers, Check, ShoppingBag
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

/* ─── Modern Theme Tokens ─── */
const T = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderHov: '#CBD5E1',
  ink: '#0F172A',
  inkMid: '#475569',
  inkSoft: '#64748B',
  accent: '#2563EB',
  accentBg: '#EFF6FF',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  success: '#10B981',
  successBg: '#ECFDF5',
  radius: '12px',
  shadow: '0 4px 12px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)',
};

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: Sun, color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A' },
  { key: 'lunch', label: 'Lunch', icon: Sun, color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
  { key: 'snacks', label: 'Snacks', icon: Coffee, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  { key: 'dinner', label: 'Dinner', icon: Moon, color: '#4F46E5', bg: '#E0E7FF', border: '#C7D2FE' },
];

const SinglePageDailyConsumption = () => {
  const [items, setItems] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consumptionDate, setConsumptionDate] = useState(moment());
  
  // State for 4 meal entries: { breakfast: [{ id, item_id, quantity }], lunch: [...], ... }
  const [mealEntries, setMealEntries] = useState({
    breakfast: [{ id: Date.now() + 1, item_id: null, quantity: '' }],
    lunch: [{ id: Date.now() + 2, item_id: null, quantity: '' }],
    snacks: [{ id: Date.now() + 3, item_id: null, quantity: '' }],
    dinner: [{ id: Date.now() + 4, item_id: null, quantity: '' }],
  });

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);

  // Fetch items and stocks
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, uomsRes, stockRes] = await Promise.all([
        messAPI.getItems(),
        messAPI.getUOMs(),
        messAPI.getItemStock(),
      ]);

      const itemsList = itemsRes.data?.data || itemsRes.data || [];
      const uomsList = uomsRes.data?.data || uomsRes.data || [];
      const stockList = stockRes.data?.data || stockRes.data || [];

      // Create a map of item stock by item_id
      const stockMap = new Map();
      stockList.forEach(s => {
        stockMap.set(s.item_id, s);
      });

      // Merge stock data into items
      const enrichedItems = itemsList.map(item => {
        const s = stockMap.get(item.id);
        return {
          ...item,
          current_stock: s ? parseFloat(s.current_stock || 0) : 0,
          minimum_stock: s ? parseFloat(s.minimum_stock || 0) : 0,
        };
      });

      setItems(enrichedItems);
      setUoms(uomsList);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      message.error('Failed to load raw items stock data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create an item lookup map
  const itemMap = useMemo(() => {
    const map = new Map();
    items.forEach(i => map.set(i.id, i));
    return map;
  }, [items]);

  // Create a UOM lookup map
  const uomMap = useMemo(() => {
    const map = new Map();
    uoms.forEach(u => map.set(u.id, u));
    return map;
  }, [uoms]);

  // Helper to add row to a meal
  const addRow = (mealKey) => {
    setMealEntries(prev => ({
      ...prev,
      [mealKey]: [
        ...prev[mealKey],
        { id: Date.now() + Math.random(), item_id: null, quantity: '' }
      ]
    }));
  };

  // Helper to remove row
  const removeRow = (mealKey, rowId) => {
    setMealEntries(prev => {
      const updated = prev[mealKey].filter(r => r.id !== rowId);
      return {
        ...prev,
        [mealKey]: updated.length > 0 ? updated : [{ id: Date.now(), item_id: null, quantity: '' }]
      };
    });
  };

  // Helper to update field in row
  const updateRowField = (mealKey, rowId, field, value) => {
    setMealEntries(prev => ({
      ...prev,
      [mealKey]: prev[mealKey].map(r => r.id === rowId ? { ...r, [field]: value } : r)
    }));
  };

  // Calculate totals across all meals
  const summaryStats = useMemo(() => {
    let totalItemsLogged = 0;
    let validRowsCount = 0;
    const mealItemCounts = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };

    Object.keys(mealEntries).forEach(mKey => {
      mealEntries[mKey].forEach(row => {
        if (row.item_id && parseFloat(row.quantity) > 0) {
          validRowsCount++;
          mealItemCounts[mKey]++;
          totalItemsLogged += parseFloat(row.quantity);
        }
      });
    });

    const lowStockCount = items.filter(i => i.current_stock <= i.minimum_stock).length;

    return {
      totalItemsLogged,
      validRowsCount,
      mealItemCounts,
      lowStockCount,
      availableItemsCount: items.length
    };
  }, [mealEntries, items]);

  // Flatten valid rows for submission review
  const flattenedSubmissionData = useMemo(() => {
    const payloadItems = [];
    Object.keys(mealEntries).forEach(mKey => {
      mealEntries[mKey].forEach(row => {
        if (row.item_id && parseFloat(row.quantity) > 0) {
          const item = itemMap.get(row.item_id);
          payloadItems.push({
            item_id: row.item_id,
            item_name: item?.name || 'Unknown Item',
            meal_type: mKey,
            quantity_consumed: parseFloat(row.quantity),
            unit_id: item?.unit_id,
            unit_name: item?.UOM?.abbreviation || uomMap.get(item?.unit_id)?.abbreviation || 'units',
            current_stock: item?.current_stock || 0
          });
        }
      });
    });
    return payloadItems;
  }, [mealEntries, itemMap, uomMap]);

  const validateStockBeforeSubmit = () => {
  const itemTotals = new Map();

  flattenedSubmissionData.forEach(item => {
    const itemId = item.item_id;

    if (!itemTotals.has(itemId)) {
      itemTotals.set(itemId, {
        item_name: item.item_name,
        unit_name: item.unit_name,
        current_stock: Number(item.current_stock),
        total_quantity: 0
      });
    }

    itemTotals.get(itemId).total_quantity += Number(item.quantity_consumed);
  });

  for (const [, item] of itemTotals) {
    if (item.total_quantity > item.current_stock) {
      message.error(
        `${item.item_name}: Requested ${item.total_quantity} ${item.unit_name}, but only ${item.current_stock} ${item.unit_name} is available.`
      );
      return false;
    }
  }

  return true;
};

  // Handle final submission to backend
  const handleFinalSubmit = async () => {

    if (flattenedSubmissionData.length === 0) {
      return message.warning(
        'Please select at least one item and enter a quantity.'
      );
    }

    
if (!validateStockBeforeSubmit()) {
  return;
}

    // const insufficientItem = flattenedSubmissionData.find(
    //   item => item.quantity_consumed > item.current_stock
    // );

    // if (insufficientItem) {
    //   return message.error(
    //     `${insufficientItem.item_name}: Requested ${insufficientItem.quantity_consumed} ${insufficientItem.unit_name}, but only ${insufficientItem.current_stock} ${insufficientItem.unit_name} is available.`
    //   );
    // }

    

    setSubmitting(true);
    try {
      const dateStr = consumptionDate ? consumptionDate.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
      
      const response = await messAPI.recordSinglePageDailyConsumption({
        consumption_date: dateStr,
        items: flattenedSubmissionData.map(d => ({
          item_id: d.item_id,
          quantity_consumed: d.quantity_consumed,
          unit: d.unit_id,
          meal_type: d.meal_type,
          consumption_date: dateStr
        }))
      });

      const resData = response.data?.data || {};

      message.success('Single-page daily meal stock consumption recorded!');
      
      // Set result data for summary popup
      setResultModalData({
        date: dateStr,
        totalCost: resData.totalCost || 0,
        itemCount: resData.itemCount || flattenedSubmissionData.length,
        lowStockItems: resData.lowStockItems || [],
      });

      setConfirmModalVisible(false);

      // Reset form entries to clean state
      setMealEntries({
        breakfast: [{ id: Date.now() + 1, item_id: null, quantity: '' }],
        lunch: [{ id: Date.now() + 2, item_id: null, quantity: '' }],
        snacks: [{ id: Date.now() + 3, item_id: null, quantity: '' }],
        dinner: [{ id: Date.now() + 4, item_id: null, quantity: '' }],
      });

      // Refetch latest stock levels
      fetchData();
    } catch (err) {
      console.error('Submission error:', err);
      message.error(err.response?.data?.message || 'Failed to record single-page daily consumption.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: T.bg, minHeight: '80vh', borderRadius: T.radius }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16, color: T.inkMid, fontWeight: 600 }}>Loading Mess Raw Material Inventory Stock...</Paragraph>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563EB',
          borderRadius: 8,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        },
      }}
    >
      <div style={{ background: T.bg, minHeight: '100vh', padding: '24px 32px' }}>
        
        {/* ─── Header Section ─── */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
          padding: '24px 28px', marginBottom: 24, boxShadow: T.shadow,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ background: T.accentBg, padding: 8, borderRadius: 8, color: T.accent }}>
                <Zap size={22} />
              </div>
              <Title level={3} style={{ margin: 0, color: T.ink, fontWeight: 800 }}>
                Single-Page Daily Meal Stock Entry
              </Title>
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 700, padding: '2px 10px' }}>
                Instant Stock Reduction
              </Tag>
            </div>
            <Text style={{ color: T.inkSoft, fontSize: 13, fontWeight: 500 }}>
              Enter all raw ingredient consumptions for Breakfast, Lunch, Snacks & Dinner on one single screen.
            </Text>
          </div>

          {/* Date Selector & Action */}
          <Space size="middle" wrap>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg, padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}` }}>
              <Calendar size={16} color={T.inkMid} />
              <Text style={{ fontSize: 12, fontWeight: 600, color: T.inkMid }}>Consumption Date:</Text>
              <DatePicker
                value={consumptionDate}
                onChange={(date) => setConsumptionDate(date || moment())}
                format="YYYY-MM-DD"
                allowClear={false}
                style={{ border: 'none', background: 'transparent', fontWeight: 700 }}
              />
            </div>

            <Button
              type="default"
              icon={<RefreshCw size={14} />}
              onClick={fetchData}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Refresh Stock
            </Button>

            <Button
              type="primary"
              size="large"
              icon={<CheckCircle2 size={18} />}
              disabled={summaryStats.validRowsCount === 0}
              onClick={() => setConfirmModalVisible(true)}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                padding: '0 24px',
                background: summaryStats.validRowsCount > 0 ? '#2563EB' : undefined,
                boxShadow: summaryStats.validRowsCount > 0 ? '0 4px 12px rgba(37, 99, 235, 0.25)' : undefined
              }}
            >
              Submit & Reduce Stock ({summaryStats.validRowsCount} items)
            </Button>
          </Space>
        </div>

        {/* ─── Metric Stat Cards ─── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: '#EFF6FF', padding: 12, borderRadius: 10, color: '#2563EB' }}>
                  <Layers size={22} />
                </div>
                <div>
                  <Text style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>READY TO DEDUCT</Text>
                  <Title level={4} style={{ margin: 0, color: T.ink, fontWeight: 800 }}>{summaryStats.validRowsCount} Items</Title>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: '#ECFDF5', padding: 12, borderRadius: 10, color: '#10B981' }}>
                  <Package size={22} />
                </div>
                <div>
                  <Text style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>AVAILABLE INVENTORY</Text>
                  <Title level={4} style={{ margin: 0, color: T.ink, fontWeight: 800 }}>{summaryStats.availableItemsCount} Materials</Title>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 10, color: '#D97706' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <Text style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>MEAL DISTRIBUTION</Text>
                  <Text style={{ fontSize: 13, fontWeight: 700, color: T.ink, display: 'block' }}>
                    B:{summaryStats.mealItemCounts.breakfast} | L:{summaryStats.mealItemCounts.lunch} | S:{summaryStats.mealItemCounts.snacks} | D:{summaryStats.mealItemCounts.dinner}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: T.radius, border: summaryStats.lowStockCount > 0 ? `1px solid #FCA5A5` : `1px solid ${T.border}`, boxShadow: T.shadow, background: summaryStats.lowStockCount > 0 ? '#FEF2F2' : T.surface }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: summaryStats.lowStockCount > 0 ? '#FEE2E2' : '#F1F5F9', padding: 12, borderRadius: 10, color: summaryStats.lowStockCount > 0 ? '#EF4444' : T.inkSoft }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <Text style={{ fontSize: 12, color: summaryStats.lowStockCount > 0 ? '#B91C1C' : T.inkSoft, fontWeight: 600 }}>LOW STOCK ALERTS</Text>
                  <Title level={4} style={{ margin: 0, color: summaryStats.lowStockCount > 0 ? '#991B1B' : T.ink, fontWeight: 800 }}>{summaryStats.lowStockCount} Items Low</Title>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ─── 4 Meals Grid Section ─── */}
        <Row gutter={[20, 20]}>
          {MEAL_TYPES.map(meal => {
            const MealIcon = meal.icon;
            const rows = mealEntries[meal.key];

            return (
              <Col xs={24} lg={12} key={meal.key}>
                <div style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  boxShadow: T.shadow,
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Meal Section Header */}
                  <div style={{
                    padding: '16px 20px',
                    background: meal.bg,
                    borderBottom: `1px solid ${meal.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: '#FFFFFF', padding: 6, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <MealIcon size={18} color={meal.color} />
                      </div>
                      <Text style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>
                        {meal.label}
                      </Text>
                      <Tag color={meal.color} style={{ borderRadius: 6, fontWeight: 700, margin: 0 }}>
                        {summaryStats.mealItemCounts[meal.key]} Logged
                      </Tag>
                    </div>

                    <Button
                      type="link"
                      icon={<Plus size={14} />}
                      onClick={() => addRow(meal.key)}
                      style={{ fontWeight: 700, color: meal.color, padding: 0 }}
                    >
                      Add Row
                    </Button>
                  </div>

                  {/* Meal Item Rows Container */}
                  <div style={{ padding: '16px 20px', flex: 1 }}>
                    {rows.map((row, index) => {
                      const selectedItem = itemMap.get(row.item_id);
                      const unitName = selectedItem?.UOM?.abbreviation || uomMap.get(selectedItem?.unit_id)?.abbreviation || 'units';
                      const currentStock = selectedItem?.current_stock || 0;
                      const isLow = selectedItem && currentStock <= selectedItem.minimum_stock;
                      const isInsufficient = selectedItem && parseFloat(row.quantity || 0) > currentStock;

                      return (
                        <div key={row.id} style={{
                          background: isInsufficient ? '#FEF2F2' : T.bg,
                          border: `1px solid ${isInsufficient ? '#FCA5A5' : T.border}`,
                          borderRadius: 8,
                          padding: '12px 14px',
                          marginBottom: 12,
                          transition: 'all 0.15s ease'
                        }}>
                          <Row gutter={[10, 10]} align="middle">
                            {/* Item Selector */}
                            <Col xs={24} sm={13}>
                              <Text style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, display: 'block', marginBottom: 4 }}>
                                SELECT INVENTORY MATERIAL #{index + 1}
                              </Text>
                              <Select
                                showSearch
                                placeholder="Search & select raw item..."
                                value={row.item_id}
                                onChange={(val) => updateRowField(meal.key, row.id, 'item_id', val)}
                                style={{ width: '100%' }}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                              >
                                {items.map(item => (
                                  <Option
                                    key={item.id}
                                    value={item.id}
                                    label={item.name}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                                      <Tag style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>
                                        Stock: {item.current_stock} {item.UOM?.abbreviation || 'units'}
                                      </Tag>
                                    </div>
                                  </Option>
                                ))}
                              </Select>
                            </Col>

                            {/* Quantity Input */}
                            <Col xs={16} sm={8}>
                              <Text style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, display: 'block', marginBottom: 4 }}>
                                QUANTITY USED ({unitName})
                              </Text>
                              <InputNumber
                                min={0.01}
                                step={0.5}
                                placeholder="Qty"
                                value={row.quantity}
                                onChange={(val) => updateRowField(meal.key, row.id, 'quantity', val)}
                                style={{ width: '100%', borderRadius: 6 }}
                              />
                            </Col>

                            {/* Delete Row Button */}
                            <Col xs={8} sm={3} style={{ textAlign: 'right' }}>
                              <Button
                                type="text"
                                danger
                                icon={<Trash2 size={16} />}
                                onClick={() => removeRow(meal.key, row.id)}
                                title="Remove row"
                              />
                            </Col>
                          </Row>

                          {/* Live Stock Status Indicator */}
                          {selectedItem && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1px dashed ${T.border}` }}>
                              <Text style={{ fontSize: 11, color: isInsufficient ? '#DC2626' : isLow ? '#D97706' : T.inkMid, fontWeight: 600 }}>
                                Available Stock: <strong>{currentStock} {unitName}</strong>
                                {isInsufficient && ' (⚠️ Exceeds Available Stock!)'}
                                {!isInsufficient && isLow && ' (⚠️ Low Stock Threshold)'}
                              </Text>

                              <Tag color={isInsufficient ? 'red' : isLow ? 'warning' : 'green'} style={{ borderRadius: 4, fontSize: 10 }}>
                                {unitName}
                              </Tag>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <Button
                      type="dashed"
                      block
                      icon={<Plus size={14} />}
                      onClick={() => addRow(meal.key)}
                      style={{ borderRadius: 8, fontWeight: 600, color: meal.color, borderColor: meal.border }}
                    >
                      + Add Item to {meal.label}
                    </Button>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>

        {/* ─── Bottom Submission Footer ─── */}
        <div style={{
          marginTop: 28,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: '20px 28px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          boxShadow: T.shadow
        }}>
          <div>
            <Title level={5} style={{ margin: 0, color: T.ink, fontWeight: 700 }}>
              Ready to execute daily stock deduction?
            </Title>
            <Text style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500 }}>
              Submitting will automatically run FIFO batch depletion across all 4 meal types and update inventory logs.
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<CheckCircle2 size={18} />}
            disabled={summaryStats.validRowsCount === 0}
            onClick={() => setConfirmModalVisible(true)}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              padding: '0 32px',
              background: '#2563EB'
            }}
          >
            Submit All Meals ({summaryStats.validRowsCount} items)
          </Button>
        </div>

        {/* ─── Confirmation Modal ─── */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldAlert color="#2563EB" size={22} />
              <span style={{ fontWeight: 800, fontSize: 18 }}>Confirm Daily Stock Consumption</span>
            </div>
          }
          open={confirmModalVisible}
          onCancel={() => setConfirmModalVisible(false)}
          onOk={handleFinalSubmit}
          confirmLoading={submitting}
          okText="Confirm & Deduct Stock Now"
          cancelText="Review Entries"
          width={640}
        >
          <Paragraph style={{ color: T.inkMid, fontSize: 13 }}>
            You are submitting the following daily raw material consumption for <strong>{consumptionDate.format('MMMM DD, YYYY')}</strong>:
          </Paragraph>

          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
            {flattenedSubmissionData.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: i % 2 === 0 ? T.bg : T.surface, borderRadius: 6, marginBottom: 4 }}>
                <div>
                  <Tag color={MEAL_TYPES.find(m => m.key === d.meal_type)?.color} style={{ borderRadius: 4, textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>
                    {d.meal_type}
                  </Tag>
                  <span style={{ fontWeight: 700, color: T.ink }}>{d.item_name}</span>
                </div>
                <span style={{ fontWeight: 800, color: '#2563EB' }}>
                  {d.quantity_consumed} {d.unit_name}
                </span>
              </div>
            ))}
          </div>

          <Alert
            type="info"
            showIcon
            message="Automatic FIFO Stock Reduction"
            description="The system will deduct these quantities from active purchase batches in FIFO order and update your live stock balances."
          />
        </Modal>

        {/* ─── Success & Result Summary Modal ─── */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 color="#10B981" size={24} />
              <span style={{ fontWeight: 800, fontSize: 18, color: '#065F46' }}>Consumption Successfully Recorded!</span>
            </div>
          }
          open={!!resultModalData}
          onOk={() => setResultModalData(null)}
          cancelButtonProps={{ style: { display: 'none' } }}
          okText="Done"
          width={560}
        >
          {resultModalData && (
            <div>
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: 16, marginBottom: 20, textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#065F46', fontWeight: 600 }}>TOTAL CONSUMPTION COST CALCULATED</Text>
                <Title level={2} style={{ margin: '4px 0 0 0', color: '#047857', fontWeight: 800 }}>
                  ₹{parseFloat(resultModalData.totalCost || 0).toFixed(2)}
                </Title>
                <Text style={{ fontSize: 12, color: '#047857' }}>
                  {resultModalData.itemCount} item(s) deducted for {resultModalData.date}
                </Text>
              </div>

              {resultModalData.lowStockItems && resultModalData.lowStockItems.length > 0 && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991B1B', fontWeight: 700, marginBottom: 8 }}>
                    <AlertTriangle size={18} />
                    <span>Low Stock Warning for Reordering:</span>
                  </div>
                  {resultModalData.lowStockItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#B91C1C', padding: '4px 0' }}>
                      <span>• {item.name}</span>
                      <strong>Remaining: {item.current_stock} {item.unit}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default SinglePageDailyConsumption;
