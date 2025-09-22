// src/components/mess/InventoryManagement.jsx
import React, { useState, useEffect } from 'react';
import { Tabs, Card } from 'antd';
import ItemPurchaseForm from './ItemPurchaseForm';
import ItemStoreMapping from './ItemStoreMapping';

const { TabPane } = Tabs;

const InventoryManagement = () => {
  return (
    <Card title="Inventory Management" bordered={false}>
      <Tabs defaultActiveKey="purchases">
        <TabPane tab="Item Purchases" key="purchases">
          <ItemPurchaseForm />
        </TabPane>
        <TabPane tab="Store Mappings" key="stores">
          <ItemStoreMapping />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default InventoryManagement;
