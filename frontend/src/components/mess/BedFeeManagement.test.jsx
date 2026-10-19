import React from 'react';
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import BedFeeManagement from './BedFeeManagement';
import { messAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ messAPI: {
  getStudentFees: vi.fn(), getSessions: vi.fn(), getStudents: vi.fn(), createBedFee: vi.fn()
} }));
vi.mock('../../utils/bulkImportUtils', () => ({
  downloadStudentBulkImportTemplate: vi.fn(), getRequiredImportColumns: () => []
}));

beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  vi.clearAllMocks();
  messAPI.getSessions.mockResolvedValue({ data: { data: [{ id: 1, name: '2026 Batch' }] } });
  messAPI.getStudentFees.mockResolvedValue({ data: { data: [{ id: 20, student_id: 2, amount: 100, month: 10, year: 2026 }] } });
  messAPI.getStudents.mockResolvedValue({ data: { data: [
    { id: 427, userName: 'B.HARIRAAM', roll_number: '24104085', session_id: 1, session_name: '2026 Batch', college: 'nec', hostel_id: 2 },
    { id: 2, userName: 'ALREADY CHARGED', roll_number: '24104086', session_id: 1, college: 'lapc' }
  ] } });
  messAPI.createBedFee.mockResolvedValue({ data: { success: true } });
});
afterEach(cleanup);

describe('Add student to bed fees', () => {
  it('searches the student list, prevents duplicate selection, and submits one student fee', async () => {
    render(<BedFeeManagement />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Student' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('B.HARIRAAM');
    expect(messAPI.getStudents).toHaveBeenCalledWith({ requires_bed: 'true' });
    const duplicateRow = within(dialog).getByText('ALREADY CHARGED').closest('tr');
    expect(within(duplicateRow).getByRole('radio')).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Add Bed Fee' })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Search bed fee students'), { target: { value: '24104085' } });
    expect(within(dialog).queryByText('ALREADY CHARGED')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio'));
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '500' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Bed Fee' }));

    await waitFor(() => expect(messAPI.createBedFee).toHaveBeenCalledWith(expect.objectContaining({ student_id: 427, hostel_id: 2, amount: 500 })));
    await waitFor(() => expect(messAPI.getStudentFees).toHaveBeenCalledTimes(3));
  }, 20000);

  it('shows a failed student load and keeps saving disabled', async () => {
    messAPI.getStudents.mockRejectedValue(new Error('Network error'));
    render(<BedFeeManagement />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Student' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('alert');
    expect(within(dialog).getByRole('button', { name: 'Add Bed Fee' })).toBeDisabled();
    expect(messAPI.createBedFee).not.toHaveBeenCalled();
  }, 20000);
});
