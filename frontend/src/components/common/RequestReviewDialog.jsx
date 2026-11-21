import React from 'react';
import { Button, Modal } from 'antd';
import './RequestReviewDialog.css';

export default function RequestReviewDialog({ title, status, open, onClose, busy, resident, hostel, details = [], actions, children }) {
  const close = () => { if (!busy) onClose(); };

  return <Modal className="request-review" open={open} centered width={880}
    title={<><div className="request-review-heading">{title}</div>{status && <div className="request-review-status">{status}</div>}</>}
    onCancel={close} closable={!busy} keyboard={!busy} mask={{ closable: !busy }}
    footer={<div className="request-review-actions">
      <Button disabled={busy} onClick={close}>Close</Button>
      {actions}
    </div>}>
    {(resident || hostel) && <dl className="request-review-identity">
      {resident && <div><dt>Resident</dt><dd><strong>{resident}</strong></dd></div>}
      {hostel && <div className="request-review-hostel"><dt>Hostel</dt><dd>{hostel}</dd></div>}
    </dl>}
    {details.length > 0 && <dl className="request-review-details">
      {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}
    </dl>}
    {children}
  </Modal>;
}
