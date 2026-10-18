import React from 'react';
import { beforeAll, beforeEach, afterEach, afterAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message } from 'antd';
import moment from 'moment';
import MessExpenses from './MessExpenses';
import { messAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ messAPI: {
  getExpenseTypes: vi.fn(), getMessDailyExpenses: vi.fn(), createMessDailyExpense: vi.fn(), updateMessDailyExpense: vi.fn(), deleteMessDailyExpense: vi.fn(),
  createExpenseType: vi.fn(), updateExpenseType: vi.fn(), deleteExpenseType: vi.fn(),
} }));
// Isolate the screen's filtering, totals, and API payloads from Ant Design's
// portal animations. The actual controls and layout are also checked in-browser.
vi.mock('../common/MomentPickers', async () => {
  const React = await import('react'); const moment = (await import('moment')).default;
  const DatePicker = ({ value, onChange, id }) => <input id={id} value={value?.format('DD MMM YYYY') || ''}
    onChange={event => onChange(moment(event.target.value, 'DD MMM YYYY', true))} />;
  DatePicker.RangePicker = ({ value, onChange, placeholder }) => {
    const [range, setRange] = React.useState(['', '']);
    React.useEffect(() => { setRange(value ? value.map(date => date.format('DD MMM YYYY')) : ['', '']); }, [value]);
    return <div>{range.map((text, index) => <input key={index} placeholder={placeholder[index]} value={text} onChange={event => {
      const next = [...range]; next[index] = event.target.value; setRange(next);
      if (next.every(Boolean)) onChange(next.map(date => moment(date, 'DD MMM YYYY', true)));
    }} />)}</div>;
  };
  return { DatePicker };
});
vi.mock('antd', async () => {
  const React = await import('react');
  const Context = React.createContext(null);
  const Wrap = ({ children }) => <div>{children}</div>;
  const Form = ({ form, name, children, onFinish, initialValues = {} }) => {
    const [, refresh] = React.useReducer(value => value + 1, 0);
    form.refresh = refresh; form.initial ||= initialValues;
    for (const [key, value] of Object.entries(form.initial)) if (!(key in form.values)) form.values[key] = value;
    return <Context.Provider value={{ form, name }}><form onSubmit={event => { event.preventDefault(); onFinish({ ...form.values }); }}>{children}</form></Context.Provider>;
  };
  Form.useForm = () => {
    const [form] = React.useState(() => ({ values: {}, setFieldsValue(values) { Object.assign(this.values, values); this.refresh?.(); },
      resetFields() { this.values = { ...this.initial }; this.refresh?.(); } }));
    return [form];
  };
  Form.Item = ({ name, label, children }) => {
    const { form, name: formName } = React.useContext(Context); const id = `${formName}-${name}`;
    return <div><label htmlFor={id}>{label}</label>{React.cloneElement(children, { id, value: form.values[name],
      onChange: next => form.setFieldsValue({ [name]: next?.target ? next.target.value : next }) })}</div>;
  };
  const Input = ({ prefix, allowClear, value, ...props }) => <input {...props} value={value ?? ''} />;
  Input.TextArea = ({ value, ...props }) => <textarea {...props} value={value ?? ''} />;
  const Select = ({ options, value, onChange, placeholder, id, 'aria-label': label }) => <select id={id} aria-label={label} value={value ?? ''}
    onChange={event => onChange(options.find(option => String(option.value) === event.target.value)?.value)}>
    <option value="">{placeholder}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
  const List = ({ dataSource, renderItem }) => <ul>{dataSource.map(row => <React.Fragment key={row.id}>{renderItem(row)}</React.Fragment>)}</ul>;
  List.Item = ({ children }) => <li>{children}</li>;
  const Popconfirm = ({ children, title, onConfirm }) => {
    const [open, setOpen] = React.useState(false);
    return <>{React.cloneElement(children, { onClick: () => setOpen(true) })}{open && <div role="dialog">{title}<button onClick={async () => {
      try { await onConfirm(); setOpen(false); } catch { /* Screen displays the API error. */ }
    }}>Delete</button></div>}</>;
  };
  const Table = ({ dataSource, columns, onChange, pagination, locale }) => {
    const active = columns.find(column => column.sortOrder); const rows = [...dataSource];
    if (active) rows.sort((a,b) => active.sorter(a,b) * (active.sortOrder === 'ascend' ? 1 : -1));
    return <table><thead><tr>{columns.map(column => <th key={column.key} onClick={() => column.sorter && onChange({ current: 1, pageSize: pagination.pageSize }, {},
      { columnKey: column.key, order: column.sortOrder === 'ascend' ? 'descend' : 'ascend' })}>{column.title}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row[column.dataIndex], row) : row[column.dataIndex]}</td>)}</tr>)}
        {!rows.length && <tr><td>{locale.emptyText}</td></tr>}</tbody></table>;
  };
  return {
    Form, Input, Select, Table, List, Popconfirm, Row: Wrap, Col: Wrap, Space: Wrap, Tag: Wrap,
    Card: ({ title, extra, children }) => <section><h2>{title}</h2>{extra}{children}</section>,
    Typography: { Title: ({ children }) => <h1>{children}</h1>, Text: ({ children }) => <span>{children}</span>, Paragraph: Wrap },
    Alert: ({ title }) => <div role="alert">{title}</div>,
    Modal: ({ open, title, children }) => open ? <div role="dialog">{title}{children}</div> : null,
    Button: ({ children, onClick, disabled, htmlType = 'button', 'aria-label': label }) => <button type={htmlType} aria-label={label} onClick={onClick} disabled={disabled}>{children}</button>,
    InputNumber: ({ value, onChange, id, precision = 2 }) => <input id={id} value={value == null ? '' : Number(value).toFixed(precision)} onChange={event => onChange(Number(event.target.value))} />,
    message: { success: vi.fn(), error: vi.fn(), destroy() {} },
  };
});
const categories = [{ id: 1, name: 'Gas', description: 'Kitchen fuel' }, { id: 2, name: 'Transport' }];
const expenses = [
  { id: 1, expense_date: '2026-10-10', expense_type_id: 1, amount: '300.00', description: 'Cylinder refill', ExpenseType: categories[0], hostel_id: 1, hostel_name: 'Hostel A', RecordedBy: { userName: 'Kitchen staff' } },
  { id: 2, expense_date: '2026-10-12', expense_type_id: 2, amount: '900.00', description: 'Van fuel', ExpenseType: categories[1], hostel_id: 2, hostel_name: 'Hostel B' },
  { id: 3, expense_date: '2026-10-11', expense_type_id: 1, amount: '100.00', description: 'Service charge', ExpenseType: categories[0], hostel_id: 1, hostel_name: 'Hostel A' },
];
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.clearAllMocks();
  messAPI.getExpenseTypes.mockResolvedValue({ data: { data: categories } });
  messAPI.getMessDailyExpenses.mockResolvedValue({ data: { data: expenses } });
  for (const name of ['createMessDailyExpense','updateMessDailyExpense','deleteMessDailyExpense','createExpenseType','updateExpenseType','deleteExpenseType']) {
    messAPI[name].mockResolvedValue({ data: { success: true } });
  }
});
afterEach(() => { cleanup(); message.destroy(); });
afterAll(() => vi.unstubAllGlobals());
const choose = async (label, option) => {
  const control = screen.getByRole('combobox', { name: label });
  fireEvent.change(control, { target: { value: within(control).getByRole('option', { name: option }).value } });
};
const notesInOrder = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map(row => row.textContent);

