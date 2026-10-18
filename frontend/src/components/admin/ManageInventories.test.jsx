import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ManageInventories from './ManageInventories';
import { adminAPI, inventoryAPI } from '../../services/api';

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), error: vi.fn() }));
vi.mock('../../services/api', () => ({ adminAPI: { getHostels: vi.fn() }, inventoryAPI: { list: vi.fn(), delete: vi.fn() } }));
vi.mock('antd', () => {
  const Wrap = ({ children }) => <div>{children}</div>;
  const Modal = () => null;
  Modal.confirm = mocks.confirm;
  const Form = Wrap;
  Form.useForm = () => [{ setFieldsValue() {} }]; Form.Item = Wrap;
  const Input = Wrap; Input.TextArea = Wrap;
  return {
    Alert: Wrap, Form, Input, Modal, Select: Wrap, Space: Wrap, Tag: Wrap,
    Typography: { Title: Wrap, Text: Wrap }, message: { success: vi.fn(), error: mocks.error },
    Button: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    Table: ({ dataSource, columns }) => <div>{dataSource.map(pool => <div key={pool.id}>{pool.name}{columns.at(-1).render(null, pool)}</div>)}</div>,
  };
});
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear();
  adminAPI.getHostels.mockResolvedValue({ data: { data: [] } });
  inventoryAPI.list.mockResolvedValue({ data: { data: [{ id: 10, name: 'Empty inventory', hostels: [] }] } });
  inventoryAPI.delete.mockResolvedValue({ data: { success: true } });
});
afterEach(cleanup);

it('requires confirmation before deletion and refreshes the list after success', async () => {
  sessionStorage.setItem('selectedInventoryId', '10');
  render(<ManageInventories />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
  expect(inventoryAPI.delete).not.toHaveBeenCalled();
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete Empty inventory?', okButtonProps: { danger: true } }));
  await act(async () => mocks.confirm.mock.calls[0][0].onOk());
  expect(inventoryAPI.delete).toHaveBeenCalledWith(10);
  expect(inventoryAPI.list).toHaveBeenCalledTimes(2);
  expect(sessionStorage.getItem('selectedInventoryId')).toBeNull();
});

it('disables deletion for an assigned inventory', async () => {
  inventoryAPI.list.mockResolvedValue({ data: { data: [{ id: 10, name: 'Assigned inventory', hostels: [{ id: 1, name: 'Hostel A' }] }] } });
  render(<ManageInventories />);
  expect(await screen.findByRole('button', { name: 'Delete' })).toBeDisabled();
  expect(inventoryAPI.delete).not.toHaveBeenCalled();
});

it('keeps inventory selection and shows the backend reason when history blocks deletion', async () => {
  sessionStorage.setItem('selectedInventoryId', '10');
  inventoryAPI.delete.mockRejectedValue({ response: { data: { message: 'This inventory has stock or history and cannot be deleted.' } } });
  render(<ManageInventories />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
  await act(async () => {
    await expect(mocks.confirm.mock.calls[0][0].onOk()).rejects.toBeDefined();
  });
  expect(mocks.error).toHaveBeenCalledWith('This inventory has stock or history and cannot be deleted.');
  expect(sessionStorage.getItem('selectedInventoryId')).toBe('10');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).not.toBeDisabled());
});
