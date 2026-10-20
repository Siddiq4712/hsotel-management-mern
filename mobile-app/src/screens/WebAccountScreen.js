import QuickActionsRow from '../components/common/QuickActionsRow';
import { Monitor, LogOut } from 'lucide-react-native';
import colors from '../theme/colors';
import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../api/api';
import { normalizeRole } from '../utils/role';

export default function WebAccountScreen() {
  const { user, logout } = useAuth();
  const role = normalizeRole(user?.role) || 'unassigned';
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL ||
    API_BASE_URL.replace(/:\d+\/api\/?$/, ':3000');

  const openDashboard = async () => {
    try {
      await Linking.openURL(webUrl);
    } catch {
      Alert.alert('Could not open dashboard', `Open ${webUrl} in your browser. Make sure the web app is running.`);
    }
  };

  const actions = [
    { label: 'Open web dashboard', icon: Monitor, onPress: openDashboard },
    { label: 'Switch account', icon: LogOut, onPress: logout },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>You are signed in</Text>
        <Text style={styles.account}>{user?.username || 'Your account'} · {role}</Text>
        <Text style={styles.description}>
          This account has no mobile dashboard. Use the web app for its features.
          Mobile dashboards are available for Student, Warden, Security, and Parent accounts.
        </Text>
        <QuickActionsRow title="Account actions" actions={actions} style={{ marginVertical: 12 }} />
        <Text style={styles.hint}>The web app must be running. Sign in again in the browser.</Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  card: { padding: 24, borderRadius: 16, backgroundColor: colors.card },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  account: { fontSize: 16, color: colors.mutedText, marginTop: 12 },
  description: { fontSize: 16, lineHeight: 24, color: colors.text, marginVertical: 20 },
  primary: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  primaryText: { color: colors.card, fontWeight: '600', fontSize: 16 },
  hint: { fontSize: 13, lineHeight: 20, color: colors.mutedText, marginTop: 12 },
  secondary: { padding: 14, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
});
