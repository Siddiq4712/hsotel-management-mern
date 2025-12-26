import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Picker, ScrollView } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { User, Lock, Hash, Mail, GraduationCap, Bed } from 'lucide-react-native';

const EnrollStudentScreen = () => {
  const [formData, setFormData] = useState({
    username: '', password: '', roll_number: '', email: '', session_id: '', college: '', requires_bed: false
  });
  const [sessions, setSessions] = useState([]);
  const [step, setStep] = useState(1); // Multi-step form

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await wardenAPI.getSessions();
      setSessions(res.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch sessions');
    }
  };

  const enroll = async () => {
    try {
      await wardenAPI.enrollStudent(formData);
      Alert.alert('Success', 'Student enrolled');
      setFormData({ username: '', password: '', roll_number: '', email: '', session_id: '', college: '', requires_bed: false });
      setStep(1);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6">Enroll Student</Text>
        {step === 1 && (
          <View>
            <TextInput placeholder="Username" value={formData.username} onChangeText={(v) => setFormData({...formData, username: v})} className="border p-3 rounded mb-3" />
            <TextInput placeholder="Password" value={formData.password} onChangeText={(v) => setFormData({...formData, password: v})} secureTextEntry className="border p-3 rounded mb-3" />
            <TextInput placeholder="Roll Number" value={formData.roll_number} onChangeText={(v) => setFormData({...formData, roll_number: v})} className="border p-3 rounded mb-3" />
            <TouchableOpacity onPress={() => setStep(2)} className="bg-blue-600 p-4 rounded">
              <Text className="text-white text-center font-bold">Next</Text>
            </TouchableOpacity>
          </View>
        )}
        {step === 2 && (
          <View>
            <Picker selectedValue={formData.college} onValueChange={(v) => setFormData({...formData, college: v})}>
              <Picker.Item label="NEC" value="nec" />
              <Picker.Item label="LAPC" value="lapc" />
            </Picker>
            <Picker selectedValue={formData.session_id} onValueChange={(v) => setFormData({...formData, session_id: v})}>
              {sessions.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
            </Picker>
            <View className="flex-row items-center mb-3">
              <Switch value={formData.requires_bed} onValueChange={(v) => setFormData({...formData, requires_bed: v})} />
              <Text className="ml-2">Requires Bed</Text>
            </View>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setStep(1)} className="flex-1 bg-gray-300 p-3 rounded">
                <Text className="text-center">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={enroll} className="flex-1 bg-green-600 p-3 rounded">
                <Text className="text-white text-center font-bold">Enroll</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default EnrollStudentScreen;