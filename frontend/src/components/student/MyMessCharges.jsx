import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { Receipt, Calendar, CheckCircle, XCircle } from 'lucide-react';

const MyMessCharges = () => {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchCharges();
  }, [currentMonth, currentYear]);

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyMessCharges({ month: currentMonth, year: currentYear });
      setCharges(response.data.data || []);
    } catch (error) {
      console.error('Error fetching mess charges:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const totalMonthlyCharge = charges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);

  const handleMonthChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setCurrentYear(parseInt(year));
    setCurrentMonth(parseInt(month));
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'present': return { icon: <CheckCircle className="text-green-500" />, text: 'Present', color: 'text-green-700' };
      case 'absent': return { icon: <XCircle className="text-red-500" />, text: 'Absent', color: 'text-red-700' };
      case 'leave': return { icon: <Calendar className="text-purple-500" />, text: 'On Leave', color: 'text-purple-700' };
      default: return { icon: <XCircle className="text-gray-500" />, text: 'Not Marked', color: 'text-gray-700' };
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Mess Charges</h1>
          <p className="text-gray-600 mt-2">Detailed daily breakdown of your mess fees.</p>
        </div>
        <input
          type="month"
          value={`${currentYear}-${String(currentMonth).padStart(2, '0')}`}
          onChange={handleMonthChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Summary for {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-lg text-gray-700">Total Monthly Charge:</p>
          <p className="text-2xl font-bold text-blue-600">₹{totalMonthlyCharge.toFixed(2)}</p>
        </div>
        <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
          Pay Now
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Daily Charges Breakdown</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : charges.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Charge</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {charges.map((charge) => {
                  const status = getStatusInfo(charge.attendance_status);
                  return (
                    <tr key={charge.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{charge.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center text-sm font-medium ${status.color}`}>
                          {status.icon}
                          <span className="ml-2">{status.text}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${charge.is_charged ? 'text-gray-900' : 'text-gray-400'}`}>
                        ₹{parseFloat(charge.amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No charges found for this month</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyMessCharges;
