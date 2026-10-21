import { Text } from "./ReferenceDesign";
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react-native';
import colors from '../../theme/colors';
import Button from './Button';
import NotificationBell from './NotificationBell';
import ReferenceHeader from './ReferenceHeader';
import { useReferenceDesign, useEmbeddedHeader } from './ReferenceDesign';

const Header = () => {
  const { user, logout } = useAuth();
  const { enabled } = useReferenceDesign();
  const embedded = useEmbeddedHeader();
  const [imageError, setImageError] = useState(false);

  const initials = useMemo(() => {
    const name =
      user?.name ||
      user?.fullName ||
      user?.username ||
      user?.email ||
      '';
    return name
      .toString()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  }, [user]);

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

  if (embedded) return null;
  if (enabled) return <ReferenceHeader title="Hostel Management"
    subtitle={user?.hostel?.name || 'Your hostel workspace'}
    actions={<Button variant="ghost" onPress={handleLogout} accessibilityLabel="Log out" style={{ paddingHorizontal: 12 }}>
      <LogOut size={20} color={colors.mutedText} />
    </Button>} />;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="bg-white border-b border-gray-200">
      <View className="px-4 pt-3 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-3">
            <Image source={require('../../../assets/nec-logo.png')}
              style={{ width: 32, height: 40, marginRight: 10 }} resizeMode="contain"
              accessibilityLabel="National Engineering College logo" />
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text className="text-base font-bold text-indigo-900">Hostel Management</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <NotificationBell />
          <Button onPress={handleLogout} variant="ghost" accessibilityLabel="Log out"
            style={{ backgroundColor: colors.dangerSoft }}>
            <LogOut size={20} color={colors.danger} />
          </Button>
          </View>
        </View>
        <View className="flex-row items-center mt-4">
          {renderAvatar()}
          <View className="flex-1 mx-3">
            <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
              {user?.username || user?.userName || user?.name || user?.email}
            </Text>
            {user?.hostel && <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
              {user.hostel.name}
            </Text>}
          </View>
          <View className="bg-indigo-50 rounded-full px-3 py-2" style={{ maxWidth: '35%' }}>
            <Text className="text-xs font-semibold text-indigo-800" numberOfLines={1}>
              {String(user?.role?.roleName ?? user?.role ?? '').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Header;
