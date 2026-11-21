import React from 'react';
import WorkspacePageHeader from '../common/WorkspacePageHeader';

export const inventoryTheme = {
  token: { colorPrimary: '#2563eb', fontFamily: 'inherit', controlHeight: 40 },
  components: {
    Table: { headerBg: '#f8fafc', headerColor: '#475569', cellPaddingBlock: 14, cellPaddingInline: 16 },
    Card: { paddingLG: 20 },
    Button: { primaryShadow: 'none', defaultShadow: 'none' },
  },
};

export default function InventoryPageHeader({ title, description, children }) {
  return <WorkspacePageHeader title={title} description={description}>{children}</WorkspacePageHeader>;
}
