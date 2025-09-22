// components/ReportGenerator.jsx
import React, { useState } from 'react';
import { Download, Filter, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const ReportGenerator = ({ 
  title, 
  data, 
  filters = [], 
  columns, 
  defaultFilters = {},
  filename = "report",
  hideColumns = [] 
}) => {
  const [activeFilters, setActiveFilters] = useState(defaultFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Apply filters to data
  const filteredData = data.filter(item => {
    return Object.entries(activeFilters).every(([key, value]) => {
      if (!value || value === 'all') return true;
      return item[key] == value; // loose equality to handle number/string conversion
    });
  });

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setActiveFilters({
      ...activeFilters,
      [key]: value
    });
  };

  // Reset filters
  const resetFilters = () => {
    setActiveFilters(defaultFilters);
  };

  // Download Excel function
  const downloadExcel = () => {
    // Prepare data for export - exclude hidden columns
    const exportData = filteredData.map(row => {
      const exportRow = {};
      Object.keys(row).forEach(key => {
        if (!hideColumns.includes(key)) {
          // Handle nested objects with simple flattening
          if (typeof row[key] === 'object' && row[key] !== null) {
            exportRow[key] = JSON.stringify(row[key]);
          } else {
            exportRow[key] = row[key];
          }
        }
      });
      return exportRow;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    // Generate Excel file
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredData.length} records found
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Filter size={16} className="mr-1" />
            Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
            disabled={Object.keys(activeFilters).length === 0}
          >
            <RefreshCw size={16} className="mr-1" />
            Reset
          </button>
          <button
            onClick={downloadExcel}
            className="px-3 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 flex items-center"
            disabled={filteredData.length === 0}
          >
            <Download size={16} className="mr-1" />
            Export Excel
          </button>
        </div>
      </div>

      {showFilterPanel && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key} className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                <select
                  value={activeFilters[filter.key] || 'all'}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All {filter.label}s</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No records found. Adjust filters or add new entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportGenerator;
