import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Button, Select, Space, Typography } from 'antd';
import { inventoryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const InventoryContext = createContext(null);
export const useInventoryWorkspace = () => useContext(InventoryContext);

export default function InventoryWorkspace({ children }) {
  const { user } = useAuth();
  const [inventories, setInventories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await inventoryAPI.list();
      const pools = response.data.data || [];
      setInventories(pools);
      const remembered = Number(sessionStorage.getItem('selectedInventoryId'));
      const active = user.role === 'admin' ? pools.find(pool => pool.id === remembered && pool.hostels.length) : pools[0];
      setSelected(active?.id || null);
      if (active) sessionStorage.setItem('selectedInventoryId', String(active.id));
      else sessionStorage.removeItem('selectedInventoryId');
    } catch (error) { setError(error.response?.data?.message || 'Unable to load inventory assignments.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [user.userId, user.role]);
  const inventory = inventories.find(pool => pool.id === selected);
  const change = id => {
    sessionStorage.setItem('selectedInventoryId', String(id));
    setSelected(id);
  };
  return <div>
    <Space wrap style={{ padding: 16, marginBottom: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
      <Typography.Text strong>Inventory</Typography.Text>
      {user.role === 'admin' ? <Select aria-label="Inventory for stock management" placeholder="Select inventory" loading={loading}
        style={{ minWidth: 240 }} value={selected} onChange={change} options={inventories.map(pool => ({ value: pool.id, label: pool.name, disabled: !pool.hostels.length }))} />
        : <Typography.Text>{inventory?.name || 'No inventory assigned'}</Typography.Text>}
      {inventory && <Typography.Text type="secondary">Supplies: {inventory.hostels.map(hostel => hostel.name).join(', ')}</Typography.Text>}
      {user.role === 'admin' && <Button href="/manage-inventories?workspace=admin">Manage inventories</Button>}
    </Space>
    {error ? <Alert type="error" showIcon title={error} action={<Button onClick={load}>Retry</Button>} />
      : loading ? <Alert type="info" title="Loading inventories..." />
        : inventory ? <InventoryContext.Provider value={inventory}><React.Fragment key={inventory.id}>{children}</React.Fragment></InventoryContext.Provider>
          : <Alert type="info" showIcon title={user.role === 'admin' ? 'Choose an inventory to view its stock or create one in Manage Inventories.' : 'Ask an administrator to assign your hostel to an inventory.'} />}
  </div>;
}
