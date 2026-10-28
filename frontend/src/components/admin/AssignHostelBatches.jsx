import React, { useEffect, useState } from 'react';
import { Alert, Modal, Select, message } from 'antd';
import { adminAPI } from '../../services/api';

export default function AssignHostelBatches({ hostel, onClose, onSaved }) {
  const [batches, setBatches] = useState([]), [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    if (!hostel) return;
    let cancelled = false;
    setLoading(true); setError(''); setSelected([]);
    adminAPI.getSessions().then(response => {
      if (cancelled) return;
      const data = response.data.data || [];
      setBatches(data); setSelected(data.filter(batch => batch.hostel_id === hostel.id && batch.is_active).map(batch => batch.id));
    }).catch(() => { if (!cancelled) setError('Unable to load batches. Close and try again.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hostel]);
  const save = async () => {
    setSaving(true);
    try { await adminAPI.assignHostelBatches(hostel.id, { batch_ids: selected }); message.success('Batches assigned. Use Review Batch Allocation in Manage Batches to update existing students.'); await onSaved(); onClose(); }
    catch (failure) { message.error(failure.response?.data?.message || 'Unable to assign batches'); }
    finally { setSaving(false); }
  };
  return <Modal title={`Assign Batches — ${hostel?.name || ''}`} open={Boolean(hostel)} onCancel={() => !saving && onClose()} onOk={save} okText="Assign Batches" confirmLoading={saving} okButtonProps={{ disabled: loading || Boolean(error) || !selected.length }}>
    <Alert type={error ? 'error' : 'info'} title={error || 'A hostel can contain several batches. Batches assigned elsewhere are unavailable.'} description="To move a batch to another hostel, edit that batch in Manage Batches and review the student allocation." className="mb-4" />
    <Select aria-label="Batches assigned to hostel" mode="multiple" showSearch optionFilterProp="label" loading={loading} disabled={loading || saving} style={{ width: '100%' }} value={selected} onChange={setSelected} placeholder="Choose batches" options={batches.filter(batch => batch.is_active).map(batch => ({ value: batch.id, label: `${(batch.college ?? 'nec').toUpperCase()} — ${batch.name} (${batch.gender || 'Gender needs setup'})${batch.hostel_id && batch.hostel_id !== hostel?.id ? ` — ${batch.hostel_name}` : ''}${(!batch.erp_batch_year || !batch.gender) ? ' — configure admission year and gender first' : ''}`, disabled: (!batch.erp_batch_year || !batch.gender) || Boolean(batch.hostel_id && batch.hostel_id !== hostel?.id) || batch.hostel_id === hostel?.id }))} />
  </Modal>;
}
