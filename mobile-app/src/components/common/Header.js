import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react-native';

const Header = () => {
  const { user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: logout },
      ]
    );
  };

  const renderAvatar = () => {
    if (user?.profile_picture && !imageError) {
      return (
        <Image
          source={{ uri: user.profile_picture }}
          onError={() => setImageError(true)}
          className="w-7 h-7 rounded-full border border-gray-300"
        />
      );
    }

    const initials = user?.username?.[0]?.toUpperCase() || '?';
    return (
      <View className="w-7 h-7 rounded-full bg-blue-500 items-center justify-center">
        <Text className="text-white text-xs font-bold">{initials}</Text>
      </View>
    );
  };

  return (
    <View className="bg-white border-b border-gray-200 h-12 flex-row items-center px-3 justify-between">
      
      {/* Left */}
      <View className="flex-row items-center space-x-2">
        <Text className="text-base font-semibold text-gray-800">HMS</Text>
        <Text className="text-[10px] bg-blue-100 text-blue-800 px-2 py-[2px] rounded-full">
          {user?.role?.toUpperCase()}
        </Text>
      </View>

      {/* Right */}
      <View className="flex-row items-center space-x-2 max-w-[70%]">
        {renderAvatar()}

        <View className="max-w-[55%]">
          <Text className="text-sm text-gray-700" numberOfLines={1}>
            {user?.username}
          </Text>
          {user?.hostel && (
            <Text className="text-[10px] text-gray-500" numberOfLines={1}>
              @{user.hostel.name}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="p-2 bg-red-600 rounded-md"
        >
          <LogOut size={14} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;
