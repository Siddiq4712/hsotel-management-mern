import React from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';

const LoadingOverlay = ({ visible, message = 'Loading...' }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white px-6 py-5 rounded-xl flex-row items-center shadow-xl">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="ml-4 text-base font-semibold text-gray-700">
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default LoadingOverlay;
