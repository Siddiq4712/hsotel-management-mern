import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Card, Input, Space, Table, Tag, Typography } from 'antd';
import { reductionAPI } from '../../services/api';
import { approvedReduction, categoryInfo, reductionCategories, reductionStatus } from '../../utils/reductionOptions';
import ReductionEvidence from '../common/ReductionEvidence';

const empty = { category: '', from_date: '', to_date: '', reason: '', activity: '' };
export default function MessReductionApplication() {
  const { message } = App.useApp();
  const [values, setValues] = useState(empty), [file, setFile] = useState(null), [editing, setEditing] = useState(null);
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const fileInput = useRef(null), submitting = useRef(false);
  const info = categoryInfo(values.category);
  const count = values.from_date && values.to_date ? Math.round((Date.parse(values.to_date) - Date.parse(values.from_date)) / 86400000) + 1 : 0;
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await reductionAPI.list('student')).data.data); }
    catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const reset = () => { setValues(empty); setFile(null); setEditing(null); if (fileInput.current) fileInput.current.value = ''; };
  const change = e => setValues(v => ({ ...v, [e.target.name]: e.target.value }));
  const submit = async e => {
    e.preventDefault();
    if (submitting.current) return;
    if (!info || !Number.isFinite(count) || count < 1 || count > 366) return message.error('Select a category and a valid date range of up to 366 days.');
    if (!file && !editing?.document) return message.error('Upload the required supporting document.');
    if (file && (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))) return message.error('Choose a PDF, PNG, or JPEG up to 5 MB.');
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.append(key, value));
    if (file) data.append('document', file);
    submitting.current = true; setSaving(true);
    try {
      const response = editing ? await reductionAPI.revise(editing.id, data) : await reductionAPI.submit(data);
      message.success(response.data.message); reset(); await load();
    } catch (error) { message.error(error.message); }
    finally { submitting.current = false; setSaving(false); }
  };
  const edit = row => {
    setEditing(row); setValues({ category: row.category || '', from_date: row.from_date, to_date: row.to_date, reason: row.reason, activity: row.activity || '' });
    setFile(null); if (fileInput.current) fileInput.current.value = '';
  };
  const cancel = async row => {
    try {
      await reductionAPI.decide('student', row.id, { action: 'cancel', remarks: 'Cancelled by student before approval.' });
      message.success('Request cancelled'); await load();
    } catch (error) { message.error(error.message); }
  };
  return <div className="module-page p-4 lg:p-8 bg-slate-50 min-h-screen space-y-5">
    <Typography.Title level={2}>Mess Reductions</Typography.Title>
    <Alert type="info" showIcon message="Documented requests need warden or admin approval"
      description="Attendance and billing are separate. Only approved operational days reduce food charges. Approval marks the requested dates OD for internship/OD, or Absent for medical leave/study holiday. Water and other charges are unchanged." />
    <Card title={editing ? `Resubmit request #${editing.id}` : 'Apply for a reduction'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">Reduction category
            <select aria-label="Reduction category" required name="category" value={values.category} onChange={change} disabled={saving} className="border rounded-lg p-2 bg-white">
              <option value="">Select a category</option>{reductionCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">Activity / organization (optional)
            <Input name="activity" aria-label="Activity or organization" maxLength={150} value={values.activity} onChange={change} disabled={saving} placeholder="NSS camp, NCC camp, college event, company…" />
          </label>
          <label className="flex flex-col gap-2">Start date
            <input aria-label="Start date" type="date" required name="from_date" value={values.from_date} onChange={change} disabled={saving} className="border rounded-lg p-2" />
          </label>
          <label className="flex flex-col gap-2">End date
            <input aria-label="End date" type="date" required name="to_date" min={values.from_date || undefined} value={values.to_date} onChange={change} disabled={saving} className="border rounded-lg p-2" />
          </label>
        </div>
        <div>{count > 0 ? `${count} requested days (both dates included). Billing counts only eligible mess operational days.` : 'Choose both dates to see the requested duration.'}</div>
        {info && <Alert type="info" message={`Required: ${info.document}. Attendance after approval: ${info.attendance}.`} />}
        <label className="flex flex-col gap-2">Reason
          <Input.TextArea aria-label="Reduction reason" name="reason" required minLength={5} maxLength={2000} rows={3} value={values.reason} onChange={change} disabled={saving} />
        </label>
        <label className="flex flex-col gap-2">Supporting document — PDF, PNG, JPEG; maximum 5 MB
          <input ref={fileInput} aria-label="Supporting document" type="file" accept="application/pdf,image/png,image/jpeg" required={!editing?.document} disabled={saving} onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        {editing?.document && <p>Current document: {editing.document.name}. Choose a replacement if the reviewer requested one.</p>}
        <Space><Button type="primary" htmlType="submit" loading={saving}>{editing ? 'Resubmit for approval' : 'Submit for approval'}</Button>{editing && <Button disabled={saving} onClick={reset}>New request</Button>}</Space>
      </form>
    </Card>
    <Card title="My requests"><Table rowKey="id" loading={loading} dataSource={rows} scroll={{ x: 900 }} columns={[
      { title: 'Category', key: 'category', render: (_, row) => <>{categoryInfo(row.category)?.label || 'Legacy request'}<div>#{row.id}</div></> },
      { title: 'Start → end date', key: 'period', render: (_, row) => <>{row.from_date} → {row.to_date}<div>{row.requested_days} days</div></> },
      { title: 'Status', key: 'status', render: (_, row) => <><Tag color={approvedReduction(row) ? 'green' : row.status === 'pending_admin' ? 'gold' : 'default'}>{reductionStatus(row)}</Tag><div>{row.admin_remarks || row.warden_remarks}</div></> },
      { title: 'Evidence', key: 'evidence', render: (_, row) => <ReductionEvidence role="student" request={row} /> },
      { title: 'Actions / history', key: 'actions', render: (_, row) => <Space direction="vertical">
        {['pending_admin', 'needs_correction', 'rejected_by_admin', 'rejected_by_warden'].includes(row.status) && <Button size="small" disabled={saving} onClick={() => edit(row)}>Edit / resubmit</Button>}
        {['pending_admin', 'needs_correction'].includes(row.status) && <Button size="small" danger disabled={saving} onClick={() => cancel(row)}>Cancel request</Button>}
        {(row.Decisions || []).slice().sort((a, b) => b.id - a.id).slice(0, 3).map(d => <small key={d.id}>{d.action} · {d.Actor?.userName || d.actor_role} · {new Date(d.createdAt).toLocaleDateString()} {d.remarks}</small>)}
      </Space> }
    ]} /></Card>
  </div>;
}
