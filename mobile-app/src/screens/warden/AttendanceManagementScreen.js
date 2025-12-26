import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import {
  Search,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';

const AttendanceManagementScreen = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState('');

  // OD Modal
  const [odModal, setOdModal] = useState({ visible: false, studentId: null });
  const [odData, setOdData] = useState({ from_date: '', to_date: '', reason: '' });

  // Month-end states
  const [monthEndModal, setMonthEndModal] = useState(false);
  const [monthEndLoading, setMonthEndLoading] = useState(false);
  const [totalOperationalDays, setTotalOperationalDays] = useState('');
  const [studentReductions, setStudentReductions] = useState({});

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const studentsRes = await wardenAPI.getStudents();
      const attendanceRes = await wardenAPI.getAttendance({
        date: moment(selectedDate).format('YYYY-MM-DD'),
      });
      setStudents(studentsRes.data.data);
      setAttendance(attendanceRes.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceForStudent = (studentId) =>
    attendance.find((att) => att.student_id === studentId);

  const markAttendance = async (studentId, status, odDetails = null) => {
    try {
      const payload = {
        student_id: studentId,
        date: moment(selectedDate).format('YYYY-MM-DD'),
        status,
      };

      if (status === 'OD' && odDetails) {
        payload.from_date = odDetails.from_date;
        payload.to_date = odDetails.to_date;
        payload.reason = odDetails.reason;
      }

      await wardenAPI.markAttendance(payload);
      fetchData();
      setOdModal({ visible: false, studentId: null });
      setOdData({ from_date: '', to_date: '', reason: '' });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    }
  };

  const handleMonthEndSubmit = async () => {
    setMonthEndLoading(true);
    try {
      const reductions = Object.entries(studentReductions)
        .filter(([_, days]) => parseInt(days) > 0)
        .map(([studentId, days]) => ({
          student_id: parseInt(studentId),
          reduction_days: parseInt(days),
        }));

      await wardenAPI.bulkMonthEndMandays({
        month: moment(selectedDate).month() + 1,
        year: moment(selectedDate).year(),
        total_operational_days: parseInt(totalOperationalDays),
        student_reductions: reductions,
      });

      Alert.alert('Success', 'Month-end mandays saved successfully');
      setMonthEndModal(false);
      setStudentReductions({});
      setTotalOperationalDays('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save month-end data');
    } finally {
      setMonthEndLoading(false);
    }
  };

  const renderStudentItem = ({ item }) => {
    const att = getAttendanceForStudent(item.id);
    const status = att?.status;

    return (
      <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="font-bold text-gray-900">{item.username}</Text>
          <Text className="text-gray-500 text-sm">
            Roll: {item.roll_number || 'N/A'}
          </Text>
        </View>

        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={() => markAttendance(item.id, 'P')}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              status === 'P' ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <CheckCircle size={16} color={status === 'P' ? 'white' : '#9CA3AF'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => markAttendance(item.id, 'A')}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              status === 'A' ? 'bg-red-500' : 'bg-gray-200'
            }`}
          >
            <XCircle size={16} color={status === 'A' ? 'white' : '#9CA3AF'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOdModal({ visible: true, studentId: item.id })}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              status === 'OD' ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <Clock size={16} color={status === 'OD' ? 'white' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredStudents = students.filter((s) =>
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4 flex-1">
        <Text className="text-xl font-bold mb-4">
          Attendance – {moment(selectedDate).format('MMM DD, YYYY')}
        </Text>

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          className="flex-row items-center bg-white p-4 rounded-xl mb-4 border border-gray-200"
        >
          <CalendarIcon size={20} color="#9CA3AF" />
          <Text className="ml-2 text-gray-700 font-medium">
            {moment(selectedDate).format('MMM DD, YYYY')}
          </Text>
        </TouchableOpacity>

        <TextInput
          placeholder="Search students..."
          value={search}
          onChangeText={setSearch}
          className="bg-white p-4 rounded-xl border border-gray-200 mb-4"
        />

        {loading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : (
          <FlatList
            data={filteredStudents}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id.toString()}
          />
        )}

        <TouchableOpacity
          onPress={() => setMonthEndModal(true)}
          className="bg-indigo-600 p-4 rounded-xl items-center mt-4"
        >
          <Text className="text-white font-bold">Month-End Mandays</Text>
        </TouchableOpacity>
      </View>

      {/* OD Modal */}
      <Modal visible={odModal.visible} animationType="slide">
        <View className="flex-1 bg-white p-6">
          <Text className="text-xl font-bold mb-4">On Duty Details</Text>

          <TextInput
            placeholder="From Date (YYYY-MM-DD)"
            value={odData.from_date}
            onChangeText={(v) => setOdData({ ...odData, from_date: v })}
            className="border p-3 rounded mb-3"
          />

          <TextInput
            placeholder="To Date (YYYY-MM-DD)"
            value={odData.to_date}
            onChangeText={(v) => setOdData({ ...odData, to_date: v })}
            className="border p-3 rounded mb-3"
          />

          <TextInput
            placeholder="Reason"
            value={odData.reason}
            onChangeText={(v) => setOdData({ ...odData, reason: v })}
            className="border p-3 rounded mb-4"
          />

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setOdModal({ visible: false, studentId: null })}
              className="flex-1 bg-gray-300 p-3 rounded"
            >
              <Text className="text-center">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                markAttendance(odModal.studentId, 'OD', odData)
              }
              className="flex-1 bg-blue-600 p-3 rounded"
            >
              <Text className="text-white text-center">Save OD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Month-End Modal */}
      <Modal visible={monthEndModal} animationType="slide">
        <View className="flex-1 bg-white p-6">
          <Text className="text-xl font-bold mb-4">Month-End Mandays</Text>

          <TextInput
            placeholder="Total Operational Days"
            value={totalOperationalDays}
            onChangeText={setTotalOperationalDays}
            keyboardType="numeric"
            className="border p-3 rounded mb-4"
          />

          <FlatList
            data={students}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View className="flex-row justify-between items-center p-3 border-b">
                <Text>{item.username}</Text>
                <TextInput
                  placeholder="0"
                  value={studentReductions[item.id]?.toString() || ''}
                  onChangeText={(v) =>
                    setStudentReductions({
                      ...studentReductions,
                      [item.id]: v,
                    })
                  }
                  keyboardType="numeric"
                  className="w-20 text-right border-b"
                />
              </View>
            )}
          />

          <TouchableOpacity
            onPress={handleMonthEndSubmit}
            disabled={monthEndLoading}
            className="bg-green-600 p-4 rounded mt-4"
          >
            <Text className="text-white text-center font-bold">
              {monthEndLoading ? 'Saving...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}
    </View>
  );
};

export default AttendanceManagementScreen;
