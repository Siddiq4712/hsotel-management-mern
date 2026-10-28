import React, { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Modal, message } from 'antd';
import WorkspaceScope, { ScopeAnchor, ScopeControls, useScopeDraft } from './WorkspaceScope';

vi.mock('antd', () => ({
  Form: { Provider: ({ children }) => <>{children}</> },
  Modal: { confirm: vi.fn() }, message: { info: vi.fn() },
  Select: ({ options, value, onChange, 'aria-label': label }) => <select aria-label={label} value={value ?? ''} onChange={event => onChange(Number(event.target.value))}>
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
}));
function Entry({ busy }) {
  const [draft, setDraft] = useState('');
  useScopeDraft(Boolean(draft), busy);
  return <><h2>Page heading</h2><ScopeAnchor /><input aria-label="Draft" value={draft} onChange={event => setDraft(event.target.value)} />
    <ScopeControls><button>Refresh preview</button></ScopeControls></>;
}
function Page({ busy = false }) {
  const [id, setId] = useState(1);
  return <WorkspaceScope label="Hostel" value={id} onChange={setId} scope={{ kind: 'hostel', id }}
    options={[{ value: 1, label: 'Hostel A' }, { value: 2, label: 'Hostel B' }]}><Entry busy={busy} /></WorkspaceScope>;
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it('keeps the original scope and draft until discard is explicitly confirmed', () => {
  render(<Page />);
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Unsubmitted expense' } });
  fireEvent.change(screen.getByLabelText('Hostel'), { target: { value: '2' } });
  expect(screen.getByLabelText('Hostel')).toHaveValue('1');
  expect(screen.getByLabelText('Draft')).toHaveValue('Unsubmitted expense');
  expect(Modal.confirm).toHaveBeenCalledWith(expect.objectContaining({ okText: 'Discard and switch', cancelText: 'Keep editing' }));
});
it('switches and resets child forms only after confirming discard', () => {
  render(<Page />);
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Draft' } });
  Modal.confirm.mockImplementation(options => options.onOk());
  fireEvent.change(screen.getByLabelText('Hostel'), { target: { value: '2' } });
  expect(screen.getByLabelText('Hostel')).toHaveValue('2');
  expect(screen.getByLabelText('Draft')).toHaveValue('');
});
it('does not switch scope during a save, and places report controls in the scope bar', () => {
  render(<Page busy />);
  fireEvent.change(screen.getByLabelText('Hostel'), { target: { value: '2' } });
  expect(screen.getByLabelText('Hostel')).toHaveValue('1');
  expect(message.info).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Refresh preview' }).closest('.workspace-scope-bar')).not.toBeNull();
  expect(screen.getByLabelText('Hostel scope').parentElement).toHaveClass('workspace-scope-anchor');
});
