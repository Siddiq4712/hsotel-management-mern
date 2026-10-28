import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ReductionEvidence from './ReductionEvidence';
import { reductionAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ reductionAPI: { document: vi.fn() } }));
vi.mock('antd', () => ({
  App: { useApp: () => ({ message: { error: vi.fn() } }) },
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Modal: ({ open, onCancel, children }) => open ? <div><button onClick={onCancel}>Close preview</button>{children}</div> : null,
  Spin: () => null,
}));
const request = { id: 1, document: { name: 'proof.pdf', mime: 'application/pdf' } };
beforeEach(() => {
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:proof'), revokeObjectURL: vi.fn() });
  reductionAPI.document.mockReset();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('does not allocate a blob URL when a document resolves after unmount', async () => {
  let resolve;
  reductionAPI.document.mockReturnValue(new Promise(done => { resolve = done; }));
  const view = render(<ReductionEvidence role="warden" request={request} />);
  fireEvent.click(screen.getByText('View document'));
  view.unmount();
  await act(async () => resolve({ data: new Blob(['proof']) }));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it('releases an open preview on close and on unmount', async () => {
  reductionAPI.document.mockResolvedValue({ data: new Blob(['proof']) });
  const view = render(<ReductionEvidence role="warden" request={request} />);
  fireEvent.click(screen.getByText('View document'));
  fireEvent.click(await screen.findByText('Close preview'));
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('View document'));
  await screen.findByText('Close preview');
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});

it('ignores a pending response for a previous document', async () => {
  let resolve;
  reductionAPI.document.mockReturnValue(new Promise(done => { resolve = done; }));
  const view = render(<ReductionEvidence role="warden" request={request} />);
  fireEvent.click(screen.getByText('View document'));
  view.rerender(<ReductionEvidence role="warden" request={{ ...request, id: 2 }} />);
  await act(async () => resolve({ data: new Blob(['old proof']) }));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
