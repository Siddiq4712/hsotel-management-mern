// components/mess/ReportsNavigation.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Utensils, 
  DollarSign, 
  Package, 
  Calendar, 
  ShoppingCart
} from 'lucide-react';

const ReportsNavigation = () => {
  const location = useLocation();
  
  const reports = [
    {
      path: '/mess/reports/consumption',
      name: 'Consumption',
      icon: Utensils
    },
    {
      path: '/mess/reports/billing',
      name: 'Billing',
      icon: DollarSign
    },
    {
      path: '/mess/reports/inventory',
      name: 'Inventory',
      icon: Package
    },
    {
      path: '/mess/reports/menu',
      name: 'Menu Planning',
      icon: Calendar
    },
    {
      path: '/mess/reports/purchase',
      name: 'Purchases',
      icon: ShoppingCart
    },
  ];
  
  return (
    <div className="bg-white shadow-md rounded-lg mb-6">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <FileText className="text-blue-600 mr-2" size={20} />
          <h2 className="text-lg font-medium text-gray-900">Reports</h2>
        </div>
      </div>
      
      <div className="flex overflow-x-auto p-2">
        {reports.map(report => (
          <Link
            key={report.path}
            to={report.path}
            className={`whitespace-nowrap px-4 py-2 mr-2 rounded-md flex items-center ${
              location.pathname === report.path
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <report.icon size={16} className="mr-2" />
            {report.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ReportsNavigation;
