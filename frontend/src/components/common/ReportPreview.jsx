import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Typography } from 'antd';
import * as XLSX from 'xlsx';
import { exportWorkbook, printTables } from '../../utils/reportExport';
import { reportFieldType, reportKeys, reportText, reportView, reportViewDescription } from '../../utils/reportView';

export default function ReportPreview({ rows, title, metadata = [], label = key => key, filename = 'Report.xlsx', disabled = false, compact = false, formatValue = reportText, searchPlaceholder = 'Search report' }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const keys = useMemo(() => reportKeys(rows), [rows]);
  const rowKeys = useMemo(() => new Map(rows.map((row, index) => [row, String(index)])), [rows]);
  const visible = useMemo(() => reportView(rows, { search, filters, sort }), [rows, search, filters, sort]);
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
      <Select aria-label="Sort report by" placeholder="Sort by" allowClear value={sort.field} style={{ minWidth: 180 }} options={keys.map(key => ({ value: key, label: label(key) }))}
        onChange={field => { setSort({ field, order: sort.order || 'ascend' }); setPage(1); }} />
      <Select aria-label="Report sort direction" value={sort.order || 'ascend'} style={{ width: 140 }} options={[{ value: 'ascend', label: 'Ascending' }, { value: 'descend', label: 'Descending' }]}
        onChange={order => { setSort(current => ({ ...current, order })); setPage(1); }} />
      <Button onClick={() => { setSearch(''); setFilters({}); setSort({}); setPage(1); }}>Clear filters and sorting</Button>
    </>;
  return <div aria-label="Report preview">
    <Space wrap style={{ marginBottom: 16 }}>
      <Input aria-label="Search report" placeholder={searchPlaceholder} allowClear value={search} style={{ width: 260 }} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      {!compact && sortingControls}
      <Button disabled={disabled || !visible.length} onClick={() => printTables(tables(), title)}>Print</Button>
      <Button disabled={disabled || !visible.length} onClick={exportRows}>Export</Button>
    </Space>
    <details style={{ marginBottom: 16 }}><summary style={{ cursor: 'pointer' }}>{compact ? 'Filters & sorting' : 'Column filters'}</summary>
      {compact && <Space wrap style={{ marginTop: 16 }}>{sortingControls}</Space>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, paddingTop: 16 }}>
        {keys.map(key => {
          const type = reportFieldType(rows, key), filter = filters[key] || {};
          return <div key={key}><Typography.Text strong>{label(key)}</Typography.Text><br />
            {type === 'text' ? <Select aria-label={`Filter ${label(key)}`} mode="multiple" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder={`All ${label(key)}`} value={filter.values || []}
              options={[...new Set(rows.map(row => reportText(row[key])))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(value => ({ value, label: value || '(Blank)' }))}
              onChange={values => updateFilter(key, { values })} />
              : <div style={{ display: 'flex', gap: 8 }}>{(type === 'date' ? ['from', 'to'] : ['min', 'max']).map(bound => <label key={bound} style={{ flex: 1, minWidth: 0 }}>
                {({ from: 'From', to: 'To', min: 'Minimum', max: 'Maximum' })[bound]}<input aria-label={`${label(key)} ${bound}`} type={type === 'date' ? 'date' : 'number'} step="any" value={filter[bound] ?? ''}
                  onChange={event => updateFilter(key, { [bound]: event.target.value })} style={{ width: '100%', border: '1px solid #d9d9d9', borderRadius: 6, padding: 6 }} />
              </label>)}</div>}
          </div>;
        })}
      </div>
    </details>
    <Typography.Paragraph type="secondary">{compact ? `${visible.length} of ${rows.length} entries` : `${visible.length} of ${rows.length} rows. Print and export include every matching row in the selected order, across all pages.`}</Typography.Paragraph>
    <Table rowKey={row => rowKeys.get(row)} dataSource={visible} scroll={{ x: 'max-content' }}
      columns={keys.map(key => ({ title: label(key), key, dataIndex: key, align: compact && reportFieldType(rows, key) === 'number' ? 'right' : undefined, render: value => formatValue(value, key), sorter: true, sortOrder: sort.field === key ? sort.order : null }))}
      pagination={{ current: page, pageSize, showSizeChanger: true }}
      onChange={(pagination, _, sorter) => { setPage(pagination.current); setPageSize(pagination.pageSize); setSort({ field: sorter.columnKey, order: sorter.order }); }} />
  </div>;
}
