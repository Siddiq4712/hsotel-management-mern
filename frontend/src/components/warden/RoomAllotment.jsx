import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { 
  Bed, User, CheckCircle, AlertCircle, Users, Home, Eye, X, 
  ChevronRight, Search, Loader2, Building, Users2, MapPin
} from 'lucide-react';

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
      
      const unassignedStudents = response.data.data.filter(student => 
        !student.tbl_RoomAllotments || 
        student.tbl_RoomAllotments.length === 0 || 
        !student.tbl_RoomAllotments.some(allotment => allotment.is_active)
      );
      
      setStudents(unassignedStudents);
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

      const roomsWithOccupants = await Promise.all(
        response.data.data.map(async (room) => {
          try {
            const occupantsResponse = await wardenAPI.getRoomOccupants(room.id);
            const occupants = occupantsResponse.data.data || [];
            return {
              ...room,
              current_occupants: occupants.length,
              spacesLeft: (room.RoomType?.capacity || 0) - occupants.length,
              occupants
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
      for (const studentId of selectedStudents) {
        await wardenAPI.allotRoom({
          student_id: parseInt(studentId),
          room_id: parseInt(selectedRoom)
        });
      }
      
      setMessage({ 
        type: 'success', 
        text: `✅ ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} allotted successfully!` 
      });
      setSelectedRoom('');
      setSelectedStudents([]);
      setSelectedRoomOccupants([]);
      setShowBulkSelection(false);
      setSearchTerm('');
      
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
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Room Allotment</h1>
        <p className="text-gray-600 mt-2">Efficiently assign rooms to multiple students at once</p>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 animate-in fade-in ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          ) : (
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          )}
          <div className="flex-1">
            <h3 className={`font-semibold ${message.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
              {message.type === 'success' ? 'Success' : 'Error'}
            </h3>
            <p className={`text-sm mt-1 ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Allotment Form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <Building className="text-blue-600" size={24} />
            </div>
            Bulk Room Assignment
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select a Room <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Bed className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
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
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                  required
                  disabled={roomsLoading}
                >
                  <option value="">
                    {roomsLoading ? 'Loading rooms...' : 'Choose a room'}
                  </option>
                  {availableRooms.map(room => (
                    <option 
                      key={room.id} 
                      value={room.id} 
                      disabled={room.spacesLeft <= 0}
                    >
                      Room {room.room_number} - {room.RoomType?.name} (Floor {room.floor}) - {room.spacesLeft} spaces
                    </option>
                  ))}
                </select>
              </div>

              {selectedRoom && selectedRoomObj && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Capacity</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {selectedRoomObj.current_occupants} / {selectedRoomObj.RoomType?.capacity || 0} occupied
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 font-medium">Available Spaces</p>
                      <p className="text-lg font-bold text-green-600 mt-1">{selectedRoomObj.spacesLeft}</p>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-300 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(selectedRoomObj.current_occupants / selectedRoomObj.RoomType?.capacity) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Student Selection */}
            {showBulkSelection && selectedRoom && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Select Students 
                      <span className="text-blue-600 font-bold ml-2">
                        ({selectedStudents.length} / {selectedRoomObj?.spacesLeft})
                      </span>
                    </label>
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search by name or roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    />
                  </div>

                  {/* Students List */}
                  <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
                    {studentsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                          <p className="text-gray-600 font-medium">Loading students...</p>
                        </div>
                      </div>
                    ) : filteredStudents.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {filteredStudents.slice(0, selectedRoomObj?.spacesLeft * 2).map(student => (
                          <div 
                            key={student.id} 
                            className="p-4 hover:bg-white transition-colors cursor-pointer flex items-center"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              disabled={selectedStudents.length >= selectedRoomObj?.spacesLeft && !selectedStudents.includes(student.id)}
                            />
                            <div className="ml-4 flex-1">
                              <p className="font-semibold text-gray-900">{student.username}</p>
                              <p className="text-sm text-gray-600 mt-1">Roll: {student.roll_number || 'N/A'}</p>
                            </div>
                            {selectedStudents.includes(student.id) && (
                              <div className="ml-2 w-2 h-2 rounded-full bg-blue-600"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 font-medium">
                            {searchTerm ? 'No students found' : 'No unassigned students'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Students Preview */}
                {selectedStudents.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-3">Selected Students:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudentObjs.map(s => (
                        <div key={s.id} className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full flex items-center">
                          {s.username}
                          <button
                            type="button"
                            onClick={() => toggleStudentSelection(s.id)}
                            className="ml-2 hover:text-blue-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Occupants Preview */}
            {selectedRoom && selectedRoomOccupants.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Eye className="mr-2 h-5 w-5 text-gray-600" />
                  Current Roommates ({selectedRoomOccupants.length}/{selectedRoomObj?.RoomType?.capacity || 0})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedRoomOccupants.map(occupant => (
                    <div key={occupant.id} className="flex items-center text-sm text-gray-700 bg-white p-2 rounded">
                      <User className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="font-medium">{occupant.username}</span>
                      <span className="text-gray-500 ml-2">({occupant.roll_number || 'N/A'})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedRoom || selectedStudents.length === 0 || studentsLoading || roomsLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center space-x-2 group"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Allotting Students...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Allot {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''} to Room {selectedRoom ? availableRooms.find(r => r.id === parseInt(selectedRoom))?.room_number : ''}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Available Rooms */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Home className="text-green-600" size={20} />
              </div>
              Available Rooms
              <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {availableRooms.filter(r => r.spacesLeft > 0).length}
              </span>
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                </div>
              ) : availableRooms.filter(r => r.spacesLeft > 0).length > 0 ? (
                availableRooms.filter(r => r.spacesLeft > 0).map(room => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedRoom === room.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900">Room {room.room_number}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {room.RoomType?.name} • Floor {room.floor}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium">Occupancy</div>
                        <div className="text-sm font-bold text-gray-900 mt-1">
                          {room.current_occupants}/{room.RoomType?.capacity}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="w-full bg-gray-300 rounded-full h-1.5 mr-3">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(room.current_occupants / room.RoomType?.capacity) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-green-600 whitespace-nowrap">
                        {room.spacesLeft} left
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bed className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-600 font-medium">No available rooms</p>
                  <p className="text-sm text-gray-500 mt-1">All rooms are full</p>
                </div>
              )}
            </div>
          </div>

          {/* Unassigned Students Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="bg-orange-100 p-2 rounded-lg mr-3">
                <Users2 className="text-orange-600" size={20} />
              </div>
              Waiting for Room
              <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {students.length}
              </span>
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                </div>
              ) : students.length > 0 ? (
                students.map(student => (
                  <div 
                    key={student.id} 
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-1.5 rounded-full mr-3">
                        <User className="text-orange-600" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {student.username}
                        </p>
                        <p className="text-xs text-gray-600">
                          Roll: {student.roll_number || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-400 mb-2" />
                  <p className="text-gray-600 font-medium">All students assigned!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Confirm Allotment</h3>
                </div>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              
              {selectedRoomObj && (
                <div className="space-y-6">
                  {/* Room Info */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold uppercase mb-2">Room Details</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          Room {selectedRoomObj.room_number}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedRoomObj.RoomType?.name} • Floor {selectedRoomObj.floor}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Spaces Left</p>
                        <p className="text-2xl font-bold text-green-600">{selectedRoomObj.spacesLeft}</p>
                      </div>
                    </div>
                  </div>

                  {/* Students to Allot */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Students to be Allotted ({selectedStudents.length})
                    </p>
                    <div className="space-y-2 bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto border border-gray-200">
                      {selectedStudentObjs.map(student => (
                        <div key={student.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                          <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <User className="text-blue-600" size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{student.username}</p>
                            <p className="text-xs text-gray-600">Roll: {student.roll_number || 'N/A'}</p>
                          </div>
                          <CheckCircle className="text-blue-600" size={18} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Current Roommates */}
                  {selectedRoomOccupants.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Current Roommates ({selectedRoomOccupants.length})
                      </p>
                      <div className="space-y-2 bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto border border-gray-200">
                        {selectedRoomOccupants.map(occupant => (
                          <div key={occupant.id} className="flex items-center text-sm text-gray-700 bg-white p-2 rounded">
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="font-medium">{occupant.username}</span>
                            <span className="text-gray-500 ml-auto">({occupant.roll_number || 'N/A'})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmAllotment}
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          <span>Confirm Allotment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAllotment;
