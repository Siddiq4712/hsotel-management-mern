import { useScopeDraft } from '../common/WorkspaceScope';
import RequestActions, { requestActionsColumnWidth } from '../common/RequestActions';
import RequestReviewDialog from '../common/RequestReviewDialog';
import RequestQueue, { requestPagination, RequestSearch } from '../common/RequestQueue';
import { useWardenHostelName } from './WardenWorkspace';
import { usePermissions } from '../../context/PermissionContext';
import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Table, Tag, Space, Input, Select, message, Typography, ConfigProvider, Avatar } from 'antd';
import { 
  Check, CheckCircle, XCircle, Clock, ExternalLink,
  AlertTriangle, RefreshCw, Eye
} from 'lucide-react';
import { outpassAPI } from '../../services/api';
import moment from 'moment';

const { Text } = Typography;

const gateStatuses = [
  { value: 'pending', label: 'Pending requests' },
  { value: 'approved', label: 'Approved passes' },
  { value: 'outside', label: 'Currently outside' },
  { value: 'all', label: 'All requests' },
];

const OutpassApproval = () => {
  const hostelName = useWardenHostelName();
  const { can } = usePermissions();
  const canDecide = can('outpass-approvals', 'approve');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Modal actions
  const [selectedOutpass, setSelectedOutpass] = useState(null);
  const [intent, setIntent] = useState();
  const [remarks, setRemarks] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const request = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  useScopeDraft(modalVisible && Boolean(remarks.trim()), actionLoading);

  const fetchOutpasses = useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true);
    setLogs([]);
    setLoadError('');
    try {
      const res = await outpassAPI.getWardenOutpasses({ 
        status: activeTab,
        search: search.trim() || undefined
      });
      if (sequence === request.current) setLogs(res.data.data || []);
    } catch (error) {
      if (sequence === request.current) setLoadError(error.message || 'Could not load outpasses.');
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchOutpasses();
    return () => { request.current++; };
  }, [fetchOutpasses]);

  const openActionModal = (record, action) => {
    setSelectedOutpass(record);
    setIntent(action);
    setRemarks('');
    setSaveError('');
    setModalVisible(true);
  };

  const handleAction = async (actionType) => {
    if (selectedOutpass?.status !== 'pending' || !canDecide || actionLoading) return;
    setSaveError('');
    setActionLoading(true);
    try {
      if (actionType === 'approve') {
        await outpassAPI.approveOutpass(selectedOutpass.id, remarks);
        message.success('Outpass request approved successfully');
      } else {
        await outpassAPI.rejectOutpass(selectedOutpass.id, remarks);
        message.error('Outpass request rejected');
      }
      setModalVisible(false);
      fetchOutpasses();
    } catch (error) {
      setSaveError(error.message || 'Could not save this decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'gold', text: 'PENDING', icon: <Clock size={12} /> },
      approved: { color: 'blue', text: 'APPROVED', icon: <CheckCircle size={12} /> },
      rejected: { color: 'magenta', text: 'REJECTED', icon: <XCircle size={12} /> },
      cancelled: { color: 'default', text: 'CANCELLED', icon: <XCircle size={12} /> },
      outside: { color: 'purple', text: 'OUTSIDE', icon: <ExternalLink size={12} /> },
      completed: { color: 'green', text: 'COMPLETED', icon: <CheckCircle size={12} /> },
      expired: { color: 'red', text: 'EXPIRED', icon: <AlertTriangle size={12} /> },
      late_return: { color: 'red', text: 'LATE RETURN', icon: <AlertTriangle size={12} /> }
    };

    const details = statusMap[status] || { color: 'default', text: status.toUpperCase() };
    return (
      <Tag color={details.color} className="flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border-none">
        {details.icon}
        {details.text}
      </Tag>
    );
  };

  const pendingColumns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, record) => (
        <Space size="middle">
          <Avatar src={record.Student?.profile_picture} alt="profile" size={40} className="border border-slate-200" />
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-800">{record.Student?.userName}</Text>
            <Text type="secondary" className="text-xs">Roll: {record.Student?.roll_number}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Reason / Purpose',
      key: 'purpose',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="text-slate-700 font-medium">{record.purpose}</Text>
          <Text type="secondary" className="text-xs">To: {record.destination}</Text>
        </Space>
      )
    },
    {
      title: 'Exit Date/Time',
      dataIndex: 'from_date',
      key: 'from_date',
      render: (date) => moment(date).format('lll')
    },
    {
      title: 'Return Expectation',
      dataIndex: 'to_date',
      key: 'to_date',
      render: (date) => moment(date).format('lll')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: status => status === 'pending'
        ? <Tag color="warning" className="request-pending-tag">Pending review</Tag>
        : getStatusTag(status)
    },
    {
      title: 'Actions',
      key: 'action',
      width: requestActionsColumnWidth,
      align: 'right',
      render: (_, record) => {
        const pending = canDecide && record.status === 'pending';
        return <RequestActions reviewLabel={`Review outpass for ${record.Student?.userName || 'resident'}`}
          onReview={() => openActionModal(record)} disabled={loading}
          onAccept={pending ? () => openActionModal(record, 'approve') : undefined}
          onReject={pending ? () => openActionModal(record, 'reject') : undefined} />;
      }
    }
  ];

  const historyColumns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, record) => (
        <Space size="middle">
          <Avatar src={record.Student?.profile_picture} alt="profile" size={40} className="border border-slate-200" />
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-800">{record.Student?.userName}</Text>
            <Text type="secondary" className="text-xs">Roll: {record.Student?.roll_number}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Outpass Scope',
      key: 'scope',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="text-slate-700 font-medium">{record.purpose}</Text>
          <Text type="secondary" className="text-xs">To: {record.destination}</Text>
        </Space>
      )
    },
    {
      title: 'Planned Duration',
      key: 'duration',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs text-slate-600">From: {moment(record.from_date).format('lll')}</Text>
          <Text className="text-xs text-slate-600">Until: {moment(record.to_date).format('lll')}</Text>
        </Space>
      )
    },
    {
      title: 'Gate Registry',
      key: 'gate',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.exit_time && <Text className="text-[11px] text-indigo-600">Exit: {moment(record.exit_time).format('lll')}</Text>}
          {record.return_time && <Text className="text-[11px] text-emerald-600">Return: {moment(record.return_time).format('lll')}</Text>}
          {!record.exit_time && <Text type="secondary" className="text-xs italic">Not left yet</Text>}
        </Space>
      )
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (txt) => txt ? <Text className="text-slate-600 italic text-xs">{txt}</Text> : <Text type="secondary" className="text-xs">-</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      width: 105,
      render: (_, record) => <RequestActions
        reviewLabel={`Review outpass for ${record.Student?.userName || 'resident'}`}
        onReview={() => openActionModal(record)} />
    }
  ];

  return (
    <ConfigProvider>
      <div className="module-page">
        <RequestQueue title="Gate Pass Requests" scope={hostelName} description="Review, approve, and track resident gate passes."
          listTitle={gateStatuses.find(status => status.value === activeTab)?.label}
          count={!loading && !loadError ? logs.length : undefined}
          pending={!loading && !loadError ? logs.filter(row => row.status === 'pending').length : 0}
          filters={<>
            <RequestSearch label="Search gate pass requests" value={search} onChange={setSearch} />
            <Select aria-label="Gate pass status" value={activeTab} onChange={setActiveTab} options={gateStatuses} />
            <Button icon={<RefreshCw size={16} />} onClick={fetchOutpasses} loading={loading}>Refresh</Button>
          </>}>
          {loadError && <div className="request-queue-message"><Alert type="error" showIcon title={loadError} /></div>}
          <Table columns={activeTab === 'pending' ? pendingColumns : historyColumns}
            dataSource={loading || loadError ? [] : logs} rowKey="id" loading={loading} scroll={{ x: 870 }}
            locale={{ emptyText: loadError ? 'Gate passes unavailable' : search ? 'No gate passes match this search.' : 'No gate passes in this category.' }}
            pagination={requestPagination} />
        </RequestQueue>

        <RequestReviewDialog title={intent === 'approve' ? 'Accept gate pass request' : intent === 'reject' ? 'Reject gate pass request' : 'Review gate pass request'}
          open={modalVisible} busy={actionLoading} onClose={() => setModalVisible(false)}
          status={selectedOutpass && getStatusTag(selectedOutpass.status)}
          resident={selectedOutpass?.Student?.userName} hostel={hostelName}
          details={selectedOutpass ? [
            ['Departure', moment(selectedOutpass.from_date).format('lll')], ['Return', moment(selectedOutpass.to_date).format('lll')],
            ['Destination', selectedOutpass.destination],
          ] : []}
          actions={canDecide && selectedOutpass?.status === 'pending' && <>
            {(!intent || intent === 'reject') && <Button danger loading={intent === 'reject' && actionLoading}
              disabled={actionLoading} onClick={() => handleAction('reject')}>{intent ? 'Confirm rejection' : 'Reject'}</Button>}
            {(!intent || intent === 'approve') && <Button type="primary" icon={<Check size={16} aria-hidden="true" />} loading={actionLoading}
              onClick={() => handleAction('approve')}>{intent ? 'Confirm acceptance' : 'Approve'}</Button>}
          </>}>
          {selectedOutpass && <div><strong className="request-review-label">Purpose</strong>
            <p className="request-review-note">{selectedOutpass.purpose || 'No purpose recorded.'}</p>
          </div>}
          {selectedOutpass && selectedOutpass.status !== 'pending' && <div><strong className="request-review-label">Warden remarks</strong>
            <p className="request-review-note">{selectedOutpass.remarks || 'No remarks recorded.'}</p>
          </div>}
          {canDecide && selectedOutpass?.status === 'pending' && <div>
            <label htmlFor="outpass-remarks">Warden remarks (optional)</label>
            <Input.TextArea id="outpass-remarks" aria-label="Outpass remarks" rows={3} placeholder="Enter your remarks..."
              disabled={actionLoading} value={remarks} onChange={event => setRemarks(event.target.value)} />
          </div>}
          {saveError && <Alert type="error" showIcon title={saveError} />}
        </RequestReviewDialog>
      </div>
    </ConfigProvider>
  );
};

export default OutpassApproval;
