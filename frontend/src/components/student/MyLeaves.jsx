import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { Calendar, FileText, CheckCircle, AlertCircle, Filter, RefreshCw, ChevronDown, ChevronUp, Search, Eye } from 'lucide-react';
import moment from 'moment';

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { classes: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    approved: { classes: 'bg-green-100 text-green-800', label: 'Approved' },
    rejected: { classes: 'bg-red-100 text-red-800', label: 'Rejected' }
  };
  const config = statusConfig[status] || { classes: 'bg-gray-100 text-gray-800', label: 'Unknown' };
  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.classes}`}>
      {config.label}
    </span>
  );
};

// Leave details modal component
const LeaveDetailsModal = ({ leave, onClose }) => {
  if (!leave) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-90vh overflow-y-auto">
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 rounded-t-lg flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Leave Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <div className="text-sm text-gray-500">Leave Type</div>
            <div className="font-semibold capitalize">{leave.leave_type}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">From Date</div>
              <div className="font-semibold">{moment(leave.from_date).format('MMM DD, YYYY')}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">To Date</div>
              <div className="font-semibold">{moment(leave.to_date).format('MMM DD, YYYY')}</div>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <StatusBadge status={leave.status} />
            {leave.approved_by && (
              <div className="text-xs text-gray-500 mt-1">
                Processed by: {leave.approved_by.username}
              </div>
            )}
          </div>
          
          <div>
            <div className="text-sm text-gray-500 mb-1">Reason</div>
            <div className="bg-gray-50 p-3 rounded-md text-gray-700 whitespace-pre-wrap break-words">
              {leave.reason}
            </div>
          </div>
          
          {leave.comment && (
            <div>
              <div className="text-sm text-gray-500 mb-1">Admin Comment</div>
              <div className="bg-gray-50 p-3 rounded-md text-gray-700 whitespace-pre-wrap break-words">
                {leave.comment}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500 pt-2">
            Submitted on {moment(leave.createdAt).format('MMM DD, YYYY [at] h:mm A')}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const LeaveManagement = () => {
  // State for leave application form
  const [formData, setFormData] = useState({
    leave_type: '',
    from_date: '',
    to_date: '',
    reason: ''
  });
  
  // State for leave history and filtering
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    searchQuery: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch leaves when component mounts or refresh is triggered
  useEffect(() => {
    fetchLeaves();
  }, [refreshTrigger]);

  // Apply filters whenever leaves or filters change
  useEffect(() => {
    applyFilters();
  }, [leaves, filters]);

  // Fetch all leave applications
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyLeaves();
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to the leaves list
  const applyFilters = () => {
    let result = [...leaves];
    
    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter(leave => leave.status === filters.status);
    }
    
    // Filter by leave type
    if (filters.type !== 'all') {
      result = result.filter(leave => leave.leave_type === filters.type);
    }
    
    // Filter by search query (search in reason)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(leave => 
        leave.reason?.toLowerCase().includes(query) || 
        leave.leave_type?.toLowerCase().includes(query)
      );
    }
    
    // Sort by creation date (newest first)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    setFilteredLeaves(result);
  };

  // Handle form submission for new leave application
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await studentAPI.applyLeave(formData);
      setMessage({ type: 'success', text: 'Leave application submitted successfully!' });
      setFormData({
        leave_type: '',
        from_date: '',
        to_date: '',
        reason: ''
      });
      // Refresh the leave list after successful submission
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to submit leave application' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  // Open leave details modal
  const openLeaveDetails = (leave) => {
    setSelectedLeave(leave);
  };

  // Get unique leave types from the leaves array
  const leaveTypes = ['all', ...new Set(leaves.map(leave => leave.leave_type))];

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
        <p className="text-gray-600 mt-1">Apply for leave and track your applications</p>
      </div>
      
      {/* Main content - side by side layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Apply for Leave */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FileText className="text-gray-500 mr-2" size={20} />
              <h2 className="text-lg font-medium text-gray-900">Apply for Leave</h2>
            </div>
            
            {message.text && (
              <div className={`mb-4 p-4 rounded-lg flex items-center ${
                message.type === 'success' 
                  ? 'bg-green-100 border border-green-400 text-green-700' 
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle size={20} className="mr-2 flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type *
                </label>
                <select
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Leave Type</option>
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="vacation">Vacation Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date *
                </label>
                <input
                  type="date"
                  name="from_date"
                  value={formData.from_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date *
                </label>
                <input
                  type="date"
                  name="to_date"
                  value={formData.to_date}
                  onChange={handleChange}
                  min={formData.from_date || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Leave *
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please provide detailed reason for your leave..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({
                    leave_type: '',
                    from_date: '',
                    to_date: '',
                    reason: ''
                  })}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Right column - Leave History */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <Calendar className="text-gray-400 mr-2" size={20} />
                <h2 className="text-lg font-medium text-gray-900">Leave History</h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  className="text-gray-600 hover:text-gray-900 flex items-center text-sm"
                >
                  <RefreshCw size={16} className="mr-1" />
                  Refresh
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md flex items-center text-sm"
                >
                  <Filter size={16} className="mr-1" />
                  Filters
                  {showFilters ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                </button>
              </div>
            </div>
            
            {/* Filters section */}
            {showFilters && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4">
                <div className="min-w-[180px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="min-w-[180px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Types</option>
                    {leaveTypes.filter(type => type !== 'all').map(type => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-grow min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="searchQuery"
                      value={filters.searchQuery}
                      onChange={handleFilterChange}
                      placeholder="Search in reasons..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Leave list */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredLeaves.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLeaves.map((leave) => {
                      const fromDate = moment(leave.from_date);
                      const toDate = moment(leave.to_date);
                      const duration = toDate.diff(fromDate, 'days') + 1; // Including both start and end date
                      
                      return (
                        <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 capitalize">{leave.leave_type}</div>
                            <div className="text-xs text-gray-500">{moment(leave.createdAt).format('MMM DD, YYYY')}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{fromDate.format('MMM DD')} - {toDate.format('MMM DD, YYYY')}</div>
                            <div className="text-xs text-gray-500">{duration} {duration === 1 ? 'day' : 'days'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={leave.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>
                              {leave.reason}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openLeaveDetails(leave)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <Eye size={16} className="mr-1" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No leave applications found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.status !== 'all' || filters.type !== 'all' || filters.searchQuery
                    ? "Try changing your filters or search criteria."
                    : "Get started by applying for a leave."}
                </p>
                {(filters.status !== 'all' || filters.type !== 'all' || filters.searchQuery) && (
                  <button
                    onClick={() => setFilters({ status: 'all', type: 'all', searchQuery: '' })}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Leave details modal */}
      {selectedLeave && (
        <LeaveDetailsModal 
          leave={selectedLeave} 
          onClose={() => setSelectedLeave(null)} 
        />
      )}
    </div>
  );
};

export default LeaveManagement;
