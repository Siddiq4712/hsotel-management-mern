import React from 'react';
import { Clock, Search } from 'lucide-react';
import { Input } from 'antd';
import WorkspaceContextHeader from './WorkspaceContextHeader';
import WorkspaceToolbar from './WorkspaceToolbar';
import './RequestQueue.css';

export function RequestSearch({ label, value, onChange, placeholder = 'Name or roll number' }) {
  return <Input aria-label={label} className="request-queue-search" placeholder={placeholder}
    prefix={<Search size={16} aria-hidden="true" />} value={value} onChange={event => onChange(event.target.value)} allowClear />;
}

export function filterRequests(rows, search, extraFields = () => []) {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter(row => [row.Student?.userName, row.Student?.roll_number, ...extraFields(row)]
    .join(' ').toLowerCase().includes(query));
}

export const requestPagination = {
  pageSize: 10,
  hideOnSinglePage: false,
  showSizeChanger: false,
  showTotal: (total, [first, last]) => `Showing ${first}–${last} of ${total} ${total === 1 ? 'request' : 'requests'}`,
};

export default function RequestQueue({
  title, description, scope, pending, count, listTitle = 'All requests', filters, children,
}) {
  return (
    <section className="request-queue">
      <WorkspaceContextHeader title={title} description={description} scope={scope} />
      {pending > 0 && <div className="request-queue-summary" role="status">
        <span className="request-queue-clock"><Clock size={17} aria-hidden="true" /></span>
        <div>
          <strong>{pending === 1 ? '1 request needs' : `${pending} requests need`} your attention</strong>
          <p>Review the details before taking action.</p>
        </div>
        <span className="request-queue-pending">{pending} pending</span>
      </div>}
      <div className="request-queue-card">
        <WorkspaceToolbar className="request-queue-toolbar">
          <h3>{listTitle}{count != null && <span>{count}</span>}</h3>
          <div className="request-queue-filters">{filters}</div>
        </WorkspaceToolbar>
        {children}
      </div>
    </section>
  );
}
