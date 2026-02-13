import React, { useEffect, useMemo, useState } from "react";
import { 
  Card, Table, Tag, Button, Select, Space, Typography, 
  Modal, Input, Badge, Descriptions, Empty, message, ConfigProvider, theme, Tooltip, Skeleton, Row, Col, Statistic 
} from "antd";
import { 
  Home, User, Clock, CheckCircle2, XCircle, 
  RefreshCw, ClipboardList, Filter, Search, MessageSquare, Inbox, Info
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { wardenAPI } from "../../services/api";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- 1. Specialized Skeletons ---

const StatsSkeleton = () => (
  <Row gutter={[24, 24]} className="mb-8">
    {[...Array(3)].map((_, i) => (
      <Col xs={24} md={8} key={i}>
        <Card className="border-none shadow-sm rounded-2xl p-4">
          <Skeleton loading active avatar={{ size: 'small', shape: 'square' }} paragraph={{ rows: 1 }} />
        </Card>
      </Col>
    ))}
  </Row>
);

const FilterSkeleton = () => (
  <Card className="border-none shadow-sm rounded-2xl mb-6">
    <div className="flex gap-4 items-center">
      <div className="flex-1 md:max-w-md">
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </div>
      <Skeleton.Button active style={{ width: 48, height: 48, borderRadius: 12 }} />
    </div>
  </Card>
);

const TableSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-6 p-6 border-b border-slate-50 last:border-0">
        <Skeleton.Avatar active shape="circle" size="large" />
        <div className="flex-1"><Skeleton active title={false} paragraph={{ rows: 1, width: '100%' }} /></div>
        <Skeleton.Input active style={{ width: 100 }} />
        <Skeleton.Button active style={{ width: 80 }} />
      </div>
    ))}
  </Card>
);

