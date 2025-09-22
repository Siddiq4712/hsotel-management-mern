import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Calendar, Users, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import axios from "axios";
const token = localStorage.getItem("token");

const AttendanceManagement = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState({});
  const [odDetails, setOdDetails] = useState({});
  const [showOdDialog, setShowOdDialog] = useState(null); // Track which student's OD dialog is open
  const [tempAttendance, setTempAttendance] = useState({}); // Temporary attendance state for each student
  const [editAttendanceId, setEditAttendanceId] = useState(null); // Track attendance ID being edited

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
  }, [selectedDate]);

  const fetchStudents = async () => {
    try {
      const response = await wardenAPI.getStudents();
      const allStudents = response.data.data || [];
      const odAttendance = await wardenAPI.getAttendance({ date: selectedDate });
      const odStudents = odAttendance.data.data
        .filter(att => att.status === 'OD' && att.from_date <= selectedDate && att.to_date >= selectedDate)
        .map(att => att.Student.id);
      
      const filteredStudents = allStudents.filter(student => !odStudents.includes(student.id));
      setStudents(filteredStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Failed to fetch students. Please try again.');
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await wardenAPI.getAttendance({ date: selectedDate });
      setAttendance(response.data.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      alert('Failed to fetch attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, status, reason, remarks, fromDate, toDate, attendanceId) => {
  try {
    // Format dates to YYYY-MM-DD
    const formattedDate = selectedDate || new Date().toISOString().split('T')[0];
    const formattedFromDate = fromDate ? (fromDate instanceof Date ? fromDate.toISOString().split('T')[0] : fromDate) : null;
    const formattedToDate = toDate ? (toDate instanceof Date ? toDate.toISOString().split('T')[0] : toDate) : null;

    // Validate inputs
    if (!formattedDate || new Date(formattedDate).toString() === 'Invalid Date') {
      throw new Error('Invalid date provided');
    }
    if (!studentId || !status) {
      throw new Error('Student ID and status are required');
    }
    if (status === 'OD' && (!formattedFromDate || !formattedToDate)) {
      throw new Error('From date and to date are required for OD status');
    }

    const response = await axios.post(
      'http://localhost:5001/api/warden/attendance',
      {
        student_id: studentId,
        date: formattedDate,
        status,
        reason,
        remarks,
        from_date: status === 'OD' ? formattedFromDate : null,
        to_date: status === 'OD' ? formattedToDate : null
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Attendance updated:', response.data);
    return true; // Indicate success
  } catch (error) {
    console.error('Error updating attendance:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.response?.data?.message || 'Failed to update attendance');
  }
};

const handleSaveAll = async () => {
  setMarkingAttendance(true);
  try {
    const attendancePromises = Object.entries(tempAttendance)
      .filter(([_, data]) => data && data.status)
      .map(([studentId, data]) =>
        handleMarkAttendance(
          parseInt(studentId),
          data.status,
          data.reason,
          data.otherReason || data.remarks,
          data.from_date,
          data.to_date,
          data.attendanceId
        )
      );

    const results = await Promise.allSettled(attendancePromises);
    const allSuccessful = results.every(result => result.status === 'fulfilled');
    
    if (allSuccessful) {
      setTempAttendance({});
      setShowOdDialog(null);
      setEditAttendanceId(null);
      await fetchAttendance();
      await fetchStudents();
      alert('Attendance saved successfully!');
    } else {
      const failedCount = results.filter(r => r.status === 'rejected').length;
      alert(`Failed to save ${failedCount} attendance record(s). Please check and try again.`);
    }
  } catch (error) {
    console.error('Error saving all attendance:', error);
    alert('Error saving attendance: ' + (error.response?.data?.message || error.message));
  } finally {
    setMarkingAttendance(false);
  }
};  
  const handleBulkMarkAttendance = async () => {
    setMarkingAttendance(true);
    try {
      const attendanceData = Object.entries(selectedStudents)
        .filter(([_, status]) => status)
        .map(([studentId, status]) => {
          let data = { student_id: parseInt(studentId), date: selectedDate, status };
          if (status === 'OD') {
            const odInfo = odDetails[studentId] || {};
            if (!odInfo.from_date || !odInfo.to_date || !odInfo.reason) {
              throw new Error(`Missing OD details for student ${studentId}`);
            }
            data = {
              ...data,
              from_date: odInfo.from_date,
              to_date: odInfo.to_date,
              reason: odInfo.reason,
              remarks: odInfo.reason === 'Other' ? odInfo.otherReason : undefined
            };
          }
          return data;
        });

      await wardenAPI.bulkMarkAttendance({ date: selectedDate, attendanceData });
      setShowMarkModal(false);
      setSelectedStudents({});
      setOdDetails({});
      fetchAttendance();
      fetchStudents();
      alert('Bulk attendance marked successfully!');
    } catch (error) {
      console.error('Error marking bulk attendance:', error);
      alert('Error marking bulk attendance: ' + (error.response?.data?.message || error.message));
    } finally {
      setMarkingAttendance(false);
    }
  };

  const getAttendanceForStudent = (studentId) => {
    return attendance.find(att => att.Student?.id === studentId);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'P':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'A':
        return <XCircle className="text-red-600" size={20} />;
      case 'OD':
        return <Clock className="text-blue-600" size={20} />;
      default:
        return <XCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'P':
        return 'bg-green-100 text-green-800';
      case 'A':
        return 'bg-red-100 text-red-800';
      case 'OD':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditAttendance = (studentId, attendance) => {
    setShowOdDialog(studentId);
    setEditAttendanceId(attendance.id);
    setTempAttendance({
      ...tempAttendance,
      [studentId]: {
        status: attendance.status,
        from_date: attendance.from_date || '',
        to_date: attendance.to_date || '',
        reason: attendance.reason || '',
        otherReason: attendance.remarks || '',
        attendanceId: attendance.id
      }
    });
  };

  const attendanceStats = {
    total: students.length,
    present: attendance.filter(att => att.status === 'P').length,
    absent: attendance.filter(att => att.status === 'A').length,
    od: attendance.filter(att => att.status === 'OD').length,
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600 mt-2">Track and manage student attendance</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowMarkModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Users className="text-gray-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CheckCircle className="text-green-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-900">{attendanceStats.present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <XCircle className="text-red-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-900">{attendanceStats.absent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            <Calendar className="text-gray-400 mr-2" size={20} />
            <h2 className="text-lg font-medium text-gray-900">
              Attendance for {new Date(selectedDate).toLocaleDateString()}
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => {
                const studentAttendance = getAttendanceForStudent(student.id);
                const tempStatus = tempAttendance[student.id]?.status;
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Users className="text-blue-600" size={16} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {student.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {studentAttendance ? (
                        <div className="flex items-center">
                          {getStatusIcon(studentAttendance.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(studentAttendance.status)}`}>
                            {studentAttendance.status === 'P' ? 'Present' : studentAttendance.status === 'A' ? 'Absent' : 'On Duty'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not Marked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {studentAttendance?.reason || '-'}
                      {studentAttendance?.reason === 'Other' && studentAttendance?.remarks ? `: ${studentAttendance.remarks}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!studentAttendance ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setTempAttendance({ ...tempAttendance, [student.id]: { status: 'P' } })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${tempStatus === 'P' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'} hover:bg-green-700 hover:text-white transition-colors`}
                            title="Present"
                          >
                            P
                          </button>
                          <button
                            onClick={() => setTempAttendance({ ...tempAttendance, [student.id]: { status: 'A' } })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${tempStatus === 'A' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'} hover:bg-red-700 hover:text-white transition-colors`}
                            title="Absent"
                          >
                            A
                          </button>
                          <button
                            onClick={() => {
                              setShowOdDialog(student.id);
                              setEditAttendanceId(null); // New attendance
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${tempStatus === 'OD' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'} hover:bg-blue-700 hover:text-white transition-colors`}
                            title="On Duty"
                          >
                            OD
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditAttendance(student.id, studentAttendance)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save All Button */}
      {Object.keys(tempAttendance).length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveAll}
            disabled={markingAttendance}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {markingAttendance ? 'Saving...' : 'Save All'}
          </button>
        </div>
      )}

      {/* OD/Edit Dialog Box */}
      {showOdDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editAttendanceId ? 'Edit Attendance' : 'On Duty Details'} for {students.find(s => s.id === showOdDialog)?.username}
            </h3>
            <div className="space-y-4">
              {editAttendanceId && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTempAttendance({ ...tempAttendance, [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'P', from_date: '', to_date: '', reason: '', otherReason: '', attendanceId: editAttendanceId } })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${tempAttendance[showOdDialog]?.status === 'P' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'} hover:bg-green-700 hover:text-white transition-colors`}
                    title="Present"
                  >
                    P
                  </button>
                  <button
                    onClick={() => setTempAttendance({ ...tempAttendance, [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'A', from_date: '', to_date: '', reason: '', otherReason: '', attendanceId: editAttendanceId } })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${tempAttendance[showOdDialog]?.status === 'A' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'} hover:bg-red-700 hover:text-white transition-colors`}
                    title="Absent"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setTempAttendance({ ...tempAttendance, [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'OD', attendanceId: editAttendanceId } })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${tempAttendance[showOdDialog]?.status === 'OD' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'} hover:bg-blue-700 hover:text-white transition-colors`}
                    title="On Duty"
                  >
                    OD
                  </button>
                </div>
              )}
              {(!editAttendanceId || tempAttendance[showOdDialog]?.status === 'OD') && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600">From Date</label>
                    <input
                      type="date"
                      value={tempAttendance[showOdDialog]?.from_date || ''}
                      onChange={(e) => setTempAttendance({
                        ...tempAttendance,
                        [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'OD', from_date: e.target.value, attendanceId: editAttendanceId }
                      })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">To Date</label>
                    <input
                      type="date"
                      value={tempAttendance[showOdDialog]?.to_date || ''}
                      onChange={(e) => setTempAttendance({
                        ...tempAttendance,
                        [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'OD', to_date: e.target.value, attendanceId: editAttendanceId }
                      })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Reason</label>
                    <select
                      value={tempAttendance[showOdDialog]?.reason || ''}
                      onChange={(e) => setTempAttendance({
                        ...tempAttendance,
                        [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'OD', reason: e.target.value, attendanceId: editAttendanceId }
                      })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Reason</option>
                      <option value="NCC">NCC</option>
                      <option value="NSS">NSS</option>
                      <option value="Internship">Internship</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {tempAttendance[showOdDialog]?.reason === 'Other' && (
                    <div>
                      <label className="block text-sm text-gray-600">Specify Reason</label>
                      <input
                        type="text"
                        value={tempAttendance[showOdDialog]?.otherReason || ''}
                        onChange={(e) => setTempAttendance({
                          ...tempAttendance,
                          [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'OD', otherReason: e.target.value, attendanceId: editAttendanceId }
                        })}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Specify Other Reason"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => {
                  if (!editAttendanceId || tempAttendance[showOdDialog]?.status !== 'OD' || (tempAttendance[showOdDialog]?.from_date && tempAttendance[showOdDialog]?.to_date && tempAttendance[showOdDialog]?.reason)) {
                    setShowOdDialog(null);
                  } else {
                    alert('Please provide from date, to date, and reason for OD status');
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowOdDialog(null);
                  setTempAttendance({ ...tempAttendance, [showOdDialog]: undefined });
                  setEditAttendanceId(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Mark Attendance Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Mark Attendance</h3>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Present
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Absent
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        On Duty
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.filter(student => !getAttendanceForStudent(student.id)).map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {student.username}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`attendance-${student.id}`}
                            value="P"
                            checked={selectedStudents[student.id] === 'P'}
                            onChange={(e) => setSelectedStudents({
                              ...selectedStudents,
                              [student.id]: e.target.value
                            })}
                            className="text-green-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`attendance-${student.id}`}
                            value="A"
                            checked={selectedStudents[student.id] === 'A'}
                            onChange={(e) => setSelectedStudents({
                              ...selectedStudents,
                              [student.id]: e.target.value
                            })}
                            className="text-red-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`attendance-${student.id}`}
                            value="OD"
                            checked={selectedStudents[student.id] === 'OD'}
                            onChange={(e) => setSelectedStudents({
                              ...selectedStudents,
                              [student.id]: e.target.value
                            })}
                            className="text-blue-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {selectedStudents[student.id] === 'OD' && (
                            <div className="space-y-2">
                              <input
                                type="date"
                                value={odDetails[student.id]?.from_date || ''}
                                onChange={(e) => setOdDetails({
                                  ...odDetails,
                                  [student.id]: { ...odDetails[student.id], from_date: e.target.value }
                                })}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="From Date"
                              />
                              <input
                                type="date"
                                value={odDetails[student.id]?.to_date || ''}
                                onChange={(e) => setOdDetails({
                                  ...odDetails,
                                  [student.id]: { ...odDetails[student.id], to_date: e.target.value }
                                })}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="To Date"
                              />
                              <select
                                value={odDetails[student.id]?.reason || ''}
                                onChange={(e) => setOdDetails({
                                  ...odDetails,
                                  [student.id]: { ...odDetails[student.id], reason: e.target.value }
                                })}
                                className="w-full px-2 py-1 border rounded"
                              >
                                <option value="">Select Reason</option>
                                <option value="NCC">NCC</option>
                                <option value="NSS">NSS</option>
                                <option value="Internship">Internship</option>
                                <option value="Other">Other</option>
                              </select>
                              {odDetails[student.id]?.reason === 'Other' && (
                                <input
                                  type="text"
                                  value={odDetails[student.id]?.otherReason || ''}
                                  onChange={(e) => setOdDetails({
                                    ...odDetails,
                                    [student.id]: { ...odDetails[student.id], otherReason: e.target.value }
                                  })}
                                  className="w-full px-2 py-1 border rounded"
                                  placeholder="Specify Other Reason"
                                />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-4 mt-4 border-t">
                <button
                  onClick={handleBulkMarkAttendance}
                  disabled={markingAttendance || Object.keys(selectedStudents).length === 0}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {markingAttendance ? 'Marking...' : 'Mark Attendance'}
                </button>
                <button
                  onClick={() => {
                    setShowMarkModal(false);
                    setSelectedStudents({});
                    setOdDetails({});
                  }}
                  className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;