import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { Receipt, Calendar, CheckCircle, XCircle, ChevronDown, ChevronUp, Droplet, Clock } from 'lucide-react';
import moment from 'moment';

const MyMessCharges = () => {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment().month() + 1);
  const [currentYear, setCurrentYear] = useState(moment().year());
  const [expandedRow, setExpandedRow] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  useEffect(() => {
    fetchCharges();
    fetchAttendance();
  }, [currentMonth, currentYear]);

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyDailyMessCharges({ month: currentMonth, year: currentYear });
      setCharges(response.data.data || []);
    } catch (error) {
      console.error('Error fetching mess charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const date = moment().format('YYYY-MM-DD');
      const response = await studentAPI.getMyAttendance({ date });
      const records = response.data.data || [];
      setAttendance(records.length > 0 ? records[0] : null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };
  
  const totalMonthlyCharge = charges.reduce((sum, charge) => sum + parseFloat(charge.dailyTotalCharge || 0), 0);

  const handleMonthChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setCurrentYear(parseInt(year));
    setCurrentMonth(parseInt(month));
    setExpandedRow(null);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'P':
        return { icon: <CheckCircle className="text-green-500 w-4 h-4" />, text: 'Present', color: 'text-green-700' };
      case 'A':
        return { icon: <XCircle className="text-red-500 w-4 h-4" />, text: 'Absent', color: 'text-red-700' };
      case 'OD':
        return { icon: <Clock className="text-blue-500 w-4 h-4" />, text: 'On Duty', color: 'text-blue-700' };
      case 'present': return { icon: <CheckCircle className="text-green-500 w-4 h-4" />, text: 'Present', color: 'text-green-700' };
      case 'absent': return { icon: <XCircle className="text-red-500 w-4 h-4" />, text: 'Absent', color: 'text-red-700' };
      case 'leave': return { icon: <Calendar className="text-purple-500 w-4 h-4" />, text: 'On Leave', color: 'text-purple-700' };
      case 'on_duty': return { icon: <Calendar className="text-blue-500 w-4 h-4" />, text: 'On Duty', color: 'text-blue-700' };
      case 'not_marked': return { icon: <XCircle className="text-gray-500 w-4 h-4" />, text: 'Not Marked', color: 'text-gray-700' };
      default: return { icon: <XCircle className="text-gray-500 w-4 h-4" />, text: 'Unknown', color: 'text-gray-700' };
    }
  };

  const getAttendanceStatusDisplay = (status) => {
    switch (status) {
      case 'P':
        return { icon: <CheckCircle className="text-green-600" size={48} />, text: 'Present', color: 'bg-green-50 border-green-200 text-green-800' };
      case 'A':
        return { icon: <XCircle className="text-red-600" size={48} />, text: 'Absent', color: 'bg-red-50 border-red-200 text-red-800' };
      case 'OD':
        return { icon: <Clock className="text-blue-600" size={48} />, text: 'On Duty', color: 'bg-blue-50 border-blue-200 text-blue-800' };
      default:
        return { icon: null, text: 'Not Marked', color: 'bg-gray-50 border-gray-200 text-gray-500' };
    }
  };

  const attendanceStatusInfo = attendance ? getAttendanceStatusDisplay(attendance.status) : getAttendanceStatusDisplay(null);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Get today's charge row for special status override
  const today = moment().format('YYYY-MM-DD');
  const todayCharge = charges.find(charge => charge.date === today);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header and Month Selector */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Mess Charges</h1>
          <p className="text-gray-600 mt-2">Detailed daily breakdown of your mess fees.</p>
        </div>
        <input
          type="month"
          value={`${currentYear}-${String(currentMonth).padStart(2, '0')}`}
          onChange={handleMonthChange}
          className="mt-4 sm:mt-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Summary for {moment(new Date(currentYear, currentMonth - 1)).format('MMMM YYYY')}
        </h2>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-lg text-gray-700">Total Monthly Charge:</p>
          <p className="text-2xl font-bold text-blue-600">₹{totalMonthlyCharge.toFixed(2)}</p>
        </div>
        <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
          Pay Now
        </button>
      </div>

      {/* Daily Charges Breakdown Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Daily Charges Breakdown</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading daily charges...</span>
          </div>
        ) : charges.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Mess Charge</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Daily Charge</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {charges.map((charge) => {
                  // Use fetched attendance status for today's row, fallback to charge.attendance_status
                  let rowStatus = charge.attendance_status;
                  if (charge.date === today && attendance) {
                    rowStatus = attendance.status;
                  }
                  const statusInfo = getStatusInfo(rowStatus);
                  const isExpanded = expandedRow === charge.id;
                  
                  return (
                    <React.Fragment key={charge.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(charge.id)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{charge.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center text-sm font-medium ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span className="ml-2">{statusInfo.text}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${parseFloat(charge.baseMessCharge) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          ₹{parseFloat(charge.baseMessCharge).toFixed(2)}
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">
                          ₹{parseFloat(charge.dailyTotalCharge).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {isExpanded ? <ChevronUp className="w-4 h-4 inline-block text-gray-600" /> : <ChevronDown className="w-4 h-4 inline-block text-gray-600" />}
                        </td>
                      </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan="5" className="px-6 py-4 text-sm text-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-l-4 border-blue-500 pl-4">
                            
                            {/* Base Mess Charge */}
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">Base Mess Charge</h4>
                              <ul className="list-none space-y-1 text-gray-700">
                                <li className="font-bold flex justify-between">
                                  <span>Your Daily Share (Cost per Serving):</span>
                                  <span>₹{parseFloat(charge.baseMessCharge).toFixed(2)}</span>
                                </li>
                              </ul>
                            </div>

                            {/* Special Food Orders */}
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">Special Food Orders</h4>
                              <ul className="list-none space-y-1 text-gray-700">
                                <li className="flex items-center justify-between">
                                  <span className="font-medium">Total Ordered:</span>
                                  <span className={parseFloat(charge.specialFoodCost) > 0 ? 'font-bold text-green-600' : 'text-gray-500'}>
                                    ₹{parseFloat(charge.specialFoodCost).toFixed(2)}
                                  </span>
                                </li>
                                {/* {charge.pendingSpecialFoodCost > 0 && (
                                  <li className="flex items-center justify-between text-sm">
                                    <span className="text-orange-600">Pending Payment:</span>
                                    <span className="font-semibold text-orange-600">₹{parseFloat(charge.pendingSpecialFoodCost).toFixed(2)}</span>
                                  </li>
                                )} */}
                                {charge.paidSpecialFoodCost > 0 && (
                                  <li className="flex items-center justify-between text-sm">
                                    <span className="text-green-600">Paid:</span>
                                    <span className="font-semibold text-green-600">₹{parseFloat(charge.paidSpecialFoodCost).toFixed(2)}</span>
                                  </li>
                                )}
                              </ul>
                            </div>

                            {/* Daily Summary */}
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">Daily Summary</h4>
                              <ul className="list-none space-y-1 text-gray-700">
                                <li className="mt-4 pt-2 border-t border-gray-300 font-bold text-lg flex justify-between">
                                  <span>Your Total Charge for Day (Paid Only):</span>
                                  <span className="text-blue-600">
                                    ₹
                                    {(
                                      parseFloat(charge.dailyTotalCharge || 0) +
                                      parseFloat(charge.pendingSpecialFoodCost || 0)
                                    ).toFixed(2)}
                                  </span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No charges found for this month</h3>
            <p className="mt-1 text-sm text-gray-500">Mess charges are calculated and applied daily by the mess manager.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyMessCharges;