import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
// MODIFIED: Added the 'School' icon
import { User, Lock, Calendar, CheckCircle, AlertCircle, Bed, CreditCard, School } from 'lucide-react';

const EnrollStudent = () => {
  // MODIFIED: Added 'college' to the initial state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    session_id: '',
    college: '', // <-- ADDED
    requires_bed: false,
    paid_initial_emi: false
  });

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [emiAmount, setEmiAmount] = useState(5000);

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

    if (formData.requires_bed && !formData.paid_initial_emi) {
      setMessage({
        type: 'error',
        text: 'Initial 5-month EMI payment is required for bed allocation'
      });
      setLoading(false);
      return;
    }

    try {
      // The updated formData (with college) will be sent automatically
      await wardenAPI.enrollStudent({
        ...formData,
        session_id: parseInt(formData.session_id)
      });

      setMessage({ type: 'success', text: 'Student enrolled successfully!' });
      // MODIFIED: Reset the 'college' field as well
      setFormData({
        username: '',
        password: '',
        email: '',
        session_id: '',
        college: '', // <-- ADDED
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
          {/* Username, Email, Password fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Username *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter student username" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              {/* NOTE: You are missing the email icon, adding it for consistency */}
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter student email (optional)" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter password" required />
            </div>
          </div>

          {/* MODIFIED: ADDED THE NEW COLLEGE SELECTOR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">College *</label>
            <div className="relative">
              <School className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select name="college" value={formData.college} onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                <option value="">Select College</option>
                <option value="nec">NEC</option>
                <option value="lapc">LAPC</option>
              </select>
            </div>
          </div>

          {/* Session Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select name="session_id" value={formData.session_id} onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={sessionsLoading}>
                <option value="">{sessionsLoading ? 'Loading sessions...' : 'Select Session'}</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>{session.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bed and EMI section */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <input type="checkbox" name="requires_bed" id="requires_bed" checked={formData.requires_bed} onChange={handleChange} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="requires_bed" className="ml-3 text-sm font-medium text-gray-700 flex items-center">
                <Bed size={20} className="mr-2 text-blue-500" />Student requires bed allocation
              </label>
            </div>
            {formData.requires_bed && (
              <div className="ml-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mt-2">
                  <input type="checkbox" name="paid_initial_emi" id="paid_initial_emi" checked={formData.paid_initial_emi} onChange={handleChange} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="paid_initial_emi" className="ml-3 text-sm font-medium text-gray-700 flex items-center">
                    <CreditCard size={20} className="mr-2 text-green-500" />Initial 5-month EMI payment received (₹{(emiAmount * 5).toLocaleString()})
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading || sessions.length === 0 || (formData.requires_bed && !formData.paid_initial_emi)} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Enrolling...' : 'Enroll Student'}
            </button>
            <button type="button" onClick={() => setFormData({ username: '', password: '', email: '', session_id: '', college: '', requires_bed: false, paid_initial_emi: false })} className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors">
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollStudent;
