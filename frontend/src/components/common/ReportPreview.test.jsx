import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import * as XLSX from 'xlsx';
import ReportPreview from './ReportPreview';
import { exportWorkbook, printTables } from '../../utils/reportExport';

vi.mock('../../utils/reportExport', () => ({ exportWorkbook: vi.fn(), printTables: vi.fn() }));
vi.mock('antd', () => {
  const Wrap = ({ children }) => <div>{children}</div>;
  return { Space: Wrap, Typography: { Text: Wrap, Paragraph: Wrap },
    Input: ({ value, onChange, 'aria-label': label }) => <input aria-label={label} value={value} onChange={onChange} />,
    Select: ({ mode, options, value, onChange, 'aria-label': label }) => <select aria-label={label} multiple={mode === 'multiple'} value={value ?? ''}
      onChange={event => onChange(mode === 'multiple' ? [...event.target.selectedOptions].map(option => option.value) : event.target.value)}>
      {mode !== 'multiple' && <option value="">Choose</option>}{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>, Button: ({ disabled, onClick, children }) => <button disabled={disabled} onClick={onClick}>{children}</button>,
    Table: ({ dataSource, columns, pagination, onChange }) => <table><thead><tr>{columns.map(column => <th key={column.key}
      onClick={() => onChange({ current: 1, pageSize: pagination.pageSize }, {}, { columnKey: column.key, order: column.sortOrder === 'ascend' ? 'descend' : 'ascend' })}>{column.title}</th>)}</tr></thead>
      <tbody>{dataSource.slice(0, pagination.pageSize).map((row, index) => <tr key={index}>{columns.map(column => <td key={column.key}>{column.render(row[column.dataIndex])}</td>)}</tr>)}</tbody></table>,
  };
});
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
const rows = Array.from({ length: 25 }, (_, index) => ({ Date: `2026-10-${String(index + 1).padStart(2, '0')}`, Item: index === 24 ? 'Dal' : 'Rice', Cost: index + 1 }));
it('prints and exports all filtered rows in the selected order, beyond the preview page', () => {
  render(<ReportPreview rows={rows} title="Consumption" metadata={[["Period", "October 2026"]]} />);
  fireEvent.change(screen.getByLabelText('Search report'), { target: { value: 'Rice' } });
  fireEvent.change(screen.getByLabelText('Sort report by'), { target: { value: 'Cost' } });
  fireEvent.change(screen.getByLabelText('Report sort direction'), { target: { value: 'descend' } });
  const previewRows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  expect(previewRows).toHaveLength(20);
  expect(within(previewRows[0]).getAllByRole('cell')[2]).toHaveTextContent('24');
  fireEvent.click(screen.getByRole('button', { name: 'Print' }));
  const printed = printTables.mock.calls[0][0];
  expect(printed[1].rows).toHaveLength(25);
  expect(printed[1].rows.slice(1).map(row => row[2])).toEqual(Array.from({ length: 24 }, (_, i) => String(24 - i)));
  expect(printed[0].rows).toEqual(expect.arrayContaining([['Search', 'Rice'], ['Sort', 'Cost (descending)'], ['Matching rows', 24], ['Period', 'October 2026']]));
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
  const workbook = exportWorkbook.mock.calls[0][0];
  expect(XLSX.utils.sheet_to_json(workbook.Sheets.Report, { header: 1 }).slice(1).map(row => String(row[2]))).toEqual(printed[1].rows.slice(1).map(row => row[2]));
});
it('combines per-column filters, prints their values, follows header sorting, and clears the view', () => {
  render(<ReportPreview rows={rows} title="Consumption" />);
  fireEvent.change(screen.getByLabelText('Cost min'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Cost max'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Date from'), { target: { value: '2026-10-06' } });
  fireEvent.change(screen.getByLabelText('Date to'), { target: { value: '2026-10-09' } });
  const item = screen.getByLabelText('Filter Item');
  within(item).getByRole('option', { name: 'Rice' }).selected = true;
  fireEvent.change(item);
  fireEvent.click(screen.getByRole('columnheader', { name: 'Cost' }));
  fireEvent.click(screen.getByRole('columnheader', { name: 'Cost' }));
  fireEvent.click(screen.getByRole('button', { name: 'Print' }));
  const printed = printTables.mock.calls[0][0];
  expect(printed[1].rows.slice(1).map(row => row[2])).toEqual(['9', '8', '7', '6']);
  expect(printed[0].rows).toEqual(expect.arrayContaining([['Cost minimum', '5'], ['Cost maximum', '10'], ['Date from', '2026-10-06'], ['Date to', '2026-10-09'], ['Item', 'Rice']]));
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters and sorting' }));
  expect(screen.getByText(/25 of 25 rows/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search report'), { target: { value: 'Nothing matches' } });
  expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();
});
