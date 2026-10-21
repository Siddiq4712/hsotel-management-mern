import { Text } from "../../components/common/ReferenceDesign";
import Screen from '../../components/common/Screen';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { studentAPI } from '../../api/api';
import { User, Mail, Building, BookOpen, Phone, MapPin, Edit, Save, Bed } from 'lucide-react-native';
import Header from '../../components/student/StudentHeader';

const StudentProfileScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editableProfile, setEditableProfile] = useState({});
  const [imageError, setImageError] = useState(false);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await studentAPI.getProfile();
        setProfile(response.data.data);
        setEditableProfile(response.data.data); // Initialize editable fields
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', error.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const updateData = {
        username: editableProfile.username,
        email: editableProfile.email,
        // Add other editable fields here
      };
      const response = await studentAPI.updateProfile(updateData); // Assuming an updateProfile API exists
      if (response.data.success) {
        setProfile(response.data.data);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-lg text-gray-700">Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg text-gray-700">Profile not found.</Text>
      </View>
    );
  }

  const roomInfo = profile?.tbl_RoomAllotments?.[0]?.HostelRoom;
  const roomType = roomInfo?.RoomType || roomInfo?.tbl_RoomType;

  return (
    <Screen className="flex-1 bg-background">
      <Header title="My profile" back />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" className="p-4">
        <Text className="text-2xl font-bold text-indigo-900 mb-2">My Profile</Text>
        <Text className="text-gray-600 mb-6">Manage your personal and hostel details</Text>

        <Card className="bg-white rounded-2xl shadow-sm p-6 mb-6 items-center">
          {profile.profile_picture && !imageError ? (
            <Image
              source={{ uri: profile.profile_picture }}
              className="w-24 h-24 rounded-full border-4 border-blue-200 mb-4"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center mb-4">
              <Text className="text-white text-4xl font-bold">{getInitials(profile.username)}</Text>
            </View>
          )}
          <Text className="text-2xl font-bold text-indigo-900">{profile.username}</Text>
          <Text className="text-base text-gray-600 mt-1">{profile.email}</Text>
          <Text className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full mt-2">
            {profile.role?.toUpperCase()}
          </Text>
        </Card>

        <Card className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-semibold text-gray-900">Personal Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)} className="p-2 rounded-full bg-blue-50">
              <Edit size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View className="gap-3">
            <View className="flex-row items-center">
              <User size={20} color={colors.mutedText} className="mr-3" />
              <Text className="text-gray-700 text-base">Username: {profile.username}</Text>
            </View>
            <View className="flex-row items-center">
              <Mail size={20} color={colors.mutedText} className="mr-3" />
              <Text className="text-gray-700 text-base">Email: {profile.email}</Text>
            </View>
            {/* Add more profile fields as needed */}
          </View>
        </Card>

        {profile.Hostel && (
          <Card className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <Text className="text-xl font-semibold text-gray-900 mb-4">Hostel Information</Text>
            <View className="gap-3">
              <View className="flex-row items-center">
                <Building size={20} color={colors.mutedText} className="mr-3" />
                <Text className="text-gray-700 text-base">Hostel: {profile.Hostel.name}</Text>
              </View>
              {roomInfo && (
                <View className="flex-row items-center">
                  <Bed size={20} color={colors.mutedText} className="mr-3" />
                  <Text className="text-gray-700 text-base">Room: {roomInfo.room_number} ({roomType?.name})</Text>
                </View>
              )}
              <View className="flex-row items-center">
                <MapPin size={20} color={colors.mutedText} className="mr-3" />
                <Text className="text-gray-700 text-base">Address: {profile.Hostel.address}</Text>
              </View>
              <View className="flex-row items-center">
                <Phone size={20} color={colors.mutedText} className="mr-3" />
                <Text className="text-gray-700 text-base">Contact: {profile.Hostel.contact_number}</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
};

export default StudentProfileScreen;
