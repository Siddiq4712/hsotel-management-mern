import React from 'react';
import { Space, Typography } from 'antd';

export const inventoryTheme = {
  token: { colorPrimary: '#2563eb', borderRadius: 10, fontFamily: 'inherit', controlHeight: 40 },
  components: {
    Table: { headerBg: '#f8fafc', headerColor: '#475569', cellPaddingBlock: 14, cellPaddingInline: 16 },
    Card: { paddingLG: 20 },
    Button: { primaryShadow: 'none', defaultShadow: 'none' },
  },
};

export default function InventoryPageHeader({ title, description, children }) {
  return <header className="inventory-page-header">
    <div><Typography.Title level={3}>{title}</Typography.Title>
      <Typography.Text type="secondary">{description}</Typography.Text></div>
    <Space wrap className="inventory-page-actions">{children}</Space>
  </header>;
}
