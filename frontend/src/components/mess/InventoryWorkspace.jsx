import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { inventoryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import WorkspaceScope from '../common/WorkspaceScope';

export const InventoryContext = createContext(null);
export const useInventoryWorkspace = () => useContext(InventoryContext);

export default function InventoryWorkspace({ children, allowUnassigned = false, pageName = 'this page' }) {
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
      const active = user.role === 'admin' ? pools.find(pool => pool.id === remembered && (pool.hostels.length || allowUnassigned)) : pools[0];
      setSelected(active?.id || null);
      if (active) sessionStorage.setItem('selectedInventoryId', String(active.id));
      else sessionStorage.removeItem('selectedInventoryId');
    } catch (error) { setError(error.response?.data?.message || 'Unable to load inventory assignments.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [user.userId, user.role, allowUnassigned]);
  const inventory = inventories.find(pool => pool.id === selected);
  const change = id => {
    sessionStorage.setItem('selectedInventoryId', String(id));
    setSelected(id);
  };
  return <WorkspaceScope scope={{ kind: 'inventory', id: inventory?.id, name: inventory?.name }} label="Inventory"
    selectLabel="Inventory for stock management" value={selected} loading={loading} onChange={change}
    options={user.role === 'admin' ? inventories.map(pool => ({ value: pool.id, label: pool.name, disabled: !allowUnassigned && !pool.hostels.length })) : null}
    description={inventory ? `Supplies: ${inventory.hostels.map(hostel => hostel.name).join(', ') || 'No hostels assigned'}` : 'Choose the inventory you want to work with.'}
    actions={user.role === 'admin' && <Button href="/manage-inventories?workspace=admin">Manage inventories</Button>}>
    {error ? <Alert type="error" showIcon title={error} action={<Button onClick={load}>Retry</Button>} />
      : loading ? <Alert type="info" title="Loading inventories..." />
        : inventory ? <InventoryContext.Provider value={inventory}><React.Fragment key={inventory.id}>{children}</React.Fragment></InventoryContext.Provider>
          : <Alert type="info" showIcon title={user.role === 'admin' ? `Choose an inventory to view ${pageName}.` : 'Ask an administrator to assign your hostel to an inventory.'} />}
  </WorkspaceScope>;
}
