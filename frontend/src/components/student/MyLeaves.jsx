import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { Calendar } from 'lucide-react';

// A helper component to display a status badge
const StatusBadge = ({ status }) => {
  const statusClasses = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const classes = statusClasses[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      // Assuming studentAPI.getMyLeaves() is correctly configured to send
      // the authentication token in its headers.
      const response = await studentAPI.getMyLeaves();
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      // Optional: Add user-friendly error handling here
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900">My Leave Applications</h1>
        <p className="text-gray-600 mt-2">View the status of your leave applications</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            <Calendar className="text-gray-400 mr-2" size={20} />
            <h2 className="text-lg font-medium text-gray-900">Leave History</h2>
          </div>
        </div>

        {/* --- START: ADDED THIS SECTION --- */}
        {leaves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {leave.leave_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(leave.from_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(leave.to_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <StatusBadge status={leave.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={leave.reason}>
                      {leave.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave applications</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your leave applications will appear here.
            </p>
          </div>
        )}
        {/* --- END: ADDED THIS SECTION --- */}
      </div>
    </div>
  );
};

export default MyLeaves;
