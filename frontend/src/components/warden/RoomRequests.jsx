import RequestQueue, { filterRequests, requestPagination, RequestSearch } from '../common/RequestQueue';
import RequestActions, { requestActionsColumnWidth } from '../common/RequestActions';
import RequestReviewDialog from '../common/RequestReviewDialog';
import { usePermissions } from '../../context/PermissionContext';
import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useEffect, useMemo, useRef, useState } from "react";
import WorkspaceAlert from '../common/WorkspaceAlert';
import { useWorkspaceScope } from '../common/WorkspaceScope';
import { useAuth } from '../../context/AuthContext';
import { Table, Tag, Select, Space, Typography, Input, ConfigProvider, App as AntdApp } from 'antd';
import { 
  Home, User, Clock, CheckCircle2, XCircle, 
  RefreshCw, ClipboardList
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { wardenAPI } from "../../services/api";

dayjs.extend(relativeTime);

const { Text } = Typography;
const { TextArea } = Input;

const RoomRequests = () => {
  const scope = useWorkspaceScope();
  const { user } = useAuth();
  const { message } = AntdApp.useApp();
  const { can } = usePermissions();
  const canDecide = can('room-requests', 'approve');
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const request = useRef(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [decision, setDecision] = useState("approved");
  const [intent, setIntent] = useState();
  const [remarks, setRemarks] = useState("");
  const [saveError, setSaveError] = useState('');

  const fetchRequests = async () => {
    const revision = ++request.current;
    setLoading(true);
    setLoadError('');
    try {
      const res = await wardenAPI.getRoomRequests(
        statusFilter === "all" ? {} : { status: statusFilter }
      );
      if (revision === request.current) setRequests(res.data?.data || []);
    } catch (err) {
      if (revision === request.current) {
        setRequests([]);
        setLoadError(err.message || 'Unable to load room requests.');
      }
    } finally {
      if (revision === request.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    return () => { request.current++; };
  }, [statusFilter]);

  const openReview = (record, action) => {
    setSelectedRequest(record);
    setIntent(action);
    setDecision(action || 'approved');
    setRemarks('');
    setSaveError('');
    setDialogOpen(true);
  };

  const handleDecisionSubmit = async () => {
    if (selectedRequest?.status !== 'pending' || !canDecide || processing) return;
    setSaveError('');
    setProcessing(true);
    try {
      await wardenAPI.updateRoomRequest(selectedRequest.id, { decision, remarks });
      message.success(`Request ${decision} successfully`);
      setDialogOpen(false);
      setRemarks("");
      fetchRequests();
    } catch (err) {
      setSaveError(err.message || 'Could not save the room decision.');
    } finally {
      setProcessing(false);
    }
  };

  const visible = filterRequests(requests, search, row => [row.Room?.room_number]);
  const statusConfig = {
    pending: { color: "warning", icon: <Clock size={12} />, label: "Pending" },
    approved: { color: "success", icon: <CheckCircle2 size={12} />, label: "Approved" },
    rejected: { color: "error", icon: <XCircle size={12} />, label: "Rejected" },
    cancelled: { color: "default", icon: <XCircle size={12} />, label: "Cancelled" },
  };

  const columns = [
    {
      title: "Student Details",
      key: "student",
      render: (_, record) => (
        <Space gap={3}>
           <div className="p-2 bg-blue-50 rounded-control text-blue-600"><User size={18} /></div>
           <Space direction="vertical" size={0}>
              <Text strong className="text-slate-700">{record.Student?.userName}</Text>
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Roll No: {record.Student?.roll_number || "UNSET"}
              </Text>
           </Space>
        </Space>
      ),
    },
    {
      title: "Requested Room",
      key: "room",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <div className="flex items-center gap-2">
            <Home size={14} className="text-blue-500" />
            <Text strong>Room {record.Room?.room_number}</Text>
          </div>
          <Text className="text-xs text-slate-400">
            {record.Room?.RoomType?.name} • {record.Room?.occupancy_count}/{record.Room?.RoomType?.capacity} Occupants
          </Text>
        </Space>
      ),
    },
    {
      title: "Progress",
      key: "status",
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Tag 
            icon={statusConfig[record.status]?.icon} 
            color={statusConfig[record.status]?.color}
            className="rounded-full border-none px-3 font-bold uppercase text-[9px]"
          >
            {statusConfig[record.status]?.label}
          </Tag>
          <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
            {dayjs(record.requested_at).fromNow()}
          </Text>
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "action",
      align: "right",
      width: requestActionsColumnWidth,
      render: (_, record) => {
        const pending = canDecide && record.status === 'pending';
        return <RequestActions reviewLabel={`Review room request for ${record.Student?.userName || 'resident'}`}
          onReview={() => openReview(record)}
          onAccept={pending ? () => openReview(record, 'approved') : undefined}
          onReject={pending ? () => openReview(record, 'rejected') : undefined} />;
      },
    },
  ];

  return (
    <ConfigProvider>
      <div className="module-page">
        
        {/* Header Section */}
        <RequestQueue title="Room Requests" description="Review and approve student room applications." scope={scope?.name || user?.hostel?.name}
          pending={!loading && !loadError ? visible.filter(row => row.status === 'pending').length : 0}
          count={!loading && !loadError ? visible.length : undefined}
          listTitle={statusFilter === 'all' ? 'All requests' : statusConfig[statusFilter]?.label}
          filters={<>
            <RequestSearch label="Search room requests" placeholder="Name, roll number, or room" value={search} onChange={setSearch} />
            <Select aria-label="Room request status" value={statusFilter} onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All requests' },
                { value: 'pending', label: 'Awaiting review' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]} />
            <Button icon={<RefreshCw size={16} />} onClick={fetchRequests} loading={loading}>Refresh</Button>
          </>}>
          {loadError && <div className="request-queue-message"><WorkspaceAlert type="error" title={loadError} showIcon /></div>}
          <Table rowKey="id" columns={columns} dataSource={loading || loadError ? [] : visible} loading={loading} scroll={{ x: 900 }}
            pagination={requestPagination}
            locale={{ emptyText: loadError ? 'Room requests could not be loaded' : 'No room requests match these filters.' }} />
        </RequestQueue>

        <RequestReviewDialog
          title={intent === 'approved' ? 'Accept room request' : intent === 'rejected' ? 'Reject room request' : 'Review room request'}
          open={dialogOpen} busy={processing} onClose={() => setDialogOpen(false)}
          resident={selectedRequest?.Student?.userName} hostel={scope?.name || user?.hostel?.name}
          status={selectedRequest && <Tag color={statusConfig[selectedRequest.status]?.color}
            className={selectedRequest.status === 'pending' ? 'request-pending-tag' : undefined}>
            {statusConfig[selectedRequest.status]?.label || selectedRequest.status}
          </Tag>}
          details={selectedRequest ? [['Room requested', selectedRequest.Room?.room_number], ['Room type', selectedRequest.Room?.RoomType?.name]] : []}
          actions={canDecide && selectedRequest?.status === 'pending' && <Button
              type={decision === 'rejected' ? 'default' : 'primary'}
              danger={decision === 'rejected'}
              loading={processing} 
              onClick={handleDecisionSubmit}
            >
              {intent === 'approved' ? 'Confirm acceptance' : intent === 'rejected' ? 'Confirm rejection' : 'Confirm decision'}
            </Button>}>
          {selectedRequest && (
            <>
              {selectedRequest.status !== 'pending' && <div><strong className="request-review-label">Warden remarks</strong>
                <p className="request-review-note">{selectedRequest.remarks || 'No remarks recorded.'}</p>
              </div>}
              {canDecide && selectedRequest.status === 'pending' && <div className="space-y-4">
                {!intent && <div>
                  <label htmlFor="room-request-decision">Warden decision</label>
                  <Select id="room-request-decision" className="w-full" value={decision} onChange={setDecision} disabled={processing}>
                    <Select.Option value="approved">Approve & Allot Room</Select.Option>
                    <Select.Option value="rejected">Reject Request</Select.Option>
                    <Select.Option value="cancelled">Cancel Request</Select.Option>
                  </Select>
                </div>}
                {intent === 'approved' && <p>Acceptance assigns the student to the requested room.</p>}

                <div>
                  <label htmlFor="room-request-remarks">Warden remarks</label>
                  <TextArea id="room-request-remarks"
                    rows={3}
                    placeholder="Enter your remarks..."
                    aria-label="Room request remarks" disabled={processing}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
                {saveError && <WorkspaceAlert type="error" showIcon title={saveError} />}
              </div>}
            </>
          )}
        </RequestReviewDialog>
      </div>
    </ConfigProvider>
  );
};

export default RoomRequests;
