import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { User, Bed, Receipt, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import moment from 'moment';

const StudentDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchAttendance();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await studentAPI.getProfile();
      setProfile(response.data.data || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const date = moment().format('YYYY-MM-DD');
      const response = await studentAPI.getMyAttendance({ date });
      const records = response.data.data || [];
      setAttendance(records.length > 0 ? records[0] : null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'P':
        return { icon: <CheckCircle className="text-green-600" size={48} />, text: 'Present', color: 'bg-green-50 border-green-200 text-green-800' };
      case 'A':
        return { icon: <XCircle className="text-red-600" size={48} />, text: 'Absent', color: 'bg-red-50 border-red-200 text-red-800' };
      case 'OD':
        return { icon: <Clock className="text-blue-600" size={48} />, text: 'On Duty', color: 'bg-blue-50 border-blue-200 text-blue-800' };
      default:
        return { icon: null, text: 'Not Marked', color: 'bg-gray-50 border-gray-200 text-gray-500' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusInfo = attendance ? getStatusDisplay(attendance.status) : getStatusDisplay(null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {profile?.username}!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <User className="text-blue-600 mr-3" size={20} />
                <div>
                  <div className="font-medium text-gray-900">Username</div>
                  <div className="text-gray-600">{profile?.username}</div>
                </div>
              </div>

              {profile?.tbl_RoomAllotments && profile.tbl_RoomAllotments[0] && (
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <Bed className="text-green-600 mr-3" size={20} />
                  <div>
                    <div className="font-medium text-gray-900">Room Allotment</div>
                    <div className="text-gray-600">
                      Room {profile.tbl_RoomAllotments[0].tbl_HostelRoom?.room_number} - 
                      {profile.tbl_RoomAllotments[0].tbl_HostelRoom?.tbl_RoomType?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Allotted on: {new Date(profile.tbl_RoomAllotments[0].allotment_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Attendance Status</h2>
            {attendanceLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className={`flex flex-col items-center p-6 border rounded-lg ${statusInfo.color}`}>
                {statusInfo.icon}
                <h3 className="mt-2 mb-1 font-semibold">{statusInfo.text}</h3>
                {attendance && (
                  <p className="text-sm text-gray-600 mb-2">
                    Reason: {attendance.reason || 'N/A'}
                    {attendance.remarks && ` - ${attendance.remarks}`}
                  </p>
                )}
                {attendance && attendance.status === 'OD' && (
                  <p className="text-sm text-gray-600">
                    From: {moment(attendance.from_date).format('DD MMM')} to {moment(attendance.to_date).format('DD MMM')}
                  </p>
                )}
                {!attendance && <p className="text-sm text-gray-500">No attendance record for today</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
                <Receipt className="text-blue-600 mb-2" size={24} />
                <div className="font-medium text-blue-900">View Mess Bills</div>
                <div className="text-sm text-blue-700">Check your pending bills</div>
              </button>
              
              <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
                <Calendar className="text-green-600 mb-2" size={24} />
                <div className="font-medium text-green-900">Apply for Leave</div>
                <div className="text-sm text-green-700">Submit leave application</div>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Hostel Info</h2>
            {profile?.Hostel && (
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-gray-900">{profile.Hostel.name}</div>
                  {profile.Hostel.address && (
                    <div className="text-sm text-gray-600">{profile.Hostel.address}</div>
                  )}
                </div>
                {profile.Hostel.contact_number && (
                  <div className="text-sm text-gray-600">
                    Contact: {profile.Hostel.contact_number}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notices</h2>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="text-sm font-medium text-yellow-800">
                  Mess Bill Due
                </div>
                <div className="text-sm text-yellow-700">
                  Your monthly mess bill is due on 10th of this month.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;