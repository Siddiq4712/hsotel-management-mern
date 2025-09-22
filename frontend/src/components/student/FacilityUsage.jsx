import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { Wifi, Plus, Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

const FacilityUsage = () => {
  const [facilities, setFacilities] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [usageForm, setUsageForm] = useState({
    duration_minutes: '',
    remarks: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchFacilities();
    fetchUsageHistory();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await studentAPI.getFacilities();
      setFacilities(response.data.data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageHistory = async () => {
    try {
      const response = await studentAPI.getMyFacilityUsage();
      setUsageHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching usage history:', error);
    }
  };

  const handleUseFacility = async (facility) => {
    setSelectedFacility(facility);
    setUsageForm({ duration_minutes: '', remarks: '' });
    setShowUseModal(true);
  };

  const handleSubmitUsage = async (e) => {
    e.preventDefault();
    
    try {
      await studentAPI.useFacility({
        facility_id: selectedFacility.id,
        duration_minutes: parseInt(usageForm.duration_minutes),
        remarks: usageForm.remarks
      });
      
      setMessage({ type: 'success', text: 'Facility usage recorded successfully!' });
      setShowUseModal(false);
      setSelectedFacility(null);
      setUsageForm({ duration_minutes: '', remarks: '' });
      fetchUsageHistory();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to record facility usage' 
      });
    }
  };

  const calculateCost = (costPerUse, durationMinutes) => {
    if (!costPerUse || !durationMinutes) return 0;
    return (costPerUse * (durationMinutes / 60)).toFixed(2);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Hostel Facilities</h1>
        <p className="text-gray-600 mt-2">Use available facilities and track your usage</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} className="mr-2" />
          ) : (
            <AlertCircle size={20} className="mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* Available Facilities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Facilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div key={facility.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Wifi className="text-blue-600" size={24} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {facility.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {facility.HostelFacilityType?.name}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(facility.status)}`}>
                  {facility.status.charAt(0).toUpperCase() + facility.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {facility.capacity && (
                  <p className="text-sm text-gray-600">
                    <strong>Capacity:</strong> {facility.capacity} users
                  </p>
                )}
                {facility.cost_per_use > 0 && (
                  <p className="text-sm text-gray-600">
                    <strong>Cost:</strong> ₹{facility.cost_per_use} per hour
                  </p>
                )}
              </div>

              {facility.status === 'active' ? (
                <button
                  onClick={() => handleUseFacility(facility)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                                    <Plus size={16} className="mr-2" />
                  Use Facility
                </button>
              ) : (
                <div className="w-full bg-gray-300 text-gray-600 py-2 px-4 rounded-lg text-center">
                  {facility.status === 'maintenance' ? 'Under Maintenance' : 'Not Available'}
                </div>
              )}
            </div>
          ))}
        </div>

        {facilities.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Wifi className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No facilities available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Available facilities will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Usage History */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            <Clock className="text-gray-400 mr-2" size={20} />
            <h2 className="text-lg font-medium text-gray-900">Usage History</h2>
            <span className="ml-2 text-sm text-gray-500">
              ({usageHistory.length} records)
            </span>
          </div>
        </div>

        {usageHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usageHistory.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Wifi className="text-blue-600 mr-2" size={16} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {usage.facility?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {usage.facility?.facilityType?.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(usage.usage_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock size={16} className="mr-1" />
                        {usage.duration_minutes} minutes
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <DollarSign size={16} className="mr-1" />
                        ₹{usage.cost}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {usage.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No usage history</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your facility usage history will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Use Facility Modal */}
      {showUseModal && selectedFacility && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Use {selectedFacility.name}
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Facility Type:</strong> {selectedFacility.HostelFacilityType?.name}
                </p>
                {selectedFacility.cost_per_use > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Cost:</strong> ₹{selectedFacility.cost_per_use} per hour
                  </p>
                )}
              </div>
              
              <form onSubmit={handleSubmitUsage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={usageForm.duration_minutes}
                    onChange={(e) => setUsageForm({
                      ...usageForm,
                      duration_minutes: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                  {usageForm.duration_minutes && selectedFacility.cost_per_use > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      Estimated cost: ₹{calculateCost(selectedFacility.cost_per_use, usageForm.duration_minutes)}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={usageForm.remarks}
                    onChange={(e) => setUsageForm({
                      ...usageForm,
                      remarks: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Record Usage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUseModal(false);
                      setSelectedFacility(null);
                      setUsageForm({ duration_minutes: '', remarks: '' });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilityUsage;
