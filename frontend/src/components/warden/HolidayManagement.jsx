import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { CalendarDays, Plus, Calendar, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';

const HolidayManagement = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: '',
    description: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await wardenAPI.getHolidays();
      setHolidays(response.data.data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setMessage({ type: 'error', text: 'Failed to fetch holidays' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await wardenAPI.createHoliday(formData);
      
      setMessage({ type: 'success', text: 'Holiday created successfully!' });
      setFormData({
        name: '',
        date: '',
        type: '',
        description: ''
      });
      setShowCreateModal(false);
      fetchHolidays();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to create holiday' 
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      await wardenAPI.deleteHoliday(holidayId);
      setMessage({ type: 'success', text: 'Holiday deleted successfully!' });
      fetchHolidays();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to delete holiday' 
      });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getHolidayTypeColor = (type) => {
    switch (type) {
      case 'national':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'religious':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'institutional':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'other':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const isUpcoming = (date) => {
    return new Date(date) > new Date();
  };

  const isPast = (date) => {
    return new Date(date) < new Date();
  };

  const isToday = (date) => {
    const today = new Date();
    const holidayDate = new Date(date);
    return today.toDateString() === holidayDate.toDateString();
  };

  const getDateStatus = (date) => {
    if (isToday(date)) {
      return { status: 'today', label: 'Today', color: 'bg-blue-100 text-blue-800' };
    } else if (isUpcoming(date)) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'past', label: 'Past', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const holidayTypes = [
    { value: 'national', label: 'National Holiday' },
    { value: 'religious', label: 'Religious Holiday' },
    { value: 'institutional', label: 'Institutional Holiday' },
    { value: 'other', label: 'Other' }
  ];

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
          <h1 className="text-3xl font-bold text-gray-900">Holiday Management</h1>
          <p className="text-gray-600 mt-2">Manage hostel holidays and special days</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Add Holiday
        </button>
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CalendarDays className="text-blue-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Holidays</p>
              <p className="text-2xl font-bold text-blue-900">{holidays.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Calendar className="text-green-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-green-900">
                {holidays.filter(h => isUpcoming(h.date)).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CheckCircle className="text-blue-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Today</p>
              <p className="text-2xl font-bold text-blue-900">
                {holidays.filter(h => isToday(h.date)).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Calendar className="text-gray-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Past</p>
              <p className="text-2xl font-bold text-gray-900">
                {holidays.filter(h => isPast(h.date)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Holidays Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            <CalendarDays className="text-gray-400 mr-2" size={20} />
            <h2 className="text-lg font-medium text-gray-900">Holidays Calendar</h2>
          </div>
        </div>

        {holidays.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Holiday Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holidays
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((holiday) => {
                    const dateStatus = getDateStatus(holiday.date);
                    return (
                      <tr key={holiday.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="text-green-600 mr-2" size={16} />
                            <div className="text-sm font-medium text-gray-900">
                              {holiday.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(holiday.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHolidayTypeColor(holiday.type)}`}>
                            {holidayTypes.find(t => t.value === holiday.type)?.label || holiday.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dateStatus.color}`}>
                            {dateStatus.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {holiday.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteHoliday(holiday.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} />
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
            <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No holidays</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by adding holidays for your hostel.
            </p>
          </div>
        )}
      </div>

      {/* Create Holiday Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Holiday</h3>
              
              <form onSubmit={handleCreateHoliday} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Independence Day"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Type</option>
                    {holidayTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                                        {createLoading ? 'Adding...' : 'Add Holiday'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        name: '',
                        date: '',
                        type: '',
                        description: ''
                      });
                      setMessage({ type: '', text: '' });
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

export default HolidayManagement;
