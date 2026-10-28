import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, message, Modal } from 'antd';
import * as XLSX from 'xlsx';
import { wardenAPI } from '../../services/api';
import EnrollStudent from './EnrollStudent';

vi.setConfig({ testTimeout: 60000 });
vi.mock('../../services/api', () => ({ wardenAPI: { getSessions: vi.fn(), bulkEnrollStudents: vi.fn() } }));
beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  vi.clearAllMocks();
  wardenAPI.getSessions.mockResolvedValue({ data: { data: [
    { id: 2, college: 'nec', erp_batch_year: 2024, gender: 'male', name: '2024-2028', hostel_id: 1, hostel_name: 'Hostel I', is_active: true },
    { id: 3, college: 'lapc', erp_batch_year: 2024, gender: 'male', name: '2024-2027', hostel_id: 8, hostel_name: 'LAPC Hostel', inventory_name: 'Boys Mess', billing_mode: 'shared', is_active: true }
  ] } });
  wardenAPI.bulkEnrollStudents.mockResolvedValue({ data: { data: { successful: 1, skipped: 0, errors: [] } } });
  vi.spyOn(Modal, 'success').mockImplementation(() => ({ destroy() {} }));
});
afterEach(() => { cleanup(); message.destroy(); Modal.destroyAll(); vi.restoreAllMocks(); });

it.each([['nec', false], ['nec', true], ['lapc', false]])('imports %s Excel with the entered password and refreshes stale batches (stale: %s)', async (college, stale) => {
  if (stale) wardenAPI.getSessions.mockResolvedValueOnce({ data: { data: [] } });
  render(<ConfigProvider theme={{ token: { motion: false } }}><EnrollStudent /></ConfigProvider>);
  await waitFor(() => expect(wardenAPI.getSessions).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('tab', { name: /Bulk Import & Preview/ }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Student Name', 'Roll Number', 'Admission Year', 'Gender'],
    ['Example Student', '24100001', 2024, 'Male']
  ]), 'Students');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [new File([bytes], 'students.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })] } });
  await screen.findByText('Review Imported Students', {}, { timeout: 10000 });
  if (college === 'lapc') {
    fireEvent.mouseDown(screen.getByLabelText('Target College'));
    fireEvent.click(await screen.findByText('LAPC', { selector: '.ant-select-dropdown span' }));
    await screen.findByText('LAPC Hostel');
    expect(screen.getByText('Shared daily rate')).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: /Confirm & Enroll All/ }));
  expect(wardenAPI.bulkEnrollStudents).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Default Password/), { target: { value: 'WardenTestPass' } });
  fireEvent.click(screen.getByRole('button', { name: /Confirm & Enroll All/ }));
  await waitFor(() => expect(wardenAPI.bulkEnrollStudents).toHaveBeenCalledTimes(1));
  const payload = wardenAPI.bulkEnrollStudents.mock.calls[0][0];
  expect(payload).toEqual(expect.objectContaining({ import_source: 'excel', default_password: 'WardenTestPass' }));
  expect(payload.students[0]).not.toHaveProperty('date_of_birth');
  expect(payload.students[0]).not.toHaveProperty('password');
  expect(payload.college).toBe(college);
  expect(payload.students[0].college).toBe(college);
  expect(payload.students[0].session_id).toBe(college === 'lapc' ? 3 : 2);
  expect(wardenAPI.getSessions).toHaveBeenCalledTimes(2);
});
