import React from 'react';
import { Typography } from 'antd';

export default function WorkspacePageHeader({ id, title, description, icon: Icon, children }) {
  return (
    <header className="module-page-header">
      <div className="flex min-w-0 items-center gap-4">
        {Icon && <div className="workspace-page-icon"><Icon size={22} aria-hidden="true" /></div>}
        <div className="min-w-0">
          <Typography.Title id={id} level={2}>{title}</Typography.Title>
          {description && <Typography.Text type="secondary">{description}</Typography.Text>}
        </div>
      </div>
      {children && <div className="workspace-page-actions">{children}</div>}
    </header>
  );
}
