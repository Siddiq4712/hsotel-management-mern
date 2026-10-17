import React, { useEffect, useState } from 'react';
import { Modal, Select } from 'antd';

export default function EntryHostelDialog() {
  const [queue, setQueue] = useState([]);
  const [hostelId, setHostelId] = useState();
  const pending = queue[0];
  useEffect(() => {
    const receive = event => setQueue(current => [...current, event.detail]);
    window.addEventListener('entry-hostel-required', receive);
    return () => window.removeEventListener('entry-hostel-required', receive);
  }, []);
  const finish = confirmed => {
    if (confirmed) pending.resolve(hostelId);
    else pending.reject(new Error('Cancelled. No entry was saved.'));
    setHostelId(undefined);
    setQueue(current => current.slice(1));
  };
  return <Modal title="Hostel for this entry" open={Boolean(pending)} onCancel={() => finish(false)}
    onOk={() => finish(true)} okText="Continue" okButtonProps={{ disabled: !hostelId }} destroyOnHidden>
    <p>Select the hostel for this entry. This choice applies only to this request.</p>
    <label htmlFor="entry-hostel">Hostel</label>
    <Select id="entry-hostel" aria-label="Hostel for this entry" style={{ width: '100%', marginTop: 8 }}
      placeholder="Select hostel" value={hostelId} onChange={setHostelId}
      options={(pending?.hostels || []).map(hostel => ({ value: hostel.id, label: hostel.name }))} />
  </Modal>;
}
