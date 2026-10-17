// Shared defaults for every signed-in workspace, including portal dialogs.
const workspaceTheme = {
  token: {
    colorPrimary: '#2563eb',
    colorBgLayout: '#f4f7fb',
    colorBgContainer: '#ffffff',
    colorText: '#1e293b',
    colorTextSecondary: '#64748b',
    colorBorder: '#e2e8f0',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    borderRadius: 10,
    borderRadiusLG: 16,
    controlHeight: 40,
    controlHeightLG: 44,
    controlHeightSM: 32,
    padding: 16,
    paddingLG: 24,
  },
  components: {
    Button: { fontWeight: 600, primaryShadow: 'none' },
    Card: { bodyPadding: 24, headerFontSize: 16 },
    Table: {
      headerBg: '#f8fafc', headerColor: '#475569', headerSplitColor: 'transparent',
      rowHoverBg: '#f8fafc', borderColor: '#e2e8f0',
      cellPaddingBlock: 12, cellPaddingInline: 16,
    },
    Tabs: { horizontalItemGutter: 24, titleFontSize: 14, itemSelectedColor: '#2563eb' },
    Form: { itemMarginBottom: 24, labelColor: '#475569', labelFontSize: 14 },
    Modal: { titleFontSize: 18 },
    Input: { activeShadow: '0 0 0 3px rgb(37 99 235 / 10%)' },
    Select: { optionSelectedBg: '#eff6ff' },
    Menu: {
      itemBg: '#ffffff', subMenuItemBg: '#ffffff',
      itemColor: '#475569', itemHoverColor: '#1d4ed8',
      itemHoverBg: '#f8fafc', itemSelectedBg: '#eff6ff',
      itemSelectedColor: '#2563eb', groupTitleColor: '#64748b',
      itemHeight: 42, itemBorderRadius: 8,
      iconSize: 18, collapsedWidth: 80,
    },
  },
};

export default workspaceTheme;
