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
          style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' }}
        />
      );
    }
    return (
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
          {user?.username?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ 
      backgroundColor: 'white', 
      borderBottomWidth: 1, 
      borderBottomColor: '#f1f5f9',
      paddingTop: insets.top, // This handles the notch/camera area
      paddingHorizontal: 12,
      paddingBottom: 8,
    }}>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Left Side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>HMS</Text>
          <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#1d4ed8' }}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Right Side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }} numberOfLines={1}>
              {user?.username}
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
            style={{ padding: 6, backgroundColor: '#fee2e2', borderRadius: 8 }}
          >
            <LogOut size={14} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Header;