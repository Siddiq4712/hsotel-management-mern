import React from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';

const LoadingOverlay = ({ 
  visible, 
  message = "Loading...",
  subMessage = "",
  size = "large",
  color = "#4F46E5"
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View
          className="bg-white rounded-2xl py-8 px-10 items-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 16,
            minWidth: 240,
            maxWidth: 320,
          }}
        >
          <ActivityIndicator size={size} color={color} />
          <Text className="mt-4 font-bold text-lg text-gray-800 text-center">
            {message}
          </Text>
          {subMessage ? (
            <Text className="mt-2 text-sm text-gray-500 text-center">
              {subMessage}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default LoadingOverlay;