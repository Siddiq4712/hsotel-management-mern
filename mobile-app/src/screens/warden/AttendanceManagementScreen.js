import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { Search, Calendar as CalendarIcon, CheckCircle, XCircle, Info } from 'lucide-react-native';
import moment from 'moment';

const AttendanceManagementScreen = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  
  // Month-end Modal States
  const [monthEndModal, setMonthEndModal] = useState(false);
  const [operationalDays, setOperationalDays] = useState('25');
  const [reductions, setReductions] = useState({}); // {studentId: days}

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const stdRes = await wardenAPI.getStudents();
      const attRes = await wardenAPI.getAttendance({ date: selectedDate });
      setStudents(stdRes.data.data);
      setAttendance(attRes.data.data);
    } catch (e) { Alert.alert("Error", "Failed to load students"); }
    finally { setLoading(false); }
  };

  const markStatus = async (studentId, status) => {
    try {
      await wardenAPI.markAttendance({
        student_id: studentId,
        date: selectedDate,
        status: status,
      });
      loadData();
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const submitMonthEnd = async () => {
    const student_reductions = Object.entries(reductions).map(([id, days]) => ({
      student_id: parseInt(id),
      reduction_days: parseInt(days)
    }));

    try {
      setLoading(true);
      await wardenAPI.bulkMonthEndMandays({
        month: moment().month() + 1,
        year: moment().year(),
        total_operational_days: parseInt(operationalDays),
        student_reductions
      });
      Alert.alert("Success", "Month-end mandays saved.");
      setMonthEndModal(false);
    } catch (e) { Alert.alert("Error", e.message); }
    finally { setLoading(false); }
  };

  const renderStudent = ({ item }) => {
    const attRecord = attendance.find(a => a.student_id === item.id);
    const status = attRecord?.status;

    return (
      <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-bold text-gray-900">{item.username}</Text>
          <Text className="text-gray-500 text-xs">Roll: {item.roll_number || 'N/A'}</Text>
        </View>
        <View className="flex-row space-x-2">
          <TouchableOpacity 
            onPress={() => markStatus(item.id, 'P')}
            className={`w-10 h-10 rounded-full items-center justify-center ${status === 'P' ? 'bg-green-500' : 'bg-gray-100'}`}
          >
            <Text className={`font-bold ${status === 'P' ? 'text-white' : 'text-gray-400'}`}>P</Text>
          </TouchableOpacity>
          <TouchableOpacity 
             onPress={() => markStatus(item.id, 'A')}
            className={`w-10 h-10 rounded-full items-center justify-center ${status === 'A' ? 'bg-red-500' : 'bg-gray-100'}`}
          >
            <Text className={`font-bold ${status === 'A' ? 'text-white' : 'text-gray-400'}`}>A</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4 flex-1">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold">Daily Attendance</Text>
          <TouchableOpacity 
            onPress={() => setMonthEndModal(true)}
            className="bg-indigo-600 px-3 py-2 rounded-lg"
          >
            <Text className="text-white text-xs font-bold">Month-End Mode</Text>
          </TouchableOpacity>
        </View>

        <TextInput 
          placeholder="Search students..."
          value={search}
          onChangeText={setSearch}
          className="bg-white p-3 rounded-xl border border-gray-200 mb-4"
        />

        {loading ? <ActivityIndicator color="#4F46E5" /> : (
          <FlatList 
            data={students.filter(s => s.username.toLowerCase().includes(search.toLowerCase()))}
            renderItem={renderStudent}
            keyExtractor={item => item.id.toString()}
          />
        )}
      </View>

      {/* Month End Modal */}
      <Modal visible={monthEndModal} animationType="slide">
        <View className="flex-1 bg-white p-6">
          <Text className="text-2xl font-bold mb-2">Month-End Mandays</Text>
          <Text className="text-gray-500 mb-6">Batch process attendance for the entire month.</Text>
          
          <Text className="text-gray-700 font-bold mb-2">Total Operational Days</Text>
          <TextInput 
            keyboardType="numeric"
            value={operationalDays}
            onChangeText={setOperationalDays}
            className="border border-gray-200 p-4 rounded-xl mb-6 bg-gray-50"
          />

          <FlatList 
            data={students}
            keyExtractor={s => s.id.toString()}
            renderItem={({ item }) => (
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <Text className="text-gray-800">{item.username}</Text>
                <View className="flex-row items-center">
                  <Text className="text-xs text-gray-400 mr-2">Reductions:</Text>
                  <TextInput 
                    placeholder="0"
                    keyboardType="numeric"
                    onChangeText={(val) => setReductions({...reductions, [item.id]: val})}
                    className="w-12 border border-gray-200 text-center rounded p-1"
                  />
                </View>
              </View>
            )}
          />

          <View className="flex-row space-x-4 mt-4">
            <TouchableOpacity onPress={() => setMonthEndModal(false)} className="flex-1 bg-gray-100 p-4 rounded-xl items-center">
              <Text className="font-bold text-gray-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submitMonthEnd} className="flex-1 bg-indigo-600 p-4 rounded-xl items-center">
              <Text className="font-bold text-white">Save All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AttendanceManagementScreen;