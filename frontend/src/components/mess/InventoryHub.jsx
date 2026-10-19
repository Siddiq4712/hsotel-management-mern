import React from 'react';
import { Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import ItemManagement from './ItemManagement';
import StockManagement from './StockManagement';
import InventoryManagement from './InventoryManagement';
import './InventoryHub.css';

const tabKeys = ['items', 'stock', 'purchases'];

export default function InventoryHub({ initialTab = 'stock' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('inventoryTab');
  const activeTab = tabKeys.includes(requestedTab) ? requestedTab : initialTab;

  function changeTab(tab) {
    const next = new URLSearchParams(searchParams);
    next.set('inventoryTab', tab);
    setSearchParams(next);
  }

  return (
    <section className="inventory-hub" aria-label="Inventory management">
      <Typography.Title level={2}>Inventory Management</Typography.Title>
      <Typography.Paragraph type="secondary">
        Item names are shared across inventories. Stock balances and purchase history belong to the selected inventory.
      </Typography.Paragraph>
      <Tabs activeKey={activeTab} onChange={changeTab} destroyOnHidden items={[
        { key: 'items', label: 'Items', children: <ItemManagement /> },
        { key: 'stock', label: 'Current Stock', children: <StockManagement /> },
        { key: 'purchases', label: 'Purchase History', children: <InventoryManagement /> },
      ]} />
    </section>
  );
}
