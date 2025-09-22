// components/mess/MessBillReport.jsx
import React, { useState, useEffect } from 'react';
import { messAPI } from '../../services/api';
import { Receipt, Users, Calendar } from 'lucide-react';
import ReportGenerator from '../ReportGenerator';

const MessBillReport = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    fetchBills();
  }, [yearMonth]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const [year, month] = yearMonth.split('-');
      const response = await messAPI.getMessBills({
        year,
        month
      });
      setBills(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare status options for filter
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  // Prepare columns for report
  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (item) => (
        <div className="flex items-center">
          <Users className="text-gray-400 mr-2" size={16} />
          <span>{item.User?.username || 'Unknown'}</span>
        </div>
      )
    },
    {
      key: 'period',
      label: 'Period',
      render: (item) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[item.month - 1]} ${item.year}`;
      }
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (item) => (
        <div className="text-gray-900">₹{parseFloat(item.amount).toFixed(2)}</div>
      )
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (item) => new Date(item.due_date).toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        const statusColors = {
          paid: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          overdue: 'bg-red-100 text-red-800'
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        );
      }
    }
  ];

  // Prepare filters
  const filters = [
    {
      key: 'status',
      label: 'Status',
      options: statusOptions
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Mess Bill Reports</h1>
          <p className="text-gray-600 mt-2">View and export mess billing data</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <ReportGenerator
        title="Mess Bill Report"
        data={bills}
        columns={columns}
        filters={filters}
        filename="mess_bill_report"
        hideColumns={['id', 'createdAt', 'updatedAt']}
      />
    </div>
  );
};

export default MessBillReport;
