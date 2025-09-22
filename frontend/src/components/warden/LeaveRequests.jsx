// components/warden/LeaveRequests.jsx
import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Calendar, User, Clock, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';

const LeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLeaveRequests();
  }, [filter]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await wardenAPI.getLeaveRequests(params);
      setLeaveRequests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (leave, action) => {
    setSelectedLeave(leave);
    setActionType(action);
    setRemarks('');
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedLeave || !actionType) return;

    setActionLoading(true);
    try {
      await wardenAPI.approveLeave(selectedLeave.id, {
        status: actionType,
        remarks: remarks
      });
      
      // Refresh the list
      await fetchLeaveRequests();
      setShowModal(false);
      setSelectedLeave(null);
      setActionType('');
      setRemarks('');
    } catch (error) {
      console.error('Error updating leave request:', error);
      alert('Error updating leave request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="text-green-600" size={16} />;
      case 'rejected':
        return <XCircle className="text-red-600" size={16} />;
      case 'pending':
        return <Clock className="text-yellow-600" size={16} />;
      default:
        return <AlertCircle className="text-gray-400" size={16} />;
    }
  };

  const calculateDays = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-600 mt-2">Review and manage student leave requests</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Calendar className="text-blue-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-blue-900">{leaveRequests.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Clock className="text-yellow-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {leaveRequests.filter(l => l.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-900">
                {leaveRequests.filter(l => l.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <XCircle className="text-red-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-900">
                {leaveRequests.filter(l => l.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="text-gray-400 mr-2" size={20} />
              <h2 className="text-lg font-medium text-gray-900">
                Leave Requests {filter !== 'all' && `(${filter.charAt(0).toUpperCase() + filter.slice(1)})`}
              </h2>
            </div>
            <span className="text-sm text-gray-500">
              {leaveRequests.length} requests
            </span>
          </div>
        </div>

        {leaveRequests.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {leaveRequests.map((leave) => (
              <div key={leave.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center">
                        <User className="text-blue-600 mr-2" size={16} />
                        <h3 className="text-lg font-medium text-gray-900">
                          {leave.Student?.username || 'Unknown Student'}
                        </h3>
                      </div>
                      
                      <div className="flex items-center">
                        {getStatusIcon(leave.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Leave Type</p>
                        <p className="font-medium text-gray-900">
                          {leave.leave_type?.charAt(0).toUpperCase() + leave.leave_type?.slice(1)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-medium text-gray-900">
                          {new Date(leave.from_date).toLocaleDateString()} - {new Date(leave.to_date).toLocaleDateString()}
                          <span className="text-sm text-gray-500 ml-2">
                            ({calculateDays(leave.from_date, leave.to_date)} days)
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600">Applied Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(leave.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Reason</p>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded-md">
                        {leave.reason}
                      </p>
                    </div>

                    {leave.remarks && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Warden's Remarks</p>
                        <p className="text-gray-800 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                          {leave.remarks}
                        </p>
                      </div>
                    )}

                    {leave.ApprovedBy && (
                      <div className="text-sm text-gray-500">
                        {leave.status === 'approved' ? 'Approved' : 'Rejected'} by: {leave.ApprovedBy.username} 
                        {leave.approved_date && (
                          <span> on {new Date(leave.approved_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {leave.status === 'pending' && (
                    <div className="flex space-x-2 ml-6">
                      <button
                        onClick={() => handleAction(leave, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 flex items-center"
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(leave, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 flex items-center"
                      >
                        <XCircle size={16} className="mr-1" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {filter === 'all' ? 'No leave requests' : `No ${filter} leave requests`}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? 'Leave requests from students will appear here.' 
                : `${filter.charAt(0).toUpperCase() + filter.slice(1)} leave requests will appear here.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedLeave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType === 'approved' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Student: <span className="font-medium">{selectedLeave.Student?.username}</span></p>
                <p className="text-sm text-gray-600">Leave Type: <span className="font-medium">{selectedLeave.leave_type}</span></p>
                <p className="text-sm text-gray-600">Duration: <span className="font-medium">
                  {new Date(selectedLeave.from_date).toLocaleDateString()} - {new Date(selectedLeave.to_date).toLocaleDateString()}
                </span></p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks {actionType === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={actionType === 'approved' ? 'Optional approval remarks...' : 'Please provide reason for rejection...'}
                  required={actionType === 'rejected'}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmAction}
                  disabled={actionLoading || (actionType === 'rejected' && !remarks.trim())}
                  className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                    actionType === 'approved'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  } focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {actionLoading ? 'Processing...' : `${actionType === 'approved' ? 'Approve' : 'Reject'} Leave`}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedLeave(null);
                    setActionType('');
                    setRemarks('');
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
