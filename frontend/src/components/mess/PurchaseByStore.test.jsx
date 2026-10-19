import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PurchaseByStore from './PurchaseByStore';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), confirm: vi.fn(), values: {}, submit: null, change: null }));
vi.mock('../../services/api', () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock('antd', () => {
  const Wrap = ({ children, onClick }) => <div onClick={onClick}>{children}</div>;
  const Form = ({ children, onFinish, onValuesChange }) => { mocks.submit = () => onFinish(mocks.values); mocks.change = onValuesChange; return <div>{children}</div>; };
  Form.useForm = () => [{ resetFields: () => { mocks.values = {}; }, setFieldsValue: values => Object.assign(mocks.values, values), getFieldsValue: () => ({...mocks.values}), submit: () => mocks.submit() }];
  Form.Item = ({ children, name }) => React.cloneElement(children, { 'aria-label': name, onChange: value => { mocks.values[name] = value; mocks.change?.(); } });
  return {
    Form, Card: Wrap, ConfigProvider: Wrap, Row: Wrap, Col: Wrap, Space: Wrap, Divider: Wrap, Tag: Wrap, Tooltip: Wrap,
    Typography: { Title: Wrap, Text: Wrap }, theme: { defaultAlgorithm: {} },
    Skeleton: Object.assign(Wrap, { Avatar: Wrap, Button: Wrap }),
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Input: ({onChange, value, 'aria-label': label}) => <input aria-label={label} value={value} onChange={onChange} />,
    InputNumber: ({ onChange, 'aria-label': label }) => <input aria-label={label} type="number" onChange={e => onChange(Number(e.target.value))} />,
    Table: ({ dataSource, columns }) => <div>{dataSource.map(row => <div key={row.item_id}>{columns.map(col => <div key={col.key}>{col.render?.(null, row)}</div>)}</div>)}</div>,
    message: { error: vi.fn(), warning: vi.fn() }, Modal: { confirm: mocks.confirm }
  };
});
beforeEach(() => {
  vi.clearAllMocks(); mocks.values = {};
  mocks.get.mockImplementation(url => Promise.resolve({ data: { data: url === '/mess/stores'
    ? [{ id: 4, name: 'Campus Store' }]
    : [{ id: 17, name: 'Rice', unit_price: '52.50', unit_id: 2, UOM: { abbreviation: 'kg' } }, { id: 18, name: 'Sugar', unit_price: '40.00', unit_id: 2, UOM: { abbreviation: 'kg' } }] } }));
  mocks.post.mockResolvedValue({ data: { success: true } });
});
afterEach(cleanup);
it('loads the item master for a store and saves a purchase without requesting mappings', async () => {
  render(<PurchaseByStore />);
  fireEvent.click(await screen.findByText('Campus Store'));
  await screen.findByText('Rice');
  expect(screen.getByText('Sugar')).toBeInTheDocument();
  expect(mocks.get).toHaveBeenCalledWith('/mess/items');
  expect(mocks.get.mock.calls.some(([url]) => url.includes('item-stores') || /stores\/.*\/items/.test(url))).toBe(false);
  expect(mocks.values.price_17).toBe(52.5);
  fireEvent.change(screen.getByLabelText('quantity_17'), { target: { value: '3' } });
  expect(screen.getByText('₹157.50')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search master items'), { target: { value: 'Sugar' } });
  expect(screen.queryByText('Rice')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review & Save Purchase' }));
  expect(mocks.post).not.toHaveBeenCalled();
  await act(async () => { await mocks.confirm.mock.calls[0][0].onOk(); });
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/mess/inventory-purchase', { items: [{ item_id: 17, store_id: 4, quantity: 3, unit_price: 52.5, unit: 'kg', unit_id: 2 }] }));
});
it('explains an empty item master without sending the user to mapping', async () => {
  mocks.get.mockImplementation(url => Promise.resolve({ data: { data: url === '/mess/stores' ? [{ id: 4, name: 'Campus Store' }] : [] } }));
  render(<PurchaseByStore />);
  fireEvent.click(await screen.findByText('Campus Store'));
  await screen.findByText('No Master Items');
  expect(screen.queryByText('Go to Mapping')).not.toBeInTheDocument();
});
