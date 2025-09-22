// components/mess/InventoryReport.jsx
import React, { useState, useEffect } from 'react';
import { messAPI } from '../../services/api';
import { Package, ArrowDown, ArrowUp } from 'lucide-react';
import ReportGenerator from '../ReportGenerator';

const InventoryReport = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    fetchStock();
  }, [stockFilter]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const params = {};
      if (stockFilter === 'low') {
        params.low_stock = true;
      }
      const response = await messAPI.getItemStock(params);
      setStock(response.data.data || []);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare columns for report
  const columns = [
    {
      key: 'item',
      label: 'Item',
      render: (item) => (
        <div className="flex items-center">
          <Package className="text-gray-400 mr-2" size={16} />
          <span>{item.tbl_Item?.name}</span>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (item) => item.tbl_Item?.tbl_ItemCategory?.name
    },
    {
      key: 'current_stock',
      label: 'Current Stock',
      render: (item) => `${item.current_stock} ${item.tbl_Item?.UOM?.abbreviation || ''}`
    },
    {
      key: 'minimum_stock',
      label: 'Minimum Stock',
      render: (item) => `${item.minimum_stock} ${item.tbl_Item?.UOM?.abbreviation || ''}`
    },
    {
      key: 'stock_status',
      label: 'Status',
      render: (item) => {
        let status, color;
        
        if (item.current_stock <= 0) {
          status = 'Out of Stock';
          color = 'bg-red-100 text-red-800';
        } else if (item.current_stock <= item.minimum_stock) {
          status = 'Low Stock';
          color = 'bg-yellow-100 text-yellow-800';
        } else {
          status = 'In Stock';
          color = 'bg-green-100 text-green-800';
        }
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {status}
          </span>
        );
      }
    },
    {
      key: 'last_updated',
      label: 'Last Updated',
      render: (item) => new Date(item.last_updated).toLocaleString()
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
          <h1 className="text-3xl font-bold text-gray-900">Inventory Report</h1>
          <p className="text-gray-600 mt-2">Current stock levels and inventory status</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Stock</option>
            <option value="low">Low Stock Only</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stock.length}</p>
            </div>
            <Package size={24} className="text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stock.filter(item => item.current_stock > 0 && item.current_stock <= item.minimum_stock).length}
              </p>
            </div>
            <ArrowDown size={24} className="text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {stock.filter(item => item.current_stock <= 0).length}
              </p>
            </div>
            <ArrowDown size={24} className="text-red-500" />
          </div>
        </div>
      </div>

      <ReportGenerator
        title="Inventory Status Report"
        data={stock}
        columns={columns}
        filename="inventory_status_report"
        hideColumns={['id', 'createdAt', 'updatedAt']}
      />
    </div>
  );
};

export default InventoryReport;
