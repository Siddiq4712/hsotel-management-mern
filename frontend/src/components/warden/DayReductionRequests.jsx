// src/pages/Warden/DayReductionRequests.jsx
import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Table, Button, Select, Input, Modal, Tag, Spin } from 'antd'; // Ant Design imports
import { toast } from 'react-toastify'; // react-toastify import
import { CalendarDays } from 'lucide-react'; // Removed Check, X as they are no longer used for actions
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const statusColors = {
  pending_admin: 'orange',
  approved_by_admin: 'blue',
  rejected_by_admin: 'red',
  approved_by_warden: 'green', // Still keep these for display if status is already in this state
  rejected_by_warden: 'red',   // from historical data
};

const DayReductionRequestsWarden = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  // Default filter for warden to see requests approved by admin
  const [filters, setFilters] = useState({ status: 'approved_by_admin' });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [wardenRemarks, setWardenRemarks] = useState(''); // Still useful for displaying past remarks

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getDayReductionRequests(filters);
      // Ensure we access the nested 'data' array as per previous correction
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
    // Populate warden remarks if already available in the request (e.g., from a 'rejected_by_warden' status historically)
    setWardenRemarks(request.warden_remarks || '');
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedRequest(null);
    setWardenRemarks('');
  };

  // The handleStatusUpdate function is REMOVED as the warden no longer takes action.

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
      title: 'Admin Remarks',
      dataIndex: 'admin_remarks',
      key: 'admin_remarks',
      ellipsis: true,
      width: 150,
      render: (text) => text || '-',
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
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        // Warden can only view details, no approval/rejection action
        <Button type="default" size="small" onClick={() => openModal(record)}>
          View Details
        </Button>
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
            <Option value="approved_by_admin">Approved by Admin (View)</Option> {/* Renamed for clarity */}
            <Option value="approved_by_warden">Approved by Warden (Final)</Option>
            <Option value="rejected_by_warden">Rejected by Warden (Final)</Option>
            <Option value="pending_admin">Pending Admin Review</Option> {/* Still viewable if needed */}
            <Option value="rejected_by_admin">Rejected by Admin</Option>
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
              emptyText: <div className="text-center py-8 text-gray-500">No day reduction requests found for your hostel.</div>
            }}
          />
        </Spin>
      </div>

      <Modal
        title="Day Reduction Request Details"
        open={isModalVisible}
        onCancel={closeModal}
        // Footer now only has a "Close" button
        footer={[
          <Button key="close" onClick={closeModal}>
            Close
          </Button>,
        ]}
      >
        {selectedRequest && (
          <div className="space-y-4 py-4">
            <p><strong>Student:</strong> {selectedRequest.Student?.username}</p>
            <p><strong>Hostel:</strong> {selectedRequest.Hostel?.name}</p>
            <p><strong>Dates:</strong> {moment(selectedRequest.from_date).format('MMM D, YYYY')} - {moment(selectedRequest.to_date).format('MMM D, YYYY')}</p>
            <p><strong>Reason:</strong> {selectedRequest.reason}</p>
            <p><strong>Admin Remarks:</strong> {selectedRequest.admin_remarks || '-'}</p>
            <p><strong>Current Status:</strong> <Tag color={statusColors[selectedRequest.status]}>{selectedRequest.status.replace(/_/g, ' ').toUpperCase()}</Tag></p>

            <div className="grid gap-2">
              <label htmlFor="wardenRemarks" className="text-sm font-medium">Warden Remarks (If any, from previous stages)</label>
              <TextArea
                id="wardenRemarks"
                value={selectedRequest.warden_remarks || wardenRemarks || '-'} // Display existing warden remarks
                rows={3}
                disabled={true} // Warden cannot add or edit remarks here
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DayReductionRequestsWarden;
