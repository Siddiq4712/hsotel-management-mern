import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Calendar, Users, CheckCircle, XCircle, Clock, Plus, Search, ArrowUpDown, Filter } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('All'); // College filter

  // NEW STATES FOR MONTH-END FEATURE
  const [showMonthEndModal, setShowMonthEndModal] = useState(false);  // NEW: For month-end modal
  const [monthEndLoading, setMonthEndLoading] = useState(false);      // NEW: Loading for month-end
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);  // NEW
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());     // NEW
  const [totalOperationalDays, setTotalOperationalDays] = useState(0);             // NEW
  const [studentReductions, setStudentReductions] = useState({});                  // NEW: {studentId: reduction}
  const [monthEndSearchTerm, setMonthEndSearchTerm] = useState('');                // NEW: Search for month-end modal
  const [monthEndSelectedCollege, setMonthEndSelectedCollege] = useState('All');   // NEW: College filter for modal

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
  }, [selectedDate]);

  const getRoomNumber = (student) => {
    return student.tbl_RoomAllotments?.[0]?.HostelRoom?.room_number || 'N/A';
  };

  const getValueForSort = (student, key) => {
    switch (key) {
      case 'name':
        return student.username.toLowerCase();
      case 'roll':
        return (student.roll_number || '').toLowerCase();
      case 'room':
        return getRoomNumber(student).toLowerCase();
      default:
        return '';
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getFilteredAndSortedStudents = () => {
    let filtered = [...students];

    // College filter
    if (selectedCollege !== 'All') {
      filtered = filtered.filter(student => student.college === selectedCollege);
    }

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.username.toLowerCase().includes(lowerSearch) ||
        (student.roll_number && student.roll_number.toLowerCase().includes(lowerSearch)) ||
        getRoomNumber(student).toLowerCase().includes(lowerSearch) ||
        student.college.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = getValueForSort(a, sortConfig.key);
        const bVal = getValueForSort(b, sortConfig.key);
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const getFilteredUnmarkedStudents = () => {
    let unmarked = students.filter(student => !getAttendanceForStudent(student.id));

    // College filter for modal (assuming same filter applies)
    if (selectedCollege !== 'All') {
      unmarked = unmarked.filter(student => student.college === selectedCollege);
    }

    // Search filter for modal
    if (modalSearchTerm) {
      const lowerSearch = modalSearchTerm.toLowerCase();
      unmarked = unmarked.filter(student =>
        student.username.toLowerCase().includes(lowerSearch) ||
        (student.roll_number && student.roll_number.toLowerCase().includes(lowerSearch)) ||
        getRoomNumber(student).toLowerCase().includes(lowerSearch) ||
        student.college.toLowerCase().includes(lowerSearch)
      );
    }

    return unmarked;
  };

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

  // NEW FUNCTIONS FOR MONTH-END FEATURE
  const fetchStudentsForMonthEnd = () => {  // NEW: Can reuse fetchStudents
    return students;  // Assuming students are already fetched
  };

  const getFilteredMonthEndStudents = () => {  // NEW
    let filtered = fetchStudentsForMonthEnd();

    // College filter
    if (monthEndSelectedCollege !== 'All') {
      filtered = filtered.filter(student => student.college === monthEndSelectedCollege);
    }

    // Search filter
    if (monthEndSearchTerm) {
      const lowerSearch = monthEndSearchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.username.toLowerCase().includes(lowerSearch) ||
        (student.roll_number && student.roll_number.toLowerCase().includes(lowerSearch)) ||
        getRoomNumber(student).toLowerCase().includes(lowerSearch) ||
        student.college.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  };

  const handleMonthEndSubmit = async () => {  // NEW
    setMonthEndLoading(true);
    try {
      const reductions = Object.entries(studentReductions)
        .filter(([, reduction]) => reduction > 0)  // Only send non-zero reductions
        .map(([studentId, reduction]) => ({
          student_id: parseInt(studentId),
          reduction_days: reduction
        }));

      await axios.post(
        'http://localhost:5001/api/warden/attendance/bulks',  // NEW ENDPOINT
        {
          month: selectedMonth,
          year: selectedYear,
          total_operational_days: parseInt(totalOperationalDays),
          student_reductions: reductions
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowMonthEndModal(false);
      setStudentReductions({});
      setMonthEndSearchTerm('');
      setMonthEndSelectedCollege('All');
      setTotalOperationalDays(0);
      alert('Month-end mandays entry completed successfully!');
    } catch (error) {
      console.error('Error in month-end mandays:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setMonthEndLoading(false);
    }
  };

  const handleReductionChange = (studentId, value) => {  // NEW
    setStudentReductions({
      ...studentReductions,
      [studentId]: parseInt(value) || 0
    });
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
      setModalSearchTerm('');
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

  const handleMarkAllPresent = () => {
    const newTemp = { ...tempAttendance };
    students.filter(s => !getAttendanceForStudent(s.id)).forEach((student) => {
      if (!newTemp[student.id]) {
        newTemp[student.id] = { status: 'P' };
      }
    });
    setTempAttendance(newTemp);
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

  const handleConfirmEditOrOd = async () => {
    const studentId = showOdDialog;
    const tempData = tempAttendance[studentId];
    if (!tempData) return;

    let isValid = false;
    if (editAttendanceId) {
      if (tempData.status !== 'OD') {
        isValid = true;
      } else if (tempData.from_date && tempData.to_date && tempData.reason) {
        isValid = true;
      }
    } else {
      // New OD
      if (tempData.from_date && tempData.to_date && tempData.reason) {
        isValid = true;
      }
    }

    if (!isValid) {
      alert('Please provide from date, to date, and reason for OD status');
      return;
    }

    try {
      setMarkingAttendance(true);
      await handleMarkAttendance(
        parseInt(studentId),
        tempData.status,
        tempData.reason,
        tempData.otherReason || tempData.remarks,
        tempData.from_date,
        tempData.to_date,
        tempData.attendanceId
      );
      // Clear temp for this student
      const newTemp = { ...tempAttendance };
      delete newTemp[studentId];
      setTempAttendance(newTemp);
      setShowOdDialog(null);
      setEditAttendanceId(null);
      await fetchAttendance();
      await fetchStudents();
      alert('Attendance updated successfully!');
    } catch (error) {
      console.error('Error saving attendance edit/OD:', error);
      alert('Error saving attendance: ' + (error.message || 'Unknown error'));
    } finally {
      setMarkingAttendance(false);
    }
  };

  const filteredStudents = getFilteredAndSortedStudents();
  const unmarkedStudents = getFilteredUnmarkedStudents();

  // Dynamic colleges from students data
  const colleges = ['All', ...new Set(students.map(s => s.college).filter(Boolean))];

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
            onClick={handleMarkAllPresent}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <CheckCircle size={20} className="mr-2" />
            Mark All Present
          </button>
          <button
            onClick={() => {
              const initialSelected = {};
              students.filter(s => !getAttendanceForStudent(s.id)).forEach(s => initialSelected[s.id] = 'P');
              setSelectedStudents(initialSelected);
              setOdDetails({});
              setShowMarkModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Bulk Mark
          </button>
          {/* NEW BUTTON */}
          <button
            onClick={() => setShowMonthEndModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Calendar size={20} className="mr-2" />
            Month-End Mandays
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Users className="text-gray-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.total + attendanceStats.od}</p>
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
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Clock className="text-blue-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">On Duty</p>
              <p className="text-2xl font-bold text-blue-900">{attendanceStats.od}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <Calendar className="text-gray-400 mr-2" size={20} />
              <h2 className="text-lg font-medium text-gray-900">
                Attendance for {new Date(selectedDate).toLocaleDateString()}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <select
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-48"
                >
                  {colleges.map(college => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                </select>
              </div>
              <select
                value={sortConfig.key || ''}
                onChange={(e) => handleSort(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sort by</option>
                <option value="name">Name</option>
                <option value="roll">Roll Number</option>
                <option value="room">Room Number</option>
              </select>
              {sortConfig.key && (
                <button
                  onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <ArrowUpDown size={16} />
                </button>
              )}
            </div>
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
                  College
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Number
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
              {filteredStudents.map((student) => {
                const studentAttendance = getAttendanceForStudent(student.id);
                const tempData = tempAttendance[student.id];
                const tempStatus = tempData?.status;
                const currentStatus = tempStatus || (studentAttendance ? studentAttendance.status : null);
                const currentReason = tempStatus === 'OD' ? tempData?.reason : (studentAttendance?.reason || null);
                const currentRemarks = tempStatus === 'OD' ? tempData?.otherReason : (studentAttendance?.remarks || null);
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.college}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.roll_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getRoomNumber(student)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {currentStatus ? (
                        <div className="flex items-center">
                          {getStatusIcon(currentStatus)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
                            {currentStatus === 'P' ? 'Present' : currentStatus === 'A' ? 'Absent' : 'On Duty'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not Marked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {currentReason ? `${currentReason}${currentReason === 'Other' && currentRemarks ? `: ${currentRemarks}` : ''}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!studentAttendance ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setTempAttendance({ ...tempAttendance, [student.id]: { status: 'P' } })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${(tempStatus === 'P' || currentStatus === 'P') ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'} hover:bg-green-700 hover:text-white transition-colors`}
                            title="Present"
                          >
                            P
                          </button>
                          <button
                            onClick={() => setTempAttendance({ ...tempAttendance, [student.id]: { status: 'A' } })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${(tempStatus === 'A' || currentStatus === 'A') ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'} hover:bg-red-700 hover:text-white transition-colors`}
                            title="Absent"
                          >
                            A
                          </button>
                          <button
                            onClick={() => {
                              setShowOdDialog(student.id);
                              setEditAttendanceId(null);
                              setTempAttendance({ ...tempAttendance, [student.id]: { status: 'OD', from_date: '', to_date: '', reason: null, attendanceId: null } });
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${(tempStatus === 'OD' || currentStatus === 'OD') ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'} hover:bg-blue-700 hover:text-white transition-colors`}
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
            {markingAttendance ? 'Saving...' : `Save All (${Object.keys(tempAttendance).length} changes)`}
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
                    onClick={() => setTempAttendance({ ...tempAttendance, [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'P', from_date: null, to_date: null, reason: null, otherReason: null, attendanceId: editAttendanceId } })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${tempAttendance[showOdDialog]?.status === 'P' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'} hover:bg-green-700 hover:text-white transition-colors`}
                    title="Present"
                  >
                    P
                  </button>
                  <button
                    onClick={() => setTempAttendance({ ...tempAttendance, [showOdDialog]: { ...tempAttendance[showOdDialog], status: 'A', from_date: null, to_date: null, reason: null, otherReason: null, attendanceId: editAttendanceId } })}
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
                onClick={handleConfirmEditOrOd}
                disabled={markingAttendance}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {markingAttendance ? 'Saving...' : 'Confirm & Save'}
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
              <p className="text-sm text-gray-600 mb-4">All unmarked students are pre-selected as Present. Change as needed for absentees or on-duty.</p>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search unmarked students..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        College
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Roll Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Room Number
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
                    {unmarkedStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="text-sm font-medium text-gray-900">{student.username}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {student.college}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {student.roll_number || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {getRoomNumber(student)}
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
                  disabled={markingAttendance || Object.values(selectedStudents).filter(s => s).length === 0}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {markingAttendance ? 'Marking...' : `Mark Attendance (${Object.values(selectedStudents).filter(s => s).length} students)`}
                </button>
                <button
                  onClick={() => {
                    setShowMarkModal(false);
                    setSelectedStudents({});
                    setOdDetails({});
                    setModalSearchTerm('');
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

      {/* NEW: Month-End Mandays Modal */}
      {showMonthEndModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Month-End Mandays Entry</h3>
              <p className="text-sm text-gray-600 mb-4">Enter total operational days for the month and day reductions per student (default 0).</p>
              
              {/* Month/Year and Total Operational Days */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i, 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    min={2020}
                    max={2030}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Operational Days</label>
                  <input
                    type="number"
                    value={totalOperationalDays}
                    onChange={(e) => setTotalOperationalDays(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Search and Filter for Students */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={monthEndSearchTerm}
                  onChange={(e) => setMonthEndSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 w-full"
                />
              </div>
              <div className="mb-4">
                <select
                  value={monthEndSelectedCollege}
                  onChange={(e) => setMonthEndSelectedCollege(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                >
                  {colleges.map(college => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                </select>
              </div>

              {/* Students Table for Reductions */}
              <div className="max-h-96 overflow-y-auto mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">College</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day Reduction</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Calculated Mandays</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredMonthEndStudents().map((student) => {
                      const reduction = studentReductions[student.id] || 0;
                      const mandays = Math.max(0, totalOperationalDays - reduction);
                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{student.username}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{student.college}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{student.roll_number || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{getRoomNumber(student)}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={reduction}
                              onChange={(e) => handleReductionChange(student.id, e.target.value)}
                              min={0}
                              max={totalOperationalDays}
                              className="w-20 px-2 py-1 border rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{mandays}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-4 mt-4 border-t justify-end">
                <button
                  onClick={handleMonthEndSubmit}
                  disabled={monthEndLoading || totalOperationalDays === 0}
                  className="bg-purple-600 text-white py-2 px-6 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {monthEndLoading ? 'Processing...' : 'Submit Mandays Entry'}
                </button>
                <button
                  onClick={() => {
                    setShowMonthEndModal(false);
                    setStudentReductions({});
                    setMonthEndSearchTerm('');
                    setMonthEndSelectedCollege('All');
                    setTotalOperationalDays(0);
                  }}
                  className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 transition-colors"
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