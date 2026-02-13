// student/GpsAttendanceScreen.js
import React, { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';

const GpsAttendanceScreen = () => {
  const [loading, setLoading] = useState(false);

  const markAttendance = () => {
    setLoading(true);

    Geolocation.getCurrentPosition(
      async position => {
        try {
          const deviceId = await DeviceInfo.getUniqueId();

          const res = await axios.post(
            'http://YOUR_IP:5000/api/attendance/gps',
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              deviceId
            },
            {
              headers: {
                Authorization: `Bearer YOUR_TOKEN`
              }
            }
          );

          Alert.alert('Success', res.data.message);
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Failed');
        } finally {
          setLoading(false);
        }
      },
      error => {
        Alert.alert('GPS Error', error.message);
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>GPS Attendance</Text>
      <Button
        title={loading ? 'Marking...' : 'Touch to Mark Attendance'}
        onPress={markAttendance}
        disabled={loading}
      />
    </View>
  );
};

export default GpsAttendanceScreen;
