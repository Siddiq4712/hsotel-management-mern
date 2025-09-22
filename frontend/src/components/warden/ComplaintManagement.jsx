// components/warden/ComplaintManagement.jsx
import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { MessageCircle, User, Calendar, AlertTriangle, CheckCircle, Clock, XCircle, Filter } from 'lucide-react';

const ComplaintManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [filter, categoryFilter, priorityFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      
      const response = await wardenAPI.getComplaints(params);
      setComplaints(response.data.data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (complaint, status) => {
    setSelectedComplaint(complaint);
    setNewStatus(status);
    setResolution('');
    setShowModal(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedComplaint || !newStatus) return;

    setActionLoading(true);
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'resolved' && resolution.trim()) {
        updateData.resolution = resolution.trim();
      }

      await wardenAPI.updateComplaint(selectedComplaint.id, updateData);
      
      // Refresh the list
      await fetchComplaints();
      setShowModal(false);
      setSelectedComplaint(null);
      setNewStatus('');
      setResolution('');
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('Error updating complaint. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="text-green-600" size={16} />;
      case 'in_progress':
        return <Clock className="text-blue-600" size={16} />;
      case 'submitted':
        return <AlertTriangle className="text-yellow-600" size={16} />;
      case 'closed':
        return <XCircle className="text-gray-600" size={16} />;
      default:
        return <AlertTriangle className="text-gray-400" size={16} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'room':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'mess':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'facility':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'maintenance':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'discipline':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Complaint Management</h1>
          <p className="text-gray-600 mt-2">Review and manage student complaints</p>
        </div>
        
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="room">Room</option>
              <option value="mess">Mess</option>
              <option value="facility">Facility</option>
              <option value="maintenance">Maintenance</option>
              <option value="discipline">Discipline</option>
              <option value="other">Other</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <MessageCircle className="text-blue-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-blue-900">{complaints.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="text-yellow-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-yellow-900">
                {complaints.filter(c => c.status === 'submitted').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Clock className="text-blue-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-900">
                {complaints.filter(c => c.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-900">
                {complaints.filter(c => c.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <XCircle className="text-red-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-red-900">
                {complaints.filter(c => c.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="text-gray-400 mr-2" size={20} />
              <h2 className="text-lg font-medium text-gray-900">Complaints</h2>
            </div>
            <span className="text-sm text-gray-500">
              {complaints.length} complaints
            </span>
          </div>
        </div>

        {complaints.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center">
                        <User className="text-blue-600 mr-2" size={16} />
                        <h3 className="text-lg font-medium text-gray-900">
                          {complaint.Student?.username || 'Unknown Student'}
                        </h3>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(complaint.category)}`}>
                          {complaint.category?.charAt(0).toUpperCase() + complaint.category?.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority?.charAt(0).toUpperCase() + complaint.priority?.slice(1)}
                        </span>
                        <div className="flex items-center">
                          {getStatusIcon(complaint.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                            {complaint.status?.replace('_', ' ').charAt(0).toUpperCase() + complaint.status?.replace('_', ' ').slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-lg font-medium text-gray-800 mb-2">
                      {complaint.subject}
                    </h4>

                    <div className="mb-4">
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                        {complaint.description}
                      </p>
                    </div>

                    {complaint.resolution && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Resolution</p>
                        <p className="text-gray-800 bg-green-50 p-3 rounded-md border-l-4 border-green-400">
                          {complaint.resolution}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Calendar className="mr-1" size={16} />
                          Submitted: {new Date(complaint.createdAt).toLocaleDateString()}
                        </div>
                        {complaint.resolved_date && (
                          <div className="flex items-center">
                            <CheckCircle className="mr-1" size={16} />
                            Resolved: {new Date(complaint.resolved_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {complaint.AssignedTo && (
                        <div>
                          Assigned to: {complaint.AssignedTo.username}
                        </div>
                      )}
                    </div>
                  </div>

                  {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                    <div className="flex flex-col space-y-2 ml-6">
                      {complaint.status === 'submitted' && (
                        <button
                          onClick={() => handleStatusUpdate(complaint, 'in_progress')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                        >
                          Start Working
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleStatusUpdate(complaint, 'resolved')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500"
                      >
                        Mark Resolved
                      </button>
                      
                      <button
                        onClick={() => handleStatusUpdate(complaint, 'closed')}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 focus:ring-2 focus:ring-gray-500"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No complaints found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' && categoryFilter === 'all' && priorityFilter === 'all'
                ? 'Student complaints will appear here.'
                : 'No complaints match your current filters.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update Complaint Status
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Student: <span className="font-medium">{selectedComplaint.Student?.username}</span></p>
                <p className="text-sm text-gray-600">Subject: <span className="font-medium">{selectedComplaint.subject}</span></p>
                <p className="text-sm text-gray-600">New Status: <span className="font-medium">
                  {newStatus?.replace('_', ' ').charAt(0).toUpperCase() + newStatus?.replace('_', ' ').slice(1)}
                </span></p>
              </div>
              
              {newStatus === 'resolved' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe how the complaint was resolved..."
                    required
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={confirmStatusUpdate}
                  disabled={actionLoading || (newStatus === 'resolved' && !resolution.trim())}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Updating...' : 'Update Status'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedComplaint(null);
                    setNewStatus('');
                    setResolution('');
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

export default ComplaintManagement;
