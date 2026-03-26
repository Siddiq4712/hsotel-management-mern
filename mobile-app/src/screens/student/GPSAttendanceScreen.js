import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/common/Header';
import { gpsAttendanceAPI } from '../../api/api';

const toRad = (value) => (value * Math.PI) / 180;
const distanceMeters = (a, b) => {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const FALLBACK_DEVICE_ID_KEY = 'hostel_device_identifier';
const FIXED_WARDEN_GEOFENCE = {
  latitude: Number(Constants.expoConfig?.extra?.GEOFENCE_LAT ?? 9.1474619),
  longitude: Number(Constants.expoConfig?.extra?.GEOFENCE_LNG ?? 77.8276993)
};

const getDeviceIdentifier = async () => {
  let deviceId = null;

  try {
    if (typeof Application.getInstallationIdAsync === 'function') {
      deviceId = await Application.getInstallationIdAsync();
    }
  } catch (error) {
    // Continue with other strategies.
  }

  if (!deviceId && Platform.OS === 'android') {
    deviceId = Application.androidId || null;
  }

  if (
    !deviceId &&
    Platform.OS === 'ios' &&
    typeof Application.getIosIdForVendorAsync === 'function'
  ) {
    try {
      deviceId = await Application.getIosIdForVendorAsync();
    } catch (error) {
      // Continue with fallback storage ID.
    }
  }

  if (!deviceId) {
    const savedFallback = await AsyncStorage.getItem(FALLBACK_DEVICE_ID_KEY);
    if (savedFallback) return savedFallback;

    const generated = `hostel-${Platform.OS}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    await AsyncStorage.setItem(FALLBACK_DEVICE_ID_KEY, generated);
    deviceId = generated;
  }

  return deviceId;
};

const GPSAttendanceScreen = () => {
  const [activeSession, setActiveSession] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markedStatus, setMarkedStatus] = useState(null);
  const [lastDistance, setLastDistance] = useState(null);
  const [localStatus, setLocalStatus] = useState(null);
  const [nowTick, setNowTick] = useState(0);

  const remainingSeconds = useMemo(() => {
    if (!activeSession?.end_time) return 0;
    const now = Date.now() + serverOffsetMs;
    const end = new Date(activeSession.end_time).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [activeSession, serverOffsetMs, nowTick]);

  useEffect(() => {
    refreshActiveSession();
  }, []);

  useEffect(() => {
    if (activeSession?.id) {
      setMarkedStatus(null);
      setLastDistance(null);
      setLocalStatus(null);
    }
  }, [activeSession?.id]);

  useEffect(() => {
    if (!activeSession?.id) return;
    const clockTimer = setInterval(() => {
      setNowTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(clockTimer);
  }, [activeSession?.id]);

  const refreshActiveSession = async () => {
    setLoading(true);
    try {
      const res = await gpsAttendanceAPI.getActiveSession({ session: 'EVENING' });
      const serverTime = new Date(res.data.server_time).getTime();
      setServerOffsetMs(serverTime - Date.now());
      if (res.data.active) {
        setActiveSession(res.data.session);
      } else {
        setActiveSession(null);
        setMarkedStatus(null);
        setLastDistance(null);
        setLocalStatus(null);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = () => {
    if (!activeSession) return;
    setMarking(true);

    (async () => {
      try {
        const device_id = await getDeviceIdentifier();

        if (!device_id) {
          Alert.alert('Device ID unavailable', 'Unable to read a device identifier.');
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Location permission is needed to mark attendance.');
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        const current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };

        const geofenceLat = Number(activeSession?.geofence_lat);
        const geofenceLng = Number(activeSession?.geofence_lng);
        const geofenceRadius = Number(activeSession?.geofence_radius_m);
        const hasSessionGeofence =
          Number.isFinite(geofenceLat) && Number.isFinite(geofenceLng);
        const center = hasSessionGeofence
          ? { latitude: geofenceLat, longitude: geofenceLng }
          : FIXED_WARDEN_GEOFENCE;

        const distance = distanceMeters(current, center);
        setLastDistance(distance);

        if (Number.isFinite(geofenceRadius) && geofenceRadius > 0) {
          const computedStatus = distance <= geofenceRadius ? 'P' : 'A';
          setLocalStatus(computedStatus);
          Alert.alert(
            computedStatus === 'P' ? 'Present' : 'Absent',
            `Distance from warden location: ${Math.round(distance)}m`
          );
        } else {
          setLocalStatus(null);
        }

        const res = await gpsAttendanceAPI.markAttendance({
          latitude: current.latitude,
          longitude: current.longitude,
          device_id,
          session: 'EVENING'
        });

        const attendanceStatus = res.data?.status || res.data?.record?.status;
        setMarkedStatus(attendanceStatus || 'P');

        if (attendanceStatus === 'A') {
          Alert.alert('Absent', res.data?.message || 'Marked absent');
        } else {
          Alert.alert('Success', res.data?.message || 'Attendance marked present');
        }
      } catch (error) {
        Alert.alert('GPS Error', error.message || 'Failed to get location');
      } finally {
        setMarking(false);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>Evening Attendance</Text>

        {loading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : activeSession ? (
          <View style={styles.card}>
            <Text style={styles.label}>Session Active</Text>
            <Text style={styles.meta}>
              Ends in: {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s
            </Text>
            <Text style={styles.meta}>
              Radius: {Math.round(activeSession.geofence_radius_m)}m
            </Text>
            {lastDistance != null && (
              <Text style={styles.meta}>
                Distance from warden location: {Math.round(lastDistance)}m
              </Text>
            )}
            {localStatus && (
              <Text style={styles.meta}>
                Local status: {localStatus === 'A' ? 'Absent' : 'Present'}
              </Text>
            )}

            <TouchableOpacity
              onPress={markAttendance}
              disabled={marking || !!markedStatus}
              style={[
                styles.markBtn,
                (marking || !!markedStatus) && { opacity: 0.6 }
              ]}
            >
              <Text style={styles.markBtnText}>
                {markedStatus
                  ? markedStatus === 'A'
                    ? 'Marked Absent'
                    : 'Marked Present'
                  : marking
                  ? 'Marking...'
                  : 'Mark Attendance'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>No active session</Text>
            <Text style={styles.meta}>
              Wait for the warden to start evening attendance.
            </Text>
            <TouchableOpacity onPress={refreshActiveSession} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default GPSAttendanceScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  meta: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  markBtn: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12
  },
  markBtnText: { color: '#fff', fontWeight: '700' },
  refreshBtn: {
    backgroundColor: '#e2e8f0',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  refreshText: { color: '#0f172a', fontWeight: '700' }
});
