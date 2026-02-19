import React, { useState, useEffect } from 'react';
import {
  Card, Form, Button, Select, InputNumber, message, DatePicker,
  Row, Col, Typography, Input, ConfigProvider, theme
} from 'antd';
import { Plus, Trash2, Save, Utensils, User, Calendar, ClipboardList, CreditCard, Info, ChevronDown } from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

/* ─── Skeleton ─── */
const FormSkeleton = () => (
  <div className="ssm-shell">
    <div className="ssm-skeleton-pulse" style={{ height: 56, borderRadius: 16, marginBottom: 32 }} />
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 2 }}>
        {[80, 80, 120, 60].map((h, i) => (
          <div key={i} className="ssm-skeleton-pulse" style={{ height: h, borderRadius: 12, marginBottom: 16 }} />
        ))}
      </div>
      <div style={{ flex: 3 }}>
        {[80, 80, 80].map((h, i) => (
          <div key={i} className="ssm-skeleton-pulse" style={{ height: h, borderRadius: 12, marginBottom: 16 }} />
        ))}
      </div>
    </div>
  </div>
);

/* ─── Animated total ticker ─── */
const TotalAmount = ({ items, foodMap }) => {
  const total = (items || []).reduce((acc, item) => {
    if (!item?.food_item_id || !item?.quantity) return acc;
    const price = parseFloat(foodMap[item.food_item_id] || 0);
    return acc + price * item.quantity;
  }, 0);

  return (
    <div className="ssm-total-banner">
      <div>
        <span className="ssm-total-label">Total Billing Amount</span>
        <span className="ssm-total-note">Will be debited automatically</span>
      </div>
      <span className="ssm-total-value">₹{total.toFixed(2)}</span>
    </div>
  );
};

