import React from 'react';
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Modal, message } from 'antd';
import axios from 'axios';
import { wardenAPI } from '../../services/api';
import ManageStudents from './ManageStudents';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../services/api', () => ({ wardenAPI: { getStudents: vi.fn(), getSessions: vi.fn(), bulkEnrollStudents: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'warden', hostel_id: 2 } }) }));
const local = [
  { id: 10, userName: 'Existing Student', roll_number: '24100000', erp_batch_year: 2024, session_id: 2, hostel_id: 2 },
  { id: 11, userName: 'Needs Update', roll_number: '23999000', erp_batch_year: null, hostel_id: 2, tbl_Enrollment: [{ requires_bed: true }] }
];
const ready = Array.from({ length: 7 }, (_, index) => ({ studentId: index + 100, studentName: `ERP Student ${index}`, registerNumber: `2399990${index}`, batch: 2024, student_type: 'Hosteller', personal_email: `student${index}@example.invalid` }));
const source = [...ready,
  { studentId: 200, studentName: 'Needs Update', registerNumber: '23999000', batch: 2024, student_type: 'Hosteller' },
  { studentId: 201, studentName: 'Existing Student', registerNumber: '24100000', batch: 2024, student_type: 'Hosteller' },
  { studentId: 202, studentName: 'Other Hostel', registerNumber: '25100000', batch: 2025, student_type: 'Hosteller' },
  { studentId: 203, studentName: 'Missing Batch', registerNumber: '24123456', student_type: 'Hosteller' }
];
beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('token', 'test-session-token');
  wardenAPI.getStudents.mockResolvedValue({ data: { data: local } });
  wardenAPI.getSessions.mockResolvedValue({ data: { data: [
    { id: 2, name: '2024-2028', erp_batch_year: 2024, hostel_id: 2, hostel_name: 'BOYS HOSTEL 2', is_active: true },
    { id: 3, name: '2025-2029', erp_batch_year: 2025, hostel_id: 1, hostel_name: 'BOYS HOSTEL 1', is_active: true }
  ] } });
  axios.get.mockResolvedValue({ data: source });
  wardenAPI.bulkEnrollStudents.mockResolvedValue({ data: { success: true, data: { successful: 8, skipped: 0, errors: [] } } });
});
afterEach(() => { cleanup(); Modal.destroyAll(); message.destroy(); localStorage.clear(); vi.restoreAllMocks(); });

it('imports all matching eligible students across pages and refreshes the saved hostel roster', async () => {
  vi.spyOn(Modal, 'confirm').mockImplementation(options => { options.onOk(); return { destroy() {} }; });
  render(<ManageStudents />);
  fireEvent.click(await screen.findByRole('button', { name: 'Fetch from Academics' }, { timeout: 5000 }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Academics authorization token'), { target: { value: 'Bearer academics-test-token' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /Fetch Students/ }));
  await within(dialog).findByText(/Fetched 11 hosteller students/);
  expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ timeout: 20000, headers: { Authorization: 'Bearer academics-test-token' } }));
  expect(within(dialog).getByRole('button', { name: 'Import Selected Students (0)' })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Select all matching eligible students (8)' }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Import Selected Students (8)' }));
  await waitFor(() => expect(wardenAPI.bulkEnrollStudents).toHaveBeenCalled());
  const payload = wardenAPI.bulkEnrollStudents.mock.calls[0][0];
  expect(payload.students).toHaveLength(8);
  expect(payload.students.every(student => student.erp_batch_year === 2024)).toBe(true);
  expect(payload.students[0]).toEqual(expect.objectContaining({ userName: 'ERP Student 0', roll_number: ready[0].registerNumber, email: ready[0].personal_email, requires_bed: false }));
  expect(payload.students.find(student => student.roll_number === '23999000').requires_bed).toBe(true);
  expect(payload.students.some(student => ['24100000', '25100000', '24123456'].includes(student.roll_number))).toBe(false);
  await within(dialog).findByText('Imported 8 students; 0 skipped; 0 failed.');
  await waitFor(() => expect(wardenAPI.getStudents).toHaveBeenCalledTimes(2));
}, 30000);

it('reports empty fetches and timeouts without leaving old results visible', async () => {
  axios.get.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce({ code: 'ECONNABORTED' });
  render(<ManageStudents />);
  fireEvent.click(await screen.findByRole('button', { name: 'Fetch from Academics' }, { timeout: 5000 }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /Fetch Students/ }));
  await within(dialog).findByText(/Fetched 0 hosteller students/);
  fireEvent.click(within(dialog).getByRole('button', { name: /Fetch Students/ }));
  await within(dialog).findByText('The Academics request timed out after 20 seconds. Try again.');
  expect(within(dialog).queryByText(/Fetched 0 hosteller students/)).not.toBeInTheDocument();
  expect(wardenAPI.bulkEnrollStudents).not.toHaveBeenCalled();
}, 30000);
