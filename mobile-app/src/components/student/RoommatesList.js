import React from 'react';
import { View, Text, Image } from 'react-native';
import { User } from 'lucide-react-native';

const getInitials = (name) => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const RoommatesList = ({ roommates, currentUserId }) => {
  if (!roommates || roommates.length === 0) {
    return (
      <View className="p-3 bg-gray-50 rounded-md">
        <Text className="text-gray-500 text-sm">No roommates found or you have a single occupancy room.</Text>
      </View>
    );
  }

  return (
    <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {roommates.map((mate) => {
        // Filter out the current user if present
        if (mate.id === currentUserId) return null;

        return (
          <View key={mate.id} className="flex-row items-center p-3 bg-blue-50 rounded-lg">
            {mate.profileImage ? (
              <Image
                source={{ uri: mate.profileImage }}
                alt={mate.userName}
                className="w-8 h-8 rounded-full mr-3 object-cover border border-blue-200"
                onError={() => console.log("Image load error for", mate.userName)} // Simple error handling for now
              />
            ) : (
              <View className="w-8 h-8 rounded-full mr-3 bg-blue-500 text-white font-bold flex items-center justify-center">
                <Text className="text-white text-sm font-bold">{getInitials(mate.userName)}</Text>
              </View>
            )}
            <View>
              <Text className="font-medium text-gray-900">{mate.userName}</Text>
              <Text className="text-xs text-gray-500">{mate.email || 'No email'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default RoommatesList;
