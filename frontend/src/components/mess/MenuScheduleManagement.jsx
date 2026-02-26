import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Space, Tag, DatePicker, Select,
  message, Popconfirm, Modal, List, Typography, Row, Col, Alert,
  ConfigProvider, theme, Skeleton, Divider, Empty
} from 'antd';
import dayjs from 'dayjs';
import { 
  Search, Eye, CheckCircle2, Calendar, 
  Filter, Utensils, AlertTriangle, Plus, X, ClipboardList, 
  Clock, DollarSign, LayoutGrid, CheckCircle
} from 'lucide-react';
import { messAPI } from '../../services/api';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

/* ─── Design Tokens ─────────────────────────────────────────────── */
const T = {
  bg:        '#F7F8FA',
  surface:   '#FFFFFF',
  border:    '#E8EAED',
  borderHov: '#C8CDD5',
  ink:       '#141820',
  inkMid:    '#4B5263',
  inkSoft:   '#8B92A5',
  accent:    '#1A56DB',
  accentBg:  '#EBF2FF',
  danger:    '#DC2626',
  dangerBg:  '#FEF2F2',
  success:   '#16A34A',
  successBg: '#F0FDF4',
  radius:    '12px',
  shadow:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
};

const mealConfig = {
  breakfast: { label: 'Breakfast', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  lunch:     { label: 'Lunch',     color: '#166534', bg: '#F0FDF4', dot: '#22C55E' },
  dinner:    { label: 'Dinner',    color: '#4338CA', bg: '#EEF2FF', dot: '#818CF8' },
  snacks:    { label: 'Snacks',    color: '#9A3412', bg: '#FFF7ED', dot: '#F97316' },
};

/* ─── Sub-components ─────────────────────────────────────────────── */
const MealBadge = ({ type }) => {
  const cfg = mealConfig[type] || { label: type, color: T.inkMid, bg: T.bg, dot: T.borderHov };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label.toUpperCase()}
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon, accent, variant }) => {
  const isDanger = variant === "danger";
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16, boxShadow: T.shadow,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: isDanger ? T.dangerBg : (accent ? T.accentBg : T.bg),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={isDanger ? T.danger : (accent ? T.accent : T.inkSoft)} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, fontWeight: 600 }}>{label.toUpperCase()}</div>
      </div>
    </div>
  );
};

