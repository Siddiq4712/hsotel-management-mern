import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message, Modal } from 'antd';
import { wardenAPI } from '../../services/api';
import WardenRoomTemplates from './WardenRoomTemplates';

vi.setConfig({ testTimeout: 30000 });
vi.mock('../../services/api', () => ({ wardenAPI: { getRoomTypes: vi.fn(), createRoomType: vi.fn(), updateRoomType: vi.fn(), deleteRoomType: vi.fn() } }));
beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  vi.clearAllMocks();
  wardenAPI.getRoomTypes.mockResolvedValue({ data: { data: [{ id: 1, name: 'Single Room', capacity: 1 }] } });
  wardenAPI.createRoomType.mockResolvedValue({ status: 201, data: { data: { id: 2, name: 'Double Room', capacity: 2, description: '' } } });
  wardenAPI.updateRoomType.mockResolvedValue({ status: 200, data: { data: { id: 1, name: 'Updated Single', capacity: 2, description: 'Updated description' } } });
  wardenAPI.deleteRoomType.mockResolvedValue({ data: { success: true } });
});
afterEach(() => { cleanup(); message.destroy(); Modal.destroyAll(); vi.restoreAllMocks(); });

it('creates a template without requesting a hostel and shows the saved capacity', async () => {
  render(<WardenRoomTemplates />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage Room Templates' }));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText('Single Room');
  expect(dialog.queryByLabelText('Hostel')).toBeNull();
  fireEvent.change(dialog.getByLabelText('Template Name'), { target: { value: ' Double Room ' } });
  fireEvent.change(dialog.getByLabelText('Student Capacity'), { target: { value: '2' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Save Template' }));
  await waitFor(() => expect(wardenAPI.createRoomType).toHaveBeenCalledWith({ name: 'Double Room', capacity: 2, description: '' }));
  await dialog.findByText('Double Room');
  expect(wardenAPI.createRoomType.mock.calls[0][0]).not.toHaveProperty('hostel_id');
});

it('keeps the entered details when saving fails', async () => {
  wardenAPI.createRoomType.mockRejectedValue({ response: { data: { message: 'Hostel binding missing.' } } });
  render(<WardenRoomTemplates />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage Room Templates' }));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText('Single Room');
  fireEvent.change(dialog.getByLabelText('Template Name'), { target: { value: 'Double Room' } });
  fireEvent.change(dialog.getByLabelText('Student Capacity'), { target: { value: '2' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Save Template' }));
  await screen.findByText('Hostel binding missing.');
  expect(dialog.getByLabelText('Template Name')).toHaveValue('Double Room');
});

it('edits an existing template and updates the same row', async () => {
  render(<WardenRoomTemplates />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage Room Templates' }));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText('Single Room');
  fireEvent.click(dialog.getByRole('button', { name: 'Edit' }));
  expect(dialog.getByLabelText('Template Name')).toHaveValue('Single Room');
  fireEvent.change(dialog.getByLabelText('Template Name'), { target: { value: 'Updated Single' } });
  fireEvent.change(dialog.getByLabelText('Student Capacity'), { target: { value: '2' } });
  fireEvent.change(dialog.getByLabelText('Description (optional)'), { target: { value: 'Updated description' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Update Template' }));
  await waitFor(() => expect(wardenAPI.updateRoomType).toHaveBeenCalledWith(1, { name: 'Updated Single', capacity: 2, description: 'Updated description' }));
  await dialog.findByText('Updated Single');
  expect(dialog.queryByText('Single Room')).toBeNull();
  expect(wardenAPI.createRoomType).not.toHaveBeenCalled();
});

it('cancels editing without saving', async () => {
  render(<WardenRoomTemplates />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage Room Templates' }));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText('Single Room');
  fireEvent.click(dialog.getByRole('button', { name: 'Edit' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel Edit' }));
  expect(dialog.getByRole('button', { name: 'Save Template' })).toBeInTheDocument();
  expect(dialog.getByLabelText('Template Name')).toHaveValue('');
  expect(wardenAPI.updateRoomType).not.toHaveBeenCalled();
});

it('deletes a template only after confirmation and clears its edit form', async () => {
  let confirmation;
  vi.spyOn(Modal, 'confirm').mockImplementation(options => { confirmation = options; return { destroy() {} }; });
  render(<WardenRoomTemplates />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage Room Templates' }));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText('Single Room');
  fireEvent.click(dialog.getByRole('button', { name: 'Edit' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
  expect(wardenAPI.deleteRoomType).not.toHaveBeenCalled();
  expect(confirmation.title).toBe('Delete Single Room?');
  await act(async () => { await confirmation.onOk(); });
  expect(wardenAPI.deleteRoomType).toHaveBeenCalledWith(1);
  expect(dialog.queryByText('Single Room')).toBeNull();
  expect(dialog.getByRole('button', { name: 'Save Template' })).toBeInTheDocument();
  expect(dialog.getByLabelText('Template Name')).toHaveValue('');
});

it('retains a referenced template when the backend rejects deletion', async () => {
  const failure = { response: { data: { message: 'Cannot delete room type. It is being used by existing rooms.' } } };
  wardenAPI.deleteRoomType.mockRejectedValue(failure);
  let confirmation;
  vi.spyOn(Modal, 'confirm').mockImplementation(options => { confirmation = options; return { destroy() {} }; });
  render(<WardenRoomTemplates />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage Room Templates' }));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText('Single Room');
  fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
  await act(async () => { await expect(confirmation.onOk()).rejects.toBe(failure); });
  expect(dialog.getByText('Single Room')).toBeInTheDocument();
  await screen.findByText(failure.response.data.message);
});

