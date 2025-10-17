// frontend/src/components/Student/MyMessCharges.js

import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { Receipt, Calendar, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, DollarSign, BookOpen} from 'lucide-react'; // Added BookOpen for newspaper
import { Droplet } from "lucide-react";

import moment from 'moment';

const MyMessCharges = () => {
  const [dailyCharges, setDailyCharges] = useState([]);
  const [monthlyFlatFees, setMonthlyFlatFees] = useState([]);
  const [monthlyCalculatedDailyRate, setMonthlyCalculatedDailyRate] = useState(0);
  const [studentTotalManDaysForMonth, setStudentTotalManDaysForMonth] = useState(0); // NEW
  const [totalMonthlySpecialFoodCost, setTotalMonthlySpecialFoodCost] = useState(0); // NEW (sum of pending special food for the month)

  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment().month() + 1);
  const [currentYear, setCurrentYear] = useState(moment().year());
  const [expandedRow, setExpandedRow] = useState(null);
  // Removed individual attendance state as table uses dailyCharges.attendance_status now
  // const [attendance, setAttendance] = useState(null);
  // const [attendanceLoading, setAttendanceLoading] = useState(true); // No longer strictly needed for summary card

  useEffect(() => {
    fetchChargesAndSummary();
    // No longer need a separate fetchAttendance here, as the daily table gets its status from dailyCharges
    // The attendance card for today can be removed or simplified.
  }, [currentMonth, currentYear]);

  const fetchChargesAndSummary = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyDailyMessCharges({ month: currentMonth, year: currentYear });
      const data = response.data.data;
      console.log("[MyMessCharges] Received data:", data); // Debugging log

      setDailyCharges(data.dailyCharges || []);
      setMonthlyFlatFees(data.monthlySummary.flatFees || []);
      setMonthlyCalculatedDailyRate(data.monthlySummary.monthlyCalculatedDailyRate || 0);
      setStudentTotalManDaysForMonth(data.monthlySummary.studentTotalManDaysForMonth || 0); // Set new state
      setTotalMonthlySpecialFoodCost(data.monthlySummary.totalMonthlySpecialFoodCost || 0); // Set new state

    } catch (error) {
      console.error('Error fetching mess charges and summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Calculate total monthly bill based on new logic ---
  const attendanceBasedMessCharge = monthlyCalculatedDailyRate * studentTotalManDaysForMonth;
  const totalFlatFeesSum = monthlyFlatFees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
  
  // Total Monthly Bill = (Daily Rate * Student Man-Days) + Total Monthly Special Food (Pending) + Other Flat Fees
  const totalMonthlyBill = attendanceBasedMessCharge + totalMonthlySpecialFoodCost + totalFlatFeesSum;

  const handleMonthChange = (e) => {
    const [year, month] = e.target.value.split('-');
    setCurrentYear(parseInt(year));
    setCurrentMonth(parseInt(month));
    setExpandedRow(null); // Collapse any expanded rows on month change
  };

  const getStatusInfo = (status) => {
    // This function is for the icons/text in the daily charges table
    switch (status) {
      case 'P': return { icon: <CheckCircle className="text-green-500 w-4 h-4" />, text: 'Present', color: 'text-green-700' };
      case 'A': return { icon: <XCircle className="text-red-500 w-4 h-4" />, text: 'Absent', color: 'text-red-700' };
      case 'OD': return { icon: <Clock className="text-blue-500 w-4 h-4" />, text: 'On Duty', color: 'text-blue-700' };
      default: return { icon: <XCircle className="text-gray-500 w-4 h-4" />, text: 'Not Marked', color: 'text-gray-700' };
    }
  };
  
  const getFeeIcon = (feeType) => {
    switch (feeType) {
      case 'bed_charge': return <DollarSign className="w-5 h-5 text-purple-600 mr-2" />;
      case 'newspaper': return <BookOpen className="w-5 h-5 text-yellow-600 mr-2" />;
      case 'water_bill': return <Droplet className="w-5 h-5 text-blue-600 mr-2" />;
      case 'special_food_charge': return <Receipt className="w-5 h-5 text-orange-600 mr-2" />; // Staff recorded special food
      default: return <DollarSign className="w-5 h-5 text-gray-500 mr-2" />;
    }
  };


  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

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

      {/* Monthly Summary Card (ENHANCED) */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Summary for {moment(new Date(currentYear, currentMonth - 1)).format('MMMM YYYY')}
        </h2>
        <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-lg text-gray-700">Hostel's Monthly Averaged Daily Rate:</p>
                <p className="text-lg font-bold text-gray-800">₹{monthlyCalculatedDailyRate.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <p className="text-lg text-gray-700">Your Total Man-Days Present/On-Duty:</p>
                <p className="text-lg font-bold text-gray-800">{studentTotalManDaysForMonth}</p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <p className="text-lg text-gray-700">Total Mess Charges: ({studentTotalManDaysForMonth} x ₹{monthlyCalculatedDailyRate.toFixed(2)})</p>
                <p className="text-lg font-bold text-gray-800">₹{attendanceBasedMessCharge.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <p className="text-lg text-gray-700">Additional Token :</p>
                <p className="text-lg font-bold text-gray-800">₹{totalMonthlySpecialFoodCost.toFixed(2)}</p>
            </div>

            {monthlyFlatFees.map((fee, index) => (
                <div key={fee.fee_type || index} className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <p className="text-lg text-gray-700 flex items-center">
                      {getFeeIcon(fee.fee_type)} {fee.fee_type.replace(/_/g, ' ').toUpperCase()}
                      {fee.description && <span className="ml-2 text-gray-500 text-sm italic">({fee.description})</span>}
                    </p>
                    <p className="text-lg font-bold text-gray-800">₹{parseFloat(fee.amount).toFixed(2)}</p>
                </div>
            ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t-2 border-gray-300 pt-4">
          <p className="text-xl font-bold text-gray-900">Total Monthly Bill:</p>
          <p className="text-3xl font-bold text-blue-600">₹{totalMonthlyBill.toFixed(2)}</p>
        </div>
        <button
          className="mt-6 w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg"
          onClick={() => window.open("https://www.iobnet.co.in/iobpay/commonpage.do?type=MESS%20FEES", "_blank")}
        >
          Pay Now
        </button>

      </div>

      {/* Daily Charges Breakdown Table (ENHANCED) */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Daily Charges Breakdown</h2>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading daily charges...</span>
          </div>
        ) : dailyCharges.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Mess Charge</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Special Food Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Daily Charge</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyCharges.map((charge) => {
                  const statusInfo = getStatusInfo(charge.attendance_status); // Use charge.attendance_status directly from backend
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
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${parseFloat(charge.specialFoodCost) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          ₹{parseFloat(charge.specialFoodCost).toFixed(2)}
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
                        <td colSpan="6" className="px-6 py-4 text-sm text-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-l-4 border-blue-500 pl-4">

                            {/* Base Mess Charge Details */}
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">Base Mess Charge</h4>
                              <ul className="list-none space-y-1 text-gray-700">
                                <li className="font-bold flex justify-between">
                                  <span>Your Daily Share (Monthly Averaged Daily Rate):</span>
                                  <span>₹{parseFloat(charge.baseMessCharge).toFixed(2)}</span>
                                </li>
                                <li className="flex justify-between text-sm text-gray-600">
                                  <span>Hostel's Monthly Calculated Daily Rate:</span>
                                  <span>₹{monthlyCalculatedDailyRate.toFixed(2)}</span>
                                </li>
                              </ul>
                            </div>

                            {/* Special Food Orders Details */}
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">Special Food Orders (Pending Payment)</h4>
                              <ul className="list-none space-y-1 text-gray-700">
                                <li className="flex items-center justify-between">
                                  <span className="font-medium">Amount:</span>
                                  <span className={parseFloat(charge.specialFoodCost) > 0 ? 'font-bold text-green-600' : 'text-gray-500'}>
                                    ₹{parseFloat(charge.specialFoodCost).toFixed(2)}
                                  </span>
                                </li>
                                <li className="text-sm text-gray-600 italic">
                                  This is the cost of special food items you ordered for this day, which is still pending payment and added to your bill.
                                </li>
                              </ul>
                            </div>

                            {/* Daily Summary */}
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2">Daily Summary</h4>
                              <ul className="list-none space-y-1 text-gray-700">
                                <li className="mt-4 pt-2 border-t border-gray-300 font-bold text-lg flex justify-between">
                                  <span>Your Total Daily Charge:</span>
                                  <span className="text-blue-600">
                                    ₹{parseFloat(charge.dailyTotalCharge).toFixed(2)}
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
