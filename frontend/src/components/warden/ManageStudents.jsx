import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wardenAPI } from '../../services/api';
import { Users, User, Bed, AlertCircle, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Users as UsersIcon } from 'lucide-react';

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
      console.log('Students data:', response.data.data); // Debug log
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
    
    // Fetch roommates if room is assigned
    const roomInfo = getRoomInfo(student);
    console.log('Room info for student', student.id, ':', roomInfo); // Debug log
    if (roomInfo) {
      await fetchRoommates(roomInfo.roomId, student.id);
    } else {
      setRoommates([]);
    }
  };

  const fetchRoommates = async (roomId, studentId) => {
    try {
      console.log('Fetching roommates for roomId:', roomId, 'studentId:', studentId); // Debug log
      setRoommatesLoading(true);
      const response = await wardenAPI.getRoomOccupants(roomId);
      console.log('Room occupants response:', response.data.data); // Debug log
      const allOccupants = response.data.data || [];
      // Filter out the current student
      const mates = allOccupants.filter(occupant => occupant.id !== studentId);
      console.log('Filtered roommates:', mates); // Debug log
      setRoommates(mates);
    } catch (error) {
      console.error('Error fetching roommates:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
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

  // Helper function to safely access room data
const getRoomInfo = (student) => {
  // Check for room allotments
  if (!student.tbl_RoomAllotments || student.tbl_RoomAllotments.length === 0) {
    return null;
  }
  
  // Find the active room allotment
  const activeAllotment = student.tbl_RoomAllotments.find(allotment => allotment.is_active);
  if (!activeAllotment) return null;
  
  // Get room details (handle both possible property names)
  const room = activeAllotment.HostelRoom || activeAllotment.tbl_HostelRoom;
  if (!room) return null;
  
  // Get room type (handle nesting from Sequelize include)
  const roomType = room.RoomType || room.tbl_RoomType || room.RoomType?.tbl_RoomType; // FIXED: Handle potential nesting
  
  return {
    roomNumber: room.room_number,
    roomTypeName: roomType?.name || 'Standard',
    roomId: room.id // Now guaranteed to be available
  };
};

  // Helper to get session from enrollment
  const getSession = (student) => {
    return student.session || 'N/A';  // FIXED: Use direct student.session instead of tbl_Enrollments[0].session
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="text-red-400 mr-2" size={20} />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading students</h3>
            <div className="text-sm text-red-700 mt-1">{error}</div>
          </div>
        </div>
        <button 
          onClick={fetchStudents}
          className="mt-3 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
        <p className="text-gray-600 mt-2">View and manage enrolled students</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <Users className="text-gray-400 mr-2" size={20} />
              <h2 className="text-lg font-medium text-gray-900">Student List</h2>
              <span className="ml-2 text-sm text-gray-500">
                ({filteredAndSortedStudents.length} students)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              <button
                onClick={fetchStudents}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {students.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
  <tr>
    <th
      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100"
    >
      Student
    </th>
    <th
      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
      onClick={() => handleSort('roll_number')}
    >
      Roll Number
      {sortBy === 'roll_number' && (
        <span className="ml-1">
          {sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      )}
    </th>
    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Room
    </th>
  </tr>
</thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {currentStudents.map((student) => {
                    const roomInfo = getRoomInfo(student);
                    
                    return (
                      <tr 
                        key={student.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(student)}
                      >
                        <td className="px-2 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-1.5 rounded-full">
                              <User className="text-blue-600" size={14} />
                            </div>
                            <div className="ml-2">
                              <div className="text-xs font-medium text-gray-900">
                                {student.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.roll_number || 'N/A'}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                          {roomInfo ? (
                            <div className="flex items-center">
                              <Bed size={14} className="mr-1 text-gray-400" />
                              Room {roomInfo.roomNumber}
                              <span className="ml-1 text-xs text-gray-400">
                                ({roomInfo.roomTypeName})
                              </span>
                            </div>
                          ) : (
                            <span className="text-orange-600">Not assigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstStudent + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(indexOfLastStudent, filteredAndSortedStudents.length)}</span> of{' '}
                      <span className="font-medium">{filteredAndSortedStudents.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {/* Page numbers with ellipsis */}
                      {getPageNumbers().map((page, index) => (
                        <button
                          key={page}
                          onClick={() => paginate(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                          } ${index === 0 && currentPage > 3 ? 'rounded-none' : ''} ${index === getPageNumbers().length - 1 && currentPage < totalPages - 2 ? 'rounded-none' : ''}`}
                        >
                          {page}
                        </button>
                      ))}
                      {currentPage < totalPages - 2 && (
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm text-gray-500">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === totalPages
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      >
                        {totalPages}
                      </button>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students enrolled</h3>
            <p className="mt-1 text-sm text-gray-500">
              Students you enroll will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedStudent(null);
                    setRoommates([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedStudent.username}</p>
                    <p className="text-sm text-gray-500">Roll Number: {selectedStudent.roll_number || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Room Information</h4>
                  {getRoomInfo(selectedStudent) ? (
                    <p className="text-sm text-gray-600">
                      Room {getRoomInfo(selectedStudent).roomNumber} ({getRoomInfo(selectedStudent).roomTypeName})
                    </p>
                  ) : (
                    <p className="text-sm text-orange-600">No room assigned</p>
                  )}
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Session</h4>
                  <p className="text-sm text-gray-600">{getSession(selectedStudent)}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Room Mates</h4>
                  {roommatesLoading ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  ) : roommates.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {roommates.map(mate => (
                        <div key={mate.id} className="text-sm text-gray-600 flex items-center">
                          <User className="mr-2 h-3 w-3" />
                          {mate.username} ({mate.roll_number || 'N/A'})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No roommates or room not assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;