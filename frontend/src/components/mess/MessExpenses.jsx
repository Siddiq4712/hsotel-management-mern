import { PermissionButton as Button, PermissionPopconfirm as Popconfirm } from '../common/PermissionControls';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Card, Col, Form, Input, InputNumber, List, Modal, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ChevronDown, CreditCard, Download, Edit3, LayoutGrid, Plus, Printer, RefreshCw, RotateCcw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import moment from 'moment';
import { DatePicker } from '../common/MomentPickers';
import { messAPI } from '../../services/api';
import { ScopeAnchor, useScopeForm, useWorkspaceScope } from '../common/WorkspaceScope';
import * as XLSX from 'xlsx';
import { exportWorkbook, printTables } from '../../utils/reportExport';
import { reportViewDescription } from '../../utils/reportView';
import '../common/ReportPreview.css';
import './MessExpenses.css';

const { Title, Text } = Typography;
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0);
const emptyFilters = () => ({ search: '', category: undefined, range: null, hostel: undefined, recordedBy: undefined, min: null, max: null });

export default function MessExpenses() {
  const [form] = Form.useForm();
  const [typeForm] = Form.useForm();
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState({ field: 'expense_date', order: 'descend' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const request = useRef(0);
  const formSection = useRef(null);
  const scope = useWorkspaceScope();
  useScopeForm(form, true, submitting || Boolean(deletingId));
  useScopeForm(typeForm, showTypeModal, typeSubmitting);

  const fetchData = useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true); setLoadError('');
    try {
      const [typesRes, expensesRes] = await Promise.all([messAPI.getExpenseTypes(), messAPI.getMessDailyExpenses()]);
      if (sequence !== request.current) return;
      setExpenseTypes(typesRes.data.data || []);
      setDailyExpenses(expensesRes.data.data || []);
    } catch (error) {
      if (sequence === request.current) setLoadError(error.response?.data?.message || 'Unable to load expenses. Please refresh and try again.');
    } finally { if (sequence === request.current) setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); return () => { request.current += 1; }; }, [fetchData]);

  const resetEntry = () => {
    form.resetFields(); form.setFieldsValue({ expense_date: moment() }); setEditingId(null);
  };
  const handleDailySubmit = async values => {
    setSubmitting(true);
    try {
      const payload = { ...values, expense_date: values.expense_date.format('YYYY-MM-DD') };
      if (editingId) await messAPI.updateMessDailyExpense(editingId, payload);
      else await messAPI.createMessDailyExpense(payload);
      message.success(editingId ? 'Expense updated successfully' : 'Expense added successfully');
      resetEntry(); await fetchData();
    } catch (error) { message.error(error.response?.data?.message || 'Unable to save this expense. Please try again.'); }
    finally { setSubmitting(false); }
  };
  const handleEditExpense = record => {
    setEditingId(record.id);
    form.setFieldsValue({ expense_type_id: record.expense_type_id, amount: Number(record.amount),
      expense_date: moment(record.expense_date), description: record.description || '' });
    formSection.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const deleteExpense = async record => {
    setDeletingId(record.id);
    try {
      await messAPI.deleteMessDailyExpense(record.id);
      if (editingId === record.id) resetEntry();
      message.success('Expense deleted'); await fetchData();
    } catch (error) { message.error(error.response?.data?.message || 'Unable to delete this expense.'); throw error; }
    finally { setDeletingId(null); }
  };
  const closeTypes = () => { setShowTypeModal(false); setEditingType(null); typeForm.resetFields(); };
  const handleTypeSubmit = async values => {
    setTypeSubmitting(true);
    try {
      if (editingType) await messAPI.updateExpenseType(editingType.id, values);
      else await messAPI.createExpenseType(values);
      message.success(editingType ? 'Category updated' : 'Category created');
      closeTypes(); await fetchData();
    } catch (error) { message.error(error.response?.data?.message || 'Unable to save category.'); }
    finally { setTypeSubmitting(false); }
  };
  const deleteType = async id => {
    try {
      await messAPI.deleteExpenseType(id);
      if (editingType?.id === id) { setEditingType(null); typeForm.resetFields(); }
      message.success('Category deleted'); await fetchData();
    } catch (error) { message.error(error.response?.data?.message || 'Unable to delete category.'); throw error; }
  };

  const hostelOptions = useMemo(() => [...new Map(dailyExpenses.filter(row => row.hostel_name)
    .map(row => [row.hostel_id, { value: row.hostel_id, label: row.hostel_name }])).values()], [dailyExpenses]);
  const recorderOptions = useMemo(() => [...new Set(dailyExpenses.map(row => row.RecordedBy?.userName || '(Unknown)'))].sort().map(value => ({ value, label: value })), [dailyExpenses]);
  const filteredExpenses = useMemo(() => dailyExpenses.filter(row => {
    const query = filters.search.trim().toLowerCase();
    const searchable = [row.description, row.ExpenseType?.name, row.hostel_name, row.RecordedBy?.userName,
      row.amount, moment(row.expense_date).format('DD MMM YYYY')].join(' ').toLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (filters.category !== undefined && String(row.expense_type_id) !== String(filters.category)) return false;
    if (filters.hostel !== undefined && String(row.hostel_id) !== String(filters.hostel)) return false;
    if (filters.recordedBy !== undefined && (row.RecordedBy?.userName || '(Unknown)') !== filters.recordedBy) return false;
    if (filters.min != null && Number(row.amount) < filters.min) return false;
    if (filters.max != null && Number(row.amount) > filters.max) return false;
    if (filters.range?.[0] && filters.range?.[1]) {
      const date = moment(row.expense_date).format('YYYY-MM-DD');
      if (date < filters.range[0].format('YYYY-MM-DD') || date > filters.range[1].format('YYYY-MM-DD')) return false;
    }
    return true;
  }), [dailyExpenses, filters]);
  const total = filteredExpenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const activeFilterCount = [filters.category, filters.hostel, filters.recordedBy, filters.min, filters.max, filters.range?.[0]].filter(value => value !== undefined && value !== null && value !== '').length;
  const updateFilter = (key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); };
  const clearFilters = () => { setFilters(emptyFilters()); setSort({ field: 'expense_date', order: 'descend' }); setPage(1); };
  const sorted = key => sort.field === key ? sort.order : null;
  const categoryOptions = expenseTypes.map(type => ({ value: type.id, label: type.name }));
  const columns = [
    { title: 'Date', key: 'expense_date', dataIndex: 'expense_date', width: 145,
      render: date => moment(date).format('DD MMM YYYY'), sorter: (a, b) => moment(a.expense_date).valueOf() - moment(b.expense_date).valueOf(), sortOrder: sorted('expense_date') },
    { title: 'Category', key: 'category', width: 160, render: (_, row) => <Tag color="blue">{row.ExpenseType?.name || 'General'}</Tag>,
      sorter: (a, b) => (a.ExpenseType?.name || '').localeCompare(b.ExpenseType?.name || ''), sortOrder: sorted('category') },
    ...(hostelOptions.length ? [{ title: 'Hostel', key: 'hostel', dataIndex: 'hostel_name', width: 170,
      sorter: (a, b) => (a.hostel_name || '').localeCompare(b.hostel_name || ''), sortOrder: sorted('hostel') }] : []),
    { title: 'Notes', key: 'description', dataIndex: 'description', render: text => <span className="expense-notes">{text || '—'}</span>,
      sorter: (a, b) => (a.description || '').localeCompare(b.description || ''), sortOrder: sorted('description') },
    { title: 'Amount', key: 'amount', dataIndex: 'amount', width: 150, align: 'right', render: value => <span className="expense-amount">{money(value)}</span>,
      sorter: (a, b) => Number(a.amount) - Number(b.amount), sortOrder: sorted('amount') },
    { title: 'Recorded by', key: 'recorded_by', width: 150, render: (_, row) => row.RecordedBy?.userName || '—',
      sorter: (a, b) => (a.RecordedBy?.userName || '').localeCompare(b.RecordedBy?.userName || ''), sortOrder: sorted('recorded_by') },
    { title: 'Actions', key: 'actions', width: 110, align: 'right', render: (_, row) => <Space size={4}>
      <Button permissionAction="edit" type="text" aria-label={`Edit expense ${row.id}`} title="Edit expense" icon={<Edit3 size={16} />}
        disabled={submitting || Boolean(deletingId)} onClick={() => handleEditExpense(row)} />
      <Popconfirm permissionAction="delete" title="Delete this expense?" description="This entry will be removed from daily expenses." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => deleteExpense(row)}>
        <Button type="text" danger aria-label={`Delete expense ${row.id}`} title="Delete expense" icon={<Trash2 size={16} />} loading={deletingId === row.id} disabled={submitting || Boolean(deletingId)} />
      </Popconfirm>
    </Space> },
  ];
  const visibleExpenses = [...filteredExpenses];
  const sortColumn = columns.find(column => column.key === sort.field);
  if (sort.order && sortColumn?.sorter) visibleExpenses.sort((a, b) => sortColumn.sorter(a, b) * (sort.order === 'descend' ? -1 : 1));
  const reportTables = () => {
    const scope = reportViewDescription({ search: filters.search, sort,
      filters: { Category: { values: filters.category === undefined ? [] : [expenseTypes.find(type => String(type.id) === String(filters.category))?.name || String(filters.category)] },
        Hostel: { values: filters.hostel === undefined ? [] : [hostelOptions.find(hostel => String(hostel.value) === String(filters.hostel))?.label || String(filters.hostel)] },
        'Recorded by': { values: filters.recordedBy === undefined ? [] : [filters.recordedBy] },
        Amount: { min: filters.min, max: filters.max }, Date: { from: filters.range?.[0]?.format('YYYY-MM-DD'), to: filters.range?.[1]?.format('YYYY-MM-DD') } } },
      key => ({ expense_date: 'Date', category: 'Category', hostel: 'Hostel', description: 'Notes', amount: 'Amount', recorded_by: 'Recorded by' }[key] || key));
    return [{ name: 'Selected filters and summary', rows: [['Setting', 'Value'], ...scope, ['Matching expenses', visibleExpenses.length], ['Filtered total (₹)', total]] },
      { name: 'Daily Expenses', rows: [['Date', 'Category', ...(hostelOptions.length ? ['Hostel'] : []), 'Notes', 'Amount (₹)', 'Recorded by'],
        ...visibleExpenses.map(row => [moment(row.expense_date).format('DD MMM YYYY'), row.ExpenseType?.name || 'General', ...(hostelOptions.length ? [row.hostel_name || ''] : []),
          row.description || '', Number(row.amount), row.RecordedBy?.userName || ''])] }];
  };
  const exportExpenses = async () => {
    const workbook = XLSX.utils.book_new();
    reportTables().forEach((table, index) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(table.rows), index ? 'Daily expenses' : 'Scope and filters'));
    await exportWorkbook(workbook, 'Daily_Expenses.xlsx');
  };

  return <div className="module-page mess-expenses-page">
    <div className="module-page-header expense-page-header">
      <div className="expense-heading"><span className="expense-heading-icon"><CreditCard size={24} /></span>
        <div><Title level={2}>Daily Expenses</Title></div>
      </div>
      <Space wrap><Button icon={<RefreshCw size={16} />} onClick={fetchData} loading={loading}>Refresh</Button>
        <Button icon={<LayoutGrid size={16} />} onClick={() => setShowTypeModal(true)}>Manage categories</Button></Space>
    </div>
    <ScopeAnchor />
    {loadError && <Alert type="error" showIcon title={loadError} className="expense-load-error" />}

    <section ref={formSection} className="expense-entry-section" aria-label="Expense entry">
      <Card title={editingId ? 'Edit expense' : 'New expense'} extra={editingId ? <Tag color="gold">Editing entry #{editingId}</Tag> : <Text type="secondary" className="scope-entry-context">{scope?.name ? `Recording for ${scope.name}` : 'Daily entry'}</Text>}>
        <Form name="daily-expense-entry" form={form} layout="vertical" onFinish={handleDailySubmit} initialValues={{ expense_date: moment() }} disabled={submitting}>
          <Row gutter={[20, 0]}>
            <Col xs={24} md={8}><Form.Item name="expense_type_id" label="Category" rules={[{ required: true, message: 'Select an expense category.' }]}>
              <Select showSearch optionFilterProp="label" placeholder="Select category" options={categoryOptions} />
            </Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item name="expense_date" label="Expense date" rules={[{ required: true, message: 'Select a date.' }]}>
              <DatePicker format="DD MMM YYYY" className="expense-full-width" />
            </Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Enter an amount.' }, { type: 'number', min: 0.01, message: 'Amount must be greater than zero.' }]}>
              <InputNumber min={0.01} precision={2} prefix="₹" placeholder="0.00" className="expense-full-width" />
            </Form.Item></Col>
            <Col xs={24}><Form.Item name="description" label="Notes (optional)"><Input.TextArea rows={2} placeholder="What was this expense for?" /></Form.Item></Col>
          </Row>
          <div className="expense-form-actions">
            <Space wrap><Button onClick={resetEntry} disabled={submitting} icon={editingId ? <X size={15} /> : undefined}>{editingId ? 'Cancel edit' : 'Clear form'}</Button>
              <Button permissionAction={editingId ? 'edit' : 'create'} type="primary" htmlType="submit" loading={submitting} icon={<Plus size={16} />}>{editingId ? 'Save changes' : 'Record expense'}</Button></Space>
          </div>
        </Form>
      </Card>
    </section>

    <Card className="expense-history-card report-preview" title="Expense history">
      <div className="report-preview-toolbar">
        <div className="report-preview-search"><Input id="expense-search" aria-label="Search expenses" prefix={<Search size={16} aria-hidden="true" />} placeholder="Search expenses" allowClear value={filters.search} onChange={event => updateFilter('search', event.target.value)} /></div>
        <div className="report-preview-actions">
          <Button permissionAction="export" icon={<Printer size={15} />} disabled={loading || Boolean(loadError) || !visibleExpenses.length} onClick={() => printTables(reportTables(), 'Daily Expenses')}>Print</Button>
          <Button permissionAction="export" type="primary" icon={<Download size={15} />} disabled={loading || Boolean(loadError) || !visibleExpenses.length} onClick={exportExpenses}>Export</Button>
        </div>
      </div>
      <details className="expense-filter-panel report-filter-panel"><summary>
        <span className="report-filter-heading"><SlidersHorizontal size={15} aria-hidden="true" /></span>Filters
        {activeFilterCount > 0 && <span className="report-active-count">{activeFilterCount} active</span>}
        <ChevronDown size={16} className="report-filter-chevron" aria-hidden="true" />
      </summary>
      <div className="report-sort-controls">
        <div className="report-sort-field"><span>Sort by</span><Select aria-label="Sort expenses by" allowClear placeholder="Original order" value={sort.field}
          options={columns.filter(column => column.sorter).map(column => ({ value: column.key, label: column.title }))}
          onChange={field => { setSort({ field, order: sort.order || 'ascend' }); setPage(1); }} /></div>
        <div className="report-sort-field report-sort-direction"><span>Order</span><Select aria-label="Expense sort direction" value={sort.order || 'ascend'}
          options={[{ value: 'ascend', label: 'Ascending' }, { value: 'descend', label: 'Descending' }]}
          onChange={order => { setSort(current => ({ ...current, order })); setPage(1); }} /></div>
        <Button className="report-reset expense-clear-filters" icon={<RotateCcw size={14} />} onClick={clearFilters}>Clear filters</Button>
      </div>
      <div className="expense-filters" aria-label="Expense filters">
        <div className="expense-filter"><label htmlFor="expense-category-filter">Category</label><Select id="expense-category-filter" aria-label="Filter by category" allowClear showSearch optionFilterProp="label" placeholder="All categories" options={categoryOptions} value={filters.category} onChange={value => updateFilter('category', value)} /></div>
        <div className="expense-filter expense-date-filter"><label>Date range</label><DatePicker.RangePicker aria-label="Filter by date range" placeholder={['From date', 'To date']} format="DD MMM YYYY" value={filters.range} onChange={value => updateFilter('range', value)} /></div>
        {hostelOptions.length > 1 && <div className="expense-filter"><label htmlFor="expense-hostel-filter">Hostel</label><Select id="expense-hostel-filter" aria-label="Filter by hostel" placeholder="All hostels" allowClear options={hostelOptions} value={filters.hostel} onChange={value => updateFilter('hostel', value)} /></div>}
        <div className="expense-filter"><label htmlFor="expense-recorder-filter">Recorded by</label><Select id="expense-recorder-filter" aria-label="Filter by recorded by" placeholder="All people" allowClear showSearch optionFilterProp="label" options={recorderOptions} value={filters.recordedBy} onChange={value => updateFilter('recordedBy', value)} /></div>
        <div className="expense-filter"><label htmlFor="expense-min">Minimum amount (₹)</label><InputNumber id="expense-min" min={0} value={filters.min} onChange={value => updateFilter('min', value)} /></div>
        <div className="expense-filter"><label htmlFor="expense-max">Maximum amount (₹)</label><InputNumber id="expense-max" min={0} value={filters.max} onChange={value => updateFilter('max', value)} /></div>
      </div></details>
      <div className="expense-results-summary" aria-live="polite"><Text type="secondary">{filteredExpenses.length} of {dailyExpenses.length} expenses</Text><span>Filtered total <strong>{money(total)}</strong></span></div>
      <Table size="middle" rowKey="id" dataSource={visibleExpenses} columns={columns} loading={loading} scroll={{ x: hostelOptions.length ? 1120 : 950 }}
        pagination={{ current: page, pageSize, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: count => `${count} expenses` }}
        onChange={(pagination, _columnFilters, sorter) => { setPage(pagination.current); setPageSize(pagination.pageSize); setSort({ field: sorter.columnKey, order: sorter.order }); }}
        locale={{ emptyText: dailyExpenses.length ? 'No expenses match your filters.' : 'No daily expenses recorded yet.' }} />
    </Card>

    <Modal title="Manage expense categories" open={showTypeModal} onCancel={() => !typeSubmitting && closeTypes()} footer={null} width={640}>
      <Form name="expense-category" form={typeForm} layout="vertical" onFinish={handleTypeSubmit} disabled={typeSubmitting} className="expense-category-form">
        <Row gutter={16}><Col xs={24} sm={14}><Form.Item name="name" label="Category name" rules={[{ required: true, whitespace: true, message: 'Enter a category name.' }]}><Input placeholder="e.g. Gas or Labour" /></Form.Item></Col>
          <Col xs={24} sm={10}><Form.Item name="description" label="Description (optional)"><Input placeholder="Category details" /></Form.Item></Col></Row>
        <Space><Button permissionAction={editingType ? 'edit' : 'create'} type="primary" htmlType="submit" loading={typeSubmitting}>{editingType ? 'Save category' : 'Add category'}</Button>
          {editingType && <Button onClick={() => { setEditingType(null); typeForm.resetFields(); }}>Cancel category edit</Button>}</Space>
      </Form>
      <List dataSource={expenseTypes} renderItem={type => <List.Item><div><Text strong>{type.name}</Text>{type.description && <div><Text type="secondary">{type.description}</Text></div>}</div>
        <Space><Button type="text" aria-label={`Edit category ${type.name}`} icon={<Edit3 size={16} />} disabled={typeSubmitting} onClick={() => { setEditingType(type); typeForm.setFieldsValue(type); }} />
          <Popconfirm permissionAction="delete" title="Delete this category?" okText="Delete" onConfirm={() => deleteType(type.id)}><Button type="text" danger aria-label={`Delete category ${type.name}`} icon={<Trash2 size={16} />} disabled={typeSubmitting} /></Popconfirm></Space>
      </List.Item>} />
    </Modal>
  </div>;
}
