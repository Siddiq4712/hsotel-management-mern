import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Header = () => {
  const { user, logout } = useAuth();
  const [imageError, setImageError] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: logout },
    ]);
  };

  const renderAvatar = () => {
    if (user?.profile_picture && !imageError) {
      return (
        <Image
          source={{ uri: user.profile_picture }}
          onError={() => setImageError(true)}
          className="w-10 h-10 rounded-full border border-gray-300"
        />
      );
    }
    return (
      <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center">
        <Text className="text-white text-base font-bold">{initials}</Text>
      </View>
    );
  };

  return (
    <View className="bg-white border-b border-gray-200 h-16 flex-row items-center px-4 justify-between">
      
      {/* Left: App name + Role */}
      <View className="flex-row items-center space-x-3">
        <Text className="text-lg font-semibold text-gray-800">HMS</Text>
        <Text className="text-xs md:text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {user?.role?.toUpperCase()}
        </Text>
      </View>

      {/* Right: Avatar + Username + Hostel + Logout */}
      <View className="flex-row items-center space-x-3 max-w-[70%]">
        {renderAvatar()}

        <View className="max-w-[55%]">
          <Text className="text-base md:text-lg text-gray-700 font-medium" numberOfLines={1}>
            {user?.username}
          </Text>
          {user?.hostel && (
            <Text className="text-xs md:text-sm text-gray-500" numberOfLines={1}>
              @{user.hostel.name}
            </Text>
            {user?.hostel && (
              <Text style={{ fontSize: 9, color: '#64748b' }} numberOfLines={1}>
                @{user.hostel.name}
              </Text>
            )}
          </View>
          
          {renderAvatar()}

        <TouchableOpacity
          onPress={handleLogout}
          className="p-3 bg-red-600 rounded-md"
        >
          <LogOut size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;