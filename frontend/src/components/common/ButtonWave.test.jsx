import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ButtonWave from './ButtonWave';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockLayout(reduced = false) {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 20, top: 30, width: 100, height: 40,
  });
}

function renderButtons(reduced = false) {
  mockLayout(reduced);
  return render(<>
    <ButtonWave />
    <button type="button"><span>Native</span></button>
    <button type="button" className="ant-btn ant-btn-variant-outlined">Ant outlined</button>
    <button type="button" className="ant-btn ant-btn-variant-text">Ant text</button>
    <a href="#target" className="ant-btn ant-btn-variant-link">Ant link</a>
    <button type="button" disabled>Disabled</button>
    <button type="button" className="ant-btn ant-btn-loading">Loading</button>
  </>);
}

const rings = () => document.querySelectorAll('.button-wave');

it('adds one ripple per click to native, text and link buttons', () => {
  const view = renderButtons();
  const native = screen.getByRole('button', { name: 'Native' });
  fireEvent.click(within(native).getByText('Native'));
  fireEvent.click(native);
  vi.advanceTimersByTime(20);
  expect(rings()).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Ant text' }));
  fireEvent.click(screen.getByRole('link', { name: 'Ant link' }));
  vi.advanceTimersByTime(20);
  expect(rings()).toHaveLength(3);
  view.unmount();
  expect(rings()).toHaveLength(0);
});

it('keeps the native Ant Design ripple for stable buttons and skips disabled and loading controls', () => {
  renderButtons();
  for (const name of ['Ant outlined', 'Disabled', 'Loading']) {
    fireEvent.click(screen.getByRole('button', { name }));
  }
  vi.advanceTimersByTime(20);
  expect(rings()).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Ant outlined' })).not.toHaveAttribute('data-button-wave-moving');
});

it('respects reduced motion', () => {
  renderButtons(true);
  fireEvent.click(screen.getByRole('button', { name: 'Native' }));
  vi.advanceTimersByTime(20);
  expect(rings()).toHaveLength(0);
});

it.each(['', 'ant-btn ant-btn-variant-outlined'])('runs the click immediately and suppresses a moved button ripple (%s)', className => {
  const bounds = mockLayout();
  const action = vi.fn(() => bounds.mockReturnValue({ left: 45, top: 30, width: 100, height: 40 }));
  render(<><ButtonWave /><button className={className} onClick={action}>Move button</button></>);
  const button = screen.getByRole('button', { name: 'Move button' });
  fireEvent.click(button);
  expect(action).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(20);
  expect(action).toHaveBeenCalledTimes(1);
  expect(rings()).toHaveLength(0);
  if (className) expect(button).toHaveAttribute('data-button-wave-moving');
});

it('preserves immediate form submission', () => {
  mockLayout();
  const submit = vi.fn(event => event.preventDefault());
  render(<><ButtonWave /><form onSubmit={submit}><button type="submit">Save</button></form></>);
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
});

it('removes a visible fallback ripple when the clicked button moves later', () => {
  renderButtons();
  const button = screen.getByRole('button', { name: 'Native' });
  fireEvent.click(button);
  vi.advanceTimersByTime(20);
  expect(rings()).toHaveLength(1);
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 60, width: 100, height: 40 });
  vi.advanceTimersByTime(20);
  expect(rings()).toHaveLength(0);
});
