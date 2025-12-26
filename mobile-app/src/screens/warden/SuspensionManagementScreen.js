import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert, Picker } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { UserX, Plus, User, Calendar } from 'lucide-react-native';

const SuspensionManagementScreen = () => {
  const [suspensions, setSuspensions] = useState([]);
  const [students, setStudents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', reason: '', start_date: '', end_date: '', remarks: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suspRes, studentsRes] = await Promise.all([
        wardenAPI.getSuspensions(),
        wardenAPI.getStudents()
      ]);
      setSuspensions(suspRes.data.data);
      setStudents(studentsRes.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    }
  };

  const createSuspension = async () => {
    try {
      await wardenAPI.createSuspension(formData);
      Alert.alert('Success', 'Suspension created');
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderSuspension = ({ item }) => (
    <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100">
      <Text className="font-bold text-gray-900">{item.Student?.username}</Text>
      <Text className="text-gray-600 text-sm">{item.reason}</Text>
      <Text className="text-gray-500 text-xs">{moment(item.start_date).format('MMM DD')} - {item.end_date ? moment(item.end_date).format('MMM DD') : 'Indefinite'}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4">
        <TouchableOpacity onPress={() => setModalVisible(true)} className="bg-red-600 p-4 rounded-xl items-center mb-4">
          <Text className="text-white font-bold">Create Suspension</Text>
        </TouchableOpacity>
        <FlatList data={suspensions} renderItem={renderSuspension} keyExtractor={item => item.id.toString()} />
      </View>
      <Modal visible={modalVisible} animationType="slide">
        <View className="flex-1 bg-white p-6">
          <Text className="text-xl font-bold mb-4">New Suspension</Text>
          <Picker selectedValue={formData.student_id} onValueChange={(v) => setFormData({...formData, student_id: v})} className="mb-3">
            {students.map(s => <Picker.Item key={s.id} label={s.username} value={s.id} />)}
          </Picker>
          <TextInput placeholder="Reason" value={formData.reason} onChangeText={(v) => setFormData({...formData, reason: v})} className="border p-3 rounded mb-3" />
          <TextInput placeholder="Start Date (YYYY-MM-DD)" value={formData.start_date} onChangeText={(v) => setFormData({...formData, start_date: v})} className="border p-3 rounded mb-3" />
          <TextInput placeholder="End Date (YYYY-MM-DD)" value={formData.end_date} onChangeText={(v) => setFormData({...formData, end_date: v})} className="border p-3 rounded mb-3" />
          <TouchableOpacity onPress={createSuspension} className="bg-red-600 p-4 rounded">
            <Text className="text-white text-center font-bold">Create</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default SuspensionManagementScreen;