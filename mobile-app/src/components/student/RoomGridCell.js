import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { CheckCircle, XCircle, Home, Users } from 'lucide-react-native';

const RequestStatusBadge = ({ status }) => {
  if (!status) return null;
  let styleClasses = "";
  let text = `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  switch (status) {
    case "pending":
      styleClasses = "bg-amber-100 text-amber-700 border-amber-300";
      break;
    case "approved":
      styleClasses = "bg-green-100 text-green-700 border-green-300";
      break;
    case "rejected":
      styleClasses = "bg-red-100 text-red-700 border-red-300";
      break;
    case "cancelled":
      styleClasses = "bg-gray-100 text-gray-500 border-gray-300";
      break;
    default:
      styleClasses = "bg-gray-100 text-gray-500 border-gray-300";
  }

  return (
    <View className={`mt-2 rounded px-2 py-1 border text-xs font-medium self-center ${styleClasses}`}>
      <Text className={`text-xs font-medium ${styleClasses.split(' ').find(cls => cls.startsWith('text-'))}`}>{text}</Text>
    </View>
  );
};

const RoomGridCell = ({ roomData, currentRequestForRoom, onPress }) => {
  if (!roomData) {
    return (
      <View className="w-20 h-20 m-1 flex items-center justify-center">
        <Text className="text-gray-400 text-xs">Empty</Text>
      </View>
    );
  }

  const requestStatus = currentRequestForRoom(roomData.room_id)?.status;
  const isFull = roomData.remaining <= 0;
  const isInactive = roomData.inactive;

  let cellStyle = "border-blue-400 bg-blue-100 text-blue-900";
  if (isInactive) {
    cellStyle = "border-gray-400 bg-gray-200 text-gray-500";
  } else if (isFull) {
    cellStyle = "border-amber-400 bg-amber-50 text-amber-700";
  } else if (requestStatus) { // If there's any active request
    switch(requestStatus) {
      case 'pending': cellStyle = "border-yellow-400 bg-yellow-100 text-yellow-800"; break;
      case 'approved': cellStyle = "border-green-400 bg-green-100 text-green-800"; break;
      case 'rejected': cellStyle = "border-red-400 bg-red-100 text-red-800"; break;
      default: cellStyle = "border-blue-400 bg-blue-100 text-blue-900"; break; // Fallback
    }
  }


  return (
    <TouchableOpacity
      className={`relative flex flex-col items-center justify-center rounded border p-1 m-1 transition w-20 h-20 ${cellStyle}`}
      disabled={isInactive}
      onPress={() => onPress(roomData)}
    >
      <Text className="font-semibold leading-tight text-center text-sm">
        {roomData.name}
      </Text>
      <Text className="text-[10px] font-normal text-gray-700">{roomData.room_number}</Text>
      <View className="mt-1 flex-row items-center">
        <Users size={10} color={isFull ? "orange" : "blue"} />
        <Text className="text-[10px] ml-1">
          {roomData.occupancy}/{roomData.capacity}
        </Text>
      </View>
      {isFull && <Text className="mt-1 rounded bg-red-100 px-1 text-[8px] font-medium text-red-600">Full</Text>}
      <RequestStatusBadge status={requestStatus} />
    </TouchableOpacity>
  );
};

export default RoomGridCell;