const ActionBtn = ({ icon, children, onClick, variant }) => {
  const styles = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent', hover: '#1447BD' },
    success: { bg: T.successBg, color: T.success, border: 'transparent', hover: '#DCFCE7' },
    danger:  { bg: T.dangerBg, color: T.danger, border: 'transparent', hover: '#FEE2E2' },
    default: { bg: T.surface, color: T.inkMid, border: T.border, hover: T.bg },
  };
  const s = styles[variant] || styles.default;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: children ? '6px 12px' : '7px',
        borderRadius: 8, border: `1px solid ${s.border}`,
        background: s.bg, color: s.color,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = s.hover}
      onMouseLeave={e => e.currentTarget.style.background = s.bg}
    >
      {icon}{children}
    </button>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const MenuScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([dayjs(), dayjs().add(7, 'day')]);
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [lowStockAlert, setLowStockAlert] = useState(null);

  // Define fetch logic
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      if (selectedMealType !== 'all') params.meal_time = selectedMealType;
      
      const response = await messAPI.getMenuSchedule(params);
      setSchedules(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedMealType]);

  // Handle automatic refetching when filters change
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handle Font Injection
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleMarkAsServed = async (id) => {
    try {
      const response = await messAPI.serveMenu(id);
      message.success('Menu served. Stock adjusted via FIFO.');
      if (response.data.data?.lowStockItems?.length > 0) {
        setLowStockAlert({
          items: response.data.data.lowStockItems,
          message: 'Threshold Alerts: Stock levels dropped for some items.'
        });
      }
      fetchSchedules();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to serve menu');
    }
  };

  const stats = useMemo(() => {
    const upcoming = schedules.filter(s => s.status === 'scheduled').length;
    const served = schedules.filter(s => s.status === 'served').length;
    return { upcoming, served };
  }, [schedules]);

  const columns = [
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>DATE</span>,
      dataIndex: 'scheduled_date',
      key: 'date',
      render: (date) => <span style={{ fontWeight: 600, color: T.ink }}>{dayjs(date).format('DD MMM YYYY')}</span>,
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>MEAL TIME</span>,
      dataIndex: 'meal_time',
      key: 'meal_time',
      render: (type) => <MealBadge type={type} />,
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>MENU TEMPLATE</span>,
      key: 'menu',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: T.ink }}>{record.Menu?.name || 'N/A'}</div>
          <div style={{ fontSize: 11, color: T.inkSoft }}>{record.Menu?.tbl_Menu_Items?.length || 0} Components</div>
        </div>
      ),
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>STATUS</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const isServed = status === 'served';
        return (
          <Tag color={isServed ? 'success' : 'processing'} style={{ borderRadius: 20, fontWeight: 600 }}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: <span style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft }}>EST. COSTING</span>,
      key: 'cost',
      align: 'right',
      render: (_, record) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: T.accent }}>₹{parseFloat(record.total_cost || 0).toFixed(0)}</div>
          <div style={{ fontSize: 10, color: T.inkSoft }}>₹{parseFloat(record.cost_per_serving || 0).toFixed(2)} / plate</div>
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <ActionBtn icon={<Eye size={13}/>} onClick={() => { setSelectedSchedule(record); setDetailsModalVisible(true); }} />
          {record.status === 'scheduled' && (
            <Popconfirm title="Mark as served?" onConfirm={() => handleMarkAsServed(record.id)}>
              <ActionBtn icon={<CheckCircle2 size={13}/>} variant="success">Serve</ActionBtn>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: T.accent, borderRadius: 8, fontFamily: "'DM Sans', sans-serif" } }}>
      <style>{`
        .pm-table .ant-table-thead > tr > th { background: #F7F8FA !important; border-bottom: 1px solid ${T.border} !important; padding: 12px 16px !important; }
        .pm-table .ant-table-tbody > tr > td { padding: 14px 16px !important; border-bottom: 1px solid ${T.border} !important; }
        .pm-modal .ant-modal-content { border-radius: 14px; overflow: hidden; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
        
        {/* Header */}
        <div style={{
          background: T.surface, borderBottom: `1px solid ${T.border}`,
          padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={20} color={T.accent} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>Schedule Logs</div>
              <div style={{ fontSize: 12, color: T.inkSoft }}>Track meal history and final inventory consumption</div>
            </div>
          </div>
          <button
            onClick={() => window.location.href='/mess/menu-planner'}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff',
              border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', boxShadow: `0 2px 8px rgba(26,86,219,0.3)`
            }}
          >
            <Plus size={16} /> Plan New Menu
          </button>
        </div>

        <div style={{ padding: '28px 32px' }}>
          
          {/* Low Stock Banner */}
          {lowStockAlert && (
            <Alert
              style={{ marginBottom: 24, borderRadius: 12, border: 'none', boxShadow: T.shadow }}
              message={<Text strong style={{ color: '#92400E' }}>{lowStockAlert.message}</Text>}
              description={
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {lowStockAlert.items.map(item => (
                    <Tag key={item.name} color="warning" style={{ borderRadius: 6 }}>
                      {item.name}: <b>{parseFloat(item.current_stock).toFixed(1)}</b> left
                    </Tag>
                  ))}
                </div>
              }
              type="warning"
              showIcon
              closable
              onClose={() => setLowStockAlert(null)}
            />
          )}

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Scheduled Meals" value={stats.upcoming} icon={Calendar} accent />
            <StatCard label="Served (Period)" value={stats.served} icon={CheckCircle} />
            <StatCard label="Alerts" value={lowStockAlert ? lowStockAlert.items.length : 0} icon={AlertTriangle} variant={lowStockAlert ? "danger" : "default"} />
            <StatCard label="Active Plan" value="Weekly" icon={LayoutGrid} />
          </div>

          {/* Filters Bar */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, boxShadow: T.shadow
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <RangePicker 
                value={dateRange} 
                onChange={(dates) => setDateRange(dates)} 
                style={{ borderRadius: 8 }}
              />
              <Divider type="vertical" style={{ height: 24 }} />
              
              {/* MEAL TYPE FILTER BUTTONS */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'breakfast', 'lunch', 'dinner', 'snacks'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedMealType(type)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: `1px solid`,
                      borderColor: selectedMealType === type ? T.accent : T.border,
                      background: selectedMealType === type ? T.accentBg : 'transparent',
                      color: selectedMealType === type ? T.accent : T.inkMid,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.1s'
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={fetchSchedules}
              style={{
                background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '6px 16px', fontSize: 12, fontWeight: 700, color: T.inkMid, cursor: 'pointer'
              }}
            >
              <Search size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Sync Logs
            </button>
          </div>

          {/* Table */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', boxShadow: T.shadow }}>
            <Table
              className="pm-table"
              columns={columns}
              dataSource={schedules}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 8, size: 'small' }}
            />
          </div>
        </div>

        {/* Detail Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={16} color={T.accent} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Meal Finalization</span>
            </div>
          }
          open={detailsModalVisible}
          onCancel={() => setDetailsModalVisible(false)}
          footer={null}
          width={600}
        >
          {selectedSchedule && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: T.bg, padding: 16, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, marginBottom: 4 }}>SCHEDULE INFO</div>
                  <div style={{ fontWeight: 700, color: T.ink }}>{dayjs(selectedSchedule.scheduled_date).format('DD MMM YYYY')}</div>
                  <div style={{ marginTop: 4 }}><MealBadge type={selectedSchedule.meal_time} /></div>
                </div>
                <div style={{ background: T.bg, padding: 16, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, marginBottom: 4 }}>FINANCIAL IMPACT</div>
                  <div style={{ fontWeight: 700, color: T.ink }}>Total: ₹{parseFloat(selectedSchedule.total_cost || 0).toFixed(0)}</div>
                  <div style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>₹{parseFloat(selectedSchedule.cost_per_serving || 0).toFixed(2)} per plate</div>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: T.inkSoft, marginBottom: 12, letterSpacing: '0.05em' }}>RECIPE COMPONENTS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {selectedSchedule.Menu?.tbl_Menu_Items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <span style={{ fontWeight: 600, color: T.ink }}>{item.tbl_Item?.name}</span>
                    <span style={{ fontFamily: 'DM Mono', color: T.accent, fontWeight: 600 }}>{parseFloat(item.quantity).toFixed(2)} {item.unit}</span>
                  </div>
                ))}
              </div>

              {selectedSchedule.status === 'scheduled' && (
                <div style={{ padding: 20, background: T.successBg, borderRadius: 12, border: `1px solid #DCFCE7`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ maxWidth: '65%' }}>
                    <div style={{ fontWeight: 700, color: T.success }}>Deduct Stock & Close?</div>
                    <div style={{ fontSize: 12, color: '#166534' }}>This will trigger FIFO inventory reduction for {selectedSchedule.estimated_servings} servings.</div>
                  </div>
                  <button
                    onClick={() => { handleMarkAsServed(selectedSchedule.id); setDetailsModalVisible(false); }}
                    style={{
                      background: T.success, color: '#fff', border: 'none', borderRadius: 8,
                      padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22,163,74,0.2)'
                    }}
                  >Confirm Service</button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MenuScheduleManagement;