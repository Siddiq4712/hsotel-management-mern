import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';

import { Picker } from '@react-native-picker/picker';
import moment from 'moment';

import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { Trash2 } from 'lucide-react-native';

const HolidayManagementScreen = () => {
  const [holidays, setHolidays] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'national',
    description: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await wardenAPI.getHolidays();
      setHolidays(res.data.data || []);
    } catch {
      Alert.alert('Error', 'Failed to fetch holidays');
    }
  };

  const saveHoliday = async () => {
    try {
      if (editingId) {
        await wardenAPI.updateHoliday(editingId, formData);
      } else {
        await wardenAPI.createHoliday(formData);
      }
      setModalVisible(false);
      fetchHolidays();
    } catch {
      Alert.alert('Error', 'Failed to save holiday');
    }
  };

  const deleteHoliday = (id) => {
    Alert.alert('Confirm', 'Delete this holiday?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          await wardenAPI.deleteHoliday(id);
          fetchHolidays();
        }
      }
    ]);
  };

  const renderHoliday = ({ item }) => (
    <View className="bg-white p-4 rounded-xl mb-3 border">
      <View className="flex-row justify-between">
        <Text className="font-bold">{item.name}</Text>
        <TouchableOpacity onPress={() => deleteHoliday(item.id)}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text className="text-gray-500">
        {moment(item.date).format('MMM DD, YYYY')}
      </Text>
      <Text className="text-gray-600 text-xs">{item.type}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />

      <View className="p-4">
        <TouchableOpacity
          onPress={() => {
            setFormData({ name: '', date: '', type: 'national', description: '' });
            setEditingId(null);
            setModalVisible(true);
          }}
          className="bg-green-600 p-4 rounded-xl mb-4"
        >
          <Text className="text-white font-bold text-center">Add Holiday</Text>
        </TouchableOpacity>

        <FlatList
          data={holidays}
          renderItem={renderHoliday}
          keyExtractor={(item) => item.id.toString()}
        />
      </View>

      <Modal visible={modalVisible} animationType="slide">
        <View className="flex-1 bg-white p-6">
          <Text className="text-xl font-bold mb-4">Holiday Details</Text>

          <TextInput
            placeholder="Name"
            value={formData.name}
            onChangeText={(v) => setFormData({ ...formData, name: v })}
            className="border p-3 rounded mb-3"
          />

          <TextInput
            placeholder="YYYY-MM-DD"
            value={formData.date}
            onChangeText={(v) => setFormData({ ...formData, date: v })}
            className="border p-3 rounded mb-3"
          />

          <Picker
            selectedValue={formData.type}
            onValueChange={(v) => setFormData({ ...formData, type: v })}
          >
            <Picker.Item label="National" value="national" />
            <Picker.Item label="Religious" value="religious" />
            <Picker.Item label="Institutional" value="institutional" />
          </Picker>

          <TextInput
            placeholder="Description"
            value={formData.description}
            onChangeText={(v) =>
              setFormData({ ...formData, description: v })
            }
            multiline
            className="border p-3 rounded mb-4"
          />

          <TouchableOpacity
            onPress={saveHoliday}
            className="bg-blue-600 p-4 rounded"
          >
            <Text className="text-white text-center font-bold">Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default HolidayManagementScreen;
