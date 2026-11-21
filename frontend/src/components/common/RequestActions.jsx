import React from 'react';
import { Button } from 'antd';
import { Check } from 'lucide-react';
import './RequestActions.css';

export const requestActionsColumnWidth = 268;

export default function RequestActions({ onAccept, onReview, onReject, reviewLabel, disabled, acceptDisabled }) {
  return (
    <div className="request-actions">
      <Button className="request-action-review" type="primary" disabled={disabled} aria-label={reviewLabel} onClick={onReview}>Review</Button>
      {onAccept && <Button className="request-action-accept" icon={<Check size={15} aria-hidden="true" />}
        disabled={disabled || acceptDisabled} onClick={onAccept}>Accept</Button>}
      {onReject && <Button className="request-action-reject" danger disabled={disabled} onClick={onReject}>Reject</Button>}
    </div>
  );
}
