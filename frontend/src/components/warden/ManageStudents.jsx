import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wardenAPI } from '../../services/api';
import { 
  Users, User, Bed, AlertCircle, Search, ChevronUp, ChevronDown, 
  ChevronLeft, ChevronRight, X, Mail, Phone, MapPin, Award,
  Loader2
} from 'lucide-react';

const ManageStudents = ({ setCurrentView }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('roll_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [roommatesLoading, setRoommatesLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await wardenAPI.getStudents();
      setStudents(response.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError(error.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedStudents = React.useMemo(() => {
    let filtered = students.filter(student =>
      student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.roll_number && student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered.sort((a, b) => {
      let aValue = sortBy === 'roll_number' ? (a.roll_number || '') : a.username;
      let bValue = sortBy === 'roll_number' ? (b.roll_number || '') : b.username;
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, searchTerm, sortBy, sortOrder]);

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredAndSortedStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredAndSortedStudents.length / studentsPerPage);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleRowClick = async (student) => {
    setSelectedStudent(student);
    setShowModal(true);
    
    const roomInfo = getRoomInfo(student);
    if (roomInfo) {
      await fetchRoommates(roomInfo.roomId, student.id);
    } else {
      setRoommates([]);
    }
  };

  const fetchRoommates = async (roomId, studentId) => {
    try {
      setRoommatesLoading(true);
      const response = await wardenAPI.getRoomOccupants(roomId);
      const allOccupants = response.data.data || [];
      const mates = allOccupants.filter(occupant => occupant.id !== studentId);
      setRoommates(mates);
    } catch (error) {
      console.error('Error fetching roommates:', error);
      setRoommates([]);
    } finally {
      setRoommatesLoading(false);
    }
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const getRoomInfo = (student) => {
    if (!student.tbl_RoomAllotments || student.tbl_RoomAllotments.length === 0) {
      return null;
    }
    
    const activeAllotment = student.tbl_RoomAllotments.find(allotment => allotment.is_active);
    if (!activeAllotment) return null;
    
    const room = activeAllotment.HostelRoom || activeAllotment.tbl_HostelRoom;
    if (!room) return null;
    
    const roomType = room.RoomType || room.tbl_RoomType;
    
    return {
      roomNumber: room.room_number,
      roomTypeName: roomType?.name || 'Standard',
      roomId: room.id
    };
  };

  const getSession = (student) => {
    return student.session || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start space-x-4">
          <div className="bg-red-100 p-3 rounded-lg">
            <AlertCircle className="text-red-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Students</h3>
            <p className="text-red-700 mt-1 text-sm">{error}</p>
            <button 
              onClick={fetchStudents}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Manage Students</h1>
        <p className="text-gray-600 mt-2">Monitor and manage all enrolled students in your hostel</p>
      </div>

      {/* Main Table Card */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Student Directory</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredAndSortedStudents.length} total student{filteredAndSortedStudents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative flex-1 min-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80 transition-all"
                />
              </div>
              <button
                onClick={fetchStudents}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {students.length > 0 ? (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</span>
                    </th>
                    <th 
                      className="px-6 py-4 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('roll_number')}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll Number</span>
                        {sortBy === 'roll_number' && (
                          <span className="text-blue-600">
                            {sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Room Assignment</span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Session</span>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentStudents.map((student) => {
                    const roomInfo = getRoomInfo(student);
                    
                    return (
                      <tr 
                        key={student.id} 
                        className="hover:bg-blue-50 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-2 rounded-full group-hover:bg-blue-200 transition-colors">
                              <User className="text-blue-600" size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{student.username}</p>
                              <p className="text-xs text-gray-500 mt-0.5">ID: {student.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{student.roll_number || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {roomInfo ? (
                            <div className="flex items-center space-x-2">
                              <div className="bg-green-100 p-2 rounded-lg">
                                <Bed size={16} className="text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Room {roomInfo.roomNumber}</p>
                                <p className="text-xs text-gray-500">{roomInfo.roomTypeName}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                              <span className="text-sm text-amber-700 font-medium">Not Assigned</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-medium">{getSession(student)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleRowClick(student)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{indexOfFirstStudent + 1}</span> to{' '}
                    <span className="font-semibold">{Math.min(indexOfLastStudent, filteredAndSortedStudents.length)}</span> of{' '}
                    <span className="font-semibold">{filteredAndSortedStudents.length}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {currentPage > 2 && (
                        <>
                          <button
                            onClick={() => paginate(1)}
                            className="px-3 py-1 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            1
                          </button>
                          {currentPage > 3 && <span className="text-gray-400">...</span>}
                        </>
                      )}
                      
                      {getPageNumbers().map(page => (
                        <button
                          key={page}
                          onClick={() => paginate(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      {currentPage < totalPages - 1 && (
                        <>
                          {currentPage < totalPages - 2 && <span className="text-gray-400">...</span>}
                          <button
                            onClick={() => paginate(totalPages)}
                            className="px-3 py-1 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-blue-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">No Students Enrolled</h3>
            <p className="text-gray-600 mt-2 max-w-sm mx-auto">
              Start enrolling students to see them appear in your directory.
            </p>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <h3 className="text-xl font-bold text-gray-900">Student Details</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedStudent(null);
                  setRoommates([]);
                }}
                className="p-2 hover:bg-blue-200 rounded-lg transition-colors text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Student Info Card */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 p-4 rounded-lg">
                    <User className="text-white" size={32} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-gray-900">{selectedStudent.username}</h4>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase">Roll Number</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {selectedStudent.roll_number || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase">Student ID</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStudent.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Information */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Bed className="text-green-600" size={20} />
                  </div>
                  <h4 className="font-bold text-gray-900">Room Assignment</h4>
                </div>
                {getRoomInfo(selectedStudent) ? (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Room Number</p>
                    <p className="text-2xl font-bold text-green-700">
                      Room {getRoomInfo(selectedStudent).roomNumber}
                    </p>
                    <p className="text-sm text-gray-600 mt-3">Type</p>
                    <p className="font-semibold text-gray-900">
                      {getRoomInfo(selectedStudent).roomTypeName}
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">⚠ No room assigned</span> - Please assign a room to this student.
                    </p>
                  </div>
                )}
              </div>

              {/* Session Information */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Award className="text-purple-600" size={20} />
                  </div>
                  <h4 className="font-bold text-gray-900">Academic Session</h4>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Current Session</p>
                  <p className="text-lg font-semibold text-gray-900">{getSession(selectedStudent)}</p>
                </div>
              </div>

              {/* Roommates Section */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Users className="text-indigo-600" size={20} />
                  </div>
                  <h4 className="font-bold text-gray-900">Roommates</h4>
                </div>
                
                {roommatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading roommates...</p>
                    </div>
                  </div>
                ) : roommates.length > 0 ? (
                  <div className="space-y-3">
                    {roommates.map(mate => (
                      <div key={mate.id} className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                        <div className="flex items-start space-x-3">
                          <div className="bg-indigo-100 p-2 rounded-full mt-1">
                            <User className="text-indigo-600" size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{mate.username}</p>
                            <p className="text-sm text-gray-600">Roll: {mate.roll_number || '—'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">
                      {getRoomInfo(selectedStudent) 
                        ? 'No roommates assigned to this room'
                        : 'No roommates - room not assigned'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;
