// components/mess/DailyConsumptionReport.jsx

import React, { useState, useEffect } from 'react';
import { messAPI } from '../../services/api';
import { Calendar, ChefHat, Download, Plus, Utensils } from 'lucide-react';
import ReportGenerator from '../ReportGenerator';

const DailyConsumptionReport = () => {
  const [consumptions, setConsumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchConsumptions();
  }, [dateRange]);

  const fetchConsumptions = async () => {
    try {
      setLoading(true);
      const response = await messAPI.getDailyConsumption({
        from_date: dateRange.startDate,
        to_date: dateRange.endDate
      });
      setConsumptions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching consumption data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique meal types for filter
  const mealTypes = [...new Set(consumptions.map(item => item.meal_type))].map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1)
  }));

  // Prepare columns for report
  const columns = [
    {
      key: 'consumption_date',
      label: 'Date',
      render: (item) => new Date(item.consumption_date).toLocaleDateString()
    },
    {
      key: 'meal_type',
      label: 'Meal Type',
      render: (item) => (
        <span className="capitalize">{item.meal_type}</span>
      )
    },
    {
      key: 'item_name',
      label: 'Item',
      render: (item) => item.tbl_Item?.name
    },
    {
      key: 'category',
      label: 'Category',
      render: (item) => item.tbl_Item?.tbl_ItemCategory?.name
    },
    {
      key: 'quantity_consumed',
      label: 'Quantity',
      render: (item) => (
        <span>{item.quantity_consumed} {item.unit}</span>
      )
    },
    {
      key: 'recorded_by',
      label: 'Recorded By',
      render: (item) => item.ConsumptionRecordedBy?.userName
    }
  ];

  // Prepare filters for report
  const filters = [
    {
      key: 'meal_type',
      label: 'Meal Type',
      options: mealTypes
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
          <h1 className="text-3xl font-bold text-gray-900">Consumption Reports</h1>
          <p className="text-gray-600 mt-2">View and export mess consumption data</p>
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
        title="Daily Consumption Report"
        data={consumptions}
        columns={columns}
        filters={filters}
        filename="daily_consumption_report"
        hideColumns={['id', 'createdAt', 'updatedAt']}
      />
    </div>
  );
};

export default DailyConsumptionReport;
