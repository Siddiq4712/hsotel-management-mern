import React from 'react';
import { Alert } from 'antd';

const dismissInfo = { closeIcon: true, 'aria-label': 'Dismiss information' };

export default function WorkspaceAlert({ type, banner, closable, ...props }) {
  const severity = type ?? (banner ? 'warning' : 'info');
  return (
    <Alert
      key={severity}
      type={type}
      banner={banner}
      closable={closable ?? (severity === 'info' ? dismissInfo : undefined)}
      {...props}
    />
  );
}
