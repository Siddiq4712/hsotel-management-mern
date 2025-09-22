import React, { useState, useEffect } from 'react';
import { wardenAPI } from '../../services/api';
import { Users, User, Calendar, Bed, AlertCircle } from 'lucide-react';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="text-gray-400 mr-2" size={20} />
              <h2 className="text-lg font-medium text-gray-900">Student List</h2>
              <span className="ml-2 text-sm text-gray-500">
                ({students.length} students)
              </span>
            </div>
            <button
              onClick={fetchStudents}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User className="text-blue-600" size={16} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            Student #{student.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.tbl_Enrollments && student.tbl_Enrollments[0] ? (
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-1" />
                          {new Date(student.tbl_Enrollments[0].enrollment_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">No enrollment record</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.tbl_RoomAllotments && student.tbl_RoomAllotments[0] ? (
                        <div className="flex items-center">
                          <Bed size={16} className="mr-1" />
                          Room {student.tbl_RoomAllotments[0].tbl_HostelRoom?.room_number}
                          {student.tbl_RoomAllotments[0].tbl_HostelRoom?.tbl_RoomType && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({student.tbl_RoomAllotments[0].tbl_HostelRoom.tbl_RoomType.name})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-orange-600">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        View
                      </button>
                      {!student.tbl_RoomAllotments || student.tbl_RoomAllotments.length === 0 ? (
                        <button className="text-green-600 hover:text-green-900">
                          Assign Room
                        </button>
                      ) : (
                        <button className="text-orange-600 hover:text-orange-900">
                          Change Room
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
};

export default ManageStudents;
