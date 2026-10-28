import { PermissionButton as Button } from './PermissionControls';
import React, { useMemo, useState } from 'react';
import { Input, Select, Table, Typography } from 'antd';
import { ChevronDown, Download, Printer, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportWorkbook, printTables } from '../../utils/reportExport';
import { reportFieldType, reportKeys, reportText, reportView, reportViewDescription } from '../../utils/reportView';
import './ReportPreview.css';

export default function ReportPreview({ rows, title, metadata = [], label = key => key, filename = 'Report.xlsx', disabled = false, compact = false, formatValue = reportText, searchPlaceholder = 'Search report' }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const keys = useMemo(() => reportKeys(rows), [rows]);
  const rowKeys = useMemo(() => new Map(rows.map((row, index) => [row, String(index)])), [rows]);
  const visible = useMemo(() => reportView(rows, { search, filters, sort }), [rows, search, filters, sort]);
  const activeCount = Object.values(filters).filter(filter => filter.values?.length || ['min', 'max', 'from', 'to'].some(key => filter[key] != null && filter[key] !== '')).length + (sort.field && sort.order ? 1 : 0);
  const updateFilter = (key, changes) => { setFilters(current => ({ ...current, [key]: { ...current[key], ...changes } })); setPage(1); };
  const scope = [...metadata, ...reportViewDescription({ search, filters, sort }, label), ['Matching rows', visible.length]];
  const tables = () => [{ name: 'Scope and selected filters', rows: [['Setting', 'Value'], ...scope] },
    { name: title, rows: [keys.map(label), ...visible.map(row => keys.map(key => formatValue(row[key], key)))] }];
  const exportRows = async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Setting', 'Value'], ...scope]), 'Scope and filters');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([keys.map(label), ...visible.map(row => keys.map(key => row[key] ?? ''))]), 'Report');
    await exportWorkbook(workbook, filename);
  };
  const sortingControls = <>
      <div className="report-sort-field"><span>Sort by</span><Select aria-label="Sort report by" placeholder="Original order" allowClear value={sort.field} options={keys.map(key => ({ value: key, label: label(key) }))}
        onChange={field => { setSort({ field, order: sort.order || 'ascend' }); setPage(1); }} /></div>
      <div className="report-sort-field report-sort-direction"><span>Order</span><Select aria-label="Report sort direction" value={sort.order || 'ascend'} options={[{ value: 'ascend', label: 'Ascending' }, { value: 'descend', label: 'Descending' }]}
        onChange={order => { setSort(current => ({ ...current, order })); setPage(1); }} /></div>
      <Button className="report-reset" icon={<RotateCcw size={14} />} onClick={() => { setSearch(''); setFilters({}); setSort({}); setPage(1); }}>Clear filters and sorting</Button>
    </>;
  return <div aria-label="Report preview" className="report-preview">
    <div className="report-preview-toolbar">
      <div className="report-preview-search"><Input aria-label="Search report" prefix={<Search size={16} aria-hidden="true" />} placeholder={searchPlaceholder} allowClear value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>
      <div className="report-preview-actions">
        <span className="report-entry-count">{visible.length} <span>of {rows.length} entries</span></span>
        <Button permissionAction="export" icon={<Printer size={15} />} disabled={disabled || !visible.length} onClick={() => printTables(tables(), title)}>Print</Button>
        <Button permissionAction="export" type="primary" icon={<Download size={15} />} disabled={disabled || !visible.length} onClick={exportRows}>Export</Button>
      </div>
    </div>
    {!compact && <div className="report-sort-controls report-standalone-sort">{sortingControls}</div>}
    <details className="report-filter-panel"><summary>
      <span className="report-filter-heading"><SlidersHorizontal size={15} aria-hidden="true" /><span>{compact ? 'Filters & sorting' : 'Column filters'}</span>
        {activeCount > 0 && <span className="report-active-count">{activeCount} active</span>}</span>
      <ChevronDown size={16} className="report-filter-chevron" aria-hidden="true" />
    </summary>
      {compact && <div className="report-sort-controls">{sortingControls}</div>}
      <div className="report-filter-grid">
        {keys.map(key => {
          const type = reportFieldType(rows, key), filter = filters[key] || {};
          return <div key={key} className="report-filter-field"><Typography.Text strong>{label(key)}</Typography.Text>
            {type === 'text' ? <div className="report-filter-select"><Select aria-label={`Filter ${label(key)}`} mode="multiple" maxTagCount="responsive" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder={`All ${label(key)}`} value={filter.values || []}
              options={[...new Set(rows.map(row => reportText(row[key])))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(value => ({ value, label: value || '(Blank)' }))}
              onChange={values => updateFilter(key, { values })} /></div>
              : <div className="report-filter-range">{(type === 'date' ? ['from', 'to'] : ['min', 'max']).map(bound => <label key={bound}>
                {({ from: 'From', to: 'To', min: 'Minimum', max: 'Maximum' })[bound]}<input aria-label={`${label(key)} ${bound}`} type={type === 'date' ? 'date' : 'number'} step="any" value={filter[bound] ?? ''}
                  onChange={event => updateFilter(key, { [bound]: event.target.value })} />
              </label>)}</div>}
          </div>;
        })}
      </div>
    </details>
    {!compact && <Typography.Paragraph className="report-preview-note" type="secondary">{`${visible.length} of ${rows.length} rows. Print and export include every matching row in the selected order, across all pages.`}</Typography.Paragraph>}
    <Table size="middle" rowKey={row => rowKeys.get(row)} dataSource={visible} scroll={{ x: 'max-content' }}
      columns={keys.map(key => ({ title: label(key), key, dataIndex: key, align: compact && reportFieldType(rows, key) === 'number' ? 'right' : undefined, render: value => formatValue(value, key), sorter: true, sortOrder: sort.field === key ? sort.order : null }))}
      pagination={{ current: page, pageSize, showSizeChanger: true }}
      onChange={(pagination, _, sorter) => { setPage(pagination.current); setPageSize(pagination.pageSize); setSort({ field: sorter.columnKey, order: sorter.order }); }} />
  </div>;
}
