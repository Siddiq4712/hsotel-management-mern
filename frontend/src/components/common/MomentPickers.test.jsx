import React, { useState } from 'react';
import { beforeAll, afterAll, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import moment from 'moment';
import { DatePicker, Calendar } from './MomentPickers';

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());
const cell = async date => {
  let element;
  await waitFor(() => {
    element = document.querySelector(`td[title="${date}"].ant-picker-cell-in-view .ant-picker-cell-inner`);
    expect(element).toBeTruthy();
  });
  return element;
};

it('opens and navigates a date calendar without changing the original date or jumping years', async () => {
  const user = userEvent.setup();
  const original = moment('2026-10-17', 'YYYY-MM-DD', true);
  const changed = vi.fn();
  function Entry() {
    const [value, setValue] = useState(original);
    return <DatePicker aria-label="Consumption date" value={value} open onChange={next => { changed(next); setValue(next); }} />;
  }
  render(<Entry />);
  const hover = await cell('2026-10-23');
  expect(screen.getByRole('textbox', { name: 'Consumption date' })).toHaveValue('2026-10-17');
  await user.hover(hover);
  expect(original.format('YYYY-MM-DD')).toBe('2026-10-17');
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox', { name: 'Consumption date' }).value).toMatch(/^2026-10-/);
  await user.click(document.querySelector('.ant-picker-header-next-btn'));
  await user.click(await cell('2026-11-05'));
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Consumption date' })).toHaveValue('2026-11-05'));
  expect(moment.isMoment(changed.mock.calls.at(-1)[0])).toBe(true);
  expect(original.format('YYYY-MM-DD')).toBe('2026-10-17');
}, 30000);

it('keeps both range boundaries unchanged while hovering and accepts a new date range', async () => {
  const start = moment('2026-10-10'); const end = moment('2026-10-12');
  const changed = vi.fn();
  render(<DatePicker.RangePicker value={[start, end]} open onChange={changed} />);
  fireEvent.mouseEnter(await cell('2026-10-17'));
  expect(start.format('YYYY-MM-DD')).toBe('2026-10-10');
  expect(end.format('YYYY-MM-DD')).toBe('2026-10-12');
  fireEvent.click(screen.getByPlaceholderText('Start date'));
  fireEvent.click(await cell('2026-10-17'));
  fireEvent.click(await cell('2026-10-20'));
  await waitFor(() => expect(changed).toHaveBeenCalled());
  expect(changed.mock.calls.at(-1)[0].map(date => date.format('YYYY-MM-DD'))).toEqual(['2026-10-17', '2026-10-20']);
  expect(start.format('YYYY-MM-DD')).toBe('2026-10-10');
  expect(end.format('YYYY-MM-DD')).toBe('2026-10-12');
}, 30000);

it('selects a year without mutating the value used by the form', async () => {
  const original = moment('2026-10-17'); const changed = vi.fn();
  render(<DatePicker picker="year" value={original} open onChange={changed} />);
  fireEvent.click(await screen.findByText('2027', { selector: '.ant-picker-cell-inner' }));
  expect(changed.mock.calls[0][0].year()).toBe(2027);
  expect(original.year()).toBe(2026);
}, 30000);

it('renders and selects dates in the meal planner calendar without advancing the supplied month', async () => {
  const original = moment('2026-10-17'); const selected = vi.fn();
  render(<Calendar value={original} onSelect={selected} />);
  fireEvent.click(await cell('2026-10-20'));
  expect(moment.isMoment(selected.mock.calls[0][0])).toBe(true);
  expect(selected.mock.calls[0][0].format('YYYY-MM-DD')).toBe('2026-10-20');
  expect(original.format('YYYY-MM-DD')).toBe('2026-10-17');
}, 30000);
