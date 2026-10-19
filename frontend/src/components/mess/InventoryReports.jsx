import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { inventoryAPI } from '../../services/api';
import { useInventoryWorkspace } from './InventoryWorkspace';
import ReportPreview from '../common/ReportPreview';
import { reportText } from '../../utils/reportView';
import './InventoryReports.css';

const kinds = [{ value: 'consumption', label: 'Ingredient consumption' }, { value: 'expenses', label: 'Additional expenses' },
  { value: 'rate', label: 'Daily rate calculation' }, { value: 'billing', label: 'Student mess bills' },
  { value: 'stock', label: 'Current inventory stock' }, { value: 'purchases', label: 'Inventory purchases' }];
const label = key => ({ totalManDays: 'Billable student days', dailyRate: 'Daily rate (₹)', foodExpenses: 'Net food expenses (₹)', grossExpenses: 'Gross expenses (₹)',
  deductions: 'Deductions (₹)', finalized: 'Finalized', waterIsSeparate: 'Water charged separately', billingMode: 'Billing mode' }[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2'));
const displayValue = value => typeof value === 'boolean' ? value ? 'Yes' : 'No' : value === 'shared' ? 'Shared inventory' : value === 'hostel' ? 'Hostel-wise attribution' : value;
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titles = { consumption: 'Consumption Report', expenses: 'Additional Expenses', rate: 'Daily Rate Calculation', billing: 'Student Mess Bills', stock: 'Inventory Stock', purchases: 'Purchase Report' };
const detailTitles = { consumption: 'Consumption details', expenses: 'Expense details', rate: 'Expense breakdown', billing: 'Student bills', stock: 'Stock details', purchases: 'Purchase details' };
const monetaryFields = new Set(['Amount', 'Cost', 'Rate', 'Value', 'WeightedRate', 'StockValue', 'DailyRate', 'MessAmount', 'Water', 'Additional', 'Bed', 'Newspaper', 'Total']);
export default function InventoryReports({ initialKind = 'consumption' }) {
  const inventory = useInventoryWorkspace();
  const [month, setMonth] = useState(dayjs());
  const [kind, setKind] = useState(initialKind);
  const [policy, setPolicy] = useState(null);
  const [hostel, setHostel] = useState();
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const request = useRef(0);
  useEffect(() => { setKind(initialKind); setReport(null); }, [initialKind]);
  useEffect(() => {
    let active = true;
    setPolicy(null); setReport(null); setHostel(undefined); setError('');
    if (inventory) inventoryAPI.policy(inventory.id, month.startOf('month').format('YYYY-MM-DD')).then(response => {
      if (active) { setPolicy({ ...response.data.data, period: month.format('YYYY-MM'), inventoryId: inventory.id }); setHostel(response.data.data.hostels[0]?.id); }
    }).catch(failure => active && setError(failure.response?.data?.message || 'Unable to load reporting scope.'));
    return () => { active = false; };
  }, [inventory?.id, month]);
  const physical = ['stock', 'purchases'].includes(kind);
  const dailyRate = kind === 'rate';
  const shared = policy?.mode === 'shared' || physical;
  useEffect(() => {
    const sequence = ++request.current;
    if (!policy || policy.period !== month.format('YYYY-MM') || policy.inventoryId !== inventory?.id || !shared && !hostel) { setReport(null); setBusy(false); return; }
    setBusy(true); setError('');
    inventoryAPI.report(inventory.id, { kind, month: month.month() + 1, year: month.year(), format: 'preview', ...(!shared ? { hostel_id: hostel } : {}) })
      .then(response => { if (sequence === request.current) setReport(response.data.data); })
      .catch(failure => { if (sequence === request.current) setError(failure.response?.data?.message || 'Unable to load this report.'); })
      .finally(() => { if (sequence === request.current) setBusy(false); });
    return () => { request.current += 1; };
  }, [inventory?.id, policy, shared, hostel, kind, month, refresh]);
  const reportMetadata = report ? [['Scope', report.scope.name], ['Level', report.scope.level], ['Billing mode', displayValue(report.scope.billing_mode)],
    ['Period', `${report.scope.month}/${report.scope.year}`], ['Hostels', report.scope.hostels.map(row => row.name).join(', ')],
    ...(report.scope.stockAsOf ? [['Stock basis', report.scope.stockAsOf]] : []),
    ...Object.entries(report.summary).map(([key, value]) => [`Scope summary: ${label(key)}`, displayValue(value)])] : [];
  const total = key => (report?.rows || []).reduce((sum, row) => sum + Number(row[key] || 0), 0);
  const unique = key => new Set((report?.rows || []).map(row => row[key]).filter(value => value != null && value !== '')).size;
  const metrics = report ? ({
    consumption: [['Total cost', money(total('Cost')), 'selected period'], ['Entries', report.rows.length, 'consumption records'], ['Items', unique('Item'), 'different ingredients']],
    expenses: [['Total expenses', money(total('Amount')), 'selected period'], ['Entries', report.rows.length, 'expense records'], ['Categories', unique('Category'), 'expense categories']],
    billing: [['Total billed', money(total('Total')), 'selected period'], ['Students', report.rows.length, 'student bills'], ['Student days', total('MessDays'), 'total billable days']],
    stock: [['Stock value', money(total('StockValue')), 'current inventory'], ['Items', report.rows.length, 'stock items'], ['Low stock', report.rows.filter(row => Number(row.Quantity) <= Number(row.Minimum)).length, 'at or below minimum']],
    purchases: [['Purchase value', money(total('Value')), 'selected period'], ['Entries', report.rows.length, 'purchase records'], ['Suppliers', unique('Supplier'), 'different suppliers']],
    rate: [['Daily rate', money(report.summary.dailyRate), 'per student / day'], ['Net food expenses', money(report.summary.foodExpenses), 'after deductions'], ['Student days', Number(report.summary.totalManDays || 0), 'total billable days']],
  }[kind] || []) : [];
  return <section className="module-page report-page">
    <Typography.Title level={2}>{titles[kind]}</Typography.Title>
    <Card style={{ marginBottom: 20 }}><Space wrap align="end">
      <div><label htmlFor="report-month">Billing month</label><br /><DatePicker id="report-month" picker="month" value={month} allowClear={false} disabled={busy} onChange={value => { setMonth(value); setReport(null); }} /></div>
      {initialKind !== 'rate' && <div><label htmlFor="report-kind">Report</label><br /><Select id="report-kind" style={{ minWidth: 240 }} value={kind} options={kinds} disabled={busy} onChange={value => { setKind(value); setReport(null); }} /></div>}
      {!shared && <div><label htmlFor="report-hostel">Hostel</label><br /><Select id="report-hostel" placeholder="Choose hostel" style={{ minWidth: 220 }} value={hostel} disabled={busy || !policy}
        options={(policy?.hostels || []).map(row => ({ value: row.id, label: row.name }))} onChange={value => { setHostel(value); setReport(null); }} /></div>}
      <Button type="primary" loading={busy} disabled={!policy || !shared && !hostel} onClick={() => setRefresh(value => value + 1)}>Refresh preview</Button>
    </Space></Card>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 20 }} />}
    {busy && <Alert type="info" title="Loading report preview..." style={{ marginBottom: 20 }} />}
    {report && <>
      <div className="report-overview">
        <div className="report-context"><Typography.Text>{report.scope.name} · {kind === 'stock' ? 'Current stock' : dayjs(`${report.scope.year}-${String(report.scope.month).padStart(2, '0')}-01`).format('MMMM YYYY')}</Typography.Text>
          {['rate', 'billing'].includes(kind) && <span className={`report-status${report.summary.finalized ? ' is-finalized' : ''}`}>{report.summary.finalized ? 'Finalized' : 'Provisional'}</span>}</div>
        <div className="report-metrics">
          {metrics.map(([name, value, description], index) => <div key={name} className={`report-metric${index === 0 ? ' report-primary' : ''}`}><span>{name}</span>
            <strong>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</strong><small>{description}</small></div>)}
        </div>
        {dailyRate && <div className="report-calculation"><Typography.Text>Gross expenses <strong>{money(report.summary.grossExpenses)}</strong></Typography.Text>
          <Typography.Text>Deductions <strong>{money(report.summary.deductions)}</strong></Typography.Text>
          {report.summary.waterIsSeparate && <Typography.Text type="secondary">Water is billed separately.</Typography.Text>}</div>}
      </div>
      <Card title={detailTitles[kind]}>
      {report.scope.stockAsOf && <Typography.Paragraph type="secondary">{report.scope.stockAsOf}</Typography.Paragraph>}
      <ReportPreview key={`${inventory.id}-${report.kind}-${report.scope.month}-${report.scope.year}-${report.scope.name}`} rows={report.rows} title={`${report.scope.name} — ${kinds.find(row => row.value === report.kind)?.label}`}
        metadata={reportMetadata} label={label} filename={`${report.kind}_${report.scope.level}_${report.scope.year}-${String(report.scope.month).padStart(2, '0')}.xlsx`} disabled={busy || Boolean(error)}
        compact searchPlaceholder="Search report" formatValue={(value, key) => monetaryFields.has(key) ? money(value) : reportText(value)} />
    </Card></>}
  </section>;
}
