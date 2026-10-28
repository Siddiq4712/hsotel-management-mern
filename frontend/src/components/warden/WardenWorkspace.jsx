import React, { useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { adminAPI } from '../../services/api';
import WorkspaceScope from '../common/WorkspaceScope';

export default function WardenWorkspace({ children, requireHostel = false, batchRouted = false }) {
  const [hostels, setHostels] = useState([]);
  const [selected, setSelected] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    adminAPI.getHostels().then(response => {
      if (!active) return;
      const rows = (response.data.data || []).filter(row => row.is_active !== false);
      const saved = Number(sessionStorage.getItem('selectedWardenHostelId'));
      const id = rows.some(row => Number(row.id) === saved) ? saved : 'all';
      setHostels(rows); setSelected(id);
      if (id === 'all') sessionStorage.removeItem('selectedWardenHostelId');
    }).catch(failure => active && setError(failure.message || 'Unable to load hostels.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [retry]);
  const change = id => {
    if (id === 'all') sessionStorage.removeItem('selectedWardenHostelId');
    else sessionStorage.setItem('selectedWardenHostelId', String(id));
    setSelected(id);
  };
  const hostel = hostels.find(row => Number(row.id) === Number(selected));
  return <WorkspaceScope label="Hostel" selectLabel="Warden hostel" value={selected} onChange={change} loading={loading}
    scope={{ kind: 'hostel', id: hostel?.id, name: hostel?.name, allHostels: !hostel }}
    options={[{ value: 'all', label: 'All hostels' }, ...hostels.map(row => ({ value: row.id, label: row.name }))]}
    description={batchRouted ? 'Student enrollment follows the hostel assigned to each batch.' : hostel ? `Working in ${hostel.name}` : 'Browse all hostels. Choose one before creating a hostel-specific entry.'}>
    {loading ? <Alert type="info" title="Loading hostel scope..." /> : error
      ? <Alert type="error" title={error} action={<Button onClick={() => setRetry(value => value + 1)}>Retry</Button>} />
      : requireHostel && !hostel ? <Alert type="info" showIcon title="Choose a hostel to manage its rooms or layout." /> : children}
  </WorkspaceScope>;
}
