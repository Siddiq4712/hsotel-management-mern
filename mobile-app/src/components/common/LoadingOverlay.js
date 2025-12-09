import React from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';

const LoadingOverlay = ({ visible, message = "Loading..." }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}} // Disable closing with back button
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-lg flex-row items-center shadow-lg">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="ml-4 text-lg text-gray-700">{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

export default LoadingOverlay;
