// components/mess/MenuPlanningReport.jsx
import React, { useState, useEffect } from 'react';
import { messAPI } from '../../services/api';
import { Calendar, ChefHat } from 'lucide-react';
import ReportGenerator from '../ReportGenerator';

const MenuPlanningReport = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchSchedules();
  }, [dateRange]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      // This is a placeholder - you'll need to adjust based on your actual API
      const results = [];
      for (let d = new Date(dateRange.startDate); d <= new Date(dateRange.endDate); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const response = await messAPI.getMenuSchedule({ date: dateStr });
        results.push(...(response.data.data || []));
      }
      setSchedules(results);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare meal types for filter
  const mealTypeOptions = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snacks', label: 'Snacks' }
  ];

  // Prepare status options for filter
  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'served', label: 'Served' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Prepare columns for report
  const columns = [
    {
      key: 'scheduled_date',
      label: 'Date',
      render: (item) => new Date(item.scheduled_date).toLocaleDateString()
    },
    {
      key: 'meal_time',
      label: 'Meal',
      render: (item) => (
        <span className="capitalize">{item.meal_time}</span>
      )
    },
    {
      key: 'menu',
      label: 'Menu',
      render: (item) => item.tbl_Menu?.name || 'N/A'
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        const statusColors = {
          scheduled: 'bg-blue-100 text-blue-800',
          served: 'bg-green-100 text-green-800',
          cancelled: 'bg-red-100 text-red-800'
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
      key: 'meal_time',
      label: 'Meal Type',
      options: mealTypeOptions
    },
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
          <h1 className="text-3xl font-bold text-gray-900">Menu Planning Reports</h1>
          <p className="text-gray-600 mt-2">View and export menu scheduling data</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <ReportGenerator
        title="Menu Planning Report"
        data={schedules}
        columns={columns}
        filters={filters}
        filename="menu_planning_report"
        hideColumns={['id', 'createdAt', 'updatedAt']}
      />
    </div>
  );
};

export default MenuPlanningReport;
