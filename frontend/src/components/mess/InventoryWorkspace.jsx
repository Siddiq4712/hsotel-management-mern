import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from 'antd';
import Alert from '../common/WorkspaceAlert';
import { Link } from 'react-router-dom';
import { inventoryAPI } from '../../services/api';
import { useStaffWorkspace } from '../../context/StaffWorkspaceContext';
import WorkspaceScope from '../common/WorkspaceScope';

export const InventoryContext = createContext(null);
export const useInventoryWorkspace = () => useContext(InventoryContext);

export default function InventoryWorkspace({ children, pageName = 'this page' }) {
  const staff = useStaffWorkspace();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    inventoryAPI.list().then(({ data }) => {
      if (active) setInventory(data.data?.[0] || null);
    }).catch(failure => {
      if (active) setError(failure.message || 'Unable to load the inventory assignment.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [staff?.id, revision]);

  const name = inventory?.name || staff?.inventory?.name;
  const context = [staff && `Workspace hostel: ${staff.hostel.name}`,
    inventory?.hostels.length && `Supplies: ${inventory.hostels.map(hostel => hostel.name).join(', ')}`].filter(Boolean).join(' · ');
  return (
    <WorkspaceScope scope={{ kind: 'inventory', id: inventory?.id, name }} label="Inventory" description={context}
      actions={staff && <Link to="/manage-inventories?workspace=admin">Manage inventories</Link>}>
      {loading ? <Alert type="info" title="Loading assigned inventory..." />
        : error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => setRevision(value => value + 1)}>Retry</Button>} />
          : inventory ? <InventoryContext.Provider value={inventory}>{children}</InventoryContext.Provider>
            : <Alert type="warning" showIcon title={`An inventory assignment is required to open ${pageName}.`} />}
    </WorkspaceScope>
  );
}
