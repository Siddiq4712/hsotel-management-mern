import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { 
  User, Lock, Calendar, CheckCircle, AlertCircle, Bed, School, 
  Hash, Mail, Loader2, ArrowRight
} from 'lucide-react';

const EnrollStudent = () => {
  const [formData, setFormData] = useState({
    baseUsername: '',
    initial: '',
    roll_number: '',
    password: '',
    email: '',
    session_id: '',
    college: '',
    requires_bed: false
  });

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formStep, setFormStep] = useState(1);

  useEffect(() => {
    fetchSessions();
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

    const baseName = formData.baseUsername.trim();
    const init = formData.initial.trim().toUpperCase();
    const finalUsername = baseName.toUpperCase() + ' ' + init;

    try {
      await wardenAPI.enrollStudent({
        ...formData,
        username: finalUsername,
        session_id: parseInt(formData.session_id)
      });

      setMessage({ type: 'success', text: 'Student enrolled successfully! 🎉' });
      setFormData({
        baseUsername: '',
        initial: '',
        roll_number: '',
        password: '',
        email: '',
        session_id: '',
        college: '',
        requires_bed: false
      });
      setFormStep(1);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to enroll student'
      });
    } finally {
      setLoading(false);
    }
  };

  const isStep1Complete = formData.baseUsername && formData.initial && formData.password;
  const isStep2Complete = formData.college && formData.session_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Enroll New Student</h1>
        <p className="text-gray-600 mt-2">Add a new student to the hostel management system</p>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 animate-in fade-in ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          ) : (
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          )}
          <div className="flex-1">
            <h3 className={`font-semibold ${message.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
              {message.type === 'success' ? 'Success' : 'Error'}
            </h3>
            <p className={`text-sm mt-1 ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Form Header with Progress */}
        <div className="px-6 py-8 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Information</h2>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center flex-1">
              {/* Step 1 */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                  formStep >= 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  1
                </div>
                <p className="text-xs text-gray-600 mt-2 font-medium">Personal Info</p>
              </div>

              {/* Step 2 */}
              <div className={`flex-1 h-1 mx-2 ${formStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors`}></div>
              
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                  formStep >= 2 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  2
                </div>
                <p className="text-xs text-gray-600 mt-2 font-medium">Academic Info</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          {/* Step 1: Personal Information */}
          {formStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
              </div>

              {/* Username Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="baseUsername"
                      value={formData.baseUsername}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., John Doe"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter student's full name</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Initial <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="initial"
                      value={formData.initial}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center"
                      placeholder="D"
                      required
                      maxLength={1}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Single letter</p>
                </div>
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Roll Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="roll_number"
                    value={formData.roll_number}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., 2021001"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="student@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter secure password"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">At least 6 characters recommended</p>
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-6">
                <button
                  type="button"
                  onClick={() => isStep1Complete && setFormStep(2)}
                  disabled={!isStep1Complete}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all"
                >
                  <span>Continue to Academic Info</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Academic Information */}
          {formStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Academic & Room Information</h3>
              </div>

              {/* College Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  College <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                    required
                  >
                    <option value="">Select College</option>
                    <option value="nec">NEC</option>
                    <option value="lapc">LAPC</option>
                  </select>
                </div>
              </div>

              {/* Session Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    name="session_id"
                    value={formData.session_id}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
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
                </div>
              </div>

              {/* Bed Requirement */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    name="requires_bed"
                    id="requires_bed"
                    checked={formData.requires_bed}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="requires_bed" className="font-semibold text-gray-900 cursor-pointer flex items-center space-x-2">
                      <Bed size={20} className="text-blue-600" />
                      <span>Student requires bed allocation</span>
                    </label>
                    <p className="text-sm text-gray-600 mt-2">
                      Check this if the student needs a hostel room and bed assignment
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Summary */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Student Name</p>
                    <p className="font-semibold text-gray-900">{formData.baseUsername.toUpperCase()} {formData.initial.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Roll Number</p>
                    <p className="font-semibold text-gray-900">{formData.roll_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">College</p>
                    <p className="font-semibold text-gray-900">{formData.college.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Bed Required</p>
                    <p className="font-semibold text-gray-900">{formData.requires_bed ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !isStep2Complete}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>Complete Enrollment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">📋 What happens next?</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✓ Student account created</li>
            <li>✓ Credentials sent to email</li>
            <li>✓ Ready for room allotment</li>
          </ul>
        </div>

        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">💡 Tip</h3>
          <p className="text-sm text-green-800">
            Make sure the password is secure and the email address is correct for student communication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnrollStudent;