it('sorts expense rows and combines search, category, hostel, and date filters with a matching total', async () => {
  const { container } = render(<MessExpenses />);
  await screen.findByText('Cylinder refill');
  expect(notesInOrder()[0]).toContain('Van fuel');
  fireEvent.click(screen.getByRole('columnheader', { name: /Amount/ }));
  expect(notesInOrder()[0]).toContain('Service charge');
  expect(container.querySelector('.expense-results-summary')).toHaveTextContent('₹1,300.00');
  fireEvent.change(screen.getByRole('textbox', { name: 'Search expenses' }), { target: { value: 'Cylinder' } });
  expect(screen.queryByText('Van fuel')).not.toBeInTheDocument();
  expect(container.querySelector('.expense-results-summary')).toHaveTextContent('₹300.00');
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await choose('Filter by category', 'Gas');
  await choose('Filter by hostel', 'Hostel A');
  expect(container.querySelector('.expense-results-summary')).toHaveTextContent('2 of 3 expenses');
  expect(container.querySelector('.expense-results-summary')).toHaveTextContent('₹400.00');
  const from = screen.getByPlaceholderText('From date'); const to = screen.getByPlaceholderText('To date');
  fireEvent.change(from, { target: { value: '11 Oct 2026' } });
  fireEvent.keyDown(from, { key: 'Enter', keyCode: 13 });
  fireEvent.change(to, { target: { value: '12 Oct 2026' } });
  fireEvent.keyDown(to, { key: 'Enter', keyCode: 13 });
  await waitFor(() => expect(container.querySelector('.expense-results-summary')).toHaveTextContent('1 of 3 expenses'));
  expect(screen.getByText('Service charge')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(notesInOrder()[0]).toContain('Van fuel');
  expect(container.querySelector('.expense-results-summary')).toHaveTextContent('3 of 3 expenses');
}, 30000);

it('records an expense with the formatted date and keeps editing and cancel actions working', async () => {
  render(<MessExpenses />);
  await screen.findByText('Cylinder refill');
  await choose('Category', 'Gas');
  fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '150' } });
  fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'New fuel purchase' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record expense' }));
  await waitFor(() => expect(messAPI.createMessDailyExpense).toHaveBeenCalledWith(expect.objectContaining({ expense_type_id: 1, amount: 150, expense_date: moment().format('YYYY-MM-DD'), description: 'New fuel purchase' })));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit expense 1' }));
  expect(screen.getByLabelText('Amount (₹)')).toHaveValue('300.00');
  fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '350' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(messAPI.updateMessDailyExpense).toHaveBeenCalledWith(1, expect.objectContaining({ amount: 350, expense_date: '2026-10-10' })));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit expense 3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
  expect(screen.getByRole('button', { name: 'Record expense' })).toBeInTheDocument();
  expect(messAPI.updateMessDailyExpense).toHaveBeenCalledTimes(1);
}, 30000);

it('confirms deletion and preserves category management', async () => {
  render(<MessExpenses />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete expense 2' }));
  expect(messAPI.deleteMessDailyExpense).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Delete', exact: true }));
  await waitFor(() => expect(messAPI.deleteMessDailyExpense).toHaveBeenCalledWith(2));
  fireEvent.click(screen.getByRole('button', { name: 'Manage categories' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Edit category Gas' }));
  fireEvent.change(within(dialog).getByLabelText('Category name'), { target: { value: 'Kitchen gas' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save category' }));
  await waitFor(() => expect(messAPI.updateExpenseType).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Kitchen gas', description: 'Kitchen fuel' })));
}, 30000);

it('shows a loading error with a refresh path instead of failing silently', async () => {
  messAPI.getMessDailyExpenses.mockRejectedValueOnce(new Error('Offline'));
  render(<MessExpenses />);
  await screen.findByText('Unable to load expenses. Please refresh and try again.');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByText('Cylinder refill');
}, 30000);
