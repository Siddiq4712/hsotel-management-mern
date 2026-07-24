import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, User, Calendar, MapPin, ClipboardList, Clock } from 'lucide-react-native';
import moment from 'moment';

const getDurationDifference = (toDate, returnDate) => {
  if (!toDate || !returnDate) return null;
  const expected = moment(toDate);
  const actual = moment(returnDate);
  const diffMs = actual.diff(expected); // Positive if late, negative if early
  const isLate = diffMs > 0;
  const absDiff = Math.abs(diffMs);
  
  const duration = moment.duration(absDiff);
  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();
  
  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) return 'Right on time';
  
  return `${parts.join(' ')} ${isLate ? 'late' : 'early'}`;
};

const VerificationResultScreen = ({ route, navigation }) => {
  const { success, message, outpass } = route.params || {};

  const isSuccess = success;
  const isExit = message?.toLowerCase().includes('exit') || outpass?.status === 'outside';
  const isReturn = message?.toLowerCase().includes('return') || outpass?.status === 'completed' || outpass?.status === 'late_return';
  const isLateComer = isReturn && outpass?.to_date && moment(outpass.return_time || outpass.updatedAt).isAfter(moment(outpass.to_date));

  return (
    <View className="flex-1 bg-gray-50 p-6 justify-between">
      <View className="items-center mt-6">
        {/* Visual Indicator */}
        {isSuccess ? (
          <View className="items-center mb-6">
            <CheckCircle size={80} color="#10B981" />
            <Text className="text-emerald-600 font-extrabold text-2xl mt-4 text-center">
              {message || 'Verification Successful'}
            </Text>
          </View>
        ) : (
          <View className="items-center mb-6">
            <XCircle size={80} color="#EF4444" />
            <Text className="text-rose-600 font-extrabold text-2xl mt-4 text-center">
              {message || 'Verification Failed'}
            </Text>
          </View>
        )}

        {/* Late Comer Warning Banner */}
        {isLateComer && (
          <View className="bg-rose-100 border border-rose-200 px-6 py-3 rounded-2xl mb-6 items-center flex-row space-x-2 w-full justify-center">
            <AlertTriangle size={20} color="#EF4444" />
            <Text className="text-rose-700 font-extrabold text-lg uppercase tracking-wider">Late Comer</Text>
          </View>
        )}

        {/* Student Details Card */}
        {outpass?.Student && (
          <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm w-full space-y-4">
            <View className="flex-row items-center space-x-4 border-b border-gray-50 pb-4">
              {outpass.Student.profile_picture ? (
                <Image
                  source={{ uri: outpass.Student.profile_picture }}
                  className="w-16 h-16 rounded-2xl border border-gray-100"
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl bg-indigo-50 items-center justify-center">
                  <User size={28} color="#4F46E5" />
                </View>
              )}
              <View>
                <Text className="text-gray-900 font-extrabold text-lg">{outpass.Student.userName}</Text>
                <Text className="text-gray-400 text-sm font-semibold">Roll: {outpass.Student.roll_number}</Text>
              </View>
            </View>

            {/* Hostel Info */}
            <View className="flex-row items-center space-x-3">
              <Calendar size={18} color="#9CA3AF" />
              <View>
                <Text className="text-gray-400 text-[10px] font-bold uppercase">Hostel / Unit</Text>
                <Text className="text-gray-700 font-bold text-sm">
                  {outpass.Hostel?.name || outpass.Student.Hostel?.name || 'Main Hostel'}
                </Text>
              </View>
            </View>

            {/* Purpose */}
            <View className="flex-row items-center space-x-3">
              <ClipboardList size={18} color="#9CA3AF" />
              <View>
                <Text className="text-gray-400 text-[10px] font-bold uppercase">Purpose</Text>
                <Text className="text-gray-700 font-semibold text-sm">{outpass.purpose}</Text>
              </View>
            </View>

            {/* Destination */}
            <View className="flex-row items-center space-x-3">
              <MapPin size={18} color="#9CA3AF" />
              <View>
                <Text className="text-gray-400 text-[10px] font-bold uppercase">Destination</Text>
                <Text className="text-gray-700 font-semibold text-sm">{outpass.destination}</Text>
              </View>
            </View>

            {/* Expected Return Time */}
            <View className="flex-row items-center space-x-3">
              <AlertTriangle size={18} color="#9CA3AF" />
              <View>
                <Text className="text-gray-400 text-[10px] font-bold uppercase">Expected Return Time</Text>
                <Text className="text-gray-700 font-bold text-sm">
                  {moment(outpass.to_date).format('lll')}
                </Text>
              </View>
            </View>

            {/* Time Variation / Duration difference on Return */}
            {isReturn && outpass?.to_date && (outpass?.return_time || outpass?.updatedAt) && (
              <View className="flex-row items-center space-x-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <Clock size={18} color="#4F46E5" />
                <View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">Time Variation</Text>
                  <Text className={`font-bold text-sm ${moment(outpass.return_time || outpass.updatedAt).isAfter(moment(outpass.to_date)) ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {getDurationDifference(outpass.to_date, outpass.return_time || outpass.updatedAt)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Footer Back Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('SecurityDashboard')}
        className="bg-indigo-600 p-4 rounded-2xl items-center shadow-md shadow-indigo-100"
      >
        <Text className="text-white font-extrabold text-base">Back to Console</Text>
      </TouchableOpacity>
    </View>
  );
};

export default VerificationResultScreen;
