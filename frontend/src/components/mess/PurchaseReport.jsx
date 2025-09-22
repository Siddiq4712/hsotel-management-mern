// components/mess/PurchaseReport.jsx
import React, { useState, useEffect } from 'react';
import { messAPI } from '../../services/api';
import { ShoppingCart, Calendar } from 'lucide-react';
import ReportGenerator from '../ReportGenerator';

const PurchaseReport = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchPurchases();
  }, [dateRange]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await messAPI.getPurchaseOrders({
        from_date: dateRange.startDate,
        to_date: dateRange.endDate
      });
      setPurchases(response.data.data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare status options for filter
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Prepare columns for report
  const columns = [
    {
      key: 'order_date',
      label: 'Order Date',
      render: (item) => new Date(item.order_date).toLocaleDateString()
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (item) => item.Supplier?.name || 'Unknown'
    },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (item) => `₹${parseFloat(item.total_amount).toFixed(2)}`
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        const statusColors = {
          draft: 'bg-gray-100 text-gray-800',
          sent: 'bg-blue-100 text-blue-800',
          confirmed: 'bg-yellow-100 text-yellow-800',
          delivered: 'bg-green-100 text-green-800',
          cancelled: 'bg-red-100 text-red-800'
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        );
      }
    },
    {
      key: 'expected_delivery',
      label: 'Expected Delivery',
      render: (item) => item.expected_delivery ? new Date(item.expected_delivery).toLocaleDateString() : 'N/A'
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
          <h1 className="text-3xl font-bold text-gray-900">Purchase Reports</h1>
          <p className="text-gray-600 mt-2">View and export purchase order data</p>
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
        title="Purchase Orders Report"
        data={purchases}
        columns={columns}
        filters={filters}
        filename="purchase_orders_report"
        hideColumns={['id', 'createdAt', 'updatedAt']}
      />
    </div>
  );
};

export default PurchaseReport;
