import React, { useState, useEffect } from 'react';
import { User, Home, Mail, Lock, Eye, EyeOff, Key, Users, Edit3, Save, X, AlertCircle, CheckCircle, UserIcon, Bed } from 'lucide-react';
import axios from 'axios';
import { studentAPI, authAPI } from '../../services/api';

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [roomMates, setRoomMates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  
  // Token from localStorage
  const token = localStorage.getItem('token');
  // Try to get user data from localStorage that might have image info
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getProfile();
      
      // If we have a profile image in localStorage but not in the API response,
      // merge them to ensure we have the most complete profile data
      const profileData = response.data.data;
      
      console.log("API Profile Response:", profileData); // Debug log to see what's coming from the API
      
      if (!profileData.profile_picture && localUser.profile_picture) {
        profileData.profile_picture = localUser.profile_picture;
      }
      
      setProfile(profileData);
      
      // Fetch roommates if room is allotted
      if (profileData?.tbl_RoomAllotments?.length > 0 && profileData.tbl_RoomAllotments[0]?.HostelRoom?.id) {
        fetchRoomMates();
      } else {
        setRoomMates([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to fetch profile. Please try again.');
      setLoading(false);
    }
  };

  const fetchRoomMates = async () => {
    try {
      const response = await studentAPI.getRoommates();
      setRoomMates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching room mates:', error);
      setRoomMates([]);
      // Optionally show a non-critical error
      // setError('Failed to fetch roommates. Please refresh the page.');
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    try {
      // Use authAPI for password changes
      await authAPI.changePassword({
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => setChangePasswordVisible(false), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      
      // Provide helpful error messages
      let errorMessage;
      if (error.response?.status === 404) {
        errorMessage = 'Password change feature is currently unavailable. Please contact support.';
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = 'Current password is incorrect.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else {
        errorMessage = 'Failed to change password. Please try again later.';
      }
      
      setPasswordError(errorMessage);
    }
  };

  // Handle image loading errors
  const handleImageError = (id) => {
    setImageErrors(prev => ({
      ...prev,
      [id]: true
    }));
  };

  // Alternative implementation: Skip form submission and show admin contact info
  const handlePasswordChangeRequest = () => {
    setPasswordSuccess('');
    setPasswordError('');
    setPasswordSuccess('To change your password, please contact the hostel administrator.');
  };

  const handleForgotPassword = () => {
    window.location.href = '/forgot-password';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  // Get room info safely with proper fallbacks
  const roomAllotment = profile.tbl_RoomAllotments && profile.tbl_RoomAllotments.length > 0 
    ? profile.tbl_RoomAllotments[0] 
    : null;
    
  const roomInfo = roomAllotment?.HostelRoom || null;
  
  // Handle both potential field names for RoomType (RoomType or tbl_RoomType)
  const roomType = roomInfo?.RoomType || roomInfo?.tbl_RoomType;
  
  // Get hostel info
  const hostel = profile.Hostel;

  console.log("Room Info:", roomInfo);  // Debug log
  console.log("Room Type:", roomType);  // Debug log

  // Function to render avatar that falls back to initials
  const renderAvatar = (user, size = "w-24 h-24") => {
    if (user.profile_picture && !imageErrors[user.id]) {
      return (
        <img
          src={user.profile_picture}
          alt={user.username || "User"}
          className={`${size} rounded-full object-cover border-2 border-gray-200`}
          onError={() => handleImageError(user.id)}
        />
      );
    } else {
      // If no image or image error, show initials in an avatar
      const initials = user.username ? user.username.charAt(0).toUpperCase() : "?";
      return (
        <div className={`${size} rounded-full flex items-center justify-center bg-blue-500 text-white font-bold text-xl`}>
          {initials}
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your personal information and hostel details.</p>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
          <AlertCircle className="mr-2" size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
          <CheckCircle className="mr-2" size={20} />
          {success}
        </div>
      )}

      {/* Profile Header with Icon */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="mr-2" size={24} />
            Profile Overview
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {renderAvatar(profile)}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900">{profile.username}</h3>
              <p className="text-gray-600">{profile.email}</p>
              <p className="text-sm text-gray-500 mt-1">Role: Student | Hostel: {hostel?.name || 'N/A'}</p>
              {profile.roll_number && (
                <p className="text-sm text-gray-500">Roll Number: {profile.roll_number}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information - Read Only */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="mr-2" size={24} />
            Personal Information
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <UserIcon className="mr-2" size={16} />
                Username
              </label>
              <p className="text-lg text-gray-900 bg-gray-50 p-3 rounded-md">{profile.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Mail className="mr-2" size={16} />
                Email
              </label>
              <p className="text-lg text-gray-900 bg-gray-50 p-3 rounded-md">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Lock className="mr-2" size={24} />
            Password Management
          </h2>
        </div>
        <div className="p-6">
          {!changePasswordVisible ? (
            <button
              onClick={() => setChangePasswordVisible(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <Key className="mr-2" size={16} />
              Manage Password
            </button>
          ) : (
            <div className="space-y-4">
              {/* Option A: Regular password change form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      name="confirmNewPassword"
                      value={passwordData.confirmNewPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                {/* Option B: Alternative approach (contact admin) */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> If you're having trouble changing your password through this form, 
                    please contact your hostel administrator for assistance.
                  </p>
                  <button
                    type="button"
                    onClick={handlePasswordChangeRequest}
                    className="mt-2 text-blue-600 underline text-sm"
                  >
                    Request password change assistance
                  </button>
                </div>
                
                {passwordError && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
                    <AlertCircle className="mr-2" size={16} />
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
                    <CheckCircle className="mr-2" size={16} />
                    {passwordSuccess}
                  </div>
                )}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Save className="mr-2" size={16} />
                    Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePasswordVisible(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors flex items-center"
                  >
                    <X className="mr-2" size={16} />
                    Cancel
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center"
                  >
                    <Key className="mr-1" size={14} />
                    Forgot Password?
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Hostel & Room Details */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Home className="mr-2" size={24} />
            Hostel & Room Details
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hostel Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Home className="mr-2" size={16} />
                Hostel
              </label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-lg text-gray-900 font-medium">{hostel?.name || 'Not Assigned'}</p>
                {hostel?.address && (
                  <p className="text-sm text-gray-500 mt-1">{hostel.address}</p>
                )}
                {hostel?.contact_number && (
                  <p className="text-sm text-gray-500 mt-1">Contact: {hostel.contact_number}</p>
                )}
              </div>
            </div>

            {/* Room Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Bed className="mr-2" size={16} />
                Room Information
              </label>
              
              {roomInfo ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg text-gray-900 font-medium">Room: {roomInfo.room_number || 'N/A'}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Type: {roomType?.name || 'Standard'}
                    {roomType?.capacity && ` (${roomType.capacity} capacity)`}
                  </p>
                  {roomAllotment?.allotment_date && (
                    <p className="text-sm text-gray-500 mt-1">
                      Allotted on: {new Date(roomAllotment.allotment_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500">No room currently assigned.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Room Mates Section */}
      {roomInfo ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="mr-2" size={24} />
              Room Mates in Room {roomInfo.room_number || 'N/A'} ({roomMates.length})
            </h2>
          </div>
          <div className="p-6">
            {roomMates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roomMates.map((mate) => (
                  <div 
                    key={mate.id} 
                    className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start space-x-4">
                      {renderAvatar(mate, "w-14 h-14")}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-lg truncate">{mate.username}</h4>
                        {mate.roll_number && (
                          <p className="text-sm text-blue-600 font-medium mt-1">{mate.roll_number}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">{mate.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Room Mates Yet</h3>
                <p className="text-gray-500">You are the only occupant in Room {roomInfo.room_number || 'N/A'}.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudentProfile;