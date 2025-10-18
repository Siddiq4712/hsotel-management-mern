import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Bed, User, CheckCircle, AlertCircle, Users, Home, Eye, X, ChevronRight, Plus, Minus, Search } from 'lucide-react';

const RoomAllotment = () => {
  const [students, setStudents] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedRoomOccupants, setSelectedRoomOccupants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [occupantsLoading, setOccupantsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showBulkSelection, setShowBulkSelection] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchAvailableRooms();
  }, []);

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const response = await wardenAPI.getStudents();
      console.log('Students for room allotment:', response.data.data); // Debug log
      
      // Filter students who don't have active room allotments
      const unassignedStudents = response.data.data.filter(student => 
        !student.tbl_RoomAllotments || 
        student.tbl_RoomAllotments.length === 0 || 
        !student.tbl_RoomAllotments.some(allotment => allotment.is_active)
      );
      
      setStudents(unassignedStudents);
      console.log('Unassigned students:', unassignedStudents); // Debug log
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch students. Please try again.' 
      });
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      setRoomsLoading(true);
      const response = await wardenAPI.getAvailableRooms();
      console.log('Available rooms:', response.data.data); // Debug log

      // Fetch occupants for all rooms to get accurate counts
      const roomsWithOccupants = await Promise.all(
        response.data.data.map(async (room) => {
          try {
            const occupantsResponse = await wardenAPI.getRoomOccupants(room.id);
            const occupants = occupantsResponse.data.data || [];
            return {
              ...room,
              current_occupants: occupants.length,
              spacesLeft: (room.RoomType?.capacity || 0) - occupants.length,
              occupants // Store occupants for later use if needed
            };
          } catch (error) {
            console.error(`Error fetching occupants for room ${room.id}:`, error);
            return {
              ...room,
              current_occupants: 0,
              spacesLeft: room.RoomType?.capacity || 0,
              occupants: []
            };
          }
        })
      );

      setAvailableRooms(roomsWithOccupants);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch available rooms. Please try again.' 
      });
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchRoomOccupants = async (roomId) => {
    try {
      setOccupantsLoading(true);
      const response = await wardenAPI.getRoomOccupants(roomId);
      const occupants = response.data.data || [];
      setSelectedRoomOccupants(occupants);

      // Update the availableRooms with accurate current_occupants and spacesLeft for the selected room
      setAvailableRooms(prevRooms => 
        prevRooms.map(r => 
          r.id === parseInt(roomId) 
            ? {
                ...r,
                current_occupants: occupants.length,
                spacesLeft: (r.RoomType?.capacity || 0) - occupants.length,
                occupants
              }
            : r
        )
      );
    } catch (error) {
      console.error('Error fetching room occupants:', error);
      setSelectedRoomOccupants([]);
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch room occupants.' 
      });
    } finally {
      setOccupantsLoading(false);
    }
  };

  const handleRoomSelect = async (room) => {
    setSelectedRoom(room.id);
    setSelectedStudents([]);
    setShowBulkSelection(true);
    setSelectedRoomOccupants(room.occupants || []);
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = students.filter(student =>
    student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.roll_number && student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoom) {
      setMessage({ type: 'error', text: 'Please select a room first.' });
      return;
    }
    if (selectedStudents.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one student.' });
      return;
    }

    // Check if room has enough space
    const selectedRoomObj = availableRooms.find(r => r.id === parseInt(selectedRoom));
    if (selectedStudents.length > selectedRoomObj.spacesLeft) {
      setMessage({ type: 'error', text: `Selected room only has ${selectedRoomObj.spacesLeft} spaces left.` });
      return;
    }

    setShowConfirmation(true);
  };

  const confirmAllotment = async () => {
    setLoading(true);
    setShowConfirmation(false);
    setMessage({ type: '', text: '' });

    try {
      // Allot each selected student to the room
      for (const studentId of selectedStudents) {
        await wardenAPI.allotRoom({
          student_id: parseInt(studentId),
          room_id: parseInt(selectedRoom)
        });
      }
      
      setMessage({ 
        type: 'success', 
        text: `${selectedStudents.length} students allotted successfully to the room!` 
      });
      setSelectedRoom('');
      setSelectedStudents([]);
      setSelectedRoomOccupants([]);
      setShowBulkSelection(false);
      setSearchTerm('');
      
      // Refresh both lists
      fetchStudents();
      fetchAvailableRooms();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to allot students' 
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRoomObj = availableRooms.find(r => r.id === parseInt(selectedRoom));
  const selectedStudentObjs = selectedStudents.map(id => students.find(s => s.id === id)).filter(Boolean);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Room Allotment</h1>
        <p className="text-gray-600 mt-2">Assign rooms to students (single or bulk)</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} className="mr-2" />
          ) : (
            <AlertCircle size={20} className="mr-2" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Room Allotment</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Room *
              </label>
              <div className="relative">
                <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={selectedRoom}
                  onChange={(e) => {
                    const roomId = e.target.value;
                    setSelectedRoom(roomId);
                    setSelectedStudents([]);
                    if (roomId) {
                      const roomObj = availableRooms.find(r => r.id === parseInt(roomId));
                      if (roomObj && roomObj.spacesLeft > 0) {
                        setShowBulkSelection(true);
                        setSelectedRoomOccupants(roomObj.occupants || []);
                      } else {
                        setShowBulkSelection(false);
                      }
                    } else {
                      setShowBulkSelection(false);
                      setSelectedRoomOccupants([]);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={roomsLoading}
                >
                  <option value="">
                    {roomsLoading ? 'Loading rooms...' : 'Choose a room'}
                  </option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id} disabled={room.spacesLeft <= 0}>
                      Room {room.room_number} - {room.RoomType?.name} (Floor {room.floor}) - {room.current_occupants}/{room.RoomType?.capacity || 0} occupied ({room.spacesLeft} left)
                    </option>
                  ))}
                </select>
                {roomsLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {availableRooms.length === 0 && !roomsLoading && (
                <p className="mt-1 text-sm text-red-600">
                  No available rooms found. All rooms may be occupied.
                </p>
              )}
              {selectedRoom && selectedRoomObj && (
                <p className="mt-1 text-sm text-gray-600">
                  Spaces left: {selectedRoomObj.spacesLeft} | Select up to {selectedRoomObj.spacesLeft} students
                </p>
              )}
            </div>

            {/* Bulk Student Selection */}
            {showBulkSelection && selectedRoom && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Students ({selectedStudents.length} / {selectedRoomObj?.spacesLeft})
                  </label>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 bg-gray-50">
                  {studentsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                      Loading students...
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.slice(0, selectedRoomObj?.spacesLeft * 2).map(student => ( // Limit display for performance
                      <div key={student.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={selectedStudents.length >= selectedRoomObj?.spacesLeft && !selectedStudents.includes(student.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{student.username}</div>
                          <div className="text-sm text-gray-500">Roll: {student.roll_number || 'N/A'}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchTerm ? 'No students found matching your search.' : 'No unassigned students available'}
                    </p>
                  )}
                </div>
                {selectedStudents.length > 0 && (
                  <div className="mt-2 text-sm text-blue-600">
                    Selected: {selectedStudentObjs.map(s => `${s.username} (${s.roll_number || 'N/A'})`).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Selected Room Occupants Preview */}
            {selectedRoom && selectedRoomOccupants.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  Current Occupants ({selectedRoomOccupants.length}/{selectedRoomObj?.RoomType?.capacity || 0})
                </h4>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {selectedRoomOccupants.map(occupant => (
                    <div key={occupant.id} className="text-sm text-gray-600 flex items-center">
                      <User className="mr-2 h-3 w-3" />
                      {occupant.username} ({occupant.roll_number || 'N/A'})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedRoom || selectedStudents.length === 0 || studentsLoading || roomsLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Allotting...' : `Allot ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
            </button>

            {(studentsLoading || roomsLoading) && (
              <div className="text-center text-sm text-gray-500">
                Loading data...
              </div>
            )}
          </form>
        </div>

        <div className="space-y-6">
          {/* Available Rooms Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="mr-2" size={20} />
              Available Rooms ({availableRooms.filter(r => r.spacesLeft > 0).length})
            </h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableRooms.length > 0 ? (
                availableRooms.map(room => (
                  room.spacesLeft > 0 && (
                    <div 
                      key={room.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRoom === room.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleRoomSelect(room)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">
                            Room {room.room_number}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center">
                            {room.RoomType?.name} • Floor {room.floor}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {room.current_occupants}/{room.RoomType?.capacity || 0}
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            {room.spacesLeft} spaces left
                          </div>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                        Select for Bulk Allotment <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </div>
                  )
                ))
              ) : (
                <div className="text-center py-8">
                  <Bed className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No available rooms</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All rooms are currently occupied.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Unassigned Students Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="mr-2" size={20} />
              Unassigned Students ({students.length})
            </h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : students.length > 0 ? (
                students.map(student => (
                  <div key={student.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {student.username}
                        </div>
                        <div className="text-sm text-gray-600">
                          Roll: {student.roll_number || 'N/A'}
                        </div>
                        {student.tbl_Enrollments && student.tbl_Enrollments[0] && (
                          <div className="text-xs text-gray-500">
                            Enrolled: {new Date(student.tbl_Enrollments[0].enrollment_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        No Room
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No unassigned students</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All students have been assigned rooms.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Bulk Room Allotment</h3>
              
              {selectedRoomObj && (
                <>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Bed className="h-8 w-8 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">Room {selectedRoomObj.room_number}</p>
                        <p className="text-sm text-gray-500">
                          {selectedRoomObj.RoomType?.name} • Floor {selectedRoomObj.floor} • {selectedRoomObj.spacesLeft} spaces left
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Students to Allot ({selectedStudents.length}):</h4>
                      <div className="space-y-1">
                        {selectedStudentObjs.map(student => (
                          <div key={student.id} className="text-sm text-gray-700 flex items-center">
                            <User className="mr-2 h-3 w-3" />
                            {student.username} (Roll: {student.roll_number || 'N/A'})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedRoomOccupants.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Current Room Mates:</h4>
                      <div className="space-y-1 max-h-24 overflow-y-auto bg-gray-50 p-2 rounded">
                        {selectedRoomOccupants.map(occupant => (
                          <div key={occupant.id} className="text-sm text-gray-600 flex items-center">
                            <User className="mr-2 h-3 w-3" />
                            {occupant.username} (Roll: {occupant.roll_number || 'N/A'})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={confirmAllotment}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Allotting...' : `Confirm Allotment (${selectedStudents.length} students)`}
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
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

export default RoomAllotment;