const RoomRequests = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [decision, setDecision] = useState("approved");
  const [remarks, setRemarks] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await wardenAPI.getRoomRequests(
        statusFilter === "all" ? {} : { status: statusFilter }
      );
      setRequests(res.data?.data || []);
    } catch (err) {
      message.error("Institutional sync failed: " + err.message);
    } finally {
      // Intentional delay for smooth shimmer effect
      setTimeout(() => setLoading(false), 600);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleDecisionSubmit = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await wardenAPI.updateRoomRequest(selectedRequest.id, { decision, remarks });
      message.success(`Request ${decision} successfully`);
      setDialogOpen(false);
      setRemarks("");
      fetchRequests();
    } catch (err) {
      message.error("Protocol error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

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
           <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><User size={18} /></div>
           <Space direction="vertical" size={0}>
              <Text strong className="text-slate-700">{record.Student?.username}</Text>
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
      title: "Action",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space>
          {record.status === "pending" ? (
            <Button 
              type="primary" 
              size="small" 
              className="rounded-lg font-bold text-[11px] h-8 shadow-sm"
              onClick={() => {
                setSelectedRequest(record);
                setDialogOpen(true);
              }}
            >
              REVIEW
            </Button>
          ) : record.remarks ? (
            <Tooltip title="View Warden Remarks">
              <Button 
                icon={<MessageSquare size={14} />} 
                className="rounded-lg border-none bg-slate-50"
                onClick={() => Modal.info({
                  title: 'Warden Remarks',
                  content: record.remarks,
                  className: 'rounded-3xl'
                })}
              />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <ClipboardList className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Room Requests List</Title>
              <Text type="secondary">Review and approve student room applications</Text>
            </div>
          </div>
          {!loading && (
            <div className="bg-white p-3 px-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <Badge status="processing" color="#2563eb" />
              <Text strong className="text-[11px] uppercase tracking-wider text-slate-500">
                {requests.length} Requests Found
              </Text>
            </div>
          )}
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <FilterSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            {/* Quick Metrics */}
            <Row gutter={[24, 24]} className="mb-8">
              {[
                { label: 'New Requests', val: requests.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-amber-500' },
                { label: 'Approved', val: requests.filter(r => r.status === 'approved').length, icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Rejected', val: requests.filter(r => r.status === 'rejected').length, icon: XCircle, color: 'text-rose-500' },
              ].map((stat, i) => (
                <Col xs={24} md={8} key={i}>
                  <Card className="border-none shadow-sm rounded-2xl">
                    <Statistic 
                      title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</span>} 
                      value={stat.val} 
                      prefix={<stat.icon size={18} className={`${stat.color} mr-2`} />}
                      valueStyle={{ fontWeight: 800 }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Filter Toolbar */}
            <Card className="border-none shadow-sm rounded-2xl mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
                  <Filter size={18} className="text-slate-300" />
                  <Select 
                    value={statusFilter} 
                    onChange={setStatusFilter} 
                    bordered={false} 
                    className="w-full font-medium"
                  >
                    <Select.Option value="all">Display All Requests</Select.Option>
                    <Select.Option value="pending">Awaiting Review</Select.Option>
                    <Select.Option value="approved">Approved Requests</Select.Option>
                    <Select.Option value="rejected">Rejected Ledger</Select.Option>
                  </Select>
                </div>
                <Button 
                  icon={<RefreshCw size={16}/>} 
                  onClick={fetchRequests} 
                  className="rounded-xl h-12 w-12 flex items-center justify-center border-slate-200" 
                />
              </div>
            </Card>

            {/* Main Table */}
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              {requests.length > 0 ? (
                <Table 
                  dataSource={requests} 
                  columns={columns} 
                  rowKey="id" 
                  pagination={{ pageSize: 8, position: ['bottomCenter'], showSizeChanger: false }}
                />
              ) : (
                <div className="py-24">
                  <Empty 
                    image={<div className="bg-slate-50 p-8 rounded-full inline-block mb-4"><Inbox size={64} className="text-slate-200" /></div>}
                    description={<Text className="text-slate-400 block">No requests matching these criteria found.</Text>}
                  />
                </div>
              )}
            </Card>
          </>
        )}

        {/* Authorization Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ClipboardList size={20}/> Review Request</div>}
          open={dialogOpen}
          onCancel={() => setDialogOpen(false)}
          footer={[
            <Button key="back" onClick={() => setDialogOpen(false)} className="rounded-xl h-11 px-6">Cancel</Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={processing} 
              onClick={handleDecisionSubmit}
              className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-blue-100"
            >
              Confirm Decision
            </Button>
          ]}
          width={600}
          className="rounded-[32px]"
        >
          {selectedRequest && (
            <div className="mt-6 space-y-6">
              <Descriptions bordered column={1} className="bg-slate-50/50 rounded-2xl overflow-hidden">
                <Descriptions.Item label="Student Name">{selectedRequest.Student?.username}</Descriptions.Item>
                <Descriptions.Item label="Room Requested">Room {selectedRequest.Room?.room_number} ({selectedRequest.Room?.RoomType?.name})</Descriptions.Item>
              </Descriptions>

              <div className="space-y-4">
                <div>
                  <Text strong className="text-[11px] uppercase text-slate-400 block mb-2 tracking-widest">Warden Decision</Text>
                  <Select className="w-full h-12" value={decision} onChange={setDecision}>
                    <Select.Option value="approved">Approve & Allot Room</Select.Option>
                    <Select.Option value="rejected">Reject Request</Select.Option>
                    <Select.Option value="cancelled">Cancel Request</Select.Option>
                  </Select>
                </div>

                <div>
                  <Text strong className="text-[11px] uppercase text-slate-400 block mb-2 tracking-widest">Comments / Remarks</Text>
                  <TextArea 
                    rows={4} 
                    className="rounded-2xl p-4 border-slate-200" 
                    placeholder="Add your comments here..." 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default RoomRequests;