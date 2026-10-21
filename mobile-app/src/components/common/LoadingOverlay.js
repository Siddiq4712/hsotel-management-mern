import { Text } from "./ReferenceDesign";
import colors from '../../theme/colors';
import React from 'react';
import { View, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import Card from './Card';

const LoadingOverlay = ({ 
  visible, 
  message = "Loading...",
  subMessage = "",
  size = "large",
  color = colors.primary
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <ActivityIndicator size={size} color={color} />
          <Text style={styles.message}>
            {message}
          </Text>
          {subMessage ? (
            <Text style={styles.subMessage}>
              {subMessage}
            </Text>
          ) : null}
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0F172A80' },
  card: { width: '100%', maxWidth: 320, padding: 24, alignItems: 'center', shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  message: { alignSelf: 'stretch', marginTop: 16, fontSize: 18, lineHeight: 25, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subMessage: { alignSelf: 'stretch', marginTop: 8, fontSize: 14, lineHeight: 21, color: colors.mutedText, textAlign: 'center' },
});

export default LoadingOverlay;
