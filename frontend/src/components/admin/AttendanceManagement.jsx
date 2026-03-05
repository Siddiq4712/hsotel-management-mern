import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Calendar, Users, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';

const AttendanceManagement = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState({});

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
  }, [selectedDate]);

  const fetchStudents = async () => {
    try {
      const response = await wardenAPI.getStudents();
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await wardenAPI.getAttendance({ date: selectedDate });
      setAttendance(response.data.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {
      await wardenAPI.markAttendance({
        student_id: studentId,
        date: selectedDate,
        status: status,
        check_in_time: new Date().toTimeString().split(' ')[0]
      });
      fetchAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const handleBulkMarkAttendance = async () => {
    setMarkingAttendance(true);
    
    try {
      const promises = Object.entries(selectedStudents).map(([studentId, status]) => 
        wardenAPI.markAttendance({
          student_id: parseInt(studentId),
          date: selectedDate,
          status: status,
          check_in_time: new Date().toTimeString().split(' ')[0]
        })
      );
      
      await Promise.all(promises);
      setShowMarkModal(false);
      setSelectedStudents({});
      fetchAttendance();
    } catch (error) {
      console.error('Error marking bulk attendance:', error);
    } finally {
      setMarkingAttendance(false);
    }
  };

  const getAttendanceForStudent = (studentId) => {
    return attendance.find(att => att.Student?.id === studentId);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'absent':
        return <XCircle className="text-red-600" size={20} />;
      case 'late':
        return <Clock className="text-yellow-600" size={20} />;
      case 'excused':
        return <CheckCircle className="text-blue-600" size={20} />;
      default:
        return <XCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'excused':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const attendanceStats = {
    total: students.length,
    present: attendance.filter(att => att.status === 'present').length,
    absent: attendance.filter(att => att.status === 'absent').length,
    late: attendance.filter(att => att.status === 'late').length,
    excused: attendance.filter(att => att.status === 'excused').length
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <Clock className="text-yellow-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-bold text-yellow-900">{attendanceStats.late}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CheckCircle className="text-blue-600" size={24} />
            <div className="ml-3">
              <p className="text-sm text-gray-600">Excused</p>
              <p className="text-2xl font-bold text-blue-900">{attendanceStats.excused}</p>
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
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => {
                const studentAttendance = getAttendanceForStudent(student.userId);
                return (
                  <tr key={student.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Users className="text-blue-600" size={16} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {student.userName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {studentAttendance ? (
                        <div className="flex items-center">
                          {getStatusIcon(studentAttendance.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(studentAttendance.status)}`}>
                            {studentAttendance.status.charAt(0).toUpperCase() + studentAttendance.status.slice(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not Marked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {studentAttendance?.check_in_time || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {studentAttendance?.check_out_time || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!studentAttendance && (
                        <>
                          <button
                            onClick={() => handleMarkAttendance(student.userId, 'present')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.userId, 'absent')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.userId, 'late')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Late
                          </button>
                        </>
                      )}
                      {studentAttendance && (
                        <button className="text-blue-600 hover:text-blue-900">
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
                        Late
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Excused
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.filter(student => !getAttendanceForStudent(student.userId)).map((student) => (
                      <tr key={student.userId}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {student.userName}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`attendance-${student.userId}`}
                            value="present"
                            checked={selectedStudents[student.userId] === 'present'}
                            onChange={(e) => setSelectedStudents({
                              ...selectedStudents,
                              [student.userId]: e.target.value
                            })}
                            className="text-green-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`attendance-${student.userId}`}
                            value="absent"
                            checked={selectedStudents[student.userId] === 'absent'}
                            onChange={(e) => setSelectedStudents({
                              ...selectedStudents,
                              [student.userId]: e.target.value
                            })}
                            className="text-red-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`attendance-${student.userId}`}
                            value="late"
                            checked={selectedStudents[student.userId] === 'late'}
                            onChange={(e) => setSelectedStudents({
                              ...selectedStudents,
                              [student.userId]: e.target.value
                            })}
                            className="text-yellow-600"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`attendance-${student.userId}`}
                            value="excused"
                            checked={selectedStudents[student.userId] === 'excused'}
                            onChange={(e) => setSelectedStudents({
                              ...selectedStudents,
                              [student.userId]: e.target.value
                            })}
                            className="text-blue-600"
                          />
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
