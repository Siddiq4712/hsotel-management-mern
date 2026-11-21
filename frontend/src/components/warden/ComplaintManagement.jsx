import RequestQueue, { filterRequests, requestPagination, RequestSearch } from '../common/RequestQueue';
import RequestActions from '../common/RequestActions';
import RequestReviewDialog from '../common/RequestReviewDialog';
import { useScopeDraft, useWorkspaceScope } from '../common/WorkspaceScope';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { useSearchParams } from 'react-router-dom';
import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Typography, Select, Table, ConfigProvider, Tag, Input, message } from 'antd';
import { RefreshCw } from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ComplaintManagement = () => {
  const scope = useWorkspaceScope();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canEdit = can('complaint-management', 'edit');
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const status = params.get('status');
  const filter = ['open', 'submitted', 'in_progress', 'resolved', 'closed'].includes(status) ? status : 'all';
  const [error, setError] = useState('');
  const request = useRef(0);
  const setFilter = value => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    setParams(next);
  };
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  useScopeDraft(showModal && Boolean(resolution.trim()), actionLoading);

  function review(complaint) {
    setSelectedComplaint(complaint);
    setNewStatus('');
    setResolution('');
    setSaveError('');
    setShowModal(true);
  }

  const fetchComplaints = useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      
      const response = await wardenAPI.getComplaints(params);
      if (sequence === request.current) setComplaints(response.data.data || []);
    } catch (error) {
      if (sequence === request.current) setError(error.message || 'Could not load complaints.');
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [filter, categoryFilter, priorityFilter]);

  useEffect(() => { fetchComplaints(); return () => { request.current++; }; }, [fetchComplaints]);

  const confirmStatusUpdate = async () => {
    if (!canEdit || !selectedComplaint || !newStatus || actionLoading) return;
    setSaveError('');
    setActionLoading(true);
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'resolved' && resolution.trim()) {
        updateData.resolution = resolution.trim();
      }
      await wardenAPI.updateComplaint(selectedComplaint.id, updateData);
      message.success(`Status updated to: ${newStatus.replace('_', ' ')}`);
      setShowModal(false);
      fetchComplaints();
    } catch (error) {
      setSaveError(error.message || 'Could not save this complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  const visible = filterRequests(complaints, search, row => [row.subject]);
  const statusConfig = {
    submitted: { color: 'warning', label: 'New' },
    in_progress: { color: 'blue', label: 'Processing' },
    resolved: { color: 'success', label: 'Solved' },
    closed: { color: 'default', label: 'Closed' }
  };
  const availableActions = canEdit && selectedComplaint ? [
    ...(selectedComplaint.status === 'submitted' ? [{ value: 'in_progress', label: 'Start work' }] : []),
    ...(['submitted', 'in_progress'].includes(selectedComplaint.status) ? [{ value: 'resolved', label: 'Mark as solved' }] : []),
    ...(!['resolved', 'closed'].includes(selectedComplaint.status) ? [{ value: 'closed', label: 'Close complaint' }] : []),
  ] : [];

  const columns = [
    { title: 'Resident', key: 'resident', render: (_, row) => <>
      <Text strong>{row.Student?.userName || `Resident #${row.student_id}`}</Text>
      {row.Student?.roll_number && <div className="text-xs text-slate-500">{row.Student.roll_number}</div>}
    </> },
    { title: 'Complaint', dataIndex: 'subject', render: (subject, row) => <>
      <Text strong>{subject}</Text>
      <div className="text-xs text-slate-500">#CMP-{row.id} · {moment(row.createdAt).format('DD MMM YYYY')}</div>
    </> },
    { title: 'Category', dataIndex: 'category', render: value => <span className="capitalize">{value || '—'}</span> },
    { title: 'Priority', dataIndex: 'priority', render: value => <Tag className="capitalize" color={value === 'urgent' ? 'error' : value === 'high' ? 'warning' : 'default'}>{value || '—'}</Tag> },
    { title: 'Status', dataIndex: 'status', render: value => <Tag color={statusConfig[value]?.color}
      className={value === 'submitted' ? 'request-pending-tag' : undefined}>{statusConfig[value]?.label || value}</Tag> },
    { title: 'Actions', key: 'actions', width: 120, align: 'right',
      render: (_, row) => <RequestActions reviewLabel={`Review complaint #${row.id}`} onReview={() => review(row)} /> },
  ];

  return (
    <ConfigProvider>
      <div className="module-page">
        <RequestQueue title="Student Complaints" description="Review, track, and resolve hostel complaints."
          scope={scope?.name || user?.hostel?.name} listTitle="Complaints"
          pending={!loading && !error ? visible.filter(row => row.status === 'submitted').length : 0}
          count={!loading && !error ? visible.length : undefined}
          filters={<>
            <RequestSearch label="Search complaints" placeholder="Name, roll number, or subject" value={search} onChange={setSearch} />
            <Select aria-label="Complaint status" value={filter} onChange={setFilter}>
              <Option value="all">All complaints</Option>
              <Option value="open">Open complaints</Option>
              <Option value="submitted">New</Option>
              <Option value="in_progress">In progress</Option>
              <Option value="resolved">Resolved</Option>
              <Option value="closed">Closed</Option>
            </Select>
            <Select aria-label="Complaint category" value={categoryFilter} onChange={setCategoryFilter}>
              <Option value="all">All categories</Option>
              <Option value="room">Room / Allotment</Option>
              <Option value="mess">Mess &amp; Dining</Option>
              <Option value="maintenance">Maintenance</Option>
            </Select>
            <Select aria-label="Complaint priority" value={priorityFilter} onChange={setPriorityFilter}>
              <Option value="all">All priorities</Option>
              <Option value="urgent">Urgent</Option>
              <Option value="high">High priority</Option>
            </Select>
            <Button icon={<RefreshCw size={16} />} onClick={fetchComplaints} loading={loading}>Refresh</Button>
          </>}>
          {error && <div className="request-queue-message"><Alert type="error" showIcon title={error} /></div>}
          <Table rowKey="id" columns={columns} dataSource={loading || error ? [] : visible} loading={loading}
            pagination={requestPagination} scroll={{ x: 760 }}
            locale={{ emptyText: error ? 'Complaints unavailable' : 'No complaints match these filters.' }} />
        </RequestQueue>

        <RequestReviewDialog
          title={selectedComplaint ? `Review complaint #${selectedComplaint.id}` : 'Review complaint'}
          open={showModal} busy={actionLoading} onClose={() => setShowModal(false)}
          resident={selectedComplaint && (selectedComplaint.Student?.userName || `Resident #${selectedComplaint.student_id}`)}
          hostel={scope?.name || user?.hostel?.name}
          status={selectedComplaint && <Tag color={statusConfig[selectedComplaint.status]?.color}
            className={selectedComplaint.status === 'submitted' ? 'request-pending-tag' : undefined}>
            {statusConfig[selectedComplaint.status]?.label || selectedComplaint.status}
          </Tag>}
          actions={availableActions.length > 0 && <Button permissionAction="edit" type="primary"
            disabled={!newStatus} loading={actionLoading} onClick={confirmStatusUpdate}>Save changes</Button>}>
          {saveError && <Alert type="error" showIcon title={saveError} />}
          {selectedComplaint && (
            <>
              <div><strong className="request-review-label">{selectedComplaint.subject}</strong>
                <p className="request-review-note">{selectedComplaint.description}</p>
              </div>
              {selectedComplaint.resolution && <div><strong className="request-review-label">Resolution</strong><p className="request-review-note">{selectedComplaint.resolution}</p></div>}
              {availableActions.length > 0 && <div>
                <label htmlFor="complaint-action">Action</label>
                <Select id="complaint-action" className="w-full" placeholder="Choose an action" options={availableActions}
                  disabled={actionLoading} value={newStatus || undefined} onChange={setNewStatus} />
              </div>}
              {newStatus === 'resolved' && <div>
                <label htmlFor="complaint-resolution">Resolution summary</label>
                <TextArea id="complaint-resolution" rows={4} disabled={actionLoading} value={resolution} onChange={event => setResolution(event.target.value)} />
              </div>}
            </>
          )}
        </RequestReviewDialog>
      </div>
    </ConfigProvider>
  );
};

export default ComplaintManagement;
