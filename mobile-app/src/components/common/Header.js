import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native'; // For programmatic navigation

const Header = () => {
  const { user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  const navigation = useNavigation();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { text: "Yes", onPress: async () => {
            await logout();
            // AuthNavigator will automatically show LoginScreen if user is null
          }
        }
      ]
    );
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const renderAvatar = () => {
    if (user?.profile_picture && !imageError) {
      return (
        <Image
          source={{ uri: user.profile_picture }}
          alt={user?.username || "User"}
          className="w-8 h-8 rounded-full object-cover border border-gray-300"
          onError={handleImageError}
        />
      );
    } else {
      const initials = user?.username ? user.username.charAt(0).toUpperCase() : "?";
      return (
        <View className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 text-white font-bold text-sm">
          <Text className="text-white text-sm font-bold">{initials}</Text>
        </View>
      );
    }
  };

  return (
    <View className="bg-white shadow-md border-b border-gray-200 h-16 flex-row items-center px-4 justify-between">
      {/* Left Section */}
      <View className="flex-row items-center space-x-2">
        <Text className="text-lg font-semibold text-gray-800">HMS</Text>
        <Text className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {user?.role?.toUpperCase()}
        </Text>
      </View>

      {/* Right Section */}
      <View className="flex-row items-center space-x-3">
        <View className="flex-row items-center space-x-2">
          {renderAvatar()}
          <Text className="text-gray-700">{user?.username}</Text>
          {user?.hostel && (
            <Text className="text-sm text-gray-500">
              @ {user.hostel.name}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <LogOut size={16} color="white" />
          <Text className="text-white">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;
