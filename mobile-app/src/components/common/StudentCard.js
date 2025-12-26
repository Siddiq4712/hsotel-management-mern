import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { User, Bed } from 'lucide-react-native';

const StudentCard = ({ student, onPress, selected }) => {
  const roomInfo = student.tbl_RoomAllotments?.[0]?.HostelRoom;
  return (
    <TouchableOpacity onPress={onPress} className={`p-4 rounded-xl mb-2 border ${selected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
      <View className="flex-row items-center">
        <View className="bg-blue-100 p-2 rounded-full mr-3">
          <User size={16} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-900">{student.username}</Text>
          <Text className="text-gray-500 text-xs">Roll: {student.roll_number}</Text>
        </View>
        {roomInfo ? (
          <View className="ml-2">
            <Bed size={16} color="#10B981" />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default StudentCard;