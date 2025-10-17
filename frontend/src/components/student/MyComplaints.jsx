import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { 
  MessageCircle, Calendar, CheckCircle, Clock, AlertCircle, XCircle, 
  User, AlertTriangle
} from 'lucide-react';

const ComplaintManagement = () => {
  // State for complaint form
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  
  // State for complaints list and UI
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch complaints on component mount
  useEffect(() => {
    fetchComplaints();
  }, []);

  // Fetch all complaints
  const fetchComplaints = async () => {
    try {
      const response = await studentAPI.getMyComplaints();
      setComplaints(response.data.data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await studentAPI.createComplaint(formData);
      setMessage({ type: 'success', text: 'Complaint submitted successfully!' });
      setFormData({
        subject: '',
        description: '',
        category: '',
        priority: 'medium'
      });
      // Refresh complaints list
      fetchComplaints();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to submit complaint' 
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

  // Helper functions for status display
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
        return <CheckCircle className="text-green-600" size={20} />;
      case 'in_progress':
        return <Clock className="text-blue-600" size={20} />;
      case 'submitted':
        return <AlertCircle className="text-yellow-600" size={20} />;
      case 'closed':
        return <XCircle className="text-gray-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-400" size={20} />;
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

  // Categories and priorities data
  const categories = [
    { value: 'room', label: 'Room Issues', description: 'Problems related to your room' },
    { value: 'mess', label: 'Mess Issues', description: 'Food quality or mess service problems' },
    { value: 'facility', label: 'Facility Issues', description: 'Problems with hostel facilities' },
    { value: 'maintenance', label: 'Maintenance', description: 'Repair or maintenance requests' },
    { value: 'discipline', label: 'Discipline Issues', description: 'Behavioral or rule-related issues' },
    { value: 'other', label: 'Other', description: 'Any other issues' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', description: 'Non-urgent issues' },
    { value: 'medium', label: 'Medium', description: 'Standard priority' },
    { value: 'high', label: 'High', description: 'Important issues requiring quick attention' },
    { value: 'urgent', label: 'Urgent', description: 'Critical issues requiring immediate attention' }
  ];

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Complaint Management</h1>
        <p className="text-gray-600 mt-1">Submit and track complaints related to your hostel stay</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <MessageCircle className="text-gray-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {complaints.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <AlertCircle className="text-yellow-600" size={24} />
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
      </div>

      {/* Main content - side by side layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Submit Complaint Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="text-gray-500 mr-2" size={20} />
              <h2 className="text-lg font-medium text-gray-900">Submit Complaint</h2>
            </div>

            {message.text && (
              <div className={`mb-4 p-3 rounded-lg flex items-center ${
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief summary of your complaint"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {formData.category && (
                  <p className="mt-1 text-xs text-gray-600">
                    {categories.find(cat => cat.value === formData.category)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {priorities.map(priority => (
                    <label
                      key={priority.value}
                      className={`relative flex flex-col p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        formData.priority === priority.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={priority.value}
                        checked={formData.priority === priority.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          formData.priority === priority.value
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.priority === priority.value && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {priority.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{priority.description}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide detailed information about your complaint..."
                  required
                />
                <p className="mt-1 text-xs text-gray-600">
                  Be specific to help us address your concern effectively.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
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
                    'Submit Complaint'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({
                    subject: '',
                    description: '',
                    category: '',
                    priority: 'medium'
                  })}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Guidelines */}
            <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="text-amber-600 mt-0.5 mr-2 flex-shrink-0" size={16} />
                <div>
                  <h3 className="text-xs font-medium text-amber-800 mb-1">Guidelines</h3>
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    <li>• Be respectful and factual in your complaint</li>
                    <li>• Provide specific details when possible</li>
                    <li>• Use appropriate priority levels</li>
                    <li>• False complaints may result in action</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - Complaints History */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center">
                <MessageCircle className="text-gray-400 mr-2" size={20} />
                <h2 className="text-lg font-medium text-gray-900">Complaint History</h2>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : complaints.length > 0 ? (
              <div className="overflow-auto max-h-[800px]">
                <div className="divide-y divide-gray-200">
                  {complaints.map((complaint) => (
                    <div key={complaint.id} className="p-5 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-base font-medium text-gray-900">
                              {complaint.subject}
                            </h3>
                            <div className="flex items-center">
                              {getStatusIcon(complaint.status)}
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                                {complaint.status.replace('_', ' ').charAt(0).toUpperCase() + complaint.status.replace('_', ' ').slice(1)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 mb-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(complaint.category)}`}>
                              {complaint.category.charAt(0).toUpperCase() + complaint.category.slice(1)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>
                              {complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)} Priority
                            </span>
                          </div>

                          <p className="text-sm text-gray-700 mb-3">
                            {complaint.description}
                          </p>

                          <div className="flex flex-wrap items-center text-xs text-gray-500 space-x-4">
                            <div className="flex items-center">
                              <Calendar className="mr-1" size={14} />
                              Submitted: {new Date(complaint.createdAt).toLocaleDateString()}
                            </div>
                            {complaint.resolved_date && (
                              <div className="flex items-center">
                                <CheckCircle className="mr-1" size={14} />
                                Resolved: {new Date(complaint.resolved_date).toLocaleDateString()}
                              </div>
                            )}
                            {complaint.AssignedTo && (
                              <div className="flex items-center">
                                <User className="mr-1" size={14} />
                                Assigned to: {complaint.AssignedTo.username}
                              </div>
                            )}
                          </div>

                          {complaint.resolution && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <h4 className="text-xs font-medium text-green-800 mb-1">Resolution</h4>
                              <p className="text-sm text-green-700">
                                {complaint.resolution}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No complaints submitted</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your submitted complaints will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintManagement;
