import React from 'react';
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as XLSX from 'xlsx';
import AdditionalFoodStudentReport from './AdditionalFoodStudentReport';
import { messAPI } from '../../services/api';
import { requestReportFormat } from '../../services/reportFormat';
import { exportWorkbook, printTables } from '../../utils/reportExport';

vi.mock('../../services/api', () => ({ messAPI: { getAdditionalFoodStudentReport: vi.fn() } }));
vi.mock('../../services/reportFormat', () => ({ requestReportFormat: vi.fn() }));
vi.mock('../../utils/reportExport', () => ({ exportWorkbook: vi.fn(), printTables: vi.fn() }));
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(cleanup);
const row = (key, room_number) => ({ key, student_id: key, name: `Student ${key}`, roll_number: `R${key}`, room_number, food: 'Rice', quantity: 2 });
beforeEach(() => {
  vi.clearAllMocks();
  messAPI.getAdditionalFoodStudentReport.mockResolvedValue({ data: { data: { date: '2026-10-19', meal_type: 'all', include_staff: false,
    veg: [row('10', '10'), row('2', '2'), { ...row('2', '2'), key: '2-curd', food: 'Curd', quantity: 1 }, { ...row('10', '10'), key: '10-curd', food: 'Curd', quantity: 3 }], nonVeg: [{ ...row('3', '3'), food: 'Egg' }], unclassified: [], total_students: 3, total_quantity: 10, legacy_order_count: 0 } } });
});
const generate = async format => {
  requestReportFormat.mockResolvedValue(format);
  render(<AdditionalFoodStudentReport />);
  fireEvent.click(screen.getByRole('button', { name: 'Student Food Report' }));
  const exportButton = await screen.findByRole('button', { name: 'Export Report' });
  await waitFor(() => expect(exportButton).toBeEnabled());
  fireEvent.click(exportButton);
};
it('offers preferred formats and exports separate Excel tables in room order', async () => {
  await generate('xlsx');
  await waitFor(() => expect(exportWorkbook).toHaveBeenCalled());
  expect(requestReportFormat).toHaveBeenCalledWith(expect.objectContaining({ formats: ['pdf', 'xlsx', 'csv'] }));
  const workbook = exportWorkbook.mock.calls[0][0];
  expect(workbook.SheetNames).toEqual(['Veg', 'Non-Veg']);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Veg, { header: 1 });
  expect(rows[5]).toEqual(['Name', 'Roll No', 'Room No', 'Curd', 'Rice']);
  expect(rows.slice(6).map(row => row[2])).toEqual(['2', '10']);
  expect(rows.slice(6).map(row => row.slice(3))).toEqual([[1, 2], [3, 2]]);
  expect(rows.slice(6)).toHaveLength(2);
}, 60000);
it('prints both dietary tables for PDF with the requested columns and room sorting', async () => {
  await generate('pdf');
  await waitFor(() => expect(printTables).toHaveBeenCalled());
  const tables = printTables.mock.calls[0][0];
  expect(tables.map(table => table.name)).toEqual(['Veg', 'Non-Veg']);
  expect(tables[0].rows[0]).toEqual(['Name', 'Roll No', 'Room No', 'Curd', 'Rice']);
  expect(tables[0].rows.slice(1).map(row => row[2])).toEqual(['2', '10']);
  expect(tables[0].rows.slice(1).map(row => row.slice(3))).toEqual([[1, 2], [3, 2]]);
}, 60000);
it('passes the selected CSV format through to the shared export helper', async () => {
  await generate('csv');
  await waitFor(() => expect(exportWorkbook).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Additional_Food_Students'), 'csv'));
}, 60000);

it('loads preview automatically and refreshes it when filters change without requesting a format', async () => {
  render(<AdditionalFoodStudentReport />);
  fireEvent.click(screen.getByRole('button', { name: 'Student Food Report' }));
  expect(await screen.findByRole('heading', { name: 'Veg', exact: true })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Non-Veg', exact: true })).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export Report' })).toBeEnabled());
  expect(requestReportFormat).not.toHaveBeenCalled();
  expect(screen.getAllByText('Student 2')).toHaveLength(1);
  expect(screen.getAllByText('Student 10')).toHaveLength(1);
  expect(screen.getAllByRole('columnheader', { name: 'Curd' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include supervisor extras' }));
  await waitFor(() => expect(messAPI.getAdditionalFoodStudentReport).toHaveBeenLastCalledWith(expect.objectContaining({ include_staff: 'true' })));
  expect(requestReportFormat).not.toHaveBeenCalled();
}, 60000);
