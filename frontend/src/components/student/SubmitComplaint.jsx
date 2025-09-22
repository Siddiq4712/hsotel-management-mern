import React, { useState } from 'react';
import { studentAPI } from '../../services/api';
import { MessageCircle, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const SubmitComplaint = () => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to submit complaint' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Submit Complaint</h1>
        <p className="text-gray-600 mt-2">Report any issues or concerns you have</p>
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
              Subject *
            </label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief summary of your complaint"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <p className="mt-1 text-sm text-gray-600">
                {categories.find(cat => cat.value === formData.category)?.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priorities.map(priority => (
                <label
                  key={priority.value}
                  className={`relative flex flex-col p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
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
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      formData.priority === priority.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {formData.priority === priority.value && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide detailed information about your complaint. Include any relevant details such as location, time, people involved, etc."
              required
            />
            <p className="mt-1 text-sm text-gray-600">
              Be as specific as possible to help us address your concern effectively.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({
                subject: '',
                description: '',
                category: '',
                priority: 'medium'
              })}
              className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Guidelines */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="text-amber-600 mt-0.5 mr-3" size={20} />
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-2">Complaint Guidelines</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Be respectful and factual in your complaint</li>
                <li>• Provide specific details and evidence when possible</li>
                <li>• Use appropriate priority levels - urgent should be for safety issues</li>
                <li>• You will receive updates on your complaint status</li>
                <li>• False or malicious complaints may result in disciplinary action</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitComplaint;
