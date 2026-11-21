import React from 'react';

export default function WorkspaceToolbar({ children, className = '' }) {
  return <div className={`workspace-toolbar ${className}`}>{children}</div>;
}
