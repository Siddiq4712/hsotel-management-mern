// warden/AttendanceSummaryScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import axios from 'axios';

const AttendanceSummaryScreen = () => {
  const [data, setData] = useState({ present: 0, absent: 0 });

  useEffect(() => {
    axios
      .get('http://YOUR_IP:5000/api/attendance/summary/today', {
        headers: {
          Authorization: `Bearer YOUR_TOKEN`
        }
      })
      .then(res => setData(res.data));
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text>Today Attendance</Text>
      <Text>Present: {data.present}</Text>
      <Text>Absent: {data.absent}</Text>
    </View>
  );
};

export default AttendanceSummaryScreen;
