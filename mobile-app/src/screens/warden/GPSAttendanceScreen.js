import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import DeviceInfo from 'react-native-device-info';
import api from '../api/api';
import StudentPicker from '../components/StudentPicker';

const GPSAttendanceScreen = ({ user }) => {
  const [location, setLocation] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    getLocation();
    loadStudents();
  }, []);

  const getLocation = () => {
    Geolocation.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => Alert.alert('GPS Error', err.message),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const loadStudents = async () => {
    try {
      const res = await api.get('/users/students'); // Fetch only students
      setStudents(res.data);
    } catch {
      Alert.alert('Error', 'Unable to load students');
    }
  };

  const markAttendance = async () => {
    if (!location) return Alert.alert('GPS not ready');
    if (!selectedStudent) return Alert.alert('Select a student');

    const deviceId = await DeviceInfo.getUniqueId();

    try {
      await api.post('/attendance/gps', {
        user_id: selectedStudent,
        latitude: location.latitude,
        longitude: location.longitude,
        device_id: deviceId
      });
      Alert.alert('Success', 'Attendance marked for student');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPS Attendance (Warden)</Text>
      <StudentPicker
        students={students}
        selectedStudent={selectedStudent}
        onChange={setSelectedStudent}
      />
      {location && (
        <>
          <Text>Lat: {location.latitude}</Text>
          <Text>Lng: {location.longitude}</Text>
        </>
      )}
      <Button title="Mark Attendance" onPress={markAttendance} />
    </View>
  );
};

export default GPSAttendanceScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 }
});
