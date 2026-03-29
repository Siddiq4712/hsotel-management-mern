import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SectionList,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import Header from '../../components/common/Header';
import { gpsAttendanceAPI, wardenAPI } from '../../api/api';

const CONFIG_RADIUS = Number(Constants.expoConfig?.extra?.GEOFENCE_RADIUS_M);
const DEFAULT_RADIUS = Number.isFinite(CONFIG_RADIUS) ? CONFIG_RADIUS : 150;
const DEFAULT_DURATION = 20;
const CONFIG_GEOFENCE = {
  latitude: Number(Constants.expoConfig?.extra?.GEOFENCE_LAT),
  longitude: Number(Constants.expoConfig?.extra?.GEOFENCE_LNG)
};
const hasConfiguredGeofence =
  Number.isFinite(CONFIG_GEOFENCE.latitude) &&
  Number.isFinite(CONFIG_GEOFENCE.longitude);

const GPSAttendanceScreen = () => {
  const [activeSession, setActiveSession] = useState(null);
  const [lastClosedSession, setLastClosedSession] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [summary, setSummary] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [sessionBatch, setSessionBatch] = useState('all');
  const [yearInput, setYearInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS));
  const [duration, setDuration] = useState(String(DEFAULT_DURATION));
  const [nowTick, setNowTick] = useState(0);
  const sessionForResults = activeSession || lastClosedSession;
  const isSessionActive = !!activeSession;

  const remainingSeconds = useMemo(() => {
    if (!activeSession?.end_time) return 0;
    const now = Date.now() + serverOffsetMs;
    const end = new Date(activeSession.end_time).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [activeSession, serverOffsetMs, nowTick]);

  useEffect(() => {
    refreshActiveSession();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!activeSession?.id) return;
    fetchSummary();
    const summaryTimer = setInterval(fetchSummary, 10000);
    const clockTimer = setInterval(() => {
      setNowTick((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(summaryTimer);
      clearInterval(clockTimer);
    };
  }, [activeSession?.id]);

  const studentsById = useMemo(() => {
    const map = new Map();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedBatch === 'all') return students;
    return students.filter((s) => String(s.enrollment_year) === String(selectedBatch));
  }, [students, selectedBatch]);

  const activeBatch = sessionBatch === 'all' ? selectedBatch : sessionBatch;
  const filteredSummary = useMemo(() => {
    const filteredByStudents = summary.filter((s) => studentsById.has(s.id));
    if (activeBatch === 'all') return filteredByStudents;
    return filteredByStudents.filter(
      (s) => String(studentsById.get(s.id)?.enrollment_year) === String(activeBatch)
    );
  }, [summary, activeBatch, studentsById]);

  const presentList = useMemo(
    () => filteredSummary.filter((s) => s.status === 'P'),
    [filteredSummary]
  );
  const absentList = useMemo(
    () => filteredSummary.filter((s) => s.status === 'A'),
    [filteredSummary]
  );

  const refreshActiveSession = async () => {
    setLoading(true);
    try {
      const res = await gpsAttendanceAPI.getActiveSession({ session: 'EVENING' });
      const serverTime = new Date(res.data.server_time).getTime();
      setServerOffsetMs(serverTime - Date.now());
      if (res.data.active) {
        setActiveSession(res.data.session);
        setLastClosedSession(null);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (yearOverride) => {
    setStudentsLoading(true);
    try {
      const yearValue =
        typeof yearOverride === 'string' ? yearOverride : yearInput;
      const trimmedYear = yearValue?.trim();
      const res = await wardenAPI.getStudents(
        trimmedYear ? { enrollment_year: trimmedYear } : undefined
      );
      setStudents(res.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch enrolled students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!activeSession?.id) return;
    try {
      const res = await gpsAttendanceAPI.getSessionSummary(activeSession.id);
      const serverTime = new Date(res.data.server_time).getTime();
      setServerOffsetMs(serverTime - Date.now());
      setSummary(res.data.summary || []);
    } catch (error) {
      console.error(error);
    }
  };

  const startSession = () => {
    setStarting(true);
    (async () => {
      try {
        if (selectedBatch === 'all') {
          Alert.alert('Select year', 'Please choose a batch/year before starting attendance.');
          return;
        }

        let geofence_lat = CONFIG_GEOFENCE.latitude;
        let geofence_lng = CONFIG_GEOFENCE.longitude;
        if (!hasConfiguredGeofence) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission required', 'Location permission is needed to start attendance.');
            return;
          }

          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });
          geofence_lat = pos.coords.latitude;
          geofence_lng = pos.coords.longitude;
        }
        const duration_minutes = Number(duration || DEFAULT_DURATION);
        const geofence_radius_m = Number(radius || DEFAULT_RADIUS);

        const res = await gpsAttendanceAPI.startSession({
          session: 'EVENING',
          duration_minutes,
          geofence_lat,
          geofence_lng,
          geofence_radius_m,
          enrollment_year: Number(selectedBatch)
        });

        const serverTime = new Date(res.data.server_time).getTime();
        setServerOffsetMs(serverTime - Date.now());
        setActiveSession(res.data.session);
        setLastClosedSession(null);
        setSummary([]);
        setSessionBatch(selectedBatch);
      } catch (error) {
        const existingSession = error?.response?.data?.session;
        if (existingSession) {
          setActiveSession(existingSession);
          setSummary([]);
          Alert.alert('Session Active', error?.response?.data?.message || 'Attendance session already active.');
        } else {
          Alert.alert('GPS Error', error.message || 'Failed to get location');
        }
      } finally {
        setStarting(false);
      }
    })();
  };

  const closeSession = async () => {
    if (!activeSession?.id) return;
    setClosing(true);
    try {
      const closeRes = await gpsAttendanceAPI.closeSession(activeSession.id);
      const closedSession = closeRes?.data?.session;
      const closedSessionId = closedSession?.id || activeSession.id;

      const summaryRes = await gpsAttendanceAPI.getSessionSummary(closedSessionId);
      const serverTime = new Date(summaryRes.data.server_time).getTime();
      setServerOffsetMs(serverTime - Date.now());
      setSummary(summaryRes.data.summary || []);
      setLastClosedSession(summaryRes.data.session || closedSession || null);
      setActiveSession(null);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to close session');
    } finally {
      setClosing(false);
    }
  };

  const renderStudent = ({ item }) => {
    const statusColor =
      item.status === 'P' ? '#10b981' : item.status === 'A' ? '#ef4444' : '#f59e0b';
    const displayDistance = item.distance;

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentRow}>
          <Text style={styles.studentName}>{item.userName}</Text>
          <Text style={styles.rollText}>Roll: {item.roll_number || 'N/A'}</Text>
        </View>
        <View style={styles.studentRow}>
          <Text style={[styles.statusPill, { backgroundColor: statusColor }]}>
            {item.status}
          </Text>
          {displayDistance != null && (
            <Text style={styles.metaText}>{Math.round(displayDistance)}m</Text>
          )}
        </View>
      </View>
    );
  };

  const renderBatchSection = () => {
    const preview = filteredStudents.slice(0, 6);
    return (
      <View style={styles.batchCard}>
        <View style={styles.batchHeader}>
          <Text style={styles.sessionLabel}>Enrolled Students</Text>
          <TouchableOpacity onPress={fetchStudents} disabled={studentsLoading}>
            <Text style={styles.refreshText}>
              {studentsLoading ? 'Loading...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.metaText}>Filter by enrollment year</Text>
        <View style={styles.filterRow}>
          <TextInput
            style={styles.filterInput}
            keyboardType="numeric"
            value={yearInput}
            onChangeText={setYearInput}
            placeholder="e.g. 2025"
            maxLength={4}
          />
          <TouchableOpacity
            onPress={() => {
              const trimmed = yearInput.trim();
              setSelectedBatch(trimmed || 'all');
              fetchStudents(trimmed);
            }}
            style={styles.applyBtn}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setYearInput('');
              setSelectedBatch('all');
              fetchStudents('');
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.metaText}>Total: {filteredStudents.length}</Text>

        {filteredStudents.length === 0 ? (
          <Text style={styles.emptyText}>No enrolled students for this batch.</Text>
        ) : (
          preview.map((s) => (
            <Text key={s.id} style={styles.enrolledName}>
              {s.userName || s.username || s.name || 'Student'}
            </Text>
          ))
        )}

        {filteredStudents.length > preview.length && (
          <Text style={styles.metaText}>
            +{filteredStudents.length - preview.length} more
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>Evening GPS Attendance</Text>

        {loading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : sessionForResults ? (
          <>
            <View style={styles.sessionCard}>
              <Text style={styles.sessionLabel}>
                {isSessionActive ? 'Active Session' : 'Closed Session Results'}
              </Text>
              <Text style={styles.sessionMeta}>
                Date: {sessionForResults.attendance_date || 'N/A'}
              </Text>
              <Text style={styles.sessionMeta}>Enrollment Year: {activeBatch}</Text>
              <Text style={styles.sessionMeta}>
                Radius: {Math.round(sessionForResults.geofence_radius_m)}m
              </Text>
              {isSessionActive && (
                <Text style={styles.sessionMeta}>
                  Ends in: {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s
                </Text>
              )}
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Results</Text>
              <Text style={styles.resultMeta}>
                Present: {presentList.length} | Absent: {absentList.length}
              </Text>
            </View>

            <SectionList
              sections={[
                { title: 'Present', data: presentList },
                { title: 'Absent', data: absentList }
              ]}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderStudent}
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
              ListHeaderComponent={renderBatchSection}
              contentContainerStyle={{ paddingBottom: 16 }}
              stickySectionHeadersEnabled={false}
            />

            {isSessionActive && (
              <TouchableOpacity
                onPress={closeSession}
                disabled={closing}
                style={[styles.closeBtn, closing && { opacity: 0.6 }]}
              >
                <Text style={styles.closeBtnText}>
                  {closing ? 'Closing...' : 'Close Session'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.startCard}>
            <Text style={styles.sessionLabel}>Start Evening Attendance</Text>
            <Text style={styles.sessionMeta}>
              {hasConfiguredGeofence
                ? 'Using hostel geofence coordinates configured for this app.'
                : 'Using warden live location as fallback geofence center.'}
            </Text>

            {renderBatchSection()}

            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={radius}
              onChangeText={setRadius}
              placeholder="Radius (meters)"
            />
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
              placeholder="Duration (minutes)"
            />

            <TouchableOpacity
              onPress={startSession}
              disabled={starting}
              style={[styles.startBtn, starting && { opacity: 0.6 }]}
            >
              <Text style={styles.startBtnText}>
                {starting ? 'Starting...' : 'Start Session'}
              </Text>
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
  sessionCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  resultTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  resultMeta: { color: '#64748b', fontSize: 12 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 6,
    marginBottom: 6
  },
  startCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sessionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  sessionMeta: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  batchCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6
  },
  enrolledName: { color: '#0f172a', fontSize: 13, marginTop: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    flex: 1
  },
  filterInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    flex: 1
  },
  applyBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 8
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  clearBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 6
  },
  clearBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 12 },
  startBtn: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12
  },
  startBtnText: { color: '#fff', fontWeight: '700' },
  closeBtn: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  closeBtnText: { color: '#fff', fontWeight: '700' },
  studentCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { fontWeight: '700', color: '#0f172a' },
  rollText: { color: '#64748b', fontSize: 12 },
  statusPill: {
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  metaText: { color: '#64748b', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 12 },
  refreshText: { color: '#2563eb', fontWeight: '700', fontSize: 12 }
});

