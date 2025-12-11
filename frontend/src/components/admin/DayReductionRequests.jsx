// src/pages/Admin/DayReductionRequests.jsx
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Table, Button, Select, Input, Modal, Tag, Spin } from 'antd'; // Ant Design imports
import { toast } from 'react-toastify'; // react-toastify import
import { CalendarDays, Check, X } from 'lucide-react';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const statusColors = {
  pending_admin: 'orange', // Ant Design color presets
  approved_by_admin: 'blue',
  rejected_by_admin: 'red',
  approved_by_warden: 'green',
  rejected_by_warden: 'red',
};

const DayReductionRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'pending_admin' });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getDayReductionRequests(filters);
      setRequests(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch day reduction requests.');
      console.error('Error fetching day reduction requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (value) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  const openModal = (request) => {
    setSelectedRequest(request);
    setAdminRemarks(request.admin_remarks || '');
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedRequest(null);
    setAdminRemarks('');
  };

  const handleStatusUpdate = async (action) => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await adminAPI.updateDayReductionRequestStatus(selectedRequest.id, {
        action,
        admin_remarks: adminRemarks
      });
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      fetchRequests(); // Refresh the list
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} request.`);
      console.error(`Error ${action} day reduction request:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    {
      title: 'Student',
      dataIndex: ['Student', 'username'],
      key: 'student',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Hostel',
      dataIndex: ['Hostel', 'name'],
      key: 'hostel',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_, record) => (
        <span>
          {moment(record.from_date).format('MMM D, YYYY')} - {moment(record.to_date).format('MMM D, YYYY')}
        </span>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>
          {status.replace(/_/g, ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Admin Remarks',
      dataIndex: 'admin_remarks',
      key: 'admin_remarks',
      ellipsis: true,
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          {record.status === 'pending_admin' && (
            <Button type="default" size="small" onClick={() => openModal(record)}>
              Review
            </Button>
          )}
          {['approved_by_admin', 'rejected_by_admin', 'approved_by_warden', 'rejected_by_warden'].includes(record.status) && (
            <Button type="default" size="small" onClick={() => openModal(record)} disabled>
              View
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <CalendarDays className="mr-3 text-blue-600" size={32} /> Day Reduction Requests
        </h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex gap-4 items-center">
          <Select
            value={filters.status}
            onChange={handleFilterChange}
            style={{ width: 200 }}
            placeholder="Filter by Status"
          >
            <Option value="all">All Statuses</Option>
            <Option value="pending_admin">Pending Admin Review</Option>
            <Option value="approved_by_admin">Approved by Admin (Pending Warden)</Option>
            <Option value="rejected_by_admin">Rejected by Admin</Option>
            <Option value="approved_by_warden">Approved by Warden</Option>
            <Option value="rejected_by_warden">Rejected by Warden</Option>
          </Select>
          {/* Add more filters as needed */}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Spin spinning={loading}>
          <Table
            dataSource={requests}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: <div className="text-center py-8 text-gray-500">No day reduction requests found.</div>
            }}
          />
        </Spin>
      </div>

      <Modal
        title="Review Day Reduction Request"
        open={isModalVisible}
        onCancel={closeModal}
        footer={[
          <Button key="cancel" onClick={closeModal} disabled={isProcessing}>
            Cancel
          </Button>,
          <Button
            key="reject"
            danger
            onClick={() => handleStatusUpdate('reject')}
            loading={isProcessing}
            icon={<X size={16} />}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            onClick={() => handleStatusUpdate('approve')}
            loading={isProcessing}
            icon={<Check size={16} />}
          >
            Approve
          </Button>,
        ]}
      >
        {selectedRequest && (
          <div className="space-y-4 py-4">
            <p><strong>Student:</strong> {selectedRequest.Student?.username}</p>
            <p><strong>Hostel:</strong> {selectedRequest.Hostel?.name}</p>
            <p><strong>Dates:</strong> {moment(selectedRequest.from_date).format('MMM D, YYYY')} - {moment(selectedRequest.to_date).format('MMM D, YYYY')}</p>
            <p><strong>Reason:</strong> {selectedRequest.reason}</p>
            <p><strong>Current Status:</strong> <Tag color={statusColors[selectedRequest.status]}>{selectedRequest.status.replace(/_/g, ' ').toUpperCase()}</Tag></p>

            <div className="grid gap-2">
              <label htmlFor="adminRemarks" className="text-sm font-medium">Admin Remarks (Optional)</label>
              <TextArea
                id="adminRemarks"
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Add remarks for your decision..."
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DayReductionRequestsAdmin;