/* ─── Main Component ─── */
const RecordStudentSpecialMeal = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [specialFoodItems, setSpecialFoodItems] = useState([]);
  const [watchItems, setWatchItems] = useState([{ quantity: 1 }]);

  const foodMap = Object.fromEntries(specialFoodItems.map(i => [i.id, i.price]));

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [studentsRes, foodRes] = await Promise.all([
        messAPI.getStudents(),
        messAPI.getSpecialFoodItems()
      ]);
      setStudents(studentsRes.data.data || []);
      setSpecialFoodItems(foodRes.data.data || []);
    } catch {
      message.error('Failed to load required data');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleValuesChange = (_, all) => setWatchItems(all.foodItems || []);

  const handleSubmit = async (values) => {
    const items = (values.foodItems || [])
      .filter(i => i?.food_item_id && i?.quantity > 0)
      .map(i => ({
        food_item_id: i.food_item_id,
        quantity: i.quantity,
        unit_price: parseFloat(foodMap[i.food_item_id] || 0),
      }));

    if (!items.length) return message.warning('Add at least one valid dish.');
    setSubmitting(true);
    try {
      await messAPI.recordStaffRecordedSpecialFoodConsumption({
        student_id: values.student_id,
        consumption_date: values.consumption_date.format('YYYY-MM-DD'),
        items,
        description: values.description,
      });
      message.success('Special meal recorded & billed!');
      form.resetFields();
      setWatchItems([{ quantity: 1 }]);
      onSuccess?.();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to record meal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <><style>{CSS}</style><FormSkeleton /></>;

  return (
    <>
      <style>{CSS}</style>
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1a56db', borderRadius: 12, fontFamily: 'DM Sans, sans-serif' } }}>
        <div className="ssm-shell">
          <Form
            form={form}
            onFinish={handleSubmit}
            onValuesChange={handleValuesChange}
            layout="vertical"
            initialValues={{ consumption_date: moment(), foodItems: [{ quantity: 1 }] }}
          >
            {/* ── Top Bar ── */}
            <div className="ssm-topbar">
              <div className="ssm-topbar-left">
                <div className="ssm-icon-badge">
                  <Utensils size={20} />
                </div>
                <div>
                  <h1 className="ssm-heading">Special Meal Entry</h1>
                  <p className="ssm-subheading">Record off-menu orders · Automate billing</p>
                </div>
              </div>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                icon={<Save size={16} />}
                className="ssm-save-btn"
              >
                Confirm & Save
              </Button>
            </div>

            <Row gutter={[28, 28]}>
              {/* ── LEFT: Info ── */}
              <Col lg={9} xs={24}>
                <div className="ssm-panel ssm-sticky">
                  <div className="ssm-panel-header">
                    <ClipboardList size={16} className="ssm-panel-icon" />
                    <span>Basic Information</span>
                  </div>

                  <Form.Item name="student_id" label="Student Beneficiary" rules={[{ required: true, message: 'Select a student' }]}>
                    <Select
                      placeholder="Search by name…"
                      showSearch
                      optionFilterProp="children"
                      className="ssm-select"
                      suffixIcon={<User size={14} />}
                    >
                      {students.map(s => <Option key={s.id} value={s.id}>{s.username}</Option>)}
                    </Select>
                  </Form.Item>

                  <Form.Item name="consumption_date" label="Date of Consumption" rules={[{ required: true }]}>
                    <DatePicker className="w-full ssm-datepicker" suffixIcon={<Calendar size={14} />} />
                  </Form.Item>

                  <Form.Item name="description" label="Notes / Reason (optional)">
                    <Input.TextArea
                      rows={3}
                      placeholder="e.g., Birthday celebration, dietary request…"
                      className="ssm-textarea"
                    />
                  </Form.Item>

                  <div className="ssm-info-card">
                    <Info size={15} className="ssm-info-icon" />
                    <p>Amounts are automatically debited from the student's mess account on submission.</p>
                  </div>
                </div>
              </Col>

              {/* ── RIGHT: Items ── */}
              <Col lg={15} xs={24}>
                <div className="ssm-panel">
                  <div className="ssm-panel-header">
                    <CreditCard size={16} className="ssm-panel-icon" />
                    <span>Itemized Billing</span>
                  </div>

                  <Form.List name="foodItems">
                    {(fields, { add, remove }) => (
                      <div>
                        {/* Column headers */}
                        <div className="ssm-row-header">
                          <span style={{ flex: 5 }}>Dish</span>
                          <span style={{ flex: 2 }}>Qty</span>
                          <span style={{ flex: 3, textAlign: 'right' }}>Subtotal</span>
                          <span style={{ width: 32 }} />
                        </div>

                        <div className="ssm-items-list">
                          {fields.map(({ key, name, ...rest }, idx) => {
                            const itemId = form.getFieldValue(['foodItems', name, 'food_item_id']);
                            const qty = form.getFieldValue(['foodItems', name, 'quantity']) || 0;
                            const price = parseFloat(foodMap[itemId] || 0);
                            const sub = price * qty;

                            return (
                              <div key={key} className="ssm-item-row">
                                <div className="ssm-item-number">{idx + 1}</div>

                                <Form.Item
                                  {...rest}
                                  name={[name, 'food_item_id']}
                                  rules={[{ required: true, message: '' }]}
                                  style={{ flex: 5, margin: 0 }}
                                >
                                  <Select
                                    placeholder="Choose dish…"
                                    showSearch
                                    optionFilterProp="children"
                                    className="ssm-select"
                                    suffixIcon={<ChevronDown size={13} />}
                                  >
                                    {specialFoodItems.map(item => (
                                      <Option key={item.id} value={item.id}>
                                        <span>{item.name}</span>
                                        <span className="ssm-option-price"> ₹{parseFloat(item.price).toFixed(2)}</span>
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>

                                <Form.Item
                                  {...rest}
                                  name={[name, 'quantity']}
                                  rules={[{ required: true, message: '' }]}
                                  style={{ flex: 2, margin: 0 }}
                                >
                                  <InputNumber min={1} className="ssm-qty" />
                                </Form.Item>

                                <div className="ssm-subtotal">
                                  {itemId ? `₹${sub.toFixed(2)}` : '—'}
                                </div>

                                {fields.length > 1 && (
                                  <button type="button" className="ssm-delete-btn" onClick={() => remove(name)}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button type="button" className="ssm-add-btn" onClick={() => add({ quantity: 1 })}>
                          <Plus size={15} />
                          Add another dish
                        </button>

                        <TotalAmount items={watchItems} foodMap={foodMap} />
                      </div>
                    )}
                  </Form.List>
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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

.ssm-shell {
  font-family: 'DM Sans', sans-serif;
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 48px;
  background: #f5f6fa;
  min-height: 100vh;
}

/* Skeleton */
@keyframes ssm-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .45; }
}
.ssm-skeleton-pulse {
  background: linear-gradient(90deg, #e8eaf0 25%, #f0f2f7 50%, #e8eaf0 75%);
  background-size: 200% 100%;
  animation: ssm-pulse 1.6s ease-in-out infinite;
}

/* Top bar */
.ssm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
}
.ssm-topbar-left { display: flex; align-items: center; gap: 16px; }
.ssm-icon-badge {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1a56db 0%, #3b82f6 100%);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: 0 8px 20px rgba(26,86,219,.28);
  flex-shrink: 0;
}
.ssm-heading {
  font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.2;
}
.ssm-subheading {
  font-size: 13px; color: #64748b; margin: 3px 0 0;
}

/* Save button */
.ssm-save-btn.ant-btn {
  height: 44px !important;
  padding: 0 24px !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  background: linear-gradient(135deg, #1a56db 0%, #3b82f6 100%) !important;
  border: none !important;
  box-shadow: 0 6px 18px rgba(26,86,219,.30) !important;
  letter-spacing: .01em;
  transition: transform .15s, box-shadow .15s !important;
}
.ssm-save-btn.ant-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 10px 26px rgba(26,86,219,.38) !important;
}

/* Panel */
.ssm-panel {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid #edf0f7;
  box-shadow: 0 2px 12px rgba(15,23,42,.05);
}
.ssm-sticky { position: sticky; top: 24px; }
.ssm-panel-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: #1e293b;
  margin-bottom: 20px; padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}
.ssm-panel-icon { color: #1a56db; flex-shrink: 0; }

/* Ant overrides */
.ssm-shell .ant-form-item-label > label {
  font-size: 12px !important; font-weight: 600 !important;
  text-transform: uppercase; letter-spacing: .06em;
  color: #64748b !important;
}
.ssm-shell .ant-form-item { margin-bottom: 18px; }
.ssm-select, .ssm-datepicker {
  border-radius: 10px !important;
}
.ssm-shell .ant-select-selector {
  border-radius: 10px !important;
  border-color: #e2e8f0 !important;
  height: 42px !important;
  align-items: center;
}
.ssm-shell .ant-select-selector:hover,
.ssm-shell .ant-select-selector:focus,
.ssm-shell .ant-select-focused .ant-select-selector {
  border-color: #1a56db !important;
  box-shadow: 0 0 0 2px rgba(26,86,219,.10) !important;
}
.ssm-shell .ant-picker {
  border-radius: 10px !important;
  border-color: #e2e8f0 !important;
  height: 42px !important;
}
.ssm-shell .ant-picker:hover, .ssm-shell .ant-picker-focused {
  border-color: #1a56db !important;
  box-shadow: 0 0 0 2px rgba(26,86,219,.10) !important;
}
.ssm-textarea {
  border-radius: 10px !important;
  border-color: #e2e8f0 !important;
  font-size: 13px !important;
  resize: none !important;
}
.ssm-textarea:hover, .ssm-textarea:focus {
  border-color: #1a56db !important;
  box-shadow: 0 0 0 2px rgba(26,86,219,.10) !important;
}

/* Info card */
.ssm-info-card {
  display: flex; gap: 10px; align-items: flex-start;
  background: #eff6ff; border: 1px solid #bfdbfe;
  border-radius: 12px; padding: 12px 14px; margin-top: 6px;
}
.ssm-info-icon { color: #1a56db; flex-shrink: 0; margin-top: 2px; }
.ssm-info-card p {
  font-size: 12px; color: #1e40af; margin: 0; line-height: 1.6;
}

/* Row header */
.ssm-row-header {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 12px; margin-bottom: 8px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: #94a3b8;
}

/* Items */
.ssm-items-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }

.ssm-item-row {
  display: flex; align-items: center; gap: 10px;
  background: #f8fafc; border: 1px solid #e8edf4;
  border-radius: 12px; padding: 10px 12px;
  transition: border-color .2s, box-shadow .2s;
  position: relative;
}
.ssm-item-row:hover {
  border-color: #bfdbfe;
  box-shadow: 0 2px 10px rgba(26,86,219,.07);
}
.ssm-item-number {
  width: 22px; height: 22px; border-radius: 50%;
  background: #e0e7ff; color: #3730a3;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ssm-option-price { font-size: 11px; color: #94a3b8; margin-left: 4px; }

.ssm-qty.ant-input-number {
  border-radius: 8px !important; width: 100% !important;
  border-color: #e2e8f0 !important;
}
.ssm-qty.ant-input-number:hover, .ssm-qty.ant-input-number-focused {
  border-color: #1a56db !important;
  box-shadow: 0 0 0 2px rgba(26,86,219,.10) !important;
}
.ssm-qty .ant-input-number-input { height: 38px !important; font-size: 14px !important; font-weight: 600; }

.ssm-subtotal {
  flex: 3; text-align: right;
  font-size: 14px; font-weight: 700; color: #1a56db;
  font-family: 'DM Mono', monospace;
  white-space: nowrap;
}

.ssm-delete-btn {
  width: 32px; height: 32px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  border-radius: 8px; color: #cbd5e1;
  transition: background .15s, color .15s;
}
.ssm-delete-btn:hover { background: #fef2f2; color: #ef4444; }

/* Add button */
.ssm-add-btn {
  width: 100%; padding: 12px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 1.5px dashed #cbd5e1; border-radius: 12px;
  background: transparent; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #64748b;
  font-family: 'DM Sans', sans-serif;
  transition: all .2s;
  margin-bottom: 20px;
}
.ssm-add-btn:hover {
  border-color: #1a56db; color: #1a56db;
  background: #eff6ff;
}

/* Total banner */
.ssm-total-banner {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #1e3a8a 0%, #1a56db 60%, #3b82f6 100%);
  border-radius: 14px; padding: 16px 20px;
  box-shadow: 0 8px 24px rgba(26,86,219,.25);
  color: #fff;
}
.ssm-total-label {
  display: block; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .1em; opacity: .75;
  margin-bottom: 2px;
}
.ssm-total-note { font-size: 11px; opacity: .55; }
.ssm-total-value {
  font-size: 26px; font-weight: 700; letter-spacing: -.01em;
  font-family: 'DM Mono', monospace;
}
`;

export default RecordStudentSpecialMeal;