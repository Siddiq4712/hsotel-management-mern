import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Bed, User, CheckCircle, AlertCircle, Users, Home } from 'lucide-react';

const RoomAllotment = () => {
  const [students, setStudents] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

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
      setAvailableRooms(response.data.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await wardenAPI.allotRoom({
        student_id: parseInt(selectedStudent),
        room_id: parseInt(selectedRoom)
      });
      
      setMessage({ type: 'success', text: 'Room allotted successfully!' });
      setSelectedStudent('');
      setSelectedRoom('');
      
      // Refresh both lists
      fetchStudents();
      fetchAvailableRooms();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to allot room' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Room Allotment</h1>
        <p className="text-gray-600 mt-2">Assign rooms to students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Allot Room</h2>
          
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={studentsLoading}
                >
                  <option value="">
                    {studentsLoading ? 'Loading students...' : 'Choose a student'}
                  </option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.username} (ID: {student.id})
                    </option>
                  ))}
                </select>
                {studentsLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {students.length === 0 && !studentsLoading && (
                <p className="mt-1 text-sm text-orange-600">
                  No unassigned students found. All students may already have rooms assigned.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Room *
              </label>
              <div className="relative">
                <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={roomsLoading}
                >
                  <option value="">
                    {roomsLoading ? 'Loading rooms...' : 'Choose a room'}
                  </option>
                  {availableRooms.map(room => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} - {room.RoomType?.name} (Floor {room.floor})
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
            </div>

            <button
              type="submit"
              disabled={loading || !selectedStudent || !selectedRoom || studentsLoading || roomsLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Allotting...' : 'Allot Room'}
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
              Available Rooms ({availableRooms.length})
            </h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableRooms.length > 0 ? (
                availableRooms.map(room => (
                  <div key={room.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          Room {room.room_number}
                        </div>
                        <div className="text-sm text-gray-600">
                        {room.RoomType?.name} • Floor {room.floor}
                      </div>
                      <div className="text-xs text-gray-500">
                        Capacity: {room.RoomType?.capacity}
                      </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Available
                      </span>
                    </div>
                  </div>
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
                          Student ID: {student.id}
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
    </div>
  );
};

export default RoomAllotment;
