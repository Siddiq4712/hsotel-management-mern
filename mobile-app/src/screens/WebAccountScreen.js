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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>You are signed in</Text>
        <Text style={styles.account}>{user?.username || 'Your account'} · {role}</Text>
        <Text style={styles.description}>
          This account has no mobile dashboard. Use the web app for its features.
          Mobile dashboards are available for Student, Warden, Security, and Parent accounts.
        </Text>
        <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={openDashboard}>
          <Text style={styles.primaryText}>Open web dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>The web app must be running. Sign in again in the browser.</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={logout}>
          <Text style={styles.secondaryText}>Sign out / switch account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  card: { padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  account: { fontSize: 16, color: '#475569', marginTop: 12 },
  description: { fontSize: 16, lineHeight: 24, color: '#334155', marginVertical: 20 },
  primary: { backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  hint: { fontSize: 13, lineHeight: 20, color: '#64748B', marginTop: 12 },
  secondary: { padding: 14, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#2563EB', fontWeight: '600', fontSize: 16 },
});
