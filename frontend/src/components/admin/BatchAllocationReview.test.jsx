import React from 'react';
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Modal, message } from 'antd';
import BatchAllocationReview from './BatchAllocationReview';
import { adminAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ adminAPI: { previewBatchAllocation: vi.fn(), applyBatchAllocation: vi.fn() } }));
const ready = Array.from({ length: 12 }, (_, index) => ({ student_id: index + 1, name: `MATCH Student ${index + 1}`, roll_number: `24${index + 1}`, status: 'ready' }));
const other = Array.from({ length: 3 }, (_, index) => ({ student_id: index + 20, name: `OTHER Student ${index}`, roll_number: `25${index}`, status: 'ready' }));
const rows = [...ready, ...other, { student_id: 100, name: 'MATCH Conflict', status: 'conflict', reason: 'Needs attention' }, { student_id: 101, name: 'MATCH Unchanged', status: 'unchanged' }];
beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  vi.clearAllMocks();
  adminAPI.previewBatchAllocation.mockResolvedValue({ data: { data: { rows, token: 'preview-token' } } });
  adminAPI.applyBatchAllocation.mockResolvedValue({ data: { message: 'Allocation applied' } });
});
afterEach(() => { cleanup(); Modal.destroyAll(); message.destroy(); vi.restoreAllMocks(); });

it('selects every eligible filtered student across pages and submits all selected IDs', async () => {
  vi.spyOn(Modal, 'confirm').mockImplementation(options => { options.onOk(); return { destroy() {} }; });
  render(<BatchAllocationReview open onClose={vi.fn()} />);
  await screen.findByText('MATCH Student 1');
  fireEvent.change(screen.getByLabelText('Search allocation students'), { target: { value: 'MATCH' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all matching eligible students' }));
  expect(screen.getByRole('button', { name: 'Apply to 12 Students' })).toBeEnabled();
  fireEvent.click(screen.getByTitle('2'));
  expect(await screen.findByText('MATCH Student 12')).toBeInTheDocument();
  const studentRow = screen.getByText('MATCH Student 12').closest('tr');
  expect(within(studentRow).getByRole('checkbox')).toBeChecked();
  const conflictRow = screen.getByText('MATCH Conflict').closest('tr');
  expect(within(conflictRow).getByRole('checkbox')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Apply to 12 Students' }));
  await waitFor(() => expect(adminAPI.applyBatchAllocation).toHaveBeenCalledWith({ student_ids: ready.map(student => student.student_id), token: 'preview-token' }));
}, 30000);

it('changes page size and clears hidden selections when the search changes', async () => {
  render(<BatchAllocationReview open onClose={vi.fn()} />);
  await screen.findByText('MATCH Student 1');
  expect(screen.queryByText('MATCH Student 12')).not.toBeInTheDocument();
  const sizePicker = document.querySelector('.ant-pagination-options-size-changer');
  fireEvent.mouseDown(within(sizePicker).getByRole('combobox'));
  fireEvent.click(await screen.findByTitle('20 / page'));
  expect(await screen.findByText('MATCH Student 12')).toBeInTheDocument();
  expect(screen.getByText('OTHER Student 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select all matching eligible students (15)' }));
  expect(screen.getByRole('button', { name: 'Apply to 15 Students' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Search allocation students'), { target: { value: 'OTHER' } });
  expect(screen.getByRole('button', { name: 'Apply to 0 Students' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Select all matching eligible students (3)' }));
  expect(screen.getByRole('button', { name: 'Apply to 3 Students' })).toBeEnabled();
}, 30000);
