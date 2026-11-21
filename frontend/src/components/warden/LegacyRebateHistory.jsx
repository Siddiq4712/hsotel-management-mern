import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Table, Tag, Typography } from 'antd';
import { CreditCard, RefreshCw, Search } from 'lucide-react';
import Alert from '../common/WorkspaceAlert';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';
import { wardenAPI } from '../../services/api';
import { useWardenHostelName } from './WardenWorkspace';

export default function LegacyRebateHistory() {
  const hostelName = useWardenHostelName();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    wardenAPI.getRebates()
      .then(response => { if (active) setRows(response.data.data || []); })
      .catch(failure => {
        if (!active) return;
        setRows([]);
        setError(failure.message || 'Unable to load legacy rebates.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  const query = search.trim().toLowerCase();
  const visible = rows.filter(row => [row.RebateStudent?.userName, row.RebateStudent?.roll_number, row.student_id, row.rebate_type]
    .some(value => String(value ?? '').toLowerCase().includes(query)));

  return <section className="module-page" aria-labelledby="rebate-history-title">
    <WorkspacePageHeader id="rebate-history-title" title="Legacy Rebates" icon={CreditCard}
      description={hostelName || 'Review previously recorded rebate amounts.'} />
    <Alert type="info" showIcon className="mb-4" title="Legacy rebate history"
      description="Use Mess Reductions to submit supporting documents or process new requests." />
    <Card>
      <WorkspaceToolbar className="mb-4">
        <Input aria-label="Search legacy rebates" className="workspace-search" prefix={<Search size={16} aria-hidden="true" />}
          placeholder="Search by student, roll number, or category" value={search} onChange={event => setSearch(event.target.value)} allowClear />
        {!loading && !error && <Typography.Text type="secondary" aria-live="polite">{visible.length} records</Typography.Text>}
        <div className="workspace-toolbar-actions">
          <Button icon={<RefreshCw size={16} />} loading={loading} onClick={() => setRevision(value => value + 1)}>Refresh</Button>
        </div>
      </WorkspaceToolbar>
      {error && <Alert type="error" showIcon title={error} className="mb-4" />}
      <Table rowKey="id" dataSource={visible} loading={loading} scroll={{ x: 740 }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: error ? 'Rebates could not be loaded' : query ? 'No rebates match your search' : 'No legacy rebates' }}
        columns={[
          { title: 'Student', key: 'student', render: (_, row) => <><strong>{row.RebateStudent?.userName || `Student #${row.student_id}`}</strong>{row.RebateStudent?.roll_number && <div>{row.RebateStudent.roll_number}</div>}</> },
          { title: 'Category', dataIndex: 'rebate_type' },
          { title: 'Dates', key: 'dates', render: (_, row) => `${row.from_date} → ${row.to_date}` },
          { title: 'Status', dataIndex: 'status', render: value => <Tag>{value}</Tag> },
          { title: 'Recorded amount', dataIndex: 'amount', render: value => `₹${Number(value || 0).toFixed(2)}` },
          { title: 'Reason', dataIndex: 'reason' },
        ]} />
    </Card>
  </section>;
}
