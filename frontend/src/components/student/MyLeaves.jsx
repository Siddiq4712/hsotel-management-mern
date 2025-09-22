import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { Calendar } from 'lucide-react';

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await studentAPI.getMyLeaves();
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
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

        {leaves.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leave applications</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your leave applications will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLeaves;
