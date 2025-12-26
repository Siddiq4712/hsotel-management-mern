import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const DatePickerModal = ({ visible, onSelect, onCancel, value }) => {
  const [date, setDate] = useState(value || new Date());

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/20">
        <View className="bg-white p-4 rounded-t-2xl">
          <View className="flex-row justify-between mb-4">
            <TouchableOpacity onPress={onCancel}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSelect(date)}>
              <Text className="text-blue-600 font-bold">Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker value={date} mode="date" onChange={(e, d) => d && setDate(d)} />
        </View>
      </View>
    </Modal>
  );
};

export default DatePickerModal;