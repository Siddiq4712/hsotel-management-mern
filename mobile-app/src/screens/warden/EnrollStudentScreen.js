import { Text } from "../../components/common/ReferenceDesign";
import MoreSectionNav from '../../components/common/MoreSectionNav';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { User, Lock, Hash, Mail, GraduationCap, Bed } from 'lucide-react-native';

const EnrollStudentScreen = () => {
  const [formData, setFormData] = useState({
    userName: '', password: '', roll_number: '', email: '', session_id: '', erp_batch_year: '', gender: '', college: 'nec', requires_bed: false
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

  const matchedBatch = sessions.find(batch => batch.is_active && Number(batch.erp_batch_year) === Number(formData.erp_batch_year) && batch.gender === formData.gender);

  const enroll = async () => {
    if (!matchedBatch) { Alert.alert('Batch required', 'Enter an admission year and gender configured for your hostel.'); return; }
    try {
      await wardenAPI.enrollStudent({ ...formData, erp_batch_year: Number(formData.erp_batch_year), session_id: matchedBatch.id });
      Alert.alert('Success', 'Student enrolled');
      setFormData({ userName: '', password: '', roll_number: '', email: '', session_id: '', erp_batch_year: '', gender: '', college: 'nec', requires_bed: false });
      setStep(1);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" className="flex-1 bg-background">
      <Header />
      <MoreSectionNav />
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6">Enroll Student</Text>
        {step === 1 && (
          <View>
            <Input placeholder="Username" value={formData.userName} onChangeText={(v) => setFormData({...formData, userName: v})} className="border p-3 rounded mb-3" />
            <Input placeholder="Password" value={formData.password} onChangeText={(v) => setFormData({...formData, password: v})} secureTextEntry className="border p-3 rounded mb-3" />
            <Input placeholder="Roll Number" value={formData.roll_number} onChangeText={(v) => setFormData({...formData, roll_number: v})} className="border p-3 rounded mb-3" />
            <Button onPress={() => setStep(2)} className="bg-blue-600 p-4 rounded">
              <Text className="text-white text-center font-bold">Next</Text>
            </Button>
          </View>
        )}
        {step === 2 && (
          <View>
            <Picker selectedValue={formData.college} onValueChange={(v) => setFormData({...formData, college: v})}>
              <Picker.Item label="NEC" value="nec" />
              <Picker.Item label="LAPC" value="lapc" />
            </Picker>
            <Input accessibilityLabel="Batch Admission Year" placeholder="Batch admission year (e.g. 2024)" keyboardType="number-pad" maxLength={4} value={formData.erp_batch_year} onChangeText={value => setFormData({ ...formData, erp_batch_year: value })} className="border p-3 rounded mb-3" />
            <Picker accessibilityLabel="Gender" selectedValue={formData.gender} onValueChange={value => setFormData({ ...formData, gender: value })}>
              <Picker.Item label="Choose gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
            </Picker>
            <Text className="mb-3">{matchedBatch ? `${matchedBatch.name} - ${matchedBatch.hostel_name}` : 'No matching batch and gender configured'}</Text>
            <View className="flex-row items-center mb-3">
              <Switch value={formData.requires_bed} onValueChange={(v) => setFormData({...formData, requires_bed: v})} />
              <Text className="ml-2">Requires Bed</Text>
            </View>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setStep(1)} className="flex-1 bg-gray-300 p-3 rounded">
                <Text className="text-center">Back</Text>
              </TouchableOpacity>
              <Button onPress={enroll} className="flex-1 bg-indigo-600 p-3 rounded">
                <Text className="text-white text-center font-bold">Enroll</Text>
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default EnrollStudentScreen;
