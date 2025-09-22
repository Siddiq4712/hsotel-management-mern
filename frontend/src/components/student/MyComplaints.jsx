import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { MessageCircle, Calendar, CheckCircle, Clock, AlertCircle, XCircle, User } from 'lucide-react';

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Complaints</h1>
        <p className="text-gray-600 mt-2">Track the status of your submitted complaints</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <MessageCircle className="text-gray-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Complaints</p>
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

      {/* Complaints List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            <MessageCircle className="text-gray-400 mr-2" size={20} />
            <h2 className="text-lg font-medium text-gray-900">Complaint History</h2>
          </div>
        </div>

        {complaints.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {complaint.subject}
                      </h3>
                      <div className="flex items-center">
                        {getStatusIcon(complaint.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('_', ' ').charAt(0).toUpperCase() + complaint.status.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(complaint.category)}`}>
                        {complaint.category.charAt(0).toUpperCase() + complaint.category.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>
                        {complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)} Priority
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-4">
                      {complaint.description}
                    </p>

                    <div className="flex items-center text-sm text-gray-500 space-x-4">
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
                      {complaint.AssignedTo && (
                        <div className="flex items-center">
                          <User className="mr-1" size={16} />
                          Assigned to: {complaint.AssignedTo.username}
                        </div>
                      )}
                    </div>

                    {complaint.resolution && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="text-sm font-medium text-green-800 mb-2">Resolution</h4>
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
  );
};

export default MyComplaints;
