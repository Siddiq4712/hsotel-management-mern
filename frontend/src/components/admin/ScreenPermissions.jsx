import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import api from '../../services/api';
import { usePermissions } from '../../context/PermissionContext';
import { ACTION_LABELS, ROLE_LABELS, SCREENS, defaultPermissions, normalizeActions, permissionChanges, permissionLevel, screenById } from '../../../../shared/permissions.js';
import './ScreenPermissions.css';

const labels = { hidden: 'Hidden', view: 'View', manage: 'Manage', custom: 'Custom' };
const clone = value => JSON.parse(JSON.stringify(value));
const format = actions => actions.length ? actions.map(a => ACTION_LABELS[a]).join(', ') : 'Hidden';
export default function ScreenPermissions() {
  const { refresh } = usePermissions();
  const [saved, setSaved] = useState(null), [draft, setDraft] = useState(null);
  const [counts, setCounts] = useState({}), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [search, setSearch] = useState(''), [group, setGroup] = useState();
  const [expanded, setExpanded] = useState([]), [review, setReview] = useState(false), [reason, setReason] = useState('');
  const [bulkRole, setBulkRole] = useState('warden'), [bulkLevel, setBulkLevel] = useState('view');
  const [history, setHistory] = useState({ rows: [], count: 0 }), [historyPage, setHistoryPage] = useState(1), [historyLoading, setHistoryLoading] = useState(false);
  const changes = useMemo(() => saved && draft ? permissionChanges(saved.grants, draft) : [], [saved, draft]);
  async function load() {
    setLoading(true); setError('');
    try { const { data } = await api.get('/permissions'); setSaved(data.data); setDraft(clone(data.data.grants)); setCounts(data.data.counts); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function loadHistory(page = 1) {
    setHistoryLoading(true);
    try { const { data } = await api.get('/permissions/history', { params: { page } }); setHistory(data.data); setHistoryPage(page); }
    catch (e) { message.error(e.message); } finally { setHistoryLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const warn = event => { if (changes.length) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changes.length]);
  const rows = SCREENS.filter(s => (!group || s.group === group) && `${s.label} ${s.group}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(a.roles.length === 1) - Number(b.roles.length === 1));
  function change(role, id, actions) {
    setDraft(previous => ({ ...previous, [role]: { ...previous[role], [id]: normalizeActions(actions) } }));
  }
  function setLevel(role, s, level) {
    if (level === 'custom') { setExpanded(previous => [...new Set([...previous, s.id])]); return; }
    change(role, s.id, level === 'hidden' ? [] : level === 'view' ? ['view'] : s.actions);
  }
  function bulk() {
    setDraft(previous => {
      const next = clone(previous);
      rows.filter(s => s.roles.includes(bulkRole)).forEach(s => { next[bulkRole][s.id] = bulkLevel === 'hidden' ? [] : bulkLevel === 'view' ? ['view'] : [...s.actions]; });
      return next;
    });
  }
  async function save() {
    setSaving(true); setError('');
    try {
      const { data } = await api.put('/permissions', { revision: saved.revision, grants: draft, reason });
      setSaved(previous => ({ ...previous, ...data.data })); setDraft(clone(data.data.grants));
      setReview(false); setReason(''); message.success('Role permissions saved. Changes apply on the next request.');
      refresh(); loadHistory(1);
    } catch (e) { setError(e.message); message.error(e.message); } finally { setSaving(false); }
  }
  const roleColumns = Object.entries(ROLE_LABELS).map(([role, label]) => ({
    key: role, width: 160,
    title: <span>{label}<small className="permission-user-count">{counts[role] || 0} active accounts</small></span>,
    render: (_, s) => {
      if (role === 'admin') return <Tag color="blue">Full · protected</Tag>;
      if (!s.roles.includes(role)) return <span className="permission-na">Not applicable</span>;
      const actions = draft?.[role]?.[s.id] || [];
      return <Select aria-label={`${label}: ${s.label}`} value={permissionLevel(actions, s.id)} disabled={!draft || saving}
        style={{ width: 126 }} onChange={value => setLevel(role, s, value)}
        options={Object.entries(labels).map(([value, text]) => ({ value, label: text, disabled: value === 'custom' && s.actions.length === 1 }))} />;
    },
  }));
  const expandedRow = s => <div className="permission-actions">
    <Typography.Paragraph>{s.note || 'Choose the actions this role can perform on this screen.'} Enabling an action also enables View. Clearing View clears every action.</Typography.Paragraph>
    <Table size="small" pagination={false} rowKey="action" dataSource={s.actions.map(action => ({ action }))}
      scroll={{ x: 1250 }} columns={[
        { title: 'Action', dataIndex: 'action', width: 190, fixed: 'left', render: action => ACTION_LABELS[action] },
        ...Object.entries(ROLE_LABELS).map(([role, label]) => ({ title: label, key: role, width: 150, render: (_, { action }) =>
          !s.roles.includes(role) ? '—' : <Checkbox aria-label={`${label}: ${s.label}: ${ACTION_LABELS[action]}`}
            disabled={role === 'admin' || saving} checked={draft?.[role]?.[s.id]?.includes(action)} onChange={event => {
              const previous = draft[role][s.id];
              change(role, s.id, event.target.checked ? [...previous, action] : action === 'view' ? [] : previous.filter(a => a !== action));
            }} />,
        })),
      ]} />
  </div>;
  const changeColumns = [
    { title: 'Role', dataIndex: 'role', render: role => role === 'lapc' ? 'Student (legacy LAPC)' : ROLE_LABELS[role] || role },
    { title: 'Screen', dataIndex: 'screen', render: id => screenById[id]?.label || id },
    { title: 'Before', dataIndex: 'before', render: format },
    { title: 'After', dataIndex: 'after', render: format },
  ];
  return <div className="module-page permission-page">
    <Typography.Title level={2}>Screen Permissions</Typography.Title>
    <Typography.Paragraph>Set access for each role. Changes affect every account in that role, including future accounts.</Typography.Paragraph>
    <Alert type="info" showIcon title="Roles across columns · screens down rows" description="Expand a row to set individual actions. Hostel assignments and personal-record restrictions still apply. Shared screen tabs are grouped because they use the same records. Existing workflow rules may further restrict actions." />
    {error && <Alert type="error" showIcon title={error} action={<Button disabled={saving} onClick={load}>Reload settings</Button>} />}
    <Tabs onChange={key => { if (key === 'history') loadHistory(historyPage); }} items={[
      { key: 'permissions', label: 'Role permissions', children: <Card>
        <Space wrap className="permission-toolbar">
          <Input aria-label="Search screens" placeholder="Search screens" value={search} onChange={e => setSearch(e.target.value)} allowClear />
          <Select aria-label="Filter module" placeholder="All modules" allowClear value={group} onChange={setGroup} style={{ minWidth: 200 }} options={[...new Set(SCREENS.map(s => s.group))].map(value => ({ value, label: value }))} />
          <Button onClick={load} disabled={changes.length > 0 || saving} loading={loading}>Refresh</Button>
        </Space>
        <Space wrap className="permission-toolbar">
          <Typography.Text>Apply to {rows.filter(s => s.roles.includes(bulkRole)).length} matching screens:</Typography.Text>
          <Select aria-label="Bulk role" value={bulkRole} onChange={setBulkRole} style={{ width: 135 }} options={Object.entries(ROLE_LABELS).filter(([role]) => role !== 'admin').map(([value, label]) => ({ value, label }))} />
          <Select aria-label="Bulk access" value={bulkLevel} onChange={setBulkLevel} style={{ width: 120 }} options={['hidden', 'view', 'manage'].map(value => ({ value, label: labels[value] }))} />
          <Button onClick={bulk} disabled={!draft || saving}>Apply to draft</Button>
          <Button disabled={!draft || saving} onClick={() => {
            const defaults = defaultPermissions();
            setDraft(previous => ({ ...previous, [bulkRole]: defaults[bulkRole] }));
          }}>Reset {ROLE_LABELS[bulkRole]} to defaults</Button>
        </Space>
        <Table rowKey="id" loading={loading} dataSource={rows} pagination={{ defaultPageSize: 15, showSizeChanger: true, pageSizeOptions: [15, 30, 60], showTotal: total => `${total} screen groups` }} scroll={{ x: 1450, y: 550 }}
          columns={[{ title: 'Screen', key: 'screen', width: 300, fixed: 'left', render: (_, s) => <span><strong>{s.label}</strong><small className="permission-user-count">{s.group}</small></span> }, ...roleColumns]}
          expandable={{ expandedRowKeys: expanded, onExpandedRowsChange: setExpanded, expandedRowRender: expandedRow }} />
        <div className="permission-save-bar"><Typography.Text>{changes.length} role/screen changes · Revision {saved?.revision ?? '—'}</Typography.Text>
          <Space><Button disabled={!changes.length || saving} onClick={() => { setDraft(clone(saved.grants)); setReason(''); }}>Discard Changes</Button>
            <Button type="primary" disabled={!changes.length || saving} onClick={() => setReview(true)}>Review & Save</Button></Space>
        </div>
      </Card> },
      { key: 'history', label: 'Change history', children: <Table rowKey="id" loading={historyLoading} dataSource={history.rows}
        pagination={{ current: historyPage, pageSize: 20, total: history.count, showSizeChanger: false, onChange: loadHistory }}
        columns={[{ title: 'Revision', dataIndex: 'revision' }, { title: 'Changed by', dataIndex: 'actor_name' },
          { title: 'When', dataIndex: 'createdAt', render: value => new Date(value).toLocaleString() }, { title: 'Reason', dataIndex: 'reason' },
          { title: 'Changes', render: (_, row) => row.changes.length }]}
        expandable={{ expandedRowRender: row => <Table rowKey={entry => `${entry.role}:${entry.screen}`} dataSource={row.changes} columns={changeColumns} pagination={false} /> }} /> },
    ]} />
    <Modal title="Review permission changes" open={review} width={1000} onCancel={() => { if (!saving) setReview(false); }} onOk={save}
      okText="Save Changes" confirmLoading={saving} okButtonProps={{ disabled: !reason.trim() || !changes.length }} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving}>
      <Typography.Paragraph>These changes apply to {Object.keys(ROLE_LABELS).filter(role => changes.some(c => c.role === role)).reduce((sum, role) => sum + (counts[role] || 0), 0)} active accounts. Revoked actions will be blocked on their next request.</Typography.Paragraph>
      <Table size="small" rowKey={entry => `${entry.role}:${entry.screen}`} dataSource={changes} columns={changeColumns} pagination={{ pageSize: 8 }} />
      <label htmlFor="permission-reason">Reason for change</label>
      <Input.TextArea id="permission-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} showCount rows={2} disabled={saving} />
    </Modal>
  </div>;
}
