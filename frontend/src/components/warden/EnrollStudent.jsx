import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { User, Lock, Calendar, CheckCircle, AlertCircle, Bed, CreditCard } from 'lucide-react';

const EnrollStudent = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    session_id: '',
    requires_bed: false,
    paid_initial_emi: false
  });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [emiAmount, setEmiAmount] = useState(5000); // Default EMI amount

  useEffect(() => {
    fetchSessions();
    fetchEmiSettings();
  }, []);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await wardenAPI.getSessions();
      setSessions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch sessions. Please contact admin to create sessions.' 
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchEmiSettings = async () => {
    try {
      // You would implement this API endpoint to get current EMI amount
      const response = await wardenAPI.getHostelSettings();
      if (response.data?.monthly_emi_amount) {
        setEmiAmount(response.data.monthly_emi_amount);
      }
    } catch (error) {
      console.error('Error fetching EMI settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validation for bed requirement and EMI payment
    if (formData.requires_bed && !formData.paid_initial_emi) {
      setMessage({ 
        type: 'error', 
        text: 'Initial 5-month EMI payment is required for bed allocation' 
      });
      setLoading(false);
      return;
    }

    try {
      await wardenAPI.enrollStudent({
        ...formData,
        session_id: parseInt(formData.session_id)
      });
      
      setMessage({ type: 'success', text: 'Student enrolled successfully!' });
      setFormData({
        username: '',
        password: '',
        email: '',
        session_id: '',
        requires_bed: false,
        paid_initial_emi: false
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to enroll student' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Enroll Student</h1>
        <p className="text-gray-600 mt-2">Add a new student to the hostel</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Username *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter student username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter student email (optional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                name="session_id"
                value={formData.session_id}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={sessionsLoading}
              >
                <option value="">
                  {sessionsLoading ? 'Loading sessions...' : 'Select Session'}
                </option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
              {sessionsLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {sessions.length === 0 && !sessionsLoading && (
              <p className="mt-1 text-sm text-red-600">
                No sessions available. Please contact admin to create sessions.
              </p>
            )}
          </div>

          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="requires_bed"
                id="requires_bed"
                checked={formData.requires_bed}
                onChange={handleChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="requires_bed" className="ml-3 text-sm font-medium text-gray-700 flex items-center">
                <Bed size={20} className="mr-2 text-blue-500" />
                Student requires bed allocation
              </label>
            </div>
            
            {formData.requires_bed && (
              <div className="ml-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start mb-3">
                  <AlertCircle size={20} className="mr-2 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-700">
                      Hostel policy requires payment of first 5 months' EMI (₹{(emiAmount * 5).toLocaleString()}) 
                      for bed allocation.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="paid_initial_emi"
                    id="paid_initial_emi"
                    checked={formData.paid_initial_emi}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="paid_initial_emi" className="ml-3 text-sm font-medium text-gray-700 flex items-center">
                    <CreditCard size={20} className="mr-2 text-green-500" />
                    Initial 5-month EMI payment received (₹{(emiAmount * 5).toLocaleString()})
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || sessions.length === 0 || (formData.requires_bed && !formData.paid_initial_emi)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enrolling...' : 'Enroll Student'}
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({
                username: '',
                password: '',
                email: '',
                session_id: '',
                requires_bed: false,
                paid_initial_emi: false
              })}
              className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollStudent;
