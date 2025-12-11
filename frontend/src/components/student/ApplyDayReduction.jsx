// src/components/Student/ApplyDayReduction.jsx
import React, { useState } from 'react';
import { studentAPI } from '../../services/api';
import { CalendarDays, AlertCircle, CheckCircle } from 'lucide-react';
import moment from 'moment';
import { Input, DatePicker, Button, Alert } from 'antd'; // Ant Design imports
import { toast } from 'react-toastify'; // react-toastify import

const { TextArea } = Input;

const ApplyDayReduction = () => {
  const [formData, setFormData] = useState({
    from_date: null, // Use moment objects for Ant Design DatePicker
    to_date: null,
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const fromDateStr = formData.from_date ? formData.from_date.format('YYYY-MM-DD') : null;
    const toDateStr = formData.to_date ? formData.to_date.format('YYYY-MM-DD') : null;

    // Client-side date validation
    if (!fromDateStr || !toDateStr || !formData.reason) {
      toast.error('All fields are required.');
      setLoading(false);
      return;
    }
    if (moment(fromDateStr).isAfter(moment(toDateStr))) {
      toast.error('From date cannot be after to date.');
      setLoading(false);
      return;
    }
    if (moment(toDateStr).isBefore(moment(), 'day')) {
      toast.error('Cannot request day reduction for past dates.');
      setLoading(false);
      return;
    }

    try {
      await studentAPI.applyDayReduction({
        from_date: fromDateStr,
        to_date: toDateStr,
        reason: formData.reason
      });
      toast.success('Day reduction request submitted successfully for admin review!');
      setFormData({
        from_date: null,
        to_date: null,
        reason: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit day reduction request.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date, dateString, name) => {
    setFormData({
      ...formData,
      [name]: date
    });
  };

  const handleReasonChange = (e) => {
    setFormData({
      ...formData,
      reason: e.target.value
    });
  };

  const disabledToDate = (current) => {
    // Can not select days before `from_date`
    return current && formData.from_date && current.isBefore(formData.from_date, 'day');
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <CalendarDays className="mr-3 text-blue-600" size={32} /> Apply Day Reduction
        </h1>
        <p className="text-gray-600 mt-2">Request reduction in your mess man-days for specific dates.</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 mb-2">
                From Date *
              </label>
              <DatePicker
                id="from_date"
                value={formData.from_date}
                onChange={(date, dateString) => handleDateChange(date, dateString, 'from_date')}
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
                disabledDate={(current) => current && current.isBefore(moment().startOf('day'))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="to_date" className="block text-sm font-medium text-gray-700 mb-2">
                To Date *
              </label>
              <DatePicker
                id="to_date"
                value={formData.to_date}
                onChange={(date, dateString) => handleDateChange(date, dateString, 'to_date')}
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
                disabledDate={disabledToDate}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Day Reduction *
            </label>
            <TextArea
              id="reason"
              value={formData.reason}
              onChange={handleReasonChange}
              rows={4}
              placeholder="Please provide a detailed reason for your day reduction request (e.g., family emergency, off-campus event, medical leave)."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>

            <Button
              onClick={() => {
                setFormData({ from_date: null, to_date: null, reason: '' });
              }}
              className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Reset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyDayReduction;
